const { withTransaction } = require("../../../db");
const { STATUS } = require("../../../utils/statuses");
const { QUOTED_COLS } = require("../../../utils/columns");
const logger = require("../../../utils/logger");
const {
  TABLES,
  PS,
  PAYMENT_RECEIPT_DEF,
  SCHEMA_PARTNER,
} = require("../shared/constants");
const { createHttpError, toMonthKey } = require("../shared/helpers");
const {
  applyEstimatedBankBalanceDelta,
} = require("../../Order/finance/dashboardSummary");

const confirmPaymentSupply = async (req, res) => {
  const { paymentId } = req.params;
  const parsedPaymentId = Number.parseInt(paymentId, 10);
  if (!Number.isInteger(parsedPaymentId) || parsedPaymentId < 0) {
    return res.status(400).json({
      error: "ID thanh toán không hợp lệ.",
    });
  }

  const parsePositiveInt = (value) => {
    const num = Number.parseInt(String(value ?? ""), 10);
    return Number.isInteger(num) && num > 0 ? num : null;
  };
  const parsePaymentContent = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const supplyIdFromBody = parsePositiveInt(req.body?.supplyId);
  const paymentContent = parsePaymentContent(req.body?.paymentContent);

  try {
    const result = await withTransaction(async (trx) => {
      let resolvedSupplyId = supplyIdFromBody;

      if (!resolvedSupplyId && parsedPaymentId > 0) {
        const paymentLookup = await trx.raw(
          `
          SELECT ${PS.sourceId} AS source_id
          FROM ${TABLES.paymentSupply}
          WHERE ${PS.id} = ?
          LIMIT 1;
        `,
          [parsedPaymentId]
        );
        resolvedSupplyId = parsePositiveInt(paymentLookup.rows?.[0]?.source_id);
      }

      if (!resolvedSupplyId) {
        throw createHttpError(400, "Thiếu nhà cung cấp để xác nhận thanh toán.");
      }

      const logCols = QUOTED_COLS.supplierOrderCostLog;
      const unpaidLogSummary = await trx.raw(
        `
        SELECT
          MIN(${logCols.loggedAt}::date) AS oldest_date,
          COUNT(*)::int AS unpaid_count,
          COALESCE(SUM(COALESCE(${logCols.importCost}, 0) - COALESCE(${logCols.refundAmount}, 0)), 0)::numeric AS net_unpaid_amount
        FROM ${TABLES.supplyOrderCostLog}
        WHERE ${logCols.supplyId} = ?
          AND TRIM(COALESCE(${logCols.nccPaymentStatus}::text, '')) <> ?;
      `,
        [resolvedSupplyId, STATUS.PAID]
      );

      const summary = unpaidLogSummary.rows?.[0] || {};
      const unpaidCount = Number(summary.unpaid_count) || 0;
      if (unpaidCount <= 0) {
        throw createHttpError(409, "Không có log NCC chưa thanh toán để chốt.");
      }
      const netUnpaidAmount = Number(summary.net_unpaid_amount) || 0;
      if (netUnpaidAmount === 0) {
        throw createHttpError(
          409,
          "Log NCC chưa thanh toán đang cân bằng, không có số tiền cần chốt."
        );
      }
      const isSupplierRefundToShop = netUnpaidAmount < 0;
      const expectedPaidAmount = Math.abs(Math.round(netUnpaidAmount));
      let matchedReceipt = null;

      if (isSupplierRefundToShop) {
        if (!paymentContent) {
          throw createHttpError(
            400,
            "Thiếu nội dung thanh toán để đối soát log Sepay (NCC nợ Shop)."
          );
        }
        const receiptCols = PAYMENT_RECEIPT_DEF.columns;
        const receiptLookup = await trx.raw(
          `
          SELECT
            pr.${receiptCols.id} AS id,
            pr.${receiptCols.amount} AS amount,
            pr.${receiptCols.paidDate} AS paid_date,
            pr.${receiptCols.note} AS note
          FROM ${TABLES.paymentReceipt} pr
          WHERE COALESCE(pr.${receiptCols.note}::text, '') ILIKE ?
            AND COALESCE(pr.${receiptCols.amount}::numeric, 0) >= ?
          ORDER BY pr.${receiptCols.paidDate} DESC, pr.${receiptCols.id} DESC
          LIMIT 1;
        `,
          [`%${paymentContent}%`, expectedPaidAmount]
        );
        matchedReceipt = receiptLookup.rows?.[0] || null;
        if (!matchedReceipt) {
          throw createHttpError(
            409,
            `Chưa thấy giao dịch Sepay khớp nội dung "${paymentContent}" với số tiền >= ${expectedPaidAmount}.`
          );
        }
      }

      const oldestDate = summary.oldest_date ? new Date(summary.oldest_date) : null;
      const toDmy = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear());
        return `${day}/${month}/${year}`;
      };
      const paymentDate = new Date();
      const periodStart = toDmy(oldestDate) || toDmy(paymentDate);
      const periodEnd = toDmy(paymentDate);
      const periodLabel = `${periodStart} - ${periodEnd}`;
      const addAmount = isSupplierRefundToShop
        ? -Math.abs(expectedPaidAmount)
        : Math.abs(expectedPaidAmount);
      await trx.raw(`DROP INDEX IF EXISTS ${SCHEMA_PARTNER}.uq_supplier_payments_supplier_id;`);
      const insertResult = await trx.raw(
        `
        INSERT INTO ${TABLES.paymentSupply} (${PS.sourceId}, ${PS.round}, ${PS.status}, ${PS.paid})
        VALUES (?, ?, ?, ?)
        RETURNING ${PS.id} AS id,
                  ${PS.sourceId} AS source_id,
                  ${PS.round} AS round,
                  ${PS.status} AS status,
                  COALESCE(${PS.paid}::numeric, 0) AS paid;
      `,
        [resolvedSupplyId, periodLabel, STATUS.PAID, addAmount]
      );

      await trx.raw(
        `
        UPDATE ${TABLES.supplyOrderCostLog}
        SET ${logCols.nccPaymentStatus} = ?,
            ${logCols.loggedAt} = NOW()
        WHERE ${logCols.supplyId} = ?
          AND TRIM(COALESCE(${logCols.nccPaymentStatus}::text, '')) <> ?;
      `,
        [STATUS.PAID, resolvedSupplyId, STATUS.PAID]
      );

      const paidMonthKey = toMonthKey(paymentDate);
      if (paidMonthKey && expectedPaidAmount > 0) {
        await applyEstimatedBankBalanceDelta(trx, paidMonthKey, -expectedPaidAmount);
      }

      return {
        paymentRow: insertResult.rows?.[0] || null,
        verification: {
          supplyId: resolvedSupplyId,
          unpaidCount,
          netUnpaidAmount,
          expectedPaidAmount,
          direction: isSupplierRefundToShop ? "supplier_refund_to_shop" : "shop_pay_to_supplier",
          paymentContent: paymentContent || null,
          paymentPeriod: periodLabel,
          matchedReceiptId: matchedReceipt?.id || null,
        },
      };
    });

    if (!result?.paymentRow) {
      return res.status(500).json({ error: "Không thể tạo chu kỳ thanh toán." });
    }
    res.json({
      ...result.paymentRow,
      verification: result.verification,
    });
  } catch (error) {
    const statusCode = Number(error?.status) || 500;
    logger.error(
      `[payments] Mutation failed (POST /api/payment-supply/${paymentId}/confirm)`,
      { paymentId, error: error.message, stack: error.stack }
    );
    res.status(statusCode).json({
      error: error.message || "Không thể xác nhận thanh toán.",
    });
  }
};

module.exports = { confirmPaymentSupply };

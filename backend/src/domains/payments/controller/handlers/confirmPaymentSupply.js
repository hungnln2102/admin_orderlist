const { withTransaction } = require("../../../../db");
const { STATUS } = require("../../../../utils/statuses");
const { QUOTED_COLS } = require("../../../../utils/columns");
const logger = require("../../../../utils/logger");
const {
  TABLES,
  PS,
  SCHEMA_PARTNER,
} = require("../shared/constants");
const { createHttpError, toMonthKey } = require("../shared/helpers");
const {
  findDefaultActiveAccount,
  findShopBankAccountById,
} = require("../../../shop-bank-accounts/repositories/shopBankAccountRepository");
const {
  creditShopBankFromPaymentReceipt,
  debitShopBankSupplierPayment,
  SOURCE_KINDS,
} = require("../../../shop-bank-accounts/services/shopBankLedgerService");
const {
  findSupplierRefundReceipt,
  SUPPLIER_REFUND_MATCH_TOLERANCE,
} = require("../helpers/matchSupplierRefundReceipt");

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
  const shopBankAccountIdFromBody = parsePositiveInt(
    req.body?.shopBankAccountId ?? req.body?.shop_bank_account_id
  );
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
        WITH latest AS (
          SELECT DISTINCT ON (l.${logCols.orderListId})
            l.${logCols.orderListId} AS order_list_id,
            l.${logCols.importCost} AS import_cost,
            l.${logCols.refundAmount} AS refund_amount,
            l.${logCols.nccPaymentStatus} AS ncc_payment_status,
            l.${logCols.loggedAt} AS logged_at
          FROM ${TABLES.supplyOrderCostLog} l
          WHERE l.${logCols.supplyId} = ?
          ORDER BY l.${logCols.orderListId}, l.${logCols.id} DESC
        )
        SELECT
          MIN(latest.logged_at::date) FILTER (
            WHERE TRIM(COALESCE(latest.ncc_payment_status::text, '')) <> ?
          ) AS oldest_date,
          COUNT(*) FILTER (
            WHERE TRIM(COALESCE(latest.ncc_payment_status::text, '')) <> ?
          )::int AS unpaid_count,
          COALESCE(SUM(
            CASE
              WHEN TRIM(COALESCE(latest.ncc_payment_status::text, '')) = ?
              THEN 0::numeric
              ELSE COALESCE(latest.import_cost, 0)::numeric - COALESCE(latest.refund_amount, 0)::numeric
            END
          ), 0)::numeric AS net_unpaid_amount
        FROM latest;
      `,
        [resolvedSupplyId, STATUS.PAID, STATUS.PAID, STATUS.PAID]
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
      const resolveShopBankAccount = async () => {
        if (shopBankAccountIdFromBody) {
          const account = await findShopBankAccountById(shopBankAccountIdFromBody);
          if (!account) {
            throw createHttpError(404, "Không tìm thấy STK shop đã chọn.");
          }
          if (account.isActive === false) {
            throw createHttpError(400, "STK shop đã chọn đang tạm dừng.");
          }
          return account;
        }
        const account = await findDefaultActiveAccount();
        if (!account) {
          throw createHttpError(400, "Vui lòng chọn STK shop để ghi nhận thanh toán NCC.");
        }
        return account;
      };

      const shopBankAccount = await resolveShopBankAccount();
      const shopBankAccountId = Number(shopBankAccount?.id) || null;
      let matchedReceipt = null;

      if (isSupplierRefundToShop) {
        matchedReceipt = await findSupplierRefundReceipt(trx, {
          expectedPaidAmount,
          shopBankAccountNumber: shopBankAccount?.accountNumber || "",
          paymentContent,
        });
        if (!matchedReceipt) {
          throw createHttpError(
            409,
            `Chưa thấy giao dịch Sepay khớp số tiền ${expectedPaidAmount} (sai lệch tối đa ${SUPPLIER_REFUND_MATCH_TOLERANCE} đ).`
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
        INSERT INTO ${TABLES.paymentSupply} (${PS.sourceId}, ${PS.round}, ${PS.status}, ${PS.paid}, ${PS.shopBankAccountId})
        VALUES (?, ?, ?, ?, ?)
        RETURNING ${PS.id} AS id,
                  ${PS.sourceId} AS source_id,
                  ${PS.round} AS round,
                  ${PS.status} AS status,
                  COALESCE(${PS.paid}::numeric, 0) AS paid,
                  ${PS.shopBankAccountId} AS shop_bank_account_id;
      `,
        [resolvedSupplyId, periodLabel, STATUS.PAID, addAmount, shopBankAccountId]
      );
      const paymentSupplyId = Number(insertResult.rows?.[0]?.id) || null;

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

      if (paymentSupplyId && expectedPaidAmount > 0) {
        if (isSupplierRefundToShop) {
          await creditShopBankFromPaymentReceipt(trx, {
            receiptId: matchedReceipt?.id,
            receiverAccount: matchedReceipt?.receiver || "",
            accountId: shopBankAccountId,
            amount: expectedPaidAmount,
            note: paymentContent || `NCC refund supply ${resolvedSupplyId}`,
          });
        } else {
          await debitShopBankSupplierPayment(trx, {
            accountId: shopBankAccountId,
            amount: expectedPaidAmount,
            sourceKind: SOURCE_KINDS.PAYMENT_SUPPLY,
            sourceId: paymentSupplyId,
            note: `Thanh toán NCC supply ${resolvedSupplyId}`,
          });
        }
      }
      const paidMonthKey = toMonthKey(paymentDate);

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
          shopBankAccountId,
          shopBankAccountNumber: shopBankAccount?.accountNumber || null,
          monthKey: paidMonthKey,
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

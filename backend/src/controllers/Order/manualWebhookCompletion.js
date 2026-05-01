const {
  ORDER_COLS,
  ORDER_TABLE,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
  pool,
} = require("../../../webhook/sepay/config");
const {
  insertPaymentReceipt,
  getReceiptFinancialState,
  updateReceiptFinancialState,
  insertFinancialAuditLog,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
} = require("../../../webhook/sepay/payments");
const { normalizeMoney, parseFlexibleDate } = require("../../../webhook/sepay/utils");
const { STATUS: ORDER_STATUS } = require("../../utils/statuses");
const { isMavnImportOrder, isMavrykShopSupplierName } = require("../../utils/orderHelpers");
const {
  resolveDashboardImportDeltaOnPaid,
} = require("./finance/dashboardImportDeltaOnPaid");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../config/dbSchema");
const {
  qualifiedSummaryCol,
  recomputeSummaryMonthTotalTax,
  monthKeyFromPaidDateYmd,
} = require("./finance/dashboardSummary");
const {
  completeMavnProcessingOrderPaidWithoutWebhook,
} = require("./finance/mavnCompleteProcessingPaidWithoutWebhook");
const logger = require("../../utils/logger");

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const incrementDashboardSummaryByDelta = async (
  client,
  monthKey,
  { revenueDelta = 0, profitDelta = 0, ordersDelta = 0, importDelta = 0, offFlowDelta = 0 } = {}
) => {
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  const imp = normalizeMoney(importDelta);
  const offFlow = normalizeMoney(offFlowDelta);
  if (!monthKey) return;
  if (!revenue && !profit && !orders && !imp && !offFlow) return;

  await client.query(
    `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY},
        ${summaryCols.TOTAL_ORDERS},
        ${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT},
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.UPDATED_AT}
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (${summaryCols.MONTH_KEY})
      DO UPDATE SET
        ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
        ${summaryCols.TOTAL_REVENUE} = ${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_IMPORT)} + EXCLUDED.${summaryCols.TOTAL_IMPORT}),
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT} = ${qualifiedSummaryCol(summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT)} + EXCLUDED.${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.UPDATED_AT} = NOW()
    `,
    [monthKey, orders, revenue, profit, imp, offFlow]
  );
  await recomputeSummaryMonthTotalTax(client, monthKey);
};

const fetchSupplierNameBySupplyId = async (client, supplyIdRaw) => {
  if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
  const { rows } = await client.query(
    `SELECT ${SUPPLIER_COLS.supplierName} FROM ${SUPPLIER_TABLE}
     WHERE ${SUPPLIER_COLS.id} = $1 LIMIT 1`,
    [Number(supplyIdRaw)]
  );
  return String(rows[0]?.[SUPPLIER_COLS.supplierName] ?? "").trim();
};

const buildManualWebhookTransaction = ({ orderCode, amount }) => {
  const now = new Date();
  return {
    transaction_id: "",
    reference_code: "",
    reference_number: "",
    transfer_type: "in",
    gateway: "manual_webhook",
    account_number: "",
    transaction_date: now.toISOString(),
    transaction_date_raw: now.toISOString(),
    transfer_amount: amount,
    amount_in: amount,
    transaction_content: "",
    note: orderCode,
    description: orderCode,
  };
};

const completeProcessingOrderWithManualWebhook = async (orderId) => {
  const normalizedId = Number(orderId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return { status: 400, body: { error: "orderId không hợp lệ." } };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const stateRes = await client.query(
      `SELECT
        ${ORDER_COLS.id},
        ${ORDER_COLS.idOrder},
        ${ORDER_COLS.status},
        ${ORDER_COLS.orderDate},
        ${ORDER_COLS.price},
        ${ORDER_COLS.cost},
        ${ORDER_COLS.idSupply}
       FROM ${ORDER_TABLE}
       WHERE ${ORDER_COLS.id} = $1
       FOR UPDATE`,
      [normalizedId]
    );
    const state = stateRes.rows[0] || null;
    if (!state) {
      await client.query("ROLLBACK");
      return { status: 404, body: { error: "Không tìm thấy đơn hàng." } };
    }

    const orderCode = String(state[ORDER_COLS.idOrder] || "").trim().toUpperCase();
    const currentStatus = state[ORDER_COLS.status];

    // MAVN nhập hàng: không có tiền vào bank / không giả lập webhook — chỉ PAID + đồng bộ chi phí MAVN.
    if (
      currentStatus === ORDER_STATUS.PROCESSING &&
      isMavnImportOrder({ id_order: orderCode })
    ) {
      await client.query("ROLLBACK");
      return completeMavnProcessingOrderPaidWithoutWebhook(normalizedId);
    }

    if (currentStatus !== ORDER_STATUS.PROCESSING) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { error: "Chỉ có thể hoàn thành thủ công đơn đang xử lý." },
      };
    }

    const saleAmount = normalizeMoney(state[ORDER_COLS.price]);
    if (saleAmount <= 0) {
      await client.query("ROLLBACK");
      return {
        status: 400,
        body: { error: "Giá bán của đơn phải lớn hơn 0 để tạo receipt." },
      };
    }

    const transaction = buildManualWebhookTransaction({
      orderCode,
      amount: saleAmount,
    });
    const receiptResult = await insertPaymentReceipt(transaction, {
      client,
      orderCode,
    });
    const receiptId = receiptResult?.id ?? receiptResult?.existingId ?? null;
    const receiptState = await getReceiptFinancialState(client, receiptId);
    const alreadyFinancialPosted = !!receiptState?.is_financial_posted;

    const statusUpdateResult = await client.query(
      `UPDATE ${ORDER_TABLE}
       SET ${ORDER_COLS.status} = $2
       WHERE ${ORDER_COLS.id} = $1
         AND ${ORDER_COLS.status} = $3
       RETURNING *`,
      [normalizedId, ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING]
    );
    if (!statusUpdateResult.rowCount) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { error: "Trạng thái đơn đã thay đổi, vui lòng tải lại danh sách." },
      };
    }

    let postedRevenueDelta = 0;
    let postedProfitDelta = 0;
    const paidMonthKey =
      monthKeyFromPaidDateYmd(receiptResult?.paidDate) ||
      toMonthKey(transaction.transaction_date);
    if (
      !alreadyFinancialPosted &&
      (receiptResult?.inserted || receiptResult?.duplicate)
    ) {
      const cost = normalizeMoney(state[ORDER_COLS.cost]);
      postedRevenueDelta = saleAmount;
      postedProfitDelta = normalizeMoney(saleAmount - cost);
      await incrementDashboardSummaryByDelta(client, paidMonthKey, {
        revenueDelta: postedRevenueDelta,
        profitDelta: postedRevenueDelta,
        ordersDelta: 1,
      });
      let manualImportDelta = 0;
      if (cost > 0) {
        manualImportDelta = await resolveDashboardImportDeltaOnPaid(
          client,
          state,
          cost,
          fetchSupplierNameBySupplyId,
          paidMonthKey
        );
        await incrementDashboardSummaryByDelta(client, paidMonthKey, {
          profitDelta: -cost,
          importDelta: manualImportDelta,
        });
      }

      if (receiptId) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: orderCode,
          rule_branch: "PROCESSING_TO_PAID_MANUAL_WEBHOOK_POST",
          delta: {
            posted_revenue: postedRevenueDelta,
            posted_profit: postedProfitDelta,
            profit_provisional_wire: postedRevenueDelta,
            profit_deduct_cost_on_paid: cost > 0 ? cost : undefined,
            total_import_add_on_paid: manualImportDelta > 0 ? manualImportDelta : undefined,
            total_import_via_supplier_cost_log_recalc:
              cost > 0 && manualImportDelta === 0 ? true : undefined,
            implied_margin_vnd: normalizeMoney(saleAmount - cost),
            month_key: paidMonthKey,
            received_current: saleAmount,
            received_accumulated: saleAmount,
            credit_applied_amount: 0,
            effective_received_current: saleAmount,
            effective_received_accumulated: saleAmount,
            order_price_at_webhook: saleAmount,
            required_min: saleAmount,
            shortfall_amount: 0,
            webhook_amount_flow: "MANUAL_WEBHOOK",
          },
          source: "manual_webhook",
        });
        await updateReceiptFinancialState(client, receiptId, {
          is_financial_posted: true,
          posted_revenue: postedRevenueDelta,
          posted_profit: postedProfitDelta,
        });
      }
    }

    if (!alreadyFinancialPosted && receiptResult?.inserted) {
      if (!isMavnImportOrder({ id_order: orderCode })) {
        const supplierName = await fetchSupplierNameBySupplyId(
          client,
          state[ORDER_COLS.idSupply]
        );
        if (!isMavrykShopSupplierName(supplierName)) {
          const ensured = await ensureSupplyAndPriceFromOrder(orderCode, {
            referenceImport: saleAmount,
            client,
          });
          if (ensured?.supplierId && Number.isFinite(ensured.price)) {
            await updatePaymentSupplyBalance(ensured.supplierId, ensured.price, new Date(), {
              client,
            });
          }
        }
      }
    }

    await client.query("COMMIT");
    return {
      status: 200,
      body: {
        message: "Hoàn thành đơn bằng webhook thủ công thành công.",
        order: statusUpdateResult.rows[0],
        receipt_id: receiptId,
        posted_revenue: postedRevenueDelta,
        posted_profit: postedProfitDelta,
      },
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logger.error("[manual-webhook] rollback failed", {
        error: rollbackError.message,
      });
    }
    logger.error("[manual-webhook] complete processing order failed", {
      orderId: normalizedId,
      error: error.message,
      stack: error.stack,
    });
    return { status: 500, body: { error: "Không thể hoàn thành webhook thủ công." } };
  } finally {
    client.release();
  }
};

const attachManualWebhookCompletionRoute = (router) => {
  router.post("/:id/complete-manual-webhook", async (req, res) => {
    const result = await completeProcessingOrderWithManualWebhook(req.params.id);
    return res.status(result.status).json(result.body);
  });
};

module.exports = {
  attachManualWebhookCompletionRoute,
  completeProcessingOrderWithManualWebhook,
};

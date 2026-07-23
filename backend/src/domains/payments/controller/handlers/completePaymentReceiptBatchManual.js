const { pool } = require("../../../../../webhook/sepay/config");
const {
  insertPaymentReceipt,
  getReceiptFinancialState,
  creditShopBankFromPaymentReceipt,
} = require("../../../../../webhook/sepay/payments");
const { findDefaultActiveAccount } = require("@/domains/shop-bank-accounts/repositories/shopBankAccountRepository");
const { STATUS: ORDER_STATUS } = require("@/utils/statuses");
const { isMavnImportOrder, isMavrykShopSupplierName } = require("@/utils/orderHelpers");
const { resolveDashboardImportDeltaOnPaid } = require("@/domains/orders/controller/finance/dashboardImportDeltaOnPaid");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, RECEIPT_SCHEMA, SCHEMA_RECEIPT, tableName } = require("@/config/dbSchema");
const {
  qualifiedSummaryCol,
  recomputeSummaryMonthTotalTax,
} = require("@/domains/orders/controller/finance/dashboardSummary");
const { notifyFinanceMonthlyDelta } = require("@/services/telegramFinanceDeltaNotifier");
const { runRenewal } = require("../../../../../webhook/sepay/renewal");
const logger = require("@/utils/logger");

const {
  ORDER_COLS,
  ORDER_TABLE,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
} = require("../../../../../webhook/sepay/config");

const { isBatchTransferCodeFormat } = require("@/domains/payments/controller/shared/batchTransferCode");
const { normalizeMoney, parseFlexibleDate } = require("../../../../../webhook/sepay/utils");

const BATCH_TABLE = tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH.TABLE, SCHEMA_RECEIPT);
const BATCH_ITEM_TABLE = tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH_ITEM.TABLE, SCHEMA_RECEIPT);

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

const incrementDashboardSummaryByDelta = async (
  client,
  monthKey,
  {
    revenueDelta = 0,
    profitDelta = 0,
    ordersDelta = 0,
    importDelta = 0,
    offFlowDelta = 0,
    bankBalanceDelta = 0,
  } = {}
) => {
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  const imp = normalizeMoney(importDelta);
  const offFlow = normalizeMoney(offFlowDelta);
  const bankBalance = normalizeMoney(bankBalanceDelta);
  if (!monthKey) return;
  if (!revenue && !profit && !orders && !imp && !offFlow && !bankBalance) return;

  await client.query(
    `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY},
        ${summaryCols.TOTAL_ORDERS},
        ${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT},
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.ESTIMATED_BANK_BALANCE},
        ${summaryCols.UPDATED_AT}
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (${summaryCols.MONTH_KEY})
      DO UPDATE SET
        ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
        ${summaryCols.TOTAL_REVENUE} = ${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_IMPORT)} + EXCLUDED.${summaryCols.TOTAL_IMPORT}),
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT} = ${qualifiedSummaryCol(summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT)} + EXCLUDED.${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.ESTIMATED_BANK_BALANCE} = ${qualifiedSummaryCol(summaryCols.ESTIMATED_BANK_BALANCE)} + EXCLUDED.${summaryCols.ESTIMATED_BANK_BALANCE},
        ${summaryCols.UPDATED_AT} = NOW()
    `,
    [monthKey, orders, revenue, profit, imp, offFlow, bankBalance]
  );
  await recomputeSummaryMonthTotalTax(client, monthKey);
  await notifyFinanceMonthlyDelta({
    monthKey,
    revenueDelta: revenue,
    profitDelta: profit,
    importDelta: imp,
    refundDelta: 0,
    offFlowDelta: offFlow,
    bankBalanceDelta: bankBalance,
    context: "manual_batch_completion",
    executor: client,
  });
};

const completePaymentReceiptBatchManual = async (req, res) => {
  const batchCode = String(req.params.batchCode || "").trim().toUpperCase();
  if (!isBatchTransferCodeFormat(batchCode)) {
    return res.status(400).json({ error: "Mã gộp CK không đúng định dạng MAVG." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const batchRes = await client.query(
      `SELECT * FROM ${BATCH_TABLE} WHERE UPPER(batch_code) = $1 FOR UPDATE`,
      [batchCode]
    );
    const batch = batchRes.rows[0] || null;
    if (!batch) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Không tìm thấy mã gộp CK." });
    }

    if (String(batch.status || "pending").toLowerCase() === "paid") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Mã gộp CK này đã được thanh toán rồi." });
    }

    if (String(batch.status || "pending").toLowerCase() === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Mã gộp CK này đã bị huỷ." });
    }

    const shopBankAccount = await findDefaultActiveAccount();
    if (!shopBankAccount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Vui lòng cấu hình tài khoản nhận mặc định trước khi thanh toán batch.",
      });
    }

    const batchTotalAmount = Number(batch.total_amount) || 0;
    const now = new Date();
    const transaction = {
      transaction_id: "",
      reference_code: "",
      reference_number: "",
      transfer_type: "in",
      gateway: "manual_webhook",
      account_number: shopBankAccount.accountNumber || "",
      accountNumber: shopBankAccount.accountNumber || "",
      transaction_date: now.toISOString(),
      transaction_date_raw: now.toISOString(),
      transfer_amount: batchTotalAmount,
      amount_in: batchTotalAmount,
      transaction_content: `Thanh toán tiền mặt gộp đơn ${batch.batch_code}`,
      note: batch.batch_code,
      description: batch.batch_code,
    };

    const receiptResult = await insertPaymentReceipt(transaction, {
      client,
      orderCode: batch.batch_code,
    });
    const receiptId = receiptResult?.id ?? receiptResult?.existingId ?? null;
    if (!receiptId) {
      throw new Error("Không thể tạo biên lai thanh toán.");
    }

    await client.query(
      `UPDATE ${BATCH_TABLE}
       SET status = 'paid',
           paid_receipt_id = $1,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [receiptId, batch.id]
    );

    await client.query(
      `UPDATE ${BATCH_ITEM_TABLE}
       SET status = 'paid'
       WHERE batch_id = $1 AND LOWER(COALESCE(status::text, 'pending')) <> 'cancelled'`,
      [batch.id]
    );

    const alreadyFinancialPosted = !!(await getReceiptFinancialState(client, receiptId))?.is_financial_posted;
    if (!alreadyFinancialPosted && (receiptResult?.inserted || receiptResult?.duplicate)) {
      await creditShopBankFromPaymentReceipt(client, {
        receiptId,
        receiverAccount: shopBankAccount.accountNumber,
        accountId: shopBankAccount.id,
        amount: batchTotalAmount,
        note: batch.batch_code,
      });
    }

    const itemsRes = await client.query(
      `SELECT * FROM ${BATCH_ITEM_TABLE} WHERE batch_id = $1`,
      [batch.id]
    );
    const items = itemsRes.rows || [];

    const updatedOrders = [];
    const transitionedOrders = [];
    const renewalOrders = [];
    const paidMonthKey = toMonthKey(now.toISOString());

    for (const item of items) {
      const orderCode = String(item.order_code || "").trim().toUpperCase();
      if (!orderCode) continue;

      const orderRes = await client.query(
        `SELECT
          ${ORDER_COLS.id},
          ${ORDER_COLS.idOrder},
          ${ORDER_COLS.status},
          ${ORDER_COLS.orderDate},
          ${ORDER_COLS.price},
          ${ORDER_COLS.cost},
          ${ORDER_COLS.idSupply}
         FROM ${ORDER_TABLE}
         WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
         FOR UPDATE`,
        [orderCode]
      );
      const state = orderRes.rows[0] || null;
      if (!state) {
        logger.warn(`[BatchManualPayment] Order ${orderCode} in batch not found, skipping.`);
        continue;
      }

      const currentStatus = state[ORDER_COLS.status];
      if (
        currentStatus !== ORDER_STATUS.UNPAID &&
        currentStatus !== ORDER_STATUS.PROCESSING &&
        currentStatus !== ORDER_STATUS.RENEWAL
      ) {
        logger.info(`[BatchManualPayment] Order ${orderCode} status is ${currentStatus}, skipping.`);
        continue;
      }

      if (isMavnImportOrder({ id_order: orderCode })) {
        logger.info(`[BatchManualPayment] Skipping status update for MAVN (nhập hàng): ${orderCode}`);
        continue;
      }

      if (currentStatus === ORDER_STATUS.RENEWAL) {
        // Renewal orders should not be marked as PAID directly, runRenewal will do it.
        renewalOrders.push(orderCode);
        continue;
      }

      const nextStatus = ORDER_STATUS.PAID;
      const statusUpdateResult = await client.query(
        `UPDATE ${ORDER_TABLE}
         SET ${ORDER_COLS.status} = $2
         WHERE ${ORDER_COLS.id} = $1
           AND ${ORDER_COLS.status} = $3
         RETURNING *`,
        [state.id, nextStatus, currentStatus]
      );

      if (statusUpdateResult.rowCount > 0) {
        const salePrice = normalizeMoney(state[ORDER_COLS.price]);
        const cost = normalizeMoney(state[ORDER_COLS.cost]);
        const profit = normalizeMoney(salePrice - cost);

        const manualImportDelta = cost > 0
          ? await resolveDashboardImportDeltaOnPaid(client, state, cost, fetchSupplierNameBySupplyId, paidMonthKey)
          : 0;

        await incrementDashboardSummaryByDelta(client, paidMonthKey, {
          revenueDelta: salePrice,
          profitDelta: profit,
          ordersDelta: 1,
          importDelta: manualImportDelta,
        });

        // Insert audit log
        const { insertFinancialAuditLog } = require("../../../../../webhook/sepay/payments");
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: orderCode,
          rule_branch: "BATCH_COMPLETE_MANUAL",
          delta: {
            fromStatus: currentStatus,
            toStatus: nextStatus,
            posted_revenue: salePrice,
            posted_profit: profit,
            profit_provisional_wire: salePrice,
            profit_deduct_cost_on_paid: cost > 0 ? cost : undefined,
            total_import_add_on_paid: manualImportDelta > 0 ? manualImportDelta : undefined,
            implied_margin_vnd: profit,
            month_key: paidMonthKey,
            received_current: salePrice,
            received_accumulated: salePrice,
            effective_received_current: salePrice,
            effective_received_accumulated: salePrice,
            order_price_at_webhook: salePrice,
            required_min: salePrice,
            shortfall_amount: 0,
            webhook_amount_flow: "MANUAL_BATCH",
          },
          source: "manual_batch",
        });

        // Sync supplier payment / supply balance if not Mavryk
        const supplierName = await fetchSupplierNameBySupplyId(client, state[ORDER_COLS.idSupply]);
        if (!isMavrykShopSupplierName(supplierName)) {
          const { ensureSupplyAndPriceFromOrder, updatePaymentSupplyBalance } = require("../../../../../webhook/sepay/payments");
          const ensured = await ensureSupplyAndPriceFromOrder(orderCode, {
            referenceImport: salePrice,
            client,
          });
          if (ensured?.supplierId && Number.isFinite(ensured.price)) {
            await updatePaymentSupplyBalance(ensured.supplierId, ensured.price, new Date(), {
              client,
            });
          }
        }

        updatedOrders.push(orderCode);
        transitionedOrders.push({ id: state.id, code: orderCode });
      }
    }

    await client.query("COMMIT");

    // Emit events for transitioned orders after commit
    try {
      const { eventBus, EVENTS } = require("@/events");
      for (const order of transitionedOrders) {
        eventBus.emit(EVENTS.ORDER_UPDATED, {
          orderId: order.id,
          updatedFields: { status: ORDER_STATUS.PAID }
        });
        eventBus.emit(EVENTS.ORDER_PAID, { orderId: order.id });
      }
    } catch (eventErr) {
      logger.error("[BatchManualPayment] Lỗi phát sự kiện ORDER_PAID/ORDER_UPDATED", { error: eventErr.message });
    }

    // Process renewals outside transaction (after commit)
    for (const code of renewalOrders) {
      try {
        logger.info(`[BatchManualPayment] Running renewal for batch item: ${code}`);
        await runRenewal(code, {
          forceRenewal: true,
          source: "manual",
          paymentMonthKey: paidMonthKey,
          paymentReceiptId: receiptId,
        });
        updatedOrders.push(code);
      } catch (err) {
        logger.error(`[BatchManualPayment] Error in runRenewal for batch item: ${code}`, { error: err.message });
      }
    }

    return res.json({
      success: true,
      message: `Đã xác nhận thanh toán tiền mặt cho Batch ${batchCode}.`,
      updatedOrders,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rbErr) {
      logger.error("[BatchManualPayment] ROLLBACK failed", { error: rbErr.message });
    }
    logger.error("[BatchManualPayment] Complete batch manual failed", { error: error.message, stack: error.stack });
    return res.status(500).json({ error: "Không thể hoàn thành thanh toán batch gộp đơn." });
  } finally {
    client.release();
  }
};

module.exports = {
  completePaymentReceiptBatchManual,
};

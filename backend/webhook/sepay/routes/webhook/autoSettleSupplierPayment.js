const { STATUS } = require("@/utils/statuses");
const { decodeSupplierSignature } = require("./supplierPaymentSignature");
const { insertFinancialAuditLog } = require("../../payments");
const { debitShopBankSupplierPayment } = require("@/domains/shop-bank-accounts/services/shopBankLedgerService");
const { notifyFinanceMonthlyDelta } = require("@/services/telegramFinanceDeltaNotifier");
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require("@/config/dbSchema");
const logger = require("@/utils/logger");

const SUPPLIER_ORDER_COST_LOG_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER);
const PAYMENT_SUPPLY_TABLE = tableName(PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE, SCHEMA_PARTNER);
const SUPPLIER_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);
const supplierOrderCostCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
const paymentSupplyCols = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;
const supplierCols = PARTNER_SCHEMA.SUPPLIER.COLS;
const SUPPLIER_REFUND_MATCH_TOLERANCE = 5000;

async function tryAutoSettleSupplierPaymentByOutbound({
  client,
  receiptId,
  transferAmountNormalized,
  paidMonthKey,
  shopBankAccountId,
}) {
  return null; // Bỏ qua móc nối NCC
  const outboundAmount = Math.abs(transferAmountNormalized);
  const { supplierId, baseAmount } = decodeSupplierSignature(outboundAmount);
  
  // Basic validation
  if (supplierId <= 0 || baseAmount <= 0) return null;

  // 1. Check if supplier exists
  const supplierRes = await client.query(
    `SELECT ${supplierCols.SUPPLIER_NAME} AS supplier_name FROM ${SUPPLIER_TABLE} WHERE ${supplierCols.ID} = $1 LIMIT 1`,
    [supplierId]
  );
  if (!supplierRes.rows.length) return null;
  const supplierName = supplierRes.rows[0].supplier_name;

  // 2. Aggregate unpaid for this supplier
  const unpaidLogSummary = await client.query(
    `
    WITH latest AS (
      SELECT DISTINCT ON (l.${supplierOrderCostCols.ORDER_LIST_ID})
        l.${supplierOrderCostCols.IMPORT_COST} AS import_cost,
        l.${supplierOrderCostCols.REFUND_AMOUNT} AS refund_amount,
        l.${supplierOrderCostCols.NCC_PAYMENT_STATUS} AS ncc_payment_status
      FROM ${SUPPLIER_ORDER_COST_LOG_TABLE} l
      WHERE l.${supplierOrderCostCols.SUPPLY_ID} = $1
      ORDER BY l.${supplierOrderCostCols.ORDER_LIST_ID}, l.${supplierOrderCostCols.ID} DESC
    )
    SELECT
      COUNT(*) FILTER (
        WHERE TRIM(COALESCE(ncc_payment_status::text, '')) <> $2
      )::int AS unpaid_count,
      COALESCE(SUM(
        CASE
          WHEN TRIM(COALESCE(ncc_payment_status::text, '')) = $2
          THEN 0::numeric
          ELSE COALESCE(import_cost, 0)::numeric - COALESCE(refund_amount, 0)::numeric
        END
      ), 0)::numeric AS net_unpaid_amount
    FROM latest;
    `,
    [supplierId, STATUS.PAID]
  );

  const summary = unpaidLogSummary.rows[0] || {};
  const unpaidCount = Number(summary.unpaid_count) || 0;
  const netUnpaidAmount = Number(summary.net_unpaid_amount) || 0;
  
  if (unpaidCount <= 0 || netUnpaidAmount <= 0) return null;

  // 3. Verify amount match with tolerance
  const gap = Math.abs(netUnpaidAmount - baseAmount);
  if (gap > SUPPLIER_REFUND_MATCH_TOLERANCE) {
    logger.warn("[Webhook][AutoSettle] Amount mismatch", { supplierId, baseAmount, netUnpaidAmount, gap });
    return null;
  }

  // 4. Auto confirm payment supply
  const paymentDate = new Date();
  const day = String(paymentDate.getDate()).padStart(2, "0");
  const month = String(paymentDate.getMonth() + 1).padStart(2, "0");
  const year = String(paymentDate.getFullYear());
  const periodLabel = `${day}/${month}/${year} - ${day}/${month}/${year}`;

  const insertResult = await client.query(
    `
      INSERT INTO ${PAYMENT_SUPPLY_TABLE} (${paymentSupplyCols.SOURCE_ID}, ${paymentSupplyCols.ROUND}, ${paymentSupplyCols.STATUS}, ${paymentSupplyCols.PAID}, ${paymentSupplyCols.SHOP_BANK_ACCOUNT_ID})
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [supplierId, periodLabel, STATUS.PAID, Math.abs(netUnpaidAmount), shopBankAccountId || null]
  );
  const paymentSupplyId = insertResult.rows[0]?.id;

  // 5. Update log entries to PAID
  await client.query(
    `
      UPDATE ${SUPPLIER_ORDER_COST_LOG_TABLE}
      SET ${supplierOrderCostCols.NCC_PAYMENT_STATUS} = $1,
          ${supplierOrderCostCols.LOGGED_AT} = NOW()
      WHERE ${supplierOrderCostCols.SUPPLY_ID} = $2
        AND TRIM(COALESCE(${supplierOrderCostCols.NCC_PAYMENT_STATUS}::text, '')) <> $1;
    `,
    [STATUS.PAID, supplierId]
  );

  // 6. Debit bank ledger
  let bankLedgerDelta = 0;
  if (shopBankAccountId) {
    const ledgerResult = await debitShopBankSupplierPayment(client, {
      accountId: shopBankAccountId,
      amount: baseAmount,
      sourceKind: "payment_supply",
      sourceId: paymentSupplyId,
      note: `Auto TT NCC supply ${supplierId} - via Webhook`,
    });
    if (ledgerResult && !ledgerResult.skipped) {
      bankLedgerDelta = -baseAmount;
    }
  }

  // 7. Notify & Audit
  if (bankLedgerDelta !== 0 && paidMonthKey) {
    await notifyFinanceMonthlyDelta({
      monthKey: paidMonthKey,
      bankBalanceDelta: bankLedgerDelta,
      context: `webhook.autoSettlePaymentSupply supply=${supplierId}`,
      executor: client,
    });
  }

  if (receiptId) {
    await insertFinancialAuditLog(client, {
      payment_receipt_id: receiptId,
      order_code: "",
      rule_branch: "AUTO_SUPPLIER_PAYMENT_OUTBOUND",
      delta: {
        supplier_id: supplierId,
        supplier_name: supplierName,
        expected_unpaid_amount: netUnpaidAmount,
        base_amount_decoded: baseAmount,
        match_gap: gap,
        month_key: paidMonthKey,
        bank_ledger_delta: bankLedgerDelta,
      },
      source: "webhook",
    });
  }

  return {
    supplierId,
    supplierName,
    netUnpaidAmount,
    baseAmount,
    bankLedgerDelta,
  };
}

module.exports = {
  tryAutoSettleSupplierPaymentByOutbound,
};

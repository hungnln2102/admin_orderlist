const { db } = require("../../../db");
const {
  SCHEMA_FINANCE,
  SCHEMA_ORDERS,
  FINANCE_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_SUPPLIER,
  tableName,
} = require("../../../config/dbSchema");
const { STATUS } = require("../../../utils/statuses");
const {
  defaultFrom22nd,
  vnTodayYmd,
  TAX_ORDER_LIST_FROM_DEFAULT,
  IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT,
} = require("./shared");
const { buildBackfillSql } = require("./sqlBuilder");

/**
 * @param {object} [options]
 * @param {string} [options.from] yyyy-mm-dd (mặc định: mốc ngày 22 rolling — giống CLI không truyền --from)
 * @param {string} [options.to] yyyy-mm-dd (mặc định: hôm nay VN)
 * @param {string} [options.taxFrom] yyyy-mm-dd (mặc định: TAX_ORDER_LIST_FROM_DEFAULT)
 * @param {number} [options.importSpreadDays]
 * @param {boolean} [options.closeKnex] đóng pool Knex sau khi chạy (CLI); scheduler không bật
 */
async function runDailyRevenueSummaryBackfill(options = {}) {
  const from = options.from ?? defaultFrom22nd();
  const to = options.to ?? vnTodayYmd();
  const taxFrom = options.taxFrom ?? TAX_ORDER_LIST_FROM_DEFAULT;
  let importSpreadDays = IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT;
  if (
    options.importSpreadDays != null &&
    Number.isFinite(options.importSpreadDays) &&
    options.importSpreadDays >= 1
  ) {
    importSpreadDays = Math.floor(options.importSpreadDays);
  }

  if (from > to) {
    throw new Error(`daily_revenue_summary: from phải <= to (${from} .. ${to})`);
  }

  const summaryTable = tableName(
    FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.TABLE,
    SCHEMA_FINANCE
  );
  const orderTable = tableName("order_list", SCHEMA_ORDERS);
  const expenseTable = tableName(
    FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE,
    SCHEMA_FINANCE
  );
  const refundStatuses = [STATUS.PENDING_REFUND, STATUS.REFUNDED];
  const supplierTable = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER);

  const sql = buildBackfillSql({
    summaryTable,
    orderTable,
    supplierTable,
    expenseTable,
    refundStatuses,
  });

  const bindings = [from, to, taxFrom, importSpreadDays, ...refundStatuses];

  await db.raw(sql, bindings);

  if (options.closeKnex) {
    await db.destroy().catch(() => {});
  }
}

module.exports = {
  runDailyRevenueSummaryBackfill,
};

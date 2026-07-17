const {
  SCHEMA_FINANCE,
  SCHEMA_ORDERS,
  FINANCE_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_SUPPLIER,
  tableName,
} = require("@/config/dbSchema");
const { STATUS } = require("@/utils/statuses");
const { buildBackfillSql } = require("@/services/dashboard/dailyRevenueSummaryBackfill/sqlBuilder");

function buildDailyRevenueSummaryBackfillQuery({
  from,
  to,
  taxFrom,
  importSpreadDays,
} = {}) {
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

  return {
    sql: buildBackfillSql({
      summaryTable,
      orderTable,
      supplierTable,
      expenseTable,
      refundStatuses,
    }),
    bindings: [from, to, taxFrom, importSpreadDays, ...refundStatuses],
  };
}

async function executeDailyRevenueSummaryBackfill(db, options = {}) {
  const { sql, bindings } = buildDailyRevenueSummaryBackfillQuery(options);
  return db.raw(sql, bindings);
}

module.exports = {
  buildDailyRevenueSummaryBackfillQuery,
  executeDailyRevenueSummaryBackfill,
};

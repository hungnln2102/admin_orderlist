const db = require("@/db/knexClient");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("@/config/dbSchema");

const COLS = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const TABLE = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);

/**
 * Upsert monthly summary by incrementing/decrementing metrics.
 * Using standard + EXCLUDED logic. Values in `increments` should be signed (e.g., negative for deduction).
 * 
 * @param {string} monthKey format YYYY-MM
 * @param {Object} increments key-value pair of columns and their numeric delta
 * @param {Object} options
 * @param {import("knex").Knex} options.client database client / transaction instance
 */
const incrementMonthlyMetrics = async (monthKey, increments, { client = db } = {}) => {
  // View finance.dashboard_monthly_summary is now dynamic, no need to write physically.
  return;
};

module.exports = {
  TABLE,
  COLS,
  incrementMonthlyMetrics,
};

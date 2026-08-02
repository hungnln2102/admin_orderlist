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
  const columns = Object.keys(increments);
  if (columns.length === 0) return;

  const placeholders = columns.map(() => "?").join(", ");
  const updateClauses = columns.map(_col => `?? = ?? + EXCLUDED.??`).join(", ");

  const sql = `
    INSERT INTO ${TABLE} (??, ${columns.map(() => "??").join(", ")})
    VALUES (?, ${placeholders})
    ON CONFLICT (??)
    DO UPDATE SET
      ${updateClauses},
      ?? = NOW();
  `;

  const bindings = [
    COLS.MONTH_KEY,
    ...columns,
    monthKey,
    ...columns.map(col => increments[col]),
    COLS.MONTH_KEY,
    ...columns.flatMap(col => [col, `${TABLE}.${col}`, col]),
    COLS.UPDATED_AT
  ];

  return client.raw(sql, bindings);
};

module.exports = {
  TABLE,
  COLS,
  incrementMonthlyMetrics,
};

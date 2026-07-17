const { db, summaryTableName, summaryCols, toNumber } = require("@/controllers/DashboardController/service/shared");

const fetchDashboardYears = async () => {
  const mk = summaryCols.MONTH_KEY;
  const r = await db.raw(
    `SELECT DISTINCT CAST(SUBSTRING(${mk}::text, 1, 4) AS INTEGER) AS year_value
     FROM ${summaryTableName}
     WHERE ${mk} IS NOT NULL AND LENGTH(TRIM(${mk}::text)) >= 4
     ORDER BY year_value DESC`
  );
  return (r.rows || [])
    .map((row) => Number(row.year_value))
    .filter((y) => Number.isFinite(y));
};

const fetchDashboardMonthlySummary = async () => {
  const dbRows = await db(summaryTableName)
    .select(
      summaryCols.MONTH_KEY,
      summaryCols.TOTAL_ORDERS,
      summaryCols.CANCELED_ORDERS,
      summaryCols.TOTAL_REVENUE,
      summaryCols.TOTAL_PROFIT,
      summaryCols.TOTAL_REFUND,
      summaryCols.TOTAL_IMPORT,
      summaryCols.TOTAL_TAX,
      summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT,
      summaryCols.ESTIMATED_BANK_BALANCE,
      summaryCols.UPDATED_AT
    )
    .orderBy(summaryCols.MONTH_KEY, "desc");

  return (dbRows || []).map((row) => {
    const mk = String(row[summaryCols.MONTH_KEY] || "").trim();
    return {
      month_key: mk,
      total_orders: toNumber(row[summaryCols.TOTAL_ORDERS]),
      canceled_orders: toNumber(row[summaryCols.CANCELED_ORDERS]),
      total_revenue: toNumber(row[summaryCols.TOTAL_REVENUE]),
      total_profit: toNumber(row[summaryCols.TOTAL_PROFIT]),
      total_refund: toNumber(row[summaryCols.TOTAL_REFUND]),
      total_import: toNumber(row[summaryCols.TOTAL_IMPORT]),
      total_tax: toNumber(row[summaryCols.TOTAL_TAX]),
      total_off_flow_bank_receipt: toNumber(row[summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT]),
      estimated_bank_balance: toNumber(row[summaryCols.ESTIMATED_BANK_BALANCE]),
      updated_at: row[summaryCols.UPDATED_AT] ?? null,
    };
  });
};

module.exports = {
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
};

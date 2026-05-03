/**
 * Gộp KPI / biểu đồ từ {SCHEMA_FINANCE}.daily_revenue_summary (đồng bộ backfill form thuế).
 * @see database/migrations/093_dashboard_daily_revenue_summary.sql
 * @see ../../services/dashboard/dailyRevenueSummaryBackfill.js (scripts/ops/backfill-daily-revenue-summary.js)
 */
const { db } = require("../../db");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
} = require("../../config/dbSchema");

const dailyTableName = tableName(
  FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const col = FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.COLS;

const toNumber = (value) => Number(value || 0);

/** Sau khi migration 095 / Knex 20260630220200 — cột có trên mọi môi trường mới. */
let cachedHasAllocatedProfitTax;

async function hasAllocatedProfitTaxColumn() {
  if (cachedHasAllocatedProfitTax !== undefined) {
    return cachedHasAllocatedProfitTax;
  }
  const row = await db("information_schema.columns")
    .where({
      table_schema: SCHEMA_FINANCE,
      table_name: FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.TABLE,
      column_name: col.ALLOCATED_PROFIT_TAX,
    })
    .first("column_name");
  cachedHasAllocatedProfitTax = !!row;
  return cachedHasAllocatedProfitTax;
}

function selectAllocatedProfitSum(hasCol) {
  if (hasCol) {
    return db.raw(`COALESCE(SUM(??), 0) AS allocated_profit_tax`, [
      col.ALLOCATED_PROFIT_TAX,
    ]);
  }
  return db.raw(`0::numeric AS allocated_profit_tax`);
}

function selectAllocatedProfitScalar(hasCol) {
  if (hasCol) return col.ALLOCATED_PROFIT_TAX;
  return db.raw(`0::numeric AS allocated_profit_tax`);
}

/**
 * @returns {Promise<{ earned: number, reversed: number, shopCost: number, allocatedProfitTax: number }>}
 */
async function sumDailyKpisForRange(fromYmd, toYmd) {
  const hasAlloc = await hasAllocatedProfitTaxColumn();
  const row = await db(dailyTableName)
    .whereBetween(col.SUMMARY_DATE, [fromYmd, toYmd])
    .select(
      db.raw(`COALESCE(SUM(??), 0) AS earned`, [col.EARNED_REVENUE]),
      db.raw(`COALESCE(SUM(??), 0) AS reversed`, [col.REVENUE_REVERSED]),
      db.raw(`COALESCE(SUM(??), 0) AS shop_cost`, [col.TOTAL_SHOP_COST]),
      selectAllocatedProfitSum(hasAlloc)
    )
    .first();
  return {
    earned: toNumber(row?.earned),
    reversed: toNumber(row?.reversed),
    shopCost: toNumber(row?.shop_cost),
    allocatedProfitTax: toNumber(row?.allocated_profit_tax),
  };
}

/**
 * Hàng theo ngày (chỉ ngày có snapshot); ngày không có hàng = caller xử lý 0.
 * @returns {Promise<Map<string, Record<string, unknown>>>} key YYYY-MM-DD
 */
async function dailyRowMapBetween(fromYmd, toYmd) {
  const hasAlloc = await hasAllocatedProfitTaxColumn();
  const rows = await db(dailyTableName)
    .whereBetween(col.SUMMARY_DATE, [fromYmd, toYmd])
    .select(
      db.raw(`??::text AS summary_date_key`, [col.SUMMARY_DATE]),
      col.SUMMARY_DATE,
      col.EARNED_REVENUE,
      col.REVENUE_REVERSED,
      col.TOTAL_SHOP_COST,
      selectAllocatedProfitScalar(hasAlloc)
    );
  const map = new Map();
  for (const r of rows || []) {
    // Luôn dùng ngày lịch từ Postgres (::text), không dùng Date#toISOString()
    // (tránh lệch 1 ngày khi Node chạy UTC và driver trả Date nội bộ).
    const key = String(r.summary_date_key || "").trim().slice(0, 10);
    if (key) map.set(key, r);
  }
  return map;
}

/**
 * Gộp theo tháng lịch (YYYY-MM) trong [from, to].
 * @returns {Promise<Map<string, { earned: number, reversed: number, shopCost: number, allocatedProfitTax: number }>>}
 */
async function sumDailyByMonthKeyBetween(fromYmd, toYmd) {
  const hasAlloc = await hasAllocatedProfitTaxColumn();
  const rows = await db(dailyTableName)
    .whereBetween(col.SUMMARY_DATE, [fromYmd, toYmd])
    .select(
      db.raw(`to_char(??::date, 'YYYY-MM') AS mk`, [col.SUMMARY_DATE]),
      db.raw(`COALESCE(SUM(??), 0) AS earned`, [col.EARNED_REVENUE]),
      db.raw(`COALESCE(SUM(??), 0) AS reversed`, [col.REVENUE_REVERSED]),
      db.raw(`COALESCE(SUM(??), 0) AS shop_cost`, [col.TOTAL_SHOP_COST]),
      selectAllocatedProfitSum(hasAlloc)
    )
    .groupByRaw(`to_char(??::date, 'YYYY-MM')`, [col.SUMMARY_DATE]);

  const map = new Map();
  for (const r of rows || []) {
    const mk = String(r.mk || "").trim();
    if (!mk) continue;
    map.set(mk, {
      earned: toNumber(r.earned),
      reversed: toNumber(r.reversed),
      shopCost: toNumber(r.shop_cost),
      allocatedProfitTax: toNumber(r.allocated_profit_tax),
    });
  }
  return map;
}

/**
 * Gộp theo năm lịch (YYYY) trong [from, to].
 * @returns {Promise<Map<string, { earned: number, reversed: number, shopCost: number, allocatedProfitTax: number }>>}
 */
async function sumDailyByYearKeyBetween(fromYmd, toYmd) {
  const hasAlloc = await hasAllocatedProfitTaxColumn();
  const rows = await db(dailyTableName)
    .whereBetween(col.SUMMARY_DATE, [fromYmd, toYmd])
    .select(
      db.raw(`to_char(??::date, 'YYYY') AS yk`, [col.SUMMARY_DATE]),
      db.raw(`COALESCE(SUM(??), 0) AS earned`, [col.EARNED_REVENUE]),
      db.raw(`COALESCE(SUM(??), 0) AS reversed`, [col.REVENUE_REVERSED]),
      db.raw(`COALESCE(SUM(??), 0) AS shop_cost`, [col.TOTAL_SHOP_COST]),
      selectAllocatedProfitSum(hasAlloc)
    )
    .groupByRaw(`to_char(??::date, 'YYYY')`, [col.SUMMARY_DATE]);

  const map = new Map();
  for (const r of rows || []) {
    const yk = String(r.yk || "").trim();
    if (!yk) continue;
    map.set(yk, {
      earned: toNumber(r.earned),
      reversed: toNumber(r.reversed),
      shopCost: toNumber(r.shop_cost),
      allocatedProfitTax: toNumber(r.allocated_profit_tax),
    });
  }
  return map;
}

module.exports = {
  sumDailyKpisForRange,
  dailyRowMapBetween,
  sumDailyByMonthKeyBetween,
  sumDailyByYearKeyBetween,
  toNumber,
};

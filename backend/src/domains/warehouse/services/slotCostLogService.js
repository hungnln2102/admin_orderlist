/**
 * Read-only queries for daily vacant-slot cost ledger.
 */
const { db, TABLES } = require("@/db");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};
async function listSlotDailyLogs({
  packageId,
  importOrderId,
  date,
  fromDate,
  toDate,
  page = 1,
  limit = 50,
} = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(200, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const query = db(TABLES.PACKAGE_SLOT_DAILY_LOGS + " as log")
    .join(TABLES.PACKAGE_PRODUCT + " as pp", "log.package_product_id", "pp.id")
    .select(
      "log.id",
      "log.log_date",
      "log.package_product_id",
      "pp.package_name",
      "log.import_order_id",
      "log.import_order_code",
      "log.account_username",
      "log.total_slots",
      "log.occupied_slots",
      "log.vacant_slots",
      "log.cost_per_slot_day",
      "log.vacant_cost",
      "log.note",
      "log.metadata",
      "log.created_at",
      "log.updated_at"
    );

  if (packageId) query.where("log.package_product_id", Number(packageId));
  if (importOrderId) query.where("log.import_order_id", Number(importOrderId));
  if (date) query.where("log.log_date", date);
  if (fromDate) query.where("log.log_date", ">=", fromDate);
  if (toDate) query.where("log.log_date", "<=", toDate);

  const [stats, countRes] = await Promise.all([
    query
      .clone()
      .clearSelect()
      .select(
        db.raw("COALESCE(SUM(log.vacant_cost), 0)::numeric as total_vacant_cost"),
        db.raw("COALESCE(SUM(log.vacant_slots), 0)::int as total_vacant_slots")
      )
      .first(),
    query.clone().clearSelect().count("log.id as count").first(),
  ]);

  const totalItems = Number(countRes?.count || 0);

  const rows = await query
    .orderBy("log.log_date", "desc")
    .orderBy("log.id", "desc")
    .limit(limitNum)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      ...r,
      total_slots: Number(r.total_slots),
      occupied_slots: Number(r.occupied_slots),
      vacant_slots: Number(r.vacant_slots),
      cost_per_slot_day: toNumber(r.cost_per_slot_day),
      vacant_cost: toNumber(r.vacant_cost),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum) || 1,
    },
    stats: {
      totalVacantCost: toNumber(stats?.total_vacant_cost || 0),
      totalVacantSlots: Number(stats?.total_vacant_slots || 0),
    },
  };
}

module.exports = { listSlotDailyLogs };


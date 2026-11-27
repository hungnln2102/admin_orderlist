/**
 * creditService.js (V2)
 * Service truy vấn bảng refund_credit_notes + refund_credit_applications
 * Trả về 2 danh sách: khả dụng và không khả dụng / đã áp dụng
 */
const { db, TABLES, COLS } = require("@/db");

const RCN = COLS.REFUND_CREDIT_NOTES;
const RCA = COLS.REFUND_CREDIT_APPLICATIONS;

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Lấy danh sách credit theo nhóm trạng thái
 * @param {Object} params
 * @param {string} params.group - "available" | "unavailable"
 * @param {string} [params.search] - tìm kiếm theo mã credit, mã đơn, tên khách
 * @param {number} [params.page] - trang (1-indexed)
 * @param {number} [params.limit] - số dòng mỗi trang
 */
async function getCreditNotes({ group = "available", search, page = 1, limit = 20 }) {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (page - 1) * limit;

  // Subquery: aggregate applied info per credit_note
  const appAggregate = db(TABLES.REFUND_CREDIT_APPLICATIONS + " as rca")
    .select("rca.credit_note_id")
    .count("* as applied_count")
    .sum({ applied_total: "rca.applied_amount" })
    .max({ last_applied_at: "rca.applied_at" })
    .groupBy("rca.credit_note_id")
    .as("app");

  const baseQuery = db(TABLES.REFUND_CREDIT_NOTES + " as rcn")
    .leftJoin(appAggregate, "app.credit_note_id", "rcn.id");

  // Search filter
  if (search && search.trim()) {
    const searchLike = `%${search.trim()}%`;
    baseQuery.where((qb) => {
      qb.whereRaw("rcn.credit_code ILIKE ?", [searchLike])
        .orWhereRaw("COALESCE(rcn.source_order_code::text, '') ILIKE ?", [searchLike])
        .orWhereRaw("COALESCE(rcn.customer_name::text, '') ILIKE ?", [searchLike])
        .orWhereRaw("COALESCE(rcn.customer_contact::text, '') ILIKE ?", [searchLike]);
    });
  }

  // Group filter
  const filteredQuery = baseQuery.clone();
  if (group === "available") {
    filteredQuery.whereRaw(`
      UPPER(COALESCE(rcn.status::text, '')) IN ('OPEN', 'PARTIALLY_APPLIED')
      AND COALESCE(rcn.available_amount, 0) > 0
    `);
  } else {
    // unavailable: FULLY_APPLIED, VOID, hoặc available_amount <= 0
    filteredQuery.whereRaw(`
      UPPER(COALESCE(rcn.status::text, '')) IN ('FULLY_APPLIED', 'VOID')
      OR COALESCE(rcn.available_amount, 0) <= 0
    `);
  }

  // Count total
  const totalRow = await filteredQuery.clone()
    .clearSelect()
    .clearOrder()
    .count({ total: "rcn.id" })
    .first();
  const total = toNumber(totalRow?.total);

  // Fetch rows
  const rows = await filteredQuery.clone()
    .select(
      "rcn.id",
      "rcn.credit_code",
      "rcn.source_order_list_id",
      "rcn.source_order_code",
      "rcn.customer_name",
      "rcn.customer_contact",
      "rcn.refund_amount",
      "rcn.available_amount",
      "rcn.status",
      "rcn.note",
      "rcn.issued_at",
      "rcn.created_at",
      "rcn.updated_at",
      db.raw("COALESCE(app.applied_total, 0)::numeric as applied_total"),
      db.raw("COALESCE(app.applied_count, 0)::integer as applied_count"),
      db.raw("app.last_applied_at::text as last_applied_at"),
    )
    .orderBy("rcn.id", "desc")
    .limit(limit)
    .offset(offset);

  // Stats: đếm tổng 2 nhóm
  const statsRow = await baseQuery.clone()
    .clearSelect()
    .clearOrder()
    .select(
      db.raw("COUNT(rcn.id)::integer as total_count"),
      db.raw(`SUM(CASE WHEN UPPER(COALESCE(rcn.status::text, '')) IN ('OPEN', 'PARTIALLY_APPLIED') AND COALESCE(rcn.available_amount, 0) > 0 THEN 1 ELSE 0 END)::integer as available_count`),
      db.raw(`SUM(CASE WHEN UPPER(COALESCE(rcn.status::text, '')) IN ('FULLY_APPLIED', 'VOID') OR COALESCE(rcn.available_amount, 0) <= 0 THEN 1 ELSE 0 END)::integer as unavailable_count`),
    )
    .first();

  return {
    items: rows.map(mapCreditRow),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
    stats: {
      total_count: toNumber(statsRow?.total_count),
      available_count: toNumber(statsRow?.available_count),
      unavailable_count: toNumber(statsRow?.unavailable_count),
    },
  };
}

function mapCreditRow(row) {
  const rawStatus = String(row?.status || "").trim().toUpperCase();
  const refundAmount = toNumber(row?.refund_amount);
  const availableAmount = toNumber(row?.available_amount);
  const appliedCount = toNumber(row?.applied_count);
  const appliedTotal = toNumber(row?.applied_total);
  const isAvailable = ["OPEN", "PARTIALLY_APPLIED"].includes(rawStatus) && availableAmount > 0;

  return {
    id: Number(row?.id || 0),
    credit_code: String(row?.credit_code || ""),
    source_order_list_id: row?.source_order_list_id != null ? Number(row.source_order_list_id) : null,
    source_order_code: String(row?.source_order_code || ""),
    customer_name: String(row?.customer_name || ""),
    customer_contact: String(row?.customer_contact || ""),
    refund_amount: refundAmount,
    available_amount: availableAmount,
    applied_total: appliedTotal,
    applied_count: appliedCount,
    status: rawStatus,
    note: row?.note != null ? String(row.note) : null,
    issued_at: row?.issued_at ? String(row.issued_at) : null,
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
    last_applied_at: row?.last_applied_at ? String(row.last_applied_at) : null,
    is_available: isAvailable,
  };
}

async function getCreditApplications({ search, page = 1, limit = 20 }) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const history = db({ application: TABLES.REFUND_CREDIT_APPLICATIONS })
    .join({ credit: TABLES.REFUND_CREDIT_NOTES }, `credit.${RCN.ID}`, `application.${RCA.CREDIT_NOTE_ID}`)
    .select({
      id: `application.${RCA.ID}`,
      credit_code: `credit.${RCN.CREDIT_CODE}`,
      target_order_code: `application.${RCA.TARGET_ORDER_CODE}`,
      applied_amount: `application.${RCA.APPLIED_AMOUNT}`,
      applied_at: `application.${RCA.APPLIED_AT}`,
    })
    .select(db.raw(
      `?? - SUM(??) OVER (PARTITION BY ?? ORDER BY ?? ROWS UNBOUNDED PRECEDING) AS remaining_amount`,
      [`credit.${RCN.REFUND_AMOUNT}`, `application.${RCA.APPLIED_AMOUNT}`,
        `application.${RCA.CREDIT_NOTE_ID}`, `application.${RCA.ID}`],
    ))
    .as("history");

  const query = db.from(history);
  if (typeof search === "string" && search.trim()) {
    const pattern = `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`;
    query.where((builder) => {
      builder.whereILike("credit_code", pattern).orWhereILike("target_order_code", pattern);
    });
  }

  const [count, rows] = await Promise.all([
    query.clone().count({ total: "*" }).first(),
    query.clone().select("*").orderBy("applied_at", "desc").orderBy("id", "desc")
      .limit(limit).offset((page - 1) * limit),
  ]);
  const total = toNumber(count?.total);

  return {
    items: rows.map((row) => ({
      ...row,
      applied_amount: toNumber(row.applied_amount),
      remaining_amount: toNumber(row.remaining_amount),
    })),
    pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

module.exports = {
  getCreditNotes,
  getCreditApplications,
};

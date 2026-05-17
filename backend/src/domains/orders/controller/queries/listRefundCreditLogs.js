const { db } = require("../../../../db");
const { TABLES } = require("../constants");

const STATUS_GROUPS = {
    ALL: "all",
    AVAILABLE: "available",
    APPLIED: "applied",
    UNAVAILABLE: "unavailable",
};

const SORT_OPTIONS = {
    issued_at_desc: { column: "rcn.issued_at", direction: "desc" },
    issued_at_asc: { column: "rcn.issued_at", direction: "asc" },
    updated_at_desc: { column: "rcn.updated_at", direction: "desc" },
    available_amount_desc: { column: "rcn.available_amount", direction: "desc" },
    available_amount_asc: { column: "rcn.available_amount", direction: "asc" },
};

const AVAILABLE_CONDITION = `
    UPPER(COALESCE(rcn.status::text, '')) IN ('OPEN', 'PARTIALLY_APPLIED')
    AND COALESCE(rcn.available_amount, 0) > 0
`;

const APPLIED_CONDITION = `
    COALESCE(app.applied_count, 0) > 0
    OR COALESCE(rcn.refund_amount, 0) > COALESCE(rcn.available_amount, 0)
`;

const UNAVAILABLE_CONDITION = `
    UPPER(COALESCE(rcn.status::text, '')) IN ('FULLY_APPLIED', 'VOID')
    OR COALESCE(rcn.available_amount, 0) <= 0
`;

const toIntInRange = (value, fallback, min, max) => {
    const n = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

const normalizeStatusGroup = (raw) => {
    const value = String(raw || "").trim().toLowerCase();
    if (value === STATUS_GROUPS.AVAILABLE) return STATUS_GROUPS.AVAILABLE;
    if (value === STATUS_GROUPS.APPLIED) return STATUS_GROUPS.APPLIED;
    if (value === STATUS_GROUPS.UNAVAILABLE) return STATUS_GROUPS.UNAVAILABLE;
    return STATUS_GROUPS.ALL;
};

const normalizeSort = (raw) => {
    const key = String(raw || "").trim().toLowerCase();
    if (SORT_OPTIONS[key]) return key;
    return "issued_at_desc";
};

const parseRefundCreditLogsQuery = (query) => {
    const page = toIntInRange(query?.page, 1, 1, 10_000);
    const limit = toIntInRange(query?.limit, 20, 1, 200);
    const statusGroup = normalizeStatusGroup(query?.status_group);
    const sort = normalizeSort(query?.sort);
    const q = String(query?.q || "").trim();
    return {
        q,
        page,
        limit,
        statusGroup,
        sort,
    };
};

const buildBaseQuery = ({ q }) => {
    const appAggregate = db(`${TABLES.refundCreditApplications} as rca`)
        .select("rca.credit_note_id")
        .count("* as applied_count")
        .sum({ applied_total: "rca.applied_amount" })
        .max({ last_applied_at: "rca.applied_at" })
        .groupBy("rca.credit_note_id")
        .as("app");

    const query = db(`${TABLES.refundCreditNotes} as rcn`)
        .leftJoin(appAggregate, "app.credit_note_id", "rcn.id");

    if (q) {
        const searchLike = `%${q}%`;
        query.where((qb) => {
            qb.whereRaw("rcn.credit_code ILIKE ?", [searchLike])
                .orWhereRaw("COALESCE(rcn.source_order_code::text, '') ILIKE ?", [searchLike])
                .orWhereRaw("COALESCE(rcn.customer_name::text, '') ILIKE ?", [searchLike])
                .orWhereRaw("COALESCE(rcn.customer_contact::text, '') ILIKE ?", [searchLike])
                .orWhereRaw(
                    `EXISTS (
                        SELECT 1
                        FROM ${TABLES.refundCreditApplications} rca_q
                        WHERE rca_q.credit_note_id = rcn.id
                          AND COALESCE(rca_q.target_order_code::text, '') ILIKE ?
                    )`,
                    [searchLike]
                );
        });
    }

    return query;
};

const applyStatusGroupFilter = (query, statusGroup) => {
    if (statusGroup === STATUS_GROUPS.AVAILABLE) {
        query.whereRaw(AVAILABLE_CONDITION);
        return;
    }
    if (statusGroup === STATUS_GROUPS.APPLIED) {
        query.whereRaw(APPLIED_CONDITION);
        return;
    }
    if (statusGroup === STATUS_GROUPS.UNAVAILABLE) {
        query.whereRaw(UNAVAILABLE_CONDITION);
    }
};

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

let refundedCashoutColumnExistsCache = null;

const hasRefundedCashoutAtColumn = async () => {
    if (typeof refundedCashoutColumnExistsCache === "boolean") {
        return refundedCashoutColumnExistsCache;
    }

    try {
        const result = await db.raw(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = ?
                      AND table_name = ?
                      AND column_name = ?
                ) AS exists
            `,
            ["receipt", "refund_credit_notes", "refunded_cashout_at"]
        );
        refundedCashoutColumnExistsCache = Boolean(result?.rows?.[0]?.exists);
    } catch {
        refundedCashoutColumnExistsCache = false;
    }

    return refundedCashoutColumnExistsCache;
};

const mapLogRow = (row) => {
    const rawStatus = String(row?.status || "").trim().toUpperCase();
    const note = row?.note != null ? String(row.note) : null;
    const refundedCashoutAt = row?.refunded_cashout_at ? String(row.refunded_cashout_at) : null;
    const isRefunded = refundedCashoutAt != null;
    const status = isRefunded ? "REFUNDED" : rawStatus;
    const refundAmount = toNumber(row?.refund_amount);
    const availableAmount = toNumber(row?.available_amount);
    const appliedCount = toNumber(row?.applied_count);
    const appliedTotal = toNumber(row?.applied_total);
    const isAvailable = ["OPEN", "PARTIALLY_APPLIED"].includes(status) && availableAmount > 0;
    const isApplied = appliedCount > 0 || refundAmount > availableAmount;
    const isUnavailable = ["FULLY_APPLIED", "VOID"].includes(status) || availableAmount <= 0;

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
        status,
        note,
        refunded_cashout_at: refundedCashoutAt,
        issued_at: row?.issued_at ? String(row.issued_at) : null,
        updated_at: row?.updated_at ? String(row.updated_at) : null,
        created_at: row?.created_at ? String(row.created_at) : null,
        last_applied_at: row?.last_applied_at ? String(row.last_applied_at) : null,
        latest_target_order_code: row?.latest_target_order_code
            ? String(row.latest_target_order_code)
            : null,
        is_available: isAvailable,
        is_applied: isApplied,
        is_unavailable: isUnavailable,
        is_refunded: isRefunded,
    };
};

const listRefundCreditLogs = async (params) => {
    const { page, limit, statusGroup, sort } = params;
    const offset = (page - 1) * limit;
    const { column, direction } = SORT_OPTIONS[sort] || SORT_OPTIONS.issued_at_desc;
    const hasRefundedCashoutAt = await hasRefundedCashoutAtColumn();

    const baseQuery = buildBaseQuery(params);
    const filteredQuery = baseQuery.clone();
    applyStatusGroupFilter(filteredQuery, statusGroup);

    const totalRow = await filteredQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .count({ total: "rcn.id" })
        .first();
    const total = toNumber(totalRow?.total);

    const rows = await filteredQuery
        .clone()
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
            ...(hasRefundedCashoutAt
                ? ["rcn.refunded_cashout_at"]
                : [db.raw("NULL::text as refunded_cashout_at")]),
            "rcn.issued_at",
            "rcn.created_at",
            "rcn.updated_at",
            db.raw("COALESCE(app.applied_total, 0)::numeric as applied_total"),
            db.raw("COALESCE(app.applied_count, 0)::integer as applied_count"),
            db.raw("app.last_applied_at::text as last_applied_at"),
            db.raw(
                `(
                    SELECT rca_latest.target_order_code
                    FROM ${TABLES.refundCreditApplications} rca_latest
                    WHERE rca_latest.credit_note_id = rcn.id
                    ORDER BY rca_latest.applied_at DESC NULLS LAST, rca_latest.id DESC
                    LIMIT 1
                )::text as latest_target_order_code`
            )
        )
        .orderByRaw(`${column} ${direction} NULLS LAST`)
        .orderBy("rcn.id", "desc")
        .limit(limit)
        .offset(offset);

    const statsRow = await baseQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .select(
            db.raw("COUNT(rcn.id)::integer as total_count"),
            db.raw(`SUM(CASE WHEN ${AVAILABLE_CONDITION} THEN 1 ELSE 0 END)::integer as available_count`),
            db.raw(`SUM(CASE WHEN ${APPLIED_CONDITION} THEN 1 ELSE 0 END)::integer as applied_count`),
            db.raw(`SUM(CASE WHEN ${UNAVAILABLE_CONDITION} THEN 1 ELSE 0 END)::integer as unavailable_count`)
        )
        .first();

    return {
        items: rows.map(mapLogRow),
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.max(1, Math.ceil(total / limit)),
        },
        filters: {
            q: params.q,
            status_group: statusGroup,
            sort,
        },
        stats: {
            total_count: toNumber(statsRow?.total_count),
            available_count: toNumber(statsRow?.available_count),
            applied_count: toNumber(statsRow?.applied_count),
            unavailable_count: toNumber(statsRow?.unavailable_count),
        },
    };
};

module.exports = {
    STATUS_GROUPS,
    parseRefundCreditLogsQuery,
    listRefundCreditLogs,
};

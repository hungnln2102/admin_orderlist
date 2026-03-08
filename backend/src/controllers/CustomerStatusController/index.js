/**
 * Danh sách CTV/khách hàng: accounts + wallets (số dư).
 * Không join customer_profiles để tránh lỗi khi bảng chưa tồn tại; khi có bảng có thể bật lại.
 */

const { db } = require("../../db");
const logger = require("../../utils/logger");
const {
  IDENTITY_SCHEMA,
  WALLET_SCHEMA,
  tableName,
  SCHEMA_IDENTITY,
  SCHEMA_WALLET,
} = require("../../config/dbSchema");

const ACCOUNTS_TABLE = tableName(IDENTITY_SCHEMA.ACCOUNTS.TABLE, SCHEMA_IDENTITY);
const WALLETS_TABLE = tableName(WALLET_SCHEMA.WALLETS.TABLE, SCHEMA_WALLET);

const A = IDENTITY_SCHEMA.ACCOUNTS.COLS;
const W = WALLET_SCHEMA.WALLETS.COLS;

/** tier_id → label hạng (dùng khi có customer_profiles) */
const TIER_LABELS = {
  1: "Mới",
  2: "Đồng",
  3: "Bạc",
  4: "Vàng",
  5: "Kim cương",
};

function mapRowToItem(r) {
  const now = new Date();
  const suspendedUntil = r.suspended_until ? new Date(r.suspended_until) : null;
  let status = "active";
  if (r.is_active === false || r.is_active === 0) status = "inactive";
  else if (suspendedUntil && suspendedUntil > now) status = "suspended";

  const rank = (r.tier_id != null && TIER_LABELS[r.tier_id]) ? TIER_LABELS[r.tier_id] : "Mới";

  return {
    id: String(r.account_id),
    account: r.username || "",
    lastName: r.last_name || "",
    firstName: r.first_name || "",
    email: r.email || "",
    balance: Number(r.balance) || 0,
    totalSpent: 0,
    rank,
    status,
    roleId: r.role_id != null ? Number(r.role_id) : null,
  };
}

/**
 * GET /api/customer-status
 * Trả về danh sách: accounts + wallets (số dư). Không phụ thuộc customer_profiles.
 */
async function listCustomerStatus(_req, res) {
  try {
    const rows = await db(ACCOUNTS_TABLE)
      .leftJoin(WALLETS_TABLE, `${WALLETS_TABLE}.${W.ACCOUNT_ID}`, `${ACCOUNTS_TABLE}.${A.ID}`)
      .select(
        `${ACCOUNTS_TABLE}.${A.ID} as account_id`,
        `${ACCOUNTS_TABLE}.${A.USERNAME} as username`,
        `${ACCOUNTS_TABLE}.${A.EMAIL} as email`,
        `${ACCOUNTS_TABLE}.${A.IS_ACTIVE} as is_active`,
        `${ACCOUNTS_TABLE}.${A.SUSPENDED_UNTIL} as suspended_until`,
        `${ACCOUNTS_TABLE}.${A.ROLE_ID} as role_id`,
        db.raw(`COALESCE(${WALLETS_TABLE}.${W.BALANCE}, 0) as balance`)
      )
      .orderBy(`${ACCOUNTS_TABLE}.${A.ID}`, "asc");

    const items = rows.map((r) =>
      mapRowToItem({
        ...r,
        first_name: null,
        last_name: null,
        tier_id: null,
      })
    );

    res.json({ items });
  } catch (err) {
    logger.error("[customer-status] list failed", { error: err.message, stack: err.stack });
    res.status(500).json({
      error: err.message || "Không thể tải danh sách khách hàng.",
    });
  }
}

module.exports = {
  listCustomerStatus,
};

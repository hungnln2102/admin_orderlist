/**
 * In ra users_snapshot trong DB + kết quả inferAdobeProProductIdSet / applyAdobeProFlags
 * (cùng logic với JIL users API sau xử lý), không cần Playwright.
 *
 * Usage (từ backend):
 *   node scripts/ops/dump-snapshot-flags-for-admin-email.js matthew.mack39211@graphiclean.site
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { db } = require("../../src/db");
const { TABLE, COLS } = require("../../src/controllers/RenewAdobeController/accountTable");
const { applyAdobeProFlags } = require("../../src/services/adobe-renew-v2/shared/usersListApi");
const {
  inferAdobeProProductIdSet,
  parseCcpProductIdsFromAlertConfig,
} = require("../../src/services/adobe-renew-v2/shared/accessChecks");

async function main() {
  const target = (process.argv[2] || "").trim().toLowerCase();
  if (!target) {
    console.error("Thiếu email admin.");
    process.exit(1);
  }

  const row = await db(TABLE)
    .whereRaw(`LOWER(TRIM(${COLS.EMAIL})) = ?`, [target])
    .first();

  if (!row) {
    console.error("Không tìm thấy account:", target);
    process.exit(1);
  }

  let snap = [];
  try {
    snap = JSON.parse(row[COLS.USERS_SNAPSHOT] || "[]");
  } catch (e) {
    console.error("Parse users_snapshot lỗi:", e.message);
    process.exit(1);
  }

  const admin = String(row[COLS.EMAIL] || "").trim().toLowerCase();
  const asApiUsers = snap.map((u) => ({
    id: u.id || null,
    name: u.name || "",
    email: String(u.email || "").trim(),
    products: Array.isArray(u.products) ? u.products : [],
    accountStatus: null,
    product: false,
    hasProduct: false,
  }));

  const pinnedFromDb = parseCcpProductIdsFromAlertConfig(row[COLS.ALERT_CONFIG]);
  const proIds = inferAdobeProProductIdSet(asApiUsers, admin, pinnedFromDb);
  const flagged = applyAdobeProFlags(asApiUsers, admin, pinnedFromDb);

  const out = {
    source: "db_users_snapshot",
    adminEmail: row[COLS.EMAIL],
    org_name: row[COLS.ORG_NAME],
    license_status: row[COLS.LICENSE_STATUS],
    user_count_db: row[COLS.USER_COUNT],
    ccp_product_ids_from_db: pinnedFromDb,
    effective_ccp_product_ids: [...proIds],
    users: flagged.map((u) => ({
      email: u.email,
      name: u.name,
      hasProduct: u.hasProduct,
      product: u.product,
      products: u.products,
    })),
  };

  console.log(JSON.stringify(out, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.destroy().catch(() => {}));

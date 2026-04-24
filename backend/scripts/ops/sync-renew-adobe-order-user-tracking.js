/**
 * Ghi (upsert) các đơn thuộc hệ renew_adobe vào system_automation.order_user_tracking.
 *
 * Nguồn: orders.order_list (id_product thuộc product_system.system_code = renew_adobe)
 * + system_automation.user_account_mapping + org_name từ accounts_admin.
 *
 * Usage (từ thư mục backend):
 *   node scripts/ops/sync-renew-adobe-order-user-tracking.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { db } = require("../../src/db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../src/config/dbSchema");
const {
  TBL_ORDER,
  ORD_COLS,
  getRenewAdobeVariantIds,
} = require("../../src/controllers/RenewAdobeController/orderAccess");

const TRACK_TABLE = "system_automation.order_user_tracking";

const MAP_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const MAP_COLS = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.COLS;

const ACC_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE,
  SCHEMA_RENEW_ADOBE
);
const ACC_COLS = RENEW_ADOBE_SCHEMA.ACCOUNT.COLS;

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** product cột DB có thể boolean / 'true'|'false' / chuỗi CCP — khớp ý nghĩa với UI renew-adobe. */
function mappingImpliesHasPackage(productRaw) {
  if (productRaw === false || productRaw === 0) return false;
  if (productRaw === true || productRaw === 1) return true;
  if (typeof productRaw === "string") {
    const n = productRaw.trim().toLowerCase();
    if (!n) return true;
    if (["false", "0", "no"].includes(n)) return false;
    if (["true", "1", "yes"].includes(n)) return true;
    return (
      n.includes("ccp") ||
      n.includes("creative cloud pro") ||
      n.includes("creativecloudpro") ||
      n.includes("all apps") ||
      n.includes("all-app") ||
      n.includes("all app")
    );
  }
  return true;
}

function resolveRowStatus({ informationOrder, mapping }) {
  const email = normalizeEmail(informationOrder);
  if (!email) return "chưa add";
  if (!mapping) return "chưa add";
  const adobeId = mapping[MAP_COLS.ADOBE_ACCOUNT_ID];
  if (adobeId == null || adobeId === "") return "chưa add";
  if (!mappingImpliesHasPackage(mapping[MAP_COLS.PRODUCT])) {
    return "chưa cấp quyền";
  }
  return "có gói";
}

async function main() {
  const variantIds = await getRenewAdobeVariantIds();
  if (!variantIds.length) {
    console.log("[sync-order-user-tracking] Không có variant renew_adobe — bỏ qua.");
    return { upserted: 0 };
  }

  const orders = await db(TBL_ORDER)
    .select(
      ORD_COLS.ID_ORDER,
      ORD_COLS.CUSTOMER,
      ORD_COLS.INFORMATION_ORDER,
      db.raw(
        `((${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date as expired_vn`
      )
    )
    .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
    .orderBy(ORD_COLS.ID_ORDER, "asc");

  const orderCodes = orders
    .map((o) => String(o[ORD_COLS.ID_ORDER] || "").trim())
    .filter(Boolean);

  const mappings =
    orderCodes.length > 0
      ? await db(MAP_TABLE)
          .select(
            MAP_COLS.USER_EMAIL,
            MAP_COLS.ORDER_ID,
            MAP_COLS.ADOBE_ACCOUNT_ID,
            MAP_COLS.PRODUCT
          )
          .whereIn(MAP_COLS.ORDER_ID, orderCodes)
      : [];

  const mapByOrderAndEmail = new Map();
  for (const m of mappings) {
    const oc = String(m[MAP_COLS.ORDER_ID] || "").trim();
    const em = normalizeEmail(m[MAP_COLS.USER_EMAIL]);
    if (!oc || !em) continue;
    mapByOrderAndEmail.set(`${oc}::${em}`, m);
  }

  const accountIds = [
    ...new Set(
      mappings
        .map((m) => m[MAP_COLS.ADOBE_ACCOUNT_ID])
        .filter((id) => id != null && Number.isFinite(Number(id)))
        .map((id) => Number(id))
    ),
  ];

  const orgByAccountId = new Map();
  if (accountIds.length > 0) {
    const accRows = await db(ACC_TABLE)
      .select(ACC_COLS.ID, ACC_COLS.ORG_NAME)
      .whereIn(ACC_COLS.ID, accountIds);
    for (const a of accRows) {
      orgByAccountId.set(Number(a[ACC_COLS.ID]), a[ACC_COLS.ORG_NAME] ?? null);
    }
  }

  let upserted = 0;
  const trx = await db.transaction();
  try {
    for (const o of orders) {
      const orderId = String(o[ORD_COLS.ID_ORDER] || "").trim();
      if (!orderId) continue;

      const info = o[ORD_COLS.INFORMATION_ORDER];
      const emailKey = normalizeEmail(info);
      const mapping = emailKey
        ? mapByOrderAndEmail.get(`${orderId}::${emailKey}`)
        : null;

      const status = resolveRowStatus({
        informationOrder: info,
        mapping,
      });

      const adobeId = mapping?.[MAP_COLS.ADOBE_ACCOUNT_ID];
      const orgName =
        adobeId != null && Number.isFinite(Number(adobeId))
          ? orgByAccountId.get(Number(adobeId)) ?? null
          : null;

      const expired = o.expired_vn ?? null;
      const customer = o[ORD_COLS.CUSTOMER] ?? null;
      const account = emailKey || null;

      await trx(TRACK_TABLE)
        .insert({
          order_id: orderId,
          customer,
          account,
          org_name: orgName,
          expired,
          status,
          update_at: trx.fn.now(),
        })
        .onConflict("order_id")
        .merge({
          customer,
          account,
          org_name: orgName,
          expired,
          status,
          update_at: trx.fn.now(),
        });

      upserted += 1;
    }
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }

  console.log(
    `[sync-order-user-tracking] Đã upsert ${upserted} đơn (variant renew_adobe: ${variantIds.length}).`
  );
  return { upserted };
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-order-user-tracking] Lỗi:", err.message);
    console.error(err.stack);
    process.exit(1);
  });

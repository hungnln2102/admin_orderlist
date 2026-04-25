/**
 * Đồng bộ `system_automation.order_user_tracking` cho đơn Renew Adobe.
 * - Mỗi order_id một dòng (UNIQUE trên DB).
 * - Ưu tiên cập nhật theo sự kiện (check account / gán user), tránh quét full bảng theo chu kỳ.
 */

const { db } = require("../../db");
const logger = require("../../utils/logger");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const {
  TBL_ORDER,
  ORD_COLS,
  getRenewAdobeVariantIds,
} = require("../../controllers/RenewAdobeController/orderAccess");

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

/** Khớp key với cách lưu org_name trên order_user_tracking (trim + lower). */
function normalizeOrgKeyForTracking(orgName) {
  const s = String(orgName ?? "").trim().toLowerCase();
  return s || "";
}

/**
 * Số dòng trong order_user_tracking theo từng admin: đếm các dòng có org_name
 * trùng (sau chuẩn hóa) với org_name của tài khoản admin.
 * @param {object[]} accountRows - rows có ít nhất id và org_name
 * @param {string} [idCol='id']
 * @param {string} [orgCol='org_name']
 * @returns {Promise<Map<number, number>>}
 */
async function getOrderUserTrackingCountsForAdminAccounts(
  accountRows,
  idCol = "id",
  orgCol = "org_name"
) {
  const result = new Map();
  if (!accountRows || accountRows.length === 0) return result;

  for (const r of accountRows) {
    const id = Number(r[idCol]);
    if (Number.isFinite(id) && id > 0) result.set(id, 0);
  }

  const countsByOrg = await db(TRACK_TABLE)
    .select(db.raw(`lower(trim(org_name)) as org_key`))
    .count("* as c")
    .whereNotNull("org_name")
    .andWhereRaw("btrim(org_name) <> ''")
    .groupByRaw("lower(trim(org_name))");

  const orgToCount = new Map(
    countsByOrg.map((row) => [row.org_key, Number(row.c) || 0])
  );

  for (const r of accountRows) {
    const id = Number(r[idCol]);
    if (!Number.isFinite(id) || id <= 0) continue;
    const k = normalizeOrgKeyForTracking(r[orgCol]);
    result.set(id, k ? orgToCount.get(k) ?? 0 : 0);
  }

  return result;
}

/** product cột DB: boolean / 'true'|'false' / chuỗi — chỉ CCP / Creative Cloud Pro mới là có gói (khớp accessChecks). */
function mappingImpliesHasPackage(productRaw) {
  if (productRaw === false || productRaw === 0) return false;
  if (productRaw === true || productRaw === 1) return true;
  if (typeof productRaw === "string") {
    const n = productRaw.trim().toLowerCase();
    if (!n) return false;
    if (["false", "0", "no"].includes(n)) return false;
    if (["true", "1", "yes"].includes(n)) return true;
    if (n.includes("miễn phí") || n.includes("mien phi")) return false;
    if (n.includes("gói thành viên") || n.includes("goi thanh vien")) return false;
    if (n.includes("thành viên miễn phí") || n.includes("thanh vien mien phi")) return false;
    if (n.includes("free membership")) return false;
    if (n.includes("free") && n.includes("member")) return false;
    return (
      n.includes("ccp") ||
      n.includes("creative cloud pro") ||
      n.includes("creativecloudpro")
    );
  }
  return Boolean(productRaw);
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

/**
 * Upsert các đơn đã lấy từ order_list (đã lọc renew_adobe nếu cần ở caller).
 * @param {object[]} orders - rows có ORD_COLS + expired_vn
 * @returns {Promise<number>} số đơn đã upsert
 */
async function upsertTrackingRowsFromOrderRows(orders) {
  if (!orders || orders.length === 0) return 0;

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

  const accountMetaById = new Map();
  if (accountIds.length > 0) {
    const accSelect = [
      ACC_COLS.ID,
      ACC_COLS.ORG_NAME,
      ...(ACC_COLS.ID_PRODUCT ? [ACC_COLS.ID_PRODUCT] : []),
    ];
    const accRows = await db(ACC_TABLE).select(...accSelect).whereIn(ACC_COLS.ID, accountIds);
    for (const a of accRows) {
      const pid =
        ACC_COLS.ID_PRODUCT && a[ACC_COLS.ID_PRODUCT] != null
          ? String(a[ACC_COLS.ID_PRODUCT]).trim()
          : "";
      accountMetaById.set(Number(a[ACC_COLS.ID]), {
        orgName: a[ACC_COLS.ORG_NAME] ?? null,
        idProduct: pid !== "" ? pid : null,
      });
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
      const meta =
        adobeId != null && Number.isFinite(Number(adobeId))
          ? accountMetaById.get(Number(adobeId))
          : null;
      const orgName = meta?.orgName ?? null;
      const idProductStr = meta?.idProduct ?? null;

      const expired = o.expired_vn ?? null;
      const customer = o[ORD_COLS.CUSTOMER] ?? null;
      const account = emailKey || null;

      const insertRow = {
        order_id: orderId,
        customer,
        account,
        org_name: orgName,
        expired,
        status,
        update_at: trx.fn.now(),
      };
      const mergeRow = {
        customer,
        account,
        org_name: orgName,
        expired,
        status,
        update_at: trx.fn.now(),
      };
      if (idProductStr) {
        insertRow.id_product = idProductStr;
        mergeRow.id_product = idProductStr;
      }

      await trx(TRACK_TABLE).insert(insertRow).onConflict("order_id").merge(mergeRow);

      upserted += 1;
    }
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }

  return upserted;
}

/**
 * Cập nhật tracking cho các mã đơn cụ thể (sau check / đổi mapping).
 * @param {string[]} orderIds
 * @returns {Promise<number>}
 */
async function upsertRenewAdobeOrderUserTrackingForOrderIds(orderIds) {
  const variantIds = await getRenewAdobeVariantIds();
  if (!variantIds.length) return 0;

  const ids = [
    ...new Set(
      (Array.isArray(orderIds) ? orderIds : [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)
    ),
  ];
  if (ids.length === 0) return 0;

  const orders = await db(TBL_ORDER)
    .select(
      ORD_COLS.ID_ORDER,
      ORD_COLS.CUSTOMER,
      ORD_COLS.INFORMATION_ORDER,
      db.raw(
        `((${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date as expired_vn`
      )
    )
    .whereIn(ORD_COLS.ID_ORDER, ids)
    .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
    .orderBy(ORD_COLS.ID_ORDER, "asc");

  const n = await upsertTrackingRowsFromOrderRows(orders);
  if (n > 0) {
    logger.info("[order-user-tracking] Đã upsert %d đơn (theo danh sách order_id).", n);
  }
  return n;
}

/**
 * Cập nhật tracking cho mọi đơn đang map vào một tài khoản Adobe admin (sau check / add user).
 * @param {number} adobeAccountId
 * @returns {Promise<number>}
 */
async function upsertRenewAdobeOrderUserTrackingForAccount(adobeAccountId) {
  const id = Number(adobeAccountId);
  if (!Number.isFinite(id) || id <= 0) return 0;

  const orderIds = await db(MAP_TABLE)
    .where(MAP_COLS.ADOBE_ACCOUNT_ID, id)
    .distinct(MAP_COLS.ORDER_ID)
    .pluck(MAP_COLS.ORDER_ID);

  const cleaned = orderIds
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);

  if (cleaned.length === 0) return 0;

  return upsertRenewAdobeOrderUserTrackingForOrderIds(cleaned);
}

/**
 * Quét toàn bộ đơn renew_adobe — chỉ dùng backfill / chạy tay, không nên gắn cron dày đặc.
 * @returns {Promise<{ upserted: number }>}
 */
async function syncAllRenewAdobeOrderUserTracking() {
  const variantIds = await getRenewAdobeVariantIds();
  if (!variantIds.length) {
    logger.info("[order-user-tracking] Không có variant renew_adobe — bỏ qua.");
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

  const upserted = await upsertTrackingRowsFromOrderRows(orders);
  logger.info(
    "[order-user-tracking] Full sync: đã upsert %d đơn (variant renew_adobe: %d).",
    upserted,
    variantIds.length
  );
  return { upserted };
}

/**
 * Số dòng order_user_tracking theo org (khớp lower(trim(org_name))).
 * Dùng để tránh tự xóa bản ghi tài khoản admin khi chưa có bản ghi tracking cho org nào.
 */
async function getOrderUserTrackingCountByOrgName(orgName) {
  const k = normalizeOrgKeyForTracking(orgName);
  if (!k) {
    return 0;
  }
  const row = await db(TRACK_TABLE)
    .whereRaw(`lower(btrim(COALESCE(org_name::text, ''))) = ?`, [k])
    .count("* as c")
    .first();
  return Number(row?.c) || 0;
}

/**
 * Cron 23:30: email (account) có expired = hôm nay (Asia/Ho_Chi_Minh), group theo adobe_account_id từ mapping.
 * @returns {Promise<Map<number, Set<string>>>}
 */
async function getMapAccountIdToUserEmailsForTrackingExpiredToday() {
  const rows = await db(TRACK_TABLE)
    .select("account")
    .whereNotNull("account")
    .whereNotNull("expired")
    .whereRaw(
      "expired = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date"
    );

  const emails = [
    ...new Set(
      rows
        .map((r) => normalizeEmail(r.account))
        .filter(Boolean)
    ),
  ];
  if (emails.length === 0) {
    return new Map();
  }

  const mapEmailCol = `${MAP_TABLE}.${MAP_COLS.USER_EMAIL}`;
  const mappings = await db(MAP_TABLE)
    .select(MAP_COLS.USER_EMAIL, MAP_COLS.ADOBE_ACCOUNT_ID)
    .whereNotNull(MAP_COLS.ADOBE_ACCOUNT_ID)
    .whereRaw(`lower(btrim(${mapEmailCol}::text)) = ANY(?::text[])`, [emails]);

  const out = new Map();
  for (const m of mappings) {
    const id = Number(m[MAP_COLS.ADOBE_ACCOUNT_ID]);
    const em = normalizeEmail(m[MAP_COLS.USER_EMAIL]);
    if (!Number.isFinite(id) || id <= 0 || !em) {
      continue;
    }
    if (!out.has(id)) {
      out.set(id, new Set());
    }
    out.get(id).add(em);
  }
  return out;
}

module.exports = {
  upsertRenewAdobeOrderUserTrackingForOrderIds,
  upsertRenewAdobeOrderUserTrackingForAccount,
  syncAllRenewAdobeOrderUserTracking,
  getOrderUserTrackingCountsForAdminAccounts,
  normalizeOrgKeyForTracking,
  getOrderUserTrackingCountByOrgName,
  getMapAccountIdToUserEmailsForTrackingExpiredToday,
};

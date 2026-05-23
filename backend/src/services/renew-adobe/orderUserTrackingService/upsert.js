const { db } = require("../../../db");
const logger = require("../../../utils/logger");
const {
  TBL_ORDER,
  ORD_COLS,
  getRenewAdobeVariantIds,
  TRACK_TABLE,
  TRACK_COLS,
  MAP_TABLE,
  MAP_COLS,
  ACC_TABLE,
  ACC_COLS,
} = require("./tables");
const { normalizeEmail, resolveRowStatus } = require("./helpers");

async function upsertTrackingRowsFromOrderRows(orders, options = undefined) {
  if (!orders || orders.length === 0) return 0;
  const explicitSystemNote =
    options && typeof options.systemNote === "string"
      ? options.systemNote.trim()
      : "";
  const explicitOtpSource =
    options && typeof options.otpSource === "string"
      ? options.otpSource.trim()
      : "";

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
        [TRACK_COLS.ORDER_ID]: orderId,
        [TRACK_COLS.CUSTOMER]: customer,
        [TRACK_COLS.ACCOUNT]: account,
        [TRACK_COLS.ORG_NAME]: orgName,
        [TRACK_COLS.EXPIRED]: expired,
        [TRACK_COLS.STATUS]: status,
        [TRACK_COLS.UPDATED_AT]: trx.fn.now(),
      };
      const mergeRow = {
        [TRACK_COLS.CUSTOMER]: customer,
        [TRACK_COLS.ACCOUNT]: account,
        [TRACK_COLS.ORG_NAME]: orgName,
        [TRACK_COLS.EXPIRED]: expired,
        [TRACK_COLS.STATUS]: status,
        [TRACK_COLS.UPDATED_AT]: trx.fn.now(),
      };
      if (idProductStr) {
        insertRow[TRACK_COLS.ID_PRODUCT] = idProductStr;
        mergeRow[TRACK_COLS.ID_PRODUCT] = idProductStr;
      }

      if (TRACK_COLS.SYSTEM_NOTE && explicitSystemNote) {
        insertRow[TRACK_COLS.SYSTEM_NOTE] = explicitSystemNote;
        mergeRow[TRACK_COLS.SYSTEM_NOTE] = explicitSystemNote;
      }
      if (TRACK_COLS.OTP_SOURCE && explicitOtpSource) {
        insertRow[TRACK_COLS.OTP_SOURCE] = explicitOtpSource;
        mergeRow[TRACK_COLS.OTP_SOURCE] = explicitOtpSource;
      }

      await trx(TRACK_TABLE).insert(insertRow).onConflict(TRACK_COLS.ORDER_ID).merge(mergeRow);
      upserted += 1;
    }
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }

  return upserted;
}

async function upsertRenewAdobeOrderUserTrackingForOrderIds(orderIds, options) {
  const enforceVariant = options?.enforceRenewAdobeVariant !== false;
  const systemNote =
    typeof options?.systemNote === "string" ? options.systemNote.trim() : "";
  const otpSource =
    typeof options?.otpSource === "string" ? options.otpSource.trim() : "";

  const ids = [
    ...new Set(
      (Array.isArray(orderIds) ? orderIds : [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)
    ),
  ];
  if (ids.length === 0) return 0;

  let variantIds = [];
  if (enforceVariant) {
    variantIds = await getRenewAdobeVariantIds();
    if (!variantIds.length) return 0;
  }

  const query = db(TBL_ORDER)
    .select(
      ORD_COLS.ID_ORDER,
      ORD_COLS.CUSTOMER,
      ORD_COLS.INFORMATION_ORDER,
      db.raw(
        `((${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date as expired_vn`
      )
    )
    .whereIn(ORD_COLS.ID_ORDER, ids);

  if (enforceVariant) {
    query.whereIn(ORD_COLS.ID_PRODUCT, variantIds);
  }

  const orders = await query.orderBy(ORD_COLS.ID_ORDER, "asc");
  const n = await upsertTrackingRowsFromOrderRows(
    orders,
    systemNote || otpSource ? { systemNote, otpSource } : undefined
  );
  if (n > 0) {
    logger.info(
      "[order-user-tracking] Đã upsert %d đơn (theo danh sách order_id, enforceVariant=%s, systemNote=%s, otpSource=%s).",
      n,
      String(enforceVariant),
      systemNote || "(default)",
      otpSource || "(default)"
    );
  }
  return n;
}

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

module.exports = {
  upsertTrackingRowsFromOrderRows,
  upsertRenewAdobeOrderUserTrackingForOrderIds,
  upsertRenewAdobeOrderUserTrackingForAccount,
  syncAllRenewAdobeOrderUserTracking,
};

const { db } = require("@/db");
const {
  TBL_ORDER,
  ORD_COLS,
  getRenewAdobeVariantIds,
  TRACK_TABLE,
  TRACK_COLS,
  MAP_TABLE,
  MAP_COLS,
} = require("@/services/renew-adobe/orderUserTrackingService/tables");
const { normalizeEmail } = require("@/services/renew-adobe/orderUserTrackingService/helpers");

async function getMapAccountIdToUserEmailsForTrackingExpiredToday() {
  const rows = await db(TRACK_TABLE)
    .select(TRACK_COLS.ACCOUNT)
    .whereNotNull(TRACK_COLS.ACCOUNT)
    .whereNotNull(TRACK_COLS.EXPIRED)
    .whereRaw(
      "expired = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date"
    );

  const emails = [
    ...new Set(
      rows
        .map((r) => normalizeEmail(r[TRACK_COLS.ACCOUNT]))
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
    if (!Number.isFinite(id) || id <= 0 || !em) continue;
    if (!out.has(id)) out.set(id, new Set());
    out.get(id).add(em);
  }
  return out;
}

async function getMapAccountIdToUserEmailsFor2330Cleanup() {
  const variantIds = await getRenewAdobeVariantIds();
  if (variantIds.length === 0) {
    return new Map();
  }

  const out = new Map();
  const add = (adobeId, em) => {
    const id = Number(adobeId);
    const e = normalizeEmail(em);
    if (!Number.isFinite(id) || id <= 0 || !e) return;
    if (!out.has(id)) out.set(id, new Set());
    out.get(id).add(e);
  };

  const tRows = await db({ t: TRACK_TABLE })
    .join({ m: MAP_TABLE }, function joinTrMap() {
      this.on(
        db.raw("CAST(?? AS TEXT)", [`m.${MAP_COLS.ORDER_ID}`]),
        "=",
        `t.${TRACK_COLS.ORDER_ID}`
      ).andOn(
        db.raw(`LOWER(TRIM(COALESCE(??, '')))`, [`m.${MAP_COLS.USER_EMAIL}`]),
        "=",
        db.raw(`LOWER(TRIM(COALESCE(??, '')))`, [`t.${TRACK_COLS.ACCOUNT}`])
      );
    })
    .whereNotNull(`m.${MAP_COLS.ADOBE_ACCOUNT_ID}`)
    .whereNotNull(`t.${TRACK_COLS.EXPIRED}`)
    .whereNotNull(`t.${TRACK_COLS.ACCOUNT}`)
    .whereRaw(
      `t.${TRACK_COLS.EXPIRED}::date <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`
    )
    .select(
      `m.${MAP_COLS.ADOBE_ACCOUNT_ID} as adobe_id`,
      db.raw(`LOWER(TRIM(COALESCE(??, ''))) as em`, [`m.${MAP_COLS.USER_EMAIL}`])
    );

  for (const r of tRows) add(r.adobe_id, r.em);

  const oRows = await db({ o: TBL_ORDER })
    .join({ m: MAP_TABLE }, function joinOrdMap() {
      this.on(`o.${ORD_COLS.ID_ORDER}`, `m.${MAP_COLS.ORDER_ID}`).andOn(
        db.raw(`LOWER(TRIM(COALESCE(??, '')))`, [`o.${ORD_COLS.INFORMATION_ORDER}`]),
        "=",
        db.raw(`LOWER(TRIM(COALESCE(??, '')))`, [`m.${MAP_COLS.USER_EMAIL}`])
      );
    })
    .whereIn(`o.${ORD_COLS.ID_PRODUCT}`, variantIds)
    .whereNotNull(`m.${MAP_COLS.ADOBE_ACCOUNT_ID}`)
    .whereNotNull(`o.${ORD_COLS.INFORMATION_ORDER}`)
    .whereNotNull(`o.${ORD_COLS.EXPIRY_DATE}`)
    .whereRaw(
      `(o.${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh' <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`
    )
    .select(
      `m.${MAP_COLS.ADOBE_ACCOUNT_ID} as adobe_id`,
      db.raw(`LOWER(TRIM(COALESCE(??, ''))) as em`, [`m.${MAP_COLS.USER_EMAIL}`])
    );

  for (const r of oRows) add(r.adobe_id, r.em);

  return out;
}

module.exports = {
  getMapAccountIdToUserEmailsForTrackingExpiredToday,
  getMapAccountIdToUserEmailsFor2330Cleanup,
};

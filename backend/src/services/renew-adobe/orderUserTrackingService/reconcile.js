const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  TRACK_TABLE,
  TRACK_COLS,
  MAP_TABLE,
  MAP_COLS,
  ACC_TABLE,
  ACC_COLS,
} = require("@/services/renew-adobe/orderUserTrackingService/tables");
const { normalizeEmail } = require("@/services/renew-adobe/orderUserTrackingService/helpers");
const {
  upsertRenewAdobeOrderUserTrackingForOrderIds,
} = require("@/services/renew-adobe/orderUserTrackingService/upsert");

async function reconcileOrderUserTrackingWithTeamMembers(
  adobeAccountId,
  manageTeamMembers
) {
  const id = Number(adobeAccountId);
  if (!Number.isFinite(id) || id <= 0) {
    return { updated: 0, onTeam: [], notOnTeam: [] };
  }

  const teamByEmail = new Map();
  for (const m of Array.isArray(manageTeamMembers) ? manageTeamMembers : []) {
    const e = normalizeEmail(m?.email);
    if (!e) continue;
    const hasP = m?.product === true || m?.hasPackage === true;
    teamByEmail.set(e, { hasProduct: hasP });
  }

  const mappingRows = await db(MAP_TABLE)
    .where(MAP_COLS.ADOBE_ACCOUNT_ID, id)
    .select(MAP_COLS.ORDER_ID, MAP_COLS.USER_EMAIL);

  if (mappingRows.length === 0) {
    return { updated: 0, onTeam: [], notOnTeam: [] };
  }

  const acc = await db(ACC_TABLE)
    .select(ACC_COLS.ORG_NAME, ACC_COLS.ID_PRODUCT)
    .where(ACC_COLS.ID, id)
    .first();

  const orgName = acc?.[ACC_COLS.ORG_NAME] ?? null;
  const idProductStr =
    ACC_COLS.ID_PRODUCT && acc?.[ACC_COLS.ID_PRODUCT] != null
      ? String(acc[ACC_COLS.ID_PRODUCT]).trim()
      : null;

  const onTeamSet = new Set();
  const notOnTeamSet = new Set();
  for (const row of mappingRows) {
    const em = normalizeEmail(row[MAP_COLS.USER_EMAIL]);
    if (!em) continue;
    if (teamByEmail.has(em)) onTeamSet.add(em);
    else notOnTeamSet.add(em);
  }

  const orderIds = [
    ...new Set(
      mappingRows
        .map((r) => String(r[MAP_COLS.ORDER_ID] || "").trim())
        .filter(Boolean)
    ),
  ];
  if (orderIds.length === 0) {
    return { updated: 0, onTeam: [], notOnTeam: [] };
  }

  const existing = await db(TRACK_TABLE)
    .select(TRACK_COLS.ORDER_ID)
    .whereIn(
      TRACK_COLS.ORDER_ID,
      orderIds.map((x) => String(x))
    );
  const existingSet = new Set(
    (existing || []).map((r) => String(r[TRACK_COLS.ORDER_ID] || "").trim())
  );
  const missing = orderIds.filter((oid) => !existingSet.has(oid));
  if (missing.length > 0) {
    await upsertRenewAdobeOrderUserTrackingForOrderIds(missing);
  }

  let updated = 0;
  const trx = await db.transaction();
  try {
    for (const row of mappingRows) {
      const orderId = String(row[MAP_COLS.ORDER_ID] || "").trim();
      const em = normalizeEmail(row[MAP_COLS.USER_EMAIL]);
      if (!orderId || !em) continue;

      const member = teamByEmail.get(em);
      const status = !member
        ? "chưa add"
        : member.hasProduct
          ? "có gói"
          : "chưa cấp quyền";

      const patch = {
        [TRACK_COLS.STATUS]: status,
        [TRACK_COLS.ORG_NAME]: status === "chưa add" ? null : orgName,
        [TRACK_COLS.UPDATED_AT]: trx.fn.now(),
      };
      if (status === "chưa add") {
        patch[TRACK_COLS.ID_PRODUCT] = null;
      } else if (idProductStr) {
        patch[TRACK_COLS.ID_PRODUCT] = idProductStr;
      }
      const n = await trx(TRACK_TABLE)
        .where(TRACK_COLS.ORDER_ID, orderId)
        .update(patch);
      updated += n;
    }
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }

  logger.info(
    "[order-user-tracking] Reconcile theo team Adobe: adobeAccountId=%s updated=%d onTeam=%d notOnTeam=%d",
    id,
    updated,
    onTeamSet.size,
    notOnTeamSet.size
  );

  return {
    updated,
    onTeam: [...onTeamSet],
    notOnTeam: [...notOnTeamSet],
  };
}

module.exports = {
  reconcileOrderUserTrackingWithTeamMembers,
};

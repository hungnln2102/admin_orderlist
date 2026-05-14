const { db } = require("../../../db");
const {
  TRACK_TABLE,
  TRACK_COLS,
  MAP_TABLE,
  MAP_COLS,
} = require("./tables");
const { normalizeOrgKeyForTracking } = require("./helpers");

async function getOrderUserTrackingCountsForAdminAccounts(
  accountRows,
  idCol = "id",
  _orgCol = "org_name"
) {
  const result = new Map();
  if (!accountRows || accountRows.length === 0) return result;

  for (const r of accountRows) {
    const id = Number(r[idCol]);
    if (Number.isFinite(id) && id > 0) result.set(id, 0);
  }

  const accountIds = [...result.keys()];
  if (accountIds.length === 0) return result;

  const mTable = MAP_TABLE;
  const tTable = TRACK_TABLE;
  const colAid = MAP_COLS.ADOBE_ACCOUNT_ID;
  const colOid = MAP_COLS.ORDER_ID;
  const trackOrderIdCol = TRACK_COLS.ORDER_ID;

  const { rows: joined } = await db.raw(
    `
    SELECT
      m.${colAid} AS adobe_id,
      COUNT(DISTINCT t.${trackOrderIdCol})::int AS c
    FROM ${mTable} m
    INNER JOIN ${tTable} t
      ON lower(btrim(m.${colOid}::text)) = lower(btrim(t.${trackOrderIdCol}::text))
    WHERE m.${colAid} IN (${accountIds.map(() => "?").join(",")})
    GROUP BY m.${colAid}
    `,
    accountIds
  );

  for (const ro of joined) {
    const aid = Number(ro.adobe_id);
    if (Number.isFinite(aid) && result.has(aid)) {
      result.set(aid, Number(ro.c) || 0);
    }
  }

  return result;
}

async function getOrderUserTrackingCountByOrgName(orgName) {
  const k = normalizeOrgKeyForTracking(orgName);
  if (!k) return 0;

  const row = await db(TRACK_TABLE)
    .whereRaw(`lower(btrim(COALESCE(${TRACK_COLS.ORG_NAME}::text, ''))) = ?`, [k])
    .count("* as c")
    .first();
  return Number(row?.c) || 0;
}

module.exports = {
  getOrderUserTrackingCountsForAdminAccounts,
  getOrderUserTrackingCountByOrgName,
};

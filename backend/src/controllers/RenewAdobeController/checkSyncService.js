const { db } = require("../../db");
const { TABLE, COLS } = require("./accountTable");

function buildCheckUpdatePayload({ scrapedData = {}, savedCookies = null } = {}) {
  const payload = {
    [COLS.ORG_NAME]: scrapedData.orgName ?? null,
    [COLS.USER_COUNT]: Number.isFinite(scrapedData.userCount) ? scrapedData.userCount : 0,
    [COLS.LICENSE_STATUS]: scrapedData.licenseStatus ?? "unknown",
    [COLS.LAST_CHECKED]: new Date(),
  };

  if (Array.isArray(scrapedData.manageTeamMembers)) {
    payload[COLS.USERS_SNAPSHOT] = JSON.stringify(scrapedData.manageTeamMembers);
  }
  if (scrapedData.urlAccess && COLS.URL_ACCESS) {
    payload[COLS.URL_ACCESS] = scrapedData.urlAccess;
  }
  if (COLS.ALERT_CONFIG && savedCookies) {
    payload[COLS.ALERT_CONFIG] = savedCookies;
  }

  return payload;
}

async function persistCheckResult(accountId, { scrapedData = {}, savedCookies = null } = {}) {
  const updatePayload = buildCheckUpdatePayload({ scrapedData, savedCookies });
  await db(TABLE).where(COLS.ID, accountId).update(updatePayload);
  return updatePayload;
}

module.exports = {
  buildCheckUpdatePayload,
  persistCheckResult,
};

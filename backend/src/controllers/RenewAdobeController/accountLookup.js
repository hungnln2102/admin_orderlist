const { db } = require("../../db");
const { TABLE, COLS } = require("./accountTable");

const LOOKUP_COLUMNS = [
  `${TABLE}.${COLS.ID}`,
  `${TABLE}.${COLS.EMAIL}`,
  `${TABLE}.${COLS.ORG_NAME}`,
  `${TABLE}.${COLS.LICENSE_STATUS}`,
  `${TABLE}.${COLS.USER_COUNT}`,
  `${TABLE}.${COLS.USERS_SNAPSHOT}`,
  `${TABLE}.${COLS.LAST_CHECKED}`,
  `${TABLE}.${COLS.IS_ACTIVE}`,
  `${TABLE}.${COLS.CREATED_AT}`,
  ...(COLS.URL_ACCESS ? [`${TABLE}.${COLS.URL_ACCESS}`] : []),
];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseUsersSnapshot(rawValue) {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  return [];
}

function createLookupQuery() {
  return db(TABLE).select(...LOOKUP_COLUMNS);
}

async function findAccountMatchByEmail(email) {
  const emailLower = normalizeEmail(email);
  if (!emailLower) {
    return { account: null, matchedUser: null };
  }

  let row = await createLookupQuery()
    .whereRaw("LOWER(TRIM(COALESCE(??, ''))) = ?", [COLS.EMAIL, emailLower])
    .first();

  if (row) {
    return { account: row, matchedUser: null };
  }

  const rows = await createLookupQuery()
    .whereNotNull(COLS.USERS_SNAPSHOT)
    .where(COLS.USERS_SNAPSHOT, "!=", "");

  for (const candidate of rows) {
    const matchedUser = parseUsersSnapshot(candidate[COLS.USERS_SNAPSHOT]).find(
      (user) => normalizeEmail(user?.email) === emailLower
    );

    if (matchedUser) {
      row = candidate;
      return { account: row, matchedUser };
    }
  }

  return { account: null, matchedUser: null };
}

module.exports = {
  normalizeEmail,
  parseUsersSnapshot,
  findAccountMatchByEmail,
};

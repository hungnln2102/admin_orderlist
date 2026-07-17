const {
  IDENTITY_SCHEMA,
  SCHEMA_MAIL_BACKUP,
  tableName,
} = require("@/config/dbSchema");
const { TABLE, COLS } = require("@/domains/renew-adobe/controller/accountTable");

const MAIL_BACKUP_TABLE =
  IDENTITY_SCHEMA?.MAIL_BACKUP
    ? tableName(IDENTITY_SCHEMA.MAIL_BACKUP.TABLE, SCHEMA_MAIL_BACKUP)
    : null;
const MB_COLS = IDENTITY_SCHEMA?.MAIL_BACKUP?.COLS || {};

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHECK_EMPTY_COLS = [
  COLS.EMAIL,
  COLS.PASSWORD_ENC,
  COLS.ORG_NAME,
  COLS.LICENSE_STATUS,
  COLS.USER_COUNT,
  COLS.LAST_CHECKED,
  COLS.IS_ACTIVE,
  COLS.CREATED_AT,
];

function isValueEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return String(value).trim() === "";
  if (typeof value === "number") return false;
  if (typeof value === "boolean") return false;
  if (value instanceof Date) return false;
  return true;
}

function getEmptyFields(row) {
  const empty = [];
  for (const col of CHECK_EMPTY_COLS) {
    if (isValueEmpty(row[col])) empty.push(col);
  }
  return empty;
}

function trimStr(value) {
  return value == null ? "" : String(value).trim();
}

module.exports = {
  TABLE,
  COLS,
  MAIL_BACKUP_TABLE,
  MB_COLS,
  EMAIL_OK,
  getEmptyFields,
  trimStr,
};

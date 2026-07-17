/**
 * Hằng số tham chiếu bảng `mail_backup`.
 * Dùng chung cho mọi file con dưới `mailOtpService/`.
 */

const { IDENTITY_SCHEMA, SCHEMA_MAIL_BACKUP, tableName } = require("@/config/dbSchema");

const MAIL_BACKUP_TABLE =
  IDENTITY_SCHEMA?.MAIL_BACKUP
    ? tableName(IDENTITY_SCHEMA.MAIL_BACKUP.TABLE, SCHEMA_MAIL_BACKUP)
    : null;

const MB_COLS = IDENTITY_SCHEMA?.MAIL_BACKUP?.COLS || {};

module.exports = {
  MAIL_BACKUP_TABLE,
  MB_COLS,
};

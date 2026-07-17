/**
 * Entry mỏng cho nhóm handler account + mail_backup của Renew Adobe.
 * Giữ nguyên API export cũ để không phải đổi route/import.
 */

const {
  listMailBackupMailboxes,
  createMailBackupMailbox,
} = require("@/domains/renew-adobe/controller/accounts/mailBackupHandlers");
const {
  listAccounts,
  lookupAccountByEmail,
  createAccount,
  deleteAccount,
  updateUrlAccess,
  updateAccount,
} = require("@/domains/renew-adobe/controller/accounts/accountHandlers");

module.exports = {
  listMailBackupMailboxes,
  createMailBackupMailbox,
  listAccounts,
  lookupAccountByEmail,
  createAccount,
  deleteAccount,
  updateUrlAccess,
  updateAccount,
};

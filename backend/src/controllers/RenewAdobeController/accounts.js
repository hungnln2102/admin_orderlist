/**
 * Entry mỏng cho nhóm handler account + mail_backup của Renew Adobe.
 * Giữ nguyên API export cũ để không phải đổi route/import.
 */

const {
  listMailBackupMailboxes,
  createMailBackupMailbox,
} = require("./accounts/mailBackupHandlers");
const {
  listAccounts,
  lookupAccountByEmail,
  createAccount,
  deleteAccount,
  updateUrlAccess,
  updateAccount,
} = require("./accounts/accountHandlers");

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

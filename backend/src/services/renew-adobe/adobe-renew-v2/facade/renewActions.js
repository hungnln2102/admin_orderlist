const { deleteUsersV2 } = require("../deleteUsersV2");
const { addUsersWithProductV2 } = require("../addUsersWithProductV2");

async function removeUserFromAccount(email, password, userEmail, options = {}) {
  if (!userEmail) throw new Error("Thiếu userEmail");
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const v2 = await deleteUsersV2(email, password, [userEmail], {
    savedCookies,
    mailBackupId: options.mailBackupId || null,
    otpSource: options.otpSource || "imap",
  });
  return {
    success: (v2.deleted || []).includes(userEmail),
    deleted: v2.deleted || [],
    failed: v2.failed || [],
    snapshot: v2.snapshot || null,
    savedCookies: v2.savedCookies || null,
    ...(v2.error ? { error: v2.error } : {}),
  };
}

async function autoDeleteUsers(email, password, userEmails, options = {}) {
  if (!userEmails || userEmails.length === 0) {
    return { deleted: [], failed: [], snapshot: null };
  }
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const v2 = await deleteUsersV2(email, password, userEmails, {
    savedCookies,
    mailBackupId: options.mailBackupId || null,
    otpSource: options.otpSource || "imap",
  });
  return {
    deleted: v2.deleted || [],
    failed: v2.failed || [],
    snapshot: v2.snapshot || null,
    ...(v2.savedCookies ? { savedCookies: v2.savedCookies } : {}),
    ...(v2.error ? { error: v2.error } : {}),
  };
}

async function addUsersWithProduct(email, password, userEmails, options = {}) {
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const v2 = await addUsersWithProductV2(email, password, userEmails, {
    savedCookies,
    savedCookiesFromDb: options.savedCookiesFromDb ?? null,
    mailBackupId: options.mailBackupId || null,
    otpSource: options.otpSource || "imap",
    orgId: options.orgId || null,
  });
  if (!v2.success) throw new Error(v2.error || "V2 addUsersWithProduct fail");
  return {
    addResult: v2.addResult,
    assignResult: v2.assignResult,
    manageTeamMembers: v2.manageTeamMembers || [],
    userCount: v2.userCount ?? (v2.manageTeamMembers?.length ?? 0),
    licenseStatus: v2.licenseStatus || "unknown",
    orgName: options._orgName || null,
    savedCookies: v2.savedCookies,
  };
}

module.exports = {
  addUsersWithProduct,
  removeUserFromAccount,
  autoDeleteUsers,
};

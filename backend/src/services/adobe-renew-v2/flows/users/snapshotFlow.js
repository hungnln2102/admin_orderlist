const { scrapeUsersSnapshot } = require("../../userDeleteActions");
const { exportCookies } = require("../login");

async function runUsersSnapshotFlow(page, { adminEmail = "" } = {}) {
  const users = await scrapeUsersSnapshot(page);
  const adminNorm = String(adminEmail || "").trim().toLowerCase();
  const manageTeamMembers = users
    .filter((u) => String(u.email || "").trim().toLowerCase() !== adminNorm)
    .map((u) => ({
      name: u.name || "",
      email: String(u.email || "").trim(),
      product: u.product === true,
    }));

  return {
    userCount: manageTeamMembers.length,
    users,
    manageTeamMembers,
  };
}

async function runPersistUsersSessionFlow(context) {
  const { cookies } = await exportCookies(context, { includeWithExpiry: false });
  return { savedCookies: cookies.length ? { cookies } : null };
}

module.exports = {
  runUsersSnapshotFlow,
  runPersistUsersSessionFlow,
};

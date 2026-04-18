const { fetchUsersViaApi } = require("../../shared/usersListApi");
const { exportCookies } = require("../login");

async function runUsersSnapshotFlow(page, { adminEmail = "" } = {}) {
  const apiResult = await fetchUsersViaApi(page);
  const users = apiResult.users.map((u) => ({
    id: u.id || null,
    authenticatingAccountId: u.authenticatingAccountId || null,
    name: u.name || "",
    email: String(u.email || "").trim(),
    products: Array.isArray(u.products) ? u.products : [],
    hasPackage: Array.isArray(u.products) ? u.products.length > 0 : u.product === true,
    product: Array.isArray(u.products) ? u.products.length > 0 : u.product === true,
  }));
  const adminNorm = String(adminEmail || "").trim().toLowerCase();
  const manageTeamMembers = users
    .filter((u) => String(u.email || "").trim().toLowerCase() !== adminNorm)
    .map((u) => ({
      id: u.id || null,
      authenticatingAccountId: u.authenticatingAccountId || null,
      name: u.name || "",
      email: String(u.email || "").trim(),
      products: Array.isArray(u.products) ? u.products : [],
      hasPackage: Array.isArray(u.products) ? u.products.length > 0 : u.product === true,
      // Quy ước nghiệp vụ: có products => còn gói; không có products => chưa cấp quyền.
      product: Array.isArray(u.products) ? u.products.length > 0 : u.product === true,
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

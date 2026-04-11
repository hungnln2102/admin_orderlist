const { scrapeUsersSnapshot } = require("../../userDeleteActions");

async function runCheckAdminProductFlow(page, adminEmail) {
  const adminNorm = String(adminEmail || "").trim().toLowerCase();
  const users = await scrapeUsersSnapshot(page);
  const adminRow = users.find(
    (u) => String(u?.email || "").trim().toLowerCase() === adminNorm
  );

  return {
    hasAdminProduct: !!adminRow?.product,
    productName: adminRow?.product ? "assigned" : null,
    adminRow: adminRow || null,
    users,
  };
}

module.exports = {
  runCheckAdminProductFlow,
};

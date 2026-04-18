const { extractOrgTokenFromUrl } = require("../../shared/usersListApi");

async function runGotoUsersFlow(page) {
  const orgToken = extractOrgTokenFromUrl(page.url());
  const usersUrl = orgToken
    ? `https://adminconsole.adobe.com/${orgToken}/users`
    : "https://adminconsole.adobe.com/users";
  await page.goto(usersUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  return { success: true };
}

module.exports = {
  runGotoUsersFlow,
};

const { escapeRegex } = require("./shared");

async function waitForUserRowByEmail(page, email, timeoutMs = 30000) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm) return false;
  const emailRe = new RegExp(escapeRegex(emailNorm), "i");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = page.locator('[role="row"], table tr, tbody tr').filter({ hasText: emailRe }).first();
    if (await row.isVisible({ timeout: 1500 }).catch(() => false)) return true;
    await page.waitForTimeout(800);
  }
  return false;
}

async function selectUsersByEmails(page, emails) {
  const selected = [];
  for (const e of emails) {
    const emailNorm = String(e || "").trim().toLowerCase();
    if (!emailNorm) continue;
    const emailRe = new RegExp(escapeRegex(emailNorm), "i");
    const row = page.locator('[role="row"], table tr, tbody tr').filter({ hasText: emailRe }).first();
    const vis = await row.isVisible({ timeout: 2500 }).catch(() => false);
    if (!vis) continue;
    const cb = row.locator('input[type="checkbox"], [role="checkbox"]').first();
    if (await cb.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cb.click({ force: true }).catch(() => {});
      selected.push(emailNorm);
    }
  }
  return selected;
}

module.exports = {
  waitForUserRowByEmail,
  selectUsersByEmails,
};

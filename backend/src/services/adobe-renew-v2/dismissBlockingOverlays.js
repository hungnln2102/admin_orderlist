/**
 * Đóng dialog/overlay (thư viện vex) còn sót trên Adobe Admin Console — tránh Playwright báo
 * "intercepts pointer events" khi click sidebar (vd. B15 → /users/administrators).
 */

const logger = require("../../utils/logger");

const MAX_ATTEMPTS = 6;

/**
 * @param {import('playwright').Page} page
 * @param {{ logPrefix?: string }} opts
 */
async function dismissBlockingOverlays(page, opts = {}) {
  const logPrefix = opts.logPrefix || "[adobe-v2]";

  async function overlayBlocking() {
    return page
      .evaluate(() => {
        const overlays = document.querySelectorAll(".vex-overlay");
        for (const el of overlays) {
          const s = window.getComputedStyle(el);
          if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) {
            continue;
          }
          const r = el.getBoundingClientRect();
          if (r.width > 10 && r.height > 10) return true;
        }
        return false;
      })
      .catch(() => false);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const blocking = await overlayBlocking();
    if (!blocking) return;

    logger.info(
      "%s dismissBlockingOverlays: vex overlay đang chặn click, lần %s/%s",
      logPrefix,
      attempt + 1,
      MAX_ATTEMPTS
    );

    const vexRoot = page.locator(".vex.vex-theme-os, .apt-vex").first();

    const primaryOk = vexRoot
      .locator(
        ".vex-dialog-button-primary, button.vex-dialog-button-primary, [data-testid='cta-button']"
      )
      .first();
    if (await primaryOk.isVisible({ timeout: 600 }).catch(() => false)) {
      await primaryOk.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }

    const closeBtn = page
      .locator(
        ".vex-close, .vex-dialog-button-secondary, .vex-dialog-button.vex-close, button[aria-label='Close' i], button[aria-label='Đóng' i]"
      )
      .first();
    if (await closeBtn.isVisible({ timeout: 600 }).catch(() => false)) {
      await closeBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }

    const genericDismiss = page
      .getByRole("button", { name: /^(OK|Ok|Đóng|Close|Dismiss|Hoàn tất|Done)$/i })
      .first();
    if (await genericDismiss.isVisible({ timeout: 400 }).catch(() => false)) {
      await genericDismiss.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
  }

  if (await overlayBlocking()) {
    logger.warn("%s dismissBlockingOverlays: vẫn còn overlay sau %s lần — gỡ vex khỏi DOM", logPrefix, MAX_ATTEMPTS);
    await page
      .evaluate(() => {
        document.querySelectorAll(".vex").forEach((el) => {
          try {
            el.remove();
          } catch (_) {}
        });
      })
      .catch(() => {});
    await page.waitForTimeout(400);
  }
}

module.exports = { dismissBlockingOverlays };

/**
 * Adobe Renew V2 — B15: Xóa product khỏi user admin (administrators).
 * Chạy khi check user mà admin có product = true (để giải phóng license).
 * Doc: Renew_Adobe_Check_Flow.md — B15.
 */

const logger = require("../../utils/logger");
const { dismissBlockingOverlays } = require("./dismissBlockingOverlays");

const STEP_TIMEOUT = 25000;

/**
 * B15: Vào trang administrators (bấm link "Quản trị viên" trên sidebar, tránh trang trắng khi goto URL trực tiếp) → tìm admin theo email → Xem chi tiết → More actions → Chỉnh sửa sản phẩm → xóa product card → Lưu.
 * Link "Quản trị viên" chỉ có trên trang Users, nên nếu đang ở trang khác (vd. sau B14 auto-assign) thì vào /users trước.
 * @param {import('playwright').Page} page - Page đã login Admin Console (sau B13/B14)
 * @param {string} adminEmail - Email của admin (tài khoản đang check)
 * @param {{ orgId?: string|null }} options - orgId để build URL /users khi cần (sau B14 page có thể đang ở auto-assign)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function runB15RemoveProductFromAdmin(page, adminEmail, options = {}) {
  if (!page || !adminEmail || !String(adminEmail).trim()) {
    return { success: false, error: "Missing page or adminEmail" };
  }
  const email = String(adminEmail).trim().toLowerCase();
  const orgId = options.orgId && String(options.orgId).trim() ? String(options.orgId).trim() : null;
  try {
    logger.info("[adobe-v2] B15: Xóa product admin (email=%s)...", email);

    let url = page.url();
    if (url.includes("auth.services") || url.includes("adobelogin.com")) {
      logger.warn("[adobe-v2] B15: Đang ở trang login, bỏ qua");
      return { success: false, error: "Redirected to login" };
    }
    if (!url.includes("/users")) {
      let usersUrl = null;
      if (orgId) {
        usersUrl = `https://adminconsole.adobe.com/${orgId}@AdobeOrg/users`;
      } else {
        const m = url.match(/^(https:\/\/adminconsole\.adobe\.com\/[^/]+@AdobeOrg)/);
        if (m) usersUrl = m[1] + "/users";
      }
      if (usersUrl) {
        logger.info("[adobe-v2] B15: Đang không ở trang Users (sau B14) → vào trang Users trước");
        await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] B15" });
        url = page.url();
      }
    }

    // Nếu đã ở trang Users: kiểm tra hàng của admin — cột Sản phẩm trống thì không cần vào trang Admin để xóa
    if (url.includes("/users") && !url.includes("/administrators")) {
      const emailRegex = new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const userRow = page.getByRole("row").filter({ hasText: emailRegex }).first();
      if (await userRow.isVisible({ timeout: 4000 }).catch(() => false)) {
        const productCell = userRow.locator("[role='gridcell']").last();
        const hasProductIcon = (await productCell.locator("img").count()) > 0;
        if (!hasProductIcon) {
          logger.info("[adobe-v2] B15: Trang User — admin không còn gói (cột Sản phẩm trống) → bỏ qua vào trang Quản trị viên");
          return { success: true };
        }
      }
    }

    await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] B15" });

    const usersUrlForRetry = orgId
      ? `https://adminconsole.adobe.com/${orgId}@AdobeOrg/users`
      : (() => {
          const m = page.url().match(/^(https:\/\/adminconsole\.adobe\.com\/[^/]+@AdobeOrg)/);
          return m ? `${m[1]}/users` : null;
        })();

    const clickAdministratorsLink = async () => {
      const clickNavLink = async (loc) => {
        await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] B15" });
        try {
          await loc.click({ timeout: STEP_TIMEOUT });
          return true;
        } catch {
          await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] B15" });
          try {
            await loc.click({ timeout: STEP_TIMEOUT, force: true });
            return true;
          } catch {
            await loc.evaluate((el) => el.click());
            return true;
          }
        }
      };

      const adminLink = page.locator('a[href*="/users/administrators"]').first();
      if (await adminLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        return clickNavLink(adminLink);
      }
      const linkByText = page.getByRole("link", { name: /Quản trị viên|Administrators/i });
      if (await linkByText.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        return clickNavLink(linkByText.first());
      }
      return false;
    };

    let navigated = await clickAdministratorsLink();
    if (!navigated && usersUrlForRetry) {
      logger.info("[adobe-v2] B15: Chưa thấy link Quản trị viên — làm mới /users rồi thử lại");
      await page.goto(usersUrlForRetry, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] B15" });
      navigated = await clickAdministratorsLink();
    }
    if (!navigated) {
      logger.warn("[adobe-v2] B15: Không thấy link Quản trị viên (cần ở trang Admin Console có sidebar)");
      return { success: false, error: "Link Quản trị viên not found" };
    }
    await page.waitForTimeout(2500);
    url = page.url();
    if (!url.includes("/users/administrators")) {
      await page.waitForURL(/\/users\/administrators/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
      url = page.url();
    }
    if (!url.includes("/users/administrators")) {
      logger.warn("[adobe-v2] B15: Sau khi bấm link vẫn chưa vào administrators, url=%s", url.slice(0, 90));
      return { success: false, error: "Not on administrators page" };
    }

    // B2: Tìm row chứa email admin, bấm "Xem chi tiết" (trong row đó)
    let row = null;
    const emailCell = page.locator('[data-testid^="member-email-"]').filter({ hasText: email }).first();
    if (await emailCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      row = page.getByRole("row").filter({ has: emailCell }).first();
    }
    if (!row || !(await row.isVisible({ timeout: 1000 }).catch(() => false))) {
      row = page.getByRole("row").filter({ hasText: new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
    }
    if (!row || !(await row.isVisible({ timeout: 2000 }).catch(() => false))) {
      logger.warn("[adobe-v2] B15: Không tìm thấy row admin với email=%s", email);
      return { success: false, error: "Admin row not found" };
    }
    const viewDetailsBtn = row.locator('button[data-testid="tooltip-button-action"]').or(
      row.getByRole("button", { name: /View details|Xem chi tiết/i })
    ).first();
    await viewDetailsBtn.click({ timeout: STEP_TIMEOUT });
    await page.waitForTimeout(1500);

    // B3: Bấm "More actions" (VI/EN) trong panel chi tiết user
    const detailsPanel = page.locator('[data-testid="user-details-panel"], [data-testid="user-details-drawer"]').first();
    const scopeForActions = (await detailsPanel.isVisible({ timeout: 3000 }).catch(() => false)) ? detailsPanel : page;
    let moreActionsBtn = scopeForActions
      .locator('[data-testid="more-actions-button"], button[aria-label*="More actions" i], button[aria-label*="Thao tác khác" i]')
      .first();
    if (!(await moreActionsBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      moreActionsBtn = scopeForActions.getByRole("button", { name: /More actions|Thao tác khác|More actions for/i }).first();
    }
    if (!(await moreActionsBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      const fallbackToolbarBtn = scopeForActions.locator('header button, [data-testid*="toolbar"] button').last();
      if (await fallbackToolbarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        moreActionsBtn = fallbackToolbarBtn;
      }
    }
    await moreActionsBtn.click({ timeout: STEP_TIMEOUT });
    await page.waitForTimeout(800);

    // B4: Bấm "Chỉnh sửa sản phẩm" / "Edit products" (menu item)
    const editProductsItem = page.locator('[role="menuitem"][data-key="EDIT_PRODUCTS_AND_GROUPS"]').or(
      page.getByRole("menuitem", { name: /Chỉnh sửa sản phẩm|Edit products/i })
    ).first();
    await editProductsItem.click({ timeout: STEP_TIMEOUT });
    await page.waitForTimeout(1500);

    // B5: Đợi form Edit products load đủ (dù URL có đổi), rồi bấm nút xóa product
    const closeProductBtn = page.locator('[data-testid="mini-product-card-close-button"]').first();
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="mini-product-card-close-button"]'),
      { timeout: STEP_TIMEOUT }
    ).catch(() => {});
    const closeCount = await closeProductBtn.count();
    if (closeCount === 0) {
      logger.warn("[adobe-v2] B15: Form Edit products chưa load được (không thấy nút xóa product)");
      return { success: false, error: "Edit products form not loaded" };
    }
    await closeProductBtn.click({ timeout: STEP_TIMEOUT });
    await page.waitForTimeout(1000);

    // B6: Bấm "Lưu" — đợi nút enable (ban đầu disabled, sau khi xóa product mới enable)
    const saveBtn = page.locator('[data-testid="cta-button"]').filter({ hasText: /Lưu|Save/i });
    await saveBtn.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="cta-button"]');
        return btn && !btn.hasAttribute("disabled");
      },
      { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(300);
    await saveBtn.click({ timeout: STEP_TIMEOUT });
    await page.waitForTimeout(2000);

    logger.info("[adobe-v2] B15: Đã xóa product admin xong");
    return { success: true };
  } catch (err) {
    logger.error("[adobe-v2] B15 error: %s", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  runB15RemoveProductFromAdmin,
};

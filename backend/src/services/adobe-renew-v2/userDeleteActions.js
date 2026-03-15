const logger = require("../../utils/logger");

const USERS_URL = "https://adminconsole.adobe.com/users";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function selectUserByEmail(page, email) {
  const emailNorm = (email || "").trim().toLowerCase();
  if (!emailNorm) return false;

  const emailRe = new RegExp(escapeRegex(emailNorm), "i");
  const rowSelectors = ['[role="row"]', "tbody tr", "table tr", '[class*="row"]'];
  let row = null;
  for (const sel of rowSelectors) {
    const matching = page.locator(sel).filter({ hasText: emailRe });
    const count = await matching.count().catch(() => 0);
    if (count > 0) {
      const first = matching.first();
      const vis = await first.isVisible({ timeout: 2000 }).catch(() => false);
      if (vis) {
        row = first;
        break;
      }
    }
  }
  if (!row) {
    logger.debug("[adobe-v2] Không tìm thấy row chứa email: %s", emailNorm);
    return false;
  }

  const checkboxSelectors = [
    'input[type="checkbox"]',
    '[role="checkbox"]',
    'td input[type="checkbox"]',
    '[class*="checkbox"] input',
  ];
  for (const sel of checkboxSelectors) {
    const cb = row.locator(sel).first();
    try {
      const visible = await cb.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visible) continue;
      const checked = await cb.isChecked().catch(() => false);
      if (!checked) {
        await cb.click({ force: true });
      }
      logger.info("[adobe-v2] Đã chọn user: %s", emailNorm);
      return true;
    } catch (_) {
      continue;
    }
  }
  logger.warn("[adobe-v2] Tìm thấy row nhưng không có checkbox cho: %s", emailNorm);
  return false;
}

async function clickDeleteUserButton(page) {
  const byTestId = page.locator('[data-testid="remove-member-btn"]').first();
  if (await byTestId.isVisible({ timeout: 2000 }).catch(() => false)) {
    try {
      await byTestId.click({ timeout: 5000 });
      return true;
    } catch (_) {}
  }
  const btn = page.getByRole("button", { name: /xóa người dùng|delete user|remove user/i });
  try {
    await btn.first().click({ timeout: 5000 });
    return true;
  } catch (_) {
    return false;
  }
}

async function maybeClickContinueInModal(page) {
  const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
  if (!(await dialog.isVisible({ timeout: 5000 }).catch(() => false))) return false;
  const continueBtn = dialog.getByRole("button", { name: /tiếp tục|continue/i });
  if (await continueBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await continueBtn.first().click({ timeout: 8000 });
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

const MODAL_OPTIONS_TIMEOUT = 15000;

async function handleDeleteModalOptions(page) {
  try {
    const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
    await dialog.waitFor({ state: "visible", timeout: MODAL_OPTIONS_TIMEOUT }).catch(() => {});

    let radioClicked = false;
    const strategies = [
      () => dialog.getByRole("radio", { name: /xóa vĩnh viễn nội dung|permanently delete content/i }).first(),
      () => page.locator('input[type="radio"][value="DELETE"]').first(),
      () => dialog.locator("label").filter({ hasText: /xóa vĩnh viễn|permanently delete/i }).first(),
    ];
    for (const getLocator of strategies) {
      try {
        const el = getLocator();
        await el.click({ timeout: 8000 });
        radioClicked = true;
        break;
      } catch (_) {
        continue;
      }
    }
    if (!radioClicked) {
      logger.warn("[adobe-v2] handleDeleteModalOptions: không tìm thấy radio Xóa vĩnh viễn nội dung");
      return false;
    }
    await page.waitForTimeout(500);

    const nextBtn = page.getByRole("button", { name: /tiếp theo|next/i }).first();
    await nextBtn.click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    return true;
  } catch (e) {
    logger.warn("[adobe-v2] handleDeleteModalOptions: %s", e.message);
    return false;
  }
}

async function confirmDeleteUsers(page) {
  try {
    const candidates = [
      () => page.getByRole("button", { name: /xóa người dùng|remove users?|delete users?/i }).first(),
      () => page.locator('[data-testid="cta-button"][data-variant="negative"]').first(),
    ];

    for (const getLocator of candidates) {
      try {
        const btn = getLocator();
        const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
        if (!visible) continue;
        await btn.click({ timeout: 5000 });
        await page.waitForTimeout(1500);
        return true;
      } catch (_) {
        continue;
      }
    }

    logger.warn("[adobe-v2] confirmDeleteUsers: không tìm thấy nút confirm");
    return false;
  } catch (e) {
    logger.warn("[adobe-v2] confirmDeleteUsers: %s", e.message);
    return false;
  }
}

async function gotoUsersPageWithCurrentSession(page) {
  let currentUrl = page.url();
  if (!currentUrl.includes("@AdobeOrg")) {
    await page.waitForURL(/@AdobeOrg/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    currentUrl = page.url();
  }
  const orgMatch = currentUrl.match(/^(https:\/\/adminconsole\.adobe\.com\/[^/]+@AdobeOrg)/);
  const usersUrl = orgMatch ? `${orgMatch[1]}/users` : USERS_URL;

  await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(4000);

  currentUrl = page.url();
  if (!currentUrl.includes("/users")) {
    const usersLink = page.getByRole("link", { name: /^Users$|^Người dùng$/i }).first();
    if (await usersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usersLink.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
    } else {
      await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }
  }

  await page.waitForSelector('input[type="checkbox"], [role="checkbox"], table tbody tr', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function deleteUsersWithExistingPage(page, userEmails) {
  const deleted = [];
  const failed = [];
  const remaining = Array.isArray(userEmails) ? userEmails.filter((e) => (e || "").trim()) : [];

  while (remaining.length > 0) {
    const toProcessNow = [];
    for (const ue of remaining) {
      const selected = await selectUserByEmail(page, ue);
      if (selected) toProcessNow.push(ue);
    }

    if (toProcessNow.length === 0) {
      logger.warn("[adobe-v2] deleteUsersWithExistingPage: Không chọn được user nào (emails: %s).", remaining.join(", "));
      remaining.forEach((ue) => failed.push(ue));
      break;
    }

    const clicked = await clickDeleteUserButton(page);
    if (!clicked) {
      logger.warn("[adobe-v2] Không bấm được Xóa người dùng");
      toProcessNow.forEach((ue) => failed.push(ue));
      break;
    }

    await page.waitForTimeout(2000);

    const continued = await maybeClickContinueInModal(page);
    if (continued) await page.waitForTimeout(1500);

    let hasSimpleConfirm = false;
    try {
      const alertDialog = page.getByRole("alertdialog").first();
      hasSimpleConfirm = await alertDialog.isVisible({ timeout: 1000 }).catch(() => false);
    } catch (_) {
      hasSimpleConfirm = false;
    }

    if (!hasSimpleConfirm) {
      const modalOk = await handleDeleteModalOptions(page);
      if (!modalOk) {
        logger.warn("[adobe-v2] Lỗi modal chọn option");
        toProcessNow.forEach((ue) => failed.push(ue));
        break;
      }
    } else {
      logger.info("[adobe-v2] Flow simple-confirm: chỉ hiện popup Remove users, bỏ qua B4/B5");
    }

    const confirmOk = await confirmDeleteUsers(page);
    if (!confirmOk) {
      logger.warn("[adobe-v2] Lỗi confirm");
      toProcessNow.forEach((ue) => failed.push(ue));
      break;
    }

    toProcessNow.forEach((ue) => deleted.push(ue));
    remaining.splice(0, remaining.length, ...remaining.filter((ue) => !toProcessNow.includes(ue)));

    if (remaining.length > 0) {
      await page.waitForTimeout(2000);
      await gotoUsersPageWithCurrentSession(page);
    }
  }

  return { deleted, failed };
}

async function scrapeUsersSnapshot(page) {
  const rows = page.locator('table tbody tr, [role="row"]');
  const count = await rows.count().catch(() => 0);
  const users = [];

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const emailText = await row.locator('[data-testid*="member-email"], td').first().innerText().catch(() => "");
    const email = (emailText || "").trim();
    if (!email) continue;
    const nameText = await row
      .locator('[data-testid*="member-name"], th, [role="rowheader"]')
      .first()
      .innerText()
      .catch(() => "");
    const hasProduct = await row.locator('[data-testid="image-icon"], [data-testid*="productIcons"]').first().isVisible().catch(() => false);

    users.push({
      name: (nameText || "").trim(),
      email,
      product: hasProduct,
    });
  }

  return users;
}

module.exports = {
  gotoUsersPageWithCurrentSession,
  deleteUsersWithExistingPage,
  scrapeUsersSnapshot,
};


/**
 * Scrape Admin Console users, overview, profile; xóa user trên Admin Console.
 */

const logger = require("../../utils/logger");

/**
 * Scrape trang Admin Console users (adminconsole.adobe.com/users): div[role="row"] + div[role="gridcell"].
 * Format: [{ index, name, email, loaiId, sanPhamText }].
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Array<{ index: number, name: string|null, email: string|null, loaiId: string|null, sanPhamText: string[] }>>}
 */
async function scrapeAdminConsoleUsersPage(page) {
  return page
    .evaluate(() => {
      const rows = [...document.querySelectorAll('div[role="row"]')].filter((row) =>
        row.querySelector('div[role="gridcell"]')
      );
      const textOf = (el) => (el && (el.innerText || el.textContent || "")).trim();
      return rows.map((row, index) => {
        const cells = [...row.querySelectorAll('div[role="gridcell"]')];
        const nameLink = row.querySelector("a");
        const name = nameLink ? textOf(nameLink) || null : null;
        const email =
          cells.map((c) => textOf(c)).find((t) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(t)) || null;
        const loaiId =
          cells.map((c) => textOf(c)).find((t) => /Adobe ID|Enterprise ID|Federated ID/i.test(t)) || null;
        const allCellText = cells.map((c) => textOf(c)).filter(Boolean);
        const sanPhamText = allCellText.filter(
          (t) =>
            !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(t) &&
            !/Adobe ID|Enterprise ID|Federated ID/i.test(t) &&
            t !== name
        );
        return { index: index + 1, name, email, loaiId, sanPhamText };
      });
    })
    .catch(() => []);
}

/**
 * Trên trang Admin Console Users: chọn user theo email → bấm "Xóa người dùng" → xác nhận.
 * @param {import('puppeteer').Page} page - Đã ở trang adminconsole.adobe.com/users
 * @param {string} userEmail - Email user cần xóa
 */
async function deleteUserOnAdminConsole(page, userEmail) {
  const emailNorm = userEmail.trim().toLowerCase();
  logger.info("[adobe] deleteUserOnAdminConsole: email=%s", userEmail);

  const rowClicked = await page.evaluate((email) => {
    const rows = [...document.querySelectorAll('div[role="row"]')].filter((r) =>
      r.querySelector('div[role="gridcell"]')
    );
    const textOf = (el) => (el && (el.innerText || el.textContent || "")).trim();
    const headerLike = /^Tên$|^Email$|^Loại\s*ID$|^Name$|^Products$/i;
    for (const row of rows) {
      const cells = [...row.querySelectorAll('div[role="gridcell"]')];
      const cellText = cells.map((c) => textOf(c)).join(" ");
      if (headerLike.test(cellText.split(/\s+/)[0])) continue;
      if (!cellText.toLowerCase().includes(email.toLowerCase())) continue;
      const checkbox = row.querySelector('input[type="checkbox"]') || row.querySelector('[role="checkbox"]');
      if (checkbox) {
        checkbox.click();
        return true;
      }
      const firstCell = row.querySelector('div[role="gridcell"]');
      if (firstCell) {
        const innerCheck = firstCell.querySelector('input[type="checkbox"], [role="checkbox"]');
        if (innerCheck) {
          innerCheck.click();
          return true;
        }
        firstCell.click();
        return true;
      }
      return false;
    }
    return false;
  }, emailNorm);

  if (!rowClicked) {
    throw new Error("Không tìm thấy hàng chứa email: " + userEmail);
  }

  // Chờ UI cập nhật (nút Xóa người dùng có thể chỉ enable sau khi chọn user)
  await new Promise((r) => setTimeout(r, 1500));

  // Bấm nút xóa trên toolbar — "Xóa người dùng" (VI) hoặc "Remove users" (EN)
  const deleteButtonLabels = ["Xóa người dùng", "Remove users", "Remove user"];
  let deleteBtnClicked = false;
  for (let attempt = 0; attempt < 8 && !deleteBtnClicked; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000));
    deleteBtnClicked = await page.evaluate((labels) => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const candidates = document.querySelectorAll('button, [role="button"], a');
      for (const b of candidates) {
        const text = norm((b.innerText || b.textContent || ""));
        const match = labels.some((l) => text.includes(l));
        if (match && !b.disabled) {
          b.click();
          return true;
        }
      }
      return false;
    }, deleteButtonLabels);
  }

  if (!deleteBtnClicked) {
    throw new Error("Không tìm thấy hoặc không bấm được nút 'Xóa người dùng' (toolbar). Đảm bảo đang ở trang Admin Console > Người dùng (adminconsole.adobe.com/users).");
  }

  await new Promise((r) => setTimeout(r, 2000));

  // Bấm nút xác nhận trong popup: text "Xóa người dùng" hoặc "Remove users", lấy nút cuối (trong modal)
  const confirmLabels = ["Xóa người dùng", "Remove users", "Remove user"];
  const confirmClicked = await page.evaluate((labels) => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const matches = [...document.querySelectorAll("button, [role='button']")].filter((b) => {
      const t = norm((b.innerText || b.textContent || ""));
      return labels.some((l) => t === l || t.includes(l));
    });
    const btn = matches.length > 0 ? matches[matches.length - 1] : null;
    if (btn && !btn.disabled) {
      btn.click();
      return true;
    }
    return false;
  }, confirmLabels);

  if (!confirmClicked) {
    throw new Error("Không tìm thấy hoặc không bấm được nút xác nhận (Xóa người dùng trong form popup).");
  }

  logger.info("[adobe] Đã bấm xác nhận xóa user.");
  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * Kiểm tra trang hiện tại: có gói (sản phẩm/dịch vụ) hay không.
 * Dùng trong luồng Admin Console để set license_status: có gói → Paid, không → Expired.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<{ hasPlan: boolean, status: string, message: string, productName: string|null, licenseUsage: string|null }>}
 */
async function getAdobeProductInfo(page) {
  const result = await page
    .evaluate(() => {
      const text = document.body.innerText || "";

      const noPlanVi = "Không có sản phẩm hoặc dịch vụ nào";
      const noPlanEn = "No products or services";
      if (text.includes(noPlanVi) || text.includes(noPlanEn)) {
        return {
          hasPlan: false,
          status: "no_plan",
          message: "Không có sản phẩm hoặc dịch vụ nào",
          productName: null,
          licenseUsage: null,
        };
      }

      const productRows = [...document.querySelectorAll("div, span, td, p")]
        .map((el) => (el.innerText || "").trim())
        .filter(Boolean);

      const productName =
        productRows.find((t) =>
          /Creative Cloud|Acrobat|Photoshop|Illustrator|Express|Premiere|Lightroom/i.test(t)
        ) || null;

      const licenseUsage =
        productRows.find((t) => /\d+\s*trên\s*\d+/i.test(t) || /\d+\s*\/\s*\d+/i.test(t)) || null;

      return {
        hasPlan: !!productName,
        status: productName ? "has_plan" : "unknown",
        message: productName ? "Có gói" : "Không xác định",
        productName,
        licenseUsage,
      };
    })
    .catch(() => ({
      hasPlan: false,
      status: "unknown",
      message: "Không đọc được",
      productName: null,
      licenseUsage: null,
    }));

  logger.info(
    "[adobe] getAdobeProductInfo: hasPlan=%s, status=%s",
    result.hasPlan,
    result.status
  );
  return result;
}

/**
 * Lấy tên profile từ trang hiện tại (phải đã ở account.adobe.com).
 * Gọi navigate.navigateToAccountPage(page) trước khi gọi hàm này nếu chưa vào account.
 * @param {import('puppeteer').Page} page - Đã ở account.adobe.com
 * @returns {Promise<string|null>}
 */
async function getProfileNameFromAccountPage(page) {
  try {
    await page.waitForSelector("p.plan-subtitle", { timeout: 12000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1500));
    const name = await page.evaluate(() => {
      const el = document.querySelector("p.plan-subtitle");
      if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
      const body = document.body?.innerText || "";
      const welcomeMatch = body.match(/Chào mừng\s+(.+?)\s+đến với tài khoản|Welcome\s+([^,!]+)/i);
      if (welcomeMatch) return (welcomeMatch[1] || welcomeMatch[2] || "").trim();
      return null;
    });
    if (name) logger.info("[adobe] Đã lấy org_name (profile) từ account.adobe.com: %s", name);
    else logger.warn("[adobe] Không tìm thấy p.plan-subtitle hoặc tên trên account.adobe.com");
    return name || null;
  } catch (e) {
    logger.warn("[adobe] Lấy profile name thất bại: %s", e.message);
    return null;
  }
}

/**
 * Scrape trang Overview rồi sang trang Users (cùng org), không cần token.
 * @param {import('puppeteer').Page} page
 * @param {string} currentUrl - URL hiện tại (dạng .../org_id@AdobeOrg/overview)
 * @returns {Promise<{ orgName: string|null, userCount: number, licenseStatus: string, adobe_org_id: string|null, usersSnapshot?: string }|null>}
 */
async function scrapeOverviewThenUsers(page, currentUrl) {
  const overviewData = await page
    .evaluate(() => {
      const body = document.body?.innerText || "";
      const getText = (sel) => (document.querySelector(sel)?.textContent || "").trim();
      let orgName =
        getText("[data-testid='org-name']") ||
        getText(".org-name") ||
        getText("[data-testid='organization-name']") ||
        "";
      const userMatch =
        body.match(/(?:Người dùng|người dùng|Users?)\s*(\d+)/i) ||
        body.match(/(\d+)\s*(?:Người dùng|người dùng|users?)/i) ||
        body.match(/(\d+)\s*user(s)?/i) ||
        body.match(/users?\s*[:\s]*(\d+)/i);
      const userCount = userMatch ? parseInt(userMatch[1], 10) : 0;
      let licenseStatus = "unknown";
      if (
        /\bactive\b/i.test(body) ||
        (/\bGiấy phép\b/i.test(body) && /\d+\s*(?:trên|of)\s*\d+/i.test(body))
      )
        licenseStatus = "active";
      else if (/\bexpired\b/i.test(body) || /\bhết hạn\b/i.test(body)) licenseStatus = "expired";
      if (!orgName && body.length > 0) {
        const h1 = document.querySelector("h1");
        if (h1) orgName = h1.textContent?.trim() || "";
      }
      const signInLike = /^(Sign\s*in|Log\s*in|Sign\s*out|Đăng\s*nhập)$/i;
      if (orgName && signInLike.test(orgName.trim())) orgName = null;
      const pathname = window.location.pathname || "";
      const orgIdMatch = pathname.match(/\/([A-Fa-f0-9]+)@AdobeOrg/);
      const adobe_org_id = orgIdMatch ? orgIdMatch[1] : null;
      return {
        orgName: orgName || null,
        userCount: Number.isFinite(userCount) ? userCount : 0,
        licenseStatus,
        adobe_org_id,
      };
    })
    .catch(() => null);
  if (!overviewData) return null;

  const productInfo = await getAdobeProductInfo(page);
  overviewData.licenseStatus = productInfo.hasPlan ? "Paid" : "Expired";

  const usersUrl = currentUrl.replace(/\/overview(\/?)(\?.*)?$/i, "/users$2");
  if (usersUrl === currentUrl) return overviewData;
  logger.info(
    "[adobe] Mở trang Users: %s",
    usersUrl.length > 80 ? usersUrl.slice(0, 80) + "..." : usersUrl
  );
  await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));

  const usersData = await page
    .evaluate(() => {
      const body = document.body?.innerText || "";
      const emails = [];
      const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      let match;
      while ((match = emailRe.exec(body)) !== null) emails.push(match[0]);
      const uniq = [...new Set(emails)];
      const userMatch =
        body.match(/(?:Người dùng|người dùng|Users?)\s*(\d+)/i) ||
        body.match(/(\d+)\s*(?:Người dùng|người dùng|users?)/i) ||
        body.match(/(\d+)\s*user(s)?/i);
      const userCount = userMatch ? parseInt(userMatch[1], 10) : 0;
      return { userCount: Number.isFinite(userCount) ? userCount : uniq.length || 0, emails: uniq.slice(0, 500) };
    })
    .catch(() => ({ userCount: overviewData.userCount, emails: [] }));

  return {
    ...overviewData,
    userCount: usersData.userCount > 0 ? usersData.userCount : overviewData.userCount,
    usersSnapshot:
      usersData.emails && usersData.emails.length > 0 ? JSON.stringify(usersData.emails) : undefined,
  };
}

module.exports = {
  scrapeAdminConsoleUsersPage,
  deleteUserOnAdminConsole,
  getAdobeProductInfo,
  getProfileNameFromAccountPage,
  scrapeOverviewThenUsers,
};

/**
 * Service kiểm tra tài khoản Adobe: Puppeteer lấy token → check org → check users.
 * Theo docs/Adobe_Auto_Login (2).md.
 */

const logger = require("../utils/logger");

const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID || process.env.ADOBE_API_KEY || "";

/**
 * Scrape trang Overview rồi sang trang Users (cùng org), không cần token.
 * @param {import('puppeteer').Page} page
 * @param {string} currentUrl - URL hiện tại (dạng .../org_id@AdobeOrg/overview)
 * @returns {Promise<{ orgName: string|null, userCount: number, licenseStatus: string, adobe_org_id: string|null, usersSnapshot?: string }|null>}
 */
async function scrapeOverviewThenUsers(page, currentUrl) {
  const overviewData = await page.evaluate(() => {
    const body = document.body?.innerText || "";
    const getText = (sel) => (document.querySelector(sel)?.textContent || "").trim();
    let orgName = getText("[data-testid='org-name']") || getText(".org-name") || getText("[data-testid='organization-name']") || "";
    const userMatch = body.match(/(?:Người dùng|người dùng|Users?)\s*(\d+)/i) || body.match(/(\d+)\s*(?:Người dùng|người dùng|users?)/i) || body.match(/(\d+)\s*user(s)?/i) || body.match(/users?\s*[:\s]*(\d+)/i);
    const userCount = userMatch ? parseInt(userMatch[1], 10) : 0;
    let licenseStatus = "unknown";
    if (/\bactive\b/i.test(body) || (/\bGiấy phép\b/i.test(body) && /\d+\s*(?:trên|of)\s*\d+/i.test(body))) licenseStatus = "active";
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
    return { orgName: orgName || null, userCount: Number.isFinite(userCount) ? userCount : 0, licenseStatus, adobe_org_id };
  }).catch(() => null);
  if (!overviewData) return null;

  const usersUrl = currentUrl.replace(/\/overview(\/?)(\?.*)?$/i, "/users$2");
  if (usersUrl === currentUrl) return overviewData;
  logger.info("[adobeCheckService] Mở trang Users: %s", usersUrl.length > 80 ? usersUrl.slice(0, 80) + "..." : usersUrl);
  await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));

  const usersData = await page.evaluate(() => {
    const body = document.body?.innerText || "";
    const emails = [];
    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let match;
    while ((match = emailRe.exec(body)) !== null) emails.push(match[0]);
    const uniq = [...new Set(emails)];
    const userMatch = body.match(/(?:Người dùng|người dùng|Users?)\s*(\d+)/i) || body.match(/(\d+)\s*(?:Người dùng|người dùng|users?)/i) || body.match(/(\d+)\s*user(s)?/i);
    const userCount = userMatch ? parseInt(userMatch[1], 10) : 0;
    return { userCount: Number.isFinite(userCount) ? userCount : uniq.length || 0, emails: uniq.slice(0, 500) };
  }).catch(() => ({ userCount: overviewData.userCount, emails: [] }));

  return {
    ...overviewData,
    userCount: usersData.userCount > 0 ? usersData.userCount : overviewData.userCount,
    usersSnapshot: usersData.emails && usersData.emails.length > 0 ? JSON.stringify(usersData.emails) : undefined,
  };
}

/**
 * Đăng nhập Admin Console, chờ trang overview → success (scrape) hoặc fail.
 * Không lấy token, chỉ kiểm tra login thành công (URL có @AdobeOrg/overview).
 * @param {string} email
 * @param {string} password - plain password
 * @returns {Promise<never>} Luôn throw: success thì throw với err.scrapedData, fail thì throw với message.
 */
async function getAdobeUserToken(email, password) {
  const puppeteer = require("puppeteer");
  // Mặc định mở trình duyệt để kiểm tra (set PUPPETEER_HEADLESS=true để chạy ẩn)
  const headless = process.env.PUPPETEER_HEADLESS === "true";
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null,
    slowMo: 50,
  });
  let scrapedData = null;
  const page = await browser.newPage();

  const clickButtonByText = async (re, timeoutMs = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const clicked = await page.evaluate((reSource, reFlags) => {
          const re = new RegExp(reSource, reFlags);
          const isVisible = (el) => {
            if (!el) return false;
            // offsetParent null can be false-negative for fixed elements; check rect as well
            const rect = el.getBoundingClientRect?.();
            const hasRect = rect && rect.width > 2 && rect.height > 2;
            return (el.offsetParent !== null) || hasRect;
          };
          const getLabel = (el) => {
            const t = (el.textContent || "").trim();
            if (t) return t;
            const aria = (el.getAttribute && el.getAttribute("aria-label")) || "";
            return String(aria || "").trim();
          };
          const candidates = [];
          const visitRoot = (root) => {
            if (!root) return;
            const nodes = root.querySelectorAll
              ? root.querySelectorAll("button, [role='button'], a, input[type='submit'], input[type='button']")
              : [];
            nodes.forEach((n) => candidates.push(n));
            // traverse shadow roots
            const all = root.querySelectorAll ? root.querySelectorAll("*") : [];
            all.forEach((el) => {
              if (el && el.shadowRoot) visitRoot(el.shadowRoot);
            });
          };
          visitRoot(document);

          const el = candidates.find((c) => isVisible(c) && re.test(getLabel(c)));
          if (!el) return false;
          el.click();
          return true;
        }, re.source, re.flags);
        if (clicked) return true;
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  };

  const maybeSkipSecurityPrompt = async () => {
    const url = page.url() || "";
    if (!/progressive-profile\/user-security|user-security/i.test(url)) return false;
    logger.info("[adobeCheckService] Gặp màn hình yêu cầu thêm SĐT/email dự phòng, thử bấm Skip ...");
    const ok = await clickButtonByText(/^\s*skip\s*$/i, 20000);
    if (!ok) {
      logger.warn("[adobeCheckService] Không tìm thấy nút Skip (có thể UI thay đổi). URL: %s", url);
      return false;
    }
    await Promise.race([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
      new Promise((r) => setTimeout(r, 5000)),
    ]).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    logger.info("[adobeCheckService] Đã bấm Skip, URL hiện tại: %s", page.url());
    return true;
  };

  const PASSWORD_SELECTORS = [
    'input[name="password"]',
    'input[type="password"]',
    'input#password',
    'input[data-testid="password-field"]',
    '[name="password"]',
  ];
  const waitForPassword = async () => {
    for (const sel of PASSWORD_SELECTORS) {
      try {
        const el = await page.waitForSelector(sel, { timeout: 8000 });
        if (el) return el;
      } catch (_) {
        continue;
      }
    }
    throw new Error("Không tìm thấy ô mật khẩu trên trang (có thể trang đổi giao diện hoặc yêu cầu 2FA).");
  };

  try {
    logger.info("[adobeCheckService] Login Admin Console...");
    await page.goto("https://adminconsole.adobe.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('input[name="username"]', { timeout: 20000 });
    await page.type('input[name="username"]', email, { delay: 80 });
    await page.keyboard.press("Enter");
    await Promise.race([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
      new Promise((r) => setTimeout(r, 5000)),
    ]).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    const passwordEl = await waitForPassword();
    await passwordEl.type(password, { delay: 80 });
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 45000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 5000));

    // Adobe đôi khi chặn flow và yêu cầu "Improve your security with a phone number" → cần bấm Skip mới đi tiếp.
    await maybeSkipSecurityPrompt();

    const urlAfterPassword = page.url() || "";
    const isVerifyEmailChallenge = /challenge\/verify\/email/i.test(urlAfterPassword);
    const hasVerifyIdentityText = await page
      .evaluate(() => (document.body?.innerText || "").includes("Verify your identity"))
      .catch(() => false);
    if (isVerifyEmailChallenge || hasVerifyIdentityText) {
      logger.info("[adobeCheckService] Gặp màn hình Verify identity/email — bấm Continue ...");
      const clickedContinue = await clickButtonByText(/^\s*(continue|tiếp\s*tục)\s*$/i, 20000);
      if (!clickedContinue) {
        const err = new Error("Không tìm thấy nút Continue trên màn hình Verify your identity.");
        throw err;
      }
      await new Promise((r) => setTimeout(r, 3000));
      const hasOtpInput = await page.evaluate(() => {
        const inputs = document.querySelectorAll(
          'input[autocomplete="one-time-code"], input[type="text"], input[type="tel"], input[name*="code"], input[id*="code"], input[placeholder*="ode"]'
        );
        return Array.from(inputs).some((i) => i.offsetParent !== null);
      }).catch(() => false);
      if (hasOtpInput) logger.info("[adobeCheckService] Đã hiện ô nhập mã OTP.");
      logger.info("[adobeCheckService] Vui lòng nhập mã OTP từ email trong trình duyệt (chờ tối đa 2 phút).");
      for (let t = 0; t < 60; t++) {
        await new Promise((r) => setTimeout(r, 2000));
        const url = page.url() || "";
        if (url.indexOf("@AdobeOrg") !== -1) break;
        const hasPw = await page
          .evaluate(() => !!document.querySelector('input[type="password"], input[name="password"]'))
          .catch(() => false);
        if (hasPw) {
          logger.info("[adobeCheckService] Đã hiện ô mật khẩu sau OTP.");
          break;
        }
        if (t > 0 && t % 15 === 0) logger.info("[adobeCheckService] Vẫn chờ bạn nhập OTP... (%ss)", t * 2);
      }
      const urlAfterOtp = page.url() || "";
      if (urlAfterOtp.indexOf("@AdobeOrg") === -1) {
        const hasPwAfterOtp = await page.evaluate(() => !!document.querySelector('input[type="password"], input[name="password"]')).catch(() => false);
        if (hasPwAfterOtp) {
          logger.info("[adobeCheckService] Sau OTP hiện lại ô mật khẩu — nhập password ...");
          const pwEl = await waitForPassword();
          await pwEl.type(password, { delay: 80 });
          await page.keyboard.press("Enter");
          await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 45000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 3000));
          await maybeSkipSecurityPrompt();
        } else {
          const err = new Error("Hết thời gian chờ nhập OTP (2 phút) hoặc OTP chưa được xác nhận. Vui lòng nhập mã từ email và thử lại.");
          logger.warn("[adobeCheckService] Timeout chờ OTP.");
          throw err;
        }
      }
    }

    logger.info("[adobeCheckService] Chờ trang overview (URL có @AdobeOrg), tối đa 60s...");
    try {
      await page.waitForFunction(
        () => window.location.href.indexOf("@AdobeOrg") !== -1,
        { timeout: 60000 }
      );
    } catch (_) {}

    let currentUrl = page.url() || "";
    if (currentUrl.indexOf("@AdobeOrg") === -1) {
      const stillVerifyIdentity = await page.evaluate(() => (document.body?.innerText || "").includes("Verify your identity")).catch(() => false);
      const msg = stillVerifyIdentity
        ? "Adobe yêu cầu xác minh danh tính qua email (Verify your identity). Đăng nhập thủ công một lần, hoàn tất xác minh, rồi thử lại."
        : "Login thất bại: không truy cập được trang overview (sai mật khẩu, 2FA hoặc trang Adobe đổi flow).";
      const err = new Error(msg);
      logger.warn("[adobeCheckService] Fail — %s", currentUrl.indexOf("auth.services") !== -1 ? "auth.services.adobe.com" : currentUrl.slice(0, 80) + "...");
      throw err;
    }

    await new Promise((r) => setTimeout(r, 2500));
    scrapedData = await scrapeOverviewThenUsers(page, currentUrl);
    const err = new Error("Login thành công.");
    err.scrapedData = scrapedData;
    logger.info("[adobeCheckService] Success — đã vào overview, scrape xong.");
    throw err;
  } finally {
    await browser.close();
  }
}

/**
 * Lấy danh sách Org từ IMS.
 */
async function getAllOrgs(token) {
  const res = await fetch("https://ims-na1.adobelogin.com/ims/organizations", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Get orgs failed: ${res.status}`);
  return res.json();
}

/**
 * Kiểm tra license của org (JIL API). Cần ADOBE_CLIENT_ID trong .env.
 */
async function checkOrgLicense(token, orgId, clientId) {
  const apiKey = clientId || ADOBE_CLIENT_ID;
  const res = await fetch(
    `https://bps-il.adobe.io/jil-api/v2/organizations/${encodeURIComponent(orgId)}/consumables:summary`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Api-Key": apiKey,
      },
    }
  );
  if (!res.ok) {
    return { orgId, hasActiveLicense: false, products: [] };
  }
  const data = await res.json();
  const consumables = data.consumables || [];
  const products = consumables.map((c) => ({
    productName: c.productName || "Unknown",
    totalQuantity: c.totalQuantity || 0,
    consumedQuantity: c.consumedQuantity || 0,
    remainingQuantity: c.remainingQuantity || 0,
    status: c.consumableStatus || "UNKNOWN",
  }));
  const hasActiveLicense = products.some((p) => p.status === "ACTIVE" && p.totalQuantity > 0);
  return { orgId, hasActiveLicense, products };
}

/**
 * Lấy toàn bộ user trong org (UMAPI). Cần ADOBE_CLIENT_ID.
 */
async function getAllUsersInOrg(token, orgId, clientId) {
  const apiKey = clientId || ADOBE_CLIENT_ID;
  const allUsers = [];
  let page = 0;
  while (true) {
    const res = await fetch(
      `https://usermanagement.adobe.io/v2/usermanagement/users/${encodeURIComponent(orgId)}/${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": apiKey,
        },
      }
    );
    if (!res.ok) break;
    const data = await res.json();
    const users = (data.users || []).map((u) => ({
      email: u.email || "",
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      status: u.status || "",
      userType: u.userType || "",
    }));
    allUsers.push(...users);
    if (data.lastPage === true || users.length === 0) break;
    page++;
    await new Promise((r) => setTimeout(r, 300));
  }
  return allUsers;
}

module.exports = {
  getAdobeUserToken,
  getAllOrgs,
  checkOrgLicense,
  getAllUsersInOrg,
  ADOBE_CLIENT_ID,
};

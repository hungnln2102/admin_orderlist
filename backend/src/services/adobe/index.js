/**
 * Điều phối Adobe: login, navigate, scrape.
 * Tách thành từng bước — tính năng mới chỉ cần gọi đúng bước cần thiết.
 *
 * - performLogin: chỉ đăng nhập (cookie hoặc form).
 * - navigate.*: vào account.adobe.com, Admin Console overview, Admin Console users.
 * - scrapers.*: scrape / thao tác trên trang hiện tại (getProfileName, getAdobeProductInfo, scrapeUsers, deleteUser).
 *
 * getAdobeUserToken: API cũ, gộp login + (tùy chọn account) + Admin Console + scrape; giữ tương thích.
 */

const path = require("path");
const fs = require("fs");
const logger = require("../../utils/logger");
const {
  loadCookiesFromFile,
  tryLoadCookiesFromFile,
  getCookiesFromObject,
  getCookiesFromPage,
} = require("./cookies");
const {
  scrapeAdminConsoleUsersPage,
  deleteUserOnAdminConsole,
  getAdobeProductInfo,
  getProfileNameFromAccountPage,
  scrapeOverviewThenUsers,
} = require("./scrapers");
const { performLogin } = require("./performLogin");
const {
  navigateToAccountPage,
  navigateToAdminConsoleOverview,
  navigateToAdminConsoleUsers,
} = require("./navigate");

/**
 * Chạy một phiên Puppeteer: tạo browser + page, login, gọi fn(page), đóng browser.
 * Dùng khi cần luồng tùy chỉnh (vd. chỉ login → vào users → xóa user, không qua account.adobe.com).
 *
 * @param {{ email: string, password: string, cookiesFile?: string, saveCookiesTo?: string, savedCookiesFromDb?: object, mailBackupId?: number|null }} opts
 * @param {(page: import('puppeteer').Page) => Promise<any>} fn - Nhận page đã login, trả về kết quả tùy ý
 * @returns {Promise<any>} Kết quả của fn(page)
 */
async function runWithSession(opts, fn) {
  const puppeteer = require("puppeteer");
  const headless = process.env.PUPPETEER_HEADLESS === "true";
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null,
    slowMo: 50,
  });
  const page = await browser.newPage();
  try {
    const cookiesFile = opts.cookiesFile && opts.cookiesFile.trim();
    const saveCookiesTo = opts.saveCookiesTo && opts.saveCookiesTo.trim();
    const savedCookiesFromDb =
      opts.savedCookiesFromDb != null ? getCookiesFromObject(opts.savedCookiesFromDb) : [];
    const savedCookies = saveCookiesTo ? tryLoadCookiesFromFile(saveCookiesTo) : [];
    const useCookies =
      !!cookiesFile || savedCookies.length > 0 || savedCookiesFromDb.length > 0;
    const cookiesToUse = useCookies
      ? cookiesFile
        ? loadCookiesFromFile(cookiesFile)
        : savedCookies.length > 0
          ? savedCookies
          : savedCookiesFromDb
      : [];

    await performLogin(page, {
      email: opts.email,
      password: opts.password,
      useCookies,
      cookiesToUse,
      mailBackupId: opts.mailBackupId,
    });

    const result = await fn(page);
    return result;
  } finally {
    await browser.close();
  }
}

/**
 * Luồng đầy đủ: login → (tùy chọn account.adobe.com lấy org_name) → Admin Console overview → users → scrape hoặc xóa user.
 * Giữ API cũ: luôn throw; success thì err.scrapedData + err.savedCookies.
 *
 * @param {string} email
 * @param {string} password
 * @param {{ cookiesFile?: string, saveCookiesTo?: string, savedCookiesFromDb?: object, mailBackupId?: string, deleteUserEmail?: string, needAccountProfile?: boolean }} [options]
 * - needAccountProfile: true (mặc định) = vào account.adobe.com lấy org_name; false = bỏ qua (vd. chỉ xóa user).
 */
async function getAdobeUserToken(email, password, options = {}) {
  const saveCookiesTo = options.saveCookiesTo && options.saveCookiesTo.trim();
  const needAccountProfile = options.needAccountProfile !== false;
  const deleteUserEmail = options.deleteUserEmail && String(options.deleteUserEmail).trim();

  const puppeteer = require("puppeteer");
  const headless = process.env.PUPPETEER_HEADLESS === "true";
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null,
    slowMo: 50,
  });
  let scrapedData = null;
  const page = await browser.newPage();

  const cookiesFile = options.cookiesFile && options.cookiesFile.trim();
  const savedCookiesFromDb =
    options.savedCookiesFromDb != null ? getCookiesFromObject(options.savedCookiesFromDb) : [];
  const savedCookies = saveCookiesTo ? tryLoadCookiesFromFile(saveCookiesTo) : [];
  const useCookies =
    !!cookiesFile || savedCookies.length > 0 || savedCookiesFromDb.length > 0;
  const cookiesToUse = useCookies
    ? cookiesFile
      ? loadCookiesFromFile(cookiesFile)
      : savedCookies.length > 0
        ? savedCookies
        : savedCookiesFromDb
    : [];

  try {
    await performLogin(page, {
      email,
      password,
      useCookies,
      cookiesToUse,
      mailBackupId: options.mailBackupId != null ? Number(options.mailBackupId) : null,
    });

    const currentUrl = page.url() || "";
    const isOnAdobeOrg = currentUrl.indexOf("@AdobeOrg") !== -1;
    const isOnAdobeCom = /^https?:\/\/(www\.)?adobe\.com(\/|$)/i.test(currentUrl);

    if (isOnAdobeOrg) {
      await new Promise((r) => setTimeout(r, 2500));
      scrapedData = await scrapeOverviewThenUsers(page, currentUrl);
    } else if (isOnAdobeCom) {
      scrapedData = await runAdminConsoleFlow(page, {
        needAccountProfile,
        deleteUserEmail,
      });
    } else {
      throw new Error("Sau login không ở adobe.com hay @AdobeOrg.");
    }

    let savedCookiesPayload = null;
    try {
      savedCookiesPayload = await getCookiesFromPage(page);
      if (saveCookiesTo && savedCookiesPayload.cookies.length > 0) {
        const resolved = path.isAbsolute(saveCookiesTo)
          ? saveCookiesTo
          : path.resolve(process.cwd(), saveCookiesTo);
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          resolved,
          JSON.stringify(savedCookiesPayload, null, 2),
          "utf8"
        );
        logger.info(
          "[adobe] Đã lưu %s cookies vào file %s",
          savedCookiesPayload.cookies.length,
          resolved
        );
      }
    } catch (e) {
      logger.warn("[adobe] Không lấy/lưu được cookies: %s", e.message);
    }

    const err = new Error("Login thành công.");
    err.scrapedData = scrapedData;
    if (savedCookiesPayload?.cookies?.length > 0) err.savedCookies = savedCookiesPayload;
    logger.info("[adobe] Success — đã scrape xong.");
    throw err;
  } finally {
    await browser.close();
  }
}

/**
 * Luồng chỉ trên Admin Console: (tùy chọn account) → overview → users → scrape / xóa.
 * Page đã đăng nhập (adobe.com).
 */
async function runAdminConsoleFlow(page, opts = {}) {
  const { needAccountProfile, deleteUserEmail } = opts;
  let profileName = null;

  if (needAccountProfile) {
    await navigateToAccountPage(page);
    profileName = await getProfileNameFromAccountPage(page);
    if (profileName) {
      logger.info("[account.adobe.com] Profile name → org_name: %s", profileName);
    }
  }

  await navigateToAdminConsoleOverview(page);
  const productInfo = await getAdobeProductInfo(page);
  const licenseStatus = productInfo.hasPlan ? "Paid" : "Expired";
  logger.info("[adobe] Check gói (Admin Console): hasPlan=%s → license_status=%s", productInfo.hasPlan, licenseStatus);

  await navigateToAdminConsoleUsers(page);
  if (deleteUserEmail) {
    await deleteUserOnAdminConsole(page, deleteUserEmail);
    await new Promise((r) => setTimeout(r, 2000));
  }

  const adminConsoleUsers = await scrapeAdminConsoleUsersPage(page).catch(() => []);
  const manageTeamMembers = adminConsoleUsers.map((u) => ({
    name: u.name,
    email: u.email || "",
    role: "",
    access: u.sanPhamText && u.sanPhamText[0] ? u.sanPhamText[0] : "",
  }));

  return {
    orgName: profileName ?? null,
    userCount: manageTeamMembers.length,
    licenseStatus,
    adobe_org_id: null,
    profileName,
    manageTeamMembers,
    adminConsoleUsers,
  };
}

module.exports = {
  getAdobeUserToken,
  runWithSession,
  performLogin,
  navigate: require("./navigate"),
  scrapers: require("./scrapers"),
};

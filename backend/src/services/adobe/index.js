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
  navigateToAdminConsoleProducts,
  navigateToAdminConsoleUsers,
  navigateToAdminConsoleAutoAssign,
} = require("./navigate");
const { getProductAccessUrl } = require("./getProductAccessUrlFlow");
const { runDeleteProduct } = require("./deleteProductFlow");

/**
 * Chạy một phiên Puppeteer: tạo browser + page, login, gọi fn(page), đóng browser.
 * Dùng khi cần luồng tùy chỉnh (vd. chỉ login → vào users → xóa user, không qua account.adobe.com).
 *
 * @param {{ email: string, password: string, cookiesFile?: string, saveCookiesTo?: string, savedCookiesFromDb?: object, mailBackupId?: number|null }} opts
 * @param {(page: import('puppeteer').Page) => Promise<any>} fn - Nhận page đã login, trả về kết quả tùy ý
 * @returns {Promise<any>} Kết quả của fn(page)
 */
function getPuppeteerLaunchOptions() {
  const headless = process.env.PUPPETEER_HEADLESS === "true";
  const opts = {
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-http2",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
    ],
    defaultViewport: { width: 1280, height: 720 },
    slowMo: headless ? 30 : 120,
    protocolTimeout: 180000,
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  logger.info("[adobe] Launch browser: headless=%s (set PUPPETEER_HEADLESS=false để mở cửa sổ khi test)", headless);
  return opts;
}

async function runWithSession(opts, fn) {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch(getPuppeteerLaunchOptions());
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
  const needUrlAccess = !!options.needUrlAccess;

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch(getPuppeteerLaunchOptions());
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
    const isOnAdobeCom =
      /^https?:\/\/([a-z0-9-]+\.)*adobe\.com/i.test(currentUrl) &&
      currentUrl.indexOf("auth.services") === -1;

    if (isOnAdobeOrg) {
      await new Promise((r) => setTimeout(r, 2500));
      scrapedData = await scrapeOverviewThenUsers(page, currentUrl);
    } else if (isOnAdobeCom) {
      scrapedData = await runAdminConsoleFlow(page, {
        needAccountProfile,
        deleteUserEmail,
        needUrlAccess,
        hasExistingCookies: savedCookiesFromDb.length > 0,
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
 * Luồng chỉ trên Admin Console: (tùy chọn account) → products (check gói) → users → scrape / xóa.
 * Page đã đăng nhập (adobe.com). Kiểm tra có sản phẩm trên trang /products (tiện hơn Overview).
 */
async function runAdminConsoleFlow(page, opts = {}) {
  const { needAccountProfile, deleteUserEmail, needUrlAccess, hasExistingCookies } = opts;
  let profileName = null;

  if (needAccountProfile) {
    await navigateToAccountPage(page);
    profileName = await getProfileNameFromAccountPage(page);
    if (profileName) {
      logger.info("[account.adobe.com] Profile name → org_name: %s", profileName);
    }
  }

  await navigateToAdminConsoleProducts(page);
  const productInfo = await getAdobeProductInfo(page);
  const licenseStatus = productInfo.hasPlan ? "Paid" : "Expired";
  logger.info("[adobe] Check gói (Admin Console /products): hasPlan=%s → license_status=%s", productInfo.hasPlan, licenseStatus);

  await navigateToAdminConsoleUsers(page);
  if (deleteUserEmail) {
    await deleteUserOnAdminConsole(page, deleteUserEmail);
    await new Promise((r) => setTimeout(r, 2000));
  }

  let adminConsoleUsers = await scrapeAdminConsoleUsersPage(page).catch(() => []);
  if (adminConsoleUsers.length === 0) {
    await new Promise((r) => setTimeout(r, 4000));
    adminConsoleUsers = await scrapeAdminConsoleUsersPage(page).catch(() => []);
  }
  const manageTeamMembers = adminConsoleUsers.map((u) => ({
    name: u.name,
    email: u.email || "",
    product: !!u.product,
  }));

  // Xóa product: chỉ chạy lần đầu (alert_config chưa có giá trị)
  if (hasExistingCookies) {
    logger.info("[adobe] Bỏ qua deleteProduct: đã chạy trước đó (alert_config có giá trị)");
  } else {
    try {
      const deleteResult = await runDeleteProduct(page);
      if (deleteResult.skipped) {
        logger.info("[adobe] deleteProduct đã bỏ qua (không có product để xóa)");
      } else {
        logger.info("[adobe] Đã chạy flow delete product xong");
      }
      await new Promise((r) => setTimeout(r, 3000));
    } catch (e) {
      logger.warn("[adobe] deleteProduct lỗi (bỏ qua): %s", e.message);
    }
  }

  // Lấy url_access sau khi đã lấy xong thông tin người dùng (chỉ chạy khi url_access trống và có gói)
  let urlAccess = null;
  if (needUrlAccess && productInfo.hasPlan) {
    try {
      await navigateToAdminConsoleAutoAssign(page);
      urlAccess = await getProductAccessUrl(page);
      if (urlAccess) logger.info("[adobe] Đã lấy url_access từ auto-assign");
    } catch (e) {
      logger.warn("[adobe] getProductAccessUrl lỗi (bỏ qua): %s", e.message);
    }
  }

  const result = {
    orgName: profileName ?? null,
    userCount: manageTeamMembers.length,
    licenseStatus,
    adobe_org_id: null,
    profileName,
    manageTeamMembers,
    adminConsoleUsers,
  };
  if (urlAccess) result.url_access = urlAccess;
  return result;
}

const autoDeleteFlow = require("./autoDeleteFlow");
const addUserFlow = require("./addUserFlow");

module.exports = {
  getAdobeUserToken,
  runWithSession,
  performLogin,
  navigate: require("./navigate"),
  scrapers: require("./scrapers"),
  autoDeleteFlow,
  addUserFlow,
};

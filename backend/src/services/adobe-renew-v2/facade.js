/**
 * Facade Playwright V2 cho Renew Adobe.
 * Mục tiêu: giữ contract API hiện tại trên một luồng runtime duy nhất của adobe-renew-v2.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { getPlaywrightProxyOptions } = require("./shared/proxyConfig");
const { runCheckFlow } = require("./runCheckFlow");
const { getOrCreateAutoAssignUrlWithPage } = require("./autoAssignFlow");
const { runB15RemoveProductFromAdmin } = require("./removeProductAdminFlow");
const { deleteUsersV2 } = require("./deleteUsersV2");
const { addUsersWithProductV2 } = require("./addUsersWithProductV2");

/**
 * Chuẩn hóa savedCookiesFromDb từ DB.
 * @param {object|string|null} raw
 * @returns {{ cookies: any[], accessToken?: string }|null}
 */
function normalizeSavedCookiesFromDb(raw) {
  if (raw == null) return null;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      obj = parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }
  if (!obj || Array.isArray(obj) || typeof obj !== "object") return null;
  if (!Array.isArray(obj.cookies) || obj.cookies.length === 0) return null;
  return obj;
}

/**
 * Check account theo luồng V2 (B1-B13 + B14/B15 nếu cần).
 * @param {string} email
 * @param {string} password
 * @param {{ savedCookiesFromDb?: any, mailBackupId?: number|null, otpSource?: string|null, existingUrlAccess?: string|null, existingOrgName?: string|null }} options
 * @returns {Promise<{ success: boolean, scrapedData: any|null, savedCookies: any|null, error?: string }>}
 */
async function checkAccount(email, password, options = {}) {
  const savedCookiesFromDb = normalizeSavedCookiesFromDb(options.savedCookiesFromDb);
  const cookiesToUse = savedCookiesFromDb?.cookies || [];
  const mailBackupId = options.mailBackupId || null;
  const otpSource = options.otpSource || "imap";
  const existingOrgName =
    options.existingOrgName && String(options.existingOrgName).trim()
      ? String(options.existingOrgName).trim()
      : null;
  const existingUrlAccess =
    options.existingUrlAccess && String(options.existingUrlAccess).trim()
      ? String(options.existingUrlAccess).trim()
      : null;

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const proxyOptions = getPlaywrightProxyOptions();
  const launchOptions = {
    headless,
    slowMo: headless ? 0 : 80,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  if (proxyOptions) launchOptions.proxy = proxyOptions;

  const browser = await chromium.launch(launchOptions);
  logger.info("[adobe-v2] facade.checkAccount: browser launched OK");
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    const sharedSession = { context, page: await context.newPage() };

    logger.info("[adobe-v2] facade.checkAccount: chạy runCheckFlow (B1-B13)...");
    const result = await runCheckFlow(email, password, {
      savedCookies: cookiesToUse,
      mailBackupId,
      otpSource,
      sharedSession,
      existingOrgName,
    });

    if (!result.success) {
      return { success: false, scrapedData: null, savedCookies: null, error: result.error };
    }

    const page = sharedSession.page;
    const adminEmail = email.toLowerCase().trim();
    const users = (result.users || []).map((u) => ({
      id: u.id || null,
      authenticatingAccountId: u.authenticatingAccountId || null,
      name: u.name || "",
      email: (u.email || "").trim(),
      products: Array.isArray(u.products) ? u.products : [],
      hasPackage: Array.isArray(u.products)
        ? u.products.length > 0
        : u.hasProduct === true,
      product: u.hasProduct === true,
    }));
    const hasProducts = (result.products || []).length > 0;
    const adminHasProduct =
      hasProducts &&
      users.some((u) => (u.email || "").toLowerCase() === adminEmail && u.product === true);

    if (adminHasProduct) {
      try {
        await runB15RemoveProductFromAdmin(page, email, { orgId: result.orgId || null });
      } catch (e) {
        logger.warn("[adobe-v2] facade.checkAccount: B15 lỗi: %s", e.message);
      }
    }

    let urlAccess = existingUrlAccess || null;
    if (hasProducts && !urlAccess && result.orgId) {
      try {
        const autoAssign = await getOrCreateAutoAssignUrlWithPage(page, result.orgId, email, password, {
          mailBackupId,
          otpSource,
        });
        urlAccess = autoAssign.url;
        if (autoAssign.savedCookies && autoAssign.savedCookies.length) {
          result.cookies = autoAssign.savedCookies;
        }
      } catch (e) {
        logger.warn("[adobe-v2] facade.checkAccount: B14 lỗi: %s", e.message);
      }
    }

    const manageTeamMembers = users
      .filter((u) => (u.email || "").toLowerCase() !== adminEmail)
      .map((u) => ({
        id: u.id || null,
        authenticatingAccountId: u.authenticatingAccountId || null,
        name: u.name || "",
        email: (u.email || "").trim(),
        products: Array.isArray(u.products) ? u.products : [],
        hasPackage: Array.isArray(u.products)
          ? u.products.length > 0
          : u.product === true,
        // Quy ước nghiệp vụ: có products => còn gói; không có products => chưa cấp quyền.
        product:
          Array.isArray(u.products) ? u.products.length > 0 : u.product === true,
      }));

    const scrapedData = {
      orgName: result.org_name || null,
      userCount: manageTeamMembers.length,
      licenseStatus: result.license_status || "unknown",
      adobe_org_id: result.orgId || null,
      profileName: result.org_name || null,
      manageTeamMembers,
      adminConsoleUsers: users,
      urlAccess,
    };

    const savedCookies = {
      cookies: result.cookies || [],
      savedAt: new Date().toISOString(),
    };

    return {
      success: true,
      scrapedData,
      savedCookies,
    };
  } catch (error) {
    logger.error("[adobe-v2] facade.checkAccount error: %s\nSTACK: %s", error.message, error.stack);
    return {
      success: false,
      scrapedData: null,
      savedCookies: null,
      error: error.message || "Check thất bại",
      _stack: error.stack,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Xóa 1 user khỏi account bằng V2.
 * @param {string} email
 * @param {string} password
 * @param {string} userEmail
 * @param {{ savedCookiesFromDb?: any, savedCookies?: any[], mailBackupId?: number|null, otpSource?: string|null }} options
 * @returns {Promise<{ success: boolean, deleted?: string[], failed?: string[], snapshot?: any, savedCookies?: any, error?: string }>}
 */
async function removeUserFromAccount(email, password, userEmail, options = {}) {
  if (!userEmail) throw new Error("Thiếu userEmail");
  const savedCookies =
    options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const v2 = await deleteUsersV2(email, password, [userEmail], {
    savedCookies,
    mailBackupId: options.mailBackupId || null,
    otpSource: options.otpSource || "imap",
  });
  return {
    success: (v2.deleted || []).includes(userEmail),
    deleted: v2.deleted || [],
    failed: v2.failed || [],
    snapshot: v2.snapshot || null,
    savedCookies: v2.savedCookies || null,
    ...(v2.error ? { error: v2.error } : {}),
  };
}

/**
 * Xóa nhiều user bằng V2.
 * @param {string} email
 * @param {string} password
 * @param {string[]} userEmails
 * @param {{ savedCookiesFromDb?: any, savedCookies?: any[], mailBackupId?: number|null, otpSource?: string|null }} options
 * @returns {Promise<{ deleted: string[], failed: string[], snapshot: any|null, savedCookies?: any, error?: string }>}
 */
async function autoDeleteUsers(email, password, userEmails, options = {}) {
  if (!userEmails || userEmails.length === 0) {
    return { deleted: [], failed: [], snapshot: null };
  }
  const savedCookies =
    options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const v2 = await deleteUsersV2(email, password, userEmails, {
    savedCookies,
    mailBackupId: options.mailBackupId || null,
    otpSource: options.otpSource || "imap",
  });
  return {
    deleted: v2.deleted || [],
    failed: v2.failed || [],
    snapshot: v2.snapshot || null,
    ...(v2.savedCookies ? { savedCookies: v2.savedCookies } : {}),
    ...(v2.error ? { error: v2.error } : {}),
  };
}

/**
 * Add users + assign product bằng V2.
 * @param {string} email
 * @param {string} password
 * @param {string[]} userEmails
 * @param {{ savedCookiesFromDb?: any, savedCookies?: any[], mailBackupId?: number|null, otpSource?: string|null, orgId?: string|null, _orgName?: string|null }} options
 */
async function addUsersWithProduct(email, password, userEmails, options = {}) {
  const savedCookies =
    options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const v2 = await addUsersWithProductV2(email, password, userEmails, {
    savedCookies,
    mailBackupId: options.mailBackupId || null,
    otpSource: options.otpSource || "imap",
    orgId: options.orgId || null,
  });
  if (!v2.success) throw new Error(v2.error || "V2 addUsersWithProduct fail");
  return {
    addResult: v2.addResult,
    assignResult: v2.assignResult,
    manageTeamMembers: v2.manageTeamMembers || [],
    userCount: v2.userCount ?? (v2.manageTeamMembers?.length ?? 0),
    licenseStatus: v2.licenseStatus || "unknown",
    orgName: options._orgName || null,
    savedCookies: v2.savedCookies,
  };
}

module.exports = {
  checkAccount,
  addUsersWithProduct,
  removeUserFromAccount,
  autoDeleteUsers,
  normalizeSavedCookiesFromDb,
};

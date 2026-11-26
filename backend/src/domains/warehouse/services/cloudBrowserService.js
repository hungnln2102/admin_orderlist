const { db } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");
const { normalizeWarehouseLoginUrl } = require("./warehouseLoginUrl");

const { CloudBrowserError, openSession } = require("./cloudBrowserSessions");
const {
  hasSessionCookieForUrl, hasVisibleLoginForm, getSessionProbeUrl,
  isLoginFlowUrl, isVerifiedSessionUrl,
} = require("./browserLauncherService");
const { ACCOUNT_SLOTS: SLOT, PRODUCT_NAMES: CATALOG } = COLS;

function positiveId(value) {
  if (typeof value === "string" && /^\d+$/.test(value)) value = Number(value);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function resolveLoginUrl({ catalogId, accountId, slotId }) {
  let id;
  if (catalogId !== undefined && accountId === undefined && slotId === undefined) {
    id = positiveId(catalogId);
    if (!id) throw new CloudBrowserError(400, "ID danh mục không hợp lệ.");
  } else if (catalogId === undefined && positiveId(accountId) && positiveId(slotId)) {
    const slot = await db(TABLES.ACCOUNT_SLOTS)
      .where({ [SLOT.ID]: positiveId(slotId), [SLOT.ACCOUNT_ID]: positiveId(accountId) })
      .first(SLOT.NAME_ID);
    if (!slot) throw new CloudBrowserError(404, "Không tìm thấy slot thuộc tài khoản kho.");
    id = slot[SLOT.NAME_ID];
  } else {
    throw new CloudBrowserError(400, "Cần cung cấp ID danh mục hoặc cặp ID tài khoản và slot hợp lệ.");
  }

  const catalog = id && await db(TABLES.PRODUCT_NAMES).where(CATALOG.ID, id).first(CATALOG.LOGIN_URL);
  if (!catalog) throw new CloudBrowserError(404, "Không tìm thấy dịch vụ trong danh mục kho.");
  const loginUrl = catalog[CATALOG.LOGIN_URL]?.trim();
  if (!loginUrl) throw new CloudBrowserError(422, "Dịch vụ chưa có đường dẫn đăng nhập trong danh mục kho.");
  const url = normalizeWarehouseLoginUrl(loginUrl);
  if (!url) {
    throw new CloudBrowserError(422, "Đường dẫn đăng nhập phải là URL HTTP hoặc HTTPS hợp lệ.");
  }
  return url;
}

async function navigateCloudBrowser(selection, owner) {
  const url = await resolveLoginUrl(selection || {});
  const accountId = positiveId(selection.accountId);
  const slotId = positiveId(selection.slotId);
  const google = ["accounts.google.com", "myaccount.google.com", "one.google.com"].includes(new URL(url).hostname);
  const probe = google ? "https://myaccount.google.com/" : getSessionProbeUrl(url);
  const verify = !slotId || !probe ? null : {
    slotId,
    async run(context) {
      const pages = context.pages();
      const cookies = await context.cookies(probe);
      const hasCookies = google
        ? cookies.some(({ name, value }) => value && ["SID", "__Secure-1PSID", "__Secure-3PSID"].includes(name))
        : hasSessionCookieForUrl(cookies, probe);
      const verified = hasCookies && pages.some((page) => isVerifiedSessionUrl(page.url(), probe));
      const loginPage = pages.find((page) => {
        const host = new URL(page.url()).hostname;
        return (host === new URL(url).hostname || (google && host === "accounts.google.com"))
          && isLoginFlowUrl(page.url());
      });
      if (!verified && (!loginPage || !await hasVisibleLoginForm(loginPage))) return;
      await db(TABLES.ACCOUNT_SLOTS).where({ [SLOT.ID]: slotId, [SLOT.ACCOUNT_ID]: accountId })
        .update({
          [SLOT.SESSION_IS_AUTHENTICATED]: verified,
          [SLOT.SESSION_CHECKED_AT]: new Date(),
          [SLOT.UPDATED_AT]: new Date(),
        });
    },
  };
  return openSession({
    key: accountId ? `account-${accountId}` : "catalog",
    owner,
    loginUrl: url,
    verify,
    persistent: Boolean(accountId),
  });
}

module.exports = { navigateCloudBrowser, CloudBrowserError };

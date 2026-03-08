/**
 * Load/save và chuẩn hóa cookies Adobe (file JSON, object DB, từ page).
 */

const path = require("path");
const fs = require("fs");

const SAME_SITE_MAP = { no_restriction: "None", strict: "Strict", lax: "Lax", unspecified: "Lax" };
const ADOBE_DOMAIN = (c) => c.domain && (c.domain.includes("adobe.com") || c.domain === ".adobe.com");

function normalizeCookie(c) {
  const p = {
    name: c.name,
    value: c.value || "",
    domain: c.domain,
    path: c.path || "/",
    httpOnly: !!c.httpOnly,
    secure: c.secure !== false,
  };
  const exp = c.expirationDate ?? c.expires;
  if (!c.session && exp) p.expires = Math.floor(Number(exp));
  const ss = SAME_SITE_MAP[c.sameSite] || "Lax";
  if (ss !== "Lax") p.sameSite = ss;
  return p;
}

/**
 * Load cookies từ file JSON (format export từ browser extension hoặc từ saveCookies).
 * @param {string} filePath - Đường dẫn file (tuyệt đối hoặc tương đối project root)
 * @returns {Array<{ name, value, domain?, path?, expires?, httpOnly?, secure?, sameSite? }>}
 */
function loadCookiesFromFile(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(resolved, "utf8");
  const data = JSON.parse(raw);
  const list = data.cookies || [];
  return list.filter(ADOBE_DOMAIN).map(normalizeCookie);
}

/**
 * Thử load cookies từ file; trả về mảng rỗng nếu file không tồn tại hoặc lỗi.
 */
function tryLoadCookiesFromFile(filePath) {
  try {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) return [];
    const list = loadCookiesFromFile(filePath);
    return Array.isArray(list) && list.length > 0 ? list : [];
  } catch (_) {
    return [];
  }
}

/**
 * Chuẩn hóa cookies từ object (vd. alert_config trong DB: { cookies: [], savedAt? }).
 * Trả về mảng dạng Puppeteer setCookie (cùng format loadCookiesFromFile).
 */
function getCookiesFromObject(obj) {
  if (!obj || typeof obj !== "object") return [];
  const list = obj.cookies || [];
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.filter(ADOBE_DOMAIN).map(normalizeCookie);
}

/**
 * Lấy danh sách cookies từ page (định dạng lưu DB/file: cookies + savedAt).
 * Thu thập từ www.adobe.com, auth.services.adobe.com và URL hiện tại (Admin Console, v.v.)
 * để có đủ session cookie sau khi login thành công.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<{ cookies: Array, savedAt: string }>}
 */
async function getCookiesFromPage(page) {
  const urls = ["https://www.adobe.com", "https://auth.services.adobe.com"];
  let all = [];
  for (const u of urls) {
    const c = await page.cookies(u).catch(() => []);
    all = all.concat(c);
  }
  // Sau khi vào Admin Console, trang có thể ở experience.adobe.com / adminconsole.adobe.com;
  // lấy thêm cookie từ URL hiện tại để có session cho lần login bằng cookie sau.
  try {
    const currentUrl = page.url();
    if (currentUrl && currentUrl.includes("adobe.com")) {
      const origin = new URL(currentUrl).origin;
      if (!urls.includes(origin)) {
        const c = await page.cookies(origin).catch(() => []);
        all = all.concat(c);
      }
    }
  } catch (_) {}
  if (all.length === 0) all = await page.cookies().catch(() => []);
  const seen = new Set();
  const list = all
    .filter(
      (c) =>
        ADOBE_DOMAIN(c) &&
        !seen.has(`${c.domain}:${c.name}`) &&
        (seen.add(`${c.domain}:${c.name}`), true)
    )
    .map((c) => ({
      name: c.name,
      value: c.value || "",
      domain: c.domain,
      path: c.path || "/",
      httpOnly: !!c.httpOnly,
      secure: c.secure !== false,
      sameSite: c.sameSite || "Lax",
      expirationDate: c.expires ? Math.floor(Number(c.expires)) : undefined,
      session: !c.expires,
    }));
  return { cookies: list, savedAt: new Date().toISOString() };
}

module.exports = {
  loadCookiesFromFile,
  tryLoadCookiesFromFile,
  getCookiesFromObject,
  getCookiesFromPage,
};

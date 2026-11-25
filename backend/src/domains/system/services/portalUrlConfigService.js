const systemConfigService = require("./systemConfigService");

const PORTAL_URLS_CONFIG_KEY = "OTP_PORTAL_URLS";
const PORTAL_BASE_PATH = "/system";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  "assets",
  "scripts",
  "seasonal",
  "api",
  "index",
  "index.html",
  "favicon",
  "favicon.ico",
  "robots.txt",
]);

const DEFAULT_PORTAL_ROUTE_DEFINITIONS = [
  {
    key: "adobe_account",
    slug: "adobe-account",
    tab: "adobe",
    subTab: 1,
    group: "adobe",
    label: "Adobe — Lấy và kiểm tra tài khoản",
    description: "Tra cứu thông tin tài khoản, mật khẩu và tình trạng gói Adobe",
  },
  {
    key: "adobe_otp",
    slug: "adobe-otp",
    tab: "adobe",
    subTab: 2,
    group: "adobe",
    label: "Adobe — Nhận OTP",
    description: "Lấy mã xác minh OTP 6 số đăng nhập Adobe Creative Cloud",
  },
  {
    key: "netflix_household",
    slug: "netflix-household",
    tab: "netflix",
    subTab: 0,
    group: "netflix",
    label: "Netflix — Hộ Gia Đình",
    description: "Lấy liên kết xác minh Hộ Gia Đình (Household) cho Netflix",
  },
  {
    key: "netflix_tv",
    slug: "netflix-tv",
    tab: "netflix",
    subTab: 1,
    group: "netflix",
    label: "Netflix — Mã TV 6 Số",
    description: "Nhận mã xác minh 6 số đăng nhập Smart TV Netflix",
  },
  {
    key: "netflix_otp",
    slug: "netflix-otp",
    tab: "netflix",
    subTab: 2,
    group: "netflix",
    label: "Netflix — OTP Đăng Nhập",
    description: "Nhận mã OTP đăng nhập tài khoản Netflix qua email",
  },
  {
    key: "gpt_account",
    slug: "gpt-account",
    tab: "gpt",
    subTab: 0,
    group: "gpt",
    label: "GPT — Lấy Tài Khoản",
    description: "Tra cứu tài khoản OpenAI ChatGPT theo đơn hàng hoặc email",
  },
  {
    key: "gpt_otp",
    slug: "gpt-otp",
    tab: "gpt",
    subTab: 1,
    group: "gpt",
    label: "GPT — Nhận OTP",
    description: "Nhận mã xác minh đăng nhập OpenAI ChatGPT",
  },
  {
    key: "two_factor",
    slug: "2fa",
    tab: "two_factor",
    subTab: 0,
    group: "two_factor",
    label: "2FA — Tạo mã TOTP",
    description: "Sinh mã xác thực 2 lớp 6 số từ khóa bí mật Base32",
  },
];

const ROUTE_KEYS = DEFAULT_PORTAL_ROUTE_DEFINITIONS.map((item) => item.key);
const ROUTE_KEY_SET = new Set(ROUTE_KEYS);

function buildDefaultPortalUrlsConfig() {
  const routes = {};
  for (const item of DEFAULT_PORTAL_ROUTE_DEFINITIONS) {
    routes[item.key] = { ...item };
  }
  return {
    basePath: PORTAL_BASE_PATH,
    defaultRouteKey: "adobe_otp",
    routes,
  };
}

function normalizeSlug(rawSlug) {
  return String(rawSlug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function validateSlug(slug, routeLabel) {
  if (!slug) {
    throw new Error(`Slug URL của "${routeLabel}" không được để trống.`);
  }
  if (slug.length > 64) {
    throw new Error(`Slug URL của "${routeLabel}" không được vượt quá 64 ký tự.`);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Slug URL "${slug}" của "${routeLabel}" chỉ được gồm chữ thường không dấu (a-z), số (0-9) và dấu gạch ngang (-).`
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`Slug URL "${slug}" trùng với đường dẫn hệ thống, vui lòng chọn tên khác.`);
  }
}

/**
 * Hợp nhất dữ liệu đọc từ DB (có thể cũ hoặc thiếu key) với cấu hình mặc định.
 */
function mergePortalUrlConfig(rawConfig) {
  const defaults = buildDefaultPortalUrlsConfig();
  if (!rawConfig) return defaults;

  let parsed = rawConfig;
  if (typeof rawConfig === "string") {
    try {
      parsed = JSON.parse(rawConfig);
    } catch {
      return defaults;
    }
  }
  if (!parsed || typeof parsed !== "object") return defaults;

  const incomingRoutes = parsed.routes && typeof parsed.routes === "object" ? parsed.routes : {};
  const mergedRoutes = {};
  const usedSlugs = new Set();

  for (const def of DEFAULT_PORTAL_ROUTE_DEFINITIONS) {
    const candidate = incomingRoutes[def.key];
    const candidateSlug = normalizeSlug(
      typeof candidate === "string" ? candidate : candidate?.slug
    );
    const isValidCandidate =
      candidateSlug &&
      candidateSlug.length <= 64 &&
      SLUG_PATTERN.test(candidateSlug) &&
      !RESERVED_SLUGS.has(candidateSlug) &&
      !usedSlugs.has(candidateSlug);

    const finalSlug = isValidCandidate ? candidateSlug : def.slug;
    usedSlugs.add(finalSlug);
    mergedRoutes[def.key] = {
      ...def,
      slug: finalSlug,
    };
  }

  const defaultRouteKey = ROUTE_KEY_SET.has(parsed.defaultRouteKey)
    ? parsed.defaultRouteKey
    : defaults.defaultRouteKey;

  return {
    basePath: PORTAL_BASE_PATH,
    defaultRouteKey,
    routes: mergedRoutes,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    updatedBy: typeof parsed.updatedBy === "string" ? parsed.updatedBy : undefined,
  };
}

/**
 * Kiểm tra chặt chẽ payload admin gửi lên trước khi lưu DB.
 */
function normalizeAndValidatePortalUrls(payload, updatedBy = "ADMIN") {
  if (!payload || typeof payload !== "object") {
    throw new Error("Dữ liệu cấu hình URL không hợp lệ.");
  }

  const incomingRoutes = payload.routes;
  if (!incomingRoutes || typeof incomingRoutes !== "object") {
    throw new Error("Thiếu danh sách đường dẫn routes.");
  }

  const defaultRouteKey = String(payload.defaultRouteKey || "adobe_otp").trim();
  if (!ROUTE_KEY_SET.has(defaultRouteKey)) {
    throw new Error("Trang mặc định không hợp lệ.");
  }

  const seenSlugs = new Map();
  const routes = {};

  for (const def of DEFAULT_PORTAL_ROUTE_DEFINITIONS) {
    const rawEntry = incomingRoutes[def.key];
    const rawSlug = typeof rawEntry === "string" ? rawEntry : rawEntry?.slug;
    const slug = normalizeSlug(rawSlug !== undefined ? rawSlug : def.slug);

    validateSlug(slug, def.label);

    if (seenSlugs.has(slug)) {
      throw new Error(
        `Slug URL "/${slug}" bị trùng giữa "${seenSlugs.get(slug)}" và "${def.label}".`
      );
    }
    seenSlugs.set(slug, def.label);

    routes[def.key] = {
      ...def,
      slug,
    };
  }

  return {
    basePath: PORTAL_BASE_PATH,
    defaultRouteKey,
    routes,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

function getPortalUrlConfig() {
  const raw = systemConfigService.get(PORTAL_URLS_CONFIG_KEY);
  return mergePortalUrlConfig(raw);
}

async function savePortalUrlConfig(payload, updatedBy = "ADMIN") {
  const normalized = normalizeAndValidatePortalUrls(payload, updatedBy);
  await systemConfigService.set(
    PORTAL_URLS_CONFIG_KEY,
    JSON.stringify(normalized),
    updatedBy
  );
  return normalized;
}

async function resetPortalUrlConfig(updatedBy = "ADMIN") {
  const defaults = buildDefaultPortalUrlsConfig();
  return savePortalUrlConfig(defaults, updatedBy);
}

module.exports = {
  PORTAL_URLS_CONFIG_KEY,
  PORTAL_BASE_PATH,
  DEFAULT_PORTAL_ROUTE_DEFINITIONS,
  buildDefaultPortalUrlsConfig,
  normalizeSlug,
  mergePortalUrlConfig,
  normalizeAndValidatePortalUrls,
  getPortalUrlConfig,
  savePortalUrlConfig,
  resetPortalUrlConfig,
};

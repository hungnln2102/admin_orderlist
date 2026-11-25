const test = require("node:test");
const assert = require("node:assert/strict");

const systemConfigServicePath = require.resolve("../../src/domains/system/services/systemConfigService");
const originalSystemConfigService = require.cache[systemConfigServicePath];
const memoryStore = new Map();

require.cache[systemConfigServicePath] = {
  id: systemConfigServicePath,
  filename: systemConfigServicePath,
  loaded: true,
  exports: {
    get: (key, fallback = null) => (memoryStore.has(key) ? memoryStore.get(key) : fallback),
    set: async (key, value) => {
      memoryStore.set(key, JSON.parse(value));
      return { config_key: key, config_value: value };
    },
  },
};

test.after(() => {
  if (originalSystemConfigService) require.cache[systemConfigServicePath] = originalSystemConfigService;
  else delete require.cache[systemConfigServicePath];
});

const {
  PORTAL_BASE_PATH,
  buildDefaultPortalUrlsConfig,
  mergePortalUrlConfig,
  normalizeAndValidatePortalUrls,
  getPortalUrlConfig,
  savePortalUrlConfig,
  resetPortalUrlConfig,
} = require("../../src/domains/system/services/portalUrlConfigService");

test("normalizeAndValidatePortalUrls chuẩn hóa slug hợp lệ và giữ nguyên basePath /system", () => {
  const defaults = buildDefaultPortalUrlsConfig();
  const result = normalizeAndValidatePortalUrls(
    {
      defaultRouteKey: "adobe_account",
      routes: {
        ...defaults.routes,
        adobe_account: { slug: " /Kiem-Tra-Adobe/ " },
        adobe_otp: { slug: "nhan-otp-adobe" },
      },
    },
    "admin_test"
  );

  assert.equal(result.basePath, PORTAL_BASE_PATH);
  assert.equal(result.defaultRouteKey, "adobe_account");
  assert.equal(result.routes.adobe_account.slug, "kiem-tra-adobe");
  assert.equal(result.routes.adobe_otp.slug, "nhan-otp-adobe");
  assert.equal(result.updatedBy, "admin_test");
  assert.ok(result.updatedAt);
});

test("normalizeAndValidatePortalUrls chặn slug trùng lặp giữa hai tab", () => {
  const defaults = buildDefaultPortalUrlsConfig();
  assert.throws(
    () =>
      normalizeAndValidatePortalUrls({
        defaultRouteKey: "adobe_otp",
        routes: {
          ...defaults.routes,
          adobe_account: { slug: "adobe-otp" },
          adobe_otp: { slug: "adobe-otp" },
        },
      }),
    /bị trùng/i
  );
});

test("normalizeAndValidatePortalUrls chặn slug hệ thống dành riêng và ký tự không hợp lệ", () => {
  const defaults = buildDefaultPortalUrlsConfig();
  assert.throws(
    () =>
      normalizeAndValidatePortalUrls({
        defaultRouteKey: "adobe_otp",
        routes: {
          ...defaults.routes,
          adobe_account: { slug: "assets" },
        },
      }),
    /đường dẫn hệ thống/i
  );

  assert.throws(
    () =>
      normalizeAndValidatePortalUrls({
        defaultRouteKey: "adobe_otp",
        routes: {
          ...defaults.routes,
          adobe_account: { slug: "adobe/account" },
        },
      }),
    /chỉ được gồm chữ thường/i
  );
});

test("mergePortalUrlConfig hợp nhất an toàn cấu hình thiếu key hoặc JSON hỏng với mặc định", () => {
  const fromInvalid = mergePortalUrlConfig("{bad-json");
  assert.equal(fromInvalid.defaultRouteKey, "adobe_otp");
  assert.equal(fromInvalid.routes.adobe_account.slug, "adobe-account");

  const fromPartial = mergePortalUrlConfig({
    defaultRouteKey: "two_factor",
    routes: {
      adobe_account: { slug: "tai-khoan-adobe" },
    },
  });
  assert.equal(fromPartial.defaultRouteKey, "two_factor");
  assert.equal(fromPartial.routes.adobe_account.slug, "tai-khoan-adobe");
  assert.equal(fromPartial.routes.netflix_household.slug, "netflix-household");
});

test("savePortalUrlConfig, getPortalUrlConfig và resetPortalUrlConfig hoạt động đồng bộ", async () => {
  const defaults = buildDefaultPortalUrlsConfig();
  await savePortalUrlConfig(
    {
      defaultRouteKey: "adobe_account",
      routes: {
        ...defaults.routes,
        adobe_account: { slug: "kiem-tra-adobe" },
      },
    },
    "tester"
  );

  const loaded = getPortalUrlConfig();
  assert.equal(loaded.defaultRouteKey, "adobe_account");
  assert.equal(loaded.routes.adobe_account.slug, "kiem-tra-adobe");

  const reset = await resetPortalUrlConfig("tester");
  assert.equal(reset.defaultRouteKey, "adobe_otp");
  assert.equal(reset.routes.adobe_account.slug, "adobe-account");
});

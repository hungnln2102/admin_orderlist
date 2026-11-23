require("module-alias/register");

const test = require("node:test");
const assert = require("node:assert/strict");
const dns = require("node:dns");

const productApiServicePath = require.resolve("../../src/domains/system/services/productApiService");
const originalProductApiService = require.cache[productApiServicePath];
require.cache[productApiServicePath] = {
  id: productApiServicePath,
  filename: productApiServicePath,
  loaded: true,
  exports: { findRoutingProviderForInput: async () => null },
};

test.after(() => {
  if (originalProductApiService) require.cache[productApiServicePath] = originalProductApiService;
  else delete require.cache[productApiServicePath];
});
const { executeOtpConfig, probeOtpForEmail } = require("../../src/domains/system/services/otpProviderService");
const { listProviderCatalog } = require("../../src/domains/system/providers/registry");

async function withMockedExternalFetch(responder, run) {
  const originalLookup = dns.promises.lookup;
  const originalFetch = global.fetch;
  dns.promises.lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  global.fetch = responder;
  try {
    await run();
  } finally {
    dns.promises.lookup = originalLookup;
    global.fetch = originalFetch;
  }
}

test("GENERIC_HTTP configurations are rejected because providers own their endpoints", async () => {
  await assert.rejects(
    executeOtpConfig({ service_key: "custom_get", execution_mode: "GENERIC_HTTP" }, "user@example.com"),
    /Unsupported OTP execution mode 'GENERIC_HTTP'/
  );
});

test("VIVAROCKY_HTML preserves form transport for household, six-digit, and sign-in requests", { concurrency: false }, async () => {
  const calls = [];
  await withMockedExternalFetch(async (url, options) => {
    calls.push({ url: String(url), options });
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/x-www-form-urlencoded");

    if (String(url).endsWith("/household.php")) {
      return new Response('<b>Sent:</b> Sunday, October 25, 2026 4:12:17 AM (UTC+00:00) Monrovia, Reykjavik<br><a href="https://www.netflix.com/account/travel/verify?nftoken=abc&amp;messageGuid=xyz"><span>Nhận mã</span></a>', { status: 200 });
    }
    if (String(url).endsWith("/six_digit_login.php")) {
      return new Response('<div class="success-box">123456</div>', { status: 200 });
    }
    return new Response('Enter this code to sign in<table><tr><td>0586</td></tr></table>', { status: 200 });
  }, async () => {
    const household = await executeOtpConfig({
      service_key: "vivarocky_household",
      base_url: "https://vivarocky.example.test/household.php",
      execution_mode: "VIVAROCKY_HTML",
      auth_config: { operation: "household" },
    }, "user@example.com");
    const sixDigit = await executeOtpConfig({
      service_key: "vivarocky_six_digit",
      base_url: "https://vivarocky.example.test/six_digit_login.php",
      execution_mode: "VIVAROCKY_HTML",
      auth_config: { operation: "six_digit" },
    }, "user@example.com");
    const signIn = await executeOtpConfig({
      service_key: "vivarocky_signin",
      base_url: "https://vivarocky.example.test/signin_code.php",
      execution_mode: "VIVAROCKY_HTML",
      auth_config: { operation: "signin_code", access_code: "mvrk56" },
    }, "user@example.com");

    assert.equal(household.extra_fields.find((field) => field.key === "netflix_link")?.value, "https://www.netflix.com/account/travel/verify?nftoken=abc&messageGuid=xyz");
    assert.equal(household.extra_fields.find((field) => field.key === "sent_time")?.value, "11:12:17 25/10/2026 (UTC+7)");
    assert.equal(household.otp, null);
    assert.equal(household.extra_fields.some((field) => field.key === "otp"), false);
    assert.equal(sixDigit.otp, "123456");
    assert.equal(signIn.otp, "0586");
    assert.equal(sixDigit.extra_fields.some((field) => field.key === "netflix_link"), false);
    assert.equal(signIn.extra_fields.some((field) => field.key === "netflix_link"), false);
  });

  assert.equal(calls[0].options.body, "email=user%40example.com&user_email=user%40example.com");
  assert.equal(calls[1].options.body, "user_email=user%40example.com");
  assert.equal(calls[2].options.body, "user_email=user%40example.com&access_code=mvrk56");
});
test("MAILBOX_REST executes the passed DB config instead of loading a named provider", { concurrency: false }, async () => {
  await withMockedExternalFetch(async (url) => {
    assert.equal(String(url), "https://mailbox.example.test/api/email/example.com/user/?limit=10");
    return new Response(JSON.stringify({ emails: [{ id: "mail-1", subject: "Verification 112233" }] }), { status: 200 });
  }, async () => {
    const result = await executeOtpConfig({
      service_key: "custom_mailbox",
      base_url: "https://mailbox.example.test",
      execution_mode: "MAILBOX_REST",
      auth_config: {},
    }, "user@example.com");

    assert.equal(result.otp, "112233");
  });
});

test("FIX_ADES_STATUS posts email and returns the requested status fields", { concurrency: false }, async () => {
  await withMockedExternalFetch(async (url, options) => {
    assert.equal(String(url), "https://reseller.ado-besoft.com/api/user-status");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), { email: "user@example.com" });
    return new Response(JSON.stringify({
      found: true,
      email: "user@example.com",
      organization: { id: 646, name: "K12-Primrose School of Meadowbrook" },
      organizationStatus: { status: "active" },
      status: "active",
      teamChange: {
        previousName: "Evergreenlearningacademy",
        currentName: "K12-Primrose School of Meadowbrook",
        changedAt: "2026-11-09T14:50:57.658Z",
      },
    }), { status: 200 });
  }, async () => {
    const result = await probeOtpForEmail({ email: "USER@EXAMPLE.COM", serviceKey: "fix_ades_status" });
    assert.equal(result.found, true);
    assert.equal(result.otp, null);
    assert.equal(result.extra_fields.find((field) => field.key === "organization_id")?.value, "646");
    assert.equal(result.extra_fields.find((field) => field.key === "organization_name")?.value, "K12-Primrose School of Meadowbrook");
    assert.equal(result.extra_fields.find((field) => field.key === "organization_status")?.value, "active");
    assert.equal(result.extra_fields.find((field) => field.key === "status")?.value, "active");
    assert.equal(result.extra_fields.find((field) => field.key === "team_change_previous_name")?.value, "Evergreenlearningacademy");
    assert.equal(result.extra_fields.find((field) => field.key === "team_change_current_name")?.value, "K12-Primrose School of Meadowbrook");
    assert.equal(result.extra_fields.find((field) => field.key === "team_change_changed_at")?.value, "2026-11-09T14:50:57.658Z");
  });
});

test("dispatcher classifies inactive organizationStatus as CẦN CHUYỂN TEAM", { concurrency: false }, async (t) => {
  t.mock.method(require("../../src/domains/system/services/productApiService"), "findRoutingProviderForInput",
    async () => ({ provider_key: "fix_ades_status" }));
  const { dispatchSlotRequest } = require("../../src/domains/system/services/otpPortalDispatcher");
  await withMockedExternalFetch(async (url) => {
    assert.equal(String(url), "https://reseller.ado-besoft.com/api/user-status");
    return new Response(JSON.stringify({
      found: true,
      email: "inactive_user@example.com",
      organization: { id: 888, name: "Old Team Inc" },
      organizationStatus: { status: "inactive" },
      status: "active", // top-level status is active, but organizationStatus is inactive
    }), { status: 200 });
  }, async () => {
    const result = await dispatchSlotRequest({ slotKey: "adobe_check", input: "inactive_user@example.com" });
    assert.equal(result.success, true);
    assert.equal(result.data.status_type, "inactive");
    assert.equal(result.data.status, "CẦN CHUYỂN TEAM");
    assert.equal(result.data.organization, "Old Team Inc");
  });
});

test("switchOrgAdes and getSwitchOrgStatusAdes call upstream org-switch endpoints", { concurrency: false }, async () => {
  const { switchOrgAdes, getSwitchOrgStatusAdes } = require("../../src/domains/system/providers/fixAdesStatusProvider");
  const { providerConfig } = require("../../src/domains/system/providers/providerConfig");
  const config = providerConfig("fix_ades_status");

  await withMockedExternalFetch(async (url, options) => {
    if (String(url).endsWith("/org-switch")) {
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { email: "switch@example.com" });
      return new Response(JSON.stringify({ status: "waiting", position: 3, etaSeconds: 6 }), { status: 200 });
    }
    if (String(url).endsWith("/org-switch/status")) {
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { email: "switch@example.com" });
      return new Response(JSON.stringify({ status: "sending", position: 0, etaSeconds: 15, newOrgName: "New Team Ltd" }), { status: 200 });
    }
    throw new Error(`Unexpected url: ${url}`);
  }, async () => {
    const res1 = await switchOrgAdes("switch@example.com", { config });
    assert.equal(res1.status, "waiting");
    assert.equal(res1.position, 3);

    const res2 = await getSwitchOrgStatusAdes("switch@example.com", { config });
    assert.equal(res2.status, "sending");
    assert.equal(res2.newOrgName, "New Team Ltd");
  });
});

test("FIX_ADES_STATUS returns the upstream missing-subscription message", { concurrency: false }, async () => {
  await withMockedExternalFetch(async () => new Response(JSON.stringify({
    error: "No subscription found for this email",
    found: false,
  }), { status: 200 }), async () => {
    const result = await probeOtpForEmail({ email: "missing@example.com", serviceKey: "fix_ades_status" });
    assert.equal(result.found, false);
    assert.deepEqual(result.extra_fields, []);
    assert.equal(result.message, "No subscription found for this email");
  });
});

test("provider catalog and name seed keep Ades OTP and Fix-Ades status distinct", async () => {
  const migration = require("../../src/db/migrations/20261123000004_seed_provider_display_names");
  let seededNames;
  await migration.up({
    withSchema: () => ({
      table: () => ({
        insert: (row) => {
          seededNames = JSON.parse(row.config_value);
          return { onConflict: () => ({ ignore: async () => {} }) };
        },
      }),
    }),
  });
  const catalog = listProviderCatalog();
  assert.deepEqual(Object.keys(seededNames), catalog.map(({ key }) => key));
  assert.equal(seededNames.ades, "Ades-otp");
  assert.equal(seededNames.fix_ades_status, "Fix-Ades");
  assert.equal(catalog.find((provider) => provider.key === "ades")?.name, "ades");
  assert.equal(catalog.find((provider) => provider.key === "fix_ades_status")?.name, "fix_ades_status");
  assert.equal(catalog.find((provider) => provider.key === "vivarocky_signin")?.status, "READY");
});

test("INTERNAL_TOTP stays local and returns a normalized OTP result", async () => {
  const result = await executeOtpConfig({ execution_mode: "INTERNAL_TOTP", service_key: "totp" }, "JBSWY3DPEHPK3PXP");

  assert.match(result.otp, /^\d{6}$/);
  assert.ok(result.extra_fields.some((field) => field.key === "remaining_seconds"));
});

test("unsupported execution modes fail clearly", async () => {
  await assert.rejects(
    executeOtpConfig({ execution_mode: "UNKNOWN_MODE", service_key: "custom" }, "user@example.com"),
    /Unsupported OTP execution mode 'UNKNOWN_MODE' for service 'custom'/
  );
});

test("dispatcher uses the configured TOTP service without routing or echoing the secret", { concurrency: false }, async (t) => {
  const systemConfigService = require("../../src/domains/system/services/systemConfigService");
  const otpProviderService = require("../../src/domains/system/services/otpProviderService");
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
  const productApiService = require("../../src/domains/system/services/productApiService");
  const route = t.mock.method(productApiService, "findRoutingProviderForInput", async () => null);
  const originalGet = systemConfigService.get;
  const originalProbe = otpProviderService.probeOtpForEmail;
  const calls = [];

  systemConfigService.get = () => JSON.stringify([{
    slot_key: "two_factor_totp",
    name: "TOTP",
    enabled: true,
    assigned_services: ["totp"],
  }]);
  otpProviderService.probeOtpForEmail = async (payload) => {
    calls.push(payload);
    return { found: true, otp: "123456", extra_fields: [], message: "ok", duration_ms: 1 };
  };

  try {
    const result = await dispatcher.dispatchSlotRequest({
      slotKey: "two_factor_totp",
      input: "JBSWY3DPEHPK3PXP",
    });
    assert.deepEqual(calls, [{ email: "JBSWY3DPEHPK3PXP", serviceKey: "totp", requiredExecutionMode: "INTERNAL_TOTP" }]);
    assert.equal(route.mock.callCount(), 0);
    assert.equal(result.input, null);
    assert.equal(result.service_used, "totp");
    assert.equal(result.otp, "123456");
  } finally {
    systemConfigService.get = originalGet;
    otpProviderService.probeOtpForEmail = originalProbe;
  }
});

test("provider rejects a TOTP secret when the selected service is external", async () => {
  await assert.rejects(
    require("../../src/domains/system/services/otpProviderService").probeOtpForEmail({
      email: "JBSWY3DPEHPK3PXP",
      serviceKey: "yuna_2fa",
      requiredExecutionMode: "INTERNAL_TOTP",
    }),
    /OTP_PROVIDER_EXECUTION_MODE_MISMATCH/
  );
});

test("dispatcher rejects slots without a configured service chain", { concurrency: false }, async () => {
  const systemConfigService = require("../../src/domains/system/services/systemConfigService");
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
  const originalGet = systemConfigService.get;
  systemConfigService.get = () => JSON.stringify([{
    slot_key: "unconfigured",
    name: "Unconfigured",
    enabled: true,
    assigned_services: [],
  }]);

  try {
    await assert.rejects(
      dispatcher.dispatchSlotRequest({ slotKey: "unconfigured", input: "user@example.com" }),
      /Không xác định được provider khớp cấu hình/
    );
  } finally {
    systemConfigService.get = originalGet;
  }
});

test("dispatcher requires a matching rule even when a legacy default or sole provider exists", { concurrency: false }, async (t) => {
  const systemConfigService = require("../../src/domains/system/services/systemConfigService");
  const otpProviderService = require("../../src/domains/system/services/otpProviderService");
  const productApiService = require("../../src/domains/system/services/productApiService");
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
  const slot = { slot_key: "test_otp", name: "OTP", assigned_services: ["first", "second"] };
  t.mock.method(systemConfigService, "get", () => [slot]);
  const routing = t.mock.method(productApiService, "findRoutingProviderForInput", async () => null);
  const probe = t.mock.method(otpProviderService, "probeOtpForEmail", async () => ({ found: false }));
  const request = { slotKey: slot.slot_key, input: "user@example.test" };

  await assert.rejects(dispatcher.dispatchSlotRequest(request), /Không xác định được provider/);
  assert.equal(probe.mock.callCount(), 0);
  slot.default_service_key = "second";
  slot.assigned_services = ["second"];
  await assert.rejects(dispatcher.dispatchSlotRequest(request), /Không xác định được provider/);
  assert.equal(probe.mock.callCount(), 0);

  routing.mock.mockImplementation(async () => ({ provider_key: "first" }));
  probe.mock.mockImplementation(async () => { throw new Error("fixture provider error"); });
  const matched = await dispatcher.dispatchSlotRequest(request);
  assert.deepEqual(matched.attempted_services, ["first"]);
  assert.deepEqual(probe.mock.calls.map(({ arguments: [payload] }) => payload.serviceKey), ["first"]);
});


test("probe requires an explicit service key and does not fall back to HDSD", async () => {
  await assert.rejects(
    probeOtpForEmail({ email: "user@example.com" }),
    /OTP_PROVIDER_NOT_FOUND: service_key is required/
  );
});

test("public OTP router exposes slot reads only", () => {
  const router = require("../../src/domains/system/routes/publicOtpRoutes");
  const routes = router.stack
    .map((layer) => layer.route)
    .filter((route) => [route?.path].flat().some((path) => path?.startsWith("/otp-portal-slots")));

  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, "/otp-portal-slots");
  assert.deepEqual(Object.keys(routes[0].methods), ["get"]);
});


test("dispatcher uses hard-coded slots when the portal slot config is missing and rejects malformed overrides", { concurrency: false }, () => {
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
  const systemConfigService = require("../../src/domains/system/services/systemConfigService");
  const originalGet = systemConfigService.get;
  systemConfigService.get = () => null;
  try {
    const slots = dispatcher.getActiveSlots();
    assert.ok(slots.some((slot) => slot.slot_key === "adobe_otp"));
    assert.ok(slots.every((slot) => !slot.assigned_services.includes("otp_hdsd") && !slot.assigned_services.includes("tmail_webmail")));
    systemConfigService.get = () => "not-json";
    assert.throws(() => dispatcher.getActiveSlots(), /OTP_PORTAL_SLOTS_CONFIG_INVALID/);
  } finally {
    systemConfigService.get = originalGet;
  }
});

test("PACKAGE_WAREHOUSE_ACCOUNT cấp và trả thông tin tài khoản từ mã key", { concurrency: false }, async () => {
  const activationKeyService = require("../../src/domains/products/services/activationKeyService");
  const originalActivate = activationKeyService.activateKeyWithTransaction;
  activationKeyService.activateKeyWithTransaction = async ({ keyCode }) => {
    assert.equal(keyCode, "GPT-ABC123-DEF456");
    return {
      success: true,
      account: "shared@example.com",
      password: "secret-password",
      backup_email: "backup@example.com",
      expired_at: "2026-12-31",
    };
  };

  try {
    const result = await probeOtpForEmail({
      email: "GPT-ABC123-DEF456",
      serviceKey: "package_warehouse",
    });
    assert.equal(result.found, true);
    assert.equal(result.service_key, "package_warehouse");
    assert.equal(result.extra_fields.find((field) => field.key === "account_username")?.value, "shared@example.com");
    assert.equal(result.extra_fields.find((field) => field.key === "password")?.value, "secret-password");
  } finally {
    activationKeyService.activateKeyWithTransaction = originalActivate;
  }
});
test("dispatcher trả dữ liệu tài khoản từ provider Kho Gói Sản Phẩm", { concurrency: false }, async (t) => {
  t.mock.method(require("../../src/domains/system/services/productApiService"), "findRoutingProviderForInput",
    async () => ({ provider_key: "package_warehouse" }));
  const systemConfigService = require("../../src/domains/system/services/systemConfigService");
  const otpProviderService = require("../../src/domains/system/services/otpProviderService");
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
  const originalGet = systemConfigService.get;
  const originalProbe = otpProviderService.probeOtpForEmail;
  systemConfigService.get = () => JSON.stringify([{
    slot_key: "gpt_account",
    name: "Tra cứu tài khoản",
    enabled: true,
    assigned_services: ["package_warehouse"],
  }]);
  otpProviderService.probeOtpForEmail = async () => ({
    found: true,
    extra_fields: [
      { key: "account_username", value: "shared@example.com" },
      { key: "password", value: "secret-password" },
      { key: "expires_at", value: "2026-12-31" },
    ],
    raw_data: { status: "ACTIVE" },
    message: "Đã cấp tài khoản.",
  });

  try {
    const result = await dispatcher.dispatchSlotRequest({
      slotKey: "gpt_account",
      input: "GPT-ABC123-DEF456",
    });
    assert.equal(result.service_used, "package_warehouse");
    assert.equal(result.data.account, "shared@example.com");
    assert.equal(result.data.password, "secret-password");
  } finally {
    systemConfigService.get = originalGet;
    otpProviderService.probeOtpForEmail = originalProbe;
  }
});

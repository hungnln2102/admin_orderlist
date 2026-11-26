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

test("Yuna Check uses account_user and strips vendor credentials and OTP fields", async () => {
  const { providerConfig } = require("../../src/domains/system/providers/providerConfig");
  const { fetchYunaAccountOrder } = require("../../src/domains/system/providers/yuna2faProvider");
  const key = "JBSWY3DPEHPK3PXP";
  const config = { ...providerConfig("yuna_check"), service_key: "test_yuna_check", auth_config: { defaultToken: "fixture" } };
  await withMockedExternalFetch(async (_url, options) => {
    if (options.method === "GET") return new Response('<meta name="api-token" content="fixture">');
    assert.equal(options.body, new URLSearchParams({ action: "get_order", order_code: key }).toString());
    return Response.json({ success: true, items: [{
      name: "Adobe (display@example.test)",
      account_user: " user@example.test ",
      account_pass: "fixture-password",
      code: "654321",
      report_status: "pending",
    }] });
  }, async () => {
    const result = await executeOtpConfig(config, key);
    assert.equal(result.otp, null);
    assert.doesNotMatch(JSON.stringify(result), /fixture-password|654321/);
    assert.equal(result.extra_fields.find((field) => field.key === "account_email")?.value, "user@example.test");
    assert.deepEqual(result.raw_data.items, [{
      name: "Adobe (display@example.test)",
      account_user: "user@example.test",
      group: undefined,
      expires_at_str: undefined,
      report_status: "pending",
    }]);
    const recovery = await fetchYunaAccountOrder(key, { config, includePassword: true });
    assert.equal(recovery.account_password, "fixture-password");
    assert.deepEqual(recovery.raw_data, result.raw_data);
    assert.deepEqual(recovery.extra_fields, result.extra_fields);
  });
});

test("Yuna Check does not use the display name when account_user is missing", async () => {
  const { providerConfig } = require("../../src/domains/system/providers/providerConfig");
  const config = { ...providerConfig("yuna_check"), service_key: "test_yuna_check_missing_account" };
  await withMockedExternalFetch(async (_url, options) => {
    if (options.method === "GET") return new Response('<meta name="api-token" content="fixture">');
    return Response.json({ success: true, items: [{ name: "display@example.test" }] });
  }, async () => {
    const result = await executeOtpConfig(config, "fixture-order");
    assert.equal(result.extra_fields.some((field) => field.key === "account_email"), false);
  });
});

test("Yuna report sends the verified vendor item once and confirms pending on subsequent lookup", async () => {
  const { providerConfig } = require("../../src/domains/system/providers/providerConfig");
  const { fetchYunaAccountOrder, parseYunaReportReason, reportYunaAccountOrder } = require("../../src/domains/system/providers/yuna2faProvider");
  const config = { ...providerConfig("yuna_check"), service_key: "test_yuna_report" };
  const order = "fixture-order";
  const reason = parseYunaReportReason("other", "  Fixture description  ");
  assert.equal(parseYunaReportReason("other", " "), null);
  assert.equal(parseYunaReportReason("other", "a".repeat(401)), null);
  assert.equal(parseYunaReportReason("unexpected"), null);
  let submissions = 0;
  await withMockedExternalFetch(async (url, options) => {
    if (options.method === "GET") return new Response('<meta name="api-token" content="fixture">');
    assert.equal(String(url), "https://mmo.yunagrp.com/2fa/");
    if (options.body instanceof FormData) {
      submissions += 1;
      assert.equal(options.headers["Content-Type"], undefined);
      assert.deepEqual(Object.fromEntries(options.body), {
        action: "report_error",
        order_code: order,
        group: "Adobe Account",
        name: "user@example.test|fixture-password",
        item_index: "0",
        reason_code: "other",
        reason_detail: "Fixture description",
        client_public_ip: "",
      });
      return Response.json({ success: true, adobe_auto_renew: true, cooldown_remaining: 180 });
    }
    return Response.json({ success: true, items: [{
      account_user: "user@example.test",
      account_pass: "fixture-password",
      name: "user@example.test|fixture-password",
      group: "Adobe Account",
      item_index: 0,
      report_status: submissions ? "pending" : "none",
    }] });
  }, async () => {
    const submit = () => reportYunaAccountOrder(order, { config, reason });
    assert.deepEqual(await Promise.all([submit(), submit()]), ["pending", "pending"]);
    assert.equal(await submit(), "pending");
    assert.equal(submissions, 1);
    const lookup = await fetchYunaAccountOrder(order, { config });
    assert.equal(lookup.raw_data.items[0].report_status, "pending");
    assert.doesNotMatch(JSON.stringify(lookup), /fixture-password/);
  });
});

test("Yuna report verifies status after a lost response and rejects failed lookups", async () => {
  const { providerConfig } = require("../../src/domains/system/providers/providerConfig");
  const { fetchYunaAccountOrder, parseYunaReportReason, reportYunaAccountOrder } = require("../../src/domains/system/providers/yuna2faProvider");
  const config = { ...providerConfig("yuna_check"), service_key: "test_yuna_lost_report_response" };
  const reason = parseYunaReportReason("expired");
  let submissions = 0;
  await withMockedExternalFetch(async (_url, options) => {
    if (options.method === "GET") return new Response('<meta name="api-token" content="fixture">');
    if (options.body instanceof FormData) {
      submissions += 1;
      throw new Error("Simulated lost response");
    }
    const query = new URLSearchParams(options.body);
    return Response.json({ success: query.get("order_code") === "valid-order", items: [{
      account_user: "user@example.test",
      name: "fixture name",
      group: "Adobe Account",
      item_index: 0,
      report_status: submissions ? "pending" : "none",
    }] });
  }, async () => {
    assert.equal(await reportYunaAccountOrder("valid-order", { config, reason }), "pending");
    assert.equal(await reportYunaAccountOrder("valid-order", { config, reason }), "pending");
    assert.ok((await fetchYunaAccountOrder("invalid-order", { config })).error);
    await assert.rejects(reportYunaAccountOrder("invalid-order", { config, reason }));
    assert.equal(submissions, 1);
  });
});

test("Yuna OTP reads its mailbox API using the account email", async () => {
  await withMockedExternalFetch(async (url, options) => {
    if (options.method === "GET") return Response.json({ success: true, rules: [] });
    assert.ok(String(url).endsWith("/api-nnm.php"));
    assert.match(String(options.body), /user(%40|@)example\.test/);
    return Response.json({ status: true, data: { latest: { code: "654321" } } });
  }, async () => {
    const result = await probeOtpForEmail({ email: "user@example.test", serviceKey: "yuna_otp" });
    assert.equal(result.otp, "654321");
  });
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

test("Fix-Ades distinguishes a confirmed missing subscription from HTTP failures", async () => {
  const { fetchFixAdesStatus } = require("../../src/domains/system/providers/fixAdesStatusProvider");
  const { providerConfig } = require("../../src/domains/system/providers/providerConfig");
  const config = providerConfig("fix_ades_status");
  for (const [status, body, missing] of [
    [404, { found: false, error: "No subscription found for this email" }, true],
    [404, { error: "Route not found" }, false],
    [503, { found: false }, false],
  ]) {
    await withMockedExternalFetch(async () => Response.json(body, { status }), async () => {
      const request = fetchFixAdesStatus("missing@example.test", { config });
      if (missing) assert.equal((await request).rawData.found, false);
      else await assert.rejects(request, new RegExp(`HTTP ${status}`));
    });
  }
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
  const renamed = { yuna_2fa: "yuna_check", yuna_mail: "yuna_otp" };
  assert.deepEqual(Object.keys(seededNames).map((key) => renamed[key] || key), catalog.map(({ key }) => key));
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
      serviceKey: "yuna_check",
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

test("public Adobe report and status-only lookup require proof and omit credentials", async (t) => {
  const routesPath = require.resolve("../../src/domains/system/routes/publicOtpRoutes");
  const sourceService = require("../../src/domains/system/services/adobeOrderSourceService");
  const provider = require("../../src/domains/system/providers/yuna2faProvider");
  const proof = { code: "portal-order", contact: "fixture-contact" };
  const resolve = t.mock.method(sourceService, "resolveAdobeRecoveryOrder", async ({ code, contact }) => (
    code === proof.code && contact === proof.contact
      ? { source: "yuna", providerKey: "yuna_check", providerInput: "vendor-order" }
      : { contactRequired: true }
  ));
  const fetchOrder = t.mock.method(provider, "fetchYunaAccountOrder", async () => ({
    raw_data: { items: [{ account_user: "user@example.test", report_status: "pending" }] },
    account_password: "fixture-password",
  }));
  const reportOrder = t.mock.method(provider, "reportYunaAccountOrder", async () => "pending");

  const originalRoutes = require.cache[routesPath];
  delete require.cache[routesPath];
  t.after(() => {
    if (originalRoutes) require.cache[routesPath] = originalRoutes;
    else delete require.cache[routesPath];
  });
  const router = require(routesPath);
  async function request(path, body) {
    const route = router.stack.find((layer) => [layer.route?.path].flat().includes(path)).route;
    const response = {
      statusCode: 200,
      set(name, value) { assert.equal(name, "Cache-Control"); assert.equal(value, "no-store"); },
      status(value) { this.statusCode = value; return this; },
      json(payload) { this.payload = payload; return this; },
    };
    await route.stack[0].handle({ path, body }, response);
    return { status: response.statusCode, payload: response.payload };
  }

  const checkPath = "/otp/adobe/recovery/check";
  const reportPath = "/otp/adobe/recovery/report";
  assert.equal((await request(reportPath, { ...proof, reason: "other" })).status, 400);
  assert.equal(resolve.mock.callCount(), 0);
  assert.equal((await request(checkPath, { code: proof.code, statusOnly: true })).status, 400);
  assert.equal((await request(reportPath, { code: proof.code, reason: "expired" })).status, 400);
  assert.equal(fetchOrder.mock.callCount(), 0);
  assert.equal(reportOrder.mock.callCount(), 0);

  assert.deepEqual((await request(checkPath, { ...proof, statusOnly: true })).payload, {
    success: true, source: "yuna", data: { report_status: "pending" },
  });
  assert.equal(fetchOrder.mock.calls[0].arguments[1].includePassword, false);
  assert.deepEqual((await request(reportPath, { ...proof, reason: "expired", account: "untrusted" })).payload, {
    success: true, report_status: "pending",
  });
  assert.equal(reportOrder.mock.calls[0].arguments[0], "vendor-order");
  assert.deepEqual(reportOrder.mock.calls[0].arguments[1].reason, { reason_code: "expired", reason_detail: "" });
});


test("Adobe recovery replaces only a verified missing subscription", async (t) => {
  const routesPath = require.resolve("../../src/domains/system/routes/publicOtpRoutes");
  const source = require("../../src/domains/system/services/adobeOrderSourceService");
  const activation = require("../../src/domains/products/services/activationKeyService");
  const provider = require("../../src/domains/system/providers/fixAdesStatusProvider");
  const email = "missing@example.test";
  const nextEmail = "replacement@example.test";
  const proof = { code: "fixture-code", contact: "fixture-contact" };
  let outcome = "inactive";
  let outOfStock = false;
  t.mock.method(source, "resolveAdobeRecoveryOrder", async () => null);
  const allocate = t.mock.method(activation, "activateKeyWithTransaction", async ({ recovery, rejectedSlot }) => {
    if (recovery === "check") {
      return { account: email, password: "old-password", slotId: 1, packageBacked: true, statusProviderKey: "fix_ades_status" };
    }
    assert.equal(recovery, "replace");
    assert.deepEqual(rejectedSlot, { id: 1, account: email });
    if (outOfStock) return { replacementRequired: true, outOfStock: true };
    return { account: nextEmail, password: "new-password", slotId: 2, packageBacked: true, replaced: true, statusProviderKey: "fix_ades_status" };
  });
  t.mock.method(provider, "fetchFixAdesStatus", async (account) => {
    if (account === nextEmail) return { rawData: { status: "active" } };
    if (outcome === "timeout") throw new Error("timeout");
    if (outcome === "missing") return { rawData: { found: false }, error: "No subscription" };
    return { rawData: { status: outcome } };
  });
  const originalRoutes = require.cache[routesPath];
  delete require.cache[routesPath];
  t.after(() => {
    if (originalRoutes) require.cache[routesPath] = originalRoutes;
    else delete require.cache[routesPath];
  });
  const router = require(routesPath);
  const path = "/otp/adobe/recovery/check";
  const route = router.stack.find((layer) => [].concat(layer.route?.path).includes(path)).route;
  async function request() {
    const response = {
      set() {},
      status(value) { assert.fail(`Unexpected HTTP ${value}`); },
      json(payload) { this.payload = payload; return this; },
    };
    await route.stack[0].handle({ path, body: { ...proof, email: "untrusted@example.test" } }, response);
    return response.payload;
  }
  assert.equal((await request()).data.status_type, "inactive");
  outcome = "timeout";
  assert.equal((await request()).data.status_type, "unknown");
  assert.deepEqual(allocate.mock.calls.map((call) => call.arguments[0].recovery), ["check", "check"]);
  outcome = "missing";
  const replaced = await request();
  assert.equal(replaced.replaced, true);
  assert.deepEqual(replaced.data, {
    account: nextEmail, password: "new-password", status_type: "active", status: "ĐANG HOẠT ĐỘNG", organization: undefined,
  });
  outOfStock = true;
  assert.deepEqual(await request(), { success: true, source: "ades", replacementRequired: true, outOfStock: true });
});

test("public Adobe switch status verifies the new team only after completion", async (t) => {
  const routesPath = require.resolve("../../src/domains/system/routes/publicOtpRoutes");
  const source = require("../../src/domains/system/services/adobeOrderSourceService");
  const provider = require("../../src/domains/system/providers/fixAdesStatusProvider");
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
  const email = "user@example.test";
  const newOrgName = "New Team";
  let status = "sending";
  let accountState = "inactive";
  let organization = "Old Team";
  t.mock.method(source, "resolveAdobeRecoveryOrder", async ({ code, contact }) => (
    code === "fixture-code" && contact === "fixture-contact"
      ? { source: "ades", providerKey: "fix_ades_status", account: email }
      : { contactRequired: true }
  ));
  const progress = t.mock.method(dispatcher, "getAdobeSwitchTeamStatus", async () => ({ status, newOrgName }));
  const check = t.mock.method(provider, "fetchFixAdesStatus", async () => ({
    rawData: { status: accountState, organization: { name: organization } },
  }));
  const originalRoutes = require.cache[routesPath];
  delete require.cache[routesPath];
  t.after(() => {
    if (originalRoutes) require.cache[routesPath] = originalRoutes;
    else delete require.cache[routesPath];
  });
  const router = require(routesPath);
  const route = router.stack.find((layer) => layer.route?.path === "/otp/adobe/switch-team/status").route;
  async function request(overrides) {
    const response = {
      statusCode: 200,
      set() {},
      status(value) { this.statusCode = value; return this; },
      json(payload) { this.payload = payload; return this; },
    };
    await route.stack[0].handle({
      body: { code: "fixture-code", contact: "fixture-contact", email, ...overrides },
    }, response);
    return response;
  }

  assert.equal((await request({ email: "other@example.test" })).statusCode, 400);
  assert.equal(progress.mock.callCount(), 0);
  assert.deepEqual((await request()).payload, { success: true, status: "sending", newOrgName });
  status = "failed";
  assert.equal((await request()).payload.status, "failed");
  assert.equal(check.mock.callCount(), 0);
  status = "completed";
  assert.equal((await request()).payload.status, "verifying");
  accountState = "active";
  assert.equal((await request()).payload.status, "verifying");
  organization = newOrgName;
  assert.deepEqual((await request()).payload, {
    success: true,
    status: "completed",
    newOrgName,
    accountResult: { account: email, status: "ĐANG HOẠT ĐỘNG", status_type: "active", organization },
  });
  assert.ok(check.mock.calls.every((call) => call.arguments[0] === email));
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

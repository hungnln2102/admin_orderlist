require("module-alias/register");

const test = require("node:test");
const assert = require("node:assert/strict");
const dns = require("node:dns");
const { executeOtpConfig } = require("../../src/domains/system/services/otpProviderService");

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

test("GENERIC_HTTP GET uses the configured endpoint and maps response fields", { concurrency: false }, async () => {
  await withMockedExternalFetch(async (url, options) => {
    assert.equal(String(url), "https://otp.example.test/read?email=user%40example.com");
    assert.equal(options.method, "GET");
    return new Response(JSON.stringify({ payload: { code: "123456", plan: "Business" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    const result = await executeOtpConfig({
      service_key: "custom_get",
      base_url: "https://otp.example.test",
      execution_mode: "GENERIC_HTTP",
      endpoints: { get_otp: "/read" },
      field_mapping: [
        { key: "otp", label: "OTP", path: "payload.code", is_primary: true },
        { key: "plan", label: "Plan", path: "payload.plan" },
      ],
    }, "user@example.com");

    assert.equal(result.otp, "123456");
    assert.deepEqual(result.extra_fields, [
      { key: "otp", label: "OTP", value: "123456", path: "payload.code" },
      { key: "plan", label: "Plan", value: "Business", path: "payload.plan" },
    ]);
  });
});

test("GENERIC_HTTP POST uses the configured request method", { concurrency: false }, async () => {
  await withMockedExternalFetch(async (url, options) => {
    assert.equal(String(url), "https://otp.example.test/read");
    assert.equal(options.method, "POST");
    assert.equal(options.body, JSON.stringify({ email: "user@example.com" }));
    return new Response(JSON.stringify({ otp: "654321" }), { status: 200 });
  }, async () => {
    const result = await executeOtpConfig({
      service_key: "custom_post",
      base_url: "https://otp.example.test",
      execution_mode: "GENERIC_HTTP",
      auth_config: { method: "POST" },
      endpoints: { get_otp: "/read" },
    }, "user@example.com");

    assert.equal(result.otp, "654321");
  });
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

test("dispatcher uses the configured TOTP service instead of a slot-key bypass", { concurrency: false }, async () => {
  const systemConfigService = require("../../src/domains/system/services/systemConfigService");
  const otpProviderService = require("../../src/domains/system/services/otpProviderService");
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
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
    assert.deepEqual(calls, [{ email: "JBSWY3DPEHPK3PXP", serviceKey: "totp" }]);
    assert.equal(result.service_used, "totp");
    assert.equal(result.otp, "123456");
  } finally {
    systemConfigService.get = originalGet;
    otpProviderService.probeOtpForEmail = originalProbe;
  }
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
      /OTP service chain is not configured/ 
    );
  } finally {
    systemConfigService.get = originalGet;
  }
});

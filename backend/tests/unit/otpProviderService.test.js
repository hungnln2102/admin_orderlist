require("module-alias/register");

const test = require("node:test");
const assert = require("node:assert/strict");
const dns = require("node:dns");
const { executeOtpConfig, probeOtpForEmail } = require("../../src/domains/system/services/otpProviderService");

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


test("probe requires an explicit service key and does not fall back to HDSD", async () => {
  await assert.rejects(
    probeOtpForEmail({ email: "user@example.com" }),
    /OTP_PROVIDER_NOT_FOUND: service_key is required/
  );
});

test("registering a new portal slot does not inject vendor fallback services", async () => {
  const systemConfigService = require("../../src/domains/system/services/systemConfigService");
  const dispatcher = require("../../src/domains/system/services/otpPortalDispatcher");
  const originalGet = systemConfigService.get;
  const originalSet = systemConfigService.set;
  let savedValue = null;
  systemConfigService.get = () => JSON.stringify([]);
  systemConfigService.set = async (_key, value) => {
    savedValue = JSON.parse(value);
  };

  try {
    const slots = await dispatcher.registerSlotsFromPortal([{
      slot_key: "new_unconfigured_slot",
      name: "New slot",
      enabled: true,
    }]);
    const created = slots.find((slot) => slot.slot_key === "new_unconfigured_slot");
    assert.deepEqual(created.assigned_services, []);
    assert.equal(created.primary_service_key, null);
    assert.ok(savedValue.some((slot) => slot.slot_key === "new_unconfigured_slot"));
  } finally {
    systemConfigService.get = originalGet;
    systemConfigService.set = originalSet;
  }
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

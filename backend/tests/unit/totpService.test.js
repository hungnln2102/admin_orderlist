const test = require("node:test");
const assert = require("node:assert/strict");
const { generateTotp, normalizeSecret } = require("../../src/domains/system/services/totpService");

const RFC6238_SHA1_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("generateTotp matches RFC 6238 SHA-1 vectors", () => {
  const vectors = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];

  for (const [timestampSeconds, expectedCode] of vectors) {
    const result = generateTotp(RFC6238_SHA1_SECRET, {
      timestamp: timestampSeconds * 1000,
      digits: 8,
    });
    assert.equal(result.code, expectedCode);
  }
});

test("generateTotp normalizes Google Authenticator-style Base32 separators", () => {
  const result = generateTotp("GEZD GNBV-GY3T_QOJQGEZD", { timestamp: 59_000 });

  assert.equal(normalizeSecret("GEZD GNBV-GY3T_QOJQGEZD"), "GEZDGNBVGY3TQOJQGEZD");
  assert.match(result.code, /^\d{6}$/);
  assert.equal(result.remainingSeconds, 1);
  assert.equal(result.expiresAt, "1970-01-01T00:01:00.000Z");
});

test("generateTotp rejects invalid Base32 secrets", () => {
  assert.throws(() => generateTotp("not-a-secret!"), /valid Base32/);
  assert.throws(() => generateTotp("A"), /decode to at least one byte/);
});
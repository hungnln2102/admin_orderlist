const test = require("node:test");
const assert = require("node:assert/strict");
const { requireAdmin } = require("../../src/domains/auth/middleware/requireAdmin");
const { assertSafeExternalUrl } = require("../../src/utils/safeExternalRequest");

function createResponse() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test("requireAdmin only accepts administrative roles", () => {
  let nextCalls = 0;
  const response = createResponse();

  requireAdmin({ session: { user: { role: "ADMIN" } } }, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);

  requireAdmin({ session: { user: { role: "viewer" } } }, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 403);
});

test("external request policy rejects non-HTTPS and private targets", async () => {
  await assert.rejects(() => assertSafeExternalUrl("http://example.com"));
  await assert.rejects(() => assertSafeExternalUrl("https://localhost"));
  await assert.rejects(() => assertSafeExternalUrl("https://127.0.0.1"));
  await assert.rejects(() => assertSafeExternalUrl("https://169.254.169.254"));
});

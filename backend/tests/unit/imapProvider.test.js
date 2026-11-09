const assert = require("node:assert/strict");
const test = require("node:test");

const { assertImapConfigured } = require("../../src/domains/system/providers/providerConfig");

test("IMAP provider fails closed when mailbox environment is incomplete", () => {
  assert.throws(
    () => assertImapConfigured({ host: "", user: "", password: "" }),
    /IMAP_PROVIDER_NOT_CONFIGURED/
  );
});
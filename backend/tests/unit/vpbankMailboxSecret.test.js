const crypto = require("crypto");
const test = require("node:test");
const assert = require("node:assert/strict");
const { decryptMailboxPassword, encryptMailboxPassword } = require("../../src/domains/finance/services/vpbankMailboxSecret");

test("VPBank mailbox secret encryption", async (t) => {
  const originalKey = process.env.VPBANK_MAILBOX_ENCRYPTION_KEY;
  process.env.VPBANK_MAILBOX_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");

  try {
    await t.test("encrypts at rest and decrypts only with the configured key", () => {
      const encrypted = encryptMailboxPassword("abcd efgh ijkl mnop");
      assert.notEqual(encrypted, "abcd efgh ijkl mnop");
      assert.equal(decryptMailboxPassword(encrypted), "abcd efgh ijkl mnop");
    });

    await t.test("fails closed when the encryption key is absent", () => {
      delete process.env.VPBANK_MAILBOX_ENCRYPTION_KEY;
      assert.throws(() => encryptMailboxPassword("abcd efgh ijkl mnop"), /VPBANK_MAILBOX_ENCRYPTION_KEY/);
    });
  } finally {
    if (originalKey === undefined) delete process.env.VPBANK_MAILBOX_ENCRYPTION_KEY;
    else process.env.VPBANK_MAILBOX_ENCRYPTION_KEY = originalKey;
  }
});

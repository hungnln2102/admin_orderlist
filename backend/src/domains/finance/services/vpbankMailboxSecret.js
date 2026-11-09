const crypto = require("crypto");

const KEY_ENV = "VPBANK_MAILBOX_ENCRYPTION_KEY";
const VERSION = "v1";

function getEncryptionKey() {
  const rawKey = String(process.env[KEY_ENV] || "").trim();
  if (!rawKey) {
    throw new Error(`${KEY_ENV} is required before storing or using a VPBank mailbox password.`);
  }

  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be a base64-encoded 32-byte key.`);
  }
  return key;
}

function encryptMailboxPassword(password) {
  const value = String(password || "").trim();
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

function decryptMailboxPassword(payload) {
  const [version, ivValue, authTagValue, encryptedValue] = String(payload || "").split(":");
  if (version !== VERSION || !ivValue || !authTagValue || !encryptedValue) {
    throw new Error("VPBank mailbox password ciphertext is invalid.");
  }

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
  } catch (error) {
    throw new Error(`Unable to decrypt VPBank mailbox password: ${error.message}`);
  }
}

module.exports = {
  KEY_ENV,
  decryptMailboxPassword,
  encryptMailboxPassword,
};

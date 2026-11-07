const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

function normalizeSecret(secret) {
  const normalized = String(secret || "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .replace(/=+$/, "")
    .toUpperCase();

  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) {
    throw new Error("TOTP secret must be valid Base32.");
  }

  return normalized;
}

function decodeBase32(secret) {
  let value = 0;
  let bits = 0;
  const bytes = [];

  for (const character of secret) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(character);
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  if (bytes.length === 0) {
    throw new Error("TOTP secret must decode to at least one byte.");
  }

  return Buffer.from(bytes);
}

function generateTotp(secret, { timestamp = Date.now(), digits = TOTP_DIGITS } = {}) {
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) {
    throw new Error("TOTP digits must be between 6 and 8.");
  }

  const normalizedSecret = normalizeSecret(secret);
  const counter = Math.floor(timestamp / (TOTP_PERIOD_SECONDS * 1000));
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new Error("TOTP timestamp is invalid.");
  }

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = crypto
    .createHmac("sha1", decodeBase32(normalizedSecret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode = (
    ((digest[offset] & 0x7f) << 24)
    | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8)
    | digest[offset + 3]
  );
  const code = String(binaryCode % (10 ** digits)).padStart(digits, "0");
  const expiresAtMs = (counter + 1) * TOTP_PERIOD_SECONDS * 1000;

  return {
    code,
    remainingSeconds: Math.max(1, Math.ceil((expiresAtMs - timestamp) / 1000)),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

module.exports = {
  generateTotp,
  normalizeSecret,
};
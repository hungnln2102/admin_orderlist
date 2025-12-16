const crypto = require("crypto");
const { SEPAY_WEBHOOK_SECRET, SEPAY_API_KEY } = require("./config");

const resolveSepaySignature = (req) => {
  return (
    req.get("X-SEPAY-SIGNATURE") ||
    req.get("X-Signature") ||
    req.get("Signature") ||
    req.get("X-Webhook-Signature") ||
    req.query?.signature ||
    req.query?.sign
  );
};

const verifySepaySignature = (rawBody, signature) => {
  if (!SEPAY_WEBHOOK_SECRET || !signature || !rawBody) return false;
  const expected = crypto.createHmac("sha256", SEPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(String(signature).trim(), "hex")
    );
  } catch {
    return false;
  }
};

const extractApiKey = (req) => {
  const auth = req.get("Authorization") || req.get("X-API-KEY") || "";
  const trimmed = String(auth || "").trim();
  const match = trimmed.match(/^Apikey\s+(.+)$/i);
  if (match && match[1]) return match[1].trim();
  if (trimmed && !trimmed.toLowerCase().startsWith("apikey")) return trimmed;
  return "";
};

const isValidApiKey = (req) => {
  if (!SEPAY_API_KEY) return false;
  const incoming = extractApiKey(req);
  if (!incoming) return false;
  const incomingTrimmed = String(incoming).trim();
  const expectedTrimmed = String(SEPAY_API_KEY).trim();
  if (incomingTrimmed === expectedTrimmed) return true;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incomingTrimmed),
      Buffer.from(expectedTrimmed)
    );
  } catch {
    return false;
  }
};

module.exports = {
  resolveSepaySignature,
  verifySepaySignature,
  extractApiKey,
  isValidApiKey,
};

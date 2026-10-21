const crypto = require("crypto");

const getIncomingApiKey = (req) => {
  const authorization = String(req.get("Authorization") || "").trim();
  const directApiKey = String(req.get("X-API-KEY") || "").trim();
  const apiKeyMatch = authorization.match(/^Apikey\s+(.+)$/i);

  return directApiKey || (apiKeyMatch ? apiKeyMatch[1].trim() : authorization);
};

const isValidSepayApiKey = (req) => {
  const expectedApiKey = String(process.env.SEPAY_API_KEY || "").trim();
  const incomingApiKey = getIncomingApiKey(req);

  if (!expectedApiKey || !incomingApiKey) return false;

  const expectedBuffer = Buffer.from(expectedApiKey);
  const incomingBuffer = Buffer.from(incomingApiKey);
  return expectedBuffer.length === incomingBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
};

function requireSepayApiKey(req, res, next) {
  if (isValidSepayApiKey(req)) return next();
  return res.status(401).json({ error: "Unauthorized webhook" });
}

module.exports = { requireSepayApiKey, isValidSepayApiKey };

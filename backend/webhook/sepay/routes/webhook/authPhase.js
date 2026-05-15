const {
  resolveSepaySignature,
  verifySepaySignature,
  isValidApiKey,
} = require("../../auth");

function verifyWebhookAuth(req) {
  const signature = resolveSepaySignature(req);
  const hasValidSignature = verifySepaySignature(req.rawBody, signature);
  const hasValidApiKey = isValidApiKey(req);

  return {
    ok: hasValidSignature || hasValidApiKey,
    hasValidSignature,
    hasValidApiKey,
  };
}

module.exports = {
  verifyWebhookAuth,
};

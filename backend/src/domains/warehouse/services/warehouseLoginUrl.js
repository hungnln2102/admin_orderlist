function normalizeWarehouseLoginUrl(value) {
  if (typeof value !== "string") return null;
  const loginUrl = value.trim();
  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(loginUrl);
  const isDomain = /^(?:[a-z\d-]+\.)+[a-z\d-]+(?::\d+)?(?:[/?#]|$)/i.test(loginUrl);
  if (!isAbsolute && !isDomain) return null;

  const normalized = isDomain ? `https://${loginUrl}` : loginUrl;
  const url = URL.canParse(normalized) ? new URL(normalized) : null;
  if (!url || !["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    return null;
  }
  return url.href;
}

module.exports = { normalizeWarehouseLoginUrl };

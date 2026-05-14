const CREATE_USER_CONCURRENCY = (() => {
  const n = Number.parseInt(process.env.ADOBE_V2_CREATE_USER_CONCURRENCY || "", 10);
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 6;
})();

const MAX_PRODUCT_PATCH_PER_REQUEST = (() => {
  const n = Number.parseInt(process.env.ADOBE_V2_MAX_PRODUCT_PATCH_BATCH || "", 10);
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : 40;
})();

function hasProductId(user, productId) {
  return (
    user &&
    Array.isArray(user.products) &&
    user.products.some((p) => String(p?.id || p || "").trim() === productId)
  );
}

function extractOrgIdFromUrl(url) {
  const m = String(url || "").match(/\/([A-Fa-f0-9]{20,})@AdobeOrg/);
  return m ? m[1] : null;
}

module.exports = {
  CREATE_USER_CONCURRENCY,
  MAX_PRODUCT_PATCH_PER_REQUEST,
  hasProductId,
  extractOrgIdFromUrl,
};

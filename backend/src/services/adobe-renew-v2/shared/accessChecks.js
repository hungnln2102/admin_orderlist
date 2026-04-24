function toNormalizedProductId(value) {
  return String(value || "").trim().toUpperCase();
}

function extractProductId(item) {
  if (item && typeof item === "object") {
    return String(item.id || item.productId || item.offerId || "").trim();
  }
  return String(item || "").trim();
}

function normalizeProductName(value) {
  return String(value || "").trim().toLowerCase();
}

function isCcpLikeName(value) {
  const name = normalizeProductName(value);
  if (!name) return false;
  return (
    name.includes("ccp") ||
    name.includes("creative cloud pro") ||
    name.includes("creativecloudpro") ||
    name.includes("all apps") ||
    name.includes("all-app") ||
    name.includes("all app")
  );
}

function isCcpLikeProduct(item) {
  if (!item || typeof item !== "object") return false;
  const rawId = toNormalizedProductId(extractProductId(item));
  if (rawId && rawId.includes("CCP")) return true;
  const name = (
    item.name || item.productName || item.displayName || item.title || ""
  );
  return isCcpLikeName(name);
}

function extractProductIds(products) {
  if (!Array.isArray(products)) return [];
  return [
    ...new Set(
      products
        .map((item) => toNormalizedProductId(extractProductId(item)))
        .filter(Boolean)
    ),
  ];
}

function inferAdobeProProductIdSet(users, adminEmail = "") {
  const list = Array.isArray(users) ? users : [];
  const ccpIds = new Set();
  for (const user of list) {
    const products = Array.isArray(user?.products) ? user.products : [];
    for (const product of products) {
      if (!isCcpLikeProduct(product)) continue;
      const id = toNormalizedProductId(extractProductId(product));
      if (id) ccpIds.add(id);
    }
  }

  // Rule nghiệp vụ: chỉ CCP mới tính là đã cấp quyền.
  return ccpIds;
}

function hasAdobeProAccessFromProducts(products, proProductIds) {
  if (!Array.isArray(products) || products.length === 0) return false;
  const ids = proProductIds instanceof Set ? proProductIds : new Set();
  if (ids.size === 0) {
    return products.some((item) => isCcpLikeProduct(item));
  }
  return products.some((item) =>
    ids.has(toNormalizedProductId(extractProductId(item))) ||
    isCcpLikeProduct(item)
  );
}

/**
 * Check user cụ thể đã được gán product Adobe Pro chưa.
 * Dùng users API snapshot làm nguồn sự thật.
 */
function checkUserAssignedProduct(users, email, adminEmail = "") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return { assigned: false, matchedUser: null };
  }

  const list = Array.isArray(users) ? users : [];
  const proProductIds = inferAdobeProProductIdSet(list, adminEmail);
  const matchedUser =
    list.find(
      (u) => String(u?.email || "").trim().toLowerCase() === normalizedEmail
    ) || null;

  if (!matchedUser) {
    return { assigned: false, matchedUser: null };
  }

  return {
    assigned: hasAdobeProAccessFromProducts(matchedUser.products, proProductIds),
    matchedUser,
  };
}

/**
 * Check account/org còn gói hay hết gói dựa trên products list.
 */
function checkOrgLicenseCapacity(products = []) {
  const list = Array.isArray(products) ? products : [];

  const uniqueProductIds = [
    ...new Set(
      list.map((p) => toNormalizedProductId(extractProductId(p))).filter(Boolean)
    ),
  ];

  const creativeCloudProProducts = list.filter((p) => isCcpLikeProduct(p));

  const creativeCloudProProductIds = [
    ...new Set(
      creativeCloudProProducts
        .map((p) => toNormalizedProductId(extractProductId(p)))
        .filter(Boolean)
    ),
  ];

  const ccpTotals = creativeCloudProProducts
    .map((p) => Number(p?.total || 0))
    .filter((n) => Number.isFinite(n) && n > 0);

  // lisencecount dùng để giới hạn add-user; lấy theo gói Creative Cloud Pro.
  const contractActiveLicenseCount = ccpTotals.length ? Math.max(...ccpTotals) : 0;
  const hasActiveLicense = creativeCloudProProducts.length > 0;
  const licenseStatus = hasActiveLicense ? "Paid" : "Expired";

  return {
    contractActiveLicenseCount,
    licenseStatus,
    hasActiveLicense,
    productIdCount: uniqueProductIds.length,
    productIds: uniqueProductIds,
    creativeCloudProProductIds,
  };
}

module.exports = {
  checkUserAssignedProduct,
  checkOrgLicenseCapacity,
  inferAdobeProProductIdSet,
  hasAdobeProAccessFromProducts,
};

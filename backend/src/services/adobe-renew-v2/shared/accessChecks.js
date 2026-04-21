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
  const counts = new Map();
  const byUser = list.map((u) => {
    const ids = extractProductIds(u?.products);
    ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    return {
      email: String(u?.email || "").trim().toLowerCase(),
      ids,
    };
  });

  const allIds = new Set(counts.keys());
  if (allIds.size === 0) return new Set();

  const adminNorm = String(adminEmail || "").trim().toLowerCase();
  if (adminNorm) {
    const adminRow = byUser.find((u) => u.email === adminNorm);
    const adminIds = new Set(adminRow?.ids || []);
    if (adminIds.size > 0) {
      const filtered = new Set([...allIds].filter((id) => !adminIds.has(id)));
      // Nếu admin đang giữ tất cả product IDs (filtered rỗng), fallback dùng allIds
      // để không đánh dấu sai toàn bộ team là "không có product" ngay sau add.
      if (filtered.size > 0) {
        return filtered;
      }
      return new Set(allIds);
    }
  }

  if (allIds.size === 1) {
    return new Set(allIds);
  }

  let mostCommonId = "";
  let mostCommonCount = -1;
  for (const [id, count] of counts.entries()) {
    if (count > mostCommonCount) {
      mostCommonId = id;
      mostCommonCount = count;
    }
  }
  return new Set([...allIds].filter((id) => id !== mostCommonId));
}

function hasAdobeProAccessFromProducts(products, proProductIds) {
  if (!Array.isArray(products) || products.length === 0) return false;
  const ids = proProductIds instanceof Set ? proProductIds : new Set();
  if (ids.size === 0) return false;
  return products.some((item) =>
    ids.has(toNormalizedProductId(extractProductId(item)))
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

  const creativeCloudProProducts = list.filter((p) => {
    const name = normalizeProductName(p?.name);
    return name.includes("creative cloud pro");
  });

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

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

/**
 * Khi API chỉ trả product dạng `{ id }` không có name (UI Adobe vẫn resolve "Creative Cloud Pro"),
 * suy ra id gói team bằng tần suất: id xuất hiện trên nhiều user thường là commercial seat chung (CCP).
 */
function normalizeCcpProductIdList(value) {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value].filter((x) => x != null);
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const raw =
      x && typeof x === "object"
        ? x.id ?? x.productId ?? x.offerId
        : x;
    const id = toNormalizedProductId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Đọc danh sách product id CCP đã ghi nhận cho admin (lưu trong cookie_config / alert_config).
 */
function parseCcpProductIdsFromAlertConfig(raw) {
  if (raw == null) return [];
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return normalizeCcpProductIdList(obj.ccp_product_ids);
}

/**
 * Quyết định mảng id cần lưu sau check: ưu tiên giữ pin cũ; lần đầu hoặc force refresh thì ghi discovery.
 */
function computeCcpProductIdsToPersist({
  existingPinned = [],
  discovered = [],
  forceRefresh = false,
} = {}) {
  const ex = normalizeCcpProductIdList(existingPinned);
  const disc = normalizeCcpProductIdList(discovered);
  if (forceRefresh) {
    if (disc.length > 0) return disc;
    return ex;
  }
  if (ex.length > 0) return ex;
  return disc;
}

function inferCcpProductIdsFromIdOnlyTeamProducts(list) {
  const users = Array.isArray(list) ? list : [];
  const idCounts = new Map();
  let usersWithAnyProduct = 0;

  for (const user of users) {
    const products = Array.isArray(user?.products) ? user.products : [];
    if (products.length === 0) continue;
    usersWithAnyProduct += 1;
    const seenThisUser = new Set();
    for (const p of products) {
      if (!p || typeof p !== "object") continue;
      const hasName = ["name", "productName", "displayName", "title"].some(
        (k) => String(p[k] || "").trim().length > 0
      );
      if (hasName) continue;
      const id = toNormalizedProductId(extractProductId(p));
      if (!id) continue;
      if (seenThisUser.has(id)) continue;
      seenThisUser.add(id);
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
  }

  if (idCounts.size === 0) return [];

  const sorted = [...idCounts.entries()].sort((a, b) => b[1] - a[1]);
  const [topId, topCount] = sorted[0];
  const secondCount = sorted.length > 1 ? sorted[1][1] : 0;

  if (topCount >= 2 && topCount > secondCount) {
    return [topId];
  }
  if (
    usersWithAnyProduct >= 2 &&
    topCount >= Math.max(2, Math.ceil(usersWithAnyProduct * 0.5))
  ) {
    return [topId];
  }
  return [];
}

/**
 * Suy ra id gói CCP từ snapshot hiện tại (tên + id-only heuristic), không dùng pin DB.
 */
function discoverAdobeProProductIdSet(users, adminEmail = "") {
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

  if (ccpIds.size === 0) {
    for (const id of inferCcpProductIdsFromIdOnlyTeamProducts(list)) {
      ccpIds.add(id);
    }
  }

  return ccpIds;
}

/**
 * @param {string[]|undefined|null} pinnedProductIds - Nếu có phần tử, chỉ coi các id này là CCP (đã ghi nhận từ check trước).
 */
function inferAdobeProProductIdSet(users, adminEmail = "", pinnedProductIds) {
  const pinned = normalizeCcpProductIdList(pinnedProductIds);
  if (pinned.length > 0) {
    return new Set(pinned);
  }
  return discoverAdobeProProductIdSet(users, adminEmail);
}

function hasAdobeProAccessFromProducts(products, proProductIds, options = {}) {
  const strictIdOnly = options.strictIdOnly === true;
  if (!Array.isArray(products) || products.length === 0) return false;
  const ids = proProductIds instanceof Set ? proProductIds : new Set(proProductIds || []);
  if (ids.size === 0) {
    return products.some((item) => isCcpLikeProduct(item));
  }
  return products.some((item) => {
    if (ids.has(toNormalizedProductId(extractProductId(item)))) return true;
    return strictIdOnly ? false : isCcpLikeProduct(item);
  });
}

/**
 * Check user cụ thể đã được gán product Adobe Pro chưa.
 * Dùng users API snapshot làm nguồn sự thật.
 */
function checkUserAssignedProduct(users, email, adminEmail = "", pinnedProductIds) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return { assigned: false, matchedUser: null };
  }

  const list = Array.isArray(users) ? users : [];
  const pinnedNorm = normalizeCcpProductIdList(pinnedProductIds);
  const proProductIds = inferAdobeProProductIdSet(list, adminEmail, pinnedNorm);
  const strictIdOnly = pinnedNorm.length > 0;
  const matchedUser =
    list.find(
      (u) => String(u?.email || "").trim().toLowerCase() === normalizedEmail
    ) || null;

  if (!matchedUser) {
    return { assigned: false, matchedUser: null };
  }

  return {
    assigned: hasAdobeProAccessFromProducts(matchedUser.products, proProductIds, {
      strictIdOnly,
    }),
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
  discoverAdobeProProductIdSet,
  parseCcpProductIdsFromAlertConfig,
  normalizeCcpProductIdList,
  computeCcpProductIdsToPersist,
  hasAdobeProAccessFromProducts,
};

const logger = require("../../../utils/logger");

function toNormalizedProductId(value) {
  return String(value || "").trim().toUpperCase();
}

function extractProductId(item) {
  if (item && typeof item === "object") {
    return String(item.id || item.productId || item.offerId || "").trim();
  }
  return String(item || "").trim();
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
      return new Set([...allIds].filter((id) => !adminIds.has(id)));
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

function applyAdobeProFlags(users, adminEmail = "") {
  const list = Array.isArray(users) ? users : [];
  const proProductIds = inferAdobeProProductIdSet(list, adminEmail);
  return list.map((u) => ({
    ...u,
    hasProduct: hasAdobeProAccessFromProducts(u?.products, proProductIds),
    product: hasAdobeProAccessFromProducts(u?.products, proProductIds),
  }));
}

function extractOrgTokenFromUrl(url) {
  const m = String(url || "").match(/\/([A-Fa-f0-9]{20,}@AdobeOrg)/);
  return m ? m[1] : null;
}

function normalizeOrgToken(orgIdOrToken) {
  const raw = String(orgIdOrToken || "").trim();
  if (!raw) return "";
  return raw.includes("@AdobeOrg") ? raw : `${raw}@AdobeOrg`;
}

function mapApiUserToSnapshotUser(item) {
  const firstName = String(item?.firstName || "").trim();
  const lastName = String(item?.lastName || "").trim();
  const name = `${firstName} ${lastName}`.trim();
  const email = String(item?.email || item?.userName || "").trim();
  const products = Array.isArray(item?.products) ? item.products : [];
  return {
    id: String(item?.id || "").trim() || null,
    authenticatingAccountId:
      String(item?.authenticatingAccount?.id || "").trim() || null,
    name,
    email,
    products,
    accountStatus: item?.accountStatus || null,
    product: false,
    hasProduct: false,
  };
}

async function captureUsersApiHeaders(page, orgToken) {
  const reqPromise = page.waitForRequest(
    (req) =>
      req.method() === "GET" &&
      req.url().includes(`/jil-api/v2/organizations/${orgToken}/users/?`),
    { timeout: 30000 }
  );

  await page.goto(`https://adminconsole.adobe.com/${orgToken}/users`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const req = await reqPromise;
  const headers = req.headers();
  const authorization = headers.authorization || headers.Authorization || "";
  const xApiKey = headers["x-api-key"] || headers["X-Api-Key"] || "";

  if (!authorization || !xApiKey) {
    throw new Error("Thiếu authorization/x-api-key từ request users.");
  }

  return {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    authorization,
    "x-api-key": xApiKey,
    "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
    "x-jil-feature": headers["x-jil-feature"] || "",
    origin: "https://adminconsole.adobe.com",
    referer: `https://adminconsole.adobe.com/${orgToken}/users`,
  };
}

async function fetchUsersViaApi(page, options = {}) {
  const orgToken =
    normalizeOrgToken(options.orgId || options.orgToken) ||
    extractOrgTokenFromUrl(page.url());
  if (!orgToken) {
    throw new Error("Không xác định được org token để gọi users API.");
  }

  const headers = await captureUsersApiHeaders(page, orgToken);
  const api = page.context().request;
  const pageSize = Math.max(20, Math.min(200, Number(options.pageSize) || 100));
  const maxPages = Math.max(1, Math.min(30, Number(options.maxPages) || 10));

  const users = [];
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const url =
      `https://bps-il.adobe.io/jil-api/v2/organizations/${orgToken}/users/?` +
      `filter_exclude_domain=techacct.adobe.com&page=${pageIndex}&page_size=${pageSize}` +
      "&search_query=&sort=FNAME_LNAME&sort_order=ASC" +
      `&currentPage=${pageIndex + 1}&filterQuery=&include=DOMAIN_ENFORCEMENT_EXCEPTION_INDICATOR`;

    const resp = await api.get(url, { headers, timeout: 30000 });
    const text = await resp.text();
    if (!resp.ok()) {
      throw new Error(
        `Users API fail ${resp.status()} (page=${pageIndex}): ${text.slice(0, 220)}`
      );
    }

    let arr = [];
    try {
      const parsed = JSON.parse(text);
      arr = Array.isArray(parsed) ? parsed : parsed?.items || parsed?.data || [];
    } catch (e) {
      throw new Error(`Users API parse fail (page=${pageIndex}): ${e.message}`);
    }

    users.push(...arr.map(mapApiUserToSnapshotUser).filter((u) => u.email));

    const nextHeader = resp.headers()["x-has-next-page"] || "";
    if (!String(nextHeader).toLowerCase().includes("true")) {
      break;
    }
    if (arr.length === 0) {
      break;
    }
  }

  const usersWithProFlags = applyAdobeProFlags(users, options.adminEmail);
  logger.info(
    "[adobe-v2] users-api: fetched %d users (org=%s)",
    usersWithProFlags.length,
    orgToken
  );
  return { users: usersWithProFlags, orgToken };
}

module.exports = {
  fetchUsersViaApi,
  extractOrgTokenFromUrl,
  normalizeOrgToken,
  inferAdobeProProductIdSet,
  applyAdobeProFlags,
  hasAdobeProAccessFromProducts,
};


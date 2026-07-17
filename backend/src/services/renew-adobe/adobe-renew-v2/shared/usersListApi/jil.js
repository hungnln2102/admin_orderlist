const logger = require("@/utils/logger");
const { fetchUsersViaAbpApi } = require("@/services/renew-adobe/adobe-renew-v2/shared/usersListApi/abp");
const {
  normalizeOrgToken,
  extractOrgTokenFromUrl,
  mapApiUserToSnapshotUser,
  applyAdobeProFlags,
} = require("@/services/renew-adobe/adobe-renew-v2/shared/usersListApi/shared");

async function captureUsersApiHeaders(page, orgToken) {
  const token = normalizeOrgToken(orgToken);
  const reqPromise = page.waitForRequest(
    (req) =>
      req.method() === "GET" &&
      req.url().includes(`/jil-api/v2/organizations/${token}/users/?`),
    { timeout: 30000 }
  );

  const cur = String(page.url() || "");
  const usersHref = `https://adminconsole.adobe.com/${token}/users`;
  const alreadyOnOrgUsers =
    /adminconsole\.adobe\.com\/[^/]+@AdobeOrg\/users/i.test(cur) &&
    cur.includes(token.split("@")[0] || "");

  if (alreadyOnOrgUsers) {
    await page
      .reload({ waitUntil: "domcontentloaded", timeout: 60000 })
      .catch(() => {});
  } else {
    await page.goto(usersHref, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }

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
    referer: usersHref,
  };
}

async function fetchUsersViaApi(page, options = {}) {
  const orgToken =
    normalizeOrgToken(options.orgId || options.orgToken) ||
    extractOrgTokenFromUrl(page.url());
  if (!orgToken) {
    throw new Error("Không xác định được org token để gọi users API.");
  }

  const collectJilRaw =
    options.collectJilRaw === true ||
    String(process.env.ADOBE_DUMP_JIL_USERS_RAW || "").trim() === "1";
  /** @type {{ pageIndex: number, status: number, parsed: unknown }[]} */
  const jilRawPages = [];

  /** Luồng Admin Console: mặc định JIL users API (bps-il). Chỉ dùng ABP khi bật rõ ràng. */
  const useAbp =
    options.usersSource === "abp" ||
    String(process.env.ADOBE_USERS_SOURCE || "").toLowerCase() === "abp";

  if (useAbp) {
    try {
      const abp = await fetchUsersViaAbpApi(page, orgToken, options);
      if (abp.users.length > 0) {
        const usersWithProFlags = applyAdobeProFlags(
          abp.users,
          options.adminEmail,
          options.pinnedCcpProductIds,
          { verifiedCcpSeatProductIds: options.verifiedCcpSeatProductIds }
        );
        logger.info(
          "[adobe-v2] users-api (ABP): %d users (org=%s)",
          usersWithProFlags.length,
          orgToken
        );
        return {
          users: usersWithProFlags,
          orgToken: abp.orgToken,
          usersSource: "abp",
        };
      }
      logger.warn("[adobe-v2] users-api: ABP trả 0 user (parse?), fallback JIL");
    } catch (abpErr) {
      logger.warn("[adobe-v2] users-api: ABP lỗi, fallback JIL — %s", abpErr.message);
    }
  }

  const headers =
    options.reusableJilHeaders && Object.keys(options.reusableJilHeaders).length > 0
      ? options.reusableJilHeaders
      : await captureUsersApiHeaders(page, orgToken);
  const api = page.context().request;
  const pageSize = Math.max(20, Math.min(200, Number(options.pageSize) || 20));
  const maxPages = Math.max(1, Math.min(30, Number(options.maxPages) || 10));

  const users = [];
  const seenKeys = new Set();
  let probePagesLeft = 0;
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
    let parsed = null;
    try {
      parsed = JSON.parse(text);
      arr = Array.isArray(parsed) ? parsed : parsed?.items || parsed?.data || [];
    } catch (e) {
      throw new Error(`Users API parse fail (page=${pageIndex}): ${e.message}`);
    }

    if (collectJilRaw) {
      jilRawPages.push({
        pageIndex,
        status: resp.status(),
        parsed,
      });
    }

    const mappedUsers = arr
      .map(mapApiUserToSnapshotUser)
      .filter((u) => u.email);
    let newOnPage = 0;
    for (const user of mappedUsers) {
      const key = String(user.id || user.email || "").trim().toLowerCase();
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      users.push(user);
      newOnPage += 1;
    }

    const nextHeader = resp.headers()["x-has-next-page"] || "";
    const hasNext = String(nextHeader).toLowerCase().includes("true");

    if (arr.length === 0 || newOnPage === 0) {
      break;
    }

    if (hasNext) {
      continue;
    }

    if (probePagesLeft > 0) {
      probePagesLeft -= 1;
      continue;
    }
    if (pageIndex === 0) {
      probePagesLeft = 2;
      continue;
    }
    break;
  }

  const usersWithProFlags = applyAdobeProFlags(
    users,
    options.adminEmail,
    options.pinnedCcpProductIds,
    { verifiedCcpSeatProductIds: options.verifiedCcpSeatProductIds }
  );
  logger.info(
    "[adobe-v2] users-api (JIL): fetched %d users (org=%s)",
    usersWithProFlags.length,
    orgToken
  );
  return {
    users: usersWithProFlags,
    orgToken,
    usersSource: "jil",
    capturedJilHeaders: headers,
    ...(collectJilRaw && jilRawPages.length ? { jilRawPages } : {}),
  };
}

module.exports = {
  fetchUsersViaApi,
  captureUsersApiHeaders,
};

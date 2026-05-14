const logger = require("../../../../../utils/logger");
const { resolveAdobeEmbedPageUrl } = require("../constants");
const {
  ABP_API_ORIGIN,
  ABP_USERS_ATTRS_QUERY,
  SKIP_HEADER_NAMES,
  normalizeOrgToken,
  flattenAbpUsersPayload,
  buildForwardHeadersFromCapturedRequest,
  mapAbpUserToSnapshotUser,
  isAdobeEmbedHostPageUrl,
} = require("./shared");

/**
 * Fallback khi APIRequestContext trả 403: fetch trong browser.
 */
async function fetchAbpUsersViaBrowserFetch(page, url, forwardedHeaders) {
  const entries = [];
  for (const [k, v] of Object.entries(forwardedHeaders)) {
    if (typeof v !== "string") continue;
    const lk = k.toLowerCase();
    if (SKIP_HEADER_NAMES.has(lk)) continue;
    if (lk === "cookie" || lk === "sec-websocket-key") continue;
    entries.push([k, v]);
  }
  return page.evaluate(
    async ({ url: u, entries: ent }) => {
      const hdr = {};
      for (const [k, v] of ent) hdr[k] = v;
      const res = await fetch(u, { method: "GET", headers: hdr, credentials: "omit" });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    },
    { url, entries }
  );
}

async function captureAbpUsersApiHeaders(page, orgToken) {
  const token = normalizeOrgToken(orgToken);
  const orgHex = token.split("@")[0] || "";
  const matchAbp = (req) => {
    if (req.method() !== "GET") return false;
    const u = req.url();
    if (!u.includes("abpapi.adobe.io/abpapi/organizations/")) return false;
    if (!u.includes("/users")) return false;
    return orgHex ? u.includes(orgHex) : true;
  };

  const embedUrl = resolveAdobeEmbedPageUrl();
  const usersHref = `https://adminconsole.adobe.com/${token}/users`;

  const captureOnce = async (navFn) => {
    const reqPromise = page.waitForRequest(matchAbp, { timeout: 32000 });
    await navFn();
    const req = await reqPromise;
    return req;
  };

  const cur = String(page.url() || "");
  try {
    const req = await captureOnce(async () => {
      if (isAdobeEmbedHostPageUrl(cur)) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
        return;
      }
      await page.goto(embedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    });
    const forwardedHeaders = buildForwardHeadersFromCapturedRequest(req);
    return { forwardedHeaders, interceptedUrl: req.url() };
  } catch (e1) {
    logger.warn(
      "[adobe-v2] abp-users: không bắt ABP trên trang Adobe.com (%s), thử adminconsole/users",
      e1.message
    );
    const req = await captureOnce(async () => {
      const u = String(page.url() || "");
      if (/adminconsole\.adobe\.com\/[^/]+@AdobeOrg\/users/i.test(u)) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
        return;
      }
      await page.goto(usersHref, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    });
    const forwardedHeaders = buildForwardHeadersFromCapturedRequest(req);
    return { forwardedHeaders, interceptedUrl: req.url() };
  }
}

async function fetchUsersViaAbpApi(page, orgToken, _options = {}) {
  const token = normalizeOrgToken(orgToken);
  const base = `${ABP_API_ORIGIN}/abpapi/organizations/${encodeURIComponent(token)}/users`;
  const defaultUrl = `${base}?${ABP_USERS_ATTRS_QUERY}`;

  const { forwardedHeaders, interceptedUrl } = await captureAbpUsersApiHeaders(page, token);

  const urlCandidates = [];
  if (
    interceptedUrl &&
    interceptedUrl.includes("abpapi.adobe.io") &&
    interceptedUrl.includes("/users")
  ) {
    urlCandidates.push(interceptedUrl);
  }
  urlCandidates.push(defaultUrl);
  const urlsToTry = [...new Set(urlCandidates)];

  const api = page.context().request;

  const parseAbpBody = (text, source) => {
    let parsed = null;
    try {
      parsed = JSON.parse(text || "null");
    } catch (err) {
      throw new Error(`ABP users parse fail (${source}): ${err.message}`);
    }
    const arr = flattenAbpUsersPayload(parsed);
    return arr
      .map(mapAbpUserToSnapshotUser)
      .filter((u) => u.email);
  };

  let lastErrorSnippet = "";

  for (const targetUrl of urlsToTry) {
    const resp = await api.get(targetUrl, { headers: forwardedHeaders, timeout: 45000 });
    const text = await resp.text();
    lastErrorSnippet = text.slice(0, 280);

    if (resp.ok()) {
      const users = parseAbpBody(text, "api-request");
      logger.info("[adobe-v2] abp-users-api: %d users (org=%s)", users.length, token);
      return { users, orgToken: token, source: "abp" };
    }

    if (resp.status() === 403) {
      logger.warn(
        "[adobe-v2] abp-users: HTTP 403 (APIRequestContext, url=%s), thử fetch trong page",
        targetUrl.slice(0, 140)
      );
      try {
        const inPage = await fetchAbpUsersViaBrowserFetch(page, targetUrl, forwardedHeaders);
        lastErrorSnippet = (inPage.text || "").slice(0, 280);
        if (inPage.ok) {
          const users = parseAbpBody(inPage.text, "page-fetch");
          logger.info(
            "[adobe-v2] abp-users-api (page-fetch): %d users (org=%s)",
            users.length,
            token
          );
          return { users, orgToken: token, source: "abp-page-fetch" };
        }
      } catch (pe) {
        logger.warn("[adobe-v2] abp-users: page-fetch lỗi: %s", pe.message);
      }
    }
  }

  throw new Error(
    `ABP users API fail (đã thử ${urlsToTry.length} URL, không dùng header JIL): ${lastErrorSnippet}`
  );
}

module.exports = {
  fetchUsersViaAbpApi,
  fetchAbpUsersViaBrowserFetch,
  captureAbpUsersApiHeaders,
};

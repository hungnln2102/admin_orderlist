/**
 * Gọi Admin Console internal API bằng cookies/token sau khi login.
 *
 * Adobe Admin Console frontend gọi các API nội bộ:
 * - bps-il.adobe.io/jil-api/v2/organizations/{orgId}/products/
 * - bps-il.adobe.io/jil-api/v2/organizations/{orgId}/users/
 * - usermanagement.adobe.io/v2/usermanagement/...
 *
 * Cần bearer token (access_token) từ IMS.
 */

const logger = require("../../utils/logger");
const { ADMIN_CONSOLE_BASE, ADMIN_CONSOLE_API_BASE, USER_MANAGEMENT_API } = require("./constants");

/**
 * Lấy org ID từ Admin Console homepage (redirect chứa @AdobeOrg).
 * @param {import('axios').AxiosInstance} client - Client đã có cookies login
 * @returns {Promise<string|null>} orgId
 */
async function getOrgId(client) {
  logger.info("[adobe-http] Lấy org ID từ Admin Console...");
  const res = await client.get(`${ADMIN_CONSOLE_BASE}/`, {
    maxRedirects: 5,
    headers: { Accept: "text/html" },
  });

  const finalUrl = res.request?.res?.responseUrl || res.config?.url || "";
  const orgMatch = finalUrl.match(/\/([A-Fa-f0-9]+)@AdobeOrg/);
  if (orgMatch) {
    logger.info("[adobe-http] Org ID: %s", orgMatch[1]);
    return orgMatch[1];
  }

  const html = typeof res.data === "string" ? res.data : "";
  const htmlMatch = html.match(/([A-Fa-f0-9]{20,})@AdobeOrg/);
  if (htmlMatch) {
    logger.info("[adobe-http] Org ID (from HTML): %s", htmlMatch[1]);
    return htmlMatch[1];
  }

  logger.warn("[adobe-http] Không tìm được org ID. Final URL: %s", finalUrl.slice(0, 100));
  return null;
}

/**
 * Lấy danh sách products qua JIL API (internal Admin Console API).
 * @param {import('axios').AxiosInstance} client
 * @param {string} orgId
 * @param {string} [accessToken]
 * @returns {Promise<{ hasPlan: boolean, licenseStatus: string, products: Array }>}
 */
async function getProducts(client, orgId, accessToken) {
  logger.info("[adobe-http] Lấy products cho org %s...", orgId);

  const headers = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const urls = [
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/products`,
    `${USER_MANAGEMENT_API}/v2/usermanagement/${orgId}@AdobeOrg/products/`,
  ];

  for (const url of urls) {
    try {
      const res = await client.get(url, { headers });
      logger.info("[adobe-http] Products %s → status=%s", url, res.status);

      if (res.status === 200 && res.data) {
        const data = Array.isArray(res.data) ? res.data : res.data.products || res.data.items || [];
        const products = data.map((p) => ({
          id: p.id || p.code || p.productId,
          name: p.name || p.productName || p.code,
          licenseQuota: p.licenseQuota || p.adminQuantity || 0,
          userCount: p.userCount || p.provisionedQuantity || 0,
        }));

        const hasPlan = products.length > 0 && products.some((p) => (p.licenseQuota || 0) > 0);
        return {
          hasPlan,
          licenseStatus: hasPlan ? "Paid" : "Expired",
          products,
        };
      }
    } catch (e) {
      logger.debug("[adobe-http] Products endpoint %s error: %s", url, e.message);
    }
  }

  return { hasPlan: false, licenseStatus: "unknown", products: [] };
}

/**
 * Lấy danh sách users.
 * @param {import('axios').AxiosInstance} client
 * @param {string} orgId
 * @param {string} [accessToken]
 * @returns {Promise<Array<{ name: string|null, email: string, product: boolean }>>}
 */
async function getUsers(client, orgId, accessToken) {
  logger.info("[adobe-http] Lấy users cho org %s...", orgId);

  const headers = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const urls = [
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/users`,
    `${USER_MANAGEMENT_API}/v2/usermanagement/users/${orgId}@AdobeOrg/0`,
  ];

  for (const url of urls) {
    try {
      const res = await client.get(url, { headers });
      logger.info("[adobe-http] Users %s → status=%s", url, res.status);

      if (res.status === 200 && res.data) {
        const data = Array.isArray(res.data)
          ? res.data
          : res.data.users || res.data.items || res.data.resources || [];
        return data.map((u) => ({
          name: u.name || u.firstName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null,
          email: u.email || u.username || "",
          product: !!(u.products?.length || u.groups?.length || u.adminRoles?.length),
        }));
      }
    } catch (e) {
      logger.debug("[adobe-http] Users endpoint %s error: %s", url, e.message);
    }
  }

  return [];
}

/**
 * Thêm user vào org (qua User Management Action API).
 * @param {import('axios').AxiosInstance} client
 * @param {string} orgId
 * @param {string} accessToken
 * @param {string[]} emails
 * @returns {Promise<{ success: boolean, added: string[], failed: string[] }>}
 */
async function addUsers(client, orgId, accessToken, emails) {
  logger.info("[adobe-http] Thêm %s users vào org %s...", emails.length, orgId);

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const commands = emails.map((email) => ({
    user: email,
    requestID: `add_${email}_${Date.now()}`,
    do: [{ addAdobeID: { email, country: "US", option: "ignoreIfAlreadyExists" } }],
  }));

  const url = `${USER_MANAGEMENT_API}/v2/usermanagement/action/${orgId}@AdobeOrg`;

  try {
    const res = await client.post(url, commands, { headers });
    logger.info("[adobe-http] Add users → status=%s", res.status);

    if (res.status === 200) {
      const results = Array.isArray(res.data) ? res.data : [res.data];
      const added = [];
      const failed = [];
      for (const r of results) {
        if (r.result === "success" || r.result === "ignored") {
          added.push(r.user || r.requestID);
        } else {
          failed.push(r.user || r.requestID);
        }
      }
      return { success: true, added, failed };
    }

    return { success: false, added: [], failed: emails, error: `Status ${res.status}` };
  } catch (e) {
    logger.error("[adobe-http] Add users error: %s", e.message);
    return { success: false, added: [], failed: emails, error: e.message };
  }
}

/**
 * Xóa user khỏi org.
 * @param {import('axios').AxiosInstance} client
 * @param {string} orgId
 * @param {string} accessToken
 * @param {string} email
 * @returns {Promise<{ success: boolean }>}
 */
async function removeUser(client, orgId, accessToken, email) {
  logger.info("[adobe-http] Xóa user %s khỏi org %s...", email, orgId);

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const commands = [
    {
      user: email,
      requestID: `remove_${email}_${Date.now()}`,
      do: [{ removeFromOrg: {} }],
    },
  ];

  const url = `${USER_MANAGEMENT_API}/v2/usermanagement/action/${orgId}@AdobeOrg`;

  try {
    const res = await client.post(url, commands, { headers });
    logger.info("[adobe-http] Remove user → status=%s", res.status);
    return { success: res.status === 200 };
  } catch (e) {
    logger.error("[adobe-http] Remove user error: %s", e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { getOrgId, getProducts, getUsers, addUsers, removeUser };

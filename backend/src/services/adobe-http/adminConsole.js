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
const { ADMIN_CONSOLE_BASE, ADMIN_CONSOLE_API_BASE, USER_MANAGEMENT_API, ADOBE_IMS_BASE } = require("./constants");

/**
 * Lấy org ID bằng nhiều chiến lược:
 * 1. Parse từ Admin Console redirect URL
 * 2. Parse từ HTML response
 * 3. Gọi JIL API /organizations
 * 4. Gọi IMS profile
 */
async function getOrgId(client, accessToken) {
  logger.info("[adobe-http] Lấy org ID...");

  // Strategy 1: Admin Console redirect URL
  try {
    const res = await client.get(`${ADMIN_CONSOLE_BASE}/`, {
      maxRedirects: 5,
      timeout: 15000,
      headers: { Accept: "text/html" },
    });
    const finalUrl = res.request?.res?.responseUrl || res.config?.url || "";
    const orgMatch = finalUrl.match(/\/([A-Fa-f0-9]+)@AdobeOrg/);
    if (orgMatch) {
      logger.info("[adobe-http] Org ID (redirect URL): %s", orgMatch[1]);
      return orgMatch[1];
    }

    const html = typeof res.data === "string" ? res.data : "";
    const htmlMatch = html.match(/([A-Fa-f0-9]{20,})@AdobeOrg/);
    if (htmlMatch) {
      logger.info("[adobe-http] Org ID (HTML): %s", htmlMatch[1]);
      return htmlMatch[1];
    }
  } catch (e) {
    logger.debug("[adobe-http] getOrgId strategy 1 error: %s", e.message);
  }

  // Strategy 2: JIL API organizations list (cần Bearer token)
  if (accessToken) {
    try {
      const res = await client.get(`${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations`, {
        timeout: 15000,
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 200 && res.data) {
        const orgs = Array.isArray(res.data) ? res.data : [res.data];
        for (const org of orgs) {
          const id = org.orgId || org.id || org.orgRef;
          if (id) {
            const clean = String(id).replace(/@AdobeOrg$/, "");
            logger.info("[adobe-http] Org ID (JIL API): %s", clean);
            return clean;
          }
        }
      }
    } catch (e) {
      logger.debug("[adobe-http] getOrgId JIL API error: %s", e.message);
    }
  }

  // Strategy 3: IMS profile (cần Bearer token)
  if (accessToken) {
    try {
      const res = await client.get(`${ADOBE_IMS_BASE}/ims/profile/v1`, {
        timeout: 10000,
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 200 && res.data) {
        const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        const m = body.match(/([A-Fa-f0-9]{20,})@AdobeOrg/);
        if (m) {
          logger.info("[adobe-http] Org ID (IMS profile): %s", m[1]);
          return m[1];
        }
        const projOrg = res.data.projectedProductContext?.[0]?.prodCtx?.ownedBy;
        if (projOrg) {
          const clean = String(projOrg).replace(/@AdobeOrg$/, "");
          logger.info("[adobe-http] Org ID (IMS projectedProductContext): %s", clean);
          return clean;
        }
      }
    } catch (e) {
      logger.debug("[adobe-http] getOrgId IMS profile error: %s", e.message);
    }
  }

  logger.warn("[adobe-http] Không tìm được org ID qua bất kỳ strategy nào");
  return null;
}

/**
 * Lấy danh sách products.
 */
async function getProducts(client, orgId, accessToken) {
  if (!orgId) return { hasPlan: false, licenseStatus: "unknown", products: [] };

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
        return { hasPlan, licenseStatus: hasPlan ? "Paid" : "Expired", products };
      }
    } catch (e) {
      logger.debug("[adobe-http] Products endpoint %s error: %s", url, e.message);
    }
  }

  return { hasPlan: false, licenseStatus: "unknown", products: [] };
}

/**
 * Lấy danh sách users.
 */
async function getUsers(client, orgId, accessToken) {
  if (!orgId) return [];

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
          name: u.name || (u.firstName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null),
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

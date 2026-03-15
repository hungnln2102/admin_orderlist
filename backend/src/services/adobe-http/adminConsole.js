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
const { ADMIN_CONSOLE_BASE, ADMIN_CONSOLE_API_BASE, USER_MANAGEMENT_API, ADOBE_IMS_BASE, ADMIN_CONSOLE_CLIENT_ID, TIMEOUTS } = require("./constants");

// Multiple client IDs to try for JIL API (fallback order)
const JIL_CLIENT_IDS = [ADMIN_CONSOLE_CLIENT_ID, "aac_manage_teams", "AdobeAnalyticsUI"];

/**
 * Lấy org ID + org name bằng nhiều chiến lược:
 * 1. Parse từ Admin Console redirect URL
 * 2. Parse từ HTML response
 * 3. Gọi JIL API /organizations
 * 4. Gọi IMS profile
 *
 * @returns {{ orgId: string, orgName: string|null }} hoặc null nếu không tìm được
 */
async function getOrgId(client, accessToken) {
  logger.info("[adobe-http] Lấy org ID (hasToken=%s)...", !!accessToken);

  let foundOrgId = null;
  let foundOrgName = null;

  // Strategy 1: Admin Console redirect URL
  try {
    const res = await client.get(`${ADMIN_CONSOLE_BASE}/`, {
      maxRedirects: 5,
      timeout: TIMEOUTS.API,
      headers: { Accept: "text/html" },
    });
    const finalUrl = res.request?.res?.responseUrl || res.config?.url || "";
    logger.info("[adobe-http] getOrgId strategy 1: redirect URL (trimmed): %s", (finalUrl || "").slice(0, 180));
    const orgMatch = finalUrl.match(/\/([A-Fa-f0-9]+)@AdobeOrg/);
    if (orgMatch) {
      logger.info("[adobe-http] Org ID (redirect URL): %s", orgMatch[1]);
      foundOrgId = orgMatch[1];
    }

    if (!foundOrgId) {
      const html = typeof res.data === "string" ? res.data : "";
      const htmlMatch = html.match(/([A-Fa-f0-9]{20,})@AdobeOrg/);
      if (htmlMatch) {
        logger.info("[adobe-http] Org ID (HTML): %s", htmlMatch[1]);
        foundOrgId = htmlMatch[1];
      } else {
        logger.info("[adobe-http] getOrgId strategy 1: không thấy @AdobeOrg trong URL và HTML");
      }
    }
  } catch (e) {
    logger.warn("[adobe-http] getOrgId strategy 1 error: %s", e.message);
  }

  // Strategy 2: JIL API organizations list (cần Bearer token) — thử nhiều x-api-key
  if (accessToken) {
    for (const clientId of JIL_CLIENT_IDS) {
      if (foundOrgId) break;
      try {
        const res = await client.get(`${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations`, {
          timeout: TIMEOUTS.API,
          headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}`, "x-api-key": clientId },
        });
        logger.info("[adobe-http] getOrgId strategy 2 (JIL organizations, x-api-key=%s): status=%s", clientId, res.status);
        if (res.status === 200 && res.data) {
          const orgs = Array.isArray(res.data) ? res.data : [res.data];
          for (const org of orgs) {
            const id = org.orgId || org.id || org.orgRef;
            if (id) {
              if (!foundOrgId) {
                foundOrgId = String(id).replace(/@AdobeOrg$/, "");
                logger.info("[adobe-http] Org ID (JIL API, x-api-key=%s): %s", clientId, foundOrgId);
              }
              if (!foundOrgName) {
                foundOrgName = org.name || org.orgName || org.displayName || null;
                if (foundOrgName) logger.info("[adobe-http] Org Name (JIL API): %s", foundOrgName);
              }
              break;
            }
          }
          if (foundOrgId) break;
          logger.info("[adobe-http] getOrgId strategy 2 (x-api-key=%s): JIL trả data nhưng không có orgId", clientId);
        } else {
          logger.info("[adobe-http] getOrgId strategy 2 (x-api-key=%s): status=%s → thử client_id tiếp", clientId, res.status);
        }
      } catch (e) {
        logger.warn("[adobe-http] getOrgId strategy 2 (x-api-key=%s) error: %s", clientId, e.message);
      }
    }
  } else {
    logger.info("[adobe-http] getOrgId strategy 2: bỏ qua (không có token)");
  }

  // Strategy 3: IMS profile (cần Bearer token)
  if (!foundOrgId && accessToken) {
    try {
      const res = await client.get(`${ADOBE_IMS_BASE}/ims/profile/v1`, {
        timeout: TIMEOUTS.API,
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      });
      logger.info("[adobe-http] getOrgId strategy 3 (IMS profile): status=%s", res.status);
      if (res.status === 200 && res.data) {
        const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        const m = body.match(/([A-Fa-f0-9]{20,})@AdobeOrg/);
        if (m) {
          logger.info("[adobe-http] Org ID (IMS profile): %s", m[1]);
          foundOrgId = m[1];
        }
        if (!foundOrgId) {
          const projOrg = res.data.projectedProductContext?.[0]?.prodCtx?.ownedBy;
          if (projOrg) {
            foundOrgId = String(projOrg).replace(/@AdobeOrg$/, "");
            logger.info("[adobe-http] Org ID (IMS projectedProductContext): %s", foundOrgId);
          }
        }
        if (!foundOrgName && res.data.displayName) {
          foundOrgName = res.data.displayName;
        }
        if (!foundOrgId) {
          logger.info("[adobe-http] getOrgId strategy 3: IMS 200 nhưng không parse được org từ body");
        }
      } else {
        const bodyStr = res.data ? (typeof res.data === "string" ? res.data : JSON.stringify(res.data)).slice(0, 300) : "";
        logger.warn("[adobe-http] getOrgId strategy 3: IMS non-200, body=%s", bodyStr);
      }
    } catch (e) {
      logger.warn("[adobe-http] getOrgId strategy 3 (IMS) error: %s", e.message);
    }
  } else if (!foundOrgId) {
    logger.info("[adobe-http] getOrgId strategy 3: bỏ qua (không có token)");
  }

  // Strategy 4: nếu có orgId nhưng chưa có orgName → gọi JIL org detail
  if (foundOrgId && !foundOrgName && accessToken) {
    try {
      const res = await client.get(
        `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${foundOrgId}@AdobeOrg`,
        { timeout: TIMEOUTS.API, headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}`, "x-api-key": ADMIN_CONSOLE_CLIENT_ID } }
      );
      if (res.status === 200 && res.data) {
        foundOrgName = res.data.name || res.data.orgName || res.data.displayName || null;
        if (foundOrgName) logger.info("[adobe-http] Org Name (JIL detail): %s", foundOrgName);
      }
    } catch (e) {
      logger.debug("[adobe-http] getOrgId JIL detail error: %s", e.message);
    }
  }

  if (!foundOrgId) {
    logger.warn("[adobe-http] Không tìm được org ID qua bất kỳ strategy nào");
    return null;
  }

  logger.info("[adobe-http] Org result: id=%s, name=%s", foundOrgId, foundOrgName || "(null)");
  return { orgId: foundOrgId, orgName: foundOrgName };
}

/**
 * Lấy danh sách products.
 */
async function getProducts(client, orgId, accessToken) {
  if (!orgId) return { hasPlan: false, licenseStatus: "unknown", products: [] };

  logger.info("[adobe-http] Lấy products cho org %s...", orgId);

  const urls = [
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/products`,
    `${USER_MANAGEMENT_API}/v2/usermanagement/${orgId}@AdobeOrg/products/`,
  ];

  // Thử nhiều x-api-key vì token có thể được issued cho client_id khác nhau
  const clientIdsToTry = accessToken ? JIL_CLIENT_IDS : [ADMIN_CONSOLE_CLIENT_ID];

  for (const url of urls) {
    for (const clientId of clientIdsToTry) {
      try {
        const headers = { Accept: "application/json", "x-api-key": clientId };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        const res = await client.get(url, { headers });
        logger.info("[adobe-http] Products %s (x-api-key=%s) → status=%s", url, clientId, res.status);

        if (res.status === 200 && res.data) {
          const data = Array.isArray(res.data) ? res.data : res.data.products || res.data.items || [];

          if (data.length > 0) {
            logger.info("[adobe-http] Product raw fields: %s", JSON.stringify(Object.keys(data[0])).slice(0, 300));
            logger.info("[adobe-http] Product[0] sample: %s", JSON.stringify(data[0]).slice(0, 500));
          }

          const products = data.map((p) => {
            // JIL API: assignedQuantity = total licenses, provisionedQuantity = used
            let quota =
              p.assignedQuantity || p.licenseQuota || p.adminQuantity || p.licensedQuantity ||
              p.totalQuantity || p.seats || p.totalCount || p.quantity || 0;
            let used =
              p.provisionedQuantity || p.userCount || p.assignedCount ||
              p.usedCount || p.consumedQuantity || 0;

            if (quota === 0 && Array.isArray(p.licenseGroupSummaries)) {
              for (const lg of p.licenseGroupSummaries) {
                const lgQuota = lg.assignedQuantity || lg.totalQuantity || lg.licensedQuantity || lg.quantity || 0;
                const lgUsed = lg.provisionedQuantity || lg.usedQuantity || 0;
                if (lgQuota > quota) quota = lgQuota;
                if (lgUsed > used) used = lgUsed;
              }
            }

            const code = p.code || "";
            const shortName = p.shortName || p.name || p.productName || p.longName || code;
            const isFree = /complimentary|free\s+membership/i.test(shortName) || code === "CCFM";

            return {
              id: p.id || p.code || p.productId,
              code,
              name: shortName,
              licenseQuota: quota,
              userCount: used,
              isFree,
            };
          });

          const paidProducts = products.filter((p) => !p.isFree);
          const hasPlan = paidProducts.length > 0 && paidProducts.some((p) => (p.licenseQuota || 0) > 0);

          logger.info("[adobe-http] Products result: count=%s (paid=%s), hasPlan=%s, quotas=%s",
            products.length, paidProducts.length, hasPlan,
            products.map(p => `${p.code}:${p.licenseQuota}${p.isFree ? "(free)" : ""}`).join(","));
          return { hasPlan, licenseStatus: hasPlan ? "Paid" : "Expired", products };
        } // end if 200
      } catch (e) {
        logger.debug("[adobe-http] Products endpoint %s (x-api-key=%s) error: %s", url, clientId, e.message);
      }
    } // end clientId loop
  } // end url loop

  return { hasPlan: false, licenseStatus: "unknown", products: [] };
}

/**
 * Lấy Set<email> thực sự được gán product (qua JIL /products/{id}/users).
 * Đây là nguồn chính xác nhất — cùng endpoint Admin Console UI dùng.
 */
async function getProductUserEmails(client, orgId, accessToken, productIds) {
  const emails = new Set();
  if (!orgId || !accessToken || !productIds?.length) return emails;

  for (const pid of productIds) {
    if (!pid) continue;
    const url = `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/products/${pid}/users`;
    let fetched = false;
    for (const clientId of JIL_CLIENT_IDS) {
      if (fetched) break;
      try {
        const headers = {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": clientId,
        };
        const res = await client.get(url, { headers, timeout: 15000 });
        logger.info("[adobe-http] Product users %s (x-api-key=%s) → status=%s", pid, clientId, res.status);
        if (res.status === 200 && res.data) {
          const data = Array.isArray(res.data) ? res.data : res.data.users || res.data.items || [];
          if (data.length > 0) {
            logger.info("[adobe-http] ProductUser[0] sample: %s", JSON.stringify(data[0]).slice(0, 300));
          }
          for (const u of data) {
            const email = (u.email || u.username || "").toLowerCase().trim();
            if (email) emails.add(email);
          }
          fetched = true;
        }
      } catch (e) {
        logger.debug("[adobe-http] Product users %s (x-api-key=%s) error: %s", pid, clientId, e.message);
      }
    }
  }

  logger.info("[adobe-http] Product user emails: %s users across %s products", emails.size, productIds.length);
  return emails;
}

/**
 * Lấy danh sách users (tên + email). Không xác định product ở đây.
 */
async function getUsers(client, orgId, accessToken) {
  if (!orgId) return [];

  logger.info("[adobe-http] Lấy users cho org %s...", orgId);

  const urls = [
    `${USER_MANAGEMENT_API}/v2/usermanagement/users/${orgId}@AdobeOrg/0`,
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/users`,
  ];

  const clientIdsToTry = accessToken ? JIL_CLIENT_IDS : [ADMIN_CONSOLE_CLIENT_ID];

  for (const url of urls) {
    for (const clientId of clientIdsToTry) {
      try {
        const headers = { Accept: "application/json", "x-api-key": clientId };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        const res = await client.get(url, { headers });
        logger.info("[adobe-http] Users %s (x-api-key=%s) → status=%s", url, clientId, res.status);

        if (res.status === 200 && res.data) {
          const data = Array.isArray(res.data)
            ? res.data
            : res.data.users || res.data.items || res.data.resources || [];

          if (data.length > 0) {
            logger.info("[adobe-http] User raw fields: %s", JSON.stringify(Object.keys(data[0])).slice(0, 300));
            logger.info("[adobe-http] User[0] sample: %s", JSON.stringify(data[0]).slice(0, 500));
          }

          const users = data.map((u) => {
            const name =
              u.name ||
              (u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : null) ||
              (u.firstname ? `${u.firstname} ${u.lastname || ""}`.trim() : null);

            return {
              name,
              email: u.email || u.username || "",
            };
          });

          logger.info("[adobe-http] Users result: count=%s", users.length);
          return users;
        }
      } catch (e) {
        logger.debug("[adobe-http] Users endpoint %s (x-api-key=%s) error: %s", url, clientId, e.message);
      }
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
    "x-api-key": ADMIN_CONSOLE_CLIENT_ID,
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
    "x-api-key": ADMIN_CONSOLE_CLIENT_ID,
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
    const res = await client.post(url, commands, { headers, validateStatus: () => true });
    logger.info("[adobe-http] Remove user → status=%s", res.status);
    if (res.status !== 200) {
      const body = res.data ? (typeof res.data === "string" ? res.data : JSON.stringify(res.data)) : res.statusText;
      logger.warn("[adobe-http] Remove user UMAPI non-200: status=%s, body=%s", res.status, body?.slice(0, 500));
    }
    if (res.status === 200) return { success: true };

    const bodyStr = res.data ? (typeof res.data === "string" ? res.data : JSON.stringify(res.data)) : "";
    const apiKeyInvalid = res.status === 403 && (/403003|Api Key is invalid/i.test(bodyStr));
    if (apiKeyInvalid) {
      logger.warn("[adobe-http] Remove user: Api Key invalid (403003) → bỏ qua JIL, dùng browser xóa");
      return { success: false, error: "Api Key is invalid", apiKeyInvalid: true };
    }

    // Fallback: 403 khác (không phải invalid key) — thử thu hồi product qua JIL (hiếm khi thành công).
    logger.info("[adobe-http] Remove user fallback: thu hồi product qua JIL API...");
    const productInfo = await getProducts(client, orgId, accessToken);
    const paidProducts = (productInfo.products || []).filter((p) => !p.isFree && p.id);
    let removedAny = false;
    for (const p of paidProducts) {
      const delUrl = `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/products/${p.id}/users/${encodeURIComponent(email)}`;
      try {
        const delRes = await client.delete(delUrl, { headers, timeout: 15000, validateStatus: () => true });
        if (delRes.status >= 200 && delRes.status < 300) {
          logger.info("[adobe-http] Remove user JIL OK: product=%s, %s", p.id, email);
          removedAny = true;
        } else {
          logger.debug("[adobe-http] Remove user JIL product=%s → status=%s", p.id, delRes.status);
        }
      } catch (e) {
        logger.debug("[adobe-http] Remove user JIL product=%s error: %s", p.id, e.message);
      }
    }
    return { success: removedAny, error: removedAny ? null : `UMAPI ${res.status}, JIL fallback không xóa được` };
  } catch (e) {
    logger.error("[adobe-http] Remove user error: %s", e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Gắn product cho user đã có trong org.
 * Thử 2 cách:
 *   1) JIL API: POST .../products/{productId}/users
 *   2) UMAPI action: add { product: [name] }
 */
async function assignProductToUsers(client, orgId, accessToken, emails, products) {
  if (!products?.length || !emails?.length) return { success: false, error: "Thiếu product hoặc emails" };

  const hdrs = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "x-api-key": ADMIN_CONSOLE_CLIENT_ID,
  };

  // --- Cách 1: JIL API POST products/{pid}/users ---
  for (const p of products) {
    if (!p.id) continue;
    const url = `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/products/${p.id}/users`;
    try {
      const body = emails.map((e) => ({ email: e }));
      const res = await client.post(url, body, { headers: hdrs, timeout: 20000 });
      if (res.status >= 200 && res.status < 300) {
        logger.info("[adobe-http] assignProduct JIL OK: product=%s, users=%s", p.id, emails.length);
        return { success: true, method: "jil", productId: p.id };
      }
    } catch (e) {
      logger.debug("[adobe-http] assignProduct JIL %s error: %s", p.id, e.message);
    }
  }

  // --- Cách 2: UMAPI action add product ---
  const productNames = products.map((p) => p.name).filter(Boolean);
  if (productNames.length > 0) {
    const commands = emails.map((email) => ({
      user: email,
      requestID: `assign_${email}_${Date.now()}`,
      do: [{ add: { product: productNames } }],
    }));
    const url = `${USER_MANAGEMENT_API}/v2/usermanagement/action/${orgId}@AdobeOrg`;
    try {
      const res = await client.post(url, commands, { headers: hdrs, timeout: 20000 });
      if (res.status === 200) {
        logger.info("[adobe-http] assignProduct UMAPI OK: products=%s, users=%s", productNames.join(","), emails.length);
        return { success: true, method: "umapi", productNames };
      }
    } catch (e) {
      logger.debug("[adobe-http] assignProduct UMAPI error: %s", e.message);
    }
  }

  logger.warn("[adobe-http] assignProduct: tất cả phương thức thất bại cho %s users", emails.length);
  return { success: false, error: "Không gắn được product" };
}

/**
 * Remove product khỏi 1 user (dùng để đảm bảo admin không giữ product slot).
 * Thử UMAPI action remove → fallback JIL DELETE.
 */
async function removeProductFromUser(client, orgId, accessToken, email, products) {
  if (!products?.length || !email) return { success: false };

  const hdrs = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "x-api-key": ADMIN_CONSOLE_CLIENT_ID,
  };

  // UMAPI action: remove product
  const productNames = products.map((p) => p.name).filter(Boolean);
  if (productNames.length > 0) {
    const commands = [{
      user: email,
      requestID: `rmprod_${email}_${Date.now()}`,
      do: [{ remove: { product: productNames } }],
    }];
    const url = `${USER_MANAGEMENT_API}/v2/usermanagement/action/${orgId}@AdobeOrg`;
    try {
      const res = await client.post(url, commands, { headers: hdrs, timeout: 20000 });
      if (res.status === 200) {
        logger.info("[adobe-http] removeProductFromUser UMAPI OK: %s", email);
        return { success: true, method: "umapi" };
      }
    } catch (e) {
      logger.debug("[adobe-http] removeProductFromUser UMAPI error: %s", e.message);
    }
  }

  // Fallback: JIL DELETE products/{pid}/users/{email}
  for (const p of products) {
    if (!p.id) continue;
    const url = `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/products/${p.id}/users/${encodeURIComponent(email)}`;
    try {
      const res = await client.delete(url, { headers: hdrs, timeout: 20000 });
      if (res.status >= 200 && res.status < 300) {
        logger.info("[adobe-http] removeProductFromUser JIL OK: product=%s, %s", p.id, email);
        return { success: true, method: "jil" };
      }
    } catch (e) {
      logger.debug("[adobe-http] removeProductFromUser JIL %s error: %s", p.id, e.message);
    }
  }

  logger.warn("[adobe-http] removeProductFromUser failed for %s", email);
  return { success: false };
}

module.exports = { getOrgId, getProducts, getProductUserEmails, getUsers, addUsers, removeUser, assignProductToUsers, removeProductFromUser };

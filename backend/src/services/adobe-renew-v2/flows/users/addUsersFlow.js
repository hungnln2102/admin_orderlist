const logger = require("../../../../utils/logger");
const { TIMEOUTS, ADMIN_CONSOLE_API_BASE } = require("../../shared/constants");
const { fetchUsersViaApi } = require("../../shared/usersListApi");

function extractOrgIdFromUrl(url) {
  const m = String(url || "").match(/\/([A-Fa-f0-9]{20,})@AdobeOrg/);
  return m ? m[1] : null;
}

async function captureAdobeApiHeaders(page, orgId) {
  const orgToken = `${orgId}@AdobeOrg`;
  const reqPromise = page.waitForRequest(
    (req) => {
      const url = req.url();
      if (!url.includes("bps-il.adobe.io/jil-api/v2/organizations/")) return false;
      if (!url.includes(orgToken)) return false;
      const method = req.method();
      return method === "GET" || method === "HEAD";
    },
    { timeout: TIMEOUTS.NAVIGATE || 20000 }
  );

  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  const req = await reqPromise;
  return req.headers();
}

function normalizeBatchResult(userEmails, status, rawBody) {
  let parsed = null;
  try {
    parsed = JSON.parse(rawBody || "null");
  } catch (_) {
    parsed = null;
  }

  if (!Array.isArray(parsed)) {
    if (status >= 200 && status < 300) {
      return {
        done: [...userEmails],
        failed: [],
      };
    }
    return {
      done: [],
      failed: userEmails.map((email) => ({
        email,
        reason: `http_${status}`,
      })),
    };
  }

  const done = [];
  const failed = [];

  parsed.forEach((item, idx) => {
    const fallbackEmail = userEmails[idx];
    const email = String(item?.request?.email || fallbackEmail || "").trim().toLowerCase();
    if (!email) return;

    const code = Number(item?.responseCode);
    if (Number.isFinite(code) && code >= 200 && code < 300) {
      done.push(email);
      return;
    }

    const errCode = String(item?.response?.errorCode || `http_${status}`);
    failed.push({ email, reason: errCode });
  });

  const touched = new Set([...done, ...failed.map((x) => x.email)]);
  for (const email of userEmails) {
    if (!touched.has(email)) {
      failed.push({ email, reason: "unknown_batch_result" });
    }
  }

  return { done, failed };
}

function extractUserIdFromAbpCreateBody(rawBody) {
  try {
    const parsed = JSON.parse(rawBody || "{}");
    return String(parsed?.id || "").trim() || null;
  } catch (_) {
    return null;
  }
}

function normalizeAbpReason(status, rawBody) {
  try {
    const parsed = JSON.parse(rawBody || "{}");
    const detail = String(parsed?.detail || "").trim();
    if (detail) return detail;
    const type = String(parsed?.type || "").trim();
    if (type) return type.split("/").pop() || `http_${status}`;
  } catch (_) {}
  return `http_${status}`;
}

async function resolveAssignableProductId(page, orgToken, headers, options = {}) {
  if (options.productId) return String(options.productId).trim();

  const url =
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgToken}/products/` +
    "?include_created_date=true&include_expired=true&include_groups_quantity=true" +
    "&include_inactive=false&include_license_activations=true&include_license_allocation_info=false" +
    "&includeAcquiredOfferIds=false&includeConfiguredProductArrangementId=false" +
    "&includeLegacyLSFields=false&license_group_limit=100&processing_instruction_codes=administration,license_data";

  const resp = await page.context().request.get(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      authorization: headers.authorization || headers.Authorization || "",
      "x-api-key": headers["x-api-key"] || headers["X-Api-Key"] || "",
      "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
      "x-jil-feature": headers["x-jil-feature"] || "",
      origin: "https://adminconsole.adobe.com",
      referer: `https://adminconsole.adobe.com/${orgToken}/products`,
    },
    timeout: 30000,
  });
  const text = await resp.text().catch(() => "");
  if (!resp.ok()) {
    throw new Error(`products_api_fail_${resp.status()}: ${text.slice(0, 200)}`);
  }

  let list = [];
  try {
    const parsed = JSON.parse(text || "[]");
    list = Array.isArray(parsed) ? parsed : parsed?.items || parsed?.data || [];
  } catch (e) {
    throw new Error(`products_api_parse_fail: ${e.message}`);
  }

  const product =
    list.find((p) => String(p?.status || "").toLowerCase() !== "expired") ||
    list[0];
  const productId = String(product?.id || product?.productId || "").trim();
  if (!productId) throw new Error("product_id_missing");
  return productId;
}

async function createUserViaAbpApi(page, orgToken, email, headers) {
  const apiResponse = await page.context().request.post(
    `https://abpapi.adobe.io/abpapi/organizations/${orgToken}/users`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://www.adobe.com",
        referer: "https://www.adobe.com/",
        authorization: headers.authorization || headers.Authorization || "",
        "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
        "x-api-key": headers["x-api-key"] || headers["X-Api-Key"] || "",
      },
      data: { email: { primary: email } },
      timeout: 30000,
    }
  );
  const status = apiResponse.status();
  const rawBody = await apiResponse.text().catch(() => "");
  return {
    ok: status >= 200 && status < 300,
    status,
    rawBody,
    userId: extractUserIdFromAbpCreateBody(rawBody),
    reason: normalizeAbpReason(status, rawBody),
  };
}

async function assignProductViaPatch(page, orgToken, userId, productId, headers) {
  const apiResponse = await page.context().request.fetch(
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgToken}/users`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://adminconsole.adobe.com",
        referer: `https://adminconsole.adobe.com/${orgToken}/users`,
        authorization: headers.authorization || headers.Authorization || "",
        "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
        "x-api-key": headers["x-api-key"] || headers["X-Api-Key"] || "",
        "x-jil-feature": headers["x-jil-feature"] || "",
        "x-current-page": "1",
        "x-page-size": "10",
        "x-next-page": "",
        "x-request-id":
          headers["x-request-id"] || `renew-adobe-assign-${Date.now()}`,
      },
      data: [{ op: "add", path: `/${userId}/products/${productId}` }],
      timeout: 30000,
    }
  );
  const status = apiResponse.status();
  const rawBody = await apiResponse.text().catch(() => "");
  const patchParsed = normalizeBatchResult(["_one_"], status, rawBody);
  const oneFailedReason = patchParsed.failed[0]?.reason || `http_${status}`;
  return {
    ok: patchParsed.failed.length === 0 && patchParsed.done.length > 0,
    status,
    rawBody,
    reason: oneFailedReason,
  };
}

async function runAddUsersFlow(page, userEmails = [], options = {}) {
  const list = Array.isArray(userEmails)
    ? userEmails.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)
    : [];
  if (list.length === 0) {
    return {
      success: false,
      done: [],
      failed: [],
      unassigned: [],
      stoppedByPolicy: false,
    };
  }

  const orgId = extractOrgIdFromUrl(page.url()) || options.orgId || null;
  if (!orgId) {
    return {
      success: false,
      done: [],
      failed: list.map((email) => ({ email, reason: "org_id_missing" })),
      unassigned: [],
      stoppedByPolicy: false,
    };
  }

  const headers = await captureAdobeApiHeaders(page, orgId);
  const authorization = headers.authorization || headers.Authorization || "";
  const xApiKey = headers["x-api-key"] || headers["X-Api-Key"] || "";

  if (!authorization || !xApiKey) {
    logger.warn("[adobe-v2] runAddUsersFlow(API): thiếu authorization hoặc x-api-key", {
      orgId,
      hasAuthorization: !!authorization,
      hasXApiKey: !!xApiKey,
    });
    return {
      success: false,
      done: [],
      failed: list.map((email) => ({ email, reason: "auth_headers_missing" })),
      unassigned: [],
      stoppedByPolicy: false,
    };
  }

  const orgToken = `${orgId}@AdobeOrg`;
  const productId = await resolveAssignableProductId(page, orgToken, headers, options);
  const usersBefore = await fetchUsersViaApi(page, { orgId });
  const emailToUser = new Map(
    (usersBefore.users || [])
      .filter((u) => u?.email)
      .map((u) => [String(u.email).trim().toLowerCase(), u])
  );

  const done = [];
  const failed = [];
  const unassigned = [];
  for (const email of list) {
    const preUser = emailToUser.get(email) || null;
    let userId = String(preUser?.id || "").trim() || null;
    if (!userId) {
      const createRes = await createUserViaAbpApi(page, orgToken, email, headers);
      if (createRes.ok) {
        userId = createRes.userId || null;
      } else {
        const refreshed = await fetchUsersViaApi(page, { orgId });
        const existed = (refreshed.users || []).find(
          (u) => String(u?.email || "").trim().toLowerCase() === email
        );
        if (existed?.id) {
          userId = String(existed.id);
          logger.info(
            "[adobe-v2] runAddUsersFlow(API): user already exists after ABP error (%s): %s",
            createRes.reason,
            email
          );
        } else {
          failed.push({ email, reason: `create_user_failed:${createRes.reason}` });
          continue;
        }
      }
    }

    const assignRes = await assignProductViaPatch(page, orgToken, userId, productId, headers);
    if (assignRes.ok) {
      done.push(email);
      continue;
    }

    const refreshed = await fetchUsersViaApi(page, { orgId });
    const existed = (refreshed.users || []).find(
      (u) => String(u?.email || "").trim().toLowerCase() === email
    );
    const hasAssignedProduct =
      existed &&
      Array.isArray(existed.products) &&
      existed.products.some((p) => String(p?.id || p || "").trim() === productId);

    if (hasAssignedProduct) {
      done.push(email);
      logger.info(
        "[adobe-v2] runAddUsersFlow(API): assign returned error but product already present, treat success: %s",
        email
      );
      continue;
    }

    // User đã được tạo/thấy trong org nhưng chưa được gán đúng product.
    done.push(email);
    unassigned.push({ email, reason: `assign_product_failed:${assignRes.reason}` });
  }

  logger.info(
    "[adobe-v2] runAddUsersFlow(API): org=%s product=%s done=%d failed=%d unassigned=%d",
    orgToken,
    productId,
    done.length,
    failed.length,
    unassigned.length
  );

  const stoppedByPolicy =
    options.stopOnError === true && failed.length > 0;

  return {
    success: done.length > 0 && !stoppedByPolicy,
    done,
    failed,
    unassigned,
    stoppedByPolicy,
  };
}

module.exports = {
  runAddUsersFlow,
};

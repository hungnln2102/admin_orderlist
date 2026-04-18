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

async function reconcileFailedUsersByCurrentOrgUsers(page, orgId, normalized) {
  const done = [...normalized.done];
  const failed = [...normalized.failed];
  if (!failed.length) return { done, failed };

  let usersApi = null;
  try {
    usersApi = await fetchUsersViaApi(page, { orgId });
  } catch (err) {
    logger.warn(
      "[adobe-v2] runAddUsersFlow(API): reconcile users-api failed: %s",
      err.message
    );
    return { done, failed };
  }

  const existingEmails = new Set(
    (usersApi.users || [])
      .map((u) => String(u?.email || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const stillFailed = [];
  for (const item of failed) {
    const email = String(item?.email || "").trim().toLowerCase();
    const reason = String(item?.reason || "");
    if (email && existingEmails.has(email)) {
      logger.info(
        "[adobe-v2] runAddUsersFlow(API): user exists after batch error (%s), treat as added: %s",
        reason || "unknown",
        email
      );
      done.push(email);
      continue;
    }
    stillFailed.push(item);
  }

  return { done, failed: stillFailed };
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
      stoppedByPolicy: false,
    };
  }

  const orgId = extractOrgIdFromUrl(page.url()) || options.orgId || null;
  if (!orgId) {
    return {
      success: false,
      done: [],
      failed: list.map((email) => ({ email, reason: "org_id_missing" })),
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
      stoppedByPolicy: false,
    };
  }

  const payload = {
    users: list.map((email) => ({
      email,
      firstname: email.split("@")[0]?.slice(0, 40) || "User",
      lastname: "Adobe",
    })),
  };

  const apiResponse = await page.context().request.post(
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgId}@AdobeOrg/users:batch`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://adminconsole.adobe.com",
        referer: `https://adminconsole.adobe.com/${orgId}@AdobeOrg/users`,
        authorization,
        "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
        "x-api-key": xApiKey,
        "x-jil-feature": headers["x-jil-feature"] || "",
        "x-current-page": "1",
        "x-page-size": String(list.length),
        "x-next-page": "",
        "x-request-id": headers["x-request-id"] || `renew-adobe-${Date.now()}`,
      },
      data: payload,
      timeout: 30000,
    }
  );

  const status = apiResponse.status();
  const rawBody = await apiResponse.text().catch(() => "");
  const normalized = normalizeBatchResult(list, status, rawBody);
  const reconciled = await reconcileFailedUsersByCurrentOrgUsers(
    page,
    orgId,
    normalized
  );
  logger.info(
    "[adobe-v2] runAddUsersFlow(API): status=%s raw(done=%d,failed=%d) reconciled(done=%d,failed=%d)",
    status,
    normalized.done.length,
    normalized.failed.length,
    reconciled.done.length,
    reconciled.failed.length
  );

  const failed = reconciled.failed;

  const stoppedByPolicy =
    options.stopOnError === true && failed.length > 0;

  return {
    success: reconciled.done.length > 0 && !stoppedByPolicy,
    done: reconciled.done,
    failed,
    stoppedByPolicy,
  };
}

module.exports = {
  runAddUsersFlow,
};

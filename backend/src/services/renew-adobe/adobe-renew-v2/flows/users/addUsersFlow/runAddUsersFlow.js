const logger = require("../../../../../../utils/logger");
const { fetchUsersViaApi } = require("../../../shared/usersListApi");
const {
  CREATE_USER_CONCURRENCY,
  MAX_PRODUCT_PATCH_PER_REQUEST,
  hasProductId,
  extractOrgIdFromUrl,
} = require("./config");
const { normalizeBatchResult } = require("./responseHelpers");
const {
  captureAdobeApiHeaders,
  resolveAssignableProductId,
  createUserViaAbpApi,
  assignProductBatchViaPatch,
} = require("./apiClients");
const { resolveUserIdOrFail, applyAssignFallback } = require("./fallbacks");

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

  const preJil = options.precapturedJilHeaders;
  const usePreJil =
    preJil &&
    (preJil.authorization || preJil.Authorization) &&
    (preJil["x-api-key"] || preJil["X-Api-Key"]);
  let headers;
  if (usePreJil) {
    headers = preJil;
    logger.info("[adobe-v2] runAddUsersFlow: dùng precaptured JIL headers (bỏ 1x reload captureAdobe + bớt capture trong fetchUsersViaApi)");
  } else {
    headers = await captureAdobeApiHeaders(page, orgId);
  }
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
  const fetchOpts = { orgId, ...(usePreJil ? { reusableJilHeaders: preJil } : {}) };
  let usersSnapshot = await fetchUsersViaApi(page, fetchOpts);
  const buildEmailToUser = (snap) =>
    new Map(
      (snap.users || [])
        .filter((u) => u?.email)
        .map((u) => [String(u.email).trim().toLowerCase(), u])
    );
  let emailToUser = buildEmailToUser(usersSnapshot);

  const done = [];
  const noProduct = [];
  const failed = [];
  const unassigned = [];

  const toCreate = list.filter((e) => !emailToUser.has(e));
  for (let i = 0; i < toCreate.length; i += CREATE_USER_CONCURRENCY) {
    const slice = toCreate.slice(i, i + CREATE_USER_CONCURRENCY);
    await Promise.all(
      slice.map((email) => createUserViaAbpApi(page, orgToken, email, headers))
    );
  }

  usersSnapshot = await fetchUsersViaApi(page, fetchOpts);
  emailToUser = buildEmailToUser(usersSnapshot);

  for (const email of list) {
    if (emailToUser.has(email)) continue;
    const r = await resolveUserIdOrFail(page, orgToken, orgId, email, headers, null);
    if (r.userId) {
      usersSnapshot = await fetchUsersViaApi(page, fetchOpts);
      emailToUser = buildEmailToUser(usersSnapshot);
    } else {
      failed.push({ email, reason: r.createReason || "create_failed" });
    }
  }

  const needAssign = [];
  for (const email of list) {
    if (failed.some((f) => f.email === email)) continue;
    const u = emailToUser.get(email);
    if (!u) {
      failed.push({ email, reason: "user_not_found_after_create" });
      continue;
    }
    if (hasProductId(u, productId)) {
      done.push(email);
      continue;
    }
    const uid = String(u.id || "").trim();
    if (!uid) {
      failed.push({ email, reason: "user_id_missing" });
      continue;
    }
    needAssign.push({ email, userId: uid });
  }

  for (let i = 0; i < needAssign.length; i += MAX_PRODUCT_PATCH_PER_REQUEST) {
    const batch = needAssign.slice(i, i + MAX_PRODUCT_PATCH_PER_REQUEST);
    const { status, rawBody } = await assignProductBatchViaPatch(
      page,
      orgToken,
      batch,
      productId,
      headers
    );
    const emails = batch.map((b) => b.email);
    const norm = normalizeBatchResult(emails, status, rawBody);
    for (const email of norm.done) {
      done.push(email);
    }
    for (const f of norm.failed) {
      const b = batch.find((x) => x.email === f.email) || null;
      if (!b) {
        failed.push(f);
        continue;
      }
      const fb = await applyAssignFallback(
        page,
        orgId,
        orgToken,
        f.email,
        b.userId,
        productId,
        headers
      );
      if (fb.kind === "done") {
        done.push(f.email);
      } else if (fb.kind === "noProduct") {
        done.push(f.email);
        noProduct.push(f.email);
      } else {
        done.push(f.email);
        unassigned.push({ email: f.email, reason: fb.reason || f.reason });
      }
    }
  }

  const uniqueDone = [...new Set(done)];

  logger.info(
    "[adobe-v2] runAddUsersFlow(API): org=%s product=%s done=%d noProduct=%d failed=%d unassigned=%d (maxPatch=%d createConcurrency=%d)",
    orgToken,
    productId,
    uniqueDone.length,
    noProduct.length,
    failed.length,
    unassigned.length,
    MAX_PRODUCT_PATCH_PER_REQUEST,
    CREATE_USER_CONCURRENCY
  );

  const stoppedByPolicy = options.stopOnError === true && failed.length > 0;

  return {
    success: uniqueDone.length > 0 && !stoppedByPolicy,
    done: uniqueDone,
    noProduct,
    failed,
    unassigned,
    stoppedByPolicy,
  };
}

module.exports = {
  runAddUsersFlow,
};

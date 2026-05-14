const logger = require("../../../../../../utils/logger");
const { fetchUsersViaApi } = require("../../../shared/usersListApi");
const { hasProductId } = require("./config");
const { createUserViaAbpApi, assignProductViaPatch } = require("./apiClients");

async function resolveUserIdOrFail(page, orgToken, orgId, email, headers, preUser) {
  const userId = String(preUser?.id || "").trim() || null;
  if (userId) {
    return { userId, createReason: null };
  }
  const createRes = await createUserViaAbpApi(page, orgToken, email, headers);
  if (createRes.ok) {
    return { userId: createRes.userId || null, createReason: null };
  }
  const refreshed = await fetchUsersViaApi(page, { orgId });
  const existed = (refreshed.users || []).find(
    (u) => String(u?.email || "").trim().toLowerCase() === email
  );
  if (existed?.id) {
    logger.info(
      "[adobe-v2] runAddUsersFlow(API): user already exists after ABP error (%s): %s",
      createRes.reason,
      email
    );
    return { userId: String(existed.id), createReason: null };
  }
  return { userId: null, createReason: `create_user_failed:${createRes.reason}` };
}

async function applyAssignFallback(
  page,
  orgId,
  orgToken,
  email,
  userId,
  productId,
  headers
) {
  const assignRes = await assignProductViaPatch(page, orgToken, userId, productId, headers);
  if (assignRes.ok) {
    return { kind: "done" };
  }
  if (String(assignRes.reason || "").toLowerCase() === "trial_already_consumed") {
    logger.info(
      "[adobe-v2] runAddUsersFlow(API): user added but product not assigned (trial already consumed): %s",
      email
    );
    return { kind: "noProduct" };
  }
  const refreshed = await fetchUsersViaApi(page, { orgId });
  const existed = (refreshed.users || []).find(
    (u) => String(u?.email || "").trim().toLowerCase() === email
  );
  if (hasProductId(existed, productId)) {
    logger.info(
      "[adobe-v2] runAddUsersFlow(API): assign returned error but product already present, treat success: %s",
      email
    );
    return { kind: "done" };
  }
  return { kind: "unassigned", reason: `assign_product_failed:${assignRes.reason}` };
}

module.exports = {
  resolveUserIdOrFail,
  applyAssignFallback,
};

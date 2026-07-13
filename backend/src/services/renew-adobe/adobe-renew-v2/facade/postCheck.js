const logger = require("../../../../utils/logger");
const { getOrCreateAutoAssignUrlWithPage } = require("../autoAssignFlow");
const { runB15RemoveProductFromAdmin } = require("../removeProductAdminFlow");
const {
  applyAdobeProFlags,
  checkUserAssignedProduct,
} = require("../shared/usersListApi");
const {
  discoverAdobeProProductIdSet,
  computeCcpProductIdsToPersist,
} = require("../shared/accessChecks");
const { mergeRenewAdobeAlertConfig } = require("../../../../domains/renew-adobe/controller/usersSnapshotUtils");

async function buildCheckAccountResponse({
  result,
  sharedSession,
  email,
  password,
  options,
  pinnedFromDb,
  existingUrlAccess,
  forceProductCheck,
  mailBackupId,
  otpSource,
}) {
  const currentPage = sharedSession.page;
  const adminEmail = email.toLowerCase().trim();
  const verifiedSeatIds = Array.isArray(result.ccpSeatProductIds)
    ? result.ccpSeatProductIds
    : [];
  const discoveredIds =
    verifiedSeatIds.length > 0
      ? verifiedSeatIds
      : [...discoverAdobeProProductIdSet(result.users || [], adminEmail)];
  const nextPinned = computeCcpProductIdsToPersist({
    existingPinned: pinnedFromDb,
    discovered: discoveredIds,
    forceRefresh: forceProductCheck,
  });
  const flaggedUsers = applyAdobeProFlags(result.users || [], adminEmail, nextPinned, {
    verifiedCcpSeatProductIds: verifiedSeatIds,
  });
  const users = flaggedUsers.map((user) => ({
    id: user.id || null,
    authenticatingAccountId: user.authenticatingAccountId || null,
    name: user.name || "",
    email: (user.email || "").trim(),
    products: Array.isArray(user.products) ? user.products : [],
    hasPackage: user.hasProduct === true,
    product: user.hasProduct === true,
  }));
  const hasProducts = (result.products || []).length > 0;
  const hasActiveLicenseByCount = Number(result.contractActiveLicenseCount || 0) > 0;
  const adminProductCheck = checkUserAssignedProduct(
    users,
    adminEmail,
    adminEmail,
    nextPinned,
    { verifiedCcpSeatProductIds: verifiedSeatIds }
  );
  const adminHasProduct =
    (hasProducts || hasActiveLicenseByCount) && adminProductCheck.assigned === true;

  if (adminHasProduct) {
    try {
      await runB15RemoveProductFromAdmin(currentPage, email, {
        orgId: result.orgId || null,
      });
    } catch (error) {
      logger.warn("[adobe-v2] facade.checkAccount: B15 lỗi: %s", error.message);
    }
  }

  let urlAccess = existingUrlAccess || null;
  if ((hasProducts || hasActiveLicenseByCount) && !urlAccess && result.orgId) {
    try {
      const autoAssign = await getOrCreateAutoAssignUrlWithPage(
        currentPage,
        result.orgId,
        email,
        password,
        { mailBackupId, otpSource }
      );
      urlAccess = autoAssign.url;
      if (autoAssign.savedCookies && autoAssign.savedCookies.length) {
        result.cookies = autoAssign.savedCookies;
      }
    } catch (error) {
      logger.warn("[adobe-v2] facade.checkAccount: B14 lỗi: %s", error.message);
    }
  }

  const manageTeamMembers = users
    .filter((user) => (user.email || "").toLowerCase() !== adminEmail)
    .map((user) => ({
      id: user.id || null,
      authenticatingAccountId: user.authenticatingAccountId || null,
      name: user.name || "",
      email: (user.email || "").trim(),
      products: Array.isArray(user.products) ? user.products : [],
      hasPackage: user.product === true,
      product: user.product === true,
    }));

  const idProductStr = nextPinned.length > 0 ? nextPinned.join(",") : null;
  const snapshotProducts =
    nextPinned.length > 0 ? nextPinned.map((productId) => ({ id: String(productId) })) : null;

  const scrapedData = {
    orgName: result.org_name || null,
    userCount: manageTeamMembers.length,
    licenseStatus: result.license_status || "unknown",
    contractActiveLicenseCount: Number(result.contractActiveLicenseCount || 0),
    adobe_org_id: result.orgId || null,
    profileName: result.org_name || null,
    manageTeamMembers,
    adminConsoleUsers: users,
    urlAccess,
    id_product: idProductStr,
    snapshotProducts,
  };

  const partialIncoming = {
    cookies: result.cookies || [],
    savedAt: new Date().toISOString(),
    contractActiveLicenseCount: Number(result.contractActiveLicenseCount || 0),
  };
  if (nextPinned.length > 0) {
    partialIncoming.ccp_product_ids = nextPinned;
  }
  const savedCookies = mergeRenewAdobeAlertConfig(
    options.savedCookiesFromDb,
    partialIncoming,
    JSON.stringify(manageTeamMembers)
  );

  return {
    success: true,
    scrapedData,
    savedCookies,
  };
}

module.exports = { buildCheckAccountResponse };

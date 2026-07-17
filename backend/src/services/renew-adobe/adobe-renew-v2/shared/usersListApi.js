const {
  extractOrgTokenFromUrl,
  normalizeOrgToken,
  buildForwardHeadersFromCapturedRequest,
  checkUserAssignedProduct,
  inferAdobeProProductIdSet,
  applyAdobeProFlags,
  hasAdobeProAccessFromProducts,
  extractAbpUserProductRefs,
  mapAbpUserToSnapshotUser,
} = require("@/services/renew-adobe/adobe-renew-v2/shared/usersListApi/shared");
const { fetchUsersViaAbpApi } = require("@/services/renew-adobe/adobe-renew-v2/shared/usersListApi/abp");
const { fetchUsersViaApi, captureUsersApiHeaders } = require("@/services/renew-adobe/adobe-renew-v2/shared/usersListApi/jil");

module.exports = {
  fetchUsersViaApi,
  fetchUsersViaAbpApi,
  captureUsersApiHeaders,
  extractOrgTokenFromUrl,
  normalizeOrgToken,
  buildForwardHeadersFromCapturedRequest,
  checkUserAssignedProduct,
  inferAdobeProProductIdSet,
  applyAdobeProFlags,
  hasAdobeProAccessFromProducts,
  extractAbpUserProductRefs,
  mapAbpUserToSnapshotUser,
};

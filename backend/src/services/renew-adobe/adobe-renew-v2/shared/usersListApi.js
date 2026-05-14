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
} = require("./usersListApi/shared");
const { fetchUsersViaAbpApi } = require("./usersListApi/abp");
const { fetchUsersViaApi, captureUsersApiHeaders } = require("./usersListApi/jil");

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

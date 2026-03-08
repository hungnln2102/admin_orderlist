/**
 * Re-export Adobe check service từ module adobe (đã tách thành các component nhỏ).
 * Giữ tên file để không phá require() từ RenewAdobeController và scripts.
 */

const { getAdobeUserToken } = require("./adobe");

module.exports = {
  getAdobeUserToken,
};

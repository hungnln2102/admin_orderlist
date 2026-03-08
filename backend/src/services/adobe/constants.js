/**
 * Hằng số URL và cấu hình dùng cho Adobe login / Admin Console.
 */

/** URL trang đăng nhập Adobe (auth.services.adobe.com, redirect về www.adobe.com/home) */
const ADOBE_LOGIN_URL =
  "https://auth.services.adobe.com/en_US/index.html?client_id=homepage_milo&scope=AdobeID%2Copenid%2Cgnav%2Cpps.read%2Cfirefly_api%2Cadditional_info.roles%2Cread_organizations%2Caccount_cluster.read&response_type=token&redirect_uri=https%3A%2F%2Fwww.adobe.com%2Fhome&flow_type=token&idp_flow_type=login&locale=en_US";

/** URL trang Overview/Dashboard Admin Console */
const ADMIN_CONSOLE_OVERVIEW_URL = "https://adminconsole.adobe.com/";

/** URL trang Products Admin Console — kiểm tra có sản phẩm/gói hay không (tiện hơn Overview) */
const ADMIN_CONSOLE_PRODUCTS_URL = "https://adminconsole.adobe.com/products";

/** URL trang Users trên Admin Console */
const ADMIN_CONSOLE_USERS_URL = "https://adminconsole.adobe.com/users";

/** URL trang Users > Administrators (dùng cho flow xóa product khỏi user) */
const ADMIN_CONSOLE_USERS_ADMINISTRATORS_URL = "https://adminconsole.adobe.com/users/administrators";

/** URL trang Auto-assign products (lấy URL truy cập sản phẩm) */
const ADMIN_CONSOLE_AUTO_ASSIGN_URL = "https://adminconsole.adobe.com/products/auto-assign";

/** URL trang Tổng quan tài khoản (account.adobe.com) — dùng khi cần lấy org_name / profile name */
const ACCOUNT_ADOBE_URL = "https://account.adobe.com/?lang=vi";

module.exports = {
  ADOBE_LOGIN_URL,
  ADMIN_CONSOLE_OVERVIEW_URL,
  ADMIN_CONSOLE_PRODUCTS_URL,
  ADMIN_CONSOLE_USERS_URL,
  ADMIN_CONSOLE_USERS_ADMINISTRATORS_URL,
  ADMIN_CONSOLE_AUTO_ASSIGN_URL,
  ACCOUNT_ADOBE_URL,
};

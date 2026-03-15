# Adobe HTTP Service (Renew Adobe)

Service đăng nhập Adobe, lấy org/products/users, add/remove user, gán product. Dùng cho luồng Renew Adobe (check tài khoản, thêm/xóa user, auto-assign).

## Luồng chính

1. **Login** (`login.js`): Refresh token → Fast path (cookies + access_token) → SUSI HTTP → Playwright.
2. **Org** (`index.js` + `adminConsole.js`): Ưu tiên orgId từ URL Playwright → getOrgId (JIL/IMS).
3. **Data** (`index.js`): browserData (nếu Playwright đã fetch) hoặc getProducts + getUsers qua HTTP.
4. **Actions**: addUsers, removeUser, assignProductToUsers (adminConsole), autoAssignBrowser, deleteUsersBrowser.

## Cấu hình (env)

| Biến | Mô tả |
|------|--------|
| `ADOBE_PROXY` | Proxy (đổi IP khi bị block). VD: `http://host:3128` hoặc `http://user:pass@host:3128`. |
| `ADOBE_HTTP_PROXY` | Dự phòng cho ADOBE_PROXY. |
| `HTTPS_PROXY` / `HTTP_PROXY` | Proxy chung (dùng nếu không set ADOBE_*). |
| `PLAYWRIGHT_HEADLESS` | `false` = mở browser có giao diện (debug). Mặc định headless. |
| `ADOBE_TIMEOUT_LOGIN_PAGE` | Timeout (ms) trang login. Mặc định 45000. |
| `ADOBE_TIMEOUT_URL_ORG` | Chờ URL có @AdobeOrg. Mặc định 15000. |
| `ADOBE_TIMEOUT_API` | Timeout gọi JIL/IMS API. Mặc định 15000. |
| `ADOBE_TIMEOUT_TEST_TOKEN` | Timeout test token (fast path). Mặc định 10000. |
| `ADOBE_TIMEOUT_NAVIGATE` | Timeout navigate Admin Console. Mặc định 20000. |

## File chính

- `index.js` — Entry: checkAccount, addUserToAccount, removeUserFromAccount, addUsersWithProduct, autoDeleteUsers.
- `login.js` — loginViaHttp (refresh / fast path / SUSI / Playwright).
- `loginBrowser.js` — Playwright: form login, 2FA, fetchOrgDataInBrowser (browserData).
- `loginSusi.js` — SUSI HTTP + tryRefreshToken.
- `adminConsole.js` — getOrgId, getProducts, getUsers, addUsers, removeUser, assignProductToUsers, removeProductFromUser.
- `httpClient.js` — axios + tough-cookie, exportCookies/importCookies, proxy.
- `proxyConfig.js` — Parse ADOBE_PROXY / HTTP_PROXY, getPlaywrightProxyOptions, getAxiosProxyConfig.
- `fetchOrgDataBrowser.js` — Lấy org/products/users trong session Playwright (tránh gọi API sau khi đóng browser).
- `autoAssignBrowser.js` — Lấy/tạo URL auto-assign product.
- `deleteUsersBrowser.js` — Xóa user qua UI khi API 403/405.

## Cookie / token lưu DB (alert_config)

Object JSON: `{ cookies, accessToken, refreshToken?, savedAt }`. Khi đọc từ DB (TEXT/JSONB) nên parse string → object (normalizeSavedCookiesFromDb trong index.js).

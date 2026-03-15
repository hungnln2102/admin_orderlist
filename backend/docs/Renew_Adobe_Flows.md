# Renew Adobe — Tài liệu toàn bộ Flow

**Lưu ý:** Luồng V1 (Puppeteer, `services/adobe/`) đã được dọn; toàn bộ check/login/auto-assign dùng V2 (`adobe-http` + `adobe-renew-v2`, Playwright B1–B15).

## Tổng quan

Hệ thống Renew Adobe quản lý tài khoản Adobe Creative Cloud Admin Console:
- Check trạng thái license (Paid/Expired)
- Thêm/xóa user vào Admin Console
- Gửi thông báo Telegram khi license hết hạn

**Kiến trúc:**
```
Playwright headless login (~15-30s, chỉ khi cần)
        ↓
  Save session (cookies + access token → DB)
        ↓
  HTTP checker (Axios + tough-cookie, mọi operations)
```

- **Playwright** (Chromium headless) — chỉ dùng cho login (CAPTCHA, 2FA, OTP)
- **HTTP** (Axios + tough-cookie) — tất cả operations sau login
- RAM ~120-200MB khi login, ~0 khi chỉ dùng HTTP
- Cookies saved → lần check tiếp theo không cần mở browser

---

## Mục lục

1. [API Endpoints](#1-api-endpoints)
2. [Flow: Check tài khoản](#2-flow-check-tài-khoản)
3. [Flow: Login (Playwright → Session)](#3-flow-login-playwright--session)
4. [Flow: Delete User](#4-flow-delete-user)
5. [Flow: Add User](#5-flow-add-user)
6. [Flow: Add Users Batch](#6-flow-add-users-batch)
7. [Flow: Auto Delete Users](#7-flow-auto-delete-users)
8. [Flow: Scheduler (CRON)](#8-flow-scheduler-cron)
9. [Module Structure](#9-module-structure)
10. [DB Schema](#10-db-schema)
11. [Environment Variables](#11-environment-variables)

---

## 1. API Endpoints

| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/api/renew-adobe/queue-status` | Trạng thái (static, tương thích FE) |
| GET | `/api/renew-adobe/accounts` | Danh sách tài khoản |
| GET | `/api/renew-adobe/accounts/lookup?email=` | Tra cứu theo email |
| POST | `/api/renew-adobe/accounts/:id/check` | Check tài khoản |
| POST | `/api/renew-adobe/accounts/:id/delete-user` | Xóa 1 user |
| POST | `/api/renew-adobe/accounts/:id/add-user` | Thêm user(s) |
| POST | `/api/renew-adobe/accounts/add-users-batch` | Thêm user vào nhiều tài khoản |
| POST | `/api/renew-adobe/accounts/:id/auto-delete-users` | Xóa nhiều user |

**Files:** `routes/renewAdobeRoutes.js` → `controllers/RenewAdobeController/index.js` → `services/adobe-http/`

---

## 2. Flow: Check tài khoản

**Endpoint:** `POST /api/renew-adobe/accounts/:id/check`

```
Controller: runCheck → runCheckForAccountId(id)
│
├── 1. Load account từ DB (email, password_enc, alert_config, mail_backup_id)
│
├── 2. loginViaHttp(email, password, { savedCookies, mailBackupId })
│     ├── Fast path: có saved cookies → test HTTP session
│     │   ├── GET adminconsole.adobe.com → redirect check
│     │   ├── Hợp lệ → dùng luôn (KHÔNG mở browser)
│     │   └── Hết hạn → chuyển sang Playwright
│     │
│     └── Slow path: Playwright headless login (~15-30s)
│         ├── Launch Chromium → goto Adobe login
│         ├── Nhập email → 2FA/OTP → nhập password
│         ├── Skip progressive profile (backup email, phone)
│         ├── Chờ redirect thành công
│         ├── Navigate Admin Console → lấy thêm cookies
│         ├── Extract access token từ URL hash / localStorage
│         ├── ĐÓNG browser ngay
│         └── Import cookies vào HTTP client
│
├── 3. HTTP operations (Axios + cookies/token)
│     ├── getOrgId → GET adminconsole.adobe.com → parse @AdobeOrg
│     ├── getProducts → GET JIL API → { hasPlan, licenseStatus }
│     ├── getUsers → GET users endpoint → [{ name, email, product }]
│     └── exportCookies → save cho lần sau
│
└── 4. DB update:
      - org_name, user_count, license_status, last_checked
      - users_snapshot (JSON array)
      - alert_config (cookies → session cho lần sau)
```

---

## 3. Flow: Login (Playwright → Session)

**File:** `services/adobe-http/loginBrowser.js`

### Cookie login (fast, ~3s)
```
1. Import saved cookies → Playwright context
2. Goto adminconsole.adobe.com
3. Nếu URL chứa @AdobeOrg → session hợp lệ → return cookies
4. Nếu redirect về auth.services → cookies hết hạn → form login
```

### Form login (~15-30s)
```
1. Goto auth.services.adobe.com (client_id=aac_manage_teams)
2. Nhập email → Enter
3. 2FA check: Verify identity? → bấm Continue → waitForOtpAndFill
4. Nhập password → Enter
5. 2FA check lần 2 (nếu có)
6. Skip security prompt (nếu có)
7. Handle progressive profile (loop tối đa 6 vòng):
   ├── Add backup email? → bấm Not now
   ├── Verify identity? → OTP
   └── Verify phone? → bấm Not now / Skip
8. Chờ redirect → adobe.com hoặc @AdobeOrg
9. Navigate → adminconsole.adobe.com (lấy thêm cookies)
10. Extract access token
11. ĐÓNG browser
12. Return { cookies, accessToken }
```

### OTP / 2FA
```
waitForOtpAndFill:
├── Loop 60 lần (2 phút), mỗi 2s:
│   ├── URL chứa @AdobeOrg? → done
│   ├── Có ô password? → done
│   ├── Gọi mailOtpService.fetchOtpFromEmail({ mailBackupId })
│   └── Có OTP? → điền vào form → submit
└── Hết 2 phút → throw error
```

---

## 4. Flow: Delete User

**Endpoint:** `POST /api/renew-adobe/accounts/:id/delete-user`
**Body:** `{ userEmail: "email@example.com" }`

```
1. Login (Playwright nếu cần, HTTP nếu có cookies)
2. adobeHttp.removeUserFromAccount → gọi User Management API
3. runCheckForAccountId → check lại, lấy danh sách user mới
4. Return: { success, user_count }
```

---

## 5. Flow: Add User

**Endpoint:** `POST /api/renew-adobe/accounts/:id/add-user`
**Body:** `{ userEmail: "..." }` hoặc `{ userEmails: ["a@x.com"] }`

```
1. Login (Playwright nếu cần)
2. adobeHttp.addUserToAccount → gọi User Management API
3. runCheckForAccountId → check lại
4. Return: { success, user_emails, user_count, users_snapshot }
```

---

## 6. Flow: Add Users Batch

**Endpoint:** `POST /api/renew-adobe/accounts/add-users-batch`
**Body:** `{ accountIds: [1, 2, 3], userEmails: [...] }`

```
1. Phân bổ email theo slot (max 11 user/account)
2. Cho mỗi account: addUserToAccount → check lại
3. Return: { total_added, distribution, exceeded_emails }
```

---

## 7. Flow: Auto Delete Users

**Endpoint:** `POST /api/renew-adobe/accounts/:id/auto-delete-users`
**Body:** `{ userEmails: ["a@x.com", "b@x.com"] }`

```
1. Login 1 lần
2. Xóa lần lượt từng user qua API
3. Check lại sau khi xóa
4. Return: { deleted, failed }
```

---

## 8. Flow: Scheduler (CRON)

**File:** `scheduler/tasks/renewAdobeCheckAndNotify.js`
**Lịch:** 05:00 và 12:00 hàng ngày

```
1. Load tất cả account active
2. runCheckForAccountId(id) cho mỗi account
   └── Dùng saved cookies → HTTP (không mở browser nếu session còn sống)
3. Gửi Telegram cho account hết gói
```

---

## 9. Module Structure

```
services/adobe-http/
├── constants.js        URLs, Client ID, headers
├── httpClient.js       Axios + tough-cookie jar
├── loginBrowser.js     Playwright headless login
├── login.js            Session test + login orchestrator
├── adminConsole.js     HTTP: getOrgId, getProducts, getUsers, addUsers, removeUser
└── index.js            Entry point: checkAccount, addUser, removeUser, autoDelete
```

| Layer | Công nghệ | Khi nào dùng |
|-------|-----------|-------------|
| Login | Playwright Chromium | Chỉ khi cookies hết hạn (~15-30s) |
| Session test | HTTP (Axios) | Mỗi lần check (kiểm tra cookies còn sống) |
| Operations | HTTP (Axios) | Luôn luôn (products, users, add, remove) |

---

## 10. DB Schema

**Table:** `system_automation.accounts_admin` (schema đổi từ system_renew_adobe → system_automation)

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | int | Primary key |
| `email` | text | Email đăng nhập Admin |
| `password_enc` | text | Mật khẩu |
| `org_name` | text | Tên tổ chức |
| `license_status` | text | "Paid" / "Expired" / "unknown" |
| `license_detail` | text | Chi tiết license |
| `user_count` | int | Số user hiện tại |
| `users_snapshot` | text (JSON) | `[{ name, email, product }]` |
| `alert_config` | jsonb | Session cookies `{ cookies: [], savedAt }` |
| `last_checked` | timestamp | Lần check cuối |
| `is_active` | boolean | Dùng trong CRON |
| `created_at` | timestamp | Ngày tạo |
| `mail_backup_id` | int | FK đến bảng mail_backup (cho OTP) |
| `url_access` | text | URL truy cập sản phẩm |

---

## 11. Environment Variables

| Biến | Mô tả |
|------|-------|
| `ADOBE_OTP_MAIL_MAX_AGE_MINUTES` | Tuổi tối đa email OTP (0 = không giới hạn) |
| `ADOBE_OTP_IMAP_HOST` | IMAP host cho OTP |
| `ADOBE_OTP_IMAP_USER` / `MAILTEST` | IMAP user |
| `ADOBE_OTP_IMAP_PASSWORD` / `APPPASSWORD` | IMAP password |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port API server (default 3001) |
| `APP_TIMEZONE` | Timezone scheduler |

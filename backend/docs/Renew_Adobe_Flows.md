# Renew Adobe — Tài liệu toàn bộ Flow

**Lưu ý:** Luồng V1 (Puppeteer, `services/adobe/`) đã được dọn; toàn bộ check/login/auto-assign dùng một luồng duy nhất V2 tại `services/adobe-renew-v2` (Playwright B1–B15).

## Tổng quan

Hệ thống Renew Adobe quản lý tài khoản Adobe Creative Cloud Admin Console:
- Check trạng thái license (Paid/Expired)
- Thêm/xóa user vào Admin Console
- Gửi thông báo Telegram khi license hết hạn

**Kiến trúc:**
```
runCheckFlow (orchestrator)
        ↓
flows/login (credentials + otp + session lifecycle)
        ↓
flows/check (org_name + products)
        ↓
flows/users (goto users + add/delete + snapshot sync)
        ↓
flows/autoAssign (create/get auto-assign URL)
```

- Runtime dùng một luồng duy nhất `adobe-renew-v2` theo mô hình flow modules.
- Browser vẫn là Playwright Chromium, nhưng logic được tách theo từng flow con.
- Session/cookie được tái sử dụng; hết hạn mới chạy lại login.

---

## Mục lục

1. [API Endpoints](#1-api-endpoints)
2. [Flow: Check tài khoản](#2-flow-check-tài-khoản)
3. [Flow: Login (Playwright → Session)](#3-flow-login-playwright--session)
4. [Flow: Add User](#4-flow-add-user)
5. [Flow: Add Users Batch](#5-flow-add-users-batch)
6. [Flow: Auto Delete Users](#6-flow-auto-delete-users)
7. [Flow: Scheduler (CRON)](#7-flow-scheduler-cron)
8. [Module Structure](#8-module-structure)
9. [DB Schema](#9-db-schema)
10. [Environment Variables](#10-environment-variables)

---

## 1. API Endpoints

| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/api/renew-adobe/queue-status` | Trạng thái (static, tương thích FE) |
| GET | `/api/renew-adobe/accounts` | Danh sách tài khoản |
| GET | `/api/renew-adobe/accounts/lookup?email=` | Tra cứu theo email |
| POST | `/api/renew-adobe/accounts/:id/check` | Check tài khoản |
| POST | `/api/renew-adobe/accounts/:id/add-user` | Thêm user(s) |
| POST | `/api/renew-adobe/accounts/add-users-batch` | Thêm user vào nhiều tài khoản |
| POST | `/api/renew-adobe/accounts/:id/auto-delete-users` | Xóa 1 hoặc nhiều user |

**Files:** `routes/renewAdobeRoutes.js` → `controllers/RenewAdobeController/index.js` → `services/adobe-renew-v2/`

---

## 2. Flow: Check tài khoản

**Endpoint:** `POST /api/renew-adobe/accounts/:id/check`

```
Controller: runCheck → runCheckForAccountId(id)
│
├── 1. Load account từ DB (email, password_enc, alert_config, mail_backup_id)
│
├── 2. runCheckFlow(email, password, { savedCookies, mailBackupId, otpSource })
│     ├── B1: vào adminconsole
│     ├── Session lifecycle:
│     │   ├── có cookie dùng được → reuse session
│     │   └── hết hạn/chưa có → login lại
│     ├── Login flow cố định:
│     │   ├── email → Enter
│     │   ├── OTP nếu có
│     │   ├── password → Enter
│     │   └── OTP nếu có
│     ├── Check flows:
│     │   ├── check org_name
│     │   └── check product + license_status
│     └── Users snapshot + export cookies
│
└── 4. DB update:
      - org_name, user_count, license_status, last_checked
      - users_snapshot (JSON array)
      - cookie_config (cookies → session cho lần sau)
```

---

## 3. Flow: Login (Playwright → Session)

**File:** `services/adobe-renew-v2/loginFlow.js`

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
│   ├── Gọi otpProviderService theo otp_source (imap/tinyhost/hdsd)
│   └── Có OTP? → điền vào form → submit
└── Hết 2 phút → throw error
```

---

## 4. Flow: Add User

**Endpoint:** `POST /api/renew-adobe/accounts/:id/add-user`
**Body:** `{ userEmail: "..." }` hoặc `{ userEmails: ["a@x.com"] }`

```
1. Login (Playwright nếu cần)
2. adobeRenewV2.addUsersWithProductV2 → thêm user + gắn product theo flow V2
3. runCheckForAccountId → check lại
4. Return: { success, user_emails, user_count, users_snapshot }
```

---

## 5. Flow: Add Users Batch

**Endpoint:** `POST /api/renew-adobe/accounts/add-users-batch`
**Body:** `{ accountIds: [1, 2, 3], userEmails: [...] }`

```
1. Phân bổ email theo slot (max 11 user/account)
2. Cho mỗi account: addUserToAccount → check lại
3. Return: { total_added, distribution, exceeded_emails }
```

---

## 6. Flow: Auto Delete Users

**Endpoint:** `POST /api/renew-adobe/accounts/:id/auto-delete-users`
**Body:** `{ userEmails: ["a@x.com", "b@x.com"] }`

```
1. Login 1 lần
2. Xóa lần lượt từng user qua API
3. Check lại sau khi xóa
4. Return: { deleted, failed }
```

---

## 7. Flow: Scheduler (CRON)

**File:** `scheduler/tasks/renewAdobeCheckAndNotify.js`
**Lịch:** 05:00 và 12:00 hàng ngày

```
1. Load tất cả account active
2. runCheckForAccountId(id) cho mỗi account
   └── Dùng saved cookies → HTTP (không mở browser nếu session còn sống)
3. Gửi Telegram cho account hết gói
```

---

## 8. Module Structure

```
services/adobe-renew-v2/
├── flows/
│   ├── login/
│   ├── check/
│   ├── users/
│   └── autoAssign/
├── loginFlow.js
├── runCheckFlow.js
├── checkInfoFlow.js
├── autoAssignFlow.js
├── addUsersWithProductV2.js
├── deleteUsersV2.js
├── facade.js
└── index.js
```

| Layer | Công nghệ | Khi nào dùng |
|-------|-----------|-------------|
| Login | Playwright Chromium | Khi cookie/session không còn hợp lệ |
| Session lifecycle | Playwright + cookie store | Mỗi lần check trước khi login |
| Operations | Playwright flows | Check org/products/users, add/delete, auto-assign |

---

## 9. DB Schema

**Table:** `system_automation.accounts_admin` (schema đổi từ system_renew_adobe → system_automation)

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | int | Primary key |
| `email` | text | Email đăng nhập Admin |
| `password_encrypted` | text | Mật khẩu |
| `org_name` | text | Tên tổ chức |
| `license_status` | text | "Paid" / "Expired" / "unknown" |
| `license_detail` | text | Chi tiết license |
| `user_count` | int | Số user hiện tại |
| `users_snapshot` | text (JSON) | `[{ name, email, product }]` |
| `cookie_config` | jsonb | Session cookies `{ cookies: [], savedAt }` |
| `last_checked_at` | timestamp | Lần check cuối |
| `is_active` | boolean | Dùng trong CRON |
| `created_at` | timestamp | Ngày tạo |
| `mail_backup_id` | int | FK đến bảng mail_backup (cho OTP) |
| `access_url` | text | URL truy cập sản phẩm |
| `otp_source` | text | Nguồn OTP (`imap`, `tinyhost`, `hdsd`) |

---

## 10. Environment Variables

| Biến | Mô tả |
|------|-------|
| `ADOBE_OTP_MAIL_MAX_AGE_MINUTES` | Tuổi tối đa email OTP (0 = không giới hạn) |
| `ADOBE_OTP_IMAP_HOST` | IMAP host cho OTP |
| `ADOBE_OTP_IMAP_USER` / `MAILTEST` | IMAP user |
| `ADOBE_OTP_IMAP_PASSWORD` / `APPPASSWORD` | IMAP password |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port API server (default 3001) |
| `APP_TIMEZONE` | Timezone scheduler |

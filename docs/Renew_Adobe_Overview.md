# Renew Adobe — Tổng quan

Module **Renew Adobe** dùng để quản lý tài khoản Adobe (Admin Console): đăng nhập tự động bằng Puppeteer, lấy thông tin org/user, lưu cookie để lần sau đăng nhập nhanh, và xóa user trên Admin Console khi cần.

---

## Luồng hoạt động (tóm tắt)

```
┌─────────────────────────────────────────────────────────────────┐
│  Cách 1: Email + Password (lần đầu)                              │
│  Cách 2: Cookie (từ alert_config hoặc file) — lần sau           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              Puppeteer đăng nhập Adobe (2FA/OTP nếu có)
                              │
                              ▼
              Vào trang account/overview → check gói (getAdobeProductInfo)
                              │
              Có gói → license_status = Paid | Không có gói → Expired
                              │
                              ▼
              Vào Admin Console → scrape danh sách user
                              │
                              ▼
              Lưu cookie vào file + cột alert_config (DB)
              Cập nhật org_name, user_count, users_snapshot, license_status, ...
```

- **Lần đầu**: Login bằng email + password (có thể qua 2FA/OTP qua mail). Khi thành công, cookie được lưu vào **file** (`cookies/adobe_account_<id>.json`) và **cột `alert_config`** trong DB.
- **Lần sau**: Có thể dùng **Cookie login** (cookie lấy từ `alert_config` hoặc từ file), không cần nhập lại mật khẩu.

---

## API (Backend)

Base path: **`/api/renew-adobe`** (xem `backend/src/routes/renewAdobeRoutes.js`).

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/accounts` | Danh sách account + kiểm tra cột trống (`empty_fields`) |
| GET | `/accounts/lookup?email=...` | Tra cứu account theo email (chủ hoặc thành viên trong `users_snapshot`) |
| POST | `/check-with-cookies` | Đăng nhập chỉ bằng cookie. Body: `{ "cookiesFile": "path/to/file.json" }` |
| POST | `/accounts/:id/check` | Chạy check cho 1 account: login → scrape → cập nhật DB. Body tùy chọn: `{ "cookiesFile": "path" }` để dùng cookie thay tk/mk |
| POST | `/accounts/:id/delete-user` | Login → vào Admin Console → xóa user theo email. Body: `{ "userEmail": "..." }`, tùy chọn `{ "cookiesFile": "path" }` |

---

## Bảng DB: `system_renew_adobe.accounts`

(Schema: `backend/src/config/dbSchema.js` → `RENEW_ADOBE_SCHEMA.ACCOUNT`)

| Cột | Mô tả |
|-----|--------|
| `id` | PK |
| `email` | Email đăng nhập |
| `password_enc` | Mật khẩu (plain hoặc encrypted tùy cách lưu) |
| `org_name` | Tên profile/org (scrape từ account.adobe.com / Admin Console) |
| `license_status` | **Paid** (có gói) hoặc **Expired** (không có gói), từ getAdobeProductInfo. |
| `license_detail` | Không còn cập nhật từ luồng check; chỉ cần biết còn gói hay hết gói. |
| `user_count` | Số user trong org |
| `users_snapshot` | JSON: danh sách user `[{ name, email, role, access }, ...]` (từ Admin Console) |
| **`alert_config`** | **JSONB: lưu cookie để lần sau Cookie login.** Format: `{ "cookies": [...], "savedAt": "ISO date" }` |
| `last_checked` | Lần check gần nhất |
| `is_active` | Đang dùng hay tắt |
| `created_at` | Ngày tạo |
| `mail_backup_id` | ID mail backup (dùng cho OTP/2FA nếu có) |

- **Cookie**: Sau khi login thành công, cookie được lưu vào **file** (nếu bật) và vào **`alert_config`**. Lần sau có thể không gửi `cookiesFile`, backend sẽ dùng cookie trong `alert_config` để đăng nhập.

---

## Cấu trúc code (Backend)

- **Controller**: `backend/src/controllers/RenewAdobeController/index.js` — xử lý API, đọc/ghi DB.
- **Service**: `backend/src/services/adobeCheckService.js` → re-export từ `backend/src/services/adobe/index.js`.
- **Module adobe** — tách theo từng tính năng; tính năng mới chỉ cần gọi đúng bước cần thiết:
  - **`adobe/performLogin.js`** — chỉ đăng nhập (cookie hoặc email/password). Sau khi xong, page ở trạng thái đã đăng nhập (adobe.com hoặc @AdobeOrg). Không vào account.adobe.com hay Admin Console.
  - **`adobe/navigate.js`** — điều hướng: `navigateToAccountPage(page)`, `navigateToAdminConsoleOverview(page)`, `navigateToAdminConsoleUsers(page)`. Chỉ `page.goto` + chờ; không scrape.
  - **`adobe/scrapers.js`** — scrape / thao tác trên trang hiện tại: `getProfileNameFromAccountPage(page)` (page phải đã ở account.adobe.com), `getAdobeProductInfo(page)`, `scrapeAdminConsoleUsersPage(page)`, `deleteUserOnAdminConsole(page, userEmail)`.
  - **`adobe/constants.js`** — URL (login, account.adobe.com, Admin Console overview/users).
  - **`adobe/cookies.js`** — load/save cookie (file, DB object, từ page).
  - **`adobe/otpFlow.js`** — xử lý “Verify your identity”, OTP từ mail.
  - **`adobe/loginHelpers.js`** — fill form, bấm Continue, skip security.
  - **`adobe/index.js`** — điều phối: `getAdobeUserToken()` (API cũ, gộp login + tùy chọn account + Admin Console + scrape), `runWithSession(opts, fn)` (tạo browser, login, gọi `fn(page)`). Export thêm `performLogin`, `navigate`, `scrapers` để tính năng mới gọi trực tiếp.

**Vì sao có / không vào account.adobe.com:** Trang account.adobe.com chỉ dùng khi cần **org_name** (profile name, từ `p.plan-subtitle`). Luồng “check” đầy đủ có thể vào account trước rồi mới vào Admin Console; luồng **chỉ xóa user** không cần org_name nên bỏ qua account.adobe.com (option `needAccountProfile: false`). Tính năng mới có thể tự ghép: `performLogin` → `navigateToAdminConsoleUsers` → `deleteUserOnAdminConsole` mà không gọi `navigateToAccountPage`.

---

## Biến môi trường liên quan

| Env | Ý nghĩa |
|-----|--------|
| `ADOBE_SAVE_COOKIES` | `false` / `0` = không lưu cookie ra file (vẫn lưu vào `alert_config` nếu có). Mặc định bật. |
| `PUPPETEER_HEADLESS` | `true` = chạy Chrome **ngầm** (không mở cửa sổ). Nên bật trên server; khi đó có thể tăng đa luồng (ADOBE_CHECK_MAX_CONCURRENT). |
| `ADOBE_CHECK_MAX_CONCURRENT` | Số job check/delete chạy **đồng thời** (mặc định 2). Chạy headless có thể tăng 4–6 nếu server đủ RAM (~300MB/Chrome). |
| `ADOBE_CHECK_MAX_QUEUE` | Số job tối đa chờ trong hàng đợi (mặc định 50). Vượt thì API trả 429. |
| OTP/2FA (mail) | `mail_backup_id` trong account, hoặc `ADOBE_OTP_IMAP_*` / `MAILTEST` + `APPPASSWORD` — xem `mailOtpService.js` và `docs/Setup_OTP_Mail.md` nếu cần. |

---

## Dữ liệu sau khi Check thành công

- **`org_name`**: Tên profile (ví dụ tên người dùng trên account.adobe.com).
- **`users_snapshot`**: Mảng user từ Admin Console, mỗi phần tử có `name`, `email`, `role`, `access` (gói/sản phẩm). Có thể `JSON.parse(users_snapshot)` để lấy email và gói từng user.
- **`alert_config`**: Object `{ cookies, savedAt }` dùng cho Cookie login lần sau.

---

## Lưu ý nhanh

- Login thành công → cookie được lấy từ page (kể cả khi đang ở Admin Console) và lưu vào file + `alert_config`.
- Nếu cần 2FA/OTP: cấu hình mail (mail_backup hoặc env) để script đọc mã từ email và điền vào.
- Xóa user: gọi `POST /accounts/:id/delete-user` với `userEmail`; có thể kèm `cookiesFile` nếu muốn dùng cookie từ file thay vì từ DB.

---

## Check gói (getAdobeProductInfo)

Sau khi vào account/overview, luồng gọi **getAdobeProductInfo(page)** trên trang hiện tại:

- **Không có gói**: Trang chứa text "Không có sản phẩm hoặc dịch vụ nào" → `hasPlan: false` → **license_status = Expired**.
- **Có gói**: Tìm thấy tên sản phẩm (Creative Cloud, Acrobat, Photoshop, …) hoặc pattern "X trên Y" / "X / Y" → `hasPlan: true` → **license_status = Paid**.

Hàm nằm trong `adobe/scrapers.js`; được gọi trong `runAdminConsoleScrape` (sau getProfileNameFromAccountPage) và trong `scrapeOverviewThenUsers` (trên trang overview).

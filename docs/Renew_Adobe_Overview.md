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
| **`ZERO_DAYS_TOPIC_ID`** | Topic Telegram nhận thông báo khi **tài khoản không còn gói** (job chạy 05:00 và 12:00). Cần `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`. |

---

## Job check theo lịch (05:00 và 12:00)

Scheduler chạy job **check tài khoản Renew Adobe** lúc **05:00** và **12:00** (timezone theo `APP_TIMEZONE`, mặc định Asia/Ho_Chi_Minh):

1. Lấy danh sách tài khoản **active** (có email, password, `is_active` = true).
2. Với từng tài khoản gọi **check** (login → scrape overview → cập nhật `license_status`, `users_snapshot`, …).
3. Sau khi check xong, lọc các tài khoản có **license_status ≠ Paid** (hết gói).
4. Gửi **Telegram** vào topic **ZERO_DAYS_TOPIC_ID** cho từng tài khoản hết gói, nội dung:
   - **Tài khoản** (email)
   - **Org name** (`org_name`)
   - **Danh sách user** tổng hợp từ cột `users_snapshot` (JSON: name, email, role, …).

Cấu hình: đặt `ZERO_DAYS_TOPIC_ID` (và `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) trong `.env`. Task nằm ở `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js`, đăng ký trong `backend/src/scheduler/index.js`.

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

---

## Delete product (xóa product khỏi user)

**Vị trí trong luồng:** Chạy **trước** bước lấy url_access (trong `runAdminConsoleFlow`). Page đang ở trang **/users** (sau khi scrape users). Không goto trực tiếp `/users/administrators` — từ trang /users bấm link "Quản trị viên" rồi thực hiện B0–B4.

**Luồng (B-1 → B0–B4):**

1. **B-1** — Bấm link "Quản trị viên": `a[href*="/users/administrators"]` → chờ pathname có `/users/administrators` hoặc body có "Quản trị viên".
2. **B0** — Mở user detail: bấm nút "Xem chi tiết" / "View details" (user đầu tiên hoặc user theo `userEmail` nếu truyền).
3. **B1** — Menu 3 chấm: bấm `button[aria-label="More actions"]`.
4. **B2** — Chỉnh sửa sản phẩm: bấm `[data-key="EDIT_PRODUCTS_AND_GROUPS"]`.
5. **B3** — Xóa product: bấm `[data-testid="mini-product-card-close-button"]`.
6. **B4** — Lưu: bấm `[data-testid="cta-button"]` (không disabled).

**Code:** `backend/src/services/adobe/deleteProductFlow.js` — export `runDeleteProduct(page, opts)`. Gọi từ `adobe/index.js` **trước** block lấy `url_access` (page đã ở /users).

--------------------------------------------------------------------------------------------------------------------
1 tài khoản chỉ có thể add 10 slot, thêm với tài khoản đó nữa thì user_count = 11
Ví dụ tài khoản đó đang 8/11 rồi và 1 tài khoản mới 0/11.
User add thêm là 5 user. vậy thì chỗ này cần chạy luồng như nào

---

## Reply — Giới hạn slot và chia luồng khi add nhiều user

**Ràng buộc:** Mỗi tài khoản Admin Console có tối đa **11 user** (10 slot thêm + 1 chủ/owner). Khi `user_count` đã = 11 thì không add thêm được vào tài khoản đó.

**Ví dụ của bạn:** Tài khoản A đang **8/11**, tài khoản B **0/11**. Cần add **5 user**.

**Cách chạy luồng gợi ý:**

1. **Kiểm tra trước khi add**  
   Khi user chọn 1 account và nhập danh sách email (ví dụ 5 email):
   - Đọc `user_count` hiện tại của account đó (từ DB hoặc từ `users_snapshot.length`).
   - Số slot còn trống = `maxUsers - user_count` (ví dụ `11 - 8 = 3` cho account A).
   - Nếu số email cần add **≤** slot còn trống → gọi luồng add 1 lần cho account đó (API hiện tại: `POST /accounts/:id/add-user` với `userEmails: [ ... ]`).
   - Nếu số email **>** slot còn trống → có hai hướng:

2. **Hướng 1 — Chỉ add đủ slot, báo phần dư**  
   - Account A: add đủ **3 user** (đạt 11/11).
   - Trả về thành công kèm message kiểu: *"Đã thêm 3 user vào tài khoản A (đạt giới hạn 11). Còn 2 email chưa thêm — vui lòng chọn tài khoản khác (ví dụ B) để thêm."*
   - Frontend có thể hiển thị 2 email còn lại và gợi ý chọn account B, user bấm "Thêm" lần nữa cho account B với 2 email đó.

3. **Hướng 2 — Tự chia nhiều account (nếu UI cho phép chọn nhiều account)**  
   - User chọn sẵn nhiều account (A, B) và một danh sách 5 email.
   - Backend/frontend tính: A còn 3 slot → add 3 email vào A; B còn 11 slot → add 2 email còn lại vào B.
   - Gọi 2 lần add-user: một cho `accounts/:idA/add-user` với 3 email, một cho `accounts/:idB/add-user` với 2 email.

**Implementation gợi ý (backend):**

- Trong **RenewAdobeController** (handler add-user):
  - Lấy `user_count` hiện tại của account (từ DB hoặc từ snapshot).
  - Hằng số `MAX_USERS_PER_ACCOUNT = 11` (hoặc lấy từ cấu hình).
  - `slotLeft = MAX_USERS_PER_ACCOUNT - user_count`.
  - Nếu `userEmails.length > slotLeft`: chỉ lấy `userEmails.slice(0, slotLeft)` để add; trả về response có thêm field ví dụ `exceeded_emails: userEmails.slice(slotLeft)` và `message` nói rõ đã add bao nhiêu, còn bao nhiêu chưa thêm vì đạt giới hạn.

**Tóm tắt:** Luồng vẫn là một lần add nhiều email vào **một** account; cần thêm bước **kiểm tra slot** trước khi gọi Puppeteer, và nếu vượt slot thì chỉ add đủ slot rồi báo lại phần dư để frontend/user xử lý (chọn account khác hoặc thêm đợt sau).
--------------------------------------------------------------------------------------------------------------
https://adminconsole.adobe.com/users/administrators
(async () => {

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitUntil(fn, timeout = 15000, interval = 200) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const val = fn();
    if (val) return val;
    await sleep(interval);
  }
  throw new Error("Hết thời gian chờ");
}

const click = (el,name)=>{
  el.scrollIntoView({block:"center"});
  el.click();
  console.log("Clicked:",name);
};

try{

// B0 mở user detail
console.log("B0 mở user detail");

const openUserBtn = await waitUntil(() =>
  document.querySelector('button[aria-label^="Xem chi tiết"]')
);

click(openUserBtn,"open user detail");
await sleep(1200);


// B1 menu 3 chấm
console.log("B1 menu 3 chấm");

const moreBtn = await waitUntil(() =>
  document.querySelector('button[aria-label="More actions"]')
);

click(moreBtn,"more actions");
await sleep(800);


// B2 chỉnh sửa sản phẩm
console.log("B2 chỉnh sửa sản phẩm");

const editBtn = await waitUntil(() =>
  document.querySelector('[data-key="EDIT_PRODUCTS_AND_GROUPS"]')
);

click(editBtn,"edit products");
await sleep(1200);


// B3 xóa product
console.log("B3 xóa product");

const removeBtn = await waitUntil(() =>
  document.querySelector('[data-testid="mini-product-card-close-button"]')
);

click(removeBtn,"remove product");
await sleep(800);


// B4 save
console.log("B4 save");

const saveBtn = await waitUntil(()=>{
  const btn=document.querySelector('[data-testid="cta-button"]');
  return btn && !btn.disabled ? btn : null;
});

click(saveBtn,"save");

console.log("DONE");

}catch(e){
console.error(e);
}

})();

Thêm 1 component delete product vào hệ thống renew_adobe cho tôi
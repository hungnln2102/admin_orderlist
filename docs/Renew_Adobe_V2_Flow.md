# Luồng Adobe Renew V2 — Hệ thống mới (B1–B13)

Tài liệu đặc tả luồng **mới** thay thế hệ thống cũ. Toàn bộ login + check thực hiện qua **một session Playwright** theo đúng thứ tự dưới đây.

---

## 1. Tổng quan

| Bước | Mô tả | Trang / Hành động |
|------|--------|-------------------|
| B1 | Truy cập adobe.com | `https://www.adobe.com` |
| B2 | Bấm Sign in | Button "Sign in" |
| B3 | Điền tài khoản (email) | Input email |
| B4 | Bấm Continue | Button Continue |
| B5 | Check OTP từ IMAP | Chờ mail, lấy mã OTP |
| B6 | Điền OTP | Input OTP / one-time code |
| B7 | Điền password | Input password → Submit |
| B8 | Skip mobile | Bấm Skip / Not now (nếu có) |
| B9 | Login thành công | URL chuyển tới account.adobe.com |
| B10 | Bấm menu profile | `#unav-profile` hoặc `account-menu-trigger` |
| B11 | Lấy Profile Name | `.app__switchProfileName___qL7wd` (hoặc selector tương đương) = org_name |
| B12 | Check products | `https://adminconsole.adobe.com/products` — bảng product (tên, số lượng "X trên Y Giấy phép") |
| B13 | Lấy danh sách user | `https://adminconsole.adobe.com/users` — bảng user (Tên, Email, Sản phẩm) |

---

## 2. Selectors tham chiếu (từ note hiện tại)

- **B2 Sign in:** Button text "Sign in" trên adobe.com.
- **B10 Profile menu:** `#unav-profile` hoặc `[data-test-id="unav-profile"]`, hoặc `account-menu-trigger`.
- **B11 Profile name:** `h3.app__switchProfileName___qL7wd` (class có thể thay đổi theo build, cần fallback theo `[data-testid="mini-app-profile-switcher-open-button"]` gần đó hoặc cấu trúc view).
- **B12 Products:** Trang `/products`, bảng có `data-testid="table"`, ô tên: `[data-testid="product-name"]`, số lượng: `[data-testid="quantity-usage"]` (ví dụ "3 trên 10"), đơn vị: `[data-testid="unit-name"]` (Giấy phép).
- **B13 Users:** Trang `/users`, bảng có `aria-label="Người dùng"`, email: `[data-testid^="member-email-"]`, tên: link trong row, product icons trong cột Sản phẩm.

---

## 3. Output luồng V2

Sau khi chạy xong B1–B13, hệ thống cần có:

- **org_name** (Profile Name từ B11).
- **license_status:** suy từ B12 — có ít nhất một product có “X trên Y” với X < Y (còn slot) → Paid; không có hoặc toàn 0 → Expired.
- **products:** mảng `{ name, used, total, unit }` từ B12.
- **users:** mảng `{ name, email, hasProduct }` từ B13.
- **cookies** (và nếu có **accessToken** từ URL/localStorage) để lưu DB cho lần sau.

---

## 4. Vị trí code mới

- **Backend:** `admin_orderlist/backend/src/services/adobe-renew-v2/`
  - `runCheckFlow.js` — một hàm chạy toàn bộ B1–B13 (Playwright), trả về `{ org_name, license_status, products, users, cookies }`.
  - Dùng chung: `proxyConfig`, `mailOtpService` (OTP), logger.
- **Controller:** Gọi V2 khi bật feature (env) hoặc thay thế hẳn luồng cũ cho check account.

---

## 5. So với hệ thống cũ

| Hệ thống cũ | Hệ thống mới (V2) |
|-------------|-------------------|
| Nhiều strategy: fast path, SUSI, Playwright, getOrgId, JIL API… | Một luồng Playwright cố định: adobe.com → login → account.adobe.com → adminconsole. |
| Token/cookie phức tạp, dễ 401 | Lấy dữ liệu trực tiếp từ DOM trong cùng session, ít phụ thuộc token sau khi đóng browser. |
| Login từ adminconsole.adobe.com hoặc auth.services | Login từ **adobe.com** → Sign in → email → OTP → password → account.adobe.com. |

File này là đặc tả để triển khai module `adobe-renew-v2` và tích hợp vào Renew Adobe.

---

## 6. Trạng thái triển khai

- **Check tài khoản:** Luồng V1 đã bị loại. `checkAccount()` luôn gọi `checkAccountV2()` (B1–B13). Không còn dùng biến môi trường để bật/tắt.
- **Vị trí:** `admin_orderlist/backend/src/services/adobe-http/index.js` — `checkAccount()` = `checkAccountV2()`.
- **Module V2:** `admin_orderlist/backend/src/services/adobe-renew-v2/` — `runCheckFlow.js` (B1–B13), `index.js` (export).
- **Add user / Delete user / Auto-assign:** Vẫn dùng luồng cũ (loginAndGetOrg + JIL/UMAPI) trong adobe-http.

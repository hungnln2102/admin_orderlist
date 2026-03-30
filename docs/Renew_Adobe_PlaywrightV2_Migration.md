# Kế hoạch chuyển hẳn sang 1 hệ Playwright V2 (loại bỏ `adobeHttp`)

Cập nhật: 2026-03-22

## 1. Mục tiêu

- Dùng **duy nhất** luồng Playwright V2 cho Renew Adobe.
- Loại bỏ phụ thuộc runtime vào `backend/src/services/adobe-http/*`.
- Giữ ổn định API Renew Adobe hiện tại (trừ endpoint legacy nếu quyết định bỏ).

## 2. Điểm đang còn phụ thuộc `adobeHttp`

### 2.1 Controller

- `backend/src/controllers/RenewAdobeController/index.js`
  - `runCheckForAccountId` gọi `adobeHttp.checkAccount(...)`
  - `runAutoDeleteUsers` gọi `adobeHttp.autoDeleteUsers(...)`

### 2.2 Scheduler

- `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js`
  - `deleteUsersFromExpiredAccount` gọi `adobeHttp.autoDeleteUsers(...)`
- `backend/src/scheduler/tasks/cleanupExpiredAdobeUsers.js`
  - Import trực tiếp `autoDeleteUsers` từ `../../services/adobe-http`

### 2.3 V2 đang kéo config từ `adobe-http`

- `backend/src/services/adobe-renew-v2/runCheckFlow.js` (import `proxyConfig`, `constants`)
- `backend/src/services/adobe-renew-v2/loginFlow.js` (import `constants`)
- `backend/src/services/adobe-renew-v2/deleteUsersV2.js` (import `proxyConfig`)
- `backend/src/services/adobe-renew-v2/addUsersWithProductV2.js` (import `proxyConfig`)

## 3. Hạng mục cần sửa (theo thứ tự ưu tiên)

## P0 - Bắt buộc trước khi dọn legacy

- [ ] Tạo 1 facade Playwright V2 mới, ví dụ:
  - `backend/src/services/adobe-renew-v2/facade.js`
  - Expose các hàm tương thích nhu cầu hiện tại:
    - `checkAccountV2Flow(email, password, options)`
    - `removeUserFromAccountV2(email, password, userEmail, options)`
    - `autoDeleteUsersV2Flow(email, password, userEmails, options)`
    - `addUsersWithProductV2Flow(email, password, userEmails, options)` (nếu cần chuẩn hóa)
- [ ] Port logic cần giữ từ `adobe-http/index.js` sang facade mới:
  - Chuẩn hóa cookies từ DB (`normalizeSavedCookiesFromDb`)
  - Check flow B1-B13 qua `runCheckFlow`
  - Logic B14 lấy `url_access` nếu chưa có
  - Logic B15 remove product admin nếu cần
  - Chuẩn output giống format controller đang dùng (`{ success, scrapedData, savedCookies }`)
- [ ] Đổi `RenewAdobeController` sang gọi facade V2 mới, không gọi `adobeHttp`.
- [ ] Đổi 2 scheduler task sang gọi facade V2 mới, không import `services/adobe-http`.

## P1 - Tách phụ thuộc module dùng chung

- [ ] Tách `constants` và `proxyConfig` khỏi `adobe-http` sang vùng shared cho V2, ví dụ:
  - `backend/src/services/adobe-renew-v2/shared/constants.js`
  - `backend/src/services/adobe-renew-v2/shared/proxyConfig.js`
- [ ] Sửa import ở các file V2 để không còn `../adobe-http/*`.

## P2 - Dọn endpoint/file legacy

- [ ] Route/API:
  - Xem xét bỏ `POST /api/renew-adobe/check-with-cookies` (đã legacy)
  - Xem xét bỏ `GET /api/renew-adobe/queue-status` nếu frontend không dùng
- [ ] Xóa file legacy không còn tham chiếu:
  - `backend/src/services/adobeCheckService.js`
  - Toàn bộ thư mục `backend/src/services/adobe-http/*` (sau khi đã tách shared)
- [ ] Cập nhật docs để bỏ mô tả "hybrid HTTP + Playwright"
  - `docs/Renew_Adobe_V2.md`
  - `docs/Renew_Adobe_V2_Flow.md`
  - `docs/Renew_Adobe_Check_Flow.md`

## 4. Checklist sửa theo file

- [ ] `backend/src/services/adobe-renew-v2/facade.js` (mới)
- [ ] `backend/src/services/adobe-renew-v2/index.js` (export facade APIs)
- [ ] `backend/src/controllers/RenewAdobeController/index.js` (đổi call site)
- [ ] `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js` (đổi call site)
- [ ] `backend/src/scheduler/tasks/cleanupExpiredAdobeUsers.js` (đổi import/call site)
- [ ] `backend/src/services/adobe-renew-v2/runCheckFlow.js` (đổi import shared)
- [ ] `backend/src/services/adobe-renew-v2/loginFlow.js` (đổi import shared)
- [ ] `backend/src/services/adobe-renew-v2/deleteUsersV2.js` (đổi import shared)
- [ ] `backend/src/services/adobe-renew-v2/addUsersWithProductV2.js` (đổi import shared)
- [ ] `backend/src/routes/renewAdobeRoutes.js` (nếu bỏ endpoint legacy)

## 5. Tiêu chí hoàn thành

- [ ] Không còn reference `adobeHttp` trong `backend/src`.
- [ ] Không còn import `services/adobe-http` trong `backend/src`.
- [ ] Toàn bộ flow chính vẫn chạy:
  - Check account
  - Auto-delete user (1 hoặc nhiều user)
  - Batch add user + assign product
  - Check-all SSE + auto-assign
  - Cron check + cleanup
- [ ] Log runtime chỉ còn prefix liên quan V2 (không còn phụ thuộc vào layer HTTP cũ).

## 6. Cách verify nhanh sau khi sửa

1. Chạy grep xác nhận đã cắt phụ thuộc:
   - `rg -n "adobeHttp|services/adobe-http" backend/src`
2. Test tay các API:
   - `POST /api/renew-adobe/accounts/:id/check`
   - `POST /api/renew-adobe/accounts/:id/auto-delete-users`
   - `POST /api/renew-adobe/accounts/add-users-batch`
3. Test scheduler:
   - Trigger task check + cleanup ở môi trường dev/staging.
4. So sánh dữ liệu DB trước/sau:
   - `users_snapshot`, `user_count`, `license_status`, `url_access`, `alert_config`.

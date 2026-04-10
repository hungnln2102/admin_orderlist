# Refactor Function Flow + Task Plan

## Mục tiêu tài liệu

- Tổng quan các function quan trọng đang có trong hệ thống và nơi gọi đến.
- Mô tả luồng backend chi tiết để dễ audit/tinh gọn.
- Chốt kế hoạch refactor theo từng trang/từng module nhỏ.
- Quy tắc làm việc: mỗi batch xong sẽ báo bạn test, chỉ refactor tiếp khi bạn xác nhận OK.

---

## 1) Backend function map (luồng scheduler + thông báo + renewal)

### 1.1 Scheduler entrypoint

- **File định nghĩa**: `backend/src/scheduler/index.js`
- **Function chính**
  - `updateDatabaseTask` (từ `createUpdateDatabaseTask(...)`)
  - `notifyZeroDaysRemainingTask` (từ `createNotifyZeroDaysTask(...)`)
  - `notifyFourDaysRemainingTask` (từ `createNotifyFourDaysTask(...)`)
  - `renewAdobeCheckAndNotifyTask` (từ `createRenewAdobeCheckAndNotifyTask(...)`)
  - `cleanupExpiredAdobeUsersTask` (từ `createCleanupExpiredAdobeUsersTask(...)`)
- **Nơi gọi**
  - Được cron gọi trực tiếp trong cùng file:
    - `00:01` -> `runCronSafe` -> `updateDatabaseTask`
    - `18:00` -> `runZeroDaysNotificationSafe` -> `notifyZeroDaysRemainingTask`
    - `07:00` -> `runFourDaysNotificationSafe` -> `notifyFourDaysRemainingTask`
    - mỗi giờ -> `runRenewAdobeCheckSafe` -> `renewAdobeCheckAndNotifyTask`
    - `23:30` -> `runCleanupExpiredAdobeUsersSafe` -> `cleanupExpiredAdobeUsersTask`

### 1.2 Cập nhật trạng thái đơn theo ngày

- **File định nghĩa**: `backend/src/scheduler/tasks/updateDatabaseTask.js`
- **Function**
  - `createUpdateDatabaseTask(pool, getSqlCurrentDate, enableDbBackup)`
  - `getLastRunAt()`
  - `setLastRunAt(value)`
- **Nơi gọi**
  - `createUpdateDatabaseTask` được gọi trong `backend/src/scheduler/index.js`
  - `getLastRunAt` được gọi trong `backend/src/scheduler/index.js` (`getSchedulerStatus`)
- **Luồng**
  - `PAID/RENEWAL` + `days_left < 0` -> update `EXPIRED`
  - xóa mapping account theo order vừa expired (`removeMappingsByOrders`)
  - `PAID` + `0 <= days_left <= 4` -> update `RENEWAL`

### 1.3 Thông báo 0 ngày còn lại (hết hạn)

- **File định nghĩa**: `backend/src/scheduler/tasks/notifyZeroDays.js`
- **Function**
  - `createNotifyZeroDaysTask(pool, getSqlCurrentDate)`
- **Nơi gọi**
  - được tạo và cron gọi trong `backend/src/scheduler/index.js`
  - gọi ra notification adapter: `sendZeroDaysRemainingNotification(...)`
- **Rule hiện tại (đã chỉnh)**
  - Chỉ lấy đơn `days_left = 0` **và** `status = Cần Gia Hạn`

### 1.4 Thông báo 4 ngày còn lại (cần gia hạn)

- **File định nghĩa**: `backend/src/scheduler/tasks/notifyFourDays.js`
- **Function**
  - `createNotifyFourDaysTask(pool, getSqlCurrentDate)`
- **Nơi gọi**
  - được tạo và cron gọi trong `backend/src/scheduler/index.js`
  - gọi `computeOrderCurrentPrice(client, row)` từ `backend/webhook/sepay/renewal.js`
  - gọi `sendFourDaysRemainingNotification(...)`
- **Rule hiện tại (đã chỉnh)**
  - SQL lọc: `days_left = 4` và `status = Cần Gia Hạn`
  - Bỏ qua đơn prefix `MAVT` (không gửi thông báo đến hạn)
  - Đơn khuyến mãi (`MAVK`) khi tính giá thông báo:
    - `pct_promo` trống/0 -> giá khách lẻ
    - `pct_promo` có giá trị -> giá promo

### 1.5 Renewal pricing + tính giá hiện tại cho thông báo

- **File định nghĩa**: `backend/webhook/sepay/renewal.js`
- **Function public**
  - `runRenewal(orderCode, options)`
  - `fetchOrderState(orderCode)`
  - `isEligibleForRenewal(statusValue, expiryDate)`
  - `queueRenewalTask(orderCode, options)`
  - `processRenewalTask(orderCode)`
  - `fetchRenewalCandidates()`
  - `runRenewalBatch(options)`
  - `computeOrderCurrentPrice(client, orderRow)`
- **Nơi gọi**
  - `runRenewal(...)` được gọi tại `backend/src/controllers/Order/renewRoutes.js`
  - `computeOrderCurrentPrice(...)` được gọi tại `backend/src/scheduler/tasks/notifyFourDays.js`
- **Hàm nội bộ quan trọng**
  - `calculateRenewalPricing(...)` -> dùng `calculateOrderPricingFromResolvedValues(...)` từ `backend/src/services/pricing/core.js`

### 1.6 Telegram notification lib

- **Public re-export**
  - `backend/src/services/telegramOrderNotification.js` -> re-export `telegramOrderNotificationLib`
  - `backend/src/services/telegramOrderNotificationLib/index.js`
- **Function và caller chính**
  - `sendOrderCreatedNotification(order)`
    - định nghĩa: `.../sendOrderCreated.js`
    - gọi bởi:
      - `backend/src/controllers/Order/crud/createOrder.js`
      - `backend/src/routes/testTelegram.js`
  - `sendZeroDaysRemainingNotification(orders)`
    - định nghĩa: `.../sendZeroDays.js`
    - gọi bởi:
      - `backend/src/scheduler/tasks/notifyZeroDays.js`
      - `backend/src/routes/testTelegram.js`
  - `sendFourDaysRemainingNotification(orders)`
    - định nghĩa: `.../sendFourDays.js`
    - gọi bởi:
      - `backend/src/scheduler/tasks/notifyFourDays.js`
  - `sendAdobeZeroDaysNotification(accounts)`
    - định nghĩa: `.../sendAdobeZeroDays.js`
    - gọi bởi:
      - `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js`

### 1.7 Message builders

- **File định nghĩa**: `backend/src/services/telegramOrderNotificationLib/messageBuilders.js`
- **Function**
  - `buildOrderCreatedMessage(order, paymentNote)` -> caller: `sendOrderCreated.js`
  - `buildDueOrderMessage(order, index, total)` -> caller: `sendFourDays.js`
  - `buildExpiredOrderMessage(order, index, total)` -> caller: `sendZeroDays.js`

---

## 2) Frontend function map (service hub routes)

### 2.1 Shared service hub route helpers

- **File định nghĩa**: `Website/my-store/apps/web/src/lib/constants/serviceHubRoutes.ts`
- **Function**
  - `normalizePathname(pathname)`
  - `isFixAdobeEduPath(pathname)`
  - `isRenewAdobePath(pathname)`
  - `isRenewZoomPath(pathname)`
  - `isNetflixPath(pathname)`
- **Nơi gọi**
  - `Website/my-store/apps/web/src/features/CheckProfile/ServicesSidebar.tsx`
  - `Website/my-store/apps/web/src/hooks/useRouter.ts`

---

## 3) Kế hoạch refactor theo từng trang/module nhỏ (có checkpoint test)

## Quy tắc bắt buộc khi triển khai

- Mỗi batch chỉ gồm 1 trang/1 module nhỏ.
- Xong batch -> tôi gửi:
  - danh sách file đã đổi
  - thay đổi hành vi (nếu có)
  - checklist test nhanh
- **Dừng lại cho bạn test**.
- Chỉ bắt đầu batch tiếp theo khi bạn xác nhận: `OK page/module X`.

## Backlog theo thứ tự đề xuất

- [ ] **Batch 01 - Website `/system/adobe-edu` (`checkprofile.tsx`)**
  - Tách page lớn thành: `components/`, `hooks/`, `api/`, `types`.
  - Giữ nguyên route + UI/UX + payload API.
  - Checkpoint test:
    - Kiểm tra profile thành công/hết hạn/error
    - OTP send/verify

- [ ] **Batch 02 - Website `/system/renew-adobe` (`RenewAdobePage.tsx`)**
  - Tách status renderer + submit handlers + api adapter.
  - Chuẩn hóa state machine cho `check-success`, `expired`, `outside-order`.
  - Checkpoint test:
    - active/no_order/order_expired
    - activate-success

- [ ] **Batch 03 - Website Service Hub sidebar/router**
  - Hoàn tất clean alias route cũ (`/system`, `/check-profile`, `/otp`) qua 1 map duy nhất.
  - Checkpoint test:
    - click 4 mục sidebar đổi URL đúng
    - reload trên từng URL vào đúng page

- [ ] **Batch 04 - Backend scheduler domain split**
  - Tách `scheduler/tasks/*` thành:
    - `queries/` (lấy data)
    - `rules/` (business condition)
    - `dispatchers/` (gửi Telegram)
  - Checkpoint test:
    - run task `notifyFourDays`, `notifyZeroDays` ở test mode
    - số lượng đơn gửi và log skip đúng rule

- [ ] **Batch 05 - Backend telegram notification lib split**
  - Tách builder + sender + retry policy + payload schema.
  - Có unit-like smoke script cho `buildDueOrderMessage` / `buildExpiredOrderMessage`.
  - Checkpoint test:
    - `/api/test-telegram` và `/api/test-telegram/zero-days`

- [ ] **Batch 06 - Backend renewal pricing flow**
  - Tách `renewal.js` theo module:
    - `pricing-resolver`
    - `eligibility`
    - `task-queue`
  - Checkpoint test:
    - `runRenewal` với đơn mẫu MAVL/MAVK/MAVT
    - verify giá cho notify 4 ngày

- [ ] **Batch 07 - Pricing/Orders frontend (`admin_orderlist`)**
  - Tách tiếp các hook lớn trong `features/pricing` và `features/orders`.
  - Checkpoint test:
    - thêm/sửa/xóa NCC
    - thay đổi giá, reload bảng giá, mở row details

---

## 4) Nhận diện điểm tối ưu tiếp theo (backend)

- Có lặp SQL date arithmetic giữa `updateDatabaseTask`, `notifyFourDays`, `notifyZeroDays` -> nên trích xuất query builder chung.
- Rule business đang phân tán (status + prefix + pricing rule) -> nên gom vào `rules/` để tránh drift logic.
- `renewal.js` đang vừa orchestration vừa pricing vừa queue -> nên tách use-case theo guardrails domain.
- Telegram retry/topic fallback đang lặp lại ở `sendFourDays` và `sendZeroDays` -> nên gom thành sender chung.

---

## 5) Cách cập nhật tài liệu trong quá trình refactor

- Sau mỗi batch, tôi sẽ cập nhật:
  - [Updated] function map
  - [Done] task đã hoàn tất
  - [Next] task chờ bạn xác nhận trước khi làm tiếp


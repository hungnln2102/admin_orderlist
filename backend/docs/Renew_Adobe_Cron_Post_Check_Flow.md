# Renew Adobe — Luồng mở rộng sau cron check

Mục tiêu: bổ sung 2 luồng tự động chạy sau khi check tài khoản Adobe, nhằm tự fix user còn thiếu gói và dọn user hết hạn vào 23h30.

---

## 1) Bối cảnh hiện tại

- Job cron check Adobe đang chạy tại `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js`.
- Luồng check all hiện đi qua `runCheckAllAccountsFlow(...)` và có thể chạy `autoAssignUsers(...)`.
- Đã có các thành phần sẵn:
  - check account: `runCheckForAccountId`
  - add user hàng loạt: `adobeRenewV2.addUsersWithProductV2` + `autoAssignUsers`
  - cleanup 23h30: `cleanupExpiredAdobeUsersTask` (cron tại `scheduler/index.js`)

---

## 2) Yêu cầu nghiệp vụ mới

### A. Sau cron check tài khoản, tự động fix account chưa được fix

- Sau khi check xong toàn bộ account, hệ thống phải xác định các user "chưa được fix".
- "Chưa được fix" = user đang có đơn hợp lệ nhưng chưa có product Adobe tương ứng trên admin account.
- Hệ thống phải tự add bằng luồng batch (hệ thống add số lượng lớn), không add thủ công từng user.

### B. Lúc 23h30, dọn user hết hạn sau khi check xong

- Vào 23h30: chạy check account trước, rồi xử lý các đơn có số ngày còn lại `<= 0`.
- Các user thuộc đơn `<= 0` phải bị xóa khỏi Adobe admin account tương ứng.
- Sau khi xóa, phải đồng bộ lại danh sách user (`users_snapshot`, `user_count`, mapping liên quan).

---

## 3) Thiết kế luồng đề xuất

## 3.1 Luồng hourly (cron check Adobe mỗi giờ)

1. Chạy `runCheckAllAccountsFlow` (đã có).
2. Khi check xong, gọi bước `autoFixUnassignedUsers`.
3. `autoFixUnassignedUsers`:
   - Lấy danh sách đơn Renew Adobe còn hiệu lực.
   - So với `users_snapshot`/mapping hiện tại để tìm email chưa có product.
   - Dùng batch add (`autoAssignUsers` hoặc service batch tương đương) để add theo slot account.
4. Ghi log tổng kết:
   - tổng email cần fix
   - đã add thành công
   - còn lại/chưa xử lý được
   - danh sách lỗi theo account.

### Output mong muốn

- Không còn user active bị thiếu product quá 1 chu kỳ cron (trừ khi hết slot/tài khoản lỗi).
- Có log rõ ràng để truy lỗi fix thất bại.

## 3.2 Luồng 23h30 (check + cleanup expired)

1. Trigger cron 23h30.
2. Chạy check account toàn bộ trước (đồng bộ snapshot mới nhất).
3. Truy vấn các đơn Renew Adobe có `days_remaining <= 0`.
4. Gom nhóm theo Adobe account đang chứa user đó.
5. Gọi delete batch để xóa user khỏi Adobe account.
6. Sau mỗi account xóa xong:
   - chạy sync snapshot mới
   - cập nhật `user_count`
   - cập nhật mapping (`product=false` nếu user đã bị gỡ)
7. Ghi log + thông báo lỗi nếu có.

### Output mong muốn

- Sau job 23h30, user hết hạn không còn tồn tại trong Adobe admin.
- Snapshot DB phản ánh đúng trạng thái thực tế sau xóa.

---

## 4) Điểm chạm kỹ thuật (gợi ý implementation)

- File orchestration chính:
  - `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js`
- Có thể tách thêm service mới:
  - `backend/src/scheduler/tasks/renewAdobePostCheckFlow.js`
  - `backend/src/scheduler/tasks/renewAdobeCleanup2330Flow.js`
- Tái sử dụng logic sẵn có:
  - `runCheckAllAccountsFlow(...)`
  - `autoAssignUsers(...)`
  - `adobeRenewV2.deleteUsersV2` / `autoDeleteUsers`
  - `syncOrdersToMapping(...)`, `recordUsersAssigned(...)`

---

## 5) Rule dữ liệu cần thống nhất

- Đơn hợp lệ để giữ user:
  - status thuộc tập allowed hiện hành của Renew Adobe.
  - ngày hết hạn > hiện tại.
- Đơn cần remove user:
  - `days_remaining <= 0` (bao gồm bằng 0 và âm).
- Khi 1 email có nhiều đơn:
  - ưu tiên đơn mới nhất còn hiệu lực để quyết định giữ/gỡ.
- Khi thiếu slot account:
  - ghi nhận vào queue "chưa fix được", không bỏ im lặng.

---

## 6) Logging và quan sát vận hành

- Mỗi job phải có `trigger`, `pid`, `started_at`, `ended_at`, `elapsed_ms`.
- Mỗi bước có counter:
  - checked_accounts
  - users_to_fix
  - users_fixed
  - users_to_remove
  - users_removed
  - failed_accounts / failed_users
- Khi lỗi cần log đầy đủ:
  - account id/email
  - action (`check`, `add_batch`, `delete_batch`, `sync_snapshot`)
  - error message.

---

## 7) Tiêu chí nghiệm thu

- [ ] Sau cron check hourly, hệ thống tự chạy fix user thiếu product bằng batch add.
- [ ] Sau job 23h30, toàn bộ user có `days_remaining <= 0` bị remove khỏi Adobe account.
- [ ] `users_snapshot` và `user_count` được đồng bộ đúng sau add/delete.
- [ ] Mapping người dùng được cập nhật đúng trạng thái product.
- [ ] Có log tổng kết rõ ràng theo từng job.
- [ ] Không làm thay đổi hành vi API hiện tại cho thao tác check tay.

---

## 8) Kế hoạch rollout an toàn

1. Bật feature flag cho luồng mới (ví dụ):
   - `RENEW_ADOBE_ENABLE_POST_CHECK_FIX=true`
   - `RENEW_ADOBE_ENABLE_2330_CLEANUP=true`
2. Chạy thử môi trường staging hoặc account nhỏ trước.
3. Theo dõi 2-3 ngày:
   - tỷ lệ fail add/delete
   - thời gian chạy job
   - độ chính xác snapshot.
4. Sau khi ổn định mới bật full production.

---

## 9) Task triển khai chi tiết (ready-to-do)

### Nhóm A - Chuẩn bị nền tảng

- [x] A1. Tạo 2 feature flags trong `backend/.env` và config loader:
  - `RENEW_ADOBE_ENABLE_POST_CHECK_FIX`
  - `RENEW_ADOBE_ENABLE_2330_CLEANUP`
- [x] A2. Tạo module mới:
  - `backend/src/scheduler/tasks/renewAdobePostCheckFlow.js`
  - `backend/src/scheduler/tasks/renewAdobeCleanup2330Flow.js`
- [x] A3. Chuẩn hóa helper log job (`started_at`, `ended_at`, `elapsed_ms`, counters).

### Nhóm B - Luồng auto fix sau hourly check

- [x] B1. Trong `renewAdobeCheckAndNotifyTask`, sau `runCheckAllAccountsFlow` gọi `runAutoFixUnassignedUsers(...)` khi flag bật.  
  (Hiện tại tích hợp bằng cách bật `includeAutoAssign` cho trigger `cron` khi `RENEW_ADOBE_ENABLE_POST_CHECK_FIX=true`)
- [x] B2. Implement `collectUnassignedRenewAdobeUsers`:
  - lấy đơn hợp lệ Renew Adobe (status allowed + expiry > now)
  - trừ đi user đã có product trong snapshot/mapping
  - trả ra danh sách email cần fix.
- [x] B3. Implement `runAutoFixUnassignedUsers`:
  - dùng batch add hiện có (`autoAssignUsers`/flow batch tương đương)
  - xử lý theo slot account
  - ghi nhận `assigned/skipped/errors`.
- [x] B4. Đồng bộ DB sau fix:
  - update `users_snapshot`, `user_count`
  - update mapping liên quan.
- [x] B5. Log summary:
  - `users_to_fix`, `users_fixed`, `remaining_unfixed`, `failed_accounts`.

### Nhóm C - Luồng 23h30 check + cleanup expired

- [x] C1. Tại cron 23h30, gọi flow mới `runRenewAdobe2330CleanupFlow`.
- [x] C2. Trong flow 23h30, chạy `runCheckAllAccountsFlow` trước khi cleanup.
- [x] C3. Implement query `collectExpiredOrDueUsers` với điều kiện `days_remaining <= 0`.
- [x] C4. Gom nhóm user theo account đang chứa user đó (ưu tiên mapping + fallback snapshot).
- [x] C5. Gọi delete batch user theo từng account (`autoDeleteUsers`/`deleteUsersV2`).
- [x] C6. Sau mỗi account:
  - check/sync lại snapshot
  - update `user_count`
  - set mapping `product=false`.
- [x] C7. Log summary 23h30:
  - `users_to_remove`, `users_removed`, `failed_users`, `failed_accounts`.

### Nhóm D - An toàn vận hành

- [x] D1. Chống chạy chồng (in-flight lock) cho flow post-check fix và flow 23h30.
- [x] D2. Thêm retry nhẹ cho thao tác add/delete batch (1 lần) khi lỗi transient.
- [x] D3. Nếu fail giữa chừng:
  - không crash toàn job
  - ghi log account lỗi và tiếp tục account khác.
- [x] D4. Bổ sung cảnh báo (Telegram/log error) khi `failed > 0`.

### Nhóm E - Test và nghiệm thu

- [ ] E1. Test local bằng lệnh one-shot:
  - `node scheduler.js --run-adobe-once`
- [ ] E2. Test API manual:
  - `GET /api/scheduler/run-adobe-check`
- [ ] E3. Test cron 23h30 trên dữ liệu giả lập có cả case `days_remaining = 0` và `< 0`.
- [ ] E4. Verify DB:
  - `users_snapshot` khớp sau add/delete
  - `user_count` đúng
  - mapping `product` đúng trạng thái.
- [ ] E5. Theo dõi production 48h:
  - ít nhất 2 lần cron hourly và 1 lần job 23h30 thành công.

### Thứ tự làm khuyến nghị

1. A1 -> A3  
2. B1 -> B5  
3. C1 -> C7  
4. D1 -> D4  
5. E1 -> E5

### Định nghĩa hoàn thành (DoD)

- [ ] Cả 2 flow mới chạy được sau khi bật flag.
- [ ] Không làm hỏng luồng check tay/check all hiện tại.
- [ ] Có log tổng kết và số liệu rõ ràng cho mỗi job.
- [ ] Dữ liệu DB đồng bộ đúng sau mọi thao tác add/delete.


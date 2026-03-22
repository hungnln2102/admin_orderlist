# Renew Adobe - Chi tiết task (Đã hoàn thiện / Chưa hoàn thiện)

Cập nhật lần cuối: 2026-03-22 (Asia/Bangkok)

Tài liệu này tổng hợp tiến độ Renew Adobe dựa trên code hiện tại trong repo `admin_orderlist` (backend, frontend, scheduler, docs).

## 1) Task đã hoàn thiện

- [x] Đã có bộ API Renew Adobe đầy đủ route cho account và thao tác chính:
  - `GET /api/renew-adobe/accounts`
  - `GET /api/renew-adobe/accounts/lookup`
  - `POST /api/renew-adobe/accounts/:id/check`
  - `POST /api/renew-adobe/accounts/:id/auto-delete-users`
  - `POST /api/renew-adobe/accounts/add-users-batch`
  - `POST /api/renew-adobe/fix-user`
  - `GET /api/renew-adobe/user-orders`
  - `GET/POST/DELETE /api/renew-adobe/product-system*`
  - File: `backend/src/routes/renewAdobeRoutes.js`

- [x] Đã có giao diện admin Renew Adobe:
  - Trang `/renew-adobe-admin` (check từng account, check all, delete user, fix user, cập nhật URL access)
  - Trang `/product-system` (CRUD ánh xạ variant_id <-> system_code)
  - Files:
    - `frontend/src/pages/CustomerCtv/RenewAdobeAdmin/index.tsx`
    - `frontend/src/pages/CustomerCtv/ProductSystem/index.tsx`
    - `frontend/src/routes/AppRoutes.tsx`

- [x] Đã có check all bằng SSE và frontend đã consume event:
  - Backend phát event: `start/checking/done/error/complete/auto_assign_*`
  - Frontend cập nhật progress real-time
  - File backend: `backend/src/controllers/RenewAdobeController/index.js`
  - File frontend: `frontend/src/pages/CustomerCtv/RenewAdobeAdmin/index.tsx`

- [x] Đã có logic lấy user-orders theo `product_system` (system_code = `renew_adobe`), lấy dữ liệu từ `orders.order_list`.
  - File: `backend/src/controllers/RenewAdobeController/index.js` (`listUserOrders`)

- [x] Đã có logic auto-assign user vào account còn gói và còn slot (ưu tiên account ít slot trống nhất).
  - Có trong endpoint tay và trong check-all flow
  - File: `backend/src/controllers/RenewAdobeController/index.js` (`autoAssignUsers`, `runAutoAssign`)

- [x] Đã có logic batch add user + assign product bằng V2.
  - File: `backend/src/controllers/RenewAdobeController/index.js` (`runAddUsersBatch`)
  - Service: `backend/src/services/adobe-renew-v2/addUsersWithProductV2.js`

- [x] Đã có scheduler cho Renew Adobe:
  - Check account + notify hết gói lúc `05:00` và `12:00`
  - Cleanup user hết hạn lúc `23:30`
  - Files:
    - `backend/src/scheduler/index.js`
    - `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js`
    - `backend/src/scheduler/tasks/cleanupExpiredAdobeUsers.js`

- [x] Đã có service mapping user-account để đồng bộ email user <-> id_order <-> account admin.
  - File: `backend/src/services/userAccountMappingService.js`
  - Đã được gọi từ controller và scheduler để sync/record/remove mapping.

- [x] Đã có luồng Adobe V2 (Playwright) và module chức năng:
  - `runCheckFlow`, `loginFlow`, `checkInfoFlow`, `deleteUsersV2`, `addUsersWithProductV2`, `autoAssignFlow`, `removeProductAdminFlow`
  - Folder: `backend/src/services/adobe-renew-v2/`

## 2) Task chưa hoàn thiện / cần xử lý

### P0 (cần xử lý ngay)

- [ ] `adobeHttp` chưa được import trong `RenewAdobeController`, nhưng đang được gọi ở các hàm quan trọng:
  - `runCheckForAccountId` -> `adobeHttp.checkAccount(...)`
  - `runAutoDeleteUsers` -> `adobeHttp.autoDeleteUsers(...)`
  - File: `backend/src/controllers/RenewAdobeController/index.js`
  - Tác động: Runtime sẽ lỗi `ReferenceError: adobeHttp is not defined` khi gọi các API này.

- [ ] `adobeHttp` cũng chưa được import trong scheduler task check+notify:
  - `deleteUsersFromExpiredAccount` gọi `adobeHttp.autoDeleteUsers(...)`
  - File: `backend/src/scheduler/tasks/renewAdobeCheckAndNotify.js`
  - Tác động: Job cron có thể fail khi vào nhánh xóa user expired.

### P1 (nên làm sớm)

- [ ] Chưa thấy migration tạo bảng `user_account_mapping` trong `database/migrations` (dù schema đã được định nghĩa trong `dbSchema.js` và đã có service sử dụng).
  - Đã có: migration cho `system_automation.product_system`
  - Chưa thấy: migration tạo `system_automation.user_account_mapping`
  - Tác động: Deployer mới có thể thiếu bảng, gây lỗi runtime.

- [ ] `fix-user` hiện tại chưa ràng buộc email phải có đơn hàng renew còn hiệu lực (nếu nghiệp vụ yêu cầu).
  - File: `backend/src/controllers/RenewAdobeController/index.js` (`fixSingleUser`)
  - Tác động: Có thể cấp slot cho email không thuộc đơn hợp lệ.

### P2 (tối ưu/hoàn thiện thêm)

- [ ] Thông điệp lỗi trong `runAddUsersBatch` không đồng bộ với giới hạn slot:
  - Hệ thống dùng `MAX_USERS_PER_ACCOUNT = 10`
  - Message đang ghi: "đã đạt giới hạn 11 user"
  - File: `backend/src/controllers/RenewAdobeController/index.js`

- [ ] `lookupAccountByEmail` vẫn fallback duyệt từng `users_snapshot` thay vì ưu tiên sử dụng `user_account_mapping`.
  - File: `backend/src/controllers/RenewAdobeController/index.js`
  - Tác động: Tăng chi phí query khi dữ liệu lớn.

- [ ] Chưa thấy test tự động (unit/integration) bao phủ flow quan trọng Renew Adobe.
  - Kiến nghị: test cho `runCheckForAccountId`, `autoAssignUsers`, `fixSingleUser`, scheduler tasks.

## 3) Đề xuất thứ tự thực hiện tiếp theo

1. Fix import `adobeHttp` trong controller và scheduler (P0).
2. Bổ sung migration `user_account_mapping` + script deploy schema (P1).
3. Bổ sung ràng buộc nghiệp vụ cho `fix-user` nếu cần "chỉ khách có đơn hợp lệ mới được kích hoạt" (P1).
4. Dọn dẹp tối ưu (message 10/11, lookup mapping) và bổ sung test regression (P2).

## 4) Ghi chú xác nhận phạm vi

- Tài liệu này là "trạng thái kỹ thuật theo code repo" tại thời điểm cập nhật.
- Chưa bao gồm kết quả test runtime trên môi trường production.

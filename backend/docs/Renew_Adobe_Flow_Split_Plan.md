# Renew Adobe — Kế hoạch tách luồng

Mục tiêu: tách nhỏ flow hiện tại thành các luồng độc lập, dễ bảo trì, dễ test, nhưng vẫn giữ hành vi cũ.

---

## 1) Danh sách luồng cần tách (theo yêu cầu)

- [ ] Luồng tạo URL auto-assign.
- [ ] Luồng check `org_name`.
- [ ] Luồng check product.
- [ ] Luồng vào trang user, tách tiếp thành:
  - [ ] Lấy form user.
  - [ ] Check product admin.
  - [ ] Xóa product admin (chỉ chạy khi admin đang có gói).
  - [ ] Xóa user (xóa batch khi đạt điều kiện).
  - [ ] Add user (add batch khi đạt điều kiện).

---

## 2) Chuẩn login cố định (đã thống nhất)

Flow login chuẩn cần giữ đúng thứ tự:

1. Nhập email  
2. Enter  
3. OTP nếu có  
4. Nhập password  
5. Enter  
6. OTP nếu có  
7. Lưu cookie/session

Ghi chú: OTP phải đi qua router nguồn OTP theo account (`imap`, `tinyhost`, `hdsd`).

---

## 3) Luồng còn thiếu/dễ quên (đề xuất thêm)

Đây là các luồng quan trọng nên note thêm để tránh tách thiếu:

- [ ] **Session/Cookie lifecycle**
  - Đọc cookie từ DB.
  - Validate cookie còn hiệu lực.
  - Refresh/lưu lại cookie sau mỗi flow thành công.

- [ ] **OTP Source Router**
  - Resolve `otp_source` theo account.
  - Fallback hợp lệ khi thiếu cấu hình.
  - Logging rõ nguồn OTP đã dùng.

- [ ] **Điều hướng Users an toàn**
  - Chuẩn hóa cách vào `/users`.
  - Handle redirect bất thường (auth, org switch, URL mismatch).

- [ ] **Snapshot & đồng bộ DB sau thao tác user**
  - Scrape snapshot users sau add/delete.
  - Cập nhật `user_count`, `users_snapshot`, `cookie_config`.

- [ ] **Điều kiện batch add/delete**
  - Rule rõ ràng khi xóa/add nhiều user cùng lúc.
  - Điều kiện dừng batch khi gặp lỗi.

- [ ] **Error Recovery**
  - Retry nhẹ (selector/overlay/reload).
  - Retry nặng (re-open page/context) khi cần.
  - Chuẩn hóa timeout theo env.

- [ ] **Telemetry/Log chuẩn theo step**
  - Step name nhất quán.
  - Log input/output tối thiểu cho debug.

---

## 4) Gợi ý tách file/module

Đề xuất nhóm module theo domain:

- `flows/login/`
  - `credentialsFlow.js`
  - `otpFlow.js`
  - `sessionFlow.js`
- `flows/check/`
  - `checkOrgNameFlow.js`
  - `checkProductFlow.js`
- `flows/users/`
  - `gotoUsersFlow.js`
  - `checkAdminProductFlow.js`
  - `removeAdminProductFlow.js`
  - `deleteUsersFlow.js`
  - `addUsersFlow.js`
- `flows/autoAssign/`
  - `createOrGetAutoAssignUrlFlow.js`

---

## 5) Thứ tự triển khai khuyến nghị

1. Tách login + otp router (đảm bảo không đổi hành vi).  
2. Tách check `org_name` và check product.  
3. Tách users sub-flows.  
4. Tách auto-assign URL flow.  
5. Bổ sung test smoke cho từng flow.

---

## 6) Tiêu chí hoàn tất

- Mỗi flow có input/output rõ ràng.
- Không còn phụ thuộc chéo vòng tròn giữa các flow.
- Luồng check/add/delete hiện tại vẫn chạy được.
- Log đủ để truy lỗi theo từng flow con.

---

## 7) Task triển khai chi tiết (checklist thực thi)

### A. Chuẩn bị cấu trúc và hợp đồng module

- [x] Tạo cây thư mục `backend/src/services/adobe-renew-v2/flows/{login,check,users,autoAssign}`.
- [x] Tạo file `index.js` cho từng nhóm flow để export tập trung.
- [x] Định nghĩa chuẩn input/output cho từng flow (JSDoc): input bắt buộc, output chuẩn, lỗi chuẩn.
- [x] Tạo `shared/stepLogger.js` để log theo step thống nhất.
- [x] Tạo `shared/errorCodes.js` cho mã lỗi chung (timeout, otp_not_found, redirect_invalid, session_expired).

### B. Nhóm Login + Session + OTP Router

- [x] Tách `credentialsFlow` đúng thứ tự cố định: email -> Enter -> OTP (nếu có) -> password -> Enter -> OTP (nếu có) -> save cookie.
- [x] Tách `otpFlow` (chỉ xử lý đọc/điền OTP, không làm nhiệm vụ login tổng).
- [x] Tách `sessionFlow`: đọc cookie DB, validate session, refresh cookie sau flow thành công.
- [x] Chuẩn hóa router OTP theo `otp_source` (`imap`, `tinyhost`, `hdsd`) và fallback hợp lệ.
- [x] Thêm log rõ nhánh OTP thực tế đã dùng cho từng account.
- [x] Chuẩn hóa timeout login/OTP theo env (không hard-code rải rác).

### C. Nhóm Check

- [x] Tách `checkOrgNameFlow` thành luồng độc lập, trả dữ liệu chuẩn cho orchestrator.
- [x] Tách `checkProductFlow` thành luồng độc lập, trả trạng thái gói và metadata liên quan.
- [x] Ràng buộc retry nhẹ cho các lỗi recoverable khi check.
- [x] Đồng bộ dữ liệu check vào DB theo một hàm ghi tập trung.

### D. Nhóm Users

- [x] Tách `gotoUsersFlow` (điều hướng an toàn vào `/users`, xử lý redirect bất thường).
- [x] Tách `checkAdminProductFlow` để xác định có cần chạy luồng remove product admin hay không.
- [x] Tách `removeAdminProductFlow` (chỉ chạy khi admin đang có gói).
- [x] Tách `deleteUsersFlow` (hỗ trợ batch, điều kiện dừng rõ ràng khi lỗi).
- [x] Tách `addUsersFlow` (hỗ trợ batch, điều kiện dừng rõ ràng khi lỗi).
- [x] Sau mỗi thao tác users, cập nhật snapshot + đồng bộ `user_count`, `users_snapshot`, `cookie_config`.

### E. Nhóm Auto-Assign

- [x] Tách `createOrGetAutoAssignUrlFlow` thành luồng độc lập.
- [x] Đảm bảo flow này tái sử dụng session hiện có, chỉ login lại khi session không hợp lệ.
- [ ] Chuẩn hóa output URL + trạng thái tạo mới/tái sử dụng.

### F. Orchestrator runCheckFlow

- [x] Giữ `runCheckFlow` đúng vai trò orchestrator: gọi flow con, không chứa logic UI chi tiết.
- [x] Sắp xếp thứ tự gọi flow chuẩn: session check -> login (nếu cần) -> check org -> check product -> users (khi cần) -> persist kết quả.
- [x] Chuẩn hóa nhánh lỗi: lỗi recoverable vs lỗi dừng hẳn.
- [x] Chuẩn hóa payload trả về để controller/scheduler dùng chung.

### G. Làm sạch code cũ và thống nhất một luồng

- [x] Rà soát lại toàn bộ import/require để chỉ còn trỏ vào `adobe-renew-v2`.
- [x] Xóa mã thừa/adapter không còn cần thiết sau khi flow mới ổn định.
- [x] Cập nhật tài liệu `Renew_Adobe_Flows.md` theo cấu trúc flow mới.
- [x] Bổ sung sơ đồ luồng ngắn trong docs để dễ onboarding.

### H. Test và nghiệm thu

- [x] Viết smoke test cho 4 luồng chính: login, check, add users batch, delete users batch.
- [ ] Viết test cho session lifecycle: cookie hợp lệ, cookie hết hạn, chưa có cookie.
- [ ] Viết test cho OTP router: `imap`, `tinyhost`, `hdsd` và fallback.
- [ ] Test tay với ít nhất 1 account thực tế cho từng `otp_source`.
- [ ] Kiểm tra scheduler chạy ổn định sau refactor (không đổi hành vi business).
- [ ] Chốt nghiệm thu theo mục "Tiêu chí hoàn tất" ở phần 6.

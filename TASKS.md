# Task list – Xử lý tổng quan & Rule gia hạn

## 1. Tổng quan (từ đánh giá dự án)

- [ ] **Backend refactor**: Hoàn tất chuyển sang `src/server.js`, migrate hết endpoints còn lại vào controllers/routes mới.
- [x] **Database**: Chuẩn hóa schema khởi tạo (`init.sql` hoặc migrations), thống nhất quy trình migrate. ✅ Đã tạo `database/migrations/README.md`
- [x] **Bảo mật**: Loại bỏ hardcode nhạy cảm (Telegram, QR) trong `telegramOrderNotification.js`; dùng env. ✅ Đã loại bỏ hardcode, tạo `.env.example` đầy đủ
- [x] **Testing**: Tăng coverage cho luồng order, payment, auth; bổ sung test renewal & webhook. ✅ Đã tạo `test-rules.js` (5 tests) và `test-webhook-rules.js` (10 tests), tất cả PASS. Xem `docs/TEST_RESULTS.md`
- [x] **Frontend**: Đổi tên package từ `vite-react-ts-template` sang tên dự án; kiểm tra dependency thừa (`express`, `pg`). ✅ Đã đổi tên và remove dependencies thừa
- [x] **Logging**: Setup Winston logger và replace console.* trong các file quan trọng. ✅ Đã setup logger, replace trong 15+ files quan trọng
- [x] **Validation & Transactions**: Audit và document. ✅ Đã tạo audit reports

---

## 2. Rule gia hạn & webhook – Đã xử lý

### 2.1. Vấn đề

- Webhook khi nhận thanh toán **chỉ đổi trạng thái** (UNPAID → PROCESSING), **chưa áp dụng đúng rule renewal**.
- Đơn PAID được set bởi **confirm payment** (PaymentsController), không phải webhook.
- Scheduler chuyển **mọi** đơn hết hạn (`expiry < today`) sang `order_expired`, **kể cả PROCESSING**.
- `isEligibleForRenewal` chỉ áp dụng cho **RENEWAL** hoặc **EXPIRED**; **PROCESSING** không được gia hạn khi webhook nhận tiền gia hạn.

→ Hệ quả: đơn đã thanh toán (webhook) nhưng chưa confirm PAID, hoặc đơn cần gia hạn đang PROCESSING, bị chuyển nhầm sang **đơn hết hạn**.

### 2.2. Các task đã thực hiện

- [x] **Scheduler**: Chỉ chuyển sang `order_expired` và xóa khỏi `order_list` những đơn có `status` **PAID**, **RENEWAL** hoặc **EXPIRED** (đã hết hạn). **Không** chuyển/xóa đơn **PROCESSING**.
- [x] **isEligibleForRenewal**: Chỉ **RENEWAL** và **EXPIRED** với `daysLeft <= 4` là eligible cho renewal. PROCESSING không eligible (PROCESSING là kết quả của renewal, không phải điều kiện).
- [x] **Webhook**: Giữ nguyên luồng; renewal chạy **sau** COMMIT khi order eligible (RENEWAL/EXPIRED với `daysLeft <= 4`). Sau khi renewal, đơn sẽ chuyển về PROCESSING. Đảm bảo không double runner cho đơn mới (thường `daysLeft > 4`).

### 2.3. Luồng sau khi sửa

1. **Webhook nhận thanh toán** (xem chi tiết: `docs/WEBHOOK_FLOW_EXPLAINED.md`)
   
   **Giai đoạn 1 (Trong transaction - TRƯỚC COMMIT):**
   - Insert receipt vào database
   - Kiểm tra eligibility: `isEligibleForRenewal(status, orderExpired)`
     - Eligible = `daysLeft <= 4` VÀ `status` là **RENEWAL** hoặc **EXPIRED**
     - **Lưu ý**: PROCESSING không eligible (PROCESSING là kết quả của renewal, không phải điều kiện)
   - Nếu **KHÔNG eligible**:
     - Cập nhật balance NCC (nếu có)
     - **UNPAID → PROCESSING** (nếu status hiện tại là UNPAID)
   - Nếu **eligible**:
     - Bỏ qua cập nhật balance (renewal sẽ tự cập nhật)
     - Không đổi status (giữ nguyên RENEWAL/EXPIRED)
   - COMMIT transaction
   
   **Giai đoạn 2 (Sau COMMIT):**
   - Fetch lại state của đơn (có thể status đã thay đổi)
   - Kiểm tra lại eligibility
   - Nếu **eligible** (RENEWAL/EXPIRED với `daysLeft <= 4`):
     - Queue renewal task
     - Chạy `processRenewalTask` → gia hạn đơn, cập nhật ngày hết hạn, giá, cộng tiền NCC
     - **Chuyển status về PROCESSING** (Đang Xử Lý) - đây là kết quả của renewal

2. **Scheduler (cron)**
   - Chỉ chuyển sang `order_expired` và xóa khỏi `order_list` các đơn **PAID / RENEWAL / EXPIRED** mà `expiry < today`.
   - **PROCESSING** (đã nhận webhook, chưa confirm) **không** bị chuyển sang hết hạn.

3. **Confirm payment** (PaymentsController)  
   - Vẫn chuyển PROCESSING → PAID theo supplier/date. Sau đó scheduler xử lý PAID → RENEWAL → EXPIRED như cũ.

---

## 3. Việc cần làm thêm (tùy chọn)

- [x] Thêm unit/integration test cho `updateDatabaseTask` (scheduler) và `isEligibleForRenewal` + webhook renewal. ✅ Đã test trong `test-webhook-rules.js`
- [ ] Log rõ ràng khi bỏ qua chuyển đơn PROCESSING sang expired (để dễ debug).
- [ ] Cân nhắc bổ sung metric/monitoring cho tỷ lệ đơn renewal thành công vs thất bại.
- [ ] Convert test scripts sang Jest format để tích hợp vào CI/CD

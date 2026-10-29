# BÁO CÁO NGHIỆM THU: HOÀN THIỆN ĐỐI SOÁT ĐỢN GỘP & BẢO VỆ ACID CONCURRENCY

> **Ngày thực hiện:** 2026-10-29 (Múi giờ Asia/Bangkok)  
> **Dự án:** `admin_orderlist`  
> **Trạng thái:** ✅ **ĐÃ NGHIỆM THU HOÀN TOÀN (PASSED 100%)**

---

## 1. PHẠM VI XỬ LÝ (SCOPE)
Xử lý triệt để 5 vấn đề cốt lõi (4 lỗi P1 và 1 lỗi P2) do Master chỉ đạo về đối soát đợt gộp đơn (Batch Payment Requests), bảo vệ toàn vẹn ACID, kiểm soát race-condition và luồng giao dịch UI:

1. **Khóa chống 1 đơn nằm trong nhiều batch PENDING & Idempotency Webhook**:
   - Tự động hủy batch PENDING cũ khi Master/Admin xác nhận gộp đơn mới (`forceCancelOldBatches`).
   - Tự động loại trừ đơn ra khỏi batch PENDING khi đơn đó được thanh toán riêng lẻ hoặc bị hết hạn (`excludeOrderFromPendingBatches`).
2. **Kiểm soát Concurrency cấp Slot Suffix**:
   - Sử dụng PostgreSQL Advisory Lock cấp Transaction (`pg_advisory_xact_lock(1029001)`).
   - Thiết lập PostgreSQL Partial Unique Index: `CREATE UNIQUE INDEX idx_batch_pending_slot_suffix ON billing.batch_payment_requests (slot_suffix) WHERE status = 'PENDING';`
3. **Phân bổ Webhook theo chuẩn Bảng Giá Catalog (`order_allocations`)**:
   - Lưu cấu trúc phân bổ giá gốc của từng đơn con (`order_allocations` JSONB) lúc tạo batch.
   - Webhook đối soát đọc trực tiếp từ `order_allocations`: Đơn `MAVT` (Quà tặng) nhận đúng 0 ₫, đơn `MAVL` nhận đúng giá bán lẻ (150k), đơn cuối nhận bù suffix.
   - Chống duplicate-event `ORDER_PAID` và chống ghi trùng sổ cái nếu đơn con đã `PAID` trước đó.
4. **Bảo vệ UI: Không hiển thị VietQR khi chưa lưu Database**:
   - Ẩn hoàn toàn VietQR ở client khi chưa có bản ghi `batch_payment_requests` trong DB.
   - Thay thế bằng nút CTA nổi bật: **"⚡ Tạo Mã QR Thanh Toán (Lưu Đợt Gộp)"**.
5. **Ràng buộc STK nhận tiền trong Webhook Matching**:
   - Bắt buộc kiểm tra `financial_account_id` của batch phải khớp với tài khoản nhận tiền thực tế của Webhook SePay.

---

## 2. KẾT QUẢ KIỂM THỬ (TEST VERIFICATION)

### A. Backend Unit & Integration Tests: **41/41 tests pass (100%)**
- Lệnh: `npm --prefix backend test`
- Kết quả:
  - `Slot Suffix Arithmetic`: pass.
  - `Batch Creation & Allocation Distribution Logic`: pass.
  - `Webhook 2-Layer Pattern Matching`: pass.
  - `Quy Tắc Lấy Giá Gốc Bảng Giá & Phân Biệt Tiền Tố (MAVL, MAVC, MAVK, MAVS, MAVT)`: pass.
  - `Tự Động Loại Trừ Đơn Khỏi Batch PENDING Khi Đơn Được Thanh Toán Hoặc Hết Hạn`: pass.
  - `Phân Bổ Webhook Theo order_allocations & Chống Nhân Đôi Doanh Thu`: pass.
  - `Adobe automation & Warehouse browser tests`: pass.
  - `Renewal date calculation & suppliers`: pass.

### B. Frontend TypeScript Build: **Pass 100% (0 lỗi)**
- Lệnh: `npm --prefix frontend run build`
- Thời gian: 2.49s, bundle sạch, 0 lỗi kiểu.

### C. Migration Database:
- `20261029000002_add_batch_suffix_unique_and_allocations.js`: Đã chạy thành công (`Batch 9`).

---

## 3. DANH SÁCH FILE TÁC ĐỘNG
- [`backend/src/db/migrations/20261029000002_add_batch_suffix_unique_and_allocations.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/migrations/20261029000002_add_batch_suffix_unique_and_allocations.js)
- [`backend/src/db/tables.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/tables.js)
- [`backend/src/domains/invoices/routes.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/invoices/routes.js)
- [`backend/src/domains/invoices/services/batchPaymentService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/invoices/services/batchPaymentService.js)
- [`backend/src/domains/orders/services/orderPaymentService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderPaymentService.js)
- [`backend/src/domains/payments/services/slotSuffixService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/payments/services/slotSuffixService.js)
- [`backend/src/domains/payments/services/webhookPaymentService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/payments/services/webhookPaymentService.js)
- [`frontend/src/features/invoices/components/CreateReceiptModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/CreateReceiptModal.tsx)
- [`frontend/src/features/invoices/components/BatchDetailModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/BatchDetailModal.tsx)
- [`frontend/src/features/invoices/components/PendingBatchesModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/PendingBatchesModal.tsx)
- [`backend/tests/unit/batchPaymentReconciliation.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/batchPaymentReconciliation.test.js)


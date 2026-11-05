# BÁO CÁO NGHIỆM THU TỔNG HỢP HÀNG NGÀY — 29/10/2026

> **Ngày thực hiện:** 29/10/2026 (Múi giờ `Asia/Bangkok`, UTC+7)  
> **Chủ nhân tối cao phê duyệt:** 👑 **Master (Sếp)**  
> **Tổng chỉ huy kỹ thuật:** 👑 **Orchestrator Agent**  
> **Trạng thái:** ✅ **HOÀN THÀNH 100% — TỔNG HỢP TOÀN BỘ BÁO CÁO TRONG NGÀY**  
> **Tài liệu nguồn sự thật (SSOT):** [report/2026-10-29-daily-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-29-daily-review.md)

---

## 📑 MỤC LỤC CÁC NHIỆM VỤ ĐÃ THỰC THI TRONG NGÀY

1. [Nhiệm vụ 1: HOÀN THIỆN ĐỐI SOÁT ĐỢN GỘP & BẢO VỆ ACID CONCURRENCY](#nhiem-vu-1)
2. [Nhiệm vụ 2: Đánh giá batch payment và tự đối soát](#nhiem-vu-2)
3. [Nhiệm vụ 3: THU GỌN KHỐI ĐỢT GỘP ĐƠN & CHUẨN HÓA LUỒNG XÓA ĐƠN HÀNG](#nhiem-vu-3)

---

<a id="nhiem-vu-1"></a>
## 1. NHIỆM VỤ 1: BÁO CÁO NGHIỆM THU: HOÀN THIỆN ĐỐI SOÁT ĐỢN GỘP & BẢO VỆ ACID CONCURRENCY

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-29-batch-payment-acid-concurrency-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-29-batch-payment-acid-concurrency-review.md)

> **Ngày thực hiện:** 2026-10-29 (Múi giờ Asia/Bangkok)  
> **Dự án:** `admin_orderlist`  
> **Trạng thái:** ✅ **ĐÃ NGHIỆM THU HOÀN TOÀN (PASSED 100%)**

---

### 1. PHẠM VI XỬ LÝ (SCOPE)
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

### 2. KẾT QUẢ KIỂM THỬ (TEST VERIFICATION)

#### A. Backend Unit & Integration Tests: **41/41 tests pass (100%)**
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

#### B. Frontend TypeScript Build: **Pass 100% (0 lỗi)**
- Lệnh: `npm --prefix frontend run build`
- Thời gian: 2.49s, bundle sạch, 0 lỗi kiểu.

#### C. Migration Database:
- `20261029000002_add_batch_suffix_unique_and_allocations.js`: Đã chạy thành công (`Batch 9`).

---

### 3. DANH SÁCH FILE TÁC ĐỘNG
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

---

<a id="nhiem-vu-2"></a>
## 2. NHIỆM VỤ 2: ĐÁNH GIÁ BATCH PAYMENT VÀ TỰ ĐỐI SOÁT

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-29-batch-payment-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-29-batch-payment-review.md)

- Ngày đánh giá: 2026-10-29
- Múi giờ: Asia/Bangkok
- Phạm vi: batch payment request, Slot Suffix, webhook tự đối soát, UI biên lai và migration `batch_payment_requests`.
- Trạng thái nghiệm thu: CHƯA NGHIỆM THU.

### Phát hiện cần xử lý

#### P1 - Một đơn có thể xuất hiện trong nhiều batch chờ thanh toán

`createBatchPaymentRequest` chỉ khóa đơn trong lúc tạo batch. Sau khi transaction commit, đơn vẫn ở trạng thái có thể thanh toán nên một request khác vẫn tạo được batch mới cho cùng đơn. Nếu cả hai batch được thanh toán, `processCompleteOrder` vẫn phát event `ORDER_PAID` cho đơn đã `PAID`, có thể làm doanh thu hoặc sổ cái bị ghi nhận hai lần.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:189`
- Tác động: đối soát trùng, phát event tài chính trùng.
- Yêu cầu trước nghiệm thu: chặn đơn đã thuộc batch `PENDING`, hoặc thiết kế cơ chế reserve đơn có ràng buộc DB và giải phóng khi batch `EXPIRED`/`CANCELED`.

#### P1 - Slot Suffix không an toàn khi tạo batch đồng thời

`getAvailableSuffix()` đọc bằng `db` riêng, không sử dụng transaction đang tạo batch; migration cũng không có ràng buộc uniqueness cho suffix đang `PENDING`. Hai request đồng thời có thể nhận cùng suffix. Nếu tổng tiền bằng nhau, webhook chọn batch mới nhất theo `id` và có thể hoàn tất nhầm batch.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:216`
- Nguồn: `backend/src/domains/payments/services/slotSuffixService.js:9`
- Nguồn: `backend/src/db/migrations/20261029000001_create_batch_payment_requests.js:12`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:145`
- Yêu cầu trước nghiệm thu: cấp suffix trong cùng transaction có lock phù hợp và bổ sung ràng buộc/index bảo vệ batch `PENDING`; xử lý retry khi xảy ra conflict.

#### P1 - Webhook phân bổ theo giá đơn cũ thay vì giá gốc đã dùng để tạo batch

Batch tính `base_amount` từ `catalogBasePrice`, nhưng webhook lại phân bổ các đơn đầu theo `subOrder.price`. Với đơn đang mang suffix cũ, khoản phân bổ cuối bị thiếu hoặc dư. Với đơn `MAVT` có giá gốc bằng 0, sai lệch có thể lớn hơn và làm sai số liệu event tài chính.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:209`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:185`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:204`
- Yêu cầu trước nghiệm thu: lưu snapshot số tiền phân bổ theo từng đơn khi tạo batch, hoặc tái tính bằng cùng hàm bảng giá trong webhook; chỉ cộng `slot_suffix` vào một allocation đã xác định.

#### P1 - QR được hiển thị trước khi batch được lưu

UI tạo và hiển thị VietQR ngay khi chọn đơn, trong khi batch chỉ được lưu khi người dùng bấm nút lưu, tải ảnh QR, hoặc copy tin nhắn. Khách có thể quét hoặc chụp QR rồi chuyển tiền khi không có batch nào trong DB để webhook đối soát.

- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:328`
- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:375`
- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:421`
- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:900`
- Yêu cầu trước nghiệm thu: chỉ cho chia sẻ/tải QR sau khi batch đã persist, hoặc persist batch trước khi hiển thị QR có thể dùng để thanh toán.

#### P2 - Tài khoản nhận tiền không được xác nhận khi webhook match batch

Batch lưu `financial_account_id`, nhưng webhook match theo `batch_code` hoặc `total_amount` mà không đối chiếu tài khoản nhận. Giao dịch vào tài khoản khác vẫn có thể hoàn tất batch; cơ chế credit hiện tại còn có fallback sang tài khoản mặc định.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:246`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:134`
- Nguồn: `backend/src/domains/wallets/services/walletService.js:356`
- Yêu cầu trước nghiệm thu: resolve tài khoản nhận từ payload webhook, đối chiếu với `financial_account_id`, và không dùng fallback khi đang đối soát batch.

### Kiểm tra đã chạy

- `node --check` cho các file backend mới: pass.
- `npm test -- --test-name-pattern="Batch Payment"` tại `backend/`: 37/37 test pass.
- `npm run build` tại `frontend/`: pass.
- `git diff --check`: pass.

### Khoảng trống kiểm thử

- Chưa có test tích hợp cho hai request tạo batch đồng thời.
- Chưa có test chặn một đơn thuộc nhiều batch `PENDING`.
- Chưa có test webhook phân bổ theo snapshot giá catalog, đơn có suffix cũ, hoặc đơn `MAVT`.
- Chưa có test webhook xác minh đúng `financial_account_id`.
- Chưa có test UI bảo đảm QR không thể được dùng trước khi batch được persist.

### Điều kiện nghiệm thu

Chỉ nghiệm thu sau khi xử lý toàn bộ phát hiện P1, thêm test tái hiện tương ứng, và chạy lại kiểm tra backend/frontend.

---

<a id="nhiem-vu-3"></a>
## 3. NHIỆM VỤ 3: BÁO CÁO NGHIỆM THU: THU GỌN KHỐI ĐỢT GỘP ĐƠN & CHUẨN HÓA LUỒNG XÓA ĐƠN HÀNG

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-29-batch-single-block-and-order-delete-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-29-batch-single-block-and-order-delete-review.md)

- **Ngày thực hiện**: 2026-10-29 (Múi giờ: Asia/Bangkok)
- **Dự án**: `admin_orderlist`
- **Người phê duyệt**: 👑 Master (Sếp)
- **Đơn vị thực thi**: Orchestrator Agent & Frontend/Backend Specialists

---

### 1. PHẠM VI NGHIỆM THU

1. **Khối Đợt Gộp Đơn Hàng (Batch Card UI)**:
   - Thu gọn toàn bộ danh sách card con dài dòng tại Mục 2 của [`CreateReceiptModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/CreateReceiptModal.tsx) thành **1 Khối Duy Nhất (Single Row Compact Card)** chuẩn Fintech một hàng ngang liền mạch, thanh thoát.
   - Loại bỏ triệt để các nhãn văn bản thừa (`"MÃ BATCH:"`, `"SỐ TIỀN ĐỢT GỘP"`, `"Gồm 3 đơn con • Bấm để xem chi tiết"`...), chỉ làm nổi bật 3 dữ kiện chính:
     - **Mã Batch**: Font mono rõ nét `#MBP-YYYYMMDD-XXXX` (hoặc mã dự kiến).
     - **Trạng Thái**: Dùng trực tiếp [`StatusBadge`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/StatusBadge.tsx) với 3 trạng thái đơn hàng: **Chưa Thanh Toán** (`UNPAID`), **Đã Thanh Toán** (`PAID`), **Đã Hủy** (`CANCELED`).
     - **Số Tiền**: Số tiền thực tế chuyển khoản font mono to xanh ngọc `450.003 ₫` kèm dòng nhỏ `Gốc 450.000₫ (+3₫)`.
     - Kèm số lượng đơn: `(3 đơn con)` và icon mũi tên `ChevronRight` mở form chi tiết.
   - Khi bấm vào khối ➔ Mở modal view chi tiết các đơn lẻ trong batch ([`BatchSubOrdersModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/BatchSubOrdersModal.tsx)) với đầy đủ tên khách, thông tin gói dịch vụ, giá catalog gốc chuẩn và nút gỡ đơn con.

2. **Chuẩn Hóa Luồng Xóa Đơn Hàng (Order Delete)**:
   - Khắc phục triệt để lỗi đơn "Cần Gia Hạn" bị xóa vĩnh viễn khỏi Database.
   - Đơn **Cần Gia Hạn** (`RENEW_REQUIRED`): Chuyển sang Tab **"Hết Hạn"** (`EXPIRED`), bảo lưu an toàn 100% dữ liệu tài khoản, mật khẩu, email của khách.
   - Đơn **Đã Thanh Toán** (`PAID`): Chuyển thành **"Đã Hủy"** (`CANCELED`), tự động sinh credit note hoàn tiền theo số ngày sử dụng còn lại.
   - Đơn **Chưa Thanh Toán** (`UNPAID`): Mới thực hiện Hard Delete `.del()`.
   - Cả 3 trường hợp đều tự động giải phóng đơn khỏi batch payment pending (`excludeOrderFromPendingBatches`).

3. **Đồng Bộ Giao Diện & Bộ Lọc**:
   - [`OrderDeleteModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderDeleteModal.tsx): Thông báo cảnh báo và nút bấm trực quan tương ứng 3 trường hợp.
   - [`OrderFilterBar.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderFilterBar.tsx): Đổi tên Tab 4 thành **"Đơn Đã Hủy"** và thẻ tổng hợp thành **"TỔNG ĐƠN ĐÃ HỦY"**.

---

### 2. TRẠNG THÁI NGHIỆM THU

- **Trạng thái**: ✅ **ĐẠT (PASSED) — 100% SẴN SÀNG SỬ DỤNG**
- Không có lỗi biên dịch (0 TypeScript errors).
- Không có hồi quy logic (Regression-free).

---

### 3. CÁC KIỂM TRA ĐÃ CHẠY

1. **Backend Unit Tests**:
   - Lệnh: `npm --prefix backend test`
   - Kết quả: **44/44 tests PASSED (100%)**.
2. **Frontend Type Check & Production Build**:
   - Lệnh: `npm --prefix frontend run build`
   - Kết quả: **Vite build thành công (1702 modules transformed, 0 error)**.

---

### 4. CHI TIẾT CÁC TẬP TIN ĐÃ THAY ĐỔI

- [`frontend/src/features/invoices/components/BatchSubOrdersModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/BatchSubOrdersModal.tsx): Modal xem chi tiết & quản lý đơn con trong đợt gộp.
- [`frontend/src/features/invoices/components/CreateReceiptModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/CreateReceiptModal.tsx): Thu gọn Mục 2 thành Single Row Compact Card tinh giản theo phong cách Fintech.
- [`backend/src/domains/invoices/services/batchPaymentService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/invoices/services/batchPaymentService.js): Bổ sung `previewBatchCode` cho đợt gộp dự kiến.
- [`backend/src/domains/orders/services/orderService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js): Logic xóa đơn an toàn, bảo vệ tài khoản khách và đổi thành Đã Hủy.
- [`frontend/src/features/orders/components/OrderDeleteModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderDeleteModal.tsx): Giao diện modal xóa phân định rõ 3 trạng thái.
- [`frontend/src/features/orders/components/OrderFilterBar.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderFilterBar.tsx): Đồng bộ nhãn tab và thẻ thống kê thành "Đơn Đã Hủy".
- [`backend/tests/unit/orderDeleteStatus.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/orderDeleteStatus.test.js): Bộ test tự động kiểm chứng 3 luồng xóa đơn.

---


# Báo Cáo Nghiệm Thu: Logic Đổi NCC Đơn Đã Thanh Toán Theo Tỷ Lệ Ngày & Chuẩn Hóa Cột Công Nợ

- **Ngày thực hiện:** 02/11/2026 (Múi giờ `Asia/Bangkok`)
- **Người thực hiện:** 💰 Finance Specialist, ⚙️ Backend Specialist & 🎨 Frontend Lead
- **Người phê duyệt:** 👑 Master
- **Môi trường tác động:**
  - PostgreSQL Local Development (`mydtbmav`)
  - Backend Node.js / Knex / Express
  - Frontend React / TypeScript / Vite
- **Trạng thái nghiệm thu:** ✅ **ĐẠT (PASSED - 100%)**

---

## 1. Phạm Vi & Bối Cảnh (Scope)

### A. Vấn đề thực tế
1. Khi đơn hàng đã thanh toán (`ORDER_STATUS.PAID` hoặc `was_paid = true`) buộc phải đổi Nhà Cung Cấp (NCC), hệ thống trước đây không có cơ chế hoàn tiền chi phí NCC cũ theo thời gian còn lại, và modal sửa đơn bị khóa cứng ô chọn NCC.
2. Bảng `partner.supplier_order_cost_log` tồn tại cột thừa `refund_amount` (tàn tích từ script import V1 với chỉ 10 dòng cũ), trong khi toàn bộ core V2 không sử dụng, gây phân mảnh và rối rắm trong hạch toán công nợ.
3. Khi NCC nợ tiền Shop (tiền hoàn của NCC > tiền Shop nợ NCC), hệ thống chưa có cơ chế đảo chiều QR thanh toán (VietQR phải trỏ về tài khoản Shop và bỏ dấu trừ để mã QR hợp lệ).

### B. Giải pháp được Master phê duyệt
1. **Xóa bỏ hoàn toàn cột `refund_amount`** khỏi database, chuyển 10 dòng dữ liệu cũ sang `import_cost` âm tương ứng (`import_cost = -refund_amount`) và hợp nhất 100% công nợ về duy nhất 1 cột `import_cost` (lưu cả số dương và số âm).
2. **Logic tính toán tỷ lệ ngày (Prorated Calculation)**:
   - Số ngày còn lại: $\text{remainingDays} = \max(0, \text{expired\_at} - \text{today})$.
   - Tiền hoàn NCC cũ: $\text{refundOld} = \text{round}((\text{baseOldCost} / \text{totalDays}) \times \text{remainingDays})$.
   - Tạo 1 bản ghi log âm (`import_cost = -refundOld`, trạng thái `UNPAID`) ghi nhận NCC cũ nợ Shop.
   - Tính chi phí NCC mới: Tra cứu giá gói của NCC mới theo variant, tính $\text{costNew} = \text{round}((\text{newPrice} / \text{totalDays}) \times \text{remainingDays})$, tạo log dương mới cho NCC mới, cập nhật `order.cost = costNew`, `order.supply_id = newSupplyId`.
3. **Đảo chiều công nợ & VietQR**:
   - Nếu $\text{totalDebt} > 0$ (Shop nợ NCC): Hiển thị VietQR số tài khoản của NCC.
   - Nếu $\text{totalDebt} < 0$ (NCC nợ Shop): Hiển thị VietQR số tài khoản **mặc định của Shop** (`getDefaultShopBank`), tự động **bỏ dấu trừ** (`Math.abs(totalDebt)`) để link VietQR hợp lệ (`amount > 0`).

---

## 2. Chi Tiết Thực Thi Kỹ Thuật

### A. Database Migration
- File: [`backend/src/db/migrations/20261102000001_drop_supplier_refund_amount.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/migrations/20261102000001_drop_supplier_refund_amount.js)
  + Cập nhật 10 dòng V1 có `refund_amount > 0`: chuyển thành `import_cost = -refund_amount`.
  + Thực thi `ALTER TABLE partner.supplier_order_cost_log DROP COLUMN IF EXISTS refund_amount;`.
  + Đã chạy migration thành công lên CSDL: `Batch 4 run: 1 migrations`.

### B. Backend Services & Tables
- [`backend/src/db/tables.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/tables.js):
  + Xóa trường `REFUND_AMOUNT: "refund_amount"` khỏi `COLS.SUPPLIER_ORDER_COST_LOG`.
- [`backend/src/domains/orders/services/orderService.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/orders/services/orderService.js):
  + Export `getDefaultShopBank`.
  + Tích hợp logic đổi NCC cho đơn đã thanh toán: Tính số ngày còn lại theo `totalDays`, tạo log âm hoàn tiền cho NCC cũ, tra cứu giá gói NCC mới tạo log dương, cập nhật `order.cost`.
  + Đối với đơn chưa thanh toán đổi NCC: Cập nhật trực tiếp log chưa thanh toán hiện có.
- [`backend/src/domains/orders/services/orderPaymentService.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/orders/services/orderPaymentService.js):
  + Xóa bỏ gán `refund_amount: 0`.
- [`backend/src/domains/suppliers/services/supplierService.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/suppliers/services/supplierService.js):
  + Import `getDefaultShopBank`.
  + Quy hoạch toàn bộ phép tính công nợ về `import_cost` duy nhất.
  + Logic đảo chiều VietQR: Nếu `remainingDebt < 0` trả về QR tài khoản Shop mặc định (`getDefaultShopBank`), `Math.abs(remainingDebt)`, `qr_target_type = "SHOP"`.
  + Cập nhật `paySupplierDebt` hỗ trợ tất toán thu hồi tiền hoàn khi `settledDebt < 0` (đánh dấu log sang `PAID`).
- [`backend/src/domains/suppliers/services/supplierSettlementService.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/suppliers/services/supplierSettlementService.js):
  + Quy hoạch `settledDebt = total + toAmount(log[LOG_COLS.IMPORT_COST])`.
- [`backend/src/domains/payments/services/webhookPaymentService.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/payments/services/webhookPaymentService.js):
  + Bỏ phép trừ `refund_amount` trong câu `havingRaw`.

### C. Frontend UI & UX
- [`frontend/src/features/suppliers/types.ts`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/suppliers/types.ts):
  + Xóa trường `refund_amount`, bổ sung `debt_direction`, `qr_target_type`, `qr_bank_info`.
- [`frontend/src/features/suppliers/components/SupplierOverviewTable.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/suppliers/components/SupplierOverviewTable.tsx):
  + Tab 1: Badge công nợ linh hoạt (nợ âm: `NCC nợ: ...` màu cyan; nợ dương: `Nợ NCC: ...` màu đỏ hổ phách).
  + Tab 2: Hợp nhất cột thành `CHI PHÍ / CÔNG NỢ`, số âm hiển thị màu cyan `(Thu hồi: -...)`.
- [`frontend/src/features/suppliers/components/SupplierDetailModal.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/suppliers/components/SupplierDetailModal.tsx):
  + Thẻ KPI Công nợ ròng phản ánh số âm/dương trực quan.
  + Hộp thanh toán đảo chiều: Khi `amount_needed < 0` hiển thị box "NCC NỢ SHOP (CẦN HOÀN TRẢ)" cùng nút "Xác nhận đã nhận hoàn tiền"; khi `amount_needed > 0` hiển thị "Thanh toán cho NCC".
  + Tiêu đề và thông tin STK VietQR tự động cập nhật theo chiều công nợ (STK Shop khi NCC nợ).
- [`frontend/src/features/orders/components/OrderCreateEditModal.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/orders/components/OrderCreateEditModal.tsx):
  + Tháo bỏ hạn chế không cho chọn NCC khi sửa đơn; hiển thị `SearchableSupplierDropdown`.
  + Tự động hiển thị hộp cảnh báo trực quan khi đơn đã thanh toán được chọn sang NCC khác.

---

## 3. Kết Quả Kiểm Thử (Verification)

### A. Kiểm thử tích hợp tự động (Integration Test)
- File: [`backend/tests/integration/supplier_reassignment_prorated_debt.test.js`](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/supplier_reassignment_prorated_debt.test.js)
  + **Kịch bản 1**: Đơn hàng 30 ngày đã thanh toán, sau 10 ngày (còn 20 ngày) đổi từ NCC cũ sang NCC mới:
    - NCC cũ được tạo log âm `import_cost = -200.000 ₫` (tỷ lệ 20/30 của 300.000 ₫).
    - NCC mới được tạo log dương `import_cost = +266.667 ₫` (tỷ lệ 20/30 của giá gói 400.000 ₫).
    - Cập nhật giá vốn đơn hàng: `order.cost = 266.667 ₫`, `order.supply_id = NCC mới`.
  + **Kịch bản 2**: Đảo chiều VietQR khi NCC nợ Shop:
    - Chi tiết NCC cũ trả về `total_debt = -200.000 ₫`, `qr_target_type = "SHOP"`.
    - URL VietQR: `https://img.vietqr.io/image/970423-9183400998-compact2.png?amount=200000...` (không chứa dấu trừ, link hợp lệ 100%).
  + **Kịch bản 3**: Tất toán nợ âm thu hồi tiền:
    - Gọi API tất toán chuyển trạng thái log nợ âm sang `PAID`, công nợ NCC cũ về `0 ₫`.
  + **Kết quả chạy test**:
    ```
    PASS tests/integration/supplier_reassignment_prorated_debt.test.js
    ✓ Reassigning supplier on a PAID order calculates prorated debt and inverts QR code (100% pass)
    ```

### B. Toàn bộ Backend Unit Tests
- Lệnh: `npm test` trong thư mục `backend/`:
  - **61/61 test suites passed** (100%).
  - **306/306 tests passed**.

### C. Frontend Build & TypeScript
- Lệnh: `npm run build` trong thư mục `frontend/`:
  - `tsc -b`: 0 errors.
  - `vite build`: Hoàn thành trong 6.44s.

---

## 4. Kết Luận & Hướng Dẫn Vận Hành

- Toàn bộ nghiệp vụ đổi Nhà Cung Cấp cho các đơn Đã Thanh Toán và chuẩn hóa cột `import_cost` đã được triển khai hoàn tất, đạt tiêu chuẩn ACID và chuẩn kiến trúc V2.
- Khi triển khai lên VPS Production, chỉ cần chạy migration:
  ```bash
  npm run knex -- migrate:latest
  ```
  Hệ thống sẽ tự động chuyển đổi dữ liệu lịch sử và drop cột `refund_amount` an toàn.


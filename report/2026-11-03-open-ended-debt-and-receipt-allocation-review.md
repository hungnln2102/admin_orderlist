# BÁO CÁO NGHIỆM THU: NỢ KHÔNG THỜI HẠN (THẺ TÍN DỤNG), PHÂN BỔ BIÊN LAI SEPAY & THEO DÕI NGUỒN GỐC TÁCH BIÊN LAI

> **Ngày thực hiện (Asia/Bangkok):** 2026-11-03
> **Chủ đề:** Hỗ trợ nợ không thời hạn / Thẻ tín dụng, Phân bổ biên lai SePay vào nhiều khoản nợ, Sub-rows Dropdown lịch sử gán & Phân loại nguồn gốc biên lai tách
> **Trạng thái nghiệm thu:** ĐÃ HOÀN THÀNH & SẴN SÀNG NGHIỆM THU
> **Thực hiện:** Orchestrator Agent & Subagents (Lead Planner, Backend Specialist, Frontend Lead, QA Automation)

---

## 1. PHẠM VI THỰC HIỆN

### 1.1. Phân bổ biên lai SePay vào nhiều khoản nợ (Multi-Allocation) & Chống Double P&L:
- **Cơ chế kế toán kép**: Khi biên lai 1.000.000 ₫ được phân bổ 679.749 ₫ vào Nợ 1, biên lai cập nhật `unallocated_amount` = 320.251 ₫, trạng thái `PARTIALLY_ALLOCATED`. Số dư còn lại 320.251 ₫ được bảo toàn đầy đủ để tiếp tục gán vào các mục khác.
- **Nâng cấp UI**: Bổ sung phân loại `PERSONAL_DEBT` (Khoản nợ cá nhân) và `INSTALLMENT` (Khoản trả góp) trực tiếp trong [AllocateReceiptModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/invoices/components/AllocateReceiptModal.tsx).
- **Nâng cấp Backend**: Xử lý `PERSONAL_DEBT` và `INSTALLMENT` trong [invoiceService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/invoices/services/invoiceService.js) để trừ nợ, ghi log vào `debt_payment_logs` và chống ghi trùng vào `store_profit_expenses`.

### 1.2. Hỗ trợ nợ không thời hạn / Thẻ tín dụng (Revolving / Open-ended Debt):
- Cho phép người dùng chuyển đổi giữa 2 hình thức:
  - `💳 Thẻ tín dụng / Nợ mở (không thời hạn)`: Ẩn trường "Ngày dự kiến tất toán", không bắt buộc nhập ngày hết hạn. Giữ ngày đến hạn hàng tháng (sao kê).
  - `📅 Nợ có kỳ hạn tất toán`: Giữ nguyên ngày dự kiến tất toán và các chip kỳ hạn nhanh (3 tháng, 6 tháng, 1 năm, 2 năm).
- Backend [financeHubService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/finance/services/financeHubService.js): Hàm `normalizeDebtConfig` không còn ép buộc `debt_end_date` đối với nợ không kỳ hạn; hàm `calculatePersonalDebtMonthlyPayment` tính định mức tháng linh hoạt (5% dư nợ tối thiểu + lãi phát sinh hoặc chia 24 tháng) thay vì ép chia 365 ngày ảo.
- **Smart Accrual HUD**: Hiển thị trạng thái *"Thẻ tín dụng / Nợ linh hoạt"*, tính chỉ tiêu định mức ngày/tháng thực tế, cơ chế tích luỹ gom tiền đóng thẻ trước ngày sao kê hàng tháng.

### 1.3. Khắc phục mất biên lai ở tab "Chưa liệt kê" & Dropdown List Sub-rows:
- **Root Cause**: Bộ lọc tab `unlisted` trong `invoiceService.js` trước đó chỉ lấy `status = 'UNALLOCATED'`. Khi biên lai bị gán 1 phần, status đổi sang `PARTIALLY_ALLOCATED` nên bị loại khỏi tab `unlisted` ngay lập tức dù vẫn còn dư tiền.
- **Khắc phục Backend**: Sửa `applyUnlistedTabFilter` thành:
  ```javascript
  where status = 'UNALLOCATED' OR (status = 'PARTIALLY_ALLOCATED' AND COALESCE(unallocated_amount, 0) > 0)
  ```
- **Đính kèm lịch sử phân bổ con**: Trong `getInvoices`, truy vấn bảng `payment_receipt_allocations` và đính kèm `allocations: [...]`, `allocation_count`, `total_allocated` cho mỗi biên lai.
- **Giao diện [ReceiptsPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/ReceiptsPage.tsx)**:
  - **Cột "SỐ BIÊN LAI GÁN"** ở tab Đã liệt kê (`orders`, `other`): Hiển thị badge số mục đã gán (ví dụ: `2 mục`) kèm nút bấm mở rộng `ChevronDown` / `ChevronUp`.
  - **Dropdown Sub-rows (Bảng con)**: Bấm vào dòng biên lai sẽ mở bảng chi tiết các lần gán con (Lần #, Loại phân bổ, Đối tượng/Mã gán, Số tiền đã gán, Dư còn lại sau gán, Thời gian, Ghi chú).
  - **Nút "Phân bổ tiếp số dư này"**: Nếu biên lai vẫn còn dư tiền (`unallocated_amount > 0`), hiển thị số dư nổi bật kèm nút gán tiếp trực tiếp trong bảng con.
  - **Cột "NGUỒN GỐC BIÊN LAI"** tại tab **Chưa liệt kê (`unlisted`)**: Phân loại rõ ràng:
    - `✨ Biên lai gốc mới`: Biên lai chưa từng qua phân bổ.
    - `✂️ Phần còn lại (Biên lai #${id})`: Biên lai được tách số dư từ biên lai gốc, hiển thị số tiền gốc ban đầu và tổng số tiền đã phân bổ trước đó.
  - **Cột "SỐ TIỀN" tab Chưa liệt kê**: Hiển thị số dư thực tế còn lại (`unallocated_amount`) kèm số tiền gốc ban đầu gạch mờ bên dưới nếu đã qua tách.

---

## 2. DANH SÁCH FILE ĐÃ THAY ĐỔI

- [receiptStatus.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/constants/receiptStatus.js): Bổ sung `FIXED_COST`, `PERSONAL_DEBT`, `INSTALLMENT` vào `ALLOCATION_TYPE`.
- [invoiceService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/invoices/services/invoiceService.js):
  - Sửa `applyUnlistedTabFilter` giữ lại biên lai `PARTIALLY_ALLOCATED` có `unallocated_amount > 0`.
  - Bổ sung đính kèm `allocations`, `allocation_count`, `total_allocated` cho từng biên lai.
  - Xử lý phân bổ nợ cá nhân và trả góp, ghi log `debt_payment_logs`, chống double P&L.
- [financeHubService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/finance/services/financeHubService.js): Hỗ trợ nợ không thời hạn / thẻ tín dụng (`debt_end_date = null`).
- [PersonalAssetsModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/finance/components/PersonalAssetsModal.tsx): Bổ sung chế độ nợ không thời hạn, ẩn trường ngày tất toán, cập nhật Smart Accrual HUD.
- [AllocateReceiptModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/invoices/components/AllocateReceiptModal.tsx): Bổ sung chọn Trả nợ cá nhân & Trả góp.
- [ReceiptsPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/ReceiptsPage.tsx):
  - Thêm cột `SỐ BIÊN LAI GÁN` kèm nút Toggle Sub-row.
  - Thêm hàng bảng con Dropdown danh sách các lần phân bổ.
  - Thêm cột `NGUỒN GỐC BIÊN LAI` ở tab Chưa liệt kê.
- [personal_debt_and_receipt_allocation.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/personal_debt_and_receipt_allocation.test.js): Bộ test tích hợp toàn diện.

---

## 3. KIỂM TRA ĐÃ CHẠY (TESTING VERIFICATION)

1. **Integration Test Backend**:
   - Lệnh: `node --test backend/tests/integration/personal_debt_and_receipt_allocation.test.js`
   - Kết quả: `✔ Personal Debt - Nợ không thời hạn / Thẻ tín dụng & Phân bổ biên lai 1tr vào 2 cục nợ (204.6047ms)`
   - Kiểm tra thành công:
     - Tạo nợ không có `debtEndDate` thành công.
     - Lần 1 phân bổ 600k: Biên lai còn 400k, `status = PARTIALLY_ALLOCATED`, gọi `getInvoices({ tab: 'unlisted' })` biên lai VẪN NẰM TRONG tab Chưa liệt kê kèm `allocation_count = 1`.
     - Nợ 1 giảm từ 800k xuống 200k, có log trong `debt_payment_logs`.
     - Lần 2 phân bổ 400k: Biên lai về 0k, `status = FULLY_ALLOCATED`, gọi `getInvoices({ tab: 'other' })` xuất hiện ở tab `other` kèm `allocation_count = 2`, `total_allocated = 1.000.000 ₫`.
     - Tuyệt đối không có bản ghi nào bị ghi nhầm vào `store_profit_expenses`.

2. **TypeScript & Vite Build Frontend**:
   - Lệnh: `npm --prefix frontend run build` (`tsc && vite build`)
   - Kết quả: `✓ built in 3.34s` - 0 lỗi cú pháp, 0 lỗi TypeScript, bundle tối ưu.

---

## 4. KẾT LUẬN & ĐỀ XUẤT NGHIỆM THU

- Toàn bộ các yêu cầu của Master về:
  1. Phân bổ 1 biên lai nhiều khoản nợ không bị mất số dư.
  2. Nợ thẻ tín dụng không thời hạn / Smart Accrual HUD linh hoạt.
  3. Cột số biên lai gán & Dropdown sub-row xem chi tiết các lần gán con.
  4. Cột phân loại nguồn gốc biên lai tách ở tab Chưa liệt kê.
- Đã được triển khai hoàn chỉnh, đúng chuẩn nghiệp vụ kế toán và kiến trúc hệ thống!

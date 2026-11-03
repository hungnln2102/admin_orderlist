# BÁO CÁO NGHIỆM THU: NỢ KHÔNG THỜI HẠN (THẺ TÍN DỤNG) & PHÂN BỔ BIÊN LAI SEPAY VÀO NHIỀU KHOẢN NỢ

> **Ngày thực hiện (Asia/Bangkok):** 2026-11-03  
> **Chủ đề:** Hỗ trợ nợ không thời hạn / Thẻ tín dụng & Phân bổ biên lai SePay vào nhiều khoản nợ  
> **Trạng thái nghiệm thu:** ĐÃ HOÀN THÀNH & SẴN SÀNG NGHIỆM THU  
> **Thực hiện:** Orchestrator Agent & Subagents (Lead Planner, Backend Specialist, Frontend Lead, QA Automation)

---

## 1. PHẠM VI THỰC HIỆN

1. **Vấn đề 1: Phân bổ biên lai SePay (1.000.000 ₫) vào 2 khoản nợ (600.000 ₫ và 400.000 ₫)**:
   - Cơ chế kế toán: Khi phân bổ 600.000 ₫ vào Nợ 1, biên lai gốc cập nhật `unallocated_amount` = 400.000 ₫, trạng thái `PARTIALLY_ALLOCATED`. Số tiền 400.000 ₫ còn lại không bị mất và nằm nguyên trong biên lai để phân bổ tiếp vào Nợ 2.
   - Nâng cấp UI: Bổ sung loại phân bổ `PERSONAL_DEBT` (Khoản nợ cá nhân) và `INSTALLMENT` (Khoản trả góp) trực tiếp trong [AllocateReceiptModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/invoices/components/AllocateReceiptModal.tsx).
   - Nâng cấp Backend: Xử lý `PERSONAL_DEBT` và `INSTALLMENT` trong [invoiceService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/invoices/services/invoiceService.js) để trừ nợ, ghi log vào `debt_payment_logs` và chống ghi trùng vào `store_profit_expenses`.

2. **Vấn đề 2: Hỗ trợ nợ không thời hạn / Thẻ tín dụng (Revolving / Open-ended Debt)**:
   - Cho phép người dùng chuyển đổi giữa 2 hình thức:
     - `💳 Thẻ tín dụng / Nợ mở (không thời hạn)`: Ẩn trường "Ngày dự kiến tất toán", không bắt buộc nhập ngày hết hạn. Giữ ngày đến hạn hàng tháng (sao kê).
     - `📅 Nợ có kỳ hạn tất toán`: Giữ nguyên ngày dự kiến tất toán và các chip kỳ hạn nhanh (3 tháng, 6 tháng, 1 năm, 2 năm).
   - Backend [financeHubService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/finance/services/financeHubService.js): Hàm `normalizeDebtConfig` không còn ép buộc `debt_end_date` đối với nợ không kỳ hạn; hàm `calculatePersonalDebtMonthlyPayment` tính định mức tháng linh hoạt (5% dư nợ tối thiểu + lãi phát sinh hoặc chia 24 tháng) thay vì ép chia 365 ngày ảo.
   - Smart Accrual HUD (Cột phải): Hiển thị trạng thái *"Thẻ tín dụng / Nợ linh hoạt"*, tính chỉ tiêu định mức ngày/tháng thực tế, cơ chế tích luỹ gom tiền đóng thẻ trước ngày sao kê hàng tháng.

---

## 2. DANH SÁCH FILE ĐÃ THAY ĐỔI

- [receiptStatus.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/constants/receiptStatus.js): Bổ sung `FIXED_COST`, `PERSONAL_DEBT`, `INSTALLMENT` vào `ALLOCATION_TYPE`.
- [invoiceService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/invoices/services/invoiceService.js): Bổ sung xử lý phân bổ biên lai vào `PERSONAL_DEBT` và `INSTALLMENT`, ghi log `debt_payment_logs`, chống double P&L.
- [financeHubService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/finance/services/financeHubService.js): Cập nhật `normalizeDebtConfig` và `calculatePersonalDebtMonthlyPayment` hỗ trợ `debt_end_date = null`.
- [PersonalAssetsModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/finance/components/PersonalAssetsModal.tsx): Bổ sung nút chọn nợ không thời hạn, ẩn ô ngày tất toán, cập nhật Smart Accrual HUD linh hoạt.
- [AllocateReceiptModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/invoices/components/AllocateReceiptModal.tsx): Thêm nút chọn Trả nợ cá nhân & Trả góp, dropdown nạp danh sách nợ và trả góp tự động.
- [personal_debt_and_receipt_allocation.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/personal_debt_and_receipt_allocation.test.js): Test tích hợp kịch bản tạo thẻ tín dụng không thời hạn & phân bổ biên lai 1tr vào 2 cục nợ (600k + 400k).

---

## 3. KIỂM TRA ĐÃ CHẠY (TESTING VERIFICATION)

1. **Integration Test Backend**:
   - Lệnh: `node --test backend/tests/integration/personal_debt_and_receipt_allocation.test.js`
   - Kết quả: `✔ Personal Debt - Nợ không thời hạn / Thẻ tín dụng & Phân bổ biên lai 1tr vào 2 cục nợ (125.4752ms)`
   - Đạt 100% assertions:
     - Tạo nợ không có `debtEndDate` thành công.
     - Phân bổ lần 1 (600k): Biên lai còn 400k khả dụng, status `PARTIALLY_ALLOCATED`, Nợ 1 giảm từ 800k xuống 200k.
     - Phân bổ lần 2 (400k): Biên lai về 0k khả dụng, status `FULLY_ALLOCATED`, Nợ 2 giảm từ 500k xuống 100k.
     - Không có bất kỳ bản ghi nào chui vào `store_profit_expenses` (Bảo đảm P&L tuyệt đối không bị trừ sai).
2. **TypeScript & Vite Build Frontend**:
   - Lệnh: `npm --prefix frontend run build` (gồm `tsc && vite build`)
   - Kết quả: `✓ built in 4.07s` - Không có lỗi typecheck, không có warning cú pháp.

---

## 4. KẾT LUẬN & ĐỀ XUẤT NGHIỆM THU

- Toàn bộ 2 bài toán thực tế của Master đã được giải quyết triệt để tận gốc, tái sử dụng chuẩn mực hệ thống hiện hữu và tuân thủ nghiêm ngặt nguyên tắc kế toán kép.
- Sẵn sàng bàn giao cho Master trải nghiệm trực tiếp trên giao diện!


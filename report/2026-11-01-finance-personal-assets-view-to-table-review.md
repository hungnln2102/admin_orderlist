# Báo Cáo Nghiệm Thu: Chuyển Đổi finance.personal_assets từ View Sang Bảng Thực Thể

> **Ngày thực hiện:** 2026-11-01 (Múi giờ: `Asia/Bangkok`)  
> **Trạng thái nghiệm thu:** **PASSED (HOÀN THÀNH)**  
> **Chủ đề:** Khắc phục lỗi `cannot insert into view "personal_assets"` (PostgreSQL code: `55000`) khi tạo/sửa/xóa tài sản và nợ cá nhân tại `/api/finance/personal-assets`.

---

## 1. Phạm Vi Thực Hiện (Scope)

- **Backend Migration**: Tạo migration mới `20261101000001_convert_personal_assets_view_to_table.js` để chuyển `finance.personal_assets` từ một `VIEW UNION ALL` (gộp từ `personal_savings`, `personal_investments`, `personal_debts`) thành một **BẢNG THỰC THỂ (BASE TABLE)** hoàn chỉnh.
- **Tương thích ngược (Backward Compatibility)**: Tạo view tự động cập nhật `finance.personal_savings` (`SELECT * FROM finance.personal_assets WHERE type = 'SAVINGS'`).
- **Nguồn sự thật DB (Single Source of Truth)**: Cập nhật `TABLES.PERSONAL_SAVINGS` và bổ sung `COLS.PERSONAL_ASSETS`, `COLS.PERSONAL_SAVINGS` tại `backend/src/db/tables.js`.
- **Scheduler Task**: Cập nhật tác vụ định kỳ `creditSavingsProfitTask.js` để lọc rõ ràng `.where("type", "SAVINGS")`.

---

## 2. Nguyên Nhân Gốc (Root Cause)

1. **Giới hạn kỹ thuật của PostgreSQL**:
   - Trong migration `20261018000001_v2_complete_schema.js`, bảng `personal_assets` được tạo dưới dạng VIEW chứa `UNION ALL`.
   - PostgreSQL quy định các View chứa `UNION`, `INTERSECT`, hoặc `EXCEPT` **không thể tự động cập nhật (not automatically updatable)** khi nhận lệnh `INSERT`, `UPDATE`, hay `DELETE`.
2. **Xung đột thiết kế (Design Mismatch)**:
   - Các bảng con `personal_savings`, `personal_investments`, `personal_debts` đều sử dụng khóa chính `id BIGSERIAL` độc lập, dẫn đến nguy cơ trùng lặp ID (ID Collision) trên view chung.
   - Toàn bộ tầng Service [`financeHubService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/finance/services/financeHubService.js) và kế hoạch thiết kế gốc [`2026-10-14_unified_finance_hub_plan.md`](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-10-14_unified_finance_hub_plan.md) đều coi `personal_assets` là một bảng vật lý duy nhất.

---

## 3. Các Thay Đổi Chi Tiết

| File | Hành động | Mục đích |
| :--- | :--- | :--- |
| `backend/src/db/migrations/20261101000001_convert_personal_assets_view_to_table.js` | **Tạo mới** | Drop view cũ, tạo bảng vật lý `personal_assets` với 20 cột chuẩn, dọn dẹp các bảng con rỗng, tạo view updatable `personal_savings`. |
| `backend/src/db/tables.js` | **Cập nhật** | Bổ sung `COLS.PERSONAL_ASSETS`, `COLS.PERSONAL_SAVINGS`, trỏ `TABLES.PERSONAL_SAVINGS` trực tiếp vào `personal_assets`. |
| `backend/src/scheduler/tasks/creditSavingsProfitTask.js` | **Cập nhật** | Thêm điều kiện `.where("type", "SAVINGS")` để đảm bảo tác vụ tính lãi chỉ quét đúng các sổ tiết kiệm. |

---

## 4. Kết Quả Kiểm Thử (Testing & Verification)

1. **Migration Execution**:
   - Chạy `npm run migrate` thành công: `Batch 12 run: 1 migrations`.
   - Kiểm tra `information_schema.tables`:
     - `finance.personal_assets`: `BASE TABLE` (Khóa chính `id BIGSERIAL`, 20 cột hoàn chỉnh).
     - `finance.personal_savings`: `VIEW` (Updatable tự động).
2. **Kiểm thử CRUD Tài sản Cá nhân (`SAVINGS`)**:
   - `createPersonalAsset`: Tạo thành công sổ tiết kiệm mẫu, trả về đầy đủ metadata và ID hợp lệ.
   - `updatePersonalAsset`: Cập nhật thành công số tiền và ghi chú.
   - `deletePersonalAsset`: Xóa thành công bản ghi khỏi bảng vật lý.
3. **Kiểm thử Nghiệp vụ Nợ Cá nhân (`DEBT_PAYABLE`)**:
   - Tạo khoản nợ có lãi suất ngày và ngày hết hạn thành công.
   - `payPersonalAsset`: Trả bớt nợ kèm debit tài khoản thanh toán và ghi nhật ký `debt_payment_logs` thành công.
   - `borrowPersonalAsset`: Vay thêm nợ kèm credit tài khoản thanh toán và cập nhật số dư nợ thành công.
   - Kiểm tra ràng buộc ACID: Chặn thành công khi rút vượt số dư khả dụng (`Ví/Tài khoản không thể âm`).
   - Dọn dẹp sạch sẽ các bản ghi test và hoàn trả số dư tài khoản về trạng thái ban đầu.

---

## 5. Kết Luận & Nghiệm Thu

- Lỗi `cannot insert into view "personal_assets"` đã được xử lý triệt để tận gốc.
- Không phát sinh code thừa hay workarounds tạm bợ.
- API `/api/finance/personal-assets` trên UI hoạt động trơn tru cho toàn bộ các thao tác Thêm, Sửa, Xóa, Trả nợ, Vay thêm.

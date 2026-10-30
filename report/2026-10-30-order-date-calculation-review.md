# Báo Cáo Nghiệm Thu & Code Review: Cơ Chế Tính Ngày Khi Chỉnh Sửa Đơn Hàng

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-30
- **Chủ đề:** Quy tắc tính ngày tự động khi chỉnh sửa đơn hàng (Sửa ngày bắt đầu -> tự tính ngày hết hạn; Sửa ngày hết hạn -> giữ nguyên ngày bắt đầu)
- **Người thực hiện:** Hệ thống AI Agent (`frontend-lead`, `backend-specialist`, `qa-automation`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

## 1. Phạm Vi Thay Đổi

1. [frontend/src/features/orders/utils/durationUtils.ts](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/orders/utils/durationUtils.ts):
   - Bổ sung hàm tiện ích `calculateExpirationDateFromStart(startDateInput, variantOrText, fallbackDays)`.
   - Phân tích chu kỳ theo tháng (`--1m`, `--3m`, `--6m`, `--12m`), theo năm (`--1y`), ngày (`--30d`), với cơ chế kẹp an toàn ngày cuối tháng (VD: `31/01` + 1 tháng -> `28/02`).
2. [frontend/src/shared/components/DateRangePicker.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/shared/components/DateRangePicker.tsx):
   - Cập nhật định nghĩa prop `onChange: (start: string, end: string, changedField?: "start" | "end") => void`.
   - Loại bỏ đoạn code cũ tự động gán `startDate = selectedIso` khi người dùng bấm chọn ngày kết thúc nhỏ hơn ngày bắt đầu.
   - Gắn cờ định danh rõ ràng `"start"` hoặc `"end"` khi người dùng click lịch hoặc nhập date input.
3. [frontend/src/features/orders/components/OrderCreateEditModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/orders/components/OrderCreateEditModal.tsx):
   - Tích hợp `calculateExpirationDateFromStart` khi `changedField === "start"`, tính chính xác `expired_at` và `days` dựa theo biến thể gói (`variant_name`, SKU sản phẩm hoặc danh mục sản phẩm).
   - Khi `changedField === "end"` (hoặc chỉ sửa ngày hết hạn): giữ nguyên tuyệt đối `formData.order_date`, chỉ cập nhật `expired_at` và hiệu số ngày `days`.
4. [backend/tests/unit/durationUtils.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/unit/durationUtils.test.js):
   - Bộ test tự động kiểm thử toàn diện các trường hợp: chu kỳ 3 tháng (`Youtube_Fam--3m`), 1 tháng, 1 năm, và xử lý ngày cuối tháng (31/01 -> 28/02).

---

## 2. Phát Hiện & Đánh Giá Theo Mức Độ (Findings by Severity)

| Mức độ | Vấn đề phát hiện | Giải pháp đã xử lý |
| :--- | :--- | :--- |
| **Cao (High)** | Trong `DateRangePicker.tsx`, logic cũ tự động ghi đè `startDate` khi người dùng chọn ngày kết thúc trước ngày bắt đầu. | Đã loại bỏ logic ghi đè này, luôn truyền đúng `startDate` hiện tại và gán nhãn `changedField: "end"`. |
| **Cao (High)** | Trong `OrderCreateEditModal.tsx`, việc sửa ngày không phân biệt được người dùng đang sửa ngày bắt đầu hay ngày kết thúc, dẫn đến không tự động tính ngày hết hạn theo chu kỳ gói. | Bổ sung cờ `isStartDateChanged`, tự động truy xuất `matchedProduct` từ `productsCatalog` để lấy đúng cấu hình biến thể và cộng tháng chính xác. |
| **Trung bình (Medium)** | Trường hợp ngày cuối tháng (31/01 + 1 tháng) có thể bị tràn sang tháng 3 nếu chỉ cộng `Date.prototype.setMonth()`. | Tính toán `maxDays` của tháng đích để kẹp ngày an toàn (`Math.min(d, maxDays)`). |
| **Thấp (Low)** | Khả năng tương thích ngược của `DateRangePicker` với các nơi khác không truyền `changedField`. | `changedField` được đặt là optional (`?`), nếu không truyền thì hàm tự so sánh giá trị cũ và mới để nhận diện trường bị đổi. |

---

## 3. Kết Quả Kiểm Tra Đã Chạy

- **Unit Test (Node.js test runner):**
  - Chạy lệnh: `node --test backend/tests/unit/durationUtils.test.js`
  - Kết quả: **4/4 PASS** (Thời gian chạy: ~67ms, 0 lỗi).
- **TypeScript & Frontend Build (Vite):**
  - Chạy lệnh: `npm run build --prefix frontend`
  - Kết quả: **Thành công (built in 2.35s)**, không có cảnh báo kiểu dữ liệu hoặc lỗi cú pháp.

---

## 4. Điều Kiện Nghiệm Thu

- Không có điều kiện tồn đọng. Tính năng đã sẵn sàng để Master kiểm tra thực tế trên giao diện.


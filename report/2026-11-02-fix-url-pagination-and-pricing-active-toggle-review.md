# Báo Cáo Nghiệm Thu: Khắc Phục Đồng Bộ Phân Trang URL & Bật/Tắt Trạng Thái Bảng Giá

- **Ngày thực hiện:** 02/11/2026 (Múi giờ `Asia/Bangkok`)
- **Trạng thái nghiệm thu:** ✅ **ĐẠT (PASSED)**
- **Phạm vi tác động:**
  1. Khắc phục lỗi tự động giật về trang 1 khi người dùng gõ số trang trên URL (`useUrlPagination.ts`).
  2. Bổ sung tính năng chuyển trạng thái nhanh 1-Click (`Hoạt động ⇄ Ẩn`) trên Bảng Giá và công tắc bật/tắt trong Modal Sửa sản phẩm.

---

## 1. Chi Tiết Thay Đổi Kỹ Thuật

### A. Khắc Phục Lỗi Phân Trang URL (`frontend/src/shared/hooks/useUrlPagination.ts`)
- **Nguyên nhân gốc:** 
  - Khi render lần đầu hoặc khi người dùng nhập số trang trên thanh địa chỉ (ví dụ `?page=13`), state `totalPages` ở các trang ban đầu luôn khởi tạo là `1` do API chưa kịp fetch xong.
  - Hook `useUrlPagination` tính `safeTotalPages = Math.max(1, totalPages)` (= 1) và ép `page = Math.min(requestedPage, safeTotalPages)` (= 1).
  - Một `useEffect` chạy khi phát hiện `requestedPage !== page` đã kích hoạt hàm `updatePage(1, true)`, xóa sạch tham số `page` trên URL và ép người dùng quay về trang 1.
- **Giải pháp:**
  - `page` được lấy trực tiếp từ `requestedPage` (đọc từ `searchParams.get("page")`), tôn trọng số trang người dùng chỉ định.
  - Loại bỏ `useEffect` tự động xóa URL để bảo toàn số trang khi người dùng gõ trực tiếp hoặc F5 tải lại trang.
  - Hàm `setPage` khi bấm nút điều hướng (**Trước**, **Sau**, **Số trang**) vẫn đảm bảo giới hạn an toàn từ `1` đến `safeTotalPages`.

### B. Tính Năng Bật / Tắt Trạng Thái Bảng Giá (`is_active`)
1. **`frontend/src/features/pricing/types.ts`:**
   - Mở rộng interface `ProductFormData` hỗ trợ trường `is_active?: boolean`.
2. **`frontend/src/features/pricing/components/PricingTable.tsx`:**
   - Biến nhãn tĩnh `Hoạt động` / `Ẩn` trong cột TRẠNG THÁI thành nút bấm tương tác 1-Click.
   - Thêm trạng thái loading spinner khi đang cập nhật, vô hiệu hóa click lặp và ngăn chặn sự kiện `stopPropagation` (không làm mở rộng panel NCC khi bấm đổi trạng thái).
3. **`frontend/src/pages/PricingPage.tsx`:**
   - Thêm hàm `handleToggleActive`: Gửi request `PUT /api/products/:id` với `{ is_active: !currentStatus }`.
   - Cập nhật tức thì (optimistic update) danh sách `items` trên giao diện và hiển thị thông báo thành công.
   - Đồng bộ trường `is_active` khi mở Modal Tạo mới hoặc Sửa sản phẩm.
4. **`frontend/src/features/pricing/components/PricingCreateEditModal.tsx`:**
   - Bổ sung Section 4: Công tắc bật/tắt **Trạng Thái Kinh Doanh (Hoạt động / Ẩn)** kèm mô tả nghiệp vụ trực quan (Đang mở bán / Tạm ngưng).

---

## 2. Kết Quả Kiểm Thử (Testing Verification)

1. **Frontend Type-Check & Vite Build:**
   - Lệnh: `npm run build --prefix frontend`
   - Kết quả: `✓ built in 2.47s`, 0 error, các chunk được tạo hoàn chỉnh.
2. **Backend Unit Tests:**
   - Lệnh: `npm test --prefix backend`
   - Kết quả: `59/59 passed (100%)`, 948ms.

---

## 3. Điều Kiện Vận Hành & Khuyến Nghị
- Triển khai code mới lên VPS qua `./deploy.sh` để cập nhật container `admin_orderlist-frontend`.


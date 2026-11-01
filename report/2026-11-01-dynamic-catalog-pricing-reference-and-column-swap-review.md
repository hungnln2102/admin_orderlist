# Báo Cáo Đánh Giá & Nghiệm Thu: Đối Chiếu Giá Động Cho Đơn Cần Gia Hạn & Đảo Chiều Cột Bảng Giá

> **Thời gian thực hiện:** 01/11/2026 (Múi giờ `Asia/Ho_Chi_Minh`)  
> **Trạng thái nghiệm thu:** **ĐẠT (PASSED) 100%**  
> **Chỉ đạo thực hiện:** Master 👑

---

## 1. Phạm Vi Thay Đổi

1. **Sửa lỗi cập nhật bảng giá Catalog (Ảnh 2):**
   - Loại bỏ câu lệnh gọi `syncRenewRequiredOrdersPricing` trong `productService.updateProduct` (trước đó thiếu import gây `ReferenceError`).
   - Sửa bảng giá Catalog giờ chỉ lưu dữ liệu vào bảng `variant` và `variant_price`, không bao giờ bị nghẽn hoặc lỗi transaction.

2. **Cơ chế Đối Chiếu Động Giá Catalog Cho Đơn Cần Gia Hạn (Ảnh 4 — Đơn `#MAVLYGPK`):**
   - Tuân thủ chỉ đạo của Master: *"Không phải cập nhật cho đơn Cần Gia Hạn mà là đơn Cần Gia Hạn lấy đối chiếu với giá trong catalog"*.
   - Trong `orderService.js` (`attachBatchSupplierAndQrInfo` và `getOrderById`): Khi đơn ở trạng thái `RENEW_REQUIRED` (hoặc `Cần Gia Hạn`), hệ thống tự động đối chiếu động trực tiếp với bảng giá Catalog (`variant_price`) theo tiền tố đơn (`MAVL` -> Giá bán lẻ, `MAVC` -> Giá CTV, `MAVK` -> Giá KM, `MAVS` -> Giá SV).
   - Tự động cộng bảo toàn số đuôi Slot Suffix (1..100) của đơn hàng để không bị lệch tiền chuyển khoản.
   - Khi sản phẩm trong Catalog bị ngưng hoạt động (`is_active = false`): Tự động ẩn mã QR (`vietqr_url = null`) và ẩn thông tin thanh toán theo chỉ đạo của Master.
   - Bảng `order_list` trong cơ sở dữ liệu giữ nguyên lịch sử giá, các đơn `PAID` và `EXPIRED` không bao giờ bị biến động giá.

3. **Đảo chiều 2 cột bảng giá (Ảnh 3):**
   - Trên trang Bảng Giá Niêm Yết (`/pricing`), đảo vị trí cột `GIÁ CTV` nằm trước cột `GIÁ BÁN LẺ` ở cả thead và tbody của `PricingTable.tsx`.
   - Trong modal Tạo / Sửa Bảng Giá (`PricingCreateEditModal.tsx`), đảo trường nhập `Giá CTV (₫)` lên trước `Giá Bán Lẻ (₫)`.

---

## 2. Kết Quả Kiểm Tra & Nghiệm Thu Thực Tế Trên VPS

| Hạng mục kiểm thử | Kết quả mong đợi | Kết quả thực tế trên VPS | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Lưu giá sản phẩm Catalog** | Không văng lỗi 500, lưu thành công | API `updateProduct(99, { retail_price: 750000 })` trả kết quả thành công | **PASS** |
| **Đối chiếu động đơn `#MAVLYGPK`** | Đơn lấy giá `750.000 ₫` (+ slot suffix `100`), QR amount `750100` | Trả về `price: 750100`, `gross_selling_price: 750000`, `vietqr_url: ...amount=750100...` | **PASS** |
| **Bảo toàn dữ liệu DB gốc** | Bảng `order_list` không bị ghi đè | Truy vấn DB: `price = 672000.00`, `gross_selling_price = NULL` (không bị sửa) | **PASS** |
| **Cột bảng giá trên UI** | `GIÁ CTV` đứng trước `GIÁ BÁN LẺ` | Đã build và cập nhật giao diện web | **PASS** |
| **Unit Tests Backend** | 100% tests pass | `59/59` unit tests pass | **PASS** |
| **Frontend Production Build** | Vite & TypeScript build sạch | `tsc && vite build` hoàn tất không có lỗi | **PASS** |
| **Docker Containers VPS** | Tất cả containers Up & Healthy | `frontend`, `backend`, `postgres`, `redis` đều Up (healthy) | **PASS** |

---

## 3. Danh Sách Tệp Tác Động

- [`backend/src/domains/orders/services/orderService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js)
- [`backend/src/domains/products/services/catalogPricingService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/catalogPricingService.js)
- [`backend/src/domains/products/services/productService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/productService.js)
- [`backend/src/scheduler/tasks/updateOrderStatusTask.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/scheduler/tasks/updateOrderStatusTask.js)
- [`frontend/src/features/orders/components/OrderDetailModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderDetailModal.tsx)
- [`frontend/src/features/orders/types.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/types.ts)
- [`frontend/src/features/pricing/components/PricingTable.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/pricing/components/PricingTable.tsx)
- [`frontend/src/features/pricing/components/PricingCreateEditModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/pricing/components/PricingCreateEditModal.tsx)

# Báo Cáo Nghiệm Thu: Sửa Lỗi Gán Nhầm Biến Thể Đơn Hàng Trên VPS

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-30
- **Chủ đề:** Rà soát và sửa dữ liệu gán nhầm biến thể (`id_product` / `variant_name`) trên database VPS production
- **Phạm vi tác động:** Bảng `business.order_list` và `business.variant` trên PostgreSQL VPS (`mydtbmav`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

## 1. Phạm Vi & Bối Cảnh

- Master phát hiện đơn `#MAVLLUI65` thực tế là gói **Adobe 1PC 12 tháng** (có slot máy tính `WINDOWS-F6D8G21`, thời hạn 365 ngày, giá 896.000 đ) nhưng giao diện lại hiển thị tên `Adobe Renew (6 tháng)`.
- Yêu cầu:
  1. Truy cập trực tiếp VPS để rà soát toàn bộ các đơn hàng đã thanh toán (`PAID` và `RENEW_REQUIRED`).
  2. Xác định các đơn bị gán nhầm biến thể tương tự.
  3. Cập nhật chuẩn hóa dữ liệu cho các đơn bị gán nhầm theo lệnh phê duyệt của Master.

---

## 2. Các Đơn Hàng Đã Xử Lý

| STT | Mã Đơn | Khách Hàng | Trạng Thái | Dữ Liệu Cũ Bị Gán Nhầm | Dữ Liệu Mới Đã Fix Chuẩn Hóa | Kết Quả Hiển Thị Trên UI |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **1** | **`#MAVLLUI65`** | Tiệm Của Bống | `RENEW_REQUIRED` | `id_product: 239` (`Adobe Renew` — `Adobe_Renew--6m`) | **`id_product: 4`** (`Adobe 1PC Cố Định` — `Adobe80_1PC--12m`) | **`Adobe 1PC Cố Định (12 tháng)`** |
| **2** | **`#MAVC1Q5VI`** | Ke Toan Nam An Sg | `PAID` | `id_product: 49` (`Freepik Premium` — `Freepik_Per--6m`) | **`id_product: 266`** (`Freepik Premium` — `Freepik_Per--12m`) | **`Freepik Premium (12 tháng)`** |

---

## 3. Kiểm Tra & Nghiệm Thu (Verification)

1. **Kiểm tra trực tiếp database VPS qua PostgreSQL transaction (`admin_orderlist-postgres`):**
   - Đơn `#MAVLLUI65`: `id_product = 4`, `variant_name = 'Adobe 1PC Cố Định'`, `display_name = 'Adobe80_1PC--12m'`.
   - Đơn `#MAVC1Q5VI`: `id_product = 266`, `variant_name = 'Freepik Premium'`, `display_name = 'Freepik_Per--12m'`.
2. **Kiểm tra qua API Backend Service (`orderService.getOrders`):**
   - Dữ liệu được `enrich` chính xác với `variant_name` và `display_name` chu kỳ 12 tháng.
   - Giao diện Admin hiển thị đúng tên gói tương ứng với số ngày thực tế 365 ngày.
3. **Đồng bộ cơ sở dữ liệu local:**
   - Đã cập nhật tương ứng trên database dev local để đồng bộ dữ liệu.

---

## 4. Điều Kiện Nghiệm Thu

- Toàn bộ thay đổi thực hiện an toàn trong database transaction.
- Không làm thay đổi ngày đặt, ngày hết hạn, giá tiền, số dư hay lịch sử thanh toán của khách hàng.
- Hoàn tất và sẵn sàng nghiệm thu.


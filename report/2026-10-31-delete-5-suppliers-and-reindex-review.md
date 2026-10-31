# Báo Cáo Nghiệm Thu: Xóa 5 Nhà Cung Cấp & Sắp Xếp Lại ID (VPS Production)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-31
- **Chủ đề:** Xóa 5 NCC (Huy Zoom, @thanglongcung, Lê Anh Tuấn, @thaois_bot, @qshop123), dọn dẹp đơn hàng & gói kho, sắp xếp lại ID bảng NCC từ 1 đến 18
- **Môi trường:** VPS Production (`mydtbmav` trên PostgreSQL container `admin_orderlist-postgres`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

## 1. Kết Quả Thực Thi Chi Tiết

1. **Đã xóa 5 Nhà Cung Cấp**:
   - `Huy Zoom` (ID cũ 10)
   - `@thanglongcung` (ID cũ 16)
   - `Lê Anh Tuấn` (ID cũ 30)
   - `@qshop123` (ID cũ 70)
   - `@thaois_bot` (ID cũ 91)
   - Đã xóa sạch 21 dòng giá vốn (`supplier_cost`) và 6 dòng sổ nợ (`supplier_order_cost_log`) của 5 NCC này.
2. **Đã xóa vĩnh viễn 45 đơn hàng mồ côi**:
   - 42 đơn hết hạn (`EXPIRED`) của 5 NCC này.
   - 3 đơn hoàn tiền (`REFUNDED`): `#MAVL477ML`, `#MAVCFLXYF`, `#MAVCPDQEB`.
3. **Đã chuyển 3 đơn còn hiệu lực sang NCC `Mavryk`**:
   - `#MAVLRC8PT` (PAID, khách *Dương Đức Hùng*, 525.000 đ, hạn 14/11/2026).
   - `#MAVC87LQM` (PAID, khách *Phương Dung*, 100.000 đ, hạn 07/01/2027).
   - `#MAVCFF0LB` (RENEW_REQUIRED, khách *Jen*, 715.000 đ, hạn 03/11/2026).
4. **Đã xóa 1 gói kho mồ côi Bongmin**:
   - Gói ID 127 trong `warehouse.package_products` (`Adobe`, ghi chú test note).
5. **Đã sắp xếp lại toàn bộ ID của 18 NCC còn lại từ `1 ➔ 18`**:
   - 👑 **`Mavryk`**: ID **`1`** *(Shop chính)*.
   - 17 NCC đối tác: ID **`2 ➔ 18`** *(Ades = 2, Luv = 3, Lê Minh Nghĩa = 4, Toàn Mai = 5, Đỗ Thanh Hoài = 6, Trần Việt = 7, Nhi = 8, Khánh = 9, Nguyễn Sơn = 10, Member Ji = 11, Tài = 12, Az = 13, Badman = 14, Vân Anh = 15, @rocky_VIVA = 16, Trần Vỹ = 17, Yuna = 18)*.
   - Sequence `business.supplier_id_seq` đã reset về 18.
6. **Đã cập nhật mã nguồn & Cache**:
   - File [`supplierCheck.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/suppliers/utils/supplierCheck.js) đã hỗ trợ nhận diện `supplyId === 1` cho Mavryk.
   - Đã khởi động lại container backend và xóa sạch Redis cache (`FLUSHALL`).

---

## 2. Đối Soát Dữ Liệu Sau Thực Thi (Live Verification)

- **Số lượng NCC còn lại:** đúng **18 NCC** (liền mạch từ 1 đến 18, không còn trống bất kỳ ID nào ở giữa).
- **Số đơn mồ côi (`orphan_orders`):** **0**
- **Số giá vốn mồ côi (`orphan_costs`):** **0**
- **Số sổ nợ mồ côi (`orphan_logs`):** **0**
- **Số gói kho mồ côi:** **0**
- **Sức khỏe hệ thống:** 5 container Docker đều `Up` và `healthy`.

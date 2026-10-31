# Báo Cáo Kỹ Thuật: Sắp Xếp Lại ID Nhà Cung Cấp & Dọn Dẹp Gói Kho (VPS Production)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-31
- **Chủ đề:** Sắp xếp lại dải ID bảng `business.supplier` (1 -> 23) và dọn dẹp gói kho liên kết NCC đã xóa
- **Môi trường:** VPS Production (`mydtbmav` trên PostgreSQL container `admin_orderlist-postgres`)
- **Trạng thái:** **ĐÃ CHẠY DRY-RUN THÀNH CÔNG (CHỜ MASTER PHÊ DUYỆT)**

---

## 1. Hiện Trạng & Rà Soát Trước Khi Thực Hiện

### 1.1. Bảng Nhà Cung Cấp (`business.supplier`)
- Hiện có **23 Nhà Cung Cấp**.
- Dải ID hiện tại bị phân mảnh lớn do các NCC cũ bị xóa: `2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 22, 23, 30, 48, 68, 70, 71, 91, 92, 93`.
- Bảng Sequence `supplier_id_seq` đang ở mức 93.

### 1.2. Các Bảng Đang Tham Chiếu Đến ID Nhà Cung Cấp
1. **`business.order_list` (Đơn hàng)**: Có **1.016 đơn hàng** đang lưu `supply_id`.
2. **`business.supplier_cost` (Giá vốn biến thể)**: Có **213 bản ghi** `supplier_id`. *(Lưu ý: Bảng này có UNIQUE KEY `(variant_id, supplier_id)`, do đó phải dùng thuật toán Temporary Offset để tránh lỗi duplicate key)*.
3. **`business.supplier_order_cost_log` (Lịch sử nợ NCC)**: Có **441 bản ghi** `supply_id`.
4. Mã nguồn backend [`supplierCheck.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/suppliers/utils/supplierCheck.js): Đang có kiểm tra `supplyId === 22` cho NCC Mavryk.

### 1.3. Bảng Gói Match Variant & NCC (`warehouse.package_products`)
- Bảng `business.supplier_cost` (match variant - NCC) đã tự động dọn dẹp sạch nhờ Foreign Key CASCADE khi xóa NCC.
- Bảng kho `warehouse.package_products`: Phát hiện **1 bản ghi mồ côi** của NCC `Bongmin` vừa xóa:
  - `ID: 127` | Gói `Adobe` | `supplier = 'Bongmin'` | `slot: 2` | `match_rule: information`.
  - Bản ghi này sẽ được xóa hoàn toàn theo yêu cầu của Master.

---

## 2. Đề Xuất Bảng Ánh Xạ ID Mới (Mapping Plan)

### Phương Án Ưu Tiên (Đề xuất): Đưa `Mavryk` lên ID = 1 (NCC Shop Chính), các đối tác từ 2 -> 23

| Old ID | New ID | Tên Nhà Cung Cấp | Số Đơn Đang Giữ | Số Biến Thể Có Giá Vốn | Số Log Nợ |
| :---: | :---: | :--- | :---: | :---: | :---: |
| **22** | **1** | **Mavryk (Shop Chính)** | 11 đơn | 29 biến thể | 5 logs |
| 2 | 2 | Ades | 196 đơn | 36 biến thể | 79 logs |
| 3 | 3 | Luv | 86 đơn | 16 biến thể | 29 logs |
| 4 | 4 | Lê Minh Nghĩa | 258 đơn | 34 biến thể | 114 logs |
| 5 | 5 | Toàn Mai | 39 đơn | 11 biến thể | 16 logs |
| 6 | 6 | Đỗ Thanh Hoài | 81 đơn | 13 biến thể | 38 logs |
| 8 | 7 | Trần Việt | 17 đơn | 1 biến thể | 8 logs |
| 9 | 8 | Nhi | 18 đơn | 3 biến thể | 8 logs |
| 10 | 9 | Huy Zoom | 4 đơn | 4 biến thể | 4 logs |
| 11 | 10 | Khánh | 11 đơn | 5 biến thể | 5 logs |
| 12 | 11 | Nguyễn Sơn | 5 đơn | 3 biến thể | 3 logs |
| 13 | 12 | Member Ji | 14 đơn | 4 biến thể | 8 logs |
| 14 | 13 | Tài | 64 đơn | 12 biến thể | 26 logs |
| 16 | 14 | @thanglongcung | 49 đơn | 10 biến thể | 23 logs |
| 23 | 15 | Az | 14 đơn | 5 biến thể | 5 logs |
| 30 | 16 | Lê Anh Tuấn | 0 đơn | 0 biến thể | 0 logs |
| 48 | 17 | Badman | 7 đơn | 3 biến thể | 4 logs |
| 68 | 18 | Vân Anh | 20 đơn | 1 biến thể | 10 logs |
| 70 | 19 | @qshop123 | 55 đơn | 9 biến thể | 24 logs |
| 71 | 20 | @rocky_VIVA | 43 đơn | 4 biến thể | 15 logs |
| 91 | 21 | @thaois_bot | 1 đơn | 0 biến thể | 0 logs |
| 92 | 22 | Trần Vỹ | 13 đơn | 5 biến thể | 4 logs |
| 93 | 23 | Yuna | 10 đơn | 4 biến thể | 3 logs |

*(Nếu Master muốn giữ nguyên thứ tự ID cũ thì Mavryk sẽ là ID 14, Ades là ID 1)*.

---

## 3. Kết Quả Thử Nghiệm Dry-Run Kỹ Thuật

Đã chạy thử nghiệm thuật toán 2 bước (Temporary Offset `+10000` ➔ `New ID`) trên VPS:
- Cập nhật đồng bộ: 23 NCC, 1.016 đơn hàng, 213 giá vốn, 441 log công nợ.
- Sequence reset về 23.
- **Kết quả:** `matched_orders = 1016`, `matched_costs = 213`, `matched_logs = 441`. **100% khớp dữ liệu, 0 lỗi Unique Key.**


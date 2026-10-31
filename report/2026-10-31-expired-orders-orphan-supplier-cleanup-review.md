# Báo Cáo Nghiệm Thu: Dọn Dẹp Đơn Mồ Côi Nhà Cung Cấp Trên VPS Production

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-31
- **Chủ đề:** Dọn dẹp đơn hết hạn (`EXPIRED`), đơn hoàn tiền (`REFUNDED`) và chuyển 2 đơn `PAID` sang NCC Mavryk
- **Môi trường:** VPS Production (`mydtbmav` trên PostgreSQL container `admin_orderlist-postgres`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

## 1. Tóm Tắt Kết Quả Thực Thi

Đã thực thi commit an toàn trong PostgreSQL Transaction và dọn sạch cache Redis trên VPS:
- **Xóa thành công 115 đơn hết hạn (`EXPIRED`)**: giải phóng hoàn toàn các đơn cũ của 16 NCC đã bị xóa.
- **Xóa thành công 7 đơn hoàn tiền (`REFUNDED`)**: `#MAVLLOQO6`, `#MAVCMHHW9`, `#MAVCJ96B1`, `#MAVLU8VW`, `#MAVLNCHKC73`, `#MAVLEM74O`, `#MAVLGX4BR`.
- **Cập nhật thành công 2 đơn đã thanh toán (`PAID`)**:
  - `#MAVLV3URI` (ID: 603, khách Duc Tran, 453.000 đ) ➔ `supply_id = 22` (Mavryk).
  - `#MAVLSMUAW` (ID: 604, khách @xB_Pang, 848.000 đ) ➔ `supply_id = 22` (Mavryk).
- **Xóa sạch Redis Cache:** Đã chạy `redis-cli FLUSHALL` trên `admin_orderlist-redis` để giao diện web hiển thị đồng bộ ngay lập tức.

---

## 2. Đối Soát Dữ Liệu Sau Thực Thi (Verification)

1. **Số lượng đơn mồ côi (`supply_id NOT IN (SELECT id FROM business.supplier)`):**
   ```sql
   SELECT status, count(*) 
   FROM business.order_list 
   WHERE supply_id IS NOT NULL 
     AND supply_id NOT IN (SELECT id FROM business.supplier) 
   GROUP BY status;
   -- Kết quả: 0 rows (Không còn bất kỳ đơn nào bị mồ côi).
   ```
2. **Kiểm tra 2 đơn PAID:**
   ```sql
   SELECT o.id, o.id_order, o.customer, o.status, o.supply_id, s.supplier_name 
   FROM business.order_list o 
   LEFT JOIN business.supplier s ON o.supply_id = s.id 
   WHERE o.id IN (603, 604);
   -- Kết quả: Cả 2 đơn đều trỏ đúng supply_id = 22 (Mavryk).
   ```
3. **Thống kê trạng thái đơn hàng trên VPS hiện tại:**
   - `EXPIRED`: 639 đơn *(754 - 115 = 639)*
   - `PAID`: 331 đơn *(giữ nguyên 331 đơn)*
   - `REFUNDED`: 34 đơn *(41 - 7 = 34)*
   - `RENEW_REQUIRED`: 10 đơn *(giữ nguyên)*
   - `UNPAID`: 3 đơn *(giữ nguyên)*

---

## 3. Điều Kiện Nghiệm Thu

- Toàn bộ thay đổi thực hiện an toàn trong database transaction.
- Không phát sinh lỗi ràng buộc khóa ngoại hay ảnh hưởng tới các module kho, biên lai, phân bổ chi phí và tài chính.
- Nghiệm thu hoàn tất.

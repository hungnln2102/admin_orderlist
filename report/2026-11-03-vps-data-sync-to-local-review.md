# BÁO CÁO NGHIỆM THU: ĐỒNG BỘ DỮ LIỆU TỪ VPS PRODUCTION VỀ LOCAL

> **Ngày thực hiện (Asia/Bangkok):** 2026-11-03  
> **Chủ đề:** Export toàn bộ cơ sở dữ liệu PostgreSQL từ VPS Production (`180.93.43.169`) và Import vào Local Database (`mydtbmav`)  
> **Trạng thái nghiệm thu:** ĐÃ HOÀN THÀNH 100% (PASSED & SYNCED)  
> **Thực hiện:** Orchestrator Agent & Backend Specialist  

---

## 1. PHẠM VI THỰC HIỆN

1. **Sao lưu phòng ngừa (Safety Backup)**:
   - Dump database PostgreSQL local ra file `local_pre_import_backup.dump` trước khi ghi đè, bảo đảm an toàn dữ liệu 100%.
2. **Export từ VPS**:
   - Chạy lệnh `pg_dump` trực tiếp trong container `admin_orderlist-postgres` trên VPS Production (`180.93.43.169`).
   - Dung lượng file dump nén: **359 KB** (database thực tế ~16 MB).
3. **Download & Import**:
   - Sử dụng `scp` tải an toàn về máy local.
   - Sử dụng `pg_restore` (v16.14) nạp toàn bộ 19 schemas và dữ liệu các bảng vào database `mydtbmav` local.
4. **Đồng bộ Migration**:
   - Chạy `knex migrate:latest` trên database vừa import:
     `Batch 11 run: 1 migrations` (`20261103000001_add_card_reconciliation_columns.js`).
   - Cập nhật đầy đủ các cột mới (4 số cuối thẻ, định danh đối soát nợ, v.v.).
5. **Dọn dẹp**:
   - Đã xóa toàn bộ file dump tạm trên VPS (`/tmp/vps_mydtbmav.dump`) và local.

---

## 2. KẾT QUẢ KIỂM THỬ (TESTING VERIFICATION)

1. **Kiểm tra truy vấn dữ liệu**:
   - Toàn bộ 19 schemas (`business`, `finance`, `warehouse`, `cart`, `admin`, `system_automation`...) đã được khôi phục nguyên vẹn từ VPS.
2. **Integration Test**:
   - Chạy: `node --test backend/tests/integration/card_reconciliation_and_direct_borrow.test.js`
   - Kết quả: `✔ Card Reconciliation & Direct Bill Borrowing - PASS (126.2792ms)`.
3. **Toàn vẹn hệ thống**:
   - Database trên VPS là Read-Only trong suốt quá trình `pg_dump`, không ảnh hưởng tới người dùng hay dịch vụ trên Production.

---

## 3. KẾT LUẬN

Dữ liệu thực tế mới nhất từ VPS đã được đồng bộ 100% về máy local của Master. Master có thể khởi động `npm run dev` để làm việc trực tiếp với dữ liệu thật.


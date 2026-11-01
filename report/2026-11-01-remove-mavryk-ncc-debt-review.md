# Báo Cáo Nghiệm Thu: Xóa Dữ Liệu & Loại Trừ Công Nợ NCC Của Mavryk (Chủ Shop)

- **Ngày thực hiện:** 01/11/2026 (Múi giờ `Asia/Bangkok`)
- **Trạng thái nghiệm thu:** ✅ **ĐẠT (PASSED)**
- **Phạm vi tác động:**
  1. Loại bỏ toàn bộ dữ liệu ghi nhận chi phí / công nợ tồn dư của tài khoản nội bộ Mavryk (`supply_id = 1`) khỏi bảng `business.supplier_order_cost_log` trên Production Database.
  2. Cập nhật `backend/src/domains/suppliers/services/supplierService.js` để loại trừ hoàn toàn Mavryk khỏi tổng thống kê Stat Cards, danh sách Nhà Cung Cấp (Bảng Tổng) và Modal chi tiết NCC.

---

## 1. Chi Tiết Nguyên Nhân & Thay Đổi Kỹ Thuật

### A. Nguyên Nhân Gốc (Root Cause)
- Mavryk (`id = 1` trong bảng `business.supplier`) đại diện cho chính Shop/Chủ shop (tài khoản nội bộ), không phải nhà cung cấp bên thứ ba cần đối soát thanh toán nợ.
- Trong đợt migrate dữ liệu sandbox trước đây (`importV1OperationalDataToV2Sandbox.js`), 5 bản ghi chi phí lịch sử (ngày 25/10/2026 với các mã đơn `MAVNVPGES`, `MAVNM7MZK`, `MAVN2HPMY`, `MAVNR2E5M`, `MAVNMB3ZK`) đã bị ghi vào `business.supplier_order_cost_log` với `supply_id = 1`, tạo thành khoản nợ ảo 827.780 ₫ trên giao diện `/sources`.
- Khi tính tổng thống kê Top 4 Stat Cards, hệ thống quét toàn bộ log mà chưa loại trừ tài khoản nội bộ Mavryk.

### B. Giải Pháp Triệt Để Đã Thực Hiện
1. **Dọn dẹp sạch sẽ dữ liệu DB:**
   - Đã thực thi xóa triệt để 5 bản ghi log nợ của `supply_id = 1` trong `business.supplier_order_cost_log`.
   - Kiểm tra xác nhận: `SELECT COUNT(*) FROM business.supplier_order_cost_log WHERE supply_id = 1;` trả về `0`.
   - Khoản công nợ tổng toàn hệ thống lập tức giảm từ **5.887.780 ₫** xuống đúng **5.060.000 ₫** (giảm chuẩn xác 827.780 ₫).

2. **Cập nhật Backend Logic (`backend/src/domains/suppliers/services/supplierService.js`):**
   - **`statsQuery` (Top 4 Stat Cards):** Thêm điều kiện `WHERE (s.id != 1 AND LOWER(COALESCE(s.supplier_name, '')) != 'mavryk')` đảm bảo tuyệt đối không bao giờ cộng dồn số liệu của Mavryk vào tổng đơn nhập, tổng tiền nhập hoặc còn nợ NCC.
   - **`getSuppliersOverview` (Bảng Tổng NCC):** Bổ sung cờ nhận diện `isMavryk`, gán cứng các chỉ số hiển thị cho dòng Mavryk: `total_orders: 0`, `current_month_orders: 0`, `current_month_cost: 0`, `total_paid: 0`, `total_debt: 0`, `last_order_date: null`.
   - **`getSupplierDetailById` (Modal chi tiết NCC):** Gán an toàn `remainingDebt = 0`, `totalPaid = 0`, `totalRefund = 0`, `unpaidOrdersCount = 0`, và `vietqrUrl = null` (không hiển thị mã QR thanh toán nợ cho chính mình).

---

## 2. Kết Quả Kiểm Thử (Testing Verification)

1. **Backend Unit Tests:**
   - Lệnh chạy: `npm test --prefix backend`
   - Kết quả: `59/59 passed (100%)`, thời gian chạy 807ms.
2. **Database Integrity Verification (Production DB `mydtbmav`):**
   - Số bản ghi chi phí còn lại của Mavryk: `0`.
   - Tổng công nợ NCC thực tế toàn hệ thống: `5.060.000 ₫`.

---

## 3. Điều Kiện Vận Hành & Khuyến Nghị
- Cần deploy mã nguồn backend mới lên VPS và khởi động lại dịch vụ `admin_orderlist-backend` qua `./deploy.sh`.

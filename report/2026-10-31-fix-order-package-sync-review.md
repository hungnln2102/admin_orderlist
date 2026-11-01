# BÁO CÁO NGHIỆM THU: KHÓA CHẶT ĐỒNG BỘ KHO & GÓI SẢN PHẨM RIÊNG CHO ĐƠN NHẬP (MAVN)
**Mã nghiệm thu:** `FIX-ORDER-PKG-SYNC-2026-10-31`  
**Ngày thực hiện:** 31/10/2026 (Múi giờ Asia/Bangkok)  
**Phạm vi:** Backend `orderService.js`, Frontend `types.ts`, `OrdersPage.tsx`, Database Production VPS  
**Chủ trì:** Master Orchestrator & Lead Planner  
**Trạng thái:**  **NGHIỆM THU THÀNH CÔNG (PASSED & DEPLOYED)**

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
- **Vấn đề phát hiện:** Khi tạo một đơn bán lẻ bình thường (`MAVL...`), hệ thống lại tự động tạo mới một gói sản phẩm trong trang "Gói Sản Phẩm" (`warehouse.package_products`) và một tài khoản kho (`warehouse.accounts`).
- **Nguyên nhân kỹ thuật:**
  1. *Frontend:* `DEFAULT_FORM_DATA` trong `frontend/src/features/orders/types.ts` bị gán mặc định `save_to_warehouse: true` và `save_to_package: true`. Khi mở form tạo đơn bán hàng lẻ, modal ẩn 2 công tắc toggle này đi nên Master không thể thấy để tắt, form ngầm gửi `save_to_package: true`.
  2. *Backend:* Trong `backend/src/domains/orders/services/orderService.js`, câu lệnh kiểm tra dùng toán tử OR (`||`):
     ```javascript
     const shouldSyncWarehouseOrPackage = isMavn || String(id_order).toUpperCase().startsWith("MAVN") || payload.save_to_package === true || payload.save_to_warehouse === true;
     ```
     Do frontend gửi `save_to_package: true`, backend đã kích hoạt khối đồng bộ kho/gói và chèn bản ghi vào bảng `warehouse.package_products`.

---

## 2. CÁC THAY ĐỔI ĐÃ TRIỂN KHAI

### 2.1. Backend (`orderService.js`)
- Khóa chặt điều kiện: **Bắt buộc phải là đơn nhập kho (`isMavn`)** thì mới xét đến việc lưu kho hoặc tạo gói:
  ```javascript
  const isMavnOrder = isMavn || String(id_order).toUpperCase().startsWith("MAVN");
  const shouldSyncWarehouseOrPackage = isMavnOrder && (payload.save_to_package === true || payload.save_to_warehouse === true);
  if (shouldSyncWarehouseOrPackage) {
    await trx.savepoint(async (subTrx) => {
      const isSaveToWarehouse = payload.save_to_warehouse === true;
      const isSaveToPackage = payload.save_to_package === true;
      ...
  ```
- Mọi đơn bán hàng khách thông thường (`MAVC`, `MAVL`, `MAVT`...) bị chặn 100%, không bao giờ lọt vào khối lưu kho/gói.

### 2.2. Frontend (`types.ts` & `OrdersPage.tsx`)
- Đặt mặc định `save_to_warehouse: false` và `save_to_package: false` trong `DEFAULT_FORM_DATA`.
- Trong `OrdersPage.tsx`:
  - Mở form đơn bán lẻ: Reset rõ ràng `save_to_warehouse: false`, `save_to_package: false`.
  - Mở form đơn nhập hàng: Kích hoạt `save_to_warehouse: true`, `save_to_package: true`.
  - Khi submit payload: Ràng buộc `save_to_warehouse: isImportTab ? ... : false` và `save_to_package: isImportTab ? ... : false`.

### 2.3. Dọn dẹp dữ liệu rác trên Database VPS
- Đã xóa gói sản phẩm ID 136 (`Chat GPT` của `luongnhanson2002@gmail.com`) khỏi bảng `warehouse.package_products`.
- Đã xác nhận không còn tài khoản rác nào sót lại trong `warehouse.accounts` hay `warehouse.account_slots`.

### 2.4. Triển khai & Xác minh (Deploy & Verification)
- Commit git: `c7c15ead` (`fix: restrict warehouse and package sync exclusively to MAVN import orders`).
- Frontend Build: `tsc && vite build` hoàn tất không lỗi trong 2.32s.
- Backend Tests: 48/48 unit tests pass 100%.
- Deploy VPS: `./deploy.sh` chạy thành công, tất cả container `Up (healthy)`.

---

## 3. KẾT LUẬN
Lỗi tự động tạo gói sản phẩm khi tạo đơn hàng bán lẻ đã được khắc phục triệt để và an toàn.
Hệ thống hiện tại phân biệt rạch ròi 100%: Chỉ đơn nhập kho `MAVN` mới được phép tương tác với kho hàng và gói sản phẩm.


# Báo Cáo Nghiệm Thu: Thay Thế Chuyên Mục Cố Định Bằng Tag Phân Loại & Hiển Thị Tag Trong Bảng Kho Hàng

> **Thời gian:** 01/11/2026 (Múi giờ Asia/Bangkok)  
> **Người thực hiện:** Orchestrator Agent (Master Agent)  
> **Người phê duyệt:** 👑 Master (Sếp)  
> **Trạng thái:** ✅ **NGHIỆM THU THÀNH CÔNG (PASSED & DEPLOYED)**

---

## 1. PHẠM VI YÊU CẦU & THỰC HIỆN

Master yêu cầu:
1. Trong modal **Chỉnh Sửa Dịch Vụ & Cấu Hình Link** và **Thêm Dịch Vụ Mới**, thay thế ô chọn Chuyên mục cố định (5 mục cũ) bằng **Tag phân loại / biến thể** linh hoạt (chọn từ các Tag có sẵn hoặc tự gõ Tag mới).
2. Hiển thị Tag này ở cột **"Sản phẩm & Dịch vụ"** bên bảng Kho hàng (`/warehouse`).

---

## 2. CÁC TÁC ĐỘNG & THAY ĐỔI CHI TIẾT

### 2.1. Tầng Cơ Sở Dữ Liệu & Backend
- **Tập trung hóa Schema (`backend/src/db/tables.js`):**
  - Bổ sung định nghĩa cột `CATEGORY: "category"` vào hằng số `COLS.PRODUCT_NAMES` theo chuẩn Single Source of Truth của dự án.
- **Dịch vụ Kho Hàng (`backend/src/domains/warehouse/services/warehouseService.js`):**
  - `listCatalogItems`: Truy vấn và trả về đúng giá trị trường `pn.category` thay vì trả về tên dịch vụ cũ.
  - `createCatalogItem`: Lưu trường `category` vào bảng `warehouse.product_names`.
  - `updateCatalogItem`: Hỗ trợ cập nhật trường `category` trong transaction khi người dùng đổi Tag trong modal.
  - `listWarehouseAccounts`: Nạp thêm `pn.category as catalog_tag` và chuẩn hóa `variant_tag: srv.variant_tag || srv.catalog_tag || ""` cho từng slot tài khoản.

### 2.2. Tầng Giao Diện Frontend (React TSX)
- **Modal Chỉnh Sửa Dịch Vụ (`CatalogEditModal.tsx`):**
  - Chuyển trường *"Chuyên Mục (*)"* thành *"Tag Phân Loại / Biến Thể (*)"*.
  - Tích hợp ô nhập Tag kết hợp `<datalist>` gợi ý thông minh và khay nút bấm nhanh (Quick Tag Pills): `5Tb`, `2Tb`, `100gb`, `12 Tháng`, `6 Tháng`, `1PC Cố Định`, `Full App`, `Slot Team`, `Plus Cá Nhân`, `Gia Đình`...
  - Cho phép người dùng bấm chọn nhanh hoặc tự gõ bất kỳ Tag mới tùy thích (Creatable Tag).
  - Tích hợp khung **"Xem trước hiển thị"** (Live Preview) ngay trong form để Master xem trước diện mạo huy hiệu khi hiển thị ngoài bảng.
- **Modal Thêm Dịch Vụ Mới (`CatalogCreateModal.tsx`):**
  - Bổ sung cơ chế chọn/nhập Tag tương tự như Modal chỉnh sửa.
- **Bảng Tài Khoản Kho Hàng (`WarehouseAccountsTable.tsx`):**
  - Cột **"Sản phẩm & Dịch vụ"** (cả giao diện Desktop và Mobile): hiển thị tên dịch vụ kèm Tag biến thể (ví dụ: `• GOOGLE ONE 5TB [5TB]`, `• ADOBE [1PC CỐ ĐỊNH]`, `• CANVA [SLOT TEAM]`).
  - Hàng chi tiết từng slot khi mở rộng (Expanded sub-table): cột "Dịch vụ" hiển thị kèm Tag `[tag]` tương ứng.
- **Danh Mục Dịch Vụ (`WarehouseCatalogGrid.tsx`):**
  - Dạng Lưới Thẻ (Grid Cards): hiển thị Tag badge màu tím nổi bật ngay dưới tên dịch vụ.
  - Dạng Bảng (Table List): đổi cột "Chuyên Mục" thành "Tag Phân Loại / Biến Thể" với badge trực quan.

---

## 3. KIỂM THỬ & KẾT QUẢ NGHIỆM THU

1. **Frontend Compilation (TypeScript & Vite):**
   - Chạy `npm --prefix frontend run build` -> Hoàn thành trong 8.86s, 0 lỗi, 1707 modules transformed thành công.
2. **Backend Unit & Regression Tests:**
   - Chạy `npm --prefix backend test` -> **48/48 unit test pass 100%**.
3. **Triển Khai & Kiểm Tra Thực Tế Trên VPS:**
   - Đã push commit `040cacc0` lên nhánh `main`.
   - Đã fast-forward pull trên VPS `/var/www/admin_orderlist`.
   - Đã build lại container `admin_orderlist-frontend` và restart `admin_orderlist-backend`.
   - Đã xóa toàn bộ Redis cache và kiểm tra HTTP 200 OK trên live domain `https://admin.mavrykpremium.com`.
   - Kiểm tra dữ liệu: tài khoản `duch60606@gmail.com` (Google One 5Tb) và các tài khoản Adobe hiển thị chuẩn Tag `[5Tb]`, `[1PC Cố Định]` trên cột "Sản phẩm & Dịch vụ".

---

## 4. KẾT LUẬN
- Tính năng hoạt động mượt mà, đúng yêu cầu và tiêu chí nghiệm thu của Master.
- Không phát sinh side-effect lên các chức năng đơn hàng hay phân trang kho.

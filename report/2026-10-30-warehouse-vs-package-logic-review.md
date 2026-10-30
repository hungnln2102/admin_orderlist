# Báo Cáo Đánh Giá & Nghiệm Thu: Chuẩn Hóa Logic Danh Mục Dịch Vụ Kho vs Kho Gói Sản Phẩm

- **Ngày thực hiện:** 30/10/2026 (Múi giờ `Asia/Bangkok`)
- **Dự án:** `admin_orderlist`
- **Người thực hiện:** 👑 Orchestrator Agent & 📝 Lead Planner
- **Người phê duyệt:** 👑 Master (Sếp)
- **Trạng thái nghiệm thu:** ✅ **ĐÃ NGHIỆM THU HOÀN TOÀN (PASSED)**

---

## 1. Phạm Vi Thay Đổi

Bóc tách ranh giới và chuẩn hóa 2 phần nghiệp vụ theo đúng chỉ đạo của Master:

1. **Danh Mục Tên Dịch Vụ Kho (`/warehouse` - Tab Danh Mục):**
   - Định danh metadata tài khoản lưu trong kho là gì (`GoogleOne 5000gb`, `Adobe Edu`, `Mail`...).
   - Được liên kết với một loại sản phẩm hệ thống (`product_id` trỏ tới `business.product.id`).
   - Tách biệt hoàn toàn khỏi Kho gói sản phẩm.
   - Thêm dropdown chọn *"Sản phẩm hệ thống liên kết (Tùy chọn)"* và hiển thị badge liên kết trực quan.

2. **Kho Gói Sản Phẩm (`/package-products`):**
   - **Chỉ hiển thị các loại gói có `is_package = true`** trong bảng `warehouse.product_names`. Loại bỏ hoàn toàn việc nạp tràn lan 62 sản phẩm hệ thống ra ngoài giao diện thẻ tổng quan.
   - **Liên kết 2 chiều với Product gốc (`business.product`)**: Gán `warehouse.product_names.product_id` trỏ tới `business.product.id` cho các loại gói bán hàng (`Adobe -> 1`, `GoogleOne -> 3`, `Canva -> 17`, `Netflix -> 29`, `Youtube -> 44`, `Gemini -> 94`).
   - **Khớp đơn hàng (`matchingOrders`) chuẩn xác 100% bằng ID**: Khi duyệt đơn hàng, hệ thống ưu tiên so sánh trực tiếp `variant.product_id === packageCategory.product_id`. Đơn hàng thuộc đúng sản phẩm gốc mới được chiếm slot của gói, loại bỏ 100% rủi ro match nhầm chéo sản phẩm.
   - **Đồng bộ gia hạn đơn nhập hàng (MAVN)**: Dễ dàng nhận diện variant và display_name thuộc product gốc nào để đồng bộ ngày hết hạn cho kho gói.

---

## 2. Chi Tiết Thực Hiện

### 2.1. Cơ Sở Dữ Liệu (PostgreSQL)
- **Migration:** [`backend/src/db/migrations/20261030000001_add_product_id_to_warehouse_product_names.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/migrations/20261030000001_add_product_id_to_warehouse_product_names.js)
  - Bổ sung cột: `product_id BIGINT REFERENCES business.product(id) ON DELETE SET NULL`.
  - Tạo index: `idx_warehouse_product_names_product_id` tối ưu hiệu năng join.
  - Chạy `knex migrate:latest` thành công (Batch 10).

### 2.2. Backend Logic & APIs
- [`warehouseService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/services/warehouseService.js):
  - `listCatalogItems`: `LEFT JOIN business.product` để trả về `productId` và `systemProductName`.
  - `createCatalogItem` & `updateCatalogItem`: Nhận `productId` và lưu vào PostgreSQL.
  - `getSystemProducts`: Lấy danh sách sản phẩm hệ thống từ `business.product`.
- [`warehouseController.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/controllers/warehouseController.js):
  - Bổ sung controller `getSystemProducts`.
- [`routes/index.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/routes/index.js):
  - Bổ sung route `GET /api/warehouse/system-products`.
- [`productService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/productService.js):
  - `getPackageCategories`: Lọc các bản ghi có `is_package = true` hoặc đang có trong kho gói, tự động map `product_id` từ `business.product` và bật `is_package = true`. Trả về đúng 6 loại gói thực tế (`Adobe`, `Canva`, `Gemini`, `GoogleOne`, `Netflix`, `Youtube`).
  - `createPackageCategory`: Tự động tìm và lưu `product_id` khi tạo loại gói mới.
  - `updatePackageCategory`: Cập nhật `product_id` tương ứng khi đổi tên loại gói.
  - `getAllCatalogProductNames`: Cung cấp danh sách toàn bộ sản phẩm active của hệ thống cho modal `+ Tạo Loại Gói` để Master tùy chọn mở gói mới.
  - `getPackageProducts`: Truy vấn variant kèm `p.package_name` và `pn.product_id AS category_product_id`; trong `matchingOrders`, ưu tiên so sánh chính xác `Number(variant.product_id) === pkgProductId`.

### 2.3. Frontend (React TSX & Tailwind CSS)
- [`types.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/types.ts):
  - Bổ sung `productId`, `systemProductName` và interface `SystemProduct`.
- [`CatalogCreateModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogCreateModal.tsx):
  - Dropdown chọn *"Sản phẩm hệ thống liên kết (Tùy chọn)"*.
- [`CatalogEditModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogEditModal.tsx):
  - Cho phép chỉnh sửa *"Sản phẩm hệ thống liên kết"*.
- [`WarehouseCatalogGrid.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCatalogGrid.tsx):
  - Hiển thị badge `[📦 Tên Sản Phẩm]` bên cạnh tên dịch vụ cả ở dạng Thẻ (Grid) và dạng Bảng (Table).
- [`WarehousePage.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/WarehousePage.tsx):
  - Tải đồng thời `GET /api/warehouse/system-products` và truyền dữ liệu vào các modal.

---

## 3. Kiểm Tra & Thử Nghiệm Đã Chạy

| Hạng mục | Lệnh thực thi | Kết quả | Ghi chú |
|----------|---------------|---------|---------|
| **Database Migration** | `npm --prefix backend run migrate` | `Batch 10 run: 1 migrations` | Cột `product_id` & Index được thêm an toàn |
| **Backend Unit Tests** | `npm --prefix backend test` | 48/48 pass (100%) | Toàn bộ 9 suites test đều đạt |
| **Package Categories Integration Test** | `node --test backend/tests/integration/package_categories.test.js` | 7/7 pass (100%) | Đạt toàn bộ test lifecycle, matching slot & categories |
| **Frontend Production Build** | `npm --prefix frontend run build` | `tsc && vite build` (7.54s) | 0 lỗi TypeScript, bundle hoàn hảo |

---

## 4. Kết Luận
Thay đổi đáp ứng 100% chỉ đạo của Master:
1. Danh mục Loại Gói hiển thị đúng 6 loại gói thực tế đang bán (`is_package = true`), không bị tràn 62 sản phẩm hệ thống.
2. Cả 6 loại gói đều được gắn kết chặt chẽ với `business.product` gốc qua `product_id`, đảm bảo xác định chính xác biến thể (`variant`), tên hiển thị (`display_name`) và đồng bộ hạn dùng khi gia hạn đơn nhập hàng.

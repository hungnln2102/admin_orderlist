# KẾ HOẠCH MÓC NỐI DANH MỤC LOẠI GÓI VÀO BẢNG PRODUCT_NAMES CHO KHO GÓI V2
**Tác giả:** Antigravity Agent  
**Ngày lập:** 2026-10-13  

## 1. Bối cảnh & Mục tiêu
- **Vấn đề:** 
  - Giao diện `v2/frontend/src/features/packages/PackageManagementPage.tsx` đang hardcode tĩnh 6 loại gói (`Adobe`, `Canva`, `Gemini`, `GoogleOne`, `Netflix`, `Youtube`).
  - Khi thêm loại gói mới từ modal, dữ liệu chỉ lưu tạm vào React state trên RAM mà không lưu xuống Database.
  - Bảng cơ sở dữ liệu `warehouse.product_names` đã được bổ sung cột cờ `is_package` (Migration `20261013000002_add_is_package_to_product_names.js`) nhưng backend chưa có API truy vấn danh mục loại gói theo cờ này.
- **Mục tiêu:**
  - Xóa bỏ hoàn toàn dữ liệu hardcode tĩnh ở Frontend.
  - Xây dựng API Backend kéo danh mục loại gói trực tiếp từ `warehouse.product_names WHERE is_package = true`.
  - Tự động gieo mầm (seed/ensure) 6 loại gói ban đầu vào PostgreSQL nếu bảng chưa có, giúp dữ liệu hiển thị ổn định.
  - Móc nối modal "Tạo Loại Gói" để lưu thẳng dữ liệu mới vào PostgreSQL với cờ `is_package = true`.

## 2. Phân công & Thiết kế Chi Tiết

### 👨‍💻 Backend (Product & Warehouse Domain)
- **Service:** `v2/backend/src/domains/products/services/productService.js`
  - Viết `getPackageCategories()`: Lấy danh sách từ `warehouse.product_names` lọc theo `is_package = true`. Đảm bảo các gói cơ bản tồn tại.
  - Viết `createPackageCategory({ name, packageNote })`: Insert / Update bản ghi vào `warehouse.product_names` với `is_package = true`.
  - Cập nhật `getPackageProducts()`: Trả về `category` ưu tiên từ `pn.name` trong catalog.
- **Controller & Routes:**
  - `GET /api/products/packages/categories`
  - `POST /api/products/packages/categories`

### 🎨 Frontend (Packages Feature)
- **Types:** `v2/frontend/src/features/packages/types.ts`: Thêm `PackageCategory`.
- **Page Component:** `v2/frontend/src/features/packages/PackageManagementPage.tsx`:
  - Khởi tạo `categories` từ state rỗng `[]`.
  - Nạp danh mục từ `GET /api/products/packages/categories`.
  - Xử lý `handleAddCategory` gọi `POST /api/products/packages/categories` và cập nhật lại state.
  - Tính toán `categorySummaries` dựa trên dữ liệu thật từ DB.

## 3. Tiêu chuẩn Hoàn thành (Definition of Done)
- [x] 1. Không còn mảng tĩnh hardcode trong `PackageManagementPage.tsx`.
- [x] 2. Danh sách loại gói được load trực tiếp từ `warehouse.product_names WHERE is_package = true` qua API `GET /api/products/packages/categories`.
- [x] 3. Tạo loại gói mới (`POST /api/products/packages/categories`) và đổi tên (`PUT /api/products/packages/categories`) được lưu bền vững vào PostgreSQL.
- [x] 4. Thêm nút Xóa loại gói trên thẻ (`Trash2`), thực hiện xóa mềm (`is_package = false` qua `DELETE /api/products/packages/categories/:name`).
- [x] 5. Tích hợp Domain Events qua Event Bus (`PACKAGE_CATEGORY_CREATED`, `PACKAGE_CATEGORY_UPDATED`, `PACKAGE_CATEGORY_DELETED`) và tự động ghi log vào bảng `domain_event_store`.
- [x] 6. Đã viết Unit/Integration test `package_categories.test.js` (5/5 passed).
- [x] 7. Đã kiểm tra TypeScript frontend (`npx tsc --noEmit`) thành công 0 lỗi.
- [x] 8. Đã cập nhật tài liệu `v2/README.md`, `v2/ARCHITECTURE.md` và đồng bộ ra root `README.md`.
- [x] 9. Modal Tạo / Sửa Loại Gói: Tích hợp Dropdown nạp toàn bộ sản phẩm từ Master Catalog `warehouse.product_names` qua API `GET /api/products/packages/catalog-names` kèm nút icon `+` để người dùng linh hoạt tạo tên mới và tự động lưu vào bảng `warehouse.product_names`.
- [x] 10. Danh Mục Tên Dịch Vụ Kho: Thêm nút Xóa dịch vụ kèm rule kho phải trống (0 Slots). Backend chặn xóa nếu kho còn slot tồn kho/giữ chỗ hoặc liên kết gói (`DELETE /api/warehouse/catalog/:id`), Event `WAREHOUSE_CATALOG_DELETED`, kèm modal chuẩn Glassmorphic `CatalogDeleteModal.tsx`.
- [x] 11. Tối ưu Responsive & Truncate Text: Đảm bảo tiêu đề thẻ dịch vụ và loại gói co giãn mượt mà (`min-w-0 flex-1 truncate block`), cắt text dần dần bằng dấu `...` khi scale màn hình cho đến khi chạm breakpoint mới, không bị đẩy tràn huy hiệu trạng thái ra ngoài thẻ.
- [x] 12. Đăng Nhập Trình Duyệt Với Profile Độc Lập: Migration `20261013000003` thêm cột `login_url` vào `warehouse.product_names`. Backend `browserLauncherService.js` tự động nhận diện Chrome/Edge và khởi chạy trình duyệt với `--user-data-dir=".../browser_profiles/account_{id}"`. Nút "Đăng nhập" tại bảng chi tiết tài khoản kho kích hoạt API `POST /api/warehouse/accounts/:id/open-browser`. Event `WAREHOUSE_ACCOUNT_BROWSER_OPENED` được bắn lên Event Bus.
- [x] 13. Tối ưu Giao diện Thao Tác Bảng Kho (`WarehouseAccountsTable.tsx`): Chuyển 2 nút Thao tác (Chỉnh sửa `Pencil`, Xóa `Trash2`) từ dòng tài khoản cha xuống từng dòng dịch vụ trong sub-table và view mobile; chuyển nút Đăng nhập từ text thành icon `LogIn` đồng bộ; đổi tên cột thành "Thao tác"; dòng cha chỉ giữ lại icon mở rộng/thu gọn `ChevronDown`.
- [x] 14. Chỉnh Sửa Thông Tin Slot Dịch Vụ Kho: Xây dựng modal `WarehouseEditSlotModal.tsx` cho phép chỉnh sửa mật khẩu (`password`), email backup (`backup_email`), mã 2FA secret (`two_fa`), ngày hết hạn (`expires_at`), trạng thái slot (`status`), ghi chú và email tài khoản mẹ; xây dựng API `PUT /api/warehouse/services/:id` và cập nhật dữ liệu bền vững vào PostgreSQL `warehouse.account_slots`, phát event `WAREHOUSE_STOCK_UPDATED`.
- [x] 15. Dọn Dẹp & Hoàn Thiện Clean Code V2: Bổ sung `warehouseSubscriber.js` tự động lưu audit log cho mọi sự kiện kho vào `domain_event_store`; dọn dẹp prop thừa `onAddSlot` trong `WarehouseAccountsTable.tsx` & `WarehousePage.tsx`; sửa đường dẫn trùng lặp Microsoft Edge trong `browserLauncherService.js`; chuẩn hóa union type `WarehouseSlotStatus` an toàn tuyệt đối 0 lỗi TypeScript.
- [x] 16. Cơ Chế Toggle Unactive Thẻ Loại Gói Kho (`PackageManagementPage.tsx`): Cho phép người dùng bấm lại vào thẻ đang chọn để unactive (bỏ chọn); bảng dữ liệu tự động chuyển về hiển thị toàn bộ tất cả các gói; bổ sung nút `×` bỏ chọn nhanh trên badge trạng thái và đồng bộ search placeholder linh hoạt.
- [x] 17. Cấu Hình Tài Khoản Dung Lượng / Liên Kết (Storage Account) Cho Kho Gói: Migration `20261013000004` bổ sung cột `requires_storage` vào `warehouse.product_names`; tích hợp toggle bật/tắt Storage Account trên `CategoryModal.tsx` & API loại gói; nâng cấp modal `PackageCreateEditModal.tsx` hỗ trợ 2 khối tách biệt (Block 1: Tài khoản gốc + Block 2: Tài khoản dung lượng liên kết kèm dung lượng GB) với dropdown gợi ý tài khoản kho; triển khai trọn bộ API CRUD gói `POST/PUT/DELETE /api/products/packages` kết nối Event Bus; hiển thị huy hiệu `GỐC` và `LIÊN KẾT` rõ ràng trên `PackageTable.tsx`.
- [x] 18. Nâng Cấp Modal Thêm/Sửa Gói Kho Gói (`PackageCreateEditModal.tsx`):
  - Xóa bỏ ô nhập thủ công "Slot Đã Dùng" (`usedSlots`) do số slot đã dùng được tự động tính toán từ các đơn hàng liên kết (`order_list`).
  - Chuyển đổi các ô nhập tài khoản gốc và tài khoản liên kết sang thành Dropdown Combobox tương tác (`AccountCombobox`) hiển thị danh sách tài khoản từ kho (`warehouse.accounts`), hỗ trợ lọc tìm kiếm trực tiếp, nút mở đóng dropdown `ChevronDown`, nút xóa nhanh `X`, và hỗ trợ nhập tài khoản ngoài kho.
  - Bổ sung bộ chọn Chế độ liên kết đơn hàng (**Match Rule**): `Khớp Info Đơn (information)` vs `Khớp Theo Slot (slot)` vs `Cả Info & Slot (both)` với giao diện thẻ trực quan và mô tả chi tiết, lưu vào cột `match_rule` của bảng `warehouse.package_products`.


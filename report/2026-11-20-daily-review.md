# Báo Cáo Nghiệm Thu Hàng Ngày (Daily Technical Review) — 2026-11-20

> **Dự án:** `admin_orderlist`  
> **Chủ nhân tối cao:** 👑 Master (Sếp)  
> **Đơn vị thực hiện:** 👑 Orchestrator Agent & Đội ngũ Kỹ sư AI  
> **Tiêu chuẩn tuân thủ:** Hiến pháp `AGENTS.md`, Chuẩn mực Spec-Kit SDD, Gherkin Acceptance Criteria, ACID Database Transactions, Zero Vibe-Coding.

---

## ## [00:20] Hoàn Thiện Tính Năng Cấu Hình Tự Động Cấp Mã Key (Activation Key Rules) Theo Cặp Variant + NCC

### 1. Bối cảnh & Yêu Cầu Từ Master
- **Chỉ đạo nghiệp vụ của Master**:
  1. *"rồi không có bảng tạo sản phẩm để dùng key à"* (kèm ảnh trang Activation Keys thiếu phần cấu hình ánh xạ sản phẩm kho).
  2. *"cần gì chọn tiền tố. cứ chọn variant + supplier, đúng như cấu hình thì cấp key thôi"*.
  3. *"Phương Án A đi nhưng mà khi khách kiểm tra trên web, bóc slot gửi khách xong. Lấy tài khoản note vào cột slot bảng order_list nhé"*.

### 2. Thay Đổi Kỹ Thuật (Architecture & Implementation)

#### A. Database (PostgreSQL & Knex Migration)
- **Migration**: [backend/src/db/migrations/20261119000003_create_activation_key_rules.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/db/migrations/20261119000003_create_activation_key_rules.js).
- **Bảng dữ liệu**: `warehouse.activation_key_rules`
  - `id`: Khóa chính tự tăng.
  - `variant_id`: Liên kết `product.variants.id`.
  - `supplier_id`: Liên kết `suppliers.id`.
  - `product_name_id`: Liên kết `warehouse.product_names.id` (Kho slot đích).
  - `is_active`: Boolean (bật/tắt quy tắc).
  - `note`: Ghi chú.
  - `created_at`, `updated_at`: Timestamp.
  - **Ràng buộc toàn vẹn**: `UNIQUE (variant_id, supplier_id)`.
- **Đồng bộ SSOT Tables**: Cập nhật [backend/src/db/tables.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/db/tables.js) khai báo `TABLES.ACTIVATION_KEY_RULES` và `COLS.ACTIVATION_KEY_RULES`.

#### B. Backend Domain & Services
- **Service**: [backend/src/domains/products/services/activationKeyService.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/activationKeyService.js):
  - `listActivationKeyRules`: Truy vấn danh sách rule kèm số slot khả dụng (`available_slots_count`).
  - `saveActivationKeyRule`: Thêm mới hoặc cập nhật quy tắc cấp key theo cặp Variant + NCC.
  - `toggleActivationKeyRule`: Bật/tắt nhanh trạng thái của quy tắc.
  - `deleteActivationKeyRule`: Xóa quy tắc cấu hình.
  - `findMatchingKeyRule`: Tìm quy tắc đang active cho cặp `variantId` và `supplierId`.
  - `activateKeyWithTransaction`: Tự động tìm slot trống trong `warehouse.account_slots` theo `product_name_id`, khóa dòng FOR UPDATE (ACID), chuyển slot sang `IN_USE`, chuyển key sang `ACTIVATED`, và **tự động ghi đè tài khoản thực tế vào cột `slot` của `business.order_list`**.
- **Controllers & Routes**:
  - [backend/src/domains/products/controllers/activationKeyController.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/products/controllers/activationKeyController.js)
  - [backend/src/domains/products/routes/index.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/products/routes/index.js): Cung cấp các endpoints:
    - `GET /api/products/activation-key-rules`
    - `POST /api/products/activation-key-rules`
    - `PUT /api/products/activation-key-rules/:id/toggle`
    - `DELETE /api/products/activation-key-rules/:id`
    - `GET /api/products/activation-key-rules/check?variantId=...&supplierId=...`
- **Tự Động Hóa Trong Tạo Đơn Bán Hàng**:
  - [backend/src/domains/orders/services/orderService.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js):
    Khi gọi `createOrder`, hệ thống tự động kiểm tra `TABLES.ACTIVATION_KEY_RULES`. Nếu cặp `(newOrderData.id_product, newOrderData.supply_id)` khớp với rule active:
    1. Tự động sinh mã key ngẫu nhiên `PREFIX-XXXX-XXXX` (Prefix lấy từ tên Sản phẩm/Variant).
    2. Cập nhật mã key vào cột `slot` của `orders.order_list`.
    3. Thêm bản ghi `AVAILABLE` vào `warehouse.activation_keys` với `product_name_id = rule.product_name_id` và liên kết với `id_order`.

#### C. Frontend UI/UX
- **Component Quản Lý Cấu Hình**: [frontend/src/features/activationKeys/components/ActivationKeyRulesTab.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/activationKeys/components/ActivationKeyRulesTab.tsx):
  - Bảng danh sách quy tắc: STT, Sản Phẩm (Variant), Nhà Cung Cấp, Kho Slot Đích, Số Slot Khả Dụng (cảnh báo nếu hết slot), Trạng Thái On/Off (Toggle switch), Ghi chú, Nút xóa.
  - Modal "+ Thêm Cấu Hình Cấp Key": Tìm kiếm và chọn Variant, chọn NCC, chọn Kho slot đích, switch kích hoạt ngay.
- **Trang Quản Lý**: [frontend/src/pages/ActivationKeysPage.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/pages/ActivationKeysPage.tsx):
  - Phân chia thành 2 Tab trực quan: `Tab 1: Danh Sách Mã Key` và `Tab 2: Cấu Hình Cấp Key (Variant + NCC)`.
- **Modal Tạo Đơn Bán Hàng**: [frontend/src/features/orders/components/OrderCreateEditModal.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderCreateEditModal.tsx):
  - Tự động nhận diện cặp Variant + NCC khớp cấu hình -> Tự động bật chế độ Cấp Mã Key và hiển thị badge: `✨ Khớp cấu hình cấp key tự động (Kho: ...)`.

---

### 3. Kết Quả Kiểm Thử & Kiểm Toán (Verification & Testing)
1. **Kiểm tra Unit Tests Backend**:
   - `node --test backend/tests/unit/activationKeyService.test.js`: **6/6 passed** (0 lỗi).
2. **Kiểm tra Integration Test End-to-End**:
   - File test: [backend/tests/integration/activation_key_rules.test.js](file:///E:/Project/admin_store/admin_orderlist/backend/tests/integration/activation_key_rules.test.js).
   - Đã kiểm tra thành công:
     + Lưu cấu hình quy tắc (Variant + NCC -> Kho slot) thành công.
     + Tạo đơn hàng bán với Variant + NCC đó -> Đơn hàng tự động có mã key trong `order_list.slot`.
     + Bản ghi trong `warehouse.activation_keys` có `status = AVAILABLE` và đúng `product_name_id`.
     + Khách kích hoạt mã key qua `activateKeyWithTransaction` -> Hệ thống bốc slot từ `account_slots`, chuyển sang `IN_USE`, chuyển key sang `ACTIVATED`, và **tự động cập nhật tài khoản thật vào cột `slot` của `order_list`**!
     + **Kết quả**: 2/2 tests passed (354ms).
3. **Kiểm tra Frontend Build**:
   - `npm --prefix frontend run build`: **Build thành công 100%** (0 lỗi TypeScript / 0 lỗi Vite bundle).


---

## [00:50] Tối Ưu UX: Tự Động Random Mã Key Vào Ô Thông Tin Sản Phẩm (Information) & Bỏ Switch Thủ Công

### 1. Bối cảnh & Yêu Cầu Tinh Chỉnh Của Master
- **Chỉ đạo**: *"thay vì có cái này, thì chỉ cần lúc chọn sản phẩm và NCC xong thì ở input thông tin sản phẩm sẽ tự động random key. key sẽ lưu vào cột information luôn."*
- **Mục tiêu**:
  - Gỡ bỏ hoàn toàn switch `Cấp Mã Key (Tự nhận slot):` và form phụ rườm rà.
  - Khi người dùng chọn Variant + NCC, nếu có quy tắc active:
    - Input **Thông Tin Sản Phẩm (Tài khoản)** tự động điền mã key ngẫu nhiên.
    - Cột `information_order` trong cơ sở dữ liệu lưu mã key này.
    - Cột `slot` để trống chờ khách hàng kích hoạt trên Web Portal để ghi nhận tài khoản thực tế.

### 2. Các Thay Đổi Đã Thực Hiện
- **Frontend** [OrderCreateEditModal.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderCreateEditModal.tsx):
  - Xóa bỏ switch và modal con phụ.
  - Tự động sinh mã key vào `formData.information_order` khi chọn Variant + NCC khớp cấu hình.
  - Hiển thị badge: `✨ Tự động cấp key (Kho: ...)` và nút làm mới key ngẫu nhiên ngay tại input.
  - Cột `slot` để trống như thiết kế gốc.
- **Backend** [orderService.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js):
  - Lấy mã key từ `createdOrder.information_order` (hoặc tự sinh nếu trống) để tạo bản ghi trong `warehouse.activation_keys`.
  - Không ghi đè key vào `slot` của `orders.order_list` (để dành cho tài khoản thực tế khi khách bóc slot).
- **Test Suite** [activation_key_rules.test.js](file:///E:/Project/admin_store/admin_orderlist/backend/tests/integration/activation_key_rules.test.js):
  - Khẳng định `createdOrder.information_order` lưu mã key.
  - Khẳng định `createdOrder.slot` ban đầu trống.
  - Khẳng định sau khi khách kích hoạt, `order_list.slot` nhận tài khoản thật, `information_order` vẫn giữ nguyên mã key.

### 3. Kết Quả Kiểm Thử
- `node --test backend/tests/integration/activation_key_rules.test.js`: **2/2 passed (142ms)**.
- `node --test backend/tests/unit/activationKeyService.test.js`: **6/6 passed (4ms)**.
- `npm --prefix frontend run build`: **Build Vite thành công 100% (0 lỗi TS / 0 warning)**.

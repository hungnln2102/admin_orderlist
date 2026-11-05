# Kiến trúc Hệ thống V2 & Cơ chế Match Tài khoản Chính — Tài khoản Dung lượng

Tài liệu này tổng hợp thiết kế kiến trúc cơ sở dữ liệu V2, cơ chế quản lý kho, và cách thức hệ thống V2 thực hiện match giữa **Tài khoản chính (Main Account)** và **Tài khoản dung lượng / liên kết (Storage Account)**.

---

## 1. Tổng quan Kiến trúc Schema & Migration V2

Hệ thống V2 được chuẩn hóa thành một nguồn dữ liệu độc lập (Fresh Production Base) thông qua file migration hợp nhất duy nhất:
[`20261018000001_v2_complete_schema.js`](file:///e:/Project/admin_store/admin_orderlist/v2/backend/src/db/migrations/20261018000001_v2_complete_schema.js).

Các schema chính trong hệ thống:
- **`business`**: Quản lý đơn hàng (`order_list`), sản phẩm (`product`), biến thể (`variant`), giá biến thể (`variant_price`).
- **`billing` / `receipt`**: Quản lý biên lai thanh toán (`payment_receipt`), phân bổ biên lai (`payment_receipt_allocations`), ghi chú tín dụng hoàn tiền (`refund_credit_notes`).
- **`warehouse`**: Quản lý tên sản phẩm dịch vụ (`product_names`), tài khoản kho (`accounts` / `TABLES.PRODUCT_KEYS`), slot tài khoản (`account_slots`), và gói sản phẩm kho (`package_products`).
- **`finance`**: Quản lý tài khoản ngân hàng / ví (`financial_accounts`), sổ cái (`financial_account_ledger`), chi phí cố định (`fixed_costs`), trả góp (`installments`), tài sản cá nhân (`personal_savings`, `personal_investments`, `personal_debts`) và view tương thích `personal_assets`.
- **`system_automation`**: Quản lý cấu hình hệ thống (`system_configs`), sự kiện domain (`domain_event_store`), log thông báo (`notification_logs`).
- **`admin`**: Quản lý người dùng hệ thống (`users`).

---

## 2. Cơ chế Match Tài khoản Chính & Tài khoản Dung lượng

### 2.1. Cấu trúc Bảng Kho Gói Sản Phẩm (`warehouse.package_products`)
Trong kho gói sản phẩm, mỗi gói được định nghĩa rõ ràng giữa tài khoản chính cung cấp dịch vụ và tài khoản dung lượng đi kèm:
- **`account_id`**: Khóa ngoại (`BIGINT`) trỏ đến bảng [`warehouse.accounts(id)`](file:///e:/Project/admin_store/admin_orderlist/v2/backend/src/db/migrations/20261018000001_v2_complete_schema.js#L278). Đây là **Tài khoản chính** của gói (ví dụ: tài khoản Adobe, Netflix, YouTube chính dùng để cấp slot).
- **`storage_account_id`**: Khóa ngoại (`BIGINT`) trỏ đến bảng [`warehouse.accounts(id)`](file:///e:/Project/admin_store/admin_orderlist/v2/backend/src/db/migrations/20261018000001_v2_complete_schema.js#L278). Đây là **Tài khoản dung lượng / liên kết** (ví dụ: tài khoản Google One lưu trữ, tài khoản Adobe storage phụ). Có thể `NULL` nếu gói không yêu cầu storage riêng.
- **`storage_total`**: Cột `TEXT` lưu hạn mức dung lượng (ví dụ: `"200GB"`, `"2TB"`).
- **`service_note` / `package_note`**: Nơi lưu giữ dấu vết các thông tin mở rộng (như thông tin từ `stock_service_id` của V1). **Tuyệt đối không map nhầm các dấu vết này thành ID tài khoản.**

### 2.2. Thuật toán Match tự động (`findOrCreateAccount`)
Khi hệ thống xử lý tạo/cập nhật gói sản phẩm hoặc đồng bộ đơn hàng (`[productService.js](file:///e:/Project/admin_store/admin_orderlist/v2/backend/src/domains/products/services/productService.js#L849)` và `[orderService.js](file:///e:/Project/admin_store/admin_orderlist/v2/backend/src/domains/orders/services/orderService.js#L673)`):
1. **Kiểm tra tồn tại**: Hệ thống chuẩn hóa chuỗi username (bỏ khoảng trắng, chuyển lowercase) và tra cứu trong `warehouse.accounts`.
2. **Tái sử dụng (Reuse)**: Nếu tài khoản đã tồn tại, trả về ID ngay lập tức.
3. **Tạo mới (Auto-Create)**: Nếu chưa tồn tại, tự động `INSERT` bản ghi mới vào `warehouse.accounts` và trả về ID.
4. **Gán liên kết**: Gán ID tài khoản chính vào `account_id` và ID tài khoản dung lượng vào `storage_account_id` của bảng `warehouse.package_products`.

---

## 3. Cấu trúc Slot Kho (`warehouse.account_slots`)
Bảng quản lý từng slot chi tiết trong tài khoản kho được cấu trúc chuẩn hóa với các trường bảo mật và thông tin mở rộng:
- `id` (PK)
- `account_id` (FK tới `warehouse.accounts`)
- `name_id` (FK tới `warehouse.product_names`)
- `slot_index` (Thứ tự slot)
- `password`, `key_hint`
- `backup_email` (Email dự phòng của slot)
- `two_fa` (Mã xác thực 2 bước)
- `status` (`AVAILABLE`, `RENTED`, ...)
- `customer`, `contact`, `id_order`, `days`, `expired_at`
- `service_note` (Ghi chú dịch vụ cho slot)
- `created_at`, `updated_at`

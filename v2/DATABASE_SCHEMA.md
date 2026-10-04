# BẢN ĐỒ CẤU TRÚC DỮ LIỆU V1 & KẾ HOẠCH TÁI CẤU TRÚC DATABASE V2

Document này lưu trữ toàn bộ bản đồ cơ sở dữ liệu hiện tại của V1 và lộ trình chuẩn hóa, tái cấu trúc dữ liệu cho phiên bản V2.

---

## I. BẢN ĐỒ CHI TIẾT CƠ SỞ DỮ LIỆU V1 (CURRENT STATE)

Hệ thống V1 hiện tại đang vận hành với **14 Schemas** và hơn **60 Bảng/Views**.

### 1. Schema `orders` (Quản lý Đơn hàng)
- **`order_list`**: Bảng dữ liệu trung tâm lưu trữ toàn bộ thông tin đơn hàng (mã đơn `id_order`, thông tin gói, thông tin khách hàng `customer`, thông tin liên hệ `contact`, slot/tài khoản `slot`, ngày đặt `order_date`, số ngày `days`, ngày hết hạn `expired_at`, giá bán `price`, giá bán gộp `gross_selling_price`, chi phí nhập `cost`, tiền hoàn `refund`, phương thức thanh toán `payment_method`, trạng thái `status`, mã nhà cung cấp `supply_id`, mã sản phẩm `id_product`).
- **`order_customer`**: Bảng phụ lưu trữ thông tin chi tiết người mua.
- **`order_payment_slots`**: Quản lý cấp phát đuôi tiền lẻ (Slot Suffix 1..100) để phục vụ tạo mã VietQR tự động không trùng lặp.
- **`v_payment_slot_health`** *(View)*: Theo dõi trạng thái hoạt động của các slot thanh toán.

### 2. Schema `partner` (Nhà cung cấp & Chi phí nhập hàng)
- **`supplier`**: Danh sách nhà cung cấp (tên NCC `supplier_name`, số tài khoản `number_bank`, mã ngân hàng `bin_bank`, chủ tài khoản `account_holder`, trạng thái hoạt động `active_supply`).
- **`supplier_order_cost_log`**: Log chi tiết giá vốn nhập hàng, số tiền hoàn từ NCC và trạng thái thanh toán công nợ (`ncc_payment_status`).
- **`supplier_payments`**: Quản lý tổng hợp công nợ và thanh toán cho nhà cung cấp.

### 3. Schema `product` (Sản phẩm & Gói dịch vụ)
- **`product`**: Danh mục gói/sản phẩm chính (`package_name`, `is_active`, `package_requires_activation`, `image_url`).
- **`variant`**: Các biến thể gói dịch vụ (`variant_name`, `display_name`, `base_price`, `form_id`).
- **`variant_price`**: Bảng giá dịch vụ phân tầng theo nhóm khách hàng (`price`, `margin_ratio`).
- **`supplier_cost`**: Giá vốn nhập sản phẩm từ từng nhà cung cấp.
- **`stock_services`, `product_stocks`, `package_product`, `import_package_rules`**: Hệ thống quản lý kho hàng và quy tắc cấp phát dịch vụ tự động.
- **Bảng phụ trợ**: `category`, `product_category`, `pricing_tier`, `desc_variant`, `productid_payment`, `variant_sales_summary`, `reviews`.

### 4. Schema `receipt` (Hóa đơn, Giao dịch & Thẻ ghi nợ/Hoàn tiền)
- **`payment_receipt`**: Nhật ký giao dịch biến động số dư / Sepay webhook.
- **`payment_receipt_batch`, `payment_receipt_batch_item`**: Quản lý gộp nhóm giao dịch thanh toán.
- **`payment_receipt_financial_state`, `payment_receipt_financial_audit_log`**: Trạng thái và nhật ký kiểm toán tài chính.
- **`refund_credit_notes`**: Quản lý Thẻ ghi nợ hoàn tiền (Credit Note) cấp cho khách hàng (`credit_code`, `refund_amount`, `available_amount`, `status`).
- **`refund_credit_applications`**: Lịch sử áp dụng Thẻ ghi nợ vào các đơn hàng mới.

### 5. Schema `admin` (Tài khoản Shop & Quản trị)
- **`users`**: Tài khoản quản trị viên hệ thống (`userid`, `username`, `passwordhash`, `role`).
- **`shop_bank_accounts`, `shop_bank_account_ledger`**: Danh sách tài khoản ngân hàng của Shop và sổ cái biến động số dư.
- **`usdt_wallets`, `usdt_wallet_ledger`**: Danh sách ví USDT và sổ cái giao dịch USDT.
- **`site_settings`, `ip_whitelist`**: Cấu hình chung và Whitelist địa chỉ IP truy cập.

### 6. Schema `system_automation` (Tự động hóa & Event Logs)
- **`accounts_admin`, `product_system`, `mail_backup`**: Quản lý tài khoản và luồng tự động gia hạn/kích hoạt tài khoản (Adobe/Google/Canva...).
- **`order_list_keys`, `order_user_tracking`, `user_account_mapping`**: Quản lý chìa khóa/mã kích hoạt và theo dõi người dùng.
- **`system_event_logs`, `domain_event_store`**: Nhật ký lưu trữ sự kiện hệ thống.

### 7. Schema `dashboard` (Báo cáo & Tài chính)
- **`daily_revenue_summary`, `dashboard_monthly_summary`**: Bảng tổng hợp doanh thu, chi phí và lợi nhuận theo ngày/tháng.
- **`store_profit_expenses`, `dashboard_financial_change_log`, `trans_dailybalances`, `master_wallettypes`, `saving_goals`**: Quản lý chi phí vận hành và mục tiêu tiết kiệm.

### 8. Các Schemas phụ trợ V1
- **`customer_web`**: `accounts`, `roles`, `customer_profiles`, `customer_spend_stats`, `customer_tiers`, `tier_cycles`, `customer_type_history`, `audit_logs`, `password_history`, `refresh_tokens`.
- **`wallet`**: `wallets`, `wallet_transactions`.
- **`content`, `form_desc`, `promotion`, `cart`, `public`**.

---

## II. DANH SÁCH TRIGGERS & RÀNG BUỘC QUAN TRỌNG

1. **`orders.tr_order_list_refund_force_positive`**: Tự động chuyển số tiền hoàn trong `orders.order_list` về số dương.
2. **`orders.tr_supplier_order_cost_log_order_success`**: Tự động khởi tạo log chi phí nhập cho nhà cung cấp khi đơn hàng được tạo thành công.
3. **`partner.trg_supplier_order_cost_log_dashboard_import`**: Tự động tính toán lại tổng tiền nhập hàng vào báo cáo Dashboard.
4. **`receipt.tr_refund_credit_applications_after_change`**: Tự động trừ/cộng số dư khả dụng (`available_amount`) trong Thẻ ghi nợ `refund_credit_notes` khi có giao dịch áp dụng hoàn tiền.
5. **`system_automation.tr_order_list_keys_sync_order`**: Đồng bộ mã key cấp phát cho khách hàng khi đơn hàng được cập nhật.

---

## III. KẾ HOẠCH TÁI CẤU TRÚC DATABASE CHO V2

### 1. Nguyên tắc thiết kế
- **Giữ toàn bộ dữ liệu lịch sử**: Không xóa hoặc làm đứt gãy dữ liệu đơn hàng, nhà cung cấp, sản phẩm và giao dịch cũ của V1.
- **Đóng gói 01 Migration duy nhất**: Toàn bộ quá trình nâng cấp từ V1 lên V2 sẽ được thực hiện qua **01 file Migration Knex duy nhất** (`v2/backend/migrations/20261004000000_v2_database_refactoring.js`).
- **Gom nhóm Schemas theo Domain V2**:
  - `orders`: Quản lý toàn bộ đơn hàng và slot thanh toán.
  - `partner`: Quản lý nhà cung cấp và công nợ.
  - `product`: Quản lý sản phẩm, gói, biến thể và giá vốn.
  - `receipt`: Quản lý hóa đơn thanh toán và thẻ ghi nợ hoàn tiền.
  - `admin`: Quản lý tài khoản ngân hàng shop, ví USDT và người dùng admin.
  - `system_automation`: Lưu trữ Event Store và luồng tự động hóa.
  - `finance`: Quản lý tài chính tổng hợp.

### 2. Các bước triển khai Migration V2
1. **Bước 1**: Kiểm tra & tạo các Schemas lõi V2 (`orders`, `partner`, `product`, `receipt`, `admin`, `finance`, `system_automation`) nếu chưa có.
2. **Bước 2**: Chuẩn hóa tên cột, kiểu dữ liệu và thêm khóa chính / giá trị mặc định cho các bảng lõi.
3. **Bước 3**: Tạo các chỉ mục hiệu năng (Performance Indexes) trên các cột truy vấn thường xuyên (`status`, `id_order`, `expired_at`, `created_at`, `supply_id`, `id_product`).
4. **Bước 4**: Dọn dẹp an toàn các bảng tạm và bảng rác không còn sử dụng của V1.
5. **Bước 5**: Kiểm tra tính toàn vẹn dữ liệu sau khi Migration hoàn tất.

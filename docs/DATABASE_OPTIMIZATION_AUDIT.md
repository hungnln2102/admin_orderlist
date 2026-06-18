# Database Optimization Audit - Website & admin_orderlist

## 1. Phạm Vi Đã Xem

Đã kiểm tra nhanh các nguồn schema/migration chính:

- `admin_orderlist/database/migrations/000_consolidated_schema.sql`
- `admin_orderlist/backend/src/config/dbSchema/*`
- `admin_orderlist/database/migrations/*`
- `admin_orderlist/backend/migrations/*`
- `Website/my-store/apps/server/src/config/db.config.ts`
- `Website/my-store/packages/db/prisma/migrations/all_migrations.sql`
- `Website/my-store/apps/web/src/lib/database.types.ts`

Kết luận ban đầu: `admin_orderlist` đang có consolidated schema đầy đủ hơn, còn `Website` đang dùng chung nhiều bảng/schema qua `apps/server/src/config/db.config.ts` và chỉ có một số migration bổ sung cho storefront/materialized view.

## 2. Nhóm Schema Đang Dùng

### Shared / Admin / Website

- `product`: product, variant, category, pricing, package, stock, reviews, materialized view bán chạy.
- `orders`: order_list, order_customer.
- `receipt`: payment_receipt và các bảng biên nhận/refund.
- `customer_web`: account khách hàng, profile, role, refresh token, audit.
- `cart`: cart_items.
- `promotion`: promotion_codes, account_promotions.
- `wallet`: wallets, wallet_transactions.
- `admin`: users, ip_whitelist, site_settings.

### Admin Nghiệp Vụ Nội Bộ

- `dashboard`: summary, chi phí, bank balance, daily revenue.
- `partner`: supplier, supplier_payments, supplier_order_cost_log.
- `system_automation`: Renew Adobe, key active, account mapping, system logs.
- `form_desc`: form_name, form_input, inputs.

## 3. Bảng Có Thể Tối Ưu / Chuẩn Hóa

### 3.1 Product Catalog

Bảng liên quan:

- `product.product`
- `product.variant`
- `product.desc_variant`
- `product.package_product`
- `product.product_category`
- `product.category`
- `product.supplier_cost`
- `product.variant_margin`
- `product.pricing_tier`
- `product.product_stocks`
- `product.reviews`

Nhận xét:

- Website và Admin cùng đọc catalog, nhưng đang có dấu hiệu legacy naming: `product.product_desc` cũ và `product.desc_variant` mới.
- `Website` migration có comment nói `admin_orderlist` dùng `product.desc_variant`, nên cần thống nhất tuyệt đối về tên bảng này.
- Các materialized view `product.product_sold_count`, `product.variant_sold_count`, `product.product_sold_30d` đang phục vụ Website. Cần chuẩn hóa lịch refresh và index.

Tối ưu đề xuất:

- [ ] Xác nhận bỏ hoàn toàn alias/bảng cũ `product.product_desc` nếu không còn tồn tại.
- [ ] Tạo view compatibility nếu Website/Admin còn code legacy đọc tên cũ.
- [ ] Thêm/kiểm tra index:
  - [ ] `product.variant(product_id, is_active)`
  - [ ] `product.variant(product_id, display_name)` unique nếu nghiệp vụ cho phép.
  - [ ] `product.product(is_active, updated_at DESC)` cho catalog list.
  - [ ] `product.product_category(category_id, product_id)`.
  - [ ] `product.reviews(product_id, created_at DESC)`.
- [ ] Với materialized view bán chạy: dùng `REFRESH MATERIALIZED VIEW CONCURRENTLY` và bắt buộc unique index.
- [ ] Không để Website tính bán chạy trực tiếp từ `orders.order_list` trên request thường.

### 3.2 Orders

Bảng liên quan:

- `orders.order_list`
- `orders.order_customer`
- `orders.order_payment_slots`
- `system_automation.order_list_keys`

Nhận xét:

- `orders.order_list` là bảng trung tâm, đang gánh nhiều cột nghiệp vụ: đơn hàng, thanh toán, refund, supplier, ngày hết hạn.
- Có legacy cột `transaction`, trong khi hệ thống mới dùng `order_payment_slots` theo suffix/payment slot.
- Website cũng dùng `orders.order_list` cho sold count/materialized view.

Tối ưu đề xuất:

- [ ] Giữ `orders.order_list` là source of truth cho đơn hàng.
- [ ] Chuyển logic payment matching sang `orders.order_payment_slots` hoàn toàn.
- [ ] Đánh dấu `order_list.transaction` là legacy, chỉ đọc fallback nếu cần.
- [ ] Thêm/kiểm tra index:
  - [ ] `orders.order_list(id_order)` unique hoặc unique partial theo format nếu cần.
  - [ ] `orders.order_list(created_at DESC)`.
  - [ ] `orders.order_list(status, created_at DESC)`.
  - [ ] `orders.order_list(expired_at)` cho renew/check hết hạn.
  - [ ] `orders.order_list(supply_id, status)` cho NCC/cost.
  - [ ] `orders.order_payment_slots(status, receiver_account, expected_amount)`.
- [ ] Tách audit sửa đơn sang bảng riêng hoặc dùng `system_event_logs` trước mắt.
- [ ] Cân nhắc bảng `orders.order_status_history` nếu cần truy vết trạng thái.

### 3.3 Receipt / Payment

Bảng liên quan:

- `receipt.payment_receipt`
- `receipt.payment_receipt_batch`
- `receipt.payment_receipt_batch_item`
- `receipt.payment_receipt_financial_audit_log`
- `receipt.payment_receipt_financial_state`
- `receipt.refund_credit_notes`
- `receipt.refund_credit_applications`

Nhận xét:

- Đây là nhóm bảng quan trọng nhất cho Sepay/webhook/doanh thu.
- Hiện đã có audit tài chính riêng, nhưng nên chuẩn hóa action/reason/payload để dễ đối soát.
- Cần phân biệt rõ: tiền đúng đơn, tiền ngoài luồng, tiền ra, tiền thừa, refund credit.

Tối ưu đề xuất:

- [ ] Lưu raw webhook payload ở metadata/audit để debug.
- [ ] Index cần có:
  - [ ] `payment_receipt(order_code, transaction_date DESC)`.
  - [ ] `payment_receipt(sepay_transaction_id)` unique partial nếu dữ liệu đảm bảo.
  - [ ] `payment_receipt(receiver_account, amount, transaction_date DESC)`.
  - [ ] `payment_receipt(status, transaction_date DESC)`.
  - [ ] `refund_credit_notes(status, issued_at DESC)`.
- [ ] Không ghi đè `transaction_content` Sepay; giữ nội dung gốc.
- [ ] Tạo view đối soát receipt theo tháng/ngày để dashboard đọc nhanh.

### 3.4 Dashboard / Finance

Bảng liên quan:

- `dashboard.dashboard_monthly_summary`
- `dashboard.daily_revenue_summary`
- `dashboard.dashboard_financial_change_log`
- `dashboard.com_profit_expenses`
- `dashboard.master_wallettypes`
- `dashboard.trans_dailybalances`
- `dashboard.saving_goals`

Nhận xét:

- `dashboard_monthly_summary` đang là bảng tổng hợp nhiều chỉ số.
- Có nhiều migration/function phục vụ recalc và backfill, cần gom tài liệu hóa vì rủi ro sai lệch tiền.
- `com_profit_expenses` nên được xem là ledger chi phí, không chỉ là bảng nhập tay.

Tối ưu đề xuất:

- [ ] Chuẩn hóa `dashboard.com_profit_expenses` thành ledger chi phí rõ loại:
  - [ ] `external_import`
  - [ ] `mavn_import`
  - [ ] `withdraw_profit`
  - [ ] `manual_adjustment`
- [ ] Index:
  - [ ] `com_profit_expenses(created_at DESC)`.
  - [ ] `com_profit_expenses(expense_type, created_at DESC)`.
  - [ ] `com_profit_expenses(linked_order_code)` partial where not null.
  - [ ] `daily_revenue_summary(summary_date)` unique.
  - [ ] `dashboard_monthly_summary(month_key)` unique.
- [ ] Mọi update summary nên có dòng trong `dashboard_financial_change_log` hoặc `system_event_logs`.
- [ ] Viết script reconcile: receipt/expense/refund/bank balance vs summary.

### 3.5 Partner / Supplier

Bảng liên quan:

- `partner.supplier`
- `partner.supplier_payments`
- `partner.supplier_order_cost_log`
- Có migration cũ nhắc `partner.supplier_payment_ledger` nhưng consolidated hiện chưa thấy bảng này.

Nhận xét:

- Luồng NCC đang có nhiều nghiệp vụ: cost theo đơn, thanh toán NCC, NCC hoàn tiền, payment supply.
- Nếu có `supplier_payment_ledger` trong migration cũ nhưng không có trong consolidated, cần kiểm tra trạng thái thật của DB.

Tối ưu đề xuất:

- [ ] Xác nhận có/không `partner.supplier_payment_ledger` trong DB thật.
- [ ] Nếu chưa có ledger chuẩn, nên tạo `partner.supplier_payment_ledger` để lưu từng biến động NCC.
- [ ] Index:
  - [ ] `supplier_order_cost_log(order_list_id)`.
  - [ ] `supplier_order_cost_log(supplier_id, logged_at DESC)`.
  - [ ] `supplier_order_cost_log(payment_status, logged_at DESC)`.
  - [ ] `supplier_payments(supplier_id, payment_date DESC)`.
- [ ] Ghi rõ tiền NCC hoàn sẽ cộng vào đâu: bank ledger/dashboard/bảng chi phí âm hoặc supplier ledger.

### 3.6 Customer / Website Identity

Bảng liên quan:

- `customer_web.accounts`
- `customer_web.customer_profiles`
- `customer_web.customer_spend_stats`
- `customer_web.customer_tiers`
- `customer_web.customer_type_history`
- `customer_web.refresh_tokens`
- `customer_web.password_history`
- `customer_web.audit_logs`

Nhận xét:

- Website cần nhóm này rõ ràng, Admin có thể chỉ đọc một phần.
- Đã có `customer_web.audit_logs`, trong khi Admin mới thêm `system_automation.system_event_logs`. Cần quyết định ranh giới:
  - `customer_web.audit_logs`: hành vi khách hàng Website.
  - `system_event_logs`: hệ thống/admin/internal.

Tối ưu đề xuất:

- [ ] Không gộp 2 bảng audit này ngay; giữ ranh giới customer vs admin/system.
- [ ] Index:
  - [ ] `accounts(email)` unique/lower unique nếu login bằng email.
  - [ ] `refresh_tokens(account_id, expires_at)`.
  - [ ] `customer_profiles(account_id)` unique.
  - [ ] `customer_spend_stats(account_id)` unique.
  - [ ] `audit_logs(user_id, created_at DESC)`.
- [ ] Chuẩn hóa naming `user_id` vs `account_id` trong customer domain.

### 3.7 Cart / Promotion / Wallet

Bảng liên quan:

- `cart.cart_items`
- `promotion.promotion_codes`
- `promotion.account_promotions`
- `wallet.wallets`
- `wallet.wallet_transactions`

Tối ưu đề xuất:

- [ ] `cart.cart_items(account_id, variant_id)` unique để tránh trùng item.
- [ ] `cart.cart_items(account_id, created_at DESC)` nếu có created_at.
- [ ] `promotion_codes(code)` unique, nên dùng normalized uppercase/lowercase.
- [ ] `account_promotions(account_id, promotion_id)` unique.
- [ ] `wallet_transactions(account_id, created_at DESC)`.
- [ ] `wallet_transactions(wallet_id, created_at DESC)` nếu ví riêng.

### 3.8 System Automation / Renew Adobe

Bảng liên quan:

- `system_automation.accounts_admin`
- `system_automation.mail_backup`
- `system_automation.order_user_tracking`
- `system_automation.user_account_mapping`
- `system_automation.order_list_keys`
- `system_automation.product_system`
- `system_automation.systems`
- `system_automation.system_event_logs`

Tối ưu đề xuất:

- [ ] Index:
  - [ ] `accounts_admin(email)` unique nếu nghiệp vụ cho phép.
  - [ ] `accounts_admin(is_active, last_checked_at)`.
  - [ ] `order_user_tracking(order_id)`.
  - [ ] `order_user_tracking(account)`.
  - [ ] `user_account_mapping(id_order)`.
  - [ ] `user_account_mapping(user_email)`.
  - [ ] `system_event_logs(log_type, created_at DESC)`.
  - [ ] `system_event_logs(entity, entity_id)`.
- [ ] Chuyển log Renew vào `system_event_logs` thay vì chỉ file log.
- [ ] Có retention policy cho log cũ, ví dụ archive/delete sau 90-180 ngày nếu bảng quá lớn.

## 4. Điểm Có Thể Tối Ưu Ngay

### Ưu tiên cao

1. Chuẩn hóa bảng log/audit:
   - `system_event_logs` cho Admin/system.
   - `customer_web.audit_logs` cho Website/customer.
2. Kiểm tra và bổ sung index cho `orders.order_list`, `receipt.payment_receipt`, `dashboard.com_profit_expenses`.
3. Xác nhận `supplier_payment_ledger` có tồn tại trong DB thật không.
4. Tạo tài liệu mapping giữa Website `db.config.ts` và Admin `dbSchema` để tránh lệch schema.
5. Chuẩn hóa materialized view bán chạy và lịch refresh.

### Ưu tiên trung bình

1. Tách bảng lịch sử trạng thái đơn: `orders.order_status_history`.
2. Tạo view đọc catalog cho Website để giảm join phức tạp.
3. Tạo view dashboard monthly reconcile.
4. Chuẩn hóa naming legacy như `productid_payment`, `master_wallettypes`, `trans_dailybalances` trong code bằng alias constants trước, chưa đổi bảng ngay.

### Ưu tiên thấp / làm sau

1. Rename bảng legacy trực tiếp trong DB.
2. Gộp audit logs giữa Website và Admin.
3. Chuẩn hóa toàn bộ naming snake_case nếu chưa có nhu cầu cấp bách.

## 5. Cần Kiểm Tra Trực Tiếp Trên DB Thật

Các nhận định trên dựa vào schema/migration/code. Để tối ưu chuẩn, cần chạy thêm query trên DB thật:

```sql
-- Kích thước bảng
SELECT schemaname, relname, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Index ít/không được dùng
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Bảng scan nhiều
SELECT schemaname, relname, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Duplicate indexes cơ bản cần soi bằng extension/query riêng nếu cần
```

## 6. Kết Luận Ban Đầu

Có thể tối ưu database, nhưng không nên tối ưu bằng cách rename/drop bảng ngay. Hướng an toàn nhất:

1. Chuẩn hóa mapping schema giữa Website và Admin.
2. Bổ sung audit/log/ledger trước.
3. Bổ sung index theo query thực tế.
4. Tạo view/materialized view cho Website đọc nhanh.
5. Sau khi có đối soát, mới dọn legacy table/column.

# Tổng Quan DB Dùng Chung (admin_orderlist + Website)

Nguồn tổng hợp:

- `admin_orderlist/backend/src/config/dbSchema.js`
- `Website/my-store/apps/server/src/config/db.config.ts`

## Thống kê nhanh

- Tổng số schema: **18**
- Tổng số bảng theo `schema.table`: **61**
- Tổng số tên bảng unique (bỏ trùng tên khác schema): **58**

> Lưu ý: đây là tổng hợp theo config code hiện tại, không phải introspection trực tiếp từ production DB.

## Danh sách schema và bảng (gộp toàn DB)

### `orders` (6)
- `order_customer`
- `order_list`
- `payment_receipt`
- `payment_receipt_financial_audit_log`
- `payment_receipt_financial_state`
- `refund`

### `product` (14)
- `category`
- `desc_variant`
- `package_product`
- `pricing_tier`
- `product`
- `product_category`
- `product_sold_30d`
- `product_sold_count`
- `product_stocks`
- `productid_payment`
- `supplier_cost`
- `variant`
- `variant_margin`
- `variant_sold_count`

### `partner` (4)
- `supplier`
- `supplier_cost`
- `supplier_order_cost_log`
- `supplier_payments`

### `admin` (3)
- `ip_whitelist`
- `site_settings`
- `users`

### `finance` (5)
- `dashboard_monthly_summary`
- `master_wallettypes`
- `saving_goals`
- `store_profit_expenses`
- `trans_dailybalances`

### `form_desc` (3)
- `form_input`
- `form_name`
- `inputs`

### `identity` (6)
- `accounts`
- `customer_profiles`
- `mail_backup`
- `password_history`
- `refresh_tokens`
- `roles`

### `common` (1)
- `status`

### `promotion` (2)
- `account_promotions`
- `promotion_codes`

### `wallet` (2)
- `wallet_transactions`
- `wallets`

### `system_automation` (3)
- `accounts_admin`
- `product_system`
- `user_account_mapping`

### `key_active` (3)
- `order_auto_keys`
- `order_list_keys`
- `systems`

### `supplier_cost` (1)
- `supplier_cost`

### `customer` (4)
- `customer_profiles`
- `customer_spend_stats`
- `customer_tiers`
- `customer_type_history`

### `cycles` (1)
- `tier_cycles`

### `cart` (1)
- `cart_items`

### `review` (1)
- `reviews`

### `audit` (1)
- `audit_logs`

## Các cụm bảng nên tối ưu trước

- **Receipt domain**: `orders.payment_receipt`, `orders.payment_receipt_financial_state`, `orders.payment_receipt_financial_audit_log`  
  -> nên gom thành 1 schema chuyên biệt (ví dụ `receipt`) để dễ truy vết.

- **Supplier cost trùng schema**: `product.supplier_cost`, `partner.supplier_cost`, `supplier_cost.supplier_cost`  
  -> cần chốt 1 “nguồn sự thật” duy nhất.

- **Customer profile trùng domain**: `identity.customer_profiles` và `customer.customer_profiles`  
  -> nên giữ 1 schema owner rõ ràng.

- **User/account phân tán**: `admin.users` vs `identity.accounts`  
  -> chuẩn hóa boundary auth/admin để giảm mapping chéo.

## Ảnh tổng quan

- Mermaid source: `docs/schema-table-overview.mmd`
- PNG đã xuất: `docs/schema-table-overview.png`

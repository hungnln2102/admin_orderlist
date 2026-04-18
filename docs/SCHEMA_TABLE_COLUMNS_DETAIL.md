# Chi Tiết Schema - Bảng - Cột

Tổng hợp từ config của `admin_orderlist` và `Website`.

- Tổng schema: **18**
- Tổng bảng theo schema.table: **61**

## Schema `admin` (3 bảng)

### `admin.ip_whitelist`

- Nguồn config: `admin_orderlist`
- Số cột: **6**

- `created_at`
- `id`
- `ip_address`
- `is_active`
- `label`
- `updated_at`

### `admin.site_settings`

- Nguồn config: `admin_orderlist`
- Số cột: **3**

- `key`
- `updated_at`
- `value`

### `admin.users`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **5**

- `createdat`
- `passwordhash`
- `role`
- `userid`
- `username`

## Schema `audit` (1 bảng)

### `audit.audit_logs`

- Nguồn config: `website`
- Số cột: **10**

- `action`
- `created_at`
- `details`
- `id`
- `ip_address`
- `resource_id`
- `resource_type`
- `status`
- `user_agent`
- `user_id`

## Schema `cart` (1 bảng)

### `cart.cart_items`

- Nguồn config: `website`
- Số cột: **8**

- `account_id`
- `created_at`
- `extra_info`
- `id`
- `price_type`
- `quantity`
- `updated_at`
- `variant_id`

## Schema `common` (1 bảng)

### `common.status`

- Nguồn config: `admin_orderlist`
- Số cột: **6**

- `code`
- `description`
- `is_active`
- `label_en`
- `label_vi`
- `sort_order`

## Schema `customer` (4 bảng)

### `customer.customer_profiles`

- Nguồn config: `website`
- Số cột: **9**

- `account_id`
- `created_at`
- `date_of_birth`
- `date_of_birth_changed_at`
- `first_name`
- `id`
- `last_name`
- `tier_id`
- `updated_at`

### `customer.customer_spend_stats`

- Nguồn config: `website`
- Số cột: **4**

- `account_id`
- `lifetime_spend`
- `spend_6m`
- `updated_at`

### `customer.customer_tiers`

- Nguồn config: `website`
- Số cột: **3**

- `id`
- `min_total_spend`
- `name`

### `customer.customer_type_history`

- Nguồn config: `website`
- Số cột: **8**

- `account_id`
- `evaluated_at`
- `id`
- `new_type`
- `period_end`
- `period_start`
- `previous_type`
- `total_spend`

## Schema `cycles` (1 bảng)

### `cycles.tier_cycles`

- Nguồn config: `website`
- Số cột: **5**

- `created_at`
- `cycle_end_at`
- `cycle_start_at`
- `id`
- `status`

## Schema `finance` (5 bảng)

### `finance.dashboard_monthly_summary`

- Nguồn config: `admin_orderlist`
- Số cột: **7**

- `canceled_orders`
- `month_key`
- `total_orders`
- `total_profit`
- `total_refund`
- `total_revenue`
- `updated_at`

### `finance.master_wallettypes`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **7**

- `asset_code`
- `balance_scope`
- `id`
- `is_investment`
- `linked_wallet_id`
- `note`
- `wallet_name`

### `finance.saving_goals`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **5**

- `created_at`
- `goal_name`
- `id`
- `priority`
- `target_amount`

### `finance.store_profit_expenses`

- Nguồn config: `admin_orderlist`
- Số cột: **5**

- `amount`
- `created_at`
- `expense_type`
- `id`
- `reason`

### `finance.trans_dailybalances`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **4**

- `amount`
- `id`
- `record_date`
- `wallet_id`

## Schema `form_desc` (3 bảng)

### `form_desc.form_input`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **4**

- `form_id`
- `id`
- `input_id`
- `sort_order`

### `form_desc.form_name`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **5**

- `created_at`
- `description`
- `id`
- `name`
- `updated_at`

### `form_desc.inputs`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **4**

- `created_at`
- `id`
- `input_name`
- `input_type`

## Schema `identity` (6 bảng)

### `identity.accounts`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **11**

- `ban_reason`
- `created_at`
- `email`
- `id`
- `is_active`
- `mail_backup_id`
- `password_hash`
- `role_id`
- `suspended_until`
- `updated_at`
- `username`

### `identity.customer_profiles`

- Nguồn config: `admin_orderlist`
- Số cột: **8**

- `account_id`
- `created_at`
- `date_of_birth`
- `first_name`
- `id`
- `last_name`
- `tier_id`
- `updated_at`

### `identity.mail_backup`

- Nguồn config: `admin_orderlist`
- Số cột: **9**

- `alias_prefix`
- `app_password`
- `created_at`
- `email`
- `id`
- `is_active`
- `note`
- `provider`
- `updated_at`

### `identity.password_history`

- Nguồn config: `website`
- Số cột: **4**

- `created_at`
- `id`
- `password_hash`
- `user_id`

### `identity.refresh_tokens`

- Nguồn config: `website`
- Số cột: **8**

- `created_at`
- `device_info`
- `expires_at`
- `id`
- `ip_address`
- `revoked_at`
- `token_hash`
- `user_id`

### `identity.roles`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **3**

- `code`
- `id`
- `name`

## Schema `key_active` (3 bảng)

### `key_active.order_auto_keys`

- Nguồn config: `admin_orderlist`
- Số cột: **4**

- `auto_key`
- `created_at`
- `order_code`
- `system_code`

### `key_active.order_list_keys`

- Nguồn config: `admin_orderlist`
- Số cột: **10**

- `created_at`
- `expires_at`
- `id`
- `id_order`
- `key_hash`
- `key_hint`
- `order_list_id`
- `status`
- `system_code`
- `updated_at`

### `key_active.systems`

- Nguồn config: `admin_orderlist`
- Số cột: **3**

- `created_at`
- `system_code`
- `system_name`

## Schema `orders` (6 bảng)

### `orders.order_customer`

- Nguồn config: `website`
- Số cột: **6**

- `account_id`
- `created_at`
- `id_order`
- `payment_id`
- `status`
- `updated_at`

### `orders.order_list`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **17**

- `canceled_at`
- `contact`
- `cost`
- `customer`
- `days`
- `expired_at`
- `id`
- `id_order`
- `id_product`
- `information_order`
- `note`
- `order_date`
- `price`
- `refund`
- `slot`
- `status`
- `supply_id`

### `orders.payment_receipt`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **11**

- `amount`
- `gateway`
- `id`
- `id_order`
- `note`
- `payment_date`
- `receiver`
- `reference_code`
- `sender`
- `sepay_transaction_id`
- `transfer_type`

### `orders.payment_receipt_financial_audit_log`

- Nguồn config: `admin_orderlist`
- Số cột: **7**

- `created_at`
- `delta`
- `id`
- `order_code`
- `payment_receipt_id`
- `rule_branch`
- `source`

### `orders.payment_receipt_financial_state`

- Nguồn config: `admin_orderlist`
- Số cột: **9**

- `adjustment_applied`
- `created_at`
- `id`
- `is_financial_posted`
- `payment_receipt_id`
- `posted_profit`
- `posted_revenue`
- `reconciled_at`
- `updated_at`

### `orders.refund`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **4**

- `id`
- `ma_don_hang`
- `ngay_thanh_toan`
- `so_tien`

## Schema `partner` (4 bảng)

### `partner.supplier`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **6**

- `account_holder`
- `active_supply`
- `bin_bank`
- `id`
- `number_bank`
- `supplier_name`

### `partner.supplier_cost`

- Nguồn config: `admin_orderlist`
- Số cột: **6**

- `created_at`
- `id`
- `price`
- `supplier_id`
- `updated_at`
- `variant_id`

### `partner.supplier_order_cost_log`

- Nguồn config: `admin_orderlist`
- Số cột: **8**

- `id`
- `id_order`
- `import_cost`
- `logged_at`
- `ncc_payment_status`
- `order_list_id`
- `refund_amount`
- `supply_id`

### `partner.supplier_payments`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **6**

- `amount_paid`
- `id`
- `payment_period`
- `payment_status`
- `supplier_id`
- `total_amount`

## Schema `product` (14 bảng)

### `product.category`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **4**

- `color`
- `created_at`
- `id`
- `name`

### `product.desc_variant`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **6**

- `created_at`
- `description`
- `id`
- `rules`
- `short_desc`
- `updated_at`

### `product.package_product`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **9**

- `cost`
- `id`
- `match`
- `package_id`
- `slot`
- `stock_id`
- `storage_id`
- `storage_total`
- `supplier`

### `product.pricing_tier`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **9**

- `base_tier_key`
- `created_at`
- `id`
- `is_active`
- `key`
- `label`
- `prefix`
- `pricing_rule`
- `sort_order`

### `product.product`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **7**

- `category_id`
- `created_at`
- `id`
- `image_url`
- `is_active`
- `package_name`
- `updated_at`

### `product.product_category`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **2**

- `category_id`
- `product_id`

### `product.product_sold_30d`

- Nguồn config: `website`
- Số cột: **5**

- `package_name`
- `product_id`
- `revenue_30d`
- `sold_count_30d`
- `updated_at`

### `product.product_sold_count`

- Nguồn config: `website`
- Số cột: **4**

- `package_name`
- `product_id`
- `total_sales_count`
- `updated_at`

### `product.product_stocks`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **12**

- `account_username`
- `backup_email`
- `created_at`
- `expires_at`
- `id`
- `is_verified`
- `note`
- `password_encrypted`
- `product_type`
- `status`
- `two_fa_encrypted`
- `updated_at`

### `product.productid_payment`

- Nguồn config: `website`
- Số cột: **6**

- `amount`
- `created_at`
- `is_active`
- `product_id`
- `promotion_percent`
- `updated_at`

### `product.supplier_cost`

- Nguồn config: `admin_orderlist`
- Số cột: **6**

- `created_at`
- `id`
- `price`
- `supplier_id`
- `updated_at`
- `variant_id`

### `product.variant`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **15**

- `base_price`
- `created_at`
- `display_name`
- `form_id`
- `id`
- `id_desc`
- `image_url`
- `is_active`
- `pct_ctv`
- `pct_khach`
- `pct_promo`
- `pct_stu`
- `product_id`
- `updated_at`
- `variant_name`

### `product.variant_margin`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **3**

- `margin_ratio`
- `tier_id`
- `variant_id`

### `product.variant_sold_count`

- Nguồn config: `website`
- Số cột: **5**

- `product_id`
- `sales_count`
- `updated_at`
- `variant_display_name`
- `variant_id`

## Schema `promotion` (2 bảng)

### `promotion.account_promotions`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **7**

- `account_id`
- `assigned_at`
- `id`
- `promotion_id`
- `status`
- `usage_limit_per_user`
- `used_at`

### `promotion.promotion_codes`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **13**

- `code`
- `created_at`
- `description`
- `discount_percent`
- `end_at`
- `id`
- `is_public`
- `max_discount_amount`
- `min_order_amount`
- `start_at`
- `status`
- `usage_limit`
- `used_count`

## Schema `review` (1 bảng)

### `review.reviews`

- Nguồn config: `website`
- Số cột: **6**

- `account_id`
- `comment`
- `created_at`
- `id`
- `product_id`
- `rating`

## Schema `supplier_cost` (1 bảng)

### `supplier_cost.supplier_cost`

- Nguồn config: `website`
- Số cột: **6**

- `created_at`
- `id`
- `price`
- `supplier_id`
- `updated_at`
- `variant_id`

## Schema `system_automation` (3 bảng)

### `system_automation.accounts_admin`

- Nguồn config: `admin_orderlist`
- Số cột: **14**

- `access_url`
- `cookie_config`
- `created_at`
- `email`
- `id`
- `is_active`
- `last_checked_at`
- `license_status`
- `mail_backup_id`
- `org_name`
- `otp_source`
- `password_encrypted`
- `user_count`
- `users_snapshot`

### `system_automation.product_system`

- Nguồn config: `admin_orderlist`
- Số cột: **4**

- `created_at`
- `id`
- `system_code`
- `variant_id`

### `system_automation.user_account_mapping`

- Nguồn config: `admin_orderlist`
- Số cột: **8**

- `adobe_account_id`
- `assigned_at`
- `id`
- `id_order`
- `product`
- `updated_at`
- `url_active`
- `user_email`

## Schema `wallet` (2 bảng)

### `wallet.wallet_transactions`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **13**

- `account_id`
- `amount`
- `balance_after`
- `balance_before`
- `bonus_applied`
- `created_at`
- `direction`
- `id`
- `method`
- `promo_code`
- `promotion_id`
- `transaction_id`
- `type`

### `wallet.wallets`

- Nguồn config: `admin_orderlist`, `website`
- Số cột: **4**

- `account_id`
- `balance`
- `created_at`
- `updated_at`


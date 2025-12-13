## Database Type Cleanup (text ➜ date/numeric/boolean)

Goal: stop storing dates/numbers as text so the API can drop regex parsing. Run the migration script in `database/migrations/001_normalize_types.sql` against PostgreSQL (back up first).

### Target columns & desired types
- `order_list`, `order_expired`, `order_canceled`
  - `order_date`, `order_expired`, `createdate` ➜ `date`
  - `days` ➜ `integer`
  - `cost`, `price`, `refund` ➜ `numeric`
  - `check_flag` ➜ `boolean`
- `payment_receipt`, `refund`
  - `ngay_thanh_toan` ➜ `date`
  - `so_tien` ➜ `numeric`
- `product_price`
  - `pct_ctv`, `pct_khach`, `pct_promo` ➜ `numeric`
  - `is_active` ➜ `boolean`
  - `update` ➜ `date`
- `product_desc`
  - `product_id` ➜ `integer`
- `package_product`
  - `expired` ➜ `date`
  - `Import` (import price), `slot` ➜ `numeric`
- `account_storage`
  - `storage` ➜ `numeric`
- `supply_price`
  - `product_id`, `source_id` ➜ `integer`
  - `price` ➜ `numeric`
- `payment_supply`
  - `import`, `paid` ➜ `numeric`
- `warehouse`
  - `created_at` ➜ `timestamptz`
- `users`
  - `createdat` ➜ `timestamptz`
- `supply`
  - `active_supply` ➜ `boolean`

### How to run
1) Ensure you have a fresh backup.  
2) From `database`, run with the correct schema (default `mavryk`):
   ```bash
   psql "$DATABASE_URL" -v schema=mavryk -f migrations/001_normalize_types.sql
   ```
3) Validate: `\d+ schema.table_name` and spot-check a few rows (`SELECT order_date, order_expired, cost, price FROM mavryk.order_list LIMIT 5;`).

### Notes
- The migration uses helper functions (`safe_cast_date`, `safe_cast_numeric`, `safe_cast_timestamptz`) to coerce common text formats; unparsable values become `NULL` instead of failing the migration.
- After running, the API can rely on native types and delete most of the regex-based date parsing.

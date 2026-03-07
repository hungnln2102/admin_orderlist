# Database Migrations

## Manifest – Thứ tự chạy migration

Chạy theo thứ tự số (001 → 008). Sales summary và form_desc chạy khi cần.

| File | Mô tả ngắn |
|------|-------------|
| `001_add_package_product_image.sql` | Thêm cột ảnh cho package/product. |
| `002_add_performance_indexes.sql` | Index cho `order_list` (status, expiry_date), `supplier_payments`, v.v. |
| `003_drop_product_package_name_unique.sql` | Bỏ unique trên `product.package_name` (chỉ chạy local nếu lỗi trùng tên gói). |
| `004_create_form_desc_schema.sql` | Tạo schema `form_desc` và bảng `inputs` (nếu chưa có). |
| `005_order_supply_to_id_supply.sql` | Refactor order_supply → id_supply. |
| `006_order_list_refund_canceled_at.sql` | Thêm cột `refund`, `canceled_at` vào `order_list`. |
| `007_product_and_supplier_cost_audit_columns.sql` | Product: name, updated_at, is_active; variant/product_desc: updated_at; supplier_cost: created_at, updated_at. |
| `008_rename_order_expired_to_expiry_date.sql` | Đổi cột `order_expired` → `expiry_date` trong `order_list`. |
| `009_create_system_renew_adobe_schema.sql` | Tạo schema `system_renew_adobe` và bảng `account` (Renew Adobe). |
| `create_sales_summary_table.sql` | Tạo bảng sales summary (schema tùy file). |
| `create_sales_summary_in_product_schema.sql` | Sales summary trong schema product. |
| `run_sales_summary_migration.sql` | Script chạy migration sales summary. |

**Lưu ý**: Sau 008, mọi code dùng `expiry_date`; index trong 002 áp dụng cho cột mới. Backup DB trước khi chạy trên production.

---

## Form thông tin: Liên kết bảng inputs

**Nếu bảng `inputs` đã có sẵn** ở schema khác (vd: `public`), thêm vào `.env`:
```
DB_SCHEMA_INPUTS=public
```
(hoặc tên schema chứa bảng inputs của bạn)

**Nếu chưa có**, chạy migration để tạo schema `form_desc` và bảng `inputs`:

```bash
# Dùng connection string từ .env (ví dụ DATABASE_URL hoặc PGHOST, PGUSER, PGPASSWORD, PGDATABASE)
psql "$DATABASE_URL" -f database/migrations/004_create_form_desc_schema.sql
```

Hoặc với Docker:
```bash
docker exec -i admin_orderlist-postgres psql -U postgres -d mydtbmav < database/migrations/004_create_form_desc_schema.sql
```

---

## Local: Sửa lỗi "Tên Gói Sản Phẩm không được trùng"

Nếu **chỉ môi trường local** báo lỗi duplicate package_name (server chạy bình thường), nghĩa là DB local vẫn còn unique constraint trên `product.package_name`. Chạy migration 003 **một lần** trên DB local:

```bash
# Từ thư mục gốc project (thay your_database bằng tên DB local, ví dụ mydtbmav)
psql -U postgres -d your_database -f database/migrations/003_drop_product_package_name_unique.sql
```

Hoặc dùng connection string trong `.env`:

```bash
# PowerShell (Windows)
$env:PGPASSWORD = "your_password"; psql -h localhost -U postgres -d mydtbmav -f database/migrations/003_drop_product_package_name_unique.sql
```

Sau khi chạy xong, thêm/sửa sản phẩm với Tên Gói trùng nhau sẽ không còn lỗi; chỉ **Mã Sản Phẩm** là bắt buộc unique.

---

## Quy trình Migration

### 1. Tạo Migration mới

Tạo file mới trong `database/migrations/` với format:
```
XXX_description.sql
```

Ví dụ:
- `001_add_package_product_image.sql`
- `002_add_order_archived_at.sql`

### 2. Chạy Migration

#### Option A: Manual (psql)
```bash
psql -d your_database -f database/migrations/XXX_description.sql
```

#### Option B: Docker
```bash
docker exec -i admin_orderlist-postgres psql -U postgres -d mydtbmav < database/migrations/XXX_description.sql
```

#### Option C: Từ trong container
```bash
docker exec -it admin_orderlist-postgres psql -U postgres -d mydtbmav
\i /docker-entrypoint-initdb.d/migrations/XXX_description.sql
```

### 3. Migration Template

```sql
-- Migration: XXX_description
-- Date: YYYY-MM-DD
-- Description: What this migration does

BEGIN;

-- Create schemas if not exist
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS product;
CREATE SCHEMA IF NOT EXISTS partner;
CREATE SCHEMA IF NOT EXISTS supplier;
CREATE SCHEMA IF NOT EXISTS supplier_cost;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS finance;

-- Your migration SQL here
-- Example:
-- ALTER TABLE orders.order_list ADD COLUMN new_column TEXT;

COMMIT;
```

### 4. Rollback

Nếu cần rollback, tạo migration mới với prefix `ROLLBACK_`:
```
ROLLBACK_XXX_description.sql
```

## Lưu ý

- Luôn dùng transactions (BEGIN/COMMIT)
- Test migration trên database dev trước
- Backup database trước khi chạy migration trên production
- Document rõ ràng mục đích và tác động của migration

## Schema Reference

Xem `backend/src/config/dbSchema.js` để biết cấu trúc tables và columns.

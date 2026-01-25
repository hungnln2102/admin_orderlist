# Database Migrations

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

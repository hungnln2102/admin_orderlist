# Database Migrations

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

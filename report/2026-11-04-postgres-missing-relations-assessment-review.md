# Đánh Giá Nguyên Nhân Gốc Lỗi PostgreSQL Log (Missing Relations)

> **Ngày thực hiện:** 2026-11-04 (Múi giờ Asia/Bangkok)  
> **Phạm vi đánh giá:** Cơ sở dữ liệu PostgreSQL `mydtbmav`, cấu hình Schema tại `admin_orderlist` và Storefront Website (`my-store/apps/server`).  
> **Trạng thái nghiệm thu:** ⚠️ Cần phê duyệt phương án khắc phục (Pre-Flight Check).

---

## 1. TỔNG QUAN HIỆN TRẠNG & CÁC LỖI TRONG LOG

Hệ thống ghi nhận 3 nhóm lỗi truy vấn SQL thất bại liên tục trong container PostgreSQL `admin_orderlist-postgres`:

1. **Lỗi 1 (Lặp lại tần suất cao - mỗi request):**
   ```
   ERROR: relation "finance.site_settings" does not exist at character 19
   STATEMENT: SELECT value FROM "finance"."site_settings" WHERE key = 'maintenance_mode'
   ```
2. **Lỗi 2 (Catalog / Cart / Promotions):**
   ```
   ERROR: relation "business.desc_variant" does not exist at character 1020
   STATEMENT: ... LEFT JOIN business.desc_variant d ON d.id = v.id_desc ...
   ```
3. **Lỗi 3 (Category API):**
   ```
   ERROR: relation "business.category" does not exist at character 780
   STATEMENT: SELECT c.id, c.name, c.created_at, c.color, ... FROM business.category c LEFT JOIN business.product_category pc ON pc.category_id = c.id ...
   ```

---

## 2. TRUY VẾT NGUYÊN NHÂN GỐC (ROOT CAUSE ANALYSIS)

### 🔴 Nguyên Nhân 1: `finance.site_settings`
- **Caller nguồn:** [maintenance.service.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/modules/maintenance/maintenance.service.ts#L13-L24) được gọi qua [maintenance.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/shared/middleware/maintenance.ts#L38-L45) tại mọi HTTP request (`app.use(maintenanceGuard)`).
- **Nguyên nhân lệch Schema:**
  - Tại [db.config.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/config/db.config.ts#L40), biến `SCHEMA_ADMIN` có fallback sai là `"finance"`:
    ```typescript
    export const SCHEMA_ADMIN = pickSchema(process.env.DB_SCHEMA_ADMIN, process.env.SCHEMA_ADMIN, "finance"); // ❌ Lệch sang finance
    ```
    Trong khi `SITE_SETTINGS` và `IP_WHITELISTS` thuộc quyền quản trị `admin`.
- **Nguyên nhân DB:** Bảng `site_settings` (và `ip_whitelist`) được định nghĩa trong [000_consolidated_schema.sql](file:///d:/Desktop/admin/admin_orderlist/database/migrations/000_consolidated_schema.sql#L509) và [all_migrations.sql](file:///D:/Desktop/admin/Website/my-store/packages/db/prisma/migrations/all_migrations.sql#L273) dưới schema `admin.site_settings`, nhưng **chưa được tạo trong database thực tế** (cả `finance.site_settings` lẫn `admin.site_settings` đều chưa tồn tại).

---

### 🔴 Nguyên Nhân 2: `business.desc_variant` và các Materialized View đi kèm
- **Caller nguồn:**
  - [cart.service.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/modules/cart/cart.service.ts#L283)
  - [promotions.service.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/modules/product/promotions.service.ts#L38)
  - [best-selling-variants.service.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/modules/product/best-selling-variants.service.ts#L62)
  - [product-packages.service.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/modules/product/product-packages.service.ts#L22)
- **Nguyên nhân lệch Schema & Thiếu bảng:**
  - Database hiện tại đang dùng schema `business` cho toàn bộ danh mục sản phẩm (`business.product`, `business.variant`, `business.supplier_cost`...).
  - Tuy nhiên, bảng `desc_variant` (lưu mô tả sản phẩm/quy định bảo hành) không có trong schema `business`.
  - Ngoài ra, các câu query trên còn JOIN với:
    - `business.variant_sold_count`
    - `business.product_sold_count`
    - `business.product_sold_30d`
    Các view/materialized view này **cũng chưa tồn tại trong schema `business`**, khiến câu truy vấn gãy ngay từ bước đầu.

---

### 🔴 Nguyên Nhân 3: `business.category` và `business.product_category`
- **Caller nguồn:** [categories.service.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/modules/product/categories.service.ts#L40) khi client load menu phân loại sản phẩm.
- **Nguyên nhân DB:** Bảng `category` và `product_category` chưa từng được tạo trong schema `business` của database V2 hiện tại.

---

## 3. BẢNG ĐỐI CHIẾU TRẠNG THÁI DB HIỆN TẠI

| Đối tượng | Schema kỳ vọng | Trạng thái hiện tại trong DB | Hậu quả |
| :--- | :--- | :--- | :--- |
| `site_settings` | `admin` | ❌ Chưa tồn tại | Bắn log lỗi 500/SQL error mỗi request qua Storefront |
| `ip_whitelist` | `admin` | ❌ Chưa tồn tại | Lỗi cache whitelist bảo trì |
| `desc_variant` | `business` (hoặc canonical `product`) | ❌ Chưa tồn tại | Không load được trang khuyến mãi, gói sản phẩm, chi tiết giỏ hàng |
| `category` | `business` (hoặc canonical `product`) | ❌ Chưa tồn tại | Không load được menu chuyên mục Storefront |
| `product_category` | `business` (hoặc canonical `product`) | ❌ Chưa tồn tại | Không map được sản phẩm vào chuyên mục |
| `variant_sold_count` | `business` (hoặc canonical `product`) | ❌ Chưa tồn tại | Lỗi tính toán lượt bán variant trong catalog |
| `product_sold_count` | `business` (hoặc canonical `product`) | ❌ Chưa tồn tại | Lỗi tính toán tổng lượt bán theo package |
| `product_sold_30d` | `business` (hoặc canonical `product`) | ❌ Chưa tồn tại | Lỗi thống kê bán 30 ngày |

---

## 4. PHƯƠNG ÁN XỬ LÝ ĐỀ XUẤT

1. **Khắc phục cấu hình Storefront ([db.config.ts](file:///D:/Desktop/admin/Website/my-store/apps/server/src/config/db.config.ts)):**
   - Sửa dòng 40: đổi fallback `SCHEMA_ADMIN` từ `"finance"` thành `"admin"`.
   - Đảm bảo `DB_SCHEMA_ADMIN=admin` trong `.env` của Storefront.
2. **Khởi tạo các bảng còn thiếu trong Database theo chuẩn ACID & Knex migration:**
   - Tạo bảng `admin.site_settings` và seed giá trị `('maintenance_mode', 'off')`.
   - Tạo bảng `admin.ip_whitelist` để hoàn thiện module bảo trì.
   - Tạo bảng `business.desc_variant` và map khóa ngoại `variant.id_desc`.
   - Tạo bảng `business.category` và `business.product_category`.
   - Tạo các view thống kê `business.variant_sold_count`, `business.product_sold_count`, `business.product_sold_30d` (tính toán dựa trên `business.order_list` và `business.variant`).
3. **Đồng bộ Source of Truth:**
   - Cập nhật [tables.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/tables.js) trong backend admin_orderlist để quản lý đầy đủ các bảng trên theo đúng quy tắc.


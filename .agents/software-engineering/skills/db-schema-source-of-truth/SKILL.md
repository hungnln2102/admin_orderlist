---
name: db-schema-source-of-truth-admin-orderlist
description: >
  Quy tắc bắt buộc cho backend admin_orderlist: mọi bảng/cột PostgreSQL dùng
  trong runtime phải khai báo trong dbSchema và truy cập qua tableName + COLS.
  Đọc khi thêm/sửa migration, query Knex/raw SQL, hoặc chỉnh schema DB.
---

# dbSchema — nguồn sự thật bảng/cột (`admin_orderlist`)

## Phạm vi

- Áp dụng cho **`admin_orderlist/backend/src/**`**: controller, service, webhook (`backend/webhook/**` nếu query DB), utils gọi Knex/pg.
- **Migration Knex** và file **SQL thuần** vẫn chứa tên bảng trực tiếp — đó là DDL bình thường; sau khi đổi DB, **bắt buộc** đồng bộ `dbSchema`.
- Script dưới `backend/scripts/**`: ưu tiên dùng cùng pattern; SQL một lần có thể giữ literal nhưng khi sửa bảng phải sửa đồng thời `dbSchema`.

## Quy tắc

1. **Bảng mới**  
   - Thêm block `TABLE` + `COLS` vào đúng file trong `backend/src/config/dbSchema/schemas/`, **theo đúng PostgreSQL schema** (ví dụ `orders.*` → `ordersProductPartner.js` / `ORDERS_SCHEMA`; `receipt.*` → `receipt.js` / `RECEIPT_SCHEMA`; `partner.*` → `PARTNER_SCHEMA` trong cùng file đó).  
   - Không gom bảng `receipt` vào object `ORDERS_SCHEMA` dù liên quan nghiệp vụ đơn hàng — tách giống DB (`database/migrations/000_consolidated_schema.sql` hoặc `pg_dump`).  
   - Export gom tại `backend/src/config/dbSchema.js`.

2. **Cột mới**  
   - Thêm key trong `COLS` của bảng tương ứng (SCREAMING_SNAKE cho key, giá trị là tên cột DB đúng y chang PostgreSQL).  
   - Trong code: **`schema.COLS.TEN_KEY`** hoặc biến shorthand (`const O = ORDERS_SCHEMA.ORDER_LIST.COLS`, `const R = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS`), **không** chuỗi `"column_name"` rời.

3. **Qualified table**  
   - Luôn: `tableName(SOME_SCHEMA.SOME_TABLE.TABLE, SCHEMA_*)` với `SCHEMA_*` lấy từ `dbSchema` / `dbSchema/env` (đã ưu tiên biến môi trường).  
   - **Cấm** trong runtime: `` `${schema}.${table}` `` tự ghép từ string, trừ file migration/SQL hoặc patch một lần có comment rõ.

4. **Raw SQL / template**  
   - Chèn tên bảng: `${tableName(...)}` hoặc alias đã build từ bước trên.  
   - Chèn tên cột: `` `... ${COLS.FIELD} ...` ``.

5. **Sau khi đổi DB**  
   - Cập nhật `dbSchema` cùng PR/migration.  
   - Chạy `node backend/scripts/ops/verify-db-schema-config.js` (cần `DATABASE_URL`) để bảng/cột trong config khớp DB.

## Vi phạm thường gặp (tránh)

- `db("receipt.refund_credit_notes")` hoặc `tableName("refund_credit_notes", …)` mà **không** map về `RECEIPT_SCHEMA.REFUND_CREDIT_NOTES.TABLE`.
- SELECT chỉ liệt kê string `"id", "credit_code"` thay vì hằng `COLS`.
- Thêm cột migration nhưng quên `dbSchema` → verify script hoặc production query lệch.

## Liên quan

- Định nghĩa: `schemas/ordersProductPartner.js` (`ORDERS_SCHEMA`, `PRODUCT_SCHEMA`, …), `schemas/receipt.js` (`RECEIPT_SCHEMA`), các file còn lại trong `schemas/`.  
- Entry: `backend/src/config/dbSchema.js`, `backend/src/config/dbSchema/env.js`.  
- Kế hoạch cleanup & hard-code history: `docs/ke-hoach-cleanup-rule-he-thong.md`.

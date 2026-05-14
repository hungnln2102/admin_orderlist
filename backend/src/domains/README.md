# Domain backend — skeleton tham chiếu

Tài liệu kiến trúc tổng thể: `docs/STRUCTURE-SINGLE-DIRECTION.md`. Checklist migrate: `task.md` (root repo).

## Mục đích

Mỗi **bounded context** = một thư mục dưới `domains/<tên-kebab>/`. Không nhân bản file “mẫu” trống trong repo; khi tạo domain mới, **bám cấu trúc** dưới đây và **sao chép tinh thần** từ hai domain đã chuẩn.

## Code mẫu trong repo (ưu tiên đọc trước khi tạo domain mới)

| Domain | Ghi chú |
|--------|---------|
| `ip-whitelist/` | Có `routes.js`, `controller/`, `use-cases/`, `repositories/`, `validators/`. |
| `site-maintenance/` | Có `routes.js`, `controller/`, `use-cases/`, `repositories/`. |

## Domains mount trực tiếp từ `routes/index.js`

Các folder sau đã có `domains/<tên>/routes.js` và **không** còn lớp `routes/<tên>Routes.js` trung gian:

`accounts`, `auth`, `banks`, `categories`, `content`, `customer-status`, `dashboard`, `form-info`, `ip-whitelist`, `key-active`, `orders`, `package-products`, `payments`, `product-descriptions`, `product-images`, `product-prices`, `products`, `promotion-codes`, `public-content`, `public-pricing`, `renew-adobe` (+ `publicRoutes.js`, `proxy.js`), `saving-goals`, `scheduler`, `site-maintenance`, `store-profit-expenses`, `supplies`, `system`, `test-telegram`, `variant-images`, `warehouse`, `wallet`.

(Handler có thể vẫn nằm tại `controllers/*` cho tới khi slice refactor sâu tiếp theo.)

## Thư mục gợi ý cho domain mới

```
domains/<tên-kebab>/
  routes.js              # express.Router; mount path + middleware mỏng; export router
  controller/            # (hoặc controller.js nếu rất nhỏ — ưu tiên thư mục khi phình)
  use-cases/             # luồng nghiệp vụ, gọi repository
  repositories/          # Knex / truy vấn, dùng dbSchema
  validators/            # tùy domain — rule validate request
  mappers/               # khi cần map DB ↔ DTO
```

## Việc cần làm khi thêm domain

1. Tạo `routes.js` và nối handler từ `controller` hoặc `use-cases`.
2. Đăng ký trong `routes/index.js` với `require('../domains/<tên>/routes')` (không thêm file `routes/<tên>Routes.js` chỉ re-export).
3. Không hardcode tên bảng/cột — dùng `config/dbSchema`.
4. Giữ **nguyên** path và JSON response khi chỉ di chuyển file (xem DoD trong `task.md`).

## Lưu ý

- **Không** thêm thư mục `_template` hay file trùng lặp logic — template là **chính hai folder mẫu** ở trên + tài liệu này.

# Migration Map - `admin_orderlist`

Mục đích: map đường đi từ code cũ sang kiến trúc mới. File này dùng để tránh rebuild thiếu feature, tránh xóa nhầm code đang dùng, và theo dõi parity từng page/domain.

> Trạng thái hiện tại: tài liệu chuẩn bị, chưa triển khai refactor.

## 1. Quy Ước Trạng Thái Migration

| Trạng thái | Ý nghĩa |
| --- | --- |
| `not-started` | Chưa bắt đầu docs/rebuild |
| `documenting` | Đang làm docs page/domain từ app cũ |
| `designed` | Đã có thiết kế module mới |
| `building` | Đang xây implementation mới |
| `parity-check` | Đang so sánh app mới với app cũ |
| `cutover-ready` | Đủ điều kiện chuyển route/import sang code mới |
| `cutover-done` | Route/import đã dùng code mới |
| `legacy-deprecated` | Code cũ còn giữ tạm để rollback/tương thích |
| `legacy-deleted` | Code cũ đã xóa an toàn |

## 2. Thứ Tự Migration Đề Xuất

| Thứ tự | Domain/Feature | Lý do ưu tiên | Trạng thái |
| ---: | --- | --- | --- |
| 1 | Orders | Trung tâm nghiệp vụ, nhiều module phụ thuộc | `not-started` |
| 2 | Invoices/Receipts | Thanh toán, biên nhận, QR | `not-started` |
| 3 | Products/Product Info | Nguồn dữ liệu cho đơn hàng/pricing | `not-started` |
| 4 | Pricing | Công thức giá, dễ duplicate | `not-started` |
| 5 | Supplies | NCC, nhập hàng, chi phí | `not-started` |
| 6 | Wallet/Bank Accounts | Ledger, ví, tiền | `not-started` |
| 7 | Dashboard/Reports | Tổng hợp từ các domain lõi | `not-started` |
| 8 | Renew Adobe | Automation lớn, nhiều flow | `not-started` |
| 9 | Users/Auth/Permissions | Quyền và truy cập | `not-started` |

## 3. Page Docs Cần Hoàn Thành Trước Khi Build

| Page/Feature | Docs file | Cần mô tả | Trạng thái |
| --- | --- | --- | --- |
| Orders | `docs/pages/orders.md` | Route, UI sections, filters, actions, modal, API, state, permissions | `not-started` |
| Invoices/Receipts | `docs/pages/invoices.md` | Receipt list, QR, payment actions, filters, API, edge cases | `not-started` |
| Products | `docs/pages/products.md` | Product list/info, variants, images, descriptions, actions | `not-started` |
| Pricing | `docs/pages/pricing.md` | Price rules, product edit, supply actions, calculations | `not-started` |
| Supplies | `docs/pages/supplies.md` | Supplier list/detail, payment, insights, stock impacts | `not-started` |
| Wallet | `docs/pages/wallet.md` | Wallet list, ledger, USDT, shop bank accounts | `not-started` |
| Dashboard | `docs/pages/dashboard.md` | Charts, metrics, revenue/profit logic, filters | `not-started` |
| Renew Adobe | `docs/pages/renew-adobe.md` | Accounts, logs, tracking orders, fix/check flows | `not-started` |
| Users/Auth | `docs/pages/users-auth.md` | Login, roles, permissions, IP whitelist | `not-started` |

## 4. Migration Map Frontend

| Feature | Legacy path hiện tại | New target path | Shared cần dùng | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Orders | `frontend/src/features/orders`, `frontend/src/components/modals/*Order*` | `frontend/src/features/orders` | `shared/api`, `shared/components/modal`, `shared/hooks` | `not-started` | Cần gom modal order về feature |
| Invoices | `frontend/src/features/invoices` | `frontend/src/features/invoices` | `shared/api`, `shared/components/data-table`, `shared/utils/currency/date` | `not-started` | Cần giữ behavior receipt/QR |
| Products | `frontend/src/features/product-info`, `frontend/src/lib/productDescApi.ts` | `frontend/src/features/products` hoặc giữ `product-info` có chuẩn owner | `shared/api`, `shared/components/form` | `not-started` | Cần quyết định tên domain frontend |
| Pricing | `frontend/src/features/pricing` | `frontend/src/features/pricing` | `shared/utils/currency/number` | `not-started` | Business rule pricing không đưa shared generic |
| Supplies | `frontend/src/features/supply` | `frontend/src/features/supplies` | `shared/api`, `shared/components/data-table` | `not-started` | Cần thống nhất singular/plural |
| Wallet | `frontend/src/features/usdt-wallets`, bank/account related features | `frontend/src/features/wallet` | `shared/api`, `shared/utils/currency/date` | `not-started` | Cần map rõ wallet vs bank accounts |
| Dashboard | `frontend/src/features/dashboard` | `frontend/src/features/dashboard` | `shared/api`, chart components nếu generic | `not-started` | Chart business mapper ở feature |
| Renew Adobe | `frontend/src/features/renew-adobe` | `frontend/src/features/renew-adobe` | `shared/api`, `shared/components/data-table/modal` | `not-started` | Automation UI giữ trong feature |
| Users/Auth | auth/user/ip whitelist features | `frontend/src/features/users`, `frontend/src/features/auth` | `shared/api`, `shared/constants/permissions` | `not-started` | Cần map permission route guards |

## 5. Migration Map Backend

| Domain | Legacy path hiện tại | New target path | Shared cần dùng | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Orders | `backend/src/domains/orders` | `backend/src/domains/orders` | `shared/errors`, `shared/audit`, `shared/pagination`, `db/transaction` | `not-started` | Tách controller/use-case/repository rõ hơn |
| Invoices/Receipts | receipt/payment related routes/controllers | `backend/src/domains/invoices` | `shared/errors`, `shared/audit`, `shared/money` | `not-started` | Cần map chính xác file legacy |
| Products | `backend/src/domains/products`, product services | `backend/src/domains/products` | `shared/errors`, `shared/pagination` | `not-started` | Product mapper/validator riêng domain |
| Pricing | `backend/src/services/pricing` và product pricing handlers | `backend/src/domains/pricing` hoặc trong `products/pricing` | `shared/money` | `not-started` | Cần quyết định pricing là domain riêng hay subdomain |
| Supplies | `backend/src/domains/supplies` | `backend/src/domains/supplies` | `shared/errors`, `shared/audit`, `shared/pagination` | `not-started` | Tách handlers lớn |
| Wallet | `backend/src/domains/wallet`, shop bank accounts | `backend/src/domains/wallet` | `shared/audit`, `shared/money`, `db/transaction` | `not-started` | Ledger cần idempotency rõ |
| Dashboard | dashboard services/controllers | `backend/src/domains/dashboard` | `shared/pagination`, query helpers nếu generic | `not-started` | SQL/query business ở domain |
| Renew Adobe | `backend/src/domains/renew-adobe`, `backend/src/services/renew-adobe`, `backend/src/services/fix-ades` | `backend/src/domains/renew-adobe` + adapters nếu cần | `shared/integrations/adobe`, `shared/logger` | `not-started` | Scheduler chỉ gọi use-case |
| Users/Auth | auth/users/roles/ip whitelist routes | `backend/src/domains/auth`, `backend/src/domains/users` | `shared/errors`, `shared/validation` | `not-started` | Cần map quyền frontend/backend |

## 5A. Migration Map Database

| DB Area | Owner Domain | Code owner cần có trước | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- |
| `orders.order_list` | `orders` | Order use-cases/repositories | `in-progress` | `transaction` là legacy; payment slot là hướng mới |
| `orders.order_payment_slots` | `orders/payment-slots` | Payment slot service/repository | `in-progress` | Không match payment bằng cột legacy nếu slot đủ dữ liệu |
| `product.product/variant/desc_variant` | `products` | Product lookup service/repository | `planned` | Cần xác nhận alias `product_desc` cũ |
| `partner.supplier` | `supplies` | `supplierLookupService` | `in-progress` | Chưa rename `supplier_name/source_name`; resolver đang che khác biệt |
| `partner.supplier_cost` | `supplies` | `supplierCostService` | `in-progress` | Cần quyết định duplicate vs unique `variant_id + supplier_id` |
| `partner.supplier_order_cost_log` | `supplies/dashboard` | Supplier-change + dashboard projection service | `planned` | Không đổi trigger/log nếu chưa có query đối soát |
| `dashboard.dashboard_monthly_summary` | `dashboard` | Dashboard projection query/service | `planned` | Projection, không phải event source |
| `receipt.payment_receipt*` | `payments/invoices` | Receipt/payment domain service | `planned` | Ưu tiên index/financial audit trước rename/drop |

## 6. Cutover Checklist Cho Mỗi Feature/Domain

- [ ] Docs page/domain đã hoàn thành.
- [ ] Legacy behavior đã được mô tả bằng checklist.
- [ ] API contract cũ đã được ghi lại.
- [ ] Thiết kế module mới đã xác định folder/file target.
- [ ] Shared dependencies đã được chọn đúng theo `docs/refactor-rebuild/SHARED_CONTRACTS.md`.
- [ ] Implementation mới đạt parity với app cũ.
- [ ] Route/import đã chuyển sang implementation mới.
- [ ] Smoke test feature/domain đã pass.
- [ ] Legacy code được đánh dấu deprecated.
- [ ] Sau thời gian ổn định, legacy code được xóa và cập nhật inventory.

## 7. Template Map Chi Tiết Cho Một Page

Copy block này cho từng page khi bắt đầu làm docs:

```md
## <Page Name>

### Legacy

- Frontend route:
- Frontend files:
- Backend APIs:
- Backend files:
- Database tables/schema:

### Behavior Cần Giữ

- UI sections:
- Filters/search/sort:
- Actions:
- Modals:
- Permissions:
- Loading/empty/error states:
- Edge cases:

### New Architecture

- Frontend target:
- Backend target:
- Shared contracts dùng:
- Feature/domain local contracts:

### Cutover

- Compatibility wrapper needed:
- Smoke checklist:
- Legacy files deprecated:
- Legacy files deleted:
```

## 8. Ghi Chú

- File này chưa phải danh sách triển khai cuối cùng; nó là bản đồ để làm docs từng page trước.
- Sau khi docs từng page hoàn thành, cập nhật lại legacy path/API/database chính xác hơn.
- Không xóa hoặc di chuyển code chỉ dựa trên file này nếu chưa có docs và parity checklist.


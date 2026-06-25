# Code Inventory - `admin_orderlist`

Mục đích: phân loại toàn bộ code hiện tại trước khi rebuild. File này dùng để quyết định phần nào giữ, phần nào viết lại, phần nào gộp shared, phần nào xóa sau khi đã có docs/page parity.

> Trạng thái hiện tại: tài liệu chuẩn bị, chưa triển khai refactor.

## 1. Quy Ước Trạng Thái

| Trạng thái | Ý nghĩa | Khi nào dùng |
| --- | --- | --- |
| `keep` | Giữ lại, có thể chỉnh nhỏ | Code rõ ràng, đang dùng tốt, ít duplicate |
| `migrate` | Viết lại sang kiến trúc mới | Code còn cần nghiệp vụ nhưng cấu trúc cũ/rối |
| `merge` | Gộp vào shared hoặc feature owner | Duplicate helper/component/API ở nhiều nơi |
| `deprecated` | Tạm giữ để tương thích | Chưa thể xóa ngay vì route/import còn phụ thuộc |
| `delete` | Xóa sau xác nhận | Dead code, file tạm, file không còn được import |
| `unknown` | Chưa phân loại | Cần đọc thêm docs/page hoặc kiểm tra import |

## 2. Quy Ước Owner

| Owner | Phạm vi |
| --- | --- |
| `orders` | Đơn hàng, tạo/sửa/xem đơn, payment slot, order status |
| `invoices` | Biên nhận, thanh toán, QR, receipt actions |
| `products` | Thông tin sản phẩm, variant, hình ảnh, mô tả |
| `pricing` | Công thức giá, bảng giá, đồng bộ giá |
| `supplies` | NCC, nhập hàng, supply payments, supplier insights |
| `wallet` | Ví, ledger, USDT, shop bank accounts |
| `dashboard` | Báo cáo, biểu đồ, summary tài chính |
| `renew-adobe` | Renew Adobe, Fix ADES, tracking orders, system logs |
| `users-auth` | User, role, permission, IP whitelist, auth |
| `shared` | UI/API/hook/util generic dùng bởi nhiều feature/domain |
| `legacy` | Code cũ chưa có owner rõ |

## 3. Inventory Tổng Quan

| Khu vực | File/Folder | Owner | Trạng thái | Hành động đề xuất | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Frontend | `frontend/src/features/orders` | `orders` | `unknown` | Làm docs page trước, sau đó migrate theo feature | Ưu tiên cao vì là luồng lõi |
| Frontend | `frontend/src/features/invoices` | `invoices` | `unknown` | Làm docs page trước, sau đó migrate | Rủi ro tiền/biên nhận |
| Frontend | `frontend/src/features/product-info` | `products` | `unknown` | Làm docs page trước, phân loại shared/image upload | Có nhiều component lớn |
| Frontend | `frontend/src/features/pricing` | `pricing` | `unknown` | Làm docs page trước, chuẩn hóa calculation | Dễ duplicate công thức |
| Frontend | `frontend/src/features/supply` | `supplies` | `unknown` | Làm docs page trước, map API/domain | Cần phân biệt supply/supplies |
| Frontend | `frontend/src/features/renew-adobe` | `renew-adobe` | `unknown` | Làm docs page trước, tách automation UI | Nhiều modal/table/log |
| Frontend | `frontend/src/components/modals` | `legacy` | `unknown` | Xác định modal nào thuộc feature nào | Không nên để modal nghiệp vụ ở global |
| Frontend | `frontend/src/lib` | `legacy` | `unknown` | Phân loại generic vs domain-specific | Có khả năng chứa API/helper domain |
| Frontend | `frontend/src/services` | `legacy` | `unknown` | So sánh với `features/*/api` | Tránh API client trùng |
| Frontend | `frontend/src/shared` | `shared` | `unknown` | Kiểm tra có thật sự generic không | Chỉ giữ shared dùng bởi nhiều feature |
| Backend | `backend/src/domains/orders` | `orders` | `unknown` | Làm docs API/use-case trước, sau đó migrate | Ưu tiên cao |
| Backend | `backend/src/domains/renew-adobe` | `renew-adobe` | `unknown` | Làm docs flow trước | Automation phức tạp |
| Backend | `backend/src/domains/wallet` | `wallet` | `unknown` | Làm docs ledger/API trước | Rủi ro tiền |
| Backend | `backend/src/domains/supplies` | `supplies` | `unknown` | Làm docs API/use-case trước | Có handler lớn |
| Backend | `backend/src/services` | `legacy` | `unknown` | Phân loại service global vs domain service | Nhiều service có thể phải chuyển vào domain |
| Backend | `backend/src/controllers` | `legacy` | `unknown` | Kiểm tra còn endpoint legacy không | Dần đưa về `domains` |
| Backend | `backend/src/routes` | `legacy` | `unknown` | Map route sang domain owner | Không chứa business logic |

## 4. Danh Sách Duplicate Cần Kiểm Tra

| Nhóm duplicate | Từ khóa/file gợi ý | Owner đích | Hành động |
| --- | --- | --- | --- |
| Format tiền | `formatCurrency`, `currency`, `money`, `price` | `shared` hoặc `pricing` | Generic vào shared, business rule ở pricing |
| Format ngày | `formatDate`, `date`, `time` | `shared` | Chuẩn hóa 1 util date |
| Query params | `buildQuery`, `queryParams`, `searchParams` | `shared` | Chuẩn hóa helper query params |
| API HTTP client | `axios`, `fetch`, `apiClient`, `request` | `shared` | Một HTTP client duy nhất |
| Order mapper | `normalizeOrder`, `mapOrder`, `orderTransform` | `orders` | Feature-local nếu chỉ dùng orders |
| Product mapper | `mapProduct`, `productDesc`, `variant` | `products` | Feature-local hoặc backend mapper |
| Modal state | `isOpen`, `openModal`, `closeModal` | `shared` | `useDisclosure` nếu generic |
| Pagination | `page`, `limit`, `offset`, `pagination` | `shared` | Chuẩn hóa types + hook/query parser |
| Error handling | `toast`, `handleError`, `apiError` | `shared` | Chuẩn hóa error model |

## 5. Danh Sách Page/Feature Cần Viết Docs Trước

| Ưu tiên | Page/Feature | Lý do | File docs dự kiến |
| ---: | --- | --- | --- |
| 1 | Orders | Trung tâm nghiệp vụ, nhiều module phụ thuộc | `docs/pages/orders.md` |
| 2 | Invoices/Receipts | Liên quan thanh toán/biên nhận | `docs/pages/invoices.md` |
| 3 | Products/Product Info | Ảnh hưởng tạo đơn và pricing | `docs/pages/products.md` |
| 4 | Pricing | Công thức giá dễ duplicate | `docs/pages/pricing.md` |
| 5 | Supplies | NCC, nhập hàng, chi phí | `docs/pages/supplies.md` |
| 6 | Wallet/Bank Accounts | Ledger và tiền | `docs/pages/wallet.md` |
| 7 | Dashboard/Reports | Tổng hợp số liệu từ nhiều domain | `docs/pages/dashboard.md` |
| 8 | Renew Adobe | Automation lớn, nhiều flow | `docs/pages/renew-adobe.md` |
| 9 | Users/Auth/Permissions | Quyền truy cập | `docs/pages/users-auth.md` |

## 6. Checklist Khi Phân Loại Một File

- [ ] File này còn được import/chạy không?
- [ ] File thuộc feature/domain nào?
- [ ] File có duplicate trách nhiệm với file khác không?
- [ ] Logic trong file là generic hay business-specific?
- [ ] Nếu generic, đã có shared tương đương chưa?
- [ ] Nếu business-specific, có nên nằm trong feature/domain owner không?
- [ ] Có cần giữ wrapper tương thích khi migrate không?
- [ ] Có docs page/API/use-case mô tả nghiệp vụ trước khi viết lại chưa?

## 7. Ghi Chú Quy Trình

- File này nên được điền dần sau khi hoàn thành docs từng page.
- Chưa dùng file này để xóa code ngay ở giai đoạn hiện tại.
- Mọi dòng chuyển sang `delete` phải có bằng chứng: không import, không route, không runtime dependency, hoặc đã có replacement mới.



## 8. Inventory Cập Nhật Khi Thực Thi

| Khu vực | File/Folder | Owner | Trạng thái | Hành động đề xuất | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Backend | `backend/src/domains/payment-slots/helpers/paymentSlotInputs.js` | `orders` | `keep` | Source-of-truth domain-local cho exact amount/account normalizer | Không gom vào integer VND parser. |
| Backend | `backend/src/domains/payment-slots/use-cases/openPaymentSlot.js` | `orders` | `keep` | Đã merge duplicate normalizer sang helper domain-local | Public export không đổi. |
| Backend | `backend/src/domains/payment-slots/use-cases/resolveOrderByExpectedAmount.js` | `orders` | `keep` | Đã merge duplicate normalizer sang helper domain-local | Public export không đổi. |
| Backend | `backend/src/domains/shop-bank-accounts/helpers/shopBankInputs.js` | `wallet` | `keep` | Source-of-truth domain-local cho account/bank-bin/rounded money input contract | Text/boolean primitive đã chuyển sang `backend/src/shared/text` và `backend/src/shared/validation`. |
| Backend | `backend/src/domains/usdt-wallets/helpers/usdtWalletInputs.js` | `wallet` | `keep` | Source-of-truth domain-local cho wallet address input contract | Text/boolean primitive đã chuyển sang `backend/src/shared/text` và `backend/src/shared/validation`. |

| Backend | `backend/src/shared/money/normalizers.js` | `shared` | `keep` | Source-of-truth cho integer VND parser dùng bởi nhiều domain | Không dùng cho payment-slot exact amount hoặc pricing-specific logic. |
| Backend | `backend/src/shared/text/normalizeOptionalText.js` | `shared` | `keep` | Source-of-truth cho optional text primitive dùng bởi nhiều domain | Không chứa rule nghiệp vụ wallet/shop-bank. |
| Backend | `backend/src/shared/validation/normalizeBoolean.js` | `shared` | `keep` | Source-of-truth cho boolean primitive dùng bởi nhiều domain | Không chứa rule nghiệp vụ wallet/shop-bank. |
| Backend | `backend/src/domains/supplies/services/supplierLookupService.js` | `supplies` | `keep` | Source-of-truth cho supplier/NCC lookup by id/name dùng bởi nhiều domain | Caller legacy `services/supplierService.js`, orders finance/create/update/catalog, product finder, pricing đã bắt đầu cutover. |
| Backend | `backend/src/domains/supplies/services/supplierCostService.js` | `supplies` | `keep` | Source-of-truth cho supplier_cost/import price by variant/supplier | Pricing, supplier-change, orders catalog và product price finder đã bắt đầu cutover. |
| Backend | `backend/src/domains/products/services/productSupplierMutationService.js` | `products` | `keep` | Mutation/upsert service cho thêm/sửa/xóa giá NCC theo product | Tách orchestration khỏi `products/controller/handlers/supplies.js`; giữ event log ở handler vì phụ thuộc `req`. |
| Backend | `backend/src/domains/products/services/productSupplierReadService.js` | `products` | `keep` | Read-model cho danh sách NCC/giá NCC theo product name | Tách SQL khỏi `products/controller/handlers/supplies.js`, giữ response cũ. |
| Backend | `backend/src/domains/products/services/productLookupService.js` | `products` | `keep` | Source-of-truth cho lookup product/variant by name | `controller/finders.js` đã xóa sau khi caller cutover. |
| Frontend | `frontend/src/features/product-info/api/productDescApi.ts` | `products` | `keep` | API client owner cho product description/SEO/image c?a product-info | Di chuy?n t? `frontend/src/lib/productDescApi.ts`; m?i caller ?? cutover. |
| Frontend | `frontend/src/shared/utils/pricing.ts` | `shared` | `keep` | Shared pricing primitives reused across pricing and bill-order | `multiplyValue` moved here to remove cross-feature dependency. |

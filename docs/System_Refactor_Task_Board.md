# Bảng Task Refactor

Ngày cập nhật: `2026-03-31`

## Mục tiêu

Task board này bám theo [System_Refactor_Master_Plan.md](D:/Desktop/Personal/Project/admin_store/admin_orderlist/docs/System_Refactor_Master_Plan.md) và dùng để theo dõi các lát cắt refactor theo đúng nguyên tắc:

- chỉ refactor theo domain
- chỉ tách file theo trách nhiệm
- không tự ý đổi UI/UX
- giữ ổn định route, API shape và public behavior
- luôn build hoặc smoke test sau mỗi cụm thay đổi đủ lớn

## Trạng thái tổng quan

| Phase | Mục tiêu | Trạng thái |
| --- | --- | --- |
| `P0` | Khóa chuẩn kiến trúc | `completed` |
| `P1` | Dọn shared và legacy | `completed` |
| `P2` | Refactor `renew-adobe` | `completed` |
| `P3` | Refactor `product-pricing` | `completed` |
| `P4` | Refactor `package-products` | `completed` |
| `P5` | Refactor `orders` | `completed` |
| `P6` | Refactor các domain còn lại | `completed` |
| `P7` | Hardening và cleanup | `completed` |

## Các việc đã chốt

### `P0` - Chuẩn kiến trúc

- [x] Chốt hướng `backend modular monolith theo domain`
- [x] Chốt hướng `frontend feature-based architecture`
- [x] Tạo skill guardrail để khóa 2 nguyên tắc kiến trúc cho các lượt sau

### `P1` - Shared và legacy

- [x] Tách `frontend/src/shared/api/client.ts`
- [x] Tách `frontend/src/features/dashboard/api/dashboardApi.ts`
- [x] Thu gọn `frontend/src/lib/api.ts` về compatibility layer
- [x] Tách `frontend/src/lib/helpers.ts` thành các module nhỏ hơn và giữ compatibility layer
- [x] Tách `backend/src/config/dbSchema.js` thành `env + helpers + schema modules`
- [x] Chuẩn hóa `backend/src/config/dbSchema.js` về wrapper mỏng
- [x] Hợp nhất route `formsRoutes` và `formInfoRoutes`
- [x] Bỏ khai báo tay `form-info` trong `backend/src/app.js`
- [x] Chốt vai trò `package.json` ở root thành orchestration package

### `P2` - Renew Adobe

- [x] Tách frontend `renew-adobe` sang `features/renew-adobe/*`
- [x] Tách `RenewAdobeAdmin/index.tsx` về page entry mỏng
- [x] Tách `RenewAdobeHeader`, `RenewAdobeProgressPanel`, `RenewAdobeAccountsTable`
- [x] Tách orchestration sang `useRenewAdobeAdmin.ts`
- [x] Tách backend `RenewAdobeController` thành `accounts`, `checkAccounts`, `userOrders`, `batchUsers`, `autoAssign`, `productSystem`, `orderAccess`, `accountTable`
- [x] Thu gọn `backend/src/controllers/RenewAdobeController/index.js` về composition layer
- [x] Tách `loginBrowser.js` thành flow chính và helper modules

### `P3` - Product Pricing

- [x] Tách `ProductEditPanel` khỏi `ProductRow.tsx`
- [x] Tách `ProductExpandedDetails` khỏi `ProductRow.tsx`
- [x] Tách tiếp `ProductExpandedDetails.tsx` thành `summary cards + supply table + row components`
- [x] Tách `ProductTable.tsx` thành `mobile section + desktop section + pagination`
- [x] Tách `CreateProductModal.tsx` thành `basic info + ratios + suppliers + actions`
- [x] Tách `useProductActions.ts` và `useSupplyActions.ts` về composition layer
- [x] Tách thêm `useDeleteProductActions.ts`, `useProductStatusActions.ts`, `useSupplyPriceMap.ts`, `useExistingSupplyRowActions.ts`, `useNewSupplyRowActions.ts`, `useProductReferenceOptions.ts`
- [x] Giảm prop-drilling giữa `ProductTable` và `ProductRow`

### `P4` - Package Products

- [x] Tách `usePackageDeleteActions.ts`
- [x] Tách `usePackageMutationActions.ts`
- [x] Tách `PackageFormModal.tsx` thành `package-form/*`
- [x] Tách `usePackageTemplateActions.ts`
- [x] Tách `usePackageProductPage.ts`
- [x] Thu gọn `PackageProduct.tsx` về composition layer

### `P5` - Orders

- [x] Tách `CreateOrderModal.tsx`, `EditOrderModal.tsx`, `ViewOrderModal.tsx`
- [x] Chuẩn hóa các modal order phía frontend về composition layer
- [x] Tách `backend/src/controllers/Order/crud/*`
- [x] Tách `backend/src/controllers/Order/finance/*`
- [x] Tách `backend/src/controllers/Order/helpers/*`
- [x] Tách `backend/src/controllers/Order/queries/listOrders.js`
- [x] Thu gọn `listRoutes.js`, `crudRoutes.js`, `helpers.js`, `orderFinanceHelpers.js`
- [x] Chuyển `backend/webhook/sepay/utils.js` sang dùng pricing core chung
- [x] Tách page `frontend/src/pages/Product/Orders/index.tsx` thành `page + sections`

### `P5+` - Product Backend Cleanup

- [x] Tách `backend/src/controllers/ProductsController/handlers/mutations.js` thành `create + update + status + delete + shared`
- [x] Giữ `mutations.js` là wrapper mỏng để tránh breaking change nội bộ

### `P6` - Các domain còn lại

- [x] Tách `BudgetsGoals.tsx` thành `budgets-goals/*`
- [x] Tách `Supply/index.tsx` thành `page + modal/components/hooks`
- [x] Tách `PromoCodes/index.tsx` thành `tabs + sections + hooks`

### `P7` - Hardening và cleanup

- [x] Chạy lại `npm run build` cho frontend sau các lát cắt lớn
- [x] Chạy `node --check` cho các cụm backend chính đã tách
- [x] Giữ có chủ đích các compatibility wrapper:
- [x] `frontend/src/lib/api.ts`
- [x] `frontend/src/lib/helpers.ts`
- [x] `backend/src/controllers/Order/helpers.js`
- [x] `backend/src/controllers/Order/orderFinanceHelpers.js`

## Cập nhật 2026-03-30 - Pricing

- [x] Chuyển pricing core từ `markup trên giá gốc` sang `margin trên giá bán`
- [x] Giữ compatibility cho dữ liệu cũ dạng hệ số như `1.2`, `1.5` bằng cách quy đổi sang margin tương đương
- [x] Đồng bộ công thức ở `backend/src/services/pricing/core.js`
- [x] Đồng bộ preview và promo calculation ở `frontend/src/pages/Product/PriceList/utils.ts`
- [x] Đồng bộ validation nhập liệu ở `frontend/src/pages/Product/PriceList/hooks/productActionHelpers.ts`
- [x] Đồng bộ fallback quote pricing ở `frontend/src/pages/Personal/ProductPrice/helpers.ts`
- [x] Chỉnh lại copy preview để không còn mô tả sai công thức cũ
- [x] Chạy `node --check` cho `backend/src/services/pricing/core.js`
- [x] Chạy `node --check` cho `backend/webhook/sepay/renewal.js`
- [x] Chạy `npm run build` trong `frontend/` sau khi đổi công thức
- [x] Bỏ legacy conversion khi đọc `pct_ctv` và `pct_khach`, chuyển sang dùng trực tiếp biên độ đã chuẩn hóa từ DB
- [x] Thêm migration `database/migrations/017_normalize_variant_margin_ratios.sql` để trừ `1` cho `pct_ctv` và `pct_khach`

## Cập nhật 2026-03-30 - Package supplier binding

- [x] Bỏ auto-sync `supplier` từ `stock account` trong `PackageFormModal`
- [x] Bỏ ghi đè `supplier` khi chọn, bỏ chọn, hoặc cập nhật `stock account`
- [x] Bỏ fallback `manualStock.account -> supplier` trong `usePackageMutationActions.ts`
- [x] Xác nhận `npm run build` trong `frontend/` pass sau khi sửa

## Cập nhật 2026-03-30 - Text encoding cleanup

- [x] Quét lại toàn repo bằng `UTF-8 + ftfy` để phân biệt lỗi text thật với lỗi hiển thị của terminal
- [x] Sửa các file còn text mojibake thật trong `docs/*`
- [x] Sửa text lỗi trong `backend/src/controllers/Order/listRoutes.js`
- [x] Sửa text lỗi trong `frontend/src/pages/Product/PriceList/components/ProductRow.tsx`
- [x] Xác nhận không còn file source nào cần `ftfy` fix thêm
- [x] Chạy `node --check` cho `backend/src/controllers/Order/listRoutes.js`
- [x] Chạy `npm run build` trong `frontend/` sau khi cleanup text

## Cập nhật 2026-03-31 - Product dropdown trong edit panel

- [x] Tạo danh sách `productNameOptions` từ `productPrices` hiện có trong feature `price-list`
- [x] Truyền `productNameOptions` qua `usePricingData -> ProductTable -> ProductRow -> ProductEditPanel`
- [x] Đổi field `Tên sản phẩm` trong `ProductEditPanel` thành dropdown chọn product có sẵn
- [x] Thêm nút `+` để chuyển sang nhập `product` mới thủ công khi cần
- [x] Thêm nút `Chọn sẵn` để quay lại dropdown mà không làm vỡ flow edit hiện tại
- [x] Chạy `npm run build` trong `frontend/` sau khi thêm dropdown

## Cập nhật 2026-03-31 - Fix lan thay đổi giữa các variant cùng product

- [x] Xác định nguyên nhân: `PATCH /api/product-prices/:productId` đang update `product.package_name`, nên đổi một row sẽ lan sang mọi `variant` chung `product_id`
- [x] Đổi semantics update: khi sửa `Tên sản phẩm`, API sẽ resolve `product` đích rồi chỉ update `variant.product_id` của row đang sửa
- [x] Nếu product chưa tồn tại, API tự tạo product mới rồi gán đúng `variant` vào product đó
- [x] Giữ nguyên update `variant` cho `packageProduct`, `sanPham`, `pctCtv`, `pctKhach`, `pctPromo`
- [x] Chạy `node --check` cho `backend/src/controllers/ProductsController/handlers/mutations/updateProductPrice.js`

## Cập nhật 2026-03-31 - Tab trạng thái cho price list

- [x] Thay dropdown `Trạng thái` trong `PricingFilters` bằng 2 tab `Đang hoạt động` và `Không hoạt động`
- [x] Giữ nguyên search box, nút `Thêm sản phẩm` và `Đồng bộ lại`
- [x] Đổi default `statusFilter` của `price-list` sang `active` để tab đầu hiển thị đúng dữ liệu ngay khi vào trang
- [x] Chạy `npm run build` trong `frontend/` sau khi đổi filter UI

## Cập nhật 2026-03-31 - Chuyển filter trạng thái sang stat cards

- [x] Bỏ 2 nút tab trạng thái khỏi `PricingFilters`
- [x] Biến 3 stat card trong `PricingStats` thành button filter cho `all`, `active`, `inactive`
- [x] Highlight stat card đang active theo `statusFilter`
- [x] Giữ lại search box, nút `Thêm sản phẩm` và `Đồng bộ lại` trong filter panel
- [x] Chạy `npm run build` trong `frontend/` sau khi chuyển filter sang stat cards

## Cập nhật 2026-03-31 - Thêm cột giá gốc cho price list

- [x] Thêm cột `Giá gốc` vào table desktop của `price-list`
- [x] Hoàn thiện khung hiển thị `Giá gốc` cho desktop và mobile để sẵn sàng nối dữ liệu chuẩn từ DB
- [x] Cập nhật `colSpan` của các row expand/edit để khớp số cột mới
- [x] Đồng bộ mobile card bằng tile `Giá gốc`
- [x] Chạy `npm run build` trong `frontend/` sau khi thêm cột

## Cập nhật 2026-03-31 - Match `base_price` cho cột Giá gốc

- [x] Thêm `BASE_PRICE: "base_price"` vào config schema `product.variant`
- [x] Đưa `base_price` vào các query list/detail trong `ProductsController`
- [x] Map `base_price` qua backend mapper `mapProductPriceRow`
- [x] Đồng bộ `VARIANT_PRICING_COLS.basePrice` và `ProductPricingRow.basePrice` ở frontend
- [x] Đổi cột `Giá gốc` desktop sang dùng `variant.base_price`
- [x] Đổi tile `Giá gốc` mobile sang dùng `variant.base_price`
- [x] Giữ `baseSupplyPrice` cho logic giá nguồn / supplier pricing, không dùng nó để hiển thị `Giá gốc` nữa

## Cập nhật 2026-03-31 - Thêm input `Giá gốc` cho form tạo và sửa sản phẩm

- [x] Thêm field `basePrice` vào `CreateProductFormState` và `ProductEditFormState`
- [x] Thêm input `Giá gốc` vào `CreateProductModal`
- [x] Thêm input `Giá gốc` vào `ProductEditPanel`
- [x] Format input `Giá gốc` theo kiểu VND khi nhập ở frontend
- [x] Bổ sung validation và payload `basePrice` cho flow `POST/PATCH /api/product-prices`
- [x] Lưu `basePrice` vào `variant.base_price` ở backend create/update handlers
- [x] Giữ `basePrice` là trường dữ liệu độc lập để so sánh/hiển thị, không dùng nó trong công thức tính giá sỉ/lẻ/khuyến mãi

## Ghi chú sau refactor

- Compatibility layer vẫn được giữ lại để tránh breaking change nội bộ trong repo. Việc xóa hẳn các wrapper này nên làm ở một lượt cleanup riêng, sau khi đã đổi xong toàn bộ import còn phụ thuộc.
- `frontend/dist` tiếp tục thay đổi theo mỗi lần build. Đây là hệ quả trực tiếp của bước verify, không phải thay đổi UI/UX ngoài ý muốn.
- Các thay đổi bẩn từ trước, đặc biệt trong `backend/scripts/**`, vẫn được giữ nguyên và không bị chạm vào trong lát cắt pricing này.

## Điều kiện hoàn thành mỗi phase

- build hoặc smoke test qua
- không đổi UI/UX ngoài chủ đích
- không tăng thêm helper bucket hoặc file tổng hợp mới nếu chưa thật sự tái sử dụng
- boundary domain phải rõ hơn trước khi refactor

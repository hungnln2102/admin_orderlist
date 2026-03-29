# Bảng Task Refactor

Ngày cập nhật: `2026-03-30`

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

## Ghi chú sau refactor

- Compatibility layer vẫn được giữ lại để tránh breaking change nội bộ trong repo. Việc xóa hẳn các wrapper này nên làm ở một lượt cleanup riêng, sau khi đã đổi xong toàn bộ import còn phụ thuộc.
- `frontend/dist` tiếp tục thay đổi theo mỗi lần build. Đây là hệ quả trực tiếp của bước verify, không phải thay đổi UI/UX ngoài ý muốn.
- Các thay đổi bẩn từ trước, đặc biệt trong `backend/scripts/**`, vẫn được giữ nguyên và không bị chạm vào trong lát cắt pricing này.

## Điều kiện hoàn thành mỗi phase

- build hoặc smoke test qua
- không đổi UI/UX ngoài chủ đích
- không tăng thêm helper bucket hoặc file tổng hợp mới nếu chưa thật sự tái sử dụng
- boundary domain phải rõ hơn trước khi refactor

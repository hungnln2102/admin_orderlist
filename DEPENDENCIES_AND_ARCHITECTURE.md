# admin_orderlist — Dependencies & kiến trúc mã nguồn

Tổng hợp **package dependencies**, **cấu trúc thư mục**, và **luồng chức năng chính** (file/route ↔ vai trò). Cập nhật theo trạng thái repo; khi thêm module mới nên bổ sung bảng tương ứng.

---

## 1. Cấu trúc workspace

Repo là **monorepo nhẹ** (orchestrator ở root, không khai báo `workspaces` trong npm):

| Thư mục | Vai trò |
|--------|---------|
| `backend/` | API Node (Express + Knex + PostgreSQL), webhook Sepay, scheduler, migration SQL |
| `frontend/` | SPA React (Vite), gọi API backend |
| `shared/` | Schema/constant dùng chung (ESM, gần như không có dependency npm) |
| `database/migrations/` | Script SQL theo số thứ tự |
| `backend/webhook/` | Tích hợp thanh toán / renewal (vd. `sepay/renewal.js`) |

**Script root** (`package.json`): `dev:backend`, `dev:frontend`, `build:frontend`, `lint:*`, `test:*`.

---

## 2. Dependencies theo package

### 2.1 `backend/package.json` — runtime

| Package | Dùng cho |
|--------|----------|
| `express` | HTTP server, router |
| `knex` | Query builder / migration client |
| `pg` | Driver PostgreSQL |
| `dotenv` | Biến môi trường |
| `cors`, `helmet`, `express-rate-limit`, `express-session` | Bảo mật, session |
| `express-validator` | Validate input |
| `bcryptjs` | Hash mật khẩu |
| `csrf` | CSRF token |
| `axios` | HTTP client ra ngoài |
| `googleapis` | Tích hợp Google |
| `imapflow`, `mailparser` | Đọc email (OTP / automation) |
| `multer` | Upload file |
| `sharp` | Xử lý ảnh |
| `winston`, `winston-daily-rotate-file` | Log |
| `morgan` | Log HTTP |
| `node-cron` | Lịch tác vụ |
| `playwright` | Automation trình duyệt (Adobe renew, …) |
| `impit`, `tough-cookie` | HTTP client / cookie (automation) |

**Dev:** `jest`, `supertest`, `eslint`, `prettier`, `nodemon`, `concurrently`.

### 2.2 `frontend/package.json` — runtime

| Package | Dùng cho |
|--------|----------|
| `react`, `react-dom` | UI |
| `react-router-dom` | Điều hướng |
| `vite` (dev) | Build / dev server |
| `axios` | Gọi API |
| `@tiptap/*` | Editor rich text (mô tả sản phẩm / bài viết) |
| `recharts` | Biểu đồ dashboard |
| `framer-motion` | Animation |
| `@heroicons/react`, `lucide-react` | Icon |
| `react-hot-toast` | Thông báo |
| `xlsx` | Xuất / nhập Excel |
| `dotenv` | Env trong build (nếu cấu hình) |

**Dev:** `vitest`, `@testing-library/*`, `tailwindcss`, `typescript`, `eslint`, `@vitejs/plugin-react-swc`.

### 2.3 `shared/package.json`

Không khai báo `dependencies` / `devDependencies` trong file hiện tại — chủ yếu là **module JS** (ví dụ `schema.js`) để frontend/backend tham chiếu.

---

## 3. Cấu trúc thư mục chính (rút gọn)

| Đường dẫn | Nội dung |
|-----------|----------|
| `backend/src/server.js` (default: `npm start`), `backend/index.js` (shim) | Khởi động API |
| `backend/src/app.js` | Cấu hình Express |
| `backend/src/routes/index.js` | **Gắn mọi route** protected (sau `authGuard`) |
| `backend/src/routes/*.js` | Nhóm route theo domain |
| `backend/src/controllers/*` | Handler HTTP theo domain |
| `backend/src/config/dbSchema/` | Định nghĩa schema bảng / cột (product, orders, finance, …) |
| `backend/src/db/knexClient.js` | Knex |
| `backend/src/services/*` | Pricing, Adobe renew, Telegram, package sync, … |
| `backend/src/scheduler/` | Cron / tác vụ định kỳ |
| `backend/src/middleware/` | `authGuard`, … |
| `backend/webhook/sepay/` | Renewal, payment webhook, config pool |
| `backend/scripts/migrations/` | Chạy migration (vd. `migrate:028`) |
| `frontend/src/routes/AppRoutes.tsx` | Route React |
| `frontend/src/features/*` | Feature: orders, dashboard, pricing, renew-adobe, content, … |
| `frontend/src/lib/*` | API client, `tableSql`, `productDescApi`, … |
| `frontend/src/components/` | Layout, modal dùng chung |
| `shared/schema.js` | Định nghĩa bảng/cột dạng shared |

---

## 4. Backend: route → nhóm xử lý (từ `src/routes/index.js`)

Các đường dẫn dưới đây là **prefix** dưới API (thường `/api` — tùy `app.js`).

| Mount path | File route (gợi ý) | Chức năng |
|------------|-------------------|-----------|
| `/auth` | `authRoutes.js` | Đăng nhập / phiên |
| `/renew-adobe/public` | `renewAdobePublicRoutes.js` | Adobe public |
| `/public/content` | `publicContentRoutes.js` | Nội dung công khai |
| *(sau `authGuard`)* | | |
| `/dashboard` | `dashboardRoutes.js` | Thống kê |
| `/orders` | `ordersRoutes.js` | Đơn hàng |
| `/supplies` | `suppliesRoutes.js` | Nhà cung cấp / supply |
| `/payments` | `paymentsRoutes.js` | Thanh toán |
| `/products`, `/product-prices`, `/product-descriptions`, `/product-images` | `productsRoutes.js`, … | Sản phẩm / giá / mô tả / ảnh |
| `/content`, `/categories` | `contentRoutes.js`, … | CMS / danh mục |
| `/warehouse` | `warehouseRoutes.js` | Kho |
| `/renew-adobe` | `renewAdobeRoutes.js` | Gia hạn Adobe (admin) |
| `/ip-whitelists`, `/site-maintenance` | Domain `domains/*` | Vận hành |

**Luồng đặc biệt**

- **Gia hạn đơn + dashboard tháng:** `backend/webhook/sepay/renewal.js` (`runRenewal`) — cập nhật đơn, ghi `finance.dashboard_monthly_summary`.
- **Schema DB:** `backend/src/config/dbSchema/schemas/ordersProductPartner.js` (product, variant, `desc_variant`, …).

---

## 5. Frontend: feature ↔ lib/API

| Feature (`frontend/src/features/`) | Giao tiếp / lib điển nhấn |
|-----------------------------------|---------------------------|
| `orders/` | Transform danh sách đơn, tab dataset |
| `dashboard/` | `dashboardApi.ts`, Recharts |
| `pricing/` | CRUD bảng giá, actions hooks |
| `product-price/` | Báo giá in, catalog quote |
| `renew-adobe/` | `renewAdobeApi.ts`, bảng tài khoản |
| `content/` | Banner, bài viết, SEO |
| `package-product/` | Gói / package_product |

**Lib chung:** `frontend/src/lib/tableSql.ts` (map cột UI ↔ DB), `productDescApi.ts` (mô tả/`desc_variant`), `axios` cho REST backend.

---

## 6. Công cụ & script hay dùng

| Lệnh | Mục đích |
|------|----------|
| `npm run dev` (trong `backend/`) | API dev (`nodemon`) |
| `npm run dev` (trong `frontend/`) | Vite |
| `npm run migrate:028` (trong `backend/`) | Migration `desc_variant` / `variant.id_desc` |
| `npm run sync:dashboard-summary` | Tái tổng hợp dashboard tháng |

---

## 7. Hàm / export backend: định nghĩa → được gọi ở đâu

> Gồm các **module lõi** thường dùng chéo. Các `controllers/*/index.js` chủ yếu export **handler Express** và được nối trong `src/routes/*.js` — tra trực tiếp file route nếu cần từng endpoint.

### 7.1 Giá — `backend/src/services/pricing/core.js`

| Export | Vai trò | Nơi dùng chính |
|--------|---------|----------------|
| `calculateOrderPricingFromResolvedValues` | Tính giá bán / cost / meta từ %CTV, %KH, promo, … | `webhook/sepay/renewal.js`, `webhook/sepay/utils.js`, `webhook/sepay/payments.js`, `orderPricingService.js` |
| `resolveMoney`, `normalizeMoney`, `normalizeImportValue`, `roundToThousands` | Chuẩn hóa số tiền / giá nhập | Cùng các file webhook + renewal |
| `calculateMarginBasedPrice`, `normalizeMarginRatio`, `normalizePromoRatio`, … | Công thức margin | `core.js` (nội bộ + re-export) |

### 7.2 Giá HTTP — `backend/src/services/pricing/orderPricingService.js`

| Export | Vai trò | Nơi dùng |
|--------|---------|----------|
| `calculateOrderPricing`, `fetchVariantPricing` | Lấy variant + tính giá cho API | Controller/ route product-prices (import trong handlers pricing) |
| `PricingHttpError` | Lỗi domain pricing | Caller xử lý 4xx/5xx |

### 7.3 Gia hạn & Sepay — `backend/webhook/sepay/renewal.js`

| Export | Vai trò | Nơi dùng |
|--------|---------|----------|
| `runRenewal` | Gia hạn 1 đơn (cập nhật `order_list`, dashboard tháng nếu từ RENEWAL) | `renewRoutes.js` (API admin), `sepay_webhook.js`, `scripts/ops/run-renewal.js`, test `test-rules.js`, `test-webhook-rules.js` |
| `runRenewalBatch`, `fetchRenewalCandidates`, `processRenewalTask`, … | Lô / hàng đợi renewal | `routes/renewals.js`, webhook batch |
| `computeOrderCurrentPrice` | Tính lại giá (không ghi DB) cho Telegram | `notifications.js` (cùng thư mục) |

### 7.4 Webhook Sepay — `backend/webhook/sepay/payments.js`

| Export | Vai trò | Nơi dùng |
|--------|---------|----------|
| `insertPaymentReceipt`, `updatePaymentSupplyBalance`, `ensureSupplyAndPriceFromOrder` | Ghi receipt / cân balance NCC | `routes/webhook.js`, `runRenewal` (comment/gọi chung luồng tiền) |
| `calculateSalePrice` | Giá bán derive từ pricing core | `webhook.js`, utils |

### 7.5 Tiện ích Sepay — `backend/webhook/sepay/utils.js`

| Export | Vai trò | Nơi dùng |
|--------|---------|----------|
| `fetchProductPricing`, `fetchSupplyPrice`, `fetchMaxSupplyPrice`, `findSupplyId` | Đọc `variant` / `supplier_cost` | `renewal.js`, `payments.js`, `notifications.js` |
| `parseFlexibleDate`, `formatDateDB`, `formatDateDMY`, `addMonthsClamped`, `daysUntil`, … | Ngày / duration | `renewal.js`, eligibility, tests |
| `normalizeProductDuration`, `extractOrderCodeFromText`, … | Parse nội dung CK / label SP | Webhook + renewal |

### 7.6 SQL an toàn — `backend/src/utils/sql.js`

| Export | Nơi dùng |
|--------|----------|
| `quoteIdent` | Hầu hết controller có raw SQL (`ProductsController`, `ProductDescriptionsController`, …) |

### 7.7 Chuẩn hóa input — `backend/src/utils/normalizers.js`

| Export | Nơi dùng |
|--------|----------|
| `normalizeTextInput`, `trimToLength`, `toNullableNumber`, `normalizeDateInput`, … | Controllers, ProductDescriptions, Orders, mappers |

### 7.8 Mapper sản phẩm — `backend/src/controllers/ProductsController/mappers.js`

| Export | Nơi dùng |
|--------|----------|
| `mapProductPriceRow`, `mapSupplyPriceRow` | `handlers/list.js`, `createProductPrice.js`, `updateProductPrice.js` |

### 7.9 Mô tả sản phẩm (API) — `backend/src/controllers/ProductDescriptionsController/index.js`

| Hàm (export module) | Route | Frontend gọi qua |
|---------------------|--------|------------------|
| `listProductDescriptions`, `saveProductDescription`, `uploadProductImage`, `listProductImages`, `deleteProductImage` | `src/routes/productDescriptionsRoutes.js` → `/api/product-descriptions/*` | `frontend/src/lib/productDescApi.ts` |

---

## 8. Hàm / export frontend (`frontend/src/lib`): định nghĩa → feature

| File lib | Hàm / constant chính | Được import tại |
|----------|----------------------|-----------------|
| `productDescApi.ts` | `saveProductDescription`, `fetchProductDescriptions`, `auditProductSeo`, `uploadProductImage`, … | `features/product-info/hooks/useProductInfo.ts`, `useProductEdit.ts`, `useWebsiteSeoAudit.ts`, helpers |
| `pricingApi.ts` | `fetchCalculatedPrice` | `features/product-price/hooks/useQuoteCalculatedPriceMap.ts`, `CreateOrderModal/.../usePriceCalculation.ts`, `ViewOrderModal/.../useCalculatedPrice.ts` |
| `tableSql.ts` / `fieldMapper.ts` | Map cột DB ↔ UI (ORDER_COLS, VARIANT_COLS, …) | Bảng dữ liệu toàn admin (orders, pricing, warehouse, …) — grep `tableSql` / `FIELD_MAP` trong `features/` |
| `categoryApi.ts` | CRUD category | Feature content / category |
| `formsApi.ts` | `fetchFormNames`, `createForm`, … | Form-info feature |
| `errorHandler.ts` | `apiFetchWithErrorHandling`, `parseApiError` | Gọi API có xử lý lỗi thống nhất |
| `refreshBus.ts` | `emitRefresh`, `onRefresh` | Invalidate UI sau mutation |
| `notifications.ts` | `showAppNotification` | Toast toàn app |

---

*Tài liệu được sinh để tra cứu nhanh; không thay thế README chi tiết từng feature. Khi thêm hàm public mới, nên bổ sung một dòng vào bảng tương ứng.*

---

## Biểu đồ trực quan (Figma-style)

Mở trong trình duyệt file **[`ARCHITECTURE_FIGMA_STYLE.html`](./ARCHITECTURE_FIGMA_STYLE.html)** — layout dạng board (khung, node, consumer) để chụp màn hình hoặc dựng lại trong Figma.

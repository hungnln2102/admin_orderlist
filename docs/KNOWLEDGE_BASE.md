# TRUNG TÂM TRI THỨC NGHIỆP VỤ VÀ KIẾN TRÚC

Tài liệu này được gom từ các hướng dẫn tài chính, kiến trúc và quy trình cũ trước đợt tái cấu trúc dự án.

## --- [DEPENDENCIES_AND_ARCHITECTURE.md] ---

# admin_orderlist â€” Dependencies & kiáº¿n trÃºc mÃ£ nguá»“n

Tá»•ng há»£p **package dependencies**, **cáº¥u trÃºc thÆ° má»¥c**, vÃ  **luá»“ng chá»©c nÄƒng chÃ­nh** (file/route â†” vai trÃ²). Cáº­p nháº­t theo tráº¡ng thÃ¡i repo; khi thÃªm module má»›i nÃªn bá»• sung báº£ng tÆ°Æ¡ng á»©ng.

---

## 1. Cáº¥u trÃºc workspace

Repo lÃ  **monorepo nháº¹** (orchestrator á»Ÿ root, khÃ´ng khai bÃ¡o `workspaces` trong npm):

| ThÆ° má»¥c | Vai trÃ² |
|--------|---------|
| `backend/` | API Node (Express + Knex + PostgreSQL), webhook Sepay, scheduler, migration SQL |
| `frontend/` | SPA React (Vite), gá»i API backend |
| `shared/` | Schema/constant dÃ¹ng chung (ESM, gáº§n nhÆ° khÃ´ng cÃ³ dependency npm) |
| `database/migrations/` | Script SQL theo sá»‘ thá»© tá»± |
| `backend/webhook/` | TÃ­ch há»£p thanh toÃ¡n / renewal (vd. `sepay/renewal.js`) |

**Script root** (`package.json`): `dev:backend`, `dev:frontend`, `build:frontend`, `lint:*`, `test:*`.

---

## 2. Dependencies theo package

### 2.1 `backend/package.json` â€” runtime

| Package | DÃ¹ng cho |
|--------|----------|
| `express` | HTTP server, router |
| `knex` | Query builder / migration client |
| `pg` | Driver PostgreSQL |
| `dotenv` | Biáº¿n mÃ´i trÆ°á»ng |
| `cors`, `helmet`, `express-rate-limit`, `express-session` | Báº£o máº­t, session |
| `express-validator` | Validate input |
| `bcryptjs` | Hash máº­t kháº©u |
| `csrf` | CSRF token |
| `axios` | HTTP client ra ngoÃ i |
| `googleapis` | TÃ­ch há»£p Google |
| `imapflow`, `mailparser` | Äá»c email (OTP / automation) |
| `multer` | Upload file |
| `sharp` | Xá»­ lÃ½ áº£nh |
| `winston`, `winston-daily-rotate-file` | Log |
| `morgan` | Log HTTP |
| `node-cron` | Lá»‹ch tÃ¡c vá»¥ |
| `playwright` | Automation trÃ¬nh duyá»‡t (Adobe renew, â€¦) |
| `impit`, `tough-cookie` | HTTP client / cookie (automation) |

**Dev:** `jest`, `supertest`, `eslint`, `prettier`, `nodemon`, `concurrently`.

### 2.2 `frontend/package.json` â€” runtime

| Package | DÃ¹ng cho |
|--------|----------|
| `react`, `react-dom` | UI |
| `react-router-dom` | Äiá»u hÆ°á»›ng |
| `vite` (dev) | Build / dev server |
| `axios` | Gá»i API |
| `@tiptap/*` | Editor rich text (mÃ´ táº£ sáº£n pháº©m / bÃ i viáº¿t) |
| `recharts` | Biá»ƒu Ä‘á»“ dashboard |
| `framer-motion` | Animation |
| `@heroicons/react`, `lucide-react` | Icon |
| `react-hot-toast` | ThÃ´ng bÃ¡o |
| `xlsx` | Xuáº¥t / nháº­p Excel |
| `dotenv` | Env trong build (náº¿u cáº¥u hÃ¬nh) |

**Dev:** `vitest`, `@testing-library/*`, `tailwindcss`, `typescript`, `eslint`, `@vitejs/plugin-react-swc`.

### 2.3 `shared/package.json`

KhÃ´ng khai bÃ¡o `dependencies` / `devDependencies` trong file hiá»‡n táº¡i â€” chá»§ yáº¿u lÃ  **module JS** (vÃ­ dá»¥ `schema.js`) Ä‘á»ƒ frontend/backend tham chiáº¿u.

---

## 3. Cáº¥u trÃºc thÆ° má»¥c chÃ­nh (rÃºt gá»n)

| ÄÆ°á»ng dáº«n | Ná»™i dung |
|-----------|----------|
| `backend/src/server.js` (default: `npm start`), `backend/index.js` (shim) | Khá»Ÿi Ä‘á»™ng API |
| `backend/src/app.js` | Cáº¥u hÃ¬nh Express |
| `backend/src/routes/index.js` | **Gáº¯n má»i route** protected (sau `authGuard`) |
| `backend/src/routes/*.js` | NhÃ³m route theo domain |
| `backend/src/controllers/*` | Handler HTTP theo domain |
| `backend/src/config/dbSchema/` | Äá»‹nh nghÄ©a schema báº£ng / cá»™t (product, orders, finance, â€¦) |
| `backend/src/db/knexClient.js` | Knex |
| `backend/src/services/*` | Pricing, Adobe renew, Telegram, package sync, â€¦ |
| `backend/src/scheduler/` | Cron / tÃ¡c vá»¥ Ä‘á»‹nh ká»³ |
| `backend/src/middleware/` | `authGuard`, â€¦ |
| `backend/webhook/sepay/` | Renewal, payment webhook, config pool |
| `backend/scripts/migrations/` | Cháº¡y migration (vd. `migrate:028`) |
| `frontend/src/routes/AppRoutes.tsx` | Route React |
| `frontend/src/features/*` | Feature: orders, dashboard, pricing, renew-adobe, content, â€¦ |
| `frontend/src/lib/*` | API client, `tableSql`, `productDescApi`, â€¦ |
| `frontend/src/components/` | Layout, modal dÃ¹ng chung |
| `shared/schema.js` | Äá»‹nh nghÄ©a báº£ng/cá»™t dáº¡ng shared |

---

## 4. Backend: route â†’ nhÃ³m xá»­ lÃ½ (tá»« `src/routes/index.js`)

CÃ¡c Ä‘Æ°á»ng dáº«n dÆ°á»›i Ä‘Ã¢y lÃ  **prefix** dÆ°á»›i API (thÆ°á»ng `/api` â€” tÃ¹y `app.js`).

| Mount path | File route (gá»£i Ã½) | Chá»©c nÄƒng |
|------------|-------------------|-----------|
| `/auth` | `authRoutes.js` | ÄÄƒng nháº­p / phiÃªn |
| `/renew-adobe/public` | `renewAdobePublicRoutes.js` | Adobe public |
| `/public/content` | `publicContentRoutes.js` | Ná»™i dung cÃ´ng khai |
| *(sau `authGuard`)* | | |
| `/dashboard` | `dashboardRoutes.js` | Thá»‘ng kÃª |
| `/orders` | `ordersRoutes.js` | ÄÆ¡n hÃ ng |
| `/supplies` | `suppliesRoutes.js` | NhÃ  cung cáº¥p / supply |
| `/payments` | `paymentsRoutes.js` | Thanh toÃ¡n |
| `/products`, `/product-prices`, `/product-descriptions`, `/product-images` | `productsRoutes.js`, â€¦ | Sáº£n pháº©m / giÃ¡ / mÃ´ táº£ / áº£nh |
| `/content`, `/categories` | `contentRoutes.js`, â€¦ | CMS / danh má»¥c |
| `/warehouse` | `warehouseRoutes.js` | Kho |
| `/renew-adobe` | `renewAdobeRoutes.js` | Gia háº¡n Adobe (admin) |
| `/ip-whitelists`, `/site-maintenance` | Domain `domains/*` | Váº­n hÃ nh |

**Luá»“ng Ä‘áº·c biá»‡t**

- **Gia háº¡n Ä‘Æ¡n + dashboard thÃ¡ng:** `backend/webhook/sepay/renewal.js` (`runRenewal`) â€” cáº­p nháº­t Ä‘Æ¡n, ghi `finance.dashboard_monthly_summary`.
- **Schema DB:** `backend/src/config/dbSchema/schemas/ordersProductPartner.js` (product, variant, `desc_variant`, â€¦).

---

## 5. Frontend: feature â†” lib/API

| Feature (`frontend/src/features/`) | Giao tiáº¿p / lib Ä‘iá»ƒn nháº¥n |
|-----------------------------------|---------------------------|
| `orders/` | Transform danh sÃ¡ch Ä‘Æ¡n, tab dataset |
| `dashboard/` | `dashboardApi.ts`, Recharts |
| `pricing/` | CRUD báº£ng giÃ¡, actions hooks |
| `product-price/` | BÃ¡o giÃ¡ in, catalog quote |
| `renew-adobe/` | `renewAdobeApi.ts`, báº£ng tÃ i khoáº£n |
| `content/` | Banner, bÃ i viáº¿t, SEO |
| `package-product/` | GÃ³i / package_product |

**Lib chung:** `frontend/src/lib/tableSql.ts` (map cá»™t UI â†” DB), `productDescApi.ts` (mÃ´ táº£/`desc_variant`), `axios` cho REST backend.

---

## 6. CÃ´ng cá»¥ & script hay dÃ¹ng

| Lá»‡nh | Má»¥c Ä‘Ã­ch |
|------|----------|
| `npm run dev` (trong `backend/`) | API dev (`nodemon`) |
| `npm run dev` (trong `frontend/`) | Vite |
| `npm run migrate:028` (trong `backend/`) | Migration `desc_variant` / `variant.id_desc` |
| `npm run sync:dashboard-summary` | TÃ¡i tá»•ng há»£p dashboard thÃ¡ng |

---

## 7. HÃ m / export backend: Ä‘á»‹nh nghÄ©a â†’ Ä‘Æ°á»£c gá»i á»Ÿ Ä‘Ã¢u

> Gá»“m cÃ¡c **module lÃµi** thÆ°á»ng dÃ¹ng chÃ©o. CÃ¡c `controllers/*/index.js` chá»§ yáº¿u export **handler Express** vÃ  Ä‘Æ°á»£c ná»‘i trong `src/routes/*.js` â€” tra trá»±c tiáº¿p file route náº¿u cáº§n tá»«ng endpoint.

### 7.1 GiÃ¡ â€” `backend/src/services/pricing/core.js`

| Export | Vai trÃ² | NÆ¡i dÃ¹ng chÃ­nh |
|--------|---------|----------------|
| `calculateOrderPricingFromResolvedValues` | TÃ­nh giÃ¡ bÃ¡n / cost / meta tá»« %CTV, %KH, promo, â€¦ | `webhook/sepay/renewal.js`, `webhook/sepay/utils.js`, `webhook/sepay/payments.js`, `orderPricingService.js` |
| `resolveMoney`, `normalizeMoney`, `normalizeImportValue`, `roundToThousands` | Chuáº©n hÃ³a sá»‘ tiá»n / giÃ¡ nháº­p | CÃ¹ng cÃ¡c file webhook + renewal |
| `calculateMarginBasedPrice`, `normalizeMarginRatio`, `normalizePromoRatio`, â€¦ | CÃ´ng thá»©c margin | `core.js` (ná»™i bá»™ + re-export) |

### 7.2 GiÃ¡ HTTP â€” `backend/src/services/pricing/orderPricingService.js`

| Export | Vai trÃ² | NÆ¡i dÃ¹ng |
|--------|---------|----------|
| `calculateOrderPricing`, `fetchVariantPricing` | Láº¥y variant + tÃ­nh giÃ¡ cho API | Controller/ route product-prices (import trong handlers pricing) |
| `PricingHttpError` | Lá»—i domain pricing | Caller xá»­ lÃ½ 4xx/5xx |

### 7.3 Gia háº¡n & Sepay â€” `backend/webhook/sepay/renewal.js`

| Export | Vai trÃ² | NÆ¡i dÃ¹ng |
|--------|---------|----------|
| `runRenewal` | Gia háº¡n 1 Ä‘Æ¡n (cáº­p nháº­t `order_list`, dashboard thÃ¡ng náº¿u tá»« RENEWAL) | `renewRoutes.js` (API admin), `sepay_webhook.js`, `scripts/ops/run-renewal.js`, test `test-rules.js`, `test-webhook-rules.js` |
| `runRenewalBatch`, `fetchRenewalCandidates`, `processRenewalTask`, â€¦ | LÃ´ / hÃ ng Ä‘á»£i renewal | `routes/renewals.js`, webhook batch |
| `computeOrderCurrentPrice` | TÃ­nh láº¡i giÃ¡ (khÃ´ng ghi DB) cho Telegram | `notifications.js` (cÃ¹ng thÆ° má»¥c) |

### 7.4 Webhook Sepay â€” `backend/webhook/sepay/payments.js`

| Export | Vai trÃ² | NÆ¡i dÃ¹ng |
|--------|---------|----------|
| `insertPaymentReceipt`, `updatePaymentSupplyBalance`, `ensureSupplyAndPriceFromOrder` | Ghi receipt / cÃ¢n balance NCC | `routes/webhook.js`, `runRenewal` (comment/gá»i chung luá»“ng tiá»n) |
| `calculateSalePrice` | GiÃ¡ bÃ¡n derive tá»« pricing core | `webhook.js`, utils |

### 7.5 Tiá»‡n Ã­ch Sepay â€” `backend/webhook/sepay/utils.js`

| Export | Vai trÃ² | NÆ¡i dÃ¹ng |
|--------|---------|----------|
| `fetchProductPricing`, `fetchSupplyPrice`, `fetchMaxSupplyPrice`, `findSupplyId` | Äá»c `variant` / `supplier_cost` | `renewal.js`, `payments.js`, `notifications.js` |
| `parseFlexibleDate`, `formatDateDB`, `formatDateDMY`, `addMonthsClamped`, `daysUntil`, â€¦ | NgÃ y / duration | `renewal.js`, eligibility, tests |
| `normalizeProductDuration`, `extractOrderCodeFromText`, â€¦ | Parse ná»™i dung CK / label SP | Webhook + renewal |

### 7.6 SQL an toÃ n â€” `backend/src/utils/sql.js`

| Export | NÆ¡i dÃ¹ng |
|--------|----------|
| `quoteIdent` | Háº§u háº¿t controller cÃ³ raw SQL (`ProductsController`, `ProductDescriptionsController`, â€¦) |

### 7.7 Chuáº©n hÃ³a input â€” `backend/src/utils/normalizers.js`

| Export | NÆ¡i dÃ¹ng |
|--------|----------|
| `normalizeTextInput`, `trimToLength`, `toNullableNumber`, `normalizeDateInput`, â€¦ | Controllers, ProductDescriptions, Orders, mappers |

### 7.8 Mapper sáº£n pháº©m â€” `backend/src/controllers/ProductsController/mappers.js`

| Export | NÆ¡i dÃ¹ng |
|--------|----------|
| `mapProductPriceRow`, `mapSupplyPriceRow` | `handlers/list.js`, `createProductPrice.js`, `updateProductPrice.js` |

### 7.9 MÃ´ táº£ sáº£n pháº©m (API) â€” `backend/src/controllers/ProductDescriptionsController/index.js`

| HÃ m (export module) | Route | Frontend gá»i qua |
|---------------------|--------|------------------|
| `listProductDescriptions`, `saveProductDescription`, `uploadProductImage`, `listProductImages`, `deleteProductImage` | `src/routes/productDescriptionsRoutes.js` â†’ `/api/product-descriptions/*` | `frontend/src/lib/productDescApi.ts` |

---

## 8. HÃ m / export frontend (`frontend/src/lib`): Ä‘á»‹nh nghÄ©a â†’ feature

| File lib | HÃ m / constant chÃ­nh | ÄÆ°á»£c import táº¡i |
|----------|----------------------|-----------------|
| `productDescApi.ts` | `saveProductDescription`, `fetchProductDescriptions`, `auditProductSeo`, `uploadProductImage`, â€¦ | `features/product-info/hooks/useProductInfo.ts`, `useProductEdit.ts`, `useWebsiteSeoAudit.ts`, helpers |
| `pricingApi.ts` | `fetchCalculatedPrice` | `features/product-price/hooks/useQuoteCalculatedPriceMap.ts`, `CreateOrderModal/.../usePriceCalculation.ts`, `ViewOrderModal/.../useCalculatedPrice.ts` |
| `tableSql.ts` / `fieldMapper.ts` | Map cá»™t DB â†” UI (ORDER_COLS, VARIANT_COLS, â€¦) | Báº£ng dá»¯ liá»‡u toÃ n admin (orders, pricing, warehouse, â€¦) â€” grep `tableSql` / `FIELD_MAP` trong `features/` |
| `categoryApi.ts` | CRUD category | Feature content / category |
| `formsApi.ts` | `fetchFormNames`, `createForm`, â€¦ | Form-info feature |
| `errorHandler.ts` | `apiFetchWithErrorHandling`, `parseApiError` | Gá»i API cÃ³ xá»­ lÃ½ lá»—i thá»‘ng nháº¥t |
| `refreshBus.ts` | `emitRefresh`, `onRefresh` | Invalidate UI sau mutation |
| `notifications.ts` | `showAppNotification` | Toast toÃ n app |

---

*TÃ i liá»‡u Ä‘Æ°á»£c sinh Ä‘á»ƒ tra cá»©u nhanh; khÃ´ng thay tháº¿ README chi tiáº¿t tá»«ng feature. Khi thÃªm hÃ m public má»›i, nÃªn bá»• sung má»™t dÃ²ng vÃ o báº£ng tÆ°Æ¡ng á»©ng.*

---

## Biá»ƒu Ä‘á»“ trá»±c quan (Figma-style)

Má»Ÿ trong trÃ¬nh duyá»‡t file **[`ARCHITECTURE_FIGMA_STYLE.html`](./ARCHITECTURE_FIGMA_STYLE.html)** â€” layout dáº¡ng board (khung, node, consumer) Ä‘á»ƒ chá»¥p mÃ n hÃ¬nh hoáº·c dá»±ng láº¡i trong Figma.


## --- [AUDIT_LOGS.md] ---

# Audit Logs & Tracking

Há»‡ thá»‘ng cÃ³ cÆ¡ cháº¿ Audit nghiÃªm ngáº·t Ä‘á»ƒ Ä‘áº£m báº£o má»i thay Ä‘á»•i vá» tiá»n báº¡c, tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng Ä‘á»u cÃ³ thá»ƒ truy váº¿t.

## 1. System Event Logs (`system_event_logs`)
- Ghi láº¡i cÃ¡c hoáº¡t Ä‘á»™ng cá»§a Admin: Sá»­a Ä‘Æ¡n hÃ ng, Ä‘á»•i nhÃ  cung cáº¥p, Ã¡p dá»¥ng Credit, thao tÃ¡c thá»§ cÃ´ng.
- LÆ°u trá»¯ trÆ°á»ng `before` vÃ  `after` (Diff) Ä‘á»ƒ biáº¿t chÃ­nh xÃ¡c trÆ°á»ng dá»¯ liá»‡u nÃ o bá»‹ thay Ä‘á»•i.
- DÃ¹ng cho tÃ­nh nÄƒng "Lá»‹ch sá»­ há»‡ thá»‘ng".

## 2. Financial Audit Logs (`payment_receipt_financial_audit_log`)
- Truy váº¿t dÃ²ng cháº£y cá»§a 1 biÃªn nháº­n ngÃ¢n hÃ ng:
  - Khi nÃ o biÃªn nháº­n Ä‘Æ°á»£c táº¡o?
  - DÃ¹ng cho ÄÆ¡n hÃ ng gá»‘c nÃ o?
  - Rule nÃ o Ä‘Æ°á»£c Ã¡p dá»¥ng (VD: Tiá»n dÆ° Ä‘Æ°a vÃ o Off-flow, Tiá»n khá»›p 100%...).
  - Audit giÃºp phÃ¡t hiá»‡n lá»—i lá»‡ch doanh thu / lá»£i nhuáº­n trong tÆ°Æ¡ng lai.

## 3. Shop Bank Ledger (`shop_bank_ledgers`)
- Sá»• cÃ¡i káº¿ toÃ¡n cá»§a ngÃ¢n hÃ ng.
- LÆ°u láº¡i toÃ n bá»™ cÃ¡c record tiá»n vÃ o/ra theo Ä‘Ãºng chuáº©n sá»• cÃ¡i (kÃ©p) kÃ¨m mÃ£ tham chiáº¿u (`receipt_id`).
- CÃ¡c trÆ°á»ng há»£p hoÃ n tiá»n cho khÃ¡ch (Refund), hoáº·c rÃºt tiá»n (Withdrawal) sáº½ Ä‘Æ°á»£c record báº±ng sá»‘ Ã¢m.

## CÆ¡ cháº¿ Ä‘áº£m báº£o tÃ­nh toÃ n váº¹n
- Táº¥t cáº£ API mutate dá»¯ liá»‡u tÃ i chÃ­nh (Thanh toÃ¡n, Sá»­a giÃ¡, HoÃ n tiá»n) Ä‘á»u bá»c trong SQL Transaction (`BEGIN ... COMMIT`).
- Cháº·n ghi Ä‘Ã¨: Sá»­ dá»¥ng Idempotency Keys káº¿t há»£p Postgres Lock (Advisory Locks) trong Webhook Sepay Ä‘á»ƒ trÃ¡nh double-spending.


## --- [credit-khach-hang-va-don-moi.md] ---

# Credit khÃ¡ch hÃ ng, Ä‘Æ¡n má»›i, QR â€” hÆ°á»›ng dáº«n nghiá»‡p vá»¥ & theo dÃµi

TÃ i liá»‡u nÃ y tÃ³m táº¯t cÃ¡ch há»‡ thá»‘ng xá»­ lÃ½ **refund credit** (phiáº¿u credit), tráº¡ng thÃ¡i Ä‘Æ¡n, **VietQR**, vÃ  cÃ¡ch **dÃ¹ng láº¡i sá»‘ dÆ°** credit sau khi táº¡o Ä‘Æ¡n. Pháº§n theo dÃµi gá»£i Ã½ mÃ n hÃ¬nh/flow Ä‘á»ƒ báº¡n bá»• sung dáº§n trÃªn admin.

## 1. Tráº¡ng thÃ¡i Ä‘Æ¡n + QR (luá»“ng thá»±c táº¿)

| TÃ¬nh huá»‘ng | Tráº¡ng thÃ¡i sau khi táº¡o / sau thanh toÃ¡n | Sá»‘ tiá»n trÃªn VietQR (khi cÃ²n cho phÃ©p quÃ©t) |
|------------|----------------------------------------|---------------------------------------------|
| CÃ³ trá»« credit, **cÃ²n pháº£i thu** > 5.000 VND (sau trá»« credit) | ChÆ°a Thanh ToÃ¡n | **Sá»‘ cÃ²n pháº£i thu** = giÃ¡ bÃ¡n gross âˆ’ sá»‘ credit Ã¡p dá»¥ng (khá»›p vá»›i trÆ°á»ng `price` trÃªn Ä‘Æ¡n). |
| CÃ³ trá»« credit, **cÃ²n pháº£i thu** tá»« 0 Ä‘áº¿n 5.000 VND (sai sá»‘) | **ÄÃ£ Thanh ToÃ¡n** ngay khi táº¡o (coi nhÆ° Ä‘á»§, khÃ´ng cáº§n bÆ°á»›c thu thÃªm) | KhÃ´ng cÃ²n QR thu há»™ (Ä‘Æ¡n Ä‘Ã£ á»Ÿ tráº¡ng thÃ¡i Ä‘Ã£ thanh toÃ¡n; QR khÃ³a theo chÃ­nh sÃ¡ch mÃ n hÃ¬nh). |
| Credit **Ä‘á»§ hoáº·c dÆ° hÆ¡n** so vá»›i giÃ¡ Ä‘Æ¡n má»›i (pháº§n Ã¡p tá»‘i Ä‘a = háº¿t pháº§n â€œgiÃ¡ pháº£i tráº£â€ cá»§a Ä‘Æ¡n) | TÃ¹y sá»‘ cÃ²n láº¡i: náº¿u â‰¤ 5.000 thÃ¬ coi **ÄÃ£ Thanh ToÃ¡n**; náº¿u > 5.000 thÃ¬ **ChÆ°a Thanh ToÃ¡n** | Khi chÆ°a thanh toÃ¡n: váº«n theo cá»™t cÃ²n thu. |
| ÄÃ£ chuyá»ƒn **ÄÃ£ Thanh ToÃ¡n** (Sephay/duyá»‡t) | â€” | MÃ n hÃ¬nh **khÃ´ng** dÃ¹ng QR Ä‘á»ƒ thu ná»¯a; hiá»ƒn thá»‹ giÃ¡ tham chiáº¿u cÃ³ thá»ƒ dÃ¹ng `gross_selling_price` + dÃ²ng credit Ä‘Ã£ Ã¡p, khÃ´ng cÃ²n â€œmÃ£ theo sá»‘ táº¡m á»©ngâ€. |

**Sai sá»‘ 5.000 VND** Ã¡p dá»¥ng cho *pháº§n cÃ²n láº¡i cáº§n thu* sau khi trá»« credit: náº¿u sá»‘ dÆ° nÃ y náº±m trong [0, 5.000] thÃ¬ bá» qua bÆ°á»›c thu, Ä‘Æ°a tháº³ng vá» **ÄÃ£ Thanh ToÃ¡n**.

**Credit > giÃ¡ Ä‘Æ¡n má»›i (vÃ­ dá»¥ phiáº¿u 368.000, Ä‘Æ¡n 150.000):**  
Há»‡ thá»‘ng ghi bÃºt `refund_credit_applications` (150.000) **trá» tá»›i id phiáº¿u cÅ©** (audit), sau Ä‘Ã³ **Ä‘Ã³ng** phiáº¿u 368.000: `status = VOID`, `available = 0`, gáº¯n `succeeded_by_note_id` â†’ **táº¡o phiáº¿u má»›i** (218.000, `split_from_note_id` = id phiáº¿u cÅ©). Láº§n sau chá»n **id / mÃ£ phiáº¿u má»›i** (sá»‘ cÃ²n thá»±c) â€” phiáº¿u cÅ© **khÃ´ng** cÃ²n xuáº¥t hiá»‡n khi tÃ¬m phiáº¿u má»Ÿ.

**DÃ¹ng háº¿t má»™t láº§n (khÃ´ng cÃ²n sá»‘ dÆ°):** Má»™t bÃºt dÃ¹ng, trigger gÃ¡n **FULLY_APPLIED**; **khÃ´ng** táº¡o phiáº¿u dÆ°, khÃ´ng tÃ¡ch dÃ²ng.

## 2. DÃ¹ng láº¡i sá»‘ credit cÃ²n dÆ° thÃªm má»™t láº§n ná»¯a

1. Má»—i láº§n Ã¡p dá»¥ng credit, ghi dÃ²ng trong **`receipt.refund_credit_applications`** (Ä‘Ã­ch, sá»‘ tiá»n, thá»i Ä‘iá»ƒm; `credit_note_id` = **phiáº¿u táº¡i thá»i Ä‘iá»ƒm trá»«** â€” thÆ°á»ng id phiáº¿u cÅ© trÆ°á»›c khi tÃ¡ch).  
2. Náº¿u cÃ²n sá»‘ dÆ° sau láº§n trá»«: xem **má»¥c tÃ¡ch dÃ²ng á»Ÿ trÃªn**; sá»‘ cÃ²n náº±m á»Ÿ **phiáº¿u má»›i** (OPEN).  
3. **Äá»ƒ dÃ¹ng láº¡i:** chá»n `refund_credit_note_id` = **phiáº¿u cÃ²n má»Ÿ** má»›i (API táº¡o Ä‘Æ¡n tráº£ vá» `refund_credit_replacement_note_id` / `refund_credit_note_id` khi cÃ³ tÃ¡ch). `getLatestRefundCreditNoteBySourceOrder` bá» qua VOID nÃªn váº«n tráº£ vá» **phiáº¿u má»›i** cÃ¹ng `source_order_list_id`.  
4. TrÃªn list Ä‘Æ¡n, cá»™t tÃ¹y chá»n: `refund_credit_effective_*` = phiáº¿u theo dÃµi sá»‘ cÃ²n (sau cÆ¡ cháº¿ `succeeded_by_note_id` / tá»± báº£n thÃ¢n náº¿u khÃ´ng tÃ¡ch).  
5. Háº¿t sáº¡ch: phiáº¿u hiá»‡n táº¡i vá» **FULLY_APPLIED** â€” khÃ´ng chá»n thÃªm.

**Ghi chÃº sáº£n pháº©m (UX):** NÃªn cho phÃ©p tÃ¬m phiáº¿u theo **SÄT / tÃªn** kÃ¨m sá»‘ cÃ²n láº¡i, Ä‘á»ƒ tháº¥y nhanh â€œcÃ²n bao nhiÃªu dÃ¹ng tiáº¿pâ€.

## 3. NÃªn ghi chÃº theo dÃµi á»Ÿ trang mÃ n hÃ¬nh nÃ o?

Gá»£i Ã½ Ã¡nh xáº¡ mÃ n hÃ¬nh (admin `admin_orderlist`):

| Ná»™i dung theo dÃµi | NÆ¡i há»£p lÃ½ | Ghi chÃº ká»¹ thuáº­t |
|-------------------|------------|-----------------|
| Tá»«ng dÃ²ng trá»« credit theo **Ä‘Æ¡n má»›i** | Báº£ng Ä‘Æ¡n + (tÆ°Æ¡ng lai) panel â€œCredit Ä‘Ã£ dÃ¹ngâ€ tá»« `refund_credit_applications` | Má»—i dÃ²ng: `target_order_code`, `applied_amount`, `applied_at`, `credit_note_id`. |
| Sá»‘ cÃ²n láº¡i theo **phiáº¿u** | CÃ¹ng trang nguá»“n hoÃ n (_Ä‘Æ¡n cÅ©_) hoáº·c mÃ n â€œPhiáº¿u creditâ€ táº­p trung | Äá»c tá»« `receipt.refund_credit_notes` (`available_amount`, `status`). |
| Cá»™t **â€œGiÃ¡ trÆ°á»›c creditâ€** trÃªn list Ä‘Æ¡n | `docs` / list orders query | Khi táº¡o Ä‘Æ¡n cÃ³ credit, lÆ°u thÃªm `orders.order_list.gross_selling_price`; cÃ´ng thá»©c hiá»ƒn thá»‹: `COALESCE(gross_selling_price, price + applied) AS price_before_credit`. |

Báº¡n cÃ³ thá»ƒ **Ä‘Ã¡nh dáº¥u ná»™i bá»™** trÃªn tÃ i liá»‡u dá»± Ã¡n: â€œSingle source: `refund_credit_notes` + `refund_credit_applications` + cá»™t `gross_selling_price` trÃªn `order_list` khi Ã¡p credit.â€

## 4. HÆ°á»›ng thiáº¿t káº¿: trang â€œSá»• credit khÃ¡châ€ vs chá»n credit khi táº¡o Ä‘Æ¡n

**A. Tá»‘i thiá»ƒu (Ä‘ang cÃ³):** trÃªn form **Táº¡o Ä‘Æ¡n má»›i (Order Builder)** â€” má»¥c chá»n `refund_credit_note_id` + sá»‘ trá»« tá»‘i Ä‘a (Ä‘Ã£ bá»‹ cáº¯t theo `min(yc, giÃ¡ gross, available)` á»Ÿ backend). Äá»§ cho váº­n hÃ nh.  

**B. Tá»‘i Æ°u theo dÃµi:** thÃªm trang (hoáº·c tab) **â€œCredit theo SÄT / theo mÃ£ Ä‘Æ¡n nguá»“nâ€**:
- Báº£ng phiáº¿u: mÃ£, Ä‘Æ¡n nguá»“n, ban Ä‘áº§u, Ä‘Ã£ dÃ¹ng, cÃ²n láº¡i, tráº¡ng thÃ¡i.  
- Expand: danh sÃ¡ch `applications` (cÃ¡c Ä‘Æ¡n Ä‘Ã£ trá»«).  
- CÃ³ bá»™ lá»c **OPEN / PARTIALLY / FULLY**.  

**C. Táº¡o Ä‘Æ¡n nÃ¢ng cao:** Autocomplete: gÃµ mÃ£ cÅ© hoáº·c SÄT â†’ tráº£ vá» **má»i** phiáº¿u cÃ²n háº¡n sá»­ dá»¥ng; máº·c Ä‘á»‹nh sá»‘ trá»« = `min(available, giÃ¡ Ä‘ang nháº­p)`.

Báº¡n chá»n (B) náº¿u pháº£i Ä‘á»‘i soÃ¡t nhiá»u; chá»n (A) náº¿u sá»‘ lÆ°á»£ng phiáº¿u/Ä‘Æ¡n Ã­t.

## 5. Tham sá»‘ cáº¥u hÃ¬nh trong code (backend)

- NgÆ°á»¡ng: **`CREDIT_BALANCE_TOLERANCE_VND = 5000`** (trong `createOrder` â€” Ä‘Æ¡n táº¡o xong, náº¿u cÃ²n thu â‰¤ 5.000 thÃ¬ gÃ¡n **ÄÃ£ Thanh ToÃ¡n** vÃ  `price = 0`).  
- Cá»™t: **`gross_selling_price`** trÃªn `orders.order_list` (migration 084) â€” báº¯t buá»™c khi cáº§n hiá»ƒn thá»‹ **giÃ¡ niÃªm yáº¿t** Ä‘Ãºng sau khi `price` Ä‘Ã£ bá»‹ háº¡ cÃ²n 0.  

Khi cáº­p nháº­t DB, cháº¡y migration má»›i tÆ°Æ¡ng á»©ng trong `database/migrations/`.

- Migration **085**: cá»™t `split_from_note_id`, `succeeded_by_note_id` trÃªn `receipt.refund_credit_notes` vÃ  cáº­p nháº­t `fn_recompute_refund_credit_note_balance` (bá» qua dÃ²ng `VOID`).

---
*TÃ i liá»‡u nÃ y bÃ¡m theo mÃ´ táº£ nghiá»‡p vá»¥; Ä‘iá»u chá»‰nh sá»‘ 5.000 hoáº·c quy táº¯c tÃ¡ch phiáº¿u cáº§n thá»‘ng nháº¥t vá»›i káº¿ toÃ¡n ná»™i bá»™ trÆ°á»›c khi sá»­a code.*


## --- [dashboard-financial-write-paths.md] ---

# Inventory Luá»“ng WRITE TÃ i ChÃ­nh Dashboard

TÃ i liá»‡u nÃ y liá»‡t kÃª cÃ¡c Ä‘iá»ƒm WRITE Ä‘ang cá»™ng/trá»« sá»‘ tÃ i chÃ­nh trong há»‡ thá»‘ng dashboard.
Má»¥c tiÃªu: nhÃ¬n má»™t chá»— lÃ  biáº¿t luá»“ng nÃ o Ä‘ang tÃ¡c Ä‘á»™ng doanh thu/lá»£i nhuáº­n/refund/off-flow.

---

## 1) CÃ¡c luá»“ng WRITE chÃ­nh

### `backend/webhook/sepay/routes/webhook.js`
- Luá»“ng webhook Sepay cá»™ng/trá»« `total_revenue`, `total_profit`, `total_off_flow_bank_receipt` qua `incrementDashboardSummaryByDelta`.
- ÄÃ¢y lÃ  luá»“ng realtime chÃ­nh cho thanh toÃ¡n qua webhook.

### `backend/src/controllers/Order/manualWebhookCompletion.js`
- NÃºt/manual complete webhook cá»™ng doanh thu/lá»£i nhuáº­n vÃ o monthly summary.
- CÃ³ ghi audit cho financial state cá»§a receipt.

### `backend/src/controllers/PaymentsController/index.js`
- Luá»“ng reconcile receipt dÃ¹ng `applyDashboardDelta` Ä‘á»ƒ cá»™ng/trá»« láº¡i revenue/profit/off-flow.
- Khi chá»n mark paid cÃ²n gá»i thÃªm:
  - `updateDashboardMonthlySummaryOnStatusChange`
  - `syncMavnStoreProfitExpense`

### `backend/src/controllers/Order/finance/dashboardSummary.js`
- HÃ m `updateDashboardMonthlySummaryOnStatusChange` (Ä‘Æ°á»£c gá»i tá»« update/há»§y Ä‘Æ¡n) cá»™ng/trá»«:
  - `total_revenue`
  - `total_refund`
  - `total_profit` (thÃ´ng qua nhÃ¡nh phá»¥)

### `backend/src/controllers/Order/finance/pendingRefundDashboardProfitFallback.js`
- Äiá»u chá»‰nh `total_profit` khi vÃ o luá»“ng hoÃ n theo cÃ´ng thá»©c refund/NCC.

### `backend/src/controllers/StoreProfitExpensesController/index.js`
- `external_import` thÃªm/xÃ³a sáº½ trá»«/cá»™ng `total_profit` qua `applyExternalImportProfitDelta`.

### `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js`
### `backend/src/controllers/Order/finance/mavnRenewalPaidSync.js`
### `backend/src/controllers/Order/finance/mavnCompleteProcessingPaidWithoutWebhook.js`
- CÃ¡c luá»“ng MAVN cÃ³ Ä‘iá»u chá»‰nh `total_profit`.

### `backend/src/controllers/Order/finance/reversePostedReceiptFinancialDashboard.js`
- CÃ³ luá»“ng reverse Ä‘Ã£ post: trá»« ngÆ°á»£c revenue/profit/orders/import/off-flow theo receipt state.

---

## 2) Luá»“ng batch/rebuild (khÃ´ng pháº£i realtime write theo giao dá»‹ch Ä‘Æ¡n láº»)

### `backend/scripts/ops/rebuild-dashboard-monthly-summary.js`
- XÃ³a vÃ  rebuild toÃ n bá»™ `dashboard_monthly_summary`.

### `backend/src/services/dashboard/dailyRevenueSummaryBackfill.js`
- Recompute/UPSERT `daily_revenue_summary`:
  - `earned_revenue`
  - `revenue_reversed`
  - `allocated_profit_tax`
  - cÃ¡c chá»‰ sá»‘ daily khÃ¡c

---

## 3) Äiá»ƒm cáº§n lÆ°u Ã½ mÃ´i trÆ°á»ng/migration

### Legacy trigger theo `payment_receipt`
- Migration táº¡o trigger cÅ©:
  - `backend/migrations/20260601120000_trigger_dashboard_revenue_on_payment_receipt.js`
- Migration drop trigger cÅ©:
  - `backend/migrations/20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`

Náº¿u mÃ´i trÆ°á»ng nÃ o chÆ°a drop trigger legacy, cÃ³ thá»ƒ phÃ¡t sinh cá»™ng revenue ngoÃ i flow á»©ng dá»¥ng hiá»‡n táº¡i.

---

## 4) Káº¿t luáº­n ngáº¯n

- Cá»™ng doanh thu bÃ¡n hÃ ng: chá»§ yáº¿u tá»« webhook (vÃ  má»™t sá»‘ luá»“ng manual/reconcile).
- Trá»« doanh thu theo hoÃ n/há»§y (Model A): Ä‘i tá»« luá»“ng Ä‘á»•i tráº¡ng thÃ¡i Ä‘Æ¡n trong `dashboardSummary`.
- `total_refund` lÃ  chá»‰ sá»‘ tracking riÃªng; daily refund tracking náº±m á»Ÿ `daily_revenue_summary.revenue_reversed`.

---

## 5) Luá»“ng nÃªn Ä‘Æ°á»£c giá»¯ láº¡i

### NhÃ³m báº¯t buá»™c giá»¯ (core production flow)
- `backend/webhook/sepay/routes/webhook.js`
  - Luá»“ng ghi nháº­n doanh thu/lá»£i nhuáº­n chÃ­nh khi nháº­n tiá»n thá»±c táº¿.
  - Ãp rule thiáº¿u tiá»n khÃ´ng cá»™ng doanh thu, Ä‘á»§ tiá»n má»›i cá»™ng, thá»«a tiá»n tÃ¡ch off-flow.
- `backend/src/controllers/Order/finance/dashboardSummary.js`
  - Luá»“ng Ä‘á»•i tráº¡ng thÃ¡i Ä‘Æ¡n áº£nh hÆ°á»Ÿng monthly summary theo Model A.
  - Há»§y/hoÃ n: trá»« trá»±c tiáº¿p `total_revenue`, cá»™ng `total_refund`.
- `backend/src/controllers/Order/finance/pendingRefundDashboardProfitFallback.js`
  - Giá»¯ Ä‘á»ƒ báº£o Ä‘áº£m cÃ´ng thá»©c lá»£i nhuáº­n hoÃ n theo `refund_amount - ncc_refund_amount`.
- `backend/src/controllers/Order/finance/dailyRevenueSummaryAdjustments.js`
  - Giá»¯ Ä‘á»ƒ cá»™ng dá»“n `daily_revenue_summary.revenue_reversed` theo ngÃ y.
- `backend/src/controllers/Order/finance/refundCredits.js`
  - Giá»¯ vÃ¬ Ä‘Ã¢y lÃ  ledger credit khÃ¡ch hÃ ng (kháº£ dá»¥ng/khÃ´ng kháº£ dá»¥ng, apply/cashout).

### NhÃ³m giá»¯ nhÆ°ng giá»›i háº¡n quyá»n dÃ¹ng (operational flow)
- `backend/src/controllers/PaymentsController/index.js` (reconcile)
  - Chá»‰ dÃ¹ng khi sá»­a lá»‡ch dá»¯ liá»‡u receipt/order.
  - KhÃ´ng dÃ¹ng nhÆ° luá»“ng ghi nháº­n doanh thu thÆ°á»ng ngÃ y.
- `backend/src/controllers/Order/manualWebhookCompletion.js`
  - Chá»‰ dÃ¹ng khi cáº§n fallback thá»§ cÃ´ng cÃ³ kiá»ƒm soÃ¡t.
  - NÃªn yÃªu cáº§u audit log Ä‘áº§y Ä‘á»§ cho má»i thao tÃ¡c.

### NhÃ³m giá»¯ cho nghiá»‡p vá»¥ Ä‘áº·c thÃ¹
- `backend/src/controllers/StoreProfitExpensesController/index.js`
  - Giá»¯ Ä‘á»ƒ xá»­ lÃ½ `external_import` áº£nh hÆ°á»Ÿng `total_profit`.
- `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js`
- `backend/src/controllers/Order/finance/mavnRenewalPaidSync.js`
- `backend/src/controllers/Order/finance/mavnCompleteProcessingPaidWithoutWebhook.js`
  - Giá»¯ cho nhÃ¡nh MAVN Ä‘áº·c thÃ¹ (Ä‘iá»u chá»‰nh lá»£i nhuáº­n theo cost nháº­p MAVN).

### NhÃ³m giá»¯ cho báº£o trÃ¬/Ä‘á»‘i soÃ¡t
- `backend/scripts/ops/rebuild-dashboard-monthly-summary.js`
- `backend/src/services/dashboard/dailyRevenueSummaryBackfill.js`
  - Chá»‰ cháº¡y khi backfill/rebuild hoáº·c xá»­ lÃ½ lá»‡ch sá»‘.

---

## 6) Luá»“ng khÃ´ng nÃªn active trong runtime chuáº©n

- Legacy trigger cá»™ng revenue tá»« `payment_receipt`:
  - `backend/migrations/20260601120000_trigger_dashboard_revenue_on_payment_receipt.js`
- Runtime chuáº©n pháº£i á»Ÿ tráº¡ng thÃ¡i Ä‘Ã£ drop trigger theo:
  - `backend/migrations/20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`


## --- [dashboard-page-financial-flow.md] ---

# Chuáº©n luá»“ng tÃ i chÃ­nh 1 cá»­a hÃ ng (Cash-Basis)

TÃ i liá»‡u nÃ y lÃ  **nguá»“n chuáº©n duy nháº¥t** Ä‘á»ƒ hiá»ƒu vÃ  váº­n hÃ nh sá»‘ liá»‡u Dashboard cho má»™t cá»­a hÃ ng.
Má»¥c tiÃªu lÃ  thá»‘ng nháº¥t tuyá»‡t Ä‘á»‘i cÃ¡ch ghi nháº­n:

- Doanh thu
- Tiá»n nháº­p hÃ ng (giÃ¡ vá»‘n nháº­p NCC)
- Lá»£i nhuáº­n
- Refund (hoÃ n tiá»n)
- Tiá»n ngoÃ i luá»“ng

---

## 1) Tá»« Ä‘iá»ƒn Ä‘á»‹nh nghÄ©a chuáº©n

### 1.1. Doanh thu ghi nháº­n (`recognized_revenue`)

Tá»•ng tiá»n ghi nháº­n doanh thu tá»« Ä‘Æ¡n hÃ ng há»£p lá»‡ theo nguyÃªn táº¯c cash-basis, vá»›i Ä‘iá»u kiá»‡n **Ä‘Æ¡n Ä‘Ã£ thu Ä‘á»§ ngÆ°á»¡ng Ä‘Æ°á»£c cÃ´ng nháº­n**.

- Chá»‰ ghi nháº­n khi Ä‘Ã£ nháº­n tiá»n thá»±c táº¿ vÃ  Ä‘áº¡t Ä‘iá»u kiá»‡n "Ä‘á»§ tiá»n" cá»§a Ä‘Æ¡n.
- KhÃ´ng ghi nháº­n theo thá»i Ä‘iá»ƒm táº¡o Ä‘Æ¡n.
- KhÃ´ng bao gá»“m tiá»n ngoÃ i luá»“ng.
- Náº¿u thu **thiáº¿u tiá»n**: chÆ°a cá»™ng doanh thu, ghi tráº¡ng thÃ¡i chá» thu Ä‘á»§.
- Náº¿u thu **Ä‘á»§ tiá»n**: cá»™ng doanh thu theo pháº§n thuá»™c giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng.
- Náº¿u thu **thá»«a tiá»n**: chá»‰ cá»™ng doanh thu Ä‘Ãºng pháº§n cá»§a Ä‘Æ¡n; pháº§n thá»«a ghi vÃ o tiá»n ngoÃ i luá»“ng.
- Náº¿u nháº­n tiá»n **khÃ´ng trong luá»“ng Ä‘Æ¡n hÃ ng** (khÃ´ng match Ä‘Æ¡n): khÃ´ng cá»™ng doanh thu, ghi toÃ n bá»™ vÃ o tiá»n ngoÃ i luá»“ng.

### 1.2. Tiá»n nháº­p hÃ ng (`total_import`)

Tá»•ng chi phÃ­ nháº­p hÃ ng tá»« nhÃ  cung cáº¥p (NCC), phá»¥c vá»¥ cáº¥u pháº§n giÃ¡ vá»‘n vÃ  cÃ´ng ná»£ NCC.

- Báº£n cháº¥t lÃ  chi phÃ­ nháº­p kho/nháº­p hÃ ng, khÃ´ng Ä‘á»“ng nháº¥t vá»›i dÃ²ng tiá»n khÃ¡ch tráº£.
- `total_import` Ä‘Æ°á»£c ghi nháº­n theo cÃ¹ng nhÃ¡nh nghiá»‡p vá»¥ vá»›i doanh thu.
- Khi doanh thu Ä‘Æ°á»£c cá»™ng thÃ nh cÃ´ng, há»‡ thá»‘ng Ä‘á»“ng thá»i:
  - táº¡o log cost NCC,
  - chuyá»ƒn Ä‘Æ¡n sang tráº¡ng thÃ¡i `ÄÃ£ Thanh ToÃ¡n`.
- Ba bÆ°á»›c (cá»™ng doanh thu, táº¡o log cost NCC, chuyá»ƒn tráº¡ng thÃ¡i Ä‘Æ¡n) lÃ  má»™t nhÃ¡nh nghiá»‡p vá»¥ thá»‘ng nháº¥t, cáº§n Ä‘áº£m báº£o nháº¥t quÃ¡n vÃ  idempotent.
- Náº¿u Ä‘Æ¡n chÆ°a Ä‘á»§ Ä‘iá»u kiá»‡n cá»™ng doanh thu thÃ¬ chÆ°a táº¡o log cost NCC vÃ  chÆ°a ghi nháº­n `total_import`.

### 1.3. Refund (`total_refund`)

Trong nhÃ¡nh há»§y Ä‘Æ¡n, refund Ä‘Æ°á»£c ghi nháº­n ngay táº¡i thá»i Ä‘iá»ƒm thao tÃ¡c há»§y, bucket vÃ o thÃ¡ng hiá»‡n táº¡i.

- Khi báº¥m há»§y Ä‘Æ¡n, há»‡ thá»‘ng xá»­ lÃ½ theo má»™t nhÃ¡nh nghiá»‡p vá»¥:
  - trá»« trá»±c tiáº¿p `total_revenue`,
  - trá»« trá»±c tiáº¿p `total_profit`,
  - cá»™ng `total_refund`.
- Tiá»n cáº§n hoÃ n cho khÃ¡ch Ä‘Æ°á»£c note vÃ o `daily_revenue_summary.revenue_reversed`:
  - chá»‰ ghi sá»‘ tiá»n cáº§n hoÃ n (`refund_amount`),
  - náº¿u trong ngÃ y cÃ³ nhiá»u Ä‘Æ¡n hoÃ n thÃ¬ cá»™ng dá»“n vÃ o cÃ¹ng ngÃ y (`summary_date`).
- Äá»“ng thá»i táº¡o:
  - log NCC cáº§n hoÃ n (Ä‘á»‘i soÃ¡t cÃ´ng ná»£ NCC),
  - log credit kháº£ dá»¥ng cho khÃ¡ch hÃ ng (phá»¥c vá»¥ Ä‘Æ¡n sau hoáº·c hoÃ n láº¡i tiá»n máº·t tá»« credit).
- Tráº¡ng thÃ¡i Ä‘Æ¡n chuyá»ƒn vá» `ChÆ°a hoÃ n` Ä‘á»ƒ theo dÃµi xá»­ lÃ½ hoÃ n thá»±c táº¿.
- Trong mÃ´ hÃ¬nh nÃ y:
  - Daily chá»‰ pháº£n Ã¡nh doanh thu/lá»£i nhuáº­n theo ngÃ y, khÃ´ng trá»« refund á»Ÿ táº§ng hiá»ƒn thá»‹ daily.
  - Monthly hiá»ƒn thá»‹ doanh thu rÃ²ng theo `total_revenue`; `total_refund` lÃ  chá»‰ sá»‘ theo dÃµi riÃªng.

### 1.4. Lá»£i nhuáº­n chuáº©n (`standard_profit`)

Lá»£i nhuáº­n chuáº©n Ä‘Æ°á»£c map vÃ o `dashboard_monthly_summary.total_profit` vÃ  ghi nháº­n theo delta nghiá»‡p vá»¥.

- Khi bÃ¡n hÃ ng Ä‘á»§ Ä‘iá»u kiá»‡n ghi nháº­n doanh thu:
  - `profit_delta_sale = sale_price - cost`
- Khi phÃ¡t sinh hoÃ n tiá»n:
  - `profit_delta_refund = -(refund_amount - ncc_refund_amount)`
- Lá»£i nhuáº­n thÃ¡ng:
  - `total_profit_month = SUM(profit_delta_sale) + SUM(profit_delta_refund)`
- KhÃ´ng bao gá»“m tiá»n ngoÃ i luá»“ng.

### 1.5. Tiá»n ngoÃ i luá»“ng (`off_flow_amount`)

Khoáº£n tiá»n khÃ´ng thuá»™c Ä‘Æ¡n hÃ ng vÃ  khÃ´ng pháº£i tiá»n cá»§a shop.

- KhÃ´ng pháº£i chi phÃ­ cá»§a shop.
- KhÃ´ng Ä‘Æ°á»£c tÃ­nh vÃ o doanh thu.
- KhÃ´ng Ä‘Æ°á»£c tÃ­nh vÃ o lá»£i nhuáº­n.
- Chá»‰ dÃ¹ng Ä‘á»ƒ theo dÃµi kiá»ƒm soÃ¡t/rá»§i ro vÃ  phá»¥c vá»¥ Ä‘á»‘i soÃ¡t.

---

## 2) Luá»“ng ghi nháº­n má»™t chiá»u theo thá»i gian

Luá»“ng duy nháº¥t Ã¡p dá»¥ng cho má»™t Ä‘Æ¡n hÃ ng tÃ i chÃ­nh:

1. **Thu tiá»n thá»±c táº¿**
   - Khi há»‡ thá»‘ng xÃ¡c nháº­n Ä‘Ã£ nháº­n tiá»n thá»±c táº¿ cá»§a Ä‘Æ¡n há»£p lá»‡, ghi nháº­n doanh thu cash-basis.
2. **Cáº­p nháº­t doanh thu ngÃ y/thÃ¡ng**
   - Cá»™ng vÃ o summary ngÃ y vÃ  thÃ¡ng theo má»‘c thu tiá»n.
3. **PhÃ¡t sinh refund (náº¿u cÃ³)**
   - Ghi sá»‘ tiá»n cáº§n hoÃ n vÃ o `daily_revenue_summary.revenue_reversed` (cá»™ng dá»“n theo ngÃ y).
   - Note ngÃ y hoÃ n Ä‘á»ƒ háº¡ch toÃ¡n dÃ²ng tiá»n Ä‘Ãºng ká»³.
4. **XÃ¡c Ä‘á»‹nh pháº§n NCC cáº§n hoÃ n/Ä‘á»‘i trá»«**
   - Táº¡o log NCC riÃªng Ä‘á»ƒ theo dÃµi trÃ¡ch nhiá»‡m hoÃ n hoáº·c bÃ¹ trá»« vá»›i NCC.
5. **Tá»•ng há»£p lÃªn dashboard**
   - `daily_revenue_summary` pháº£n Ã¡nh sá»‘ theo ngÃ y.
   - `dashboard_monthly_summary` tá»•ng há»£p theo thÃ¡ng tá»« quy táº¯c Ä‘Ã£ chuáº©n hÃ³a.
6. **Theo dÃµi tiá»n ngoÃ i luá»“ng**
   - Ghi nháº­n á»Ÿ luá»“ng kiá»ƒm soÃ¡t riÃªng, khÃ´ng Ä‘i vÃ o cÃ´ng thá»©c doanh thu/lá»£i nhuáº­n chuáº©n.

---

## 3) Bá»™ cÃ´ng thá»©c chuáº©n (cá»‘ Ä‘á»‹nh)

## 3.1. CÃ´ng thá»©c ngÃ y (daily)

- `daily_gross_inflow = tong_tien_thu_thuc_te_tu_don_hang_hop_le`
- `daily_revenue_view = daily_revenue_summary.earned_revenue`
- `daily_profit_view = daily_revenue_summary.allocated_profit_tax` (náº¿u cÃ³ snapshot phÃ¢n bá»• lá»£i nhuáº­n)
- `daily_refund_tracking = daily_revenue_summary.revenue_reversed` (chá»‰ theo dÃµi/audit, khÃ´ng trá»« vÃ o KPI daily)

## 3.2. CÃ´ng thá»©c thÃ¡ng (monthly)

- `monthly_total_revenue = dashboard_monthly_summary.total_revenue` (Ä‘Ã£ pháº£n Ã¡nh delta giáº£m do há»§y/hoÃ n theo Model A)
- `monthly_refund_tracking = dashboard_monthly_summary.total_refund` (chá»‰ theo dÃµi)
- `monthly_net_revenue_view = monthly_total_revenue`

## 3.3. Lá»£i nhuáº­n chuáº©n

- `profit_delta_sale = sale_price - cost`
- `profit_delta_refund = -(refund_amount - ncc_refund_amount)`
- `standard_profit_month = SUM(profit_delta_sale) + SUM(profit_delta_refund)`

Trong Ä‘Ã³:
- `sale_price` lÃ  giÃ¡ bÃ¡n ghi nháº­n doanh thu cá»§a Ä‘Æ¡n.
- `cost` lÃ  giÃ¡ vá»‘n/NCC cost cá»§a Ä‘Æ¡n.
- `refund_amount` lÃ  sá»‘ tiá»n hoÃ n cho khÃ¡ch.
- `ncc_refund_amount` lÃ  pháº§n NCC hoÃ n/Ä‘á»‘i trá»« láº¡i cho shop tÆ°Æ¡ng á»©ng khoáº£n refund.

## 3.4. Quy táº¯c loáº¡i trá»« báº¯t buá»™c

- `off_flow_amount` **khÃ´ng** cá»™ng vÃ o `daily_gross_inflow`, `monthly_total_revenue`, `standard_profit_month`.
- KhÃ´ng dÃ¹ng tiá»n ngoÃ i luá»“ng Ä‘á»ƒ bÃ¹ doanh thu thiáº¿u hoáº·c â€œlÃ m Ä‘áº¹pâ€ lá»£i nhuáº­n.

---

## 4) Mapping báº£ng dá»¯ liá»‡u vÃ  kiá»ƒm soÃ¡t Ä‘á»‘i soÃ¡t

## 4.1. `daily_revenue_summary`

Vai trÃ²:
- Nguá»“n tá»•ng há»£p tÃ i chÃ­nh theo ngÃ y.
- Báº¯t buá»™c pháº£n Ã¡nh Ä‘Æ°á»£c refund theo ngÃ y hoÃ n.

YÃªu cáº§u kiá»ƒm soÃ¡t:
- Refund theo ngÃ y ghi táº¡i `revenue_reversed` (chá»‰ sá»‘ theo dÃµi).
- KPI daily hiá»ƒn thá»‹ theo doanh thu/lá»£i nhuáº­n ngÃ y, khÃ´ng trá»« refund á»Ÿ táº§ng hiá»ƒn thá»‹ daily.
- Má»—i thay Ä‘á»•i refund pháº£i truy váº¿t Ä‘Æ°á»£c nguá»“n vÃ  thá»i Ä‘iá»ƒm.

## 4.2. `dashboard_monthly_summary`

Vai trÃ²:
- Tá»•ng há»£p theo thÃ¡ng phá»¥c vá»¥ KPI dashboard.

YÃªu cáº§u kiá»ƒm soÃ¡t:
- Äá»“ng nháº¥t quy táº¯c loáº¡i trá»« tiá»n ngoÃ i luá»“ng nhÆ° daily.
- ThÃ¡ng pháº£n Ã¡nh theo ledger delta cá»§a `dashboard_monthly_summary` (bao gá»“m cáº£ delta giáº£m trá»±c tiáº¿p khi há»§y/hoÃ n theo Model A).
- BÃ¡o cÃ¡o thÃ¡ng khÃ´ng Ä‘Æ°á»£c tá»± Ã½ dÃ¹ng Ä‘á»‹nh nghÄ©a khÃ¡c vá»›i daily.

## 4.3. Log NCC (hoÃ n/Ä‘á»‘i trá»« NCC)

Vai trÃ²:
- Theo dÃµi pháº§n NCC cáº§n hoÃ n hoáº·c cáº§n Ä‘á»‘i trá»« khi cÃ³ refund.

YÃªu cáº§u kiá»ƒm soÃ¡t:
- Má»—i dÃ²ng log liÃªn káº¿t Ä‘Æ°á»£c vá»›i refund phÃ¡t sinh.
- CÃ³ tráº¡ng thÃ¡i xá»­ lÃ½ (chÆ°a xá»­ lÃ½/Ä‘Ã£ xá»­ lÃ½) Ä‘á»ƒ phá»¥c vá»¥ reconcile cuá»‘i ká»³.
- KhÃ´ng thay tháº¿ summary dashboard; Ä‘Ã¢y lÃ  ledger Ä‘á»‘i soÃ¡t Ä‘á»™c láº­p.

---

## 5) VÃ­ dá»¥ nghiá»‡p vá»¥ chuáº©n (trÃ¡nh hiá»ƒu sai)

## VÃ­ dá»¥ 1: ÄÆ¡n thanh toÃ¡n Ä‘á»§, khÃ´ng refund

- Thu thá»±c táº¿: 500,000
- Refund: 0
- Tiá»n nháº­p hÃ ng: 300,000
- Tiá»n ngoÃ i luá»“ng: 0

Káº¿t quáº£:
- `total_revenue` thÃ¡ng tÄƒng `500,000`
- `standard_profit = 500,000 - 300,000 = 200,000`

## VÃ­ dá»¥ 2: ÄÆ¡n cÃ³ refund má»™t pháº§n

- Thu thá»±c táº¿: 500,000
- Refund ngÃ y D+2: 120,000
- Tiá»n nháº­p hÃ ng: 300,000

Káº¿t quáº£:
- `total_revenue` thÃ¡ng giáº£m trá»±c tiáº¿p `120,000` táº¡i thá»i Ä‘iá»ƒm há»§y/hoÃ n.
- `total_refund` thÃ¡ng tÄƒng `120,000` Ä‘á»ƒ theo dÃµi/audit.
- `profit_delta_refund = -(120,000 - ncc_refund_amount)`; lá»£i nhuáº­n thÃ¡ng giáº£m theo delta nÃ y.
- Táº¡o log NCC cho pháº§n cáº§n hoÃ n/Ä‘á»‘i trá»« theo chÃ­nh sÃ¡ch NCC.

## VÃ­ dá»¥ 3: ÄÆ¡n refund toÃ n pháº§n

- Thu thá»±c táº¿: 500,000
- Refund: 500,000
- Tiá»n nháº­p hÃ ng: 300,000

Káº¿t quáº£:
- `total_revenue` thÃ¡ng giáº£m trá»±c tiáº¿p `500,000`.
- `total_refund` thÃ¡ng tÄƒng `500,000`.
- `profit_delta_refund = -(500,000 - ncc_refund_amount)`; náº¿u `ncc_refund_amount = 300,000` thÃ¬ lá»£i nhuáº­n giáº£m `200,000`.
- Báº¯t buá»™c cÃ³ log NCC Ä‘á»ƒ xá»­ lÃ½ pháº§n giÃ¡ vá»‘n tÆ°Æ¡ng á»©ng.

## VÃ­ dá»¥ 4: CÃ³ phÃ¡t sinh tiá»n ngoÃ i luá»“ng

- Thu thá»±c táº¿ tá»« Ä‘Æ¡n: 500,000
- Tiá»n ngoÃ i luá»“ng: 150,000
- Refund: 0
- Tiá»n nháº­p hÃ ng: 300,000

Káº¿t quáº£ chuáº©n:
- Doanh thu tÃ­nh bÃ¡o cÃ¡o: chá»‰ `500,000`
- Lá»£i nhuáº­n chuáº©n: `500,000 - 300,000 = 200,000`
- `150,000` chá»‰ náº±m á»Ÿ sá»• kiá»ƒm soÃ¡t ngoÃ i luá»“ng, khÃ´ng Ä‘i vÃ o doanh thu/lá»£i nhuáº­n.

## VÃ­ dá»¥ 5: Thu trong thÃ¡ng A, refund trong thÃ¡ng B

- ThÃ¡ng A thu: 800,000
- ThÃ¡ng B refund: 200,000
- Tiá»n nháº­p hÃ ng: 450,000

Káº¿t quáº£:
- ThÃ¡ng A: pháº£n Ã¡nh thu theo cash-basis táº¡i thá»i Ä‘iá»ƒm thu.
- ThÃ¡ng B: pháº£n Ã¡nh refund theo ngÃ y hoÃ n.
- Äá»‘i soÃ¡t thÃ¡ng dÃ¹ng `total_revenue` Ä‘Ã£ pháº£n Ã¡nh delta hoÃ n trá»±c tiáº¿p, vÃ  `total_refund` Ä‘á»ƒ theo dÃµi/audit.

## VÃ­ dá»¥ 6: Refund nhiá»u láº§n cho cÃ¹ng má»™t Ä‘Æ¡n

- Thu thá»±c táº¿: 1,000,000
- Refund Ä‘á»£t 1: 100,000
- Refund Ä‘á»£t 2: 150,000
- Tiá»n nháº­p hÃ ng: 600,000

Káº¿t quáº£:
- `total_refund = 250,000`
- `total_revenue` thÃ¡ng giáº£m trá»±c tiáº¿p tá»•ng `250,000`.
- Lá»£i nhuáº­n giáº£m theo tá»•ng `SUM(-(refund_amount_i - ncc_refund_amount_i))` cá»§a tá»«ng Ä‘á»£t.
- Má»—i Ä‘á»£t refund cÃ³ log thá»i Ä‘iá»ƒm vÃ  liÃªn káº¿t log NCC tÆ°Æ¡ng á»©ng.

---

## Checklist váº­n hÃ nh cuá»‘i ngÃ y/cuá»‘i thÃ¡ng

- ÄÃ£ tÃ¡ch báº¡ch rÃµ doanh thu, tiá»n nháº­p hÃ ng, refund, tiá»n ngoÃ i luá»“ng.
- Refund luÃ´n cÃ³ sá»‘ tiá»n + ngÃ y hoÃ n + liÃªn káº¿t log NCC (náº¿u cÃ³ nghÄ©a vá»¥ NCC).
- KhÃ´ng cÃ³ khoáº£n ngoÃ i luá»“ng nÃ o Ä‘i vÃ o doanh thu/lá»£i nhuáº­n.
- Tá»•ng thÃ¡ng khá»›p logic cá»™ng tá»« daily.
- CÃ³ thá»ƒ truy váº¿t tá»« dashboard vá» giao dá»‹ch gá»‘c vÃ  log NCC khi kiá»ƒm toÃ¡n ná»™i bá»™.

---

## Quy Ä‘á»‹nh Ã¡p dá»¥ng

Tá»« thá»i Ä‘iá»ƒm tÃ i liá»‡u nÃ y ban hÃ nh, má»i thay Ä‘á»•i liÃªn quan dashboard tÃ i chÃ­nh pháº£i tuÃ¢n theo cÃ¡c Ä‘á»‹nh nghÄ©a vÃ  cÃ´ng thá»©c á»Ÿ Ä‘Ã¢y. Náº¿u cÃ³ thay Ä‘á»•i nghiá»‡p vá»¥, cáº­p nháº­t tÃ i liá»‡u nÃ y trÆ°á»›c khi Ä‘á»•i logic tÃ­nh toÃ¡n.


## --- [MONEY_FLOW.md] ---

# Luá»“ng Tiá»n Tá»‡ & Lá»£i Nhuáº­n (Money Flow)

TÃ i liá»‡u nÃ y mÃ´ táº£ chi tiáº¿t cÃ¡ch há»‡ thá»‘ng xá»­ lÃ½ tiá»n tá»‡, tá»« khi khÃ¡ch hÃ ng thanh toÃ¡n Ä‘áº¿n khi tÃ­nh toÃ¡n lá»£i nhuáº­n (Profit) vÃ  cáº­p nháº­t Dashboard.

## 1. Doanh thu (Revenue)
Doanh thu Ä‘Æ°á»£c ghi nháº­n tá»« hai nguá»“n chÃ­nh:
- **BiÃªn nháº­n tá»« Webhook (Sepay)**: Tiá»n khÃ¡ch chuyá»ƒn khoáº£n vÃ o tÃ i khoáº£n ngÃ¢n hÃ ng cá»§a há»‡ thá»‘ng.
- **BiÃªn nháº­n thá»§ cÃ´ng**: Tiá»n máº·t hoáº·c kÃªnh khÃ¡c do admin tá»± thÃªm.
- Doanh thu cá»§a Ä‘Æ¡n hÃ ng = Tá»•ng tiá»n cá»§a cÃ¡c biÃªn nháº­n Ä‘Ã£ ghÃ©p ná»‘i (`orderCode` khá»›p).

## 2. Chi phÃ­ (Cost)
- Chi phÃ­ Ä‘Æ¡n hÃ ng (`cost`) Ä‘Æ°á»£c láº¥y tá»« giÃ¡ nháº­p cá»§a nhÃ  cung cáº¥p (Supplier).
- Há»‡ thá»‘ng há»— trá»£ "Prorate" (tÃ­nh chi phÃ­ theo tá»· lá»‡ sá»‘ ngÃ y sá»­ dá»¥ng cÃ²n láº¡i) khi thá»±c hiá»‡n Ä‘á»•i tÃ i khoáº£n (Äá»•i NCC) giá»¯a chu ká»³.
- Chi phÃ­ máº·c Ä‘á»‹nh cho hÃ ng ná»™i bá»™ (Mavryk Shop) lÃ  0 Ä‘.

## 3. Lá»£i Nhuáº­n (Profit)
- **Profit = Thu (Revenue) - Chi phÃ­ (Cost) - Tiá»n HoÃ n (Refund, náº¿u cÃ³)**.
- Khi má»™t Ä‘Æ¡n hÃ ng hoÃ n thÃ nh thanh toÃ¡n (hoáº·c khi Ä‘á»•i tráº¡ng thÃ¡i), há»‡ thá»‘ng tá»± Ä‘á»™ng ghi sá»• (post financial log) vÃ o báº£ng `payment_receipt_financial_state`.
- Lá»£i nhuáº­n cá»§a cáº£ cá»­a hÃ ng (Mavn Store Profit) Ä‘Æ°á»£c Ä‘á»“ng bá»™ song song.

## 4. Ghi Nháº­n Sá»‘ DÆ° Bank (Shop Bank Ledger)
- Tiá»n vÃ o ngÃ¢n hÃ ng thá»±c táº¿ (qua Sepay) Ä‘Æ°á»£c lÆ°u vÃ o `shop_bank_receipt_totals` vÃ  `shop_bank_ledgers`.
- Äáº£m báº£o sá»‘ dÆ° (Balance) hiá»ƒn thá»‹ trong admin báº±ng Ä‘Ãºng sá»‘ dÆ° thá»±c táº¿ cá»§a ngÃ¢n hÃ ng (Single Source of Truth).

## 5. HoÃ n Tiá»n (Refund) & Credit
- Tiá»n hoÃ n (Refund) lÃ  sá»‘ tiá»n tráº£ láº¡i khÃ¡ch hÃ ng (hoáº·c cáº¥n trá»« sang Ä‘Æ¡n má»›i).
- Há»‡ thá»‘ng táº¡o **Refund Credit Note** Ä‘á»ƒ tÃ¡i sá»­ dá»¥ng sá»‘ dÆ° nÃ y cho Ä‘Æ¡n hÃ ng tÆ°Æ¡ng lai cá»§a cÃ¹ng khÃ¡ch hÃ ng.


## --- [nghiep-vu-loi-nhuan-ban-slot.md] ---

# Nghiá»‡p vá»¥ tÃ­nh lá»£i nhuáº­n khi bÃ¡n slot (Ä‘á»‹nh hÆ°á»›ng dÃ i háº¡n)

TÃ i liá»‡u mÃ´ táº£ **tá»•ng quan nghiá»‡p vá»¥** vÃ  **nguyÃªn táº¯c thiáº¿t káº¿** Ä‘á»ƒ tÃ­nh lá»£i nhuáº­n khi bÃ¡n slot trong gÃ³i sáº£n pháº©m, nháº±m dÃ¹ng **lÃ¢u dÃ i** (á»•n Ä‘á»‹nh, kiá»ƒm chá»©ng Ä‘Æ°á»£c, khÃ´ng phá»¥ thuá»™c vÃ o má»™t mÃ n hÃ¬nh táº¡m thá»i).

---

## 1. Má»¥c Ä‘Ã­ch vÃ  pháº¡m vi

### 1.1 Má»¥c Ä‘Ã­ch

- Thá»‘ng nháº¥t **Ä‘á»‹nh nghÄ©a lá»£i nhuáº­n** khi bÃ¡n má»™t slot cho khÃ¡ch: khÃ´ng chá»‰ dá»±a vÃ o *gi bÃ¡n âˆ’ cost NCC trÃªn Ä‘Æ¡n*, mÃ  pháº£i pháº£n Ã¡nh **chi phÃ­ cÆ¡ há»™i / chi phÃ­ â€œÃ´mâ€ slot** trong thá»i gian slot náº±m tá»“n trÆ°á»›c khi bÃ¡n.
- Äáº£m báº£o cÃ¹ng má»™t quy táº¯c cÃ³ thá»ƒ dÃ¹ng cho **bÃ¡o cÃ¡o**, **dashboard**, vÃ  **Ä‘á»‘i soÃ¡t** theo thÃ¡ng / ká»³, khÃ´ng chá»‰ hiá»ƒn thá»‹ trÃªn má»™t báº£ng chi phÃ­ phÃ¢n bá»• theo ngÃ y.

### 1.2 Pháº¡m vi

**Trong pháº¡m vi:**

- Slot thuá»™c **gÃ³i sáº£n pháº©m** (cÃ³ cáº¥u trÃºc slot trong catalog / `package_product` hoáº·c tÆ°Æ¡ng Ä‘Æ°Æ¡ng).
- ÄÆ¡n nháº­p **MAVN** (Ä‘Ã£ thanh toÃ¡n NCC) lÃ  nguá»“n gá»‘c **chi phÃ­ nháº­p** vÃ  **ká»³ phÃ¢n bá»•** (thá»i háº¡n, ngÃ y báº¯t Ä‘áº§u Ã¡p dá»¥ng).
- BÃ¡n slot ra khÃ¡ch (MAVL / MAVC / Ä‘Æ¡n bÃ¡n láº» â€” tÃ¹y há»‡ thá»‘ng Ä‘áº·t tÃªn): **doanh thu** vÃ  **thá»i Ä‘iá»ƒm bÃ¡n**.

**NgoÃ i pháº¡m vi (giai Ä‘oáº¡n 1 cÃ³ thá»ƒ loáº¡i trá»« rÃµ rÃ ng):**

- HoÃ n tiá»n, Ä‘iá»u chá»‰nh háº­u kiá»ƒm phá»©c táº¡p (ghi nháº­n láº¡i theo IFRS â€” náº¿u sau nÃ y cáº§n thÃ¬ má»Ÿ rá»™ng).
- Chi phÃ­ cá»‘ Ä‘á»‹nh doanh nghiá»‡p khÃ´ng gáº¯n slot (thuÃª server toÃ n cá»¥c, nhÃ¢n sá»± chung), trá»« khi sau nÃ y phÃ¢n bá»• theo policy riÃªng.

---

## 2. Thuáº­t ngá»¯

| Thuáº­t ngá»¯ | MÃ´ táº£ ngáº¯n |
|-----------|------------|
| **Slot** | Má»™t â€œÃ´â€ quyá»n sá»­ dá»¥ng / tÃ i khoáº£n trong gÃ³i (vÃ­ dá»¥ má»™t user trong gÃ³i gia Ä‘Ã¬nh). |
| **Chi phÃ­ nháº­p (import cost)** | Sá»‘ tiá»n thá»±c tráº£ / ghi nháº­n trÃªn Ä‘Æ¡n nháº­p MAVN cho gÃ³i hoáº·c pháº§n gÃ³i tÆ°Æ¡ng á»©ng. |
| **PhÃ¢n bá»• chi phÃ­ theo ngÃ y** | Chia `chi phÃ­ nháº­p` (vÃ /hoáº·c chi phÃ­ khÃ¡c) cho **sá»‘ ngÃ y trong ká»³** vÃ  **sá»‘ slot**, Ä‘á»ƒ má»—i slot má»—i ngÃ y mang má»™t pháº§n chi phÃ­ â€œÄ‘ang tá»“nâ€. |
| **Chi phÃ­ Ã´m slot / carrying cost** | TÃ­ch lÅ©y pháº§n phÃ¢n bá»• **tá»« lÃºc báº¯t Ä‘áº§u tÃ­nh tá»“n** Ä‘áº¿n **thá»i Ä‘iá»ƒm bÃ¡n** (hoáº·c Ä‘áº¿n cuá»‘i ká»³ bÃ¡o cÃ¡o), *theo Ä‘Ãºng quy táº¯c Ä‘Ã£ chá»‘t*. |
| **Doanh thu bÃ¡n slot** | GiÃ¡ bÃ¡n ghi nháº­n khi bÃ¡n slot cho khÃ¡ch (sau thuáº¿ / trÆ°á»›c thuáº¿ â€” cáº§n chá»‘t má»™t chuáº©n). |
| **Lá»£i nhuáº­n gá»™p slot (theo nghiá»‡p vá»¥ nÃ y)** | Doanh thu bÃ¡n slot **trá»«** chi phÃ­ nháº­p Ä‘Ã£ phÃ¢n bá»• tÆ°Æ¡ng á»©ng pháº§n Ä‘Ã£ â€œÃ´mâ€ (vÃ  trá»« cÃ¡c cost trá»±c tiáº¿p khÃ¡c náº¿u policy cÃ³). |

---

## 3. VÃ­ dá»¥ nghiá»‡p vá»¥ tham chiáº¿u (Ä‘á»“ng bá»™ vá»›i trao Ä‘á»•i)

- Slot A **tá»“n 10 ngÃ y** â†’ quy Æ°á»›c pháº§n phÃ¢n bá»• tÆ°Æ¡ng á»©ng **10.000** (Ä‘Æ¡n vá»‹ VNÄ, sá»‘ mang tÃ­nh minh há»a).
- BÃ¡n slot A **50.000**, NCC lÃ  Mavryk vÃ  trÃªn Ä‘Æ¡n bÃ¡n **cost = 0** (khÃ´ng cÃ³ dÃ²ng nháº­p má»›i).
- **Lá»£i nhuáº­n mong Ä‘á»£i:** `50.000 âˆ’ 10.000 = 40.000`  
  (tá»©c váº«n pháº£i trá»« **chi phÃ­ Ä‘Ã£ tÃ­ch lÅ©y khi tá»“n**, khÃ´ng Ä‘Æ°á»£c coi lá»£i nhuáº­n = 50.000).

Äiá»ƒm cá»‘t lÃµi: **cost = 0 trÃªn Ä‘Æ¡n bÃ¡n** khÃ´ng cÃ³ nghÄ©a **chi phÃ­ kinh táº¿ cá»§a slot = 0**.

---

## 4. Tráº¡ng thÃ¡i há»‡ thá»‘ng liÃªn quan (bá»‘i cáº£nh ká»¹ thuáº­t)

### 4.1 Báº£ng chi phÃ­ theo ngÃ y (UI hiá»‡n táº¡i)

- Báº£ng **â€œBáº¢NG CHI PHÃ THEO NGÃ€Yâ€** (workspace chi phÃ­) Ä‘ang káº¿t há»£p:
  - Ä‘Æ¡n nháº­p MAVN Ä‘Ã£ TT,
  - cáº¥u hÃ¬nh gÃ³i tá»« **`package_product`** (sá»‘ slot, gÃ¡n slot, v.v.),
  - vÃ  **logic tÃ­nh toÃ¡n phÃ¢n bá»•** (nhiá»u pháº§n cháº¡y á»Ÿ frontend).
- Dá»¯ liá»‡u hiá»ƒn thá»‹ lÃ  **káº¿t quáº£ suy diá»…n** tá»« nhiá»u nguá»“n, khÃ´ng pháº£i má»™t **sá»• cÃ¡i chi phÃ­ slot** Ä‘á»™c láº­p lÆ°u trong DB.

### 4.2 Há»‡ quáº£ cho â€œminh báº¡ch lÃ¢u dÃ iâ€

- Náº¿u **chá»‰** tin vÃ o cáº¥u hÃ¬nh catalog + tÃ­nh láº¡i má»—i láº§n load UI, sáº½ khÃ³:
  - **Ä‘á»‘i soÃ¡t** cÃ¹ng má»™t con sá»‘ vá»›i bÃ¡o cÃ¡o lá»£i nhuáº­n,
  - **khÃ³a sá»•** má»™t ká»³ khi Ä‘Ã£ chá»‘t,
  - **giáº£i thÃ­ch** khi Ä‘á»•i code khá»›p gÃ³i hoáº·c Ä‘á»•i thuáº­t toÃ¡n phÃ¢n bá»•.

ÄÃ¢y lÃ  lÃ½ do cáº§n **nghiá»‡p vá»¥ dÃ i háº¡n** tÃ¡ch rÃµ: **quy táº¯c tÃ­nh**, **nguá»“n dá»¯ liá»‡u**, vÃ  **cÃ¡ch ghi nháº­n** (tÃ­nh láº¡i hay lÆ°u snapshot/ledger).

---

## 5. NguyÃªn táº¯c nghiá»‡p vá»¥ dÃ i háº¡n

### 5.1 Má»™t â€œengineâ€ duy nháº¥t

- Má»i con sá»‘ **phÃ¢n bá»• chi phÃ­ tá»“n** vÃ  **lá»£i nhuáº­n khi bÃ¡n slot** pháº£i Ä‘i qua **cÃ¹ng má»™t lá»›p nghiá»‡p vá»¥** (backend hoáº·c lá»›p domain thá»‘ng nháº¥t), khÃ´ng Ä‘Æ°á»£c hai nÆ¡i hai cÃ´ng thá»©c.
- UI chá»‰ **hiá»ƒn thá»‹** hoáº·c **Ä‘iá»u chá»‰nh tham sá»‘** Ä‘Æ°á»£c phÃ©p; khÃ´ng pháº£i nÆ¡i Ä‘á»‹nh nghÄ©a cuá»‘i cÃ¹ng cho P&L.

### 5.2 PhÃ¢n biá»‡t â€œcatalogâ€ vÃ  â€œsá»± kiá»‡nâ€

- **`package_product` (vÃ  tÆ°Æ¡ng Ä‘Æ°Æ¡ng):** mÃ´ táº£ **cáº¥u trÃºc** gÃ³i (bao nhiÃªu slot, tÃªn slot, matchâ€¦).
- **Sá»± kiá»‡n kinh doanh:** nháº­p hÃ ng (MAVN), slot vÃ o tráº¡ng thÃ¡i cÃ³ thá»ƒ bÃ¡n, bÃ¡n slot, há»§y, chuyá»ƒn slotâ€¦  
  Lá»£i nhuáº­n lÃ¢u dÃ i cáº§n **neo** vÃ o sá»± kiá»‡n hoáº·c vÃ o **snapshot** Ä‘Ã£ chá»‘t, khÃ´ng chá»‰ vÃ o báº£n catalog cÃ³ thá»ƒ Ä‘á»•i sau.

### 5.3 Chá»‘t thá»i Ä‘iá»ƒm ghi nháº­n

Cáº§n quy Æ°á»›c rÃµ (vÃ  giá»¯ á»•n Ä‘á»‹nh):

- **Báº¯t Ä‘áº§u tÃ­ch lÅ©y carrying:** tá»« `registration_date` / `order_date` / ngÃ y vÃ o kho â€” **má»™t chuáº©n duy nháº¥t**.
- **Káº¿t thÃºc tÃ­ch lÅ©y cho má»™t slot bÃ¡n:** táº¡i thá»i Ä‘iá»ƒm **Ä‘Æ¡n bÃ¡n** Ä‘Æ°á»£c coi lÃ  hoÃ n táº¥t (táº¡o Ä‘Æ¡n / thanh toÃ¡n / giao slot â€” cáº§n chá»n má»™t má»‘c **chÃ­nh thá»©c**).

### 5.4 ÄÆ¡n vá»‹ cÃ´ng thá»©c (Ä‘á» xuáº¥t lÃ m rÃµ trong policy)

Má»™t trong cÃ¡c mÃ´ hÃ¬nh (chá»n má»™t lÃ m chuáº©n sáº£n pháº©m):

1. **Theo ngÃ y tuyáº¿n tÃ­nh:**  
   `cost_per_slot_per_day = import_cost / (term_days Ã— sá»‘_slot_active)`  
   `carrying_until_sale = cost_per_slot_per_day Ã— sá»‘_ngÃ y_tá»“n_thá»±c_táº¿`  
2. **Theo ká»³ Ä‘Ã£ phÃ¢n bá»• sáºµn:** chá»‰ tÃ­nh trÃªn cÃ¡c ngÃ y cÃ³ â€œâœ“ slot chiáº¿m chá»—â€ trong báº£ng phÃ¢n bá»• (náº¿u nghiá»‡p vá»¥ lÃ  slot khÃ´ng luÃ´n full).
3. **Káº¿t há»£p:** cost nháº­p cá»‘ Ä‘á»‹nh + Ä‘iá»u chá»‰nh khi slot trá»‘ng (khÃ´ng phÃ¡t sinh carrying) â€” cáº§n mÃ´ táº£ riÃªng.

TÃ i liá»‡u nÃ y **khÃ´ng** Ã©p má»™t cÃ´ng thá»©c cá»¥ thá»ƒ mÃ  yÃªu cáº§u **pháº£i cÃ³ policy chá»¯** + **vÃ­ dá»¥ sá»‘** + **test** gáº¯n vá»›i policy Ä‘Ã³.

---

## 6. Kiáº¿n trÃºc dá»¯ liá»‡u: hai hÆ°á»›ng (Ä‘á»u â€œÄ‘Ãºngâ€, khÃ¡c má»©c Ä‘á»™ minh báº¡ch)

### 6.1 HÆ°á»›ng A â€” Suy diá»…n thuáº§n (derive), khÃ´ng báº£ng ledger má»›i

**Ã tÆ°á»Ÿng:** LuÃ´n tÃ­nh láº¡i carrying vÃ  lá»£i nhuáº­n tá»«:

- Ä‘Æ¡n MAVN + sáº£n pháº©m + slot,
- quy táº¯c phÃ¢n bá»•,
- lá»‹ch sá»­ Ä‘Æ¡n bÃ¡n.

**Æ¯u Ä‘iá»ƒm:** Ã­t migration, triá»ƒn khai nhanh náº¿u engine backend thá»‘ng nháº¥t.  
**NhÆ°á»£c:** khÃ³ *khÃ³a sá»•*; Ä‘á»•i code cÃ³ thá»ƒ lÃ m thay Ä‘á»•i con sá»‘ quÃ¡ khá»© náº¿u khÃ´ng version hÃ³a quy táº¯c.

### 6.2 HÆ°á»›ng B â€” Ghi nháº­n / snapshot / ledger (khuyáº¿n nghá»‹ cho â€œlÃ¢u dÃ iâ€ vÃ  minh báº¡ch)

**Ã tÆ°á»Ÿng:** Vá»›i má»—i **slot** (hoáº·c cáº·p `order_mavn` + `slot_key` + `product`), lÆ°u má»™t trong cÃ¡c dáº¡ng:

- **Báº£n ghi chi phÃ­ theo ngÃ y** (materialized theo job Ä‘Ãªm / khi chá»‘t ká»³), hoáº·c  
- **Sá»± kiá»‡n** (event): `slot_allocated`, `slot_holding_day`, `slot_sold` kÃ¨m `amount`.

**Æ¯u Ä‘iá»ƒm:** audit tá»‘t, bÃ¡o cÃ¡o á»•n Ä‘á»‹nh, giáº£i thÃ­ch Ä‘Æ°á»£c vá»›i NCC / káº¿ toÃ¡n ná»™i bá»™.  
**NhÆ°á»£c:** cáº§n thiáº¿t káº¿ báº£ng, job, vÃ  quy trÃ¬nh Ä‘á»‘i soÃ¡t.

**Khuyáº¿n nghá»‹ Ä‘á»‹nh hÆ°á»›ng:** vá»›i má»¥c tiÃªu **lÃ¢u dÃ¢n**, nÃªn **tiáº¿n tá»« A â†’ B**: trÆ°á»›c háº¿t **má»™t engine**; sau Ä‘Ã³ **persist** output cá»§a engine theo ká»³ (Ã­t nháº¥t **snapshot cuá»‘i thÃ¡ng**).

---

## 7. Luá»“ng nghiá»‡p vá»¥ má»¥c tiÃªu (logical)

```text
[Nháº­p MAVN â€” Ä‘Ã£ TT]
        â”‚
        â–¼
XÃ¡c Ä‘á»‹nh: cost nháº­p, ká»³ (term), sá»‘ slot, ngÃ y báº¯t Ä‘áº§u phÃ¢n bá»•
        â”‚
        â–¼
(Engine) PhÃ¢n bá»• carrying theo policy â”€â”€â”€â”€â”€â”€â–º BÃ¡o cÃ¡o tá»“n / UI
        â”‚
        â–¼
[BÃ¡n slot â€” Ä‘Æ¡n khÃ¡ch]
        â”‚
        â–¼
(Engine) Lá»£i nhuáº­n slot = Doanh thu âˆ’ carrying Ä‘Ã£ tÃ­ch âˆ’ cost trá»±c tiáº¿p khÃ¡c
        â”‚
        â–¼
Ghi nháº­n vÃ o bÃ¡o cÃ¡o P&L slot (vÃ  ledger náº¿u cÃ³)
```

---

## 8. TiÃªu chÃ­ cháº¥p nháº­n (acceptance) gá»£i Ã½

- **AC1:** Vá»›i ká»‹ch báº£n cost NCC trÃªn Ä‘Æ¡n bÃ¡n = 0 nhÆ°ng slot Ä‘Ã£ tá»“n N ngÃ y cÃ³ carrying > 0, **lá»£i nhuáº­n < doanh thu** vÃ  báº±ng Ä‘Ãºng cÃ´ng thá»©c Ä‘Ã£ chá»‘t.  
- **AC2:** CÃ¹ng má»™t bá»™ Ä‘Æ¡n/MAVN/slot, **sá»‘ carrying** trÃªn mÃ n chi phÃ­ vÃ  **sá»‘ trá»« khi tÃ­nh lá»£i nhuáº­n bÃ¡n** trÃ¹ng nhau (sai sá»‘ â‰¤ 1 Ä‘Æ¡n vá»‹ lÃ m trÃ²n náº¿u cÃ³).  
- **AC3:** CÃ³ thá»ƒ giáº£i thÃ­ch Ä‘Æ°á»£c má»™t dÃ²ng lá»£i nhuáº­n: *slot nÃ o, Ä‘Æ¡n nháº­p nÃ o, bao nhiÃªu ngÃ y, Ä‘Æ¡n bÃ¡n nÃ o*.  
- **AC4 (náº¿u cÃ³ ledger):** Sau khi **khÃ³a ká»³**, khÃ´ng Ä‘á»•i sá»‘ Ä‘Ã£ chá»‘t khi chá»‰nh sá»­a catalog; má»i Ä‘iá»u chá»‰nh Ä‘i qua **bÃºt Ä‘iá»u chá»‰nh** cÃ³ audit.

---

## 9. Rá»§i ro vÃ  kiá»ƒm soÃ¡t

| Rá»§i ro | Kiá»ƒm soÃ¡t gá»£i Ã½ |
|--------|------------------|
| Khá»›p sai gÃ³i / sai `slotLimit` | Chuáº©n hÃ³a khÃ³a: `line_product_id` / `variant_id` / `package_id`; fallback match pháº£i log cáº£nh bÃ¡o. |
| Äá»•i term hoáº·c ngÃ y sau nháº­p | Quyá»n sá»­a cÃ³ audit; cÃ³ thá»ƒ táº¡o báº£n ghi Ä‘iá»u chá»‰nh carrying. |
| LÃ m trÃ²n theo ngÃ y | Chá»‘t quy táº¯c lÃ m trÃ²n vÃ  dÃ¹ng chung má»i nÆ¡i. |
| Hai nguá»“n sá»± tháº­t (UI vs API) | Engine má»™t nÆ¡i; UI chá»‰ consume API/domain. |

---

## 10. Lá»™ trÃ¬nh Ä‘á» xuáº¥t (Roadmap)

1. **Chá»‘t policy** báº±ng vÄƒn báº£n (cÃ´ng thá»©c + má»‘c thá»i gian + vÃ­ dá»¥ 3â€“5 ká»‹ch báº£n sá»‘).  
2. **Implement engine** backend (pure function / domain service + unit test theo vÃ­ dá»¥).  
3. **Ná»‘i** mÃ n chi phÃ­ vÃ  bÃ¡o cÃ¡o lá»£i nhuáº­n vÃ o **cÃ¹ng API** engine.  
4. **(Tuá»³ Ä‘á»™ Æ°u tiÃªn minh báº¡ch)** ThÃªm báº£ng snapshot/ledger + job chá»‘t ká»³.  
5. **GiÃ¡m sÃ¡t:** log chÃªnh lá»‡ch, dashboard â€œslot khÃ´ng khá»›p gÃ³iâ€.

---

## 11. Phá»¥ lá»¥c â€” LiÃªn káº¿t code hiá»‡n cÃ³ (tham chiáº¿u)

- Workspace chi phÃ­: `frontend/src/features/expenses/components/ExpenseCostAllocationTable.tsx`  
  (táº£i MAVN paid + package-products + package_match, ghÃ©p vÃ  phÃ¢n bá»• trÃªn client).  
- Dá»‹ch vá»¥ gÃ³i: `backend/src/services/packageProductService.js`, controller package tÆ°Æ¡ng á»©ng.  
- Äá»“ng bá»™ chi phÃ­ MAVN store: `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js` (náº¿u má»Ÿ rá»™ng ghi nháº­n).

TÃ i liá»‡u nÃ y **khÃ´ng** thay tháº¿ policy káº¿ toÃ¡n phÃ¡p lÃ½; lÃ  **spec ná»™i bá»™** Ä‘á»ƒ ká»¹ thuáº­t vÃ  váº­n hÃ nh cÃ¹ng chung ngÃ´n ngá»¯ khi triá»ƒn khai lÃ¢u dÃ i.

---

*TÃ i liá»‡u: `docs/nghiep-vu-loi-nhuan-ban-slot.md` â€” cÃ³ thá»ƒ cáº­p nháº­t khi policy cÃ´ng thá»©c Ä‘Æ°á»£c chá»‘t chÃ­nh thá»©c.*


## --- [payment-slot-suffix-matching.md] ---

# Thanh toÃ¡n theo suffix sá»‘ tiá»n (khÃ´ng ná»™i dung CK)

TÃ i liá»‡u mÃ´ táº£ cÆ¡ cháº¿ match webhook **khÃ´ng cáº§n ghi ná»™i dung chuyá»ƒn khoáº£n** vÃ  **khÃ´ng dÃ¹ng cá»™t `transaction`** cho Ä‘Æ¡n má»›i.

## TÃ³m táº¯t

| TrÆ°á»›c | Sau |
|-------|-----|
| Sinh mÃ£ `transaction` 8 kÃ½ tá»±, ghi vÃ o VietQR `addInfo` | KhÃ´ng sinh `transaction` |
| Webhook match theo ná»™i dung CK / mÃ£ transaction | Webhook match theo **(STK nháº­n, sá»‘ tiá»n)** |
| `order_list.price` = giÃ¡ gá»‘c | `order_list.price` = **giÃ¡ gá»‘c + suffix** (1..100) |

KhÃ¡ch chá»‰ cáº§n chuyá»ƒn **Ä‘Ãºng sá»‘ tiá»n** hiá»ƒn thá»‹ trÃªn QR (vÃ­ dá»¥ `100.017Ä‘` thay vÃ¬ `100.000Ä‘`).

## ThÃ nh pháº§n DB

- **Sequence** `orders.payment_amount_suffix_seq` â€” suffix luÃ¢n phiÃªn 1..100 (CYCLE).
- **Báº£ng** `orders.order_payment_slots` â€” má»—i láº§n Ä‘Æ¡n chá» thanh toÃ¡n = 1 slot (`cycle_index`).
- **View** `orders.v_payment_slot_health` â€” theo dÃµi slot pending theo `(receiver_account, base_amount)`.

Migration:

- `backend/migrations/20260823120000_order_payment_slots.js`
- `database/migrations/107_order_payment_slots.sql`

## VÃ²ng Ä‘á»i slot

```
Táº¡o Ä‘Æ¡n / chuyá»ƒn Cáº§n Gia Háº¡n
  â†’ openPaymentSlot (kind: new | renewal)
  â†’ expected_amount = base_amount + suffix
  â†’ UPDATE order_list.price = expected_amount

KhÃ¡ch CK Ä‘Ãºng expected_amount
  â†’ Webhook insertPaymentReceipt
  â†’ resolveOrderByExpectedAmount(receiver, amount)
  â†’ markPaymentSlotMatched

ÄÆ¡n paid / renewal xong / há»§y slot cÅ©
  â†’ suffix Ä‘Æ°á»£c giáº£i phÃ³ng (unique chá»‰ Ã¡p pending)
```

### ÄÆ¡n má»›i

- `POST /api/orders` â†’ `createOrder.js` má»Ÿ slot `kind='new'` khi status `ChÆ°a Thanh ToÃ¡n` vÃ  `price > 0`.

### Gia háº¡n

1. Cron `updateDatabaseTask` (00:01 VN): `PAID` â†’ `Cáº§n Gia Háº¡n` (0â€“4 ngÃ y cÃ²n láº¡i).
2. Ngay sau Ä‘Ã³ `openRenewalSlotsForFlippedOrders`: recompute giÃ¡ tá»« báº£ng giÃ¡ (`computeOrderCurrentPrice`) â†’ má»Ÿ slot `kind='renewal'`.
3. Cron `notifyFourDays` (07:00): gá»­i Telegram + QR vá»›i `order.price` Ä‘Ã£ cÃ³ suffix.

GiÃ¡ renewal **chá»‘t táº¡i lÃºc flip RENEWAL**, khÃ´ng Ä‘á»•i khi báº£ng giÃ¡ thay Ä‘á»•i sau Ä‘Ã³ (trÃ¡nh lá»‡ch vá»›i sá»‘ khÃ¡ch Ä‘Ã£ tháº¥y trÃªn QR).

## Webhook Sepay

File: `backend/webhook/sepay/payments.js` â€” `insertPaymentReceipt`

1. KhÃ´ng extract `orderCode` tá»« ná»™i dung CK.
2. Trong transaction: `resolveOrderByExpectedAmount({ receiverAccount, amount })`.
3. Sau INSERT receipt: `markPaymentSlotMatched`.

`postHandler` váº«n cÃ³ fallback `resolveOrderByPayment` (match `order_list.price = amount`) cho luá»“ng xá»­ lÃ½ Ä‘Æ¡n; **khÃ´ng** resolve qua cá»™t `transaction`.

## Telegram

- QR: chá»‰ `amount` + STK (khÃ´ng `addInfo` / khÃ´ng mÃ£ transaction).
- Caption: bá» dÃ²ng Â«Ná»™i dung CKÂ»; nháº¯c chuyá»ƒn **Ä‘Ãºng sá»‘ tiá»n** trÃªn QR.

Files: `sendOrderCreated.js`, `sendFourDays.js`, `messageBuilders.js`.

## Frontend

- `ViewOrderModal` / `paymentQr.ts`: QR shop khÃ´ng gá»­i `description`; khÃ´ng gá»i `ensureOrderTransaction`.
- Hiá»ƒn thá»‹: Â«Chuyá»ƒn khoáº£n Ä‘Ãºng sá»‘ tiá»n trÃªn QR â€” khÃ´ng cáº§n ghi ná»™i dungÂ».

## API legacy

- `POST /api/orders/:id/ensure-transaction` â€” váº«n tá»“n táº¡i nhÆ°ng **khÃ´ng sinh** mÃ£ má»›i; tráº£ `transaction: ""`.

## Domain code

```
backend/src/domains/payment-slots/
```

Public API: `openPaymentSlot`, `resolveOrderByExpectedAmount`, `markPaymentSlotMatched`, `expirePaymentSlots`.

## Giá»›i háº¡n & váº­n hÃ nh

- Tá»‘i Ä‘a **100** Ä‘Æ¡n pending cÃ¹ng `(STK, base_amount)` táº¡i má»™t thá»i Ä‘iá»ƒm (suffix 1..100).
- Nhiá»u má»©c giÃ¡ khÃ¡c nhau â†’ má»—i má»©c cÃ³ pool suffix riÃªng.
- KhÃ¡ch CK **lÃ m trÃ²n** (bá» pháº§n láº») â†’ khÃ´ng match â†’ admin gÃ¡n tay qua receipt.
- Cron (khuyáº¿n nghá»‹): `expirePaymentSlots(pool, '30 days')` dá»n slot pending quÃ¡ háº¡n.

## Triá»ƒn khai

```bash
# Cháº¡y migration (knex hoáº·c SQL thá»§ cÃ´ng)
cd backend && npx knex migrate:latest
# hoáº·c Ã¡p database/migrations/107_order_payment_slots.sql
```

Sau migrate, Ä‘Æ¡n **má»›i** vÃ  Ä‘Æ¡n **gia háº¡n** (sau cron flip) tá»± cÃ³ `price` mang suffix.

## Backfill Ä‘Æ¡n cÅ© (má»™t láº§n)

ÄÆ¡n Ä‘Ã£ á»Ÿ `ChÆ°a Thanh ToÃ¡n` / `Cáº§n Gia Háº¡n` **trÆ°á»›c** khi báº­t payment slot thÆ°á»ng cÃ²n giÃ¡ trÃ²n (vd. `65.000`) vÃ  **khÃ´ng cÃ³** row slot pending â†’ webhook chá»‰ fallback theo `price = amount` (dá»… trÃ¹ng náº¿u nhiá»u Ä‘Æ¡n cÃ¹ng má»©c).

Cháº¡y backfill (tá»« thÆ° má»¥c `backend`):

```bash
# Xem trÆ°á»›c, khÃ´ng ghi DB
node scripts/ops/backfill-payment-slots.js --dry-run

# Má»™t Ä‘Æ¡n thá»­
node scripts/ops/backfill-payment-slots.js --dry-run --order=MAVCHMB3R

# Ghi tháº­t (máº·c Ä‘á»‹nh tá»‘i Ä‘a 500 Ä‘Æ¡n/láº§n)
node scripts/ops/backfill-payment-slots.js

# Batch lá»›n hÆ¡n
node scripts/ops/backfill-payment-slots.js --limit=2000
```

Script:

- QuÃ©t Ä‘Æ¡n `ChÆ°a Thanh ToÃ¡n` / `Cáº§n Gia Háº¡n`, `price > 0`, khÃ´ng MAVN, **chÆ°a cÃ³ slot pending**.
- **Cáº§n GH**: recompute giÃ¡ tá»« báº£ng giÃ¡ (`computeOrderCurrentPrice`) rá»“i má»Ÿ slot `renewal`.
- **ChÆ°a TT**: láº¥y giÃ¡ gá»‘c tá»« `order_list.price` (tÃ¡ch suffix 1..100 náº¿u cÃ³) â†’ slot `new`.
- Cáº­p nháº­t `order_list.price = expected_amount` (QR/Telegram hiá»ƒn thá»‹ sá»‘ cÃ³ suffix).

Code: `backend/src/domains/payment-slots/use-cases/backfillPendingPaymentSlots.js`.


## --- [SEPAY_WEBHOOK_FLOW.md] ---

# Webhook Sepay Flow

Há»‡ thá»‘ng xá»­ lÃ½ tá»± Ä‘á»™ng khi cÃ³ biáº¿n Ä‘á»™ng sá»‘ dÆ° ngÃ¢n hÃ ng qua dá»‹ch vá»¥ Sepay.

## 1. Giai Ä‘oáº¡n Parse (Parse Phase)
- Há»‡ thá»‘ng trÃ­ch xuáº¥t (extract) ná»™i dung chuyá»ƒn khoáº£n Ä‘á»ƒ láº¥y mÃ£ Ä‘Æ¡n hÃ ng (VÃ­ dá»¥: `MAV123456`).
- TÃ¡ch tiá»n nháº­n (Amount) vÃ  phÃ¢n biá»‡t tiá»n VÃ o (Inbound) / Ra (Outbound).

## 2. Giai Ä‘oáº¡n PhÃ¢n giáº£i mÃ£ (Resolution Phase)
- Map cÃ¡c mÃ£ Ä‘Æ¡n hÃ ng vá»«a trÃ­ch xuáº¥t vá»›i DB.
- Há»— trá»£ xá»­ lÃ½ `Batch Code` (MAVG) Ä‘á»ƒ phÃ¢n bá»• tiá»n cho nhiá»u Ä‘Æ¡n hÃ ng cÃ¹ng lÃºc.
- Há»— trá»£ xá»­ lÃ½ `Payment Slot` khi khÃ´ng cÃ³ mÃ£ Ä‘Æ¡n nhÆ°ng sá»‘ tiá»n láº» ngáº«u nhiÃªn (expected_amount) khá»›p hoÃ n toÃ n vá»›i má»™t slot Ä‘ang chá» thanh toÃ¡n.

## 3. Giai Ä‘oáº¡n LÆ°u trá»¯ (Posting Phase)
- LÆ°u biÃªn nháº­n vÃ o `payment_receipt`.
- Äá»“ng thá»i thiáº¿t láº­p `payment_receipt_financial_state` (Tráº¡ng thÃ¡i sá»• sÃ¡ch).
- PhÃ¢n bá»• tá»± Ä‘á»™ng: Sá»‘ tiá»n thanh toÃ¡n Ä‘Æ°á»£c ghi nháº­n vÃ o Ä‘Æ¡n hÃ ng. Náº¿u Ä‘Æ¡n hÃ ng chÆ°a Ä‘á»§ tiá»n, giá»¯ nguyÃªn tráº¡ng thÃ¡i; náº¿u Ä‘á»§ hoáº·c dÆ°, Ä‘á»•i tráº¡ng thÃ¡i sang "Äang xá»­ lÃ½" / "HoÃ n thÃ nh" vÃ  Ä‘Æ°a pháº§n dÆ° vÃ o Ngoáº¡i luá»“ng (Out-of-flow).

## 4. Giai Ä‘oáº¡n Tá»± Ä‘á»™ng gia háº¡n (Renewal Phase)
- Náº¿u giao dá»‹ch lÃ  tráº£ tiá»n gia háº¡n tÃ i khoáº£n (ÄÆ¡n á»Ÿ tráº¡ng thÃ¡i Renewal), gá»i qua queue tá»± Ä‘á»™ng xá»­ lÃ½ tiáº¿p gia háº¡n API.

## 5. Giai Ä‘oáº¡n ThÃ´ng bÃ¡o (Notification Phase)
- Gá»­i tin bÃ¡o qua Telegram (cÃ³ chá»©a QR code, sá»‘ tiá»n, tÃªn Ä‘Æ¡n hÃ ng, biáº¿n Ä‘á»™ng lá»£i nhuáº­n).


## --- [so-du-bank-stk-thong-nhat.md] ---

# Sá»‘ dÆ° bank kháº£ dá»¥ng â€” chuyá»ƒn tá»« má»™t cá»™t tá»•ng sang sá»‘ dÆ° tá»«ng STK

TÃ i liá»‡u mÃ´ táº£ **bÃ i toÃ¡n nghiá»‡p vá»¥**, **tÆ° duy thiáº¿t káº¿** vÃ  **lá»™ trÃ¬nh triá»ƒn khai** khi shop chuyá»ƒn cÃ¡ch quáº£n lÃ½ tiá»n bank: khÃ´ng cÃ²n má»™t con sá»‘ chung trÃªn dashboard, mÃ  **tÃ¡ch ra theo tá»«ng sá»‘ tÃ i khoáº£n (STK)** â€” MB, VPBank, v.v.

*Äá»‘i tÆ°á»£ng Ä‘á»c: chá»§ shop / quáº£n trá»‹ â€” khÃ´ng cáº§n biáº¿t láº­p trÃ¬nh.*

---

## 1. Ã tÆ°á»Ÿng cá»‘t lÃµi

### TrÆ°á»›c Ä‘Ã¢y

Há»‡ thá»‘ng lÆ°u **má»™t con sá»‘ chung** gá»i lÃ  *sá»‘ dÆ° bank Æ°á»›c tÃ­nh* (trÃªn bÃ¡o cÃ¡o thÃ¡ng dashboard). Má»i tiá»n vÃ o/ra bank â€” webhook Sepay, rÃºt tiá»n, nháº­p hÃ ng ngoÃ i luá»“ng, thanh toÃ¡n NCC â€” Ä‘á»u **cá»™ng hoáº·c trá»« vÃ o con sá»‘ Ä‘Ã³**.

Dashboard hiá»ƒn thá»‹ con sá»‘ nÃ y dÆ°á»›i tÃªn **Lá»£i nhuáº­n kháº£ dá»¥ng**. Shop biáº¿t â€œcÃ²n bao nhiÃªu tiá»n trÃªn bankâ€ nhÆ°ng **khÃ´ng biáº¿t** tiá»n náº±m á»Ÿ MB hay VPBank, vÃ  **khÃ´ng biáº¿t** khoáº£n rÃºt / tráº£ NCC vá»«a rá»i tÃ i khoáº£n nÃ o.

### BÃ¢y giá» (hÆ°á»›ng má»›i)

**KhÃ´ng táº¡o thÃªm má»™t â€œsá»• tiá»n thá»© haiâ€.** Sá»‘ dÆ° trÃªn tá»«ng STK trong mÃ n **Quáº£n lÃ½ STK** thá»±c cháº¥t lÃ  **cÃ¹ng khoáº£n tiá»n bank Ä‘Ã³**, chá»‰ **chia nhá» theo tÃ i khoáº£n** Ä‘á»ƒ dá»… theo dÃµi dÃ²ng tiá»n.

```
Lá»£i nhuáº­n kháº£ dá»¥ng (cÅ©)  =  má»™t cá»™t sá»‘ dÆ° bank chung trÃªn dashboard
Lá»£i nhuáº­n kháº£ dá»¥ng (má»›i) =  Sá»‘ dÆ° STK MB + Sá»‘ dÆ° STK VP + â€¦ (cá»™ng cÃ¡c STK Ä‘ang báº­t)
```

Hai váº¿ **pháº£i luÃ´n báº±ng nhau** vá» máº·t tá»•ng tiá»n. KhÃ¡c biá»‡t duy nháº¥t: mÃ n STK cho tháº¥y **phÃ¢n bá»• theo bank**, khÃ´ng chá»‰ má»™t con sá»‘ chung.

### Má»™t cÃ¢u tÃ³m táº¯t

> **Thay vÃ¬ cáº­p nháº­t má»™t cá»™t tá»•ng, há»‡ thá»‘ng cáº­p nháº­t sá»‘ dÆ° Ä‘Ãºng STK; dashboard láº¥y tá»•ng cÃ¡c STK â€” Ä‘Ã³ chÃ­nh lÃ  sá»‘ kháº£ dá»¥ng shop tá»«ng cÃ³.**

---

## 2. BÃ i toÃ¡n nghiá»‡p vá»¥

Shop cÃ³ thá»ƒ cÃ³ **nhiá»u tÃ i khoáº£n ngÃ¢n hÃ ng**. Tiá»n khÃ¡ch chuyá»ƒn khoáº£n vÃ o qua Sepay. Shop cÅ©ng **rÃºt tiá»n**, **nháº­p hÃ ng ngoÃ i luá»“ng**, **thanh toÃ¡n nhÃ  cung cáº¥p (NCC)** â€” má»—i khoáº£n lÃ  tiá»n **ra khá»i bank**.

| HÆ°á»›ng | Viá»‡c cáº§n lÃ m |
|--------|----------------|
| **VÃ o** | Webhook Sepay hoáº·c xÃ¡c nháº­n thanh toÃ¡n thá»§ cÃ´ng â†’ **cá»™ng** sá»‘ dÆ° Ä‘Ãºng STK nháº­n tiá»n |
| **Ra** | RÃºt tiá»n, nháº­p ngoÃ i luá»“ng, thanh toÃ¡n NCC â†’ **trá»«** sá»‘ dÆ° STK Ä‘Ã£ chá»n |
| **Tá»•ng shop** | Lá»£i nhuáº­n kháº£ dá»¥ng = **cá»™ng sá»‘ dÆ° táº¥t cáº£ STK Ä‘ang báº­t** |
| **Tra cá»©u** | Biáº¿t rÃµ tá»«ng khoáº£n vÃ o/ra thuá»™c STK nÃ o |

---

## 3. Hiá»‡n tráº¡ng â€” vÃ¬ sao Ä‘ang â€œlá»‡ch tÆ° duyâ€

Trong giai Ä‘oáº¡n chuyá»ƒn tiáº¿p, code Ä‘ang xá»­ lÃ½ **vá»«a cá»™t tá»•ng cÅ©, vá»«a cá»™t STK má»›i**. Äiá»u nÃ y dá»… khiáº¿n ngÆ°á»i dÃ¹ng nghÄ© cÃ³ **hai luá»“ng tiá»n riÃªng**. Thá»±c táº¿ khÃ´ng pháº£i váº­y â€” Ä‘Ã¢y chá»‰ lÃ  **chÆ°a chuyá»ƒn xong**.

### Cá»™t tá»•ng cÅ© (dashboard theo thÃ¡ng)

- Má»™t con sá»‘ *sá»‘ dÆ° bank Æ°á»›c tÃ­nh* trÃªn bÃ¡o cÃ¡o thÃ¡ng.
- Webhook Sepay **cá»™ng** vÃ o Ä‘Ã¢y khi cÃ³ biÃªn lai má»›i.
- RÃºt tiá»n, nháº­p ngoÃ i luá»“ng, má»™t pháº§n thanh toÃ¡n NCC **trá»«** vÃ o Ä‘Ã¢y.
- KhÃ´ng gáº¯n STK cá»¥ thá»ƒ.

### Cá»™t STK má»›i (Quáº£n lÃ½ STK)

- Má»—i STK cÃ³: **sá»‘ dÆ° hiá»‡n táº¡i**, **tá»•ng CK vÃ o**, **Ä‘Ã£ rÃºt**, **cÃ²n láº¡i**.
- CÃ³ **sá»• cÃ¡i** (lá»‹ch sá»­ tá»«ng dÃ²ng vÃ o/ra) Ä‘á»ƒ tra cá»©u chi tiáº¿t.
- Webhook CK vÃ o **Ä‘Ã£** cá»™ng STK (khi sá»‘ nháº­n khá»›p STK Ä‘Ã£ khai bÃ¡o).
- RÃºt tiá»n, nháº­p ngoÃ i luá»“ng **Ä‘Ã£** trá»« STK (khi user chá»n STK).
- Thanh toÃ¡n NCC **chÆ°a** trá»« STK â€” váº«n chá»‰ trá»« cá»™t tá»•ng cÅ©.
- Thanh toÃ¡n thá»§ cÃ´ng **chÆ°a** cá»™ng STK.

### Báº£ng so sÃ¡nh â€” cÃ¹ng má»™t tiá»n, hai chá»— Ä‘ang ghi (táº¡m thá»i)

| TÃ¬nh huá»‘ng | Cá»™t tá»•ng cÅ© | Cá»™t STK | Tráº¡ng thÃ¡i mong muá»‘n |
|------------|-------------|---------|----------------------|
| CK vÃ o MB qua webhook | Cá»™ng | Cá»™ng MB | Chá»‰ cá»™ng MB (bá» cá»™t tá»•ng) |
| RÃºt 5 triá»‡u tá»« VP | Trá»« | Trá»« VP | Chá»‰ trá»« VP (bá» cá»™t tá»•ng) |
| Nháº­p hÃ ng ngoÃ i luá»“ng | Trá»« | Trá»« STK Ä‘Ã£ chá»n | Chá»‰ trá»« STK (bá» cá»™t tá»•ng) |
| Thanh toÃ¡n NCC | Trá»« | **ChÆ°a trá»«** | Trá»« STK Ä‘Ã£ chá»n (bá» cá»™t tá»•ng) |
| Thanh toÃ¡n thá»§ cÃ´ng | **KhÃ´ng cá»™ng** | **KhÃ´ng cá»™ng** | Cá»™ng STK nháº­n tiá»n |

**Má»¥c tiÃªu cuá»‘i:** má»i dÃ²ng trong báº£ng trÃªn chá»‰ cÃ²n cá»™t **STK**; cá»™t tá»•ng cÅ© **ngá»«ng dÃ¹ng** cho sá»‘ dÆ° thá»±c.

---

## 4. MÃ´ hÃ¬nh má»¥c tiÃªu â€” thay tháº¿, khÃ´ng song song

### 4.1. Quy táº¯c vÃ ng

1. **Má»™t nguá»“n sá»‘ dÆ° bank duy nháº¥t:** cÃ¡c cá»™t sá»‘ dÆ° trÃªn tá»«ng STK (vÃ  sá»• cÃ¡i Ä‘i kÃ¨m Ä‘á»ƒ tra cá»©u).
2. **Lá»£i nhuáº­n kháº£ dá»¥ng** trÃªn dashboard = **tá»•ng sá»‘ dÆ° cÃ¡c STK Ä‘ang báº­t** â€” khÃ´ng Ä‘á»c láº¡i cá»™t tá»•ng cÅ©.
3. **Má»™t sá»± kiá»‡n tiá»n = má»™t láº§n cáº­p nháº­t STK** â€” khÃ´ng vá»«a cá»™ng cá»™t tá»•ng vá»«a cá»™ng STK (trÃ¡nh lá»‡ch vá» lÃ¢u dÃ i).
4. **Cá»™t tá»•ng cÅ©** cÃ³ thá»ƒ giá»¯ trong database cho lá»‹ch sá»­ / bÃ¡o cÃ¡o thÃ¡ng cÅ©, nhÆ°ng **khÃ´ng cÃ²n lÃ  nÆ¡i ghi sá»‘ dÆ° bank má»›i**.

### 4.2. STK khÃ´ng pháº£i â€œsá»• thá»© haiâ€

| Hiá»ƒu **sai** | Hiá»ƒu **Ä‘Ãºng** |
|--------------|---------------|
| STK lÃ  há»‡ thá»‘ng káº¿ toÃ¡n riÃªng, Ä‘á»™c láº­p vá»›i sá»‘ dÆ° dashboard | STK lÃ  **cÃ¹ng khoáº£n tiá»n bank**, chá»‰ **tÃ¡ch theo tÃ i khoáº£n** |
| Tá»•ng STK vÃ  Lá»£i nhuáº­n kháº£ dá»¥ng cÃ³ thá»ƒ khÃ¡c nhau | Hai sá»‘ **luÃ´n báº±ng nhau** khi chuyá»ƒn xong |
| Pháº£i lÃ m láº¡i toÃ n bá»™ webhook tá»« Ä‘áº§u | Webhook **giá»¯ nguyÃªn** pháº§n nháº­n CK, khá»›p Ä‘Æ¡n, táº¡o biÃªn lai â€” chá»‰ **Ä‘á»•i chá»— ghi sá»‘ dÆ°** |

### 4.3. SÆ¡ Ä‘á»“ tÆ° duy

```
  TRÆ¯á»šC (má»™t cá»™t):
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  Sá»‘ dÆ° bank chung (dashboard/thÃ¡ng)  â”‚  â† webhook +, rÃºt âˆ’, NCC âˆ’
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  SAU (tÃ¡ch theo STK, tá»•ng khÃ´ng Ä‘á»•i):
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚     Lá»£i nhuáº­n kháº£ dá»¥ng (dashboard)    â”‚
  â”‚     = MB + VP + â€¦ (chá»‰ Ä‘á»c tá»•ng)      â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
     â–¼            â–¼            â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”
  â”‚ STK  â”‚    â”‚ STK  â”‚    â”‚ STK  â”‚   â† má»i cá»™ng/trá»« bank ghi á»Ÿ Ä‘Ã¢y
  â”‚  MB  â”‚    â”‚  VP  â”‚    â”‚  â€¦   â”‚
  â””â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”˜
       â”‚           â”‚           â”‚
       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
            Sá»• cÃ¡i (lá»‹ch sá»­
            tá»«ng dÃ²ng vÃ o/ra)
```

---

## 5. CÃ¡c cá»™t trÃªn mÃ n Quáº£n lÃ½ STK â€” Ã½ nghÄ©a

Má»—i STK shop cÃ³ cÃ¡c chá»‰ sá»‘ sau. Táº¥t cáº£ Ä‘á»u mÃ´ táº£ **cÃ¹ng má»™t tÃ i khoáº£n bank**, á»Ÿ má»©c Ä‘á»™ chi tiáº¿t khÃ¡c nhau:

| Cá»™t trÃªn UI | Ã nghÄ©a nghiá»‡p vá»¥ |
|-------------|-------------------|
| **Tá»•ng CK vÃ o** | Tá»•ng tiá»n khÃ¡ch Ä‘Ã£ chuyá»ƒn vÃ o STK nÃ y (tÃ­ch lÅ©y) |
| **ÄÃ£ rÃºt** | Tá»•ng tiá»n Ä‘Ã£ rÃºt vá» vÃ­/cÃ¡ nhÃ¢n tá»« STK nÃ y |
| **Sá»‘ dÆ° / CÃ²n láº¡i** | Tiá»n bank cÃ²n láº¡i trÃªn STK nÃ y theo sá»• há»‡ thá»‘ng |
| **Sá»• cÃ¡i** | Tá»«ng dÃ²ng biáº¿n Ä‘á»™ng: CK vÃ o, rÃºt, nháº­p ngoÃ i, tráº£ NCCâ€¦ |

**Lá»£i nhuáº­n kháº£ dá»¥ng toÃ n shop** = cá»™ng cá»™t **CÃ²n láº¡i** (hoáº·c **Sá»‘ dÆ°**) cá»§a má»i STK Ä‘ang báº­t.

---

## 6. Bá»‘n nhÃ³m giao dá»‹ch â€” ai cá»™ng/trá»« STK nÃ o

### 6.1. Tiá»n VÃ€O bank (cá»™ng sá»‘ dÆ° STK)

| Nguá»“n | STK Ä‘Æ°á»£c cá»™ng | Ghi chÃº |
|--------|---------------|---------|
| **Webhook Sepay** | STK **nháº­n** trong giao dá»‹ch Sepay | Pháº£i trÃ¹ng STK Ä‘Ã£ khai bÃ¡o trong Quáº£n lÃ½ STK |
| **Thanh toÃ¡n thá»§ cÃ´ng** | STK nháº­n (chá»n khi xÃ¡c nháº­n hoáº·c láº¥y tá»« cáº¥u hÃ¬nh) | Cáº§n bá»• sung â€” hiá»‡n chÆ°a cá»™ng STK |
| **NCC hoÃ n tiá»n vá» shop** | STK **nháº­n** tiá»n hoÃ n | Coi nhÆ° tiá»n vÃ o; chá»n STK nháº­n |

**LÆ°u Ã½:** CK vÃ o sá»‘ **chÆ°a khai bÃ¡o** â†’ biÃªn lai váº«n lÆ°u, nhÆ°ng **khÃ´ng tá»± cá»™ng** STK nÃ o. Cáº§n thÃªm STK vÃ o danh sÃ¡ch hoáº·c Ä‘iá»u chá»‰nh sá»• sau Ä‘á»‘i soÃ¡t sao kÃª.

### 6.2. Tiá»n RA bank (trá»« sá»‘ dÆ° STK) â€” báº¯t buá»™c chá»n STK

| Nghiá»‡p vá»¥ | MÃ n hÃ¬nh | Tráº¡ng thÃ¡i |
|-----------|----------|------------|
| **RÃºt tiá»n** | Dashboard hoáº·c Quáº£n lÃ½ STK | ÄÃ£ cÃ³ â€” chá»n STK, trá»« Ä‘Ãºng STK |
| **Nháº­p hÃ ng ngoÃ i luá»“ng** | Supply / log external import | ÄÃ£ cÃ³ â€” chá»n STK chi tráº£ |
| **Thanh toÃ¡n NCC** | XÃ¡c nháº­n chu ká»³ NCC | **Cáº§n bá»• sung** â€” chá»n STK shop dÃ¹ng chuyá»ƒn tiá»n |

Sau má»—i giao dá»‹ch ra:

- Sá»‘ dÆ° **STK Ä‘Ã³** giáº£m Ä‘Ãºng sá»‘ tiá»n.
- **Lá»£i nhuáº­n kháº£ dá»¥ng** (tá»•ng) giáº£m cÃ¹ng sá»‘ tiá»n â€” **tá»± khá»›p**, khÃ´ng cáº§n cáº­p nháº­t thÃªm cá»™t tá»•ng cÅ©.

### 6.3. Loáº¡i dÃ²ng trÃªn sá»• cÃ¡i (tra cá»©u â€œbank nÃ oâ€)

| Loáº¡i | VÃ o / Ra | VÃ­ dá»¥ |
|------|----------|--------|
| CK khÃ¡ch vÃ o | VÃ o (+) | Webhook Ä‘Æ¡n hÃ ng |
| RÃºt vá» vÃ­/cÃ¡ nhÃ¢n | Ra (âˆ’) | RÃºt 5.000.000 tá»« MB |
| Nháº­p hÃ ng ngoÃ i luá»“ng | Ra (âˆ’) | Chi mua hÃ ng renewal tay |
| Thanh toÃ¡n NCC | Ra (âˆ’) | Chá»‘t chu ká»³ tráº£ NCC |
| Äiá»u chá»‰nh (hiáº¿m) | Â± | Admin sá»­a lá»‡ch Ä‘á»‘i soÃ¡t ngÃ¢n hÃ ng |

Má»—i dÃ²ng lÆ°u: thá»i gian, sá»‘ tiá»n, STK, mÃ£ tham chiáº¿u (biÃªn lai, phiáº¿u rÃºt, chu ká»³ NCCâ€¦), ghi chÃº.

---

## 7. Luá»“ng chi tiáº¿t tá»«ng nghiá»‡p vá»¥ (sau khi chuyá»ƒn xong)

### 7.1. KhÃ¡ch chuyá»ƒn khoáº£n (webhook Sepay)

**KhÃ´ng lÃ m láº¡i webhook tá»« Ä‘áº§u.** Pháº§n nháº­n Sepay, khá»›p mÃ£ Ä‘Æ¡n, táº¡o biÃªn lai, cáº­p nháº­t doanh thu/lá»£i nhuáº­n thÃ¡ng â€” **giá»¯ nguyÃªn**.

Chá»‰ Ä‘á»•i bÆ°á»›c ghi sá»‘ dÆ° bank:

1. Sepay bÃ¡o sá»‘ tiá»n + **STK nháº­n**.
2. Há»‡ thá»‘ng táº¡o biÃªn lai (nhÆ° hiá»‡n táº¡i).
3. **Cá»™ng sá»‘ dÆ° STK** khá»›p sá»‘ tÃ i khoáº£n nháº­n.
4. **KhÃ´ng** cá»™ng thÃªm cá»™t tá»•ng cÅ© (khi Ä‘Ã£ chuyá»ƒn xong giai Ä‘oáº¡n 5).

### 7.2. Thanh toÃ¡n thá»§ cÃ´ng

1. Admin xÃ¡c nháº­n Ä‘Æ¡n Ä‘Ã£ nháº­n tiá»n.
2. Chá»n **STK nháº­n** (hoáº·c láº¥y STK máº·c Ä‘á»‹nh).
3. **Cá»™ng sá»‘ dÆ° STK Ä‘Ã³** â€” cÃ¹ng lÃºc vá»›i biÃªn lai, má»™t láº§n duy nháº¥t.

### 7.3. RÃºt tiá»n

1. User chá»n **STK** + sá»‘ tiá»n + lÃ½ do.
2. Má»™t thao tÃ¡c: ghi phiáº¿u rÃºt + **trá»« sá»‘ dÆ° STK**.
3. KhÃ´ng cÃ²n rÃºt â€œchung shopâ€ khÃ´ng chá»‰ rÃµ STK.

### 7.4. Nháº­p hÃ ng ngoÃ i luá»“ng

1. User chá»n **STK chi tráº£** + sá»‘ tiá»n.
2. **Trá»« sá»‘ dÆ° STK** (bÃ¡o cÃ¡o lá»£i nhuáº­n thÃ¡ng váº«n cáº­p nháº­t riÃªng náº¿u cáº§n â€” tÃ¡ch khá»i sá»‘ dÆ° bank).

### 7.5. Thanh toÃ¡n NCC

1. TrÆ°á»›c khi xÃ¡c nháº­n chu ká»³: user **chá»n STK shop** dÃ¹ng chuyá»ƒn tiá»n cho NCC.
2. Khi xÃ¡c nháº­n: **trá»« sá»‘ dÆ° STK** + lÆ°u liÃªn káº¿t chu ká»³ â†” STK.
3. TrÆ°á»ng há»£p NCC tráº£ láº¡i (sá»‘ Ã¢m): chá»n STK nháº­n, **cá»™ng sá»‘ dÆ° STK**.

---

## 8. Webhook vÃ  cá»™t tá»•ng cÅ© â€” cÃ¢u há»i thÆ°á»ng gáº·p

**Há»i: Chuyá»ƒn sang STK cÃ³ pháº£i viáº¿t láº¡i toÃ n bá»™ webhook khÃ´ng?**  
**ÄÃ¡p:** **KhÃ´ng.** Webhook váº«n nháº­n Sepay, táº¡o biÃªn lai, khá»›p Ä‘Æ¡n nhÆ° cÅ©. Chá»‰ **Ä‘á»•i Ä‘Ã­ch ghi sá»‘ dÆ° bank**: tá»« cá»™t tá»•ng cÅ© â†’ sang cá»™t sá»‘ dÆ° STK. Pháº§n webhook **Ä‘Ã£** cÃ³ bÆ°á»›c cá»™ng STK khi CK vÃ o; viá»‡c cÃ²n láº¡i lÃ  **ngá»«ng cá»™ng cá»™t tá»•ng** vÃ  bá»• sung STK cho cÃ¡c nhÃ¡nh cÃ²n thiáº¿u (NCC hoÃ n tiá»n, thanh toÃ¡n thá»§ cÃ´ngâ€¦).

**Há»i: Giai Ä‘oáº¡n chuyá»ƒn tiáº¿p cÃ³ cá»™ng cáº£ hai chá»— khÃ´ng?**  
**ÄÃ¡p:** **Táº¡m thá»i cÃ³ thá»ƒ** (Ä‘ang nhÆ° váº­y vá»›i webhook CK vÃ o). ÄÃ¢y lÃ  bÆ°á»›c trung gian, **khÃ´ng pháº£i thiáº¿t káº¿ cuá»‘i**. Thiáº¿t káº¿ cuá»‘i: **chá»‰ STK**. Dashboard Ä‘á»c tá»•ng STK, khÃ´ng Ä‘á»c cá»™t tá»•ng cÅ© cho sá»‘ kháº£ dá»¥ng hiá»‡n táº¡i.

**Há»i: Cá»™t tá»•ng cÅ© cÃ³ xÃ³a khÃ´ng?**  
**ÄÃ¡p:** CÃ³ thá»ƒ **giá»¯** cho lá»‹ch sá»­ bÃ¡o cÃ¡o thÃ¡ng cÅ© hoáº·c so sÃ¡nh xu hÆ°á»›ng, nhÆ°ng **ngá»«ng cáº­p nháº­t** khi cÃ³ giao dá»‹ch bank má»›i. Sá»‘ dÆ° â€œsá»‘ngâ€ náº±m á»Ÿ STK.

---

## 9. NguyÃªn táº¯c trÃ¡nh lá»‡ch sá»‘

| NguyÃªn táº¯c | Giáº£i thÃ­ch |
|------------|------------|
| **Thay tháº¿, khÃ´ng song song** | Má»™t giao dá»‹ch bank chá»‰ cáº­p nháº­t STK â€” khÃ´ng vá»«a STK vá»«a cá»™t tá»•ng cÅ© |
| **Má»™t sá»± kiá»‡n â€” má»™t láº§n ghi** | CÃ¹ng má»™t biÃªn lai Sepay khÃ´ng Ä‘Æ°á»£c cá»™ng sá»‘ dÆ° hai láº§n |
| **Tá»•ng = cá»™ng STK** | Lá»£i nhuáº­n kháº£ dá»¥ng luÃ´n tÃ­nh báº±ng tá»•ng sá»‘ dÆ° STK, khÃ´ng tÃ­nh láº¡i tá»« biÃªn lai má»—i láº§n má»Ÿ trang |
| **STK pháº£i khá»›p Sepay** | Sá»‘ tÃ i khoáº£n trong Quáº£n lÃ½ STK pháº£i trÃ¹ng sá»‘ nháº­n trÃªn biÃªn lai |
| **Giao dá»‹ch trong má»™t gÃ³i** | RÃºt tiá»n = táº¡o phiáº¿u + trá»« STK â€” lá»—i giá»¯a chá»«ng thÃ¬ hoÃ n tÃ¡c cáº£ gÃ³i |
| **Äiá»u chá»‰nh tay** | Chá»‰ khi Ä‘á»‘i soÃ¡t sao kÃª bank tháº¥y lá»‡ch; ghi rÃµ lÃ½ do trÃªn sá»• cÃ¡i |

---

## 10. Chuyá»ƒn dá»¯ liá»‡u cÅ© (má»™t láº§n)

Khi báº­t mÃ´ hÃ¬nh STK trÃªn mÃ´i trÆ°á»ng Ä‘Ã£ cháº¡y lÃ¢u:

1. **Khai bÃ¡o Ä‘á»§ STK** shop Ä‘ang dÃ¹ng (MB, VPâ€¦).
2. **Backfill má»™t láº§n:** phÃ¢n bá»• sá»‘ dÆ° lá»‹ch sá»­ vÃ o tá»«ng STK dá»±a trÃªn biÃªn lai Sepay (STK nháº­n) vÃ  cÃ¡c khoáº£n rÃºt/chi Ä‘Ã£ ghi â€” sao cho **tá»•ng STK â‰ˆ sá»‘ dÆ° cá»™t tá»•ng cÅ©** táº¡i thá»i Ä‘iá»ƒm chuyá»ƒn.
3. Tá»« thá»i Ä‘iá»ƒm go-live trá»Ÿ Ä‘i: má»i giao dá»‹ch má»›i **chá»‰** ghi STK.
4. Lá»‹ch sá»­ rÃºt/NCC cÅ© cÃ³ thá»ƒ **khÃ´ng Ä‘á»§ chi tiáº¿t STK** â€” cháº¥p nháº­n; tá»« ngÃ y chuyá»ƒn trá»Ÿ Ä‘i má»›i Ä‘áº§y Ä‘á»§.

---

## 11. Lá»™ trÃ¬nh triá»ƒn khai

### Giai Ä‘oáº¡n 1 â€” Ná»n táº£ng (Ä‘Ã£ / Ä‘ang cÃ³)

- Báº£ng STK + cá»™t sá»‘ dÆ°, tá»•ng CK vÃ o, Ä‘Ã£ rÃºt.
- Sá»• cÃ¡i STK + webhook CK vÃ o (khi STK khá»›p).
- RÃºt tiá»n & nháº­p ngoÃ i luá»“ng: chá»n STK, trá»« STK.
- Dashboard **Lá»£i nhuáº­n kháº£ dá»¥ng** Ä‘á»c **tá»•ng sá»‘ dÆ° STK** (khÃ´ng Ä‘á»c cá»™t tá»•ng cÅ© cho thÃ¡ng hiá»‡n táº¡i).

### Giai Ä‘oáº¡n 2 â€” Thanh toÃ¡n NCC

- Form chá»‘t chu ká»³: thÃªm **chá»n STK**.
- XÃ¡c nháº­n thanh toÃ¡n: **trá»« STK** thay vÃ¬ chá»‰ trá»« cá»™t tá»•ng cÅ©.
- Hiá»ƒn thá»‹ STK trÃªn lá»‹ch sá»­ thanh toÃ¡n NCC.

### Giai Ä‘oáº¡n 3 â€” Thanh toÃ¡n thá»§ cÃ´ng

- XÃ¡c nháº­n TT tay: chá»n STK + **cá»™ng sá»‘ dÆ° STK**.
- RÃ  soÃ¡t má»i Ä‘Æ°á»ng táº¡o biÃªn lai khÃ´ng qua Sepay.

### Giai Ä‘oáº¡n 4 â€” BÃ¡o cÃ¡o & Ä‘á»‘i soÃ¡t

- MÃ n lá»‹ch sá»­ sá»• cÃ¡i STK (lá»c, xuáº¥t).
- Cáº£nh bÃ¡o: sá»‘ dÆ° STK Ã¢m, CK vÃ o STK chÆ°a khai bÃ¡o.
- (Tuá»³ chá»n) Snapshot cuá»‘i thÃ¡ng tá»•ng STK Ä‘á»ƒ so sÃ¡nh xu hÆ°á»›ng.

### Giai Ä‘oáº¡n 5 â€” Ngá»«ng dÃ¹ng cá»™t tá»•ng cÅ© cho sá»‘ dÆ° bank

- Webhook, rÃºt, nháº­p ngoÃ i, NCC, hoÃ n tiá»nâ€¦ **khÃ´ng cÃ²n** cá»™ng/trá»« cá»™t tá»•ng cÅ©.
- Má»™t nguá»“n sá»‘ dÆ° bank duy nháº¥t: **cÃ¡c cá»™t trÃªn STK**.
- Cá»™t tá»•ng cÅ© giá»¯ láº¡i chá»‰ phá»¥c vá»¥ lá»‹ch sá»­ / bÃ¡o cÃ¡o DT-LN thÃ¡ng náº¿u cáº§n.

---

## 12. CÃ¢u há»i thÆ°á»ng gáº·p (nghiá»‡p vá»¥)

**Há»i: Lá»£i nhuáº­n kháº£ dá»¥ng vÃ  tá»•ng â€œCÃ²n láº¡iâ€ trÃªn Quáº£n lÃ½ STK cÃ³ luÃ´n báº±ng nhau?**  
**ÄÃ¡p:** **CÃ³** â€” Ä‘Ã³ lÃ  cÃ¹ng má»™t khoáº£n tiá»n; dashboard lÃ  tá»•ng, mÃ n STK lÃ  tÃ¡ch theo tÃ i khoáº£n.

**Há»i: Ba STK, rÃºt tá»« VP 5 triá»‡u thÃ¬ MB cÃ³ bá»‹ trá»« khÃ´ng?**  
**ÄÃ¡p:** **KhÃ´ng.** Chá»‰ VP giáº£m 5 triá»‡u; tá»•ng shop giáº£m 5 triá»‡u.

**Há»i: Tráº£ NCC 10 triá»‡u tá»« MB, tra cá»©u á»Ÿ Ä‘Ã¢u?**  
**ÄÃ¡p:** Sá»• cÃ¡i STK MB, dÃ²ng thanh toÃ¡n NCC, gáº¯n mÃ£ chu ká»³ / NCC.

**Há»i: CK vÃ o STK chÆ°a khai bÃ¡o?**  
**ÄÃ¡p:** BiÃªn lai váº«n cÃ³; sá»‘ dÆ° STK khÃ´ng tÄƒng â€” thÃªm STK hoáº·c Ä‘iá»u chá»‰nh sá»• sau Ä‘á»‘i soÃ¡t.

**Há»i: STK vÃ  cá»™t tá»•ng cÅ© khÃ¡c nhau sau khi chuyá»ƒn?**  
**ÄÃ¡p:** Trong giai Ä‘oáº¡n chuyá»ƒn tiáº¿p cÃ³ thá»ƒ lá»‡ch táº¡m (má»™t sá»‘ nhÃ¡nh chÆ°a chuyá»ƒn sang STK). Sau giai Ä‘oáº¡n 5 pháº£i khá»›p: **tá»•ng STK = sá»‘ kháº£ dá»¥ng**.

**Há»i: Sá»‘ dÆ° STK cÃ³ pháº£i tÃ­nh láº¡i tá»« biÃªn lai má»—i láº§n má»Ÿ trang?**  
**ÄÃ¡p:** **KhÃ´ng.** Sá»‘ dÆ° lÆ°u trÃªn STK vÃ  cáº­p nháº­t khi cÃ³ giao dá»‹ch; sá»• cÃ¡i Ä‘á»ƒ tra cá»©u chi tiáº¿t.

---

## 13. TÃ³m táº¯t

| KhÃ­a cáº¡nh | Ná»™i dung |
|-----------|----------|
| **Báº£n cháº¥t** | Sá»‘ dÆ° STK = cá»™t tá»•ng cÅ© **tÃ¡ch theo tÃ i khoáº£n**, khÃ´ng pháº£i há»‡ thá»‘ng tiá»n thá»© hai |
| **Tá»•ng shop** | Lá»£i nhuáº­n kháº£ dá»¥ng = cá»™ng sá»‘ dÆ° cÃ¡c STK |
| **Ghi nháº­n** | Má»i vÃ o/ra bank cá»™ng/trá»« **Ä‘Ãºng STK** |
| **Webhook** | Giá»¯ luá»“ng hiá»‡n táº¡i; chá»‰ Ä‘á»•i **chá»— ghi sá»‘ dÆ°**, khÃ´ng viáº¿t láº¡i tá»« Ä‘áº§u |
| **Cá»™t tá»•ng cÅ©** | Ngá»«ng dÃ¹ng cho sá»‘ dÆ° má»›i; STK lÃ  nguá»“n sá»± tháº­t |
| **Má»¥c Ä‘Ã­ch** | Biáº¿t rÃµ bank nÃ o, quáº£n lÃ½ dÃ²ng tiá»n rÃµ rÃ ng, má»™t luá»“ng thá»‘ng nháº¥t |

---

*PhiÃªn báº£n tÃ i liá»‡u: 2026-05 â€” pháº£n Ã¡nh tÆ° duy â€œthay tháº¿ cá»™t tá»•ng báº±ng phÃ¢n rÃ£ STKâ€, khÃ´ng pháº£i hai sá»• song song.*


## --- [test-cases-cong-tien-vao-bank.md] ---

# Test case â€” kiá»ƒm tra cá»™ng tiá»n vÃ o bank (credit)

Má»¥c tiÃªu: Ä‘áº£m báº£o **khÃ´ng cÃ³ chá»— nÃ o cá»™ng tiá»n hai láº§n** vÃ o sá»‘ dÆ° bank shop sau khi Ä‘Ã£ chá»‰nh sang dÃ¹ng STK lÃ m sá»• chÃ­nh.

Quy Æ°á»›c:
- **STK** = sá»‘ dÆ° trÃªn tá»«ng tÃ i khoáº£n (sá»• má»›i â€” nguá»“n sá»± tháº­t).
- **Sá»• tá»•ng cÅ©** = cá»™t sá»‘ dÆ° bank Æ°á»›c tÃ­nh trÃªn bÃ¡o cÃ¡o thÃ¡ng dashboard (legacy).
- **Lá»£i nhuáº­n kháº£ dá»¥ng** (UI dashboard) = tá»•ng sá»‘ dÆ° STK Ä‘ang báº­t, **khÃ´ng** Ä‘á»c sá»• tá»•ng cÅ©.

---

## 1. Báº£ng tá»•ng káº¿t cÃ¡c Ä‘Æ°á»ng cÃ³ thá»ƒ cá»™ng tiá»n vÃ o bank

| # | TÃ¬nh huá»‘ng | Cá»™ng STK | Cá»™ng sá»• tá»•ng cÅ© | CÃ³ dedup | Tráº¡ng thÃ¡i |
|---|------------|----------|------------------|----------|------------|
| 1 | Webhook Sepay nháº­n CK má»›i | **CÃ³** | KhÃ´ng | Theo mÃ£ biÃªn lai | An toÃ n |
| 2 | HoÃ n thÃ nh Ä‘Æ¡n â€œwebhook thá»§ cÃ´ngâ€ | **CÃ³** | KhÃ´ng | Theo mÃ£ biÃªn lai | An toÃ n |
| 3 | NCC hoÃ n tiá»n cho shop (xÃ¡c nháº­n chu ká»³ vá»›i ná»™i dung khá»›p biÃªn lai Sepay) | **CÃ³** (cÃ¹ng biÃªn lai vá»›i webhook) | KhÃ´ng | Theo mÃ£ biÃªn lai | An toÃ n |
| 4 | Há»§y hoÃ n tiá»n khÃ¡ch (Ä‘Æ¡n rá»i khá»i tráº¡ng thÃ¡i hoÃ n) | KhÃ´ng | **CÃ³** (legacy) | KhÃ´ng | **Lá»‡ch â€” cáº§n kháº¯c phá»¥c** |
| 5 | ÄÆ¡n MAVN ná»™i bá»™ rá»›t khá»i tráº¡ng thÃ¡i ÄÃ£ Thanh ToÃ¡n (Ä‘á»“ng bá»™ chi phÃ­) | KhÃ´ng | **CÃ³** (legacy) | KhÃ´ng | **Lá»‡ch â€” cáº§n kháº¯c phá»¥c** |

Káº¿t luáº­n sÆ¡ bá»™: **khÃ´ng cÃ³ double credit** trÃªn STK. Sá»• tá»•ng cÅ© vÃ  STK khÃ´ng bao giá» cÃ¹ng tÄƒng cho má»™t sá»± kiá»‡n. NhÆ°ng **tÃ¬nh huá»‘ng 4 vÃ  5 khÃ´ng cá»™ng STK** â€” Ä‘Ã³ lÃ  **gap (thiáº¿u)**, khÃ´ng pháº£i double.

---

## 2. CÆ¡ cháº¿ chá»‘ng double â€” vÃ¬ sao an toÃ n

Má»—i láº§n ghi sá»• STK Ä‘á»u cÃ³ khÃ³a chá»‘ng trÃ¹ng:

- ÄÆ°á»ng ghi â€œtiá»n vÃ oâ€ theo biÃªn lai khÃ³a theo **mÃ£ biÃªn lai** (`source_kind = payment_receipt`, `source_id = receipt_id`).
- Náº¿u cÃ¹ng biÃªn lai gá»i cá»™ng STK láº§n thá»© hai (webhook cháº¡y láº¡i, hoáº·c admin xÃ¡c nháº­n NCC hoÃ n trÃ¹ng) â†’ bá»‹ **bá» qua tá»± Ä‘á»™ng**, khÃ´ng cá»™ng Ä‘Ãºp.
- Webhook chá»‰ gá»i cá»™ng STK khi biÃªn lai **vá»«a Ä‘Æ°á»£c táº¡o má»›i** (cá» `inserted = true`); biÃªn lai trÃ¹ng láº·p sáº½ khÃ´ng kÃ­ch hoáº¡t cá»™ng láº¡i.

---

## 3. Test case chi tiáº¿t

### TC-01 â€” Webhook Sepay nháº­n CK Ä‘Ãºng STK Ä‘Ã£ khai bÃ¡o

**Má»¥c Ä‘Ã­ch:** Kiá»ƒm tra CK khÃ¡ch chuyá»ƒn vÃ o STK MB cá»™ng Ä‘Ãºng STK MB, **khÃ´ng** cá»™ng sá»• tá»•ng cÅ©, **khÃ´ng** double.

**Chuáº©n bá»‹:**
- Trong Quáº£n lÃ½ STK Ä‘Ã£ khai bÃ¡o STK MB vá»›i sá»‘ tÃ i khoáº£n trÃ¹ng sá»‘ nháº­n Sepay.
- Ghi nháº­n sá»‘ dÆ° STK MB hiá»‡n táº¡i (gá»i lÃ  **A**) vÃ  sá»• tá»•ng cÅ© thÃ¡ng hiá»‡n táº¡i (gá»i lÃ  **B**).

**BÆ°á»›c:**
1. Gá»­i (hoáº·c giáº£ láº­p) má»™t webhook Sepay 1.000.000 Ä‘ vÃ o STK MB, kÃ¨m mÃ£ Ä‘Æ¡n há»£p lá»‡.
2. Äá»£i response 200.

**Ká»³ vá»ng:**
- Sá»‘ dÆ° STK MB = **A + 1.000.000**.
- Tá»•ng CK vÃ o cá»§a STK MB tÄƒng Ä‘Ãºng 1.000.000.
- Sá»• tá»•ng cÅ© váº«n = **B** (khÃ´ng Ä‘á»•i).
- Sá»• cÃ¡i STK cÃ³ **Ä‘Ãºng má»™t dÃ²ng** loáº¡i â€œtiá»n vÃ o theo biÃªn laiâ€, gáº¯n mÃ£ biÃªn lai má»›i.
- Dashboard Lá»£i nhuáº­n kháº£ dá»¥ng tÄƒng 1.000.000.

**Dáº¥u hiá»‡u sai (cáº§n bÃ¡o lá»—i):**
- Sá»‘ dÆ° STK MB tÄƒng quÃ¡ 1.000.000 â†’ double trÃªn STK.
- Sá»• tá»•ng cÅ© tÄƒng â†’ cÃ³ nhÃ¡nh code cÅ© chÆ°a gá»¡.
- Sá»• cÃ¡i STK cÃ³ 2 dÃ²ng cho cÃ¹ng biÃªn lai â†’ dedup há»ng.

---

### TC-02 â€” Webhook Sepay nháº­n CK vÃ o STK **chÆ°a khai bÃ¡o**

**Má»¥c Ä‘Ã­ch:** Sá»‘ tiá»n láº¡c, khÃ´ng cá»™ng Ä‘Ã¢u cáº£ â†’ cáº§n cáº£nh bÃ¡o, khÃ´ng gÃ¢y double sau nÃ y.

**Chuáº©n bá»‹:** Sá»‘ tÃ i khoáº£n nháº­n **khÃ´ng** cÃ³ trong Quáº£n lÃ½ STK.

**BÆ°á»›c:** Giáº£ láº­p webhook 500.000 Ä‘.

**Ká»³ vá»ng:**
- BiÃªn lai váº«n Ä‘Æ°á»£c táº¡o (lá»‹ch sá»­ nháº­n tiá»n cÃ³).
- **KhÃ´ng** STK nÃ o tÄƒng.
- Sá»• tá»•ng cÅ© **khÃ´ng** Ä‘á»•i.
- Dashboard Lá»£i nhuáº­n kháº£ dá»¥ng **khÃ´ng** Ä‘á»•i.

**Háº­u test:** VÃ o Quáº£n lÃ½ STK thÃªm STK Ä‘Ã³ â†’ cháº¡y láº¡i webhook (Sepay sáº½ retry) â†’ ká»³ vá»ng **bÃ¢y giá»** má»›i cá»™ng STK Ä‘Ãºng sá»‘ tiá»n (khÃ´ng bá»‹ double dÃ¹ láº§n Ä‘áº§u Ä‘Ã£ thá»­).

---

### TC-03 â€” Webhook gá»­i Láº I cÃ¹ng giao dá»‹ch (replay)

**Má»¥c Ä‘Ã­ch:** Äáº£m báº£o webhook nháº­n **trÃ¹ng** khÃ´ng táº¡o biÃªn lai má»›i vÃ  khÃ´ng cá»™ng STK hai láº§n.

**BÆ°á»›c:**
1. Gá»i webhook láº§n 1 vá»›i má»™t giao dá»‹ch (giá»‘ng TC-01).
2. Gá»i webhook láº§n 2 vá»›i **cÃ¹ng** payload (cÃ¹ng id Sepay).

**Ká»³ vá»ng:**
- Láº§n 2 tráº£ vá» duplicate hoáº·c skipped.
- Sá»‘ dÆ° STK chá»‰ tÄƒng **má»™t láº§n** (tá»•ng = A + 1.000.000).
- Sá»• cÃ¡i STK chá»‰ cÃ³ **má»™t** dÃ²ng cho biÃªn lai.

---

### TC-04 â€” HoÃ n thÃ nh Ä‘Æ¡n báº±ng webhook thá»§ cÃ´ng (admin xÃ¡c nháº­n tay)

**Má»¥c Ä‘Ã­ch:** NhÃ¡nh â€œtáº¡o biÃªn lai tay khi Ä‘Æ¡n khÃ´ng cÃ³ webhook tá»± Ä‘á»™ngâ€ pháº£i cá»™ng STK Ä‘Ãºng, khÃ´ng double, khÃ´ng Ä‘á»¥ng sá»• tá»•ng cÅ©.

**Chuáº©n bá»‹:**
- CÃ³ má»™t Ä‘Æ¡n Ä‘ang á»Ÿ tráº¡ng thÃ¡i xá»­ lÃ½ (chÆ°a thanh toÃ¡n), giÃ¡ bÃ¡n 800.000 Ä‘.
- Trong Quáº£n lÃ½ STK cÃ³ Ã­t nháº¥t má»™t STK Ä‘ang báº­t (sáº½ lÃ m STK máº·c Ä‘á»‹nh).

**BÆ°á»›c:**
1. VÃ o mÃ n Ä‘Æ¡n â†’ nÃºt â€œHoÃ n thÃ nh thá»§ cÃ´ngâ€ â†’ chá»n STK nháº­n (hoáº·c dÃ¹ng STK máº·c Ä‘á»‹nh).
2. XÃ¡c nháº­n.

**Ká»³ vá»ng:**
- Sá»‘ dÆ° STK Ä‘Ã£ chá»n tÄƒng Ä‘Ãºng 800.000.
- Sá»• tá»•ng cÅ© khÃ´ng Ä‘á»•i.
- BiÃªn lai má»›i Ä‘Æ°á»£c táº¡o, cÃ³ ghi STK nháº­n.
- Sá»• cÃ¡i STK cÃ³ **má»™t** dÃ²ng loáº¡i â€œtiá»n vÃ o theo biÃªn laiâ€.
- ÄÆ¡n chuyá»ƒn sang ÄÃ£ Thanh ToÃ¡n; doanh thu / lá»£i nhuáº­n thÃ¡ng tÄƒng Ä‘Ãºng (Ä‘Æ°á»ng khÃ¡c, khÃ´ng Ä‘á»¥ng sá»‘ dÆ° bank thÃªm láº§n ná»¯a).

**Dáº¥u hiá»‡u sai:**
- STK tÄƒng hai láº§n (1.600.000) â†’ cÃ³ nhÃ¡nh cá»™ng Ä‘Ãºp.
- Sá»‘ dÆ° STK tÄƒng Ä‘Ãºng nhÆ°ng sá»• tá»•ng cÅ© cÅ©ng tÄƒng â†’ cÃ²n code cÅ© chÆ°a gá»¡.

---

### TC-05 â€” NCC hoÃ n tiá»n cho shop (chá»‘t chu ká»³ NCC vá»›i ná»™i dung khá»›p biÃªn lai Sepay)

**Má»¥c Ä‘Ã­ch:** Khi NCC chuyá»ƒn tráº£ tiá»n, webhook **Ä‘Ã£** táº¡o biÃªn lai vÃ  cá»™ng STK. Khi admin chá»‘t chu ká»³ NCC vá»›i ná»™i dung khá»›p biÃªn lai Ä‘Ã³ â†’ **khÃ´ng** cá»™ng STK láº§n hai.

**Chuáº©n bá»‹:**
- Webhook Sepay Ä‘Ã£ nháº­n má»™t CK tá»« NCC, vÃ­ dá»¥ 2.000.000 Ä‘ vÃ o STK MB; biÃªn lai Ä‘Ã£ cÃ³ vÃ  STK MB Ä‘Ã£ Ä‘Æ°á»£c cá»™ng (giá»‘ng TC-01).
- CÃ³ má»™t NCC Ä‘ang â€œná»£ shopâ€ Ä‘Ãºng sá»‘ tiá»n 2.000.000 Ä‘ (log NCC tá»•ng sá»‘ Ã¢m).

**BÆ°á»›c:**
1. VÃ o chi tiáº¿t NCC â†’ â€œXÃ¡c nháº­n thanh toÃ¡n chu ká»³â€.
2. Nháº­p ná»™i dung thanh toÃ¡n khá»›p ghi chÃº/biÃªn lai (vÃ­ dá»¥ mÃ£ chuyá»ƒn khoáº£n).
3. Chá»n STK shop (hoáº·c dÃ¹ng máº·c Ä‘á»‹nh).
4. XÃ¡c nháº­n.

**Ká»³ vá»ng:**
- Há»‡ thá»‘ng tÃ¬m tháº¥y biÃªn lai khá»›p â†’ **khÃ´ng** cá»™ng STK láº§n hai (Ä‘Ã£ cÃ³ dÃ²ng sá»• cho biÃªn lai Ä‘Ã³).
- Sá»‘ dÆ° STK MB **giá»¯ nguyÃªn** so vá»›i sau bÆ°á»›c webhook (Ä‘Ã£ Ä‘Ãºng).
- Log chu ká»³ NCC Ä‘Æ°á»£c táº¡o (sá»‘ tiá»n Ã¢m = NCC tráº£ shop), Ä‘Ã¡nh dáº¥u cÃ¡c log NCC chÆ°a thanh toÃ¡n thÃ nh Ä‘Ã£ thanh toÃ¡n.

**Dáº¥u hiá»‡u sai:**
- STK MB tÄƒng thÃªm 2.000.000 láº§n thá»© hai â†’ **double credit** (dedup há»ng).

---

### TC-06 â€” Hai webhook khÃ¡c nhau, hai STK khÃ¡c nhau

**Má»¥c Ä‘Ã­ch:** Äáº£m báº£o khÃ´ng cá»™ng nháº§m STK; má»—i STK chá»‰ tÄƒng pháº§n tiá»n cá»§a mÃ¬nh.

**Chuáº©n bá»‹:** CÃ³ STK MB vÃ  STK VP, cáº£ hai Ä‘Ã£ khai bÃ¡o.

**BÆ°á»›c:**
1. Webhook 1: 500.000 Ä‘ vÃ o STK MB.
2. Webhook 2: 700.000 Ä‘ vÃ o STK VP.

**Ká»³ vá»ng:**
- STK MB tÄƒng Ä‘Ãºng 500.000, STK VP tÄƒng Ä‘Ãºng 700.000.
- Tá»•ng kháº£ dá»¥ng tÄƒng Ä‘Ãºng 1.200.000.
- Má»—i STK cÃ³ má»™t dÃ²ng sá»• cÃ¡i riÃªng.

**Dáº¥u hiá»‡u sai:**
- MB tÄƒng 1.200.000 / VP tÄƒng 0 â†’ cá»™ng nháº§m.
- MB tÄƒng 1.200.000 / VP tÄƒng 1.200.000 â†’ double + cá»™ng nháº§m (ráº¥t tá»‡).

---

### TC-07 â€” BiÃªn lai cÃ³ nhiá»u mÃ£ Ä‘Æ¡n (batch)

**Má»¥c Ä‘Ã­ch:** Má»™t biÃªn lai tráº£ nhiá»u Ä‘Æ¡n (mÃ£ batch) chá»‰ cá»™ng STK **má»™t láº§n**.

**BÆ°á»›c:** Webhook nháº­n má»™t biÃªn lai 1.500.000 Ä‘ kÃ¨m mÃ£ batch trá» Ä‘áº¿n 3 Ä‘Æ¡n 500.000 má»—i Ä‘Æ¡n.

**Ká»³ vá»ng:**
- STK tÄƒng Ä‘Ãºng 1.500.000 (má»™t láº§n).
- Sá»• cÃ¡i STK cÃ³ **má»™t** dÃ²ng tham chiáº¿u má»™t biÃªn lai.
- 3 Ä‘Æ¡n Ä‘á»u cáº­p nháº­t doanh thu/tráº¡ng thÃ¡i nhÆ°ng **khÃ´ng** cá»™ng sá»‘ dÆ° bank thÃªm láº§n nÃ o.

**Dáº¥u hiá»‡u sai:**
- STK tÄƒng 4.500.000 (cá»™ng theo tá»«ng Ä‘Æ¡n) â†’ double náº·ng.

---

### TC-08 â€” Sau khi Ä‘Ã£ PAID, biÃªn lai bá»• sung (off-flow)

**Má»¥c Ä‘Ã­ch:** Khi Ä‘Æ¡n Ä‘Ã£ PAID mÃ  váº«n cÃ³ CK bá»• sung, há»‡ thá»‘ng ghi nháº­n â€œngoÃ i luá»“ngâ€ cho bÃ¡o cÃ¡o, **khÃ´ng** double sá»‘ dÆ° bank.

**Chuáº©n bá»‹:** Má»™t Ä‘Æ¡n Ä‘Ã£ á»Ÿ tráº¡ng thÃ¡i ÄÃ£ Thanh ToÃ¡n.

**BÆ°á»›c:** Webhook nháº­n thÃªm má»™t biÃªn lai gáº¯n cÃ¹ng mÃ£ Ä‘Æ¡n Ä‘Ã³ (vÃ­ dá»¥ khÃ¡ch tráº£ dÆ°).

**Ká»³ vá»ng:**
- BiÃªn lai má»›i Ä‘Æ°á»£c táº¡o.
- STK tÄƒng Ä‘Ãºng sá»‘ tiá»n dÆ° (cá»™ng theo biÃªn lai má»›i).
- Cá»™t thá»‘ng kÃª â€œoff-flow bank receiptâ€ tÄƒng (bÃ¡o cÃ¡o riÃªng).
- Sá»• tá»•ng cÅ© **khÃ´ng** tÄƒng.

**Dáº¥u hiá»‡u sai:**
- STK tÄƒng + sá»• tá»•ng cÅ© tÄƒng â†’ cá»™ng Ä‘Ãºp.
- STK khÃ´ng tÄƒng (chá»‰ ghi bÃ¡o cÃ¡o) â†’ thiáº¿u, khÃ´ng pháº£i double, nhÆ°ng cáº§n xem láº¡i nghiá»‡p vá»¥.

---

## 4. Hai chá»— váº«n dÃ¹ng sá»• tá»•ng cÅ© (gap Ä‘Ã£ biáº¿t â€” khÃ´ng pháº£i double, lÃ  thiáº¿u)

Sau khi rÃ  soÃ¡t, **khÃ´ng** cÃ³ double credit, nhÆ°ng **cÃ²n hai chá»— chÆ°a chuyá»ƒn sang STK** (cá»™ng sá»• tá»•ng cÅ© nhÆ°ng STK Ä‘á»©ng yÃªn):

### TC-09 â€” Há»§y hoÃ n tiá»n khÃ¡ch (Ä‘Æ¡n rá»i khá»i tráº¡ng thÃ¡i hoÃ n)

**TÃ¬nh huá»‘ng:** Má»™t Ä‘Æ¡n tá»«ng vÃ o tráº¡ng thÃ¡i hoÃ n tiá»n (tiá»n Ä‘Ã£ trá»« bank trÆ°á»›c Ä‘Ã³), nay Ä‘Æ°á»£c â€œgá»¡ hoÃ nâ€ â†’ tiá»n â€œtrá»Ÿ vá»â€ bank.

**Hiá»‡n tráº¡ng:** Cá»™ng vÃ o **sá»• tá»•ng cÅ©**; **khÃ´ng** cá»™ng STK.

**Ká»³ vá»ng (sau khi gom luá»“ng):** Cá»™ng Ä‘Ãºng STK Ä‘Ã£ trá»« trÆ°á»›c Ä‘Ã³.

**CÃ¡ch quan sÃ¡t:** VÃ o Ä‘Æ¡n Ä‘Ã³, Ä‘áº£o tráº¡ng thÃ¡i khá»i hoÃ n â†’ so sÃ¡nh sá»‘ dÆ° STK vÃ  sá»• tá»•ng cÅ© trÆ°á»›c/sau:
- STK: khÃ´ng Ä‘á»•i (sai theo mÃ´ hÃ¬nh má»›i).
- Sá»• tá»•ng cÅ©: tÄƒng (legacy).

---

### TC-10 â€” ÄÆ¡n MAVN ná»™i bá»™ rá»›t khá»i tráº¡ng thÃ¡i ÄÃ£ Thanh ToÃ¡n

**TÃ¬nh huá»‘ng:** Má»™t Ä‘Æ¡n MAVN NCC ná»™i bá»™ Ä‘Ã£ PAID nay Ä‘á»•i sang tráº¡ng thÃ¡i khÃ¡c â†’ Ä‘á»“ng bá»™ chi phÃ­ Form Ä‘áº£o láº¡i, lá»£i nhuáº­n vÃ  bank Ä‘Æ°á»£c â€œtráº£ láº¡iâ€.

**Hiá»‡n tráº¡ng:** Cá»™ng vÃ o **sá»• tá»•ng cÅ©**; **khÃ´ng** cá»™ng STK.

**Ká»³ vá»ng (sau khi gom luá»“ng):** Cá»™ng STK Ä‘Ã£ trá»« ban Ä‘áº§u (cáº§n lÆ°u STK Ä‘Ã£ trá»« trÃªn log chi phÃ­ MAVN).

---

## 5. Quy trÃ¬nh kiá»ƒm tra (chung cho má»i test case)

TrÆ°á»›c má»—i test:

1. Ghi nháº­n **sá»‘ dÆ° tá»«ng STK** Ä‘ang báº­t.
2. Ghi nháº­n **sá»• tá»•ng cÅ©** cá»§a thÃ¡ng hiá»‡n táº¡i.
3. Ghi nháº­n **Lá»£i nhuáº­n kháº£ dá»¥ng** hiá»ƒn thá»‹ trÃªn dashboard.
4. Äáº¿m sá»‘ dÃ²ng sá»• cÃ¡i STK liÃªn quan (náº¿u cáº§n Ä‘á»‘i chiáº¿u chi tiáº¿t).

Sau má»—i test, kiá»ƒm:

- Tá»•ng STK = giÃ¡ trá»‹ ban Ä‘áº§u **Â± Ä‘Ãºng sá»‘ tiá»n cá»§a test** (khÃ´ng lá»‡ch má»™t Ä‘á»“ng).
- Lá»£i nhuáº­n kháº£ dá»¥ng = tá»•ng STK má»›i (luÃ´n khá»›p).
- Sá»• tá»•ng cÅ©: chá»‰ thay Ä‘á»•i náº¿u test Ä‘Ã³ thuá»™c TC-09 / TC-10 (gap Ä‘Ã£ biáº¿t).
- Sá»• cÃ¡i STK: **khÃ´ng** cÃ³ dÃ²ng nÃ o trÃ¹ng `(loáº¡i = tiá»n vÃ o, mÃ£ biÃªn lai)`.
- Cá» trÃªn biÃªn lai (Ä‘Ã£ ghi tÃ i chÃ­nh / Ä‘Ã£ cá»™ng STK) Ä‘Ãºng tráº¡ng thÃ¡i.

CÃ¢u truy váº¥n nhanh Ä‘á»ƒ soi double trÃªn sá»• cÃ¡i STK (cháº¡y trÃªn SQL editor):

```sql
SELECT source_kind, source_id, COUNT(*) AS so_dong
FROM admin.shop_bank_account_ledger
WHERE source_kind = 'payment_receipt'
GROUP BY source_kind, source_id
HAVING COUNT(*) > 1;
```

- Tráº£ vá» **rá»—ng** â†’ an toÃ n, khÃ´ng cÃ³ biÃªn lai nÃ o bá»‹ cá»™ng STK hai láº§n.
- Tráº£ vá» cÃ³ dÃ²ng â†’ Ä‘Ã³ lÃ  biÃªn lai bá»‹ double, cáº§n kiá»ƒm tra ngay.

---

## 6. Káº¿t luáº­n sau rÃ  soÃ¡t

| KhÃ­a cáº¡nh | Káº¿t quáº£ |
|-----------|---------|
| Webhook CK vÃ o | Chá»‰ cá»™ng STK, khÃ´ng cá»™ng sá»• tá»•ng cÅ© â€” **an toÃ n** |
| Webhook thá»§ cÃ´ng | Chá»‰ cá»™ng STK â€” **an toÃ n** |
| NCC hoÃ n tiá»n cho shop | Cá»™ng STK dÃ¹ng chung biÃªn lai vá»›i webhook â€” dedup theo mÃ£ biÃªn lai â€” **an toÃ n** |
| Replay / batch / off-flow | CÃ³ dedup theo biÃªn lai â€” **an toÃ n** |
| Há»§y hoÃ n tiá»n khÃ¡ch | CÃ²n dÃ¹ng sá»• tá»•ng cÅ© â€” **gap (thiáº¿u)**, khÃ´ng pháº£i double |
| ÄÆ¡n MAVN rá»›t tráº¡ng thÃ¡i | CÃ²n dÃ¹ng sá»• tá»•ng cÅ© â€” **gap (thiáº¿u)**, khÃ´ng pháº£i double |

**KhÃ´ng tÃ¬m tháº¥y Ä‘iá»ƒm nÃ o Ä‘ang cá»™ng Ä‘Ãºp tiá»n vÃ o bank.** Pháº§n cá»™ng tiá»n (credit) Ä‘Ã£ chuyá»ƒn sáº¡ch sang STK vá»›i dedup theo mÃ£ biÃªn lai. CÃ¡c nhÃ¡nh cÃ²n láº¡i (TC-09, TC-10) lÃ  **gap chÆ°a chuyá»ƒn** chá»© khÃ´ng pháº£i double, cÃ³ thá»ƒ xá»­ lÃ½ á»Ÿ giai Ä‘oáº¡n 2â€“3 cá»§a lá»™ trÃ¬nh.

---

*Háº¿t.*


## --- [API_CONTRACTS.md] ---

# API Contracts - `admin_orderlist`

Má»¥c Ä‘Ã­ch: ghi láº¡i route, request, response vÃ  hÃ nh vi quan trá»ng trÆ°á»›c khi refactor Ä‘á»ƒ trÃ¡nh sá»­a lá»—i báº±ng cÃ¡ch vÃ¡ lá»‡ch contract á»Ÿ táº§ng khÃ¡c.

> Tráº¡ng thÃ¡i: khung ban Ä‘áº§u. Äiá»n theo tá»«ng domain trÆ°á»›c khi cháº¡m code domain Ä‘Ã³.

## Quy Táº¯c Ghi Contract

- Ghi contract hiá»‡n táº¡i trÆ°á»›c khi sá»­a implementation.
- KhÃ´ng Ä‘á»•i API path, method, query param, payload hoáº·c response shape náº¿u chÆ°a cÃ³ migration task riÃªng.
- Náº¿u backend sai, sá»­a backend source-of-truth; khÃ´ng vÃ¡ báº±ng mapper frontend trá»« khi lÃ  compatibility wrapper táº¡m thá»i.
- Náº¿u frontend Ä‘ang phá»¥ thuá»™c response sai/khÃ´ng nháº¥t quÃ¡n, ghi rÃµ wrapper cáº§n giá»¯ vÃ  Ä‘iá»u kiá»‡n xÃ³a.

## Orders

> Phase A sync 2026-06-30: mounted by `backend/src/routes/index.js` at `/api/orders` and `/api/v1/orders` through `backend/src/domains/orders/routes.js` -> `controller/index.js`.

| Method | Path | Handler/File | Request chÃ­nh | Response chÃ­nh | Ghi chÃº |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/orders?scope=` | `backend/src/domains/orders/controller/listRoutes.js` | Query `scope`; supported redirects use `expired`, `canceled`, `import`, `mavn_paid`; tax uses separate route | JSON array of normalized order rows | Uses `buildOrdersListQuery` + `normalizeOrderRow`; do not change row shape without migration. |
| GET | `/api/orders/tax?from=YYYY-MM-DD` | `backend/src/domains/orders/controller/listRoutes.js` | Optional `from`, fallback `2026-04-22` | JSON array of normalized tax order rows | `from` must stay `YYYY-MM-DD`; invalid value falls back. |
| GET | `/api/orders/expired` | `listRoutes.js` | none | Redirect `/api/orders?scope=expired` | Compatibility redirect. |
| GET | `/api/orders/canceled` | `listRoutes.js` | none | Redirect `/api/orders?scope=canceled` | Compatibility redirect. |
| GET | `/api/orders/import` | `listRoutes.js` | none | Redirect `/api/orders?scope=import` | Compatibility redirect. |
| GET | `/api/orders/mavn-expense` | `listRoutes.js` | none | Redirect `/api/orders?scope=mavn_paid` | Compatibility redirect. |
| POST | `/api/orders` | `backend/src/domains/orders/controller/crud/createOrder.js` | Sanitized order payload; supports `variant_id`, `reserved_order_code`, refund credit fields, `payment_method` | `201` normalized order row; `400 { error: "Empty payload" }`; `500` generic create-order error except duplicate order code message | Create-order validation/payment allocation still needs source-of-truth cleanup. |
| PUT | `/api/orders/:id` | `crud/updateOrder.js` | Order update payload, validated `id` param | Updated normalized order row; `400/404/500` error body | Preserve public shape for EditOrder modal. |
| DELETE | `/api/orders/:id` | `crud/deleteOrder.js` | Validated `id` param | JSON result; `400/404/500` error body | Delete flow may touch payment/refund side effects. |
| POST | `/api/orders/:id/ensure-transaction` | `crud/ensureOrderTransactionRoute.js` | Validated `id` param | JSON result or status-coded error body | Transaction compatibility route. |
| POST | `/api/orders/calculate-price` | `calculatePriceRoute.js` | Pricing request body | Pricing result JSON; domain error status or `500 { error: "System Error" }` | Backend pricing source-of-truth still open. |
| POST | `/api/orders/:orderCode/renew` | `renewRoutes.js` | Validated `orderCode` param + request body | Renew result JSON or status-coded error | Renew flow must preserve response shape. |
| PATCH | `/api/orders/canceled/:id/refund` | `renewRoutes.js` | Validated `id`; refund fields in body | `{ success: true, refundReferenceCode, voided_credit_notes, ...updated }` or error | Refund/canceled flow is money-risk area. |
| POST | `/api/orders/:id/complete-manual-webhook` | `manualWebhookCompletionRoute.js` | Path `id`; body handled by use-case | Status/body returned by `completeProcessingOrderWithManualWebhook` | Idempotency handled by use-case/transaction guard. |
| POST | `/api/orders/:id/complete-manual-usdt` | `manualUsdtCompletionRoute.js` | Path `id`; body handled by use-case | Status/body returned by `completeProcessingOrderWithManualUsdt` | Idempotency handled by order status + USDT ledger guard. |
| GET | `/api/orders/refund-credits/logs` | `refundCreditRoutes.js` | Query filters | Refund credit log payload | Preserve list response for finance UI. |
| GET | `/api/orders/refund-credits/available` | `refundCreditRoutes.js` | Query filters | `{ data: rows }` | Caller expects `data`. |
| POST | `/api/orders/canceled/:id/refund-credit/ensure` | `refundCreditRoutes.js` | Validated `id`; refund-credit body | JSON ensure result or status-coded error | Must not double-create credit. |
| POST | `/api/orders/refund-credits/:id/actions` | `refundCreditRoutes.js` | Body `action` = `delete` or `complete` | JSON action result or status-coded error | Must not double-apply ledger/cashout. |

### Source-Of-Truth Cáº§n Chá»‘t

- Order DTO -> view model: currently `frontend/src/features/orders/utils/orderListTransform.ts` plus Create/Edit/Bill Order local mappers; E1 remains open.
- Create order validation: source-of-truth is `backend/src/domains/orders/controller/crud/create-order/createOrderValidation.js`; route `createOrder.js` keeps API response/transaction orchestration.
- Payment amount/key allocation for create order: source-of-truth is `backend/src/domains/orders/controller/crud/create-order/createOrderPaymentAllocation.js`; it owns refund credit amount reduction, USDT/bank method selection, and payment slot expected amount allocation.
- Manual completion/refund idempotency: route handlers are thin; use-cases are current source-of-truth and must be preserved.

## Invoices/Receipts

| Method | Path | Handler/File | Request chÃ­nh | Response chÃ­nh | Ghi chÃº |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | Receipt list/filter/QR/payment actions. |

## Products/Pricing

| Method | Path | Handler/File | Request chÃ­nh | Response chÃ­nh | Ghi chÃº |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/services/pricing/core.js` | TBD | TBD | Cáº§n xÃ¡c Ä‘á»‹nh pricing source-of-truth. |
| TBD | TBD | `backend/src/domains/products` | TBD | TBD | Product/variant/image/description. |

## Supplies/Expenses

| Method | Path | Handler/File | Request chÃ­nh | Response chÃ­nh | Ghi chÃº |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/supplies/controller/handlers/list.js` | TBD | TBD | Filter/query builder. |
| TBD | TBD | `backend/src/domains/supplies/controller/handlers/insights.js` | TBD | TBD | Insight calculation. |

## Wallet/Bank/Finance

> Phase A sync 2026-06-30: `wallet` is mounted under `/api` root by `backend/src/routes/index.js`; `shop-bank-accounts` and `usdt-wallets` are mounted by domain prefix.

| Method | Path | Handler/File | Request chÃ­nh | Response chÃ­nh | Ghi chÃº |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/wallets/daily-balances` | `backend/src/domains/wallet/controller/index.js#listDailyBalances` | Query handled by controller | Daily balance list JSON | Mounted via `backend/src/domains/wallet/routes.js`. |
| POST | `/api/wallets/daily-balances` | `wallet/controller/index.js#saveDailyBalance` | `saveDailyBalanceRules` validated body | Saved balance JSON or validation error | Preserve ledger/balance semantics. |
| POST | `/api/wallets/types` | `wallet/controller/index.js#createWalletType` | `createWalletTypeRules` body | Created wallet type JSON | Wallet type management. |
| PATCH | `/api/wallets/types/:id` | `wallet/controller/index.js#updateWalletType` | `updateWalletTypeRules`, path `id` | Updated wallet type JSON | Partial update route. |
| DELETE | `/api/wallets/types/:id` | `wallet/controller/index.js#deleteWalletType` | `deleteWalletTypeRules`, path `id` | Delete result JSON | Must not break daily balance references. |
| GET | `/api/shop-bank-accounts` | `shop-bank-accounts/controller/index.js#listShopBankAccounts` | Query handled by controller | Account list JSON | Domain-local input rules in `shopBankInputs.js`. |
| GET | `/api/shop-bank-accounts/balances` | `shop-bank-accounts/controller/index.js#listShopBankAccountBalancesHandler` | Query handled by controller | Balance list JSON | Ledger/balance risk area. |
| GET | `/api/shop-bank-accounts/default` | `shop-bank-accounts/controller/index.js#getDefaultShopBankAccountHandler` | none | Default account JSON | Default account contract. |
| POST | `/api/shop-bank-accounts` | `shop-bank-accounts/controller/index.js#createShopBankAccount` | `createShopBankAccountRules` body | Created account JSON or validation error | Shared text/boolean primitives only; account rule stays domain-local. |
| PUT | `/api/shop-bank-accounts/:id` | `shop-bank-accounts/controller/index.js#updateShopBankAccount` | Path `id`, update body | Updated account JSON | Preserve account number normalization behavior. |
| PATCH | `/api/shop-bank-accounts/:id/withdrawn` | `shop-bank-accounts/controller/index.js#patchShopBankAccountWithdrawn` | Path `id`, withdrawn body | Updated withdrawn result JSON | Compatibility route; withdraw flow has separate POST. |
| POST | `/api/shop-bank-accounts/:id/withdraw` | `shop-bank-accounts/controller/index.js#postShopBankAccountWithdraw` | Path `id`, withdraw body | Withdraw result JSON | Must not double-record transaction. |
| POST | `/api/shop-bank-accounts/:id/set-default` | `shop-bank-accounts/controller/index.js#setDefaultShopBankAccount` | Path `id` | Default update JSON | Default uniqueness rule remains domain use-case. |
| DELETE | `/api/shop-bank-accounts/:id` | `shop-bank-accounts/controller/index.js#removeShopBankAccount` | Path `id` | Delete result JSON | Preserve safety checks. |
| GET | `/api/usdt-wallets` | `usdt-wallets/controller/index.js#listUsdtWallets` | Query handled by controller | Wallet list JSON | Domain-local wallet address/network rules. |
| GET | `/api/usdt-wallets/balances` | `usdt-wallets/controller/index.js#listUsdtWalletBalancesHandler` | Query handled by controller | Balance list JSON | Ledger/balance risk area. |
| GET | `/api/usdt-wallets/exchange-rate` | `usdt-wallets/controller/index.js#getExchangeRateHandler` | none/query handled by controller | Exchange rate JSON | Caller may depend on current shape. |
| GET | `/api/usdt-wallets/default` | `usdt-wallets/controller/index.js#getDefaultUsdtWalletHandler` | none | Default wallet JSON | Default wallet contract. |
| POST | `/api/usdt-wallets` | `usdt-wallets/controller/index.js#createUsdtWallet` | `createUsdtWalletRules` body | Created wallet JSON or validation error | Shared primitives only; wallet network/address rules stay domain-local. |
| PUT | `/api/usdt-wallets/:id` | `usdt-wallets/controller/index.js#updateUsdtWallet` | Path `id`, update body | Updated wallet JSON | Preserve normalization behavior. |
| POST | `/api/usdt-wallets/:id/withdraw` | `usdt-wallets/controller/index.js#postUsdtWalletWithdraw` | Path `id`, withdraw body | Withdraw result JSON | Must not double-record transaction. |
| POST | `/api/usdt-wallets/:id/set-default` | `usdt-wallets/controller/index.js#setDefaultUsdtWallet` | Path `id` | Default update JSON | Default uniqueness rule remains domain use-case. |
| DELETE | `/api/usdt-wallets/:id` | `usdt-wallets/controller/index.js#removeUsdtWallet` | Path `id` | Delete result JSON | Preserve safety checks. |

### Payment Slots Internal Contract

`backend/src/domains/payment-slots/index.js` is not mounted as an HTTP router. It is an internal domain API used by orders/payments/webhook/renew flows.

| Function | Contract | Source-of-truth |
| --- | --- | --- |
| `openPaymentSlot(executor, params)` | Open one pending slot for an order/cycle with exact expected amount | `use-cases/openPaymentSlot` + `helpers/paymentSlotInputs.js` |
| `resolveOrderByExpectedAmount(executor, params)` | Resolve order by receiver account + exact expected amount | `use-cases/resolveOrderByExpectedAmount` |
| `markPaymentSlotMatched(executor, params)` | Mark matched after receipt is recorded | `use-cases/markPaymentSlotMatched` |
| `expirePaymentSlots(executor, interval)` | Expire stale pending slots | `use-cases/expirePaymentSlots` |
| `findLatestPendingSlotByOrder` / `findLatestMatchedSlotByOrder` / `findActiveSlotByOrder` | Repository lookup for QR/renew/payment checks | `repositories/paymentSlotRepository` |
| `backfillPendingPaymentSlots` | Backfill missing pending slots | `use-cases/backfillPendingPaymentSlots` |

Payment slot amount normalization must remain exact numeric matching and must not use integer VND parser from `backend/src/shared/money/normalizers.js`.

## Dashboard/Reports

| Method | Path | Handler/File | Request chÃ­nh | Response chÃ­nh | Ghi chÃº |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/orders/controller/finance/dashboardSummary.js` | TBD | TBD | Summary sá»‘ liá»‡u pháº£i cÃ³ baseline. |

## Renew Adobe/Fix ADES

| Method | Path | Handler/File | Request chÃ­nh | Response chÃ­nh | Ghi chÃº |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/checkAccounts.js` | TBD | TBD | Check accounts flow. |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/batchUsers.js` | TBD | TBD | Batch transaction/retry. |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/publicFixAdes.js` | TBD | TBD | Public fix flow. |
| TBD | TBD | `backend/src/domains/fix-ades/routes.js` | TBD | TBD | Fix ADES boundary. |


### Manual Completion / Refund Boundary

| Flow | Route/Function | Transaction boundary | Idempotency key | Ghi chÃº |
| --- | --- | --- | --- | --- |
| Manual bank completion | `POST /api/orders/:id/complete-manual-webhook` -> `completeProcessingOrderWithManualWebhook` | `BEGIN` + `SELECT order FOR UPDATE` + status conditional update + `COMMIT/ROLLBACK` | payment receipt insert result + order status `PROCESSING` guard | Route handler Ä‘Ã£ tÃ¡ch má»ng táº¡i `manualWebhookCompletionRoute.js`. |
| Manual USDT completion | `POST /api/orders/:id/complete-manual-usdt` -> `completeProcessingOrderWithManualUsdt` | `BEGIN` + `SELECT order FOR UPDATE` + status conditional update + `COMMIT/ROLLBACK` | order status `PROCESSING` guard + USDT ledger service source guard | Route handler Ä‘Ã£ tÃ¡ch má»ng táº¡i `manualUsdtCompletionRoute.js`. |
| Refund credit cashout | `POST /api/orders/refund-credits/:id/actions` action `complete` | `db.transaction()` + `SELECT refund_credit_note FOR UPDATE` + ledger debit + note status update | `SOURCE_KINDS.REFUND_CREDIT_NOTE` + `creditId` | CÃ³ focused test Ä‘áº£m báº£o duplicate ledger source bá»‹ skip. |


## --- [import-package-warehouse-flow.md] ---

# Thiáº¿t káº¿ luá»“ng liÃªn káº¿t Nháº­p hÃ ng â†” GÃ³i sáº£n pháº©m

## Má»¥c tiÃªu
- Khi admin nháº­p hÃ ng vÃ  chá»n `Sáº£n pháº©m`, há»‡ thá»‘ng tá»± nháº­n biáº¿t sáº£n pháº©m Ä‘Ã³ cÃ³ cáº¥u hÃ¬nh táº¡o gÃ³i hay khÃ´ng.
- Náº¿u sáº£n pháº©m thuá»™c má»™t `GÃ³i sáº£n pháº©m` Ä‘Ã£ Ä‘Æ°á»£c táº¡o/cáº¥u hÃ¬nh, form nháº­p hÃ ng tá»± má»Ÿ thÃªm cÃ¡c input cáº§n thiáº¿t nhÆ° `TÃ i khoáº£n`, `Máº­t kháº©u`, `Mail dá»± phÃ²ng`, `2FA`, `Ghi chÃº`, `Háº¡n sá»­ dá»¥ng`.
- Khi lÆ°u, há»‡ thá»‘ng táº¡o báº£n ghi trong `LÃ´ hÃ ng/Kho hÃ ng` trÆ°á»›c, sau Ä‘Ã³ táº¡o `GÃ³i sáº£n pháº©m` liÃªn káº¿t tá»›i lÃ´ vá»«a táº¡o.
- TrÃ¡nh nháº­p trÃ¹ng dá»¯ liá»‡u á»Ÿ 2 nÆ¡i: admin chá»‰ nháº­p má»™t láº§n á»Ÿ mÃ n nháº­p hÃ ng.

## Customer:
Táº¡i sao pháº§n háº¡n sá»­ dá»¥ng, tÃ i khoáº£n khÃ´ng dÃ¹ng luÃ´n á»Ÿ form táº¡o Ä‘Æ¡n hÃ ng. Chá»‰ cáº§n táº¡o 1 khá»‘i Ä‘á»ƒ ngÆ°á»i dÃ¹ng cÃ³ thá»ƒ nháº­p thÃªm cÃ¡c pháº§n cÃ²n thiáº¿u thÃ´i lÃ  Ä‘Æ°á»£c mÃ . Check láº¡i form táº¡o Ä‘Æ¡n Ä‘ang cÃ³ sáºµn nhá»¯ng gÃ¬ rá»“i thÃ¬ chá»‰ cáº§n táº¡o thÃªm 1 khá»‘i bá»• sung thÃ´i.

## Hiá»‡n tráº¡ng trong source

### Kho hÃ ng / LÃ´ hÃ ng
- Backend domain: `backend/src/domains/warehouse`.
- API hiá»‡n cÃ³:
  - `GET /api/warehouse`
  - `POST /api/warehouse`
  - `PUT /api/warehouse/:id`
  - `DELETE /api/warehouse/:id`
- Báº£ng backend Ä‘ang dÃ¹ng: `PRODUCT_STOCK`.
- CÃ¡c field chÃ­nh Ä‘ang cÃ³:
  - `category` â†’ loáº¡i/sáº£n pháº©m trong kho.
  - `account` â†’ tÃ i khoáº£n/email/username.
  - `password` â†’ máº­t kháº©u.
  - `backup_email` â†’ mail dá»± phÃ²ng.
  - `two_fa` â†’ mÃ£ 2FA.
  - `note` â†’ ghi chÃº.
  - `status` â†’ tráº¡ng thÃ¡i, vÃ­ dá»¥ `Tá»“n`, `Äang Sá»­ Dá»¥ng`.
  - `expires_at` â†’ háº¡n sá»­ dá»¥ng.
  - `is_verified` â†’ Ä‘Ã£ xÃ¡c minh.

### GÃ³i sáº£n pháº©m
- Backend domain: `backend/src/domains/package-products`.
- API hiá»‡n cÃ³:
  - `GET /api/package-products`
  - `POST /api/package-products`
  - `PUT /api/package-products/:id`
  - `DELETE /api/package-products/:id`
- Báº£ng backend Ä‘ang dÃ¹ng: `PACKAGE_PRODUCT`.
- GÃ³i Ä‘Ã£ cÃ³ kháº£ nÄƒng liÃªn káº¿t kho qua:
  - `stockId` / `stock_id`.
  - `storageId` / `storage_id`.
- Frontend package form hiá»‡n Ä‘Ã£ cÃ³ cÆ¡ cháº¿ `manualStock` / `manualStorage` Ä‘á»ƒ táº¡o kho trÆ°á»›c, rá»“i táº¡o gÃ³i sau trong `frontend/src/features/package-product/hooks/usePackageMutationActions.ts`.

## Luá»“ng Ä‘á» xuáº¥t

### 1. Cáº¥u hÃ¬nh sáº£n pháº©m nÃ o cáº§n táº¡o gÃ³i
Má»—i sáº£n pháº©m/gÃ³i cáº§n cÃ³ cáº¥u hÃ¬nh Ä‘á»ƒ biáº¿t khi nháº­p hÃ ng thÃ¬ cáº§n hiá»‡n input nÃ o.

Äá» xuáº¥t dÃ¹ng cáº¥u hÃ¬nh theo `productId` hoáº·c `packageId`:

```ts
type ImportPackageField =
  | "account"
  | "password"
  | "backup_email"
  | "two_fa"
  | "expires_at"
  | "note";

type ProductImportPackageRule = {
  productId: number;
  packageProductId?: number;
  enabled: boolean;
  fields: ImportPackageField[];
  defaultSlotLimit?: number;
  requiresActivation?: boolean;
};
```

VÃ­ dá»¥:

```json
{
  "productId": 12,
  "enabled": true,
  "fields": ["account", "password", "backup_email", "two_fa", "expires_at", "note"],
  "defaultSlotLimit": 1,
  "requiresActivation": true
}
```

### 2. Khi chá»n sáº£n pháº©m á»Ÿ form nháº­p hÃ ng
Flow frontend:

1. Admin má»Ÿ form nháº­p hÃ ng.
2. Admin chá»n `Sáº£n pháº©m`.
3. Frontend gá»i/tra cache cáº¥u hÃ¬nh `ProductImportPackageRule` theo `productId`.
4. Náº¿u `enabled = true`, form tá»± render thÃªm block `ThÃ´ng tin táº¡o gÃ³i`.
5. Block nÃ y chá»‰ hiá»ƒn thá»‹ Ä‘Ãºng cÃ¡c field trong `fields`.
6. Náº¿u `enabled = false`, form nháº­p hÃ ng giá»¯ nguyÃªn nhÆ° hiá»‡n táº¡i.

UI Ä‘á» xuáº¥t:

```txt
[Chá»n sáº£n pháº©m]
[NhÃ  cung cáº¥p]
[GiÃ¡ nháº­p]
[Sá»‘ lÆ°á»£ng]

Náº¿u sáº£n pháº©m cÃ³ gÃ³i:
  â”Œ ThÃ´ng tin táº¡o gÃ³i â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚ TÃ i khoáº£n / Email                â”‚
  â”‚ Máº­t kháº©u                         â”‚
  â”‚ Mail dá»± phÃ²ng                    â”‚
  â”‚ 2FA                              â”‚
  â”‚ Háº¡n sá»­ dá»¥ng                      â”‚
  â”‚ Ghi chÃº                          â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 3. Khi báº¥m lÆ°u nháº­p hÃ ng
NÃªn xá»­ lÃ½ báº±ng má»™t API orchestration Ä‘á»ƒ trÃ¡nh frontend gá»i rá»i ráº¡c rá»“i lá»—i giá»¯a chá»«ng.

Äá» xuáº¥t API má»›i:

```http
POST /api/import-packages
```

Payload máº«u:

```json
{
  "productId": 12,
  "supplierId": 5,
  "quantity": 1,
  "importPrice": 50000,
  "warehouse": {
    "category": "Netflix Premium",
    "account": "user@example.com",
    "password": "pass123",
    "backup_email": "backup@example.com",
    "two_fa": "ABCDEF",
    "expires_at": "2026-12-31",
    "note": "LÃ´ nháº­p ngÃ y 21/06"
  },
  "package": {
    "slotLimit": 1,
    "matchMode": "information",
    "storageTotal": null
  }
}
```

Backend xá»­ lÃ½ trong transaction:

1. Validate sáº£n pháº©m tá»“n táº¡i.
2. Load rule táº¡o gÃ³i cá»§a sáº£n pháº©m.
3. Validate cÃ¡c field báº¯t buá»™c theo rule.
4. Insert `PRODUCT_STOCK`.
5. Insert `PACKAGE_PRODUCT` vá»›i `stock_id = product_stock.id`.
6. Náº¿u cáº§n `storage_id`, insert thÃªm `PRODUCT_STOCK` cho storage hoáº·c dÃ¹ng cÃ¹ng stock tÃ¹y rule.
7. Commit transaction.
8. Tráº£ vá» `{ warehouseItem, packageProduct }`.

Pseudo:

```ts
transaction(async trx => {
  const rule = await findImportPackageRule(productId);
  if (!rule?.enabled) {
    return createNormalImportOnly(payload);
  }

  const stock = await createWarehouseStock(trx, payload.warehouse);

  const pkg = await createPackageProduct(trx, {
    packageId: productId,
    stockId: stock.id,
    slotLimit: payload.package.slotLimit || rule.defaultSlotLimit || 1,
    importPrice: payload.importPrice,
    supplier: payload.supplierId,
    matchMode: payload.package.matchMode || "information",
  });

  return { stock, pkg };
});
```

## Data mapping Ä‘á» xuáº¥t

| Form nháº­p hÃ ng | `PRODUCT_STOCK` | `PACKAGE_PRODUCT` |
| --- | --- | --- |
| Sáº£n pháº©m | `category` | `package_id` |
| TÃ i khoáº£n | `account_username` | qua `stock_id` |
| Máº­t kháº©u | `password_encrypted` | qua `stock_id` |
| Mail dá»± phÃ²ng | `backup_email` | qua `stock_id` |
| 2FA | `two_fa_encrypted` | qua `stock_id` |
| Ghi chÃº | `note` | cÃ³ thá»ƒ map thÃªm `note` náº¿u cáº§n |
| GiÃ¡ nháº­p | khÃ´ng báº¯t buá»™c | `package_import` |
| Sá»‘ slot | khÃ´ng báº¯t buá»™c | `slot` / capacity hiá»‡n cÃ³ |
| Háº¡n sá»­ dá»¥ng | `expires_at` | hiá»ƒn thá»‹ giÃ¡n tiáº¿p qua stock |

## Tráº¡ng thÃ¡i sau khi lÆ°u
- `PRODUCT_STOCK.status` ban Ä‘áº§u cÃ³ thá»ƒ lÃ  `Tá»“n`.
- VÃ¬ `PACKAGE_PRODUCT.stock_id` trá» tá»›i stock nÃ y, API list kho hiá»‡n táº¡i sáº½ tá»± hiá»ƒn thá»‹ `Äang Sá»­ Dá»¥ng` báº±ng query `EXISTS`.
- KhÃ´ng cáº§n tá»± set cá»©ng `status = Äang Sá»­ Dá»¥ng` náº¿u muá»‘n giá»¯ logic hiá»‡n táº¡i.

## Thay Ä‘á»•i frontend Ä‘á» xuáº¥t

### Feature nháº­p hÃ ng
Táº¡o/Ä‘iá»u chá»‰nh trong feature nháº­p hÃ ng hiá»‡n táº¡i:

```txt
frontend/src/features/<import-feature>/
  api/
    importPackageApi.ts
  hooks/
    useImportPackageRules.ts
    useImportPackageSubmit.ts
  components/
    ImportPackageDynamicFields.tsx
```

Náº¿u mÃ n nháº­p hÃ ng Ä‘ang thuá»™c `warehouse`, cÃ³ thá»ƒ Ä‘áº·t trong:

```txt
frontend/src/features/warehouse/
  api/importPackageApi.ts
  hooks/useImportPackageRules.ts
  components/ImportPackageDynamicFields.tsx
```

### Component dynamic fields
Input render theo rule:

```ts
const FIELD_CONFIG = {
  account: { label: "TÃ i khoáº£n", placeholder: "Email / Username" },
  password: { label: "Máº­t kháº©u", type: "password" },
  backup_email: { label: "Mail dá»± phÃ²ng" },
  two_fa: { label: "2FA" },
  expires_at: { label: "Háº¡n sá»­ dá»¥ng", type: "date" },
  note: { label: "Ghi chÃº" },
};
```

## Thay Ä‘á»•i backend Ä‘á» xuáº¥t

Táº¡o domain orchestration riÃªng Ä‘á»ƒ khÃ´ng nhÃ©t logic vÃ o controller warehouse hoáº·c package-products:

```txt
backend/src/domains/import-packages/
  routes.js
  controller/
    index.js
  services/
    createImportPackage.js
  repositories/
    importPackageRuleRepository.js
    warehouseStockRepository.js
    packageProductRepository.js
  validators/
    importPackageValidator.js
```

LÃ½ do:
- `warehouse` chá»‰ quáº£n lÃ½ tá»“n kho/lÃ´ hÃ ng.
- `package-products` chá»‰ quáº£n lÃ½ gÃ³i.
- Luá»“ng má»›i lÃ  nghiá»‡p vá»¥ phá»‘i há»£p giá»¯a 2 domain, nÃªn nÃªn Ä‘á»ƒ domain/use-case riÃªng.

## Cáº¥u hÃ¬nh rule nÃªn lÆ°u á»Ÿ Ä‘Ã¢u?

### PhÆ°Æ¡ng Ã¡n A: táº­n dá»¥ng field hiá»‡n cÃ³ trÃªn product
Náº¿u chá»‰ cáº§n biáº¿t sáº£n pháº©m cÃ³ cáº§n activation hay khÃ´ng, cÃ³ thá»ƒ dÃ¹ng `product.package_requires_activation` hiá»‡n táº¡i.

Æ¯u Ä‘iá»ƒm:
- Ãt migration.
- Nhanh triá»ƒn khai.

NhÆ°á»£c Ä‘iá»ƒm:
- KhÃ´ng Ä‘á»§ linh hoáº¡t náº¿u má»—i sáº£n pháº©m cáº§n bá»™ input khÃ¡c nhau.

### PhÆ°Æ¡ng Ã¡n B: táº¡o báº£ng rule riÃªng
Äá» xuáº¥t náº¿u muá»‘n lÃ¢u dÃ i:

```sql
CREATE TABLE product.import_package_rules (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_slot_limit INTEGER NOT NULL DEFAULT 1,
  requires_activation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Æ¯u Ä‘iá»ƒm:
- Má»—i sáº£n pháº©m cÃ³ thá»ƒ yÃªu cáº§u field khÃ¡c nhau.
- Dá»… thÃªm field sau nÃ y nhÆ° `recovery_code`, `cookie`, `profile_name`.

NhÆ°á»£c Ä‘iá»ƒm:
- Cáº§n thÃªm migration + mÃ n cáº¥u hÃ¬nh rule.

## Case cáº§n thá»‘ng nháº¥t trÆ°á»›c khi code

1. **Má»™t láº§n nháº­p cÃ³ táº¡o nhiá»u gÃ³i khÃ´ng?**
   - Náº¿u `quantity > 1`, cÃ³ nÃªn render nhiá»u dÃ²ng tÃ i khoáº£n Ä‘á»ƒ táº¡o nhiá»u stock/package cÃ¹ng lÃºc?
   - Äá» xuáº¥t: giai Ä‘oáº¡n 1 chá»‰ há»— trá»£ `quantity = 1` cho sáº£n pháº©m dáº¡ng account; náº¿u cáº§n nhiá»u thÃ¬ dÃ¹ng textarea/import CSV á»Ÿ giai Ä‘oáº¡n 2.

2. **Stock vÃ  storage dÃ¹ng chung hay tÃ¡ch riÃªng?**
   - Hiá»‡n package cÃ³ `stockId` vÃ  `storageId`.
   - Äá» xuáº¥t: vá»›i account thÆ°á»ng, chá»‰ táº¡o `stockId`. Chá»‰ táº¡o `storageId` khi rule yÃªu cáº§u activation/storage riÃªng.

3. **GÃ³i Ä‘Æ°á»£c táº¡o theo product nÃ o?**
   - Äá» xuáº¥t: `PACKAGE_PRODUCT.package_id = productId` cá»§a sáº£n pháº©m Ä‘ang nháº­p.

4. **GiÃ¡ nháº­p láº¥y tá»« Ä‘Ã¢u?**
   - Äá» xuáº¥t: dÃ¹ng giÃ¡ nháº­p trÃªn form nháº­p hÃ ng Ä‘á»ƒ ghi `package_import`.

5. **Tráº¡ng thÃ¡i kho sau khi táº¡o gÃ³i**
   - Äá» xuáº¥t: insert stock vá»›i `status = Tá»“n`; list warehouse tá»± suy ra `Äang Sá»­ Dá»¥ng` khi stock Ä‘Ã£ Ä‘Æ°á»£c package dÃ¹ng.

## Luá»“ng MVP Ä‘á» xuáº¥t

```txt
Admin chá»n sáº£n pháº©m
  â†“
Frontend load rule theo sáº£n pháº©m
  â†“
Náº¿u sáº£n pháº©m cÃ³ rule enabled
  â†“
Hiá»‡n block input tÃ i khoáº£n / mk / mail dá»± phÃ²ng / 2FA / háº¡n / note
  â†“
Admin báº¥m LÆ°u
  â†“
POST /api/import-packages
  â†“
Backend transaction:
  1. Insert PRODUCT_STOCK
  2. Insert PACKAGE_PRODUCT stock_id = stock.id
  3. Commit
  â†“
Frontend refresh LÃ´ hÃ ng + GÃ³i sáº£n pháº©m
```

## Káº¿t luáº­n Ä‘á» xuáº¥t
- NÃªn lÃ m báº±ng API má»›i `POST /api/import-packages` Ä‘á»ƒ Ä‘áº£m báº£o atomic transaction.
- Frontend nháº­p hÃ ng chá»‰ render dynamic fields dá»±a trÃªn rule cá»§a sáº£n pháº©m.
- Backend táº¡o `PRODUCT_STOCK` vÃ  `PACKAGE_PRODUCT` trong cÃ¹ng transaction.
- Giai Ä‘oáº¡n Ä‘áº§u dÃ¹ng field chuáº©n: `account`, `password`, `backup_email`, `two_fa`, `expires_at`, `note`.
- Náº¿u báº¡n Ä‘á»“ng Ã½ flow nÃ y, bÆ°á»›c tiáº¿p theo lÃ  triá»ƒn khai migration rule + API + UI dynamic fields.




## Customer
- LÃ´ HÃ ng thÃ¬ sáº£n pháº©m nÃ o cÅ©ng nhÆ° nhau. CÅ©ng cÃ¹ng 1 báº£ng lÃ´ hÃ ng thÃ´i. Cháº³ng qua lÃ  trÆ°á»ng nÃ o Ä‘iá»n vÃ  trÆ°á»ng nÃ o khÃ´ng cáº§n Ä‘iá»n thÃ´i. Háº§u nhÆ° cÃ¡c trÆ°á»ng trong LÃ´ hÃ ng Ä‘ang khÃ´ng báº¯t buá»™c Ä‘iá»n
- Khi Ä‘Æ¡n nháº­p hÃ ng háº¿t háº¡n, cÃ³ má»™t sá»‘ Ä‘Æ¡n thÃ¬ cáº§n xÃ³a nÃ³ khá»i gÃ³i sáº£n pháº©m vÃ  xÃ³a khá»i lÃ´ hÃ ng. NhÆ°ng háº§u nhÆ° lÃ  cáº§n xÃ³a toÃ n bá»™ á»Ÿ GÃ³i Sáº£n Pháº©m, cÃ²n vá» pháº§n lÃ´ hÃ ng thÃ¬ cÃ³ cÃ¡i cáº§n xÃ³a cÃ³ cÃ¡i khÃ´ng nÃªn cáº§n cÃ³ 1 tick check sau khi háº¿t háº¡n cÃ³ xÃ³a khá»i LÃ´ HÃ ng hay khÃ´ng.
- Náº¿u gia háº¡n Ä‘Æ¡n nháº­p hÃ ng thÃ¬ háº¡n á»Ÿ gÃ³i sáº£n pháº©m cÅ©ng pháº£i Ä‘Æ°á»£c gia háº¡n.
- Sáº½ cÃ³ 1 sá»‘ gÃ³i sáº£n pháº©m khÃ´ng cáº§n nháº­p hÃ ng vÃ¬ cÃ³ sáºµn hoáº·c lÃ  nháº­p ngoÃ i luá»“ng nÃªn khÃ´ng note vÃ o nháº­p hÃ ng. mÃ  tá»± táº¡o tháº³ng gÃ³i luÃ´n. NÃªn chá»— nÃ y cÅ©ng pháº£i pass.


## --- [renew-adobe-service.md] ---

# TÃ¡ch dá»‹ch vá»¥ Renew Adobe

Má»¥c tiÃªu: **Orderlist** chá»‰ á»§y quyá»ƒn (HTTP) tá»›i dá»‹ch vá»¥ Renew Adobe; sau nÃ y process nÃ y cÃ³ thá»ƒ cháº¡y trÃªn **server/region riÃªng** mÃ  khÃ´ng cáº§n gá»™p cÃ¹ng API chÃ­nh.

## Tráº¡ng thÃ¡i hiá»‡n táº¡i (bÆ°á»›c 1)

- Router vÃ  logic Renew Adobe váº«n náº±m trong `backend/src` (dÃ¹ng láº¡i, trÃ¡nh gáº¥p 50 file sang repo má»›i).
- Process tÃ¡ch: `services/renew-adobe-api/server.js` â€” `require` cÃ¹ng `renewAdobeRoutes` + báº£o vá»‡ báº±ng `RENEW_ADOBE_INTERNAL_KEY`.
- Khi báº­t proxy, `backend` **khÃ´ng** cÃ²n mount controller Renew Adobe trong cÃ¹ng process: toÃ n bá»™ `/api/renew-adobe/*` (sau khi Ä‘Äƒng nháº­p) chuyá»ƒn tá»›i `RENEW_ADOBE_API_BASE_URL`.

## Táº¡o / xoay khÃ³a ná»™i bá»™ nhanh (repo)

- Láº§n Ä‘áº§u: `node backend/scripts/append-renew-adobe-env.js` (chá»‰ ghi náº¿u chÆ°a cÃ³ `RENEW_ADOBE_INTERNAL_KEY`).
- Xoay khÃ³a: `node backend/scripts/append-renew-adobe-env.js --rotate`
- File máº«u (commit Ä‘Æ°á»£c): `backend/.env.renew-adobe.example`

`loadEnv` (xem `backend/src/config/loadEnv.js`): náº¡p `backend/.env` (tÃ¹y chá»n), rá»“i **production/docker** â†’ `backend/.env.docker`, **local** â†’ `backend/.env.local`. File máº«u: `env.docker.example`, `env.local.example`.

**Docker Compose:** `docker-compose.yml` dÃ¹ng `backend/.env.docker` cho `backend`, `webhook`, `scheduler`. CÃ¹ng block biáº¿n Renew Adobe Ä‘Ã£ Ä‘Æ°á»£c thÃªm vÃ o file Ä‘Ã³; khi chÆ°a cÃ³ container `renew-adobe-api`, giá»¯ `RENEW_ADOBE_API_BASE_URL` comment â€” API váº«n cháº¡y Renew Adobe in-process trong container backend.

## Biáº¿n mÃ´i trÆ°á»ng (Orderlist / API chÃ­nh)

| Biáº¿n | MÃ´ táº£ |
|------|--------|
| `RENEW_ADOBE_API_BASE_URL` | VÃ­ dá»¥ `http://127.0.0.1:4002`. CÃ³ giÃ¡ trá»‹ â†’ báº­t proxy. Äá»ƒ trá»‘ng â†’ cháº¡y Renew Adobe in-process nhÆ° cÅ©. |
| `RENEW_ADOBE_INTERNAL_KEY` | KhÃ³a dÃ¹ng chung giá»¯a Orderlist (proxy) vÃ  dá»‹ch vá»¥ `renew-adobe-api` (báº¯t buá»™c khi tÃ¡ch process). NÃªn dÃ i, ngáº«u nhiÃªn. |

## Biáº¿n mÃ´i trÆ°á»ng (process `renew-adobe-api`)

| Biáº¿n | MÃ´ táº£ |
|------|--------|
| `RENEW_ADOBE_INTERNAL_KEY` | TrÃ¹ng vá»›i bÃªn Orderlist. |
| `RENEW_ADOBE_API_PORT` | Máº·c Ä‘á»‹nh `4002` (trÃ¡nh trÃ¹ng Vite storefront thÆ°á»ng dÃ¹ng `4001` trÃªn local). |
| (chung) `DATABASE_URL` / biáº¿n DB nhÆ° `backend` | CÃ¹ng file `.env` thÆ°á»ng dÃ¹ng: `server.js` náº¡p `backend/.env`. |

Dá»‹ch vá»¥ tÃ¡ch váº«n dÃ¹ng chung cÆ¡ sá»Ÿ dá»¯ liá»‡u (schema `renew_adobe`, `system_automation`, â€¦) nhÆ° báº£n in-process. Khi tÃ¡ch háº¡ táº§ng vá» sau, cÃ³ thá»ƒ tÃ¡ch DB hoáº·c dÃ¹ng API-only boundary.

## Cháº¡y local

Terminal 1 â€” Orderlist (khÃ´ng báº­t proxy, dev Ä‘Æ¡n giáº£n):

- KhÃ´ng set `RENEW_ADOBE_API_BASE_URL` â†’ má»i thá»© nhÆ° trÆ°á»›c.

Terminal 1 + 2 â€” tÃ¡ch process:

1. Táº¡o key (má»™t láº§n), vÃ­ dá»¥ PowerShell: `[guid]::NewGuid()`.
2. `backend/.env` (vÃ  cÃ¹ng ná»™i dung cho cáº£ proxy):

   ```env
   RENEW_ADOBE_INTERNAL_KEY=<cÃ¹ng má»™t chuá»—i>
   RENEW_ADOBE_API_BASE_URL=http://127.0.0.1:4002
   ```

3. `npm run dev:renew-adobe` tá»« thÆ° má»¥c gá»‘c `admin_orderlist` (xem `package.json` script).
4. `npm run dev:backend` nhÆ° bÃ¬nh thÆ°á»ng. Frontend gá»i váº«n ` /api/renew-adobe/...` trÃªn cÃ¹ng origin Orderlist; proxy chuyá»ƒn tá»›i `4001`.

## ChÆ°a chuyá»ƒn qua HTTP (cá»‘ Ã½)

- **Cron / scheduler** (`runCheckForAccountId`, v.v.): váº«n gá»i trá»±c tiáº¿p controller trong process nÆ¡i chÃºng cháº¡y (thÆ°á»ng `scheduler.js` / API). Náº¿u muá»‘n má»i thá»© chá»‰ qua service tÃ¡ch, bÆ°á»›c sau lÃ  thay báº±ng `fetch` ná»™i bá»™ + key hoáº·c cháº¡y job bÃªn `renew-adobe-api`.
- **`/api/renew-adobe/public`**: váº«n náº±m trÃªn app Orderlist; cÃ³ thá»ƒ tÃ¡ch tÆ°Æ¡ng tá»± náº¿u cáº§n.

## BÆ°á»›c tiáº¿p theo (khi tÃ¡ch háº³n)

- TÃ¡ch `services/renew-adobe` thÃ nh package/npm workspace cÃ³ `package.json` riÃªng, Ã­t phá»¥ thuá»™c.
- Bá» `require(../../backend/...)` trong `server.js` â€” cÃ i thÆ° viá»‡n Ä‘á»§ táº¡i dá»‹ch vá»¥ con.
- Báº£o máº­t máº¡ng: chá»‰ cho phÃ©p Orderlist nÃ³i tá»›i `renew-adobe-api` (VPC, firewall, mTLS tÃ¹y mÃ´i trÆ°á»ng).


## --- [STRUCTURE-SINGLE-DIRECTION.md] ---

# Kiáº¿n trÃºc má»™t hÆ°á»›ng â€” admin_orderlist

TÃ i liá»‡u nÃ y **chá»‘t hÆ°á»›ng cáº¥u trÃºc tá»•ng thá»ƒ** cá»§a repo. Má»i tÃ­nh nÄƒng má»›i vÃ  refactor cáº¥u trÃºc cáº§n **tuÃ¢n theo**, trÃ¡nh song song hai phong cÃ¡ch (`controllers/` rá»i vs `domains/`) vÃ´ thá»i háº¡n.

**Checklist thá»±c hiá»‡n tá»«ng bÆ°á»›c:** xem file `task.md` á»Ÿ thÆ° má»¥c gá»‘c repo `admin_orderlist/`.

---

## 1. Quyáº¿t Ä‘á»‹nh (ADR ngáº¯n)

| CÃ¢u há»i | Quyáº¿t Ä‘á»‹nh |
|--------|------------|
| Backend tá»• chá»©c theo Ä‘Ã¢u? | **Theo domain (bounded context)** dÆ°á»›i `backend/src/domains/<domain>/`, khÃ´ng thÃªm â€œkhá»‘iâ€ nghiá»‡p vá»¥ má»›i dÆ°á»›i dáº¡ng `controllers/XxxController` + `routes/xxxRoutes` tÃ¡ch rá»i. |
| Frontend tá»• chá»©c theo Ä‘Ã¢u? | **Theo feature** dÆ°á»›i `frontend/src/features/<feature>/`. Logic dÃ¹ng chung tháº­t sá»± má»›i Ä‘Æ°a vÃ o `frontend/src/shared/`. |
| Migrate tá»« code cÅ©? | **TÄƒng dáº§n (incremental)**: má»—i PR Æ°u tiÃªn **má»™t domain** (hoáº·c cá»¥m ráº¥t nhá» cÃ¹ng ranh giá»›i), **giá»¯ nguyÃªn path API vÃ  JSON** trá»« khi cÃ³ task breaking-change riÃªng. |
| Process náº·ng (scheduler, renew)? | Váº«n cÃ³ thá»ƒ **tÃ¡ch process** (scheduler, webhook, renew API); code nghiá»‡p vá»¥ náº±m trong **domain tÆ°Æ¡ng á»©ng**, mount chá»‰ lÃ  â€œlá»‘i vÃ oâ€ má»ng trong `routes/index.js`. |

---

## 2. Cáº¥u trÃºc Ä‘Ã­ch â€” Backend

```
backend/src/domains/<domain>/
  routes.js           # mount path, middleware má»ng; export express.Router
  controller/         # Ä‘iá»u phá»‘i HTTP â†’ use-cases (khÃ´ng nhá»“i SQL dÃ i)
  use-cases/          # luá»“ng nghiá»‡p vá»¥
  repositories/       # truy váº¥n DB / Knex (hoáº·c query modules táº­p trung)
  validators/         # (tuá»³ domain) express-validator rules
  mappers/            # (khi cáº§n) map DB â†” DTO
  adapters/           # (khi cáº§n) HTTP/SDK bÃªn thá»© ba
```

**NguyÃªn táº¯c:**

- `routes.js` **má»ng**: khÃ´ng chá»©a business logic.
- **Validators** thuá»™c domain khi rule chá»‰ phá»¥c vá»¥ domain Ä‘Ã³; dáº§n giáº£m `validators/` global trÃ¹ng tÃªn.

**ÄÃ£ cÃ³ sáºµn máº«u:** `domains/ip-whitelist/`, `domains/site-maintenance/` â€” mount trá»±c tiáº¿p tá»« `routes/index.js`.

**Cáº¥u hÃ¬nh chung** (dbSchema, logger, middleware toÃ n cá»¥c, `app.js`) **khÃ´ng** gá»™p vÃ o tá»«ng domain â€” giá»¯ á»Ÿ `config/`, `middleware/`, `utils/`.

---

## 3. Cáº¥u trÃºc Ä‘Ã­ch â€” Frontend

```
frontend/src/features/<feature>/
  pages/
  components/
  hooks/
  api/
  types.ts | types/
  utils/
```

**NguyÃªn táº¯c:**

- Gá»i HTTP qua **`shared/api/client`** (`apiFetch`, â€¦), khÃ´ng phÃ¬nh thÃªm `lib/api.ts` thÃ nh nÆ¡i gom má»i feature API.
- TrÃ¡nh **catch-all** kiá»ƒu `lib/helpers.ts` phÃ¬nh lá»›n â€” tÃ¡ch vá» feature hoáº·c `shared/utils` khi â‰¥ 2 feature dÃ¹ng.

**Component layout** (`MainLayout`, modal dÃ¹ng chung nhiá»u feature) cÃ³ thá»ƒ á»Ÿ `components/` gá»‘c; **state/luá»“ng nghiá»‡p vá»¥** nÃªn thuá»™c feature owner hoáº·c hook rÃµ rÃ ng.

---

## 4. File mount API trung tÃ¢m

`backend/src/routes/index.js` sau cÃ¹ng chá»‰ nÃªn:

- ÄÄƒng kÃ½ middleware toÃ n cá»¥c (auth public paths, `authGuard`, timeout dÃ i cho vÃ i mount).
- `router.use('<prefix>', require('../domains/<x>/routes'))` (hoáº·c tÆ°Æ¡ng Ä‘Æ°Æ¡ng).

CÃ¡c domain Ä‘Ã£ migrate (banks, categories, â€¦) Ä‘Æ°á»£c **require trá»±c tiáº¿p** trong `routes/index.js`; khÃ´ng cÃ²n file `routes/*Routes.js` chá»‰ re-export má»™t dÃ²ng cho cÃ¡c domain Ä‘Ã³.

---

## 5. Mapping gá»£i Ã½ (legacy â†’ domain)

Báº£ng chi tiáº¿t vÃ  thá»© tá»± Æ°u tiÃªn náº±m trong **`task.md`**. TÃªn folder domain cÃ³ thá»ƒ tinh chá»‰nh (vÃ­ dá»¥ gá»™p `product-*` dÆ°á»›i `catalog`) **má»™t láº§n** khi báº¯t Ä‘áº§u slice tÆ°Æ¡ng á»©ng, rá»“i giá»¯ cá»‘ Ä‘á»‹nh.

---

## 6. Kiá»ƒm thá»­ sau má»—i slice

- Lint backend/frontend.
- Smoke: Ã­t nháº¥t luá»“ng cháº¡m trá»±c tiáº¿p domain Ä‘Ã³ (CRUD hoáº·c GET chÃ­nh); vá»›i domain tÃ i chÃ­nh / webhook / renew thÃ¬ bÃ¡m test/ops hiá»‡n cÃ³ trong `backend/package.json`.

---

## 7. LiÃªn káº¿t

- Skeleton vÃ  viá»‡c cáº§n lÃ m khi táº¡o domain má»›i: **`backend/src/domains/README.md`**.
- Káº¿ hoáº¡ch cÃ´ng viá»‡c cÃ³ checkbox: **`../task.md`** (thÆ° má»¥c gá»‘c `admin_orderlist`).
- Kiáº¿n thá»©c ná»n monorepo / DB / Adobe: **`admin_orderlist/.agents/SKILL.md`**.

---

## 8. Tráº¡ng thÃ¡i chuáº©n bá»‹ (Phase 0â€“1)

- **2026-04-30**: ÄÃ£ ghi nháº­n baseline cáº¥u trÃºc má»™t hÆ°á»›ng; rule Cursor `backend-domains-only.mdc`; `domains/README.md`; ghi chÃº mount trong `routes/index.js`. Chi tiáº¿t checkbox: `task.md`.


## --- [tong-quan-du-an.md] ---

# Tá»•ng quan dá»± Ã¡n (admin_orderlist)

TÃ i liá»‡u **sá»‘ng**: mÃ´ táº£ kiáº¿n trÃºc vÃ  luá»“ng chÃ­nh; **cáº­p nháº­t khi dá»n code** (dá»n tá»›i Ä‘Ã¢u, ghi tá»›i Ä‘Ã³). Chi tiáº¿t cleanup theo tá»«ng háº¡ng má»¥c váº«n tham chiáº¿u [`ke-hoach-cleanup-rule-he-thong.md`](./ke-hoach-cleanup-rule-he-thong.md).

---

## TrÆ°á»›c khi dá»n code (báº¯t buá»™c)

Má»—i láº§n **dá»n, refactor hoáº·c thÃªm rule** mÃ  **liÃªn quan** tá»›i ná»™i dung Ä‘Ã£ (hoáº·c sáº½) Ä‘Æ°á»£c mÃ´ táº£ á»Ÿ Ä‘Ã¢y â€” vÃ­ dá»¥: tab **Tá»•ng quan**, `dashboard.dashboard_monthly_summary`, API `/api/dashboard/**`, luá»“ng post finance / receipt áº£nh hÆ°á»Ÿng sá»‘ trÃªn dashboard, `supplier_order_cost_log` vÃ  trigger cáº­p nháº­t tá»•ng há»£p â€” thÃ¬ **pháº£i Ä‘á»c láº¡i toÃ n bá»™ file `tong-quan-du-an.md` vÃ  Ä‘á»‘i chiáº¿u má»¥c tÆ°Æ¡ng á»©ng trong `ke-hoach-cleanup-rule-he-thong.md`** trÆ°á»›c khi sá»­a. Má»¥c Ä‘Ã­ch: **trÃ¡nh rule chá»“ng chÃ©o** (hai nguá»“n cÃ¹ng cá»™ng má»™t KPI, UI/API Ä‘á»c khÃ¡c trigger, v.v.).

Sau khi Ä‘á»•i hÃ nh vi: **cáº­p nháº­t Ä‘Ãºng má»¥c trong file nÃ y** vÃ  **thÃªm má»™t khá»‘i ghi chÃº á»Ÿ cuá»‘i file** trong pháº§n **Â«Lá»‹ch sá»­ chá»‰nh sá»­aÂ»** (cÃ³ **`ID:` `TQD-Hxx`** má»›i, **thá»i gian** sá»­a, ngÄƒn cÃ¡ch khá»‘i báº±ng `---`).

---

## 1. Repo trong workspace

| ThÃ nh pháº§n | Vai trÃ² ngáº¯n gá»n |
|------------|------------------|
| `admin_orderlist/backend` | API Express, Knex, webhook Sepay, scheduler, domain Ä‘Æ¡n hÃ ng / tÃ i chÃ­nh / dashboard |
| `admin_orderlist/frontend` | Admin UI (React + TS + Vite) |
| `admin_orderlist/database` | Docker Postgres init, dump/schema há»£p nháº¥t, legacy SQL |
| `mavrykstore_bot`, `Website` | Repo lÃ¢n cáº­n (khÃ´ng mÃ´ táº£ sÃ¢u trong file nÃ y trá»« khi Ä‘Ã£ ghi) |

**Stack tham chiáº¿u nhanh:** PostgreSQL, backend Node, frontend React; session, Sepay, Telegram (xem `README.md` gá»‘c repo).

---

## 2. NguyÃªn táº¯c khi Ä‘á»c / sá»­a code

- **Äá»c láº¡i má»¥c â€œTrÆ°á»›c khi dá»n codeâ€** khi pháº¡m vi cÃ´ng viá»‡c cháº¡m tá»›i cÃ¡c luá»“ng Ä‘Ã£ nÃªu.
- **Schema runtime** mÃ  backend Ä‘Æ°á»£c phÃ©p gá»i: `backend/src/config/dbSchema` (Ä‘á»‘i chiáº¿u DB khi Ä‘á»•i báº£ng/cá»™t).
- **`dashboard.dashboard_monthly_summary`**: báº£ng **projection** (tá»•ng há»£p theo `month_key`), khÃ´ng coi lÃ  nÆ¡i phÃ¡t sinh business event â€” event gá»‘c náº±m á»Ÿ receipt / log NCC / cáº­p nháº­t Ä‘Æ¡n + luá»“ng post finance.
- Migration Ä‘Ã£ cháº¡y production: **khÃ´ng sá»­a lá»‹ch sá»­**; thay Ä‘á»•i DB báº±ng **migration Knex má»›i**.

---

## 3. Luá»“ng mÃ n **Tá»•ng quan** (Dashboard â†’ tab Overview)

Má»¥c tiÃªu hiá»‡n táº¡i: **UI Tá»•ng quan chá»‰ Ä‘á»c sá»‘ liá»‡u Ä‘Ã£ lÆ°u trong `dashboard.dashboard_monthly_summary`** (khÃ´ng query trá»±c tiáº¿p `order_list`, biÃªn lai Sepay hay `supplier_order_cost_log` cho API nÃ y). **Ngoáº¡i lá»‡ cÃ³ kiá»ƒm soÃ¡t** tá»« `dashboard.com_profit_expenses`: **lá»£i nhuáº­n thÃ¡ng** trá»« thÃªm chi phÃ­ **nháº­p hÃ ng MAVN** (`mavn_import`) vÃ  **nháº­p hÃ ng ngoÃ i luá»“ng** (`external_import`), theo thÃ¡ng `created_at`; **lá»£i nhuáº­n kháº£ dá»¥ng** chá»‰ trá»« `withdraw_profit` â€” xem **Â§3.3.1**.

### 3.1. Frontend

| File / hook | Viá»‡c lÃ m |
|-------------|----------|
| `frontend/src/features/dashboard/pages/DashboardPage.tsx` | Tab `overview`: `OverviewSection` + filter khoáº£ng ngÃ y (`dashboardRange`) |
| `frontend/src/features/dashboard/hooks/useDashboardStats.ts` | Gá»i `fetchDashboardStats(range)`, `fetchChartData(year)` hoáº·c `fetchChartDataRange(from,to)` |
| `frontend/src/features/dashboard/api/dashboardApi.ts` | `GET /api/dashboard/stats`, `/charts`, `/years`; mapping payload biá»ƒu Ä‘á»“ |
| `frontend/src/features/dashboard/hooks/useMonthlySummary.ts` | `GET /api/dashboard/monthly-summary` (hiá»‡n UI báº£ng cÃ³ thá»ƒ áº©n nhÆ°ng API váº«n dÃ¹ng Ä‘Æ°á»£c) |

### 3.2. Backend â€” route

Prefix API: **`/api/dashboard`** (`backend/src/routes/dashboardRoutes.js`).

| Method + path | Handler | Ghi chÃº |
|---------------|---------|---------|
| `GET /stats` | `dashboardStats` | KhÃ´ng query: KPI thÃ¡ng hiá»‡n táº¡i vs thÃ¡ng trÆ°á»›c tá»« báº£ng tá»•ng há»£p. CÃ³ `?from=&to=` (yyyy-mm-dd): **cá»™ng dá»“n má»i `month_key`** mÃ  khoáº£ng ngÃ y **cháº¡m** (tá»« thÃ¡ng cá»§a `from` Ä‘áº¿n thÃ¡ng cá»§a `to`). |
| `GET /charts` | `dashboardCharts` | `?year=`: cÃ¡c thÃ¡ng cá»§a nÄƒm tá»« báº£ng tá»•ng há»£p. `?from=&to=`: má»™t Ä‘iá»ƒm/thÃ¡ng trong danh sÃ¡ch `month_key` nhÆ° trÃªn. |
| `GET /years` | `dashboardYears` | NÄƒm láº¥y tá»« `DISTINCT` pháº§n nÄƒm trong `month_key` cá»§a báº£ng tá»•ng há»£p. |
| `GET /monthly-summary` | `dashboardMonthlySummary` | Danh sÃ¡ch hÃ ng `dashboard_monthly_summary`, `month_key` giáº£m dáº§n. |

Logic táº­p trung táº¡i **`backend/src/controllers/DashboardController/service.js`**; **`availableProfitFromSummary.js`** cho `availableProfit`.

### 3.3. HÃ nh vi nghiá»‡p vá»¥ cáº§n nhá»›

- **Filter theo ngÃ y** khÃ´ng chia nhá» trong thÃ¡ng: náº¿u range cáº¯t qua thÃ¡ng 3 vÃ  4 thÃ¬ KPI lÃ  **tá»•ng** cÃ¡c cá»™t cá»§a **cáº£** `month_key` 2026-03 vÃ  2026-04 (v.v.).
- Tháº» KPI: **thuáº¿** = cá»™t **`total_tax`** trÃªn báº£ng (khÃ´ng tÃ­nh láº¡i % trÃªn client cho API nÃ y).
- Cáº§n sá»‘ khá»›p biá»ƒu Ä‘á»“: báº£ng pháº£i Ä‘Æ°á»£c cáº­p nháº­t bá»Ÿi trigger / job / **`rebuild-dashboard-monthly-summary`** â€” xem plan cleanup má»¥c dashboard.

### 3.3.1. Lá»£i nhuáº­n thÃ¡ng (`monthlyProfit`) vÃ  lá»£i nhuáº­n kháº£ dá»¥ng (`availableProfit`) â€” `GET /api/dashboard/stats` (vÃ  range)

Nguá»“n gá»‘c doanh thu/lá»£i nhuáº­n thÃ¡ng trÃªn báº£ng: `dashboard.dashboard_monthly_summary`. Äiá»u chá»‰nh thÃªm tá»« `dashboard.com_profit_expenses` (theo **thÃ¡ng lá»‹ch** cá»§a `created_at`, `DATE_TRUNC` thÃ¡ng server):

| Sá»‘ hiá»ƒn thá»‹ | CÃ´ng thá»©c (tÃ³m táº¯t) |
|-------------|---------------------|
| **Lá»£i nhuáº­n thÃ¡ng** (KPI / biá»ƒu Ä‘á»“ / báº£ng monthly-summary API) | `total_profit` (theo `month_key` trÃªn summary) **trá»«** tá»•ng `amount` trong thÃ¡ng lá»‹ch cá»§a `created_at`: **Ä‘Æ¡n nháº­p MAVN** (`mavn_import`) vÃ  **nháº­p ngoÃ i luá»“ng** (`external_import`). Hai loáº¡i cÃ¹ng nguá»“n báº£ng `store_profit_expenses`. |
| **Lá»£i nhuáº­n kháº£ dá»¥ng** | `SUM(total_profit)` má»i thÃ¡ng trÃªn summary **chá»‰ trá»«** tá»•ng (má»i thá»i Ä‘iá»ƒm) `withdraw_profit` (rÃºt tiá»n). **KhÃ´ng** trá»« `mavn_import` / `external_import` vÃ o sá»‘ nÃ y. |
| **`previous` (kháº£ dá»¥ng)** | Tá»•ng `total_profit` cÃ¡c thÃ¡ng cÃ³ `month_key` **nhá» hÆ¡n** thÃ¡ng hiá»‡n táº¡i **trá»«** `withdraw_profit` cÃ³ `created_at` **trÆ°á»›c** ngÃ y 1 cá»§a thÃ¡ng hiá»‡n táº¡i. |

Logic: `service.js` + `availableProfitFromSummary.js` (kháº£ dá»¥ng) + `dashboardStoreExpenseDeductions.js` (tá»•ng `mavn_import` + `external_import` theo thÃ¡ng Ä‘á»ƒ **trá»«** khá»i lá»£i nhuáº­n thÃ¡ng; helper `withdraw_profit` cho kháº£ dá»¥ng).

- **`mavn_import`:** chi phÃ­ gáº¯n **Ä‘Æ¡n nháº­p MAVN** (thÆ°á»ng Ä‘á»“ng bá»™ khi táº¡o Ä‘Æ¡n ÄÃ£ TT â€” `Order/finance/mavnStoreExpenseSync`).
- **`external_import`:** chi phÃ­ **nháº­p hÃ ng ngoÃ i luá»“ng** (ghi tay qua API/UI, cÃ¹ng cÆ¡ cháº¿ trá»« LN thÃ¡ng theo `created_at`).

- **Lá»‹ch sá»­ / chá»‘t phÆ°Æ¡ng Ã¡n má»™t luá»“ng:** **`TQD-H03`**; **kháº£ dá»¥ng chá»‰ trá»« rÃºt tiá»n:** **`TQD-H08`** (cuá»‘i file).

### 3.4. TÃ¡ch vá»›i tooling ná»™i bá»™

- `buildAlignedMonthlyRows` trong `monthlySnapshot.js` váº«n dÃ¹ng cho **rebuild** vÃ  script **Ä‘á»‘i soÃ¡t ledger** (`revenueSource: 'receipts'`), **khÃ´ng** pháº£i nguá»“n cá»§a HTTP Tá»•ng quan sau thay Ä‘á»•i nÃ y.

---

## 4. Credit hoÃ n tiá»n khÃ¡ch (`receipt.refund_credit_notes`)

Phiáº¿u credit gáº¯n Ä‘Æ¡n nguá»“n hoÃ n tiá»n; dÃ¹ng khi **táº¡o Ä‘Æ¡n má»›i** (cháº¿ Ä‘á»™ Credit) hoáº·c Ã¡p vÃ o Ä‘Æ¡n Ä‘Ã­ch. Logic backend táº­p trung `backend/src/controllers/Order/finance/refundCredits.js`.

### 4.1. Danh sÃ¡ch kháº£ dá»¥ng cho dropdown táº¡o Ä‘Æ¡n

- **API:** `GET /api/orders/refund-credits/available` (`refundCreditRoutes.js`).
- **Äiá»u kiá»‡n phiáº¿u Ä‘Æ°á»£c coi lÃ  kháº£ dá»¥ng:** `available_amount > 0`; `status` âˆˆ `OPEN`, `PARTIALLY_APPLIED`; `succeeded_by_note_id` IS NULL; náº¿u cÃ³ `source_order_list_id` thÃ¬ join `orders.order_list` vÃ  chá»‰ giá»¯ khi Ä‘Æ¡n nguá»“n cÃ²n **ChÆ°a HoÃ n** hoáº·c **ÄÃ£ HoÃ n** (náº¿u khÃ´ng gáº¯n Ä‘Æ¡n nguá»“n váº«n tráº£ vá» â€” dá»¯ liá»‡u cÅ©).

### 4.2. XÃ¡c nháº­n hoÃ n tiá»n chuyá»ƒn khoáº£n (mÃ n HoÃ n tiá»n)

- **API:** `PATCH /api/orders/canceled/:id/refund` (`renewRoutes.js`): Ä‘Æ¡n **ChÆ°a HoÃ n** â†’ **ÄÃ£ HoÃ n**.
- **KÃ¨m theo (cÃ¹ng transaction):** gá»i `voidOpenRefundCreditNotesForSourceOrder` â€” **VOID** vÃ  **available_amount = 0** cho má»i phiáº¿u credit cÃ²n sá»‘ dÆ° (`OPEN` / `PARTIALLY_APPLIED`, `available_amount > 0`) cÃ³ `source_order_list_id` = id Ä‘Æ¡n; ghi chÃº vÃ o `note` (Ä‘Ã£ xÃ¡c nháº­n hoÃ n CK, há»§y credit cÃ²n láº¡i). Sau bÆ°á»›c nÃ y phiáº¿u khÃ´ng cÃ²n trong danh sÃ¡ch Â«availableÂ».

### 4.3. Nháº¯c Tá»•ng quan â€” lá»£i nhuáº­n thÃ¡ng & kháº£ dá»¥ng

- **Lá»£i nhuáº­n thÃ¡ng:** trá»« `mavn_import` + `external_import` (theo thÃ¡ng) â€” **Â§3.3.1**. **Lá»£i nhuáº­n kháº£ dá»¥ng:** chá»‰ trá»« `withdraw_profit` â€” **Â§3.3.1**; má»‘c lá»‹ch sá»­ **`TQD-H03`**, tinh chá»‰nh kháº£ dá»¥ng **`TQD-H08`**.

---

## 5. LiÃªn káº¿t nhanh

- Káº¿ hoáº¡ch cleanup rule: [`ke-hoach-cleanup-rule-he-thong.md`](./ke-hoach-cleanup-rule-he-thong.md)
- README setup: [`../README.md`](../README.md)

---

# Lá»‹ch sá»­ chá»‰nh sá»­a `tong-quan-du-an.md`

**Quy Æ°á»›c:** Má»—i láº§n **thÃªm hoáº·c sá»­a** ná»™i dung á»Ÿ cÃ¡c pháº§n phÃ­a trÃªn, ghi láº¡i **dÆ°á»›i Ä‘Ã¢y**: má»™t khá»‘i má»›i **á»Ÿ cuá»‘i** (dÆ°á»›i khá»‘i má»›i nháº¥t hiá»‡n cÃ³), cÃ³ **`ID:`** cá»‘ Ä‘á»‹nh dáº¡ng `` `TQD-Hxx` `` (tÄƒng dáº§n: `H01`, `H02`, â€¦) Ä‘á»ƒ tham chiáº¿u / gá»i láº¡i khi chá»‰nh sá»­a; luÃ´n cÃ³ **thá»i gian** (`YYYY-MM-DD`, cÃ³ thá»ƒ thÃªm giá» náº¿u nhiá»u thay Ä‘á»•i trong ngÃ y); ngÄƒn cÃ¡ch khá»‘i báº±ng má»™t dÃ²ng `---`.

---

**ID:** `TQD-H01` Â· **Thá»i gian:** 2026-04-29

- Khá»Ÿi táº¡o `docs/tong-quan-du-an.md`; mÃ´ táº£ luá»“ng Tá»•ng quan; API dashboard (`service.js`) chá»‰ Ä‘á»c `dashboard.dashboard_monthly_summary` cho stats / charts / years / monthly-summary.

---

**ID:** `TQD-H02` Â· **Thá»i gian:** 2026-04-29

- ThÃªm má»¥c Â«TrÆ°á»›c khi dá»n code (báº¯t buá»™c)Â»; bá»• sung bullet á»Ÿ Â§2.

---

**ID:** `TQD-H03` Â· **Thá»i gian:** 2026-04-29

- **Má»™t luá»“ng (API Tá»•ng quan â€” `service.js` + `availableProfitFromSummary.js` + `dashboardStoreExpenseDeductions.js`):**
  - **Lá»£i nhuáº­n thÃ¡ng** (`monthlyProfit`, biá»ƒu Ä‘á»“, `GET /dashboard/monthly-summary`): `total_profit` trÃªn `dashboard_monthly_summary` theo `month_key` **trá»«** (trong thÃ¡ng `created_at`) tá»•ng `mavn_import` + `external_import` trong `store_profit_expenses`.
  - **Lá»£i nhuáº­n kháº£ dá»¥ng** (`availableProfit`): `SUM(total_profit)` má»i thÃ¡ng trÃªn summary **chá»‰ trá»«** tá»•ng `withdraw_profit` (xem **`TQD-H08`** náº¿u cáº§n phÃ¢n biá»‡t vá»›i báº£n trÆ°á»›c Ä‘Ã£ trá»« thÃªm MAVN/external). `previous`: profit cÃ¡c thÃ¡ng trÆ°á»›c thÃ¡ng hiá»‡n táº¡i **trá»«** `withdraw_profit` cÃ³ `created_at` trÆ°á»›c ngÃ y 1 thÃ¡ng hiá»‡n táº¡i.

---

**ID:** `TQD-H04` Â· **Thá»i gian:** 2026-04-29

- Bá» báº£ng nháº­t kÃ½ giá»¯a file; chuyá»ƒn **toÃ n bá»™ lá»‹ch sá»­ chá»‰nh sá»­a tÃ i liá»‡u** xuá»‘ng **cuá»‘i file**; thÃªm quy Æ°á»›c khá»‘i + `---`; cáº­p nháº­t hÆ°á»›ng dáº«n sau Â«TrÆ°á»›c khi dá»n codeÂ» (ghi chÃº á»Ÿ cuá»‘i, cÃ³ thá»i gian).

---

**ID:** `TQD-H05` Â· **Thá»i gian:** 2026-04-29

- ThÃªm **Â§4** â€” credit hoÃ n tiá»n khÃ¡ch: Ä‘iá»u kiá»‡n `GET /api/orders/refund-credits/available`; `PATCH /api/orders/canceled/:id/refund` + `voidOpenRefundCreditNotesForSourceOrder`. ÄÃ¡nh sá»‘ láº¡i **LiÃªn káº¿t nhanh** thÃ nh **Â§5**. Â§4.3 trá» Â§3.3.1 + **`TQD-H03`**.

---

**ID:** `TQD-H06` Â· **Thá»i gian:** 2026-04-29

- Lá»‹ch sá»­: má»—i khá»‘i cÃ³ **`ID:` `TQD-Hxx`** cá»‘ Ä‘á»‹nh; gom cÃ¡c má»‘c trÃ¹ng `availableProfit` vá» **`TQD-H03`**; Â§3.3.1 vÃ  Â§4.3 trá» **`TQD-H03`**; bá»• sung **`TQD-H06`** cho má»‘c nÃ y.

---

**ID:** `TQD-H07` Â· **Thá»i gian:** 2026-04-29

- Chá»‘t pháº§n **lá»£i nhuáº­n thÃ¡ng** vÃ  khá»‘i Ä‘iá»u chá»‰nh tá»« `store_profit_expenses`: thÃ¡ng trá»« `mavn_import` + `external_import` (theo thÃ¡ng); phiÃªn báº£n **`availableProfit`** khi Ä‘Ã³ cÃ²n trá»« cáº£ MAVN/external + `withdraw_profit` â€” sau Ä‘Ã³ Ä‘Æ°á»£c thay báº±ng quy táº¯c **chá»‰ trá»« rÃºt tiá»n** (**`TQD-H08`**).

---

**ID:** `TQD-H08` Â· **Thá»i gian:** 2026-04-29

- **Lá»£i nhuáº­n kháº£ dá»¥ng** (`availableProfit`, `GET /api/dashboard/stats`): chá»‰ **`SUM(total_profit)` âˆ’ tá»•ng `withdraw_profit`**; **khÃ´ng** trá»« `mavn_import` / `external_import` (hai loáº¡i nÃ y chá»‰ lÃ m giáº£m **lá»£i nhuáº­n thÃ¡ng**). `previous` (kháº£ dá»¥ng): tá»•ng `total_profit` cÃ¡c thÃ¡ng trÆ°á»›c thÃ¡ng hiá»‡n táº¡i **trá»«** `withdraw_profit` trÆ°á»›c ngÃ y 1 thÃ¡ng hiá»‡n táº¡i. Code: `fetchAvailableProfitPair` trong **`availableProfitFromSummary.js`** (chá»‰ Ä‘á»c summary + `withdraw_profit`). Cáº­p nháº­t Â§3.3.1, Â§4.3, khá»‘i **`TQD-H03`**.

---

**ID:** `TQD-H09` Â· **Thá»i gian:** 2026-04-29

- Äá»“ng bá»™ code vá»›i Â§3 / **TQD-H03** / **TQD-H08**: `fetchAvailableProfitPair` chá»‰ trá»« `withdraw_profit`; lá»£i nhuáº­n thÃ¡ng (stats, monthly rows, charts theo range) **trá»«** `mavn_import` + `external_import` theo thÃ¡ng `created_at`; thuáº¿ KPI dÃ¹ng `total_tax` trÃªn `dashboard_monthly_summary` khi cÃ³ hÃ ng; `GET /stats?from&to` vÃ  `GET /charts?from&to` cá»™ng dá»“n theo **month_key** tá»« báº£ng tá»•ng há»£p (khÃ´ng query Sepay/NCC trá»±c tiáº¿p cho cÃ¡c API Ä‘Ã³). KhÃ´i phá»¥c `dashboardStoreExpenseDeductions.js` náº¿u thiáº¿u trong working tree.

---

**ID:** `TQD-H10` Â· **Thá»i gian:** 2026-04-29

- LÃ m rÃµ Â§3 (ngoáº¡i lá»‡ `store_profit_expenses` tÃ¡ch **thÃ¡ng** vs **kháº£ dá»¥ng**); tÃ¡ch `fetchAvailableProfitPair` â†’ **`availableProfitFromSummary.js`** (há»£p Ä‘á»“ng: kháº£ dá»¥ng **chá»‰** trá»« `withdraw_profit`).

---

**ID:** `TQD-H11` Â· **Thá»i gian:** 2026-04-29

- Chá»‘t diá»…n Ä‘áº¡t nghiá»‡p vá»¥: **lá»£i nhuáº­n thÃ¡ng** trá»« **nháº­p hÃ ng MAVN** (`mavn_import`) vÃ  **nháº­p hÃ ng ngoÃ i luá»“ng** (`external_import`); cáº­p nháº­t Â§3, Â§3.3.1 vÃ  comment `dashboardStoreExpenseDeductions.js`.

---

**ID:** `TQD-H12` Â· **Thá»i gian:** 2026-04-29

- Webhook Sepay (`webhook/sepay/routes/webhook.js`): Ä‘Æ¡n **ÄÃ£ Thanh ToÃ¡n** + biÃªn lai má»›i (`inserted`) â†’ cá»™ng **doanh thu vÃ  lá»£i nhuáº­n** cÃ¹ng sá»‘ tiá»n giao dá»‹ch (**khÃ´ng** trá»« cost, nhÃ¡nh audit **`POST_PAID_ADDITIONAL_RECEIPT`**). Sá»­a Ä‘iá»u kiá»‡n cÅ© `__skip_already_posted__` (khÃ´ng bao giá» khá»›p vá»›i `PAID`).


## --- [huong-dan-dashboard.md] ---

# HÆ°á»›ng dáº«n Báº£ng Ä‘iá»u khiá»ƒn (Dashboard)

TÃ i liá»‡u nÃ y mÃ´ táº£ **tá»«ng khá»‘i giao diá»‡n** trÃªn mÃ n hÃ¬nh Báº£ng Ä‘iá»u khiá»ƒn, dÃ nh cho ngÆ°á»i dÃ¹ng **khÃ´ng cáº§n biáº¿t láº­p trÃ¬nh**. Báº¡n cÃ³ thá»ƒ Ä‘á»‘i chiáº¿u tá»«ng pháº§n trÃªn mÃ n hÃ¬nh vá»›i tÃªn gá»i bÃªn dÆ°á»›i.

---

## 1. MÃ n hÃ¬nh dÃ¹ng Ä‘á»ƒ lÃ m gÃ¬?

**Báº£ng Ä‘iá»u khiá»ƒn** giÃºp xem nhanh:

- Sá»‘ liá»‡u kinh doanh theo thÃ¡ng hoáº·c theo khoáº£ng thá»i gian báº¡n chá»n.
- TÃ¬nh hÃ¬nh Ä‘Æ¡n hÃ ng (cÃ³ bao nhiÃªu Ä‘Æ¡n, bao nhiÃªu Ä‘Æ¡n há»§y).
- Má»™t sá»‘ thÃ´ng tin tÃ i sáº£n, quá»¹ vÃ  má»¥c tiÃªu tiáº¿t kiá»‡m (á»Ÿ tab riÃªng).

CÃ¡c sá»‘ thÆ°á»ng hiá»ƒn thá»‹ báº±ng **VND** (Ä‘á»“ng). Trá»¥c tá»a Ä‘á»™ trÃªn biá»ƒu Ä‘á»“ lá»›n cÃ³ thá»ƒ ghi dáº¡ng rÃºt gá»n (vÃ­ dá»¥ K = nghÃ¬n, M = triá»‡u) Ä‘á»ƒ dá»… Ä‘á»c.

---

## 2. Cáº¥u trÃºc tá»•ng thá»ƒ: hai tab lá»›n

PhÃ­a dÆ°á»›i pháº§n tiÃªu Ä‘á» trang cÃ³ **hai tab**:

| Tab         | TÃªn gá»i trÃªn mÃ n hÃ¬nh | Ná»™i dung chÃ­nh |
|------------|------------------------|----------------|
| **Tá»•ng quan** | â€œTá»•ng quanâ€            | Sá»‘ nhanh, biá»ƒu Ä‘á»“ tÃ i chÃ­nh vÃ  biá»ƒu Ä‘á»“ Ä‘Æ¡n hÃ ng. |
| **TÃ i sáº£n**   | â€œTÃ i sáº£nâ€              | Má»¥c tiÃªu tiáº¿t kiá»‡m, tÃ³m táº¯t liÃªn quan quá»¹, báº£ng sá»‘ dÆ° vÃ­. |

Báº¡n báº¥m vÃ o tá»«ng tab Ä‘á»ƒ chuyá»ƒn giá»¯a hai khu vá»±c nÃ y.

---

## 3. Pháº§n Ä‘áº§u trang: tiÃªu Ä‘á» vÃ  (khi á»Ÿ tab Tá»•ng quan) bá»™ lá»c thá»i gian

### 3.1. Khá»‘i tiÃªu Ä‘á» (hero)

- CÃ³ dÃ²ng chá»¯ lá»›n **â€œBáº£ng Äiá»u Khiá»ƒnâ€** vÃ  mÃ´ táº£ phá»¥ báº±ng tiáº¿ng Anh ngáº¯n.
- Má»¥c Ä‘Ã­ch: xÃ¡c Ä‘á»‹nh ráº±ng Ä‘Ã¢y lÃ  trang tá»•ng quan, khÃ´ng pháº£i trang chi tiáº¿t tá»«ng Ä‘Æ¡n.

### 3.2. Lá»c chu ká»³ (chá»‰ hiá»‡n khi báº¡n Ä‘ang á»Ÿ tab **Tá»•ng quan**)

- á»ž gÃ³c pháº£i (trÃªn mÃ n hÃ¬nh lá»›n) hoáº·c phÃ­a dÆ°á»›i tiÃªu Ä‘á» (mÃ n hÃ¬nh nhá») cÃ³ khu vá»±c **chá»n khoáº£ng ngÃ y** (cÃ³ dÃ²ng gá»£i Ã½ *â€œLá»c chu ká»³â€*).
- **Khi báº¡n chÆ°a chá»n gÃ¬** (hoáº·c chá»n má»©c máº·c Ä‘á»‹nh tÆ°Æ¡ng Ä‘Æ°Æ¡ng â€œxem theo nÄƒm hiá»‡n táº¡iâ€ trÃªn biá»ƒu Ä‘á»“):  
  CÃ¡c sá»‘ á»Ÿ tháº» tá»•ng quan thÆ°á»ng láº¥y theo **thÃ¡ng hiá»‡n táº¡i** so vá»›i **thÃ¡ng trÆ°á»›c**; biá»ƒu Ä‘á»“ theo thÃ¡ng trong **nÄƒm** báº¡n chá»n á»Ÿ há»™p chá»n nÄƒm.
- **Khi báº¡n chá»n má»™t khoáº£ng ngÃ y cá»¥ thá»ƒ** (tá»« ngÃ y â€“ Ä‘áº¿n ngÃ y):  
  CÃ¡c sá»‘ á»Ÿ tháº» tá»•ng quan sáº½ so sÃ¡nh **khoáº£ng Ä‘Ã³** vá»›i **khoáº£ng cÃ¹ng Ä‘á»™ dÃ i ngay trÆ°á»›c** (ká»³ trÆ°á»›c tÆ°Æ¡ng á»©ng). TrÃªn biá»ƒu Ä‘á»“ tÃ i chÃ­nh cÃ³ dÃ²ng ghi tÆ°Æ¡ng tá»± *â€œTheo chu ká»³ Ä‘Ã£ chá»nâ€* vÃ  bá»™ chá»n nÄƒm Ä‘Æ°á»£c áº©n, vÃ¬ dá»¯ liá»‡u Ä‘ang theo Ä‘Ãºng khoáº£ng báº¡n lá»c.

> **CÃ¡ch hiá»ƒu Ä‘Æ¡n giáº£n:** Lá»c chu ká»³ giÃºp báº¡n há»i: â€œTrong Ä‘oáº¡n thá»i gian nÃ y, káº¿t quáº£ tháº¿ nÃ o so vá»›i ká»³ liá»n ká» tÆ°Æ¡ng á»©ng?â€ thay vÃ¬ luÃ´n xem theo tá»«ng thÃ¡ng.

---

## 4. Tab **Tá»•ng quan** â€” tá»«ng khá»‘i chi tiáº¿t

### 4.1. HÃ ng sÃ¡u tháº» sá»‘ lá»›n (KPI / chá»‰ sá»‘ tá»•ng quan)

ÄÃ¢y lÃ  **sÃ¡u Ã´** xáº¿p lÆ°á»›i (trÃªn Ä‘iá»‡n thoáº¡i thÆ°á»ng 1 cá»™t, trÃªn mÃ n hÃ¬nh lá»›n cÃ³ thá»ƒ 2â€“3 cá»™t). Má»—i tháº» gá»“m: **tÃªn**, **má»™t sá»‘ lá»›n**, vÃ  thÆ°á»ng kÃ¨m **má»™t dÃ²ng %** (so sÃ¡nh vá»›i ká»³ trÆ°á»›c â€” thÃ¡ng trÆ°á»›c hoáº·c ká»³ tÆ°Æ¡ng á»©ng khi dÃ¹ng lá»c chu ká»³).

DÆ°á»›i Ä‘Ã¢y lÃ  tá»«ng tháº» theo tÃªn báº¡n sáº½ tháº¥y trÃªn mÃ n hÃ¬nh:

| TÃªn trÃªn mÃ n hÃ¬nh   | Báº¡n cáº§n hiá»ƒu sá»‘ nÃ y lÃ  gÃ¬ (phiÃªn báº£n dá»… hiá»ƒu) |
|--------------------|-----------------------------------------------|
| **Tá»•ng Ä‘Æ¡n hÃ ng**  | Sá»‘ lÆ°á»£ng Ä‘Æ¡n hÃ ng (Ä‘áº¿m theo cÃ¡ch há»‡ thá»‘ng Ä‘ang cáº¥u hÃ¬nh) trong thÃ¡ng/ká»³ lá»±a chá»n, so vá»›i thÃ¡ng/ká»³ trÆ°á»›c. Con sá»‘ bÃªn dÆ°á»›i tÃªn thÆ°á»ng lÃ  **sá»‘ nguyÃªn** (khÃ´ng pháº£i tiá»n). |
| **Doanh thu**      | Tá»•ng tiá»n bÃ¡n/Ä‘Ã£ ghi nháº­n thanh toÃ¡n tÆ°Æ¡ng á»©ng vá»›i cÃ¡ch cáº¥u hÃ¬nh há»‡ thá»‘ng (vÃ­ dá»¥: theo **biÃªn lai** thanh toÃ¡n náº¿u Ä‘Ã£ tÃ­ch há»£p). Thá»ƒ hiá»‡n má»©c thu thá»±c táº¿ theo tá»«ng thÃ¡ng hoáº·c ká»³. |
| **HoÃ n tiá»n**      | Sá»‘ tiá»n hoÃ n láº¡i cho khÃ¡ch (theo cÃ¡ch há»‡ thá»‘ng ghi nháº­n há»§y/ hoÃ n) trong cÃ¹ng thÃ¡ng/ká»³. GiÃºp tháº¥y gÃ¡nh náº·ng hoÃ n so vá»›i doanh thu. |
| **Tá»•ng nháº­p hÃ ng** | Tá»•ng **chi phÃ­ mua hÃ ng tá»« nhÃ  cung cáº¥p (NCC)** theo sá»• nháº­t kÃ½ nháº­p/cost, gáº¯n vá»›i thÃ¡ng ghi nháº­n. ÄÃ¢y **khÃ´ng pháº£i** cá»™t â€œlÃ£iâ€ mÃ  lÃ  **tiá»n bá» ra Ä‘á»ƒ hÃ ng vá»** (theo sá»‘ liá»‡u Ä‘Ã£ nháº­p há»‡ thá»‘ng). |
| **Lá»£i nhuáº­n thÃ¡ng** | **Lá»£i nhuáº­n kinh doanh cÃ²n láº¡i sau khi Ä‘Ã£ tÃ­nh Ä‘áº¿n pháº§n rÃºt lá»£i nhuáº­n theo thÃ¡ng** (náº¿u doanh nghiá»‡p Ä‘Ã£ cáº¥u hÃ¬nh bÆ°á»›c rÃºt nÃ y). á»ž má»©c báº£n cháº¥t, lá»£i nhuáº­n pháº£n Ã¡nh chÃªnh lá»‡ch thu há»£p lÃ½ so vá»›i vá»‘n hÃ ng theo tá»«ng dÃ²ng, sau cÃ¡c Ä‘iá»u chá»‰nh mÃ  há»‡ thá»‘ng Ä‘ang Ã¡p dá»¥ng. |
| **Thuáº¿**           | **Má»©c Æ°á»›c tÃ­nh thuáº¿** theo cáº¥u hÃ¬nh tá»· lá»‡ pháº§n trÄƒm trÃªn cÆ¡ sá»Ÿ sá»‘ dÃ¹ng cho thu nháº­p/doanh thu â€” **dÃ¹ng Ä‘á»ƒ tham kháº£o nhanh**, khÃ´ng thay tháº¿ tÆ° váº¥n káº¿ toÃ¡n. |

> **DÃ²ng % dÆ°á»›i má»—i tháº»:** thÆ°á»ng lÃ  â€œtÄƒng/giáº£m bao nhiÃªu % so vá»›i ká»³ trÆ°á»›câ€ (dÆ°Æ¡ng = cao hÆ¡n trÆ°á»›c, Ã¢m = tháº¥p hÆ¡n trÆ°á»›c), trá»« khi há»‡ thá»‘ng táº¡m khÃ´ng tÃ­nh Ä‘Æ°á»£c thÃ¬ cÃ³ thá»ƒ hiá»‡n dáº¡ng khÃ¡c (vÃ­ dá»¥ â€œN/Aâ€).

> **Ghi chÃº vá» tháº» Tá»•ng Ä‘Æ¡n hÃ ng:** vá»›i nÄƒm hiá»‡n táº¡i, tá»· lá»‡ % thay Ä‘á»•i thá»‰nh thoáº£ng cÃ³ thá»ƒ tÃ­nh dá»±a theo dá»¯ liá»‡u biá»ƒu Ä‘á»“ vÃ i thÃ¡ng gáº§n nháº¥t. Náº¿u tháº¥y láº¡, hÃ£y coi sá»‘ tuyá»‡t Ä‘á»‘i (con sá»‘ lá»›n) lÃ  thÃ´ng tin chÃ­nh, % so sÃ¡nh lÃ  phá»¥.

---

### 4.2. Biá»ƒu Ä‘á»“ lá»›n: â€œTÃ i chÃ­nh theo thÃ¡ngâ€ â€” bá»‘n Ä‘Æ°á»ng

Khá»‘i cÃ³ tiÃªu Ä‘á» tÆ°Æ¡ng tá»±: **â€œDoanh thu, lá»£i nhuáº­n, hoÃ n tiá»n vÃ  thuáº¿â€**, kÃ¨m chÃº giáº£i mÃ u (chÃº thÃ­ch) cho bá»‘n Ä‘Æ°á»ng:

| MÃ u / tÃªn trÃªn chÃº giáº£i | Ná»™i dung báº¡n Ä‘ang xem theo tá»«ng thÃ¡ng (hoáº·c theo tá»«ng cá»™t tÆ°Æ¡ng á»©ng náº¿u lá»c khoáº£ng ngÃ y) |
|------------------------|-----------------------------------------------------------------------------|
| **Doanh thu** (xanh dÆ°Æ¡ng) | Tá»•ng thu tÆ°Æ¡ng á»©ng cáº¥u hÃ¬nh, theo tá»«ng má»‘c thá»i gian. |
| **Lá»£i nhuáº­n** (xanh lÃ¡)   | Má»©c lá»£i nhuáº­n theo tá»«ng má»‘c (tham chiáº¿u cÃ¹ng cÃ¡ch tÃ­nh vá»›i tháº» â€œLá»£i nhuáº­n thÃ¡ngâ€, nhÆ°ng á»Ÿ dáº¡ng chuá»—i theo thá»i gian). |
| **HoÃ n tiá»n** (há»“ng)     | Sá»‘ hoÃ n theo tá»«ng má»‘c. |
| **Thuáº¿** (tÃ­m)           | Má»©c Æ°á»›c tÃ­nh thuáº¿ theo tá»«ng má»‘c, theo tá»· lá»‡ cÃ i Ä‘áº·t. |

- TrÃªn trá»¥c ngang: **T1, T2, â€¦** hoáº·c nhÃ£n thÃ¡ng tÆ°Æ¡ng á»©ng.
- TrÃªn trá»¥c dá»c: sá»‘ tiá»n (cÃ³ thá»ƒ rÃºt gá»n B/M/K tÃ¹y má»©c lá»›n).
- Khi báº¡n rÃª chuá»™t (hoáº·c cháº¡m) vÃ o tá»«ng Ä‘iá»ƒm, thÆ°á»ng sáº½ hiá»‡n **Ã´ gá»£i Ã½ (tooltip)** vá»›i sá»‘ Ä‘áº§y Ä‘á»§ hÆ¡n.

**Khi báº¡n dÃ¹ng lá»c chu ká»³ theo ngÃ y:** trá»¥c ngang sáº½ pháº£n Ã¡nh **cÃ¡c cá»™t/Ä‘iá»ƒm** trong khoáº£ng thá»i gian báº¡n chá»n, khÃ´ng cÃ²n gáº¯n cá»‘ Ä‘á»‹nh vá»›i cáº£ 12 thÃ¡ng cá»§a nÄƒm.

---

### 4.3. Bá»™ chá»n nÄƒm (gÃ³c biá»ƒu Ä‘á»“ tÃ i chÃ­nh)

- Khi **khÃ´ng** báº­t lá»c theo khoáº£ng ngÃ y, báº¡n thÆ°á»ng tháº¥y **Ã´ chá»n nÄƒm** (dropdown) Ä‘á»ƒ xem cáº£ nÄƒm Ä‘Ã³ theo tá»«ng thÃ¡ng.
- Khi **Ä‘Ã£** báº­t lá»c khoáº£ng ngÃ y, Ã´ nÃ y Ä‘Æ°á»£c áº©n vÃ¬ dá»¯ liá»‡u Ä‘i theo **chu ká»³ Ä‘Ã£ chá»n** (cÃ³ dÃ²ng ghi *â€œTheo chu ká»³ Ä‘Ã£ chá»nâ€*).

---

### 4.4. Biá»ƒu Ä‘á»“ cá»™t: â€œÄÆ¡n hÃ ng theo thÃ¡ngâ€

Khá»‘i bÃªn cáº¡nh (hoáº·c bÃªn dÆ°á»›i trÃªn mÃ n háº¹p) vá»›i mÃ´ táº£ tÆ°Æ¡ng tá»±: **â€œTá»•ng Ä‘Æ¡n vÃ  Ä‘Æ¡n há»§y theo thÃ¡ngâ€**.

| ThÃ nh pháº§n   | Ã nghÄ©a |
|-------------|--------|
| Cá»™t (mÃ u láº¡nh) **Tá»•ng Ä‘Æ¡n** | Sá»‘ lÆ°á»£ng Ä‘Æ¡n phÃ¡t sinh theo tá»«ng má»‘c thá»i gian (trá»¥c tá»a Ä‘á»™ lÃ  **sá»‘ lÆ°á»£ng**, khÃ´ng pháº£i tiá»n). |
| Cá»™t (mÃ u há»“ng) **ÄÆ¡n há»§y**  | Sá»‘ lÆ°á»£ng Ä‘Æ¡n á»Ÿ tráº¡ng thÃ¡i há»§y (theo cÃ¡ch há»‡ thá»‘ng xÃ¡c Ä‘á»‹nh theo tá»«ng má»‘c). |

Pháº§n mÃ´ táº£ dÆ°á»›i tiÃªu Ä‘á» giÃºp báº¡n tháº¥y xu hÆ°á»›ng: thÃ¡ng nÃ o nhiá»u Ä‘Æ¡n, thÃ¡ng nÃ o há»§y nhiá»u hÆ¡n.

---

## 5. Báº£ng tÃ³m táº¯t theo thÃ¡ng (cÃ³ thá»ƒ chÆ°a báº­t trÃªn giao diá»‡n)

Há»‡ thá»‘ng **cÃ³ thá»ƒ cung cáº¥p** báº£ng chi tiáº¿t tá»«ng thÃ¡ng (Ä‘Æ¡n, doanh thu, hoÃ n, nháº­p, thuáº¿, cáº­p nháº­t láº§n cuá»‘i, â€¦) qua tÃ­nh nÄƒng ná»n. TrÃªn báº£n mÃ n hÃ¬nh **hiá»‡n táº¡i**, báº£ng nÃ y **cÃ³ thá»ƒ Ä‘Æ°á»£c táº¯t** Ä‘á»ƒ giao diá»‡n gá»n hÆ¡n. Náº¿u báº¡n cáº§n xem, hÃ£y há»i bá»™ pháº­n quáº£n trá»‹ há»‡ thá»‘ng cÃ³ báº­t hiá»ƒn thá»‹ hay cung cáº¥p bÃ¡o cÃ¡o xuáº¥t file hay khÃ´ng.

---

## 6. Tab **TÃ i sáº£n** â€” tá»«ng khá»‘i

### 6.1. Ã” tÃ³m táº¯t tÃ i chÃ­nh (phÃ­a trÃªn)

- Khu vá»±c lÆ°á»›i 1â€“2 cá»™t, **má»—i Ã´** cÃ³ thá»ƒ hiá»ƒn thá»‹ má»™t sá»‘ tÃ³m táº¯t tÃ i chÃ­nh (náº¿u Ä‘Æ°á»£c cáº¥u hÃ¬nh tá»« phÃ­a há»‡ thá»‘ng).
- Trong cáº¥u hÃ¬nh máº·c Ä‘á»‹nh, **cÃ³ thá»ƒ chÆ°a cÃ³ sá»‘ nÃ o** (danh sÃ¡ch rá»—ng) â€” lÃºc Ä‘Ã³ báº¡n sáº½ khÃ´ng tháº¥y tháº» á»Ÿ Ä‘Ã¢y. ÄÃ¢y khÃ´ng pháº£i lá»—i; chá»‰ lÃ  chÆ°a thÃªm ná»™i dung hiá»ƒn thá»‹.

### 6.2. Khá»‘i má»¥c tiÃªu, ngÃ¢n sÃ¡ch vÃ  biá»ƒu Ä‘á»“

- ThÆ°á»ng bao gá»“m: **Má»¥c tiÃªu tiáº¿t kiá»‡m** (danh sÃ¡ch, thÃªm/sá»­a/xÃ³a tÃ¹y quyá»n), **má»™t sá»‘ thá»‘ng kÃª dáº¡ng biá»ƒu Ä‘á»“/tuáº§n** (náº¿u cÃ³ dá»¯ liá»‡u vÃ­ theo tá»«ng cá»™t thá»i gian), vÃ  má»¥c con nhÆ° *â€œLá»£i nhuáº­n kháº£ dá»¥ngâ€* â€” Ä‘Ã¢y lÃ  **chá»‰ sá»‘ tá»•ng há»£p** tá»« phÃ­a tÃ i chÃ­nh, giÃºp xem pháº§n lá»£i nhuáº­n cÃ²n **cÃ³ thá»ƒ dÃ¹ng** theo cÃ¡ch Ä‘á»‹nh nghÄ©a trong há»‡ thá»‘ng (cÃ³ thá»ƒ trá»« Ä‘i cÃ¡c khoáº£n Ä‘Ã£ tÃ­nh tá»« quá»¹/chi, tÃ¹y cÃ i Ä‘áº·t).
- CÃ¡c **thanh má»¥c tiÃªu** (progress) dá»±a trÃªn **dá»¯ liá»‡u má»¥c tiÃªu** báº¡n táº¡o vÃ  sá»‘ tá»« **cá»™t quá»¹** tÆ°Æ¡ng á»©ng (vÃ­ dá»¥ cá»™t tÃªn gáº§n nghÄ©a vá»›i â€œquá»¹â€) náº¿u cÃ³.
- CÃ³ thá»ƒ cÃ³ **báº£ng ngÃ¢n sÃ¡ch** minh hoáº¡ hoáº·c dá»¯ liá»‡u máº«u â€” tÃ¹y phiÃªn báº£n: náº¿u tháº¥y sá»‘ á»•n Ä‘á»‹nh khÃ´ng Ä‘á»•i, cÃ³ thá»ƒ Ä‘Ã³ lÃ  dá»¯ liá»‡u minh hoáº¡; sá»‘ tháº­t cáº§n xÃ¡c nháº­n vá»›i quáº£n trá»‹.

### 6.3. Sá»‘ dÆ° vÃ­ (báº£ng vÃ­ / Wallet)

- Má»™t báº£ng vá»›i **cÃ¡c cá»™t = loáº¡i tÃ i sáº£n (vÃ­)** do há»‡ thá»‘ng Ä‘á»‹nh nghÄ©a, má»—i dÃ²ng = **má»™t thá»i Ä‘iá»ƒm cáº­p nháº­t** (vÃ­ dá»¥ ngÃ y láº¥y sá»‘ má»›i nháº¥t á»Ÿ dÃ²ng trÃªn cÃ¹ng).
- CÃ³ nÃºt **lÃ m má»›i** Ä‘á»ƒ táº£i láº¡i sá»‘ má»›i tá»« mÃ¡y chá»§.
- DÃ¹ng Ä‘á»ƒ Ä‘á»‘i chiáº¿u: tiá»n Ä‘ang náº±m á»Ÿ Ä‘Ã¢u, bao nhiÃªu, trong tá»«ng loáº¡i vÃ­ quáº£n lÃ½ trÃªn há»‡ thá»‘ng.

### 6.4. CÃ¡c hÃ nh Ä‘á»™ng bá»• sung (náº¿u báº¡n tháº¥y trÃªn mÃ n hÃ¬nh)

- CÃ³ thá»ƒ cÃ³ **cá»­a sá»• rÃºt tiá»n**, **gÃ¡n loáº¡i vÃ­**, v.v. â€” tÃ¹y quyá»n tÃ i khoáº£n. CÃ¡c tÃ­nh nÄƒng nÃ y áº£nh hÆ°á»Ÿng sá»‘ dÆ° sau khi xÃ¡c nháº­n; cáº§n tháº­n trá»ng vÃ  lÃ m theo quy trÃ¬nh ná»™i bá»™.

---

## 7. CÃ¡c Ä‘iá»ƒm cáº§n nhá»› (giÃºp trÃ¡nh hiá»ƒu nháº§m)

1. **Doanh thu** trÃªn dashboard Ä‘ang pháº£n Ã¡nh cÃ¡ch cáº¥u hÃ¬nh thanh toÃ¡n/ biÃªn lai â€” náº¿u cá»­a hÃ ng má»›i tÃ­ch há»£p, má»™t thá»i gian Ä‘áº§u sá»‘ liá»‡u cÃ³ thá»ƒ tÄƒng dáº§n khi dá»¯ liá»‡u cÅ© Ä‘Æ°á»£c Ä‘Æ°a vÃ o.
2. **Nháº­p hÃ ng** tÃ­nh tá»« sá»• nháº­t kÃ½ mua/ giÃ¡ tá»« NCC â€” cáº§n nháº­p **Ä‘Ãºng, Ä‘á»§, Ä‘Ãºng thÃ¡ng ghi nháº­n** thÃ¬ tá»•ng má»›i sÃ¡t thá»±c táº¿.
3. **Lá»£i nhuáº­n** trÃªn báº£ng Ä‘iá»u khiá»ƒn theo tá»«ng cÃ¡ch tÃ­nh ná»™i bá»™ (chÃªnh lá»‡ch bÃ¡n vá»›i vá»‘n theo tá»«ng dÃ²ng, cÃ³ trá»« pháº§n rÃºt theo thÃ¡ng náº¿u cáº¥u hÃ¬nh) â€” dÃ¹ng Ä‘á»ƒ váº­n hÃ nh, **khÃ´ng tá»± thay cÃ´ng bá»‘ tÃ i chÃ­nh** káº¿ toÃ¡n/ thuáº¿ thá»±c táº¿ mÃ  khÃ´ng Ä‘á»‘i soÃ¡t bÃªn ngoÃ i.
4. **Thuáº¿** hiá»ƒn thá»‹ á»Ÿ Ä‘Ã¢y thÆ°á»ng lÃ  **mÃ´ phá»ng/Æ°á»›c tÃ­nh theo tá»· lá»‡** cÃ i trÃªn há»‡ thá»‘ng (biáº¿n mÃ´i trÆ°á»ng cáº¥u hÃ¬nh), **khÃ´ng** tá»± báº±ng tá» khai thuáº¿ thá»±c táº¿ náº¿u chÆ°a Ä‘Æ°á»£c thiáº¿t láº­p Ä‘áº§y Ä‘á»§ tá»« káº¿ toÃ¡n.
5. **So sÃ¡nh %** máº¡nh nháº¥t khi â€œká»³ trÆ°á»›câ€ cÃ³ sá»‘ tÆ°Æ¡ng tá»±. ThÃ¡ng Ä‘áº§u tiÃªn dá»¯ liá»‡u hoáº·c thÃ¡ng cÃ³ biáº¿n Ä‘á»™ng báº¥t thÆ°á»ng dá»… lÃ m tá»· lá»‡ % trÃ´ng láº¡; khi cáº§n, hÃ£y so **sá»‘ tuyá»‡t Ä‘á»‘i** thay vÃ¬ chá»‰ nhÃ¬n %.
6. Náº¿u tháº¥y **bÃ¡o lá»—i mÃ u Ä‘á»** trÃªn cÃ¹ng trang, Ä‘Ã³ thÆ°á»ng lÃ  **khÃ´ng táº£i Ä‘Æ°á»£c sá»‘ tá»« mÃ¡y chá»§** â€” báº¡n nÃªn táº£i láº¡i trang hoáº·c thá»­ láº¡i sau; náº¿u váº«n lá»—i, cáº§n nhá» bá»™ pháº­n ká»¹ thuáº­t.

---

## 8. Tá»« Ä‘iá»ƒn nhanh (má»™t tá»« â€” má»™t cÃ¢u)

| Thuáº­t ngá»¯ báº¡n dá»… gáº·p | NghÄ©a ngáº¯n gá»n |
|----------------------|----------------|
| **KPI / tháº» sá»‘**     | Má»™t sá»‘ tá»•ng há»£p ná»•i báº­t trÃªn cÃ¹ng mÃ n. |
| **Ká»³ trÆ°á»›c**         | ThÃ¡ng trÆ°á»›c, hoáº·c khoáº£ng thá»i gian ngay trÆ°á»›c (khi dÃ¹ng lá»c tá»« ngÃ y â€“ Ä‘áº¿n ngÃ y). |
| **BiÃªn lai**         | CÄƒn cá»© ghi nháº­n tiá»n thu tá»« thanh toÃ¡n/ chuyá»ƒn khoáº£n (tÃ¹y cÃ i Ä‘áº·t há»‡ thá»‘ng). |
| **Nháº­p hÃ ng (NCC)**  | Tá»•ng tiá»n theo sá»• nháº­t tá»« nhÃ  cung cáº¥p, gáº¯n thÃ¡ng. |
| **Lá»£i nhuáº­n kháº£ dá»¥ng** (trong pháº§n TÃ i sáº£n) | Má»™t tá»•ng cá»™ng phá»¥c vá»¥ theo dÃµi, cÃ³ cÃ¡ch tÃ­nh riÃªng trong há»‡ thá»‘ng â€” Ä‘á»c cÃ¹ng má»¥c mÃ´ táº£ trÃªn mÃ n. |

---

*TÃ i liá»‡u nÃ y mÃ´ táº£ hÃ nh vi giao diá»‡n vÃ  cÃ¡ch diá»…n giáº£i sá»‘ theo cáº¥u hÃ¬nh há»‡ thá»‘ng phá»• biáº¿n. Sá»‘ tÃ­nh toÃ¡n chÃ­nh xÃ¡c á»Ÿ tá»«ng thá»i Ä‘iá»ƒm phá»¥ thuá»™c dá»¯ liá»‡u báº¡n Ä‘Ã£ nháº­p, quyá»n tÃ i khoáº£n vÃ  cÃ i Ä‘áº·t mÃ¡y chá»§.*


## --- [PAGES_BANG_GIA.md] ---

# Trang Báº£ng giÃ¡ (Quáº£n lÃ½ giÃ¡ variant)

TÃ i liá»‡u mÃ´ táº£ **mÃ n hÃ¬nh Báº£ng giÃ¡** trong admin (`admin_orderlist`): route, dá»¯ liá»‡u, API vÃ  cÃ¡c khá»‘i UI chÃ­nh. MÃ n quáº£n lÃ½ **tá»«ng biáº¿n thá»ƒ (variant)** trong catalog: tráº¡ng thÃ¡i hiá»ƒn thá»‹, **tá»· lá»‡ biÃªn** (CTV / khÃ¡ch / khuyáº¿n mÃ£i / STU), vÃ  giÃ¡ tham chiáº¿u tá»« **giÃ¡ nháº­p NCC** (`supply_price`).

## Route vÃ  entry

| Má»¥c | GiÃ¡ trá»‹ |
|-----|---------|
| **ÄÆ°á»ng dáº«n** | `/pricing` |
| **Sidebar** | BÃ¡n hÃ ng â†’ **Báº£ng giÃ¡** (`frontend/src/components/layout/sidebar/menuConfig.ts`, `href: "/pricing"`) |
| **Component** | `frontend/src/features/pricing/index.tsx` (export default `Pricing`) |
| **ÄÄƒng kÃ½ route** | `frontend/src/routes/AppRoutes.tsx` â€” `<Route path="/pricing" element={<Pricing />} />` |

YÃªu cáº§u **Ä‘Äƒng nháº­p**; API `/api/product-prices/*` do backend phá»¥c vá»¥ sau middleware xÃ¡c thá»±c (theo cáº¥u hÃ¬nh dá»± Ã¡n).

### Trang khÃ¡c dá»… nháº§m: In bÃ¡o giÃ¡

| ÄÆ°á»ng dáº«n | Má»¥c Ä‘Ã­ch |
|-----------|----------|
| `/show-price` | Trang **bÃ¡o giÃ¡ / in** (chá»n sáº£n pháº©m, in), feature `frontend/src/features/product-price/`. **KhÃ´ng** pháº£i mÃ n quáº£n lÃ½ báº£ng giÃ¡ catalog. |

## Luá»“ng dá»¯ liá»‡u (tÃ³m táº¯t)

- **`usePricingData`** (`features/pricing/hooks/usePricingData.ts`): gom `useProductData`, `useProductActions`, `useSupplyActions`; nÃºt **Äá»“ng bá»™ láº¡i** táº£i láº¡i danh sÃ¡ch vÃ  lÃ m má»›i cache giÃ¡ NCC phÃ­a client cho cÃ¡c sáº£n pháº©m Ä‘Ã£ má»Ÿ rá»™ng.
- **`useProductData`**: `GET /api/product-prices`, map tá»«ng dÃ²ng â†’ `ProductPricingRow`, Ã¡p `applyBasePriceToProduct` vá»›i `baseSupplyPrice` (max giÃ¡ NCC tá»« API). Lá»c **Äang hoáº¡t Ä‘á»™ng / Táº¡m dá»«ng / Táº¥t cáº£**, tÃ¬m kiáº¿m khÃ´ng dáº¥u, phÃ¢n trang client.
- **`useProductActions`**: sá»­a / táº¡o / xÃ³a variant, modal táº¡o sáº£n pháº©m.
- **`useSupplyActions`**: khi **má»Ÿ rá»™ng dÃ²ng** â€” táº£i vÃ  sá»­a **giÃ¡ theo tá»«ng NCC**.

## API backend (`/api/product-prices`)

Äá»‹nh nghÄ©a route: `backend/src/routes/productPricesRoutes.js`.

| PhÆ°Æ¡ng thá»©c | ÄÆ°á»ng dáº«n | Má»¥c Ä‘Ã­ch |
|-------------|-----------|----------|
| `GET` | `/api/product-prices` | Danh sÃ¡ch variant + margin pivot + `max_supply_price` (MAX giÃ¡ trong `supply_price` theo variant). CÃ³ **cache** server (`pricingCache` trong `handlers/list.js`). |
| `POST` | `/api/product-prices` | Táº¡o variant / báº£n ghi giÃ¡ má»›i (`createProductPrice`). |
| `GET` | `/api/product-prices/:productId` | Má»™t variant theo id. |
| `PATCH` | `/api/product-prices/:productId` | Cáº­p nháº­t variant (gÃ³i, mÃ£, giÃ¡ gá»‘c, tá»· lá»‡, â€¦). |
| `PATCH` | `/api/product-prices/:productId/status` | Báº­t/táº¯t **hiá»ƒn thá»‹** (`is_active`). Body: `{ "is_active": boolean }`. |
| `DELETE` | `/api/product-prices/:productId` | XÃ³a variant. |
| `POST` | `/api/product-prices/:productId/suppliers` | ThÃªm / cáº­p nháº­t dÃ²ng **giÃ¡ NCC** (`handlers/supplies.js`). |

Sau thao tÃ¡c ghi, backend thÆ°á»ng gá»i **`pricingCache.clear()`** Ä‘á»ƒ láº§n `GET` sau khÃ´ng dÃ¹ng dá»¯ liá»‡u cÅ©.

**Frontend** dÃ¹ng `API_ENDPOINTS.PRODUCT_PRICES` trong `frontend/src/constants.ts`.

## Nguá»“n dá»¯ liá»‡u vÃ  cÃ¡ch tÃ­nh giÃ¡ hiá»ƒn thá»‹

- Má»—i **dÃ²ng báº£ng** = má»™t **variant** (`variant.id`).
- API tráº£ vá»: `base_price`, pivot margin `pct_ctv`, `pct_khach`, `pct_promo`, `pct_stu` (theo tier / `MARGIN_PIVOT_SQL`), `max_supply_price`, `is_active`, `update`.
- **`mapProductPriceRow`** + **`applyBasePriceToProduct`** (`features/pricing/utils.ts`):
  - **ChÃ¢n giÃ¡** tÃ­nh sá»‰/láº» Æ°u tiÃªn **`max_supply_price`** (â†’ `baseSupplyPrice`) khi > 0.
  - **GiÃ¡ sá»‰ (CTV)** = chÃ¢n giÃ¡ Ã— há»‡ sá»‘ `pct_ctv`.
  - **GiÃ¡ láº»** = giÃ¡ sá»‰ Ã— `pct_khach`.
  - **GiÃ¡ khuyáº¿n mÃ£i** khi `pct_promo` há»£p lá»‡ kÃ¨m biÃªn CTV/khÃ¡ch (`hasValidPromoRatio`); logic trong `calculatePromoPrice`.

Cá»™t **GiÃ¡ gá»‘c** cÃ³ thá»ƒ **trá»‘ng (-)** náº¿u chÆ°a cÃ³ `max_supply_price` há»£p lá»‡. Khi **má»Ÿ rá»™ng dÃ²ng** vÃ  cÃ³ nhiá»u má»©c giÃ¡ NCC, UI cÃ³ thá»ƒ dÃ¹ng **má»©c cao nháº¥t** trong danh sÃ¡ch Ä‘Ã£ táº£i (preview khi sá»­a) â€” `computeHighestSupplyPrice`.

## Khá»‘i UI trÃªn trang

1. **`PricingStats`** â€” ba tháº» (click Ä‘á»ƒ lá»c): **Tá»•ng sáº£n pháº©m** (all), **Äang hoáº¡t Ä‘á»™ng**, **Táº¡m dá»«ng**.
2. **`PricingFilters`** â€” tÃ¬m kiáº¿m; **ThÃªm sáº£n pháº©m** (`CreateProductModal`); **Äá»“ng bá»™ láº¡i** (`handleRefreshAll`).
3. **`ProductTable`** â€” báº£ng + phÃ¢n trang.

### Cá»™t báº£ng (nghiá»‡p vá»¥)

| Cá»™t | Ná»™i dung |
|------|----------|
| Sáº£n pháº©m | TÃªn gÃ³i + variant / thá»i háº¡n (tá»« `package_product` + mÃ£ `san_pham`). |
| GiÃ¡ gá»‘c | CÆ¡ sá»Ÿ biÃªn; Æ°u tiÃªn max giÃ¡ NCC. |
| GiÃ¡ sá»‰ | Sau biÃªn CTV. |
| GiÃ¡ láº» | Sau biÃªn khÃ¡ch. |
| GiÃ¡ khuyáº¿n mÃ£i | % KM khi cáº¥u hÃ¬nh há»£p lá»‡. |
| TÃ¬nh tráº¡ng | Toggle `is_active` (PATCH status). |
| Cáº­p nháº­t | NgÃ y cáº­p nháº­t variant. |
| Thao tÃ¡c | Sá»­a, xÃ³a, má»Ÿ rá»™ng NCC. |

### Má»Ÿ rá»™ng dÃ²ng (chi tiáº¿t NCC)

- `ProductExpandedDetails`; `fetchSupplyPricesForProduct`.
- Sá»­a / thÃªm / xÃ³a dÃ²ng giÃ¡ NCC; áº£nh hÆ°á»Ÿng `max_supply_price` sau Ä‘á»“ng bá»™.

## Cáº¥u trÃºc thÆ° má»¥c (tham chiáº¿u)

```
frontend/src/features/pricing/
  index.tsx, hooks/, components/, utils.ts, types.ts
backend/src/controllers/ProductsController/handlers/
  list.js, supplies.js, mutations/
```

## Ghi chÃº váº­n hÃ nh

- **Cache**: náº¿u dá»¯ liá»‡u cháº­m sau sá»­a DB trá»±c tiáº¿p, kiá»ƒm tra `pricingCache.clear()`; UI: **Äá»“ng bá»™ láº¡i**.
- **Nguá»“n hÃ ng** táº¡i `/sources`; báº£ng giÃ¡ liÃªn káº¿t `supply_price` vÃ  `POST .../suppliers`.
- ÄÆ¡n hÃ ng / webhook cÃ³ thá»ƒ phá»¥ thuá»™c variant vÃ  giÃ¡ NCC.


## --- [PAGES_DON_HANG.md] ---

# Trang ÄÆ¡n hÃ ng (Quáº£n lÃ½ Ä‘Æ¡n hÃ ng)

TÃ i liá»‡u mÃ´ táº£ **mÃ n hÃ¬nh ÄÆ¡n hÃ ng** trong admin (`admin_orderlist` frontend): route, dá»¯ liá»‡u, API vÃ  cÃ¡c khá»‘i UI chÃ­nh.

## Route vÃ  entry

| Má»¥c | GiÃ¡ trá»‹ |
|-----|---------|
| **ÄÆ°á»ng dáº«n** | `/orders` |
| **Component** | `frontend/src/features/orders/index.tsx` (export default `Orders`) |
| **ÄÄƒng kÃ½ route** | `frontend/src/routes/AppRoutes.tsx` â€” `<Route path="/orders" element={<Orders />} />` |
| **TiÃªu Ä‘á» trang** | â€œQuáº£n LÃ½ **ÄÆ¡n HÃ ng**â€ (`OrdersPageHeader`) |

YÃªu cáº§u **Ä‘Äƒng nháº­p** (session); cÃ¡c API `/api/orders/*` náº±m sau `authGuard` á»Ÿ backend.

## Bá»‘n â€œtabâ€ bá»™ dá»¯ liá»‡u (dataset)

NgÆ°á»i dÃ¹ng chá»n má»™t trong bá»‘n cháº¿ Ä‘á»™; má»—i cháº¿ Ä‘á»™ gá»i má»™t **endpoint** riÃªng vÃ  lÃ m má»›i bá»™ lá»c/phÃ¢n trang khi Ä‘á»•i tab.

| KhÃ³a (`OrderDatasetKey`) | NhÃ£n UI | MÃ´ táº£ ngáº¯n | Endpoint API |
|--------------------------|---------|------------|----------------|
| `active` | ÄÆ¡n HÃ ng | Danh sÃ¡ch Ä‘Æ¡n hÃ ng | `GET /api/orders` |
| `import` | Nháº­p hÃ ng | ÄÆ¡n nháº­p kho | `GET /api/orders/import` |
| `expired` | Háº¿t Háº¡n | ÄÆ¡n háº¿t háº¡n | `GET /api/orders/expired` |
| `canceled` | HoÃ n Tiá»n | ÄÆ¡n Ä‘Ã£ hoÃ n tiá»n | `GET /api/orders/canceled` |

Cáº¥u hÃ¬nh nhÃ£n/endpoint: `ORDER_DATASET_CONFIG`, thá»© tá»± tab: `ORDER_DATASET_SEQUENCE` trong `frontend/src/constants.ts`.

## Luá»“ng dá»¯ liá»‡u (tÃ³m táº¯t)

- **`useOrdersData`** (`features/orders/hooks/useOrdersData.ts`): gom fetch, lá»c client, phÃ¢n trang, modal vÃ  hÃ nh Ä‘á»™ng (xÃ³a, sá»­a, táº¡o, xem, v.v.).
- **`useOrdersFetch`**: theo `dataset`, gá»i `ORDER_DATASET_CONFIG[dataset].endpoint`, lÆ°u máº£ng `Order[]`.
- **`useOrdersList`**: tÃ¬m kiáº¿m, `statusFilter`, khoáº£ng ngÃ y (`durationRange`), `rowsPerPage` / `currentPage`.
- Äá»•i tab dataset â†’ reset tÃ¬m kiáº¿m, filter tráº¡ng thÃ¡i, trang 1 vÃ  tráº¡ng thÃ¡i modal (trong `useOrdersData`).

## API liÃªn quan (frontend)

Äá»‹nh nghÄ©a trong `frontend/src/constants.ts` (`API_ENDPOINTS`), vÃ­ dá»¥:

- `ORDERS` â†’ `/api/orders`
- `ORDERS_IMPORT` â†’ `/api/orders/import`
- `ORDERS_EXPIRED` â†’ `/api/orders/expired`
- `ORDERS_CANCELED` â†’ `/api/orders/canceled`
- `ORDER_BY_ID`, `ORDER_RENEW`, `ORDER_CANCELED_REFUND`, `CALCULATE_PRICE`, â€¦

Chi tiáº¿t gá»i API (POST/PATCH/DELETE) náº±m trong cÃ¡c hook/modal nhÆ° `useOrderActions`, `CreateOrderModal`, `EditOrderModal`, v.v.

## Khá»‘i UI trÃªn trang

1. **`OrdersPageHeader`** â€” TiÃªu Ä‘á», vÃ  banner lá»—i táº£i + nÃºt â€œThá»­ Láº¡iâ€ khi `fetchError`.
2. **`OrdersDatasetTabs`** â€” Bá»‘n nÃºt tab + sá»‘ Ä‘áº¿m (theo láº§n táº£i gáº§n nháº¥t má»—i tab).
3. **`OrdersStatsSection`** â€” Tháº» thá»‘ng kÃª (bá»™ lá»c nhanh theo tráº¡ng thÃ¡i); riÃªng tab **Háº¿t háº¡n** hiá»ƒn thá»‹ khá»‘i â€œTá»•ng ÄÆ¡n Háº¿t Háº¡nâ€; tab **HoÃ n tiá»n** dÃ¹ng bá»™ stat hoÃ n tiá»n.
4. **`OrdersFiltersBar`** â€” Ã” tÃ¬m kiáº¿m, **lá»c khoáº£ng ngÃ y** (`DashboardDateRangeFilter`), chá»n **cá»™t tÃ¬m** (`SEARCH_FIELD_OPTIONS`), nÃºt **Táº¡o ÄÆ¡n** (chá»‰ khi dataset lÃ  **ÄÆ¡n HÃ ng** hoáº·c **Nháº­p hÃ ng** â€” `isActiveDataset`).
5. **`OrdersTableSection`** â€” Báº£ng (vÃ  trÃªn mobile cÃ³ luá»“ng card qua `OrderCard` náº¿u Ä‘Æ°á»£c dÃ¹ng trong section): phÃ¢n trang, má»Ÿ rá»™ng dÃ²ng, xem / sá»­a / xÃ³a / hoÃ n / Ä‘Ã¡nh dáº¥u thanh toÃ¡n / gia háº¡n tÃ¹y dataset.

### Modal gáº¯n vá»›i trang

| Modal | Má»¥c Ä‘Ã­ch |
|-------|----------|
| `ConfirmModal` | XÃ¡c nháº­n xÃ³a Ä‘Æ¡n |
| `ViewOrderModal` | Xem chi tiáº¿t Ä‘Æ¡n |
| `EditOrderModal` | Sá»­a Ä‘Æ¡n (khi dataset cho phÃ©p) |
| `CreateOrderModal` | Táº¡o Ä‘Æ¡n má»›i |

Äiá»u kiá»‡n **cho phÃ©p sá»­a / gia háº¡n** Ä‘Æ°á»£c tÃ­nh trong `index.tsx` (`canEditOrder`, `canRenewOrder`, â€¦) theo `datasetKey`.

### TÃ¬m kiáº¿m theo cá»™t

`SEARCH_FIELD_OPTIONS` trong `features/orders/constants.ts`: Táº¥t cáº£ cá»™t, MÃ£ Ä‘Æ¡n, Sáº£n pháº©m, ThÃ´ng tin, KhÃ¡ch hÃ ng, Slot, Nguá»“n (map qua `ORDER_FIELDS`).

## Cáº¥u trÃºc thÆ° má»¥c (tham chiáº¿u)

```
frontend/src/features/orders/
  index.tsx                 # Page chÃ­nh
  components/               # OrdersPageHeader, Tabs, Stats, Filters, Table, OrderRow, OrderCard, ...
  hooks/                    # useOrdersData, useOrdersFetch, useOrdersList, useOrdersModals, useOrderActions
  utils/                    # ordersHelpers, orderListTransform, ...
  constants.ts              # Stat filters, SEARCH_FIELD_OPTIONS, ...
```

## Ghi chÃº

- Trang **â€œÄÆ¡n hÃ ng thanh toÃ¡n / billâ€** khÃ¡c route: `/bill-order` (`features/bill-order`) â€” khÃ´ng trÃ¹ng vá»›i `/orders`.
- Äáº¿m trÃªn tab dataset (`datasetCounts`) Ä‘Æ°á»£c cáº­p nháº­t khi Ä‘ang xem tab Ä‘Ã³ (`totalRecords`), khÃ´ng pháº£i snapshot Ä‘á»“ng thá»i cáº£ bá»‘n API.

---

## Luá»“ng nghiá»‡p vá»¥ (Ä‘Æ¡n hÃ ng â€” tÃ i liá»‡u ná»™i bá»™)

### Tráº¡ng thÃ¡i & log chi phÃ­ NCC (`supplier_order_cost_log`)

- **MAVC, MAVL, MAVK, MAVS**:
  - Táº¡o Ä‘Æ¡n: luÃ´n **ChÆ°a Thanh ToÃ¡n**.
  - Nháº­n webhook thanh toÃ¡n / webhook gia háº¡n thÃ nh cÃ´ng: chuyá»ƒn **ÄÃ£ Thanh ToÃ¡n** vÃ  **INSERT 1 log**.
  - XÃ³a khi Ä‘ang **ÄÃ£ Thanh ToÃ¡n** hoáº·c **Äang Xá»­ LÃ½**: chuyá»ƒn **Chá» HoÃ n**, cháº¡y tÃ­nh hoÃ n NCC, lÆ°u `refund` **sá»‘ Ã¢m**, vÃ  **INSERT 1 log**.
- **MAVN**:
  - Táº¡o Ä‘Æ¡n: luÃ´n **ÄÃ£ Thanh ToÃ¡n** vÃ  **INSERT 1 log**.
  - Äang **Cáº§n Gia Háº¡n** + báº¥m nÃºt Gia Háº¡n: chuyá»ƒn **ÄÃ£ Thanh ToÃ¡n** vÃ  **INSERT 1 log**.
  - XÃ³a Ä‘Æ¡n **ÄÃ£ Thanh ToÃ¡n**: chuyá»ƒn **ÄÃ£ HoÃ n** vÃ  **INSERT 1 log**.
  - Webhook Sepay: **khÃ´ng** Ä‘á»•i tráº¡ng thÃ¡i MAVN.
- **MAVT**:
  - Táº¡o Ä‘Æ¡n: luÃ´n **ÄÃ£ Thanh ToÃ¡n** vÃ  **INSERT 1 log**.
  - XÃ³a Ä‘Æ¡n: chuyá»ƒn **ÄÃ£ HoÃ n**, `refund` trÃªn Ä‘Æ¡n luÃ´n `0`; tiá»n NCC cáº§n hoÃ n váº«n tÃ­nh riÃªng theo cost/ngÃ y cÃ²n láº¡i vÃ  ghi vÃ o log NCC.
- **NCC Mavryk**: khÃ´ng lÆ°u log á»Ÿ `partner.supplier_order_cost_log` (náº¿u cÃ³ log cÅ© theo Ä‘Æ¡n sáº½ bá»‹ dá»n khi phÃ¡t sinh cáº­p nháº­t Ä‘Æ¡n).

### Táº¡o Ä‘Æ¡n & Telegram

- Táº¡o Ä‘Æ¡n **thÃ nh cÃ´ng**:
  - **MAVC/MAVL/MAVK/MAVS** â†’ **ChÆ°a Thanh ToÃ¡n**
  - **MAVN/MAVT** â†’ **ÄÃ£ Thanh ToÃ¡n**
  - Sau táº¡o váº«n gá»­i **thÃ´ng bÃ¡o Telegram** Ä‘Æ¡n má»›i (backend: `sendOrderCreatedNotification`).

### Theo loáº¡i mÃ£ (prefix) & thÃ´ng bÃ¡o

- **MAVT**: KhÃ´ng cÃ³ **giÃ¡ bÃ¡n cho khÃ¡ch** (giÃ¡ = 0). Khi **háº¿t háº¡n** chá»‰ cáº§n thÃ´ng bÃ¡o **háº¿t háº¡n**, **khÃ´ng** thÃ´ng bÃ¡o / nháº¯c **gia háº¡n** (cron â€œcÃ²n 4 ngÃ yâ€ bá» qua MAVT).
- **MAVS**: Náº¿u khÃ´ng cÃ³ giÃ¡ trá»‹ cá»™t `pct_stu` thÃ¬ dÃ¹ng **`pct_khach`** Ä‘á»ƒ tÃ­nh (tÆ°Æ¡ng Ä‘Æ°Æ¡ng giÃ¡ láº» MAVL khi thiáº¿u sinh viÃªn).
- **MAVK**: Tá»· suáº¥t giáº£m Ã¡p trÃªn **giÃ¡ bÃ¡n** (chuá»—i MAVL Ã— (1 âˆ’ `pct_promo`)). Náº¿u **Ä‘áº¿n háº¡n** mÃ  **khÃ´ng cÃ³** `pct_promo` â†’ thÃ´ng bÃ¡o / tÃ­nh theo **giÃ¡ khÃ¡ch láº»** (MAVL).

### CÃ´ng thá»©c giÃ¡ bÃ¡n (tham chiáº¿u)

| Loáº¡i | CÃ´ng thá»©c |
|------|-----------|
| MAVC | `cost / (1 âˆ’ pct_ctv)` |
| MAVL | `MAVC / (1 âˆ’ pct_khach)` |
| MAVK | `MAVL Ã— (1 âˆ’ pct_promo)` |
| MAVS | `MAVC / (1 âˆ’ pct_stu)` hoáº·c **MAVL** náº¿u `pct_stu` rá»—ng |
| MAVT | `0` |
| MAVN | `cost` |

### Tiá»n hoÃ n tá»« NCC (tá»· lá»‡ theo ngÃ y)

- **Tiá»n hoÃ n tá»« NCC** = `cost Ã— (sá»‘ ngÃ y cÃ²n láº¡i) / (tá»•ng sá»‘ ngÃ y quy Ä‘á»•i tá»« `--xm` trÃªn gÃ³i sáº£n pháº©m)`.

### Khi báº¥m há»§y (xÃ³a / chuyá»ƒn tráº¡ng thÃ¡i há»§y)

- **MAVC, MAVL, MAVK, MAVS** (vÃ  Ä‘Æ¡n thÆ°á»ng tÆ°Æ¡ng tá»±): tá»« **Äang Xá»­ LÃ½** hoáº·c **ÄÃ£ Thanh ToÃ¡n** â†’ chuyá»ƒn tráº¡ng thÃ¡i **Chá» HoÃ n**; tÃ­nh hoÃ n NCC theo tá»· lá»‡ ngÃ y vÃ  ghi `refund` **sá»‘ Ã¢m**; trigger ghi thÃªm **1 dÃ²ng** `supplier_order_cost_log`.
- **MAVN**: xÃ³a Ä‘Æ¡n **ÄÃ£ Thanh ToÃ¡n** â†’ chuyá»ƒn **ÄÃ£ HoÃ n**; trigger ghi thÃªm **1 dÃ²ng** `supplier_order_cost_log`.
- **MAVT**: xÃ³a Ä‘Æ¡n â†’ chuyá»ƒn **ÄÃ£ HoÃ n**; `refund` trÃªn Ä‘Æ¡n luÃ´n `0`; tiá»n NCC cáº§n hoÃ n váº«n tÃ­nh riÃªng theo cost/ngÃ y cÃ²n láº¡i vÃ  ghi vÃ o log NCC.

### NCC Mavryk / Shop (Ä‘Æ¡n thÆ°á»ng â€” khÃ´ng pháº£i MAVN)

- Coi **Mavryk** vÃ  **Shop** lÃ  cÃ¹ng nhÃ³m NCC ná»™i bá»™ (`isMavrykShopSupplierName` trong backend).
- **Táº¡o Ä‘Æ¡n**: **khÃ´ng dÃ¹ng giÃ¡ nháº­p** â€” `cost` lÆ°u **0**; **giÃ¡ bÃ¡n = lá»£i nhuáº­n**. API `/api/orders/calculate-price` cÃ³ thá»ƒ tráº£ `mavryk_profit_mode`, `gia_nhap = 0`. Tráº¡ng thÃ¡i ban Ä‘áº§u váº«n lÃ  **ChÆ°a Thanh ToÃ¡n**.
- **CÃ´ng ná»£ NCC (`payment_supply` / chu ká»³ thanh toÃ¡n)**: Ä‘Æ¡n thÆ°á»ng + NCC Mavryk/Shop â†’ **khÃ´ng cá»™ng** `updatePaymentSupplyBalance` sau biÃªn lai / renewal (`shouldSkipNccLedgerForOrder` â€” **khÃ´ng** Ã¡p cho MAVN).
- **Sepay webhook** (thanh toÃ¡n khÃ¡ch): má»i Ä‘Æ¡n **ChÆ°a Thanh ToÃ¡n** (trá»« MAVN â€” xem dÆ°á»›i) â†’ **ÄÃ£ Thanh ToÃ¡n**; sau biÃªn lai váº«n **bá» qua** cá»™ng `payment_supply` cho NCC Mavryk/Shop; Ä‘Æ¡n NCC thÆ°á»ng váº«n **cá»™ng** chu ká»³ NCC khi cÃ³ biÃªn lai (nhÆ° `webhook.js`).
- **Gia háº¡n** (`renewal.js`, Ä‘Æ¡n **khÃ´ng** MAVN + NCC Mavryk/Shop): sau gia háº¡n chuyá»ƒn **ÄÃ£ Thanh ToÃ¡n** vÃ  **khÃ´ng** cá»™ng thÃªm import NCC trong bÆ°á»›c renewal.
- **RiÃªng NCC Mavryk**: khÃ´ng lÆ°u `supplier_order_cost_log`.

### MAVN (nháº­p hÃ ng)

- **Quy Æ°á»›c**: MAVN **khÃ´ng** gáº¯n NCC Mavryk/Shop â€” luÃ´n NCC nhÃ  cung cáº¥p tháº­t (khÃ´ng Ã©p `cost = 0` vÃ¬ Mavryk khi prefix MAVN; `orderPricingService` khÃ´ng báº­t `mavryk_profit_mode` cho MAVN).
- **Táº¡o Ä‘Æ¡n thÃ nh cÃ´ng** â†’ **ÄÃ£ Thanh ToÃ¡n** vÃ  ghi **1 dÃ²ng** `supplier_order_cost_log` (trá»« NCC Mavryk).
- **Sepay webhook**: **khÃ´ng** Ä‘á»•i tráº¡ng thÃ¡i Ä‘Æ¡n MAVN qua Sepay; **khÃ´ng** cháº¡y renewal tá»± Ä‘á»™ng tá»« webhook cho mÃ£ MAVN; fallback match theo sá»‘ tiá»n (`resolveOrderByPayment`) **loáº¡i** Ä‘Æ¡n MAVN.
- **Cáº§n Gia Háº¡n** â†’ **Gia háº¡n** (`runRenewal`) â†’ chuyá»ƒn **ÄÃ£ Thanh ToÃ¡n** + **cá»™ng** NCC (`updatePaymentSupplyBalance` trong `renewal.js`) + **INSERT** `supplier_order_cost_log`.
- `POST /api/payment-supply/:paymentId/confirm` váº«n dÃ¹ng Ä‘á»ƒ Ä‘á»‘i soÃ¡t chu ká»³ NCC, nhÆ°ng MAVN khÃ´ng cáº§n Ä‘á»£i bÆ°á»›c nÃ y Ä‘á»ƒ lÃªn tráº¡ng thÃ¡i **ÄÃ£ Thanh ToÃ¡n**.

### Modal táº¡o Ä‘Æ¡n (`CreateOrderModal`)

- Khá»‘i **Chi phÃ­ & thá»i háº¡n** (`CreateOrderPricingSection`): phá»¥ Ä‘á» vÃ  nhÃ£n cá»™t giÃ¡ theo **loáº¡i mÃ£** (MAVCâ€¦MAVN) vÃ  **NCC Mavryk/Shop** (Ä‘Æ¡n thÆ°á»ng: cost = 0, cá»™t giÃ¡ bÃ¡n = lá»£i nhuáº­n). **Sau lÆ°u**: MAVC/MAVL/MAVK/MAVS lÃ  **ChÆ°a Thanh ToÃ¡n**; MAVN/MAVT lÃ  **ÄÃ£ Thanh ToÃ¡n** (xem má»¥c â€œTráº¡ng thÃ¡i & log chi phÃ­ NCCâ€). Copy UI: `frontend/src/components/modals/CreateOrderModal/createOrderPricingCopy.ts` â€” khi Ä‘á»•i nghiá»‡p vá»¥, cáº­p nháº­t song song Ä‘oáº¡n nÃ y vÃ  má»¥c â€œLuá»“ng nghiá»‡p vá»¥â€.

### Khá»›p code (kiá»ƒm tra Ä‘á»‹nh ká»³)

- **Log chi phÃ­ NCC (DB)**: báº£n canonical cá»§a `partner.fn_supplier_order_cost_log_on_success` náº±m trong `database/migrations/091_supplier_order_cost_log_fn_canonical.sql` (Ã¡p qua `backend/migrations/20260605120000_supplier_order_cost_log_fn_canonical.js`); trigger `tr_supplier_order_cost_log_order_success` trÃªn `orders.order_list` khÃ´ng Ä‘á»•i tÃªn (lá»‹ch sá»­ tá»« cÃ¡c migration `039`â€¦`089`).
- **Dashboard `total_import` / pháº§n NCC cá»§a `total_profit`**: trigger `trg_supplier_order_cost_log_dashboard_import` trÃªn `partner.supplier_order_cost_log` gá»i `partner.fn_recalc_dashboard_total_import` â€” rule MAVN `ÄÃ£ Thanh ToÃ¡n` â†’ margin **âˆ’cost** vÃ  `total_import` = tá»•ng `import_cost` theo thÃ¡ng; migration `backend/migrations/20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js`.
- **NCC / MAVN / Mavryk**: `Order/finance/supplierDebt.js` (`findSupplyIdByName`; cÃ´ng ná»£ theo Ä‘Æ¡n chá»‰ qua DB trigger + log), `Order/crud/createOrder.js`, `services/orderService.js`, `services/pricing/orderPricingService.js`, `Order/orderDeletionService`, `Order/finance/dashboardSummary.js`, `PaymentsController` (xÃ¡c nháº­n thanh toÃ¡n NCC).
- **Sepay webhook & renewal tá»± Ä‘á»™ng**: `backend/webhook/sepay/routes/webhook.js`, `backend/webhook/sepay/utils.js` (`resolveOrderByPayment`), `backend/webhook/sepay/renewal.js`; gia háº¡n tay: `backend/src/domains/orders/controller/renewRoutes.js`.
- UI táº¡o Ä‘Æ¡n: `createOrderPricingCopy.ts` nhÆ° má»¥c trÃªn.

### Thanh toÃ¡n khÃ¡ch â€” suffix sá»‘ tiá»n (khÃ´ng ná»™i dung CK)

ÄÆ¡n bÃ¡n (MAVC/MAVL/â€¦) vÃ  Ä‘Æ¡n **Cáº§n Gia Háº¡n** dÃ¹ng **payment slot**: `order_list.price` = giÃ¡ báº£ng + suffix (1..100). Webhook vÃ  QR match theo **Ä‘Ãºng sá»‘ tiá»n**, khÃ´ng sinh cá»™t `transaction`, Telegram/frontend khÃ´ng hiá»ƒn thá»‹ Â«ná»™i dung CKÂ».

Chi tiáº¿t: [payment-slot-suffix-matching.md](./payment-slot-suffix-matching.md).

## --- [tong-quan-ban-hang.md] ---

# Tá»•ng quan chi tiáº¿t pháº§n bÃ¡n hÃ ng (Sales Overview)

TÃ i liá»‡u nÃ y lÃ  báº£n tá»•ng quan váº­n hÃ nh cho máº£ng bÃ¡n hÃ ng trong `admin_orderlist`: nguá»“n dá»¯ liá»‡u, chá»‰ sá»‘ KPI, sá»‘ liá»‡u snapshot hiá»‡n táº¡i, vÃ  query chuáº©n Ä‘á»ƒ Ä‘á»‘i soÃ¡t.

---

## 1) Pháº¡m vi vÃ  má»¥c tiÃªu

Pháº§n bÃ¡n hÃ ng trong há»‡ thá»‘ng táº­p trung vÃ o 3 cÃ¢u há»i chÃ­nh:

- Doanh thu/lá»£i nhuáº­n Ä‘ang á»Ÿ má»©c nÃ o?
- ÄÆ¡n hÃ ng Ä‘ang á»Ÿ tráº¡ng thÃ¡i nÃ o, theo thÃ¡ng biáº¿n Ä‘á»™ng ra sao?
- Sá»‘ liá»‡u dashboard cÃ³ khá»›p dá»¯ liá»‡u gá»‘c á»Ÿ báº£ng Ä‘Æ¡n/biÃªn lai khÃ´ng?

Má»¥c tiÃªu cá»§a file:

- Chuáº©n hÃ³a nÆ¡i Ä‘á»c sá»‘ liá»‡u.
- Giáº£m lá»‡ch sá»‘ giá»¯a dashboard, API vÃ  truy váº¥n tay.
- CÃ³ bá»™ query nhanh Ä‘á»ƒ debug khi phÃ¡t sinh chÃªnh lá»‡ch.

---

## 2) Nguá»“n dá»¯ liá»‡u chÃ­nh

### 2.1 Báº£ng nghiá»‡p vá»¥ gá»‘c (source of truth theo luá»“ng)

- `orders.order_list`: dá»¯ liá»‡u Ä‘Æ¡n bÃ¡n chÃ­nh (mÃ£ Ä‘Æ¡n, sáº£n pháº©m, giÃ¡ bÃ¡n, giÃ¡ vá»‘n, tráº¡ng thÃ¡i, ngÃ y Ä‘Æ¡n).
- `orders.order_customer`: liÃªn káº¿t Ä‘Æ¡n vÃ  tÃ i khoáº£n khÃ¡ch.
- `receipt.payment_receipt`: biÃªn lai thanh toÃ¡n.
- `partner.supplier_order_cost_log`: log chi phÃ­ NCC vÃ  tÃ¡c Ä‘á»™ng tá»•ng há»£p.

### 2.2 Báº£ng tá»•ng há»£p/dashboard

- `dashboard.dashboard_monthly_summary`: projection theo thÃ¡ng (`month_key`) cho dashboard.
- `dashboard.daily_revenue_summary`: tá»•ng há»£p doanh thu theo ngÃ y.
- `dashboard.com_profit_expenses`: cÃ¡c khoáº£n Ä‘iá»u chá»‰nh lá»£i nhuáº­n (vÃ­ dá»¥ `mavn_import`, `external_import`, `withdraw_profit`).

### 2.3 Catalog phá»¥c vá»¥ phÃ¢n tÃ­ch bÃ¡n hÃ ng

- `product.product`, `product.variant`, `product.category`: map `id_product` sang thÃ´ng tin sáº£n pháº©m.
- `product.variant_sales_summary`: summary theo variant.

---

## 3) Äá»‹nh nghÄ©a KPI cá»‘t lÃµi

> Quy Æ°á»›c trong tÃ i liá»‡u nÃ y dÃ¹ng cÃ¹ng cÃ¡ch hiá»ƒu vá»›i pháº§n Dashboard/Order hiá»‡n táº¡i.

- **Total Orders**: tá»•ng sá»‘ dÃ²ng trong `orders.order_list`.
- **Paid Orders**: sá»‘ Ä‘Æ¡n cÃ³ `status = 'ÄÃ£ Thanh ToÃ¡n'`.
- **Processing Orders**: sá»‘ Ä‘Æ¡n cÃ³ `status = 'Äang Xá»­ LÃ½'`.
- **Canceled Orders**: sá»‘ Ä‘Æ¡n cÃ³ `status = 'Há»§y'`.
- **Gross Revenue**: `SUM(price)` trÃªn nhÃ³m tráº¡ng thÃ¡i active (`ÄÃ£ Thanh ToÃ¡n`, `Äang Xá»­ LÃ½`, `Cáº§n Gia Háº¡n`).
- **Gross Cost**: `SUM(cost)` trÃªn cÃ¹ng nhÃ³m tráº¡ng thÃ¡i active.
- **Gross Profit**: `SUM(price - cost)` trÃªn cÃ¹ng nhÃ³m tráº¡ng thÃ¡i active.
- **Monthly Revenue/Profit**: tá»•ng theo thÃ¡ng dá»±a trÃªn `order_date` hoáº·c projection tá»« `dashboard.dashboard_monthly_summary` (tÃ¹y má»¥c Ä‘Ã­ch hiá»ƒn thá»‹).

---

## 4) Snapshot sá»‘ liá»‡u hiá»‡n táº¡i (local, sau restore)

Thá»i Ä‘iá»ƒm chá»¥p snapshot: **2026-05-09 23:5x (UTC+7)**  
Database kiá»ƒm tra: **`mydtbmav` (PostgreSQL local host)**

### 4.1 KPI tá»•ng quan

- `total_orders`: **746**
- `paid_orders`: **372**
- `processing_orders`: **0**
- `canceled_orders`: **0**
- `gross_revenue` (active statuses): **202,708,230**
- `gross_cost` (active statuses): **106,755,000**
- `gross_profit` (active statuses): **95,953,230**

### 4.2 Dashboard monthly summary

- `2026-04`: `total_orders=14`, `total_revenue=6,320,000.00`, `total_profit=4,270,000.00`, `total_refund=0.00`
- `2026-05`: `total_orders=13`, `total_revenue=4,209,000.00`, `total_profit=1,069,089.00`, `total_refund=0.00`

### 4.3 Top sáº£n pháº©m theo doanh thu (id_product)

- `id_product=4`: `44` Ä‘Æ¡n, doanh thu `32,753,000`, lá»£i nhuáº­n `19,476,000`
- `id_product=152`: `53` Ä‘Æ¡n, doanh thu `28,741,351`, lá»£i nhuáº­n `9,455,351`
- `id_product=8`: `15` Ä‘Æ¡n, doanh thu `21,037,500`, lá»£i nhuáº­n `10,777,500`
- `id_product=29`: `27` Ä‘Æ¡n, doanh thu `19,613,384`, lá»£i nhuáº­n `5,593,384`
- `id_product=10`: `17` Ä‘Æ¡n, doanh thu `16,021,000`, lá»£i nhuáº­n `10,241,000`

---

## 5) Query chuáº©n Ä‘á»ƒ Ä‘á»‘i soÃ¡t nhanh

### 5.1 KPI tá»•ng

```sql
select
  count(*) as total_orders,
  count(*) filter (where status = 'ÄÃ£ Thanh ToÃ¡n') as paid_orders,
  count(*) filter (where status = 'Äang Xá»­ LÃ½') as processing_orders,
  count(*) filter (where status = 'Há»§y') as canceled_orders
from orders.order_list;

select
  coalesce(sum(price), 0) as gross_revenue,
  coalesce(sum(cost), 0) as gross_cost,
  coalesce(sum(price - cost), 0) as gross_profit
from orders.order_list
where status in ('ÄÃ£ Thanh ToÃ¡n', 'Äang Xá»­ LÃ½', 'Cáº§n Gia Háº¡n');
```

### 5.2 Xu hÆ°á»›ng thÃ¡ng tá»« Ä‘Æ¡n gá»‘c

```sql
select
  date_trunc('month', order_date)::date as month,
  count(*) as total_orders,
  sum(price) as total_revenue,
  sum(price - cost) as total_profit
from orders.order_list
group by 1
order by 1 desc
limit 12;
```

### 5.3 Top sáº£n pháº©m

```sql
select
  id_product,
  count(*) as total_orders,
  sum(price) as total_revenue,
  sum(price - cost) as total_profit
from orders.order_list
group by id_product
order by total_revenue desc
limit 20;
```

### 5.4 Äá»‘i chiáº¿u projection dashboard

```sql
select
  month_key,
  total_orders,
  canceled_orders,
  total_revenue,
  total_profit,
  total_refund,
  updated_at
from dashboard.dashboard_monthly_summary
order by month_key;
```

---

## 6) Checklist váº­n hÃ nh khi tháº¥y sá»‘ liá»‡u lá»‡ch

- Kiá»ƒm tra Ä‘Ãºng database Ä‘ang má»Ÿ (`mydtbmav` hay `my-store`) trÆ°á»›c khi so sá»‘.
- So `orders.order_list` trÆ°á»›c, sau Ä‘Ã³ má»›i so `dashboard.dashboard_monthly_summary`.
- Náº¿u projection dashboard lá»‡ch: kiá»ƒm tra luá»“ng ghi `store_profit_expenses` vÃ  trigger/job rebuild summary.
- Vá»›i dá»¯ liá»‡u vá»«a restore: luÃ´n reconnect DB client Ä‘á»ƒ trÃ¡nh cache káº¿t ná»‘i cÅ©.

---

## 7) LiÃªn káº¿t tÃ i liá»‡u liÃªn quan

- `docs/tong-quan-du-an.md`
- `docs/PAGES_DON_HANG.md`
- `docs/nghiep-vu-loi-nhuan-ban-slot.md`
- `docs/dashboard-page-financial-flow.md`




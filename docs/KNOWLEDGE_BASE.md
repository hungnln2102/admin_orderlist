# TRUNG TÂM TRI THỨC NGHIỆP VỤ VÀ KIẾN TRÚC

Tài liệu này được gom từ các hướng dẫn tài chính, kiến trúc và quy trình cũ trước đợt tái cấu trúc dự án.

## --- [DEPENDENCIES_AND_ARCHITECTURE.md] ---

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

### 2.1 `backend/package.json` â€” runtime

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

### 2.2 `frontend/package.json` â€” runtime

| Package | Dùng cho |
|--------|----------|
| `react`, `react-dom` | UI |
| `react-router-dom` | Điều hướng |
| `vite` (dev) | Build / dev server |
| `axios` | Gọi API |
| `@tiptap/*` | Editor rich text (mô tả sản phẩm / bài viết) |
| `recharts` | Biá»ƒu Ä‘á»“ dashboard |
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
| `backend/src/server.js` (default: `npm start`), `backend/index.js` (shim) | Khá»Ÿi Ä‘á»™ng API |
| `backend/src/app.js` | Cấu hình Express |
| `backend/src/routes/index.js` | **Gắn mọi route** protected (sau `authGuard`) |
| `backend/src/routes/*.js` | Nhóm route theo domain |
| `backend/src/controllers/*` | Handler HTTP theo domain |
| `backend/src/config/dbSchema/` | Định nghĩa schema bảng / cột (product, orders, finance, …) |
| `backend/src/db/knexClient.js` | Knex |
| `backend/src/services/*` | Pricing, Adobe renew, Telegram, package sync, â€¦ |
| `backend/src/scheduler/` | Cron / tác vụ định kỳ |
| `backend/src/middleware/` | `authGuard`, â€¦ |
| `backend/webhook/sepay/` | Renewal, payment webhook, config pool |
| `backend/scripts/migrations/` | Chạy migration (vd. `migrate:028`) |
| `frontend/src/routes/AppRoutes.tsx` | Route React |
| `frontend/src/features/*` | Feature: orders, dashboard, pricing, renew-adobe, content, â€¦ |
| `frontend/src/lib/*` | API client, `tableSql`, `productDescApi`, â€¦ |
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
- **Schema DB:** `backend/src/config/dbSchema/schemas/ordersProductPartner.js` (product, variant, `desc_variant`, â€¦).

---

## 5. Frontend: feature â†” lib/API

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

### 7.4 Webhook Sepay â€” `backend/webhook/sepay/payments.js`

| Export | Vai trò | Nơi dùng |
|--------|---------|----------|
| `insertPaymentReceipt`, `updatePaymentSupplyBalance`, `ensureSupplyAndPriceFromOrder` | Ghi receipt / cân balance NCC | `routes/webhook.js`, `runRenewal` (comment/gọi chung luồng tiền) |
| `calculateSalePrice` | Giá bán derive từ pricing core | `webhook.js`, utils |

### 7.5 Tiện ích Sepay — `backend/webhook/sepay/utils.js`

| Export | Vai trò | Nơi dùng |
|--------|---------|----------|
| `fetchProductPricing`, `fetchSupplyPrice`, `fetchMaxSupplyPrice`, `findSupplyId` | Đọc `variant` / `supplier_cost` | `renewal.js`, `payments.js`, `notifications.js` |
| `parseFlexibleDate`, `formatDateDB`, `formatDateDMY`, `addMonthsClamped`, `daysUntil`, … | Ngày / duration | `renewal.js`, eligibility, tests |
| `normalizeProductDuration`, `extractOrderCodeFromText`, â€¦ | Parse ná»™i dung CK / label SP | Webhook + renewal |

### 7.6 SQL an toàn — `backend/src/utils/sql.js`

| Export | Nơi dùng |
|--------|----------|
| `quoteIdent` | Hầu hết controller có raw SQL (`ProductsController`, `ProductDescriptionsController`, …) |

### 7.7 Chuẩn hóa input — `backend/src/utils/normalizers.js`

| Export | Nơi dùng |
|--------|----------|
| `normalizeTextInput`, `trimToLength`, `toNullableNumber`, `normalizeDateInput`, â€¦ | Controllers, ProductDescriptions, Orders, mappers |

### 7.8 Mapper sản phẩm — `backend/src/controllers/ProductsController/mappers.js`

| Export | Nơi dùng |
|--------|----------|
| `mapProductPriceRow`, `mapSupplyPriceRow` | `handlers/list.js`, `createProductPrice.js`, `updateProductPrice.js` |

### 7.9 Mô tả sản phẩm (API) — `backend/src/controllers/ProductDescriptionsController/index.js`

| Hàm (export module) | Route | Frontend gọi qua |
|---------------------|--------|------------------|
| `listProductDescriptions`, `saveProductDescription`, `uploadProductImage`, `listProductImages`, `deleteProductImage` | `src/routes/productDescriptionsRoutes.js` â†’ `/api/product-descriptions/*` | `frontend/src/lib/productDescApi.ts` |

---

## 8. Hàm / export frontend (`frontend/src/lib`): định nghĩa → feature

| File lib | Hàm / constant chính | Được import tại |
|----------|----------------------|-----------------|
| `productDescApi.ts` | `saveProductDescription`, `fetchProductDescriptions`, `auditProductSeo`, `uploadProductImage`, â€¦ | `features/product-info/hooks/useProductInfo.ts`, `useProductEdit.ts`, `useWebsiteSeoAudit.ts`, helpers |
| `pricingApi.ts` | `fetchCalculatedPrice` | `features/product-price/hooks/useQuoteCalculatedPriceMap.ts`, `CreateOrderModal/.../usePriceCalculation.ts`, `ViewOrderModal/.../useCalculatedPrice.ts` |
| `tableSql.ts` / `fieldMapper.ts` | Map cột DB ↔ UI (ORDER_COLS, VARIANT_COLS, …) | Bảng dữ liệu toàn admin (orders, pricing, warehouse, …) — grep `tableSql` / `FIELD_MAP` trong `features/` |
| `categoryApi.ts` | CRUD category | Feature content / category |
| `formsApi.ts` | `fetchFormNames`, `createForm`, â€¦ | Form-info feature |
| `errorHandler.ts` | `apiFetchWithErrorHandling`, `parseApiError` | Gọi API có xử lý lỗi thống nhất |
| `refreshBus.ts` | `emitRefresh`, `onRefresh` | Invalidate UI sau mutation |
| `notifications.ts` | `showAppNotification` | Toast toàn app |

---

*Tài liệu được sinh để tra cứu nhanh; không thay thế README chi tiết từng feature. Khi thêm hàm public mới, nên bổ sung một dòng vào bảng tương ứng.*

---

## Biểu đồ trực quan (Figma-style)

Mở trong trình duyệt file **[`ARCHITECTURE_FIGMA_STYLE.html`](./ARCHITECTURE_FIGMA_STYLE.html)** — layout dạng board (khung, node, consumer) để chụp màn hình hoặc dựng lại trong Figma.


## --- [AUDIT_LOGS.md] ---

# Audit Logs & Tracking

Hệ thống có cơ chế Audit nghiêm ngặt để đảm bảo mọi thay đổi về tiền bạc, trạng thái đơn hàng đều có thể truy vết.

## 1. System Event Logs (`system_event_logs`)
- Ghi lại các hoạt động của Admin: Sửa đơn hàng, đổi nhà cung cấp, áp dụng Credit, thao tác thủ công.
- Lưu trữ trường `before` và `after` (Diff) để biết chính xác trường dữ liệu nào bị thay đổi.
- Dùng cho tính năng "Lịch sử hệ thống".

## 2. Financial Audit Logs (`payment_receipt_financial_audit_log`)
- Truy vết dòng chảy của 1 biên nhận ngân hàng:
  - Khi nào biên nhận được tạo?
  - Dùng cho Đơn hàng gốc nào?
  - Rule nào được áp dụng (VD: Tiền dư đưa vào Off-flow, Tiền khớp 100%...).
  - Audit giúp phát hiện lỗi lệch doanh thu / lợi nhuận trong tương lai.

## 3. Shop Bank Ledger (`shop_bank_ledgers`)
- Sổ cái kế toán của ngân hàng.
- Lưu lại toàn bộ các record tiền vào/ra theo đúng chuẩn sổ cái (kép) kèm mã tham chiếu (`receipt_id`).
- Các trường hợp hoàn tiền cho khách (Refund), hoặc rút tiền (Withdrawal) sẽ được record bằng số âm.

## Cơ chế đảm bảo tính toàn vẹn
- Tất cả API mutate dữ liệu tài chính (Thanh toán, Sửa giá, Hoàn tiền) đều bọc trong SQL Transaction (`BEGIN ... COMMIT`).
- Chặn ghi đè: Sử dụng Idempotency Keys kết hợp Postgres Lock (Advisory Locks) trong Webhook Sepay để tránh double-spending.


## --- [credit-khach-hang-va-don-moi.md] ---

# Credit khách hàng, đơn mới, QR — hướng dẫn nghiệp vụ & theo dõi

Tài liệu này tóm tắt cách hệ thống xử lý **refund credit** (phiếu credit), trạng thái đơn, **VietQR**, và cách **dùng lại số dư** credit sau khi tạo đơn. Phần theo dõi gợi ý màn hình/flow để bạn bổ sung dần trên admin.

## 1. Trạng thái đơn + QR (luồng thực tế)

| Tình huống | Trạng thái sau khi tạo / sau thanh toán | Số tiền trên VietQR (khi còn cho phép quét) |
|------------|----------------------------------------|---------------------------------------------|
| Có trừ credit, **còn phải thu** > 5.000 VND (sau trừ credit) | Chưa Thanh Toán | **Số còn phải thu** = giá bán gross − số credit áp dụng (khớp với trường `price` trên đơn). |
| Có trừ credit, **còn phải thu** từ 0 đến 5.000 VND (sai số) | **Đã Thanh Toán** ngay khi tạo (coi như đủ, không cần bước thu thêm) | Không còn QR thu hộ (đơn đã ở trạng thái đã thanh toán; QR khóa theo chính sách màn hình). |
| Credit **đủ hoặc dư hơn** so với giá đơn mới (phần áp tối đa = hết phần “giá phải trả” của đơn) | Tùy số còn lại: nếu ≤ 5.000 thì coi **Đã Thanh Toán**; nếu > 5.000 thì **Chưa Thanh Toán** | Khi chưa thanh toán: vẫn theo cột còn thu. |
| Đã chuyển **Đã Thanh Toán** (Sephay/duyệt) | — | Màn hình **không** dùng QR để thu nữa; hiển thị giá tham chiếu có thể dùng `gross_selling_price` + dòng credit đã áp, không còn “mã theo số tạm ứng”. |

**Sai số 5.000 VND** áp dụng cho *phần còn lại cần thu* sau khi trừ credit: nếu số dư này nằm trong [0, 5.000] thì bỏ qua bước thu, đưa thẳng về **Đã Thanh Toán**.

**Credit > giá đơn mới (ví dụ phiếu 368.000, đơn 150.000):**  
Hệ thống ghi bút `refund_credit_applications` (150.000) **trỏ tới id phiếu cũ** (audit), sau đó **đóng** phiếu 368.000: `status = VOID`, `available = 0`, gắn `succeeded_by_note_id` → **tạo phiếu mới** (218.000, `split_from_note_id` = id phiếu cũ). Lần sau chọn **id / mã phiếu mới** (số còn thực) — phiếu cũ **không** còn xuất hiện khi tìm phiếu mở.

**Dùng hết một lần (không còn số dư):** Một bút dùng, trigger gán **FULLY_APPLIED**; **không** tạo phiếu dư, không tách dòng.

## 2. Dùng lại số credit còn dư thêm một lần nữa

1. Mỗi lần áp dụng credit, ghi dòng trong **`receipt.refund_credit_applications`** (đích, số tiền, thời điểm; `credit_note_id` = **phiếu tại thời điểm trừ** — thường id phiếu cũ trước khi tách).  
2. Nếu còn số dư sau lần trừ: xem **mục tách dòng ở trên**; số còn nằm ở **phiếu mới** (OPEN).  
3. **Để dùng lại:** chọn `refund_credit_note_id` = **phiếu còn mở** mới (API tạo đơn trả về `refund_credit_replacement_note_id` / `refund_credit_note_id` khi có tách). `getLatestRefundCreditNoteBySourceOrder` bỏ qua VOID nên vẫn trả về **phiếu mới** cùng `source_order_list_id`.  
4. Trên list đơn, cột tùy chọn: `refund_credit_effective_*` = phiếu theo dõi số còn (sau cơ chế `succeeded_by_note_id` / tự bản thân nếu không tách).  
5. Hết sạch: phiếu hiện tại về **FULLY_APPLIED** — không chọn thêm.

**Ghi chú sản phẩm (UX):** Nên cho phép tìm phiếu theo **SĐT / tên** kèm số còn lại, để thấy nhanh “còn bao nhiêu dùng tiếp”.

## 3. Nên ghi chú theo dõi ở trang màn hình nào?

Gợi ý ánh xạ màn hình (admin `admin_orderlist`):

| Nội dung theo dõi | Nơi hợp lý | Ghi chú kỹ thuật |
|-------------------|------------|-----------------|
| Từng dòng trừ credit theo **đơn mới** | Bảng đơn + (tương lai) panel “Credit đã dùng” từ `refund_credit_applications` | Mỗi dòng: `target_order_code`, `applied_amount`, `applied_at`, `credit_note_id`. |
| Số còn lại theo **phiếu** | Cùng trang nguồn hoàn (_đơn cũ_) hoặc màn “Phiếu credit” tập trung | Đọc từ `receipt.refund_credit_notes` (`available_amount`, `status`). |
| Cột **“Giá trước credit”** trên list đơn | `docs` / list orders query | Khi tạo đơn có credit, lưu thêm `orders.order_list.gross_selling_price`; công thức hiển thị: `COALESCE(gross_selling_price, price + applied) AS price_before_credit`. |

Bạn có thể **đánh dấu nội bộ** trên tài liệu dự án: “Single source: `refund_credit_notes` + `refund_credit_applications` + cột `gross_selling_price` trên `order_list` khi áp credit.”

## 4. Hướng thiết kế: trang “Sổ credit khách” vs chọn credit khi tạo đơn

**A. Tối thiểu (đang có):** trên form **Tạo đơn mới (Order Builder)** — mục chọn `refund_credit_note_id` + số trừ tối đa (đã bị cắt theo `min(yc, giá gross, available)` ở backend). Đủ cho vận hành.  

**B. Tối ưu theo dõi:** thêm trang (hoặc tab) **“Credit theo SĐT / theo mã đơn nguồn”**:
- Bảng phiếu: mã, đơn nguồn, ban đầu, đã dùng, còn lại, trạng thái.  
- Expand: danh sách `applications` (các đơn đã trừ).  
- Có bộ lọc **OPEN / PARTIALLY / FULLY**.  

**C. Tạo đơn nâng cao:** Autocomplete: gõ mã cũ hoặc SĐT → trả về **mọi** phiếu còn hạn sử dụng; mặc định số trừ = `min(available, giá đang nhập)`.

Bạn chọn (B) nếu phải đối soát nhiều; chọn (A) nếu số lượng phiếu/đơn ít.

## 5. Tham số cấu hình trong code (backend)

- Ngưỡng: **`CREDIT_BALANCE_TOLERANCE_VND = 5000`** (trong `createOrder` — đơn tạo xong, nếu còn thu ≤ 5.000 thì gán **Đã Thanh Toán** và `price = 0`).  
- Cột: **`gross_selling_price`** trên `orders.order_list` (migration 084) — bắt buộc khi cần hiển thị **giá niêm yết** đúng sau khi `price` đã bị hạ còn 0.  

Khi cập nhật DB, chạy migration mới tương ứng trong `database/migrations/`.

- Migration **085**: cột `split_from_note_id`, `succeeded_by_note_id` trên `receipt.refund_credit_notes` và cập nhật `fn_recompute_refund_credit_note_balance` (bỏ qua dòng `VOID`).

---
*Tài liệu này bám theo mô tả nghiệp vụ; điều chỉnh số 5.000 hoặc quy tắc tách phiếu cần thống nhất với kế toán nội bộ trước khi sửa code.*


## --- [dashboard-financial-write-paths.md] ---

# Inventory Luồng WRITE Tài Chính Dashboard

Tài liệu này liệt kê các điểm WRITE đang cộng/trừ số tài chính trong hệ thống dashboard.
Mục tiêu: nhìn một chỗ là biết luồng nào đang tác động doanh thu/lợi nhuận/refund/off-flow.

---

## 1) Các luồng WRITE chính

### `backend/webhook/sepay/routes/webhook.js`
- Luồng webhook Sepay cộng/trừ `total_revenue`, `total_profit`, `total_off_flow_bank_receipt` qua `incrementDashboardSummaryByDelta`.
- Đây là luồng realtime chính cho thanh toán qua webhook.

### `backend/src/controllers/Order/manualWebhookCompletion.js`
- Nút/manual complete webhook cộng doanh thu/lợi nhuận vào monthly summary.
- Có ghi audit cho financial state của receipt.

### `backend/src/controllers/PaymentsController/index.js`
- Luồng reconcile receipt dùng `applyDashboardDelta` để cộng/trừ lại revenue/profit/off-flow.
- Khi chọn mark paid còn gọi thêm:
  - `updateDashboardMonthlySummaryOnStatusChange`
  - `syncMavnStoreProfitExpense`

### `backend/src/controllers/Order/finance/dashboardSummary.js`
- Hàm `updateDashboardMonthlySummaryOnStatusChange` (được gọi từ update/hủy đơn) cộng/trừ:
  - `total_revenue`
  - `total_refund`
  - `total_profit` (thông qua nhánh phụ)

### `backend/src/controllers/Order/finance/pendingRefundDashboardProfitFallback.js`
- Điều chỉnh `total_profit` khi vào luồng hoàn theo công thức refund/NCC.

### `backend/src/controllers/StoreProfitExpensesController/index.js`
- `external_import` thêm/xóa sẽ trừ/cộng `total_profit` qua `applyExternalImportProfitDelta`.

### `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js`
### `backend/src/controllers/Order/finance/mavnRenewalPaidSync.js`
### `backend/src/controllers/Order/finance/mavnCompleteProcessingPaidWithoutWebhook.js`
- Các luồng MAVN có điều chỉnh `total_profit`.

### `backend/src/controllers/Order/finance/reversePostedReceiptFinancialDashboard.js`
- Có luồng reverse đã post: trừ ngược revenue/profit/orders/import/off-flow theo receipt state.

---

## 2) Luồng batch/rebuild (không phải realtime write theo giao dịch đơn lẻ)

### `backend/scripts/ops/rebuild-dashboard-monthly-summary.js`
- Xóa và rebuild toàn bộ `dashboard_monthly_summary`.

### `backend/src/services/dashboard/dailyRevenueSummaryBackfill.js`
- Recompute/UPSERT `daily_revenue_summary`:
  - `earned_revenue`
  - `revenue_reversed`
  - `allocated_profit_tax`
  - các chỉ số daily khác

---

## 3) Điểm cần lưu ý môi trường/migration

### Legacy trigger theo `payment_receipt`
- Migration tạo trigger cũ:
  - `backend/migrations/20260601120000_trigger_dashboard_revenue_on_payment_receipt.js`
- Migration drop trigger cÅ©:
  - `backend/migrations/20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`

Nếu môi trường nào chưa drop trigger legacy, có thể phát sinh cộng revenue ngoài flow ứng dụng hiện tại.

---

## 4) Kết luận ngắn

- Cộng doanh thu bán hàng: chủ yếu từ webhook (và một số luồng manual/reconcile).
- Trừ doanh thu theo hoàn/hủy (Model A): đi từ luồng đổi trạng thái đơn trong `dashboardSummary`.
- `total_refund` là chỉ số tracking riêng; daily refund tracking nằm ở `daily_revenue_summary.revenue_reversed`.

---

## 5) Luồng nên được giữ lại

### Nhóm bắt buộc giữ (core production flow)
- `backend/webhook/sepay/routes/webhook.js`
  - Luồng ghi nhận doanh thu/lợi nhuận chính khi nhận tiền thực tế.
  - Áp rule thiếu tiền không cộng doanh thu, đủ tiền mới cộng, thừa tiền tách off-flow.
- `backend/src/controllers/Order/finance/dashboardSummary.js`
  - Luồng đổi trạng thái đơn ảnh hưởng monthly summary theo Model A.
  - Hủy/hoàn: trừ trực tiếp `total_revenue`, cộng `total_refund`.
- `backend/src/controllers/Order/finance/pendingRefundDashboardProfitFallback.js`
  - Giữ để bảo đảm công thức lợi nhuận hoàn theo `refund_amount - ncc_refund_amount`.
- `backend/src/controllers/Order/finance/dailyRevenueSummaryAdjustments.js`
  - Giữ để cộng dồn `daily_revenue_summary.revenue_reversed` theo ngày.
- `backend/src/controllers/Order/finance/refundCredits.js`
  - Giữ vì đây là ledger credit khách hàng (khả dụng/không khả dụng, apply/cashout).

### Nhóm giữ nhưng giới hạn quyền dùng (operational flow)
- `backend/src/controllers/PaymentsController/index.js` (reconcile)
  - Chỉ dùng khi sửa lệch dữ liệu receipt/order.
  - Không dùng như luồng ghi nhận doanh thu thường ngày.
- `backend/src/controllers/Order/manualWebhookCompletion.js`
  - Chỉ dùng khi cần fallback thủ công có kiểm soát.
  - Nên yêu cầu audit log đầy đủ cho mọi thao tác.

### Nhóm giữ cho nghiệp vụ đặc thù
- `backend/src/controllers/StoreProfitExpensesController/index.js`
  - Giữ để xử lý `external_import` ảnh hưởng `total_profit`.
- `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js`
- `backend/src/controllers/Order/finance/mavnRenewalPaidSync.js`
- `backend/src/controllers/Order/finance/mavnCompleteProcessingPaidWithoutWebhook.js`
  - Giữ cho nhánh MAVN đặc thù (điều chỉnh lợi nhuận theo cost nhập MAVN).

### Nhóm giữ cho bảo trì/đối soát
- `backend/scripts/ops/rebuild-dashboard-monthly-summary.js`
- `backend/src/services/dashboard/dailyRevenueSummaryBackfill.js`
  - Chỉ chạy khi backfill/rebuild hoặc xử lý lệch số.

---

## 6) Luồng không nên active trong runtime chuẩn

- Legacy trigger cộng revenue từ `payment_receipt`:
  - `backend/migrations/20260601120000_trigger_dashboard_revenue_on_payment_receipt.js`
- Runtime chuẩn phải ở trạng thái đã drop trigger theo:
  - `backend/migrations/20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`


## --- [dashboard-page-financial-flow.md] ---

# Chuẩn luồng tài chính 1 cửa hàng (Cash-Basis)

Tài liệu này là **nguồn chuẩn duy nhất** để hiểu và vận hành số liệu Dashboard cho một cửa hàng.
Mục tiêu là thống nhất tuyệt đối cách ghi nhận:

- Doanh thu
- Tiền nhập hàng (giá vốn nhập NCC)
- Lợi nhuận
- Refund (hoàn tiền)
- Tiền ngoài luồng

---

## 1) Từ điển định nghĩa chuẩn

### 1.1. Doanh thu ghi nhận (`recognized_revenue`)

Tổng tiền ghi nhận doanh thu từ đơn hàng hợp lệ theo nguyên tắc cash-basis, với điều kiện **đơn đã thu đủ ngưỡng được công nhận**.

- Chỉ ghi nhận khi đã nhận tiền thực tế và đạt điều kiện "đủ tiền" của đơn.
- Không ghi nhận theo thời điểm tạo đơn.
- Không bao gồm tiền ngoài luồng.
- Nếu thu **thiếu tiền**: chưa cộng doanh thu, ghi trạng thái chờ thu đủ.
- Nếu thu **đủ tiền**: cộng doanh thu theo phần thuộc giá trị đơn hàng.
- Nếu thu **thừa tiền**: chỉ cộng doanh thu đúng phần của đơn; phần thừa ghi vào tiền ngoài luồng.
- Nếu nhận tiền **không trong luồng đơn hàng** (không match đơn): không cộng doanh thu, ghi toàn bộ vào tiền ngoài luồng.

### 1.2. Tiền nhập hàng (`total_import`)

Tổng chi phí nhập hàng từ nhà cung cấp (NCC), phục vụ cấu phần giá vốn và công nợ NCC.

- Bản chất là chi phí nhập kho/nhập hàng, không đồng nhất với dòng tiền khách trả.
- `total_import` được ghi nhận theo cùng nhánh nghiệp vụ với doanh thu.
- Khi doanh thu được cộng thành công, hệ thống đồng thời:
  - tạo log cost NCC,
  - chuyển đơn sang trạng thái `Đã Thanh Toán`.
- Ba bước (cộng doanh thu, tạo log cost NCC, chuyển trạng thái đơn) là một nhánh nghiệp vụ thống nhất, cần đảm bảo nhất quán và idempotent.
- Nếu đơn chưa đủ điều kiện cộng doanh thu thì chưa tạo log cost NCC và chưa ghi nhận `total_import`.

### 1.3. Refund (`total_refund`)

Trong nhánh hủy đơn, refund được ghi nhận ngay tại thời điểm thao tác hủy, bucket vào tháng hiện tại.

- Khi bấm hủy đơn, hệ thống xử lý theo một nhánh nghiệp vụ:
  - trừ trực tiếp `total_revenue`,
  - trừ trực tiếp `total_profit`,
  - cá»™ng `total_refund`.
- Tiền cần hoàn cho khách được note vào `daily_revenue_summary.revenue_reversed`:
  - chỉ ghi số tiền cần hoàn (`refund_amount`),
  - nếu trong ngày có nhiều đơn hoàn thì cộng dồn vào cùng ngày (`summary_date`).
- Đồng thời tạo:
  - log NCC cần hoàn (đối soát công nợ NCC),
  - log credit khả dụng cho khách hàng (phục vụ đơn sau hoặc hoàn lại tiền mặt từ credit).
- Trạng thái đơn chuyển về `Chưa hoàn` để theo dõi xử lý hoàn thực tế.
- Trong mô hình này:
  - Daily chỉ phản ánh doanh thu/lợi nhuận theo ngày, không trừ refund ở tầng hiển thị daily.
  - Monthly hiển thị doanh thu ròng theo `total_revenue`; `total_refund` là chỉ số theo dõi riêng.

### 1.4. Lợi nhuận chuẩn (`standard_profit`)

Lợi nhuận chuẩn được map vào `dashboard_monthly_summary.total_profit` và ghi nhận theo delta nghiệp vụ.

- Khi bán hàng đủ điều kiện ghi nhận doanh thu:
  - `profit_delta_sale = sale_price - cost`
- Khi phát sinh hoàn tiền:
  - `profit_delta_refund = -(refund_amount - ncc_refund_amount)`
- Lợi nhuận tháng:
  - `total_profit_month = SUM(profit_delta_sale) + SUM(profit_delta_refund)`
- Không bao gồm tiền ngoài luồng.

### 1.5. Tiền ngoài luồng (`off_flow_amount`)

Khoản tiền không thuộc đơn hàng và không phải tiền của shop.

- Không phải chi phí của shop.
- Không được tính vào doanh thu.
- Không được tính vào lợi nhuận.
- Chỉ dùng để theo dõi kiểm soát/rủi ro và phục vụ đối soát.

---

## 2) Luồng ghi nhận một chiều theo thời gian

Luồng duy nhất áp dụng cho một đơn hàng tài chính:

1. **Thu tiền thực tế**
   - Khi hệ thống xác nhận đã nhận tiền thực tế của đơn hợp lệ, ghi nhận doanh thu cash-basis.
2. **Cập nhật doanh thu ngày/tháng**
   - Cộng vào summary ngày và tháng theo mốc thu tiền.
3. **Phát sinh refund (nếu có)**
   - Ghi số tiền cần hoàn vào `daily_revenue_summary.revenue_reversed` (cộng dồn theo ngày).
   - Note ngày hoàn để hạch toán dòng tiền đúng kỳ.
4. **Xác định phần NCC cần hoàn/đối trừ**
   - Tạo log NCC riêng để theo dõi trách nhiệm hoàn hoặc bù trừ với NCC.
5. **Tổng hợp lên dashboard**
   - `daily_revenue_summary` phản ánh số theo ngày.
   - `dashboard_monthly_summary` tổng hợp theo tháng từ quy tắc đã chuẩn hóa.
6. **Theo dõi tiền ngoài luồng**
   - Ghi nhận ở luồng kiểm soát riêng, không đi vào công thức doanh thu/lợi nhuận chuẩn.

---

## 3) Bộ công thức chuẩn (cố định)

## 3.1. Công thức ngày (daily)

- `daily_gross_inflow = tong_tien_thu_thuc_te_tu_don_hang_hop_le`
- `daily_revenue_view = daily_revenue_summary.earned_revenue`
- `daily_profit_view = daily_revenue_summary.allocated_profit_tax` (nếu có snapshot phân bổ lợi nhuận)
- `daily_refund_tracking = daily_revenue_summary.revenue_reversed` (chỉ theo dõi/audit, không trừ vào KPI daily)

## 3.2. Công thức tháng (monthly)

- `monthly_total_revenue = dashboard_monthly_summary.total_revenue` (đã phản ánh delta giảm do hủy/hoàn theo Model A)
- `monthly_refund_tracking = dashboard_monthly_summary.total_refund` (chỉ theo dõi)
- `monthly_net_revenue_view = monthly_total_revenue`

## 3.3. Lợi nhuận chuẩn

- `profit_delta_sale = sale_price - cost`
- `profit_delta_refund = -(refund_amount - ncc_refund_amount)`
- `standard_profit_month = SUM(profit_delta_sale) + SUM(profit_delta_refund)`

Trong đó:
- `sale_price` là giá bán ghi nhận doanh thu của đơn.
- `cost` là giá vốn/NCC cost của đơn.
- `refund_amount` là số tiền hoàn cho khách.
- `ncc_refund_amount` là phần NCC hoàn/đối trừ lại cho shop tương ứng khoản refund.

## 3.4. Quy tắc loại trừ bắt buộc

- `off_flow_amount` **không** cộng vào `daily_gross_inflow`, `monthly_total_revenue`, `standard_profit_month`.
- Không dùng tiền ngoài luồng để bù doanh thu thiếu hoặc “làm đẹp” lợi nhuận.

---

## 4) Mapping bảng dữ liệu và kiểm soát đối soát

## 4.1. `daily_revenue_summary`

Vai trò:
- Nguồn tổng hợp tài chính theo ngày.
- Bắt buộc phản ánh được refund theo ngày hoàn.

Yêu cầu kiểm soát:
- Refund theo ngày ghi tại `revenue_reversed` (chỉ số theo dõi).
- KPI daily hiển thị theo doanh thu/lợi nhuận ngày, không trừ refund ở tầng hiển thị daily.
- Mỗi thay đổi refund phải truy vết được nguồn và thời điểm.

## 4.2. `dashboard_monthly_summary`

Vai trò:
- Tổng hợp theo tháng phục vụ KPI dashboard.

Yêu cầu kiểm soát:
- Đồng nhất quy tắc loại trừ tiền ngoài luồng như daily.
- Tháng phản ánh theo ledger delta của `dashboard_monthly_summary` (bao gồm cả delta giảm trực tiếp khi hủy/hoàn theo Model A).
- Báo cáo tháng không được tự ý dùng định nghĩa khác với daily.

## 4.3. Log NCC (hoàn/đối trừ NCC)

Vai trò:
- Theo dõi phần NCC cần hoàn hoặc cần đối trừ khi có refund.

Yêu cầu kiểm soát:
- Mỗi dòng log liên kết được với refund phát sinh.
- Có trạng thái xử lý (chưa xử lý/đã xử lý) để phục vụ reconcile cuối kỳ.
- Không thay thế summary dashboard; đây là ledger đối soát độc lập.

---

## 5) Ví dụ nghiệp vụ chuẩn (tránh hiểu sai)

## Ví dụ 1: Đơn thanh toán đủ, không refund

- Thu thực tế: 500,000
- Refund: 0
- Tiền nhập hàng: 300,000
- Tiền ngoài luồng: 0

Kết quả:
- `total_revenue` tháng tăng `500,000`
- `standard_profit = 500,000 - 300,000 = 200,000`

## Ví dụ 2: Đơn có refund một phần

- Thu thực tế: 500,000
- Refund ngày D+2: 120,000
- Tiền nhập hàng: 300,000

Kết quả:
- `total_revenue` tháng giảm trực tiếp `120,000` tại thời điểm hủy/hoàn.
- `total_refund` tháng tăng `120,000` để theo dõi/audit.
- `profit_delta_refund = -(120,000 - ncc_refund_amount)`; lợi nhuận tháng giảm theo delta này.
- Tạo log NCC cho phần cần hoàn/đối trừ theo chính sách NCC.

## Ví dụ 3: Đơn refund toàn phần

- Thu thực tế: 500,000
- Refund: 500,000
- Tiền nhập hàng: 300,000

Kết quả:
- `total_revenue` tháng giảm trực tiếp `500,000`.
- `total_refund` tháng tăng `500,000`.
- `profit_delta_refund = -(500,000 - ncc_refund_amount)`; nếu `ncc_refund_amount = 300,000` thì lợi nhuận giảm `200,000`.
- Bắt buộc có log NCC để xử lý phần giá vốn tương ứng.

## Ví dụ 4: Có phát sinh tiền ngoài luồng

- Thu thực tế từ đơn: 500,000
- Tiền ngoài luồng: 150,000
- Refund: 0
- Tiền nhập hàng: 300,000

Kết quả chuẩn:
- Doanh thu tính báo cáo: chỉ `500,000`
- Lợi nhuận chuẩn: `500,000 - 300,000 = 200,000`
- `150,000` chỉ nằm ở sổ kiểm soát ngoài luồng, không đi vào doanh thu/lợi nhuận.

## Ví dụ 5: Thu trong tháng A, refund trong tháng B

- Tháng A thu: 800,000
- Tháng B refund: 200,000
- Tiền nhập hàng: 450,000

Kết quả:
- Tháng A: phản ánh thu theo cash-basis tại thời điểm thu.
- Tháng B: phản ánh refund theo ngày hoàn.
- Đối soát tháng dùng `total_revenue` đã phản ánh delta hoàn trực tiếp, và `total_refund` để theo dõi/audit.

## Ví dụ 6: Refund nhiều lần cho cùng một đơn

- Thu thực tế: 1,000,000
- Refund đợt 1: 100,000
- Refund đợt 2: 150,000
- Tiền nhập hàng: 600,000

Kết quả:
- `total_refund = 250,000`
- `total_revenue` tháng giảm trực tiếp tổng `250,000`.
- Lợi nhuận giảm theo tổng `SUM(-(refund_amount_i - ncc_refund_amount_i))` của từng đợt.
- Mỗi đợt refund có log thời điểm và liên kết log NCC tương ứng.

---

## Checklist vận hành cuối ngày/cuối tháng

- Đã tách bạch rõ doanh thu, tiền nhập hàng, refund, tiền ngoài luồng.
- Refund luôn có số tiền + ngày hoàn + liên kết log NCC (nếu có nghĩa vụ NCC).
- Không có khoản ngoài luồng nào đi vào doanh thu/lợi nhuận.
- Tổng tháng khớp logic cộng từ daily.
- Có thể truy vết từ dashboard về giao dịch gốc và log NCC khi kiểm toán nội bộ.

---

## Quy định áp dụng

Từ thời điểm tài liệu này ban hành, mọi thay đổi liên quan dashboard tài chính phải tuân theo các định nghĩa và công thức ở đây. Nếu có thay đổi nghiệp vụ, cập nhật tài liệu này trước khi đổi logic tính toán.


## --- [MONEY_FLOW.md] ---

# Luồng Tiền Tệ & Lợi Nhuận (Money Flow)

Tài liệu này mô tả chi tiết cách hệ thống xử lý tiền tệ, từ khi khách hàng thanh toán đến khi tính toán lợi nhuận (Profit) và cập nhật Dashboard.

## 1. Doanh thu (Revenue)
Doanh thu được ghi nhận từ hai nguồn chính:
- **Biên nhận từ Webhook (Sepay)**: Tiền khách chuyển khoản vào tài khoản ngân hàng của hệ thống.
- **Biên nhận thủ công**: Tiền mặt hoặc kênh khác do admin tự thêm.
- Doanh thu của đơn hàng = Tổng tiền của các biên nhận đã ghép nối (`orderCode` khớp).

## 2. Chi phí (Cost)
- Chi phí đơn hàng (`cost`) được lấy từ giá nhập của nhà cung cấp (Supplier).
- Hệ thống hỗ trợ "Prorate" (tính chi phí theo tỷ lệ số ngày sử dụng còn lại) khi thực hiện đổi tài khoản (Đổi NCC) giữa chu kỳ.
- Chi phí mặc định cho hàng nội bộ (Mavryk Shop) là 0 đ.

## 3. Lợi Nhuận (Profit)
- **Profit = Thu (Revenue) - Chi phí (Cost) - Tiền Hoàn (Refund, nếu có)**.
- Khi một đơn hàng hoàn thành thanh toán (hoặc khi đổi trạng thái), hệ thống tự động ghi sổ (post financial log) vào bảng `payment_receipt_financial_state`.
- Lợi nhuận của cả cửa hàng (Mavn Store Profit) được đồng bộ song song.

## 4. Ghi Nhận Số Dư Bank (Shop Bank Ledger)
- Tiền vào ngân hàng thực tế (qua Sepay) được lưu vào `shop_bank_receipt_totals` và `shop_bank_ledgers`.
- Đảm bảo số dư (Balance) hiển thị trong admin bằng đúng số dư thực tế của ngân hàng (Single Source of Truth).

## 5. Hoàn Tiền (Refund) & Credit
- Tiền hoàn (Refund) là số tiền trả lại khách hàng (hoặc cấn trừ sang đơn mới).
- Hệ thống tạo **Refund Credit Note** để tái sử dụng số dư này cho đơn hàng tương lai của cùng khách hàng.


## --- [nghiep-vu-loi-nhuan-ban-slot.md] ---

# Nghiệp vụ tính lợi nhuận khi bán slot (định hướng dài hạn)

Tài liệu mô tả **tổng quan nghiệp vụ** và **nguyên tắc thiết kế** để tính lợi nhuận khi bán slot trong gói sản phẩm, nhằm dùng **lâu dài** (ổn định, kiểm chứng được, không phụ thuộc vào một màn hình tạm thời).

---

## 1. Mục đích và phạm vi

### 1.1 Mục đích

- Thống nhất **định nghĩa lợi nhuận** khi bán một slot cho khách: không chỉ dựa vào *gi bán − cost NCC trên đơn*, mà phải phản ánh **chi phí cơ hội / chi phí “ôm” slot** trong thời gian slot nằm tồn trước khi bán.
- Đảm bảo cùng một quy tắc có thể dùng cho **báo cáo**, **dashboard**, và **đối soát** theo tháng / kỳ, không chỉ hiển thị trên một bảng chi phí phân bổ theo ngày.

### 1.2 Phạm vi

**Trong phạm vi:**

- Slot thuộc **gói sản phẩm** (có cấu trúc slot trong catalog / `package_product` hoặc tương đương).
- Đơn nhập **MAVN** (đã thanh toán NCC) là nguồn gốc **chi phí nhập** và **kỳ phân bổ** (thời hạn, ngày bắt đầu áp dụng).
- Bán slot ra khách (MAVL / MAVC / đơn bán lẻ — tùy hệ thống đặt tên): **doanh thu** và **thời điểm bán**.

**Ngoài phạm vi (giai đoạn 1 có thể loại trừ rõ ràng):**

- Hoàn tiền, điều chỉnh hậu kiểm phức tạp (ghi nhận lại theo IFRS — nếu sau này cần thì mở rộng).
- Chi phí cố định doanh nghiệp không gắn slot (thuê server toàn cục, nhân sự chung), trừ khi sau này phân bổ theo policy riêng.

---

## 2. Thuật ngữ

| Thuật ngữ | Mô tả ngắn |
|-----------|------------|
| **Slot** | Một “ô” quyền sử dụng / tài khoản trong gói (ví dụ một user trong gói gia đình). |
| **Chi phí nhập (import cost)** | Số tiền thực trả / ghi nhận trên đơn nhập MAVN cho gói hoặc phần gói tương ứng. |
| **Phân bổ chi phí theo ngày** | Chia `chi phí nhập` (và/hoặc chi phí khác) cho **số ngày trong kỳ** và **số slot**, để mỗi slot mỗi ngày mang một phần chi phí “đang tồn”. |
| **Chi phí ôm slot / carrying cost** | Tích lũy phần phân bổ **từ lúc bắt đầu tính tồn** đến **thời điểm bán** (hoặc đến cuối kỳ báo cáo), *theo đúng quy tắc đã chốt*. |
| **Doanh thu bán slot** | Giá bán ghi nhận khi bán slot cho khách (sau thuế / trước thuế — cần chốt một chuẩn). |
| **Lợi nhuận gộp slot (theo nghiệp vụ này)** | Doanh thu bán slot **trừ** chi phí nhập đã phân bổ tương ứng phần đã “ôm” (và trừ các cost trực tiếp khác nếu policy có). |

---

## 3. Ví dụ nghiệp vụ tham chiếu (đồng bộ với trao đổi)

- Slot A **tồn 10 ngày** → quy ước phần phân bổ tương ứng **10.000** (đơn vị VNĐ, số mang tính minh họa).
- Bán slot A **50.000**, NCC là Mavryk và trên đơn bán **cost = 0** (không có dòng nhập mới).
- **Lợi nhuận mong đợi:** `50.000 − 10.000 = 40.000`  
  (tức vẫn phải trừ **chi phí đã tích lũy khi tồn**, không được coi lợi nhuận = 50.000).

Điểm cốt lõi: **cost = 0 trên đơn bán** không có nghĩa **chi phí kinh tế của slot = 0**.

---

## 4. Trạng thái hệ thống liên quan (bối cảnh kỹ thuật)

### 4.1 Bảng chi phí theo ngày (UI hiện tại)

- Bảng **“BẢNG CHI PHÍ THEO NGÀY”** (workspace chi phí) đang kết hợp:
  - đơn nhập MAVN đã TT,
  - cấu hình gói từ **`package_product`** (số slot, gán slot, v.v.),
  - và **logic tính toán phân bổ** (nhiều phần chạy ở frontend).
- Dữ liệu hiển thị là **kết quả suy diễn** từ nhiều nguồn, không phải một **sổ cái chi phí slot** độc lập lưu trong DB.

### 4.2 Hệ quả cho “minh bạch lâu dài”

- Nếu **chỉ** tin vào cấu hình catalog + tính lại mỗi lần load UI, sẽ khó:
  - **đối soát** cùng một con số với báo cáo lợi nhuận,
  - **khóa sổ** một kỳ khi đã chốt,
  - **giải thích** khi đổi code khớp gói hoặc đổi thuật toán phân bổ.

Đây là lý do cần **nghiệp vụ dài hạn** tách rõ: **quy tắc tính**, **nguồn dữ liệu**, và **cách ghi nhận** (tính lại hay lưu snapshot/ledger).

---

## 5. Nguyên tắc nghiệp vụ dài hạn

### 5.1 Một “engine” duy nhất

- Mọi con số **phân bổ chi phí tồn** và **lợi nhuận khi bán slot** phải đi qua **cùng một lớp nghiệp vụ** (backend hoặc lớp domain thống nhất), không được hai nơi hai công thức.
- UI chỉ **hiển thị** hoặc **điều chỉnh tham số** được phép; không phải nơi định nghĩa cuối cùng cho P&L.

### 5.2 Phân biệt “catalog” và “sự kiện”

- **`package_product` (và tương đương):** mô tả **cấu trúc** gói (bao nhiêu slot, tên slot, match…).
- **Sự kiện kinh doanh:** nhập hàng (MAVN), slot vào trạng thái có thể bán, bán slot, hủy, chuyển slot…  
  Lợi nhuận lâu dài cần **neo** vào sự kiện hoặc vào **snapshot** đã chốt, không chỉ vào bản catalog có thể đổi sau.

### 5.3 Chốt thời điểm ghi nhận

Cần quy ước rõ (và giữ ổn định):

- **Bắt đầu tích lũy carrying:** từ `registration_date` / `order_date` / ngày vào kho — **một chuẩn duy nhất**.
- **Kết thúc tích lũy cho một slot bán:** tại thời điểm **đơn bán** được coi là hoàn tất (tạo đơn / thanh toán / giao slot — cần chọn một mốc **chính thức**).

### 5.4 Đơn vị công thức (đề xuất làm rõ trong policy)

Một trong các mô hình (chọn một làm chuẩn sản phẩm):

1. **Theo ngày tuyến tính:**  
   `cost_per_slot_per_day = import_cost / (term_days Ã— sá»‘_slot_active)`  
   `carrying_until_sale = cost_per_slot_per_day × số_ngày_tồn_thực_tế`  
2. **Theo kỳ đã phân bổ sẵn:** chỉ tính trên các ngày có “✓ slot chiếm chỗ” trong bảng phân bổ (nếu nghiệp vụ là slot không luôn full).
3. **Kết hợp:** cost nhập cố định + điều chỉnh khi slot trống (không phát sinh carrying) — cần mô tả riêng.

Tài liệu này **không** ép một công thức cụ thể mà yêu cầu **phải có policy chữ** + **ví dụ số** + **test** gắn với policy đó.

---

## 6. Kiến trúc dữ liệu: hai hướng (đều “đúng”, khác mức độ minh bạch)

### 6.1 Hướng A — Suy diễn thuần (derive), không bảng ledger mới

**Ý tưởng:** Luôn tính lại carrying và lợi nhuận từ:

- đơn MAVN + sản phẩm + slot,
- quy tắc phân bổ,
- lịch sử đơn bán.

**Ưu điểm:** ít migration, triển khai nhanh nếu engine backend thống nhất.  
**Nhược:** khó *khóa sổ*; đổi code có thể làm thay đổi con số quá khứ nếu không version hóa quy tắc.

### 6.2 Hướng B — Ghi nhận / snapshot / ledger (khuyến nghị cho “lâu dài” và minh bạch)

**Ý tưởng:** Với mỗi **slot** (hoặc cặp `order_mavn` + `slot_key` + `product`), lưu một trong các dạng:

- **Bản ghi chi phí theo ngày** (materialized theo job đêm / khi chốt kỳ), hoặc  
- **Sự kiện** (event): `slot_allocated`, `slot_holding_day`, `slot_sold` kèm `amount`.

**Ưu điểm:** audit tốt, báo cáo ổn định, giải thích được với NCC / kế toán nội bộ.  
**Nhược:** cần thiết kế bảng, job, và quy trình đối soát.

**Khuyến nghị định hướng:** với mục tiêu **lâu dân**, nên **tiến từ A → B**: trước hết **một engine**; sau đó **persist** output của engine theo kỳ (ít nhất **snapshot cuối tháng**).

---

## 7. Luồng nghiệp vụ mục tiêu (logical)

```text
[Nhập MAVN — đã TT]
        â”‚
        â–¼
Xác định: cost nhập, kỳ (term), số slot, ngày bắt đầu phân bổ
        â”‚
        â–¼
(Engine) Phân bổ carrying theo policy ──────► Báo cáo tồn / UI
        â”‚
        â–¼
[Bán slot — đơn khách]
        â”‚
        â–¼
(Engine) Lợi nhuận slot = Doanh thu − carrying đã tích − cost trực tiếp khác
        â”‚
        â–¼
Ghi nhận vào báo cáo P&L slot (và ledger nếu có)
```

---

## 8. Tiêu chí chấp nhận (acceptance) gợi ý

- **AC1:** Với kịch bản cost NCC trên đơn bán = 0 nhưng slot đã tồn N ngày có carrying > 0, **lợi nhuận < doanh thu** và bằng đúng công thức đã chốt.  
- **AC2:** Cùng một bộ đơn/MAVN/slot, **số carrying** trên màn chi phí và **số trừ khi tính lợi nhuận bán** trùng nhau (sai số ≤ 1 đơn vị làm tròn nếu có).  
- **AC3:** Có thể giải thích được một dòng lợi nhuận: *slot nào, đơn nhập nào, bao nhiêu ngày, đơn bán nào*.  
- **AC4 (nếu có ledger):** Sau khi **khóa kỳ**, không đổi số đã chốt khi chỉnh sửa catalog; mọi điều chỉnh đi qua **bút điều chỉnh** có audit.

---

## 9. Rủi ro và kiểm soát

| Rủi ro | Kiểm soát gợi ý |
|--------|------------------|
| Khớp sai gói / sai `slotLimit` | Chuẩn hóa khóa: `line_product_id` / `variant_id` / `package_id`; fallback match phải log cảnh báo. |
| Đổi term hoặc ngày sau nhập | Quyền sửa có audit; có thể tạo bản ghi điều chỉnh carrying. |
| Làm tròn theo ngày | Chốt quy tắc làm tròn và dùng chung mọi nơi. |
| Hai nguồn sự thật (UI vs API) | Engine một nơi; UI chỉ consume API/domain. |

---

## 10. Lộ trình đề xuất (Roadmap)

1. **Chốt policy** bằng văn bản (công thức + mốc thời gian + ví dụ 3–5 kịch bản số).  
2. **Implement engine** backend (pure function / domain service + unit test theo ví dụ).  
3. **Nối** màn chi phí và báo cáo lợi nhuận vào **cùng API** engine.  
4. **(Tuỳ độ ưu tiên minh bạch)** Thêm bảng snapshot/ledger + job chốt kỳ.  
5. **Giám sát:** log chênh lệch, dashboard “slot không khớp gói”.

---

## 11. Phụ lục — Liên kết code hiện có (tham chiếu)

- Workspace chi phí: `frontend/src/features/expenses/components/ExpenseCostAllocationTable.tsx`  
  (tải MAVN paid + package-products + package_match, ghép và phân bổ trên client).  
- Dịch vụ gói: `backend/src/services/packageProductService.js`, controller package tương ứng.  
- Đồng bộ chi phí MAVN store: `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js` (nếu mở rộng ghi nhận).

Tài liệu này **không** thay thế policy kế toán pháp lý; là **spec nội bộ** để kỹ thuật và vận hành cùng chung ngôn ngữ khi triển khai lâu dài.

---

*Tài liệu: `docs/nghiep-vu-loi-nhuan-ban-slot.md` — có thể cập nhật khi policy công thức được chốt chính thức.*


## --- [payment-slot-suffix-matching.md] ---

# Thanh toán theo suffix số tiền (không nội dung CK)

Tài liệu mô tả cơ chế match webhook **không cần ghi nội dung chuyển khoản** và **không dùng cột `transaction`** cho đơn mới.

## Tóm tắt

| Trước | Sau |
|-------|-----|
| Sinh mã `transaction` 8 ký tự, ghi vào VietQR `addInfo` | Không sinh `transaction` |
| Webhook match theo nội dung CK / mã transaction | Webhook match theo **(STK nhận, số tiền)** |
| `order_list.price` = giá gốc | `order_list.price` = **giá gốc + suffix** (1..100) |

Khách chỉ cần chuyển **đúng số tiền** hiển thị trên QR (ví dụ `100.017đ` thay vì `100.000đ`).

## Thành phần DB

- **Sequence** `orders.payment_amount_suffix_seq` — suffix luân phiên 1..100 (CYCLE).
- **Bảng** `orders.order_payment_slots` — mỗi lần đơn chờ thanh toán = 1 slot (`cycle_index`).
- **View** `orders.v_payment_slot_health` — theo dõi slot pending theo `(receiver_account, base_amount)`.

Migration:

- `backend/migrations/20260823120000_order_payment_slots.js`
- `database/migrations/107_order_payment_slots.sql`

## Vòng đời slot

```
Tạo đơn / chuyển Cần Gia Hạn
  â†’ openPaymentSlot (kind: new | renewal)
  â†’ expected_amount = base_amount + suffix
  â†’ UPDATE order_list.price = expected_amount

Khách CK đúng expected_amount
  â†’ Webhook insertPaymentReceipt
  â†’ resolveOrderByExpectedAmount(receiver, amount)
  â†’ markPaymentSlotMatched

Đơn paid / renewal xong / hủy slot cũ
  → suffix được giải phóng (unique chỉ áp pending)
```

### Đơn mới

- `POST /api/orders` → `createOrder.js` mở slot `kind='new'` khi status `Chưa Thanh Toán` và `price > 0`.

### Gia hạn

1. Cron `updateDatabaseTask` (00:01 VN): `PAID` → `Cần Gia Hạn` (0–4 ngày còn lại).
2. Ngay sau đó `openRenewalSlotsForFlippedOrders`: recompute giá từ bảng giá (`computeOrderCurrentPrice`) → mở slot `kind='renewal'`.
3. Cron `notifyFourDays` (07:00): gửi Telegram + QR với `order.price` đã có suffix.

Giá renewal **chốt tại lúc flip RENEWAL**, không đổi khi bảng giá thay đổi sau đó (tránh lệch với số khách đã thấy trên QR).

## Webhook Sepay

File: `backend/webhook/sepay/payments.js` â€” `insertPaymentReceipt`

1. Không extract `orderCode` từ nội dung CK.
2. Trong transaction: `resolveOrderByExpectedAmount({ receiverAccount, amount })`.
3. Sau INSERT receipt: `markPaymentSlotMatched`.

`postHandler` vẫn có fallback `resolveOrderByPayment` (match `order_list.price = amount`) cho luồng xử lý đơn; **không** resolve qua cột `transaction`.

## Telegram

- QR: chỉ `amount` + STK (không `addInfo` / không mã transaction).
- Caption: bỏ dòng «Nội dung CK»; nhắc chuyển **đúng số tiền** trên QR.

Files: `sendOrderCreated.js`, `sendFourDays.js`, `messageBuilders.js`.

## Frontend

- `ViewOrderModal` / `paymentQr.ts`: QR shop không gửi `description`; không gọi `ensureOrderTransaction`.
- Hiển thị: «Chuyển khoản đúng số tiền trên QR — không cần ghi nội dung».

## API legacy

- `POST /api/orders/:id/ensure-transaction` — vẫn tồn tại nhưng **không sinh** mã mới; trả `transaction: ""`.

## Domain code

```
backend/src/domains/payment-slots/
```

Public API: `openPaymentSlot`, `resolveOrderByExpectedAmount`, `markPaymentSlotMatched`, `expirePaymentSlots`.

## Giới hạn & vận hành

- Tối đa **100** đơn pending cùng `(STK, base_amount)` tại một thời điểm (suffix 1..100).
- Nhiều mức giá khác nhau → mỗi mức có pool suffix riêng.
- Khách CK **làm tròn** (bỏ phần lẻ) → không match → admin gán tay qua receipt.
- Cron (khuyến nghị): `expirePaymentSlots(pool, '30 days')` dọn slot pending quá hạn.

## Triá»ƒn khai

```bash
# Chạy migration (knex hoặc SQL thủ công)
cd backend && npx knex migrate:latest
# hoặc áp database/migrations/107_order_payment_slots.sql
```

Sau migrate, đơn **mới** và đơn **gia hạn** (sau cron flip) tự có `price` mang suffix.

## Backfill đơn cũ (một lần)

Đơn đã ở `Chưa Thanh Toán` / `Cần Gia Hạn` **trước** khi bật payment slot thường còn giá tròn (vd. `65.000`) và **không có** row slot pending → webhook chỉ fallback theo `price = amount` (dễ trùng nếu nhiều đơn cùng mức).

Chạy backfill (từ thư mục `backend`):

```bash
# Xem trước, không ghi DB
node scripts/ops/backfill-payment-slots.js --dry-run

# Một đơn thử
node scripts/ops/backfill-payment-slots.js --dry-run --order=MAVCHMB3R

# Ghi thật (mặc định tối đa 500 đơn/lần)
node scripts/ops/backfill-payment-slots.js

# Batch lớn hơn
node scripts/ops/backfill-payment-slots.js --limit=2000
```

Script:

- Quét đơn `Chưa Thanh Toán` / `Cần Gia Hạn`, `price > 0`, không MAVN, **chưa có slot pending**.
- **Cần GH**: recompute giá từ bảng giá (`computeOrderCurrentPrice`) rồi mở slot `renewal`.
- **Chưa TT**: lấy giá gốc từ `order_list.price` (tách suffix 1..100 nếu có) → slot `new`.
- Cập nhật `order_list.price = expected_amount` (QR/Telegram hiển thị số có suffix).

Code: `backend/src/domains/payment-slots/use-cases/backfillPendingPaymentSlots.js`.


## --- [SEPAY_WEBHOOK_FLOW.md] ---

# Webhook Sepay Flow

Hệ thống xử lý tự động khi có biến động số dư ngân hàng qua dịch vụ Sepay.

## 1. Giai đoạn Parse (Parse Phase)
- Hệ thống trích xuất (extract) nội dung chuyển khoản để lấy mã đơn hàng (Ví dụ: `MAV123456`).
- Tách tiền nhận (Amount) và phân biệt tiền Vào (Inbound) / Ra (Outbound).

## 2. Giai đoạn Phân giải mã (Resolution Phase)
- Map các mã đơn hàng vừa trích xuất với DB.
- Hỗ trợ xử lý `Batch Code` (MAVG) để phân bổ tiền cho nhiều đơn hàng cùng lúc.
- Hỗ trợ xử lý `Payment Slot` khi không có mã đơn nhưng số tiền lẻ ngẫu nhiên (expected_amount) khớp hoàn toàn với một slot đang chờ thanh toán.

## 3. Giai đoạn Lưu trữ (Posting Phase)
- Lưu biên nhận vào `payment_receipt`.
- Đồng thời thiết lập `payment_receipt_financial_state` (Trạng thái sổ sách).
- Phân bổ tự động: Số tiền thanh toán được ghi nhận vào đơn hàng. Nếu đơn hàng chưa đủ tiền, giữ nguyên trạng thái; nếu đủ hoặc dư, đổi trạng thái sang "Đang xử lý" / "Hoàn thành" và đưa phần dư vào Ngoại luồng (Out-of-flow).

## 4. Giai đoạn Tự động gia hạn (Renewal Phase)
- Nếu giao dịch là trả tiền gia hạn tài khoản (Đơn ở trạng thái Renewal), gọi qua queue tự động xử lý tiếp gia hạn API.

## 5. Giai đoạn Thông báo (Notification Phase)
- Gửi tin báo qua Telegram (có chứa QR code, số tiền, tên đơn hàng, biến động lợi nhuận).


## --- [so-du-bank-stk-thong-nhat.md] ---

# Số dư bank khả dụng — chuyển từ một cột tổng sang số dư từng STK

Tài liệu mô tả **bài toán nghiệp vụ**, **tư duy thiết kế** và **lộ trình triển khai** khi shop chuyển cách quản lý tiền bank: không còn một con số chung trên dashboard, mà **tách ra theo từng số tài khoản (STK)** — MB, VPBank, v.v.

*Đối tượng đọc: chủ shop / quản trị — không cần biết lập trình.*

---

## 1. Ý tưởng cốt lõi

### Trước đây

Hệ thống lưu **một con số chung** gọi là *số dư bank ước tính* (trên báo cáo tháng dashboard). Mọi tiền vào/ra bank — webhook Sepay, rút tiền, nhập hàng ngoài luồng, thanh toán NCC — đều **cộng hoặc trừ vào con số đó**.

Dashboard hiển thị con số này dưới tên **Lợi nhuận khả dụng**. Shop biết “còn bao nhiêu tiền trên bank” nhưng **không biết** tiền nằm ở MB hay VPBank, và **không biết** khoản rút / trả NCC vừa rời tài khoản nào.

### Bây giờ (hướng mới)

**Không tạo thêm một “sổ tiền thứ hai”.** Số dư trên từng STK trong màn **Quản lý STK** thực chất là **cùng khoản tiền bank đó**, chỉ **chia nhỏ theo tài khoản** để dễ theo dõi dòng tiền.

```
Lợi nhuận khả dụng (cũ)  =  một cột số dư bank chung trên dashboard
Lợi nhuận khả dụng (mới) =  Số dư STK MB + Số dư STK VP + … (cộng các STK đang bật)
```

Hai vế **phải luôn bằng nhau** về mặt tổng tiền. Khác biệt duy nhất: màn STK cho thấy **phân bổ theo bank**, không chỉ một con số chung.

### Một câu tóm tắt

> **Thay vì cập nhật một cột tổng, hệ thống cập nhật số dư đúng STK; dashboard lấy tổng các STK — đó chính là số khả dụng shop từng có.**

---

## 2. Bài toán nghiệp vụ

Shop có thể có **nhiều tài khoản ngân hàng**. Tiền khách chuyển khoản vào qua Sepay. Shop cũng **rút tiền**, **nhập hàng ngoài luồng**, **thanh toán nhà cung cấp (NCC)** — mỗi khoản là tiền **ra khỏi bank**.

| Hướng | Việc cần làm |
|--------|----------------|
| **Vào** | Webhook Sepay hoặc xác nhận thanh toán thủ công → **cộng** số dư đúng STK nhận tiền |
| **Ra** | Rút tiền, nhập ngoài luồng, thanh toán NCC → **trừ** số dư STK đã chọn |
| **Tổng shop** | Lợi nhuận khả dụng = **cộng số dư tất cả STK đang bật** |
| **Tra cứu** | Biết rõ từng khoản vào/ra thuộc STK nào |

---

## 3. Hiện trạng — vì sao đang “lệch tư duy”

Trong giai đoạn chuyển tiếp, code đang xử lý **vừa cột tổng cũ, vừa cột STK mới**. Điều này dễ khiến người dùng nghĩ có **hai luồng tiền riêng**. Thực tế không phải vậy — đây chỉ là **chưa chuyển xong**.

### Cột tổng cũ (dashboard theo tháng)

- Một con số *số dư bank ước tính* trên báo cáo tháng.
- Webhook Sepay **cộng** vào đây khi có biên lai mới.
- Rút tiền, nhập ngoài luồng, một phần thanh toán NCC **trừ** vào đây.
- Không gắn STK cụ thể.

### Cột STK mới (Quản lý STK)

- Mỗi STK có: **số dư hiện tại**, **tổng CK vào**, **đã rút**, **còn lại**.
- Có **sổ cái** (lịch sử từng dòng vào/ra) để tra cứu chi tiết.
- Webhook CK vào **đã** cộng STK (khi số nhận khớp STK đã khai báo).
- Rút tiền, nhập ngoài luồng **đã** trừ STK (khi user chọn STK).
- Thanh toán NCC **chưa** trừ STK — vẫn chỉ trừ cột tổng cũ.
- Thanh toán thủ công **chưa** cộng STK.

### Bảng so sánh — cùng một tiền, hai chỗ đang ghi (tạm thời)

| Tình huống | Cột tổng cũ | Cột STK | Trạng thái mong muốn |
|------------|-------------|---------|----------------------|
| CK vào MB qua webhook | Cộng | Cộng MB | Chỉ cộng MB (bỏ cột tổng) |
| Rút 5 triệu từ VP | Trừ | Trừ VP | Chỉ trừ VP (bỏ cột tổng) |
| Nhập hàng ngoài luồng | Trừ | Trừ STK đã chọn | Chỉ trừ STK (bỏ cột tổng) |
| Thanh toán NCC | Trừ | **Chưa trừ** | Trừ STK đã chọn (bỏ cột tổng) |
| Thanh toán thủ công | **Không cộng** | **Không cộng** | Cộng STK nhận tiền |

**Mục tiêu cuối:** mọi dòng trong bảng trên chỉ còn cột **STK**; cột tổng cũ **ngừng dùng** cho số dư thực.

---

## 4. Mô hình mục tiêu — thay thế, không song song

### 4.1. Quy tắc vàng

1. **Một nguồn số dư bank duy nhất:** các cột số dư trên từng STK (và sổ cái đi kèm để tra cứu).
2. **Lợi nhuận khả dụng** trên dashboard = **tổng số dư các STK đang bật** — không đọc lại cột tổng cũ.
3. **Một sự kiện tiền = một lần cập nhật STK** — không vừa cộng cột tổng vừa cộng STK (tránh lệch về lâu dài).
4. **Cột tổng cũ** có thể giữ trong database cho lịch sử / báo cáo tháng cũ, nhưng **không còn là nơi ghi số dư bank mới**.

### 4.2. STK không phải “sổ thứ hai”

| Hiểu **sai** | Hiểu **đúng** |
|--------------|---------------|
| STK là hệ thống kế toán riêng, độc lập với số dư dashboard | STK là **cùng khoản tiền bank**, chỉ **tách theo tài khoản** |
| Tổng STK và Lợi nhuận khả dụng có thể khác nhau | Hai số **luôn bằng nhau** khi chuyển xong |
| Phải làm lại toàn bộ webhook từ đầu | Webhook **giữ nguyên** phần nhận CK, khớp đơn, tạo biên lai — chỉ **đổi chỗ ghi số dư** |

### 4.3. Sơ đồ tư duy

```
  TRÆ¯á»šC (má»™t cá»™t):
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  │  Số dư bank chung (dashboard/tháng)  │  ← webhook +, rút −, NCC −
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  SAU (tách theo STK, tổng không đổi):
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  │     Lợi nhuận khả dụng (dashboard)    │
  │     = MB + VP + … (chỉ đọc tổng)      │
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
     â–¼            â–¼            â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”
  │ STK  │    │ STK  │    │ STK  │   ← mọi cộng/trừ bank ghi ở đây
  â”‚  MB  â”‚    â”‚  VP  â”‚    â”‚  â€¦   â”‚
  â””â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”˜
       â”‚           â”‚           â”‚
       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
            Sổ cái (lịch sử
            từng dòng vào/ra)
```

---

## 5. Các cột trên màn Quản lý STK — ý nghĩa

Mỗi STK shop có các chỉ số sau. Tất cả đều mô tả **cùng một tài khoản bank**, ở mức độ chi tiết khác nhau:

| Cột trên UI | Ý nghĩa nghiệp vụ |
|-------------|-------------------|
| **Tổng CK vào** | Tổng tiền khách đã chuyển vào STK này (tích lũy) |
| **Đã rút** | Tổng tiền đã rút về ví/cá nhân từ STK này |
| **Số dư / Còn lại** | Tiền bank còn lại trên STK này theo sổ hệ thống |
| **Sổ cái** | Từng dòng biến động: CK vào, rút, nhập ngoài, trả NCC… |

**Lợi nhuận khả dụng toàn shop** = cộng cột **Còn lại** (hoặc **Số dư**) của mọi STK đang bật.

---

## 6. Bốn nhóm giao dịch — ai cộng/trừ STK nào

### 6.1. Tiền VÀO bank (cộng số dư STK)

| Nguồn | STK được cộng | Ghi chú |
|--------|---------------|---------|
| **Webhook Sepay** | STK **nhận** trong giao dịch Sepay | Phải trùng STK đã khai báo trong Quản lý STK |
| **Thanh toán thủ công** | STK nhận (chọn khi xác nhận hoặc lấy từ cấu hình) | Cần bổ sung — hiện chưa cộng STK |
| **NCC hoàn tiền về shop** | STK **nhận** tiền hoàn | Coi như tiền vào; chọn STK nhận |

**Lưu ý:** CK vào số **chưa khai báo** → biên lai vẫn lưu, nhưng **không tự cộng** STK nào. Cần thêm STK vào danh sách hoặc điều chỉnh sổ sau đối soát sao kê.

### 6.2. Tiền RA bank (trừ số dư STK) — bắt buộc chọn STK

| Nghiệp vụ | Màn hình | Trạng thái |
|-----------|----------|------------|
| **Rút tiền** | Dashboard hoặc Quản lý STK | Đã có — chọn STK, trừ đúng STK |
| **Nhập hàng ngoài luồng** | Supply / log external import | Đã có — chọn STK chi trả |
| **Thanh toán NCC** | Xác nhận chu kỳ NCC | **Cần bổ sung** — chọn STK shop dùng chuyển tiền |

Sau má»—i giao dá»‹ch ra:

- Số dư **STK đó** giảm đúng số tiền.
- **Lợi nhuận khả dụng** (tổng) giảm cùng số tiền — **tự khớp**, không cần cập nhật thêm cột tổng cũ.

### 6.3. Loại dòng trên sổ cái (tra cứu “bank nào”)

| Loại | Vào / Ra | Ví dụ |
|------|----------|--------|
| CK khách vào | Vào (+) | Webhook đơn hàng |
| Rút về ví/cá nhân | Ra (−) | Rút 5.000.000 từ MB |
| Nhập hàng ngoài luồng | Ra (−) | Chi mua hàng renewal tay |
| Thanh toán NCC | Ra (−) | Chốt chu kỳ trả NCC |
| Điều chỉnh (hiếm) | ± | Admin sửa lệch đối soát ngân hàng |

Mỗi dòng lưu: thời gian, số tiền, STK, mã tham chiếu (biên lai, phiếu rút, chu kỳ NCC…), ghi chú.

---

## 7. Luồng chi tiết từng nghiệp vụ (sau khi chuyển xong)

### 7.1. Khách chuyển khoản (webhook Sepay)

**Không làm lại webhook từ đầu.** Phần nhận Sepay, khớp mã đơn, tạo biên lai, cập nhật doanh thu/lợi nhuận tháng — **giữ nguyên**.

Chỉ đổi bước ghi số dư bank:

1. Sepay báo số tiền + **STK nhận**.
2. Hệ thống tạo biên lai (như hiện tại).
3. **Cộng số dư STK** khớp số tài khoản nhận.
4. **Không** cộng thêm cột tổng cũ (khi đã chuyển xong giai đoạn 5).

### 7.2. Thanh toán thủ công

1. Admin xác nhận đơn đã nhận tiền.
2. Chọn **STK nhận** (hoặc lấy STK mặc định).
3. **Cộng số dư STK đó** — cùng lúc với biên lai, một lần duy nhất.

### 7.3. Rút tiền

1. User chọn **STK** + số tiền + lý do.
2. Một thao tác: ghi phiếu rút + **trừ số dư STK**.
3. Không còn rút “chung shop” không chỉ rõ STK.

### 7.4. Nhập hàng ngoài luồng

1. User chọn **STK chi trả** + số tiền.
2. **Trừ số dư STK** (báo cáo lợi nhuận tháng vẫn cập nhật riêng nếu cần — tách khỏi số dư bank).

### 7.5. Thanh toán NCC

1. Trước khi xác nhận chu kỳ: user **chọn STK shop** dùng chuyển tiền cho NCC.
2. Khi xác nhận: **trừ số dư STK** + lưu liên kết chu kỳ ↔ STK.
3. Trường hợp NCC trả lại (số âm): chọn STK nhận, **cộng số dư STK**.

---

## 8. Webhook và cột tổng cũ — câu hỏi thường gặp

**Hỏi: Chuyển sang STK có phải viết lại toàn bộ webhook không?**  
**Đáp:** **Không.** Webhook vẫn nhận Sepay, tạo biên lai, khớp đơn như cũ. Chỉ **đổi đích ghi số dư bank**: từ cột tổng cũ → sang cột số dư STK. Phần webhook **đã** có bước cộng STK khi CK vào; việc còn lại là **ngừng cộng cột tổng** và bổ sung STK cho các nhánh còn thiếu (NCC hoàn tiền, thanh toán thủ công…).

**Hỏi: Giai đoạn chuyển tiếp có cộng cả hai chỗ không?**  
**Đáp:** **Tạm thời có thể** (đang như vậy với webhook CK vào). Đây là bước trung gian, **không phải thiết kế cuối**. Thiết kế cuối: **chỉ STK**. Dashboard đọc tổng STK, không đọc cột tổng cũ cho số khả dụng hiện tại.

**Hỏi: Cột tổng cũ có xóa không?**  
**Đáp:** Có thể **giữ** cho lịch sử báo cáo tháng cũ hoặc so sánh xu hướng, nhưng **ngừng cập nhật** khi có giao dịch bank mới. Số dư “sống” nằm ở STK.

---

## 9. Nguyên tắc tránh lệch số

| Nguyên tắc | Giải thích |
|------------|------------|
| **Thay thế, không song song** | Một giao dịch bank chỉ cập nhật STK — không vừa STK vừa cột tổng cũ |
| **Một sự kiện — một lần ghi** | Cùng một biên lai Sepay không được cộng số dư hai lần |
| **Tổng = cộng STK** | Lợi nhuận khả dụng luôn tính bằng tổng số dư STK, không tính lại từ biên lai mỗi lần mở trang |
| **STK phải khớp Sepay** | Số tài khoản trong Quản lý STK phải trùng số nhận trên biên lai |
| **Giao dịch trong một gói** | Rút tiền = tạo phiếu + trừ STK — lỗi giữa chừng thì hoàn tác cả gói |
| **Điều chỉnh tay** | Chỉ khi đối soát sao kê bank thấy lệch; ghi rõ lý do trên sổ cái |

---

## 10. Chuyển dữ liệu cũ (một lần)

Khi bật mô hình STK trên môi trường đã chạy lâu:

1. **Khai báo đủ STK** shop đang dùng (MB, VP…).
2. **Backfill một lần:** phân bổ số dư lịch sử vào từng STK dựa trên biên lai Sepay (STK nhận) và các khoản rút/chi đã ghi — sao cho **tổng STK ≈ số dư cột tổng cũ** tại thời điểm chuyển.
3. Từ thời điểm go-live trở đi: mọi giao dịch mới **chỉ** ghi STK.
4. Lịch sử rút/NCC cũ có thể **không đủ chi tiết STK** — chấp nhận; từ ngày chuyển trở đi mới đầy đủ.

---

## 11. Lộ trình triển khai

### Giai đoạn 1 — Nền tảng (đã / đang có)

- Bảng STK + cột số dư, tổng CK vào, đã rút.
- Sổ cái STK + webhook CK vào (khi STK khớp).
- Rút tiền & nhập ngoài luồng: chọn STK, trừ STK.
- Dashboard **Lợi nhuận khả dụng** đọc **tổng số dư STK** (không đọc cột tổng cũ cho tháng hiện tại).

### Giai đoạn 2 — Thanh toán NCC

- Form chốt chu kỳ: thêm **chọn STK**.
- Xác nhận thanh toán: **trừ STK** thay vì chỉ trừ cột tổng cũ.
- Hiển thị STK trên lịch sử thanh toán NCC.

### Giai đoạn 3 — Thanh toán thủ công

- Xác nhận TT tay: chọn STK + **cộng số dư STK**.
- Rà soát mọi đường tạo biên lai không qua Sepay.

### Giai đoạn 4 — Báo cáo & đối soát

- Màn lịch sử sổ cái STK (lọc, xuất).
- Cảnh báo: số dư STK âm, CK vào STK chưa khai báo.
- (Tuỳ chọn) Snapshot cuối tháng tổng STK để so sánh xu hướng.

### Giai đoạn 5 — Ngừng dùng cột tổng cũ cho số dư bank

- Webhook, rút, nhập ngoài, NCC, hoàn tiền… **không còn** cộng/trừ cột tổng cũ.
- Một nguồn số dư bank duy nhất: **các cột trên STK**.
- Cột tổng cũ giữ lại chỉ phục vụ lịch sử / báo cáo DT-LN tháng nếu cần.

---

## 12. Câu hỏi thường gặp (nghiệp vụ)

**Hỏi: Lợi nhuận khả dụng và tổng “Còn lại” trên Quản lý STK có luôn bằng nhau?**  
**Đáp:** **Có** — đó là cùng một khoản tiền; dashboard là tổng, màn STK là tách theo tài khoản.

**Hỏi: Ba STK, rút từ VP 5 triệu thì MB có bị trừ không?**  
**Đáp:** **Không.** Chỉ VP giảm 5 triệu; tổng shop giảm 5 triệu.

**Hỏi: Trả NCC 10 triệu từ MB, tra cứu ở đâu?**  
**Đáp:** Sổ cái STK MB, dòng thanh toán NCC, gắn mã chu kỳ / NCC.

**Hỏi: CK vào STK chưa khai báo?**  
**Đáp:** Biên lai vẫn có; số dư STK không tăng — thêm STK hoặc điều chỉnh sổ sau đối soát.

**Hỏi: STK và cột tổng cũ khác nhau sau khi chuyển?**  
**Đáp:** Trong giai đoạn chuyển tiếp có thể lệch tạm (một số nhánh chưa chuyển sang STK). Sau giai đoạn 5 phải khớp: **tổng STK = số khả dụng**.

**Hỏi: Số dư STK có phải tính lại từ biên lai mỗi lần mở trang?**  
**Đáp:** **Không.** Số dư lưu trên STK và cập nhật khi có giao dịch; sổ cái để tra cứu chi tiết.

---

## 13. Tóm tắt

| Khía cạnh | Nội dung |
|-----------|----------|
| **Bản chất** | Số dư STK = cột tổng cũ **tách theo tài khoản**, không phải hệ thống tiền thứ hai |
| **Tổng shop** | Lợi nhuận khả dụng = cộng số dư các STK |
| **Ghi nhận** | Mọi vào/ra bank cộng/trừ **đúng STK** |
| **Webhook** | Giữ luồng hiện tại; chỉ đổi **chỗ ghi số dư**, không viết lại từ đầu |
| **Cột tổng cũ** | Ngừng dùng cho số dư mới; STK là nguồn sự thật |
| **Mục đích** | Biết rõ bank nào, quản lý dòng tiền rõ ràng, một luồng thống nhất |

---

*Phiên bản tài liệu: 2026-05 — phản ánh tư duy “thay thế cột tổng bằng phân rã STK”, không phải hai sổ song song.*


## --- [test-cases-cong-tien-vao-bank.md] ---

# Test case — kiểm tra cộng tiền vào bank (credit)

Mục tiêu: đảm bảo **không có chỗ nào cộng tiền hai lần** vào số dư bank shop sau khi đã chỉnh sang dùng STK làm sổ chính.

Quy ước:
- **STK** = số dư trên từng tài khoản (sổ mới — nguồn sự thật).
- **Sổ tổng cũ** = cột số dư bank ước tính trên báo cáo tháng dashboard (legacy).
- **Lợi nhuận khả dụng** (UI dashboard) = tổng số dư STK đang bật, **không** đọc sổ tổng cũ.

---

## 1. Bảng tổng kết các đường có thể cộng tiền vào bank

| # | Tình huống | Cộng STK | Cộng sổ tổng cũ | Có dedup | Trạng thái |
|---|------------|----------|------------------|----------|------------|
| 1 | Webhook Sepay nhận CK mới | **Có** | Không | Theo mã biên lai | An toàn |
| 2 | Hoàn thành đơn “webhook thủ công” | **Có** | Không | Theo mã biên lai | An toàn |
| 3 | NCC hoàn tiền cho shop (xác nhận chu kỳ với nội dung khớp biên lai Sepay) | **Có** (cùng biên lai với webhook) | Không | Theo mã biên lai | An toàn |
| 4 | Hủy hoàn tiền khách (đơn rời khỏi trạng thái hoàn) | Không | **Có** (legacy) | Không | **Lệch — cần khắc phục** |
| 5 | Đơn MAVN nội bộ rớt khỏi trạng thái Đã Thanh Toán (đồng bộ chi phí) | Không | **Có** (legacy) | Không | **Lệch — cần khắc phục** |

Kết luận sơ bộ: **không có double credit** trên STK. Sổ tổng cũ và STK không bao giờ cùng tăng cho một sự kiện. Nhưng **tình huống 4 và 5 không cộng STK** — đó là **gap (thiếu)**, không phải double.

---

## 2. Cơ chế chống double — vì sao an toàn

Mỗi lần ghi sổ STK đều có khóa chống trùng:

- Đường ghi “tiền vào” theo biên lai khóa theo **mã biên lai** (`source_kind = payment_receipt`, `source_id = receipt_id`).
- Nếu cùng biên lai gọi cộng STK lần thứ hai (webhook chạy lại, hoặc admin xác nhận NCC hoàn trùng) → bị **bỏ qua tự động**, không cộng đúp.
- Webhook chỉ gọi cộng STK khi biên lai **vừa được tạo mới** (cờ `inserted = true`); biên lai trùng lặp sẽ không kích hoạt cộng lại.

---

## 3. Test case chi tiết

### TC-01 — Webhook Sepay nhận CK đúng STK đã khai báo

**Mục đích:** Kiểm tra CK khách chuyển vào STK MB cộng đúng STK MB, **không** cộng sổ tổng cũ, **không** double.

**Chuẩn bị:**
- Trong Quản lý STK đã khai báo STK MB với số tài khoản trùng số nhận Sepay.
- Ghi nhận số dư STK MB hiện tại (gọi là **A**) và sổ tổng cũ tháng hiện tại (gọi là **B**).

**Bước:**
1. Gửi (hoặc giả lập) một webhook Sepay 1.000.000 đ vào STK MB, kèm mã đơn hợp lệ.
2. Đợi response 200.

**Kỳ vọng:**
- Số dư STK MB = **A + 1.000.000**.
- Tổng CK vào của STK MB tăng đúng 1.000.000.
- Sổ tổng cũ vẫn = **B** (không đổi).
- Sổ cái STK có **đúng một dòng** loại “tiền vào theo biên lai”, gắn mã biên lai mới.
- Dashboard Lợi nhuận khả dụng tăng 1.000.000.

**Dấu hiệu sai (cần báo lỗi):**
- Số dư STK MB tăng quá 1.000.000 → double trên STK.
- Sổ tổng cũ tăng → có nhánh code cũ chưa gỡ.
- Sổ cái STK có 2 dòng cho cùng biên lai → dedup hỏng.

---

### TC-02 — Webhook Sepay nhận CK vào STK **chưa khai báo**

**Mục đích:** Số tiền lạc, không cộng đâu cả → cần cảnh báo, không gây double sau này.

**Chuẩn bị:** Số tài khoản nhận **không** có trong Quản lý STK.

**Bước:** Giả lập webhook 500.000 đ.

**Kỳ vọng:**
- Biên lai vẫn được tạo (lịch sử nhận tiền có).
- **Không** STK nào tăng.
- Sổ tổng cũ **không** đổi.
- Dashboard Lợi nhuận khả dụng **không** đổi.

**Hậu test:** Vào Quản lý STK thêm STK đó → chạy lại webhook (Sepay sẽ retry) → kỳ vọng **bây giờ** mới cộng STK đúng số tiền (không bị double dù lần đầu đã thử).

---

### TC-03 — Webhook gửi LẠI cùng giao dịch (replay)

**Mục đích:** Đảm bảo webhook nhận **trùng** không tạo biên lai mới và không cộng STK hai lần.

**Bước:**
1. Gọi webhook lần 1 với một giao dịch (giống TC-01).
2. Gọi webhook lần 2 với **cùng** payload (cùng id Sepay).

**Kỳ vọng:**
- Lần 2 trả về duplicate hoặc skipped.
- Số dư STK chỉ tăng **một lần** (tổng = A + 1.000.000).
- Sổ cái STK chỉ có **một** dòng cho biên lai.

---

### TC-04 — Hoàn thành đơn bằng webhook thủ công (admin xác nhận tay)

**Mục đích:** Nhánh “tạo biên lai tay khi đơn không có webhook tự động” phải cộng STK đúng, không double, không đụng sổ tổng cũ.

**Chuẩn bị:**
- Có một đơn đang ở trạng thái xử lý (chưa thanh toán), giá bán 800.000 đ.
- Trong Quản lý STK có ít nhất một STK đang bật (sẽ làm STK mặc định).

**Bước:**
1. Vào màn đơn → nút “Hoàn thành thủ công” → chọn STK nhận (hoặc dùng STK mặc định).
2. Xác nhận.

**Kỳ vọng:**
- Số dư STK đã chọn tăng đúng 800.000.
- Sổ tổng cũ không đổi.
- Biên lai mới được tạo, có ghi STK nhận.
- Sổ cái STK có **một** dòng loại “tiền vào theo biên lai”.
- Đơn chuyển sang Đã Thanh Toán; doanh thu / lợi nhuận tháng tăng đúng (đường khác, không đụng số dư bank thêm lần nữa).

**Dấu hiệu sai:**
- STK tăng hai lần (1.600.000) → có nhánh cộng đúp.
- Số dư STK tăng đúng nhưng sổ tổng cũ cũng tăng → còn code cũ chưa gỡ.

---

### TC-05 — NCC hoàn tiền cho shop (chốt chu kỳ NCC với nội dung khớp biên lai Sepay)

**Mục đích:** Khi NCC chuyển trả tiền, webhook **đã** tạo biên lai và cộng STK. Khi admin chốt chu kỳ NCC với nội dung khớp biên lai đó → **không** cộng STK lần hai.

**Chuẩn bị:**
- Webhook Sepay đã nhận một CK từ NCC, ví dụ 2.000.000 đ vào STK MB; biên lai đã có và STK MB đã được cộng (giống TC-01).
- Có một NCC đang “nợ shop” đúng số tiền 2.000.000 đ (log NCC tổng số âm).

**Bước:**
1. Vào chi tiết NCC → “Xác nhận thanh toán chu kỳ”.
2. Nhập nội dung thanh toán khớp ghi chú/biên lai (ví dụ mã chuyển khoản).
3. Chọn STK shop (hoặc dùng mặc định).
4. Xác nhận.

**Kỳ vọng:**
- Hệ thống tìm thấy biên lai khớp → **không** cộng STK lần hai (đã có dòng sổ cho biên lai đó).
- Số dư STK MB **giữ nguyên** so với sau bước webhook (đã đúng).
- Log chu kỳ NCC được tạo (số tiền âm = NCC trả shop), đánh dấu các log NCC chưa thanh toán thành đã thanh toán.

**Dấu hiệu sai:**
- STK MB tăng thêm 2.000.000 lần thứ hai → **double credit** (dedup hỏng).

---

### TC-06 — Hai webhook khác nhau, hai STK khác nhau

**Mục đích:** Đảm bảo không cộng nhầm STK; mỗi STK chỉ tăng phần tiền của mình.

**Chuẩn bị:** Có STK MB và STK VP, cả hai đã khai báo.

**Bước:**
1. Webhook 1: 500.000 đ vào STK MB.
2. Webhook 2: 700.000 đ vào STK VP.

**Kỳ vọng:**
- STK MB tăng đúng 500.000, STK VP tăng đúng 700.000.
- Tổng khả dụng tăng đúng 1.200.000.
- Mỗi STK có một dòng sổ cái riêng.

**Dấu hiệu sai:**
- MB tăng 1.200.000 / VP tăng 0 → cộng nhầm.
- MB tăng 1.200.000 / VP tăng 1.200.000 → double + cộng nhầm (rất tệ).

---

### TC-07 — Biên lai có nhiều mã đơn (batch)

**Mục đích:** Một biên lai trả nhiều đơn (mã batch) chỉ cộng STK **một lần**.

**Bước:** Webhook nhận một biên lai 1.500.000 đ kèm mã batch trỏ đến 3 đơn 500.000 mỗi đơn.

**Kỳ vọng:**
- STK tăng đúng 1.500.000 (một lần).
- Sổ cái STK có **một** dòng tham chiếu một biên lai.
- 3 đơn đều cập nhật doanh thu/trạng thái nhưng **không** cộng số dư bank thêm lần nào.

**Dấu hiệu sai:**
- STK tăng 4.500.000 (cộng theo từng đơn) → double nặng.

---

### TC-08 — Sau khi đã PAID, biên lai bổ sung (off-flow)

**Mục đích:** Khi đơn đã PAID mà vẫn có CK bổ sung, hệ thống ghi nhận “ngoài luồng” cho báo cáo, **không** double số dư bank.

**Chuẩn bị:** Một đơn đã ở trạng thái Đã Thanh Toán.

**Bước:** Webhook nhận thêm một biên lai gắn cùng mã đơn đó (ví dụ khách trả dư).

**Kỳ vọng:**
- Biên lai mới được tạo.
- STK tăng đúng số tiền dư (cộng theo biên lai mới).
- Cột thống kê “off-flow bank receipt” tăng (báo cáo riêng).
- Sổ tổng cũ **không** tăng.

**Dấu hiệu sai:**
- STK tăng + sổ tổng cũ tăng → cộng đúp.
- STK không tăng (chỉ ghi báo cáo) → thiếu, không phải double, nhưng cần xem lại nghiệp vụ.

---

## 4. Hai chỗ vẫn dùng sổ tổng cũ (gap đã biết — không phải double, là thiếu)

Sau khi rà soát, **không** có double credit, nhưng **còn hai chỗ chưa chuyển sang STK** (cộng sổ tổng cũ nhưng STK đứng yên):

### TC-09 — Hủy hoàn tiền khách (đơn rời khỏi trạng thái hoàn)

**Tình huống:** Một đơn từng vào trạng thái hoàn tiền (tiền đã trừ bank trước đó), nay được “gỡ hoàn” → tiền “trở về” bank.

**Hiện trạng:** Cộng vào **sổ tổng cũ**; **không** cộng STK.

**Kỳ vọng (sau khi gom luồng):** Cộng đúng STK đã trừ trước đó.

**Cách quan sát:** Vào đơn đó, đảo trạng thái khỏi hoàn → so sánh số dư STK và sổ tổng cũ trước/sau:
- STK: không đổi (sai theo mô hình mới).
- Sá»• tá»•ng cÅ©: tÄƒng (legacy).

---

### TC-10 — Đơn MAVN nội bộ rớt khỏi trạng thái Đã Thanh Toán

**Tình huống:** Một đơn MAVN NCC nội bộ đã PAID nay đổi sang trạng thái khác → đồng bộ chi phí Form đảo lại, lợi nhuận và bank được “trả lại”.

**Hiện trạng:** Cộng vào **sổ tổng cũ**; **không** cộng STK.

**Kỳ vọng (sau khi gom luồng):** Cộng STK đã trừ ban đầu (cần lưu STK đã trừ trên log chi phí MAVN).

---

## 5. Quy trình kiểm tra (chung cho mọi test case)

Trước mỗi test:

1. Ghi nhận **số dư từng STK** đang bật.
2. Ghi nhận **sổ tổng cũ** của tháng hiện tại.
3. Ghi nhận **Lợi nhuận khả dụng** hiển thị trên dashboard.
4. Đếm số dòng sổ cái STK liên quan (nếu cần đối chiếu chi tiết).

Sau má»—i test, kiá»ƒm:

- Tổng STK = giá trị ban đầu **± đúng số tiền của test** (không lệch một đồng).
- Lợi nhuận khả dụng = tổng STK mới (luôn khớp).
- Sổ tổng cũ: chỉ thay đổi nếu test đó thuộc TC-09 / TC-10 (gap đã biết).
- Sổ cái STK: **không** có dòng nào trùng `(loại = tiền vào, mã biên lai)`.
- Cờ trên biên lai (đã ghi tài chính / đã cộng STK) đúng trạng thái.

Câu truy vấn nhanh để soi double trên sổ cái STK (chạy trên SQL editor):

```sql
SELECT source_kind, source_id, COUNT(*) AS so_dong
FROM admin.shop_bank_account_ledger
WHERE source_kind = 'payment_receipt'
GROUP BY source_kind, source_id
HAVING COUNT(*) > 1;
```

- Trả về **rỗng** → an toàn, không có biên lai nào bị cộng STK hai lần.
- Trả về có dòng → đó là biên lai bị double, cần kiểm tra ngay.

---

## 6. Kết luận sau rà soát

| Khía cạnh | Kết quả |
|-----------|---------|
| Webhook CK vào | Chỉ cộng STK, không cộng sổ tổng cũ — **an toàn** |
| Webhook thủ công | Chỉ cộng STK — **an toàn** |
| NCC hoàn tiền cho shop | Cộng STK dùng chung biên lai với webhook — dedup theo mã biên lai — **an toàn** |
| Replay / batch / off-flow | Có dedup theo biên lai — **an toàn** |
| Hủy hoàn tiền khách | Còn dùng sổ tổng cũ — **gap (thiếu)**, không phải double |
| Đơn MAVN rớt trạng thái | Còn dùng sổ tổng cũ — **gap (thiếu)**, không phải double |

**Không tìm thấy điểm nào đang cộng đúp tiền vào bank.** Phần cộng tiền (credit) đã chuyển sạch sang STK với dedup theo mã biên lai. Các nhánh còn lại (TC-09, TC-10) là **gap chưa chuyển** chứ không phải double, có thể xử lý ở giai đoạn 2–3 của lộ trình.

---

*Hết.*


## --- [API_CONTRACTS.md] ---

# API Contracts - `admin_orderlist`

Mục đích: ghi lại route, request, response và hành vi quan trọng trước khi refactor để tránh sửa lỗi bằng cách vá lệch contract ở tầng khác.

> Trạng thái: khung ban đầu. Điền theo từng domain trước khi chạm code domain đó.

## Quy Tắc Ghi Contract

- Ghi contract hiện tại trước khi sửa implementation.
- Không đổi API path, method, query param, payload hoặc response shape nếu chưa có migration task riêng.
- Nếu backend sai, sửa backend source-of-truth; không vá bằng mapper frontend trừ khi là compatibility wrapper tạm thời.
- Nếu frontend đang phụ thuộc response sai/không nhất quán, ghi rõ wrapper cần giữ và điều kiện xóa.

## Orders

> Phase A sync 2026-06-30: mounted by `backend/src/routes/index.js` at `/api/orders` and `/api/v1/orders` through `backend/src/domains/orders/routes.js` -> `controller/index.js`.

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
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

### Source-Of-Truth Cần Chốt

- Order DTO -> view model: currently `frontend/src/features/orders/utils/orderListTransform.ts` plus Create/Edit/Bill Order local mappers; E1 remains open.
- Create order validation: source-of-truth is `backend/src/domains/orders/controller/crud/create-order/createOrderValidation.js`; route `createOrder.js` keeps API response/transaction orchestration.
- Payment amount/key allocation for create order: source-of-truth is `backend/src/domains/orders/controller/crud/create-order/createOrderPaymentAllocation.js`; it owns refund credit amount reduction, USDT/bank method selection, and payment slot expected amount allocation.
- Manual completion/refund idempotency: route handlers are thin; use-cases are current source-of-truth and must be preserved.

## Invoices/Receipts

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | Receipt list/filter/QR/payment actions. |

## Products/Pricing

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/services/pricing/core.js` | TBD | TBD | Cần xác định pricing source-of-truth. |
| TBD | TBD | `backend/src/domains/products` | TBD | TBD | Product/variant/image/description. |

## Supplies/Expenses

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/supplies/controller/handlers/list.js` | TBD | TBD | Filter/query builder. |
| TBD | TBD | `backend/src/domains/supplies/controller/handlers/insights.js` | TBD | TBD | Insight calculation. |

## Wallet/Bank/Finance

> Phase A sync 2026-06-30: `wallet` is mounted under `/api` root by `backend/src/routes/index.js`; `shop-bank-accounts` and `usdt-wallets` are mounted by domain prefix.

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
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

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/orders/controller/finance/dashboardSummary.js` | TBD | TBD | Summary số liệu phải có baseline. |

## Renew Adobe/Fix ADES

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/checkAccounts.js` | TBD | TBD | Check accounts flow. |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/batchUsers.js` | TBD | TBD | Batch transaction/retry. |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/publicFixAdes.js` | TBD | TBD | Public fix flow. |
| TBD | TBD | `backend/src/domains/fix-ades/routes.js` | TBD | TBD | Fix ADES boundary. |


### Manual Completion / Refund Boundary

| Flow | Route/Function | Transaction boundary | Idempotency key | Ghi chú |
| --- | --- | --- | --- | --- |
| Manual bank completion | `POST /api/orders/:id/complete-manual-webhook` -> `completeProcessingOrderWithManualWebhook` | `BEGIN` + `SELECT order FOR UPDATE` + status conditional update + `COMMIT/ROLLBACK` | payment receipt insert result + order status `PROCESSING` guard | Route handler đã tách mỏng tại `manualWebhookCompletionRoute.js`. |
| Manual USDT completion | `POST /api/orders/:id/complete-manual-usdt` -> `completeProcessingOrderWithManualUsdt` | `BEGIN` + `SELECT order FOR UPDATE` + status conditional update + `COMMIT/ROLLBACK` | order status `PROCESSING` guard + USDT ledger service source guard | Route handler đã tách mỏng tại `manualUsdtCompletionRoute.js`. |
| Refund credit cashout | `POST /api/orders/refund-credits/:id/actions` action `complete` | `db.transaction()` + `SELECT refund_credit_note FOR UPDATE` + ledger debit + note status update | `SOURCE_KINDS.REFUND_CREDIT_NOTE` + `creditId` | Có focused test đảm bảo duplicate ledger source bị skip. |


## --- [import-package-warehouse-flow.md] ---

# Thiết kế luồng liên kết Nhập hàng ↔ Gói sản phẩm

## Mục tiêu
- Khi admin nhập hàng và chọn `Sản phẩm`, hệ thống tự nhận biết sản phẩm đó có cấu hình tạo gói hay không.
- Nếu sản phẩm thuộc một `Gói sản phẩm` đã được tạo/cấu hình, form nhập hàng tự mở thêm các input cần thiết như `Tài khoản`, `Mật khẩu`, `Mail dự phòng`, `2FA`, `Ghi chú`, `Hạn sử dụng`.
- Khi lưu, hệ thống tạo bản ghi trong `Lô hàng/Kho hàng` trước, sau đó tạo `Gói sản phẩm` liên kết tới lô vừa tạo.
- Tránh nhập trùng dữ liệu ở 2 nơi: admin chỉ nhập một lần ở màn nhập hàng.

## Customer:
Tại sao phần hạn sử dụng, tài khoản không dùng luôn ở form tạo đơn hàng. Chỉ cần tạo 1 khối để người dùng có thể nhập thêm các phần còn thiếu thôi là được mà. Check lại form tạo đơn đang có sẵn những gì rồi thì chỉ cần tạo thêm 1 khối bổ sung thôi.

## Hiện trạng trong source

### Kho hàng / Lô hàng
- Backend domain: `backend/src/domains/warehouse`.
- API hiện có:
  - `GET /api/warehouse`
  - `POST /api/warehouse`
  - `PUT /api/warehouse/:id`
  - `DELETE /api/warehouse/:id`
- Bảng backend đang dùng: `PRODUCT_STOCK`.
- Các field chính đang có:
  - `category` → loại/sản phẩm trong kho.
  - `account` → tài khoản/email/username.
  - `password` → mật khẩu.
  - `backup_email` → mail dự phòng.
  - `two_fa` → mã 2FA.
  - `note` → ghi chú.
  - `status` → trạng thái, ví dụ `Tồn`, `Đang Sử Dụng`.
  - `expires_at` → hạn sử dụng.
  - `is_verified` → đã xác minh.

### Gói sản phẩm
- Backend domain: `backend/src/domains/package-products`.
- API hiện có:
  - `GET /api/package-products`
  - `POST /api/package-products`
  - `PUT /api/package-products/:id`
  - `DELETE /api/package-products/:id`
- Bảng backend đang dùng: `PACKAGE_PRODUCT`.
- Gói đã có khả năng liên kết kho qua:
  - `stockId` / `stock_id`.
  - `storageId` / `storage_id`.
- Frontend package form hiện đã có cơ chế `manualStock` / `manualStorage` để tạo kho trước, rồi tạo gói sau trong `frontend/src/features/package-product/hooks/usePackageMutationActions.ts`.

## Luồng đề xuất

### 1. Cấu hình sản phẩm nào cần tạo gói
Mỗi sản phẩm/gói cần có cấu hình để biết khi nhập hàng thì cần hiện input nào.

Đề xuất dùng cấu hình theo `productId` hoặc `packageId`:

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

Ví dụ:

```json
{
  "productId": 12,
  "enabled": true,
  "fields": ["account", "password", "backup_email", "two_fa", "expires_at", "note"],
  "defaultSlotLimit": 1,
  "requiresActivation": true
}
```

### 2. Khi chọn sản phẩm ở form nhập hàng
Flow frontend:

1. Admin mở form nhập hàng.
2. Admin chọn `Sản phẩm`.
3. Frontend gọi/tra cache cấu hình `ProductImportPackageRule` theo `productId`.
4. Nếu `enabled = true`, form tự render thêm block `Thông tin tạo gói`.
5. Block này chỉ hiển thị đúng các field trong `fields`.
6. Nếu `enabled = false`, form nhập hàng giữ nguyên như hiện tại.

UI đề xuất:

```txt
[Chọn sản phẩm]
[Nhà cung cấp]
[Giá nhập]
[Số lượng]

Nếu sản phẩm có gói:
  ┌ Thông tin tạo gói ───────────────┐
  │ Tài khoản / Email                │
  │ Mật khẩu                         │
  │ Mail dự phòng                    │
  â”‚ 2FA                              â”‚
  │ Hạn sử dụng                      │
  │ Ghi chú                          │
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 3. Khi bấm lưu nhập hàng
Nên xử lý bằng một API orchestration để tránh frontend gọi rời rạc rồi lỗi giữa chừng.

Đề xuất API mới:

```http
POST /api/import-packages
```

Payload mẫu:

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
    "note": "Lô nhập ngày 21/06"
  },
  "package": {
    "slotLimit": 1,
    "matchMode": "information",
    "storageTotal": null
  }
}
```

Backend xử lý trong transaction:

1. Validate sản phẩm tồn tại.
2. Load rule tạo gói của sản phẩm.
3. Validate các field bắt buộc theo rule.
4. Insert `PRODUCT_STOCK`.
5. Insert `PACKAGE_PRODUCT` vá»›i `stock_id = product_stock.id`.
6. Nếu cần `storage_id`, insert thêm `PRODUCT_STOCK` cho storage hoặc dùng cùng stock tùy rule.
7. Commit transaction.
8. Trả về `{ warehouseItem, packageProduct }`.

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

## Data mapping đề xuất

| Form nhập hàng | `PRODUCT_STOCK` | `PACKAGE_PRODUCT` |
| --- | --- | --- |
| Sản phẩm | `category` | `package_id` |
| Tài khoản | `account_username` | qua `stock_id` |
| Mật khẩu | `password_encrypted` | qua `stock_id` |
| Mail dự phòng | `backup_email` | qua `stock_id` |
| 2FA | `two_fa_encrypted` | qua `stock_id` |
| Ghi chú | `note` | có thể map thêm `note` nếu cần |
| Giá nhập | không bắt buộc | `package_import` |
| Số slot | không bắt buộc | `slot` / capacity hiện có |
| Hạn sử dụng | `expires_at` | hiển thị gián tiếp qua stock |

## Trạng thái sau khi lưu
- `PRODUCT_STOCK.status` ban đầu có thể là `Tồn`.
- Vì `PACKAGE_PRODUCT.stock_id` trỏ tới stock này, API list kho hiện tại sẽ tự hiển thị `Đang Sử Dụng` bằng query `EXISTS`.
- Không cần tự set cứng `status = Đang Sử Dụng` nếu muốn giữ logic hiện tại.

## Thay đổi frontend đề xuất

### Feature nhập hàng
Tạo/điều chỉnh trong feature nhập hàng hiện tại:

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

Nếu màn nhập hàng đang thuộc `warehouse`, có thể đặt trong:

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
  account: { label: "Tài khoản", placeholder: "Email / Username" },
  password: { label: "Mật khẩu", type: "password" },
  backup_email: { label: "Mail dự phòng" },
  two_fa: { label: "2FA" },
  expires_at: { label: "Hạn sử dụng", type: "date" },
  note: { label: "Ghi chú" },
};
```

## Thay đổi backend đề xuất

Tạo domain orchestration riêng để không nhét logic vào controller warehouse hoặc package-products:

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

Lý do:
- `warehouse` chỉ quản lý tồn kho/lô hàng.
- `package-products` chỉ quản lý gói.
- Luồng mới là nghiệp vụ phối hợp giữa 2 domain, nên nên để domain/use-case riêng.

## Cấu hình rule nên lưu ở đâu?

### Phương án A: tận dụng field hiện có trên product
Nếu chỉ cần biết sản phẩm có cần activation hay không, có thể dùng `product.package_requires_activation` hiện tại.

Æ¯u Ä‘iá»ƒm:
- Ít migration.
- Nhanh triá»ƒn khai.

Nhược điểm:
- Không đủ linh hoạt nếu mỗi sản phẩm cần bộ input khác nhau.

### Phương án B: tạo bảng rule riêng
Đề xuất nếu muốn lâu dài:

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
- Mỗi sản phẩm có thể yêu cầu field khác nhau.
- Dễ thêm field sau này như `recovery_code`, `cookie`, `profile_name`.

Nhược điểm:
- Cần thêm migration + màn cấu hình rule.

## Case cần thống nhất trước khi code

1. **Một lần nhập có tạo nhiều gói không?**
   - Nếu `quantity > 1`, có nên render nhiều dòng tài khoản để tạo nhiều stock/package cùng lúc?
   - Đề xuất: giai đoạn 1 chỉ hỗ trợ `quantity = 1` cho sản phẩm dạng account; nếu cần nhiều thì dùng textarea/import CSV ở giai đoạn 2.

2. **Stock và storage dùng chung hay tách riêng?**
   - Hiện package có `stockId` và `storageId`.
   - Đề xuất: với account thường, chỉ tạo `stockId`. Chỉ tạo `storageId` khi rule yêu cầu activation/storage riêng.

3. **Gói được tạo theo product nào?**
   - Đề xuất: `PACKAGE_PRODUCT.package_id = productId` của sản phẩm đang nhập.

4. **Giá nhập lấy từ đâu?**
   - Đề xuất: dùng giá nhập trên form nhập hàng để ghi `package_import`.

5. **Trạng thái kho sau khi tạo gói**
   - Đề xuất: insert stock với `status = Tồn`; list warehouse tự suy ra `Đang Sử Dụng` khi stock đã được package dùng.

## Luồng MVP đề xuất

```txt
Admin chọn sản phẩm
  â†“
Frontend load rule theo sản phẩm
  â†“
Nếu sản phẩm có rule enabled
  â†“
Hiện block input tài khoản / mk / mail dự phòng / 2FA / hạn / note
  â†“
Admin bấm Lưu
  â†“
POST /api/import-packages
  â†“
Backend transaction:
  1. Insert PRODUCT_STOCK
  2. Insert PACKAGE_PRODUCT stock_id = stock.id
  3. Commit
  â†“
Frontend refresh Lô hàng + Gói sản phẩm
```

## Kết luận đề xuất
- Nên làm bằng API mới `POST /api/import-packages` để đảm bảo atomic transaction.
- Frontend nhập hàng chỉ render dynamic fields dựa trên rule của sản phẩm.
- Backend tạo `PRODUCT_STOCK` và `PACKAGE_PRODUCT` trong cùng transaction.
- Giai đoạn đầu dùng field chuẩn: `account`, `password`, `backup_email`, `two_fa`, `expires_at`, `note`.
- Nếu bạn đồng ý flow này, bước tiếp theo là triển khai migration rule + API + UI dynamic fields.




## Customer
- Lô Hàng thì sản phẩm nào cũng như nhau. Cũng cùng 1 bảng lô hàng thôi. Chẳng qua là trường nào điền và trường nào không cần điền thôi. Hầu như các trường trong Lô hàng đang không bắt buộc điền
- Khi đơn nhập hàng hết hạn, có một số đơn thì cần xóa nó khỏi gói sản phẩm và xóa khỏi lô hàng. Nhưng hầu như là cần xóa toàn bộ ở Gói Sản Phẩm, còn về phần lô hàng thì có cái cần xóa có cái không nên cần có 1 tick check sau khi hết hạn có xóa khỏi Lô Hàng hay không.
- Nếu gia hạn đơn nhập hàng thì hạn ở gói sản phẩm cũng phải được gia hạn.
- Sẽ có 1 số gói sản phẩm không cần nhập hàng vì có sẵn hoặc là nhập ngoài luồng nên không note vào nhập hàng. mà tự tạo thẳng gói luôn. Nên chỗ này cũng phải pass.


## --- [renew-adobe-service.md] ---

# Tách dịch vụ Renew Adobe

Mục tiêu: **Orderlist** chỉ ủy quyển (HTTP) tới dịch vụ Renew Adobe; sau này process này có thể chạy trên **server/region riêng** mà không cần gộp cùng API chính.

## Trạng thái hiện tại (bước 1)

- Router và logic Renew Adobe vẫn nằm trong `backend/src` (dùng lại, tránh gấp 50 file sang repo mới).
- Process tách: `services/renew-adobe-api/server.js` — `require` cùng `renewAdobeRoutes` + bảo vệ bằng `RENEW_ADOBE_INTERNAL_KEY`.
- Khi bật proxy, `backend` **không** còn mount controller Renew Adobe trong cùng process: toàn bộ `/api/renew-adobe/*` (sau khi đăng nhập) chuyển tới `RENEW_ADOBE_API_BASE_URL`.

## Tạo / xoay khóa nội bộ nhanh (repo)

- Lần đầu: `node backend/scripts/append-renew-adobe-env.js` (chỉ ghi nếu chưa có `RENEW_ADOBE_INTERNAL_KEY`).
- Xoay khóa: `node backend/scripts/append-renew-adobe-env.js --rotate`
- File mẫu (commit được): `backend/.env.renew-adobe.example`

`loadEnv` (xem `backend/src/config/loadEnv.js`): nạp `backend/.env` (tùy chọn), rồi **production/docker** → `backend/.env.docker`, **local** → `backend/.env.local`. File mẫu: `env.docker.example`, `env.local.example`.

**Docker Compose:** `docker-compose.yml` dùng `backend/.env.docker` cho `backend`, `webhook`, `scheduler`. Cùng block biến Renew Adobe đã được thêm vào file đó; khi chưa có container `renew-adobe-api`, giữ `RENEW_ADOBE_API_BASE_URL` comment — API vẫn chạy Renew Adobe in-process trong container backend.

## Biến môi trường (Orderlist / API chính)

| Biến | Mô tả |
|------|--------|
| `RENEW_ADOBE_API_BASE_URL` | Ví dụ `http://127.0.0.1:4002`. Có giá trị → bật proxy. Để trống → chạy Renew Adobe in-process như cũ. |
| `RENEW_ADOBE_INTERNAL_KEY` | Khóa dùng chung giữa Orderlist (proxy) và dịch vụ `renew-adobe-api` (bắt buộc khi tách process). Nên dài, ngẫu nhiên. |

## Biến môi trường (process `renew-adobe-api`)

| Biến | Mô tả |
|------|--------|
| `RENEW_ADOBE_INTERNAL_KEY` | Trùng với bên Orderlist. |
| `RENEW_ADOBE_API_PORT` | Mặc định `4002` (tránh trùng Vite storefront thường dùng `4001` trên local). |
| (chung) `DATABASE_URL` / biến DB như `backend` | Cùng file `.env` thường dùng: `server.js` nạp `backend/.env`. |

Dịch vụ tách vẫn dùng chung cơ sở dữ liệu (schema `renew_adobe`, `system_automation`, …) như bản in-process. Khi tách hạ tầng về sau, có thể tách DB hoặc dùng API-only boundary.

## Chạy local

Terminal 1 — Orderlist (không bật proxy, dev đơn giản):

- Không set `RENEW_ADOBE_API_BASE_URL` → mọi thứ như trước.

Terminal 1 + 2 — tách process:

1. Tạo key (một lần), ví dụ PowerShell: `[guid]::NewGuid()`.
2. `backend/.env` (và cùng nội dung cho cả proxy):

   ```env
   RENEW_ADOBE_INTERNAL_KEY=<cùng một chuỗi>
   RENEW_ADOBE_API_BASE_URL=http://127.0.0.1:4002
   ```

3. `npm run dev:renew-adobe` từ thư mục gốc `admin_orderlist` (xem `package.json` script).
4. `npm run dev:backend` như bình thường. Frontend gọi vẫn ` /api/renew-adobe/...` trên cùng origin Orderlist; proxy chuyển tới `4001`.

## Chưa chuyển qua HTTP (cố ý)

- **Cron / scheduler** (`runCheckForAccountId`, v.v.): vẫn gọi trực tiếp controller trong process nơi chúng chạy (thường `scheduler.js` / API). Nếu muốn mọi thứ chỉ qua service tách, bước sau là thay bằng `fetch` nội bộ + key hoặc chạy job bên `renew-adobe-api`.
- **`/api/renew-adobe/public`**: vẫn nằm trên app Orderlist; có thể tách tương tự nếu cần.

## Bước tiếp theo (khi tách hẳn)

- Tách `services/renew-adobe` thành package/npm workspace có `package.json` riêng, ít phụ thuộc.
- Bỏ `require(../../backend/...)` trong `server.js` — cài thư viện đủ tại dịch vụ con.
- Bảo mật mạng: chỉ cho phép Orderlist nói tới `renew-adobe-api` (VPC, firewall, mTLS tùy môi trường).


## --- [STRUCTURE-SINGLE-DIRECTION.md] ---

# Kiến trúc một hướng — admin_orderlist

Tài liệu này **chốt hướng cấu trúc tổng thể** của repo. Mọi tính năng mới và refactor cấu trúc cần **tuân theo**, tránh song song hai phong cách (`controllers/` rời vs `domains/`) vô thời hạn.

**Checklist thực hiện từng bước:** xem file `task.md` ở thư mục gốc repo `admin_orderlist/`.

---

## 1. Quyết định (ADR ngắn)

| Câu hỏi | Quyết định |
|--------|------------|
| Backend tổ chức theo đâu? | **Theo domain (bounded context)** dưới `backend/src/domains/<domain>/`, không thêm “khối” nghiệp vụ mới dưới dạng `controllers/XxxController` + `routes/xxxRoutes` tách rời. |
| Frontend tổ chức theo đâu? | **Theo feature** dưới `frontend/src/features/<feature>/`. Logic dùng chung thật sự mới đưa vào `frontend/src/shared/`. |
| Migrate từ code cũ? | **Tăng dần (incremental)**: mỗi PR ưu tiên **một domain** (hoặc cụm rất nhỏ cùng ranh giới), **giữ nguyên path API và JSON** trừ khi có task breaking-change riêng. |
| Process nặng (scheduler, renew)? | Vẫn có thể **tách process** (scheduler, webhook, renew API); code nghiệp vụ nằm trong **domain tương ứng**, mount chỉ là “lối vào” mỏng trong `routes/index.js`. |

---

## 2. Cấu trúc đích — Backend

```
backend/src/domains/<domain>/
  routes.js           # mount path, middleware mỏng; export express.Router
  controller/         # điều phối HTTP → use-cases (không nhồi SQL dài)
  use-cases/          # luồng nghiệp vụ
  repositories/       # truy vấn DB / Knex (hoặc query modules tập trung)
  validators/         # (tuỳ domain) express-validator rules
  mappers/            # (khi cần) map DB ↔ DTO
  adapters/           # (khi cần) HTTP/SDK bên thứ ba
```

**Nguyên tắc:**

- `routes.js` **mỏng**: không chứa business logic.
- **Validators** thuộc domain khi rule chỉ phục vụ domain đó; dần giảm `validators/` global trùng tên.

**Đã có sẵn mẫu:** `domains/ip-whitelist/`, `domains/site-maintenance/` — mount trực tiếp từ `routes/index.js`.

**Cấu hình chung** (dbSchema, logger, middleware toàn cục, `app.js`) **không** gộp vào từng domain — giữ ở `config/`, `middleware/`, `utils/`.

---

## 3. Cấu trúc đích — Frontend

```
frontend/src/features/<feature>/
  pages/
  components/
  hooks/
  api/
  types.ts | types/
  utils/
```

**Nguyên tắc:**

- Gọi HTTP qua **`shared/api/client`** (`apiFetch`, …), không phình thêm `lib/api.ts` thành nơi gom mọi feature API.
- Tránh **catch-all** kiểu `lib/helpers.ts` phình lớn — tách về feature hoặc `shared/utils` khi ≥ 2 feature dùng.

**Component layout** (`MainLayout`, modal dùng chung nhiều feature) có thể ở `components/` gốc; **state/luồng nghiệp vụ** nên thuộc feature owner hoặc hook rõ ràng.

---

## 4. File mount API trung tâm

`backend/src/routes/index.js` sau cùng chỉ nên:

- Đăng ký middleware toàn cục (auth public paths, `authGuard`, timeout dài cho vài mount).
- `router.use('<prefix>', require('../domains/<x>/routes'))` (hoặc tương đương).

Các domain đã migrate (banks, categories, …) được **require trực tiếp** trong `routes/index.js`; không còn file `routes/*Routes.js` chỉ re-export một dòng cho các domain đó.

---

## 5. Mapping gợi ý (legacy → domain)

Bảng chi tiết và thứ tự ưu tiên nằm trong **`task.md`**. Tên folder domain có thể tinh chỉnh (ví dụ gộp `product-*` dưới `catalog`) **một lần** khi bắt đầu slice tương ứng, rồi giữ cố định.

---

## 6. Kiểm thử sau mỗi slice

- Lint backend/frontend.
- Smoke: ít nhất luồng chạm trực tiếp domain đó (CRUD hoặc GET chính); với domain tài chính / webhook / renew thì bám test/ops hiện có trong `backend/package.json`.

---

## 7. Liên kết

- Skeleton và việc cần làm khi tạo domain mới: **`backend/src/domains/README.md`**.
- Kế hoạch công việc có checkbox: **`../task.md`** (thư mục gốc `admin_orderlist`).
- Kiến thức nền monorepo / DB / Adobe: **`admin_orderlist/.agents/SKILL.md`**.

---

## 8. Trạng thái chuẩn bị (Phase 0–1)

- **2026-04-30**: Đã ghi nhận baseline cấu trúc một hướng; rule Cursor `backend-domains-only.mdc`; `domains/README.md`; ghi chú mount trong `routes/index.js`. Chi tiết checkbox: `task.md`.


## --- [tong-quan-du-an.md] ---

# Tổng quan dự án (admin_orderlist)

Tài liệu **sống**: mô tả kiến trúc và luồng chính; **cập nhật khi dọn code** (dọn tới đâu, ghi tới đó). Chi tiết cleanup theo từng hạng mục vẫn tham chiếu [`ke-hoach-cleanup-rule-he-thong.md`](./ke-hoach-cleanup-rule-he-thong.md).

---

## Trước khi dọn code (bắt buộc)

Mỗi lần **dọn, refactor hoặc thêm rule** mà **liên quan** tới nội dung đã (hoặc sẽ) được mô tả ở đây — ví dụ: tab **Tổng quan**, `dashboard.dashboard_monthly_summary`, API `/api/dashboard/**`, luồng post finance / receipt ảnh hưởng số trên dashboard, `supplier_order_cost_log` và trigger cập nhật tổng hợp — thì **phải đọc lại toàn bộ file `tong-quan-du-an.md` và đối chiếu mục tương ứng trong `ke-hoach-cleanup-rule-he-thong.md`** trước khi sửa. Mục đích: **tránh rule chồng chéo** (hai nguồn cùng cộng một KPI, UI/API đọc khác trigger, v.v.).

Sau khi đổi hành vi: **cập nhật đúng mục trong file này** và **thêm một khối ghi chú ở cuối file** trong phần **«Lịch sử chỉnh sửa»** (có **`ID:` `TQD-Hxx`** mới, **thời gian** sửa, ngăn cách khối bằng `---`).

---

## 1. Repo trong workspace

| Thành phần | Vai trò ngắn gọn |
|------------|------------------|
| `admin_orderlist/backend` | API Express, Knex, webhook Sepay, scheduler, domain đơn hàng / tài chính / dashboard |
| `admin_orderlist/frontend` | Admin UI (React + TS + Vite) |
| `admin_orderlist/database` | Docker Postgres init, dump/schema hợp nhất, legacy SQL |
| `mavrykstore_bot`, `Website` | Repo lân cận (không mô tả sâu trong file này trừ khi đã ghi) |

**Stack tham chiếu nhanh:** PostgreSQL, backend Node, frontend React; session, Sepay, Telegram (xem `README.md` gốc repo).

---

## 2. Nguyên tắc khi đọc / sửa code

- **Đọc lại mục “Trước khi dọn code”** khi phạm vi công việc chạm tới các luồng đã nêu.
- **Schema runtime** mà backend được phép gọi: `backend/src/config/dbSchema` (đối chiếu DB khi đổi bảng/cột).
- **`dashboard.dashboard_monthly_summary`**: bảng **projection** (tổng hợp theo `month_key`), không coi là nơi phát sinh business event — event gốc nằm ở receipt / log NCC / cập nhật đơn + luồng post finance.
- Migration đã chạy production: **không sửa lịch sử**; thay đổi DB bằng **migration Knex mới**.

---

## 3. Luồng màn **Tổng quan** (Dashboard → tab Overview)

Mục tiêu hiện tại: **UI Tổng quan chỉ đọc số liệu đã lưu trong `dashboard.dashboard_monthly_summary`** (không query trực tiếp `order_list`, biên lai Sepay hay `supplier_order_cost_log` cho API này). **Ngoại lệ có kiểm soát** từ `dashboard.com_profit_expenses`: **lợi nhuận tháng** trừ thêm chi phí **nhập hàng MAVN** (`mavn_import`) và **nhập hàng ngoài luồng** (`external_import`), theo tháng `created_at`; **lợi nhuận khả dụng** chỉ trừ `withdraw_profit` — xem **§3.3.1**.

### 3.1. Frontend

| File / hook | Việc làm |
|-------------|----------|
| `frontend/src/features/dashboard/pages/DashboardPage.tsx` | Tab `overview`: `OverviewSection` + filter khoảng ngày (`dashboardRange`) |
| `frontend/src/features/dashboard/hooks/useDashboardStats.ts` | Gọi `fetchDashboardStats(range)`, `fetchChartData(year)` hoặc `fetchChartDataRange(from,to)` |
| `frontend/src/features/dashboard/api/dashboardApi.ts` | `GET /api/dashboard/stats`, `/charts`, `/years`; mapping payload biá»ƒu Ä‘á»“ |
| `frontend/src/features/dashboard/hooks/useMonthlySummary.ts` | `GET /api/dashboard/monthly-summary` (hiện UI bảng có thể ẩn nhưng API vẫn dùng được) |

### 3.2. Backend â€” route

Prefix API: **`/api/dashboard`** (`backend/src/routes/dashboardRoutes.js`).

| Method + path | Handler | Ghi chú |
|---------------|---------|---------|
| `GET /stats` | `dashboardStats` | Không query: KPI tháng hiện tại vs tháng trước từ bảng tổng hợp. Có `?from=&to=` (yyyy-mm-dd): **cộng dồn mọi `month_key`** mà khoảng ngày **chạm** (từ tháng của `from` đến tháng của `to`). |
| `GET /charts` | `dashboardCharts` | `?year=`: các tháng của năm từ bảng tổng hợp. `?from=&to=`: một điểm/tháng trong danh sách `month_key` như trên. |
| `GET /years` | `dashboardYears` | Năm lấy từ `DISTINCT` phần năm trong `month_key` của bảng tổng hợp. |
| `GET /monthly-summary` | `dashboardMonthlySummary` | Danh sách hàng `dashboard_monthly_summary`, `month_key` giảm dần. |

Logic tập trung tại **`backend/src/controllers/DashboardController/service.js`**; **`availableProfitFromSummary.js`** cho `availableProfit`.

### 3.3. Hành vi nghiệp vụ cần nhớ

- **Filter theo ngày** không chia nhỏ trong tháng: nếu range cắt qua tháng 3 và 4 thì KPI là **tổng** các cột của **cả** `month_key` 2026-03 và 2026-04 (v.v.).
- Thẻ KPI: **thuế** = cột **`total_tax`** trên bảng (không tính lại % trên client cho API này).
- Cần số khớp biểu đồ: bảng phải được cập nhật bởi trigger / job / **`rebuild-dashboard-monthly-summary`** — xem plan cleanup mục dashboard.

### 3.3.1. Lợi nhuận tháng (`monthlyProfit`) và lợi nhuận khả dụng (`availableProfit`) — `GET /api/dashboard/stats` (và range)

Nguồn gốc doanh thu/lợi nhuận tháng trên bảng: `dashboard.dashboard_monthly_summary`. Điều chỉnh thêm từ `dashboard.com_profit_expenses` (theo **tháng lịch** của `created_at`, `DATE_TRUNC` tháng server):

| Số hiển thị | Công thức (tóm tắt) |
|-------------|---------------------|
| **Lợi nhuận tháng** (KPI / biểu đồ / bảng monthly-summary API) | `total_profit` (theo `month_key` trên summary) **trừ** tổng `amount` trong tháng lịch của `created_at`: **đơn nhập MAVN** (`mavn_import`) và **nhập ngoài luồng** (`external_import`). Hai loại cùng nguồn bảng `store_profit_expenses`. |
| **Lợi nhuận khả dụng** | `SUM(total_profit)` mọi tháng trên summary **chỉ trừ** tổng (mọi thời điểm) `withdraw_profit` (rút tiền). **Không** trừ `mavn_import` / `external_import` vào số này. |
| **`previous` (khả dụng)** | Tổng `total_profit` các tháng có `month_key` **nhỏ hơn** tháng hiện tại **trừ** `withdraw_profit` có `created_at` **trước** ngày 1 của tháng hiện tại. |

Logic: `service.js` + `availableProfitFromSummary.js` (khả dụng) + `dashboardStoreExpenseDeductions.js` (tổng `mavn_import` + `external_import` theo tháng để **trừ** khỏi lợi nhuận tháng; helper `withdraw_profit` cho khả dụng).

- **`mavn_import`:** chi phí gắn **đơn nhập MAVN** (thường đồng bộ khi tạo đơn Đã TT — `Order/finance/mavnStoreExpenseSync`).
- **`external_import`:** chi phí **nhập hàng ngoài luồng** (ghi tay qua API/UI, cùng cơ chế trừ LN tháng theo `created_at`).

- **Lịch sử / chốt phương án một luồng:** **`TQD-H03`**; **khả dụng chỉ trừ rút tiền:** **`TQD-H08`** (cuối file).

### 3.4. Tách với tooling nội bộ

- `buildAlignedMonthlyRows` trong `monthlySnapshot.js` vẫn dùng cho **rebuild** và script **đối soát ledger** (`revenueSource: 'receipts'`), **không** phải nguồn của HTTP Tổng quan sau thay đổi này.

---

## 4. Credit hoàn tiền khách (`receipt.refund_credit_notes`)

Phiếu credit gắn đơn nguồn hoàn tiền; dùng khi **tạo đơn mới** (chế độ Credit) hoặc áp vào đơn đích. Logic backend tập trung `backend/src/controllers/Order/finance/refundCredits.js`.

### 4.1. Danh sách khả dụng cho dropdown tạo đơn

- **API:** `GET /api/orders/refund-credits/available` (`refundCreditRoutes.js`).
- **Điều kiện phiếu được coi là khả dụng:** `available_amount > 0`; `status` ∈ `OPEN`, `PARTIALLY_APPLIED`; `succeeded_by_note_id` IS NULL; nếu có `source_order_list_id` thì join `orders.order_list` và chỉ giữ khi đơn nguồn còn **Chưa Hoàn** hoặc **Đã Hoàn** (nếu không gắn đơn nguồn vẫn trả về — dữ liệu cũ).

### 4.2. Xác nhận hoàn tiền chuyển khoản (màn Hoàn tiền)

- **API:** `PATCH /api/orders/canceled/:id/refund` (`renewRoutes.js`): đơn **Chưa Hoàn** → **Đã Hoàn**.
- **Kèm theo (cùng transaction):** gọi `voidOpenRefundCreditNotesForSourceOrder` — **VOID** và **available_amount = 0** cho mọi phiếu credit còn số dư (`OPEN` / `PARTIALLY_APPLIED`, `available_amount > 0`) có `source_order_list_id` = id đơn; ghi chú vào `note` (đã xác nhận hoàn CK, hủy credit còn lại). Sau bước này phiếu không còn trong danh sách «available».

### 4.3. Nhắc Tổng quan — lợi nhuận tháng & khả dụng

- **Lợi nhuận tháng:** trừ `mavn_import` + `external_import` (theo tháng) — **§3.3.1**. **Lợi nhuận khả dụng:** chỉ trừ `withdraw_profit` — **§3.3.1**; mốc lịch sử **`TQD-H03`**, tinh chỉnh khả dụng **`TQD-H08`**.

---

## 5. Liên kết nhanh

- Kế hoạch cleanup rule: [`ke-hoach-cleanup-rule-he-thong.md`](./ke-hoach-cleanup-rule-he-thong.md)
- README setup: [`../README.md`](../README.md)

---

# Lịch sử chỉnh sửa `tong-quan-du-an.md`

**Quy ước:** Mỗi lần **thêm hoặc sửa** nội dung ở các phần phía trên, ghi lại **dưới đây**: một khối mới **ở cuối** (dưới khối mới nhất hiện có), có **`ID:`** cố định dạng `` `TQD-Hxx` `` (tăng dần: `H01`, `H02`, …) để tham chiếu / gọi lại khi chỉnh sửa; luôn có **thời gian** (`YYYY-MM-DD`, có thể thêm giờ nếu nhiều thay đổi trong ngày); ngăn cách khối bằng một dòng `---`.

---

**ID:** `TQD-H01` · **Thời gian:** 2026-04-29

- Khởi tạo `docs/tong-quan-du-an.md`; mô tả luồng Tổng quan; API dashboard (`service.js`) chỉ đọc `dashboard.dashboard_monthly_summary` cho stats / charts / years / monthly-summary.

---

**ID:** `TQD-H02` · **Thời gian:** 2026-04-29

- Thêm mục «Trước khi dọn code (bắt buộc)»; bổ sung bullet ở §2.

---

**ID:** `TQD-H03` · **Thời gian:** 2026-04-29

- **Má»™t luá»“ng (API Tá»•ng quan â€” `service.js` + `availableProfitFromSummary.js` + `dashboardStoreExpenseDeductions.js`):**
  - **Lợi nhuận tháng** (`monthlyProfit`, biểu đồ, `GET /dashboard/monthly-summary`): `total_profit` trên `dashboard_monthly_summary` theo `month_key` **trừ** (trong tháng `created_at`) tổng `mavn_import` + `external_import` trong `store_profit_expenses`.
  - **Lợi nhuận khả dụng** (`availableProfit`): `SUM(total_profit)` mọi tháng trên summary **chỉ trừ** tổng `withdraw_profit` (xem **`TQD-H08`** nếu cần phân biệt với bản trước đã trừ thêm MAVN/external). `previous`: profit các tháng trước tháng hiện tại **trừ** `withdraw_profit` có `created_at` trước ngày 1 tháng hiện tại.

---

**ID:** `TQD-H04` · **Thời gian:** 2026-04-29

- Bỏ bảng nhật ký giữa file; chuyển **toàn bộ lịch sử chỉnh sửa tài liệu** xuống **cuối file**; thêm quy ước khối + `---`; cập nhật hướng dẫn sau «Trước khi dọn code» (ghi chú ở cuối, có thời gian).

---

**ID:** `TQD-H05` · **Thời gian:** 2026-04-29

- Thêm **§4** — credit hoàn tiền khách: điều kiện `GET /api/orders/refund-credits/available`; `PATCH /api/orders/canceled/:id/refund` + `voidOpenRefundCreditNotesForSourceOrder`. Đánh số lại **Liên kết nhanh** thành **§5**. §4.3 trỏ §3.3.1 + **`TQD-H03`**.

---

**ID:** `TQD-H06` · **Thời gian:** 2026-04-29

- Lịch sử: mỗi khối có **`ID:` `TQD-Hxx`** cố định; gom các mốc trùng `availableProfit` về **`TQD-H03`**; §3.3.1 và §4.3 trỏ **`TQD-H03`**; bổ sung **`TQD-H06`** cho mốc này.

---

**ID:** `TQD-H07` · **Thời gian:** 2026-04-29

- Chốt phần **lợi nhuận tháng** và khối điều chỉnh từ `store_profit_expenses`: tháng trừ `mavn_import` + `external_import` (theo tháng); phiên bản **`availableProfit`** khi đó còn trừ cả MAVN/external + `withdraw_profit` — sau đó được thay bằng quy tắc **chỉ trừ rút tiền** (**`TQD-H08`**).

---

**ID:** `TQD-H08` · **Thời gian:** 2026-04-29

- **Lợi nhuận khả dụng** (`availableProfit`, `GET /api/dashboard/stats`): chỉ **`SUM(total_profit)` − tổng `withdraw_profit`**; **không** trừ `mavn_import` / `external_import` (hai loại này chỉ làm giảm **lợi nhuận tháng**). `previous` (khả dụng): tổng `total_profit` các tháng trước tháng hiện tại **trừ** `withdraw_profit` trước ngày 1 tháng hiện tại. Code: `fetchAvailableProfitPair` trong **`availableProfitFromSummary.js`** (chỉ đọc summary + `withdraw_profit`). Cập nhật §3.3.1, §4.3, khối **`TQD-H03`**.

---

**ID:** `TQD-H09` · **Thời gian:** 2026-04-29

- Đồng bộ code với §3 / **TQD-H03** / **TQD-H08**: `fetchAvailableProfitPair` chỉ trừ `withdraw_profit`; lợi nhuận tháng (stats, monthly rows, charts theo range) **trừ** `mavn_import` + `external_import` theo tháng `created_at`; thuế KPI dùng `total_tax` trên `dashboard_monthly_summary` khi có hàng; `GET /stats?from&to` và `GET /charts?from&to` cộng dồn theo **month_key** từ bảng tổng hợp (không query Sepay/NCC trực tiếp cho các API đó). Khôi phục `dashboardStoreExpenseDeductions.js` nếu thiếu trong working tree.

---

**ID:** `TQD-H10` · **Thời gian:** 2026-04-29

- Làm rõ §3 (ngoại lệ `store_profit_expenses` tách **tháng** vs **khả dụng**); tách `fetchAvailableProfitPair` → **`availableProfitFromSummary.js`** (hợp đồng: khả dụng **chỉ** trừ `withdraw_profit`).

---

**ID:** `TQD-H11` · **Thời gian:** 2026-04-29

- Chốt diễn đạt nghiệp vụ: **lợi nhuận tháng** trừ **nhập hàng MAVN** (`mavn_import`) và **nhập hàng ngoài luồng** (`external_import`); cập nhật §3, §3.3.1 và comment `dashboardStoreExpenseDeductions.js`.

---

**ID:** `TQD-H12` · **Thời gian:** 2026-04-29

- Webhook Sepay (`webhook/sepay/routes/webhook.js`): đơn **Đã Thanh Toán** + biên lai mới (`inserted`) → cộng **doanh thu và lợi nhuận** cùng số tiền giao dịch (**không** trừ cost, nhánh audit **`POST_PAID_ADDITIONAL_RECEIPT`**). Sửa điều kiện cũ `__skip_already_posted__` (không bao giờ khớp với `PAID`).


## --- [huong-dan-dashboard.md] ---

# Hướng dẫn Bảng điều khiển (Dashboard)

Tài liệu này mô tả **từng khối giao diện** trên màn hình Bảng điều khiển, dành cho người dùng **không cần biết lập trình**. Bạn có thể đối chiếu từng phần trên màn hình với tên gọi bên dưới.

---

## 1. Màn hình dùng để làm gì?

**Bảng điều khiển** giúp xem nhanh:

- Số liệu kinh doanh theo tháng hoặc theo khoảng thời gian bạn chọn.
- Tình hình đơn hàng (có bao nhiêu đơn, bao nhiêu đơn hủy).
- Một số thông tin tài sản, quỹ và mục tiêu tiết kiệm (ở tab riêng).

Các số thường hiển thị bằng **VND** (đồng). Trục tọa độ trên biểu đồ lớn có thể ghi dạng rút gọn (ví dụ K = nghìn, M = triệu) để dễ đọc.

---

## 2. Cấu trúc tổng thể: hai tab lớn

Phía dưới phần tiêu đề trang có **hai tab**:

| Tab         | Tên gọi trên màn hình | Nội dung chính |
|------------|------------------------|----------------|
| **Tổng quan** | “Tổng quan”            | Số nhanh, biểu đồ tài chính và biểu đồ đơn hàng. |
| **Tài sản**   | “Tài sản”              | Mục tiêu tiết kiệm, tóm tắt liên quan quỹ, bảng số dư ví. |

Bạn bấm vào từng tab để chuyển giữa hai khu vực này.

---

## 3. Phần đầu trang: tiêu đề và (khi ở tab Tổng quan) bộ lọc thời gian

### 3.1. Khối tiêu đề (hero)

- Có dòng chữ lớn **“Bảng Điều Khiển”** và mô tả phụ bằng tiếng Anh ngắn.
- Mục đích: xác định rằng đây là trang tổng quan, không phải trang chi tiết từng đơn.

### 3.2. Lọc chu kỳ (chỉ hiện khi bạn đang ở tab **Tổng quan**)

- Ở góc phải (trên màn hình lớn) hoặc phía dưới tiêu đề (màn hình nhỏ) có khu vực **chọn khoảng ngày** (có dòng gợi ý *“Lọc chu kỳ”*).
- **Khi bạn chưa chọn gì** (hoặc chọn mức mặc định tương đương “xem theo năm hiện tại” trên biểu đồ):  
  Các số ở thẻ tổng quan thường lấy theo **tháng hiện tại** so với **tháng trước**; biểu đồ theo tháng trong **năm** bạn chọn ở hộp chọn năm.
- **Khi bạn chọn một khoảng ngày cụ thể** (từ ngày – đến ngày):  
  Các số ở thẻ tổng quan sẽ so sánh **khoảng đó** với **khoảng cùng độ dài ngay trước** (kỳ trước tương ứng). Trên biểu đồ tài chính có dòng ghi tương tự *“Theo chu kỳ đã chọn”* và bộ chọn năm được ẩn, vì dữ liệu đang theo đúng khoảng bạn lọc.

> **Cách hiểu đơn giản:** Lọc chu kỳ giúp bạn hỏi: “Trong đoạn thời gian này, kết quả thế nào so với kỳ liền kề tương ứng?” thay vì luôn xem theo từng tháng.

---

## 4. Tab **Tổng quan** — từng khối chi tiết

### 4.1. Hàng sáu thẻ số lớn (KPI / chỉ số tổng quan)

Đây là **sáu ô** xếp lưới (trên điện thoại thường 1 cột, trên màn hình lớn có thể 2–3 cột). Mỗi thẻ gồm: **tên**, **một số lớn**, và thường kèm **một dòng %** (so sánh với kỳ trước — tháng trước hoặc kỳ tương ứng khi dùng lọc chu kỳ).

Dưới đây là từng thẻ theo tên bạn sẽ thấy trên màn hình:

| Tên trên màn hình   | Bạn cần hiểu số này là gì (phiên bản dễ hiểu) |
|--------------------|-----------------------------------------------|
| **Tổng đơn hàng**  | Số lượng đơn hàng (đếm theo cách hệ thống đang cấu hình) trong tháng/kỳ lựa chọn, so với tháng/kỳ trước. Con số bên dưới tên thường là **số nguyên** (không phải tiền). |
| **Doanh thu**      | Tổng tiền bán/đã ghi nhận thanh toán tương ứng với cách cấu hình hệ thống (ví dụ: theo **biên lai** thanh toán nếu đã tích hợp). Thể hiện mức thu thực tế theo từng tháng hoặc kỳ. |
| **Hoàn tiền**      | Số tiền hoàn lại cho khách (theo cách hệ thống ghi nhận hủy/ hoàn) trong cùng tháng/kỳ. Giúp thấy gánh nặng hoàn so với doanh thu. |
| **Tổng nhập hàng** | Tổng **chi phí mua hàng từ nhà cung cấp (NCC)** theo sổ nhật ký nhập/cost, gắn với tháng ghi nhận. Đây **không phải** cột “lãi” mà là **tiền bỏ ra để hàng về** (theo số liệu đã nhập hệ thống). |
| **Lợi nhuận tháng** | **Lợi nhuận kinh doanh còn lại sau khi đã tính đến phần rút lợi nhuận theo tháng** (nếu doanh nghiệp đã cấu hình bước rút này). Ở mức bản chất, lợi nhuận phản ánh chênh lệch thu hợp lý so với vốn hàng theo từng dòng, sau các điều chỉnh mà hệ thống đang áp dụng. |
| **Thuế**           | **Mức ước tính thuế** theo cấu hình tỷ lệ phần trăm trên cơ sở số dùng cho thu nhập/doanh thu — **dùng để tham khảo nhanh**, không thay thế tư vấn kế toán. |

> **Dòng % dưới mỗi thẻ:** thường là “tăng/giảm bao nhiêu % so với kỳ trước” (dương = cao hơn trước, âm = thấp hơn trước), trừ khi hệ thống tạm không tính được thì có thể hiện dạng khác (ví dụ “N/A”).

> **Ghi chú về thẻ Tổng đơn hàng:** với năm hiện tại, tỷ lệ % thay đổi thỉnh thoảng có thể tính dựa theo dữ liệu biểu đồ vài tháng gần nhất. Nếu thấy lạ, hãy coi số tuyệt đối (con số lớn) là thông tin chính, % so sánh là phụ.

---

### 4.2. Biểu đồ lớn: “Tài chính theo tháng” — bốn đường

Khối có tiêu đề tương tự: **“Doanh thu, lợi nhuận, hoàn tiền và thuế”**, kèm chú giải màu (chú thích) cho bốn đường:

| Màu / tên trên chú giải | Nội dung bạn đang xem theo từng tháng (hoặc theo từng cột tương ứng nếu lọc khoảng ngày) |
|------------------------|-----------------------------------------------------------------------------|
| **Doanh thu** (xanh dương) | Tổng thu tương ứng cấu hình, theo từng mốc thời gian. |
| **Lợi nhuận** (xanh lá)   | Mức lợi nhuận theo từng mốc (tham chiếu cùng cách tính với thẻ “Lợi nhuận tháng”, nhưng ở dạng chuỗi theo thời gian). |
| **Hoàn tiền** (hồng)     | Số hoàn theo từng mốc. |
| **Thuế** (tím)           | Mức ước tính thuế theo từng mốc, theo tỷ lệ cài đặt. |

- Trên trục ngang: **T1, T2, …** hoặc nhãn tháng tương ứng.
- Trên trục dọc: số tiền (có thể rút gọn B/M/K tùy mức lớn).
- Khi bạn rê chuột (hoặc chạm) vào từng điểm, thường sẽ hiện **ô gợi ý (tooltip)** với số đầy đủ hơn.

**Khi bạn dùng lọc chu kỳ theo ngày:** trục ngang sẽ phản ánh **các cột/điểm** trong khoảng thời gian bạn chọn, không còn gắn cố định với cả 12 tháng của năm.

---

### 4.3. Bộ chọn năm (góc biểu đồ tài chính)

- Khi **không** bật lọc theo khoảng ngày, bạn thường thấy **ô chọn năm** (dropdown) để xem cả năm đó theo từng tháng.
- Khi **đã** bật lọc khoảng ngày, ô này được ẩn vì dữ liệu đi theo **chu kỳ đã chọn** (có dòng ghi *“Theo chu kỳ đã chọn”*).

---

### 4.4. Biểu đồ cột: “Đơn hàng theo tháng”

Khối bên cạnh (hoặc bên dưới trên màn hẹp) với mô tả tương tự: **“Tổng đơn và đơn hủy theo tháng”**.

| Thành phần   | Ý nghĩa |
|-------------|--------|
| Cột (màu lạnh) **Tổng đơn** | Số lượng đơn phát sinh theo từng mốc thời gian (trục tọa độ là **số lượng**, không phải tiền). |
| Cột (màu hồng) **Đơn hủy**  | Số lượng đơn ở trạng thái hủy (theo cách hệ thống xác định theo từng mốc). |

Phần mô tả dưới tiêu đề giúp bạn thấy xu hướng: tháng nào nhiều đơn, tháng nào hủy nhiều hơn.

---

## 5. Bảng tóm tắt theo tháng (có thể chưa bật trên giao diện)

Hệ thống **có thể cung cấp** bảng chi tiết từng tháng (đơn, doanh thu, hoàn, nhập, thuế, cập nhật lần cuối, …) qua tính năng nền. Trên bản màn hình **hiện tại**, bảng này **có thể được tắt** để giao diện gọn hơn. Nếu bạn cần xem, hãy hỏi bộ phận quản trị hệ thống có bật hiển thị hay cung cấp báo cáo xuất file hay không.

---

## 6. Tab **Tài sản** — từng khối

### 6.1. Ô tóm tắt tài chính (phía trên)

- Khu vực lưới 1–2 cột, **mỗi ô** có thể hiển thị một số tóm tắt tài chính (nếu được cấu hình từ phía hệ thống).
- Trong cấu hình mặc định, **có thể chưa có số nào** (danh sách rỗng) — lúc đó bạn sẽ không thấy thẻ ở đây. Đây không phải lỗi; chỉ là chưa thêm nội dung hiển thị.

### 6.2. Khối mục tiêu, ngân sách và biểu đồ

- Thường bao gồm: **Mục tiêu tiết kiệm** (danh sách, thêm/sửa/xóa tùy quyền), **một số thống kê dạng biểu đồ/tuần** (nếu có dữ liệu ví theo từng cột thời gian), và mục con như *“Lợi nhuận khả dụng”* — đây là **chỉ số tổng hợp** từ phía tài chính, giúp xem phần lợi nhuận còn **có thể dùng** theo cách định nghĩa trong hệ thống (có thể trừ đi các khoản đã tính từ quỹ/chi, tùy cài đặt).
- Các **thanh mục tiêu** (progress) dựa trên **dữ liệu mục tiêu** bạn tạo và số từ **cột quỹ** tương ứng (ví dụ cột tên gần nghĩa với “quỹ”) nếu có.
- Có thể có **bảng ngân sách** minh hoạ hoặc dữ liệu mẫu — tùy phiên bản: nếu thấy số ổn định không đổi, có thể đó là dữ liệu minh hoạ; số thật cần xác nhận với quản trị.

### 6.3. Số dư ví (bảng ví / Wallet)

- Một bảng với **các cột = loại tài sản (ví)** do hệ thống định nghĩa, mỗi dòng = **một thời điểm cập nhật** (ví dụ ngày lấy số mới nhất ở dòng trên cùng).
- Có nút **làm mới** để tải lại số mới từ máy chủ.
- Dùng để đối chiếu: tiền đang nằm ở đâu, bao nhiêu, trong từng loại ví quản lý trên hệ thống.

### 6.4. Các hành động bổ sung (nếu bạn thấy trên màn hình)

- Có thể có **cửa sổ rút tiền**, **gán loại ví**, v.v. — tùy quyền tài khoản. Các tính năng này ảnh hưởng số dư sau khi xác nhận; cần thận trọng và làm theo quy trình nội bộ.

---

## 7. Các điểm cần nhớ (giúp tránh hiểu nhầm)

1. **Doanh thu** trên dashboard đang phản ánh cách cấu hình thanh toán/ biên lai — nếu cửa hàng mới tích hợp, một thời gian đầu số liệu có thể tăng dần khi dữ liệu cũ được đưa vào.
2. **Nhập hàng** tính từ sổ nhật ký mua/ giá từ NCC — cần nhập **đúng, đủ, đúng tháng ghi nhận** thì tổng mới sát thực tế.
3. **Lợi nhuận** trên bảng điều khiển theo từng cách tính nội bộ (chênh lệch bán với vốn theo từng dòng, có trừ phần rút theo tháng nếu cấu hình) — dùng để vận hành, **không tự thay công bố tài chính** kế toán/ thuế thực tế mà không đối soát bên ngoài.
4. **Thuế** hiển thị ở đây thường là **mô phỏng/ước tính theo tỷ lệ** cài trên hệ thống (biến môi trường cấu hình), **không** tự bằng tờ khai thuế thực tế nếu chưa được thiết lập đầy đủ từ kế toán.
5. **So sánh %** mạnh nhất khi “kỳ trước” có số tương tự. Tháng đầu tiên dữ liệu hoặc tháng có biến động bất thường dễ làm tỷ lệ % trông lạ; khi cần, hãy so **số tuyệt đối** thay vì chỉ nhìn %.
6. Nếu thấy **báo lỗi màu đỏ** trên cùng trang, đó thường là **không tải được số từ máy chủ** — bạn nên tải lại trang hoặc thử lại sau; nếu vẫn lỗi, cần nhờ bộ phận kỹ thuật.

---

## 8. Từ điển nhanh (một từ — một câu)

| Thuật ngữ bạn dễ gặp | Nghĩa ngắn gọn |
|----------------------|----------------|
| **KPI / thẻ số**     | Một số tổng hợp nổi bật trên cùng màn. |
| **Kỳ trước**         | Tháng trước, hoặc khoảng thời gian ngay trước (khi dùng lọc từ ngày – đến ngày). |
| **Biên lai**         | Căn cứ ghi nhận tiền thu từ thanh toán/ chuyển khoản (tùy cài đặt hệ thống). |
| **Nhập hàng (NCC)**  | Tổng tiền theo sổ nhật từ nhà cung cấp, gắn tháng. |
| **Lợi nhuận khả dụng** (trong phần Tài sản) | Một tổng cộng phục vụ theo dõi, có cách tính riêng trong hệ thống — đọc cùng mục mô tả trên màn. |

---

*Tài liệu này mô tả hành vi giao diện và cách diễn giải số theo cấu hình hệ thống phổ biến. Số tính toán chính xác ở từng thời điểm phụ thuộc dữ liệu bạn đã nhập, quyền tài khoản và cài đặt máy chủ.*


## --- [PAGES_BANG_GIA.md] ---

# Trang Bảng giá (Quản lý giá variant)

Tài liệu mô tả **màn hình Bảng giá** trong admin (`admin_orderlist`): route, dữ liệu, API và các khối UI chính. Màn quản lý **từng biến thể (variant)** trong catalog: trạng thái hiển thị, **tỷ lệ biên** (CTV / khách / khuyến mãi / STU), và giá tham chiếu từ **giá nhập NCC** (`supply_price`).

## Route và entry

| Mục | Giá trị |
|-----|---------|
| **Đường dẫn** | `/pricing` |
| **Sidebar** | Bán hàng → **Bảng giá** (`frontend/src/components/layout/sidebar/menuConfig.ts`, `href: "/pricing"`) |
| **Component** | `frontend/src/features/pricing/index.tsx` (export default `Pricing`) |
| **Đăng ký route** | `frontend/src/routes/AppRoutes.tsx` — `<Route path="/pricing" element={<Pricing />} />` |

Yêu cầu **đăng nhập**; API `/api/product-prices/*` do backend phục vụ sau middleware xác thực (theo cấu hình dự án).

### Trang khác dễ nhầm: In báo giá

| Đường dẫn | Mục đích |
|-----------|----------|
| `/show-price` | Trang **báo giá / in** (chọn sản phẩm, in), feature `frontend/src/features/product-price/`. **Không** phải màn quản lý bảng giá catalog. |

## Luồng dữ liệu (tóm tắt)

- **`usePricingData`** (`features/pricing/hooks/usePricingData.ts`): gom `useProductData`, `useProductActions`, `useSupplyActions`; nút **Đồng bộ lại** tải lại danh sách và làm mới cache giá NCC phía client cho các sản phẩm đã mở rộng.
- **`useProductData`**: `GET /api/product-prices`, map từng dòng → `ProductPricingRow`, áp `applyBasePriceToProduct` với `baseSupplyPrice` (max giá NCC từ API). Lọc **Đang hoạt động / Tạm dừng / Tất cả**, tìm kiếm không dấu, phân trang client.
- **`useProductActions`**: sửa / tạo / xóa variant, modal tạo sản phẩm.
- **`useSupplyActions`**: khi **mở rộng dòng** — tải và sửa **giá theo từng NCC**.

## API backend (`/api/product-prices`)

Định nghĩa route: `backend/src/routes/productPricesRoutes.js`.

| Phương thức | Đường dẫn | Mục đích |
|-------------|-----------|----------|
| `GET` | `/api/product-prices` | Danh sách variant + margin pivot + `max_supply_price` (MAX giá trong `supply_price` theo variant). Có **cache** server (`pricingCache` trong `handlers/list.js`). |
| `POST` | `/api/product-prices` | Tạo variant / bản ghi giá mới (`createProductPrice`). |
| `GET` | `/api/product-prices/:productId` | Má»™t variant theo id. |
| `PATCH` | `/api/product-prices/:productId` | Cập nhật variant (gói, mã, giá gốc, tỷ lệ, …). |
| `PATCH` | `/api/product-prices/:productId/status` | Bật/tắt **hiển thị** (`is_active`). Body: `{ "is_active": boolean }`. |
| `DELETE` | `/api/product-prices/:productId` | Xóa variant. |
| `POST` | `/api/product-prices/:productId/suppliers` | Thêm / cập nhật dòng **giá NCC** (`handlers/supplies.js`). |

Sau thao tác ghi, backend thường gọi **`pricingCache.clear()`** để lần `GET` sau không dùng dữ liệu cũ.

**Frontend** dùng `API_ENDPOINTS.PRODUCT_PRICES` trong `frontend/src/constants.ts`.

## Nguồn dữ liệu và cách tính giá hiển thị

- Mỗi **dòng bảng** = một **variant** (`variant.id`).
- API trả về: `base_price`, pivot margin `pct_ctv`, `pct_khach`, `pct_promo`, `pct_stu` (theo tier / `MARGIN_PIVOT_SQL`), `max_supply_price`, `is_active`, `update`.
- **`mapProductPriceRow`** + **`applyBasePriceToProduct`** (`features/pricing/utils.ts`):
  - **Chân giá** tính sỉ/lẻ ưu tiên **`max_supply_price`** (→ `baseSupplyPrice`) khi > 0.
  - **Giá sỉ (CTV)** = chân giá × hệ số `pct_ctv`.
  - **Giá lẻ** = giá sỉ × `pct_khach`.
  - **Giá khuyến mãi** khi `pct_promo` hợp lệ kèm biên CTV/khách (`hasValidPromoRatio`); logic trong `calculatePromoPrice`.

Cột **Giá gốc** có thể **trống (-)** nếu chưa có `max_supply_price` hợp lệ. Khi **mở rộng dòng** và có nhiều mức giá NCC, UI có thể dùng **mức cao nhất** trong danh sách đã tải (preview khi sửa) — `computeHighestSupplyPrice`.

## Khối UI trên trang

1. **`PricingStats`** — ba thẻ (click để lọc): **Tổng sản phẩm** (all), **Đang hoạt động**, **Tạm dừng**.
2. **`PricingFilters`** — tìm kiếm; **Thêm sản phẩm** (`CreateProductModal`); **Đồng bộ lại** (`handleRefreshAll`).
3. **`ProductTable`** — bảng + phân trang.

### Cột bảng (nghiệp vụ)

| Cá»™t | Ná»™i dung |
|------|----------|
| Sản phẩm | Tên gói + variant / thời hạn (từ `package_product` + mã `san_pham`). |
| Giá gốc | Cơ sở biên; ưu tiên max giá NCC. |
| Giá sỉ | Sau biên CTV. |
| Giá lẻ | Sau biên khách. |
| Giá khuyến mãi | % KM khi cấu hình hợp lệ. |
| Tình trạng | Toggle `is_active` (PATCH status). |
| Cập nhật | Ngày cập nhật variant. |
| Thao tác | Sửa, xóa, mở rộng NCC. |

### Mở rộng dòng (chi tiết NCC)

- `ProductExpandedDetails`; `fetchSupplyPricesForProduct`.
- Sửa / thêm / xóa dòng giá NCC; ảnh hưởng `max_supply_price` sau đồng bộ.

## Cấu trúc thư mục (tham chiếu)

```
frontend/src/features/pricing/
  index.tsx, hooks/, components/, utils.ts, types.ts
backend/src/controllers/ProductsController/handlers/
  list.js, supplies.js, mutations/
```

## Ghi chú vận hành

- **Cache**: nếu dữ liệu chậm sau sửa DB trực tiếp, kiểm tra `pricingCache.clear()`; UI: **Đồng bộ lại**.
- **Nguồn hàng** tại `/sources`; bảng giá liên kết `supply_price` và `POST .../suppliers`.
- Đơn hàng / webhook có thể phụ thuộc variant và giá NCC.


## --- [PAGES_DON_HANG.md] ---

# Trang Đơn hàng (Quản lý đơn hàng)

Tài liệu mô tả **màn hình Đơn hàng** trong admin (`admin_orderlist` frontend): route, dữ liệu, API và các khối UI chính.

## Route và entry

| Mục | Giá trị |
|-----|---------|
| **Đường dẫn** | `/orders` |
| **Component** | `frontend/src/features/orders/index.tsx` (export default `Orders`) |
| **Đăng ký route** | `frontend/src/routes/AppRoutes.tsx` — `<Route path="/orders" element={<Orders />} />` |
| **Tiêu đề trang** | “Quản Lý **Đơn Hàng**” (`OrdersPageHeader`) |

Yêu cầu **đăng nhập** (session); các API `/api/orders/*` nằm sau `authGuard` ở backend.

## Bốn “tab” bộ dữ liệu (dataset)

Người dùng chọn một trong bốn chế độ; mỗi chế độ gọi một **endpoint** riêng và làm mới bộ lọc/phân trang khi đổi tab.

| Khóa (`OrderDatasetKey`) | Nhãn UI | Mô tả ngắn | Endpoint API |
|--------------------------|---------|------------|----------------|
| `active` | Đơn Hàng | Danh sách đơn hàng | `GET /api/orders` |
| `import` | Nhập hàng | Đơn nhập kho | `GET /api/orders/import` |
| `expired` | Hết Hạn | Đơn hết hạn | `GET /api/orders/expired` |
| `canceled` | Hoàn Tiền | Đơn đã hoàn tiền | `GET /api/orders/canceled` |

Cấu hình nhãn/endpoint: `ORDER_DATASET_CONFIG`, thứ tự tab: `ORDER_DATASET_SEQUENCE` trong `frontend/src/constants.ts`.

## Luồng dữ liệu (tóm tắt)

- **`useOrdersData`** (`features/orders/hooks/useOrdersData.ts`): gom fetch, lọc client, phân trang, modal và hành động (xóa, sửa, tạo, xem, v.v.).
- **`useOrdersFetch`**: theo `dataset`, gọi `ORDER_DATASET_CONFIG[dataset].endpoint`, lưu mảng `Order[]`.
- **`useOrdersList`**: tìm kiếm, `statusFilter`, khoảng ngày (`durationRange`), `rowsPerPage` / `currentPage`.
- Đổi tab dataset → reset tìm kiếm, filter trạng thái, trang 1 và trạng thái modal (trong `useOrdersData`).

## API liên quan (frontend)

Định nghĩa trong `frontend/src/constants.ts` (`API_ENDPOINTS`), ví dụ:

- `ORDERS` â†’ `/api/orders`
- `ORDERS_IMPORT` â†’ `/api/orders/import`
- `ORDERS_EXPIRED` â†’ `/api/orders/expired`
- `ORDERS_CANCELED` â†’ `/api/orders/canceled`
- `ORDER_BY_ID`, `ORDER_RENEW`, `ORDER_CANCELED_REFUND`, `CALCULATE_PRICE`, â€¦

Chi tiết gọi API (POST/PATCH/DELETE) nằm trong các hook/modal như `useOrderActions`, `CreateOrderModal`, `EditOrderModal`, v.v.

## Khối UI trên trang

1. **`OrdersPageHeader`** — Tiêu đề, và banner lỗi tải + nút “Thử Lại” khi `fetchError`.
2. **`OrdersDatasetTabs`** — Bốn nút tab + số đếm (theo lần tải gần nhất mỗi tab).
3. **`OrdersStatsSection`** — Thẻ thống kê (bộ lọc nhanh theo trạng thái); riêng tab **Hết hạn** hiển thị khối “Tổng Đơn Hết Hạn”; tab **Hoàn tiền** dùng bộ stat hoàn tiền.
4. **`OrdersFiltersBar`** — Ô tìm kiếm, **lọc khoảng ngày** (`DashboardDateRangeFilter`), chọn **cột tìm** (`SEARCH_FIELD_OPTIONS`), nút **Tạo Đơn** (chỉ khi dataset là **Đơn Hàng** hoặc **Nhập hàng** — `isActiveDataset`).
5. **`OrdersTableSection`** — Bảng (và trên mobile có luồng card qua `OrderCard` nếu được dùng trong section): phân trang, mở rộng dòng, xem / sửa / xóa / hoàn / đánh dấu thanh toán / gia hạn tùy dataset.

### Modal gắn với trang

| Modal | Mục đích |
|-------|----------|
| `ConfirmModal` | Xác nhận xóa đơn |
| `ViewOrderModal` | Xem chi tiết đơn |
| `EditOrderModal` | Sửa đơn (khi dataset cho phép) |
| `CreateOrderModal` | Tạo đơn mới |

Điều kiện **cho phép sửa / gia hạn** được tính trong `index.tsx` (`canEditOrder`, `canRenewOrder`, …) theo `datasetKey`.

### Tìm kiếm theo cột

`SEARCH_FIELD_OPTIONS` trong `features/orders/constants.ts`: Tất cả cột, Mã đơn, Sản phẩm, Thông tin, Khách hàng, Slot, Nguồn (map qua `ORDER_FIELDS`).

## Cấu trúc thư mục (tham chiếu)

```
frontend/src/features/orders/
  index.tsx                 # Page chính
  components/               # OrdersPageHeader, Tabs, Stats, Filters, Table, OrderRow, OrderCard, ...
  hooks/                    # useOrdersData, useOrdersFetch, useOrdersList, useOrdersModals, useOrderActions
  utils/                    # ordersHelpers, orderListTransform, ...
  constants.ts              # Stat filters, SEARCH_FIELD_OPTIONS, ...
```

## Ghi chú

- Trang **“Đơn hàng thanh toán / bill”** khác route: `/bill-order` (`features/bill-order`) — không trùng với `/orders`.
- Đếm trên tab dataset (`datasetCounts`) được cập nhật khi đang xem tab đó (`totalRecords`), không phải snapshot đồng thời cả bốn API.

---

## Luồng nghiệp vụ (đơn hàng — tài liệu nội bộ)

### Trạng thái & log chi phí NCC (`supplier_order_cost_log`)

- **MAVC, MAVL, MAVK, MAVS**:
  - Tạo đơn: luôn **Chưa Thanh Toán**.
  - Nhận webhook thanh toán / webhook gia hạn thành công: chuyển **Đã Thanh Toán** và **INSERT 1 log**.
  - Xóa khi đang **Đã Thanh Toán** hoặc **Đang Xử Lý**: chuyển **Chờ Hoàn**, chạy tính hoàn NCC, lưu `refund` **số âm**, và **INSERT 1 log**.
- **MAVN**:
  - Tạo đơn: luôn **Đã Thanh Toán** và **INSERT 1 log**.
  - Đang **Cần Gia Hạn** + bấm nút Gia Hạn: chuyển **Đã Thanh Toán** và **INSERT 1 log**.
  - Xóa đơn **Đã Thanh Toán**: chuyển **Đã Hoàn** và **INSERT 1 log**.
  - Webhook Sepay: **không** đổi trạng thái MAVN.
- **MAVT**:
  - Tạo đơn: luôn **Đã Thanh Toán** và **INSERT 1 log**.
  - Xóa đơn: chuyển **Đã Hoàn**, `refund` trên đơn luôn `0`; tiền NCC cần hoàn vẫn tính riêng theo cost/ngày còn lại và ghi vào log NCC.
- **NCC Mavryk**: không lưu log ở `partner.supplier_order_cost_log` (nếu có log cũ theo đơn sẽ bị dọn khi phát sinh cập nhật đơn).

### Tạo đơn & Telegram

- Tạo đơn **thành công**:
  - **MAVC/MAVL/MAVK/MAVS** → **Chưa Thanh Toán**
  - **MAVN/MAVT** → **Đã Thanh Toán**
  - Sau tạo vẫn gửi **thông báo Telegram** đơn mới (backend: `sendOrderCreatedNotification`).

### Theo loại mã (prefix) & thông báo

- **MAVT**: Không có **giá bán cho khách** (giá = 0). Khi **hết hạn** chỉ cần thông báo **hết hạn**, **không** thông báo / nhắc **gia hạn** (cron “còn 4 ngày” bỏ qua MAVT).
- **MAVS**: Nếu không có giá trị cột `pct_stu` thì dùng **`pct_khach`** để tính (tương đương giá lẻ MAVL khi thiếu sinh viên).
- **MAVK**: Tỷ suất giảm áp trên **giá bán** (chuỗi MAVL × (1 − `pct_promo`)). Nếu **đến hạn** mà **không có** `pct_promo` → thông báo / tính theo **giá khách lẻ** (MAVL).

### Công thức giá bán (tham chiếu)

| Loại | Công thức |
|------|-----------|
| MAVC | `cost / (1 âˆ’ pct_ctv)` |
| MAVL | `MAVC / (1 âˆ’ pct_khach)` |
| MAVK | `MAVL Ã— (1 âˆ’ pct_promo)` |
| MAVS | `MAVC / (1 − pct_stu)` hoặc **MAVL** nếu `pct_stu` rỗng |
| MAVT | `0` |
| MAVN | `cost` |

### Tiền hoàn từ NCC (tỷ lệ theo ngày)

- **Tiền hoàn từ NCC** = `cost × (số ngày còn lại) / (tổng số ngày quy đổi từ `--xm` trên gói sản phẩm)`.

### Khi bấm hủy (xóa / chuyển trạng thái hủy)

- **MAVC, MAVL, MAVK, MAVS** (và đơn thường tương tự): từ **Đang Xử Lý** hoặc **Đã Thanh Toán** → chuyển trạng thái **Chờ Hoàn**; tính hoàn NCC theo tỷ lệ ngày và ghi `refund` **số âm**; trigger ghi thêm **1 dòng** `supplier_order_cost_log`.
- **MAVN**: xóa đơn **Đã Thanh Toán** → chuyển **Đã Hoàn**; trigger ghi thêm **1 dòng** `supplier_order_cost_log`.
- **MAVT**: xóa đơn → chuyển **Đã Hoàn**; `refund` trên đơn luôn `0`; tiền NCC cần hoàn vẫn tính riêng theo cost/ngày còn lại và ghi vào log NCC.

### NCC Mavryk / Shop (đơn thường — không phải MAVN)

- Coi **Mavryk** và **Shop** là cùng nhóm NCC nội bộ (`isMavrykShopSupplierName` trong backend).
- **Tạo đơn**: **không dùng giá nhập** — `cost` lưu **0**; **giá bán = lợi nhuận**. API `/api/orders/calculate-price` có thể trả `mavryk_profit_mode`, `gia_nhap = 0`. Trạng thái ban đầu vẫn là **Chưa Thanh Toán**.
- **Công nợ NCC (`payment_supply` / chu kỳ thanh toán)**: đơn thường + NCC Mavryk/Shop → **không cộng** `updatePaymentSupplyBalance` sau biên lai / renewal (`shouldSkipNccLedgerForOrder` — **không** áp cho MAVN).
- **Sepay webhook** (thanh toán khách): mọi đơn **Chưa Thanh Toán** (trừ MAVN — xem dưới) → **Đã Thanh Toán**; sau biên lai vẫn **bỏ qua** cộng `payment_supply` cho NCC Mavryk/Shop; đơn NCC thường vẫn **cộng** chu kỳ NCC khi có biên lai (như `webhook.js`).
- **Gia hạn** (`renewal.js`, đơn **không** MAVN + NCC Mavryk/Shop): sau gia hạn chuyển **Đã Thanh Toán** và **không** cộng thêm import NCC trong bước renewal.
- **Riêng NCC Mavryk**: không lưu `supplier_order_cost_log`.

### MAVN (nhập hàng)

- **Quy ước**: MAVN **không** gắn NCC Mavryk/Shop — luôn NCC nhà cung cấp thật (không ép `cost = 0` vì Mavryk khi prefix MAVN; `orderPricingService` không bật `mavryk_profit_mode` cho MAVN).
- **Tạo đơn thành công** → **Đã Thanh Toán** và ghi **1 dòng** `supplier_order_cost_log` (trừ NCC Mavryk).
- **Sepay webhook**: **không** đổi trạng thái đơn MAVN qua Sepay; **không** chạy renewal tự động từ webhook cho mã MAVN; fallback match theo số tiền (`resolveOrderByPayment`) **loại** đơn MAVN.
- **Cần Gia Hạn** → **Gia hạn** (`runRenewal`) → chuyển **Đã Thanh Toán** + **cộng** NCC (`updatePaymentSupplyBalance` trong `renewal.js`) + **INSERT** `supplier_order_cost_log`.
- `POST /api/payment-supply/:paymentId/confirm` vẫn dùng để đối soát chu kỳ NCC, nhưng MAVN không cần đợi bước này để lên trạng thái **Đã Thanh Toán**.

### Modal tạo đơn (`CreateOrderModal`)

- Khối **Chi phí & thời hạn** (`CreateOrderPricingSection`): phụ đề và nhãn cột giá theo **loại mã** (MAVC…MAVN) và **NCC Mavryk/Shop** (đơn thường: cost = 0, cột giá bán = lợi nhuận). **Sau lưu**: MAVC/MAVL/MAVK/MAVS là **Chưa Thanh Toán**; MAVN/MAVT là **Đã Thanh Toán** (xem mục “Trạng thái & log chi phí NCC”). Copy UI: `frontend/src/components/modals/CreateOrderModal/createOrderPricingCopy.ts` — khi đổi nghiệp vụ, cập nhật song song đoạn này và mục “Luồng nghiệp vụ”.

### Khớp code (kiểm tra định kỳ)

- **Log chi phí NCC (DB)**: bản canonical của `partner.fn_supplier_order_cost_log_on_success` nằm trong `database/migrations/091_supplier_order_cost_log_fn_canonical.sql` (áp qua `backend/migrations/20260605120000_supplier_order_cost_log_fn_canonical.js`); trigger `tr_supplier_order_cost_log_order_success` trên `orders.order_list` không đổi tên (lịch sử từ các migration `039`…`089`).
- **Dashboard `total_import` / phần NCC của `total_profit`**: trigger `trg_supplier_order_cost_log_dashboard_import` trên `partner.supplier_order_cost_log` gọi `partner.fn_recalc_dashboard_total_import` — rule MAVN `Đã Thanh Toán` → margin **−cost** và `total_import` = tổng `import_cost` theo tháng; migration `backend/migrations/20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js`.
- **NCC / MAVN / Mavryk**: `Order/finance/supplierDebt.js` (`findSupplyIdByName`; công nợ theo đơn chỉ qua DB trigger + log), `Order/crud/createOrder.js`, `services/orderService.js`, `services/pricing/orderPricingService.js`, `Order/orderDeletionService`, `Order/finance/dashboardSummary.js`, `PaymentsController` (xác nhận thanh toán NCC).
- **Sepay webhook & renewal tự động**: `backend/webhook/sepay/routes/webhook.js`, `backend/webhook/sepay/utils.js` (`resolveOrderByPayment`), `backend/webhook/sepay/renewal.js`; gia hạn tay: `backend/src/domains/orders/controller/renewRoutes.js`.
- UI tạo đơn: `createOrderPricingCopy.ts` như mục trên.

### Thanh toán khách — suffix số tiền (không nội dung CK)

Đơn bán (MAVC/MAVL/…) và đơn **Cần Gia Hạn** dùng **payment slot**: `order_list.price` = giá bảng + suffix (1..100). Webhook và QR match theo **đúng số tiền**, không sinh cột `transaction`, Telegram/frontend không hiển thị «nội dung CK».

Chi tiết: [payment-slot-suffix-matching.md](./payment-slot-suffix-matching.md).

## --- [tong-quan-ban-hang.md] ---

# Tổng quan chi tiết phần bán hàng (Sales Overview)

Tài liệu này là bản tổng quan vận hành cho mảng bán hàng trong `admin_orderlist`: nguồn dữ liệu, chỉ số KPI, số liệu snapshot hiện tại, và query chuẩn để đối soát.

---

## 1) Phạm vi và mục tiêu

Phần bán hàng trong hệ thống tập trung vào 3 câu hỏi chính:

- Doanh thu/lợi nhuận đang ở mức nào?
- Đơn hàng đang ở trạng thái nào, theo tháng biến động ra sao?
- Số liệu dashboard có khớp dữ liệu gốc ở bảng đơn/biên lai không?

Mục tiêu của file:

- Chuẩn hóa nơi đọc số liệu.
- Giảm lệch số giữa dashboard, API và truy vấn tay.
- Có bộ query nhanh để debug khi phát sinh chênh lệch.

---

## 2) Nguồn dữ liệu chính

### 2.1 Bảng nghiệp vụ gốc (source of truth theo luồng)

- `orders.order_list`: dữ liệu đơn bán chính (mã đơn, sản phẩm, giá bán, giá vốn, trạng thái, ngày đơn).
- `orders.order_customer`: liên kết đơn và tài khoản khách.
- `receipt.payment_receipt`: biên lai thanh toán.
- `partner.supplier_order_cost_log`: log chi phí NCC và tác động tổng hợp.

### 2.2 Bảng tổng hợp/dashboard

- `dashboard.dashboard_monthly_summary`: projection theo tháng (`month_key`) cho dashboard.
- `dashboard.daily_revenue_summary`: tổng hợp doanh thu theo ngày.
- `dashboard.com_profit_expenses`: các khoản điều chỉnh lợi nhuận (ví dụ `mavn_import`, `external_import`, `withdraw_profit`).

### 2.3 Catalog phục vụ phân tích bán hàng

- `product.product`, `product.variant`, `product.category`: map `id_product` sang thông tin sản phẩm.
- `product.variant_sales_summary`: summary theo variant.

---

## 3) Định nghĩa KPI cốt lõi

> Quy ước trong tài liệu này dùng cùng cách hiểu với phần Dashboard/Order hiện tại.

- **Total Orders**: tổng số dòng trong `orders.order_list`.
- **Paid Orders**: số đơn có `status = 'Đã Thanh Toán'`.
- **Processing Orders**: số đơn có `status = 'Đang Xử Lý'`.
- **Canceled Orders**: số đơn có `status = 'Hủy'`.
- **Gross Revenue**: `SUM(price)` trên nhóm trạng thái active (`Đã Thanh Toán`, `Đang Xử Lý`, `Cần Gia Hạn`).
- **Gross Cost**: `SUM(cost)` trên cùng nhóm trạng thái active.
- **Gross Profit**: `SUM(price - cost)` trên cùng nhóm trạng thái active.
- **Monthly Revenue/Profit**: tổng theo tháng dựa trên `order_date` hoặc projection từ `dashboard.dashboard_monthly_summary` (tùy mục đích hiển thị).

---

## 4) Snapshot số liệu hiện tại (local, sau restore)

Thời điểm chụp snapshot: **2026-05-09 23:5x (UTC+7)**  
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

### 4.3 Top sản phẩm theo doanh thu (id_product)

- `id_product=4`: `44` đơn, doanh thu `32,753,000`, lợi nhuận `19,476,000`
- `id_product=152`: `53` đơn, doanh thu `28,741,351`, lợi nhuận `9,455,351`
- `id_product=8`: `15` đơn, doanh thu `21,037,500`, lợi nhuận `10,777,500`
- `id_product=29`: `27` đơn, doanh thu `19,613,384`, lợi nhuận `5,593,384`
- `id_product=10`: `17` đơn, doanh thu `16,021,000`, lợi nhuận `10,241,000`

---

## 5) Query chuẩn để đối soát nhanh

### 5.1 KPI tá»•ng

```sql
select
  count(*) as total_orders,
  count(*) filter (where status = 'Đã Thanh Toán') as paid_orders,
  count(*) filter (where status = 'Đang Xử Lý') as processing_orders,
  count(*) filter (where status = 'Hủy') as canceled_orders
from orders.order_list;

select
  coalesce(sum(price), 0) as gross_revenue,
  coalesce(sum(cost), 0) as gross_cost,
  coalesce(sum(price - cost), 0) as gross_profit
from orders.order_list
where status in ('Đã Thanh Toán', 'Đang Xử Lý', 'Cần Gia Hạn');
```

### 5.2 Xu hướng tháng từ đơn gốc

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

### 5.3 Top sản phẩm

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

### 5.4 Đối chiếu projection dashboard

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

## 6) Checklist vận hành khi thấy số liệu lệch

- Kiểm tra đúng database đang mở (`mydtbmav` hay `my-store`) trước khi so số.
- So `orders.order_list` trước, sau đó mới so `dashboard.dashboard_monthly_summary`.
- Nếu projection dashboard lệch: kiểm tra luồng ghi `store_profit_expenses` và trigger/job rebuild summary.
- Với dữ liệu vừa restore: luôn reconnect DB client để tránh cache kết nối cũ.

---

## 7) Liên kết tài liệu liên quan

- `docs/tong-quan-du-an.md`
- `docs/PAGES_DON_HANG.md`
- `docs/nghiep-vu-loi-nhuan-ban-slot.md`
- `docs/dashboard-page-financial-flow.md`




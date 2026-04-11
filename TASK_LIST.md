# Danh Sách Task Cần Fix — Admin Order List

> **Tạo ngày:** 10/04/2026
> **Tham chiếu:** `PROJECT_AUDIT.md`, `REFACTOR_FUNCTION_FLOW_PLAN.md`
> **Quy tắc:** Mỗi task xong cần test -> xác nhận OK -> mới làm tiếp

---

## Giai Đoạn 1 — Bảo Mật Khẩn Cấp

> Ưu tiên cao nhất. Ảnh hưởng trực tiếp đến an toàn hệ thống production.

### ~~TASK-001: Bỏ so sánh mật khẩu plaintext~~ ✅ DONE

- **Mức độ:** 🔴 Khẩn cấp
- **File:** `backend/src/controllers/AuthController/index.js`
- **Thay đổi:**
  - [x] Tạo `verifyPassword()` — dùng `crypto.timingSafeEqual` cho legacy plaintext (tránh timing attack)
  - [x] Tạo `upgradePasswordHash()` — tự động upgrade plaintext → bcrypt khi login thành công
  - [x] Hàm `login`: gọi `verifyPassword()` + nếu `needsUpgrade` thì tự động hash lại
  - [x] Hàm `changePassword`: gọi `verifyPassword()` thay vì so sánh trực tiếp
- **Test:**
  - [x] Login bằng tài khoản có bcrypt hash → thành công
  - [x] Login bằng tài khoản plaintext cũ → thành công + tự động upgrade, log `[AUTH] Đã tự động upgrade`
  - [x] Login lại lần 2 → dùng bcrypt (không còn upgrade)
  - [x] Đổi mật khẩu → hash mới là bcrypt

---

### ~~TASK-002: Tắt fallback login bằng env trong production~~ ✅ DONE

- **Mức độ:** 🔴 Khẩn cấp
- **File:** `backend/src/controllers/AuthController/index.js`
- **Thay đổi:**
  - [x] Xóa hoàn toàn block fallback login bằng `DEFAULT_ADMIN_USER`/`DEFAULT_ADMIN_PASS`
  - [x] `ensureDefaultAdmin()` vẫn giữ — tạo user bcrypt hash khi khởi động nếu chưa tồn tại
- **Test:**
  - [x] Login bằng tài khoản DB (bcrypt) → thành công
  - [x] Không thể login bằng env credentials trực tiếp nữa

---

### ~~TASK-003: Bỏ hardcode Telegram Chat ID~~ ✅ DONE

- **Mức độ:** 🔴 Khẩn cấp
- **File:** `backend/src/config/dbSchema/env.js`
- **Thay đổi:**
  - [x] `NOTIFICATION_GROUP_ID = process.env.TELEGRAM_CHAT_ID || ""` — bỏ fallback cố định
  - [x] `RENEWAL_TOPIC_ID = Number(process.env.RENEWAL_TOPIC_ID) || 0` — bỏ fallback `2`
  - [x] Env `.env` đã có đầy đủ: `TELEGRAM_CHAT_ID`, `RENEWAL_TOPIC_ID`, các topic IDs khác
- **Test:**
  - [x] Thông báo Telegram gửi bình thường (env đã cấu hình đúng)

---

### ~~TASK-004: Bật CSRF mặc định~~ ✅ DONE

- **Mức độ:** 🔴 Khẩn cấp
- **Thay đổi:**
  - [x] Backend: Đảo logic `ENABLE_CSRF` → `DISABLE_CSRF` — CSRF **bật mặc định**, chỉ tắt khi `DISABLE_CSRF=true`
  - [x] Frontend: `apiFetch` tự động đọc `X-CSRF-Token` từ response header và gửi kèm trong mọi request POST/PUT/PATCH/DELETE
  - [x] `.env` / `.env.docker`: Thêm `DISABLE_CSRF=true` để dev/test không bị chặn
- **File đã sửa:**
  - `backend/src/middleware/csrfProtection.js`
  - `frontend/src/shared/api/client.ts`
  - `backend/.env`, `backend/.env.docker`
- **Test:**
  - [x] `DISABLE_CSRF=true` → app hoạt động bình thường (hiện tại)
  - [x] Xóa `DISABLE_CSRF` → tạo đơn, sửa đơn, xóa đơn, đổi mật khẩu vẫn thành công
  - [x] Dùng Postman POST không có token → trả 403

---

### ~~TASK-005: Giới hạn kích thước request body~~ ✅ DONE

- **Mức độ:** 🟡 Trung bình
- **Thay đổi:**
  - [x] `express.json({ limit: "1mb" })` — giới hạn JSON body 1MB
  - [x] `express.urlencoded({ extended: true, limit: "1mb" })` — giới hạn form body 1MB
  - [x] Route upload ảnh dùng `multer` với limit riêng (5-15MB) — không bị ảnh hưởng
- **File:** `backend/src/app.js`
- **Test:**
  - [x] POST JSON ~1KB → 400/401 (bình thường)
  - [x] POST JSON ~2MB → 413 Payload Too Large

---

### ~~TASK-006: Fail fast nếu production thiếu SESSION_SECRET~~ ✅ DONE

- **Mức độ:** 🟡 Trung bình
- **Thay đổi:**
  - [x] Production thiếu `SESSION_SECRET` hoặc dùng giá trị mặc định → `process.exit(1)`
  - [x] Dev thiếu → vẫn chạy với fallback `"change_this_secret"`
  - [x] Bonus: Database kết nối thất bại trong production → `process.exit(1)` (thêm `DB_POOL_MAX` env)
- **File:** `backend/src/config/appConfig.js`, `backend/src/config/database.js`

---

### ~~TASK-007: Rate limit cấu hình qua env~~ ✅ DONE

- **Mức độ:** 🟡 Trung bình
- **Thay đổi:**
  - [x] Đọc từ env: `RATE_LIMIT_API_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_SENSITIVE_MAX`
  - [x] Fallback tự động theo `NODE_ENV`: prod = strict (200/10/20), dev = lỏng (500/30/50)
- **File:** `backend/src/middleware/rateLimiter.js`

---

### ~~TASK-EXTRA: Gửi error/warning/critical qua Telegram~~ ✅ DONE

- **Mức độ:** 🔴 Quan trọng (cross-cutting)
- **Thay đổi:**
  - [x] `telegramErrorNotifier.js` — hỗ trợ 3 level: `critical` (🔴), `error` (🚨), `warn` (⚠️)
  - [x] Winston logger — thêm transport gửi `warn` level đến Telegram (trước chỉ có `error`)
  - [x] `server.js` — bắt `uncaughtException` + `unhandledRejection`, gửi `critical` trước khi tắt
  - [x] Sửa tất cả `catch (_) {}` im lặng → `logger.warn()` (scheduler + controllers)
  - [x] Thêm `ERROR_TOPIC_ID`, `SEND_ERROR_NOTIFICATION` vào `.env` / `.env.docker`
- **File đã sửa:**
  - `backend/src/utils/telegramErrorNotifier.js`
  - `backend/src/utils/logger.js`
  - `backend/src/server.js`
  - `backend/src/middleware/errorHandler.js`
  - `backend/src/scheduler/tasks/cleanupExpiredAdobeUsers.js`
  - `backend/src/controllers/RenewAdobeController/autoAssign.js`
  - `backend/src/controllers/RenewAdobeController/batchUsers.js`
  - `backend/.env`, `backend/.env.docker`

---

## Giai Đoạn 2 — Hiệu Năng

> Cải thiện tốc độ phản hồi API và giảm tải database.

### TASK-008: Hợp nhất DB connection pools ✅

- **Mức độ:** 🔴 Cao
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **Files đã sửa:**
  - `backend/src/config/database.js` — shared raw pool, `DB_RAW_POOL_MAX` (mặc định 5)
  - `backend/src/db/knexClient.js` — `DB_KNEX_POOL_MAX` (mặc định 10), thêm health check
  - `backend/webhook/sepay/config.js` — bỏ `new Pool()`, import shared pool
  - `backend/src/scheduler/config.js` — bỏ `new Pool()`, import shared pool
  - `backend/.env`, `backend/.env.docker` — thêm docs `DB_RAW_POOL_MAX`, `DB_KNEX_POOL_MAX`
- **Kết quả:**
  - [x] Gom 4 pools (tổng ~45 connections) → 2 pools (tổng max 15)
  - [x] Chỉ 1 `new Pool()` duy nhất trong toàn bộ codebase
  - [x] Webhook và Scheduler dùng shared pool từ `config/database.js`
  - [x] Pool size cấu hình qua env (`DB_RAW_POOL_MAX`, `DB_KNEX_POOL_MAX`)
  - [x] Backend khởi động, Scheduler chạy, Webhook listen thành công

---

### TASK-009: Tách timeout riêng cho routes ✅

- **Mức độ:** 🔴 Cao
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **Files đã sửa:**
  - `backend/src/server.js` — `requestTimeout=60s`, `headersTimeout=65s`, `keepAliveTimeout=65s`
  - `backend/src/routes/index.js` — thêm `longTimeout(900_000)` middleware cho `/renew-adobe`
- **Kết quả:**
  - [x] Server default timeout: 60s (thay vì 15 phút cho mọi request)
  - [x] `keepAliveTimeout`: 65s (chuẩn Nginx upstream, trước đây 120s)
  - [x] `/api/renew-adobe/*`: riêng 15 phút (Playwright flow)
  - [x] Backend khởi động và API hoạt động bình thường

---

### TASK-010: Thêm in-memory cache ✅

- **Mức độ:** 🟡 Trung bình
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **Files đã sửa/tạo:**
  - `backend/src/utils/cache.js` ← **MỚI** — TTL cache Map-based, 3 instance sẵn
  - `backend/src/controllers/BanksController/index.js` — `bankCache` TTL 30 phút
  - `backend/src/controllers/SuppliesController/handlers/list.js` — `supplierCache` TTL 10 phút
  - `backend/src/controllers/ProductsController/handlers/list.js` — `pricingCache` TTL 5 phút
  - `backend/src/controllers/ProductsController/handlers/mutations/*.js` — invalidate `pricingCache`
  - `backend/src/controllers/ProductsController/handlers/supplies.js` — invalidate `pricingCache` + `supplierCache`
  - `backend/src/controllers/SuppliesController/handlers/mutations.js` — invalidate `supplierCache`
- **Kết quả:**
  - [x] Cache utility tự viết (không thêm dependency), TTL + eviction
  - [x] Bank list (external API): cache 30 phút → giảm ~60 requests/giờ tới vietqr.io
  - [x] Supplier list: cache 10 phút → giảm tải DB trên trang Pricing
  - [x] Variant pricing: cache 5 phút → giảm query nặng (LATERAL JOIN)
  - [x] Tự động invalidate khi create/update/delete (supplier + pricing)
  - [x] Backend khởi động không lỗi, không linter errors

---

### TASK-011: Lazy-load frontend routes ✅

- **Mức độ:** 🔴 Cao
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **File đã sửa:** `frontend/src/routes/AppRoutes.tsx`
- **Kết quả:**
  - [x] 22 imports chuyển sang `React.lazy(() => import(...))`
  - [x] `<Suspense fallback={<PageLoader />}>` bọc toàn bộ `<Routes>`
  - [x] `PageLoader` — spinner Tailwind nhẹ, inline (không thêm file)
  - [x] Named export (`IpWhitelistPage`) xử lý đúng bằng `.then(m => ...)`
  - [x] Vite HMR nhận thay đổi, không lỗi
  - [x] Mỗi route tải chunk riêng → giảm initial bundle đáng kể

---

### TASK-012: Static file cache headers ✅

- **Mức độ:** 🟢 Thấp
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **File đã sửa:** `backend/src/app.js`
- **Kết quả:**
  - [x] `/image`, `/image_product`, `/image_variant` → `maxAge: 30d`, `etag: true`
  - [x] Response: `Cache-Control: public, max-age=2592000` + `ETag`
  - [x] Trình duyệt cache ảnh 30 ngày, tải lại dùng 304 Not Modified

---

## Giai Đoạn 3 — Kiến Trúc & Code Quality

> Tách services, chuẩn hóa patterns, giảm coupling.

### TASK-013: Sửa trùng ORDER_PREFIXES tang/thuong ✅

- **Mức độ:** 🔴 Cao
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **File đã sửa:** `backend/src/utils/orderHelpers.js`
- **Kết quả:**
  - [x] `thuong: "MAVT"` đã xóa — không được dùng ở bất kỳ đâu (0 references)
  - [x] `tang: "MAVT"` giữ nguyên — đơn quà tặng
  - [x] ORDER_PREFIXES: ctv, le, khuyen, tang, nhap, sinhvien (6 key, không trùng)

---

### TASK-014: Sửa trùng field expiry_date trong Order type ✅

- **Mức độ:** 🟡 Trung bình
- **File:** `frontend/src/constants.ts`
- **Dòng:** 201-203
- **Vấn đề:** `expiry_date: string` khai báo 2 lần (1 required, 1 optional).
- **Cách sửa:**
  - [x] Xóa dòng trùng, giữ 1 bản: `expiry_date: string`
  - [x] Kiểm tra `registration_date` cũng có trùng không → không trùng
- **Ước lượng:** 10 phút
- **Test:**
  - [x] Build frontend không lỗi TypeScript → 5 lỗi TS đã hết

---

### TASK-015: Thêm health check endpoint ✅

- **Mức độ:** 🟡 Trung bình
- **File:** `backend/src/app.js`, `docker-compose.yml`
- **Cách sửa:**
  - [x] Thêm `GET /api/health` → trả `{ status: "ok", uptime, dbConnected }` (đặt trước auth/CSRF middleware)
  - [x] Check DB connectivity bằng `SELECT 1`, trả 503 nếu DB down
  - [x] Cập nhật `docker-compose.yml` healthcheck backend dùng endpoint này
- **Ước lượng:** 1 giờ
- **Test:**
  - [x] `GET /api/health` → 200 + `{ status: "ok", uptime: 13.57, dbConnected: true }`
  - [x] DB down → `/api/health` trả 503 + `{ status: "degraded", dbConnected: false }`

---

### TASK-016: Tách Webhook thành process riêng ✅

- **Mức độ:** 🟡 Trung bình
- **File:** `backend/src/server.js`, `backend/webhook-server.js` (NEW), `docker-compose.yml`, `package.json`
- **Vấn đề:** Webhook crash → API chết. API quá tải → mất payment.
- **Cách sửa:**
  - [x] Bỏ `sepayWebhookApp.listen()` khỏi `server.js`
  - [x] Tạo `backend/webhook-server.js` entrypoint riêng (có error handling + Telegram notify)
  - [x] Thêm service `webhook` trong `docker-compose.yml` (cùng image, command `node webhook-server.js`)
  - [x] Thêm `"start:webhook": "node webhook-server.js"` trong package.json
- **Ước lượng:** 1 ngày
- **Test:**
  - [x] API server chạy riêng (port 3001) → `/api/health` 200 OK
  - [x] Webhook server chạy riêng (port 5000) → `/` 200 OK
  - [x] Hai process độc lập, kill 1 không ảnh hưởng cái kia

---

### TASK-017: Tách Scheduler thành process riêng ✅

- **Mức độ:** 🟡 Trung bình
- **File:** `backend/src/server.js`, `backend/scheduler.js`, `backend/src/scheduler/taskInstances.js` (NEW), `backend/src/scheduler/index.js`, `backend/src/controllers/SchedulerController/index.js`, `docker-compose.yml`
- **Vấn đề:** Cron job nặng (Playwright Adobe) block event loop API.
- **Cách sửa:**
  - [x] Tách `taskInstances.js` (task functions thuần) ra khỏi `index.js` (cron side-effects)
  - [x] `SchedulerController` import từ `taskInstances.js` (không kéo cron vào API)
  - [x] Bỏ `require("../scheduler")` khỏi `server.js`
  - [x] Nâng cấp `scheduler.js` entrypoint: error handling + Telegram notify
  - [x] Thêm service `scheduler` trong `docker-compose.yml` (cùng image, command `node scheduler.js`)
- **Ước lượng:** 1 ngày
- **Test:**
  - [x] API server chạy riêng (port 3001) → không còn log `[Scheduler] Đã khởi động`
  - [x] Scheduler chạy riêng → `[Scheduler] Đã khởi động` + DB connected
  - [x] API manual trigger vẫn hoạt động (SchedulerController → taskInstances)

---

### ~~TASK-018: Chuyển ORDER_PREFIXES sang DB-driven pricing tiers~~ ✅ DONE

- **Mức độ:** 🟡 Trung bình
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **Vấn đề:** Prefix đơn hàng hardcode — muốn thêm/sửa prefix phải sửa code.
- **Giải pháp:** DB-driven pricing tiers — quản lý order types và margins qua database.
- **Files đã sửa/tạo:**
  - `database/migrations/000_full_schema.sql` — bảng `product.pricing_tier` + `product.variant_margin`
  - `backend/src/services/pricing/tierCache.js` ← **MỚI** — in-memory cache pricing tiers từ DB
  - `backend/src/controllers/PricingTierController/index.js` ← **MỚI** — API CRUD pricing tiers
  - `backend/src/routes/pricingTierRoutes.js` ← **MỚI** — routes `/api/pricing-tiers`
  - `backend/src/utils/orderHelpers.js` — thêm `getOrderPrefixes()` async đọc từ DB
  - `backend/src/services/pricing/core.js` — generic tier-chain pricing thay thế hardcode if/else
  - `backend/src/controllers/ProductsController/` — đọc/ghi margin từ `variant_margin`
  - `frontend/src/shared/hooks/usePricingTiers.ts` ← **MỚI** — hook fetch pricing tiers
  - `frontend/src/components/modals/CreateOrderModal/` — dropdown order type động từ DB
- **Kết quả:**
  - [x] `product.pricing_tier` — 6 tiers mặc định (ctv, customer, promo, gift, import, student)
  - [x] `product.variant_margin` — margin ratios per variant per tier (thay thế cột `pct_*`)
  - [x] API `/api/pricing-tiers` — CRUD tiers + variant margins
  - [x] `tierCache` — cache in-memory 10 phút, fallback hardcode nếu DB chưa sẵn sàng
  - [x] Frontend `usePricingTiers` hook — dropdown order type tự cập nhật từ DB
  - [x] Pricing engine generic — recursive tier-chain thay thế hardcode if/else
  - [x] Cột `pct_*` đã xóa khỏi `product.variant` — data migrated sang `variant_margin`

---

### ~~TASK-019: Centralize validation (express-validator)~~ ✅ DONE

- **Mức độ:** 🟢 Thấp
- **Trạng thái:** ✅ Hoàn thành (2026-04-10)
- **Vấn đề:** Validation phân tán — một số dùng `express-validator`, phần lớn validate tay.
- **Files đã tạo (14 validator files):**
  - `backend/src/validators/authValidator.js` — login, changePassword
  - `backend/src/validators/orderValidator.js` — orderId param, orderCode param
  - `backend/src/validators/supplyValidator.js` — supplyId, create, payments
  - `backend/src/validators/productValidator.js` — productId, create/update price, sourceId
  - `backend/src/validators/contentValidator.js` — articles, banners, content categories
  - `backend/src/validators/categoryValidator.js` — product categories
  - `backend/src/validators/packageValidator.js` — packages CRUD, bulk delete
  - `backend/src/validators/warehouseValidator.js` — warehouse id param
  - `backend/src/validators/walletValidator.js` — saveDailyBalance
  - `backend/src/validators/pricingTierValidator.js` — tiers, variant margins
  - `backend/src/validators/formDescValidator.js` — forms, inputs
  - `backend/src/validators/dashboardValidator.js` — date range query
  - `backend/src/validators/ipWhitelistValidator.js` — IP whitelist create
  - `backend/src/validators/savingGoalValidator.js` — goals CRUD, priority
- **Files đã sửa (17 route/controller files):**
  - 11 route files: `authRoutes`, `productsRoutes`, `productPricesRoutes`, `categoriesRoutes`, `packagesRoutes`, `warehouseRoutes`, `walletRoutes`, `pricingTierRoutes`, `formInfoRoutes`, `dashboardRoutes`, `ip-whitelist/routes`
  - 6 controller-routers: `Order/renewRoutes`, `Order/crud/updateOrder`, `Order/crud/deleteOrder`, `SuppliesController/index`, `ContentController/index`, `SavingGoalsController/index`
- **Kết quả:**
  - [x] Tạo folder `backend/src/validators/` — 14 domain validator files
  - [x] Mỗi domain 1 file với express-validator chains + validate middleware
  - [x] Áp dụng validators vào 17 route files (route-level validation)
  - [x] SavingGoalsController — xóa validation tay, thay bằng validators
  - [x] Order CRUD — xóa manual id checks, thay bằng `orderIdParam`/`orderCodeParam`
  - [x] Middleware `validateRequest.js` sẵn có — format lỗi thống nhất `VALIDATION_ERROR`
  - [x] 14/14 validators + 17/17 routes load thành công, không lỗi

---

### TASK-020: Centralize frontend API client [DONE]

- **Mức độ:** 🟡 Trung bình
- **Vấn đề:** ~25 file dùng raw `fetch()` với manual URL, credentials, 401 check riêng lẻ.
- **Giải pháp:** Nâng cấp `apiFetch` thành client tập trung duy nhất, migrate toàn bộ raw `fetch`.
- **Chi tiết thay đổi:**
  - [x] `shared/api/client.ts` — thêm 401 auto-redirect (trừ `/auth/*`), thêm `apiRequest`, `apiGet/Post/Put/Patch/Delete` helpers
  - [x] `lib/api.ts` — re-export helpers mới
  - [x] `lib/errorHandler.ts` — xóa `apiFetchWithErrorHandling` (unused, dùng raw fetch thay vì apiFetch)
  - [x] **Pricing hooks (9 files):** `useProductData`, `useProductActions`, `useProductReferenceOptions`, `useProductStatusActions`, `useSupplyPriceMap`, `useNewSupplyRowActions`, `useExistingSupplyRowActions`, `useSupplyActions`, `usePricingData` — xóa `apiBase` param, dùng `apiFetch`
  - [x] **Orders hooks (4 files):** `useOrdersFetch`, `useOrderActions`, `useSuppliesData`, `useEditOrderLogic` — migrate sang `apiFetch`, xóa `API_BASE` variable
  - [x] **Orders caller:** `useCreateOrderLogic` — xóa `API_BASE`, cập nhật `useSuppliesData()` call
  - [x] **Renew Adobe (5 files):** `renewAdobeApi`, `useRenewAdobeAdmin`, `DeleteUserByEmail`, `AddUserByEmail`, `user-orders/api` — migrate sang `apiFetch`
  - [x] **Dashboard (2 files):** `AddGoalModal`, `useSavingGoalsActions` — migrate sang `apiFetch`
  - [x] **Product (2 files):** `productPriceApi` (xóa `resolveApiBase()`), `product-system/index` — migrate sang `apiFetch`
  - [x] **Misc (5 files):** `bill-order/index` (xóa local `API_BASE`), `ctv-list/index`, `Sidebar` (logout), `main.tsx`, `ErrorBoundary` — migrate sang `apiFetch`
- **Kết quả:** 0 raw `fetch()` còn lại (trừ internal `apiFetch`), 0 `credentials: "include"` trùng lặp, TypeScript build pass

---

## Giai Đoạn 4 — DevOps & Hạ Tầng

> Cải thiện quy trình deploy, monitoring, backup.

### ~~TASK-021: Sửa deploy.sh volume prune~~ ✅ DONE

- **Mức độ:** 🔴 Cao
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **File:** `deploy.sh`
- **Thay đổi:**
  - [x] Bỏ dòng `docker volume prune -f 2>/dev/null || true` — tránh mất ảnh sản phẩm khi deploy

---

### ~~TASK-022: Docker Compose resource limits~~ ✅ DONE

- **Mức độ:** 🟡 Trung bình
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **File:** `docker-compose.yml`
- **Thay đổi:**
  - [x] Postgres: `memory: 512M`, `cpus: 1.0`
  - [x] Backend: `memory: 1G`, `cpus: 1.0`
  - [x] Webhook: `memory: 256M`, `cpus: 0.5`
  - [x] Scheduler: `memory: 512M`, `cpus: 0.5`
  - [x] Frontend: `memory: 128M`, `cpus: 0.5`

---

### ~~TASK-023: Frontend build arg dùng biến env~~ ✅ DONE

- **Mức độ:** 🟢 Thấp
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **File:** `docker-compose.yml`
- **Thay đổi:**
  - [x] `VITE_API_BASE_URL: ${VITE_API_BASE_URL:-https://admin.mavrykpremium.store}` — fallback default khi không set env

---

### ~~TASK-024: Tạo init.sql đầy đủ~~ ✅ DONE

- **Mức độ:** 🟡 Trung bình
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **File:** `database/init.sql`
- **Thay đổi:**
  - [x] `init.sql` giờ `\i` full schema (`000_full_schema.sql`) + seed data
  - [x] Docker container mới tự chạy khi khởi tạo (volume trống)
  - [x] Database/Dockerfile đã copy migrations/ và seeds/ vào `/docker-entrypoint-initdb.d/`

---

### ~~TASK-025: Cấu hình DB backup tự động production~~ ✅ DONE

- **Mức độ:** 🟡 Trung bình
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Files:** `backend/src/scheduler/config.js`, `.env.docker`
- **Thay đổi:**
  - [x] Đảo logic: `ENABLE_DB_BACKUP === "true"` (opt-in) thay vì `!== "false"` (opt-out)
  - [x] `.env.docker` đã có đầy đủ: `ENABLE_DB_BACKUP=true`, `BACKUP_DATABASE_URL`, `GOOGLE_DRIVE_*`, `BACKUP_RETENTION_DAYS=7`
  - [x] `backupService.js` sẵn có: pg_dump → Google Drive upload → auto cleanup files cũ

---

### ~~TASK-026: Chuyển migrations sang Knex~~ ✅ DONE

- **Mức độ:** 🟢 Thấp (dài hạn)
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Files đã tạo:**
  - `backend/knexfile.js` — config dev/production, migration directory `./migrations`
  - `backend/migrations/20260411000000_baseline.js` — baseline migration (verify schema tồn tại)
- **Thay đổi:**
  - [x] `knexfile.js` với connection từ `DATABASE_URL`, pool config riêng dev/production
  - [x] Baseline migration: kiểm tra schema `orders` tồn tại, không alter DB
  - [x] `package.json`: thêm scripts `migrate`, `migrate:rollback`, `migrate:status`, `migrate:make`, `seed:run`
  - [x] `knex_migrations` table tạo tự động, tracking batch
  - [x] `npx knex migrate:latest` → chạy OK, `migrate:status` → 1 completed

---

## Giai Đoạn 5 — Refactor Theo Module

> Tách từng trang/module nhỏ. Mỗi batch xong phải test trước khi tiếp.

### ~~TASK-027: Batch 01 — Website `/system/adobe-edu` (checkprofile.tsx)~~ ✅ DONE

- **Mức độ:** 🟡 Refactor
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **File gốc:** `checkprofile.tsx` (798 dòng) → 9 files
- **Files mới:**
  - [x] `checkprofile.types.ts` — types `CheckResultType`, `OtpResultType`, API result shapes
  - [x] `checkprofile.api.ts` — 4 API functions (check, activate, sendOtp, verifyOtp)
  - [x] `hooks/useCheckProfile.ts` — state management (14 useState), handlers, reset
  - [x] `components/AnimatedCheckmark.tsx` — SVG checkmark animation
  - [x] `components/SlideOverlay.tsx` — Desktop sliding overlay panel
  - [x] `components/EmailField.tsx` — Shared email input
  - [x] `components/CheckActivatePanel.tsx` — Check form + result display (5 states)
  - [x] `components/OtpPanel.tsx` — OTP send + verify forms + result display
  - [x] `checkprofile.tsx` (~145 dòng) — thin page coordinator

---

### ~~TASK-028: Batch 02 — Website `/system/renew-adobe` (RenewAdobePage.tsx)~~ ✅ DONE

- **Mức độ:** 🟡 Refactor
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **File gốc:** `RenewAdobePage.tsx` (599 dòng) → 4 files mới
- **Files mới:**
  - [x] `hooks/useRenewAdobe.ts` — state + submit handlers (~120 dòng)
  - [x] `components/AnimatedCheckmark.tsx` — shared checkmark animation
  - [x] `components/RenewStatusDisplay.tsx` — 6 status sub-renderers (~200 dòng)
  - [x] `renewAdobe.styles.ts` — CSS keyframes + animation classes
  - [x] `renewAdobe.types.ts` — thêm `RenewResultType` union type
  - [x] `RenewAdobePage.tsx` (~160 dòng) — thin coordinator

---

### ~~TASK-029: Batch 03 — Website Service Hub sidebar/router~~ ✅ DONE

- **Mức độ:** 🟢 Refactor
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Files đã sửa:**
  - [x] `serviceHubRoutes.ts` — thêm alias sets (renew-adobe, renew-zoom, netflix), thêm `matchesAppRoute()`
  - [x] `useRouter.ts` — xóa hardcoded aliases, dùng `matchesAppRoute()` + `isXxxPath()` helpers

---

### ~~TASK-030: Batch 04 — Backend scheduler domain split~~ ✅ DONE

- **Mức độ:** 🟡 Refactor
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Files mới:**
  - [x] `tasks/shared.js` — `buildRenewalQuery(sqlDate, daysLeft)` + `normalizeNotifyRow(row, today, nameMap, computedPrice)`
- **Files đã sửa:**
  - [x] `notifyFourDays.js` — dùng shared query + normalize, giữ gift filter + computeOrderCurrentPrice
  - [x] `notifyZeroDays.js` — dùng shared query + normalize, không gift filter

---

### ~~TASK-031: Batch 05 — Backend telegram notification lib~~ ✅ DONE

- **Mức độ:** 🟡 Refactor
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Files mới:**
  - [x] `sendWithRetry.js` — shared retry logic (thread error → retry without topic, copy button error → retry without buttons)
- **Files đã sửa:**
  - [x] `sendFourDays.js` — dùng `sendWithRetry` cho mỗi order
  - [x] `sendZeroDays.js` — dùng `sendWithRetry` cho mỗi order
  - [x] `sendOrderCreated.js` — dùng `sendWithRetry` với `enableCopyButtonRetry: true`

---

### ~~TASK-032: Batch 06 — Backend renewal pricing flow~~ ✅ DONE

- **Mức độ:** 🟡 Refactor
- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **File gốc:** `renewal.js` (669 dòng) → 3 modules + orchestrator
- **Files mới:**
  - [x] `renewalPricing.js` (167 dòng) — `calculateRenewalPricing`, `computeOrderCurrentPrice`
  - [x] `renewalEligibility.js` (85 dòng) — `fetchOrderState`, `isEligibleForRenewal`, `fetchRenewalCandidates`
  - [x] `renewalQueue.js` (162 dòng) — `pendingRenewalTasks`, `queueRenewalTask`, `processRenewalTask`, `runRenewalBatch`
  - [x] `renewal.js` (308 dòng) — orchestrator `runRenewal` + re-exports (9 keys giữ nguyên)

---

### ~~TASK-033: Batch 07 — Frontend Pricing/Orders hooks~~ ✅ DONE

- **Mức độ:** 🟡 Refactor
- **Trạng thái:** ✅ Đã hoàn thành trước đó (giai đoạn 3)
- **Kết quả:**
  - [x] Pricing hooks: 12 files (2,638 dòng) — data, actions, helpers, compositor đã tách
  - [x] Orders hooks: 7 files (659 dòng) — fetch, data, actions, modals, list đã tách
  - [x] Không cần tách thêm — cấu trúc đã tối ưu theo feature-based architecture

---

## Giai Đoạn 6 — Tối Ưu Nâng Cao (Dài hạn)

### ~~TASK-034: Code splitting cho heavy dependencies~~ ✅ DONE

- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Thay đổi:**
  - [x] `xlsx` — dynamic import chỉ khi user click Export (`await import("xlsx")` trong `handleExportToExcel`)
  - [x] `@tiptap/*` — đã route-lazy via `React.lazy(CreateArticlePage)`, không cần tách thêm
  - [x] `recharts` — đã route-lazy via `React.lazy(DashboardPage)`, không cần tách thêm
- **Files:** `features/invoices/index.tsx`, `features/invoices/helpers.ts`

### ~~TASK-035: Session store chuyển Redis~~ ✅ DONE

- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Thay đổi:**
  - [x] `docker-compose.yml` — thêm service `redis` (redis:7-alpine, 128M, healthcheck)
  - [x] `backend/src/config/redisClient.js` ← **MỚI** — ioredis client với reconnect strategy
  - [x] `backend/src/app.js` — session dùng `connect-redis` khi `REDIS_URL` có, fallback MemoryStore
  - [x] `/api/health` — thêm `redisConnected` status
  - [x] `.env` / `.env.docker` — thêm `REDIS_URL`
- **Packages:** `connect-redis`, `ioredis`

### ~~TASK-036: Queue system cho background jobs~~ ✅ DONE

- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Thay đổi:**
  - [x] `backend/src/queues/connection.js` ← **MỚI** — shared Redis connection cho BullMQ
  - [x] `backend/src/queues/renewalQueue.js` ← **MỚI** — BullMQ Queue "renewal" (3 retries, backoff)
  - [x] `backend/src/queues/worker.js` ← **MỚI** — Worker concurrency 1, rate limit 2/phút
  - [x] `webhook/sepay/renewalQueue.js` — thêm `enqueueRenewal()` (BullMQ → fallback Map)
- **Packages:** `bullmq`

### ~~TASK-037: API versioning~~ ✅ DONE

- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Thay đổi:**
  - [x] `backend/src/routes/v1.js` ← **MỚI** — re-export router hiện tại
  - [x] `backend/src/app.js` — mount routes tại cả `/api/v1` và `/api` (backward compat, không redirect)
  - [x] `/api/health` giữ tại root, không versioning
  - [x] CSRF + rate limit áp dụng cho tất cả `/api/*`

### ~~TASK-038: E2E testing~~ ✅ DONE

- **Trạng thái:** ✅ Hoàn thành (2026-04-11)
- **Thay đổi:**
  - [x] `frontend/playwright.config.ts` — Chromium, baseURL từ env, HTML reporter
  - [x] `frontend/e2e/auth.spec.ts` — 3 smoke tests: redirect login, form fields, submit
  - [x] `frontend/e2e/orders.spec.ts` — 1 smoke test: orders page loads
  - [x] `frontend/package.json` — scripts `test:e2e`, `test:e2e:ui`
- **Package:** `@playwright/test`

---

## Bảng Tổng Hợp

| Giai đoạn | Số tasks | Ước lượng | Trạng thái |
|---|---|---|---|
| 1. Bảo mật | 7 | 1-2 ngày | ✅ Hoàn thành |
| 2. Hiệu năng | 5 | 3-5 ngày | ✅ Hoàn thành |
| 3. Kiến trúc | 8 | 1-2 tuần | ✅ Hoàn thành |
| 4. DevOps | 6 | 1 tuần | ✅ Hoàn thành |
| 5. Refactor | 7 | 2-3 tuần | ✅ Hoàn thành |
| 6. Nâng cao | 5 | dài hạn | ✅ Hoàn thành |
| **Tổng** | **38** | | |

---

*Cập nhật trạng thái sau mỗi task hoàn thành. Đánh dấu `[x]` cho checkbox đã xong.*

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

### TASK-021: Sửa deploy.sh volume prune

- **Mức độ:** 🔴 Cao
- **File:** `deploy.sh`
- **Dòng:** 38
- **Vấn đề:** `docker volume prune -f` xóa tất cả unused volumes → có thể mất ảnh sản phẩm.
- **Cách sửa:**
  - [ ] Bỏ dòng `docker volume prune -f 2>/dev/null || true`
- **Ước lượng:** 2 phút
- **Test:**
  - [ ] Deploy → ảnh sản phẩm vẫn còn sau rebuild

---

### TASK-022: Docker Compose resource limits

- **Mức độ:** 🟡 Trung bình
- **File:** `docker-compose.yml`
- **Cách sửa:**
  - [ ] Backend: `deploy.resources.limits.memory: 1G`, `cpus: '1.0'`
  - [ ] Frontend: `deploy.resources.limits.memory: 128M`, `cpus: '0.5'`
  - [ ] Postgres: `deploy.resources.limits.memory: 512M`
- **Ước lượng:** 30 phút
- **Test:**
  - [ ] `docker compose up` → containers chạy bình thường
  - [ ] `docker stats` → memory/CPU trong giới hạn

---

### TASK-023: Frontend build arg dùng biến env

- **Mức độ:** 🟢 Thấp
- **File:** `docker-compose.yml`
- **Dòng:** 62
- **Cách sửa:**
  - [ ] `VITE_API_BASE_URL: ${VITE_API_BASE_URL:-https://admin.mavrykpremium.store}`
- **Ước lượng:** 5 phút
- **Test:**
  - [ ] Build không set env → dùng default
  - [ ] Build set env khác → frontend trỏ đúng API URL

---

### TASK-024: Tạo init.sql đầy đủ

- **Mức độ:** 🟡 Trung bình
- **File:** `database/init.sql`
- **Vấn đề:** File rỗng → setup mới phải chạy 31 migrations thủ công.
- **Cách sửa:**
  - [ ] `pg_dump --schema-only` từ DB hiện tại
  - [ ] Đặt vào `database/init.sql` cho Docker container tự chạy khi khởi tạo
  - [ ] Giữ migrations cho incremental changes
- **Ước lượng:** 2 giờ
- **Test:**
  - [ ] Xóa volume postgres → `docker compose up` → DB có đầy đủ schema

---

### TASK-025: Cấu hình DB backup tự động production

- **Mức độ:** 🟡 Trung bình
- **File:** `.env`, scheduler
- **Cách sửa:**
  - [ ] Set `ENABLE_DB_BACKUP=true` trong production env
  - [ ] Cấu hình `BACKUP_DATABASE_URL`, `PG_DUMP_PATH`, `BACKUP_RETENTION_DAYS`
  - [ ] Verify backup cron chạy đúng
- **Ước lượng:** 2 giờ
- **Test:**
  - [ ] Chạy thủ công → file backup tạo thành công
  - [ ] File cũ quá `BACKUP_RETENTION_DAYS` → bị xóa tự động

---

### TASK-026: Chuyển migrations sang Knex

- **Mức độ:** 🟢 Thấp (dài hạn)
- **Files:** `database/migrations/`, `backend/scripts/migrations/`
- **Vấn đề:** Migration thủ công, không tracking, không rollback.
- **Cách sửa:**
  - [ ] `npx knex init` tạo `knexfile.js`
  - [ ] Chuyển SQL migrations sang format Knex (`exports.up` / `exports.down`)
  - [ ] Thêm migration tracking table
  - [ ] Xóa scripts `run-migration-*.js` cũ
- **Ước lượng:** 1 ngày
- **Test:**
  - [ ] `npx knex migrate:latest` → chạy OK
  - [ ] `npx knex migrate:rollback` → revert thành công

---

## Giai Đoạn 5 — Refactor Theo Module

> Tách từng trang/module nhỏ. Mỗi batch xong phải test trước khi tiếp.

### TASK-027: Batch 01 — Website `/system/adobe-edu` (checkprofile.tsx)

- **Mức độ:** 🟡 Refactor
- **File:** `Website/my-store/apps/web/src/features/CheckProfile/checkprofile.tsx` (799 dòng)
- **Cách sửa:**
  - [ ] Tách thành: `components/`, `hooks/`, `api/`, `types/`
  - [ ] Giữ nguyên route + UI/UX + payload API
- **Test:**
  - [ ] Kiểm tra profile thành công / hết hạn / error
  - [ ] OTP send / verify
  - [ ] UI không thay đổi

---

### TASK-028: Batch 02 — Website `/system/renew-adobe` (RenewAdobePage.tsx)

- **Mức độ:** 🟡 Refactor
- **File:** `Website/my-store/apps/web/src/features/CheckProfile/RenewAdobePage.tsx` (600 dòng)
- **Cách sửa:**
  - [ ] Tách status renderer + submit handlers + api adapter
  - [ ] Chuẩn hóa state machine cho các trạng thái
- **Test:**
  - [ ] active / no_order / order_expired
  - [ ] activate-success + text "Login lại và chọn đúng Profile"

---

### TASK-029: Batch 03 — Website Service Hub sidebar/router

- **Mức độ:** 🟢 Refactor
- **Files:**
  - `Website/.../ServicesSidebar.tsx`
  - `Website/.../hooks/useRouter.ts`
  - `Website/.../lib/constants/serviceHubRoutes.ts`
- **Cách sửa:**
  - [ ] Xóa alias route cũ (`/system`, `/check-profile`, `/otp`) → 1 map duy nhất
- **Test:**
  - [ ] Click 4 mục sidebar → URL đổi đúng
  - [ ] Reload trên từng URL → vào đúng page

---

### TASK-030: Batch 04 — Backend scheduler domain split

- **Mức độ:** 🟡 Refactor
- **Files:** `backend/src/scheduler/tasks/*`
- **Cách sửa:**
  - [ ] Tách thành `queries/`, `rules/`, `dispatchers/`
  - [ ] Trích xuất SQL date arithmetic chung
- **Test:**
  - [ ] Run `notifyFourDays`, `notifyZeroDays` test mode
  - [ ] Số lượng đơn gửi và log skip đúng rule

---

### TASK-031: Batch 05 — Backend telegram notification lib

- **Mức độ:** 🟡 Refactor
- **Files:** `backend/src/services/telegramOrderNotificationLib/*`
- **Cách sửa:**
  - [ ] Tách builder + sender + retry policy
  - [ ] Gom sender chung giữa `sendFourDays` và `sendZeroDays`
- **Test:**
  - [ ] `/api/test-telegram` → gửi OK
  - [ ] `/api/test-telegram/zero-days` → gửi OK

---

### TASK-032: Batch 06 — Backend renewal pricing flow

- **Mức độ:** 🟡 Refactor
- **File:** `backend/webhook/sepay/renewal.js`
- **Cách sửa:**
  - [ ] Tách thành: `pricing-resolver`, `eligibility`, `task-queue`
- **Test:**
  - [ ] `runRenewal` với đơn MAVL/MAVK/MAVT
  - [ ] Giá thông báo 4 ngày đúng theo pct_promo

---

### TASK-033: Batch 07 — Frontend Pricing/Orders hooks

- **Mức độ:** 🟡 Refactor
- **Files:** `frontend/src/features/pricing/hooks/*`, `frontend/src/features/orders/hooks/*`
- **Cách sửa:**
  - [ ] Tách hook lớn thành hook nhỏ hơn
  - [ ] Extract shared logic
- **Test:**
  - [ ] Thêm/sửa/xóa NCC
  - [ ] Thay đổi giá, reload bảng giá
  - [ ] Mở row details

---

## Giai Đoạn 6 — Tối Ưu Nâng Cao (Dài hạn)

### TASK-034: Code splitting cho heavy dependencies

- [ ] Dynamic import `xlsx` chỉ khi export Excel
- [ ] Dynamic import `@tiptap/*` chỉ ở Content editor
- [ ] Dynamic import `recharts` chỉ ở Dashboard

### TASK-035: Session store chuyển Redis

- [ ] Cài `connect-redis`
- [ ] Cấu hình Redis container trong docker-compose
- [ ] Thay `express-session` store

### TASK-036: Queue system cho background jobs

- [ ] Cài BullMQ + Redis
- [ ] Chuyển cron jobs sang job queue
- [ ] Thêm retry, dead letter queue

### TASK-037: API versioning

- [ ] Prefix `/api/v1/` cho tất cả routes hiện tại
- [ ] Middleware redirect `/api/*` → `/api/v1/*` để backward compatible

### TASK-038: E2E testing

- [ ] Cài Playwright cho frontend
- [ ] Tests cho: login, tạo đơn, bảng giá, dashboard
- [ ] Chạy trong CI/CD

---

## Bảng Tổng Hợp

| Giai đoạn | Số tasks | Ước lượng | Trạng thái |
|---|---|---|---|
| 1. Bảo mật | 7 | 1-2 ngày | ⬜ Chưa bắt đầu |
| 2. Hiệu năng | 5 | 3-5 ngày | ⬜ Chưa bắt đầu |
| 3. Kiến trúc | 8 | 1-2 tuần | ⬜ Chưa bắt đầu |
| 4. DevOps | 6 | 1 tuần | ⬜ Chưa bắt đầu |
| 5. Refactor | 7 | 2-3 tuần | ⬜ Chưa bắt đầu |
| 6. Nâng cao | 5 | dài hạn | ⬜ Chưa bắt đầu |
| **Tổng** | **38** | | |

---

*Cập nhật trạng thái sau mỗi task hoàn thành. Đánh dấu `[x]` cho checkbox đã xong.*

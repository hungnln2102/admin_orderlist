# Đánh Giá Tổng Quan Dự Án — Admin Order List

> **Ngày đánh giá:** 10/04/2026
> **Phạm vi:** Toàn bộ `admin_orderlist` (backend, frontend, infra, database)

---

## Mục Lục

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Đánh Giá Bảo Mật](#2-đánh-giá-bảo-mật)
3. [Đánh Giá Hiệu Năng](#3-đánh-giá-hiệu-năng)
4. [Đánh Giá Kiến Trúc & Code Quality](#4-đánh-giá-kiến-trúc--code-quality)
5. [Dữ Liệu Cố Định Trong Code (Hardcode)](#5-dữ-liệu-cố-định-trong-code-hardcode)
6. [Đánh Giá Frontend](#6-đánh-giá-frontend)
7. [Đánh Giá Hạ Tầng & DevOps](#7-đánh-giá-hạ-tầng--devops)
8. [Đánh Giá Database](#8-đánh-giá-database)
9. [Roadmap Tối Ưu Theo Thứ Tự Ưu Tiên](#9-roadmap-tối-ưu-theo-thứ-tự-ưu-tiên)
10. [Tổng Kết Điểm Số](#10-tổng-kết-điểm-số)

---

## 1. Tổng Quan Dự Án

### Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Backend API | Node.js + Express 5 | Express 5.1.0 |
| Database | PostgreSQL | via `pg` 8.16 + `knex` 3.1 |
| Frontend | React 18 + Vite + TypeScript | React 18.3.1, Vite 7.2 |
| Styling | TailwindCSS 3.4 | |
| Scheduler | node-cron 4.2 | |
| Automation | Playwright 1.58 (Adobe Renew) | |
| Container | Docker Compose 3.8 | Node 20 Alpine + Nginx 1.27 |
| Logger | Winston + Daily Rotate | |

### Quy Mô

- **Backend:** ~70+ route files, ~25 controller modules, 5 cron jobs, 1 webhook server riêng
- **Frontend:** ~25 feature modules, ~55 trang/components lớn
- **Database:** 15+ schemas, 31 migration files
- **Shared:** 1 package dùng chung giữa backend/frontend (`shared/`)

### Kiến Trúc Tổng Quan

```
Client (React SPA)
  └─▶ Nginx (:8081)
       └─▶ Backend API (:3001)
            ├─ Express App (routes, controllers, middleware)
            ├─ Scheduler (node-cron, cùng process)
            └─ PostgreSQL
       └─▶ Sepay Webhook (:5000, cùng process Node)
```

---

## 2. Đánh Giá Bảo Mật

### 🔴 Nghiêm Trọng (Cần sửa ngay)

#### 2.1 So sánh mật khẩu dạng plaintext
**File:** `backend/src/controllers/AuthController/index.js` dòng 71-72

```javascript
isMatch = password === hashString || password === hashString.trim();
```

**Vấn đề:** Nếu mật khẩu trong DB không phải bcrypt hash (ví dụ: tài khoản cũ chưa migrate), hệ thống so sánh plaintext trực tiếp — không có timing-safe comparison.

**Cách sửa:**
- Bắt buộc tất cả mật khẩu phải là bcrypt hash.
- Thêm migration script chuyển plaintext → bcrypt.
- Loại bỏ nhánh so sánh plaintext.

#### 2.2 Telegram Chat ID cố định trong code
**File:** `backend/src/config/dbSchema/env.js` dòng 95

```javascript
const NOTIFICATION_GROUP_ID = process.env.TELEGRAM_CHAT_ID || "-1002934465528";
```

**Vấn đề:** Chat ID thật của nhóm Telegram nằm ngay trong source code. Nếu repo bị lộ, kẻ tấn công có thể gửi tin nhắn spam vào nhóm.

**Cách sửa:** Bỏ fallback, bắt buộc đặt trong `.env`. Nếu thiếu thì tắt tính năng thông báo.

#### 2.3 CSRF bị tắt mặc định
**File:** `backend/src/middleware/csrfProtection.js` dòng 84

```javascript
const csrfEnabled = process.env.ENABLE_CSRF === "true" || process.env.ENABLE_CSRF === "1";
if (!csrfEnabled) return next();
```

**Vấn đề:** CSRF protection chỉ hoạt động khi đặt biến môi trường. Mặc định bị tắt → tất cả state-changing requests (POST/PUT/DELETE) không được bảo vệ.

**Cách sửa:** Đảo logic — CSRF bật mặc định, chỉ tắt khi `DISABLE_CSRF=true` (cho môi trường dev).

### 🟡 Trung Bình

#### 2.4 Session secret fallback không an toàn
**File:** `backend/src/config/appConfig.js` dòng 106

```javascript
const sessionSecret = process.env.SESSION_SECRET || "change_this_secret";
```

Production chỉ log warning, không fail. Nên throw error ngay nếu production thiếu `SESSION_SECRET`.

#### 2.5 Rate limiting quá lỏng
**File:** `backend/src/middleware/rateLimiter.js`

| Loại | Hiện tại | Khuyến nghị Production |
|---|---|---|
| API chung | 500 req/15 phút | 100-200 req/15 phút |
| Login | 30 lần/15 phút | 5-10 lần/15 phút |
| Sensitive | 50 req/giờ | 10-20 req/giờ |

Hiện comment ghi "increased for development" nhưng giá trị này đang chạy cả production.

**Cách sửa:** Dùng biến env để cấu hình rate limit riêng cho dev/prod.

#### 2.6 Không giới hạn kích thước request body
**File:** `backend/src/app.js` dòng 63

```javascript
app.use(express.json());
```

Không có `{ limit: '10kb' }` hoặc tương tự → có thể bị DoS bằng JSON payload lớn.

#### 2.7 Env-based fallback login
**File:** `backend/src/controllers/AuthController/index.js` dòng 31-44

Cho phép đăng nhập bằng `DEFAULT_ADMIN_USER` / `DEFAULT_ADMIN_PASS` từ env, so sánh plaintext. Nếu env này bị lộ, attacker login thẳng vào admin.

**Cách sửa:** Chỉ cho phép fallback login khi `NODE_ENV !== 'production'`.

### 🟢 Tốt

- Helmet được cấu hình đầy đủ CSP.
- CORS whitelist dựa trên env, normalize origin chuẩn.
- Webhook có HMAC signature verification (timing-safe).
- Webhook có API key verification.
- Bcrypt salt rounds = 10 (chuẩn).
- Password hash check dùng `bcrypt.compare()` cho hash hợp lệ.

---

## 3. Đánh Giá Hiệu Năng

### 🔴 Nghiêm Trọng

#### 3.1 Nhiều connection pool cùng lúc tới 1 database

| Pool | File | Max connections |
|---|---|---|
| Main (pg) | `config/database.js` | 20 |
| Knex | `db/index.js` | mặc định 10 |
| Webhook (pg) | `webhook/sepay/config.js` | 5 |
| Scheduler (pg) | `scheduler/config.js` | riêng |

**Tổng:** Ít nhất **35-40 connections** có thể mở cùng lúc, trong khi PostgreSQL mặc định chỉ cho phép 100. Với 3-4 pool riêng biệt, không có connection reuse giữa các module.

**Cách sửa:**
- Hợp nhất thành 1 pool duy nhất (hoặc tối đa 2: Knex cho API, pg Pool cho scheduler).
- Cấu hình `max` qua env: `DB_POOL_MAX=15`.

#### 3.2 Server timeout 15 phút
**File:** `backend/src/server.js` dòng 17-19

```javascript
const LONG_MS = 900_000;
server.requestTimeout = LONG_MS;
server.headersTimeout = LONG_MS + 10_000;
```

**Vấn đề:** Tất cả API requests đều có timeout 15 phút (vì Playwright Adobe flow). Nếu có request lỗi, nó giữ connection 15 phút trước khi timeout → cạn kiệt resources.

**Cách sửa:** Chỉ tăng timeout cho routes cụ thể (renew-adobe), giữ default 30-60s cho phần còn lại.

#### 3.3 Không có caching
Không thấy bất kỳ cache layer nào (Redis, in-memory). Mỗi request tính toán pricing đều query DB → truy vấn trùng lặp liên tục.

**Đề xuất:**
- Cache variant pricing 5-10 phút (node-cache hoặc LRU cache).
- Cache supplier list, bank list (ít thay đổi).
- Cache dashboard stats 1-2 phút.

### 🟡 Trung Bình

#### 3.4 Static files không có cache headers
**File:** `backend/src/app.js` dòng 64-72

```javascript
app.use("/image", express.static(path.join(__dirname, "../image")));
```

Không đặt `maxAge`, `etag`, `lastModified` → browser phải tải lại ảnh mỗi lần.

**Cách sửa:**
```javascript
app.use("/image", express.static(path.join(__dirname, "../image"), {
  maxAge: '30d',
  etag: true,
}));
```

#### 3.5 SQL injection tiềm ẩn trong search
**File:** `backend/src/services/orderService.js` dòng 118-119

```javascript
builder.where(COLS.ORDER.ID_ORDER, "like", `%${search}%`)
```

Knex tự parameterize nên không bị SQL injection trực tiếp, nhưng `LIKE` wildcard `%` trong search không được sanitize → user có thể gửi `%` để kéo toàn bộ dữ liệu.

#### 3.6 ETag bị tắt hoàn toàn
**File:** `backend/src/app.js` dòng 27

```javascript
app.set("etag", false);
```

Giúp tránh 304 + body rỗng cho admin panel, nhưng cũng bỏ mất khả năng browser cache responses.

### 🟢 Tốt

- Winston + Daily Rotate File cho log management.
- Telegram error notifier tự động gửi lỗi 500.
- Scheduler dùng timezone-aware cron.

---

## 4. Đánh Giá Kiến Trúc & Code Quality

### 🔴 Nghiêm Trọng

#### 4.1 Dual ORM: raw `pg` Pool + Knex
Backend dùng **cả hai** driver database:
- `pg.Pool` → `config/database.js`, scheduler, webhook
- `knex` → `db/index.js`, controllers, services

**Vấn đề:** Không nhất quán, khó maintain, không thể dùng chung transaction giữa hai driver.

**Cách sửa:** Chọn 1 — Knex cho tất cả (đã có sẵn query builder, migration support).

#### 4.2 Webhook server chạy cùng process API
**File:** `backend/src/server.js` dòng 23-26

```javascript
sepayWebhookApp.listen(sepay.port, sepay.host, () => { ... });
```

Nếu webhook handler crash → cả API server cũng chết. Nếu API server quá tải → webhook bị ảnh hưởng (payment mất).

**Cách sửa:** Tách webhook thành process riêng hoặc container riêng trong docker-compose.

#### 4.3 Scheduler chạy cùng process API
**File:** `backend/src/server.js` dòng 5

```javascript
const scheduler = require("../scheduler");
```

Cron jobs chạy cùng process → nếu cron job nặng (ví dụ: Adobe check hàng giờ dùng Playwright), nó block event loop của API.

**Cách sửa:** Scheduler nên chạy riêng (`node scheduler.js`) hoặc container riêng.

#### 4.4 ORDER_PREFIXES trùng key
**File:** `backend/src/utils/orderHelpers.js` dòng 6-14

```javascript
const ORDER_PREFIXES = {
  tang: "MAVT",
  thuong: "MAVT",  // ← trùng với "tang"!
};
```

`tang` (quà tặng) và `thuong` (thường) đều map sang `MAVT` → logic `resolveOrderKind()` sẽ không phân biệt được.

### 🟡 Trung Bình

#### 4.5 Controller quá lớn
Một số controller có rất nhiều logic (ví dụ: `RenewAdobeController` có 12 files, `Order` có 15+ files) nhưng chưa tách thành domain/use-case rõ ràng.

#### 4.6 Thiếu validation layer thống nhất
Một số route dùng `express-validator`, phần lớn validate trực tiếp trong handler → không nhất quán, dễ bỏ sót.

#### 4.7 Error handling không đồng đều
Có `asyncHandler` wrapper nhưng không phải tất cả routes đều dùng → uncaught Promise rejection vẫn có thể xảy ra.

#### 4.8 Thiếu health check endpoint
Không có `/health` hoặc `/readiness` endpoint cho Docker healthcheck và load balancer monitoring.

### 🟢 Tốt

- Shared schema (`shared/`) giữa backend/frontend — đồng bộ field names.
- `dbSchema` module hóa tốt, schema names lấy từ env.
- Field mapper pattern (`fieldMapper.ts`) giúp đồng bộ column names.
- Error handler centralized với `AppError` class.
- Logger có child logger support.

---

## 5. Dữ Liệu Cố Định Trong Code (Hardcode)

### Cần Chuyển Sang Cấu Hình (env hoặc database)

| # | Giá trị | File | Mô tả | Mức độ |
|---|---|---|---|---|
| 1 | `ORDER_PREFIXES` | `utils/orderHelpers.js` | Tiền tố mã đơn (MAVC, MAVL...) | 🔴 Cao |
| 2 | `"-1002934465528"` | `dbSchema/env.js:95` | Telegram group ID | 🔴 Cao |
| 3 | `RENEWAL_TOPIC_ID = 2` | `dbSchema/env.js:96` | Telegram topic ID fallback | 🟡 TB |
| 4 | `SESSION_COOKIE_MS = 3600000` | `AuthController/index.js:15` | Thời lượng session 1 giờ | 🟡 TB |
| 5 | `days = 30` | `pricing/core.js:147` | Số ngày mặc định đơn hàng | 🟡 TB |
| 6 | `maxAge: 1000*60*60*1` | `app.js:85` | Cookie max age 1 giờ | 🟡 TB |
| 7 | `max: 20` | `config/database.js:8` | Max DB connections | 🟡 TB |
| 8 | `500` | `rateLimiter.js:19` | Rate limit API | 🟡 TB |
| 9 | `30` | `rateLimiter.js:37` | Rate limit login | 🟡 TB |
| 10 | `bcrypt rounds = 10` | `AuthController/index.js:179` | Số rounds hash | 🟢 Thấp |
| 11 | `LONG_MS = 900_000` | `server.js:17` | Server request timeout | 🟡 TB |
| 12 | `windowMs: 15*60*1000` | `rateLimiter.js:18` | Rate limit window | 🟢 Thấp |

### Đề Xuất Cấu Trúc Config Mới

```javascript
// config/appConfig.js - mở rộng
module.exports = {
  // ... existing
  rateLimit: {
    api: { max: env('RATE_LIMIT_API_MAX', 200), windowMs: env('RATE_LIMIT_WINDOW_MS', 15*60*1000) },
    auth: { max: env('RATE_LIMIT_AUTH_MAX', 10) },
  },
  db: {
    poolMax: env('DB_POOL_MAX', 15),
    idleTimeout: env('DB_IDLE_TIMEOUT', 30000),
  },
  session: {
    maxAge: env('SESSION_MAX_AGE_MS', 3600000),
  },
  order: {
    defaultDays: env('ORDER_DEFAULT_DAYS', 30),
  },
  telegram: {
    groupId: requireEnv('TELEGRAM_CHAT_ID'),
    topicId: env('TELEGRAM_TOPIC_ID', null),
  },
};
```

---

## 6. Đánh Giá Frontend

### 🔴 Nghiêm Trọng

#### 6.1 Không lazy-load routes
**File:** `frontend/src/routes/AppRoutes.tsx`

Tất cả 25+ feature modules được import trực tiếp (không `React.lazy()`) → bundle size lớn, tải chậm lần đầu.

```typescript
// Hiện tại — import tất cả ngay
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import Orders from "@/features/orders/index.tsx";
// ... 20+ imports khác

// Nên chuyển sang
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const Orders = lazy(() => import("@/features/orders/index.tsx"));
```

#### 6.2 Trùng lặp field `expiry_date` trong type Order
**File:** `frontend/src/constants.ts` dòng 201-203

```typescript
export interface Order {
  expiry_date: string;   // dòng 201
  expiry_date?: string;  // dòng 203 ← trùng!
}
```

TypeScript cho phép nhưng gây nhầm lẫn, field sau ghi đè field trước.

### 🟡 Trung Bình

#### 6.3 API calls không centralized
Một số feature dùng `apiFetch` từ `lib/api`, số khác dùng `axios` trực tiếp → không nhất quán, khó thêm interceptor chung (auth token refresh, error handling).

#### 6.4 Không có global error boundary cho API calls
`ErrorBoundary` chỉ bắt render errors, không bắt async/API errors. Không có global toast/notification khi API trả 500.

#### 6.5 `AuthContext` thiếu token refresh
Khi session hết hạn (1 giờ), user không được redirect tự động. Phải F5 để phát hiện session đã chết.

#### 6.6 Bundle dependency nặng
- `xlsx` (SheetJS) ~1MB — chỉ dùng cho export Excel
- `framer-motion` ~140KB — có thể thay bằng CSS animations cho phần lớn use cases
- `recharts` ~300KB — chỉ dùng ở Dashboard
- `@tiptap/*` ~500KB — chỉ dùng ở Content editor

**Tổng:** ~2MB+ chỉ riêng dependencies này, tải cùng lúc cho tất cả routes.

### 🟢 Tốt

- Feature-based architecture rõ ràng (`features/*/`).
- TypeScript strict.
- TailwindCSS — ít CSS custom.
- Shared hooks pattern tốt (`useOrdersData`, `usePricingData`...).
- Field mapper đồng bộ với backend schema.

---

## 7. Đánh Giá Hạ Tầng & DevOps

### 🟡 Trung Bình

#### 7.1 Docker Compose thiếu resource limits

```yaml
backend:
  # Không có deploy.resources.limits
  # → Container có thể dùng hết RAM/CPU server
```

**Cách sửa:**
```yaml
backend:
  deploy:
    resources:
      limits:
        memory: 1G
        cpus: '1.0'
```

#### 7.2 Volume prune trong deploy script
**File:** `deploy.sh` dòng 38

```bash
docker volume prune -f 2>/dev/null || true
```

**Vấn đề:** Xóa TẤT CẢ unused volumes (kể cả volumes của service khác). Có thể mất dữ liệu ảnh đã upload nếu container đang rebuild.

**Cách sửa:** Bỏ `volume prune`, chỉ dùng `docker compose down` (không `-v`).

#### 7.3 Không có staging environment
Chỉ có 1 docker-compose.yml, deploy thẳng lên production. Không có staging để test trước.

#### 7.4 Frontend build arg cố định trong docker-compose
```yaml
args:
  VITE_API_BASE_URL: https://admin.mavrykpremium.store
```

Nên dùng `.env` file hoặc `${VITE_API_BASE_URL}`.

#### 7.5 Không có CI/CD pipeline
Deploy bằng script `deploy.sh` thủ công (git pull + docker build). Không có automated testing, linting, hay rollback plan.

### 🟢 Tốt

- Multi-stage Dockerfile cho frontend (deps → build → runtime nginx).
- BuildKit enabled cho cache optimization.
- Docker healthcheck cho PostgreSQL.
- Nginx cho production serving.
- `deploy.sh` có `--no-cache` option.

---

## 8. Đánh Giá Database

### 🟡 Trung Bình

#### 8.1 Migration không có hệ thống quản lý
Migrations là các file SQL riêng lẻ + script JS chạy thủ công:

```
scripts/migrations/run-migration-013.js
scripts/migrations/run-migration-014.js
...
```

Không có tracking bảng `migrations`, không biết migration nào đã chạy, không rollback.

**Cách sửa:** Dùng Knex migrations (đã có Knex trong project) để quản lý tự động.

#### 8.2 Schema phức tạp nhưng `init.sql` rỗng
`database/init.sql` chỉ có 2 dòng comment. Toàn bộ schema phải chạy migrations theo thứ tự → dễ bị lỗi khi setup mới.

**Cách sửa:** Tạo `init.sql` đầy đủ từ DB hiện tại để dùng cho setup mới.

#### 8.3 Quá nhiều schemas trong 1 database
15+ schemas (orders, product, partner, admin, finance, identity, common, promotion, wallet, form_desc, system_automation, key_active...) → phức tạp, khó query cross-schema.

#### 8.4 Không có DB backup tự động production
`ENABLE_DB_BACKUP` mặc định `false`. Backup cần cấu hình thủ công (Google Drive, pg_dump path).

---

## 9. Roadmap Tối Ưu Theo Thứ Tự Ưu Tiên

### Giai Đoạn 1: Bảo Mật Khẩn Cấp (1-2 ngày)

| # | Task | File | Ước lượng |
|---|---|---|---|
| 1.1 | Bỏ plaintext password comparison | `AuthController/index.js` | 30 phút |
| 1.2 | Bỏ fallback login trong production | `AuthController/index.js` | 15 phút |
| 1.3 | Bỏ hardcode Telegram Chat ID | `dbSchema/env.js` | 15 phút |
| 1.4 | Bật CSRF mặc định | `csrfProtection.js` | 30 phút |
| 1.5 | Thêm `express.json({ limit: '1mb' })` | `app.js` | 5 phút |
| 1.6 | Fail fast nếu prod thiếu SESSION_SECRET | `appConfig.js` | 10 phút |

### Giai Đoạn 2: Hiệu Năng Cốt Lõi (3-5 ngày)

| # | Task | Mô tả | Ước lượng |
|---|---|---|---|
| 2.1 | Hợp nhất DB connection pools | Bỏ raw `pg.Pool`, dùng Knex cho tất cả | 1 ngày |
| 2.2 | Tách timeout cho routes | Default 60s, renew-adobe 15 phút | 2 giờ |
| 2.3 | Thêm in-memory cache | node-cache cho variant pricing, supplier list | 4 giờ |
| 2.4 | Lazy-load frontend routes | `React.lazy` + `Suspense` cho tất cả features | 2 giờ |
| 2.5 | Static file cache headers | `maxAge: '30d'` cho image endpoints | 30 phút |
| 2.6 | Rate limit configurable qua env | Dùng env vars thay hardcode | 1 giờ |

### Giai Đoạn 3: Kiến Trúc & Bảo Trì (1-2 tuần)

| # | Task | Mô tả | Ước lượng |
|---|---|---|---|
| 3.1 | Tách Webhook thành process riêng | Container riêng trong docker-compose | 1 ngày |
| 3.2 | Tách Scheduler thành process riêng | Container riêng, dùng chung DB pool | 1 ngày |
| 3.3 | Chuyển migrations sang Knex | Quản lý tự động, tracking, rollback | 1 ngày |
| 3.4 | Thêm health check endpoint | `/health` cho Docker + load balancer | 1 giờ |
| 3.5 | Centralize validation | express-validator cho tất cả routes | 2-3 ngày |
| 3.6 | Chuyển ORDER_PREFIXES sang env/DB | Config bảng `app_settings` hoặc env | 4 giờ |
| 3.7 | Centralize API client (frontend) | 1 instance axios duy nhất với interceptors | 4 giờ |
| 3.8 | Sửa trùng ORDER_PREFIXES tang/thuong | Xóa hoặc tách `thuong` | 30 phút |

### Giai Đoạn 4: DevOps & Monitoring (1 tuần)

| # | Task | Mô tả | Ước lượng |
|---|---|---|---|
| 4.1 | Thêm resource limits cho Docker | CPU/RAM limits cho mỗi container | 1 giờ |
| 4.2 | Sửa deploy.sh volume prune | Bỏ `docker volume prune -f` | 10 phút |
| 4.3 | Tạo `init.sql` đầy đủ | Dump schema hiện tại cho fresh setup | 2 giờ |
| 4.4 | Thêm staging environment | docker-compose.staging.yml | 4 giờ |
| 4.5 | Cấu hình DB backup tự động | Bật `ENABLE_DB_BACKUP` + cron | 2 giờ |
| 4.6 | Thêm CI/CD cơ bản | GitHub Actions: lint → test → build | 1 ngày |

### Giai Đoạn 5: Tối Ưu Nâng Cao (dài hạn)

| # | Task | Mô tả |
|---|---|---|
| 5.1 | Code splitting frontend | Dynamic imports cho xlsx, tiptap, recharts |
| 5.2 | Session store chuyển sang Redis | Thay in-memory session → Redis (multi-instance) |
| 5.3 | Queue system cho background jobs | Bull/BullMQ thay thế node-cron |
| 5.4 | API versioning | `/api/v1/` prefix cho backward compatibility |
| 5.5 | Request/response logging structured | JSON log format chuẩn cho observability |
| 5.6 | Frontend state management | Zustand/Jotai nếu Context quá phức tạp |
| 5.7 | E2E testing | Playwright tests cho critical flows |

---

## 10. Tổng Kết Điểm Số

| Hạng mục | Điểm (1-10) | Ghi chú |
|---|---|---|
| **Bảo mật** | **5/10** | Plaintext password, CSRF tắt, rate limit lỏng |
| **Hiệu năng** | **5/10** | Không cache, nhiều pool, timeout quá cao |
| **Kiến trúc Backend** | **6/10** | Dual ORM, webhook/scheduler cùng process |
| **Kiến trúc Frontend** | **7/10** | Feature-based tốt, thiếu lazy loading |
| **Code Quality** | **7/10** | Logger tốt, error handler tốt, validation chưa đồng đều |
| **DevOps** | **4/10** | Không CI/CD, không staging, deploy thủ công |
| **Database** | **6/10** | Schema rõ ràng, migration thủ công |
| **Khả năng mở rộng** | **5/10** | Single process, không queue, không cache |
| **Test Coverage** | **3/10** | Rất ít test, không có E2E |
| **Tài liệu** | **6/10** | Có docs/, README, nhưng chưa đầy đủ |

### Điểm Tổng: **5.4/10**

**Nhận xét tổng quan:** Dự án có nền tảng tốt (feature-based frontend, schema module hóa, logging đầy đủ). Tuy nhiên, cần ưu tiên sửa các vấn đề bảo mật khẩn cấp, hợp nhất DB connections, và tách services để chuẩn bị cho scale.

---

*Tài liệu này sẽ được cập nhật sau mỗi giai đoạn refactor.*

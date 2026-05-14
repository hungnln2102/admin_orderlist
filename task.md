# Task — thống nhất cấu trúc admin_orderlist

Tài liệu tham chiếu kiến trúc: **`docs/STRUCTURE-SINGLE-DIRECTION.md`**.

**Quy tắc thực hiện:**

- Một PR = **một domain** (hoặc cụm rất nhỏ cùng ranh giới), không trộn với feature nghiệp vụ mới lớn.
- **Không đổi** path HTTP, query, body, response JSON khi chỉ migrate cấu trúc file (trừ task riêng ghi rõ breaking change).
- Sau mỗi slice: `npm run lint` trong `backend/` và `frontend/`; smoke tay domain đó.

---

## Phase 0 — Chuẩn bị

- [x] **P0.1** Đọc và chốt team với `docs/STRUCTURE-SINGLE-DIRECTION.md` (backend `domains/`, frontend `features/` + `shared/`).
- [x] **P0.2** (Tuỳ chọn) Thêm một dòng vào `.cursor/rules` hoặc CONTRIBUTING: *“Tính năng backend mới chỉ trong `src/domains/<domain>/`; không thêm controller/route legacy tách rời.”*

---

## Phase 1 — Skeleton & mount

- [x] **P1.1** Copy cấu trúc tham chiếu từ `domains/ip-whitelist/` hoặc `domains/site-maintenance/` làm template PR nội bộ (không cần commit file template trùng lặp — chỉ dùng khi tạo domain mới).
- [x] **P1.2** Ghi chú trong `routes/index.js` (comment ngắn) rằng mục tiêu cuối chỉ mount `domains/*/routes.js`; *(thực hiện dần, không block PR migrate đơn lẻ).*

---

## Phase 2 — Backend: map legacy → `domains/<name>`

Thứ tự gợi ý: **nhỏ / ít phụ thuộc → trung bình → nặng (orders, payments, renew).**

| Ưu tiên | Nguồn hiện tại (route / controller) | Domain đích `domains/` | Prefix mount (giữ nguyên) |
|--------|--------------------------------------|-------------------------|---------------------------|
| [x] T0 | Đã chuẩn — `routes/ipWhitelistRoutes.js` → `domains/ip-whitelist` | `ip-whitelist` | `/ip-whitelists` |
| [x] T0 | Đã chuẩn — site maintenance | `site-maintenance` | `/site-maintenance` |
| [x] T1 | `routes/banksRoutes` | `banks` | `/banks` |
| [x] T1 | `routes/categoriesRoutes` | `categories` | `/categories` |
| [x] T1 | `routes/promotionCodesRoutes` + liên quan | `promotion-codes` | `/` (mount gốc — giữ behavior) |
| [x] T2 | `routes/formInfoRoutes` | `form-info` | `/form-info` |
| [x] T2 | `routes/customerStatusRoutes` | `customer-status` | `/` |
| [x] T2 | `routes/accountsRoutes` | `accounts` | `/` |
| [x] T2 | `routes/savingGoalsController` | `saving-goals` | `/saving-goals` |
| [x] T2 | `routes/pricingTierRoutes` | `pricing-tiers` | `/pricing-tiers` |
| [x] T2 | `routes/storeProfitExpensesRoutes` | `store-profit-expenses` | `/store-profit-expenses` |
| [x] T2 | `routes/keyActiveRoutes` | `key-active` | `/key-active` |
| [x] T2 | `routes/warehouseRoutes` | `warehouse` | `/warehouse`, `/warehouses` |
| [x] T3 | `routes/suppliesRoutes` + `controllers/SuppliesController` (_handlers_) | `supplies` | `/supplies`; cả `GET /supply-insights` → gom vào domain `supplies` |
| [x] T3 | `routes/dashboardRoutes` + `DashboardController` | `dashboard` | `/dashboard` |
| [x] T3 | `routes/walletRoutes` | `wallet` | `/` |
| [x] T3 | `routes/paymentsRoutes` + `PaymentsController` | `payments` | `/` + paths con hiện có |
| [x] T4 | `routes/ordersRoutes` + `controllers/Order` | `orders` | `/orders` |
| [x] T4 | `routes/productsRoutes` + `ProductsController` | `products` | `/products` |
| [x] T4 | `routes/productPricesRoutes` | `product-prices` | `/product-prices` |
| [x] T4 | `routes/productDescriptionsRoutes` | `product-descriptions` | `/product-descriptions` |
| [x] T4 | `routes/productImagesRoutes` | `product-images` | `/product-images` |
| [x] T4 | `routes/variantImagesRoutes` | `variant-images` | `/variant-images` |
| [x] T4 | `routes/packagesRoutes` + `PackageController` | `package-products` | `/package-products` |
| [x] T4 | `routes/contentMediaRoutes`, `contentRoutes`, `ContentController` | `content` | `/content` |
| [x] T4 | `routes/publicContentRoutes` | `public-content` (hoặc `content/public`) | `/public/content` |
| [x] T4 | `routes/publicPricingRoutes` | `public-pricing` | `/public/pricing` |
| [x] T5 | `routes/authRoutes` + `AuthController` | `auth` | `/auth` |
| [x] T5 | `routes/systemRoutes` | `system` | `/` |
| [x] T5 | `routes/schedulerRoutes` + `SchedulerController` | `scheduler` | `/scheduler`, `GET /run-scheduler` |
| [x] T5 | `routes/renewAdobeRoutes` + `renewAdobePublicRoutes` + `RenewAdobeController` + proxy | `renew-adobe` | `/renew-adobe`, `/renew-adobe/public` |
| [x] — | `routes/testTelegram` | `test-telegram` (chỉ dev/prod flag) | `/test-telegram` |

**Việc con — Phase 2 (chỉ mount → `domains/`) — đã khớp cả bảng T0→T5 + test-telegram**

- [x] Tạo `domains/<name>/routes.js` (hoặc `mediaRoutes.js`, `publicRoutes.js`, `proxy.js` khi domain cần tách file — xem `content`, `renew-adobe`).
- [x] Đăng ký trong `routes/index.js` bằng `require('../domains/<name>/routes')` (không còn `routes/xxxRoutes.js` chỉ re-export cho các domain đã migrate).
- [x] Xóa file route legacy / stub sau khi không còn `require` (thư mục `backend/src/routes/` chỉ còn `index.js`, `v1.js`).
- [x] Lint backend: `npm run lint` trong `backend/` (exit 0; còn warnings cũ). *(Frontend: `npm run lint` hiện có lỗi sẵn trong repo — không nằm trong phạm vi Phase 2 mount.)*

**Việc con — Phase 2b (refactor sâu — lặp theo bảng §Phase 2b, một domain / PR)**

- [ ] Di chuyển logic từ `controllers/*` và `validators/*` vào `domains/<name>/controller|use-cases|validators/`; `grep`/`rg` toàn `backend/` và cập nhật `require`.
- [ ] Smoke tay path chính của **từng domain** sau mỗi PR 2b (không gói gọn một lần cho cả repo).

---

## Phase 2b — Refactor sâu: gom `controller/` + `validators/` vào `domains/<name>/`

### Đánh giá (phạm vi đã cố ý chưa làm ở Phase 2)

Sau Phase 2 (**mount** T0–T5), mọi domain dưới `domains/*/routes.js` vẫn có thể điều phối tới **`controllers/*`** và **`validators/*` toàn cục**. Việc **chuyển hẳn** controller/validator vào trong từng domain **chưa làm** để:

- Không phá luồng hệ thống thật (contract API, hành vi handler).
- Giữ phạm vi “dọn mount / cấu trúc entry” tách khỏi refactor logic + đường `require` khắp repo.

**Vẫn cố ý không đổi** trong slice 2b trừ khi có task riêng ghi rõ: **URL/path**, **middleware** toàn cục, **hình dạng request/response**.

### Chiến lược thực hiện (khuyến nghị)

1. **Một PR = một domain** (ưu tiên domain nhỏ, ít phụ thuộc).
2. Gợi ý thứ tự pilot: **`banks`** → **`categories`** → các domain còn lại trong bảng dưới.
3. Trong từng PR: di chuyển (hoặc tách dần) code từ `controllers/<X>` → `domains/<tên>/controller/` (và `use-cases/` / `repositories/` khi phù hợp mẫu `ip-whitelist`).
4. **`validators/`** chỉ dùng cho domain đó → `domains/<tên>/validators/`; cập nhật mọi `require` (dùng `grep` toàn `backend/`).
5. **`routes.js`** của domain chỉ còn nhiệm vụ **orchestrate** (mount rule, gọi handler mỏng).
6. Trước merge: `npm run lint` (backend) + **smoke tay** (hoặc test có sẵn) cho mọi endpoint domain đó.

### Việc con lặp lại cho mỗi domain (2b)

- [ ] `grep` / `rg` toàn repo các import tới controller & validator cũ; cập nhật sang `domains/<tên>/...`.
- [ ] Di chuyển file logic; giữ **re-export** tạm tại `controllers/<X>/index.js` **chỉ khi** còn chỗ ngoài domain gọi — rồi xóa sau khi hết reference.
- [ ] Không đổi path HTTP / JSON; so sánh nhanh response mẫu (dev).
- [ ] Ghi một dòng vào bảng **Trạng thái phiên** khi xong domain.

### Backlog domain còn logic ngoài `domains/` (sau mount Phase 2)

| Ưu tiên | Domain | Nguồn cần gom vào `domains/<tên>/` | Ghi chú |
|--------|--------|-------------------------------------|---------|
| ☐ 2b-1 | `banks` | `controllers/BanksController` | Ít phụ thuộc — pilot tốt. |
| ☐ 2b-2 | `categories` | `controllers/CategoriesController`, `validators/categoryValidator` | |
| ☐ 2b-3 | `promotion-codes` | `controllers/PromotionCodesController` | |
| ☐ 2b-4 | `form-info` | `controllers/FormDescController`, `validators/formDescValidator` | |
| ☐ 2b-5 | `customer-status` | `controllers/CustomerStatusController` | |
| ☐ 2b-6 | `accounts` | `controllers/AccountsController` | |
| ☐ 2b-7 | `saving-goals` | Logic đã trong `routes.js` — tách `use-cases/` + thin `routes` khi cần | Không bắt buộc trùng pattern controller folder. |
| ☐ 2b-8 | `pricing-tiers` | `controllers/PricingTierController`, `validators/pricingTierValidator` | |
| ☐ 2b-9 | `store-profit-expenses` | `controllers/StoreProfitExpensesController`, `validators/storeProfitExpensesValidator` | |
| ☐ 2b-10 | `key-active` | Logic đã trong domain — có thể tách `use-cases`/repo sau | Tùy độ phình file. |
| ☐ 2b-11 | `warehouse` | `controllers/WarehouseController`, `validators/warehouseValidator` | |
| — | `ip-whitelist`, `site-maintenance` | Đã theo mẫu domain đầy đủ | Theo dõi khi chỉnh nghiệp vụ. |

**Domain T3–T5** (`supplies`, `dashboard`, `payments`, `wallet`, `orders`, `products`, `product-*`, `package-products`, `content`/`mediaRoutes`, `public-content`, `public-pricing`, `auth`, `system`, `scheduler`, `renew-adobe`, `test-telegram`): cùng nguyên tắc Phase 2b — gom `controllers/*` + `validators/*` tương ứng khi tới lượt; riêng `content` có thêm `mediaRoutes.js` trong `domains/content/`; `renew-adobe` có thêm `publicRoutes.js` và `proxy.js`.

---

## Phase 3 — Frontend một hướng

- [ ] **F3.1** Rà soát `frontend/src/lib/api.ts`: chỉ re-export **mỏng** từ `shared/api/client`; chuyển `dashboardApi` và export type dashboard về `features/dashboard/api/`.
- [ ] **F3.2** Thống nhất import HTTP: ưu tiên `import { apiFetch, apiRequest, … } from '@/shared/api/client'` (hoặc `@/shared/api` nếu tạo barrel một tầng).
- [ ] **F3.3** Rà `lib/helpers.ts`: tách từng nhóm về `features/<x>/utils` hoặc `shared/utils` (chỉ khi ≥ 2 feature).
- [ ] **F3.4** (Tuỳ chọn) ESLint `no-restricted-imports` chặn import `lib/api` từ feature mới sau ngày chốt — áp dụng khi F3.1 xong.

---

## Phase 4 — Dọn dẹp & bảo toàn

- [x] **P4.1** `routes/index.js`: chỉ còn mount `../domains/*/routes` + `longTimeout`/proxy renew; không còn `require('./xxxRoutes')` legacy. *(Vẫn `require` trực tiếp `SchedulerController.runSchedulerNow` cho `GET /run-scheduler` và `middleware/authGuard` — chấp nhận tạm thời.)*
- [ ] **P4.2** Rà `validators/*.js` global: gắn về domain còn sót hoặc giữ tạm nếu dùng chung thật sự (ghi rõ comment).
- [ ] **P4.3** Smoke tổng: đăng nhập, dashboard, 1 đơn, 1 supply/product, renew hoặc health (tùy môi trường).
- [ ] **P4.4** Cập nhật `README.md` mục “Project Structure” một đoạn ngắn trỏ `docs/STRUCTURE-SINGLE-DIRECTION.md`.

---

## Trạng thái phiên (ghi tay khi làm)

| Ngày | Domain / task | PR / nhánh | Ghi chú |
|------|----------------|-----------|---------|
| 2026-04-30 | Chuẩn hoá checklist Phase 2 vs 2b | — | Tách việc con: mount [x]; gom controller/validator → Phase 2b. P4.1 [x]. Lint backend ok. |
| 2026-04-30 | Phase 2 T3–T4 domains | — | `dashboard`, `supplies`, `payments`, `wallet`, `orders`, `products`, `product-*`, `package-products`, `content` (+ `mediaRoutes`), `public-content`, `public-pricing`; xóa route file legacy tương ứng. |
| 2026-04-30 | Phase 0 + Phase 1 | — | Rule `backend-domains-only.mdc`; `domains/README.md`; comment `routes/index.js`; §8 `STRUCTURE-SINGLE-DIRECTION.md`. |
| 2026-04-30 | Phase 2 T0–T2 domains migrate | — | Banks, categories, promotion-codes, form-info, customer-status, accounts, saving-goals, pricing-tiers, store-profit-expenses, key-active, warehouse → `src/domains/*`; route legacy re-export. |
| 2026-04-30 | Dọn mount trực tiếp + xóa stub | — | `routes/index.js` require `../domains/*/routes`; xóa 12 file `routes/*` một dòng; xóa stub `SavingGoalsController`, `KeyActiveController`. |

---

## Định nghĩa xong (DoD) mỗi slice backend

1. Path và method không đổi so với trước migrate.
2. Response JSON không đổi (kể cả mã lỗi thông thường).
3. `npm run lint` (backend) pass.
4. Smoke tay hoặc test tự động liên quan pass.

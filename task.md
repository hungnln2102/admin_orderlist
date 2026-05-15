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
| ☑ 2b-1 | `banks` | `controllers/BanksController` | Hoàn tất direct cutover vào `domains/banks/controller`. |
| ☑ 2b-2 | `categories` | `controllers/CategoriesController`, `validators/categoryValidator` | Hoàn tất direct cutover vào `domains/categories/controller|validators`. |
| ☑ 2b-3 | `promotion-codes` | `controllers/PromotionCodesController` | Hoàn tất direct cutover vào `domains/promotion-codes/controller`. |
| ☑ 2b-4 | `form-info` | `controllers/FormDescController`, `validators/formDescValidator` | Hoàn tất direct cutover vào `domains/form-info/controller|validators`. |
| ☑ 2b-5 | `customer-status` | `controllers/CustomerStatusController` | Hoàn tất direct cutover vào `domains/customer-status/controller`. |
| ☑ 2b-6 | `accounts` | `controllers/AccountsController` | Hoàn tất direct cutover vào `domains/accounts/controller`. |
| ☑ 2b-7 | `saving-goals` | Logic đã trong `routes.js` — tách `use-cases/` + thin `routes` khi cần | Đã gom validator vào `domains/saving-goals/validators`. |
| ☑ 2b-8 | `pricing-tiers` | `controllers/PricingTierController`, `validators/pricingTierValidator` | Hoàn tất direct cutover vào `domains/pricing-tiers/controller|validators`. |
| ☑ 2b-9 | `store-profit-expenses` | `controllers/StoreProfitExpensesController`, `validators/storeProfitExpensesValidator` | Hoàn tất direct cutover vào `domains/store-profit-expenses/controller|validators`. |
| ☑ 2b-10 | `key-active` | Logic đã trong domain — có thể tách `use-cases`/repo sau | Không còn phụ thuộc controller/validator global cho domain này. |
| ☑ 2b-11 | `warehouse` | `controllers/WarehouseController`, `validators/warehouseValidator` | Hoàn tất direct cutover vào `domains/warehouse/controller|validators`. |
| — | `ip-whitelist`, `site-maintenance` | Đã theo mẫu domain đầy đủ | Theo dõi khi chỉnh nghiệp vụ. |

**Domain T3–T5** (`supplies`, `dashboard`, `payments`, `wallet`, `orders`, `products`, `product-*`, `package-products`, `content`/`mediaRoutes`, `public-content`, `public-pricing`, `auth`, `system`, `scheduler`, `renew-adobe`, `test-telegram`): cùng nguyên tắc Phase 2b — gom `controllers/*` + `validators/*` tương ứng khi tới lượt; riêng `content` có thêm `mediaRoutes.js` trong `domains/content/`; `renew-adobe` có thêm `publicRoutes.js` và `proxy.js`.

---

## Phase 3 — Frontend một hướng

- [x] **F3.1** Rà soát `frontend/src/lib/api.ts`: chỉ re-export **mỏng** từ `shared/api/client`; chuyển `dashboardApi` và export type dashboard về `features/dashboard/api/`.
- [x] **F3.2** Thống nhất import HTTP: ưu tiên `import { apiFetch, apiRequest, … } from '@/shared/api/client'` (hoặc `@/shared/api` nếu tạo barrel một tầng).
- [x] **F3.3** Rà `lib/helpers.ts`: tách từng nhóm về `features/<x>/utils` hoặc `shared/utils` (chỉ khi ≥ 2 feature).
- [x] **F3.4** (Tuỳ chọn) ESLint `no-restricted-imports` chặn import `lib/api` từ feature mới sau ngày chốt — áp dụng khi F3.1 xong.

---

## Phase 4 — Dọn dẹp & bảo toàn

- [x] **P4.1** `routes/index.js`: chỉ còn mount `../domains/*/routes` + `longTimeout`/proxy renew; không còn `require('./xxxRoutes')` legacy. *(Vẫn `require` trực tiếp `SchedulerController.runSchedulerNow` cho `GET /run-scheduler` và `middleware/authGuard` — chấp nhận tạm thời.)*
- [x] **P4.2** Rà `validators/*.js` global: gắn về domain còn sót hoặc giữ tạm nếu dùng chung thật sự (ghi rõ comment).
- [ ] **P4.3** Smoke tổng: đăng nhập, dashboard, 1 đơn, 1 supply/product, renew hoặc health (tùy môi trường).
- [x] **P4.4** Cập nhật `README.md` mục “Project Structure” một đoạn ngắn trỏ `docs/STRUCTURE-SINGLE-DIRECTION.md`.

---

## Trạng thái phiên (ghi tay khi làm)

| Ngày | Domain / task | PR / nhánh | Ghi chú |
|------|----------------|-----------|---------|
| 2026-04-30 | Chuẩn hoá checklist Phase 2 vs 2b | — | Tách việc con: mount [x]; gom controller/validator → Phase 2b. P4.1 [x]. Lint backend ok. |
| 2026-04-30 | Phase 2 T3–T4 domains | — | `dashboard`, `supplies`, `payments`, `wallet`, `orders`, `products`, `product-*`, `package-products`, `content` (+ `mediaRoutes`), `public-content`, `public-pricing`; xóa route file legacy tương ứng. |
| 2026-04-30 | Phase 0 + Phase 1 | — | Rule `backend-domains-only.mdc`; `domains/README.md`; comment `routes/index.js`; §8 `STRUCTURE-SINGLE-DIRECTION.md`. |
| 2026-04-30 | Phase 2 T0–T2 domains migrate | — | Banks, categories, promotion-codes, form-info, customer-status, accounts, saving-goals, pricing-tiers, store-profit-expenses, key-active, warehouse → `src/domains/*`; route legacy re-export. |
| 2026-04-30 | Dọn mount trực tiếp + xóa stub | — | `routes/index.js` require `../domains/*/routes`; xóa 12 file `routes/*` một dòng; xóa stub `SavingGoalsController`, `KeyActiveController`. |
| 2026-05-14 | Dọn rác session credit | — | Bỏ `features/credit/data/demoCreditLogs.ts`; thay `localOverrides` bằng `reload()` từ `useCreditLogsFetch`; fix 5 ESLint errors FE (`orderListTransform`, `ordersHelpers`, `usePackageMutationActions`, `vietqrLocal`). |
| 2026-05-14 | Tier 1 chống code phình | — | Xóa shell `services/renew-adobe/adobeCheckService.js` (re-export 9 dòng, không ai dùng); sửa `.agents/SKILL.md` + `.cursor/rules/split-into-components.mdc` cho khớp code thật (V1 `adobe-http` đã bỏ); audit `dashboardSummary` vs `dashboardSummaryAggregate` xác nhận **không** duplicate (read vs write); thêm ESLint `max-lines: warn(400)` cho FE+BE. |
| 2026-05-14 | Pilot 1 — split PaymentsController | — | Tách `controllers/PaymentsController/index.js` (1077 dòng) thành: `index.js` 29 dòng (barrel), `shared/constants.js` 81, `shared/helpers.js` 62, `shared/dashboardDelta.js` 68, `handlers/*` (7 file 54–348 dòng). Không đổi route/contract. Smoke test require OK, lint 0 errors, max-lines warning của file gốc đã biến mất. |
| 2026-05-14 | Pilot 1b — sub-split `reconcilePaymentReceipt` | — | Tách tiếp file lớn nhất (348 dòng) thành: handler chính 223 dòng + `handlers/reconcile/auditLog.js` 11, `handlers/reconcile/dashboardAdjustment.js` 147, `handlers/reconcile/actionHandlers.js` 75. Smoke test pass, lint OK. |
| 2026-05-14 | Pilot 2 — split ProductDescriptionsController | — | Tách `controllers/ProductDescriptionsController/index.js` (936 dòng / 866 sau strip) thành: `index.js` 31 dòng (barrel), `shared/{constants,urlHelpers,cache,queries}.js` (33–126), `handlers/*` (5 file: list 181, create 186, save 195, delete 46, productImages 61 gộp 3 image handler). `websiteSeoAudit.js` giữ nguyên đường dẫn. Smoke test require + domain route load đều OK, lint 0 errors. |
| 2026-05-14 | Pilot 3 — split + rename `dashboardSummaryAggregate` | — | Xóa `controllers/DashboardController/dashboardSummaryAggregate.js` (665 dòng); thay bằng `dashboardSummaryQueries.js` 53 dòng (barrel) + `summaryQueries/` 7 file (`constants` 142, `summaryRebuild` 96, `rangeCompare` 119, `rangeCharts` 210 gộp monthly+daily, `grossSales` 43, `orderCounts` 78 gộp 3 birth count, `canceledCounts` 54 gộp 2 cancel count). Cập nhật 3 require sites (`monthlySnapshot.js`, `service.js`, `queries.js`). Đóng **DEBT-AUDIT-1**. Smoke test render SQL OK, lint 0 errors. |
| 2026-05-14 | Dọn warnings backend (Tier 1 nâng cấp) | — | Auto-fix 7 `prefer-const`. Thêm `caughtErrorsIgnorePattern` + `destructuredArrayIgnorePattern: "^_"` vào ESLint config (silence 27 `catch (_)`). Xóa unused imports (`updateDatabaseTask.js`, `supplies.js`, `finders.js`, `helpers.js`, `core.js`). Rename unused args sang `_x` (`errorHandler.js`, `normalize.js`, `usersListApi.js`, `messageBuilders.js`, `finders.js`). **Xóa dead code**: hàm `loadWalletScopeByIdMap`, `logWithContext`, `fillEmailInSlot` (V1 chết khi đã có V2), `waitForUsersPageReady`/`tryNavigateUsersViaUi`/`scrapeUsersPage` + 3 constants leftover, `extractProductIds`, biến `hasValidOrder`/`orderKindSync`/`logFile`/`SKIP_RE`. Kết quả: **72 → 13 warning** (riêng `max-lines`, tức nợ tách module pilot 4+). Smoke test 12 module load OK. |
| 2026-05-14 | Pilot 4 — split `mailOtpService` | — | Xóa `services/mailOtpService.js` (659 dòng); thay bằng folder `services/mailOtpService/` với `index.js` 37 dòng (barrel 11 exports) + `shared/{constants 14, imapClient 42, otpExtractor 67}` + `repository/mailBackupRepo.js` 36 + `handlers/{fetchOtpFromEmail 209 (kèm `fetchOtpFromAdobeEmail` + `hasOtpConfig`), getInboxCount 35, getConnectionDebug 39, listRecentEmails 81, fetchLastAdobeEmailRaw 82, fetchRecentWithEnvLogin 79}`. Factory `createImapClient` thay 6 chỗ `new ImapFlow({...})` (config env-driven y nguyên). Behavior-preserving: không gộp try/catch, không đổi return shape. Smoke test 11/11 exports + pure helpers + `otpProviderService` consumer resolve OK. Lint **13 → 12 warning** (mailOtpService out khỏi `max-lines`). |
| 2026-05-14 | Pilot 5 — split `supplier-change/service.js` | — | Giữ `domains/supplier-change/service.js` làm entry 42 dòng (validate + transaction), tách logic sang `domains/supplier-change/service/*`: `constants.js` 20, `errors.js` 11, `summary.js` 87, `flowHandlers.js` 256, `executor.js` 200. Không đổi route/response contract (`changeOrderSupplier`, `ChangeSupplierError`, `FLOWS`). Smoke test load `service` + `controller` + `orderUpdateService` OK. Lint backend **12 → 11 warning** (xóa hotspot `supplier-change/service.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 6 — split `assignmentService.js` | — | Giữ `controllers/RenewAdobeController/assignmentService.js` làm entry 16 dòng (barrel), tách logic sang `assignmentService/*`: `availableAccounts.js` 68, `helpers.js` 116, `assignSingle.js` 106, `fixRounds.js` 259. Không đổi API export (`buildAvailableAccounts`, `assignUserToAvailableAccount`, `fixUsersOneRoundTightest`, `fixUsersAllRoundsTightest`) nên `autoAssign.js` + `publicWebsite.js` không cần đổi import. Smoke test load 3 module OK. Lint backend **11 → 10 warning** (xóa hotspot `assignmentService.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 7 — split `orderUserTrackingService.js` | — | Giữ `services/renew-adobe/orderUserTrackingService.js` làm entry 32 dòng (barrel), tách logic sang `orderUserTrackingService/*`: `tables.js` 36, `helpers.js` 48, `counts.js` 60, `cleanupMaps.js` 106, `reconcile.js` 124, `upsert.js` 217. Không đổi API export (9 hàm public) nên các consumer (`accounts`, `checkAccounts`, `autoAssign`, `batchUsers`, `userOrdersAddTracking`, `renewAdobePurgeNoLicenseAccount`, `renewAdobePostCheckFlow`, `renewAdobeCleanup2330Flow`) không cần đổi import. Smoke test load toàn bộ consumer OK. Lint backend **10 → 9 warning** (xóa hotspot `orderUserTrackingService.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 8 — split `addUsersFlow.js` | — | Xóa `services/renew-adobe/adobe-renew-v2/flows/users/addUsersFlow.js` (529 dòng), thay bằng folder `addUsersFlow/`: `index.js` 4 (barrel), `config.js` 25, `responseHelpers.js` 107, `apiClients.js` 195, `fallbacks.js` 64, `runAddUsersFlow.js` 185. Không đổi contract `runAddUsersFlow` nên `flows/users/index.js`, `addUsersWithProductV2.js`, `autoAssign`, `batchUsers`, `renewAdobePostCheckFlow` giữ nguyên import. Smoke test load `flows/users` + `adobe-renew-v2` + consumer OK. Lint backend **9 → 8 warning** (xóa hotspot `addUsersFlow.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 9 — split `RenewAdobeController/accounts.js` | — | Giữ `controllers/RenewAdobeController/accounts.js` làm entry 26 dòng (barrel), tách logic sang `accounts/*`: `shared.js` 49, `mailBackupHandlers.js` 167, `accountHandlers.js` 320. Không đổi API export (`listMailBackupMailboxes`, `createMailBackupMailbox`, `listAccounts`, `lookupAccountByEmail`, `createAccount`, `deleteAccount`, `updateUrlAccess`, `updateAccount`) nên `RenewAdobeController/index.js` + `domains/renew-adobe/routes.js` không cần đổi import. Smoke test load `accounts`, `RenewAdobeController`, `renew-adobe/routes` OK. Lint backend **8 → 7 warning** (xóa hotspot `accounts.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 10 — split `RenewAdobeController/autoAssign.js` | — | Giữ `controllers/RenewAdobeController/autoAssign.js` làm entry 16 dòng (barrel), tách logic sang `autoAssign/*`: `shared.js` 62, `fixHandlers.js` 75, `autoAssignUsers.js` 212, `checkAllFlow.js` 217. Không đổi API export (`adobeQueueStatus`, `checkAllAccounts`, `runCheckAllAccountsFlow`, `autoAssignUsers`, `runAutoAssign`, `fixSingleUser`, `fixUsersRound`) nên route + scheduler (`renewAdobeCheckAndNotify`, `renewAdobeCleanup2330Flow`) giữ nguyên import. Smoke test load `autoAssign`, `RenewAdobeController`, `renew-adobe/routes`, scheduler tasks + `publicWebsite` OK. Lint backend **7 → 6 warning** (xóa hotspot `autoAssign.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 11 — split `userAddActions.js` | — | Giữ `services/renew-adobe/adobe-renew-v2/userAddActions.js` làm entry 14 dòng (barrel), tách logic sang `userAddActions/*`: `shared.js` 43, `modalLifecycle.js` 108, `slotActions.js` 190, `addUsersToOrgViaUI.js` 167, `tableHelpers.js` 34. Không đổi API export (`addUsersToOrgViaUI`, `selectUsersByEmails`, `waitForUserRowByEmail`) nên `addUsersWithProductV2`, `autoAssign`, `batchUsers`, `renewAdobePostCheckFlow` giữ nguyên import. Smoke test load service + consumer OK. Lint backend **6 → 5 warning** (xóa hotspot `userAddActions.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 12 — split `DashboardController/service.js` | — | Giữ `controllers/DashboardController/service.js` làm entry 24 dòng (barrel), tách logic sang `service/*`: `shared.js` 137 (date/key/tax helpers + shared constants), `stats.js` 125, `charts.js` 219, `summaryReads.js` 50. Không đổi API export (`fetchDashboardStats`, `fetchDashboardStatsForDateRange`, `fetchDashboardYears`, `fetchDashboardMonthlySummary`, `fetchDashboardChartsFromSummary`, `fetchDashboardChartsForDateRange`) nên `DashboardController/index.js` + consumer load không đổi. Smoke test load dashboard service + consumer OK. Lint backend **5 → 4 warning** (xóa hotspot `DashboardController/service.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 13 — split `usersListApi.js` | — | Giữ `services/renew-adobe/adobe-renew-v2/shared/usersListApi.js` làm entry 28 dòng (barrel), tách logic sang `usersListApi/*`: `shared.js` 192, `abp.js` 172, `jil.js` 203. Không đổi API export (`fetchUsersViaApi`, `fetchUsersViaAbpApi`, `captureUsersApiHeaders`, `extractOrgTokenFromUrl`, `normalizeOrgToken`, `buildForwardHeadersFromCapturedRequest`, `checkUserAssignedProduct`, `inferAdobeProProductIdSet`, `applyAdobeProFlags`, `hasAdobeProAccessFromProducts`, `extractAbpUserProductRefs`, `mapAbpUserToSnapshotUser`) nên các consumer trong `flows/users/*`, `addUsersWithProductV2`, `checkInfoFlow`, `removeProductAdminFlow`, `facade`, `orgProductsApi` giữ nguyên import. Smoke test load module + consumer OK. Lint backend **4 → 3 warning** (xóa hotspot `usersListApi.js` khỏi `max-lines`). |
| 2026-05-14 | Pilot 14 — split `dailyRevenueSummaryBackfill.js` | — | Giữ `services/dashboard/dailyRevenueSummaryBackfill.js` làm entry 15 dòng (barrel), tách logic sang `dailyRevenueSummaryBackfill/*`: `shared.js` 71, `sqlBuilder.js` 361, `runner.js` 75. Không đổi API export (`runDailyRevenueSummaryBackfill`, `defaultFrom22nd`, `vnTodayYmd`, `TAX_ORDER_LIST_FROM_DEFAULT`, `IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT`) nên scheduler `syncDailyRevenueSummaryTask` giữ nguyên import. Smoke test load service + scheduler OK. Lint backend **3 → 2 warning** (xóa hotspot `dailyRevenueSummaryBackfill.js` khỏi `max-lines`). |
| 2026-05-15 | Pilot 15 — split `StoreProfitExpensesController/index.js` | — | Giữ `controllers/StoreProfitExpensesController/index.js` làm entry 11 dòng (barrel), tách logic sang `StoreProfitExpensesController/*`: `shared.js` 148, `listStoreProfitExpenses.js` 72, `createStoreProfitExpense.js` 142, `updateStoreProfitExpense.js` 139, `deleteStoreProfitExpense.js` 60. Không đổi API export (`listStoreProfitExpenses`, `createStoreProfitExpense`, `updateStoreProfitExpense`, `deleteStoreProfitExpense`) nên domain route `store-profit-expenses/routes.js` giữ nguyên import. Smoke test load controller + route OK. Lint backend **2 → 1 warning** (xóa hotspot `StoreProfitExpensesController/index.js` khỏi `max-lines`). |
| 2026-05-15 | Pilot 16 — split `userAccountMappingService.js` | — | Giữ `services/userAccountMappingService.js` làm entry 3 dòng (barrel), tách logic sang `userAccountMappingService/*`: `index.js` 33, `shared.js` 36, `queryHelpers.js` 42, `syncOrders.js` 77, `mappingCrud.js` 179, `teamSync.js` 240. Không đổi API export (13 hàm public) nên các consumer trong `RenewAdobeController/*`, scheduler (`updateDatabaseTask`, `renewAdobePostCheckFlow`) và service (`renewAdobePurgeNoLicenseAccount`) giữ nguyên import. Smoke test load service + consumer OK. Lint backend **1 → 0 warning** (xóa hotspot `userAccountMappingService.js` khỏi `max-lines`). |
| 2026-05-15 | Wave 2 — dọn `react-hooks/exhaustive-deps` | — | Sửa 6 warning hook deps ở 5 file FE: `useSupplySelection.ts` (loại dependency dư), `useEditOrderLogic.ts` (tách biến `currentOrderCode` cho `useMemo`), `BudgetsGoals.tsx` (ổn định dependency với `availableCurrent/availablePrevious`), `EditFormModal.tsx` (bổ sung dependency `editingItem`), `useOrdersData.ts` (tách `resetModals` khỏi object để dependency ổn định). Verify: `npm --prefix frontend run lint` còn **87 warning** và **0 `react-hooks/exhaustive-deps`**; `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 3 (slice 1) — dọn `no-explicit-any` cụm API | — | Dọn typing debt ở `frontend/src/lib/productDescApi.ts`, `frontend/src/lib/formsApi.ts`, `frontend/src/shared/api/client.ts`: thay cast `as any` bằng parse `unknown/Record<string, unknown>` + helper normalize giữ nguyên contract runtime. Verify: `npm --prefix frontend run lint` còn **54 warning** (`no-explicit-any` **35**, `max-lines` **19**), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 3 (slice 2) — dọn hết `no-explicit-any` | — | Dọn sạch `@typescript-eslint/no-explicit-any` còn lại ở nhóm `pricing`, `product-price`, `product-info`, `supply`, `warehouse`, `view-supplier`, `bill-order`, `productPricesApi`, `usePricingTiers` (chuyển `any` sang `unknown`/typed record, giữ nguyên behavior). Verify: `npm --prefix frontend run lint` còn **19 warning** (toàn bộ là `max-lines`, **0 `no-explicit-any`**), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 1) — split `ExpenseCostAllocationTable.tsx` | — | Tách `frontend/src/features/expenses/components/ExpenseCostAllocationTable.tsx` thành 3 module: `expense-cost-allocation-table/helpers.ts` (types/constants/transform), `expense-cost-allocation-table/ExpenseAllocationTableView.tsx` (render table), và file entry `ExpenseCostAllocationTable.tsx` (state + fetch + wiring). Giữ nguyên API component + hành vi hiển thị/calc. Verify: `npm --prefix frontend run lint` còn **18 warning** (`max-lines`), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 2) — split `productInfoHelpers.ts` | — | Tách `frontend/src/features/product-info/utils/productInfoHelpers.ts` thành thư mục module `productInfoHelpers/*`: `types.ts`, `basic.ts`, `htmlSanitize.ts`, `htmlNormalize.ts`, `variantStatus.ts`, `mergeProducts.ts`, `index.ts`; giữ file cũ làm entry barrel 1 dòng để không đổi import path public. Không đổi API export các helper dùng bởi `useProductInfo`, `useProductEdit`, `VariantContentView`, `ProductCard/ProductRow` và các modal desc/category. Verify: `npm --prefix frontend run lint` còn **17 warning** (`max-lines`), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 3) — split `CreateOrderModal.tsx` | — | Tách `frontend/src/components/modals/CreateOrderModal/CreateOrderModal.tsx` theo boundary: giữ file chính làm container/wiring, chuyển logic derived + date/price handlers + option filters sang `hooks/useCreateOrderModalDerived.ts`, và tách 2 khối UI credit summary sang `components/CreateOrderCreditPanels.tsx`. Không đổi contract import/export của modal (`default export`) và không đổi luồng tạo đơn/credit. Verify: `npm --prefix frontend run lint` còn **16 warning** (`max-lines`), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 4) — split `QrModal.tsx` | — | Tách `frontend/src/features/invoices/components/QrModal.tsx` thành module con `qr-modal/*`: `types.ts`, `helpers.ts`, `useQrModalController.ts` (state + fetch batch/list/detail + handlers), `QrBatchToolsPanel.tsx`, `QrPreviewPanel.tsx`; file `QrModal.tsx` giữ vai trò shell layout + wiring props. Không đổi API export `QrModal` và hành vi tạo MAVG/đổ amount+note/hiển thị QR. Verify: `npm --prefix frontend run lint` còn **15 warning** (`max-lines`), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 5) — split `TaxDailyFormTable.tsx` | — | Tách `frontend/src/features/tax/components/TaxDailyFormTable.tsx` thành module `tax-daily-form-table/*`: `types.ts`, `helpers.ts` (cột/kỳ/tính phân bổ), `TaxDailyFormTableView.tsx` (render table). File `TaxDailyFormTable.tsx` giữ vai trò container và tiếp tục export type `TaxViewMode` để tương thích `TaxOverviewStats`. Không đổi behavior phân bổ theo ngày/tháng cho revenue/profit/refund. Verify: `npm --prefix frontend run lint` còn **14 warning** (`max-lines`), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 6) — split `UserOrdersTable.tsx` | — | Tách `frontend/src/features/renew-adobe/components/UserOrdersTable.tsx` thành module `user-orders-table/*`: `constants.ts`, `badges.tsx`, `types.ts`, `row-action-state.ts`, `row-actions.tsx`, `UserOrdersTableControls.tsx`, `UserOrdersTableCard.tsx`, `UserOrdersTableDesktopRow.tsx`; file `UserOrdersTable.tsx` giữ state/fetch/modal/wiring. Không đổi contract `UserOrdersTable` và luồng thao tác fix/delete/edit/renew trên cả mobile card và desktop table. Verify: `npm --prefix frontend run lint` còn **13 warning** (`max-lines`), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 7) — split `usePackageData.ts` | — | Tách `frontend/src/features/package-product/hooks/usePackageData.ts` theo module `use-package-data/*`: `types.ts`, `orderMatchers.ts`, `templateSync.ts`, `rowTransforms.ts`; file entry `usePackageData.ts` giữ API return shape cũ (`data/filters/actions`) và import path public không đổi. Không đổi behavior lọc/sort/thống kê slot/match order. |
| 2026-05-15 | Wave 4 (pilot 8) — split `BannersPage.tsx` | — | Tách `frontend/src/features/content/pages/BannersPage.tsx` thành module `banners-page/*`: `form.ts`, `HeroFormFields.tsx`, `BannerList.tsx`; giữ `BannersPage.tsx` làm container state + API actions + modal wiring. Không đổi route `/content/banners` và hành vi create/edit/toggle/reorder/delete banner. |
| 2026-05-15 | HOTFIX — restore export `htmlToPlainText` | — | Sửa `frontend/src/features/product-info/utils/productInfoHelpers.ts` từ `export * from "./productInfoHelpers"` sang `export * from "./productInfoHelpers/index"` để tránh self-resolution loop khi loader resolve module cùng tên file/folder. Khôi phục tương thích ngược cho import cũ `from ".../productInfoHelpers"` (bao gồm `htmlToPlainText`). |
| 2026-05-15 | Wave 4 (pilot 9) — split `useOrderActions.ts` | — | Tách `frontend/src/features/orders/hooks/useOrderActions.ts` thành module `use-order-actions/*`: `types.ts`, `createHandlers.ts`, `paymentHandlers.ts`, `mutationHandlers.ts`; file `useOrderActions.ts` giữ role entry mỏng và export type `OrderActionsDeps` như cũ. Không đổi contract hook và luồng create/renew/mark-paid/refund/edit/delete. |
| 2026-05-15 | Wave 4 (pilot 10) — split `useRenewAdobeAdmin.ts` | — | Tách phần streaming Check All của `frontend/src/features/renew-adobe/hooks/useRenewAdobeAdmin.ts` sang `use-renew-adobe-admin/checkAll.ts` + `types.ts`, giữ `useRenewAdobeAdmin.ts` làm orchestrator state/handlers. Không đổi API trả về cho `RenewAdobeAdminPage`/`RenewOrdersDeskPage`. Verify chung sau pilot 7→10 + hotfix: `npm --prefix frontend run lint` còn **9 warning** (`max-lines`), `npm --prefix frontend run test` pass 3 files / 9 tests. |
| 2026-05-15 | Wave 4 (pilot 11) — split `packageHelpers.ts` | — | Tách `frontend/src/features/package-product/utils/packageHelpers.ts` thành module `packageHelpers/*`: `types.ts`, `defaults.ts`, `constants.ts`, `availability.ts`, `normalizers.ts`, `matching.ts`, `forms.ts`, `prefs.ts`, `enhance.ts`, `index.ts`; giữ `packageHelpers.ts` làm entry barrel `export * from "./packageHelpers/index"` để không đổi import path public. Không đổi contract helper đang dùng bởi `usePackageData`, `usePackageMutationActions`, `usePackageTemplateActions`, `usePackageProductPage`, `packageMatchUtils` và các component/modals liên quan. Verify: `npm --prefix frontend run lint` còn **8 warning** (`max-lines`), `npm --prefix frontend run test` fail do thiếu binary `vitest` trong môi trường hiện tại. |
| 2026-05-15 | Wave 4 (pilot 12) — split `RichTextEditor.tsx` | — | Tách `frontend/src/features/product-info/components/EditProductModal/RichTextEditor.tsx` theo module `rich-text-editor/*`: `types.ts`, `constants.ts` (toolbar options + css text), `RichTextEditorToolbar.tsx`, `RichTextEditorSurface.tsx`; giữ file chính làm orchestrator state/mode + exec command. Không đổi API component (`default export RichTextEditor`) và behavior editor (visual/html mode, toolbar command, placeholder/canvas style). Verify: `npm --prefix frontend run lint` còn **7 warning** (`max-lines`). |
| 2026-05-15 | Wave 4 (pilot 13) — split `productActionHelpers.ts` | — | Tách `frontend/src/features/pricing/hooks/productActionHelpers.ts` thành module `product-action-helpers/*`: `types.ts`, `parsers.ts`, `forms.ts`, `suppliers.ts`, `validation.ts`, `json.ts`, `index.ts`; giữ file cũ làm entry barrel `export * from "./product-action-helpers/index"` để không đổi import path public cho `useProductActions`, `useProductReferenceOptions`, `useDeleteProductActions`, `ProductBasicsSection`. Không đổi validation/supplier payload contract. Verify: `npm --prefix frontend run lint` còn **6 warning** (`max-lines`). |
| 2026-05-15 | Wave 4 (pilot 14) — split `SupplyOrderCostsPanel.tsx` | — | Tách `frontend/src/features/supply/components/SupplyOrderCostsPanel.tsx` theo module `supply-order-costs-panel/*`: `types.ts`, `utils.ts`, `SupplyCostTabs.tsx`, `SupplyCostFilters.tsx`, `SupplyCostTable.tsx`; giữ file chính làm orchestrator state/data fetch + modal wiring. Không đổi behavior 2 tab (NCC costs/external import), search/filter/pagination, edit trace và tạo log. Verify: `npm --prefix frontend run lint` còn **5 warning** (`max-lines`). |
| 2026-05-15 | Wave 4 (pilot 15) — split `OrderRow.tsx` | — | Tách phần expandable detail của `frontend/src/features/orders/components/OrderRow.tsx` sang `order-row/OrderRowExpanded.tsx`; giữ `OrderRow.tsx` làm row chính + action handlers + QR prefetch hover. Không đổi contract `OrderRow` và luồng thao tác mark-paid/renew/refund/view/edit/delete. Verify: `npm --prefix frontend run lint` còn **4 warning** (`max-lines`). |
| 2026-05-15 | Wave 4 (pilot 16) — split `ReceiptsTable.tsx` | — | Tách `frontend/src/features/invoices/components/ReceiptsTable.tsx` thành module `receipts-table/*`: `ReceiptsExpandedDetailsRow.tsx`, `ReceiptsMatchConfirmModal.tsx`; giữ file chính làm orchestrator danh sách + state ghép mã + editing mã đơn. Không đổi luồng ghép mã đơn, modal confirm reconcile, expand chi tiết biên lai. Verify: `npm --prefix frontend run lint` còn **2 warning** (`max-lines`). |
| 2026-05-15 | Wave 4 (pilot 17) — split `useProductActions.ts` | — | Tách logic edit sản phẩm trong `frontend/src/features/pricing/hooks/useProductActions.ts` sang `use-product-actions/useProductEditActions.ts` (state edit, normalize input theo currency, submit PATCH + convert FX + map row). Giữ API return của `useProductActions` không đổi bằng cách re-export handlers/state từ hook con. Verify: `npm --prefix frontend run lint` còn **2 warning** (`max-lines`). |
| 2026-05-15 | Wave 4 (pilot 18) — split `ProductEditPanel.tsx` | — | Tách block preview giá trong `frontend/src/features/pricing/components/ProductEditPanel.tsx` sang `product-edit-panel/PricePreviewGrid.tsx`; file chính tập trung phần form product + bảng giá + actions. Không đổi contract props `ProductEditPanel` và behavior hiển thị preview. Verify: `npm --prefix frontend run lint` còn **1 warning** (`max-lines`). |
| 2026-05-15 | Wave 4 (pilot 19) — split `VariantContentView.tsx` | — | Tách nhóm modal của `frontend/src/features/product-info/views/VariantContentView.tsx` sang `variant-content-view/VariantContentModals.tsx` (create/view/edit/delete confirm). Giữ file chính cho table/card list + pagination + handlers dữ liệu. Không đổi luồng CRUD `desc_variant`. Verify: `npm --prefix frontend run lint` **0 warning**. |
| 2026-05-15 | Wave 4 (W5 gate) — lint + test frontend | — | Đồng bộ lại deps frontend bằng `npm --prefix frontend install` để khôi phục binary `vitest` trong `.bin` (trước đó script test lỗi `'vitest' is not recognized`). Verify lại: `npm --prefix frontend run lint` **0 warning**, `npm --prefix frontend run test -- --run` pass **3 files / 9 tests**. |
| 2026-05-15 | Phase 2b pilot loop (direct cutover) | — | Hoàn tất nhóm backlog 2b-1→2b-11: migrate `banks`, `categories`, `promotion-codes`, `form-info`, `customer-status`, `accounts`, `pricing-tiers`, `store-profit-expenses`, `warehouse` vào `domains/*/controller`; migrate validators: `category`, `formDesc`, `pricingTier`, `warehouse`, `savingGoal`, `storeProfitExpenses` vào `domains/*/validators`; xóa legacy files tương ứng. Gate pass: `npm --prefix backend run lint` + `npm --prefix backend run test` (20/20 suites). |
| 2026-05-15 | Phase 2b tiếp tục (batch wallet/scheduler/public-pricing/auth/dashboard + validators) | — | Migrate controller: `wallet`, `scheduler` (dùng cho `system`), `public-pricing`, `auth`, `dashboard` vào `domains/*/controller`; migrate validators: `wallet`, `auth`, `dashboard`, `product`, `package`, `ip-whitelist` vào `domains/*/validators`; cập nhật `routes/index.js` dùng `domains/scheduler/controller` và `server.js` dùng `domains/auth/controller`; xóa legacy files tương ứng. Gate pass nhiều vòng: `npm --prefix backend run lint` + `npm --prefix backend run test` đều pass. |
| 2026-05-15 | Phase 2b tiếp tục (pilot supplies direct cutover) | — | Migrate `controllers/SuppliesController/*` vào `domains/supplies/controller/*`, migrate `validators/supplyValidator` vào `domains/supplies/validators`, cập nhật `domains/supplies/routes.js` và các caller dùng `resolveSupplierNameColumn` sang path domain mới (`services/supplierService`, `controllers/ProductsController/handlers/supplies`, `controllers/Order/finance/supplierDebt`); xóa legacy files tương ứng. Gate pass: `npm --prefix backend run lint` + `npm --prefix backend run test` (20/20 suites). |
| 2026-05-15 | Phase 2b batch lớn (payments/orders/products/package/content/product-descriptions/renew-adobe + verifier) | — | Direct cutover hàng loạt: migrate `controllers/PaymentsController`, `Order`, `ProductsController`, `PackageController`, `ContentController`, `ProductDescriptionsController`, `RenewAdobeController` vào `domains/*/controller`; migrate `validators/contentValidator` vào `domains/content/validators`; cập nhật toàn bộ import liên quan ở `domains/*/routes`, `webhook/sepay/*`, `scripts/*`, `backend/tests/jest/*` và `backend/tests/manual/*`; xóa legacy files tương ứng. Gate pass cuối: `npm --prefix backend run lint` + `npm --prefix backend run test` (20/20 suites). |
| 2026-05-15 | Phase 3 frontend một hướng (F3.1→F3.4) | — | Tối giản `frontend/src/lib/api.ts` chỉ còn re-export mỏng từ `shared/api/client`; thêm barrel `features/dashboard/api/index.ts` + cập nhật import dashboard API/type qua barrel; chuẩn hoá toàn bộ import `lib/api` sang `shared/api/client` và `lib/helpers` sang `shared/utils` (thêm `shared/api/index.ts`, `shared/utils/index.ts`); bật ESLint `no-restricted-imports` chặn `lib/api`/`lib/helpers` path cũ. Gate pass: `npm --prefix frontend run lint`. |
| 2026-05-15 | Phase 4 (P4.2 + P4.4) | — | Hoàn tất rà validator global: di chuyển `src/validators/orderValidator.js` vào `domains/orders/validators/orderValidator.js`, cập nhật toàn bộ import trong orders controller và xóa bản global; cập nhật `README.md` mục “Project Structure” thêm đoạn tham chiếu `docs/STRUCTURE-SINGLE-DIRECTION.md`. Gate pass: `npm --prefix backend run lint` + `npm --prefix backend run test` + `npm --prefix frontend run lint`. |
| 2026-05-15 | Public pricing-seller page | — | Thêm endpoint công khai `GET /api/public/pricing/seller-table` và route FE độc lập `/pricing-seller` ngoài `ProtectedRoute`/`MainLayout`; trang hiển thị bảng giá (Tên sản phẩm, Gia CTV, Gia le) với trạng thái loading/empty/error. |

---

## Nợ kỹ thuật phát sinh (cần PR riêng)

### Credit logs
- [ ] **DEBT-CR-1** Marker `[REFUNDED_CASHOUT]` trong `refund_credit_notes.note` đang là cờ ngầm để map `status = REFUNDED` (xem `listRefundCreditLogs.js` + `refundCreditRoutes.js`). Giòn — sửa note tay là vỡ. **Thay** bằng cột riêng (vd `refunded_cashout_at TIMESTAMPTZ` hoặc enum status mới `REFUNDED`) qua migration; map BE/FE theo cột mới; bỏ marker text.
- [ ] **DEBT-CR-2** `useCreditLogsFetch` chưa cache request id / cancel — bấm action nhanh có thể có race giữa `reload()` và request cũ. Cân nhắc thêm `AbortController` khi rảnh.

### Lint debt còn lại (không block, làm khi rảnh)
- [x] **DEBT-LINT-FE** đã dọn xong warning frontend nhóm `max-lines` sau Wave 4 pilot 19. Kết quả hiện tại: `npm --prefix frontend run lint` **0 warning**.
- [x] **DEBT-LINT-FE-W1** (safe cleanup, không đổi behavior): đã dọn hết nhóm `@typescript-eslint/no-unused-vars`, `no-constant-binary-expression`, `unused eslint-disable` và `react-refresh/only-export-components` (37 warning) ở các file nhỏ/trung bình. Kết quả lint frontend giảm **130 → 93 warning**.
- [x] **DEBT-LINT-FE-W2** (hook deps): đã xử lý hết `react-hooks/exhaustive-deps` (6 warning) theo nhóm `orders`, `dashboard`, `form-info`, `modals`. Verify bằng lint + test frontend: warning tổng **93 → 87**, test pass.
- [x] **DEBT-LINT-FE-W3** (typing debt): đã dọn hết `@typescript-eslint/no-explicit-any` qua 2 slice (API + hooks/components liên quan). Kết quả warning tổng **87 → 19**; phần còn lại chuyển sang Wave 4 (`max-lines` split).
- [x] **DEBT-LINT-FE-W4** (`max-lines` split): hoàn tất pilot 1 → 19, bao gồm các pilot cuối: `ReceiptsTable.tsx`, `useProductActions.ts`, `ProductEditPanel.tsx`, `VariantContentView.tsx`. Kết quả lint frontend hiện tại: **0 warning**.
- [x] **DEBT-LINT-FE-W5** (final gate): đã chạy `npm --prefix frontend run lint` + `npm --prefix frontend run test -- --run`; kết quả lint **0 warning**, test pass **3 files / 9 tests**.
- [x] **DEBT-LINT-BE** 0 warning backend (`max-lines`) sau chuỗi pilot 1→16. ~~`userAccountMappingService.js` 407~~ đã split nốt. Danh sách hotspot đã xử lý: ~~`PaymentsController/index.js` 1077~~, ~~`ProductDescriptionsController/index.js` 866~~, ~~`dashboardSummaryAggregate.js` 636~~, ~~`mailOtpService.js` 659~~, ~~`supplier-change/service.js` 552~~, ~~`assignmentService.js` 545~~, ~~`orderUserTrackingService.js` 534~~, ~~`addUsersFlow.js` 529~~, ~~`accounts.js` 525~~, ~~`autoAssign.js` 522~~, ~~`userAddActions.js` 505~~, ~~`DashboardController/service.js` 483~~, ~~`usersListApi.js` 478~~, ~~`dailyRevenueSummaryBackfill.js` 461~~, ~~`StoreProfitExpensesController/index.js` 423~~, ~~`userAccountMappingService.js` 407~~.

### Audit hệ thống
- [x] **DEBT-AUDIT-1** `dashboardSummary.js` (write) vs `dashboardSummaryAggregate.js` (read) — không duplicate code, nhưng tên quá giống dễ hiểu lầm. ~~Rename `dashboardSummaryAggregate.js` → `dashboardSummaryQueries.js`~~ — done 2026-05-14 (Pilot 3) kèm tách 7 file con dưới `summaryQueries/`.

### File tracked đáng nghi
- [ ] **DEBT-REPO-1** `.tmp/putty/plink.exe`, `.tmp/putty/pscp.exe` đang tracked trong git — binary công cụ SSH local, không phải source code. Xác nhận có còn dùng chung không; nếu không, `git rm --cached` và thêm `.tmp/` vào `.gitignore`.
- [ ] **DEBT-REPO-2** `database.zip` (root, 3.6KB, từ 2025-12-13) — không reference từ code nào. Xác nhận có còn cần làm backup mẫu / fixture không; nếu không, xóa.

---

## Định nghĩa xong (DoD) mỗi slice backend

1. Path và method không đổi so với trước migrate.
2. Response JSON không đổi (kể cả mã lỗi thông thường).
3. `npm run lint` (backend) pass.
4. Smoke tay hoặc test tự động liên quan pass.

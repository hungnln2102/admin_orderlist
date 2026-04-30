# Kế Hoạch Cleanup Rule Hệ Thống

Tài liệu này ghi lại các rule cũ, rule trùng, rule bị tắt tạm và các điểm lệch giữa code, migration, trigger DB và script reset/dev của dự án `admin_orderlist`.

Mục tiêu là đưa từng luồng nghiệp vụ về một source of truth rõ ràng, tránh việc rule mới chồng lên rule cũ gây double count doanh thu/lợi nhuận, sai log NCC, sai refund hoặc dashboard khó debug.

## Nguyên tắc cleanup

- Không sửa migration lịch sử đã có thể đã chạy ở production.
- Nếu cần thay đổi trigger/function DB, thêm migration cleanup mới.
- Không xóa rule tài chính nếu chưa trace đủ execution path.
- Với doanh thu, lợi nhuận, giá nhập, hoàn tiền, receipt payment: phải có validation trước và sau khi sửa.
- `dashboard.dashboard_monthly_summary` nên được xem là bảng projection/materialized summary, không phải nơi tự phát sinh business event.
- Business event phải có ledger/audit/source table rõ ràng.
- Nếu chưa chắc rule còn cần hay không, giữ lại và đánh dấu cần review thủ công.

## Source of truth đề xuất

| Luồng | Source of truth hiện nên dùng | Không nên để |
|---|---|---|
| Payment receipt | `receipt.payment_receipt` | Trigger tự cộng doanh thu độc lập |
| Ghi nhận doanh thu/lợi nhuận receipt | `receipt.payment_receipt_financial_state` + `receipt.payment_receipt_financial_audit_log` | Vừa trigger DB vừa app logic cùng cộng `dashboard_monthly_summary` |
| Log giá nhập NCC | `partner.supplier_order_cost_log` | App helper cũ tự cộng/trừ công nợ song song |
| Tổng nhập NCC theo tháng | Rebuild/projection từ `partner.supplier_order_cost_log` | Dashboard tự tính khác trigger |
| Customer refund/credit | `receipt.refund_credit_notes` + `receipt.refund_credit_applications` | Chỉ dựa vào `orders.order_list.refund` để suy ra toàn bộ lịch sử |
| Dashboard summary | Projection từ receipt state/audit + supplier log + refund credit/order refund | Mỗi endpoint đọc một nguồn khác nhau |
| Order key sync | `system_automation.order_list_keys` + `system_automation.systems` | Namespace DB cũ `key_active` (chỉ tên schema) nếu vẫn sót sau merge |

## Source of truth schema/code

- [x] `backend/src/config/dbSchema` được xem là source of truth cho schema/table/column mà backend runtime được phép gọi.
- [x] Đã đối chiếu `dbSchema` với DB local hiện tại bằng `backend/scripts/ops/verify-db-schema-config.js`.
- [x] Kết quả kiểm tra ngày 29/04/2026: `44` table definition, `315` column definition, `missingCount = 0`.
- [x] Đã bỏ khỏi `dbSchema` các definition không còn tồn tại trong DB local: `common.status`, `system_automation.order_auto_keys`, `receipt.refund`, `partner.supplier.account_holder`, `wallet.wallet_transactions.promo_code`, `customer_web.accounts.mail_backup_id`, `dashboard.store_profit_expenses.linked_order_code`, `dashboard.store_profit_expenses.expense_meta`.
- [x] Đã thêm vào `dbSchema` bảng đang tồn tại nhưng trước đó runtime còn hard-code: `system_automation.order_user_tracking`.
- [x] Đã đổi các runtime table hard-code rõ ràng sang import từ `dbSchema`: `admin.site_settings`, `system_automation.order_user_tracking`, supplier table trong supply insights, supplier payment index schema, script seed NCC.
- [ ] Các script test/ops còn SQL/schema literal — dần thay bằng `dbSchema` + `tableName` nếu muốn tooling đồng bộ 100% (danh sách file và loại hard-code: mục **Danh sách hard-code đã quét**).

## Danh sách hard-code đã quét (`admin_orderlist`)

> Quét nhanh codebase (pattern chuỗi `schema.table`, SQL raw trong script, URL mặc định, map cột frontend). **Không** liệt kê: toàn bộ file migration/SQL DDL, chuỗi trạng thái đơn hàng trong `statuses`, domain check Adobe trong luồng renew (cố ý).

### Backend runtime — `backend/src`

| Khu vực | Ghi chú |
|---------|---------|
| Đa số controller/service | Bảng/cột qua `dbSchema` + `tableName()` / alias `TABLES` (ví dụ `Order/constants.js`, dashboard aggregate, seed NCC ops đã chuẩn). |
| Refund credit | Tên bảng `refund_credit_notes`, `refund_credit_applications` là **string literal** trong `tableName("...", SCHEMA_RECEIPT)` tại `controllers/Order/finance/refundCredits.js`, `refundCreditRoutes.js`, `controllers/Order/constants.js` — **chưa** có block định nghĩa đầy đủ trong `dbSchema` như `PAYMENT_RECEIPT_*`. |
| Introspection | `information_schema.tables` / `information_schema.columns` — `SuppliesController` (helpers, insights), `supplierAccountHolderColumn.js` (cố ý). |
| URL / host mặc định | `appConfig.js`: origin localhost CORS; `routes/productImagesRoutes.js`, `variantImagesRoutes.js`, `contentMediaRoutes.js`: fallback host `localhost:3001`; `ProductDescriptionsController`: `normalizeBaseUrl("http://localhost:3001")`. |
| Test | `__tests__/setup.js`: `DATABASE_URL` mặc định `postgresql://...@localhost:5432/test_db`; `appConfig.test.js` / `app.cors.test.js`: origin production trong kỳ vọng test. |

### Backend scripts — còn SQL qualified table trực tiếp

| File (gốc `backend/scripts/`) | Hard-code chính |
|-------------------------------|-----------------|
| `tests/run-webhook-financial-reconcile-tests.js` | `orders.order_list`, `receipt.payment_receipt`, `receipt.payment_receipt_financial_state`, `dashboard.dashboard_monthly_summary`; `INSERT`/`DELETE`/`SELECT`/`trx("orders.order_list")`. |
| `tests/verify-cleanup-marker.js` | `receipt.payment_receipt`, `orders.order_list`, `dashboard.dashboard_monthly_summary`. |
| `tests/inspect-order-schema.js` | `pg_get_serial_sequence('orders.order_list', ...)`, `FROM orders.order_list`. |
| `tests/test-form-info-with-auth.js` | `BASE = "http://localhost:3001"`. |
| `ops/backfill-financial-audit-from-state.js` | `receipt.payment_receipt_financial_audit_log`, `payment_receipt_financial_state`, `payment_receipt`. |
| `ops/cleanup-invalid-payment-receipt-order-code.js` | `receipt.payment_receipt`. |
| `ops/seed-refund-credit-preview.js` | `receipt.refund_credit_notes`, `receipt.refund_credit_applications`. |
| `seeds/run-seed-hero-banners.js` | `content.banners`. |

**Reference “đúng hướng” (đã dùng `dbSchema`):** `ops/seed-supplier-order-cost-log-five.js`, `ops/rebuild-dashboard-monthly-summary.js`, `ops/verify-db-schema-config.js` (chỉ `information_schema` + đối chiếu config).

### Cấu hình / DB tooling

| Mục | Ghi chú |
|-----|---------|
| `backend/knexfile.js` | `tableName: "knex_migrations"` (schema mặc định `public`). |
| `database/migrations/000_consolidated_schema.sql` + `legacy_sql_migrations/**` | Toàn DDL chứa tên schema/bảng (bình thường cho bootstrap). |

### Frontend — `frontend/`

| File | Ghi chú |
|------|---------|
| `src/lib/tableSql.ts` | Map tên cột API↔DB **thủ công**; comment tham chiếu backend (`partner.supplier`, v.v.). |
| `src/shared/api/client.ts` | Fallback base URL `http://localhost:3001` khi không có env. |
| `vite.config.ts` | `VITE_API_PROXY_TARGET` mặc định `http://localhost:3001`, `server.port` 5173. |
| `playwright.config.ts` | `E2E_BASE_URL` mặc định `http://localhost:5173`. |
| `src/features/product-price/constants.ts` | Chuỗi hiển thị domain (`mavrykpremium.store`). |

### Repo lân cận trong workspace

- `Website/**`, `mavrykstore_bot/**`: **chưa** quét trong phiên này (chỉ tập trung `admin_orderlist`).

## Các việc cần xử lý

### 1. Đồng bộ migration state với DB thật

Trạng thái hiện tại:

- DB local đã có một số SQL hotfix được apply trực tiếp.
- `knex_migrations` vẫn báo pending các migration liên quan:
  - `20260603120000_webhook_finance_processing_paid_flow.js`
  - `20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js`
  - `20260604130100_mavn_preserve_logged_at_on_cost_update.js`
  - `20260604190000_fix_order_refund_text_coalesce_triggers.js`
  - `20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`

Việc cần làm:

- [x] Kiểm tra từng pending migration có idempotent thật không.
- [x] Chạy migration trên DB local/dev trước.
- [x] Không chạy trực tiếp trên production nếu chưa snapshot function/trigger hiện tại.
- [x] Sau khi chắc chắn, đưa DB về trạng thái `npx knex migrate:status` không còn pending migration ngoài migration mới chưa deploy.
- [x] Ghi lại migration nào đã từng hotfix thủ công để tránh hiểu nhầm khi debug.

Kết quả đã thực hiện ngày 29/04/2026:

- Đã snapshot trigger active và `dashboard.dashboard_monthly_summary` trước khi migrate.
- Đã chạy `npx knex migrate:latest` trong `admin_orderlist/backend`.
- Knex đã chạy batch 30 gồm 5 migration:
  - `20260603120000_webhook_finance_processing_paid_flow.js`
  - `20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js`
  - `20260604130100_mavn_preserve_logged_at_on_cost_update.js`
  - `20260604190000_fix_order_refund_text_coalesce_triggers.js`
  - `20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`
- `npx knex migrate:status` hiện báo `No Pending Migration files Found`.
- Trigger `tr_payment_receipt_dashboard_revenue` không còn active.
- `partner.fn_supplier_order_cost_log_on_success()` đã dùng parse `refund` text-safe.
- `partner.fn_recalc_dashboard_total_import()` đã có rule MAVN `Đã Thanh Toán -> -cost`.
- `dashboard.dashboard_monthly_summary` tháng `2026-04` sau migration:
  - `total_revenue`: `3,633,200.00`
  - `total_profit`: `2,498,000.00`
  - `total_import`: `2,050,000.00`
  - `total_tax`: `0.00`

Ghi chú hotfix thủ công đã được đồng bộ vào migration history:

- `089_fix_order_refund_text_coalesce_triggers.sql` từng được apply trực tiếp để sửa lỗi `COALESCE types text and integer cannot be matched`.
- `090_drop_legacy_payment_receipt_dashboard_trigger.sql` từng được apply trực tiếp để chặn double revenue khi manual webhook tạo receipt.
- Hai thay đổi trên hiện đã được ghi nhận qua `knex_migrations` nhờ batch 30.

Rủi ro:

- Một số migration pending có thể đã được apply thủ công một phần.
- Chạy lại migration không idempotent có thể ghi đè function hiện tại hoặc thay đổi dashboard profit.

### 2. Cập nhật reset/dev database script

File liên quan:

- `database/init.sql`

Vấn đề:

- `init.sql` hiện dừng ở migration `088_store_profit_expenses_mavn_import.sql`.
- Chưa include:
  - `089_fix_order_refund_text_coalesce_triggers.sql`
  - `090_drop_legacy_payment_receipt_dashboard_trigger.sql`

Việc cần làm:

- [x] Thêm `089` và `090` vào `database/init.sql`.
- [x] Kiểm tra có migration SQL mới nào sau `090` cần đưa vào init cho Docker fresh volume không.
- [ ] Tạo DB Docker mới từ volume trống và so sánh trigger/function với DB migrated.

Kết quả đã thực hiện ngày 29/04/2026:

- Đã tạo file hợp nhất `database/migrations/000_consolidated_schema.sql` từ DB local/dev đã migrate mới nhất.
- File hợp nhất gồm:
  - schema hiện tại;
  - function/trigger hiện tại;
  - constraint, index, sequence và materialized view cần thiết.
- File hợp nhất là DDL-only, không chứa business/user data, seed/static data và metadata `public.knex_migrations`.
- Dữ liệu mặc định/thật sẽ được import từ database backup riêng sau khi tạo schema.
- Đã đổi `database/init.sql` để chỉ chạy:
  - `\i /docker-entrypoint-initdb.d/migrations/000_consolidated_schema.sql`
- Đã đổi `database/Dockerfile` sang `postgres:18-alpine` và copy thư mục `migrations/` hiện chỉ còn file hợp nhất.
- Đã restore thử `database/migrations/000_consolidated_schema.sql` vào một DB test tạm trên local Postgres 18.3, kết quả:
  - `knex_migrations`: không tạo
  - `tr_payment_receipt_dashboard_revenue`: `0`
  - `tr_supplier_order_cost_log_order_success`: `1`
  - `trg_supplier_order_cost_log_dashboard_import`: `1`
  - `product.pricing_tier`: `0`
  - `system_automation.systems`: `0`
  - `content.banners`: `0`
- Chưa verify bằng Docker fresh volume vì Docker Desktop trên máy hiện chưa chạy.
- Đã chuyển các SQL migration cũ ra khỏi đường bootstrap chính sang `database/legacy_sql_migrations/`.
- Đã compact `database/migrations/000_consolidated_schema.sql` để bỏ header/comment của `pg_dump`, metadata Knex và dòng trống dư:
  - còn khoảng `1,898` dòng;
  - gồm khoảng `61` bảng, `15` function, `9` trigger, `68` index và các constraint/sequence cần thiết.

Validation:

- [x] DB fresh không còn trigger `tr_payment_receipt_dashboard_revenue`.
- [x] Function refund/cost log dùng parse text-safe, không còn lỗi `COALESCE types text and integer cannot be matched`.
- [ ] Danh sách trigger active giữa DB fresh và DB migrated giống nhau.

### 3. Dọn rule payment receipt revenue cũ

File liên quan:

- `backend/migrations/20260601120000_trigger_dashboard_revenue_on_payment_receipt.js`
- `backend/migrations/20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`
- `database/legacy_sql_migrations/090_drop_legacy_payment_receipt_dashboard_trigger.sql`
- `backend/webhook/sepay/payments.js`
- `backend/src/controllers/DashboardController/monthlySnapshot.js`

Vấn đề:

- Rule cũ `tr_payment_receipt_dashboard_revenue` từng cộng `dashboard_monthly_summary.total_revenue` khi insert receipt.
- Webhook/manual webhook hiện cũng tự post finance.
- Đây là nguyên nhân gây double revenue.
- Trigger đã bị drop trên DB local, nhưng comment trong code vẫn nói doanh thu được cộng bởi trigger.

Việc cần làm:

- [x] Giữ migration lịch sử `20260601120000...` nguyên vẹn.
- [x] Đảm bảo migration cleanup `20260604191000...` được chạy bằng knex, không chỉ apply SQL thủ công (file migration Knex có trong repo; môi trường chạy `knex migrate` theo quy trình deploy).
- [x] Sửa comment trong `backend/webhook/sepay/payments.js`.
- [x] Sửa comment trong `backend/src/controllers/DashboardController/monthlySnapshot.js`.
- [x] Viết comment ngắn: receipt insert chỉ tạo receipt/state; finance posting nằm ở webhook/manual/reconcile/renewal flow.

Validation:

- [x] Insert receipt mới không tự tăng `dashboard_monthly_summary` nếu chưa qua finance posting. *(Đã chạy `npm run test:webhook-scenarios` — case V1.)*
- [x] Manual webhook hoàn thành đơn chỉ cộng revenue/profit một lần. *(Case V2 trong `test:webhook-scenarios`.)*
- [x] Webhook Sepay chuyển đơn `Đang Xử Lý -> Đã Thanh Toán` chỉ cộng một lần. *(Case V3; sửa lỗi renewal webhook: khối gia hạn phải chạy trước `client.release()` và trong scope `paidMonthKey` — `backend/webhook/sepay/routes/webhook.js`.)*

### 4. Dọn logic disabled trong dashboard summary

File liên quan:

- `backend/src/controllers/Order/finance/dashboardSummary.js`

Vấn đề:

- Có các block dạng `if (false && ...)`.
- Đây là rule cũ bị tắt tạm, vẫn làm người sau hiểu nhầm rằng status change còn ghi revenue/profit trong một số case.

Việc cần làm:

- [x] Xác nhận source of truth cuối cùng cho revenue/profit là payment receipt financial state/audit (đồng bộ mục 3; hàm này không còn path cộng DT/LN từ đổi status thuần).
- [x] Xóa block disabled nếu không còn dùng (và helper `hasFinancialPostedReceiptForOrder` chỉ phục vụ block đó).
- [x] Ghi chú hành vi vào JSDoc trên `updateDashboardMonthlySummaryOnStatusChange` thay vì giữ `if (false)` trong runtime.
- [x] Giữ lại logic refund/status adjustment (đơn rời refund lifecycle; PAID → hoàn với merge birth/refund month).

Rủi ro (vẫn áp dụng):

- `updateDashboardMonthlySummaryOnStatusChange` vẫn được gọi từ update/delete/reconcile — chỉ được giữ/đổi phần refund/aggregate, không tái bật cộng DT/LN theo status không qua receipt.

Validation:

- [x] Đổi status không receipt không được tự cộng revenue/profit *(dead path đã xóa; không còn nhánh ghi DT/LN khi chỉ đổi status)*.
- [ ] Chuyển `Đã Thanh Toán -> Chưa Hoàn` vẫn cập nhật refund/canceled đúng một lần *(nên xác nhận trên DB / luồng xóa đơn — case S3 trong `test:webhook-scenarios` đã cover trạng thái + refund; có thể bổ sung assert `dashboard_monthly_summary` nếu cần)*.
- [ ] Reconcile không double adjust khi `adjustment_applied = true` *(logic reconcile nằm `PaymentsController`; chưa có assert tự động trong suite này).*

### 5. Consolidate supplier cost log rule

Rule liên quan:

- Trigger active: `tr_supplier_order_cost_log_order_success`
- Function active: `partner.fn_supplier_order_cost_log_on_success`
- Bảng canonical: `partner.supplier_order_cost_log`

Migration lịch sử có nhiều phiên bản:

- `039_supplier_order_cost_log.sql`
- `040_supplier_order_cost_log_move_to_partner.sql`
- `043_supplier_order_cost_log_drop_name_status.sql`
- `046_supplier_order_cost_log_sync_processing.sql`
- `049_supplier_order_cost_log_unpaid_renewal_to_processing.sql`
- `050_supplier_order_cost_log_refund_off_processing.sql`
- `051_supplier_order_cost_log_initial_ncc_unpaid.sql`
- `052_supplier_order_cost_log_multi_row.sql`
- `053_supplier_order_cost_log_first_on_cost.sql`
- `054_supplier_order_cost_log_insert_each_processing_entry.sql`
- `055_supplier_order_cost_log_consolidated.sql`
- `057_supplier_order_cost_log_webhook_paid_flow.sql`
- `058_supplier_order_cost_log_default_unpaid.sql`
- `079_pending_refund_label_chua_hoan.sql`
- `080_supplier_order_cost_log_ncc_refund_on_cancel.sql`
- `086_webhook_finance_processing_paid_flow.sql`
- `087_mavn_preserve_logged_at_on_cost_update.sql`
- `089_fix_order_refund_text_coalesce_triggers.sql`
- **Canonical (một file, source of truth sau khi deploy Knex `20260605120000...`):** `091_supplier_order_cost_log_fn_canonical.sql`

Vấn đề:

- Chỉ có một trigger active, nhưng rule đã bị ghi đè qua nhiều migration.
- Khó biết bản nào là canonical nếu chỉ đọc repo.
- App helper cũ vẫn tồn tại dưới dạng no-op/deprecated.

Việc cần làm:

- [x] Tạo một migration mới đặt lại canonical version của `partner.fn_supplier_order_cost_log_on_success` — SQL: `database/migrations/091_supplier_order_cost_log_fn_canonical.sql`; Knex: `backend/migrations/20260605120000_supplier_order_cost_log_fn_canonical.js` (`down` khôi phục bản trong `089_fix_order_refund_text_coalesce_triggers.sql`).
- [x] Trong migration mới, comment rõ rule hiện tại:
  - NCC Mavryk/Shop không ghi log cost cho đơn thường.
  - Đơn MAVN/MAVT tạo ở trạng thái `Đã Thanh Toán` vẫn ghi log NCC và không ghi log cho NCC Mavryk/Shop.
  - Refund NCC dùng prorata theo cost/ngày còn lại, không dùng customer refund.
  - `refund` text phải parse an toàn.
  - Khi sửa cost/NCC sau này, rule `logged_at` cho MAVN phải theo quy tắc đã chốt.
- [x] Không sửa migration lịch sử `039..089`.
- [x] Cập nhật tài liệu source of truth (mục này + `docs/PAGES_DON_HANG.md`).

**Source of truth (function):** đọc header + body trong `091_supplier_order_cost_log_fn_canonical.sql` sau khi đã chạy Knex migration trên môi trường.

Validation:

- [ ] Tạo đơn thường với NCC non-Mavryk, chuyển `Chưa Thanh Toán -> Đang Xử Lý`: tạo đúng 1 log.
- [ ] Đổi cost/NCC khi đơn đang xử lý: cập nhật đúng log mới nhất, không nhân đôi.
- [ ] Hủy đơn đã thanh toán: tạo/refund log đúng 1 lần.
- [ ] Đơn MAVN/MAVT tạo mới: log NCC đúng kỳ.

### 6. Kiểm tra rule dashboard total_import/total_profit

Rule liên quan:

- Trigger active: `trg_supplier_order_cost_log_dashboard_import`
- Function active: `partner.fn_recalc_dashboard_total_import`
- Migration liên quan:
  - `20260426120000_dashboard_monthly_summary_total_import.js`
  - `20260602120000_extend_fn_recalc_dashboard_ncc_profit.js`
  - `20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js`

Vấn đề:

- Rule đã được ghi trong migration `20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js` (nhánh MAVN + `Đã Thanh Toán` → margin `-cost` thay vì `GREATEST(0, price - cost)` khi giá bán thực tế bằng 0).
- Trước đây có DB chưa chạy Knex tới bước này; chuẩn hóa bằng `npx knex migrate:latest` trong `backend`.

**Source of truth (function + backfill `total_profit` theo log):** `backend/migrations/20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js`; bootstrap một cụm trong `database/migrations/000_consolidated_schema.sql` (`CREATE FUNCTION partner.fn_recalc_dashboard_total_import`).

Việc cần làm:

- [x] Xác nhận business rule MAVN: khi mã đơn `MAVN%` và `status = 'Đã Thanh Toán'`, phần **lợi nhuận gộp từ NCC** trong `dashboard_monthly_summary.total_profit` (đoạn cộng từ `supplier_order_cost_log`) dùng **−cost**; đơn khác vẫn `GREATEST(0, COALESCE(gross_selling_price, price) - cost)`. Bucket tháng = **tháng của `logged_at`** trên các dòng log (mỗi `order_list_id` lấy dòng mới nhất theo `id`), đồng bộ với migration **087** (giữ `logged_at` khi sửa cost MAVN).
- [x] Chuẩn hóa môi trường: chạy Knex tới ít nhất `20260604120000`; không giữ migration này ở trạng thái pending trên DB dùng thật.
- [x] Kiểm tra định nghĩa function trên DB (nhánh MAVN + cộng `import_cost`): `node backend/scripts/ops/verify-recalc-dashboard-import-fn.js`.
- [x] `dashboard_monthly_summary` vẫn là projection: trigger trên `supplier_order_cost_log` cập nhật `total_import` / phần `total_profit` suy ra từ log; rebuild (`backend/scripts/ops/rebuild-dashboard-monthly-summary.js`) dùng để đối soát — gom thống nhất SoT KPI ở **mục 7**.

Validation:

- [ ] Đơn MAVN paid làm `total_profit` (theo công thức trên) thay đổi đúng **−cost** so với kỳ vọng nghiệp vụ *(kiểm tra tay trên DB / dashboard)*.
- [ ] Đổi cost MAVN sau khi paid: `logged_at` không đổi (087) nên chỉ số không nhảy sang tháng sai *(kiểm tra tay)*.
- [x] `total_import` theo tháng = tổng `supplier_order_cost_log.import_cost` có `logged_at` trong tháng *(định nghĩa trong function; script trên xác nhận tham chiếu `import_cost`)*.

### 7. Chuẩn hóa dashboard summary source

File liên quan:

- `backend/src/controllers/DashboardController/service.js`
- `backend/src/controllers/DashboardController/monthlySnapshot.js`
- `backend/src/controllers/DashboardController/dashboardSummaryAggregate.js`
- `backend/src/controllers/DashboardController/nccDashboardMarginSql.js` (margin NCC / MAVN khớp trigger DB)
- `backend/src/controllers/DashboardController/dashboardChartRangeLedgers.js` (Sepay + NCC theo tháng trong khoảng ngày)
- `backend/scripts/ops/rebuild-dashboard-monthly-summary.js`

Vấn đề:

- KPI tháng hiện tại ưu tiên `dashboard_monthly_summary`; khoảng ngày dùng tổng Sepay + log NCC.
- Biểu đồ theo `from`/`to` trước đây lấy doanh thu/lợi nhuận từ CTE `order_list` → lệch khoảng stats.
- Margin NCC trong app thiếu nhánh MAVN PAID → −cost (trigger DB đã có).

Việc cần làm:

- [x] Chốt `dashboard_monthly_summary` là projection: doanh thu (post finance / rebuild `receipts`), NCC (`supplier_order_cost_log` + trigger), hoàn/cột đếm từ tổng hợp đơn trong `dashboardSummaryAggregate`, rút lợi nhuận `store_profit_expenses` (trong `buildAlignedMonthlyRows` khi rebuild).
- [x] Đồng bộ **range KPI** (`fetchDashboardStatsForDateRange`) với **biểu đồ range**: cùng Sepay theo `paid_date` và margin NCC (đã MAVN) theo `logged_at` trong khoảng; `total_tax` = `taxOnNet(revenue, refund)` như `monthlySnapshot`.
- [x] Rebuild: `rebuild-dashboard-monthly-summary.js` + `buildAlignedMonthlyRows(..., { revenueSource: 'receipts' })` (đã có).
- [x] Script đối soát: `npm run compare:dashboard-ledgers` (`scripts/ops/compare-dashboard-summary-ledgers.js`).

Validation:

- [ ] `npm run sync:dashboard-summary` trên DB test rồi `compare:dashboard-ledgers` → giảm lệch (hoặc OK nếu dữ liệu đã rebuild).
- [x] Range chart và range stats cùng nguồn Sepay + log NCC (code path đã thống nhất).
- [x] `total_tax` trên dòng tháng aligned dùng `(revenue - refund) * rate` (`taxOnNet`).

### 8. Dọn supplier debt helper cũ

File liên quan:

- `backend/src/controllers/Order/finance/supplierDebt.js`
- `backend/src/services/supplierService.js`
- `backend/src/controllers/Order/orderUpdateService.js`
- `backend/src/controllers/Order/orderDeletionService.js`
- `backend/src/controllers/Order/crud/deleteOrder.js`

Vấn đề:

- Các helper no-op từng làm người đọc tưởng app còn bút toán `supplier_payments` song song trigger.

Việc cần làm:

- [x] Xác nhận công nợ theo đơn nằm trong `partner.supplier_order_cost_log` (trigger `fn_supplier_order_cost_log_on_success`).
- [x] Xóa gọi no-op khỏi update/delete; gỡ export khỏi `orderFinanceHelpers` / `supplierDebt` / `supplierService`.
- [x] Giữ `findSupplyIdByName` trong `supplierDebt.js`.

Validation:

- [x] Update/delete vẫn dựa trigger DB (không đổi chỗ ghi log).
- [x] Lint sạch các file chạm.
- [x] Chạy `npm run test:webhook-scenarios` — S3 xóa đơn + V1–V3 (sau fix `isGiftOrder`).

### 9. Kiểm tra `key_active` legacy sau merge sang `system_automation`

**Giữ dữ liệu key active:** bảng nghiệp vụ là **`system_automation.order_list_keys`** (và `system_automation.systems`), trigger `system_automation.*` trên `orders.order_list`. Không có thao tác nào ở mục này xóa hay đổi các bảng đó.

**Đã gỡ:** chỉ namespace PostgreSQL rỗng / function cũ mang tên **`key_active`** (schema cũ trước merge), để tránh nhầm với bảng thật trong `system_automation`.

Rule liên quan:

- Trigger active hiện dùng `system_automation.order_list_keys`.
- Schema/function cũ `key_active.*` đã gỡ khỏi DB dev sau migration `20260606120100`; bootstrap `000_consolidated_schema.sql` không tạo lại `key_active`.

Việc cần làm:

- [x] Query `pg_depend`/`pg_trigger` — script `backend/scripts/ops/verify-key-active-legacy-deps.js` (đã dùng `loadBackendEnv` cùng Knex); kiểm tra bảng trong `key_active`.
- [x] Migration `20260606120000_drop_key_active_legacy_schema.js` (kiểm tra trong khối PL/pgSQL) + `20260606120100_drop_key_active_legacy_schema_exec.js` (`DROP SCHEMA` trực tiếp sau kiểm tra JS).
- [x] `database/migrations/000_consolidated_schema.sql`: bỏ `CREATE SCHEMA key_active` và hai function legacy (fresh DB không tạo lại schema cũ).
- [x] Không drop khi còn bảng trong `key_active` (migration raise).

Validation:

- [x] `npm run test:webhook-scenarios` — toàn bộ case pass sau khi sửa `isGiftOrder` trong `orderDeletionService`.
- [ ] API key active / CRUD `order_list_keys` — regression tay nếu cần.

### 10. Chuẩn hóa refund và refund credit flow

File liên quan:

- `backend/src/controllers/Order/orderDeletionService.js`
- `backend/src/controllers/Order/renewRoutes.js`
- `backend/src/controllers/Order/refundCreditRoutes.js`
- `backend/src/controllers/Order/finance/refundCredits.js`
- `backend/src/controllers/Order/finance/refunds.js`
- `database/migrations/080_create_refund_credit_notes.sql`
- `database/migrations/081_create_refund_credit_applications.sql`
- `database/migrations/085_refund_credit_note_split_links.sql`

Vấn đề:

- `orders.order_list.refund` là snapshot customer refund.
- `supplier_order_cost_log.refund_amount` là refund NCC, tính theo cost prorata.
- `refund_credit_notes/applications` lại quản lý credit khách dùng cho đơn mới.
- Các luồng này hợp lý nhưng cần tài liệu rõ để tránh dùng nhầm.

Việc cần làm:

- [x] Ghi rõ `order_list.refund` không phải refund NCC — `refunds.js` (JSDoc), `refundCredits.js` (đầu module).
- [x] Ghi rõ supplier refund tại `supplier_order_cost_log.refund_amount` — cùng `refundCredits.js`.
- [x] Ghi rõ customer credit tại `refund_credit_notes/applications` — cùng `refundCredits.js`.

Validation:

- [ ] Test replacement order end-to-end (credit note → apply → split) — chạy tay hoặc bổ sung suite riêng.

## Checklist validation tổng

Sau mỗi đợt cleanup, chạy các case sau trên DB test:

- [ ] Tạo đơn thường, thanh toán qua webhook: revenue/profit cộng đúng một lần.
- [ ] Đơn đang xử lý bấm hoàn thành thủ công: receipt tạo đúng, revenue/profit cộng đúng một lần.
- [ ] Tạo đơn NCC non-Mavryk và chuyển xử lý: supplier cost log tạo đúng một lần.
- [ ] Đổi NCC/cost khi đang xử lý: log không nhân đôi bất thường.
- [ ] Xóa/hủy đơn đã thanh toán: refund/customer credit và supplier refund đúng một lần.
- [ ] Reconcile receipt không mã sang order: không double adjustment khi chạy lại.
- [ ] Renewal qua webhook: revenue/profit/receipt state đúng một lần.
- [ ] Replacement order dùng refund credit: old/new order và credit note link đúng.
- [ ] Dashboard summary khớp underlying logs.
- [ ] Docker fresh DB từ `database/init.sql` có trigger/function giống DB migrated.

## Thứ tự ưu tiên đề xuất

1. Fix drift an toàn: `database/init.sql`, comment misleading, migration status.
2. Payment receipt revenue source cleanup.
3. Dashboard source of truth cleanup.
4. Supplier cost log canonical migration/documentation.
5. Remove no-op supplier debt helpers.
6. Key active legacy cleanup.
7. Test replacement/refund credit end-to-end.

## Không nên làm trong cùng một PR

- Không gộp cleanup payment receipt với rewrite dashboard lớn.
- Không drop trigger supplier log cùng lúc với đổi refund credit.
- Không xóa historical migrations.
- Không drop table/column tài chính nếu chưa có report usage.
- Không sửa UI ngoài phần hiển thị cần thiết cho validation.

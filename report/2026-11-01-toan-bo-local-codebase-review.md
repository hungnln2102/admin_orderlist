# Rà soát toàn bộ mã local, toàn vẹn dữ liệu và bảo mật

- Ngày rà soát: 2026-11-01 (Asia/Bangkok)
- Phạm vi: toàn bộ trạng thái local hiện tại, gồm mã đã commit và mọi tệp đang sửa/chưa theo dõi.
- Loại trừ khỏi đọc từng dòng: `node_modules`, `frontend/dist`, tệp dump PostgreSQL nhị phân. Các tệp này không phải mã nguồn kiểm soát được trong repository.
- Số lượng đã lập danh mục: 528 tệp trong phạm vi, 446 tệp nguồn/cấu hình thực thi; gồm 112 tệp `backend/src`, 124 tệp `frontend/src`, 4 tệp mobile, 152 tệp SQL, 26 tệp test backend và 15 tệp script vận hành.
- Trạng thái nghiệm thu: **CHƯA NGHIỆM THU**.

## Kết luận ngắn

Mã V2 có luồng chính thức rõ ở các phần xác thực, webhook, migration, thanh toán đơn và batch payment. Tuy nhiên, local hiện chưa clean và chưa đạt một source of truth cho giá catalog/gia hạn: quy tắc tính giá tồn tại song song trong `batchPaymentService`, `catalogPricingService`, scheduler và `orderService`. Đợt thay đổi local mới tiếp tục bổ sung một đường ghi song song nhưng không bọc transaction, nên có thể commit dở dữ liệu catalog và đơn gia hạn.

`database/legacy_sql_migrations` không phải luồng runtime song song: đối chiếu SHA-256 cho 62 tệp trùng tên cho thấy 62/62 tệp giống hệt `database/migrations`; `database/README.md` xác định đây là bản lưu trữ tham chiếu. Vì vậy đây là vấn đề cleanliness/tăng bề mặt bảo trì, không phải hai migration cùng chạy.

## Phát hiện bắt buộc xử lý trước nghiệm thu

### P1 - Toàn vẹn dữ liệu: cập nhật catalog và giá đơn gia hạn không atomic

- Vị trí: `backend/src/domains/products/services/productService.js:350`, `backend/src/domains/products/services/catalogPricingService.js:114`.
- `updateProduct` lần lượt sửa `business.variant`, tối đa bốn dòng `business.variant_price`, rồi gọi đồng bộ các đơn `RENEW_REQUIRED`; toàn bộ dùng `db` trực tiếp thay vì một `withTransaction`/`trx` thống nhất.
- `syncRenewRequiredOrdersPricing` lại cập nhật từng đơn trong vòng lặp và nuốt lỗi thành `{ success: false }`; caller chỉ `console.warn` và vẫn trả thành công. Sự cố ở giữa chuỗi để lại catalog mới nhưng một phần đơn giá cũ, hoặc một số tier giá đã đổi còn tier khác chưa đổi.
- Hậu quả: số tiền QR/đối soát của các đơn cần gia hạn có thể lệch catalog; người vận hành nhận kết quả “sửa thành công” dù dữ liệu chưa đồng bộ hết.
- Cách sửa gốc: chuyển toàn bộ update variant, variant prices và đồng bộ các đơn liên quan vào một transaction; truyền `trx` xuyên suốt; không nuốt lỗi đồng bộ. Tách tính giá thuần ra một hàm canonical, sau đó cập nhật theo batch set-based hoặc khóa đúng tập đơn trước khi ghi.

### P1 - Luồng giá catalog đang bị phân nhánh, chưa phải một luồng chính thức duy nhất

- Vị trí: `backend/src/domains/invoices/services/batchPaymentService.js:36`, `backend/src/domains/products/services/catalogPricingService.js:8`, `backend/src/scheduler/tasks/updateOrderStatusTask.js:50`, `backend/src/domains/orders/services/orderService.js:1335`.
- `batchPaymentService` vẫn tự định nghĩa `getOrderPrefix` và toàn bộ ma trận chọn tier. Tệp local mới `catalogPricingService` định nghĩa lại cùng quy tắc với thêm fallback khác; scheduler lại tự cập nhật đơn mới chuyển trạng thái trước khi gọi sync tổng; `orderService` có nhánh tính giá riêng khi gia hạn thủ công.
- Đây là dấu hiệu lớp mới được thêm để vá/bao quanh hàm cũ thay vì thay thế nguồn cũ. Một thay đổi trong tier, prefix, fallback `id_product`/`information_order` hoặc quy tắc `MAVT` có thể làm batch, cron và gia hạn tay tính số tiền khác nhau.
- Cách sửa gốc: để một module catalog pricing sở hữu duy nhất `getOrderPrefix`, resolve variant, resolve tier và tính price + suffix; `batchPaymentService`, scheduler, `orderService` chỉ gọi module đó. Nếu batch cần snapshot, snapshot chính output canonical vào `order_allocations`, không copy logic.

### P1 - Bảo mật SSRF: OTP dùng URL cấu hình từ DB bằng `fetch` thô

- Vị trí: `backend/src/domains/system/services/otpProviderService.js:52`, `backend/src/domains/system/services/otpProviderService.js:72`.
- `base_url` và `endpoints` lấy từ external API config nhưng các provider OTP dựng URL rồi gọi native `fetch` trực tiếp. Điều này bỏ qua `assertSafeExternalUrl`/`fetchSafeExternal`, trong khi helper đã tồn tại để chặn HTTP, localhost, IP private/reserved, redirect và response quá lớn.
- Hậu quả: nếu cấu hình external API bị sửa sai hoặc tài khoản admin bị chiếm, server có thể bị yêu cầu gọi mạng nội bộ/metadata service. Quyền admin không loại bỏ rủi ro SSRF vì đây là ranh giới tin cậy server-to-network.
- Cách sửa gốc: mọi provider nhận URL từ config phải gọi `requestConfiguredApi` hoặc `fetchSafeExternal`; giữ timeout và giới hạn response. Không duy trì hai cơ chế gọi mạng cho cùng loại cấu hình.

### P1 - Toàn vẹn dữ liệu nghiệp vụ: dashboard traffic trả dữ liệu giả như dữ liệu thật

- Vị trí: `backend/src/domains/traffic/services/trafficService.js:32`.
- Khi không có/không đọc được GA4 credentials, service tạo ngẫu nhiên visitors, sessions, pageviews, bounce rate và thời lượng rồi mô tả là dữ liệu “thực tế”. Điều này làm dashboard có số liệu giả nhưng không phân biệt với số liệu nguồn.
- Hậu quả: quyết định kinh doanh dựa trên traffic có thể sai; cache làm số liệu giả nhìn càng giống dữ liệu thật.
- Cách sửa gốc: trả trạng thái `unavailable` cùng nguyên nhân an toàn để UI hiển thị cảnh báo, hoặc chỉ hiển thị mẫu demo khi một cờ môi trường demo được bật và gắn nhãn rõ ràng.

### P2 - Dependency audit backend còn 7 advisory mức moderate

- Lệnh `npm.cmd --prefix backend audit --omit=dev --json` báo 7 advisory moderate, theo chuỗi `@google-analytics/data`/`google-gax`/`gaxios`/`rimraf`/`glob`/`minimatch`, và `qs`.
- Không có advisory frontend production (`0` total). Không có high/critical trong kết quả backend hiện tại.
- Cách sửa: cập nhật dependency tree có kiểm soát, lockfile review, sau đó chạy lại audit và smoke test traffic/GA4.

### P2 - Kiểm thử chưa đủ để chứng minh các luồng tài chính đồng thời

- Backend có 13 unit test files cho 112 tệp runtime; frontend có 0 test file cho 124 tệp nguồn.
- `TEST_DATABASE_URL` không được thiết lập nên integration suite không chạy; unit test hiện dùng mock ở các đoạn then chốt.
- Cần thêm integration PostgreSQL cho: rollback giữa update catalog/tier/order, hai request đổi catalog đồng thời, webhook retry cùng `sepay_transaction_id`, tạo batch trùng order, và SSRF URL private/redirect trong provider OTP.

### P3 - Cleanliness và khả năng bảo trì

- `git diff --check` thất bại vì trailing whitespace ở `backend/src/domains/orders/services/orderService.js:1341`, `backend/src/domains/orders/services/orderService.js:1342`, `backend/src/scheduler/tasks/updateOrderStatusTask.js:21`.
- Các hotspot quá lớn: `orderService.js` 1,776 dòng, `financeHubService.js` 1,546 dòng, `productService.js` 1,351 dòng; frontend có `ExternalApiConfigPage.tsx` 1,528 dòng và `WarehouseAccountsTable.tsx` 1,252 dòng. Đây là nguồn tiếp tục sinh nhánh vá lỗi và khó đảm bảo transaction/contract.
- Báo cáo local chưa theo dõi `report/2026-11-01-catalog-renewal-pricing-and-inactive-notifications-review.md` chứa khẳng định đã deploy VPS; cuộc rà soát local này không thể xác thực tuyên bố production đó. Không dùng báo cáo đó làm bằng chứng nghiệm thu hiện tại.

## Các phần đạt hoặc có kiểm soát phù hợp

- `backend/src/server.js:57` kiểm tra `Origin` theo allowlist trước CORS, RBAC áp dụng tập trung từ `backend/src/server.js:121`; session cookie là `httpOnly`, production bật `secure`, `sameSite=lax`.
- `backend/src/domains/auth/controller.js` dùng bcrypt, regenerate session sau login, so sánh timing-safe với fallback cũ; login có rate limiter.
- `backend/src/domains/webhooks/services/sepayAuth.js:11` kiểm tra API key constant-time; `webhookPaymentService` dùng unique transaction id, transaction, `forUpdate`/`skipLocked` và trả duplicate idempotent.
- `backend/src/domains/invoices/services/batchPaymentService.js:185` dùng transaction, advisory lock và row lock; migration `20261029000002_add_batch_suffix_unique_and_allocations.js` có partial unique index cho suffix batch PENDING.
- `backend/src/utils/safeExternalRequest.js` chặn URL không HTTPS, hostname/IP private và redirect; `externalApiConfigService` dùng helper này cho API config chung.
- `backend/src/db/index.js` có `afterCommit`; các luồng order/payment chính phát event sau commit thay vì trước commit.
- `npx.cmd knex migrate:list` từ `backend/` báo 19 migration completed, không có pending migration.

## Đánh giá ACID theo luồng

| Luồng | Atomicity | Consistency | Isolation | Durability | Kết quả |
| --- | --- | --- | --- | --- | --- |
| Webhook SePay -> receipt -> allocation -> order/wallet | Có transaction | Có idempotency và status | `forUpdate`/`skipLocked` | Commit trước event | Đạt theo rà soát tĩnh |
| Tạo batch payment | Có transaction | Snapshot allocation + unique suffix batch | advisory lock + row lock | DB commit | Đạt theo rà soát tĩnh |
| Cập nhật catalog -> giá đơn cần gia hạn | Không đầy đủ | Có thể lệch tier/đơn | Không khóa tập đơn thống nhất | Có thể commit dở | Không đạt (P1) |
| Cron chuyển trạng thái -> cấp giá/suffix | Nhiều câu ghi độc lập | Có thể sót từng đơn khi lỗi | advisory lock cron, nhưng không bao transaction dữ liệu | Một phần ghi bền | Không đạt (P1 liên quan) |
| Dashboard traffic | Không áp dụng giao dịch DB | Số liệu fallback không trung thực | Không áp dụng | Cache số liệu giả | Không đạt (P1) |

## Kiểm tra đã chạy

- `npm.cmd --prefix backend test`: pass, 58 tests.
- `npm.cmd --prefix frontend run build`: pass (`tsc && vite build`).
- `node --check` toàn bộ 112 file JavaScript trong `backend/src`: pass.
- `npx.cmd knex migrate:list` từ `backend/`: 19 completed, 0 pending.
- `npm.cmd --prefix backend audit --omit=dev --json`: 7 moderate, 0 high/critical.
- `npm.cmd --prefix frontend audit --omit=dev --json`: 0 advisory.
- `git diff --check`: fail do 3 trailing-whitespace findings nêu trên.
- Không chạy integration test: thiếu `TEST_DATABASE_URL` an toàn có tên database chứa `test`.

## Điều kiện nghiệm thu lại

1. Hợp nhất canonical catalog pricing, xóa bản sao logic trong batch/scheduler/order.
2. Bọc thay đổi catalog, tier và giá các đơn `RENEW_REQUIRED` trong một transaction; lỗi phải rollback và trả failure.
3. Chuyển toàn bộ OTP config URL qua `requestConfiguredApi` hoặc safe request helper; thêm regression SSRF.
4. Bỏ số liệu traffic giả trong production; UI phải báo nguồn không khả dụng.
5. Dọn whitespace, cập nhật dependency audit, bổ sung integration PostgreSQL và frontend test tối thiểu cho luồng thay đổi.
6. Rà soát lại toàn bộ report không theo dõi trước khi commit; không ghi nhận deploy/live verification nếu chưa có evidence riêng.

## Phụ lục: danh mục từng tệp

Ký hiệu: `RUNTIME` là đường chạy chính hiện tại; `MIGRATION` là schema V2; `BOOTSTRAP` là schema DB mới; `ARCHIVED` là bản lịch sử không chạy runtime; `TEST` là kiểm thử; `OPS` là script vận hành; `UI` là client; `CONFIG` là cấu hình. Các tệp có phát hiện riêng mang mã P1/P2/P3 ở cuối dòng.

- `AGENTS.md` - CONFIG/DOC - tệp hỗ trợ repository.
- `backend/Dockerfile` - CONFIG/DOC - tệp hỗ trợ repository.
- `backend/knexfile.js` - CONFIG/DOC - tệp hỗ trợ repository.
- `backend/nodemon.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `backend/package.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `backend/package-lock.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `backend/scripts/backfillReceiptAllocations.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/fix_webhook_bank_match_and_rebalance.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/importSystemConfigsFromDockerEnv.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/importV1OperationalDataToV2Sandbox.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/inspect_order_and_slots.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/match_receipt_95110228_to_order_1422.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/merge_duplicate_accounts_and_resequence.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/migrate_adobe_edu_and_resequence.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/migrate_canva_youtube_and_resequence.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/migrate_googleone_and_resequence_ids.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/resetDatabase.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/sync_warehouse_status_with_packages.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/scripts/syncDailySummaryFromOrders.js` - OPS - script thủ công/vận hành, không phải request runtime.
- `backend/src/config/env.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/constants/orderStatus.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/constants/receiptStatus.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/constants/supplierStatus.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/db/clearData.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/db/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/db/migrations/20261018000001_v2_complete_schema.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261021000001_personal_savings_profit_period.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261021000002_warehouse_slot_session_status.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261022000001_admin_user_sessions.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261023000001_cron_jobs.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261024000001_alter_order_list_slot_to_varchar.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261025000001_external_api_configs.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261025000002_remove_seeded_external_api_token.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261025000003_create_store_profit_expenses.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261026000001_add_notification_logs_columns.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261026000002_attach_backup_handler.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261026000003_drop_personal_bank_accounts.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261027000001_create_personal_balance_snapshots.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261027000002_add_personal_and_shop_balance_to_snapshots.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261029000001_create_batch_payment_requests.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261029000002_add_batch_suffix_unique_and_allocations.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261030000001_add_product_id_to_warehouse_product_names.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261031000001_add_variant_tag_to_warehouse_account_slots.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/migrations/20261101000001_convert_personal_assets_view_to_table.js` - MIGRATION - migration Knex V2 đã được migrate:list xác nhận.
- `backend/src/db/tables.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/auth/controller.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/auth/middleware/loginRateLimiter.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/auth/middleware/requireAdmin.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/auth/middleware/requireAuthenticatedUser.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/auth/routes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/credits/controllers/creditController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/credits/routes/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/credits/services/creditService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/dashboard/routes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/dashboard/services/dailySummaryService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/dashboard/services/dashboardService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/finance/controllers/financeHubController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/finance/controllers/storeProfitExpenseController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/finance/routes/financeHubRoutes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/finance/routes/storeProfitExpenseRoutes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/finance/services/financeHubService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/finance/services/storeProfitExpenseService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/invoices/routes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/invoices/services/batchPaymentService.js` - RUNTIME - P1: ACID batch tốt, nhưng giữ bản sao rule catalog pricing.
- `backend/src/domains/invoices/services/invoiceService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/builders/formatters.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/builders/orderMessageBuilder.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/core/constants.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/core/telegramClient.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/dispatchers/financeNotifier.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/dispatchers/orderNotifier.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/dispatchers/systemNotifier.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/notifications/telegram/services/qr.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/orders/routes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/orders/services/orderPaymentService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/orders/services/orderService.js` - RUNTIME - P1/P3: gia hạn dùng nhánh giá riêng; whitespace local.
- `backend/src/domains/payments/services/slotSuffixService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/payments/services/webhookPaymentService.js` - RUNTIME - PASS: transaction, idempotency và row locking cho webhook.
- `backend/src/domains/products/controllers/productController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/products/routes/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/products/services/catalogPricingService.js` - RUNTIME - P1: local mới; lặp update đơn ngoài transaction và trùng rule pricing.
- `backend/src/domains/products/services/productService.js` - RUNTIME - P1: cập nhật variant/tier/renewal ngoài transaction; caller nuốt lỗi đồng bộ.
- `backend/src/domains/suppliers/controllers/supplierController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/suppliers/routes/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/suppliers/services/supplierService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/suppliers/services/supplierSettlementService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/suppliers/utils/supplierCheck.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/system/middleware/sensitiveOperationRateLimiter.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/system/routes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/system/services/cronJobService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/system/services/externalApiConfigService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/system/services/otpProviderService.js` - RUNTIME - P1: gọi URL từ config bằng native fetch, bỏ qua SSRF guard.
- `backend/src/domains/system/services/systemConfigService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/system/services/systemLogService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/traffic/controllers/trafficController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/traffic/routes/trafficRoutes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/traffic/services/trafficService.js` - RUNTIME - P1: fallback sinh số liệu traffic giả.
- `backend/src/domains/wallets/controllers/walletController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/wallets/routes/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/wallets/services/walletService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/warehouse/controllers/warehouseController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/warehouse/routes/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/warehouse/services/browserLauncherService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/warehouse/services/warehouseService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/webhooks/controllers/webhookController.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/webhooks/routes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/domains/webhooks/services/sepayAuth.js` - RUNTIME - PASS: API key constant-time.
- `backend/src/domains/webhooks/services/webhookService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/eventBus.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/eventStoreService.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/eventTypes.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/subscribers/orderEventSubscriber.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/subscribers/productSubscriber.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/subscribers/supplierSubscriber.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/subscribers/telegramSubscriber.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/events/subscribers/warehouseSubscriber.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/scheduler/index.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/scheduler/tasks/autoBackupDatabaseTask.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/scheduler/tasks/creditSavingsProfitTask.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/scheduler/tasks/finalizeDailySummaryTask.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/scheduler/tasks/notifyFourDaysTask.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/scheduler/tasks/notifyZeroDaysTask.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/scheduler/tasks/updateOrderStatusTask.js` - RUNTIME - P1/P3: cron có advisory lock nhưng nhiều ghi độc lập; whitespace local.
- `backend/src/scheduler/withAdvisoryLock.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/server.js` - RUNTIME - PASS: origin allowlist, session hardening và RBAC tập trung.
- `backend/src/utils/clientError.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/utils/logger.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/src/utils/safeExternalRequest.js` - RUNTIME - PASS: helper SSRF guard chuẩn; cần được OTP tái sử dụng.
- `backend/src/utils/time.js` - RUNTIME - backend V2 chính thức theo domain/config/db/scheduler.
- `backend/tests/integration/acceptance_finance_metrics.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/finance_break_even_engine.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/finance_delta_notification.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/finance_personal_balance_snapshots.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/fixed_cost_receipt_allocation.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/import_order_finance.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/mavryk_order_zero_cost.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/package_categories.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/system_configs.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/warehouse.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/webhook_financial_account_balance.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/integration/webhook_receipt.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/run-integration.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/autoBackupDatabaseTask.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/batchPaymentReconciliation.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/browserLauncherService.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/catalogRenewalPricing.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/creditSavingsProfitTask.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/durationUtils.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/matchBankGateway.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/mavrykSupplierCheck.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/order_supplier_search.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/orderDeleteStatus.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/renewal_date_calculation.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/securityHardening.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `backend/tests/unit/slotSuffixImmutability.test.js` - TEST - kiểm thử backend; cần tăng integration DB cho luồng tài chính.
- `database/Dockerfile` - CONFIG/DATA - bootstrap hoặc tài liệu database.
- `database/init.sql` - CONFIG/DATA - bootstrap hoặc tài liệu database.
- `database/legacy_sql_migrations/000_full_schema.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/034_key_active_order_list_keys.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/035_supplier_account_holder.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/036_wallet_balance_scope.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/037_wallet_types_clear_linked_wallet.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/038_wallet_remove_sentinel_dailybalances.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/039_supplier_order_cost_log.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/040_supplier_order_cost_log_move_to_partner.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/041_supplier_order_cost_log_processing_only.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/042_supplier_order_cost_log_business_rules.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/043_supplier_order_cost_log_drop_name_status.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/044_supplier_order_cost_log_ncc_payment_status.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/045_supplier_payments_text_columns.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/046_supplier_order_cost_log_sync_processing.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/047_supplier_payment_ledger_drop_total_amount.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/048_drop_supplier_payment_ledger.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/049_supplier_order_cost_log_unpaid_renewal_to_processing.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/050_supplier_order_cost_log_refund_off_processing.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/051_supplier_order_cost_log_initial_ncc_unpaid.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/052_supplier_order_cost_log_multi_row.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/053_supplier_order_cost_log_first_on_cost.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/054_supplier_order_cost_log_insert_each_processing_entry.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/055_supplier_order_cost_log_consolidated.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/056_supplier_payments_drop_total_amount.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/057_supplier_order_cost_log_webhook_paid_flow.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/058_supplier_order_cost_log_default_unpaid.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/058_supplier_payments_status_to_content.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/059_supplier_payments_drop_payment_state.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/060_finance_store_profit_expenses.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/060_supplier_payments_one_row_per_supply.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/061_store_profit_expenses_drop_updated_at.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/062_store_profit_expenses_drop_expense_date.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/063_payment_receipt_sepay_dedupe.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/064_payment_receipt_drop_sub_account.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/065_payment_receipt_financial_state.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/066_payment_receipt_financial_audit_log.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/066_payment_receipt_payment_date_to_date.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/067_supplier_order_cost_log_refund_note_only.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/068_refund_columns_force_positive.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/069_order_list_refund_force_positive.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/070_fix_zero_import_when_no_refund.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/071_move_identity_and_audit_to_customer_web.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/072_move_customer_to_customer_info.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/073_move_receipt_tables_to_receipt_schema.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/074_move_reviews_to_product_schema.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/074_payment_receipt_batch_code.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/075_move_finance_to_dashboard_schema.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/076_move_tier_cycles_to_customer_web.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/077_merge_customer_info_into_customer_web.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/078_merge_key_active_into_system_automation.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/079_pending_refund_label_chua_hoan.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/080_create_refund_credit_notes.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/080_supplier_order_cost_log_ncc_refund_on_cancel.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/081_create_refund_credit_applications.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/082_fix_order_list_keys_trigger_to_system_automation.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/083_order_list_created_at_event_bucketing.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/084_order_list_gross_selling_price.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/085_refund_credit_note_split_links.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/086_webhook_finance_processing_paid_flow.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/087_mavn_preserve_logged_at_on_cost_update.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/088_store_profit_expenses_mavn_import.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/089_fix_order_refund_text_coalesce_triggers.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/090_drop_legacy_payment_receipt_dashboard_trigger.sql` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/legacy_sql_migrations/README.md` - ARCHIVED - bản migration tham chiếu; SHA trùng canonical, không runtime.
- `database/migrations/000_consolidated_schema.sql` - BOOTSTRAP - snapshot DDL cho DB mới/Docker init.
- `database/migrations/034_key_active_order_list_keys.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/035_supplier_account_holder.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/036_wallet_balance_scope.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/037_wallet_types_clear_linked_wallet.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/038_wallet_remove_sentinel_dailybalances.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/039_supplier_order_cost_log.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/040_supplier_order_cost_log_move_to_partner.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/041_supplier_order_cost_log_processing_only.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/042_supplier_order_cost_log_business_rules.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/043_supplier_order_cost_log_drop_name_status.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/044_supplier_order_cost_log_ncc_payment_status.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/045_supplier_payments_text_columns.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/046_supplier_order_cost_log_sync_processing.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/047_supplier_payment_ledger_drop_total_amount.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/048_drop_supplier_payment_ledger.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/049_supplier_order_cost_log_unpaid_renewal_to_processing.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/050_supplier_order_cost_log_refund_off_processing.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/051_supplier_order_cost_log_initial_ncc_unpaid.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/052_supplier_order_cost_log_multi_row.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/053_supplier_order_cost_log_first_on_cost.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/054_supplier_order_cost_log_insert_each_processing_entry.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/055_supplier_order_cost_log_consolidated.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/056_supplier_payments_drop_total_amount.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/057_supplier_order_cost_log_webhook_paid_flow.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/058_supplier_order_cost_log_default_unpaid.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/058_supplier_payments_status_to_content.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/059_supplier_payments_drop_payment_state.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/060_finance_store_profit_expenses.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/060_supplier_payments_one_row_per_supply.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/061_store_profit_expenses_drop_updated_at.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/062_store_profit_expenses_drop_expense_date.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/063_payment_receipt_sepay_dedupe.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/064_payment_receipt_drop_sub_account.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/065_payment_receipt_financial_state.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/066_payment_receipt_financial_audit_log.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/066_payment_receipt_payment_date_to_date.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/067_supplier_order_cost_log_refund_note_only.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/068_refund_columns_force_positive.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/069_order_list_refund_force_positive.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/070_fix_zero_import_when_no_refund.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/071_move_identity_and_audit_to_customer_web.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/072_move_customer_to_customer_info.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/073_move_receipt_tables_to_receipt_schema.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/074_move_reviews_to_product_schema.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/074_payment_receipt_batch_code.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/075_move_finance_to_dashboard_schema.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/076_move_tier_cycles_to_customer_web.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/077_merge_customer_info_into_customer_web.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/078_merge_key_active_into_system_automation.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/079_pending_refund_label_chua_hoan.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/080_create_refund_credit_notes.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/080_supplier_order_cost_log_ncc_refund_on_cancel.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/081_create_refund_credit_applications.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/082_fix_order_list_keys_trigger_to_system_automation.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/083_order_list_created_at_event_bucketing.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/084_order_list_gross_selling_price.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/085_refund_credit_note_split_links.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/086_webhook_finance_processing_paid_flow.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/087_mavn_preserve_logged_at_on_cost_update.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/088_store_profit_expenses_mavn_import.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/089_fix_order_refund_text_coalesce_triggers.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/090_drop_legacy_payment_receipt_dashboard_trigger.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/091_supplier_order_cost_log_fn_canonical.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/092_product_package_requires_activation.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/093_dashboard_daily_revenue_summary.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/094_daily_revenue_summary_total_shop_cost.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/095_daily_revenue_summary_allocated_profit_tax.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/096_daily_revenue_summary_daily_profit.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/097_drop_daily_revenue_summary_daily_profit.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/098_daily_revenue_summary_dashboard_order_counts.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/099_dashboard_financial_change_log.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/100_dashboard_estimated_bank_balance_flow.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/101_supplier_order_cost_log_app_managed_guard.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/102_order_list_transaction.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/103_shop_bank_accounts.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/104_shop_bank_accounts_total_withdrawn.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/105_shop_bank_account_ledger.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/106_supplier_payments_shop_bank_account.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/107_order_payment_slots.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/109_usdt_wallets.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/110_order_list_payment_method.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/111_refund_credit_notes_off_flow_source.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/112_shop_bank_accounts_unique_account_bank.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/113_import_package_rules.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/114_performance_expression_indexes.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/migrations/115_dashboard_order_dates_indexes.sql` - MIGRATION - migration SQL canonical cho PostgreSQL.
- `database/README.md` - CONFIG/DATA - bootstrap hoặc tài liệu database.
- `database/seeds/README.md` - CONFIG/DATA - bootstrap hoặc tài liệu database.
- `database/seeds/seed_hero_banners_website_defaults.sql` - CONFIG/DATA - bootstrap hoặc tài liệu database.
- `deploy.sh` - CONFIG/OPS - triển khai và reverse proxy.
- `docker-compose.local-dev.yml` - CONFIG/OPS - triển khai và reverse proxy.
- `docker-compose.override.yml` - CONFIG/OPS - triển khai và reverse proxy.
- `docker-compose.yml` - CONFIG/OPS - triển khai và reverse proxy.
- `docs/architecture/5_data_streams_optimization_architecture.md` - DOC - tài liệu, không runtime.
- `docs/KNOWLEDGE_BASE.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-08-07_database_optimization_plan.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-08-07_test_specification.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-07_dashboard_incremental_delta.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-13_warehouse_package_categories_binding.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-14_unified_finance_hub_plan.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-21_v2_runtime_configuration_hardcode_remediation_plan.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-21_v2_traffic_analytics_upgrade_plan.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-29_batch_payment_log_and_auto_reconciliation_plan.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-30_web_to_mobile_app_conversion_plan.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-31_10m_orders_1m_products_scaling_strategy.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-31_master_task_plan.md` - DOC - tài liệu, không runtime.
- `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md` - DOC - tài liệu, không runtime.
- `docs/v1-v2-operational-data-import-plan.md` - DOC - tài liệu, không runtime.
- `docs/V2_ARCHITECTURE.md` - DOC - tài liệu, không runtime.
- `docs/V2_DATABASE_SCHEMA.md` - DOC - tài liệu, không runtime.
- `docs/v2-architecture-and-account-matching.md` - DOC - tài liệu, không runtime.
- `frontend/docker/frontend-nginx.conf` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/docker/nginx/00-bot-block-maps.conf` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/docker/nginx/snippets/bot-block-locations.conf` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/docker/nginx/snippets/deny-ips.conf` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/Dockerfile` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/index.html` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/package.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/package-lock.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/postcss.config.js` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/src/App.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/components/LoginBackground.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/components/LoginCard.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/components/LoginForm.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/hooks/useLogin.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/pages/LoginPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/styles/login.css` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/styles/retro-animations.css` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/auth/styles/retro-theme.css` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/dashboard/DashboardPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/DebtPaymentModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/DebtsAndInstallmentsSection.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/FinanceOverviewPanel.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/FixedCostList.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/FixedCostModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/FixedCostPaymentModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/InstallmentModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/NetWorthCards.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/PersonalAssetsModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/PersonalBankAccountModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/PersonalFinanceBalanceLogSection.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/SavingsAndAssetsSection.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/components/SmartForecastBreakEvenSection.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/FinanceHubPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/finance/types.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/invoices/components/AllocateReceiptModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/invoices/components/BatchDetailModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/invoices/components/BatchSubOrdersModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/invoices/components/CreateReceiptModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/invoices/components/PendingBatchesModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/OrderCreateEditModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/OrderDeleteModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/OrderDetailModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/OrderFilterBar.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/OrderTable.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/PayWithCreditModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/SearchableProductDropdown.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/SearchableSupplierDropdown.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/components/StatusBadge.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/constants/orderPrefix.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/constants/orderStatus.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/hooks/useOrderCatalog.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/hooks/useOrders.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/index.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/types.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/orders/utils/durationUtils.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/components/CategoryDeleteModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/components/CategoryModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/components/PackageCategoryCards.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/components/PackageCreateEditModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/components/PackageDetailModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/components/PackageFilterBar.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/components/PackageTable.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/index.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/PackageManagementPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/packages/types.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/components/BankAccountsTable.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/components/UsdtWalletsTable.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/components/WalletCreateEditModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/components/WalletDeleteModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/components/WalletFilterBar.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/components/WithdrawModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/index.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/payment-wallets/types.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/pricing/components/PricingCreateEditModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/pricing/components/PricingDeleteModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/pricing/components/PricingFilterBar.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/pricing/components/PricingTable.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/pricing/components/SupplierCostModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/pricing/index.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/pricing/types.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/suppliers/components/SupplierCreateEditModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/suppliers/components/SupplierDeleteModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/suppliers/components/SupplierDetailModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/suppliers/components/SupplierFilterBar.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/suppliers/components/SupplierOverviewTable.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/suppliers/index.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/suppliers/types.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/system/components/CronSchedulerTab.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/traffic/TrafficPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/CatalogCreateModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/CatalogDeleteModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/CatalogEditModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/WarehouseAccountsTable.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/WarehouseAddServiceModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/WarehouseCatalogGrid.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/WarehouseCreateModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/WarehouseEditAccountModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/WarehouseFilterBar.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/components/warehouseRowUtils.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/index.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/features/warehouse/types.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/index.css` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/layout/AppLayout.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/layout/Header.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/layout/navigation.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/layout/Sidebar.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/main.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/CreditPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/ExternalApiConfigPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/ExternalImportsPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/OrdersPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/PaymentWalletsPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/PricingPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/ReceiptsPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/SuppliersPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/SystemLogsPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/SystemPage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/pages/WarehousePage.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/routes/AppRoutes.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/routes/routeLoaders.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/api/apiCache.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/components/DateInputVN.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/components/DateRangePicker.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/components/GlassCard.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/components/NotificationModal.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/components/StatCard.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/components/ToastNotification.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/context/AuthContext.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/context/NotificationContext.tsx` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/hooks/useUrlPagination.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/utils/format.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/src/shared/utils/index.ts` - UI - frontend V2 chính thức; chưa có automated frontend test.
- `frontend/tailwind.config.js` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/tsconfig.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `frontend/vite.config.ts` - CONFIG/DOC - tệp hỗ trợ repository.
- `master_task_brief.md` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/app.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/App.tsx` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/assets/adaptive-icon.png` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/assets/favicon.png` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/assets/icon.png` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/assets/splash-icon.png` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/eas.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/index.ts` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/package.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/package-lock.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/README.md` - CONFIG/DOC - tệp hỗ trợ repository.
- `mobile/expo-admin-app/src/config/env.ts` - UI - mobile skeleton/health check; chưa có auth business flow hoàn chỉnh.
- `mobile/expo-admin-app/src/features/health-check/screens/HealthCheckScreen.tsx` - UI - mobile skeleton/health check; chưa có auth business flow hoàn chỉnh.
- `mobile/expo-admin-app/src/shared/api/client.ts` - UI - mobile skeleton/health check; chưa có auth business flow hoàn chỉnh.
- `mobile/expo-admin-app/src/shared/api/types.ts` - UI - mobile skeleton/health check; chưa có auth business flow hoàn chỉnh.
- `mobile/expo-admin-app/tsconfig.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `nginx/00-bot-block-maps.conf` - CONFIG/OPS - triển khai và reverse proxy.
- `nginx/conf.d/default.conf` - CONFIG/OPS - triển khai và reverse proxy.
- `nginx/nginx.conf` - CONFIG/OPS - triển khai và reverse proxy.
- `nginx/snippets/bot-block-locations.conf` - CONFIG/OPS - triển khai và reverse proxy.
- `package.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `package-lock.json` - CONFIG/DOC - tệp hỗ trợ repository.
- `README.md` - CONFIG/DOC - tệp hỗ trợ repository.
- `report/2026-10-29-batch-payment-acid-concurrency-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-29-batch-payment-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-29-batch-single-block-and-order-delete-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-30-order-date-calculation-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-30-receipt-94440658-allocation-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-30-vps-order-variant-fix-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-30-warehouse-product-link-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-30-warehouse-vs-package-logic-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-5-data-streams-optimization-architecture-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-delete-5-suppliers-and-reindex-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-expired-orders-orphan-supplier-cleanup-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-fix-order-package-sync-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-fix-warehouse-double-pagination-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-master-task-implementation-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-master-task-plan-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-notify-auto-reload-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-page-loading-performance-implementation-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-page-loading-performance-optimization-plan-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-supplier-reindex-and-package-cleanup-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-vps-merge-and-deploy-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-10-31-warehouse-variant-tag-migration-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-catalog-renewal-pricing-and-inactive-notifications-review.md` - REPORT - P3: chưa theo dõi; có khẳng định VPS không thể xác thực trong audit local.
- `report/2026-11-01-finance-personal-assets-view-to-table-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-slot-suffix-immutability-and-receipt-match-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-warehouse-adobe-consolidation-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-warehouse-canva-youtube-consolidation-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-warehouse-googleone-consolidation-and-resequence-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-warehouse-merge-duplicate-accounts-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-warehouse-package-status-sync-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-warehouse-service-tags-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `report/2026-11-01-webhook-bank-match-and-rebalance-review.md` - REPORT - tài liệu đánh giá, không runtime.
- `task.md` - CONFIG/DOC - tệp hỗ trợ repository.
- `task-mobile.md` - CONFIG/DOC - tệp hỗ trợ repository.

## Cập nhật triển khai 2026-11-01

### Hạng mục đã xử lý

- **P1 - Atomic catalog và gia hạn:** `updateProduct` hiện thực hiện cập nhật variant, tier price và đồng bộ đơn `RENEW_REQUIRED` trong cùng `withTransaction`. Lỗi đồng bộ sẽ rollback toàn bộ; event `PRODUCT_UPDATED` chỉ phát sau commit.
- **P1 - Nguồn giá canonical:** `catalogPricingService` là nơi duy nhất sở hữu phân tích prefix, chọn tier và đồng bộ giá. Batch payment chỉ gọi/re-export resolver chuẩn; scheduler bỏ vòng lặp tính giá riêng.
- **P1 - Scheduler lock/transaction:** `withAdvisoryLock` truyền `trx` vào handler; task cập nhật trạng thái và đồng bộ giá dùng chung transaction có advisory lock.
- **P1 - SSRF OTP:** Các provider OTP không còn dùng `fetch` trực tiếp với URL từ config. Tất cả gọi `requestConfiguredApi`, áp dụng HTTPS-only, chặn localhost/private IP, chặn redirect và giới hạn response.
- **P1 - Traffic giả:** Đã gỡ generator số liệu mô phỏng khỏi luồng runtime. Khi GA4 chưa cấu hình/lỗi, API trả `available: false` với lý do rõ ràng; UI hiển thị cảnh báo và không render KPI, biểu đồ hay export dữ liệu giả.
- **P3 - Cleanliness:** Đã xoá whitespace thừa ở các tệp thay đổi.

### Kiểm tra đã chạy sau sửa

- `npm.cmd --prefix backend test`: **59/59 pass**.
- `npm.cmd --prefix frontend run build`: **pass**.
- `node --check` cho các service/task backend thay đổi: **pass**.
- `npx.cmd knex migrate:list` trong `backend`: **19 completed, 0 pending**.
- `npm.cmd --prefix frontend audit --omit=dev --json`: **0 vulnerability**.
- `git diff --check`: **pass**.
- Regression mới: URL private trong luồng external request/OTP bị từ chối trước khi gửi request.

### Trạng thái nghiệm thu sau triển khai

**CHƯA NGHIỆM THU LIVE.** Các P1 trong phạm vi mã đã được xử lý và có unit/build evidence. Tuy nhiên chưa có `TEST_DATABASE_URL` an toàn để chạy integration transaction/concurrency, nên chưa chứng minh được rollback thật trên PostgreSQL và cạnh tranh với payment/webhook.

`npm audit fix --omit=dev` đã giảm audit backend từ 7 xuống 6 advisory `moderate`; phần còn lại là chuỗi transitive `google-gax`/`gcp-metadata`/`gaxios`/`rimraf`/`glob`/`minimatch`. Không dùng `--force` vì npm đề xuất downgrade breaking `nodemon` về `1.0.2`. Cần nâng có kiểm soát dependency gốc tương thích rồi chạy lại audit và toàn bộ test.

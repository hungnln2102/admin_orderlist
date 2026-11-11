## 2026-11-11 – Nghiệm thu giả lập 9 luồng SOP trên `mydtbmav_test`

### Phạm vi

- Dùng `TEST_DATABASE_URL` trỏ tới PostgreSQL local `mydtbmav_test`; không thao tác trên database nguồn `mydtbmav`.
- Bổ sung dữ liệu giả lập tối thiểu cho Credit, package category và warehouse catalog để kiểm thử đủ nhánh nghiệp vụ.
- Kiểm tra 9 luồng theo `docs/business-rules/core-business-flows.md` với integration test hiện có và regression unit test.

### Ma trận bằng chứng

| Luồng | Bằng chứng | Kết quả |
|---|---|---|
| 1. Biến động số dư Bank và idempotency | `webhook_financial_account_balance.test.js` | PASS `3/3` |
| 2. Webhook khớp thanh toán đơn hàng/biên lai | `webhook_receipt.test.js` | PASS `5/5` |
| 3. Thanh toán Credit đủ/thiếu tiền, QR phần còn thiếu | `credit_order_payment.test.js` | PASS `2/2` |
| 4. Đổi nhà cung cấp và đối soát công nợ | `supplier_reassignment_prorated_debt.test.js` | PASS `1/1` |
| 5. Nhập hàng và ghi nhận chi phí tài chính | `import_order_finance.test.js` | PASS |
| 6. Đơn Mavryk không tính trùng chi phí | `mavryk_order_zero_cost.test.js` | PASS `1/1` |
| 7. Gia hạn áp dụng giá mới và dashboard | `acceptance_finance_metrics.test.js` | PASS `2/2` |
| 8. Lưu kho, catalog, browser profile và slot | `warehouse.test.js` | PASS `7/7` |
| 9. Package category và gói liên kết kho | `package_categories.test.js` | PASS `7/7` |

### Thay đổi kỹ thuật

- Thêm `credit_paid_amount` cho `order_list` bằng migration `backend/src/db/migrations/20261111000001_add_credit_paid_amount_to_order_list.js` và khai báo tại `backend/src/db/tables.js`.
- Hoàn thiện thanh toán Credit toàn phần/bán phần trong `backend/src/domains/orders/services/orderCreditService.js`.
- Sửa truyền ngày giao dịch cho event thanh toán/gia hạn và dashboard tại các service Orders, Payments và Dashboard.
- Bổ sung formatter ngày dùng chung tại `backend/src/utils/time.js`; sửa `warehouseSlotService.js` không còn `ReferenceError: formatDateDisplay is not defined`.
- Bổ sung fixture test-only tại `backend/tests/fixtures/trustFlowFixtures.js` để tạo/khôi phục `login_url` YouTube trong database test.

### Kiểm tra đã chạy

- Integration matrix: 8 luồng chạy qua runner đều PASS; warehouse assertions PASS `7/7`.
- Backend unit suite: PASS `155/155`.
- `git diff --check`: PASS.

### Điều kiện còn lại trước khi đóng task

- Các assertion nghiệp vụ đều đạt `9/9` luồng. Riêng `warehouse.test.js` mở Chromium profile thật và process browser nền khiến runner không tự thoát sau khi in kết quả; process test đã được dừng thủ công sau khi toàn bộ `7/7` assertion PASS.
- Cần xử lý lifecycle đóng browser hoặc mock launcher trong integration harness nếu yêu cầu command phải kết thúc với exit code `0` tuyệt đối.

## [2026-11-11 21:10] Sửa đối chiếu biên lai theo transaction_id SePay

### Phạm vi

- Sửa luồng webhook tiền vào/ra để dùng `payload.transaction_id` làm định danh giao dịch bất biến.
- Đối chiếu và khôi phục số dư tài khoản SHOP #2 trên VPS production.

### Trạng thái nghiệm thu

- Đã hoàn thành và xác minh production.
- Số dư trước sửa: `3.571.292`; số dư đúng sau reconciliation: `5.011.396`.
- Đã ghi bù bốn ledger theo transaction ID: `98075823`, `98187303`, `98430011`, `98444792`.

### Thay đổi kỹ thuật

- `backend/src/domains/webhooks/services/webhookService.js`: ưu tiên và truyền `transaction_id`.
- `backend/src/domains/payments/services/webhookPaymentService.js`: chuẩn hóa `bankTransactionId`, duplicate check và event idempotency.
- `backend/src/domains/payments/services/webhookInboundOrderService.js`: credit ledger dùng transaction ID.
- `backend/src/domains/payments/services/webhookOutboundReceiptService.js`: debit ledger dùng transaction ID.
- `backend/tests/integration/webhook_financial_account_balance.test.js`: cập nhật assertion và thêm test transaction ID cố định.

### Kiểm tra đã chạy

- Syntax check các module webhook/payments: PASS.
- `webhook_financial_account_balance.test.js`: `4/4 PASS`.
- `webhook_receipt.test.js`: `5/5 PASS`.
- Backend unit suite: `155/155 PASS`.
- Production backend container: healthy; `/api/health` trả database connected.
- Production DB: balance `5.011.396`; ledger balance cuối `5.011.396`; receipt `#106–#108` đã gắn financial account #2.

### Điều kiện còn lại

- `acceptance_finance_metrics.test.js` có một failure do database test còn số dư tồn từ test trước (`620.001` thay vì baseline `0`); luồng gia hạn trong cùng suite vẫn PASS. Đây là lỗi cô lập fixture/test cleanup, không thuộc thay đổi transaction ID.
- VPS còn log `VPBank IMAP Worker: EVENTS is not defined`, là vấn đề riêng chưa xử lý trong phạm vi này.

## [2026-11-11 21:45] Kiểm thử hacker/tester toàn bộ luồng tài chính và CRUD

### Phạm vi và môi trường

- Chạy trên các database PostgreSQL local clone riêng có tên chứa `_test`; không ghi vào `mydtbmav` nguồn và không ghi production.
- Unit backend: `155/155 PASS`.
- Frontend: `npm run build` PASS (`tsc && vite build`).
- Các clone test riêng được tạo cho webhook, import, supplier, credit, finance metrics, package, warehouse, order CRUD probe và unallocated receipt.

### Kết quả đạt

- Webhook financial account: `4/4 PASS`, gồm tiền vào, tiền ra, replay và `transaction_id` làm ID ledger cố định.
- Webhook receipt/order: `5/5 PASS`, gồm đơn mới, gia hạn, unmatched, idempotency và OUT chưa phân bổ.
- Nhập hàng tài chính: PASS; supplier reassignment: `1/1 PASS`; credit đủ/thiếu tiền: `2/2 PASS` sau khi áp dụng migration test.
- Finance metrics: `2/2 PASS`; package categories: `7/7 PASS`; warehouse assertions: `7/7 PASS`.
- Luồng `UNALLOCATED -> list -> allocate -> retry`: PASS; receipt về `FULLY_ALLOCATED`, đơn chuyển `PAID`, retry không tạo allocation lần hai.
- Order CRUD hợp lệ: create/update/delete đã chạy được trước khi probe chuyển sang ca trùng mã; import expense CRUD trực tiếp chưa đạt điều kiện nghiệm thu trong lượt này.
- Unit security/order-delete/product-delete/supplier-accounting: PASS trong tổng `155/155`.

### Finding cần xử lý

- **P1 - Trùng mã đơn:** hai lần `createOrder()` cùng `id_order` khi đơn thứ nhất còn tồn đều được ghi nhận; không có rejection từ DB/service. Cần thêm unique constraint hoặc validation có lock/transaction, sau đó thêm regression test concurrency.
- **P2 - Fixture warehouse:** `warehouse.test.js` chỉ đạt đủ `7/7` sau khi seed `login_url` test-only trực tiếp; helper hiện hữu chưa làm cho nhánh launcher ổn định trong clone mới.
- **P2 - Cleanup financial:** webhook tests có thể làm thay đổi số dư tài khoản fixture dù đã xóa receipt/order; mỗi suite cần clone riêng hoặc cleanup ledger/account balance đầy đủ.
- **P2 - Runner lifecycle:** warehouse assertions đạt nhưng Chromium nền giữ process, runner không tự kết thúc với exit code `0`; cần đóng browser hoặc mock launcher trong harness.
- **Chưa đủ bằng chứng:** chưa chạy live HTTP auth/IDOR và chưa đọc log VPS trong lượt này vì chưa có cấu hình SSH endpoint an toàn trong môi trường local.

### Trạng thái

- Các luồng nghiệp vụ đã có bằng chứng local mở rộng, nhưng chưa đóng nghiệm thu toàn bộ do finding trùng `id_order`, import CRUD chưa có probe hoàn tất, fixture/cleanup và thiếu live auth/VPS log evidence.

## [2026-11-11 22:05] Xử lý trùng mã `id_order`

### Phạm vi và nguyên nhân gốc

- Runtime dùng `business.order_list`; migration cũ chỉ tạo index thường trên bảng này, còn unique index legacy nằm ở `orders.order_list` nên không bảo vệ runtime.
- `createOrder()` trước đây nhận `payload.id_order` và insert trực tiếp, không chuẩn hóa, không kiểm tra trùng và không chuyển lỗi race thành lỗi nghiệp vụ.

### Thay đổi kỹ thuật

- Thêm `backend/src/db/migrations/20261111000002_unique_order_code.js`: audit duplicate fail-closed, sau đó tạo unique expression index `UPPER(BTRIM(id_order))` trên schema runtime.
- Cập nhật `backend/src/domains/orders/services/orderService.js`: trim/uppercase mã nhập vào, sinh mã khi rỗng, kiểm tra duplicate trong transaction, bắt PostgreSQL `23505` cho cạnh tranh đồng thời.
- Thêm `backend/tests/integration/order_id_order_uniqueness.test.js` với kiểm thử hoa/thường/khoảng trắng và hai request đồng thời.

### Kiểm tra và nghiệm thu

- Clone `mydtbmav_test`: migration ban đầu dừng đúng khi phát hiện fixture trùng `MAVC2FEN6` (`id` 618/619); chỉ dọn hai bản ghi fixture trong clone test, không chạm `mydtbmav` nguồn.
- Migration chạy thành công sau cleanup; regression `order_id_order_uniqueness.test.js`: `2/2 PASS`.
- Backend unit: `155/155 PASS`; `node --check` cho service, migration và test: PASS; `git diff --check`: PASS.

### Trạng thái

- Finding P1 trùng `id_order` đã xử lý ở code và DB migration local test. Chưa chạy migration production; cần backup/audit duplicate production trước khi triển khai.

## [2026-11-11 22:30] Đóng lỗi fixture tài chính và lifecycle Warehouse

### Thay đổi kỹ thuật

- `browserLauncherService` có `closeAllBrowserContexts`; `warehouseAutomationService` và `warehouseService` chuyển tiếp API này để integration teardown đóng persistent Chromium context.
- `warehouse.test.js` gọi cleanup browser trước khi hủy DB connection.
- `webhook_financial_account_balance.test.js` cleanup trong transaction: xóa allocation, receipt, ledger theo `financial_account_id`, rồi xóa riêng financial account fixture.

### Kiểm tra

- `warehouse.test.js`: `8/8 PASS`, hoàn tất với exit code `0`; không còn Chromium process giữ runner.
- `webhook_financial_account_balance.test.js`: `4/4 PASS` trên clone mới `mydtbmav_webhook_test`.
- Hậu kiểm sau webhook: `0` tài khoản `TESTMB%` và `0` ledger `TX-%` còn sót.

### Trạng thái còn lại

- Import expense CRUD và rollback transactional outbox cần phạm vi/kịch bản nghiệp vụ riêng; không có lỗi runtime đã tái hiện trong lượt này.
- Live auth/IDOR và đọc log VPS vẫn cần cấu hình endpoint/credential production có kiểm soát; không thể xác minh bằng local DB.

## [2026-11-11 23:05] Xác minh lỗi VPBank IMAP và audit VPS read-only

### Bằng chứng production

- VPS `/var/www/admin_orderlist` healthy, nhưng log ghi lúc `2026-11-11 14:04:58 UTC` (`21:04:58 ICT`): `VPBank IMAP Worker] Email sync failed: EVENTS is not defined`.
- Source trong backend container vẫn import chỉ `publishEventInTrx` tại `personalAssetService`, trong khi hai helper gọi `EVENTS.FINANCE_DEBT_*`; đây là nguyên nhân gốc theo stack trace integration.
- Audit production read-only tìm thấy duplicate `id_order`: `MAVC2FEN6|2` trên `business.order_list`.
- VPS worktree đang dirty (các webhook service, migration file local và thư mục runtime), nên không deploy hay chạy migration để tránh ghi đè thay đổi đang có.

### Sửa local và kiểm chứng

- Sửa import thành `const { EVENTS, publishEventInTrx } = require("@/events")` tại `backend/src/domains/finance/services/personalAssetService.js`.
- Cứng hóa fixture `vpbankEmailIngestion.test.js`: suffix debit/credit/replay và reference giao dịch sinh mới mỗi run, loại va chạm unique/idempotency với dữ liệu clone.
- `vpbankEmailIngestion.test.js`: `1/1 PASS` trên clone fresh; backend unit: `155/155 PASS`.

### Điều kiện triển khai production

- Phải sao lưu và đối soát hai bản ghi `MAVC2FEN6` cùng mọi FK trước khi chạy migration unique; migration hiện cố ý fail-closed.
- Cần tách/commit hoặc xác nhận toàn bộ worktree VPS dirty trước khi build/deploy bản sửa VPBank và migration order-code.

## [2026-11-11 23:30] Preflight VPS đánh giá deploy production toàn bộ

### Kết quả: NO-GO

- VPS backend/postgres healthy; `/api/health` trả database connected. Disk còn khoảng `9.1G` (`81%` đã dùng), chưa phải blocker độc lập nhưng build image cần theo dõi dung lượng.
- Local HEAD `a466d71b`, VPS HEAD `340a0d57`; local có ba commit sau VPS và local worktree còn 15 file modified + 2 untracked.
- VPS worktree dirty trên chính bốn service webhook; diff remote có `675` insertions và `629` deletions, đồng thời `git diff --check` báo trailing whitespace diện rộng. Full deploy có nguy cơ ghi đè thay đổi runtime chưa được baseline/review.
- Production còn duplicate `business.order_list.id_order`: `MAVC2FEN6` ở record `618` và `619`; cùng trạng thái/giá/cost/NCC, chưa có dependent `supplier_order_cost_log`. Migration unique chưa có trên VPS và sẽ fail-closed cho đến khi dữ liệu được đối soát/xử lý.
- Production chưa có migration `20261111000001_add_credit_paid_amount_to_order_list.js` và `20261111000002_unique_order_code.js`.
- Source backend trong container vẫn thiếu import `EVENTS` tại `personalAssetService`; local fix VPBank đã PASS integration, nhưng chưa được đưa vào production.
- Outbox không có item pending/processing/failed. Log còn lỗi Telegram `message thread not found`; cần sửa topic/config Telegram riêng sau deploy, không phải blocker DB migration.

### Điều kiện chuyển GO

1. Snapshot DB + source/hash container, rồi commit/stash hoặc xác nhận loại bỏ toàn bộ dirty change trên VPS (đặc biệt bốn webhook service).
2. Soát hai dòng `MAVC2FEN6`, ghi quyết định giữ/xóa/gộp có audit; không chạy unique migration trước bước này.
3. Tạo artifact deploy từ commit sạch chứa đầy đủ scope đã review; chạy unit/integration/migration rehearsal trên clone production.
4. Deploy theo maintenance window: backup, build image, migrate, health probe, webhook smoke, VPBank ingest probe, log monitoring/rollback window.

## [2026-11-11] Dọn Docker cache VPS để khôi phục dung lượng deploy

### Phạm vi và nguyên nhân

- Trước khi dọn, `/dev/vda1` có `50GB` tổng dung lượng, đã dùng `38GB`, còn `9.1GB` (`81%`).
- Phân rã cho thấy `/var/lib/containerd` chiếm `26GB`, `/var/lib/docker` chiếm `6.1GB`; `docker builder du` xác nhận BuildKit cache có thể thu hồi `16.76GB`.
- Log không phải nguyên nhân chính: Docker container logs khoảng `33MB`, system journal khoảng `237MB`.

### Thao tác đã thực hiện

- Kiểm kê container đang chạy, image dangling, volume dangling và BuildKit cache trước khi thay đổi.
- Dọn đúng tài nguyên Docker không còn tham chiếu: `docker builder prune -af`, `docker image prune -af`, `docker volume prune -f`.
- Không dừng/xóa container đang chạy, không xóa volume active PostgreSQL/Redis và không chạm dữ liệu nghiệp vụ, mã nguồn hoặc backup.

### Kết quả nghiệm thu

- BuildKit cache đã thu hồi `16.76GB`; image không còn container tham chiếu thu hồi `3.238GB`; volume dangling thu hồi `4.836GB`.
- Disk sau dọn: đã dùng `15GB`, còn `33GB`, mức sử dụng giảm từ `81%` xuống `31%`.
- `docker ps` xác nhận 9 container vẫn chạy; `admin_orderlist-backend` và `admin_orderlist-postgres` giữ trạng thái `healthy`.
- `docker system df` sau dọn: Build Cache `0B`, phần có thể thu hồi của image/container/volume `0B`.
## [2026-11-11] Xử lý blocker dữ liệu mã đơn và worktree VPS trước deploy

### Phạm vi và bằng chứng

- Production có đúng một nhóm mã đơn normalized bị trùng: `MAVC2FEN6` ở order `#618` và `#619`.
- Hai đơn đều `EXPIRED`, đã thanh toán, cùng giá/cost/ngày; chỉ khác `information_order`, nên là hai đơn thực và không được xóa gộp.
- Không có record đang tham chiếu mã trùng trong `billing.payment_receipt`, `billing.batch_payment_requests`, `business.supplier_order_cost_log`, các bảng warehouse hoặc refund. Không có FK child ở `supplier_order_cost_log`.
- VPS worktree gốc có bốn webhook service bị sửa trực tiếp cùng migration, ảnh sản phẩm, runtime log và warehouse profile chưa track; không được reset/clean để tránh mất dữ liệu vận hành.

### Thao tác đã thực hiện

- Sao lưu riêng hai dòng order trước sửa vào file chỉ root đọc được (`chmod 600`).
- Chạy transaction có khóa ghi: xác nhận duy nhất nhóm duplicate, kiểm tra mã thay thế khả dụng, đổi order `#619` sang `MAVC2FEA7`, tạo unique expression index `business.uq_order_list_id_order_upper_trim`, rồi commit.
- Snapshot toàn bộ diff tracked và file runtime untracked của VPS vào backup root-only; archive khoảng `171MB`.
- Tạo release worktree sạch tại `/var/www/admin_orderlist-release`, detached ở commit `340a0d57`; giữ nguyên worktree production cũ đang dirty.

### Hậu kiểm và trạng thái deploy

- Không còn `id_order` trùng sau khi normalize `UPPER(BTRIM(id_order))`; index unique có `indisunique=true`, `indisvalid=true`.
- `/api/health` trả `status=ok`, `database=connected`; disk còn `33GB` (`32%` sử dụng).
- Worktree release sạch nhưng đang ở commit VPS cũ `340a0d57`; chưa deploy source local mới. Bước deploy tiếp theo phải đồng bộ bản release đã được kiểm thử vào worktree release sạch, build image, migrate qua cơ chế release, rồi smoke test toàn hệ thống.
# Kế hoạch nghiệp vụ: Pipeline đối soát email VPBank vào Credit Ledger

- **Phiên bản:** `2.0` — thay thế kế hoạch ngày 2026-11-04
- **Ngày cập nhật:** 2026-11-04 (`Asia/Bangkok`)
- **Trạng thái:** Sẵn sàng triển khai có điều kiện; chưa được bật cho dữ liệu production trước Phase 5.
- **Phạm vi:** Một tài khoản thẻ tín dụng VPBank đã được phê duyệt, email thông báo giao dịch trong mailbox cấu hình, `credit_account_ledger` và `credit_statements`.

## 1. Mục tiêu và nguyên tắc nghiệp vụ

Mục tiêu là tiếp nhận email thông báo giao dịch như **evidence vận hành**, hạch toán các giao dịch đủ định danh vào sổ cái tín dụng, và cung cấp khả năng retry/replay mà không cộng trùng. Hệ thống không được suy đoán dư nợ chỉ từ hạn mức khả dụng hoặc từ email rời rạc.

1. **Nguồn sự thật:** `finance.credit_account_ledger` là nguồn sự thật duy nhất cho principal, interest và fee. `personal_assets` chỉ là liên kết danh mục/UI; không cập nhật `amount` như một số dư song song.
2. **Mốc kế toán:** Sao kê ngân hàng đã xác minh là mốc statement/closing balance. Chỉ các email phát sinh sau mốc đó mới được auto-post ở Phase production.
3. **Không tự đoán:** Email thiếu reference code, không xác định được loại giao dịch, fee, reversal, refund, pending hoặc chênh lệch với statement phải vào hàng chờ đối soát thủ công, không tạo ledger row.
4. **Idempotency hai lớp:** Identity email chống đọc lại cùng thư; business identity chống hạch toán lại cùng giao dịch. Hai khóa này không thay thế nhau.
5. **An toàn hơn realtime:** Dữ liệu đã commit quan trọng hơn tốc độ UI. SSE chỉ báo cho UI refetch sau commit; mất SSE không được làm mất dữ liệu.

## 2. Phạm vi và ngoài phạm vi

### Trong phạm vi

- Nhận dạng và hiển thị rõ email VPBank theo **dụng cụ ngân hàng**, **loại tài liệu** và **đích hạch toán**.
- Thẻ tín dụng đã map với `credit_accounts` đang `ACTIVE`: `CARD_SPEND` -> `recordPrincipalInTrx`; `CARD_PAYMENT` -> `recordPaymentInTrx`.
- Thẻ ghi nợ map với `financial_accounts`: tự tạo log biến động cá nhân, phân loại chi tiêu và cập nhật projection số dư quan sát; không đi qua `credit_account_ledger`.
- Sao kê thẻ tín dụng: nhận diện như tài liệu statement để finance owner xác minh và nhập qua `importCreditCardStatement`.
- Import statement, đối soát closing balance, manual sync, trạng thái worker, notification durable và UI refresh.

### Ngoài phạm vi Phase 1

- Giao dịch tài khoản không có card mapping, chuyển khoản không nhận diện được và nguồn ngoài email VPBank.
- Hạch toán tự động fee, refund, reversal, installment adjustment, dispute và giao dịch pending.
- Dùng email để tạo hoặc thay thế sao kê chính thức.

## 2.1. Danh mục nhận dạng thẻ và tài liệu VPBank

Không được dùng riêng bốn số cuối thẻ làm định danh nghiệp vụ: thẻ có thể được cấp lại hoặc hai thẻ khác nhau có cùng hậu tố. Trước khi bật worker, finance owner phải lập registry `finance.bank_instrument_mappings` và duyệt từng mapping.

| Loại dụng cụ | Dấu hiệu tối thiểu cần có trong email | Đích nghiệp vụ | Chính sách Phase 1 |
| --- | --- | --- | --- |
| `CREDIT_CARD` | Bank/product hợp lệ, card suffix đã map và transaction reference code | `credit_accounts` / `credit_account_ledger` | Có thể auto-apply chỉ với `CARD_SPEND` hoặc `CARD_PAYMENT` |
| `DEBIT_CARD` | Bank/product hợp lệ, suffix đã map duy nhất với `financial_accounts` | `financial_accounts` + personal spending log | Tự ghi log/cập nhật projection số dư có kiểm soát; không ghi credit ledger |
| `UNMAPPED_CARD` | Có card mask/suffix nhưng không có mapping duy nhất | Không có | `MANUAL_REVIEW`; không tự tạo account hoặc mapping |
| `UNKNOWN_INSTRUMENT` | Thiếu product, mask/suffix hoặc có nhiều mapping | Không có | `MANUAL_REVIEW` hoặc `REJECTED` theo policy |

Registry có các trường tối thiểu: `provider`, `instrument_kind`, `masked_suffix`, `product_hint`, `linked_credit_account_id` hoặc `linked_financial_account_id`, `status`, `effective_from`, `effective_to`, `approved_by`, `approved_at`. Một mapping chỉ được active cho một đích hạch toán; với mapping mơ hồ worker phải dừng auto-apply.

| Loại email | Ý nghĩa nghiệp vụ | Hành động |
| --- | --- | --- |
| `CREDIT_CARD_TRANSACTION` | Biến động chi tiêu hoặc thanh toán nợ thẻ tín dụng | Parse transaction; chỉ auto-apply khi mapping và bank reference hợp lệ |
| `DEBIT_CARD_TRANSACTION` | Biến động số dư thẻ ghi nợ/tài khoản thanh toán | Ghi personal spending log, phân loại và đồng bộ projection số dư của financial account; không ghi credit ledger |
| `CREDIT_CARD_STATEMENT` | Sao kê chu kỳ thẻ tín dụng | Lưu metadata/evidence reference, yêu cầu finance owner xác minh rồi gọi `importCreditCardStatement` |
| `DEBIT_ACCOUNT_STATEMENT` | Sao kê tài khoản hoặc thẻ ghi nợ | Lưu metadata/evidence reference để đối soát `financial_account_ledger`; ngoài auto-apply Phase 1 |
| `NON_TRANSACTION` | Marketing, OTP, thay đổi điều khoản hoặc email không xác minh được | `REJECTED`, không hạch toán |
## 2.2. Sổ biến động và phân loại chi tiêu thẻ ghi nợ

### Mục tiêu nghiệp vụ

Mỗi email biến động của thẻ debit đã map phải tạo **một log bất biến** trong phần tài sản cá nhân. Log này là nguồn để xem lịch sử, chi tiêu theo tháng, merchant, danh mục và đối soát số dư thực tế; không dùng `store_profit_expenses` vì bảng đó thuộc chi phí vận hành shop.

### Bảng mới

**`finance.personal_spending_categories` (Danh mục chi tiêu động — Không hardcode)**

- Toàn quyền do Master tự tạo, chỉnh sửa và quản lý động qua giao diện; tuyệt đối **không hardcode** danh sách danh mục trong mã nguồn frontend/backend.
- Các cột: `id`, `code` (mã định danh duy nhất, tự sinh slug hoặc người dùng nhập), `name` (tên hiển thị), `icon` (tên icon Lucide), `color` (mã màu nhận diện/badge Tailwind), `monthly_budget` (hạn mức tháng tùy chọn), `is_active` (bật/tắt, không xóa cứng để bảo vệ dữ liệu cũ), `sort_order` (thứ tự hiển thị), `created_at`, `updated_at`.
- Khi khởi tạo migration: Chỉ nạp sẵn bộ danh mục mẫu cơ bản (Seed data); sau đó mọi thao tác thêm/sửa/ẩn danh mục đều thực hiện trực tiếp trên giao diện và lưu vào bảng này.

**`finance.personal_spending_category_rules` (Quy tắc tự động gán từ khóa động)**

- Rule do Master quản lý qua giao diện; không hardcode logic `if/else` trong code.
- Các cột: `id`, `category_id`, `keyword_pattern` (từ khóa merchant/nội dung dạng text), `priority`, `is_active`.
- Worker IMAP khi đọc email giao dịch sẽ query bảng này để tự động gán category theo từ khóa. Master có thể thêm từ khóa mới bất kỳ lúc nào qua UI (kể cả khi vừa đổi danh mục trên một giao dịch).

**`finance.personal_debit_transaction_logs`**

- Một row cho một biến động debit email được nhận dạng, khóa receipt identity và business key để chống trùng.
- Cột bắt buộc: `financial_account_id`, `instrument_mapping_id`, `ingestion_receipt_id`, `occurred_at`, `direction` (`OUTFLOW`/`INFLOW`), `amount`, `merchant_normalized`, `category_id`, `category_source` (`RULE`/`MANUAL`/`UNCLASSIFIED`), `observed_balance_after`, `balance_projection_status`, `business_key`, `source`, `created_at`.
- `financial_account_ledger_id` là nullable nhưng unique khi có giá trị, liên kết bút toán balance projection. Không lưu full card number, raw email hoặc full bank reference.

### Quy tắc nhận dạng thẻ debit với tài khoản

1. Registry mapping phải hiển thị rõ `VPBank / Debit card / mask thẻ / tên tài khoản tài chính đích / mask số tài khoản`; không dùng suffix thẻ một mình.
2. Một email debit chỉ được auto-apply khi mapping active là duy nhất và đích là một `financial_accounts` đang `is_active=true`, scope `PERSONAL`.
3. Nếu email có card suffix nhưng mapping bị hết hạn, trùng hoặc chưa map, tạo receipt `MANUAL_REVIEW`, không cập nhật số dư của bất kỳ tài khoản nào.
4. UI phải cho thấy chính xác: thẻ nào -> tài khoản nào -> log nào, kể cả khi một VPBank account có nhiều thẻ debit được map chung.
## 3. Bảo mật, quyền riêng tư và redlines

1. Không ghi email cá nhân, số thẻ, reference code, merchant, số tiền, raw MIME hoặc App Password vào tài liệu, fixture, log ứng dụng hay Git.
2. Raw email chỉ tồn tại trong mailbox; database chỉ giữ metadata tối thiểu, hash SHA-256 và dữ liệu parse cần audit. Bằng chứng gốc, nếu phải giữ, lưu ở kho mã hóa có phân quyền và retention được phê duyệt.
3. Sender whitelist chỉ là bộ lọc. Email không đạt quy tắc mailbox/domain/header đã phê duyệt phải bị `REJECTED`; không coi địa chỉ `From` là bằng chứng giao dịch duy nhất.
4. Credentials chỉ lấy từ runtime secret/env. Thiếu biến hoặc chạy ngoài production allowlist thì worker fail closed, không kết nối mailbox.
4. Cấu hình Mailbox & App Password do Master tự thiết lập động 100% qua Giao diện (UI) và lưu trữ bảo mật trong Cơ sở dữ liệu (Database-driven config, bảng `system_configs` / `external_api_configs`), hoàn toàn KHÔNG phụ thuộc vào biến môi trường `.env`.
   - Giao diện có popup cấu hình an toàn `VpbankMailboxConfigModal.tsx` và nút bấm `[ 🔌 Kiểm tra kết nối ngay ]` (test handshake trực tiếp với `imap.gmail.com:993` và trả về kết quả tức thì).
   - API trả về Frontend luôn REDACT/Mask mật khẩu ứng dụng (`••••••••••••••••`), bảo đảm không lộ credential ra Network/DevTools.
   - Hỗ trợ Smart-Merge (giữ nguyên App Password cũ nếu không nhập lại) và Hot-Reload (cập nhật in-memory cache và socket worker ngay lập tức mà không cần khởi động lại server).
   - Thiếu cấu hình hoặc kiểm tra kết nối thất bại thì worker ở trạng thái `DISABLED`/`OFFLINE`, tuyệt đối không gọi spam mailbox.
5. Việc loại dữ liệu nhạy cảm khỏi Git history là một thay đổi bảo mật riêng: cần phê duyệt rewrite history, xử lý remote/clone/CI backup và kiểm tra lại tất cả refs. Chỉ redact file ở HEAD không đủ.

## 4. Mô hình dữ liệu và khóa định danh

### 4.1. Migrations

Tạo migration `20261104000001_create_email_reconciliation_pipeline.js`. Sau migration, khai báo đầy đủ `TABLES` và `COLS` trong `backend/src/db/tables.js`; runtime không được tự ghép tên bảng/cột bằng string. Không dùng path `backend/src/db/dbSchema.js` vì path này không tồn tại trong source tree hiện tại.

**`finance.email_sync_checkpoints`**

- Khóa duy nhất: `(provider, mailbox_alias, folder_name)`.
- Cột chính: `uid_validity`, `last_terminal_uid`, `worker_state`, `last_success_at`, `last_error_code`, `updated_at`.
- `last_terminal_uid` chỉ là UID liên tiếp cao nhất đã ở trạng thái terminal; không được bỏ qua một email còn `RETRYABLE_FAILED`.

**`finance.email_ingestion_receipts`**

- Khóa duy nhất receipt: `(provider, mailbox_alias, folder_name, uid_validity, email_uid)`.
- `message_id` là nullable và chỉ unique partial khi có giá trị; không dùng làm khóa duy nhất bắt buộc.
- Cột: `received_at`, `sender_domain`, `subject_hash`, `body_hash`, `parse_version`, `document_kind`, `instrument_kind`, `instrument_mapping_id`, `business_key`, `transaction_kind`, `status`, `failure_code`, `retry_count`, `terminal_at`, `ledger_id`, `created_at`, `updated_at`.
- Status hợp lệ: `RECEIVED`, `PARSED`, `APPLIED`, `REJECTED`, `RETRYABLE_FAILED`, `MANUAL_REVIEW`.

**`finance.bank_instrument_mappings`**

- Registry được finance owner phê duyệt trước khi email được auto-apply.
- Mỗi row liên kết một card mask/product hint với **một** `credit_account_id` hoặc **một** `financial_account_id`, không được liên kết đồng thời hai đích.
- Unique active mapping: `(provider, instrument_kind, masked_suffix, product_hint)` trong thời gian hiệu lực; conflict hoặc hết hạn chuyển email sang `MANUAL_REVIEW`.
**`finance.email_reconciliation_runs`**

- Lưu mỗi lượt manual/backfill: `mode` (`DRY_RUN`, `APPLY`), phạm vi UID, số receipt theo trạng thái, account, người khởi tạo và thời điểm. Bảng này là audit trail; không chứa raw email.

## 5. Quy tắc kế toán và baseline statement

1. Finance owner nhập statement chính thức qua `importCreditCardStatement(accountId, payload)` với `cycleStartAt`, `cycleCloseAt`, `dueAt`, `openingPrincipal`, `closingPrincipal`, `interestDue`, `feeDue`, `minimumDue`, `totalDue` và `sourceReference` đã redacted.
2. Nếu hệ thống cần opening ledger, phải có evidence reference được phê duyệt. Không dùng mặc định `unverifiedOpeningBalance` cho mốc production đã ký duyệt.
3. Trước auto-sync, chạy dry-run cho tất cả email sau `cycleCloseAt`; report phải liệt kê proposed entries, email cần manual review và công thức closing balance.
4. Auto-apply chỉ khi business key có bank reference code được normalize và duy nhất trong ngữ cảnh account. Không có reference code -> `MANUAL_REVIEW`.
5. Hạn mức khả dụng là quan sát để cảnh báo, không phải bút toán. Khác biệt giữa observed available limit và balance ledger được ghi nhận để đối soát, không tự sửa số dư.

## 6. Luồng ingestion và transaction ACID

### 6.1. Worker lifecycle

1. `vpbankImapWorker` chỉ được start từ `bootstrapBackgroundServices()` khi `VPBANK_SYNC_ENABLED=true` và tất cả secret/config validation pass.
1. `vpbankImapWorker` được quản lý trạng thái động từ cấu hình Database do Master thiết lập qua UI (không phụ thuộc file `.env` hay cần restart server). Khi bật tính năng và thông tin kết nối Gmail hợp lệ (đã test handshake thành công), worker mới khởi chạy socket IDLE hoặc đăng ký scheduler polling.
2. Chỉ một worker active cho một `(provider, mailbox_alias, folder_name)`. Dùng database lease hoặc PostgreSQL advisory lock; instance không sở hữu lease chỉ báo `STANDBY` và không fetch/apply.
3. Worker reconnect có backoff giới hạn, health state (`OFFLINE`, `CONNECTING`, `ONLINE`, `DEGRADED`) và graceful shutdown. IDLE chỉ là tín hiệu có thư mới; sau reconnect phải quét bù từ checkpoint.
4. Khi UIDVALIDITY thay đổi, worker khóa checkpoint, mở reconciliation run `DRY_RUN`, tạo receipt theo UIDVALIDITY mới và không auto-apply cho đến khi finance owner phê duyệt phạm vi quét.

### 6.2. Parser và phân loại

`vpbankEmailParser` là pure function. Parser phải trả về `documentKind`, `instrumentKind`, `maskedSuffix`, `productHint`, `transactionKind`, `amount`, `effectiveAt`, `referenceCode`, `availableBalanceObserved` (nếu có) và `confidence`.

- `CREDIT_CARD_TRANSACTION` + `CARD_SPEND`: amount dương, timestamp có timezone, card mapping duy nhất và bank reference code.
- `CREDIT_CARD_TRANSACTION` + `CARD_PAYMENT`: amount dương, timestamp có timezone, card mapping duy nhất và bank reference code.
- `DEBIT_CARD_TRANSACTION`: trả về `OUTFLOW` hoặc `INFLOW`, merchant, số tiền, `observedBalanceAfter` nếu email có, và card/account mapping candidate; không đổi thành `CARD_SPEND` hoặc `CARD_PAYMENT`.
- `CREDIT_CARD_STATEMENT` và `DEBIT_ACCOUNT_STATEMENT`: trích metadata/số kỳ để finance owner xác minh, không tự hạch toán chỉ từ email.
- `MANUAL_REVIEW`: mapping mơ hồ, thiếu reference, product không khớp hoặc loại transaction không được phép.
- `REJECTED`: sender/header/domain không đạt policy hoặc message không phải tài liệu/giao dịch ngân hàng.

Parser không truy cập database, không tự tạo account và không tự sửa balance. Mapping resolver chạy sau parser; chỉ resolver mới xác định đích hạch toán. Fixture là dữ liệu tổng hợp/redacted; mỗi fixture có expected normalized output, document/instrument kind và parse version.

### 6.3. Một email đủ điều kiện

Sau khi MIME/parser hoàn tất, thực hiện một Knex transaction:

1. Lock checkpoint và upsert receipt theo receipt identity. Nếu receipt đã terminal, kết thúc idempotent.
2. Xác minh mapping đang active, instrument kind khớp template, đích hạch toán duy nhất và business key chưa được hạch toán. `DEBIT_CARD_TRANSACTION` đi vào personal debit service; statement, fee/refund/pending hoặc mapping không duy nhất không được đi tiếp vào credit ledger.
3. `CARD_SPEND` gọi `recordPrincipalInTrx(trx, accountId, { eventType: "CARD_SPEND", amount, effectiveAt, sourceReference, idempotencyKey, metadata })`.
4. `CARD_PAYMENT` gọi `recordPaymentInTrx(trx, accountId, { amount, effectiveAt, sourceReference, idempotencyKey, note })`.
5. `DEBIT_CARD_TRANSACTION` gọi planned `personalDebitTransactionService.applyEmailEventInTrx(trx, { financialAccountId, receiptId, businessKey, direction, amount, occurredAt, merchant, category, observedBalanceAfter })`; service tạo đúng một `personal_debit_transaction_logs` row và bút toán `financial_account_ledger`/projection liên kết.
6. Lưu `ledger_id` hoặc `personal_debit_transaction_log_id`, đổi receipt thành `APPLIED`, cập nhật checkpoint đến UID terminal liên tiếp và thêm outbox record qua `notificationHub.dispatch({ trx, ... })` với idempotency key riêng.
7. Đăng ký `trx.afterCommit()` phát `FINANCE_CARD_TRANSACTION_SYNCED` hoặc `FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED`. Payload chỉ gồm target id, log/ledger id, event kind và timestamp; không gửi raw email hoặc số dư nhạy cảm.

Không cập nhật `personal_assets.amount` trong luồng này. UI lấy balance qua read model từ credit ledger.

### 6.4. Đồng bộ số dư debit không cần nhập tay

`financial_accounts.balance` là projection số dư hiện tại; log debit là lịch sử biến động chi tiết. Với một email debit hợp lệ, service lock `financial_accounts` và áp dụng quy tắc sau trong cùng transaction:

1. Ghi personal debit log bất biến với amount, direction, merchant, category và `observed_balance_after`.
2. Nếu event là quan sát mới nhất của account theo `occurred_at` và có `observed_balance_after`, cập nhật projection `financial_accounts.balance` về đúng số dư ngân hàng quan sát; ghi `balance_projection_status = OBSERVED_APPLIED` và ledger link/audit delta.
3. Nếu số dư dự kiến từ balance trước đó lệch observed balance, vẫn giữ log giao dịch và ghi reconciliation metadata `observed - expected`; không xóa/sửa lịch sử. UI đánh dấu `RECONCILIATION_ADJUSTED` để xem xét chênh lệch.
4. Nếu email đến muộn hơn một observed event đã áp dụng, vẫn ghi log và category nhưng không ghi đè current balance; status là `LATE_ALREADY_COVERED` vì số dư mới hơn đã bao gồm biến động đó.
5. Nếu email không có `observed_balance_after`, ghi log và category nhưng status `BALANCE_UNVERIFIED`; không tự suy đoán current balance.

Nhờ vậy mỗi biến động debit được lưu đúng một lần, số dư hiện tại theo email mới nhất tự cập nhật, còn giao dịch đến trễ không làm double count hoặc kéo số dư lùi về quá khứ.
### 6.4. Lỗi, retry và replay

- Lỗi tạm thời (IMAP/network/DB timeout): receipt `RETRYABLE_FAILED`, tăng retry count, giữ checkpoint trước UID lỗi và retry có backoff.
- Lỗi dữ liệu/business: `MANUAL_REVIEW` hoặc `REJECTED`, lưu failure code; finance owner quyết định bỏ qua hay tạo adjustment theo quy trình riêng.
- Một receipt terminal được replay phải trả kết quả idempotent, không tạo ledger/outbox thứ hai.
- Manual sync luôn tạo `email_reconciliation_runs`; mặc định `DRY_RUN`. `APPLY` yêu cầu admin role và phạm vi UID/account rõ ràng.

## 7. API, notification và UI

1. `POST /api/finance/vpbank/reconciliation-runs`
   - Admin-only; body gồm account id, `mode`, phạm vi UID tùy chọn.
   - Trả run id; không giữ HTTP request cho toàn bộ vòng quét.
2. `GET /api/finance/vpbank/reconciliation-status`
   - Trả worker state, checkpoint metadata đã redacted, lag, run gần nhất và count receipt theo status.
3. `GET /api/finance/vpbank/reconciliation-runs/:id`
   - Trả kết quả dry-run/apply, chênh lệch, receipt cần manual review; không trả raw MIME.
4. Event mới `FINANCE_CARD_TRANSACTION_SYNCED` và `FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED` phải được thêm vào `backend/src/events/eventTypes.js` và danh sách lắng nghe của `backend/src/domains/realtime/subscribers/realtimeSubscriber.js`.
5. Outbox dùng `topicKey: "FINANCE"`; không hard-code topic id. Bản ghi outbox phải được insert cùng transaction, còn SSE chỉ broadcast sau commit.
6. `DebtsAndInstallmentsSection.tsx` chỉ hiển thị thẻ tín dụng/công nợ. Biến động thu/chi thẻ cá nhân và tài khoản debit được đặt **trực tiếp trong Tab "Tích lũy & Tài sản" (`SAVINGS_ASSETS`)** của `FinanceHubPage.tsx`, bố trí theo dạng **Side-by-Side Dual-Grid** (Bảng Trái: Lịch sử chốt số dư snapshot; Bảng Phải: Sổ biến động thu/chi cá nhân).
4. `GET /api/finance/vpbank/mailbox-config`
   - Lấy cấu hình mailbox hiện tại (App Password được redact/mask dạng `has_app_password: true`, `app_password_masked: "••••••••••••••••"`, email, sync_mode, is_active).
5. `POST /api/finance/vpbank/mailbox-config`
   - Cập nhật cấu hình mailbox (email, app_password nếu có đổi, sync_mode, is_active). Hỗ trợ smart-merge giữ nguyên password cũ nếu để trống. Tự động reload worker mà không cần restart server.
6. `POST /api/finance/vpbank/mailbox-config/test-connection`
   - Bắt tay socket trực tiếp với Gmail IMAP (`imap.gmail.com:993`) bằng credential gửi lên hoặc credential đang lưu trong DB, trả về kết quả thành công/thất bại và latency tức thì mà không cần ghi DB trước.
7. Event mới `FINANCE_CARD_TRANSACTION_SYNCED` và `FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED` phải được thêm vào `backend/src/events/eventTypes.js` và danh sách lắng nghe của `backend/src/domains/realtime/subscribers/realtimeSubscriber.js`.
8. Outbox dùng `topicKey: "FINANCE"`; không hard-code topic id. Bản ghi outbox phải được insert cùng transaction, còn SSE chỉ broadcast sau commit.
9. `DebtsAndInstallmentsSection.tsx` chỉ hiển thị thẻ tín dụng/công nợ. Biến động thu/chi thẻ cá nhân và tài khoản debit được đặt **trực tiếp trong Tab "Tích lũy & Tài sản" (`SAVINGS_ASSETS`)** của `FinanceHubPage.tsx`, bố trí theo dạng **Side-by-Side Dual-Grid** (Bảng Trái: Lịch sử chốt số dư snapshot; Bảng Phải: Sổ biến động thu/chi cá nhân).

### 7.1. Vị trí hiển thị bắt buộc & Bố cục Side-by-Side

**Điều hướng:** `FinanceHubPage.tsx` -> Tab **“Tích lũy & Tài sản”** (`SAVINGS_ASSETS`). Bảng log thu/chi cá nhân được tích hợp song song ngay bên cạnh bảng chốt số dư định kỳ để tạo góc nhìn **Đối soát đối xứng (Vĩ mô $\iff$ Vi mô)**, không phân mảnh thêm tab mới.

**Bố cục màn hình 2 Cột Đối Xứng (`grid-cols-1 xl:grid-cols-2 gap-4 items-start`):**

1. **Cột Trái (50%): Bảng Lịch Sử Biến Động Số Dư Qua Các Lần Chốt** (`PersonalFinanceBalanceLogSection.tsx`):
   - Quản lý các mốc chốt số dư định kỳ (Macro Snapshot).
   - Hiển thị ngày chốt, các tài khoản (VPBank Debit, Tiết kiệm, Ví Shop), tổng tài sản và độ lệch $\Delta$ tăng/giảm so với lần chốt trước.
   - **Tương tác 2 chiều:** Khi click vào một dòng ngày chốt bất kỳ, tự động kích hoạt bộ lọc ở bảng bên phải để xem các giao dịch phát sinh trong ngày đó.

2. **Cột Phải (50%): Sổ Biến Động Thu / Chi Cá Nhân** (`PersonalDebitTransactionsSection.tsx`):
   - **Mini-KPI Bar:** Tổng thu (+), Tổng chi (-), Dòng tiền ròng (Net) trong tháng.
   - **Bộ lọc linh hoạt:** Lọc theo Thẻ/Tài khoản, Danh mục, Chiều tiền (Thu/Chi), Tìm kiếm theo Merchant/Nội dung.
   - **Bảng dòng tiền Compact Feed:** Thời gian & Thẻ nguồn, Merchant & Category Chip (hỗ trợ đổi nhanh inline), Số tiền (+/- với màu xanh/đỏ), Số dư sau giao dịch và Badge trạng thái đối soát (`Đã khớp số dư`, `Lệch đối soát`, `Email đến trễ`).
   - **Nút công cụ trên Header:**
     - `[ + Ghi Thu/Chi ]`: Mở popup ghi nhanh giao dịch tiền mặt hoặc giao dịch thủ công.
     - `[ ⚙️ Quản lý danh mục ]`: Mở modal cho Master tự thêm/sửa/ẩn danh mục và cấu hình từ khóa tự động phân loại mà không hardcode code.
     - `[ ⚙️ Cấu hình Mailbox VPBank ]`: Mở modal `VpbankMailboxConfigModal.tsx` cho Master tự thiết lập email nhận, Google App Password, chọn chế độ sync (Realtime IDLE hoặc Polling) và bấm kiểm tra kết nối trực tiếp với Gmail ngay trên UI mà không cần gắn biến môi trường `.env`.

**Refresh:** khi nhận `FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED`, frontend refetch bảng log đang mở. Nếu SSE bị mất, khi người dùng đổi tháng/lọc hoặc bấm “Làm mới” vẫn tải lại API nguồn.
## 8. Kế hoạch triển khai theo phase

### Phase 0 — Governance và evidence

- Hoàn tất quy trình redaction/Git history theo phê duyệt bảo mật.
- Xác định account, statement baseline và finance owner phê duyệt evidence.
- Viết data retention, access control và incident/revocation runbook.

### Phase 1 — Schema và service contract

- Migration bảy bảng reconciliation/mapping/personal spending; bổ sung `TABLES`/`COLS` và test migration/integration.
- Thêm adapter service orchestration ở domain finance; không để worker gọi controller/HTTP nội bộ.
- Viết event contract, outbox formatter và RBAC routes.

### Phase 2 — Parser và dry-run

- Cài dependency IMAP/MIME được lock version trong `backend/package.json`.
- Viết parser, fixture redacted, test malformed/forged/duplicate/fee/refund/pending.
- Thực hiện dry-run có baseline statement; finance owner ký kết quả reconciliation trước khi cho phép apply.

### Phase 3 — Worker và apply có kiểm soát

- Implement lease, checkpoint, retry/dead-letter, health và metrics.
- Chỉ mở `APPLY` cho account đã baseline; thử restart, reconnect, concurrent worker và replay.

### Phase 4 — UI và vận hành

- Thêm API/UI status/manual sync, SSE post-commit và durable finance notification.
- Dashboard phải có counts: fetched, parsed, applied, rejected, review, retryable failure, lag và last successful sync.

## 9. Kịch bản nghiệm thu bắt buộc

```gherkin
Feature: Ingestion email VPBank an toàn và idempotent

  Scenario: Master tự cấu hình và kiểm tra kết nối Mailbox qua UI
    Given Master mở modal cấu hình Mailbox VPBank trên giao diện
    When Master nhập email, App Password và bấm "Kiểm tra kết nối ngay"
    Then hệ thống thực hiện handshake IMAP với Gmail và hiển thị kết quả thành công tức thì
    And khi Master bấm Lưu, cấu hình được lưu vào database an toàn với mật khẩu được bảo vệ
    And API không trả về mật khẩu thô ra giao diện (luôn masked)
    And worker tự động tải cấu hình mới mà không cần restart server

  Scenario: Hạch toán một giao dịch chi tiêu đủ định danh
    Given account đã có baseline statement được phê duyệt
    And receipt có UID identity mới và bank reference code hợp lệ
    When worker apply receipt
    Then có đúng một ledger row CARD_SPEND
    And receipt là APPLIED với ledger_id
    And có đúng một outbox notification
    And balance UI được refetch sau commit

  Scenario: Đọc lại cùng email hoặc restart worker
    Given receipt đã APPLIED
    When worker nhận lại cùng UID hoặc replay cùng business key
    Then không có ledger row và outbox row thứ hai
    And kết quả trả về là idempotent

  Scenario: Nhận dạng rõ thẻ và sao kê VPBank
    Given registry có một mapping active duy nhất cho thẻ tín dụng và một mapping cho thẻ ghi nợ
    When worker nhận email biến động hoặc sao kê của từng dụng cụ
    Then receipt có đúng documentKind và instrumentKind
    And biến động thẻ tín dụng đủ reference mới được phép vào credit ledger
    And biến động thẻ ghi nợ không được ghi vào credit ledger
    And sao kê chỉ được chuyển sang bước xác minh statement
  Scenario: Một biến động debit tự tạo log và cập nhật số dư
    Given card debit được map duy nhất với một financial account cá nhân active
    And email có transaction reference, amount, direction và observed balance
    When worker apply receipt
    Then có đúng một personal debit transaction log với category
    And log liên kết đúng financial account và card mapping
    And current balance projection bằng observed balance của email mới nhất
    And không có credit ledger row được tạo

  Scenario: Email debit đến trễ
    Given account đã có observed balance từ một email mới hơn
    When worker nhận email debit cũ hơn chưa từng xử lý
    Then vẫn có đúng một personal debit transaction log
    And current balance không bị ghi đè bởi số dư cũ
    And log có trạng thái LATE_ALREADY_COVERED
  Scenario: Email parse lỗi
    Given receipt thiếu trường bắt buộc
    When parser hoặc validation thất bại
    Then receipt là MANUAL_REVIEW hoặc RETRYABLE_FAILED theo failure code
    And không có ledger row
    And checkpoint không vượt qua UID retryable chưa terminal

  Scenario: Hai instance worker chạy đồng thời
    Given hai instance cùng mailbox/folder
    When cả hai nhận tín hiệu thư mới
    Then chỉ instance giữ lease được apply
    And database unique constraints vẫn ngăn receipt và business key trùng

  Scenario: Statement không khớp
    Given dry-run có tổng ledger khác closing balance statement
    When finance owner xem reconciliation run
    Then run không được chuyển sang APPLY
    And các receipt gây lệch được đánh dấu MANUAL_REVIEW
```

## 10. Definition of Done

- [ ] Git history/data hygiene đã hoàn tất theo quy trình bảo mật được phê duyệt; không chỉ sửa HEAD.
- [ ] Baseline statement được finance owner phê duyệt và lưu source reference đã redacted.
- [ ] Migrations chạy được, `TABLES`/`COLS` đầy đủ, không có runtime table/column string mới ngoài migration.
- [ ] Registry thẻ được finance owner duyệt; mỗi mapping có instrument kind, đích hạch toán duy nhất và thời gian hiệu lực.
- [ ] Biến động debit tạo đúng một personal debit log, map đúng financial account, giữ được category và không ghi nhầm vào credit ledger.
- [ ] Projection số dư debit khớp observed balance mới nhất; email đến trễ, trùng hoặc thiếu observed balance có status audit rõ ràng.
- [ ] Parser fixtures redacted phủ ít nhất: credit spend/payment, debit movement, credit/debit statement, duplicate, malformed, forged sender, missing reference, unmapped/suffix collision, fee/refund/pending và timezone boundary.
- [ ] Integration tests phủ apply, rollback, retry, replay, concurrent worker, restart, UIDVALIDITY change và outbox idempotency.
- [ ] Dry-run khớp statement theo quy tắc đã duyệt; mọi ngoại lệ có receipt status và owner xử lý.
- [ ] Production apply chỉ được bật qua flag, account allowlist và admin authorization; có rollback/runbook vận hành.
- [ ] Realtime p95 và worker lag được đo trong sandbox; chỉ công bố SLA sau khi có số liệu đo.

## 11. Điều kiện trước khi bật production

1. Finance owner xác nhận statement baseline và kết quả dry-run.
2. Security owner xác nhận xử lý lịch sử Git, secret policy và mailbox access.
3. Kỹ thuật xác nhận migration, integration tests, health metrics, backup/replay và alerting.
4. Bật theo account allowlist, quan sát một chu kỳ statement; nếu có chênh lệch, tắt `VPBANK_SYNC_ENABLED` và chuyển receipt mới sang `MANUAL_REVIEW`.

## 4. Điều kiện vận hành bảo mật bắt buộc sau hardening

- App Password Gmail **không** được lưu trong `.env`; chỉ `VPBANK_MAILBOX_ENCRYPTION_KEY` (khóa AES-256-GCM 32 byte, Base64) phải được cấp qua secret manager hoặc biến môi trường runtime an toàn.
- Migration `20261104000004_clear_legacy_vpbank_mailbox_password.js` sẽ xóa `appPassword` plaintext cũ. Sau migration, Master phải nhập lại App Password từ UI trước khi bật worker.
- Worker chỉ dùng `imap.gmail.com:993` với TLS certificate verification bắt buộc; không còn hỗ trợ custom host, custom port hoặc bỏ qua certificate validation.
- Email chỉ được tự động hạch toán khi `From` chính xác là `customercare@care.vpb.com.vn` và Gmail `Authentication-Results` xác nhận `dkim=pass` với `header.d=care.vpb.com.vn`. Các email khác bị từ chối, không ghi sổ cái.

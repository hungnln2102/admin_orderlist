# Đánh giá kế hoạch pipeline IMAP VPBank - 2026-11-04

> **Thời điểm đánh giá:** 2026-11-04 (`Asia/Bangkok`)
> **Phạm vi:** `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md`, credit ledger, realtime và notification outbox hiện có.
> **Trạng thái nghiệm thu:** **CHƯA ĐẠT để bắt đầu implementation.** Hướng kiến trúc đúng, nhưng còn blocker bảo mật, ACID, API contract và migration.

## Nhận định tổng quát

Kế hoạch đã sửa đúng hướng chính: dùng `credit_account_ledger`, có checkpoint, dry-run và tái sử dụng outbox. Tuy nhiên, không được bắt đầu Phase 1--4 cho đến khi các phát hiện Critical/High được sửa. Nếu thực hiện nguyên văn, worker có thể gọi sai API, ghi hai nguồn số dư hoặc kẹt vô hạn ở email lỗi.

## Phát hiện

### Critical

1. **Phase 0 chỉ redact working tree, không xóa dữ liệu nhạy cảm khỏi Git history.**
   - Plan chỉ yêu cầu sửa report hiện tại tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:172`.
   - Báo cáo nhạy cảm vẫn có blob reachable trong history; thay nội dung ở HEAD không làm mất dữ liệu khỏi commit cũ, clone cũ, remote hay backup CI.
   - Cần bổ sung quy trình được phê duyệt: rewrite history, force-push các ref bị ảnh hưởng, rotate credential có khả năng lộ và xác minh bằng `git rev-list --objects --all`. Nếu không rewrite được history, không được tuyên bố dữ liệu đã sạch 100%.

### High

2. **Worker gọi API không tồn tại và baseline không đi qua statement model.**
   - Plan ghi `recordPrincipal()`, `recordPayment()` và `importStatement()` tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:30`, rồi gọi hai hàm đầu trong transaction tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:214`.
   - Service chỉ export `recordPrincipalInTrx`, `recordPaymentInTrx` và `importCreditCardStatement` tại `backend/src/domains/finance/credit/creditLedgerService.js:583`.
   - Baseline được coi là đã xác minh tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:143`, nhưng plan không bắt buộc gọi `importCreditCardStatement`; `createCreditAccount` hiện gắn opening balance là `unverifiedOpeningBalance` tại `backend/src/domains/finance/credit/creditLedgerService.js:163`.
   - Cần ghi đúng signature/payload, bắt buộc import statement ngày chốt và map rõ principal/payment/fee/reversal.

3. **Transaction ingestion chưa có chiến lược poison message và checkpoint an toàn.**
   - Plan yêu cầu cùng transaction ghi ledger, log và `last_processed_uid` tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:212`.
   - Nếu parser lỗi rồi rollback, status `FAILED` cũng mất và worker lặp lại cùng UID vô hạn; nếu tăng checkpoint sau lỗi thì mất evidence/giao dịch.
   - Cần state machine `RECEIVED -> PARSED -> APPLIED | REJECTED | RETRYABLE_FAILED`, retry budget, dead-letter/quarantine và checkpoint chỉ tăng qua chuỗi UID liên tiếp đã ở trạng thái terminal.

4. **Plan tạo hai nguồn số dư cho cùng thẻ.**
   - Plan chọn ledger làm sổ cái chuẩn nhưng đồng thời yêu cầu update `personal_assets` tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:84` và `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:216`.
   - Ledger đã tính balance bằng tổng delta tại `backend/src/domains/finance/credit/creditLedgerService.js:96`; plan không định nghĩa projection, recovery hay reconciliation khi hai nơi lệch nhau.
   - Cần chốt credit ledger là SSOT; UI đọc derived balance. Projection chỉ được phép nếu cập nhật cùng transaction và có job kiểm tra/rebuild.

5. **Idempotency đang gộp nhầm identity Gmail và identity giao dịch ngân hàng.**
   - `email_ingestion_logs.message_id` và `idempotency_key` đều unique toàn cục tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:121`; parser lại ưu tiên reference code hoặc hash message/time/amount tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:76`.
   - UID chỉ có nghĩa trong `(mailbox, folder, uidvalidity)`; Message-ID có thể thiếu; một giao dịch có thể có nhiều thông báo. Các identity đó không thay thế nhau.
   - Cần unique receipt identity `(mailbox_account, folder_name, uid_validity, email_uid)`, chỉ unique Message-ID khi có giá trị, và dùng bank transaction id/reference code đã normalize làm business idempotency key. Thiếu bank reference thì cần đối soát thủ công, không tự ghi sổ theo hash có thể va chạm.

### Medium

6. **Migration/schema path sai source-of-truth và checkpoint chưa đủ phạm vi.**
   - Plan yêu cầu cập nhật `backend/src/db/dbSchema.js` tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:190`, nhưng path này không tồn tại. Quy ước repo yêu cầu `backend/src/config/dbSchema.js` cùng schema module và truy cập qua `tableName + COLS`.
   - `email_sync_checkpoints.mailbox_account UNIQUE` tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:105` không cho phép nhiều folder; UIDVALIDITY đổi cũng chưa có thuật toán reset/backfill.
   - Cần chỉ định migration, `dbSchema` schema module, export và verify command đúng; đổi key checkpoint thành mailbox + folder và mô tả reset khi UIDVALIDITY thay đổi.

7. **Realtime và Telegram chưa được bảo đảm sau commit.**
   - Plan nói EventBus sau transaction và enqueue outbox tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:225`, nhưng chưa chỉ định `trx.afterCommit` cho SSE hay insert outbox trong chính transaction DB.
   - EventBus là in-process; nếu process chết sau commit trước emit, UI không nhận event. Outbox hiện có worker durable, dùng `FOR UPDATE SKIP LOCKED` tại `backend/src/domains/notifications/hub/outboxDispatcherWorker.js:29`.
   - Cần insert outbox cùng transaction ingestion; phát SSE bằng `trx.afterCommit`, coi đó là tín hiệu refresh có thể mất và UI luôn refetch từ API. Nêu event payload/version/idempotency key, không hard-code topic khi cấu hình hệ thống đã là nguồn chuẩn.

### Low

8. **Definition of Done đặt các tuyệt đối không đo được.**
   - “Lỗi 0%”, “không lệch dù chỉ 1 đồng” và realtime dưới 3 giây tại `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md:240` không kèm tập mẫu, percentile hoặc xử lý pending/reversal.
   - Cần acceptance scenario cụ thể: fixtures phiên bản hóa, expected ledger rows, duplicate/retry/concurrency, mailbox reconnect, restart, UIDVALIDITY change, statement reconciliation và latency p95 tại sandbox.

## ACID

| Tiêu chí | Trạng thái | Điều kiện |
| --- | --- | --- |
| Atomicity | Rủi ro | Một transaction phải gồm ingestion log, ledger, checkpoint terminal và outbox record; SSE chỉ sau commit. |
| Consistency | Rủi ro | Cần map transaction type, statement baseline chính thức và một SSOT cho debt balance. |
| Isolation | Có nền tảng | Tận dụng unique `(account_id, idempotency_key)`; thêm lock/unique receipt identity cho nhiều worker. |
| Durability | Có nền tảng | Outbox bền vững đã có; cần durable failure/replay state cho email và health/lag metrics. |

## Kiểm tra đã thực hiện

- Static review: đối chiếu plan với service export, server bootstrap, schema path, credit ledger, Git history reachability và notification outbox.
- Không chạy test/build vì không có code thay đổi trong lần review này; plan chưa có implementation IMAP để kiểm thử runtime.

## Điều kiện nghiệm thu kế hoạch

1. Sửa tám phát hiện trên, đặc biệt quy trình Git history và contract worker/statement.
2. Chuyển Phase 0--5 thành task có owner, migration/schema file cụ thể, request/response contract và Gherkin acceptance cases.
3. Bổ sung threat model cho App Password, sender verification, raw email retention/redaction và quyền truy cập manual sync endpoint.
4. Chỉ bắt đầu implementation sau khi plan sửa đổi được review lại và trạng thái chuyển thành **Đạt để triển khai**.

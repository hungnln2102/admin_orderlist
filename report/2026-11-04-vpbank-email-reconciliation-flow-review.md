# Đánh giá luồng VPBank Email Reconciliation - 2026-11-04

> **Thời điểm đánh giá:** 2026-11-04 (`Asia/Bangkok`)
> **Phạm vi:** Báo cáo `2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md`, thiết kế IMAP IDLE được đề xuất, và các điểm tích hợp Finance Hub / credit ledger hiện có trong source tree.
> **Trạng thái nghiệm thu:** **KHÔNG ĐẠT để triển khai hoặc import dữ liệu tự động.** Có thể dùng làm tài liệu khảo sát thủ công sau khi loại dữ liệu nhạy cảm và bổ sung bằng chứng đầu vào.

## Kết luận

Repo đã có nền tảng tốt cho sổ cái tín dụng: API ghi principal/payment có transaction, khóa idempotency theo tài khoản và bảng ledger/statement/reconciliation riêng. Tuy nhiên, luồng VPBank trong báo cáo vẫn là **thiết kế chưa được triển khai**, không phải một pipeline có thể xác nhận đã quét, parse, đối soát và cập nhật UI realtime.

Không được khởi tạo dư nợ `5,757,378 VND`, import 53 giao dịch, hoặc bật listener dựa riêng vào báo cáo này. Cần có tập email nguồn đã được bảo vệ, parser có test fixture, và một lần dry-run tạo reconciliation records trước.

## Phát hiện

### Critical

1. **Dữ liệu tài chính và định danh cá nhân đang được commit trong report tracked.**
   - Báo cáo công khai trong working tree tên chủ tài khoản, email, bốn số cuối của ba thẻ, merchant, thời điểm, số dư/hạn mức, mã tham chiếu thanh toán và lịch sử giao dịch hai năm tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:4` và `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:54`.
   - `git ls-files` xác nhận file đã được theo dõi; `.gitignore` chỉ bảo vệ file `.env`, không bảo vệ dữ liệu giao dịch.
   - Rủi ro: bất kỳ clone, fork, backup CI, hoặc quyền đọc repo đều nhận được dữ liệu tài chính có thể liên kết cá nhân.
   - Điều kiện xử lý: di chuyển bản đầy đủ sang kho mã hóa/ngoài Git, thay report trong repo bằng bản redacted hoặc dữ liệu tổng hợp, rồi kiểm tra cả Git history trước khi nghiệm thu.

### High

2. **Không có implementation cho nguồn sự thật của số liệu: IMAP worker, parser, checkpoint, hay VPBank sync endpoint đều vắng mặt.**
   - Báo cáo khẳng định đã quét 480 email và đề xuất worker tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:5`, `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:12`, nhưng chính action plan vẫn nói sẽ viết `vpbankSyncService.js` tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:165`.
   - Quét source không tìm thấy `vpbankSyncService`, `VPBANK_SYNC_MODE`, Gmail credentials, sender VPBank, hay event `FINANCE_CARD_TRANSACTION_SYNCED`; `backend/package.json:17` cũng không khai báo thư viện IMAP/MIME parser.
   - Hệ quả: không thể tái lập 480 email, 296 giao dịch, số dư cuối, hay chứng minh không bỏ sót/trùng lặp. Các số trong report chỉ là assertion, chưa phải evidence đủ để hạch toán.
   - Điều kiện xử lý: xây pipeline có checkpoint (Gmail message-id + UIDVALIDITY + UID), lưu raw-evidence hash/metadata, parser version, trạng thái parse, và báo cáo dry-run; fixture phải phủ email HTML/plain-text, duplicate, delayed, malformed và sender giả mạo.

3. **Đối soát số dư thẻ không cân được opening balance và không thể coi `hạn mức - available` là dư nợ đã xác minh.**
   - Report đặt hạn mức chuẩn `24,000,000 VND`, nhưng đồng thời ghi nhận available limit đỉnh `24,098,013 VND` tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:24` và `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:65`; dữ liệu đã vượt giả định baseline.
   - Theo số liệu report: chi/phí `14,613,532 VND` trừ thanh toán `15,491,997 VND` cho ra net credit `878,465 VND`; để có dư nợ `5,757,378 VND` thì phải có opening balance chưa được chứng minh khoảng `6,635,843 VND`, chưa kể lãi, hoàn tiền, điều chỉnh và giao dịch pending.
   - Hệ quả: khởi tạo nợ theo con số đề xuất tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:105` có thể ghi sai principal, statement và due amount.
   - Điều kiện xử lý: lấy statement chính thức cho một kỳ đóng sổ làm opening balance; đối soát từng email vào ledger theo principal/interest/fee/payment/reversal và chỉ chấp nhận khi closing balance + available limit + điều chỉnh khớp evidence ngân hàng.

### Medium

4. **Mô hình ghi đề xuất không khớp subsystem tín dụng hiện hữu và khóa chống trùng được mô tả sai.**
   - Action plan đề xuất ghi toàn bộ lịch sử vào `debt_payment_logs` và unique key ghép `reference_code + card_last_digits + transaction_time` tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:163` và `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:171`.
   - Schema hiện có chỉ unique partial trên `debt_payment_logs.reference_code` (`backend/src/db/migrations/20261103000001_add_card_reconciliation_columns.js:21`), không có hai trường còn lại. Subsystem credit ledger mới là nơi có unique `(account_id, idempotency_key)` (`backend/src/db/migrations/20261103000003_create_credit_account_ledger.js:50`), và service kiểm tra khóa đó trong cùng transaction (`backend/src/domains/finance/credit/creditLedgerService.js:243`).
   - Hệ quả: triển khai theo report có thể phân tách dữ liệu giữa log cũ và ledger mới, hoặc double-apply khi email không có/đổi reference code.
   - Điều kiện xử lý: chọn `credit_account_ledger` làm sổ cái chuẩn cho thẻ tín dụng; tạo idempotency key xác định từ provider message identity, không từ merchant/time; nếu cần bảng ingestion riêng thì liên kết một chiều với ledger và unique provider identity.

5. **Luồng realtime được mô tả như đã tồn tại nhưng event contract và UI subscription chưa có.**
   - Mermaid ghi `WebSocket / EventBus: FINANCE_CARD_TRANSACTION_SYNCED` tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:144`.
   - Event type hiện có chỉ bao gồm `FINANCE_FIXED_COST_MUTATED`, `FINANCE_INSTALLMENT_PAID`, `FINANCE_ASSET_MUTATED` tại `backend/src/events/eventTypes.js:64`; không có event VPBank/card sync. Frontend có SSE generic nhưng không chứng minh nhận hoặc refresh theo sự kiện thẻ VPBank.
   - Điều kiện xử lý: chỉ publish event sau commit, thêm event contract versioned, consumer idempotent và fallback manual refresh. Không dùng EventBus nội tiến trình làm bảo đảm delivery giữa process/container.

### Low

6. **Các SLA và giả định hạ tầng trong bảng so sánh chưa có tiêu chí đo/giám sát.**
   - Các mức “1-3 giây”, “2-5 giây”, “gần như 0% CPU/RAM” tại `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:118` và `report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md:121` là mục tiêu, chưa phải kết quả kiểm chứng.
   - Cần thêm timeout, reconnect/backoff, refresh IDLE định kỳ, healthcheck, dead-letter/replay, alert về lag và dashboard số email fetched/parsed/rejected/duplicate.

## Đánh giá ACID và khả năng tái sử dụng

| Tiêu chí | Trạng thái | Nhận định |
| --- | --- | --- |
| Atomicity | Có nền tảng | `recordPayment` được controller bọc transaction; cần ingestion email gọi ledger trong cùng transaction, không ghi `debt_payment_logs` độc lập. |
| Consistency | Rủi ro | Chưa có quy tắc cân opening/closing balance, pending/reversal/fee và source evidence. |
| Isolation | Có nền tảng | Ledger khóa idempotency theo account; ingestion vẫn cần unique provider message identity và xử lý retry/concurrent worker. |
| Durability | Có nền tảng | PostgreSQL ledger bền sau commit; evidence email/checkpoint/retry state chưa tồn tại nên không thể replay có kiểm soát. |

Các API credit hiện có có thể tái sử dụng: tạo account, import statement, ghi principal và payment trong `backend/src/domains/finance/routes/financeHubRoutes.js:32`. Không nên dùng endpoint manual như một webhook adapter trước khi bổ sung xác thực nguồn, validation payload và audit trail.

## Kiểm tra đã chạy

- Static review: đối chiếu report, migrations, `tables.js`, credit ledger service/controller/routes, event types, dependency manifest và sự vắng mặt của runtime VPBank/IMAP.
- `npm --prefix backend test`: **PASS** — 66 tests, 0 fail, 2.72 giây.
- Chưa chạy integration test với PostgreSQL, IMAP/Gmail sandbox, migration thật, hoặc frontend E2E vì luồng VPBank chưa có implementation để nghiệm thu runtime.

## Điều kiện trước nghiệm thu

1. Loại/redact dữ liệu tài chính cá nhân khỏi Git hiện tại và history theo quy trình bảo mật được phê duyệt.
2. Chốt statement chính thức làm opening balance, xây matrix reconciliation và dry-run không ghi sổ.
3. Implement ingestion idempotent có evidence/checkpoint, transaction xuyên suốt ingestion -> ledger -> reconciliation record, cùng test concurrency/retry/replay.
4. Đo và kiểm thử end-to-end với mailbox test; chỉ sau đó mới đặt SLA realtime và bật import production.

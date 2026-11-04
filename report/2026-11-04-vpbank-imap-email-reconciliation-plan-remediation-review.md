# Nghiệm thu chỉnh sửa kế hoạch IMAP VPBank - 2026-11-04

> **Phạm vi:** Phiên bản 2.0 của `docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md`.
> **Trạng thái:** **Đạt để triển khai có điều kiện.** Đây là nghiệm thu kế hoạch, không phải xác nhận runtime production.

## Thay đổi đã được xử lý

- Đặt `credit_account_ledger` làm nguồn sự thật duy nhất; không còn cập nhật song song `personal_assets.amount`.
- Dùng đúng contract `recordPrincipalInTrx`, `recordPaymentInTrx`, `importCreditCardStatement` và xác lập statement baseline.
- Tách identity email khỏi business idempotency; bổ sung checkpoint theo mailbox/folder/UIDVALIDITY/UID và state machine retry/review.
- Đưa outbox vào cùng transaction và SSE qua `trx.afterCommit`; bỏ hard-code Telegram topic.
- Thay tuyên bố tuyệt đối bằng Gherkin acceptance scenarios, test concurrency/replay và chỉ tiêu đo tại sandbox.
- Bỏ dữ liệu tài chính cụ thể khỏi plan; thêm điều kiện xử lý Git history thay vì chỉ redact working tree.

## Điều kiện còn lại trước production

- Triển khai các migration, service, parser, worker và test theo plan; chưa có code runtime trong lần nghiệm thu này.
- Thực hiện quy trình bảo mật Git history/secrets đã được phê duyệt.
- Finance owner phải duyệt baseline statement và dry-run trước khi bật `VPBANK_SYNC_ENABLED`.

## Kiểm tra đã chạy

- Static review đối chiếu plan với credit ledger, event subscriber, server bootstrap và notification outbox.
- `git diff --check` cho các tài liệu cập nhật.

## Bổ sung nhận dạng thẻ và sao kê

- Plan hiện tách rõ `CREDIT_CARD`, `DEBIT_CARD`, thẻ chưa map và dụng cụ không xác định; không dùng bốn số cuối thẻ làm định danh đơn lẻ.
- Email được phân loại thành biến động thẻ tín dụng, biến động thẻ ghi nợ, sao kê thẻ tín dụng, sao kê tài khoản/thẻ ghi nợ hoặc không phải giao dịch.
- Chỉ biến động thẻ tín dụng đã map duy nhất và có bank reference mới được auto-apply vào credit ledger. Biến động thẻ ghi nợ có đường đối soát riêng với `financial_accounts`; sao kê phải được xác minh trước khi import.

## Bổ sung sổ biến động thẻ debit và chi tiêu cá nhân

- Plan bổ sung registry map rõ thẻ debit VPBank tới một `financial_account` cá nhân, không dùng suffix thẻ đơn lẻ.
- Mỗi email debit hợp lệ tạo đúng một `personal_debit_transaction_logs` row, liên kết receipt, thẻ, tài khoản, category và merchant đã chuẩn hóa.
- Số dư `financial_accounts.balance` trở thành projection của observed balance mới nhất; email đến trễ vẫn được ghi log nhưng không kéo lùi số dư hiện tại.
- Personal Finance có tab lịch sử debit, lọc theo tháng/category/tài khoản và tổng hợp chi tiêu cá nhân; không trộn dữ liệu với chi phí shop hoặc credit ledger.

## Chốt vị trí UI debit

- Điều chỉnh plan: `PersonalFinanceBalanceLogSection.tsx` chưa được mount ở `FinanceHubPage`, nên không dùng nó làm vị trí hiển thị bắt buộc.
- Màn hình được chốt là tab cấp cao mới `PERSONAL_CARD_ACTIVITY` / “Biến động thẻ cá nhân” trong `FinanceHubPage`, render bởi `PersonalDebitTransactionsSection.tsx`.
- `DebtsAndInstallmentsSection.tsx` vẫn chỉ quản lý thẻ tín dụng và công nợ.

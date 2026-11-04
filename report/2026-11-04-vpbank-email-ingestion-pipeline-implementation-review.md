# VPBank Email Ingestion Hardening Review — 2026-11-04

## Phạm vi

- Rà soát và khắc phục pipeline VPBank Gmail IMAP, credential mailbox, parser sender, checkpoint email, dependency và test isolation.
- Không chạy migration trên database live hoặc sandbox trong lượt này.

## Trạng thái nghiệm thu

**CHƯA NGHIỆM THU LIVE.** Mã nguồn và kiểm thử unit đã đạt; cần migration sandbox, cấu hình key runtime, nhập lại App Password và đối chiếu email VPBank đã che dữ liệu trước khi bật worker production.

## Khắc phục đã thực hiện

1. Thay dependency `imap` bằng `imapflow` 2.x; Gmail IMAP cố định `imap.gmail.com:993`, `secure: true` và `rejectUnauthorized: true`.
2. Mã hóa App Password AES-256-GCM bằng `VPBANK_MAILBOX_ENCRYPTION_KEY`; API chỉ trả masked state. Migration mới xóa credential plaintext legacy, buộc nhập lại App Password.
3. Chỉ auto-apply email có `From` chính xác `customercare@care.vpb.com.vn` và Gmail `Authentication-Results` chứa DKIM pass của `care.vpb.com.vn`.
4. Checkpoint khóa transaction theo mailbox, reset an toàn khi `UIDVALIDITY` đổi; `MANUAL_REVIEW` terminal và advance cursor để không polling lặp vô hạn.
5. Dời test ghi DB sang `tests/integration`, bắt buộc `TEST_DATABASE_URL` có database tên chứa `test`, và restore mailbox config trong `finally`.

## Kiểm tra đã chạy

- `backend/npm.cmd test`: 81/81 pass.
- `backend/node --test tests/unit/vpbankEmailParser.test.js tests/unit/vpbankMailboxSecret.test.js`: 15/15 pass.
- `node --check` cho services, worker và migrations VPBank: pass.
- `backend/npm.cmd audit --omit=dev --json`: 0 vulnerabilities.
- `git diff --check`: pass sau khi dọn EOF whitespace.

## Điều kiện trước nghiệm thu live

1. Cấp `VPBANK_MAILBOX_ENCRYPTION_KEY` dạng Base64 32 byte từ secret manager/runtime environment.
2. Chạy `npx.cmd knex migrate:list` và migration trên sandbox database cô lập; không được chạy trực tiếp production trước khi có backup/rollback plan.
3. Nhập lại App Password qua UI sau migration; credential legacy sẽ bị xóa có chủ đích.
4. Đối chiếu một email giao dịch debit, một email thanh toán thẻ credit và một sao kê `MANUAL_REVIEW` với dữ liệu VPBank đã che.
5. Chạy integration test với `TEST_DATABASE_URL` trỏ tới database có tên chứa `test`.

# Test Case và Kết Quả - Webhook Sepay Financial Reconcile

## Thông tin chạy test

- Script test: `backend/scripts/tests/run-webhook-financial-reconcile-tests.js`
- Marker dữ liệu test: `TEST-WEBHOOK-1776362190779`
- Kỳ test tổng hợp: `2099-12`
- Trạng thái tổng: **PASS toàn bộ (C1 -> C13)**
- Cập nhật gần nhất: `2026-04-17 00:56` (GMT+7)

## Danh sách test case

| ID | Mô tả | Kết quả |
| --- | --- | --- |
| C1 | Webhook có mã đơn, đơn `Chưa Thanh Toán` | PASS |
| C2 | Webhook có mã đơn, đơn `Đã Thanh Toán` đã có receipt trước đó | PASS |
| C3 | Webhook có mã đơn, đơn `Đã Thanh Toán` chưa có receipt trước đó | PASS |
| C4 | Webhook không mã đơn (cộng trước doanh thu/lợi nhuận) | PASS |
| C5 | Reconcile receipt không mã vào đơn `Đã Thanh Toán` (trừ lại phần đã cộng trước) | PASS |
| C6 | Reconcile receipt không mã vào đơn `Chưa Thanh Toán` (giữ doanh thu, trừ lợi nhuận theo cost) | PASS |
| C7 | Duplicate webhook không cộng lần 2 | PASS |
| C8 | Manual `Thanh Toán` sau receipt đã post không double-count | PASS |
| C9 | Manual `Gia Hạn` sau receipt đã post không double-count | PASS |
| C10 | Action `reconcile_and_mark_paid` cho đơn `Chưa Thanh Toán` | PASS |
| C11 | Action `reconcile_and_renew` cho đơn `Cần Gia Hạn` | PASS |
| C12 | Idempotent `reconcile_and_mark_paid` (gọi lặp) trả `409` đúng rule | PASS |
| C13 | Idempotent `reconcile_and_renew` (gọi lặp) trả `409` đúng rule | PASS |

## Tóm tắt nhanh delta chính

- `C1`: `revenue +100000`, `profit +70000`
- `C2`: `revenue +250000`, `profit +250000`
- `C3`: `revenue +0`, `profit +0`
- `C4`: `revenue +270000`, `profit +270000`
- `C5`: `revenue -270000`, `profit -270000`
- `C6`: `revenue +0`, `profit -50000`
- `C8`: `revenue +0`, `profit +0`
- `C9`: `revenue +0`, `profit +0`
- `C10`: `revenue +0`, `profit -80000`, đơn -> `Đã Thanh Toán`
- `C11`: `revenue +0`, `profit -90000`, renewal success, đơn -> `Đã Thanh Toán`
- `C12`, `C13`: trả `409` đúng guard trạng thái/action

## Xác nhận cleanup dữ liệu test

- Script verify: `backend/scripts/tests/verify-cleanup-marker.js TEST-WEBHOOK-1776362190779`
- Kết quả:
  - `receipt_rows = 0`
  - `order_rows = 0`
  - `summary_rows = 0`

Không còn dữ liệu test tồn đọng trong:

- `orders.payment_receipt`
- `orders.order_list`
- `finance.dashboard_monthly_summary` (month_key `2099-12`)

## Ánh xạ test bắt buộc

| Yêu cầu | Test case |
| --- | --- |
| Duplicate không cộng lần 2 | C7 |
| Webhook không mã cộng trước + state đúng | C4 |
| Webhook có mã theo trạng thái đơn | C1-C3 |
| Reconcile 2 case adjustment | C5, C6 |
| Manual action sau webhook không double-count | C8, C9 |
| Action reconcile mới | C10, C11 |
| Idempotent cho action mới | C12, C13 |

# Test Case và Kết Quả - Webhook Sepay Financial Reconcile

## Thông tin chạy test

- Script test: `backend/scripts/tests/run-webhook-financial-reconcile-tests.js`
- Marker dữ liệu test: `TEST-WEBHOOK-1776278588300`
- Kỳ test tổng hợp: `2099-12`
- Mục tiêu: kiểm thử luồng webhook + reconcile + cờ state tài chính + tránh double-count
- Trạng thái tổng: **PASS toàn bộ**
- Cập nhật gần nhất: `2026-04-16 01:43` (GMT+7)

## Danh sách test case

| ID | Mô tả | Kết quả |
| --- | --- | --- |
| C1 | Webhook có mã đơn, đơn `Chưa Thanh Toán` | PASS |
| C2 | Webhook có mã đơn, đơn `Đã Thanh Toán` đã có receipt trước đó | PASS |
| C3 | Webhook có mã đơn, đơn `Đã Thanh Toán` chưa có receipt trước đó | PASS |
| C4 | Webhook không mã đơn | PASS |
| C5 | Reconcile receipt không mã vào đơn `Đã Thanh Toán` | PASS |
| C6 | Reconcile receipt không mã vào đơn `Chưa Thanh Toán` | PASS |

## Chi tiết kết quả

### C1 - PASS

- HTTP: `200`
- Delta summary: `revenue +100000`, `profit +70000`
- State row:
  - `is_financial_posted = true`
  - `posted_revenue = 100000`
  - `posted_profit = 70000`

### C2 - PASS

- HTTP: `200`
- Delta summary: `revenue +250000`, `profit +250000`
- State row:
  - `is_financial_posted = true`
  - `posted_revenue = 250000`
  - `posted_profit = 250000`

### C3 - PASS

- HTTP: `200`
- Delta summary: `revenue +0`, `profit +0`
- State row:
  - `is_financial_posted = false`
  - `posted_revenue = 0`
  - `posted_profit = 0`

### C4 - PASS

- HTTP: `200`
- Delta summary: `revenue +270000`, `profit +270000`
- State row:
  - `is_financial_posted = true`
  - `posted_revenue = 270000`
  - `posted_profit = 270000`

### C5 - PASS

- HTTP: `200`
- Reconcile receipt không mã vào đơn `Đã Thanh Toán`
- Delta summary: `revenue -270000`, `profit -270000`
- State row:
  - `adjustment_applied = true`
  - `posted_revenue = 0`
  - `posted_profit = 0`

### C6 - PASS

- HTTP: `200`
- Reconcile receipt không mã vào đơn `Chưa Thanh Toán`
- Delta summary: `revenue +0`, `profit -50000`
- State row:
  - `adjustment_applied = true`
  - `posted_revenue = 280000`
  - `posted_profit = 230000`

## Xác nhận đã xóa dữ liệu test

- Script verify cleanup: `backend/scripts/tests/verify-cleanup-marker.js TEST-WEBHOOK-1776278588300`
- Kết quả:
  - `receipt_rows = 0`
  - `order_rows = 0`
  - `summary_rows = 0`

Không còn dữ liệu test tồn đọng trong:

- `orders.payment_receipt`
- `orders.order_list`
- `finance.dashboard_monthly_summary` (month_key `2099-12`)

## Ghi chú fix đã áp dụng

1. Chuẩn hóa `payment_date` về kiểu `DATE` và ép kiểu khi query/insert để tránh lỗi so sánh kiểu dữ liệu.
2. Cập nhật logic kiểm tra prior receipt theo mốc `order_date` (đúng rule late payment).
3. Chỉnh lại công thức reconcile case `UNPAID/RENEWAL` để chỉ trừ `cost`.
4. Đồng bộ dữ liệu test theo prefix mã đơn hợp lệ cho luồng dashboard sales.

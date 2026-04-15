# Quy tắc xử lý Webhook Sepay + Renewal + Lợi nhuận (không tạo bảng mới)

## 1) Phạm vi

Chỉ dùng các bảng hiện có:

- `orders.payment_receipt`
- `orders.order_list`
- `partner.supplier_order_cost_log`
- `finance.dashboard_monthly_summary`

Không tạo bảng mới.

## 2) Quy tắc lõi (đã chốt)

### 2.1 Webhook có mã đơn hợp lệ `MAV...`

1. Nếu đơn đang `Chưa Thanh Toán` hoặc `Cần Gia Hạn`:
   - chạy luồng như cũ (thanh toán/renewal theo nghiệp vụ hiện hành).

2. Nếu đơn đang `Đang Xử Lý` hoặc `Đã Thanh Toán`:
   - check trong `payment_receipt` từ `order_date` đến hiện tại đã có `id_order` của đơn này chưa.
   - nếu **đã có**: cộng thẳng doanh thu và lợi nhuận, **không trừ cost**.
   - nếu **chưa có**: **không cộng gì** (coi như shop đã gia hạn trước cho khách, giờ khách mới thanh toán).

### 2.2 Webhook không có mã đơn hợp lệ

- để `id_order` trống.
- mặc định cộng thẳng doanh thu và lợi nhuận, không trừ cost.

### 2.3 Bấm nút thủ công (Thanh Toán/Gia Hạn)

- cộng thẳng doanh thu.
- trừ cost và cộng lợi nhuận.

## 3) Quy tắc gắn mã đơn cho biên lai không mã (reconcile)

### Trường hợp 1: gắn vào đơn đã gia hạn/thanh toán trước (đơn đã ở `Đang Xử Lý`/`Đã Thanh Toán`)

Biên lai không mã trước đó đã cộng thẳng doanh thu/lợi nhuận, nên khi gắn mã phải tạo bút toán điều chỉnh:

- trừ lại phần doanh thu đã cộng bởi biên lai không mã.
- trừ lại phần lợi nhuận đã cộng bởi biên lai không mã.

Mục tiêu: tránh cộng 2 lần cho cùng 1 khoản tiền.

### Trường hợp 2: gắn vào đơn đang `Chưa Thanh Toán` hoặc `Cần Gia Hạn`

- update `id_order` cho biên lai.
- giữ doanh thu đã cộng từ biên lai.
- điều chỉnh lợi nhuận bằng cách trừ thêm phần `cost` của đơn.

Mục tiêu: chuyển từ lợi nhuận tạm (`+amount`) sang lợi nhuận đúng của đơn (`+amount - cost`).

## 4) Chuẩn dữ liệu `payment_receipt`

Các cột chính cần được điền từ webhook:

- `id_order` (chỉ mã `MAV[A-Z0-9]{3,20}`, sai chuẩn thì để trống)
- `payment_date`
- `amount`
- `receiver`
- `sender`
- `note`
- `sepay_transaction_id`
- `reference_code`
- `transfer_type`
- `gateway`

## 5) Bảng cờ vận hành riêng cho biên lai

Không nhét cờ vào `payment_receipt`. Dùng bảng:

- `orders.payment_receipt_financial_state`
- khóa liên kết: `payment_receipt_id` (1-1 với `payment_receipt.id`)

Các cột cờ:

- `is_financial_posted` (boolean)
- `posted_revenue` (numeric)
- `posted_profit` (numeric)
- `reconciled_at` (timestamp)
- `adjustment_applied` (boolean)

Mục tiêu:

- biết biên lai đã ghi sổ tài chính chưa,
- biết đã điều chỉnh reconcile chưa,
- chặn apply adjustment lặp khi người dùng gắn mã nhiều lần,
- giữ `payment_receipt` là bảng log giao dịch thô.

### Quy tắc khi nhận webhook

Mỗi lần webhook tạo mới hoặc chạm vào một biên lai (kể cả duplicate), hệ thống phải:

1. xác định `payment_receipt.id` cuối cùng của giao dịch đó.
2. `upsert` 1 dòng state tương ứng trong `payment_receipt_financial_state`.

Nhờ vậy tất cả biên lai đều luôn có cờ vận hành đi kèm.

## 6) Chống trùng webhook (idempotency)

Thứ tự ưu tiên dedupe khi nhận webhook:

1. `sepay_transaction_id`
2. `reference_code + transfer_type + amount + payment_date`
3. fingerprint fallback hiện có trong code

Nếu trùng thì không insert thêm dòng và không ghi sổ tài chính thêm lần nữa.

## 7) Checklist triển khai

- [x] parser mã đơn chỉ nhận `MAV...`, token rác để trống.
- [x] bổ sung cột dedupe vào `payment_receipt`.
- [x] dọn dữ liệu `id_order` sai chuẩn.
- [x] tạo bảng `payment_receipt_financial_state` và backfill cho receipt cũ.
- [ ] cập nhật logic webhook/manual/reconcile theo đúng mục 2 và mục 3.
- [ ] thêm test regression chống double-count.


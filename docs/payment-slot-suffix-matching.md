# Thanh toán theo suffix số tiền (không nội dung CK)

Tài liệu mô tả cơ chế match webhook **không cần ghi nội dung chuyển khoản** và **không dùng cột `transaction`** cho đơn mới.

## Tóm tắt

| Trước | Sau |
|-------|-----|
| Sinh mã `transaction` 8 ký tự, ghi vào VietQR `addInfo` | Không sinh `transaction` |
| Webhook match theo nội dung CK / mã transaction | Webhook match theo **(STK nhận, số tiền)** |
| `order_list.price` = giá gốc | `order_list.price` = **giá gốc + suffix** (1..100) |

Khách chỉ cần chuyển **đúng số tiền** hiển thị trên QR (ví dụ `100.017đ` thay vì `100.000đ`).

## Thành phần DB

- **Sequence** `orders.payment_amount_suffix_seq` — suffix luân phiên 1..100 (CYCLE).
- **Bảng** `orders.order_payment_slots` — mỗi lần đơn chờ thanh toán = 1 slot (`cycle_index`).
- **View** `orders.v_payment_slot_health` — theo dõi slot pending theo `(receiver_account, base_amount)`.

Migration:

- `backend/migrations/20260823120000_order_payment_slots.js`
- `database/migrations/107_order_payment_slots.sql`

## Vòng đời slot

```
Tạo đơn / chuyển Cần Gia Hạn
  → openPaymentSlot (kind: new | renewal)
  → expected_amount = base_amount + suffix
  → UPDATE order_list.price = expected_amount

Khách CK đúng expected_amount
  → Webhook insertPaymentReceipt
  → resolveOrderByExpectedAmount(receiver, amount)
  → markPaymentSlotMatched

Đơn paid / renewal xong / hủy slot cũ
  → suffix được giải phóng (unique chỉ áp pending)
```

### Đơn mới

- `POST /api/orders` → `createOrder.js` mở slot `kind='new'` khi status `Chưa Thanh Toán` và `price > 0`.

### Gia hạn

1. Cron `updateDatabaseTask` (00:01 VN): `PAID` → `Cần Gia Hạn` (0–4 ngày còn lại).
2. Ngay sau đó `openRenewalSlotsForFlippedOrders`: recompute giá từ bảng giá (`computeOrderCurrentPrice`) → mở slot `kind='renewal'`.
3. Cron `notifyFourDays` (07:00): gửi Telegram + QR với `order.price` đã có suffix.

Giá renewal **chốt tại lúc flip RENEWAL**, không đổi khi bảng giá thay đổi sau đó (tránh lệch với số khách đã thấy trên QR).

## Webhook Sepay

File: `backend/webhook/sepay/payments.js` — `insertPaymentReceipt`

1. Không extract `orderCode` từ nội dung CK.
2. Trong transaction: `resolveOrderByExpectedAmount({ receiverAccount, amount })`.
3. Sau INSERT receipt: `markPaymentSlotMatched`.

`postHandler` vẫn có fallback `resolveOrderByPayment` (match `order_list.price = amount`) cho luồng xử lý đơn; **không** resolve qua cột `transaction`.

## Telegram

- QR: chỉ `amount` + STK (không `addInfo` / không mã transaction).
- Caption: bỏ dòng «Nội dung CK»; nhắc chuyển **đúng số tiền** trên QR.

Files: `sendOrderCreated.js`, `sendFourDays.js`, `messageBuilders.js`.

## Frontend

- `ViewOrderModal` / `paymentQr.ts`: QR shop không gửi `description`; không gọi `ensureOrderTransaction`.
- Hiển thị: «Chuyển khoản đúng số tiền trên QR — không cần ghi nội dung».

## API legacy

- `POST /api/orders/:id/ensure-transaction` — vẫn tồn tại nhưng **không sinh** mã mới; trả `transaction: ""`.

## Domain code

```
backend/src/domains/payment-slots/
```

Public API: `openPaymentSlot`, `resolveOrderByExpectedAmount`, `markPaymentSlotMatched`, `expirePaymentSlots`.

## Giới hạn & vận hành

- Tối đa **100** đơn pending cùng `(STK, base_amount)` tại một thời điểm (suffix 1..100).
- Nhiều mức giá khác nhau → mỗi mức có pool suffix riêng.
- Khách CK **làm tròn** (bỏ phần lẻ) → không match → admin gán tay qua receipt.
- Cron (khuyến nghị): `expirePaymentSlots(pool, '30 days')` dọn slot pending quá hạn.

## Triển khai

```bash
# Chạy migration (knex hoặc SQL thủ công)
cd backend && npx knex migrate:latest
# hoặc áp database/migrations/107_order_payment_slots.sql
```

Sau migrate, đơn **mới** và đơn **gia hạn** (sau cron flip) tự có `price` mang suffix.

## Backfill đơn cũ (một lần)

Đơn đã ở `Chưa Thanh Toán` / `Cần Gia Hạn` **trước** khi bật payment slot thường còn giá tròn (vd. `65.000`) và **không có** row slot pending → webhook chỉ fallback theo `price = amount` (dễ trùng nếu nhiều đơn cùng mức).

Chạy backfill (từ thư mục `backend`):

```bash
# Xem trước, không ghi DB
node scripts/ops/backfill-payment-slots.js --dry-run

# Một đơn thử
node scripts/ops/backfill-payment-slots.js --dry-run --order=MAVCHMB3R

# Ghi thật (mặc định tối đa 500 đơn/lần)
node scripts/ops/backfill-payment-slots.js

# Batch lớn hơn
node scripts/ops/backfill-payment-slots.js --limit=2000
```

Script:

- Quét đơn `Chưa Thanh Toán` / `Cần Gia Hạn`, `price > 0`, không MAVN, **chưa có slot pending**.
- **Cần GH**: recompute giá từ bảng giá (`computeOrderCurrentPrice`) rồi mở slot `renewal`.
- **Chưa TT**: lấy giá gốc từ `order_list.price` (tách suffix 1..100 nếu có) → slot `new`.
- Cập nhật `order_list.price = expected_amount` (QR/Telegram hiển thị số có suffix).

Code: `backend/src/domains/payment-slots/use-cases/backfillPendingPaymentSlots.js`.

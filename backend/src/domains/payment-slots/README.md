# Domain `payment-slots`

Cơ chế match webhook **không cần nội dung CK**: mỗi đơn cần thanh toán được cấp 1 slot mang **suffix định danh** (1..100) cộng vào giá gốc. Webhook tra slot theo `(receiver_account, expected_amount)` để resolve `id_order`.

## Vòng đời slot

```
┌──────────────────┐    open      ┌─────────┐    webhook    ┌─────────┐
│ Tạo đơn / RENEWAL│ ───────────► │ pending │ ────────────► │ matched │
└──────────────────┘              └────┬────┘               └─────────┘
                                       │
                                       │ open lần kế / cron 30 ngày
                                       ▼
                                  ┌──────────────┐
                                  │ cancelled /  │
                                  │ expired      │
                                  └──────────────┘
```

- **`cycle_index`**: 1 = mua mới, 2+ = các lần gia hạn của cùng đơn.
- **`amount_suffix`**: từ sequence `orders.payment_amount_suffix_seq` (CYCLE 1..100). Đảm bảo unique trên `(receiver_account, expected_amount) WHERE status='pending'`.
- **`expected_amount = base_amount + amount_suffix`**: được mirror vào `orders.order_list.price` để QR/UI hiển thị đúng số khách phải CK.

## Quy ước tích hợp

1. Tạo đơn mới → `openPaymentSlot({ slotKind: 'new' })`, set `order_list.price = slot.expected_amount`.
2. Đơn chuyển sang `Cần Gia Hạn` (cron `updateDatabaseTask` hoặc manual) → recompute base theo bảng giá hiện hành → `openPaymentSlot({ slotKind: 'renewal' })` → set `order_list.price = slot.expected_amount`.
3. Webhook receipt:
   - `resolveOrderByExpectedAmount(executor, { receiverAccount, amount })` → `{ slot, orderCode }`.
   - Sau khi `payment_receipt` ghi xong → `markPaymentSlotMatched(executor, { slotId, paymentReceiptId })`.
4. Cron 1h/lần → `expirePaymentSlots(pool, '30 days')`.

## Module map

```
backend/src/domains/payment-slots/
├── constants.js
├── repositories/
│   └── paymentSlotRepository.js
├── use-cases/
│   ├── openPaymentSlot.js
│   ├── resolveOrderByExpectedAmount.js
│   ├── markPaymentSlotMatched.js
│   └── expirePaymentSlots.js
├── index.js
└── README.md
```

## Sức chứa

Sequence range 1..100 → tối đa **100 slot pending cùng `(receiver, base_amount)`** tại 1 thời điểm. Nếu shop có nhiều mức giá khác nhau, thực tế chứa được `100 × N` slot pending toàn hệ thống.

View `orders.v_payment_slot_health` báo `free_slots` cho từng cặp `(receiver, base_amount)` để cảnh báo khi sắp đầy.

## Migration

- knex: `backend/migrations/20260823120000_order_payment_slots.js`
- raw SQL: `database/migrations/107_order_payment_slots.sql`

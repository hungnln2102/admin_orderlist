# supplier-change

Domain xử lý đổi NCC cho 1 đơn hàng theo logic prorate + 2 luồng A/B.

## API

`POST /api/orders/:id/change-supplier`

Body:
```json
{ "new_supply_id": 9 }
```

Cũng nhận `newSupplyId` hoặc `supply_id` (alias).

Trả về:
```json
{
  "flow": "A | B_UNPAID | B_PAID | NOOP",
  "orderId": 42,
  "oldCost": 90000,
  "newCost": 56000,
  "refundFromOldNcc": 42000,
  "insertedNewLog": true,
  "mavrykNew": false,
  "message": "..."
}
```

Lỗi:
- 400: `orderId`/`new_supply_id` không hợp lệ, hoặc NCC mới chưa cấu hình giá.
- 404: không tìm thấy đơn hoặc NCC mới.
- 500: lỗi không mong đợi.

## Tích hợp PUT order hiện có

`orderUpdateService.js` tự động detect supply_id trong payload có khác supply_id
hiện tại không. Nếu có, gọi `changeOrderSupplier(...)` rồi loại bỏ `supply_id`
và `cost` khỏi sanitized payload. Vì vậy frontend không cần đổi gì — chỉ cần
PUT với supply_id mới và backend lo phần còn lại.

## Logic

1. **`new_cost = supplier_cost(variant_id, new_supply_id) × remaining_days / total_days`** (làm tròn nửa lên).
2. **Tuổi đơn = today (Asia/Ho_Chi_Minh) − order_date** (theo YMD floor).
3. **Flow A** (≤5 ngày):
   - UPDATE `order_list.supply_id` và `cost`.
   - Nếu NCC mới = Mavryk: xóa toàn bộ `supplier_order_cost_log` của đơn (khớp
     convention `v_is_mavryk DELETE` trong trigger DB).
   - Nếu có log cost mới nhất: UPDATE supply_id + import_cost trên dòng đó.
4. **Flow B (>5 ngày)**:
   - **Log Chưa Thanh Toán**: XÓA log đó, INSERT log mới NCC mới (skip insert
     nếu Mavryk).
   - **Log Đã Thanh Toán**: KHÔNG xóa log cũ. INSERT log hoàn:
     `supply_id = old`, `import_cost = 0`, `refund_amount = old_cost × remaining/total`,
     `ncc_payment_status = 'Chưa Thanh Toán'` (bên NCC cũ chưa hoàn lại). Sau
     đó INSERT log NCC mới với cost prorate (skip nếu Mavryk).
5. Đơn >5 ngày nhưng **chưa có log nào** → fallback Flow A.
6. NCC mới = NCC cũ → NOOP, không thay đổi gì.

## DB guard

Trigger `partner.fn_supplier_order_cost_log_on_success` check GUC
`app.supplier_change_managed`. Khi service SET LOCAL flag này thành `'on'` trong
transaction, trigger bỏ qua hoàn toàn — service tự quản lý log. Sau khi service
xong sẽ SET LOCAL về `'off'` để các update tiếp theo trong cùng transaction
(nếu có) chạy trigger bình thường.

Migration: `database/migrations/101_supplier_order_cost_log_app_managed_guard.sql`
+ knex wrapper `backend/migrations/20260817120000_*.js`.

## Tests

- `tests/jest/domains/supplier-change/priceCalculator.test.js`: 20 unit tests
  cho pure helpers.
- `tests/jest/domains/supplier-change/service.test.js`: 13 integration tests
  cho service orchestration (mock repository + normalize).

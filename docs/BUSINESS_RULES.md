# Business Rules - Quy tắc nghiệp vụ

Tài liệu này mô tả các quy tắc nghiệp vụ chính của hệ thống quản lý đơn hàng.

---

## 1. Tạo đơn hàng (Create Order)

### Rule
- **Khi tạo đơn mới**: Status mặc định = `UNPAID` (Chưa Thanh Toán)
- **KHÔNG cộng tiền NCC** (Nhà Cung Cấp) vào `payment_supply` khi tạo đơn
- Đảm bảo supplier record tồn tại (tạo mới nếu chưa có)
- Gửi thông báo Telegram khi tạo đơn thành công

### Code location
- `backend/src/services/orderService.js` - `createOrder()`
- `backend/src/controllers/Order/crudRoutes.js` - `POST /api/orders`

### Test case
```javascript
// Tạo đơn → Debt NCC không đổi
const order = await createOrder({ supply: "NCC1", cost: 100000, ... });
// Debt trước = Debt sau
```

---

## 2. Cộng tiền hàng NCC (Add Supplier Debt)

### Rule
- **Khi đơn chuyển từ `UNPAID` → `PROCESSING`**: Cộng `cost` vào `payment_supply.import_value` của NCC
- Chỉ cộng khi có sự thay đổi status (không cộng nếu đã là PROCESSING)
- Cộng vào cycle mới nhất của NCC (hoặc tạo cycle mới nếu chưa có)
- **Webhook thanh toán**: Khi nhận payment receipt, tự động chuyển `UNPAID` → `PROCESSING` (nếu không phải renewal)

### Code location
- `backend/src/controllers/Order/orderFinanceHelpers.js` - `addSupplierImportOnProcessing()`
- `backend/src/controllers/Order/orderUpdateService.js` - `updateOrderWithFinance()`
- `backend/webhook/sepay/routes/webhook.js` - Webhook handler

### Test case
```javascript
// UNPAID → PROCESSING → Debt tăng đúng cost
const order = await createOrder({ supply: "NCC1", cost: 200000, ... });
await updateOrder({ id: order.id, status: STATUS.PROCESSING });
// Debt tăng 200000
```

---

## 3. Xóa đơn hàng (Delete Order)

### Rule

#### 3.1. Đơn `UNPAID`
- **Hard delete**: Xóa trực tiếp khỏi `order_list`
- **KHÔNG trừ tiền NCC** (vì chưa cộng)
- **KHÔNG lưu vào archive**

#### 3.2. Đơn `PAID` hoặc `PROCESSING`
- **Archive vào `order_canceled`**: Lưu vào bảng `order_canceled`
- **Trừ tiền NCC (prorated)**: Tính theo số ngày còn lại
  - `refund = (price * remainingDays) / totalDays`
  - `import_to_subtract = ceilToThousands((cost * remainingDays) / totalDays)`
  - Trừ vào `payment_supply.import_value` của NCC
- **Status**: Đặt `PENDING_REFUND` (Chờ Hoàn)
- **Refund value**: Lấy từ `reqBody.can_hoan` hoặc tính prorated

#### 3.3. Đơn khác (RENEWAL, EXPIRED, ...)
- **Archive vào `order_expired`**: Lưu vào bảng `order_expired`
- **Status**: Đặt `EXPIRED` (Hết Hạn)
- **KHÔNG trừ tiền NCC** (đơn đã hết hạn, không cần hoàn)

### Code location
- `backend/src/controllers/Order/orderDeletionService.js` - `deleteOrderWithArchive()`
- `backend/src/controllers/Order/orderFinanceHelpers.js` - `adjustSupplierDebtIfNeeded()`, `calcRemainingRefund()`

### Test case
```javascript
// PAID order với 20/30 ngày còn lại → Trừ prorated
const order = await createOrder({ supply: "NCC1", cost: 300000, days: 30, ... });
await updateOrder({ id: order.id, status: STATUS.PROCESSING }); // +300000
await deleteOrder({ id: order.id }, { so_ngay_con_lai: 20 });
// Debt giảm: ceil((300000 * 20/30) / 1000) * 1000 = 200000
```

---

## 4. Gia hạn đơn hàng (Renewal)

### Rule
- **Điều kiện eligible**: Order có status `RENEWAL`, `EXPIRED`, hoặc `PROCESSING` với `daysLeft <= 4`
- **Cập nhật đơn**:
  - `order_date` = ngày sau ngày hết hạn cũ + 1
  - `order_expired` = tính theo tháng sản phẩm (ví dụ: 1m = 30 ngày)
  - `days` = số ngày mới
  - `cost` = giá nhập mới (từ supplier_cost hoặc order cũ)
  - `price` = giá bán mới (tính theo công thức với pctCtv, pctKhach)
  - `status` = `PROCESSING`
- **Cộng tiền NCC mới**: Cộng `cost` mới vào `payment_supply.import_value`
- **Webhook renewal**: Khi nhận payment cho đơn eligible, tự động chạy renewal

### Code location
- `backend/webhook/sepay/renewal.js` - `runRenewal()`, `isEligibleForRenewal()`
- `backend/webhook/sepay/routes/webhook.js` - Renewal flow sau COMMIT
- `backend/src/controllers/Order/renewRoutes.js` - `POST /api/orders/:code/renew`

### Test case
```javascript
// Order RENEWAL với daysLeft <= 4 → Gia hạn + cộng cost mới
const order = await createOrder({ 
  supply: "NCC1", 
  cost: 100000, 
  order_expired: "2 days from now",
  status: STATUS.RENEWAL 
});
const debtBefore = await getSupplierDebt(supplyId);
await runRenewal(order.id_order, { forceRenewal: true });
// Debt tăng thêm cost mới, order_expired được cập nhật
```

---

## 5. Hoàn tiền (Refund)

### Rule
- **Chỉ đánh dấu status**: Chuyển `PENDING_REFUND` → `REFUNDED` trong `order_canceled`
- **KHÔNG tự động trừ tiền NCC**: Việc trừ tiền đã được xử lý khi xóa đơn (prorated)
- **Refund amount**: Lưu trong `order_canceled.refund` (đã tính khi xóa)

### Code location
- `backend/src/controllers/Order/renewRoutes.js` - `PATCH /api/orders/canceled/:id/refund`

### Test case
```javascript
// Đánh dấu refund → Status đổi, Debt không đổi
const canceledOrder = await db("order_canceled").where({ id_order: "..." }).first();
await db("order_canceled").where({ id }).update({ status: STATUS.REFUNDED });
// Debt NCC không thay đổi (đã trừ khi xóa)
```

---

## 6. Webhook thanh toán (Payment Webhook)

### Rule
- **Insert payment receipt**: Lưu vào `payment_receipt`
- **UNPAID → PROCESSING**: Tự động chuyển nếu order status = UNPAID
- **Cộng tiền NCC**: Chỉ khi **không phải renewal** (renewal tự cộng trong `runRenewal()`)
- **Renewal flow**: Sau COMMIT, nếu order eligible → queue + `processRenewalTask()`

### Code location
- `backend/webhook/sepay/routes/webhook.js` - Main webhook handler

---

## 7. Scheduler (Cron)

### Rule
- **Chuyển đơn hết hạn**: Chỉ chuyển đơn có status `PAID`, `RENEWAL`, hoặc `EXPIRED` (không chuyển `PROCESSING`)
- **PAID → RENEWAL**: Khi `0 <= daysLeft <= 4`
- **RENEWAL → EXPIRED**: Khi `daysLeft = 0`
- **Move to expired**: Đơn với `expiry < today` và status `PAID/RENEWAL/EXPIRED` → chuyển sang `order_expired`

### Code location
- `backend/scheduler.js` - `updateDatabaseTask()`

---

## Tóm tắt Rule về Tiền NCC

| Hành động | Tiền NCC | Ghi chú |
|-----------|----------|---------|
| **Tạo đơn** | Không đổi | Chưa thanh toán |
| **UNPAID → PROCESSING** | **+cost** | Webhook hoặc manual update |
| **Xóa đơn UNPAID** | Không đổi | Hard delete |
| **Xóa đơn PAID/PROCESSING** | **-prorated** | Trừ theo số ngày còn lại |
| **Gia hạn đơn** | **+cost mới** | Cộng giá nhập mới |
| **Hoàn tiền (status)** | Không đổi | Chỉ đánh dấu, đã trừ khi xóa |

---

## Chạy Test

```bash
cd backend
node test-rules.js
```

Test sẽ verify tất cả các rule trên và báo cáo kết quả.

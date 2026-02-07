# Luồng trạng thái đơn hàng (Order Status Flow)

## Tổng quan

Hệ thống quản lý đơn hàng với các trạng thái và luồng chuyển đổi như sau:

## Các trạng thái

1. **UNPAID** (Chưa Thanh Toán) - Đơn mới được tạo
2. **PROCESSING** (Đang Xử Lý) - Đã nhận webhook thanh toán, chờ confirm
3. **PAID** (Đã Thanh Toán) - Đã confirm thanh toán NCC
4. **RENEWAL** (Cần Gia Hạn) - Đơn PAID sắp hết hạn (daysLeft <= 4)
5. **EXPIRED** (Hết Hạn) - Đơn RENEWAL đã hết hạn (daysLeft = 0)
6. **CANCELED** (Hủy) - Đơn bị hủy
7. **REFUNDED** (Đã Hoàn) - Đơn đã được hoàn tiền
8. **PENDING_REFUND** (Chờ Hoàn) - Đơn đang chờ hoàn tiền

---

## Luồng chuyển đổi trạng thái

### 1. Tạo đơn mới
```
Tạo đơn → UNPAID (Chưa Thanh Toán)
```

### 2. Webhook nhận thanh toán
```
UNPAID → PROCESSING (Đang Xử Lý)
```
- Khi webhook nhận được thông báo thanh toán cho đơn UNPAID
- Insert receipt vào database
- Cập nhật balance NCC (nếu có)
- Chuyển trạng thái sang PROCESSING

### 3. Confirm thanh toán NCC
```
PROCESSING → PAID (Đã Thanh Toán)
```
- Admin bấm "Thanh toán NCC" trong PaymentsController
- Chuyển trạng thái sang PAID theo supplier/date

### 4. Scheduler: PAID → RENEWAL
```
PAID (daysLeft <= 4) → RENEWAL (Cần Gia Hạn)
```
- Scheduler chạy hàng ngày (cron)
- Kiểm tra các đơn PAID với `daysLeft <= 4`
- Tự động chuyển sang RENEWAL

### 5. Scheduler: RENEWAL → EXPIRED
```
RENEWAL (daysLeft = 0) → EXPIRED (Hết Hạn)
```
- Scheduler chạy hàng ngày
- Kiểm tra các đơn RENEWAL với `daysLeft = 0`
- Tự động chuyển sang EXPIRED

### 6. Webhook nhận thanh toán cho đơn RENEWAL/EXPIRED → Renewal
```
RENEWAL/EXPIRED (daysLeft <= 4) → PROCESSING (Đang Xử Lý)
```
- Webhook nhận được thanh toán cho đơn RENEWAL hoặc EXPIRED
- Kiểm tra eligibility: `status = RENEWAL/EXPIRED` VÀ `daysLeft <= 4`
- Nếu eligible:
  - Chạy renewal (gia hạn đơn)
  - Cập nhật `order_date`, `order_expired`, `days`
  - Cập nhật giá nhập/bán theo giá hiện tại
  - Cộng tiền cho NCC (theo giá nhập hiện tại)
  - **Chuyển trạng thái về PROCESSING** (Đang Xử Lý)
- Sau đó admin có thể confirm → PROCESSING → PAID

### 7. Scheduler: EXPIRED < 0 → Xóa khỏi order_list
```
EXPIRED (daysLeft < 0) → Xóa khỏi order_list, chuyển sang order_expired
```
- Scheduler chạy hàng ngày
- Kiểm tra các đơn EXPIRED với `daysLeft < 0`
- Chuyển đơn sang bảng `order_expired`
- Xóa khỏi `order_list`

---

## Lưu ý quan trọng

### PROCESSING không phải điều kiện để renewal

**SAI**: PROCESSING với daysLeft <= 4 → eligible cho renewal

**ĐÚNG**: 
- Chỉ **RENEWAL** và **EXPIRED** với daysLeft <= 4 mới eligible cho renewal
- **PROCESSING** là **KẾT QUẢ** của renewal, không phải điều kiện

### Scheduler không chuyển PROCESSING sang expired

- Scheduler **CHỈ** chuyển PAID/RENEWAL/EXPIRED sang `order_expired`
- **KHÔNG** chuyển PROCESSING (đã nhận webhook, chưa confirm PAID)
- Điều này bảo vệ đơn đã thanh toán nhưng chưa được confirm

### Thông báo Telegram "Cần gia hạn" (7:00) – tính lại giá trước khi gửi

- Cron **07:00** gửi thông báo các đơn **RENEWAL** còn đúng **4 ngày** vào Telegram.
- **Trước khi gửi**: hệ thống **tính lại giá bán** (và giá nhập) theo giá hiện tại (product/supplier cost, price_config) qua `computeOrderCurrentPrice`.
- Caption tin nhắn và **QR thanh toán** dùng **giá đã tính lại**, không dùng giá lưu trong đơn. Nếu tính lỗi thì fallback về giá lưu trong DB.

---

## Flowchart tổng quan

```
Tạo đơn
  ↓
UNPAID (Chưa Thanh Toán)
  ↓ [Webhook thanh toán]
PROCESSING (Đang Xử Lý)
  ↓ [Confirm thanh toán NCC]
PAID (Đã Thanh Toán)
  ↓ [Scheduler: daysLeft <= 4]
RENEWAL (Cần Gia Hạn)
  ↓ [Scheduler: daysLeft = 0]
EXPIRED (Hết Hạn)
  ↓ [Webhook thanh toán + Renewal]
PROCESSING (Đang Xử Lý) ← Quay lại
  ↓ [Scheduler: daysLeft < 0]
Xóa khỏi order_list → order_expired
```

---

## Ví dụ thực tế

### Scenario 1: Đơn mới, thanh toán đúng hạn
1. Tạo đơn → **UNPAID**
2. Webhook nhận thanh toán → **PROCESSING**
3. Admin confirm → **PAID**
4. Scheduler: PAID với daysLeft <= 4 → **RENEWAL**
5. Scheduler: RENEWAL với daysLeft = 0 → **EXPIRED**
6. Webhook nhận thanh toán gia hạn → Renewal → **PROCESSING**
7. Admin confirm → **PAID** (lặp lại từ bước 3)

### Scenario 2: Đơn sắp hết hạn, thanh toán muộn
1. Đơn hiện tại: **RENEWAL**, daysLeft = 2
2. Webhook nhận thanh toán → Renewal → **PROCESSING**, daysLeft = 32 (đã gia hạn)
3. Admin confirm → **PAID**

### Scenario 3: Đơn đã hết hạn, thanh toán gia hạn
1. Đơn hiện tại: **EXPIRED**, daysLeft = 0
2. Webhook nhận thanh toán → Renewal → **PROCESSING**, daysLeft = 31 (đã gia hạn)
3. Admin confirm → **PAID**

---

## Code References

- Status definitions: `shared/orderStatuses.js`
- Renewal eligibility: `backend/webhook/sepay/renewal.js` → `isEligibleForRenewal()`
- Renewal execution: `backend/webhook/sepay/renewal.js` → `runRenewal()`
- Scheduler: `backend/scheduler.js` → `updateDatabaseTask()`
- Webhook handler: `backend/webhook/sepay/routes/webhook.js`

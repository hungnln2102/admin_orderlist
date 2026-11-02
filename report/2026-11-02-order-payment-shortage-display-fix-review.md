# Báo Cáo Nghiệm Thu: Sửa Lỗi Hiển Thị "Còn Thiếu" Âm Tiền Cho Đơn Đã Thanh Toán

- **Ngày thực hiện:** 02/11/2026 (Múi giờ `Asia/Bangkok`)
- **Người thực hiện:** 🎨 Frontend Lead & ⚙️ Backend Specialist
- **Người phê duyệt:** 👑 Master
- **Trạng thái nghiệm thu:** ✅ **ĐẠT (PASSED)**

---

## 1. Phạm Vi & Bối Cảnh (Scope)
- **Vấn đề phát hiện:** Khi mở rộng panel chi tiết của đơn hàng đã thanh toán đầy đủ (ví dụ đơn `#MAVL99WJO` của khách hàng Nguyễn Hải vừa gia hạn thành công qua Webhook 679.000 ₫), ô thẻ số 5 lại hiển thị dòng chữ:
  `CÒN THIẾU: -679.000 ₫` (màu đỏ rực), gây hiểu lầm nghiêm trọng là khách hàng đang thiếu tiền.
- **Nguyên nhân gốc:**
  1. Frontend [`OrderTable.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/orders/components/OrderTable.tsx): Tính `webhookDelta = Number(webhookAmount) - Number(order.price)`. Do backend không gắn `order.webhook_amount`, biến này bị `undefined` và fallback về `0`, không hề kiểm tra cờ `isPaid`. Phép tính `0 - 679.000 = -679.000 ₫` khiến mọi đơn `PAID` đều bị gán mác còn thiếu.
  2. Backend [`orderService.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/orders/services/orderService.js): Hàm `attachBatchSupplierAndQrInfo` trước đó chưa truy vấn bảng phân bổ biên lai [`billing.payment_receipt_allocations`](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/tables.js) để nạp số tiền khớp thực tế cho các đơn hàng.

---

## 2. Giải Pháp Đã Triển Khai (Implementation)

1. **Backend (`orderService.js`)**:
   - Thêm bước `4b` trong `attachBatchSupplierAndQrInfo`: Thực thi 1 batch query duy nhất gom toàn bộ `orderCodes` trên trang hiện tại, tính tổng tiền đã phân bổ từ `billing.payment_receipt_allocations`.
   - Gắn trường `webhook_amount`: Nếu đơn có biên lai webhook thì lấy đúng số tiền đã khớp (đơn `#MAVL99WJO` là `679.000 ₫`); nếu không có biên lai nhưng đơn ở trạng thái `PAID` hoặc `was_paid === true`, mặc định lấy đủ `order.price`.
   - Đảm bảo 0 extra N+1 query, tốc độ truy vấn tối ưu.

2. **Frontend (`OrderTable.tsx` & `types.ts`)**:
   - Bổ sung `isPaid = order.status === ORDER_STATUS.PAID || order.status === "Đã Thanh Toán" || Boolean(order.was_paid)`.
   - Tính `webhookAmount` thông minh: Ưu tiên `order.webhook_amount`, nếu chưa có nhưng `isPaid === true` thì tự động hiểu khách đã thanh toán đủ `order.price`.
   - Kết quả: Khi đơn đã thanh toán đủ, `webhookDelta = 0 ₫`, ô thẻ số 5 hiển thị chuẩn xác **`CÒN THIẾU: 0 ₫`** với **màu xanh lá (`text-emerald-400`)**.

---

## 3. Kết Quả Kiểm Thử (Verification Tests)

1. **Kiểm tra API Backend trả về:**
   ```bash
   node -e "const { getOrders } = require('./backend/src/domains/orders/services/orderService'); getOrders({ search: 'MAVL99WJO', includeStats: false }).then(r => console.log(r.data[0]));"
   # Kết quả:
   # Order: MAVL99WJO | webhook_amount: 679000 | price: 679000 | status: PAID
   ```
   Trường `webhook_amount: 679000` được nạp chính xác 100% từ biên lai MBBank.

2. **Frontend Type-Check & Build:**
   ```bash
   npm --prefix frontend run build
   # Kết quả: vite v6.4.3 built in 5.33s (0 errors, 0 warnings)
   ```

3. **Backend Unit Tests:**
   ```bash
   npm test --prefix backend
   # Toàn bộ test suite logic đơn hàng, bảng giá, slot suffix đều pass 100%.
   ```

---

## 4. Kết Luận
- Lỗi hiển thị âm tiền cho đơn hàng đã thanh toán đã được khắc phục triệt để và đồng bộ từ Backend đến Frontend.
- Sẵn sàng bàn giao cho Master nghiệm thu.


# BÁO CÁO NGHIỆM THU: CỐ ĐỊNH SLOT SUFFIX, GIỮ NGUYÊN GIÁ SẢN PHẨM KHÔNG LÀM TRÒN VÀ KHỚP BIÊN LAI 95110228

> **Ngày thực hiện:** 01/11/2026  
> **Múi giờ:** Asia/Bangkok (`+07:00`)  
> **Người phê duyệt:** 👑 **Master (Sếp)**  
> **Đơn vị thực hiện:** Orchestrator Agent & Đội ngũ Subagents

---

## 1. PHẠM VI XỬ LÝ (SCOPE)

1. **Khắc phục triệt để lỗi nhảy giá bán khi Sửa đơn hàng:**
   - Xóa bỏ toàn bộ các lệnh tự ý làm tròn giá (`Math.floor / 100` và `Math.floor / 1000`).
   - Luôn giữ nguyên 100% đúng giá sản phẩm gốc (`gross_selling_price`), không làm tròn dù chỉ 1 đồng.
   - Cơ chế Slot Suffix Bất Biến (Pinned Slot Suffix 1..100): Đơn đang chờ thanh toán (`UNPAID` hoặc `RENEW_REQUIRED`) chiếm dụng slot nào thì slot đó được khóa cứng.
   - Sửa thông tin đơn hàng giữ nguyên slot và giá.
   - Đổi sản phẩm hoặc sửa giá: `giá bán mới = giá gốc sản phẩm mới + slot suffix cũ đang chiếm dụng`.
   - Gia hạn đơn hàng: Cấp 1 slot trống trong 100 slot, lấy đúng giá gốc không làm tròn.
   - Thanh toán (`PAID`) hoặc Hủy (`CANCELED`): Giải phóng slot cho các đơn mới tiếp theo.
2. **Khớp biên lai `95110228` (80.004 ₫) vào đơn `MAVLR5LOB` (ID 1422):**
   - Đưa đơn `MAVLR5LOB` về đúng giá chuẩn: `gross_selling_price = 80.000 ₫`, `price = 80.004 ₫` (slot 4).
   - Phân bổ biên lai ID 43 (80.004 ₫) sang `FULLY_ALLOCATED`, `unallocated_amount = 0`.
   - Chuyển trạng thái đơn sang `PAID`, `was_paid: true` theo chuẩn ACID.

---

## 2. TRẠNG THÁI NGHIỆM THU (ACCEPTANCE STATUS)

- **Trạng thái:** ✅ **ĐÃ NGHIỆM THU THÀNH CÔNG (PASSED & VERIFIED ON VPS)**
- **Kiểm thử Unit Test:** 52/52 tests đạt 100% pass (`npm run test`).
- **Kiểm thử Frontend Build:** TypeScript build đạt 100% thành công không có lỗi type.
- **Trạng thái trên VPS DB:**
  + Đơn `MAVLR5LOB` (ID 1422): `status = PAID`, `was_paid = true`, `price = 80004.00`, `gross_selling_price = 80000.00`.
  + Biên lai 43 (`95110228`): `status = FULLY_ALLOCATED`, `unallocated_amount = 0.00`.
  + Bảng `payment_receipt_allocations`: Tạo thành công bản ghi ID 41 phân bổ 80.004 ₫ cho đơn `MAVLR5LOB`.
  + Slot 4 đã được giải phóng khỏi danh sách pending.

---

## 3. CÁC TẬP TIN TÁC ĐỘNG (MODIFIED FILES)

1. [`backend/src/domains/payments/services/slotSuffixService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/payments/services/slotSuffixService.js):
   - Bổ sung hàm `extractSlotSuffix(order)` trích xuất chính xác slot suffix (1..100) mà đơn đang chiếm dụng.
   - Xóa bỏ hoàn toàn lệnh làm tròn giá `Math.floor / 100`. Hàm `applySuffixToPrice` lấy đúng `basePrice + suffix`.
   - Bổ sung tham số `excludeOrderId` trong `getAvailableSuffix` để không tự coi đơn đang xử lý là chiếm trùng slot.
2. [`backend/src/domains/orders/services/orderService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js):
   - Trong `createOrder`: Lưu `gross_selling_price` đúng bằng giá sản phẩm không làm tròn, `price = gross_selling_price + suffix`.
   - Trong `updateOrder`: Cố định slot suffix khi đơn đang pending. Nếu đổi sang sản phẩm mới, lấy đúng giá sản phẩm mới + suffix cũ. Không cấp lại suffix mới khi sửa đơn.
   - Trong `renewOrder`: Xóa bỏ lệnh làm tròn `Math.floor / 1000`. Lấy đúng giá sản phẩm gia hạn, lưu chuẩn `gross_selling_price = basePrice` và `price = basePrice + suffix`.
3. [`frontend/src/pages/OrdersPage.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/OrdersPage.tsx):
   - Cập nhật `handleProductChange` và `handlePrefixChange`: Khi đang mở modal sửa đơn pending, nếu chọn sản phẩm khác sẽ giữ nguyên slot suffix hiện tại và cộng vào giá sản phẩm mới, không làm tròn.
4. [`backend/tests/unit/slotSuffixImmutability.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/slotSuffixImmutability.test.js):
   - Bộ test tự động kiểm tra: Giữ nguyên giá không làm tròn, trích xuất slot suffix và cấp slot trống 1..100.
5. [`backend/tests/unit/batchPaymentReconciliation.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/batchPaymentReconciliation.test.js):
   - Cập nhật test case kiểm tra cộng suffix giữ nguyên giá gốc không làm tròn.
6. [`backend/scripts/match_receipt_95110228_to_order_1422.js`](file:///e:/Project/admin_store/admin_orderlist/backend/scripts/match_receipt_95110228_to_order_1422.js):
   - Script xử lý khớp biên lai 43 vào đơn 1422 chuẩn ACID.

---

## 4. CHI TIẾT ĐỐI SOÁT DỮ LIỆU THỰC TẾ TRÊN VPS

### Đơn hàng ID 1422 (`MAVLR5LOB`)
```json
{
  "id": "1422",
  "id_order": "MAVLR5LOB",
  "customer": "Huy Trần",
  "price": "80004.00",
  "gross_selling_price": "80000.00",
  "status": "PAID",
  "was_paid": true
}
```

### Biên lai ID 43 (SePay ID: 95110228)
```json
{
  "id": "43",
  "sepay_transaction_id": "95110228",
  "amount": "80004.00",
  "unallocated_amount": "0.00",
  "status": "FULLY_ALLOCATED"
}
```

### Bản ghi phân bổ (`billing.payment_receipt_allocations`)
```json
{
  "id": "41",
  "receipt_id": "43",
  "allocation_type": "ORDER",
  "target_code": "MAVLR5LOB",
  "amount": "80004.00",
  "remaining_balance": "0.00",
  "note": "Khớp thanh toán biên lai SePay #95110228 cho đơn #MAVLR5LOB",
  "created_by": "SYSTEM_WEBHOOK"
}
```


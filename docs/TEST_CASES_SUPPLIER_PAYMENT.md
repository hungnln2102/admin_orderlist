# Test Cases - Thanh Toán NCC & Chu Kỳ Âm

Tài liệu test case cho các rule liên quan chu kỳ thanh toán NCC, điều chỉnh âm (hoàn tiền), QR và confirm.

---

## 1. Backend - Chạy test tự động

```bash
cd backend && node test-rules.js
```

### Các test tự động liên quan

| Test | Mô tả |
|------|-------|
| **test7** | Xóa đơn khi chu kỳ đã PAID → tạo dòng điều chỉnh âm (total_amount &lt; 0) |
| **test8** | Confirm chu kỳ âm → chỉ đổi status PAID, import_value vẫn âm |

---

## 2. Manual Test Cases - Chu kỳ âm (NCC trả mình)

### TC-1: Chu kỳ âm - Bấm Thanh toán không đổi số tiền

**Điều kiện:** Có chu kỳ với `total_amount` âm (điều chỉnh hoàn tiền).

**Bước:**
1. Vào trang **Nhà cung cấp** (Supply).
2. Mở NCC có chu kỳ âm (ví dụ TEST_SUPPLIER_7 sau khi chạy test7).
3. Mở chi tiết (View / Chi tiết).
4. Ghi nhận số tiền chu kỳ (ví dụ: -200.000 ₫).
5. Bấm **Thanh toán** (hoặc **Xác nhận đã chuyển khoản**).

**Kết quả mong đợi:**
- Chu kỳ chuyển trạng thái **Đã Thanh Toán**.
- Số tiền **vẫn âm** (không đổi thành dương).
- Chu kỳ biến mất khỏi danh sách "Chu kỳ chưa thanh toán" (đã PAID).

---

### TC-2: Chu kỳ âm - QR dùng STK của tôi

**Điều kiện:** Chu kỳ âm trong "Chu kỳ chưa thanh toán".

**Bước:**
1. Vào **Nhà cung cấp** → chọn NCC có chu kỳ âm.
2. Mở chi tiết hoặc View.
3. Chọn chu kỳ âm và xem QR.

**Kết quả mong đợi:**
- QR dùng **STK của tôi** (9183400998, VPB, NGO LE NGOC HUNG).
- Số tiền QR = **số dương** (ví dụ: 200.000).
- Label: "Chủ TK" = **NGO LE NGOC HUNG**.
- Mô tả có dạng "(NCC chuyển cho bạn)" hoặc tương tự.

---

### TC-3: Chu kỳ dương - QR dùng STK NCC

**Điều kiện:** Chu kỳ dương (mình còn nợ NCC).

**Bước:**
1. Mở NCC có chu kỳ dương (total_amount &gt; 0).
2. Chọn chu kỳ và xem QR.

**Kết quả mong đợi:**
- QR dùng **STK của NCC**.
- Số tiền QR = còn nợ (total_amount - paid).

---

### TC-4: Xóa đơn PAID khi chu kỳ đã thanh toán hết

**Điều kiện:** Đơn đã PROCESSING/PAID, chu kỳ NCC của supplier đã PAID (không còn UNPAID).

**Bước:**
1. Tạo đơn → chuyển PROCESSING (cộng NCC).
2. Confirm chu kỳ (đặt status = PAID).
3. Xóa đơn.

**Kết quả mong đợi:**
- Tạo dòng điều chỉnh âm (total_amount &lt; 0).
- Round dạng `ADJ - DD/MM/YYYY`.
- Số tiền trừ NCC = prorated (theo số ngày còn lại).

---

### TC-5: order_canceled.days = số ngày còn lại

**Điều kiện:** Xóa đơn PAID/PROCESSING.

**Bước:**
1. Tạo đơn 30 ngày, còn 20 ngày đến hạn.
2. Chuyển PROCESSING.
3. Xóa đơn.
4. Kiểm tra bảng `order_canceled`.

**Kết quả mong đợi:**
- Cột `days` = 20 (số ngày còn lại tại thời điểm xóa).
- NCC bị trừ đúng prorated: `ceil((cost * 20/30) / 1000) * 1000`.

---

## 3. API Test - Confirm chu kỳ âm

**Endpoint:** `POST /api/payment-supply/:paymentId/confirm`  
**Body (khi âm):** `{}` hoặc không gửi `paidAmount`.

**Chuẩn bị:** Có payment row với `total_amount` &lt; 0, `payment_status` = "Chưa Thanh Toán".

```bash
# Giả sử payment ID = 123
curl -X POST "http://localhost:3001/api/payment-supply/123/confirm" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --cookie "session=..."
```

**Kết quả mong đợi:**
- HTTP 200.
- Response: `status: "Đã Thanh Toán"`.
- DB: `total_amount` không đổi (vẫn âm), `amount_paid` không đổi.

---

## 4. Tóm tắt Rule

| Tình huống | Hành động | Kết quả |
|------------|-----------|---------|
| Chu kỳ âm + Bấm Thanh toán | Chỉ cập nhật status = PAID | total_amount vẫn âm |
| Chu kỳ âm + View/QR | Dùng STK của tôi, amount = \|total_amount\| | QR để NCC chuyển cho mình |
| Chu kỳ dương + View/QR | Dùng STK NCC | QR để mình chuyển cho NCC |
| Xóa đơn khi không còn UNPAID | Insert dòng điều chỉnh âm | total_amount âm = prorated trừ |
| Xóa đơn PAID → order_canceled | Lưu days = số ngày còn lại | Cột days = (expiry - today) |

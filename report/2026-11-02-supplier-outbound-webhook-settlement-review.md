# Báo Cáo Điều Tra: Webhook Tiền Ra Chưa Tất Toán Công Nợ NCC

- **Ngày thực hiện:** 02/11/2026 (múi giờ `Asia/Bangkok`)
- **Trạng thái nghiệm thu:** ❌ **CHƯA ĐẠT - KHÔNG TỰ ĐỘNG SỬA DỮ LIỆU PRODUCTION**
- **Phạm vi:** Luồng payment outbound từ webhook đến biên lai, ví Shop và tất toán công nợ của NCC `Đỗ Thanh Hoài`.
- **Sự kiện cần đối chiếu:** Telegram báo `webhook.moneyOut:#51`, trace `796923`, lúc khoảng 00:18 ngày 02/11/2026; số dư Shop giảm từ `8.102.721đ` xuống `7.982.727đ`, chênh `119.994đ`. UI NCC vẫn hiển thị còn nợ `120.000đ`.

## 1. Kết luận

Luồng tự động đang có lỗi nghiệp vụ ở nhánh tiền ra: hệ thống vẫn commit biên lai `UNALLOCATED` và trừ ví Shop ngay cả khi không xác định được NCC một cách duy nhất. Vì không có xác nhận/alert bắt buộc cho trạng thái chưa phân bổ, tiền ngân hàng đã giảm nhưng các dòng `supplier_order_cost_log.ncc_payment_status` không được đổi sang `Đã Thanh Toán`; UI vì vậy tiếp tục hiển thị công nợ.

Dữ liệu trong ảnh khớp rất mạnh với quy tắc suffix hiện tại: `120.000đ - 6 = 119.994đ`. Local database cũng có NCC `Đỗ Thanh Hoài` với ID `6` và STK `3868666383`, tuy nhiên local database không chứa receipt `#51` hoặc các log công nợ production. Vì vậy không thể xác nhận trực tiếp payload/bản ghi production bằng local DB; kết luận về receipt `#51` là suy luận kỹ thuật có độ tin cậy cao từ ảnh và source code, không phải live DB proof.

## 2. Dòng dữ liệu và bằng chứng

| Bước | Bằng chứng | Trạng thái |
| --- | --- | --- |
| Số tiền chuyển | Telegram ghi chênh `-119.994đ`; UI ghi công nợ `120.000đ` | Khớp suffix NCC `#6` |
| Tạo receipt | `webhookPaymentService.js` luôn insert `payment_receipt` với `UNALLOCATED` trước khi đối soát | Có thể commit receipt chưa phân bổ |
| Trừ ví Shop | Nhánh `OUT` luôn gọi `debitFinancialAccount(...)` trước khi xác minh NCC | Ví bị trừ dù chưa tất toán NCC |
| Chọn NCC theo số tiền | Query chỉ tìm NCC có `tổng nợ = transferAmount + supplierId` | `119.994 + 6 = 120.000` khớp |
| Xác minh NCC | Candidate chỉ được chấp nhận khi note có `NCC6` hoặc `payload.receiver`/`receiverAccount` đúng STK NCC | Điểm thất bại khả dĩ cao |
| Tất toán | Chỉ khi đúng một candidate đã xác minh, `settleSupplierDebtTransaction(...)` mới đổi toàn bộ log sang `Đã Thanh Toán` và tạo allocation | Không xảy ra khi `matched=false` |

## 3. Phát hiện

### P1 - Receipt tiền ra có thể được ghi nhận nhưng công nợ NCC không được tất toán

**Mức độ:** Cao - làm lệch công nợ NCC so với dòng tiền thực.

`backend/src/domains/payments/services/webhookPaymentService.js:85` tạo receipt ở trạng thái `UNALLOCATED`. Trong nhánh outbound, code trừ ví tại `backend/src/domains/payments/services/webhookPaymentService.js:104` trước khi xác định NCC. Code chỉ gọi `settleSupplierDebtTransaction(...)` tại `backend/src/domains/payments/services/webhookPaymentService.js:137` khi danh sách NCC sau filter còn đúng một phần tử. Nếu không, code trả thành công với lý do `Đã lưu Biên lai Tiền ra #<id> chưa phân bổ NCC` tại `backend/src/domains/payments/services/webhookPaymentService.js:157`; transaction vẫn commit.

Hệ quả: dashboard/Telegram phản ánh tiền ra hợp lệ, nhưng `supplier_order_cost_log.ncc_payment_status` vẫn là `Chưa Thanh Toán`, do đó trang NCC tiếp tục hiển thị nợ.

### P1 - Luồng tạo QR không tạo định danh xác định để webhook có thể tất toán NCC

**Mức độ:** Cao - không bảo đảm khả năng tự đối soát.

`backend/src/domains/suppliers/services/supplierService.js:275` tạo VietQR với số tiền suffix, nhưng URL không kèm nội dung chuyển khoản chuẩn như `NCC6`. Trong khi đó, webhook chỉ xác minh NCC bằng một trong hai điều kiện:

1. Nội dung chuyển khoản chứa `NCC<supplierId>`; hoặc
2. `payload.receiver`/`payload.receiverAccount` bằng đúng `supplier.number_bank`.

Ảnh Telegram chỉ hiện chuỗi `NGO LE NGOC HUNG chuyển tiền - Mã giao dịch/Trace 796923`, không có `NCC6`. Nếu provider outbound chỉ trả tên/chủ tài khoản Shop hoặc không trả số tài khoản người nhận trong field mà code đang dùng, cả hai điều kiện đều sai. Suffix số tiền một mình bị cố tình xem là chưa đủ để tránh phân bổ nhầm, nên receipt bị bỏ lại ở trạng thái chưa phân bổ.

### P1 - Chưa có flow sửa sai rõ ràng, idempotent cho receipt outbound chưa phân bổ

**Mức độ:** Cao - không thể xử lý an toàn giao dịch đã xảy ra chỉ bằng UI NCC hiện tại.

Source hiện có route generic `POST /invoices/:id/allocate`, nhưng `invoiceService.allocateReceipt()` không đi qua `settleSupplierDebtTransaction()` cho loại `SUPPLIER`. Route `POST /suppliers/:id/pay-debt` lại tạo một receipt mới và tất toán ngay, nên không được dùng để sửa receipt webhook `#51`; dùng nó sẽ rủi ro ghi nhận/trừ tiền lần hai.

Cần một endpoint/UX chuyên biệt như `POST /payment-receipts/:receiptId/allocate-outbound` nhận `supplierId`, lock receipt + supplier logs, đối chiếu số tiền suffix, gọi đúng `settleSupplierDebtTransaction()` trong cùng transaction, và idempotent theo allocation `receipt_id + target_code`.

### P2 - Không có alert bắt buộc khi `matched=false`

**Mức độ:** Trung bình - phát hiện chậm, dễ dẫn đến hiểu nhầm là đã thanh toán xong.

Nhánh `matched=false` trả `success: true`; Telegram chỉ thấy biến động số dư Shop. Hệ thống cần thông báo cảnh báo rõ `Tiền ra chưa phân bổ NCC`, gắn receipt ID, amount, trace/reference và action phân bổ an toàn.

## 4. Đánh giá ACID

| Thuộc tính | Trạng thái | Nhận xét |
| --- | --- | --- |
| Atomicity | Risk | Receipt + debit ví commit cùng transaction, nhưng tất toán NCC là nhánh tùy điều kiện; nghiệp vụ “thanh toán NCC” bị hoàn tất một phần. |
| Consistency | Fail | Dòng tiền thực đã giảm nhưng công nợ NCC vẫn chưa giảm khi webhook không verify được candidate. |
| Isolation | Pass có điều kiện | Settlement dùng lock trong `settleSupplierDebtTransaction`, nhưng thao tác sửa receipt outbound chuyên biệt chưa tồn tại. |
| Durability | Pass | Receipt/ví được commit bền vững; chính vì vậy sai lệch cần một flow bù trừ idempotent, không phải retry mù. |

## 5. Hướng xử lý an toàn

1. **Không gọi `POST /suppliers/:id/pay-debt` để sửa giao dịch #51.** Endpoint này tạo receipt mới, có rủi ro double-record dòng tiền.
2. Trên production, truy vấn receipt `#51` theo trace `796923`, kiểm tra `transfer_type=OUT`, `amount=119994`, `status`, `unallocated_amount`, `note`, `receiver`, allocation hiện có và supplier log ID `6` trước khi hành động.
3. Nếu receipt chưa có allocation và tổng nợ chưa trả của NCC `#6` vẫn đúng `120.000đ`, thực hiện một lần phân bổ/bù trừ qua service `settleSupplierDebtTransaction()` trong transaction; tạo allocation `SUPPLIER`, target `NCC-6`, amount `119.994đ`, rồi verify UI công nợ về `0đ`.
4. Bổ sung payment intent trước khi người dùng chuyển khoản: tạo `pending_supplier_settlement` với `supplier_id`, `expected_amount`, `expiry`, `financial_account_id`, reference code `NCC6-<nonce>`. QR bắt buộc có `addInfo` chứa reference code.
5. Webhook ưu tiên match reference code/payment intent; chỉ dùng số tiền suffix và đúng tài khoản đích như fallback. Không auto-settle chỉ dựa riêng số tiền nếu còn khả năng collision.
6. Thêm endpoint/UI “Phân bổ tiền ra chưa khớp” idempotent, và alert realtime/Telegram khi `matched=false`.
7. Viết integration tests cho: note có `NCC6`, receiver account đúng, payload thiếu receiver, amount suffix đúng nhưng thiếu định danh, duplicate webhook, và thao tác phân bổ thủ công retry/concurrent.

## 6. Kiểm tra đã chạy

- Đọc source `backend/src/domains/payments/services/webhookPaymentService.js` (luồng receipt, debit ví, candidate/verification NCC).
- Đọc source `backend/src/domains/suppliers/services/supplierSettlementService.js` và `supplierService.js` (suffix, lock, tất toán, VietQR).
- Local read-only PostgreSQL probe: tìm NCC `Đỗ Thanh Hoài`/STK `3868666383`; local có ID `6` nhưng không có receipt `#51`, allocation hoặc supplier cost log tương ứng.
- Kiểm tra history: logic candidate + note/receiver verification được thêm tại commit `24547c06` ngày 31/10/2026; QR đã bỏ memo tại commit `8a9c5fd4`.
- Không thể truy cập browser/API production trực tiếp trong phiên kiểm tra vì browser access host không khả dụng và local `.env` trỏ database `127.0.0.1`, không phải database của trang production.

## 7. Điều kiện nghiệm thu

Chưa nghiệm thu cho đến khi có bằng chứng production cho receipt `#51`/trace `796923`, giao dịch được phân bổ qua flow idempotent không tạo receipt mới, công nợ NCC `Đỗ Thanh Hoài` về đúng số thực tế, và regression tests của payment intent/outbound allocation pass.
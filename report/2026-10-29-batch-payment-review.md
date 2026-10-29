# Đánh giá batch payment và tự đối soát

- Ngày đánh giá: 2026-10-29
- Múi giờ: Asia/Bangkok
- Phạm vi: batch payment request, Slot Suffix, webhook tự đối soát, UI biên lai và migration `batch_payment_requests`.
- Trạng thái nghiệm thu: CHƯA NGHIỆM THU.

## Phát hiện cần xử lý

### P1 - Một đơn có thể xuất hiện trong nhiều batch chờ thanh toán

`createBatchPaymentRequest` chỉ khóa đơn trong lúc tạo batch. Sau khi transaction commit, đơn vẫn ở trạng thái có thể thanh toán nên một request khác vẫn tạo được batch mới cho cùng đơn. Nếu cả hai batch được thanh toán, `processCompleteOrder` vẫn phát event `ORDER_PAID` cho đơn đã `PAID`, có thể làm doanh thu hoặc sổ cái bị ghi nhận hai lần.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:189`
- Tác động: đối soát trùng, phát event tài chính trùng.
- Yêu cầu trước nghiệm thu: chặn đơn đã thuộc batch `PENDING`, hoặc thiết kế cơ chế reserve đơn có ràng buộc DB và giải phóng khi batch `EXPIRED`/`CANCELED`.

### P1 - Slot Suffix không an toàn khi tạo batch đồng thời

`getAvailableSuffix()` đọc bằng `db` riêng, không sử dụng transaction đang tạo batch; migration cũng không có ràng buộc uniqueness cho suffix đang `PENDING`. Hai request đồng thời có thể nhận cùng suffix. Nếu tổng tiền bằng nhau, webhook chọn batch mới nhất theo `id` và có thể hoàn tất nhầm batch.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:216`
- Nguồn: `backend/src/domains/payments/services/slotSuffixService.js:9`
- Nguồn: `backend/src/db/migrations/20261029000001_create_batch_payment_requests.js:12`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:145`
- Yêu cầu trước nghiệm thu: cấp suffix trong cùng transaction có lock phù hợp và bổ sung ràng buộc/index bảo vệ batch `PENDING`; xử lý retry khi xảy ra conflict.

### P1 - Webhook phân bổ theo giá đơn cũ thay vì giá gốc đã dùng để tạo batch

Batch tính `base_amount` từ `catalogBasePrice`, nhưng webhook lại phân bổ các đơn đầu theo `subOrder.price`. Với đơn đang mang suffix cũ, khoản phân bổ cuối bị thiếu hoặc dư. Với đơn `MAVT` có giá gốc bằng 0, sai lệch có thể lớn hơn và làm sai số liệu event tài chính.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:209`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:185`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:204`
- Yêu cầu trước nghiệm thu: lưu snapshot số tiền phân bổ theo từng đơn khi tạo batch, hoặc tái tính bằng cùng hàm bảng giá trong webhook; chỉ cộng `slot_suffix` vào một allocation đã xác định.

### P1 - QR được hiển thị trước khi batch được lưu

UI tạo và hiển thị VietQR ngay khi chọn đơn, trong khi batch chỉ được lưu khi người dùng bấm nút lưu, tải ảnh QR, hoặc copy tin nhắn. Khách có thể quét hoặc chụp QR rồi chuyển tiền khi không có batch nào trong DB để webhook đối soát.

- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:328`
- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:375`
- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:421`
- Nguồn: `frontend/src/features/invoices/components/CreateReceiptModal.tsx:900`
- Yêu cầu trước nghiệm thu: chỉ cho chia sẻ/tải QR sau khi batch đã persist, hoặc persist batch trước khi hiển thị QR có thể dùng để thanh toán.

### P2 - Tài khoản nhận tiền không được xác nhận khi webhook match batch

Batch lưu `financial_account_id`, nhưng webhook match theo `batch_code` hoặc `total_amount` mà không đối chiếu tài khoản nhận. Giao dịch vào tài khoản khác vẫn có thể hoàn tất batch; cơ chế credit hiện tại còn có fallback sang tài khoản mặc định.

- Nguồn: `backend/src/domains/invoices/services/batchPaymentService.js:246`
- Nguồn: `backend/src/domains/payments/services/webhookPaymentService.js:134`
- Nguồn: `backend/src/domains/wallets/services/walletService.js:356`
- Yêu cầu trước nghiệm thu: resolve tài khoản nhận từ payload webhook, đối chiếu với `financial_account_id`, và không dùng fallback khi đang đối soát batch.

## Kiểm tra đã chạy

- `node --check` cho các file backend mới: pass.
- `npm test -- --test-name-pattern="Batch Payment"` tại `backend/`: 37/37 test pass.
- `npm run build` tại `frontend/`: pass.
- `git diff --check`: pass.

## Khoảng trống kiểm thử

- Chưa có test tích hợp cho hai request tạo batch đồng thời.
- Chưa có test chặn một đơn thuộc nhiều batch `PENDING`.
- Chưa có test webhook phân bổ theo snapshot giá catalog, đơn có suffix cũ, hoặc đơn `MAVT`.
- Chưa có test webhook xác minh đúng `financial_account_id`.
- Chưa có test UI bảo đảm QR không thể được dùng trước khi batch được persist.

## Điều kiện nghiệm thu

Chỉ nghiệm thu sau khi xử lý toàn bộ phát hiện P1, thêm test tái hiện tương ứng, và chạy lại kiểm tra backend/frontend.

# Báo cáo triển khai master task - 2026-10-31

## Phạm vi

- Đồng bộ phân trang URL cho đơn hàng, bảng giá, biên lai, chi phí ngoài luồng và kho.
- Sắp xếp tab đơn hết hạn theo `expired_at DESC NULLS LAST`.
- Tất toán công nợ NCC theo số tiền bank thực trả: `debt - supplier.id`; ví dụ NCC ID `1`, nợ `500.000 đ` tạo biên lai và allocation duy nhất `499.999 đ`.
- Thêm `variant_tag` cho `warehouse.account_slots` và thống kê catalog theo số tài khoản distinct.

## Trạng thái nghiệm thu

**CHƯA NGHIỆM THU LIVE**. Mã nguồn đã build/test tĩnh thành công, nhưng migration chưa được áp dụng và test tích hợp tài chính chưa được chạy trên database test cô lập.

## Đã triển khai

- `supplierSettlementService` khóa NCC, các dòng công nợ và biên lai bằng `FOR UPDATE`; cập nhật log sang `Đã Thanh Toán`, tạo đúng một allocation `SUPPLIER`, lưu audit `NCC{id}`, `settledDebt`, `bankPaidAmount`, `suffixAmount`.
- Webhook tiền ra chỉ tự tất toán khi có đúng một NCC khớp `debt = transferAmount + supplier.id` và có xác minh `NCC{id}` hoặc số tài khoản người nhận; webhook không khớp giữ biên lai `UNALLOCATED`.
- Nút thanh toán thủ công tạo biên lai `out` và gọi cùng hàm tất toán trong một transaction; event `SUPPLIER_DEBT_PAID` chỉ phát sau commit.
- VietQR NCC dùng số tiền bank thực trả và nội dung `NCC{id}`; `/invoices` hiển thị badge `Chi Trả NCC`.
- Migration `20261031000001_add_variant_tag_to_warehouse_account_slots.js`, registry `COLS.ACCOUNT_SLOTS.VARIANT_TAG`, API và modal kho hỗ trợ tag biến thể.

## Kiểm tra đã chạy

- `node --check` cho các module backend thay đổi và test integration cập nhật: đạt.
- `npm --prefix backend test`: đạt, 48/48 test.
- `npm --prefix frontend run build`: đạt, `tsc` và Vite build không lỗi.
- `npx.cmd knex migrate:list` trong `backend`: phát hiện đúng 1 migration chờ áp dụng: `20261031000001_add_variant_tag_to_warehouse_account_slots.js`.
- `git diff --check`: đạt.

## Điều kiện trước nghiệm thu

1. Áp dụng migration trên sandbox/development đã xác nhận, không chạy tự động vào database `mydtbmav` dùng chung.
2. Thiết lập `TEST_DATABASE_URL` trỏ tới database có tên chứa `test`, chạy `npm --prefix backend run test:integration -- tests/integration/webhook_receipt.test.js`.
3. Bổ sung/chạy test regression tạo NCC ID `1`, nợ `500.000 đ`, webhook `499.999 đ`, `NCC1`; xác nhận một allocation `499.999 đ`, không có allocation `1 đ`, replay và race không double-settlement.
4. Smoke UI sau migration: URL phân trang giữ sau F5, filter reset về trang 1, kho hiển thị tag và tổng số tài khoản đúng.
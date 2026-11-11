## 2026-11-11 – Nghiệm thu giả lập 9 luồng SOP trên `mydtbmav_test`

### Phạm vi

- Dùng `TEST_DATABASE_URL` trỏ tới PostgreSQL local `mydtbmav_test`; không thao tác trên database nguồn `mydtbmav`.
- Bổ sung dữ liệu giả lập tối thiểu cho Credit, package category và warehouse catalog để kiểm thử đủ nhánh nghiệp vụ.
- Kiểm tra 9 luồng theo `docs/business-rules/core-business-flows.md` với integration test hiện có và regression unit test.

### Ma trận bằng chứng

| Luồng | Bằng chứng | Kết quả |
|---|---|---|
| 1. Biến động số dư Bank và idempotency | `webhook_financial_account_balance.test.js` | PASS `3/3` |
| 2. Webhook khớp thanh toán đơn hàng/biên lai | `webhook_receipt.test.js` | PASS `5/5` |
| 3. Thanh toán Credit đủ/thiếu tiền, QR phần còn thiếu | `credit_order_payment.test.js` | PASS `2/2` |
| 4. Đổi nhà cung cấp và đối soát công nợ | `supplier_reassignment_prorated_debt.test.js` | PASS `1/1` |
| 5. Nhập hàng và ghi nhận chi phí tài chính | `import_order_finance.test.js` | PASS |
| 6. Đơn Mavryk không tính trùng chi phí | `mavryk_order_zero_cost.test.js` | PASS `1/1` |
| 7. Gia hạn áp dụng giá mới và dashboard | `acceptance_finance_metrics.test.js` | PASS `2/2` |
| 8. Lưu kho, catalog, browser profile và slot | `warehouse.test.js` | PASS `7/7` |
| 9. Package category và gói liên kết kho | `package_categories.test.js` | PASS `7/7` |

### Thay đổi kỹ thuật

- Thêm `credit_paid_amount` cho `order_list` bằng migration `backend/src/db/migrations/20261111000001_add_credit_paid_amount_to_order_list.js` và khai báo tại `backend/src/db/tables.js`.
- Hoàn thiện thanh toán Credit toàn phần/bán phần trong `backend/src/domains/orders/services/orderCreditService.js`.
- Sửa truyền ngày giao dịch cho event thanh toán/gia hạn và dashboard tại các service Orders, Payments và Dashboard.
- Bổ sung formatter ngày dùng chung tại `backend/src/utils/time.js`; sửa `warehouseSlotService.js` không còn `ReferenceError: formatDateDisplay is not defined`.
- Bổ sung fixture test-only tại `backend/tests/fixtures/trustFlowFixtures.js` để tạo/khôi phục `login_url` YouTube trong database test.

### Kiểm tra đã chạy

- Integration matrix: 8 luồng chạy qua runner đều PASS; warehouse assertions PASS `7/7`.
- Backend unit suite: PASS `155/155`.
- `git diff --check`: PASS.

### Điều kiện còn lại trước khi đóng task

- Các assertion nghiệp vụ đều đạt `9/9` luồng. Riêng `warehouse.test.js` mở Chromium profile thật và process browser nền khiến runner không tự thoát sau khi in kết quả; process test đã được dừng thủ công sau khi toàn bộ `7/7` assertion PASS.
- Cần xử lý lifecycle đóng browser hoặc mock launcher trong integration harness nếu yêu cầu command phải kết thúc với exit code `0` tuyệt đối.

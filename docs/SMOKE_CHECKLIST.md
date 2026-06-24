# Smoke Checklist - `admin_orderlist`

Mục đích: kiểm tra hành vi chính sau mỗi clean-code/refactor slice, đặc biệt các luồng từng bị vá bằng hàm mới thay vì sửa hàm gốc.

> Trạng thái: khung ban đầu. Điền kết quả pass/fail vào `docs/REFACTOR_LOG.md` theo từng slice.

## Frontend Chung

- [ ] Login và load layout admin.
- [ ] Sidebar/routes chính mở được.
- [ ] Toast/loading/empty/error state không đổi bất thường.
- [ ] Modal mở/đóng không mất state ngoài ý muốn.

## Orders

- [ ] Mở danh sách đơn hàng.
- [ ] Filter/search/sort/pagination hoạt động.
- [ ] Tạo đơn hàng mới qua modal.
- [ ] Sửa đơn hàng qua modal.
- [ ] Các số tiền/status hiển thị không đổi so với baseline.
- [ ] Payment/refund action không double-submit.

## Invoices/Receipts

- [ ] Mở invoices/receipts page.
- [ ] Filter/search/pagination hoạt động.
- [ ] Xem QR hoặc thông tin thanh toán.
- [ ] Receipt action/status mapping không đổi.

## Products/Pricing

- [ ] Mở product/product-info page.
- [ ] Xem/sửa variant nếu có quyền.
- [ ] Upload/preview image vẫn hoạt động.
- [ ] Pricing preview/calculation không lệch baseline.
- [ ] Product description API vẫn hoạt động.

## Supplies/Expenses

- [ ] Mở danh sách supplies/suppliers.
- [ ] Filter/list/detail hoạt động.
- [ ] Expense allocation table hiển thị tổng không đổi.
- [ ] Supplier insights không lệch baseline.

## Wallet/Bank/Finance

- [ ] Mở wallet/USDT/bank accounts.
- [ ] Ledger list và balance hiển thị nhất quán.
- [ ] Withdrawal/deposit action không tạo double transaction.
- [ ] Audit/description transaction không mất thông tin.

## Dashboard/Reports

- [ ] Mở dashboard finance charts.
- [ ] Revenue/profit/payment metrics khớp baseline đã ghi.
- [ ] Date filter không đổi query semantics.

## Renew Adobe/Fix ADES

- [ ] Mở Renew Adobe accounts/logs/tracking pages.
- [ ] Filter/pagination logs hoạt động.
- [ ] Add tracking orders modal submit đúng.
- [ ] Check/fix flow trả cùng response shape.
- [ ] Scheduler/use-case không đổi luồng chạy.

## Backend/API Chung

- [ ] Health/API root vẫn chạy.
- [ ] Auth/session không đổi behavior.
- [ ] Route/API response shape quan trọng không đổi.
- [ ] Job/scheduler không crash khi import sau refactor.


## Payment/Refund Manual Completion

- [ ] Manual bank webhook completion chuyển đơn đúng trạng thái.
- [ ] Manual USDT completion chuyển đơn đúng trạng thái.
- [ ] Completion không tạo duplicate payment receipt/ledger khi gọi lại cùng đơn.
- [ ] Refund credit note không tạo double application.
- [ ] Refund credit cashout không tạo double transaction.
- [ ] Dashboard monthly summary không lệch revenue/profit/refund sau completion/refund.

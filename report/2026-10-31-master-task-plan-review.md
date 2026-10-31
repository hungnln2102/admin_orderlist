# Đánh giá lại `2026-10-31_master_task_plan.md` v2.0 — 2026-10-31

## Phạm vi

Rà lại bản v2.0 của `docs/plans/2026-10-31_master_task_plan.md` so với các phát hiện trong báo cáo trước và contract runtime hiện có của phân bổ biên lai, webhook tiền ra, công nợ NCC, Kho hàng và phân trang URL.

## Trạng thái nghiệm thu

**Chưa đủ điều kiện triển khai toàn bộ kế hoạch.**

Bản v2.0 đã khắc phục đáng kể: xác định một SSOT canonical, bổ sung contract URL, nêu migration/backfill cho tag, cô lập sort đơn hết hạn, dùng service transaction-bound, `forUpdate()`, `trx.afterCommit()` và tái sử dụng receipt webhook. Tuy nhiên, Mục 4 vẫn có một lỗi P0 làm allocation vượt số tiền thực có của receipt; không được triển khai trước khi chỉnh lại contract này.

## Phát hiện

### P0 - Chặn triển khai Mục 4

1. **Hai allocation của suffix discount vượt quá số tiền có thể phân bổ từ receipt.**
   - Plan yêu cầu receipt có `amount = transferAmount` nhưng tạo hai allocation: `SUPPLIER_PAYMENT = transferAmount` và `SUPPLIER_SUFFIX_DISCOUNT = supplier.id`. Tổng allocation bằng `settledDebt`, lớn hơn `receipt.amount` đúng bằng `supplier.id`.
   - Contract hiện hữu lấy `unallocated_amount` khởi tạo bằng `receipt.amount`, rồi từ chối bất kỳ allocation nào lớn hơn số dư còn lại. Vì allocation thực chi đã dùng hết `transferAmount`, allocation suffix thứ hai không thể được ghi theo luồng chuẩn; nếu bypass guard thì `unallocated_amount` thành âm và `FULLY_ALLOCATED` không còn phản ánh tiền ngân hàng thực tế.
   - Sửa tối thiểu: receipt và `payment_receipt_allocations` chỉ ghi nhận tiền ngân hàng thực chi `transferAmount`; phần `suffixDiscount` phải là bút toán/ledger riêng không tiêu thụ `unallocated_amount` của receipt, hoặc loại bỏ khoản trừ tiền và chỉ dùng `NCC{id}` làm định danh. Không được thêm `SUPPLIER_SUFFIX_DISCOUNT` vào allocation của cùng receipt nếu không mở rộng schema/contract để phân biệt non-cash allocation.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:112`, `docs/plans/2026-10-31_master_task_plan.md:120`, `backend/src/domains/payments/services/webhookPaymentService.js:87`, `backend/src/domains/invoices/services/invoiceService.js:195`, `backend/src/domains/invoices/services/invoiceService.js:196`.

### P1 - Cần chốt trước khi code

2. **Điều kiện auto-match dùng `NCC{id}` hoặc STK vẫn có thể tất toán sai NCC.**
   - Cùng một `transferAmount` có thể thỏa công thức cho hơn một NCC. Kế hoạch hiện cho phép chỉ một trong hai dấu hiệu `NCC{id}` hoặc STK nhận khớp; nếu payload webhook thiếu/chuẩn hóa sai một trường, điều kiện `OR` dễ chọn nhầm.
   - Yêu cầu matcher trả về đúng một ứng viên. Khi webhook có cả nội dung và STK, cả hai phải khớp cùng NCC; khi chỉ có một trường, không tự tất toán mà giữ receipt `UNALLOCATED` để đối soát thủ công. Ghi test cho collision số tiền và receiver/content không khớp.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:145`, `docs/plans/2026-10-31_master_task_plan.md:147`.

3. **Tag được định nghĩa là thuộc “tài khoản” nhưng lại lưu ở `warehouse.stock_services`; quy tắc đếm vẫn chưa được khóa.**
   - Một `PRODUCT_KEYS` account hiện có thể chứa nhiều `STOCK_SERVICES`. Nếu catalog đếm row `stock_services` là account, một account vật lý có nhiều dịch vụ/tag bị đếm nhiều lần và trái với yêu cầu “đơn vị đếm duy nhất là Tài Khoản”.
   - Plan cần quyết định rõ: một account chỉ có đúng một `stock_services` đại diện hay `variant_tag` phải chuyển sang entity account. Nếu vẫn lưu tại `stock_services`, catalog phải đếm `COUNT(DISTINCT account_id)` và migration cần unique constraint phù hợp với quy tắc đó.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:52`, `docs/plans/2026-10-31_master_task_plan.md:64`, `docs/plans/2026-10-31_master_task_plan.md:70`, `backend/src/domains/warehouse/services/warehouseService.js:94`, `backend/src/domains/warehouse/services/warehouseService.js:381`.

4. **“Thanh toán thủ công” chưa định nghĩa điểm ghi nhận tiền để không trừ số dư hai lần khi webhook đến sau.**
   - Plan nói nút thủ công tự tạo receipt tiền ra, trong khi webhook outbound cũng tạo receipt và gọi `debitFinancialAccount`. Nếu thao tác tay là xác nhận một giao dịch ngân hàng sẽ có webhook sau đó, hệ thống sẽ có hai receipt và hai lần ghi giảm tài chính.
   - Chốt một flow: thao tác tay chỉ tạo “yêu cầu chờ webhook”, hoặc thao tác tay ghi nhận giao dịch external đã hoàn tất với `reference_code` bắt buộc và webhook phải dedupe theo reference đó. Test Gate 3 cần có case manual trước webhook, webhook trước manual và retry webhook.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:137`, `docs/plans/2026-10-31_master_task_plan.md:165`, `backend/src/domains/payments/services/webhookPaymentService.js:83`, `backend/src/domains/payments/services/webhookPaymentService.js:102`.

## Các điểm đã đạt

- Có một canonical SSOT: `docs/plans/2026-10-31_master_task_plan.md`.
- URL pagination đã có parse/clamp, reset filter, merge params, `push`/`replace` và acceptance cơ bản.
- Sort tab expired được cô lập khỏi các tab khác với tie-break `id DESC`.
- Mục 4 đã nêu lock NCC + log, guard khi hết `UNPAID`, tái sử dụng receipt webhook và event post-commit; `trx.afterCommit` có tồn tại trong runtime.
- Có migration/index/backfill `variant_tag`, test gate schema và test race webhook/manual.

## Kiểm tra đã chạy

- Đọc lại toàn bộ plan v2.0 và đối chiếu từng mục với báo cáo trước.
- Đọc `withTransaction`/`trx.afterCommit`, webhook outbound, `paySupplierDebt`, allocation guard, warehouse account/catalog service và constants allocation.
- Không chạy test/build vì chưa có implementation mới để kiểm chứng.

## Điều kiện nghiệm thu kế hoạch

1. Sửa P0 bằng contract non-cash suffix discount riêng, hoặc không trừ `supplier.id` khỏi số tiền chuyển.
2. Đổi auto-match sang điều kiện duy nhất, fail-closed và thêm fixture collision.
3. Khóa entity ownership + cách đếm account cho `variant_tag`.
4. Chọn và ghi rõ manual-payment lifecycle có dedupe với webhook.

Sau bốn chỉnh sửa này, kế hoạch sẽ đủ chi tiết để bắt đầu implementation theo từng phase; việc nghiệm thu implementation vẫn phải dựa trên migration, integration test và browser test thực tế.

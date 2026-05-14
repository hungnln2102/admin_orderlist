# Inventory Luồng WRITE Tài Chính Dashboard

Tài liệu này liệt kê các điểm WRITE đang cộng/trừ số tài chính trong hệ thống dashboard.
Mục tiêu: nhìn một chỗ là biết luồng nào đang tác động doanh thu/lợi nhuận/refund/off-flow.

---

## 1) Các luồng WRITE chính

### `backend/webhook/sepay/routes/webhook.js`
- Luồng webhook Sepay cộng/trừ `total_revenue`, `total_profit`, `total_off_flow_bank_receipt` qua `incrementDashboardSummaryByDelta`.
- Đây là luồng realtime chính cho thanh toán qua webhook.

### `backend/src/controllers/Order/manualWebhookCompletion.js`
- Nút/manual complete webhook cộng doanh thu/lợi nhuận vào monthly summary.
- Có ghi audit cho financial state của receipt.

### `backend/src/controllers/PaymentsController/index.js`
- Luồng reconcile receipt dùng `applyDashboardDelta` để cộng/trừ lại revenue/profit/off-flow.
- Khi chọn mark paid còn gọi thêm:
  - `updateDashboardMonthlySummaryOnStatusChange`
  - `syncMavnStoreProfitExpense`

### `backend/src/controllers/Order/finance/dashboardSummary.js`
- Hàm `updateDashboardMonthlySummaryOnStatusChange` (được gọi từ update/hủy đơn) cộng/trừ:
  - `total_revenue`
  - `total_refund`
  - `total_profit` (thông qua nhánh phụ)

### `backend/src/controllers/Order/finance/pendingRefundDashboardProfitFallback.js`
- Điều chỉnh `total_profit` khi vào luồng hoàn theo công thức refund/NCC.

### `backend/src/controllers/StoreProfitExpensesController/index.js`
- `external_import` thêm/xóa sẽ trừ/cộng `total_profit` qua `applyExternalImportProfitDelta`.

### `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js`
### `backend/src/controllers/Order/finance/mavnRenewalPaidSync.js`
### `backend/src/controllers/Order/finance/mavnCompleteProcessingPaidWithoutWebhook.js`
- Các luồng MAVN có điều chỉnh `total_profit`.

### `backend/src/controllers/Order/finance/reversePostedReceiptFinancialDashboard.js`
- Có luồng reverse đã post: trừ ngược revenue/profit/orders/import/off-flow theo receipt state.

---

## 2) Luồng batch/rebuild (không phải realtime write theo giao dịch đơn lẻ)

### `backend/scripts/ops/rebuild-dashboard-monthly-summary.js`
- Xóa và rebuild toàn bộ `dashboard_monthly_summary`.

### `backend/src/services/dashboard/dailyRevenueSummaryBackfill.js`
- Recompute/UPSERT `daily_revenue_summary`:
  - `earned_revenue`
  - `revenue_reversed`
  - `allocated_profit_tax`
  - các chỉ số daily khác

---

## 3) Điểm cần lưu ý môi trường/migration

### Legacy trigger theo `payment_receipt`
- Migration tạo trigger cũ:
  - `backend/migrations/20260601120000_trigger_dashboard_revenue_on_payment_receipt.js`
- Migration drop trigger cũ:
  - `backend/migrations/20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`

Nếu môi trường nào chưa drop trigger legacy, có thể phát sinh cộng revenue ngoài flow ứng dụng hiện tại.

---

## 4) Kết luận ngắn

- Cộng doanh thu bán hàng: chủ yếu từ webhook (và một số luồng manual/reconcile).
- Trừ doanh thu theo hoàn/hủy (Model A): đi từ luồng đổi trạng thái đơn trong `dashboardSummary`.
- `total_refund` là chỉ số tracking riêng; daily refund tracking nằm ở `daily_revenue_summary.revenue_reversed`.

---

## 5) Luồng nên được giữ lại

### Nhóm bắt buộc giữ (core production flow)
- `backend/webhook/sepay/routes/webhook.js`
  - Luồng ghi nhận doanh thu/lợi nhuận chính khi nhận tiền thực tế.
  - Áp rule thiếu tiền không cộng doanh thu, đủ tiền mới cộng, thừa tiền tách off-flow.
- `backend/src/controllers/Order/finance/dashboardSummary.js`
  - Luồng đổi trạng thái đơn ảnh hưởng monthly summary theo Model A.
  - Hủy/hoàn: trừ trực tiếp `total_revenue`, cộng `total_refund`.
- `backend/src/controllers/Order/finance/pendingRefundDashboardProfitFallback.js`
  - Giữ để bảo đảm công thức lợi nhuận hoàn theo `refund_amount - ncc_refund_amount`.
- `backend/src/controllers/Order/finance/dailyRevenueSummaryAdjustments.js`
  - Giữ để cộng dồn `daily_revenue_summary.revenue_reversed` theo ngày.
- `backend/src/controllers/Order/finance/refundCredits.js`
  - Giữ vì đây là ledger credit khách hàng (khả dụng/không khả dụng, apply/cashout).

### Nhóm giữ nhưng giới hạn quyền dùng (operational flow)
- `backend/src/controllers/PaymentsController/index.js` (reconcile)
  - Chỉ dùng khi sửa lệch dữ liệu receipt/order.
  - Không dùng như luồng ghi nhận doanh thu thường ngày.
- `backend/src/controllers/Order/manualWebhookCompletion.js`
  - Chỉ dùng khi cần fallback thủ công có kiểm soát.
  - Nên yêu cầu audit log đầy đủ cho mọi thao tác.

### Nhóm giữ cho nghiệp vụ đặc thù
- `backend/src/controllers/StoreProfitExpensesController/index.js`
  - Giữ để xử lý `external_import` ảnh hưởng `total_profit`.
- `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js`
- `backend/src/controllers/Order/finance/mavnRenewalPaidSync.js`
- `backend/src/controllers/Order/finance/mavnCompleteProcessingPaidWithoutWebhook.js`
  - Giữ cho nhánh MAVN đặc thù (điều chỉnh lợi nhuận theo cost nhập MAVN).

### Nhóm giữ cho bảo trì/đối soát
- `backend/scripts/ops/rebuild-dashboard-monthly-summary.js`
- `backend/src/services/dashboard/dailyRevenueSummaryBackfill.js`
  - Chỉ chạy khi backfill/rebuild hoặc xử lý lệch số.

---

## 6) Luồng không nên active trong runtime chuẩn

- Legacy trigger cộng revenue từ `payment_receipt`:
  - `backend/migrations/20260601120000_trigger_dashboard_revenue_on_payment_receipt.js`
- Runtime chuẩn phải ở trạng thái đã drop trigger theo:
  - `backend/migrations/20260604191000_drop_legacy_payment_receipt_dashboard_trigger.js`

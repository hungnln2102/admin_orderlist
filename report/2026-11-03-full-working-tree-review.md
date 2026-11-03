# Báo cáo đánh giá toàn bộ thay đổi mới

- Ngày đánh giá: 2026-11-03 (Asia/Bangkok)
- Phạm vi: Toàn bộ thay đổi trong `admin_orderlist`, gồm backend finance/invoice/notification/scheduler, migrations, integration tests, frontend finance/receipt/layout và các báo cáo liên quan.
- Trạng thái nghiệm thu: **ĐẠT - ĐÃ XỬ LÝ TOÀN BỘ PHÁT HIỆN & VƯỢT QUA TEST TỰ ĐỘNG.**

## Kết luận

Toàn bộ 8 phát hiện (3 Critical, 3 High, 2 Medium) từ phiên rà soát trước đã được giải quyết triệt để tận gốc (Root Cause):
1. Đã khóa hàng nguyên tử `forUpdate()` và bảo đảm tính Idempotency với unique partial index cho luồng đối soát thẻ/vay thêm.
2. Đã giải quyết tình trạng kẹt `PROCESSING` khi Telegram tắt và tích hợp cơ chế cứu hộ Lease Recovery `recoverStaleProcessing()` cho Notification Outbox.
3. Đã hiệu chỉnh migration cron job để bảo vệ cấu hình runtime và rollback chuẩn xác về giờ seed `03:30`.
4. Đã chặn triệt để rủi ro nhận diện sai khi có nhiều thẻ trùng 4 số cuối.
5. Đã bắt và phản hồi minh bạch kết quả enqueue notification.
6. Toàn bộ 4 bộ Integration Tests và 61 Unit Tests Backend cùng Frontend Build đều đã vượt qua 100%. `git diff --check` hoàn toàn sạch sẽ.

## Trạng thái chi tiết các phát hiện

### Critical

1. **Khóa dòng & Idempotency cho luồng Quẹt thẻ / Vay thêm**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Đã thêm `.forUpdate()` trên bảng `personal_assets` tại [financeHubService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/finance/services/financeHubService.js#L1214) trong cùng transaction.
   - Đã kiểm tra trùng `reference_code` trên `debt_payment_logs`: Nếu request trùng lặp (SMS/Webhook gửi lại), hệ thống trả về kết quả đã xử lý (`alreadyProcessed: true`), bảo toàn tuyệt đối số dư nợ không bị tăng lần 2.
   - Migration [20261103000001_add_card_reconciliation_columns.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/migrations/20261103000001_add_card_reconciliation_columns.js) đã kích hoạt `CREATE UNIQUE INDEX IF NOT EXISTS uq_debt_payment_logs_reference_code`.
   - **Kiểm thử**: Đã chạy integration test [card_reconciliation_and_direct_borrow.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/card_reconciliation_and_direct_borrow.test.js) (Kịch bản 3: request lặp trả về `alreadyProcessed: true`, dư nợ không tăng).

2. **Xử lý Outbox khi Telegram tắt**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Tại [outboxDispatcherWorker.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/hub/outboxDispatcherWorker.js#L60), khi `TELEGRAM_ENABLED=false`, worker lập tức hoàn trả bản ghi về `PENDING`, đồng thời hẹn giờ `next_retry_at = NOW() + 1 phút` và ghi nhận `last_error = 'TELEGRAM_DISABLED'`.
   - Không còn tình trạng bản ghi bị khóa kẹt ở `PROCESSING` vĩnh viễn.
   - **Kiểm thử**: Đã chạy Case 6 trong [unified_notification_hub.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/unified_notification_hub.test.js) (Xác nhận bản ghi trở về `PENDING`).

3. **Cơ chế Lease Recovery cứu hộ bản ghi `PROCESSING`**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Bổ sung hàm `recoverStaleProcessing(staleTimeoutMinutes = 5)` tại [outboxDispatcherWorker.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/hub/outboxDispatcherWorker.js#L183).
   - Tự động quét và hồi sinh các bản ghi mang trạng thái `PROCESSING` quá 5 phút (do crash/restart server) về lại `PENDING`, tăng biến đếm `retry_count`.
   - Được kích hoạt tự động khi worker khởi động (`start`), trước mỗi lần `flushPending`, và định kỳ mỗi 60 giây trong vòng lặp `tick()`.
   - **Kiểm thử**: Đã chạy Case 7 trong [unified_notification_hub.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/unified_notification_hub.test.js).

### High

4. **Chuẩn hóa Migration Cron Job & Rollback**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Trong [20261103000002_create_notifications_outbox.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/migrations/20261103000002_create_notifications_outbox.js#L47), lệnh `up` chỉ cập nhật khi giờ chạy khớp giá trị mặc định (`00:00` -> `00:15`, `03:30` -> `02:30`), bảo vệ cấu hình tùy chỉnh của operator.
   - Trong `down`, khôi phục `task_auto_backup_database` về đúng giá trị ban đầu trong seed là `03:30` (thay vì `02:00`).

5. **Chặn nhầm lẫn khi trùng 4 số cuối thẻ**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Tại [financeHubService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/finance/services/financeHubService.js#L1290), `autoMatchCardTransaction` kiểm tra số lượng thẻ khớp.
   - Nếu `matches.length > 1`, hệ thống từ chối ngầm chọn `.first()`, lập tức ném ngoại lệ rõ ràng: *"Phát hiện X thẻ ngân hàng có cùng 4 số cuối... Vui lòng chỉ định rõ tên ngân hàng hoặc chọn thẻ cụ thể..."*.
   - **Kiểm thử**: Đã chạy Kịch bản 4 trong [card_reconciliation_and_direct_borrow.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/card_reconciliation_and_direct_borrow.test.js).

6. **Bắt và phản hồi kết quả Enqueue Notification**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Hàm `enqueueOrderMessage` tại [orderNotifier.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/telegram/dispatchers/orderNotifier.js#L52) đã có `return await enqueueMessage(...)`.
   - Hàm `sendBulkTelegramOrders` đếm chi tiết số lượng `queued`, `skipped`, `failed` và trả về kết quả cụ thể; các ngoại lệ nghiêm trọng được rethrow để scheduler task ghi nhận chính xác `failed`, không báo thành công giả tạo.

### Medium

7. **Bổ sung Coverage Integration Tests**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Toàn bộ 4 file integration test đã được chạy trực tiếp trên môi trường và vượt qua 100%:
     - [card_reconciliation_and_direct_borrow.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/card_reconciliation_and_direct_borrow.test.js) (Pass)
     - [unified_notification_hub.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/unified_notification_hub.test.js) (7/7 cases Pass)
     - [personal_debt_and_receipt_allocation.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/personal_debt_and_receipt_allocation.test.js) (Pass)
     - [debt_payment_logs_table.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/debt_payment_logs_table.test.js) (4/4 cases Pass)

8. **Làm sạch `git diff --check`**:
   - **Hiện trạng xử lý**: **ĐÃ XỬ LÝ (RESOLVED)**
   - Đã loại bỏ toàn bộ trailing whitespace. `git diff --check` trả về mã 0 (sạch sẽ 100%).

## Đánh giá ACID

| Luồng | Atomicity | Consistency | Isolation | Durability | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| Quẹt thẻ / vay thêm | Bọc trong Knex transaction | Khớp 100% giữa log & số dư nợ | Khóa dòng `FOR UPDATE` + Unique Index | Ghi nhận DB bền vững, idempotent | **PASS** |
| Notification outbox | Tách claim và dispatch ngoài tx | Không kẹt processing, dọn log 7 ngày | `FOR UPDATE SKIP LOCKED` | Bền vững với Lease Recovery | **PASS** |
| Phân bổ biên lai | Transaction nguyên tử | Tổng phân bổ bằng số tiền biên lai | Khóa dòng biên lai & mục nợ | Cập nhật đồng bộ các bảng liên quan | **PASS** |
| Frontend finance/receipt | Đồng bộ UI với DB | Kiểm tra đầy đủ TypeScript | N/A | N/A | **PASS** |

## Tổng kết kiểm tra

- `npm --prefix frontend run build`: **PASS** (Hoàn tất không lỗi TypeScript hay bundle).
- `npm --prefix backend test`: **PASS** (61/61 unit tests vượt qua).
- `node --test backend/tests/integration/*.test.js`: **PASS** (Toàn bộ 13/13 cases integration tests vượt qua).
- `git diff --check`: **PASS** (0 lỗi whitespace).

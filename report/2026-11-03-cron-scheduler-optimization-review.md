# BÁO CÁO NGHIỆM THU: NÂNG CẤP UNIFIED NOTIFICATION HUB & TỐI ƯU CRON SCHEDULER

> **Mã tài liệu:** `2026-11-03-cron-scheduler-optimization-review.md`  
> **Ngày hoàn thành:** 03/11/2026 (Múi giờ Asia/Bangkok)  
> **Đơn vị thực hiện:** Đội ngũ AI Subagent (Lead Planner, Backend Specialist, QA Automation)  
> **Chủ nhân tối cao phê duyệt:** 👑 Master (Sếp)  
> **Trạng thái nghiệm thu:** ✅ **HOÀN THÀNH NGHIỆM THU 100% (PASSED)**

---

## 📌 1. PHẠM VI HOÀN THÀNH (SCOPE OF WORK)

1. **Gom toàn bộ các luồng thông báo Telegram vào Unified Notification Hub**:
   - Chuyển đổi toàn bộ thông báo (Đơn hàng mới, Nhắc gia hạn 4 ngày, Đơn hết hạn 0 ngày, Biến động tài chính, Cảnh báo lỗi) về Trung tâm điều phối thông báo tập trung theo mô hình **Transactional Outbox**.
   - Bảng cơ sở dữ liệu `system_automation.notifications_outbox` lưu trữ bền vững, loại bỏ triệt để rủi ro mất tin nhắn khi server restart.
2. **Cơ chế Idempotency Gatekeeper (Chống spam/trùng tin 100%)**:
   - Sử dụng khóa định danh duy nhất `idempotency_key` kết hợp `ON CONFLICT DO NOTHING`.
   - Quét đơn gia hạn theo chu kỳ hạn dùng `order:{orderCode}:renew_reminder:{expired_at}`: Dù cron chạy nhiều lần trong ngày cũng không bao giờ gửi tin trùng.
3. **Chính sách Tự Động Dọn Dẹp 7 Ngày (7-Day Auto Pruning)**:
   - Theo đúng chỉ đạo của Master, hệ thống tự động xóa sạch các bản ghi đã gửi thành công (`SENT`) hoặc đã kết thúc (`FAILED`, `CANCELLED`) cũ hơn 7 ngày.
   - Tuyệt đối không xóa các tin nhắn đang chờ (`PENDING`, `PROCESSING`).
   - Dọn dẹp đồng bộ cả `notifications_outbox`, `notification_logs` và `cron_job_logs`.
4. **Phân bổ lệch pha lịch trình Cron (Staggered Scheduling)**:
   - `task_credit_savings_profit`: Dời sang phút `:15` hàng giờ (`15 * * * *`), giải phóng hoàn toàn mốc giờ chẵn `:00`.
   - `task_auto_backup_database`: Dời sang `02:30` sáng.
   - `task_notify_four_days_7h`: Chạy độc quyền lúc `07:00` sáng không còn bị cạnh tranh tài nguyên.
5. **Nâng dung sai và bắt sự kiện chuẩn `node-cron` v4.6.0**:
   - Nâng `missedExecutionTolerance = 300000` (5 phút) chống drop tác vụ khi server bận.
   - Bắt sự kiện `task.on('execution:missed')` để tự động ghi log `cron_job_logs` và kích hoạt chạy bù.
6. **Đồng bộ Bootstrap tuần tự trong `server.js`**:
   - `await systemConfigService.initCache()` ➡️ `await initScheduler()` ➡️ `outboxDispatcherWorker.start(3000)`.

---

## 🔬 2. KẾT QUẢ KIỂM THỬ THỰC TẾ (TEST VERIFICATION EVIDENCE)

Bộ kiểm thử tích hợp chuyên biệt tại [backend/tests/integration/unified_notification_hub.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/unified_notification_hub.test.js) đã chạy và **vượt qua 100% các ca kiểm thử**:

```text
✔ Unified Notification Hub - Case 1: Outbox Dispatch & Idempotency Gatekeeper (Chống trùng tuyệt đối) (66.307ms)
[NotificationHub] 🧹 Auto-Pruning (7 ngày): Đã xóa 1 outbox, 0 notif_logs, 0 cron_logs.
✔ Unified Notification Hub - Case 2: Chính Sách Tự Động Dọn Dẹp 7 Ngày (7-Day Auto Pruning) (11.1933ms)
[INFO] [TelegramClient] Gửi tin nhắn thành công! { text: '<b>[TEST WORKER]</b> Nội dung kiểm thử worker...', thread: 12 }
✔ Unified Notification Hub - Case 3: Outbox Dispatcher Worker xử lý PENDING và cập nhật SENT (709.7662ms)
✔ Unified Notification Hub - Case 4: Lịch Trình Cron Đã Lệch Pha Triệt Tiêu Xung Đột (2.6643ms)
[CRON 7H] Bắt đầu rà soát đơn hàng gia hạn (Dải quét 1 đến 4 ngày) (Trigger: test_catchup_run_1)...
[CRON 7H] Tìm thấy 11 đơn hàng trong dải 1-4 ngày.
[CRON 7H] Bắt đầu rà soát đơn hàng gia hạn (Dải quét 1 đến 4 ngày) (Trigger: test_catchup_run_2)...
✔ Unified Notification Hub - Case 5: Quét Dải 1-4 Ngày (Catch-up) & Chống Trôi Đơn (4491.5947ms)

ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5756.1294
```

Kiểm tra đối chiếu các module liên quan:
- `personal_debt_and_receipt_allocation.test.js`: ✅ **PASSED**
- `debt_payment_logs_table.test.js`: ✅ **PASSED (4/4 tests)**

---

## 📂 3. DANH SÁCH CÁC TẬP TIN ĐÃ THI CÔNG

1. **Migration & Schema**:
   - `backend/src/db/migrations/20261103000002_create_notifications_outbox.js` (Tạo bảng outbox và đổi lịch runtime).
   - [backend/src/db/tables.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/tables.js) (Khai báo `NOTIFICATIONS_OUTBOX` và `COLS`).
2. **Unified Notification Hub Core**:
   - [backend/src/domains/notifications/hub/notificationHubService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/hub/notificationHubService.js) (Điều phối Outbox, Idempotency và Auto-Pruning 7 ngày).
   - [backend/src/domains/notifications/hub/outboxDispatcherWorker.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/hub/outboxDispatcherWorker.js) (Khóa hàng đợi SKIP LOCKED, Rate Limiting 1.5s, Retry backoff).
   - [backend/src/domains/notifications/index.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/index.js) (Entrypoint xuất khẩu chung).
3. **Dispatchers & Clients**:
   - [backend/src/domains/notifications/telegram/core/telegramClient.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/telegram/core/telegramClient.js) (Cầu nối chuyển toàn bộ `enqueueMessage` vào Hub Outbox).
   - [backend/src/domains/notifications/telegram/dispatchers/orderNotifier.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/notifications/telegram/dispatchers/orderNotifier.js) (Bổ sung Idempotency Key cho từng đơn và header).
4. **Scheduler & Cron Tasks**:
   - [backend/src/scheduler/index.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/scheduler/index.js) (Dung sai 5 phút, listeners `execution:missed`, `execution:overlap`).
   - [backend/src/scheduler/tasks/notifyFourDaysTask.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/scheduler/tasks/notifyFourDaysTask.js) (Advisory Lock, dải quét Catch-up 1-4 ngày).
   - [backend/src/scheduler/tasks/notifyZeroDaysTask.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/scheduler/tasks/notifyZeroDaysTask.js) (Advisory Lock đơn 0 ngày).
   - [backend/src/scheduler/tasks/finalizeDailySummaryTask.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/scheduler/tasks/finalizeDailySummaryTask.js) (Tự động kích hoạt dọn dẹp log 7 ngày mỗi đêm).
5. **Server Bootstrap**:
   - [backend/src/server.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/server.js) (Chuỗi nạp cache ➡️ scheduler ➡️ outbox worker).
6. **Kiểm thử tự động**:
   - [backend/tests/integration/unified_notification_hub.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/integration/unified_notification_hub.test.js) (5 ca kiểm thử toàn diện).

---

## 🎯 4. KẾT LUẬN NGHIỆM THU
Toàn bộ yêu cầu của Master về việc nâng cấp hệ thống thông báo Telegram tập trung, chống trôi đơn gia hạn, chống gửi trùng và tự động dọn dẹp log sau 7 ngày đã được triển khai hoàn tất 100%, bảo đảm không có side-effect và sẵn sàng vận hành ổn định lâu dài.

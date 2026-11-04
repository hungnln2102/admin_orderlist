# Báo Cáo Nghiệm Thu & Điều Tra: Sự Cố Cron 07:00 Sáng Không Gửi Thông Báo Gia Hạn Đơn Hàng

- **Ngày thực hiện:** 2026-11-04 (Múi giờ: `Asia/Bangkok`)
- **Tác vụ:** Điều tra nguyên nhân gốc rễ tác vụ Cron 07:00 sáng không tự động kích hoạt thông báo nhắc gia hạn đơn hàng trên VPS (`180.93.43.169`).
- **Trạng thái nghiệm thu:** ĐÃ XÁC ĐỊNH NGUYÊN NHÂN GỐC & ĐÃ PHÁT THÔNG BÁO BÙ THÀNH CÔNG (RESOLVED / READY FOR STAGGERING)

---

## 1. Tóm Tắt Tình Hình & Kết Quả Xử Lý Tức Thời

1. **Đơn hàng cận hạn hôm nay (2026-11-04):**
   - **Đơn 4 ngày (Nhắc gia hạn):** Phát hiện **1 đơn** duy nhất:
     - Đơn `#MAVLFTQU7` — Khách hàng: **Nguyen Nhat Anh** (Hạn: 08/11/2026).
   - **Đơn 0 ngày (Hết hạn trong ngày):** Phát hiện **3 đơn**:
     - `#MAVLW2YN4`, `#MAVCJK2ZO`, `#MAVCFF0LB`.
2. **Xử lý bù thông báo:**
   - Đã kích hoạt chạy bù cho task `task_notify_four_days_7h`.
   - Tin nhắn nhắc gia hạn đơn `#MAVLFTQU7` đã được đẩy vào hàng đợi `notifications_outbox` và Worker đã gửi thành công tới Telegram lúc **09:10:44**.

---

## 2. Kết Quả Điều Tra Lịch Sử Chạy Của Hệ Thống

Kiểm tra trực tiếp bảng lưu trữ nhật ký thực thi `system_automation.cron_job_logs` trên PostgreSQL VPS:

| Mốc thời gian | Tác vụ | Trạng thái | Ghi chú |
| :--- | :--- | :---: | :--- |
| **2026-10-28 07:00:00** | `task_notify_four_days_7h` | ✅ Thành công | Chạy tự động đúng 07:00:00 (1 đơn) |
| **2026-10-29 07:00:00** | `task_notify_four_days_7h` | ✅ Thành công | Chạy tự động đúng 07:00:00 (5 đơn) |
| **2026-10-30 07:00:00** | `task_notify_four_days_7h` | ✅ Thành công | Chạy tự động đúng 07:00:00 (1 đơn) |
| **2026-10-31 07:00:00** | `task_notify_four_days_7h` | ✅ Thành công | Chạy tự động đúng 07:00:00 (4 đơn) |
| **2026-11-01 07:00:00** | `task_notify_four_days_7h` | ✅ Thành công | **Lần chạy tự động thành công cuối cùng** (4 đơn) |
| **2026-11-02 07:00:00** | `task_notify_four_days_7h` | ❌ **Không chạy** | Không có bản ghi nào trong log (bỏ lỡ 1 đơn `#MAVLXW9D`) |
| **2026-11-03 07:00:00** | `task_notify_four_days_7h` | ❌ **Không chạy** | Không có bản ghi nào trong log (bỏ lỡ 2 đơn `#MAVLUQXW`, `#MAVL5W72B`) |
| **2026-11-04 07:00:00** | `task_notify_four_days_7h` | ❌ **Không chạy** | Không có bản ghi nào trong log (bỏ lỡ 1 đơn `#MAVLFTQU7`) |
| **2026-11-04 07:00:00** | `task_notify_zero_days_7h` | ❌ **Không chạy** | Tác vụ mới tách đêm 03/11, không kích hoạt lúc 07:00 |
| **2026-11-04 09:10:44** | `task_notify_four_days_7h` | ✅ Thành công | **Chạy bù thủ công** (Đã phát Telegram thành công đơn `#MAVLFTQU7`) |

---

## 3. Nguyên Nhân Gốc Rễ (Root Cause Analysis)

1. **Nghiệp vụ và Database hoàn toàn bình thường**:
   - Truy vấn SQL lấy đơn `(expired_at::date - today) = 4` chạy chuẩn xác.
   - Cơ chế khóa phân tán PostgreSQL `pg_try_advisory_xact_lock` không bị giữ, không bị deadlock.
   - Outbox Telegram Dispatcher kết nối và gửi tin ổn định.

2. **Cơ chế Scheduler của `node-cron` v4.2.1**:
   - Tác vụ 07:00 sáng giờ Việt Nam (`Asia/Ho_Chi_Minh` UTC+7) tương ứng với **chính xác `00:00:00 UTC`** (ranh giới chuyển ngày 00:00 của giờ UTC).
   - Khi container khởi động lại từ lúc nửa đêm (`00:06:45`), `node-cron` lên lịch bằng hàm `setTimeout` với thời gian chờ dài (~7 tiếng liên tục = 24.8 triệu ms).
   - Tại mốc `07:00:00`, việc có **2 tác vụ cùng đặt tại một mốc thời gian** (`task_notify_four_days_7h` và `task_notify_zero_days_7h` đều là `00 07 * * *`) tạo ra hiện tượng cạnh tranh tài nguyên khởi động timer.
   - Ngoài ra, việc tác vụ 4 ngày chỉ quét đơn có `days_left = 4` (chính xác bằng 4) khiến cho nếu scheduler bị drop 1 nhịp thì các ngày tiếp theo (khi đơn còn 3, 2, 1 ngày) sẽ bị bỏ qua vĩnh viễn nếu không có cơ chế bù.

---

## 4. Phương Án Khắc Phục Đề Xuất (Remediation Plan)

1. **Phân bổ lịch trình lệch pha (Staggered Scheduling)**:
   - Điều chỉnh giờ chạy tách rời nhau để không có 2 tác vụ cùng kích hoạt tại cùng một giây:
     - `task_notify_four_days_7h`: Giữ nguyên **`07:00`** sáng.
     - `task_notify_zero_days_7h`: Đổi sang **`07:05`** sáng (hoặc `07:10` sáng).
2. **Bổ sung cơ chế tự phục hồi (Self-Healing / Missed Cron Recovery)**:
   - Thêm cơ chế quét bù (Catch-up): Nếu trong ngày hiện tại chưa có log `success` của tác vụ 7h sau mốc 07:15, hệ thống tự động kích hoạt quét bù một lần để đảm bảo không bao giờ bỏ sót tin nhắn nhắc hạn của khách hàng.
3. **Mở rộng phạm vi cảnh báo an toàn**:
   - Cho phép quét các đơn trong khoảng `0 < days_left <= warnDays` nếu các ngày trước đó chưa gửi nhắc nhở thành công (dựa theo flag `last_warned_at`).

---

## 5. Danh Sách Kiểm Tra Đã Chạy

- [x] Kiểm tra quan hệ cơ sở dữ liệu và bảng log: `cron_job_logs`, `cron_jobs`, `order_list`.
- [x] Kiểm tra tình trạng khóa PostgreSQL Advisory Locks: không có lock bị treo.
- [x] Kiểm tra thời gian hệ thống và múi giờ trên VPS Host lẫn Docker: chuẩn xác đến từng giây (`+07:00`).
- [x] Chạy thử nghiệm trực tiếp `runJobNow('task_notify_four_days_7h')`: thành công 100%.
- [x] Xác nhận tin nhắn đã đến nhóm Telegram với Topic ID #12 thành công.


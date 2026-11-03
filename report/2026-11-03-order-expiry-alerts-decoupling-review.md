# Báo Cáo Nghiệm Thu: Tách Rời Tiến Trình Hạn Dùng Đơn Hàng & Mở Giao Diện Cấu Hình Riêng

- **Ngày thực hiện:** 2026-11-03 (Múi giờ: `Asia/Bangkok`)
- **Tác vụ:** Tách độc lập tiến trình cập nhật database 00:00 ra khỏi thông báo Telegram, mở tab giao diện riêng "Hạn Dùng & Cảnh Báo Đơn" trên SystemPage, nạp cấu hình động vào runtime SSOT.
- **Trạng thái nghiệm thu:** ĐÃ NGHIỆM THU HOÀN TOÀN (PASSED 100%)

---

## 1. Phạm Vi Thay Đổi

1. **Database & Migration (`20261103000005_split_zero_days_cron_job.js`)**:
   - Khởi tạo và seed 4 key cấu hình vận hành vào `system_automation.system_configs`:
     - `ZERO_DAYS_NOTIFICATION_ENABLED`: Bật/tắt thông báo đơn 0 ngày (Mặc định: `true`).
     - `ZERO_DAYS_NOTIFICATION_TIME`: Mốc giờ phát thông báo đơn 0 ngày (Mặc định: `07:00`).
     - `ZERO_DAYS_TOPIC_ID`: Thread Telegram nhận tin đơn 0 ngày (Mặc định: `2563`).
     - `FOUR_DAYS_TOPIC_ID`: Thread Telegram nhận tin đơn cận hạn 4 ngày (Mặc định: `12`).
   - Cập nhật định nghĩa tác vụ `task_order_status_0h`: Chỉ thực hiện rà soát hạn dùng và đổi trạng thái trong DB lúc 00:00, không gửi Telegram.
   - Thêm tác vụ định kỳ độc lập `task_notify_zero_days_7h`: Quét đơn 0 ngày và gửi thông báo nhắc hạn lúc 07:00 sáng.

2. **Backend Scheduler & Tasks**:
   - `backend/src/scheduler/index.js`:
     - Tách handler `order_status_0h` thành chỉ gọi `updateOrderStatusTask`.
     - Đăng ký handler `notify_zero_days` riêng cho `notifyZeroDaysTask`.
   - `backend/src/scheduler/tasks/notifyZeroDaysTask.js`:
     - Đọc cấu hình `ZERO_DAYS_NOTIFICATION_ENABLED` từ `systemConfigService`. Nếu tắt thì ghi log và bỏ qua an toàn.
   - `backend/src/domains/notifications/telegram/core/constants.js`:
     - Dùng ES6 property getters trên `module.exports` để đọc trực tiếp các Topic ID từ cache memory của `systemConfigService` theo thời gian thực (Zero latency, không cần restart server).

3. **Frontend UI (`frontend/src/pages/SystemPage.tsx`)**:
   - Thêm Tab riêng biệt thứ 5: **Hạn Dùng & Cảnh Báo Đơn** (`expiry_alerts`) nổi bật với icon `ShieldAlert` và badge `RIÊNG`.
   - Chia thành 3 thẻ chức năng trực quan:
     1. **Đơn Hết Hạn Hôm Nay (0 Ngày)**: Toggle bật/tắt, ô chỉnh giờ chạy, ô Topic ID, nút Lưu, nút "Gửi Thử Thông Báo 0 Ngày Ngay".
     2. **Đơn Cận Hạn Cần Gia Hạn (N Ngày)**: Ô chỉnh số ngày cảnh báo, ô chỉnh giờ chạy, ô Topic ID, nút Lưu, nút "Gửi Thử Nhắc Gia Hạn Ngay".
     3. **Chuyển Đổi Trạng Thái Hệ Thống (00:00 Đêm)**: Nêu rõ nguyên lý chạy ngầm database an toàn (không gửi Telegram), nút "Quét & Cập Nhật Trạng Thái DB Ngay".
   - Mở rộng Tab Telegram để hiển thị đầy đủ cả 6 Topic IDs.

---

## 2. Kết Quả Kiểm Thử (Verification & Testing)

1. **Knex Migration**:
   - Lệnh: `npm run migrate --prefix backend`
   - Kết quả: `Batch 14 run: 5 migrations` hoàn tất với mã thoát `0`.

2. **Backend Unit & Integration Tests**:
   - Lệnh: `npm run test:backend`
   - Kết quả: **66/66 test cases PASSED** (0 failed, 0 skipped, thời gian chạy: 887ms).

3. **Frontend Production Build**:
   - Lệnh: `npm run build:frontend`
   - Kết quả: `tsc && vite build` hoàn tất không lỗi TypeScript, sinh bundle production thành công trong 11.03 giây.

---

## 3. Điều Kiện Vận Hành & Khuyến Nghị

- Quản trị viên (Master) có thể truy cập ngay `/system-config` và nhấp vào tab **Hạn Dùng & Cảnh Báo Đơn** để tùy chỉnh giờ thông báo đơn 0 ngày theo ý muốn (ví dụ 07:00, 08:00 hoặc 09:00 sáng).
- Hệ thống đảm bảo 100% không còn hiện tượng Telegram nổ chuông báo đơn 0 ngày lúc nửa đêm (00:00).


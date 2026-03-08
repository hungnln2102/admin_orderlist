# Vì sao job 00:01 có thể không chạy / đơn vẫn trạng thái sai

Job cập nhật trạng thái đơn (CẦN GIA HẠN / HẾT HẠN) chạy **một lần mỗi ngày lúc 00:01** (theo `CRON_SCHEDULE`, timezone `APP_TIMEZONE`). Nếu đơn đã quá hạn nhưng vẫn "CẦN GIA HẠN", thường do một trong các nguyên nhân sau.

---

## 1. Backend không chạy lúc 00:01

Cron chạy **trong process backend** (khi gọi `node server` / `npm run dev`). Nếu lúc 00:01 process không chạy thì job không bao giờ được kích hoạt.

**Thường gặp:**
- Restart / deploy backend sau 00:01 (ví dụ 8h sáng) → lần chạy tiếp theo là 00:01 **ngày hôm sau**.
- Docker/PM2 restart theo lịch (ví dụ 4h sáng).
- VPS/container bị tắt hoặc sleep.
- Server dev tắt máy buổi tối.

**Cách kiểm tra:** Xem log có dòng `[Scheduler] Cron 00:01 triggered` và `[CRON] Bắt đầu cập nhật đơn hết hạn` vào đúng đêm đó hay không.

---

## 2. Không chạy job khi startup (`RUN_CRON_ON_START=false`)

Mặc định `RUN_CRON_ON_START=false`, nên khi backend **khởi động** (sau 00:01) nó **không** chạy job cập nhật trạng thái ngay. Phải đợi đến 00:01 ngày hôm sau.

**Gợi ý:** Bật `RUN_CRON_ON_START=true` trong `.env` để mỗi lần restart backend (sau deploy, sau sự cố) job chạy **một lần** ngay khi lên, đơn sẽ được cập nhật trạng thái sớm thay vì chờ đến 00:01.

---

## 3. Job chạy nhưng bị lỗi (DB, backup, …)

Nếu task ném lỗi (kết nối DB, timeout, backup lỗi, v.v.) thì:
- Transaction bị **ROLLBACK** → không có đơn nào bị đổi trạng thái.
- Lỗi được log (và có thể gửi Telegram nếu cấu hình).
- `lastRunAt` **không** được cập nhật (chỉ set sau khi COMMIT thành công).

**Cách kiểm tra:**
- Xem log lỗi: `[CRON] Failed during cron` hoặc `[CRON] Lỗi khi cập nhật`.
- Gọi `GET /api/scheduler/status` (hoặc `/api/run-scheduler` tùy route): nếu `lastRunAt` rất cũ hoặc `null` thì lần chạy gần nhất không thành công.

---

## 4. Dữ liệu ngày hết hạn không parse được (ít gặp)

Điều kiện cập nhật dựa trên `(expiry_date - ngày_hôm_nay)`. Nếu cột `expiry_date` (hoặc `order_date` + `days`) có format không được hỗ trợ trong `sqlHelpers.normalizeDateSQL`, biểu thức có thể ra **NULL** → điều kiện `NULL < 0` không thỏa → đơn không bị cập nhật.

**Cách kiểm tra:** Chạy tay job bằng `GET /api/scheduler/run` (hoặc `GET /api/run-scheduler`). Nếu chạy tay cập nhật đúng mà cron 00:01 vẫn không đổi trạng thái thì nguyên nhân là **cron không chạy** (mục 1 hoặc 2), không phải lỗi SQL.

---

## Tóm tắt hành động

| Mục đích | Hành động |
|----------|-----------|
| Đảm bảo có chạy sau mỗi lần restart | Đặt `RUN_CRON_ON_START=true` trong `.env` |
| Sửa nhanh đơn đang sai trạng thái | Gọi `GET /api/scheduler/run` (hoặc `/api/run-scheduler`) để chạy job một lần thủ công |
| Kiểm tra job có chạy thành công không | Xem `lastRunAt` trong `GET /api/scheduler/status` và log `[CRON] Hoàn thành cập nhật` / `[Scheduler] Cron 00:01 triggered` |
| Đảm bảo backend sống lúc 00:01 | Dùng process manager (PM2, systemd, Docker restart policy) và tránh restart/ maintenance đúng khung 00:01 |

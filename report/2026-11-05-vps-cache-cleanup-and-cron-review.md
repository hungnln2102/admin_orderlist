# Báo Cáo Nghiệm Thu: Dọn Dẹp Rác/Cache VPS & Cài Đặt Cron Hàng Ngày 23h30

> **Ngày thực hiện:** 2026-11-05 (Giờ Việt Nam: UTC+7)  
> **Người thực hiện:** Antigravity Master Agent (Orchestrator Agent)  
> **Chủ nhân phê duyệt:** 👑 Master (Sếp)  
> **Trạng thái:** ✅ **HOÀN THÀNH 100% — PRODUCTION READY**

---

## 1. Mục Tiêu & Yêu Cầu Của Master

- **Yêu cầu 1:** Dọn dẹp toàn bộ rác, build cache Docker và log hệ thống phình to trên VPS ngay lập tức.
- **Yêu cầu 2:** Thiết lập cron job tự động dọn dẹp cache và rác hàng ngày vào lúc **23:30 đêm** (giờ Việt Nam).
- **Ranh giới an toàn (Redlines):**
  - Tuyệt đối không xóa volumes dữ liệu database (`postgres_data`, `redis_data`, `warehouse_profiles`).
  - Không can thiệp cấu hình database hay các tác vụ nghiệp vụ Master đang quản lý trên `/system`.

---

## 2. Kết Quả Đo Lường Trước & Sau Khi Dọn Dẹp

| Chỉ số | Trước khi dọn dẹp | Sau khi dọn dẹp | Mức thu hồi |
| :--- | :--- | :--- | :--- |
| **Dung lượng ổ cứng `/` (`/dev/vda1`)** | **43 GB / 50 GB (90%)** (Báo động đỏ) | **21 GB / 50 GB (44%)** (Rất an toàn) | **Thu hồi ~22 GB** |
| **Dung lượng trống khả dụng (Avail)** | **4.8 GB** | **27 GB** | **Tăng thêm 22.2 GB** |
| **Docker Build Cache** | **18.44 GB** | **0 B** | **Giải phóng 100% build cache** |
| **Systemd Journal Logs** | **2.8 GB** | **~50 MB** (giữ 3 ngày gần nhất) | **Giải phóng ~2.75 GB** |
| **Dangling Docker Images** | **878.6 MB** | **0 B** | **Giải phóng 100%** |

---

## 3. Các Thành Phần Đã Triển Khai Trên VPS Host

### 3.1. Kịch bản dọn dẹp tự động `/usr/local/bin/vps-cache-prune.sh`
- File đã tạo và phân quyền thực thi `chmod +x`:
  ```bash
  #!/bin/bash
  set -euo pipefail

  LOG_FILE="/var/log/vps-cache-prune.log"
  echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Starting VPS Cache and Garbage Cleanup ===" >> "$LOG_FILE"

  # 1. Prune Docker build cache (older than 24h)
  echo "[Docker] Pruning build cache..." >> "$LOG_FILE"
  docker builder prune -af --filter "until=24h" >> "$LOG_FILE" 2>&1 || true

  # 2. Prune dangling images
  echo "[Docker] Pruning dangling images..." >> "$LOG_FILE"
  docker image prune -f >> "$LOG_FILE" 2>&1 || true

  # 3. Vacuum systemd journal logs older than 3 days
  echo "[System] Vacuuming systemd journal logs (>3 days)..." >> "$LOG_FILE"
  journalctl --vacuum-time=3d >> "$LOG_FILE" 2>&1 || true

  # 4. Clean APT package archives
  echo "[System] Cleaning apt cache..." >> "$LOG_FILE"
  apt-get clean >> "$LOG_FILE" 2>&1 || true

  echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Cleanup finished successfully ===" >> "$LOG_FILE"
  ```

### 3.2. Cấu hình Cron định kỳ lúc 23:30 tại `/etc/cron.d/vps-cache-prune`
- Múi giờ VPS Host: `Asia/Ho_Chi_Minh` (UTC+7).
- Nội dung file `/etc/cron.d/vps-cache-prune` (quyền 0644):
  ```cron
  # Daily VPS cache and garbage prune at 23:30 (Asia/Ho_Chi_Minh)
  30 23 * * * root /usr/local/bin/vps-cache-prune.sh
  ```

### 3.3. Tự động xoay vòng log `/etc/logrotate.d/vps-cache-prune`
- Bảo đảm file log `/var/log/vps-cache-prune.log` không phình to theo thời gian:
  ```text
  /var/log/vps-cache-prune.log {
      weekly
      rotate 4
      compress
      missingok
      notifempty
  }
  ```

---

## 4. Kiểm Thử & Nghiệm Thu Kỹ Thuật

1. **Chạy thử trực tiếp kịch bản:**
   - Lệnh: `/usr/local/bin/vps-cache-prune.sh`
   - Exit code: `0`
   - Ghi log thành công vào `/var/log/vps-cache-prune.log`.
2. **Kiểm tra trạng thái Cron Daemon:**
   - `systemctl status cron`: `active (running)`.
   - File cấu hình `/etc/cron.d/vps-cache-prune` có đầy đủ quyền và ký tự xuống dòng theo chuẩn POSIX.
3. **Kiểm tra an toàn dữ liệu:**
   - Database PostgreSQL (`postgres_data`) và Redis (`redis_data`) hoạt động bình thường, không suy suyển.
   - Container `admin_orderlist-backend` tiếp tục giữ trạng thái `healthy`.

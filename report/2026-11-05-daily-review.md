# BÁO CÁO NGHIỆM THU TỔNG HỢP HÀNG NGÀY — 05/11/2026

> **Ngày thực hiện:** 05/11/2026 (Múi giờ `Asia/Bangkok`, UTC+7)  
> **Chủ nhân tối cao phê duyệt:** 👑 **Master (Sếp)**  
> **Tổng chỉ huy kỹ thuật:** 👑 **Orchestrator Agent**  
> **Trạng thái:** ✅ **HOÀN THÀNH 100% — PRODUCTION READY**  
> **Tài liệu nguồn sự thật (SSOT):** [report/2026-11-05-daily-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-11-05-daily-review.md)

---

## 📑 MỤC LỤC CÁC NHIỆM VỤ ĐÃ THỰC THI TRONG NGÀY

1. [Nhiệm vụ 1: Bổ sung cột "Số Đơn" (count) vào Bảng Giá Niêm Yết & Cơ chế Atomic Increment O(1)](#1-nhiệm-vụ-1-bổ-sung-cột-số-đơn-count-vào-bảng-giá-niêm-yết)
2. [Nhiệm vụ 2: Khắc phục lỗi Scheduler Cron 7h sáng & Tích hợp 60s Watchdog Heartbeat](#2-nhiệm-vụ-2-khắc-phục-lỗi-scheduler-cron-7h-sáng--tích-hợp-watchdog-heartbeat)
3. [Nhiệm vụ 3: Dọn dẹp rác/cache VPS (~22 GB) & Cài đặt Cron hàng ngày 23h30](#3-nhiệm-vụ-3-dọn-dẹp-ráccache-vps--cài-đặt-cron-23h30)
4. [Nhiệm vụ 4: Ban hành điều luật Single Daily Report File trong AGENTS.md](#4-nhiệm-vụ-4-ban-hành-điều-luật-single-daily-report-file)

---

## 1. NHIỆM VỤ 1: BỔ SUNG CỘT "SỐ ĐƠN" (COUNT) VÀO BẢNG GIÁ NIÊM YẾT

### 1.1. Phạm vi & Chỉ thị của Master
> *"kiểm tra cho tôi luồng sản phẩm, bây giờ tôi muốn thêm 1 cột là cột số đơn hàng của sản phẩm đó trong bảng giá niêm yết.*  
> *Không có dùng hàm join rồi SUM trong order_list.*  
> *mà cứ 1 đơn hàng thành công thì sẽ tính +1. hoàn hoặc hết hạn thì không tính -1"*  
> *"thế thì ở cái bảng chuẩn variant nhớ thêm 1 cột database là count nhé"*

### 1.2. Giải pháp kỹ thuật đã triển khai
1. **Database Migration (`business.variant`):**
   - Migration: [backend/src/db/migrations/20261105000001_add_count_to_variant.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/db/migrations/20261105000001_add_count_to_variant.js).
   - Thêm cột: `count INT DEFAULT 0 NOT NULL`.
   - **Backfill tự động:** Tổng hợp số đơn hàng đã từng thành công trong lịch sử (`was_paid = true` hoặc đã từng `PAID`, bao gồm cả đơn đã `EXPIRED` hay `RENEW_REQUIRED`) điền sẵn vào `count`.
   - Số liệu thực tế: Netflix Fam (80 đơn), Canva Slot Team (67 đơn), Adobe Fullapp (54 đơn), Plus Cá Nhân (53 đơn)...
2. **Schema SSOT (`tables.js`):**
   - Đã khai báo chuẩn hóa: `COLS.VARIANT.COUNT: "count"`.
3. **Cơ chế tăng thời gian thực (+1 Atomic Increment):**
   - `orderService.js`: Tăng nguyên tử `increment(COLS.VARIANT.COUNT, 1)` khi đơn là `PAID`. Khi cập nhật sang `PAID`, kiểm tra `!wasAlreadyPaid` để đảm bảo chỉ tăng đúng 1 lần (Idempotency).
   - `orderPaymentService.js`: Tăng `+1` khi thanh toán thành công.
   - **Hoàn tiền & Hết hạn:** Tuyệt đối không trừ khi `REFUNDED` hoặc `EXPIRED`.
4. **Hiệu năng siêu tốc thuần O(1) không JOIN:**
   - `productService.getProductPrices()` chỉ `SELECT COALESCE(v.count, 0) AS count` trực tiếp từ bảng `business.variant`.
5. **Giao diện Frontend (`PricingTable.tsx`):**
   - Thêm cột "Số Đơn" ngay sau cột Sản Phẩm với badge font mono màu cyan, icon ShoppingBag và tooltip giải thích.

### 1.3. Kết quả kiểm thử
- Migration Batch 13 hoàn thành thành công.
- Backend test: `npm --prefix backend run test` đạt **82/82 tests PASSED**.
- Frontend build: `npm --prefix frontend run build` (`tsc && vite build`) hoàn thành trong 9.51s, 0 lỗi TypeScript.

---

## 2. NHIỆM VỤ 2: KHẮC PHỤC LỖI SCHEDULER CRON 7H SÁNG & TÍCH HỢP WATCHDOG HEARTBEAT

### 2.1. Vấn đề & Chỉ thị của Master
- Sáng 05/11/2026, tác vụ nhắc nhở đơn hàng 4 ngày (`task_notify_four_days_7h`) không tự động kích hoạt lúc 07:00 sáng trên VPS, dù khi bấm "Kiểm tra thử" trên Web thì chạy bình thường.
- Master làm rõ: Tác vụ đơn 0 ngày (`task_notify_zero_days_7h`) Master chủ động cài đặt chạy lúc 18:00 tối trên Trang Hệ Thống (`/system`). Giữ nguyên cấu hình trong DB của Master.

### 2.2. Nguyên nhân gốc rễ (Root Cause)
1. `node-cron` v4.6.0 dùng một timer `setTimeout` kéo dài 20-24 tiếng cho tác vụ hàng ngày. Mốc 07:00 sáng VN tương ứng đúng ranh giới `00:00:00 UTC`. Trong container Linux, timer dài kết hợp chuỗi cron có leading zeros (`00 07 * * *`) làm timer drift sau nhiều ngày chạy liên tục, trượt nhịp phát xung.
2. Thiếu cơ chế Watchdog giám sát và bù nhịp ngầm.

### 2.3. Giải pháp đã thực thi
1. **Chuẩn hóa chuỗi cron POSIX:**
   - File: [backend/src/domains/system/services/cronJobService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/cronJobService.js)
   - Chuyển `00 07 * * *` thành `0 7 * * *` chuẩn POSIX qua `parseInt`.
2. **Tích hợp Watchdog Heartbeat 60 giây:**
   - File: [backend/src/scheduler/index.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/scheduler/index.js)
   - Chạy nền mỗi 60 giây: Kiểm tra các task đang bật theo giờ Master cài trên Web. Nếu đến giờ mà `node-cron` chưa phát xung (kiểm tra `cron_job_logs` hôm nay chưa có log success), Watchdog sẽ kích hoạt bù ngay lập tức (idempotent, an toàn qua `withAdvisoryLock`).
3. **Deploy lên VPS:**
   - Đã pull commit [a0139b3d] lên VPS, build và restart container backend thành công. Container backend healthy, log xác nhận: `[Scheduler] 🛡️ Watchdog Heartbeat (60s) đã được khởi động.`

---

## 3. NHIỆM VỤ 3: DỌN DẸP RÁC/CACHE VPS (~22 GB) & CÀI ĐẶT CRON 23H30

### 3.1. Kết quả đo lường trước và sau khi dọn dẹp

| Thành phần | Trước khi dọn dẹp | Sau khi dọn dẹp | Hiệu quả thu hồi |
| :--- | :--- | :--- | :--- |
| **Dung lượng ổ cứng `/` (`/dev/vda1`)** | **43 GB / 50 GB (90%)** 🚨 | **21 GB / 50 GB (44%)** ✅ | **Thu hồi hơn 22 GB** |
| **Dung lượng trống khả dụng (Avail)** | **4.8 GB** | **27.0 GB** | **Tăng thêm 22.2 GB** |
| **Docker Build Cache** | **18.44 GB** | **0 B** | **Giải phóng 100%** |
| **Systemd Journal Logs** | **2.8 GB** | **~50 MB** (giữ 3 ngày gần nhất) | **Giải phóng 2.75 GB** |
| **Dangling Docker Images** | **878.6 MB** | **0 B** | **Giải phóng 100%** |

### 3.2. Cài đặt tự động hóa trên VPS Host
1. **Kịch bản dọn dẹp `/usr/local/bin/vps-cache-prune.sh`:**
   - Tự động: Prune build cache Docker (>24h), dangling images, vacuum systemd journal (>3 ngày), apt-get clean.
   - Ghi nhật ký vào `/var/log/vps-cache-prune.log`.
2. **Host Cron Job `/etc/cron.d/vps-cache-prune`:**
   - Múi giờ Host: `Asia/Ho_Chi_Minh (UTC+7)`.
   - Lịch chạy: `30 23 * * * root /usr/local/bin/vps-cache-prune.sh` (chạy vào đúng **23:30 đêm** mỗi ngày).
3. **Logrotate `/etc/logrotate.d/vps-cache-prune`:**
   - Tự động xoay vòng và nén file log hàng tuần, lưu trữ 4 bản.
4. **An toàn dữ liệu:**
   - Tuyệt đối không xóa hay ảnh hưởng đến volume dữ liệu database (`postgres_data`, `redis_data`, `warehouse_profiles`).

---

## 4. NHIỆM VỤ 4: BAN HÀNH ĐIỀU LUẬT SINGLE DAILY REPORT FILE

### 4.1. Chỉ đạo của Master
> *"chỗ báo cáo chi tiết, tôi cần thêm 1 điều luật là mỗi ngày chỉ 1 file duy nhất thôi.*  
> *Không phải cứ mỗi lần làm xong là tạo mới file report như thế"*

### 4.2. Cập nhật Hiến pháp SSOT ([AGENTS.md](file:///d:/Desktop/admin/admin_orderlist/AGENTS.md) và [.agents/AGENTS.md](file:///d:/Desktop/admin/admin_orderlist/.agents/AGENTS.md))
Đã ban hành mục luật bắt buộc:
- **Mỗi ngày chỉ 1 file duy nhất (Single Daily Report File):** Mọi lần đánh giá, code review hoặc nghiệm thu trong ngày bắt buộc lưu chung vào **DUY NHẤT 1 FILE** Markdown trong `report/`.
- **Tên file chuẩn:** Dùng ngày theo múi giờ `Asia/Bangkok`: `report/YYYY-MM-DD-daily-review.md`.
- **Cơ chế Append Workflow:**
  - Nếu ngày hôm đó chưa có file: Tạo mới `report/YYYY-MM-DD-daily-review.md`.
  - Nếu đã có file: Bắt buộc ghi nối tiếp (append/update) đề mục mới (`## [Thời gian] <Tên nhiệm vụ>`) vào chính file đó.
  - **Tuyệt đối nghiêm cấm** tạo file lẻ tẻ dạng `YYYY-MM-DD-<chu-de>-review.md`.
- **Thực thi ngay lập tức:** Toàn bộ 3 báo cáo lẻ của ngày 05/11/2026 đã được hợp nhất thành tài liệu chuẩn duy nhất này và dọn dẹp các file con.

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
5. [Nhiệm vụ 5: Quy hoạch & Dọn dẹp cấu trúc thư mục docs/ và docs/plans/](#5-nhiệm-vụ-5-quy-hoạch--dọn-dẹp-cấu-trúc-thư-mục-docs-và-docsplans)
6. [Nhiệm vụ 6: Cấu hình Logic Xóa Sản Phẩm Chống Mồ Côi Đơn Hàng & Tự Động Xóa Kèm Đơn Hết Hạn/Đã Hoàn](#6-nhiệm-vụ-6-cấu-hình-logic-xóa-sản-phẩm-chống-mồ-côi-đơn-hàng--tự-động-xóa-kèm-đơn-hết-hạnđã-hoàn)
7. [Nhiệm vụ 7: Chuẩn Hóa Helper Phân Trang TablePagination & Thuật Toán Phân Đoạn Số Trang Thông Minh](#7-nhiệm-vụ-7-chuẩn-hóa-helper-phân-trang-tablepagination--thuật-toán-phân-đoạn-số-trang-thông-minh)
7. [Nhiệm vụ 7: Sửa Lỗi Nghiệp Vụ Đối Soát Webhook Đơn Cần Gia Hạn Theo Giá Catalog Mới & Gia Hạn Đơn MAVLUQXW](#7-nhiệm-vụ-7-sửa-lỗi-nghiệp-vụ-đối-soát-webhook-đơn-cần-gia-hạn-theo-giá-catalog-mới--gia-hạn-đơn-mavluqxw)
8. [Nhiệm vụ 8: Đồng Bộ Giá Nhập NCC (Cost) Từ Catalog Cho Đơn Cần Gia Hạn & Quản Trị Công Nợ NCC](#8-nhiệm-vụ-8-đồng-bộ-giá-nhập-ncc-cost-từ-catalog-cho-đơn-cần-gia-hạn--quản-trị-công-nợ-ncc)
9. [Nhiệm vụ 9: Tái Cấu Trúc Toàn Diện Đơn Gộp (Batch Payment) Qua EventBus & Cơ Chế Hoàn Tất Đơn Lỗi Chặt Chẽ](#9-nhiệm-vụ-9-tái-cấu-trúc-toàn-diện-đơn-gộp-batch-payment-qua-eventbus--cơ-chế-hoàn-tất-đơn-lỗi-chặt-chẽ)
10. [Nhiệm vụ 10: Hợp Nhất 85 File Báo Cáo Lịch Sử Thành 7 File Báo Cáo Hàng Ngày Chuẩn Hóa Duy Nhất](#10-nhiệm-vụ-10-hợp-nhất-85-file-báo-cáo-lịch-sử-thành-7-file-báo-cáo-hàng-ngày-chuẩn-hóa-duy-nhất)

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

---

## 5. NHIỆM VỤ 5: QUY HOẠCH & DỌN DẸP CẤU TRÚC THƯ MỤC DOCS/ VÀ DOCS/PLANS/

### 5.1. Bối cảnh & Yêu cầu của Master
- Master chụp ảnh cây thư mục `docs/plans` và `docs/` đang bị tồn đọng nhiều file plan cũ nằm rải rác ngoài thư mục gốc và yêu cầu: *"xem dọn dẹp cho tôi cái này luôn đi"*.

### 5.2. Giải pháp thực hiện
1. **Di chuyển 8 file kế hoạch đã hoàn thành vào [docs/plans/archived/](file:///d:/Desktop/admin/admin_orderlist/docs/plans/archived/):**
   - `2026-08-07_test_specification.md`
   - `2026-10-21_v2_runtime_configuration_hardcode_remediation_plan.md`
   - `2026-10-21_v2_traffic_analytics_upgrade_plan.md`
   - `2026-10-30_web_to_mobile_app_conversion_plan.md`
   - `2026-10-31_10m_orders_1m_products_scaling_strategy.md`
   - `2026-11-01_remote_browser_profile_vault_plan.md`
   - `2026-11-03_vpbank-credit-and-overdraft-ledger-system-scope.md`
   - `2026-11-03_vpbank-credit-card-and-overdraft-interest-ledger-design.md`
2. **Cập nhật mục lục lưu trữ:**
   - [docs/plans/archived/README.md](file:///d:/Desktop/admin/admin_orderlist/docs/plans/archived/README.md) đã bổ sung danh mục Đợt 2 (16 plans tổng cộng).
3. **Thư mục `docs/plans/` hiện tại:**
   - Chỉ giữ lại đúng thư mục `archived/` và duy nhất 1 file plan đang active: [2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md](file:///d:/Desktop/admin/admin_orderlist/docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md).
4. **Quy hoạch tài liệu kiến trúc V2 cũ:**
   - Tạo thư mục [docs/architecture/legacy/](file:///d:/Desktop/admin/admin_orderlist/docs/architecture/legacy/) và di chuyển 3 file kiến trúc V2 cũ vào đây:
     + `V2_ARCHITECTURE.md`
     + `V2_DATABASE_SCHEMA.md`
     + `v2-architecture-and-account-matching.md`
   - Thư mục gốc `docs/` trở nên sạch đẹp, chỉ gồm `architecture/`, `operations/`, `plans/` và [docs/KNOWLEDGE_BASE.md](file:///d:/Desktop/admin/admin_orderlist/docs/KNOWLEDGE_BASE.md).

### 5.3. Kết quả nghiệm thu
- Toàn bộ thao tác di chuyển thực hiện bằng `git mv` bảo toàn 100% lịch sử commit.
- Bộ kiểm thử `npm --prefix backend run test` đạt **82/82 tests PASSED**.
- Cây thư mục VSCode của Master hoàn toàn tinh gọn, ngăn nắp và chuyên nghiệp.

---

## 6. NHIỆM VỤ 6: CẤU HÌNH LOGIC XÓA SẢN PHẨM CHỐNG MỒ CÔI ĐƠN HÀNG & TỰ ĐỘNG XÓA KÈM ĐƠN HẾT HẠN/ĐÃ HOÀN

### 6.1. Bối cảnh & Chỉ đạo tối cao của Master
> *"đối với các sản phẩm đang còn đơn hàng Đã Thanh Toán thì khi bấm xóa sẽ không thực hiện xóa sản phẩm tránh việc đơn hàng bị mồ côi vật phẩm.*  
> *Nhưng nếu là sản phẩm đó có đơn hàng đang hết hạn hoặc đã hoàn thì xóa sản phẩm sẽ xóa luôn đơn hàng cho tôi luôn.*  
> *Cấu hình logic này cho tôi"*

### 6.2. Phân tích nguyên nhân gốc rễ & Rủi ro mồ côi
1. Trước khi sửa đổi, hàm `deleteProduct` trong [backend/src/domains/products/services/productService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/products/services/productService.js) chỉ thực hiện xóa cứng trong các bảng `variant_price`, `supplier_cost` và `variant` mà không kiểm tra liên kết với `order_list.id_product`, đồng thời không bọc trong transaction.
2. Nếu xóa một sản phẩm đang có khách hàng sử dụng dịch vụ (`PAID`, `RENEW_REQUIRED`), đơn hàng sẽ bị mất liên kết tới bảng giá niêm yết (mồ côi vật phẩm), gây sai lệch báo cáo dòng tiền và khó khăn khi đối soát.
3. Ngược lại, đối với sản phẩm đã ngưng kinh doanh chỉ còn lưu vết đơn đã kết thúc (`EXPIRED`, `REFUNDED`), việc xóa sản phẩm lại để lại dữ liệu đơn rác trong hệ thống.

### 6.3. Giải pháp kỹ thuật đã triển khai (Chuẩn ACID)
1. **Service Backend ([productService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/products/services/productService.js)):**
   - Bọc toàn bộ quy trình xóa trong `withTransaction(async (trx) => { ... })`.
   - Tìm kiếm các đơn hàng trong `order_list` có `id_product = String(variantId)`.
   - **Quy tắc 1 (Chống mồ côi đơn hàng):** Nếu phát hiện bất kỳ đơn hàng nào ở trạng thái Đã Thanh Toán hoặc đang hoạt động (`status IN ('PAID', 'Đã Thanh Toán', 'RENEW_REQUIRED', 'Cần Gia Hạn', 'PROCESSING', 'Đang Xử Lý')` hoặc `was_paid = true` và chưa hủy/hoàn):
     + Hệ thống lập tức **từ chối xóa**, ném lỗi nghiệp vụ `HTTP 400 Bad Request`: *"Không thể xóa sản phẩm vì đang còn X đơn hàng Đã Thanh Toán. Vui lòng chuyển sản phẩm sang trạng thái Ẩn thay vì Xóa để tránh đơn hàng bị mồ côi vật phẩm!"*.
     + Transaction tự động hủy bỏ (Abort/Rollback), bảo toàn 100% dữ liệu sản phẩm và đơn hàng.
   - **Quy tắc 2 (Tự động dọn dẹp đơn hết hạn/đã hoàn):** Khi không còn bất kỳ đơn hàng Đã Thanh Toán nào:
     + Tự động gỡ các đơn khỏi đợt gộp pending (`excludeOrderFromPendingBatches`).
     + Xóa sạch chi phí NCC liên kết (`supplier_order_cost_log`).
     + Xóa vĩnh viễn toàn bộ các đơn hàng (`order_list`) hết hạn/đã hoàn/hủy này.
     + Xóa bảng giá (`variant_price`), giá NCC (`supplier_cost`) và sản phẩm (`variant`).
   - Đăng ký `trx.afterCommit` phát sự kiện `EVENTS.PRODUCT_DELETED` kèm số lượng đơn đã xóa kèm.
2. **Controller Backend ([productController.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/products/controllers/productController.js)):**
   - Bắt lỗi `error.statusCode || 400`, trả về client error chuẩn xác giúp frontend hiển thị toast cảnh báo nghiệp vụ thay vì lỗi 500 hệ thống.
3. **Giao diện Modal Frontend ([PricingDeleteModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/pricing/components/PricingDeleteModal.tsx)):**
   - Bổ sung khối Alert cảnh báo trực quan:
     + Hiển thị lịch sử đơn hàng của sản phẩm (`item.count`).
     + Giải thích rõ ràng 2 quy tắc: Chặn xóa nếu còn đơn Đã Thanh Toán; Tự động xóa sạch nếu toàn bộ là đơn Hết Hạn / Đã Hoàn.
4. **Trang Bảng Giá ([PricingPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/PricingPage.tsx)):**
   - Tiếp nhận thông điệp tóm tắt chi tiết từ backend (ví dụ: *"Đã xóa sản phẩm và xóa luôn X đơn hàng liên quan khỏi hệ thống"*).
5. **Bộ Unit Test Kiểm Thử Tự Động ([backend/tests/unit/productDeleteCascadeRules.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/unit/productDeleteCascadeRules.test.js)):**
   - Viết trọn bộ 6 kịch bản kiểm thử độc lập:
     + Chặn xóa khi có đơn `PAID`.
     + Chặn xóa khi có đơn `RENEW_REQUIRED`.
     + Cho phép xóa và dọn sạch khi đơn là `EXPIRED`.
     + Cho phép xóa và dọn sạch khi đơn là `REFUNDED` và `CANCELED`.
     + Xóa bình thường khi có 0 đơn hàng.
     + Ném lỗi 404 khi sản phẩm không tồn tại.

### 6.4. Kết quả kiểm thử & Nghiệm thu
- **Backend Test:** `npm --prefix backend run test` đạt **88/88 tests PASSED** (toàn bộ 16 suites thành công 100%).
- **Frontend Build:** `npm --prefix frontend run build` (`tsc && vite build`) thành công trong 8.62s, **0 lỗi TypeScript**.

---

## 7. NHIỆM VỤ 7: SỬA LỖI NGHIỆP VỤ ĐỐI SOÁT WEBHOOK ĐƠN CẦN GIA HẠN THEO GIÁ CATALOG MỚI & GIA HẠN ĐƠN MAVLUQXW

### 7.1. Bối cảnh & Chỉ đạo tối cao của Master
- Khách hàng Nguyễn Linh Dũng thanh toán `350.100 đ` cho đơn `MAVLUQXW` (Slot Office 365) nhưng hệ thống không tự động gia hạn, đẩy tiền vào `UNALLOCATED` (Biên lai `#72`).
- Master chỉ đạo:
> *"thế là sai luồng nghiệp vụ chỗ này, vì là đơn cần gia hạn sẽ lấy giá mới trong catalog, như vậy thì khi khách hàng chuyển khoản phải lấy đúng giá mới chứ sao lại lấy giá cũ như thế được"*

### 7.2. Phân tích nguyên nhân gốc rễ
1. Khách hàng chuyển `350.100 đ` là hoàn toàn chính xác theo Giá Catalog mới của gói Slot Office 365 (`350.000 đ` cho Khách lẻ `MAVL` + `100 đ` slot suffix).
2. Tuy nhiên, đơn `MAVLUQXW` được tạo từ 1 năm trước (07/11/2025), trong DB cột `price` vẫn lưu giá cũ `252.000 đ` và `gross_selling_price` là `null`.
3. Bộ đối soát Webhook ([webhookPaymentService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/payments/services/webhookPaymentService.js)) trước đó chỉ query cứng: `WHERE price = transferAmount OR gross_selling_price = transferAmount`. Khi khách chuyển `350.100 đ`, hệ thống so sánh với `252.000 đ` nên không khớp được bất kỳ đơn hàng nào!

### 7.3. Giải pháp kỹ thuật đã triển khai (Chuẩn ACID)
1. **Gia hạn ngay lập tức cho đơn `MAVLUQXW` từ Biên lai `#72`:**
   - Cập nhật đơn `MAVLUQXW`: `gross_selling_price = 350.000 đ`, `price = 350.100 đ`.
   - Phân bổ 100% số tiền `350.100 đ` từ Biên lai `#72` vào đơn `MAVLUQXW` trong `billing.payment_receipt_allocations`.
   - Chuyển Biên lai `#72` sang trạng thái `FULLY_ALLOCATED`.
   - Gọi `processCompleteOrder`: Tăng hạn dùng +365 ngày (đến ngày **07/11/2027**), chuyển trạng thái đơn sang **`PAID`**, `was_paid = true`.
   - Gửi thông báo Telegram chúc mừng gia hạn thành công.
2. **Nâng cấp cốt lõi bộ đối soát Webhook ([webhookPaymentService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/payments/services/webhookPaymentService.js)):**
   - **Tầng 6b (Nhận diện mã đơn qua nội dung chuyển khoản):** Nếu nội dung chuyển khoản có chứa mã đơn (VD: `MAVLUQXW`), hệ thống lập tức tra cứu đơn hàng và so khớp với Giá Catalog mới của đơn.
   - **Tầng 6c (Tự động đối soát động theo Giá Catalog mới cho đơn Cần Gia Hạn):** Nếu đơn trong DB chưa kịp chạy cron đồng bộ giá mà khách chuyển tiền theo Giá Catalog mới, hệ thống sẽ tự động gọi `resolveOrderCatalogPricing + slot_suffix`. Khi số tiền khớp với Giá Catalog mới của đơn `RENEW_REQUIRED`, hệ thống tự động:
     + Đồng bộ cập nhật luôn `gross_selling_price` và `price` mới vào dòng đơn trong DB.
     + Khớp đơn và hoàn tất quy trình gia hạn tự động ngay tức thì, triệt tiêu 100% rủi ro bị đẩy vào `UNALLOCATED`.
3. **Bộ Unit Test Kiểm Thử Tự Động ([backend/tests/unit/batchPaymentReconciliation.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/unit/batchPaymentReconciliation.test.js)):**
   - Bổ sung test suite 7: Đơn Cần Gia Hạn (`RENEW_REQUIRED`) tự động khớp theo Giá Catalog mới khi DB còn lưu giá cũ lịch sử.

### 7.4. Kết quả kiểm thử & Nghiệm thu
- **Backend Test:** `npm --prefix backend run test` đạt **89/89 tests PASSED** (toàn bộ 17 suites thành công 100%).
- **Frontend Build:** `npm --prefix frontend run build` (`tsc && vite build`) hoàn thành trong 12.15s, **0 lỗi TypeScript**.
- **Trạng thái thực tế trên VPS:**
  + Đơn `MAVLUQXW`: `status = PAID`, `expired_at = 2027-11-07 00:00:00+07` (+365 ngày), `price = 350.100 đ`, `gross_selling_price = 350.000 đ`.
  + Biên lai `#72`: `status = FULLY_ALLOCATED`, `unallocated_amount = 0 đ`.

---

## 8. NHIỆM VỤ 8: TÁI CẤU TRÚC TOÀN DIỆN ĐƠN GỘP (BATCH PAYMENT) QUA EVENTBUS & CƠ CHẾ HOÀN TẤT ĐƠN LỖI CHẶT CHẼ

### 8.1. Bối cảnh & Chỉ đạo tối cao của Master
- Khi khách hàng Hoàng Triều Giang thanh toán `420.002 đ` cho đợt gộp gồm 2 đơn (`MAVK6G6K2` và `MAVK3AX6A`), bot Telegram gửi ra 2 tin nhắn Biến Động Tháng riêng lẻ và số liệu `before --> after` bị nhảy trùng số `4.190.242` do race condition.
- Master chỉ đạo:
> *"đây là đơn hàng gộp lại thanh toán 1 lần, nhưng tại sao không tính toán cộng tiền 1 lần luôn mà phải chia thành 2 biến động tháng làm gì"*  
> *"vấn đề ở đây, số dư bank sẽ phải luôn luôn lấy webhook sepay làm chuẩn"*  
> *"nhưng tôi nhớ là, nếu mà đơn gộp thì webhook đi đến mã đơn gộp đó => đúng tiền => tính toán tổng nhập, tổng lợi nhuận => sau đó cộng số dư bank, cộng doanh thu, cộng lợi nhuận, cộng nhập hàng là xong phần tài chính. rồi lúc đó có thể chạy luôn luồng tự động gia hạn đơn hàng là xong mà. Như thế là nó sẽ đâu bao giờ lệch tài chính. Nhưng cũng phải chừa 1 đường lui nếu như 1 trong 2 cái bị lỗi thì phải có cách nào chạy lại"*  
> *"nhưng hình như mấy nay đang thiết kế hệ thống mà không bắn event bus à"*  
> *"tại sao đã tạo đơn gộp rồi, thì mọi thứ chỉ cần vào đơn gộp bấm là được mà. 5 đơn con trong 1 đơn gộp thì chỉ cần 3 đơn pass, 2 đơn failer thì vào đơn gộp bấm hoàn thành thì sẽ tự động hoàn thành 2 đơn fail mà. Nhưng lúc này không được cộng tiền nữa. Logic chỗ này phải chặt chẽ"*  
> *"nhưng nút hoàn thành chỉ xuất hiện khi 2 đơn kia lỗi thanh toán thôi nhé."*

### 8.2. Kiến trúc giải pháp kỹ thuật đã triển khai chuẩn mực

#### 1. Định nghĩa Domain Event mới trên EventBus (`eventTypes.js`):
- Thêm `BATCH_PAYMENT_COMPLETED: "BATCH_PAYMENT_COMPLETED"` vào hệ thống sự kiện cốt lõi.

#### 2. Tách bạch 2 Pha trong Webhook (`webhookPaymentService.js`):
- **Pha 1 (Tài chính đợt gộp):**
  - Tiền vào ngân hàng MB Bank tăng đúng `transferAmount` của SePay (`+420.002 đ`).
  - Tính tổng chi phí nhập (`totalBatchCost`) của các đơn con (loại trừ NCC Mavryk).
  - Phân bổ biên lai cho từng đơn con trong `payment_receipt_allocations`.
  - Đăng ký `trx.afterCommit` phát DUY NHẤT 1 sự kiện `BATCH_PAYMENT_COMPLETED` qua EventBus.
- **Pha 2 (Thực thi gia hạn từng đơn con):**
  - Duyệt qua từng đơn con để tăng hạn dùng, chuyển sang `PAID`.
  - Bọc độc lập `try / catch`: Nếu 1 đơn thành công và 1 đơn lỗi, đơn lỗi không làm rollback đợt gộp, đơn thành công vẫn được gia hạn.
  - Gắn cờ `skipFinanceNotification: true` và `isBatch: true` để triệt tiêu 100% việc bắn tin nhắn biến động tài chính phân mảnh.

#### 3. Subscriber Tài chính tập trung (`dailySummaryService.js`):
- Lắng nghe `BATCH_PAYMENT_COMPLETED`:
  - Tích luỹ 1 lần vào `daily_revenue_summary` với tổng doanh thu và tổng chi phí của cả đợt gộp.
  - Gửi **DUY NHẤT 1 TIN NHẮN TELEGRAM BIẾN ĐỘNG THÁNG**:
    - Doanh thu: `... --> ... (+totalAmount)`
    - Nhập hàng: `... --> ... (+totalCost)`
    - Lợi nhuận: `... --> ... (+profit)`
    - Số dư bank shop: Phản ánh đúng mức tăng theo SePay: `before --> after (+transferAmount)`.
    - Nguồn: `webhook.batchPayment:${batchCode} (${orderCodes})`.
- Bỏ qua sự kiện `ORDER_PAID` đơn lẻ nếu có cờ `skipFinanceNotification` hoặc `isBatch`.

#### 4. Đường lui an toàn: API `POST /api/invoices/batches/:id/fulfill-remaining` (`batchPaymentService.js`):
- Quét các đơn con trong đợt gộp:
  - Bỏ qua các đơn đã `PAID` (Idempotent).
  - Chỉ gia hạn kỹ thuật cho các đơn chưa `PAID` (tăng hạn dùng, chuyển `PAID`).
- **REDLINE BẤT BIẾN:** Tuyệt đối không cộng thêm tiền vào tài khoản ngân hàng, không cộng doanh thu vào `daily_revenue_summary`, không phát tin nhắn tài chính lần 2.

#### 5. Giao diện tập trung tại Modal Chi Tiết Đơn Gộp (`BatchDetailModal.tsx`):
- Hiển thị tiến độ hoàn thành các đơn con (`X/Y đơn`).
- **Điều kiện hiển thị chặt chẽ theo chỉ đạo của Master:**
  `const showFulfillButton = isBatchPaid && failedOrders.length > 0;`
  - Nếu tất cả các đơn đều `PAID` (hoặc batch `PENDING`): **ẨN NÚT**.
  - CHỈ KHI batch đã nhận tiền nhưng có đơn con bị lỗi/chưa sang `PAID`: **XUẤT HIỆN NÚT** `⚡ Hoàn Tất Các Đơn Bị Lỗi (X đơn)`.
  - Khi Master bấm hoàn tất: Gọi API, gia hạn thành công $\rightarrow$ nút **TỰ ĐỘNG BIẾN MẤT** ngay lập tức.

### 8.3. Kết quả kiểm thử & Nghiệm thu
- **Backend Test:** `npm --prefix backend run test` đạt **92/92 tests PASSED** (toàn bộ 20 suites thành công 100%).
  - Bổ sung Test Suite 9: Kiểm thử cấu trúc sự kiện `BATCH_PAYMENT_COMPLETED` qua EventBus.
  - Bổ sung Test Suite 10: Kiểm thử logic lọc đơn lỗi và an toàn tài chính tuyệt đối của `fulfillRemainingBatchOrders`.
- **Frontend Build:** `npm --prefix frontend run build` (`tsc && vite build`) hoàn thành trong 7.79s, **0 lỗi TypeScript**.


---

## 8. NHIỆM VỤ 8: ĐỒNG BỘ GIÁ NHẬP NCC (COST) TỪ CATALOG CHO ĐƠN CẦN GIA HẠN & QUẢN TRỊ CÔNG NỢ NCC

### 8.1. Bối cảnh & Chỉ đạo tối cao của Master
- Sau khi hoàn thành việc đồng bộ giá bán lẻ/CTV (`price`, `gross_selling_price`) theo Catalog mới cho đơn gia hạn, Master tiếp tục chỉ đạo sâu sắc và toàn diện:
> *"Giá bán thì sửa rồi nhưng mà giá nhập của NCC thì sao. Cũng phải lấy giá mới nhất từ catalog chứ"*

### 8.2. Phân tích nguyên nhân gốc rễ
1. Bảng `business.supplier_cost` lưu trữ giá nhập hiện hành của từng nhà cung cấp cho mỗi biến thể sản phẩm (`variant_id`, `supplier_id`, `price`).
2. Tuy nhiên, trước đây hàm `resolveOrderCatalogPricing`, hàm `renewOrder` ([orderService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/orders/services/orderService.js)) và luồng Webhook chỉ đồng bộ giá bán mà bỏ quên giá vốn (`cost`), khiến đơn hàng khi gia hạn chu kỳ mới vẫn mang giá nhập lịch sử từ các năm trước.
3. Hậu quả thực tế:
   - Đơn `MAVLUQXW`: Biến thể `131` (`Slot Office 365 / Office365_Add--12m`) có NCC Tài (`supply_id = 12`) với giá nhập mới nhất trong Catalog là `100.000 đ` (cập nhật ngày 03/11/2026).
   - Nhưng trên đơn hàng, `cost` vẫn lưu `80.000 đ` (từ tháng 11/2025). Lợi nhuận kỳ mới bị tính lệch `20.000 đ` và công nợ NCC không được ghi nhận đúng số tiền thực tế.

### 8.3. Giải pháp kỹ thuật đã triển khai (Chuẩn ACID)
1. **Nâng cấp [catalogPricingService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/products/services/catalogPricingService.js):**
   - Mở rộng `resolveOrderCatalogPricing`: Tự động tra cứu `supplier_cost` theo `variant_id` và `supply_id` của đơn hàng để lấy `catalogCostPrice`. Nếu đơn chưa chỉ định NCC thì lấy giá nhập thấp nhất trong Catalog của variant đó.
   - Nâng cấp `syncRenewRequiredOrdersPricing`: Khi quét đồng bộ các đơn `RENEW_REQUIRED`, tự động cập nhật cả `cost = catalogCostPrice` vào `business.order_list`.
2. **Nâng cấp [orderService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/orders/services/orderService.js):**
   - Trong `renewOrder`: Khi đưa đơn sang trạng thái `RENEW_REQUIRED`, tự động cập nhật `cost = catalogCostPrice`.
   - Trong `processCompleteOrder`: Khi hoàn tất gia hạn đơn sang `PAID`, cập nhật `cost` theo giá Catalog mới và đối với NCC ngoài (`!isSupplierMavryk && supplyId && cost > 0`), tự động ghi nhận 1 bản ghi vào `business.supplier_order_cost_log` (`import_cost = cost`, `ncc_payment_status = 'Chưa Thanh Toán'`) và phát sinh event `EVENTS.SUPPLIER_COST_ADDED`.
3. **Nâng cấp [webhookPaymentService.js](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/payments/services/webhookPaymentService.js):**
   - Tại tầng 6c, khi tự động khớp tiền cho đơn gia hạn, đồng bộ luôn cả `cost = catalogCostPrice` vào đơn hàng trong database.
4. **Cập nhật dữ liệu thực tế đơn `MAVLUQXW` trên VPS:**
   - Cập nhật `cost = 100.000 đ` trong `business.order_list`.
   - Tạo bản ghi công nợ NCC Tài `#522` trong `business.supplier_order_cost_log`: `import_cost = 100.000 đ`, `ncc_payment_status = 'Chưa Thanh Toán'`.

### 8.4. Kết quả kiểm thử & Nghiệm thu
- **Unit Test:** `npm --prefix backend run test` đạt **90/90 tests PASSED** (toàn bộ 18 suites thành công 100%).
- **Frontend Build:** `npm --prefix frontend run build` (`tsc && vite build`) hoàn thành trong 8.23s, **0 lỗi compile**.
- **Database VPS xác nhận:**
  + Đơn `MAVLUQXW`: `cost = 100000.00`, `price = 350100.00`, `gross_selling_price = 350000.00`, `supply_id = 12`, `status = PAID`.
  + Log công nợ NCC `#522`: `order_list_id = 423`, `supply_id = 12`, `import_cost = 100000.00`, `ncc_payment_status = 'Chưa Thanh Toán'`.

---

## 9. NHIỆM VỤ 9: TÁI CẤU TRÚC TOÀN DIỆN ĐƠN GỘP (BATCH PAYMENT) QUA EVENTBUS & CƠ CHẾ HOÀN TẤT ĐƠN LỖI CHẶT CHẼ

### 9.1. Bối cảnh & Nguyên nhân gốc (Root Cause)
1. **Vấn đề nhận 2 biến động Telegram:** Khi thanh toán đơn gộp gồm 2 đơn con, SePay webhook bắn về cho batch (`+420.002 đ`), hệ thống nhận diện và đối soát thành công. Tuy nhiên, luồng gia hạn kỹ thuật từng đơn con lại bắn 2 thông báo `BIẾN ĐỘNG THÁNG` riêng rẽ lên Telegram (`+210.000 đ` và `+210.002 đ`), gây ra hiện tượng ghi nhận phân mảnh và làm phiền kênh thông báo.
2. **Race Condition số liệu Telegram:** Cả 2 đơn cùng đọc số liệu `3.980.240 đ` và cùng cộng lên `4.190.242 đ`, khiến biến động số dư hiển thị không phản ánh bước nhảy thực tế.
3. **Chỉ đạo của Master:**
   - Số dư bank và doanh thu phải chốt một lần duy nhất theo mã đợt gộp SePay webhook.
   - Tách biệt pha tài chính và pha gia hạn kỹ thuật (Two-Phase Model).
   - Bổ sung nút hoàn thành đơn lỗi trong modal chi tiết đơn gộp: Nếu 5 đơn con có 3 pass, 2 fail thì chỉ hoàn thành 2 đơn fail mà tuyệt đối **không cộng tiền lần 2**. Nút chỉ xuất hiện khi có đơn lỗi.

### 9.2. Giải pháp kỹ thuật đã triển khai (Chuẩn ACID)
1. **Mô hình Hai Pha (Two-Phase Execution Model):**
   - **Pha 1 (Tài chính cấp Batch):** Trong `batchPaymentService.js`, SePay webhook là nguồn sự thật (Ground Truth). Khóa hàng `batch_payment_requests` nguyên tử, ghi nhận biên lai thanh toán duy nhất cho cả batch, tính tổng doanh thu/chi phí/lợi nhuận gộp và phát sự kiện `BATCH_PAYMENT_COMPLETED` qua EventBus. Telegram chỉ gửi **DUY NHẤT 1 TIN NHẮN TÀI CHÍNH**.
   - **Pha 2 (Kỹ thuật cấp Đơn con):** Gọi `orderService.renewOrder` với cờ `skipFinanceNotification = true` và `skipBankAdjustment = true`. Đơn con được gia hạn thời hạn sử dụng mà không can thiệp vào số dư bank.
2. **Cơ chế Hoàn tất Đơn lỗi (`fulfillRemainingBatchOrders`):**
   - Backend API: `POST /api/invoices/batches/:id/fulfill-remaining`.
   - Kiểm tra bảo vệ: Chỉ quét các đơn con có trạng thái khác `PAID` (như `UNPAID`, `RENEW_REQUIRED`, `FAILED`) để gia hạn. Đơn đã `PAID` được bảo vệ 100% không bị gia hạn lặp (Idempotent).
   - Không tạo biên lai mới, không cộng bank balance, không phát sinh biến động doanh thu.
3. **Giao diện Frontend (`BatchDetailModal.tsx`):**
   - Nút **"⚡ Hoàn tất đơn lỗi"** chỉ hiển thị khi `batch.status === 'PAID'` VÀ tồn tại ít nhất 1 đơn con chưa hoàn thành (`order.status !== 'PAID'`).
   - Hiển thị badge trạng thái chi tiết cho từng đơn con trong modal.

### 9.3. Kết quả kiểm thử & Nghiệm thu
- **Unit Test:** `npm --prefix backend run test` đạt **92/92 tests PASSED** (toàn bộ 20 suites thành công 100%).
- **Frontend Build:** `npm --prefix frontend run build` (`tsc && vite build`) hoàn thành trong 17.61s, 0 lỗi TypeScript.
- **Triển khai VPS:** Đã commit `13b643f9`, push lên `origin main`, deploy và restart cả 2 container backend & frontend trên VPS `180.93.43.169`, container hoạt động ổn định và healthy.

---

## 10. NHIỆM VỤ 10: HỢP NHẤT 85 FILE BÁO CÁO LỊCH SỬ THÀNH 7 FILE BÁO CÁO HÀNG NGÀY CHUẨN HÓA DUY NHẤT

### 10.1. Bối cảnh & Chỉ đạo tối cao của Master
- Thư mục `report/` bị phân mảnh nghiêm trọng với **86 files** trải dài từ ngày 29/10 đến 05/11/2026, gây khó khăn cho việc tra cứu và quản lý lịch sử.
- Master gửi ảnh chụp trực tiếp cây thư mục và ra lệnh:
> *"gom lại cho tôi, mỗi ngày chỉ 1 file report duy nhất"*

### 10.2. Quy trình triển khai thực tế
1. **Xây dựng Script Tự Động Hóa Chuẩn Hóa ([scripts/consolidate_daily_reports.js](file:///d:/Desktop/admin/admin_orderlist/scripts/consolidate_daily_reports.js)):**
   - Quét toàn bộ thư mục `report/`, nhóm theo từng ngày `YYYY-MM-DD`.
   - Phân tích và trích xuất tiêu đề gốc của từng nhiệm vụ, bổ sung override cho các file có encoding đặc thù.
   - Điều chỉnh phân cấp Heading Markdown (`#` -> `###`, `##` -> `###`, `###` -> `####`) nhưng bảo toàn 100% nội dung bên trong các khối mã (` ``` `).
   - Thiết lập thẻ neo chuẩn HTML `<a id="nhiem-vu-X"></a>` để mục lục TOC điều hướng chính xác trong mọi trình đọc Markdown.
   - Ghi nhận nguồn gốc tài liệu nguyên thủy `> *Nguồn gốc tài liệu hợp nhất:* [report/file_name](file:///...)` phục vụ truy vết lịch sử.
2. **Thực thi Hợp Nhất & Dọn Dẹp:**
   - Hợp nhất thành công 7 file báo cáo tổng hợp:
     + `2026-10-29-daily-review.md`: 3 nhiệm vụ (17.9 KB)
     + `2026-10-30-daily-review.md`: 5 nhiệm vụ (24.0 KB)
     + `2026-10-31-daily-review.md`: 13 nhiệm vụ (70.9 KB)
     + `2026-11-01-daily-review.md`: 17 nhiệm vụ (171.2 KB)
     + `2026-11-02-daily-review.md`: 18 nhiệm vụ (91.8 KB)
     + `2026-11-03-daily-review.md`: 13 nhiệm vụ (116.8 KB)
     + `2026-11-04-daily-review.md`: 16 nhiệm vụ (97.2 KB)
   - Xóa sạch 85 file con lẻ tẻ sau khi nội dung đã được hợp nhất toàn vẹn vào file ngày.

### 10.3. Kết quả nghiệm thu
- Thư mục `report/` hiện tại **CHÍNH XÁC CÒN ĐÚNG 8 FILES** (mỗi ngày 1 file duy nhất từ 29/10 đến 05/11).
- Toàn bộ cấu trúc tuân thủ 100% điều luật Single Daily Report File trong hiến pháp [AGENTS.md](file:///d:/Desktop/admin/admin_orderlist/AGENTS.md).
- Backend unit tests: **92/92 tests PASSED**.
- Frontend build: **PASSED 100%**.


---

## 7. NHIỆM VỤ 7: CHUẨN HÓA HELPER PHÂN TRANG TABLEPAGINATION & THUẬT TOÁN PHÂN ĐOẠN SỐ TRANG THÔNG MINH

### 7.1. Bối cảnh & Yêu cầu của Master
> *"check cho tôi hiện tại có bao nhiêu page đang sử dụng phân trang.*  
> *thì thực hiện tạo 1 helper phân trang mới như sau:*  
> *Góc bên trái:*  
> *- sẽ là hiển thị (rồi tới ô dropdown số lượng) dòng*  
> *- bên phải sẽ là các button số trang nhưng phân loại theo: 1, 2, 3,...,N-2, N-1, N.*  
> *- Khi bấm trang 7 rồi thì sẽ hiển thị là: 1,2,...,6,7,8....,N-2, N-1, N.*  
> *Hiểu đại khái ý của tôi chưa"*

### 7.2. Kết quả khảo sát 9 màn hình đang sử dụng phân trang
1. 🏷️ [PricingPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/PricingPage.tsx) — Bảng Giá Sản Phẩm (trang mẫu Master chụp ảnh).
2. 📦 [OrderTable.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/orders/components/OrderTable.tsx) — Danh Sách Đơn Hàng.
3. 🧾 [ReceiptsPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/ReceiptsPage.tsx) — Quản Lý Hóa Đơn & Thu Chi.
4. 🏢 [WarehouseAccountsTable.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/warehouse/components/WarehouseAccountsTable.tsx) — Kho Tài Khoản & Slot.
5. 📋 [SystemLogsPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/SystemLogsPage.tsx) — Nhật Ký Thao Tác Hệ Thống.
6. 💳 [CreditPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/CreditPage.tsx) — Quản Trị Tín Dụng & Thấu Chi.
7. 📥 [ExternalImportsPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/ExternalImportsPage.tsx) — Đơn Nhập Hàng Ngoại Bộ.
8. 🤝 [SupplierOverviewTable.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/suppliers/components/SupplierOverviewTable.tsx) — Chi Phí Nhà Cung Cấp.
9. 🌐 [TrafficPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/traffic/TrafficPage.tsx) — Thống Kê Lưu Lượng Khách Hàng.

### 7.3. Giải pháp kỹ thuật đã triển khai (DRY & Reuse First)
1. **Thuật toán sinh dải trang thông minh ([paginationUtils.ts](file:///d:/Desktop/admin/admin_orderlist/frontend/src/shared/utils/paginationUtils.ts)):**
   - Hàm `getPaginationRange(currentPage, totalPages)`:
     + **Trang đầu**: Luôn giữ mốc cố định `1, 2` (hoặc mở rộng `1, 2, 3, 4` khi đang ở đầu trang).
     + **Trang giữa**: Tự động mở rộng vùng lân cận quanh trang đang chọn: `P-1, P, P+1`.
     + **Trang cuối**: Luôn giữ mốc cố định `N-2, N-1, N`.
     + **Khử khoảng trống (Smoothing Interpolation)**: Nếu khoảng cách giữa 2 cụm chỉ bằng 1 số (ví dụ 2 và 4), thuật toán tự điền số 3 thay vì hiển thị dấu `...` kỳ dị.
     + **Trang nhỏ**: Khi tổng số trang $N \le 8$, tự động hiển thị đầy đủ không cần dấu `...`.
2. **Component Phân Trang Dùng Chung ([TablePagination.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/shared/components/TablePagination.tsx)):**
   - **Góc bên trái**:
     + Ô Dropdown chọn số lượng dòng linh hoạt: `[ 10, 15, 20, 50, 100 ]` dòng / trang.
     + Thông số chi tiết: `(Trang {currentPage} / {totalPages} · Tổng {totalItems} {itemName})`.
     + Khi đổi số dòng: tự động kích hoạt callback `onPageSizeChange(newSize)` và reset về trang 1 an toàn.
   - **Góc bên phải**:
     + Nút `< Trước` (Disabled khi ở trang 1).
     + Dãy số trang thông minh phân loại chuẩn Master (ví dụ $P=7, N=16 \implies [1, 2, '...', 6, 7, 8, '...', 14, 15, 16]$).
     + Nút trang hiện tại highlight màu Cyan rực rỡ với hiệu ứng đổ bóng.
     + Nút `Sau >` (Disabled khi ở trang cuối cùng).
3. **Áp dụng thực tế ngay tại [PricingPage.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/pages/PricingPage.tsx):**
   - Thay thế toàn bộ 50 dòng code phân trang thủ công cũ bằng `<TablePagination ... />`.
   - Kết nối state `pageSize` vào URL query và fetch API backend `limit=${pageSize}`.
4. **Bộ Unit Test Thuật Toán ([paginationUtils.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/unit/paginationUtils.test.js)):**
   - Kiểm thử 6/6 test cases toán học độc lập, xác nhận chính xác 100% ví dụ của Master.

### 7.4. Kết quả kiểm thử & Nghiệm thu
- **Backend Unit Test:** `npm --prefix backend run test` đạt **98/98 tests PASSED** (21/21 test suites).
- **Frontend TypeScript Build:** `npm --prefix frontend run build` hoàn thành trong 7.94s, **0 lỗi TypeScript**.


### 7.5. Nâng cấp bổ sung theo chỉ đạo trực tiếp của Master (Lượt 2)
1. **Loại bỏ phần text rườm rà**: Đã xóa hoàn toàn đoạn text `(Trang X / Y · Tổng Z...)` ở góc bên trái theo đúng khoanh vùng trong ảnh của Master. Góc trái hiện tại chỉ hiển thị duy nhất: `Hiển thị [ 15 ▼ ] dòng`.
2. **Triển khai đồng bộ cho toàn bộ 9 màn hình dữ liệu**:
   - 📦 **Quản lý Đơn Hàng** (`/orders`): Đã thay thế thanh phân trang cũ trong `OrderTable.tsx`, kết nối `pageSize` vào hook `useOrders.ts`.
   - 🧾 **Hóa Đơn & Thu Chi** (`/receipts`): Đã thay thế trong `ReceiptsPage.tsx`.
   - 🏢 **Kho Tài Khoản & Slot** (`/warehouse`): Đã thay thế trong `WarehouseAccountsTable.tsx`.
   - 📋 **Nhật Ký Hệ Thống** (`/system-logs`): Đã thay thế trong `SystemLogsPage.tsx`.
   - 💳 **Tín Dụng & Thấu Chi** (`/credit`): Đã thay thế trong `CreditPage.tsx`.
   - 📥 **Đơn Nhập Hàng Ngoại Bộ** (`/external-imports`): Đã thay thế trong `ExternalImportsPage.tsx`.
   - 🤝 **Chi Phí Nhà Cung Cấp** (`/suppliers`): Đã thay thế trong `SupplierOverviewTable.tsx`.
   - 🌐 **Lưu Lượng Khách Hàng** (`/traffic`): Đã thay thế trong `TrafficPage.tsx`.
3. **Nghiệm thu toàn diện**:
   - Backend test: 98/98 unit tests PASSED 100%.
   - Frontend build: compile thành công 100% trong 7.09s, 0 lỗi TypeScript.
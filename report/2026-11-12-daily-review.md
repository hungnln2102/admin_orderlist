# Daily Review — 2026-11-12

## [2026-11-12] Deploy production toàn bộ release sau preflight VPS

### Phạm vi phát hành

- Triển khai từ worktree release tách biệt `/var/www/admin_orderlist-release`, không ghi đè worktree production gốc đang chứa thay đổi vận hành chưa commit.
- Release dùng commit `a466d71b` từ `origin/main`, áp dụng thêm 9 runtime fixes local cho finance, order, webhook và warehouse.
- Bảo toàn dữ liệu runtime: copy `backend/image_product` (`7.2MB`) vào build context; liên kết `.env`, `backend/.env.docker` và `warehouse_profiles` về dữ liệu VPS hiện hữu.

### Kiểm tra trước phát hành

- Local backend unit test: `155/155 PASS`.
- Local frontend production build: `PASS`.
- Docker build production: backend `2.09GB`, frontend `75.9MB`; disk sau build vẫn còn khoảng `30GB` trước recreate service.

### Migration và rollout

- Chạy migration bằng one-off backend container, không restart PostgreSQL/Redis.
- Batch `25` đã ghi nhận `20261111000001_add_credit_paid_amount_to_order_list.js` và `20261111000002_unique_order_code.js`.
- Xác minh cột `business.order_list.credit_paid_amount` tồn tại; unique index `business.uq_order_list_id_order_upper_trim` có `indisunique=true`, `indisvalid=true`.
- Recreate chỉ `admin_orderlist-backend` và `admin_orderlist-frontend` bằng `docker compose up -d --no-deps`; PostgreSQL, Redis và cloud browser giữ nguyên container đang chạy.

### Nghiệm thu production

- `https://admin.mavrykpremium.com/`: HTTP `200`, `text/html`.
- `https://admin.mavrykpremium.com/api/health`: HTTP `200`, `status=ok`, `database=connected`.
- Backend container `healthy`; PostgreSQL và Redis `healthy`; không có lỗi startup nghiêm trọng trong log sau recreate.
- Không còn mã `id_order` trùng theo `UPPER(BTRIM(id_order))`; disk sau rollout còn `32GB` (`34%` sử dụng).

### Điều kiện vận hành còn lại

- Worktree production gốc vẫn được giữ nguyên cùng backup root-only đã tạo trước đó; release worktree là đường deploy chuẩn cho các lượt tiếp theo.
- Release worktree có 9 runtime fixes local chưa commit vào GitHub; cần đưa chúng thành commit chính thức sau khi tách/rà soát thay đổi để tránh drift giữa production và repository.

---

## [12:15] Triển khai 3 Form Trạng Thái Dùng Chung (Đang Hoạt Động, Cần Chuyển Team, Không Tồn Tại) Cho Luồng Kiểm Tra Ades

### 1. Phạm vi & Mục tiêu
- Theo chỉ thị của Master, tại ô input kiểm tra tài khoản Adobe trên cổng OTP Portal, hệ thống hiển thị chính xác 1 trong 3 form trạng thái nghiệp vụ:
  1. **Đang Hoạt Động** (`active`): Hiển thị thông tin bản quyền, tổ chức hiện tại, nút tiện ích chuyển sang nhận OTP. Không có nút Chuyển Team.
  2. **Cần Chuyển Team** (`inactive`): Hiển thị cảnh báo màu hổ phách, thông tin tổ chức, và nút bấm **[Chuyển Team Ngay]** (Fix Team). Kích hoạt luồng đổi team và polling tự động đến khi tài khoản trở về active.
  3. **Không Tồn Tại** (`not_found`): Hiển thị thông báo không có trong danh sách đơn hàng hoặc hệ thống, nút điều hướng chuyển sang tra cứu đơn hàng, tuyệt đối không có nút Chuyển Team.
- Đóng gói toàn bộ 3 form thành bộ component dùng chung (Reusable Shared Components) tại `src/components/account-status/` để sau này tái sử dụng nguyên vẹn cho Yuna hoặc các dịch vụ khác.

### 2. Chi tiết thực hiện kỹ thuật

1. **Backend (`admin_orderlist`):**
   - [`backend/src/domains/system/providers/fixAdesStatusProvider.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/providers/fixAdesStatusProvider.js):
     + Bổ sung 2 hàm `switchOrgAdes(email, config)` và `getSwitchOrgStatusAdes(email, config)` tương ứng với upstream `/api/credits-pool/public/org-switch` và `/api/credits-pool/public/org-switch/status`.
   - [`backend/src/domains/system/providers/providerConfig.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/providers/providerConfig.js):
     + Cấu hình endpoints `org_switch` và `org_switch_status`, cùng mapping trường `organization_status` (`organizationStatus.status`).
   - [`backend/src/domains/system/services/otpProviderService.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/otpProviderService.js):
     + Bổ sung `raw_data: executionResult.raw_data` vào payload trả về của `probeOtpForEmail`.
   - [`backend/src/domains/system/services/otpPortalDispatcher.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/otpPortalDispatcher.js):
     + Chuẩn hóa phân loại `status_type`: `active`, `inactive` (ưu tiên `organizationStatus.status`), `not_found`.
     + Cung cấp dữ liệu `organization`, `team_change` và xuất bản các hàm điều phối `requestAdobeSwitchTeam`, `getAdobeSwitchTeamStatus`.
   - [`backend/src/domains/system/routes/publicOtpRoutes.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/routes/publicOtpRoutes.js):
     + Khai báo các route `POST /api/public/otp/adobe/switch-team` (có khóa chống spam/double click `switchTeamPendingLocks`) và `POST /api/public/otp/adobe/switch-team/status`.

2. **Frontend UI ([`otp_portal`](file:///d:/Desktop/admin/otp_portal)):**
   - [`src/types/otp.ts`](file:///d:/Desktop/admin/otp_portal/src/types/otp.ts): Bổ sung `AccountStatusType = "active" | "inactive" | "not_found"` và `OrgSwitchResponse`.
   - [`src/services/otpService.ts`](file:///d:/Desktop/admin/otp_portal/src/services/otpService.ts): Bổ sung `fetchAdobeSwitchTeam` và `fetchAdobeSwitchTeamStatus`.
   - Bộ Shared Components tại [`src/components/account-status/`](file:///d:/Desktop/admin/otp_portal/src/components/account-status/):
     + [`AccountStatusActiveCard.tsx`](file:///d:/Desktop/admin/otp_portal/src/components/account-status/AccountStatusActiveCard.tsx): Form Đang Hoạt Động (xanh emerald).
     + [`AccountStatusSwitchTeamCard.tsx`](file:///d:/Desktop/admin/otp_portal/src/components/account-status/AccountStatusSwitchTeamCard.tsx): Form Cần Chuyển Team (vàng hổ phách) kèm nút Fix Team và giao diện hàng đợi `position`, `etaSeconds`.
     + [`AccountStatusNotFoundCard.tsx`](file:///d:/Desktop/admin/otp_portal/src/components/account-status/AccountStatusNotFoundCard.tsx): Form Không Tồn Tại (đỏ ruby) kèm điều hướng tra cứu đơn hàng.
     + [`AccountStatusView.tsx`](file:///d:/Desktop/admin/otp_portal/src/components/account-status/AccountStatusView.tsx): Orchestrator điều phối trạng thái, kiểm soát polling lifecycle có giới hạn (20 lần ~70s) và tự động dọn dẹp timer khi unmount.
   - [`src/features/adobe/components/AdobeSection.tsx`](file:///d:/Desktop/admin/otp_portal/src/features/adobe/components/AdobeSection.tsx): Tích hợp `AccountStatusView` hiển thị ngay dưới form kiểm tra tài khoản.

### 3. Kết quả kiểm thử (Verification)
- **Backend Unit Tests:** `157/157 tests PASS 100%` (bao gồm 2 test case mới xác minh phân loại `inactive` và luồng gọi org-switch).
- **Node syntax:** `node --check` 100% sạch, không có lỗi cú pháp.
- **Frontend Production Build:** `tsc && vite build` trên `otp_portal` thành công 100% trong 7.36s, 0 lỗi TypeScript.
- **Ranh giới an toàn (Redlines):** Bảo toàn hoàn toàn luồng lấy OTP Ades (`only_otp`) và bảo vệ các file của Master.


## [2026-11-12] Tach port OmniRoute khoi 9router

- Pham vi: cau hinh OmniRoute chay port 20129, khong trung 9router 20128.
- Thay doi: them OMNIROUTE_PORT=20129 vao %USERPROFILE%\\.omniroute\\.env; khong thay doi chung chi hay du lieu 9router.
- Kiem tra truoc trien khai: launcher.pid cua 9router xac nhan port: 20128; port 20129 khong dang lang nghe.
- Hau kiem: khoi dong lai OmniRoute, xac nhan listener 20129, giu nguyen listener 20128, va kiem tra lai certificate.

---

## [15:35] Tái Cấu Trúc Toàn Diện Cấu Hình Ô Input Cổng OTP: Xóa Bỏ Chính/Phụ & Gán Đa Cổng NCC Không Giới Hạn

### 1. Phạm vi & Mục tiêu
- Theo chỉ đạo của Master (*"không có chính và phụ. 1 ô input trên web tôi có thể gắn nhiều trường. Ví dụ otp adobe tôi không nhất thiết mỗi ades mà tôi có thể nhập nhiều NCC cho nên mỗi ncc nó sẽ có cách lấy otp khác nhau cho nên chỗ này cần thiết kế lại"*):
  + Xóa bỏ 100% mô hình nhị phân cũ (Provider Chính vs Provider Dự Phòng) trên toàn bộ hệ thống Admin.
  + Thiết kế lại trang cấu hình thành **Chuỗi Cổng Dịch Vụ / NCC Được Gán (Assigned Providers Chain)**, cho phép gán không giới hạn số lượng Cổng/NCC cho cùng 1 ô input.
  + Hỗ trợ thêm cổng, gỡ cổng, điều chỉnh thứ tự ưu tiên (Lên ⬆️ / Xuống ⬇️) và bật/tắt ô input.

### 2. Chi tiết thực hiện kỹ thuật
- **Frontend ([`admin_orderlist/frontend`](file:///d:/Desktop/admin/admin_orderlist/frontend)):**
  + [`OtpPortalSlotsTab.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx):
    * Tái thiết kế giao diện: Thẻ từng ô input hiển thị danh sách các Cổng NCC theo thứ tự ưu tiên `#1`, `#2`, `#3`...
    * Mỗi thẻ Cổng hiển thị tên NCC, key, category, trạng thái (`✓ Sẵn sàng` vs `⚠️ Chưa cấu hình env`).
    * Tích hợp bộ nút hành động nhanh: ⬆️ Tăng ưu tiên, ⬇️ Giảm ưu tiên, ✕ Gỡ cổng.
    * Thêm thanh chọn dropdown `[+ Thêm Cổng Dịch Vụ / NCC Vào Ô Này...]` tự động lọc bỏ các cổng đã gán.
    * Bổ sung nút Toggle Bật/Tắt ô input (`enabled`).
  + [`useExternalApiConfig.ts`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/hooks/useExternalApiConfig.ts):
    * Bổ sung các action: `addServiceToSlot`, `removeServiceFromSlot`, `moveServiceInSlot`, `toggleSlotEnabled`.
    * Đồng bộ và chuẩn hóa dữ liệu khi nạp/lưu: `assigned_services: string[]` là Nguồn Sự Thật Duy Nhất (SSOT).
  + [`ExternalApiConfigController.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx):
    * Kết nối đầy đủ các handler mới vào `OtpPortalSlotsTab`.
- **Backend Dispatcher ([`otpPortalDispatcher.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/otpPortalDispatcher.js)):**
  + Chuẩn hóa việc đọc `serviceChain` từ `slot.assigned_services`, deduplicate và loại trừ các giá trị rỗng.
  + Bảo đảm vòng lặp failover quét tuần tự qua toàn bộ các cổng trong chuỗi đã cấu hình.

### 3. Kết quả kiểm thử (Verification)
- **Frontend Production Build:** `tsc && vite build` trên `admin_orderlist/frontend` thành công 100% trong 24.63s, 0 lỗi TypeScript.
- **Backend Unit Tests:** `15/15 tests PASS 100%` trên bộ test `otpProviderService.test.js`.
- **An toàn mã nguồn:** Không phá vỡ backward compatibility cho các cấu hình slots cũ đã lưu trong database.

---

## [21:55] Triển Khai Production 2 Dự Án: OTP Portal & Admin Orderlist Lên VPS (180.93.43.169)

### 1. Phạm vi triển khai
- Triển khai toàn bộ bản cập nhật mới nhất của 2 dự án lên máy chủ sản xuất VPS (`vps` — `180.93.43.169`):
  1. [`otp_portal`](file:///e:/Project/admin_store/otp_portal): Triển khai bản build tĩnh mới nhất (commit `c9134d80`) chứa bộ 3 form trạng thái Ades (*active*, *inactive*, *not_found*), luồng Fix Team, và giao diện hiệu ứng Anime Rig.
  2. [`admin_orderlist`](file:///e:/Project/admin_store/admin_orderlist): Triển khai bản phát hành hoàn chỉnh (commit `77c87a6c`) chứa tính năng chuỗi gán đa cổng NCC không giới hạn chính/phụ trên ô input cổng OTP, API đổi team Fix-Ades, bảo toàn unique index `id_order` và xử lý an toàn tài khoản ngân hàng.

### 2. Quá trình thực hiện kỹ thuật
- **OTP Portal ([`otp_portal`](file:///e:/Project/admin_store/otp_portal)):**
  - Sao lưu bản build đang chạy trên VPS: `/var/www/otp_portal/.dist-backup-20261112-213450`.
  - Biên dịch production build cục bộ: `tsc && vite build` thành công trong `12.42s`.
  - Đóng gói và đồng bộ bản build (`index-B8oC2m2u.js`, `index-D09SOTM-.css`) sang `/var/www/otp_portal/dist/`.
  - Cập nhật phân quyền: `sudo chown -R www-data:www-data /var/www/otp_portal/dist`.
  - Tải lại Host Nginx: `sudo nginx -t && sudo nginx -s reload` (0 downtime).
- **Admin Orderlist ([`admin_orderlist`](file:///e:/Project/admin_store/admin_orderlist)):**
  - Cập nhật release worktree `/var/www/admin_orderlist-release` về commit `77c87a6c` (`origin/main`).
  - Bảo toàn tuyệt đối các liên kết biểu tượng `.env`, `backend/.env.docker`, `warehouse_profiles` và thư mục dữ liệu hình ảnh `backend/image_product/`.
  - Biên dịch Docker images trên VPS với BuildKit:
    + `admin_orderlist-backend:latest` (`f389accac264` — 2.09GB).
    + `admin_orderlist-frontend:latest` (`75dd597ff2e5` — 75.9MB).
  - Kiểm tra database migration qua one-off container: `Using environment: production. Already up to date`.
  - Tái tạo an toàn 2 container ứng dụng: `docker compose -p admin_orderlist up -d --no-deps backend frontend`.
  - Giữ nguyên liên tục các dịch vụ hạ tầng đang chạy: PostgreSQL, Redis, Cloud Browser, Cheap Accommodation.

### 3. Nghiệm thu sản xuất (Live Verification)
- **Cổng OTP Portal:**
  - `https://www.mavrykpremium.com/otp/`: HTTP/2 `200 OK`.
  - `https://www.mavrykpremium.com/otp/assets/index-B8oC2m2u.js`: HTTP/2 `200 OK`.
  - `https://www.mavrykpremium.com/otp/assets/index-D09SOTM-.css`: HTTP/2 `200 OK`.
- **Cổng Quản Trị Admin Orderlist:**
  - `https://admin.mavrykpremium.com/api/health`: HTTP/2 `200 OK`, `{"status":"ok","version":"2.0.0","database":"connected"}`.
  - `https://admin.mavrykpremium.com/`: HTTP/2 `200 OK`.
  - Trạng thái Docker container: `admin_orderlist-backend` (healthy), `admin_orderlist-frontend` (Up), `admin_orderlist-postgres` (healthy), `admin_orderlist-redis` (healthy).
  - Dung lượng đĩa VPS sau deploy: Còn trống `28GB / 50GB` (`41%` sử dụng).


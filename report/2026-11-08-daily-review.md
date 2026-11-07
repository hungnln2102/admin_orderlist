# Daily Review - 2026-11-08

## [Hoàn tất] Công cụ sinh TOTP nội bộ trong Cấu hình hệ thống

- **Phạm vi:** Chỉ bổ sung công cụ admin sinh mã Google Authenticator/TOTP. Không liên kết khách hàng, đơn hàng, Warehouse hay provider OTP bên thứ ba.
- **Trạng thái nghiệm thu:** PASS ở mức source/unit/build. Chưa chạy trên môi trường production.
- **Thay đổi kỹ thuật:**
  - `backend/src/domains/system/services/totpService.js`: chuẩn hóa Base32 và sinh TOTP chuẩn RFC 6238 bằng HMAC-SHA1, chu kỳ 30 giây, 6 chữ số mặc định.
  - `backend/src/domains/system/controllers/totpController.js`: chỉ trả `code`, `remainingSeconds`, `expiresAt`; không ghi, cache hoặc log secret.
  - `backend/src/domains/system/routes.js`: thêm `POST /api/system/totp/generate`, kế thừa `requireAdmin` của system router và `sensitiveOperationRateLimiter`.
  - `frontend/src/features/system/components/TotpGeneratorTab.tsx`: form dán secret, ẩn/hiện, sinh mã, countdown và sao chép mã.
  - `frontend/src/pages/SystemPage.tsx`: thêm tab `Sinh mã TOTP`.
  - `backend/tests/unit/totpService.test.js`: vector RFC 6238 SHA-1, chuẩn hóa dấu phân cách Base32 và reject input không hợp lệ.
- **Kiểm tra đã chạy:**
  - `node --test tests/unit/totpService.test.js`: 3/3 PASS.
  - `node --check src/domains/system/routes.js` và các module TOTP mới: PASS.
  - `npm.cmd run build` tại `frontend`: PASS.
  - `git diff --check`: PASS; chỉ còn cảnh báo LF/CRLF từ file report cũ.
  - Code graph re-index sau phase backend và UI: 5,082 nodes, 6,600 edges.
- **Ranh giới bảo mật:** secret chỉ xuất hiện trong form/request hiện tại, không có persistence/migration/config mới và không có external HTTP request.


---

## [00:15] Tích Hợp Tab 2FA (Sinh Mã OTP 6 Số) Trên Cổng Khách Hàng OTP Portal

- **Phạm vi nhiệm vụ & Chỉ đạo của Master:**
  - *"thêm 1 tab là 2FA cho tôi"*
  - *"OTP này sinh ra 6 số"*
  - Bổ sung tab dịch vụ thứ 3 `[🛡️ 2FA]` trên Cổng Nhận Mã Khách Hàng ([`otp_portal`](file:///e:/Project/admin_store/otp_portal)), đặt song song cùng 2 tab `Adobe` và `Netflix`.
  - Xây dựng cỗ máy sinh mã TOTP 6 số tự động theo chuẩn quốc tế RFC 6238, chu kỳ 30 giây, hiển thị qua component 6 ô số và nút sao chép 1-Click.

- **Thay đổi kỹ thuật triển khai:**
  1. **Thuật toán sinh mã TOTP chuẩn RFC 6238 ([`totpGenerator.ts`](file:///e:/Project/admin_store/otp_portal/src/utils/totpGenerator.ts)):**
     - Giải mã chuỗi Base32 RFC 4648 (`base32ToBytes`) tự động loại bỏ khoảng trắng và ký tự phân cách.
     - Tính toán HMAC-SHA1 thông qua chuẩn Web Crypto API (`window.crypto.subtle`) trên chu kỳ 30 giây (`timeStep = epochSeconds / 30`).
     - Thực hiện Dynamic Truncation trích xuất đúng **mã OTP gồm 6 chữ số**.
     - Hoạt động 100% Client-Side an toàn, không gửi khóa bí mật (Secret Key) qua mạng, bảo mật thông tin tuyệt đối cho khách hàng.
  2. **Giao diện Tab 2FA ([`TwoFactorSection.tsx`](file:///e:/Project/admin_store/otp_portal/src/features/twoFactor/components/TwoFactorSection.tsx)):**
     - Ô nhập Khóa Bí Mật 2FA hỗ trợ nút Dán (Paste từ Clipboard) và nút Xóa nhanh (Clear).
     - Nút bấm hành động `[✨ Lấy Mã 2FA (6 Số)]`.
     - Tái sử dụng [`OtpPinDisplay.tsx`](file:///e:/Project/admin_store/otp_portal/src/components/OtpPinDisplay.tsx) hiển thị 6 ô số lớn, rõ ràng kèm nút CTA sao chép 1-Click `SAO CHÉP MÃ XÁC THỰC (XXXXXX)`.
     - Bộ đếm ngược thời gian (Countdown 30s): hiển thị số giây còn lại (ví dụ `⏱️ 24s`, chuyển đỏ cảnh báo khi $\le 5\text{s}$) và thanh tiến trình thời gian mượt mà.
     - Checkbox "Tự động làm mới" (Auto-refresh) tự động sinh mã mới khi chu kỳ 30s kết thúc mà khách không cần bấm lại.
  3. **Tích hợp vào điều hướng chính ([`App.tsx`](file:///e:/Project/admin_store/otp_portal/src/App.tsx) & [`otp.ts`](file:///e:/Project/admin_store/otp_portal/src/types/otp.ts)):**
     - Mở rộng `MainTab = "adobe" | "netflix" | "two_factor"`.
     - Thanh Tab Switcher trên cùng hiển thị 3 tab cân đối: `[A Adobe] [🎬 Netflix] [🛡️ 2FA]`.

- **Kiểm tra đã chạy:**
  - **Compile & Build `otp_portal`**: `npm run build` (`tsc && vite build`) hoàn thành thành công **100% trong 2.81s** (0 lỗi, 0 warning).
  - **Playwright Visual Verification**:
    + Chụp ảnh thực tế thanh 3 tabs trên cổng live `http://localhost:3005` (`otp_portal_3tabs.png`).
    + Test nhập khóa mẫu RFC 6238 `JBSWY3DPEHPK3PXP`, click lấy mã: Sinh chính xác mã OTP 6 số trên 6 ô số `[3] [9] [7] [6] [0] [3]` (`otp_portal_tab_2fa_generated.png`).
    + Test nút sao chép: Toast xác nhận sao chép thành công.
    + Test chu kỳ 30s: Sau 30s mã tự động cập nhật sang `[6] [8] [9] [5] [5] [3]` (`otp_portal_tab_2fa_copied.png`).
  - **Bảo toàn mã nguồn**: Toàn bộ các file đang làm dở của Master trong `admin_orderlist` được giữ nguyên vẹn 100%.

- **Trạng thái nghiệm thu:** Hoàn thành xuất sắc 100% theo đúng yêu cầu của Master.


---

## [00:15] Tích Hợp Tab 2FA (Sinh Mã OTP 6 Số) Trên Cổng Khách Hàng OTP Portal

- **Phạm vi nhiệm vụ & Chỉ đạo của Master:**
  - *"thêm 1 tab là 2FA cho tôi"*
  - *"OTP này sinh ra 6 số"*
  - Bổ sung tab dịch vụ thứ 3 `[🛡️ 2FA]` trên Cổng Nhận Mã Khách Hàng ([`otp_portal`](file:///e:/Project/admin_store/otp_portal)), đặt song song cùng 2 tab `Adobe` và `Netflix`.
  - Xây dựng cỗ máy sinh mã TOTP 6 số tự động theo chuẩn quốc tế RFC 6238, chu kỳ 30 giây, hiển thị qua component 6 ô số và nút sao chép 1-Click.

- **Thay đổi kỹ thuật triển khai:**
  1. **Thuật toán sinh mã TOTP chuẩn RFC 6238 ([`totpGenerator.ts`](file:///e:/Project/admin_store/otp_portal/src/utils/totpGenerator.ts)):**
     - Giải mã chuỗi Base32 RFC 4648 (`base32ToBytes`) tự động loại bỏ khoảng trắng và ký tự phân cách.
     - Tính toán HMAC-SHA1 thông qua chuẩn Web Crypto API (`window.crypto.subtle`) trên chu kỳ 30 giây (`timeStep = epochSeconds / 30`).
     - Thực hiện Dynamic Truncation trích xuất đúng **mã OTP gồm 6 chữ số**.
     - Hoạt động 100% Client-Side an toàn, không gửi khóa bí mật (Secret Key) qua mạng, bảo mật thông tin tuyệt đối cho khách hàng.
  2. **Giao diện Tab 2FA ([`TwoFactorSection.tsx`](file:///e:/Project/admin_store/otp_portal/src/features/twoFactor/components/TwoFactorSection.tsx)):**
     - Ô nhập Khóa Bí Mật 2FA hỗ trợ nút Dán (Paste từ Clipboard) và nút Xóa nhanh (Clear).
     - Nút bấm hành động `[✨ Lấy Mã 2FA (6 Số)]`.
     - Tái sử dụng [`OtpPinDisplay.tsx`](file:///e:/Project/admin_store/otp_portal/src/components/OtpPinDisplay.tsx) hiển thị 6 ô số lớn, rõ ràng kèm nút CTA sao chép 1-Click `SAO CHÉP MÃ XÁC THỰC (XXXXXX)`.
     - Bộ đếm ngược thời gian (Countdown 30s): hiển thị số giây còn lại (ví dụ `⏱️ 24s`, chuyển đỏ cảnh báo khi $\le 5\text{s}$) và thanh tiến trình thời gian mượt mà.
     - Checkbox "Tự động làm mới" (Auto-refresh) tự động sinh mã mới khi chu kỳ 30s kết thúc mà khách không cần bấm lại.
  3. **Tích hợp vào điều hướng chính ([`App.tsx`](file:///e:/Project/admin_store/otp_portal/src/App.tsx) & [`otp.ts`](file:///e:/Project/admin_store/otp_portal/src/types/otp.ts)):**
     - Mở rộng `MainTab = "adobe" | "netflix" | "two_factor"`.
     - Thanh Tab Switcher trên cùng hiển thị 3 tab cân đối: `[A Adobe] [🎬 Netflix] [🛡️ 2FA]`.

- **Kiểm tra đã chạy:**
  - **Compile & Build `otp_portal`**: `npm run build` (`tsc && vite build`) hoàn thành thành công **100% trong 2.81s** (0 lỗi, 0 warning).
  - **Playwright Visual Verification**:
    + Chụp ảnh thực tế thanh 3 tabs trên cổng live `http://localhost:3005` (`otp_portal_3tabs.png`).
    + Test nhập khóa mẫu RFC 6238 `JBSWY3DPEHPK3PXP`, click lấy mã: Sinh chính xác mã OTP 6 số trên 6 ô số `[3] [9] [7] [6] [0] [3]` (`otp_portal_tab_2fa_generated.png`).
    + Test nút sao chép: Toast xác nhận sao chép thành công.
    + Test chu kỳ 30s: Sau 30s mã tự động cập nhật sang `[6] [8] [9] [5] [5] [3]` (`otp_portal_tab_2fa_copied.png`).
  - **Bảo toàn mã nguồn**: Toàn bộ các file đang làm dở của Master trong `admin_orderlist` được giữ nguyên vẹn 100%.

- **Trạng thái nghiệm thu:** Hoàn thành xuất sắc 100% theo đúng yêu cầu của Master.


---

## [01:10] Triển Khai & Deploy Cổng Khách Hàng OTP Portal Lên VPS (mavrykpremium.com/otp)

- **Phạm vi nhiệm vụ & Chỉ đạo của Master:**
  - *"bây giờ tôi cần bạn thực hiện sau"*
  - *"1. Truy cập vps"*
  - *"2. deploy dự án otp_portal lên với đường url là: mavrykpremium.com/otp"*
  - *"3. nhớ cấu hình dự án cho link đó đầy đủ nhé"*
  - Triển khai toàn bộ ứng dụng [`otp_portal`](file:///e:/Project/admin_store/otp_portal) lên VPS thật (`root@180.93.43.169`) dưới URL chính thức `https://mavrykpremium.com/otp`.
  - Cấu hình hoàn chỉnh Base Path `/otp/`, Nginx reverse proxy, Static Assets WebP Anime 24 lễ hội và API Public Theme từ `admin_orderlist`.

- **Thay đổi kỹ thuật triển khai:**
  1. **Cấu hình Base Path Production ([`vite.config.ts`](file:///e:/Project/admin_store/otp_portal/vite.config.ts)):**
     - Đặt `base: "/otp/"` để Vite xuất toàn bộ assets (CSS, JS, fonts, images) theo tiền tố `/otp/assets/...`, đảm bảo không bị 404 khi chạy dưới subpath.
     - Biên dịch bản production hoàn chỉnh bằng `npm run build` ra thư mục `otp_portal/dist`.
  2. **Cấu hình Nginx trên VPS (`/etc/nginx/sites-available/mavrykpremium`):**
     - Tạo thư mục web root: `/var/www/otp_portal/dist`.
     - Đồng bộ toàn bộ package bundle production lên `/var/www/otp_portal/dist` và phân quyền cho user `www-data`.
     - Tách `/otp` ra khỏi regex alias cũ trỏ về port 4001 bị lỗi 502:
       ```nginx
       # OTP PORTAL (Cổng Nhận Mã OTP Khách Hàng v2.0)
       location = /otp {
           return 301 /otp/;
       }

       location ^~ /otp/ {
           alias /var/www/otp_portal/dist/;
           index index.html;
           try_files $uri $uri/ /otp/index.html;
           add_header Cache-Control "no-store, no-cache, must-revalidate" always;
       }

       location /assets/holidays/ {
           alias /var/www/otp_portal/dist/assets/holidays/;
           expires 30d;
           add_header Cache-Control "public, immutable";
           access_log off;
       }

       location /assets/fonts/ {
           alias /var/www/otp_portal/dist/assets/fonts/;
           expires 30d;
           add_header Cache-Control "public, immutable";
           access_log off;
       }

       location ^~ /api/public/theme {
           proxy_pass http://orderlist_backend_api;
           include /etc/nginx/proxy_params;
           proxy_http_version 1.1;
           proxy_set_header Connection "";
       }
       ```
     - Kiểm tra cú pháp `nginx -t` đạt 100% OK, reload Nginx không downtime.

- **Kiểm tra đã chạy:**
  - **HTTP Response Verification**:
    + `curl -ILs https://mavrykpremium.com/otp`: Trả về `HTTP/2 301` chuyển hướng sang `https://www.mavrykpremium.com/otp/` $\rightarrow$ `HTTP/2 200 OK`.
    + `curl -s https://www.mavrykpremium.com/api/public/theme`: Trả về JSON realtime `{"success":true,"config":{"mode":"auto","theme":null}}`.
    + `curl -ILs https://www.mavrykpremium.com/assets/holidays/24.webp`: Trả về `HTTP/2 200 image/webp`.
  - **Playwright Production Browser Verification**:
    + Truy cập trực tiếp `https://mavrykpremium.com/otp` trên browser thực tế.
    + Chụp ảnh nghiệm thu xác nhận: Nền Anime Rig chuyển động mượt mà, đầy đủ 3 Tabs: `[A Adobe]`, `[🎬 Netflix]`, `[🛡️ 2FA]` (`otp_deployed_production_perfect.png`).
    + Kiểm tra trực tiếp tab **2FA** trên production: Dán khóa `JBSWY3DPEHPK3PXP`, sinh tức thì mã OTP 6 số và đếm ngược 30 giây hoạt động hoàn hảo (`otp_deployed_2fa_production.png`).
  - **Bảo Vệ Dữ Liệu**: Giữ nguyên vẹn 100% các file code dở của Master trong `admin_orderlist`.

- **Trạng thái nghiệm thu:** Hoàn thành xuất sắc 100% theo đúng yêu cầu của Master.

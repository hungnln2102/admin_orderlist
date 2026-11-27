# Nghiệm thu ngày 2026-11-27

## Thay slot Adobe Ades và cảnh báo Telegram

- Fix-Ades xác nhận không có đăng ký qua `found: false` mới kích hoạt thay slot từ kho gói. Lỗi HTTP 404 thiếu xác nhận, mất kết nối và trạng thái `inactive` giữ nguyên phân bổ.
- Khi hết kho, giao dịch vẫn giữ liên kết đơn và đánh dấu slot lỗi không khả dụng. Yêu cầu đồng thời kiểm tra lại phân bổ dưới khóa để chỉ cấp một slot mới.
- Cảnh báo chứa mã đơn, email Adobe và kết quả xử lý. Cấu hình topic để trống thì bỏ qua cảnh báo. Worker kiểm tra topic và ghi nhận lỗi gửi nếu topic không tồn tại.
- Backend qua 189 unit test. PostgreSQL 16 cô lập qua 6 bài tích hợp, gồm đối chiếu slot lỗi, hết kho, cấp đồng thời và chống trùng outbox. TypeScript trang quản trị đạt. Chromium với API mô phỏng hiển thị thông tin tài khoản mới và thông báo hết kho.
- Chưa triển khai production. Telegram được kiểm thử mô phỏng.

## Cấp mã kích hoạt theo cấu hình và đơn hàng

- Form chọn cấu hình đang bật, sau đó tìm đơn đủ điều kiện. Đơn đã có key không còn trong kết quả tìm kiếm. Mỗi lần cấp tạo một mã và ghi cùng giá trị vào `information_order` trong giao dịch có Outbox.
- Migration bắt buộc key có đơn hợp lệ và chỉ cho phép một key trên mỗi đơn. Đơn `EXPIRED` chặn sử dụng key. Các cột cấp phát slot/gói vẫn phục vụ OTP, khôi phục và tính chỗ trong kho.
- PostgreSQL 16 cô lập chạy đủ 67 migration và đạt 7 bài kiểm thử tích hợp. Chromium với API mô phỏng đã kiểm tra dropdown, payload cấp key và lần mở lại form.
- Database cấu hình được đối chiếu chỉ đọc. Đơn `MAVLX635A` đang có thông tin dạng email và chưa có cấu hình khớp. Chưa tạo key cho đơn này hoặc áp dụng migration lên database cấu hình.

## Traffic theo khu v?c v? IP

- B?n ?? x?p h?ng qu?c gia theo phi?n GA4 v? xem chi ti?t t?nh/th?nh. T?t c? truy v?n GA4 ch? nh?n hai hostname `mavrykpremium.com` v? `www.mavrykpremium.com`. Tab Ngu?n & K?nh ti?p t?c c? trong ph?n ph?n t?ch.
- B?ng IP ??c nh?t k? Nginx ri?ng trong t?i ?a 30 ng?y, h? tr? IPv4/IPv6 v? tra GeoIP trong MMDB n?i b?. API k? th?a ph?n quy?n admin. B? l?c Nginx ch? nh?n l??t t?i HTML t? hai hostname c?ng khai.
- ?? ki?m tra b?n d?ng frontend, h?p ??ng truy v?n GA4 m? ph?ng v? ??c nh?t k? th? g?m IPv4, IPv6, file n?n v? gi?i h?n th?i gian. Ch?a tri?n khai production. C?n b?t nh?t k? ri?ng, logrotate v? mount GeoIP theo `docs/traffic-ip.md`.

## Trạng thái chuyển team Adobe qua Ades

- `sending` giữ ETA và vị trí. `done` lấy thông tin tài khoản Ades trước khi kết thúc polling.
- Kiểm thử local đạt 28/28 và bản dựng cổng OTP thành công.

## Traffic - KPI and IP tab layout

- KPI ngay dưới bộ lọc. Chi tiết IP nằm trong hàng tab phân tích, cùng với Theo ngày.

## Thu phóng bản đồ Traffic

- Thêm zoom 1×–8×, kéo bản đồ và đặt lại góc nhìn. Build và kiểm tra Chromium với dữ liệu mô phỏng ở 1400px và 390px đạt.

## Adobe Fix-Ades và thay slot từ Kho Gói Sản Phẩm

- `expiring-soon` dùng phản hồi `active`. Khi xác nhận `expired` hoặc `found: false`, xóa bản ghi trong Kho Gói Sản Phẩm và giữ tài khoản, slot trong Kho Hàng. Slot cũ chuyển `UNAVAILABLE`. Log ngày của gói bị xóa theo khóa ngoại hiện hành.
- Khôi phục Adobe kiểm tra ứng viên trước khi gán. Đơn đã gán chuyển sang tài khoản khác cùng sản phẩm và tag. Nếu hết kho, liên kết slot cũ cho phép thử lại bằng mã đơn hoặc key. Luồng kích hoạt và OTP qua mã đơn hoặc key chặn sử dụng slot đã ngừng cấp.
- Đạt 190/190 kiểm thử đơn vị và 7/7 kiểm thử tích hợp trên PostgreSQL 16 cô lập, gồm hai đơn dùng chung gói và thử lại độc lập. Dùng phản hồi Fix-Ades mô phỏng. Chưa triển khai production.


## Chuẩn hóa tính ngày tạo đơn (inclusive) và chuyển đổi DATE cho `order_date`, `expired_at`

- Rà soát luồng tạo đơn `#MAVLZYP4V` (chọn ngày đặt `28/11/2026`, gói 12 tháng hết hạn `27/11/2027`): phát hiện `calculateExpirationDateFromStart` (`durationUtils.ts`) và nhánh chỉnh tay `expired_at` (`OrderCreateEditModal.tsx`) thiếu `+ 1` ngày khi tính số ngày bao gồm ngày bắt đầu, dẫn tới lưu `364 ngày` thay vì `365 ngày`.
- Sửa `durationUtils.ts` (bổ sung `calculateInclusiveDays`, tính inclusive cho nhánh tháng/năm/ngày/fallback), cập nhật `OrderCreateEditModal.tsx`, `DateRangePicker.tsx` (reset `activePicking` và đồng bộ tháng khi mở popover), `OrdersPage.tsx` (đồng bộ `days` khi mở modal tạo mới), và `BatchDetailModal.tsx` (dùng `formatDateDisplay`).
- Tạo Knex migration `backend/src/db/migrations/20261127000002_convert_order_dates_to_date.js` chuyển `business.order_list.order_date` và `expired_at` từ `timestamp with time zone` sang `date` bằng `to_char(col AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')::date` (kèm kiểm tra không có bản ghi khác `00:00:00+07` dưới khóa `ACCESS EXCLUSIVE`), khớp `000_consolidated_schema.sql` và parser `OID 1082`.
- Rà soát và chuyển toàn bộ điểm tham chiếu `order_date` / `expired_at` sang đọc chuẩn `DATE` (`YYYY-MM-DD` giờ Việt Nam): `formatters.js` (`formatDateDMY` neo `$` và quy ISO/Date về `Asia/Ho_Chi_Minh`), `orderNotifier.js`, `orderService.js` (chuẩn hóa khi tạo/sửa và phát event), `orderCreditService.js`, `orderQueryService.js`, `packageProductService.js`, `notifyZeroDaysTask.js`, `dashboardService.js` (nhánh `hour` dùng `created_at` thay `order_date`), và `backend/src/utils/time.js` (`normalizeDateOnly`, `calculateRemainingDaysVietnam`, `formatDateDisplay`).
- Kiểm thử: `npm --prefix backend test` đạt **198/198** (gồm `durationUtils.test.js`, `telegramOrderDateFormatting.test.js`, `notifyZeroDaysTask.test.js` cập nhật theo SQL `::date =`); `npm --prefix frontend run build` (`tsc && vite build`) thành công. Chưa chạy backup/migration trên VPS `180.93.43.169` và chưa deploy production (chờ xác nhận triển khai).

## Lịch sử sử dụng credit

- Bổ sung bảng lịch sử ở trang /credit với mã credit gốc, đơn nhận, số tiền đã áp dụng, số dư ngay sau mỗi lần sử dụng và thời điểm áp dụng. Giữ danh sách phiếu đóng qua tab Credit không khả dụng.
- API sử dụng dữ liệu giao dịch hiện có và tính số dư lũy kế trước khi tìm kiếm, phân trang.
- Nghiệm thu cục bộ: TypeScript và cú pháp Node đạt. Kiểm thử HTTP trên PostgreSQL với bảng tạm đạt các trường hợp áp dụng một phần, nhiều lần, hết số dư, chưa sử dụng, tìm kiếm và phân trang. Playwright với API mô phỏng xác nhận hiển thị, tìm đơn và chuyển tab.
- Chưa triển khai production hoặc đối chiếu giao dịch thực tế.

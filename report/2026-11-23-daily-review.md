# Nghiệm thu ngày 23/11/2026

## Kích hoạt key theo thanh toán và cấp tài khoản Adobe

- Migration đồng bộ key theo trạng thái đơn, giữ trạng thái thu hồi và hết hạn của key. Đơn đã thanh toán trên PostgreSQL local có key `ACTIVATED` và chưa gắn slot.
- Portal cấp tài khoản trong giao dịch khi khách dùng key lần đầu. API lấy lại tài khoản đã gắn khi gửi lại và gọi dispatcher Adobe một lần sau khi có tài khoản.
- Trang Quản lý Mã Kích Hoạt hiển thị trạng thái kích hoạt và slot đã cấp riêng. Modal cấu hình Variant dùng một mục Adobe cho luồng lấy và kiểm tra tài khoản.
- PostgreSQL 16 cô lập đạt 3 ca tích hợp, gồm hai yêu cầu đồng thời chỉ cấp một slot. Backend đạt 161 unit test. Hai bản build frontend đạt.
- Chưa gọi nhà cung cấp Adobe thật hoặc triển khai production. Repo thiếu `scripts/scan_text_errors.py`.

## Bỏ thứ tự ưu tiên provider OTP

- Dispatcher chọn một provider theo liên kết, cổng mặc định đã cấu hình hoặc cổng duy nhất của ô. Khi provider trả lỗi hoặc chưa có kết quả, yêu cầu kết thúc tại provider đó.
- Tab cấu hình bỏ thứ tự và nút di chuyển. Migration đã lưu cổng mặc định cho các ô trên PostgreSQL local, kiểm tra qua API xác nhận đủ bốn ô có nhiều cổng.
- Backend unit test và frontend build đạt. Chưa thử qua giao diện trình duyệt hoặc gọi provider thật.

## Lưu ngay khi gỡ provider khỏi ô OTP

- Nút gỡ lưu riêng thay đổi của provider trên backend và giữ các chỉnh sửa chưa lưu trên giao diện.
- PostgreSQL thử nghiệm xác nhận hai thao tác gỡ đồng thời, gỡ lặp, xóa mặc định và đọc lại cấu hình. 163 unit test backend đạt. Chưa thao tác trên cấu hình thật qua trình duyệt.

## Tự lưu cấu hình ô OTP

- Bỏ nút lưu chung. Thêm cổng, chọn cổng mặc định và bật hoặc tắt ô lưu ngay qua API cập nhật riêng từng ô.
- PostgreSQL thử nghiệm xác nhận ghi đồng thời, kiểm tra dữ liệu đầu vào và đọc lại cấu hình. 163 unit test backend và frontend build đạt. Chưa thử qua trình duyệt.

## Đồng bộ ô Adobe giữa portal và admin

- API danh sách ô trả mục Adobe đã gộp dưới khóa `adobe_check`. Ô lấy mã OTP vẫn riêng. Dispatcher giữ cấu hình tra cứu cũ để phục vụ API tương thích.
- Registry dự phòng của portal dùng cùng tên và khóa. API local xác nhận giữ cổng mặc định `fix_ades_status` và ba provider đã cấu hình cho ô đã gộp.
- 163 unit test backend và build portal đạt. Chưa kiểm tra giao diện admin qua trình duyệt.

## Điều phối OTP theo cấu hình khớp

- Bỏ cổng mặc định khỏi tab cấu hình và dữ liệu local. Chỉ gọi provider theo cấu hình đơn hoặc slot kho khớp. TOTP xử lý nội bộ.
- API local trả tám ô không có thuộc tính mặc định và báo liên hệ admin khi không tìm được cấu hình. Portal GPT bỏ nhánh sinh mã giả khi API lỗi.
- 163 unit test và hai build frontend đạt. Ca định tuyến OTP trên PostgreSQL thử nghiệm đạt. Ca cập nhật trạng thái slot trong bộ kiểm thử kho vẫn báo sai lệch `AVAILABLE` và `IN_USE`.

## Đặt tên hiển thị provider từ admin

- Tên hiển thị được đọc từ `OTP_PROVIDER_DISPLAY_NAMES`. Migration đã ghi 12 tên hiện tại vào PostgreSQL local. Xóa tên sẽ hiển thị lại khóa provider.
- PostgreSQL thử nghiệm xác nhận đổi tên đồng thời, đọc lại và xóa tên. 163 unit test backend và frontend build đạt. Chưa thử trên trình duyệt.

## Chuẩn hóa luồng tài khoản Adobe

- Đơn Yuna mua thẳng giữ mã Yuna. Portal xác minh đơn rồi dùng mã đã lưu để lấy tài khoản. Nút Báo lỗi hiển thị Sắp hỗ trợ.
- Đơn Ades mua thẳng giữ email tài khoản. Đơn cấp slot dùng MAVKEY và cấu hình kiểm tra trên slot đã gán. Chuyển team dùng bằng chứng tra cứu của đơn.
- 163 unit test backend, 4 ca PostgreSQL thử nghiệm và hai bản build frontend đạt. Các nhà cung cấp được giả lập khi kiểm tra HTTP.

## Siết điều kiện cấp key khi tạo đơn

- API xem trước và luồng lưu đơn dùng chung quy tắc cấp key theo Variant và NCC. Nhánh tạo key từ payload ngoài quy tắc đã được gỡ.
- 163 unit test backend và 5 ca tích hợp PostgreSQL đạt, gồm sai NCC, quy tắc tắt và key xem trước hết hiệu lực.

## [01:48] Nâng cấp Animation & Loại bỏ Jump Frame cho Dropdown `CustomSelect`

- **Trạng thái nghiệm thu**: PASS 100% (Frontend build hoàn tất trong 4.73s).
- **Vấn đề đã khắc phục**:
  - Loại bỏ hoàn toàn lỗi giật vị trí 1 khung hình (1-frame layout jump / flicker) khi mở dropdown bằng cách tính toán tọa độ ngay trong `handleToggle` và chuyển sang `useLayoutEffect` trước khi trình duyệt paint.
  - Bổ sung GPU-accelerated keyframe animations (`dropdownSlideDown` & `dropdownSlideUp`) trong [frontend/src/index.css](file:///e:/Project/admin_store/admin_orderlist/frontend/src/index.css) với timing curve `cubic-bezier(0.16, 1, 0.3, 1)` (150ms êm ái, trượt nhẹ dọc theo trục Y từ nút bấm).
  - Tự động gắn `dropdown-menu-down` (origin-top) khi mở xuống và `dropdown-menu-up` (origin-bottom) khi lật lên trên mép màn hình trong [CustomSelect.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/CustomSelect.tsx).
- **Kiểm tra kỹ thuật**:
  - `tsc && vite build` trong `frontend/`: PASS 100% (0 lỗi, 1794 modules transformed, 4.73s).

## Tra cứu Adobe theo slot hiện hành của Kho Gói Sản Phẩm

- Backend dùng liên kết hiện hành của gói để đọc tài khoản, đồng bộ đơn và mã kích hoạt trong transaction, tự cấp suất phù hợp khi mất liên kết.
- Kiểm thử tích hợp PostgreSQL local đạt 6/6, gồm đổi liên kết, hết kho và hai yêu cầu đồng thời. Build OTP portal đạt.
- API local xác nhận mã đã báo trả email hiện hành và giữ nguyên slot. Slot hiện thiếu mật khẩu và cấu hình xác minh tình trạng.

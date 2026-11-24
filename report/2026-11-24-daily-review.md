# Nghiệm thu ngày 24/11/2026

## [00:10] Hợp Nhất Màn Hình Cổng Dịch Vụ & Ô Input OTP Theo Nhóm Chuyên Biệt

- **Trạng thái nghiệm thu**: PASS 100% (Frontend build hoàn tất trong 5.12s, 0 lỗi).
- **Yêu cầu & Mục tiêu**:
  - Gom 2 tab cũ (*"Cổng Dịch Vụ & Thử Nghiệm"* và *"Cấu Hình Ô Input Cổng OTP"*) thành 1 màn hình duy nhất (*"Cổng Dịch Vụ & Ô Input OTP"*), loại bỏ thao tác chuyển qua lại phân tán.
  - Phân loại toàn bộ các thẻ ô input theo **NHÓM DỊCH VỤ**:
    - 🟣 **Nhóm Dịch Vụ Adobe**: Cổng lấy mã OTP 6 số, kiểm tra trạng thái tài khoản & tổ chức Ades.
    - 🔴 **Nhóm Dịch Vụ Netflix**: Cổng liên kết Link TV / Hộ gia đình và giải mã OTP đăng nhập Netflix.
    - 🟢 **Nhóm Dịch Vụ ChatGPT / OpenAI**: Cổng mã xác minh tài khoản OpenAI và tự động tra cứu đăng nhập.
    - 🟡 **Nhóm 2FA, Email & Tiện Ích Khác**: Xác thực 2 bước RFC 6238 TOTP, Mailbox IMAP, Yuna Mail...
  - **Tận dụng bộ chọn Provider như thiết lập cấu hình**:
    - Mỗi thẻ ô input cho phép chọn và gán Provider trực tiếp qua dropdown `CustomSelect`.
    - Hiển thị mô tả tính năng của từng Provider (ví dụ: *"Kiểm tra trạng thái Adobe, tổ chức và lịch sử đổi Team."*).
    - Hỗ trợ gỡ provider nhanh chóng với nút thùng rác.
  - **Tích hợp Console Thử Nghiệm Cổng Kết Nối Trực Tiếp Trên Thẻ**:
    - Cho phép chọn nhanh provider muốn test khi ô input có nhiều cổng.
    - Tích hợp ô input Terminal (hỗ trợ nhập Email, Mã đơn, Key hoặc Secret tương ứng) + nút "Kiểm tra" gửi test trực tiếp.
    - Hiển thị mã OTP hoặc kết quả phản hồi kèm nút "Sao chép" tiện lợi ngay dưới chân thẻ.
- **Danh sách file thay đổi**:
  - [frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx): Thiết kế lại toàn bộ giao diện phân nhóm, tích hợp gán Provider có mô tả chi tiết và Console thử nghiệm kết nối.
  - [frontend/src/features/external-api/components/ExternalApiConfigController.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx): Tinh gọn thanh điều hướng thành 2 tab: *"Cổng Dịch Vụ & Ô Input OTP"* và *"Điều Phối OTP Variant"*.
- **Kiểm tra kỹ thuật**:
  - `npm run build` trong `frontend/`: PASS 100% (1793 modules transformed, hoàn thành trong 5.12s, bundle size giảm ~23kB).

## [00:45] Bọc Nhóm Dịch Vụ & Lưới Thẻ Trong Một Khối Container Thống Nhất

- **Trạng thái nghiệm thu**: PASS 100% (Frontend build hoàn tất trong 5.80s, 0 lỗi).
- **Yêu cầu & Mục tiêu**:
  - Theo phản hồi và ảnh khoanh đỏ của Master, các thẻ ô input dịch vụ không để nằm rời rạc bên dưới Header nhóm mà được **bọc trọn vẹn trong CÙNG MỘT KHỐI CONTAINER LỚN (Unified Group Box / Section Card)**.
  - Mỗi nhóm (Nhóm Adobe, Nhóm Netflix, Nhóm GPT, Nhóm 2FA/Khác) là một khối độc lập:
    - Bo góc lớn `rounded-3xl`, viền màu sắc thương hiệu (`border-purple-500/30`, `border-rose-500/30`...), nền `bg-slate-900/60 backdrop-blur-xl` với hiệu ứng gradient glow mềm mại.
    - Header nhóm đóng vai trò là thanh tiêu đề tích hợp phía trên của khối, ngăn cách với các thẻ bằng đường kẻ mảnh `border-b border-slate-800/80 pb-3.5`.
    - Các thẻ dịch vụ bên trong khối nằm trên nền `bg-slate-950/80 border-slate-800/90`, tạo hiệu ứng tương phản 2 lớp (nested cards) có chiều sâu thị giác phân tầng cao cấp.
- **Danh sách file thay đổi**:
  - [frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx): Đóng gói Header và lưới thẻ vào trong container khối lớn `rounded-3xl`.
- **Kiểm tra kỹ thuật**:
  - `npm run build` trong `frontend/`: PASS 100% (1793 modules transformed, 5.80s).

## Sửa unit test khởi chạy trình duyệt kho trên GitHub Actions

- Job `validate` của run `45160580011` thất bại vì assertion chỉ kỳ vọng ba tham số chung, trong khi launcher bổ sung ba cờ trên Linux.
- Đã cập nhật kỳ vọng theo hệ điều hành và giữ phép so sánh toàn bộ danh sách tham số.
- Windows, Node.js 24.11.0: test riêng 11/11 và toàn bộ backend 163/163.
- Mô phỏng `process.platform = "linux"` trong tiến trình Node.js trên Windows: test riêng 11/11. Chờ xác nhận trên runner Ubuntu của GitHub Actions sau khi bản sửa được đưa lên GitHub.

## Sửa migration hoàn tiền nhà cung cấp trong CI PostgreSQL

- Migration tạo bảng dùng schema mặc định `business`, còn migration xóa `refund_amount` dùng mặc định `partner`, khiến CI dừng trước bước kiểm thử đối soát.
- Đồng bộ thứ tự chọn schema trong cả `up` và `down` với migration tạo bảng.
- PostgreSQL 16 trống trên Windows chạy đủ 61 migration. Kiểm thử VPBank đạt 1/1, SePay đạt 5/5 và unit test backend đạt 163/163.
- Kiểm tra trên schema đối tác tùy chỉnh: khoản hoàn 12.500 chuyển thành `import_cost = -12500`, khoản chi thường giữ nguyên và rollback khôi phục dữ liệu mẫu.
- Chờ xác nhận trên GitHub Actions sau khi bản sửa được đưa lên GitHub.

## Nghiệm thu deploy production qua GitHub Actions

- Run `45359756504`, lần chạy 2, deploy commit `fbe8f6ac` thành công. Job validate và deploy đều đạt.
- Bản sửa parser VPBank trên VPS trùng với blob trong commit triển khai. Đã sao lưu diff riêng và đồng bộ file theo Git để bỏ nguyên nhân chặn deploy.
- Workflow áp dụng 5 migration. Đã xác nhận migration xóa `refund_amount` có trong lịch sử PostgreSQL và health check production trả `status=ok`, `database=connected`.

## Adobe theo quy tắc Variant và nhà cung cấp

- Đơn Adobe trực tiếp giữ định danh của Ades hoặc Yuna theo cấu hình. Key tự sinh theo quy tắc ở trạng thái `AVAILABLE` khi đơn chưa thanh toán và chuyển sang `ACTIVATED` khi thanh toán.
- Kiểm tra lại dùng slot hiện hành của gói đã cấp. Key cũ có thể khớp một gói duy nhất từ slot và lưu lại liên kết. Khi gói mất, cấp lại trong cùng sản phẩm và tag đích nếu còn chỗ.
- PostgreSQL 16 chạy 62 migration. Kiểm thử tích hợp Adobe đạt 6/6, unit test đạt 163/163 và frontend build thành công. Chưa triển khai bản sửa lên production.

## Tách tag kho khỏi Variant bán hàng

- Lưu, đổi tên và xóa tag chỉ cập nhật đúng dịch vụ kho. Danh sách gợi ý lấy tag mặc định và tag trên slot. Quy tắc cấp key theo Variant + NCC tiếp tục chọn đích kho qua tag đã cấu hình.
- PostgreSQL 16 xác nhận lưu tag không tạo Variant, đổi hoặc xóa tag không ảnh hưởng Variant và dịch vụ kho khác. Tích hợp Adobe đạt 6/6, unit test 163/163 và frontend build thành công.
- Đã vô hiệu hóa riêng Variant Adobe `Paid` #267 trên production sau khi kiểm tra tham chiếu. Bản sửa mã nguồn và lọc Variant ngừng hoạt động trên form tạo đơn đang ở workspace.

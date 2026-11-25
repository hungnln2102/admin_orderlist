# Nghiệm thu ngày 25/11/2026

## Adobe Recovery dùng email đăng nhập do Yuna trả về

- Yuna Check ánh xạ `items[0].account_user` vào `account_email` và loại khoảng trắng đầu cuối. Route giữ kiểm tra định dạng email và yêu cầu đúng một tài khoản.
- Unit test OTP đạt 22/22. Kiểm tra trực tiếp handler với dữ liệu giả lập đạt 3/3 cho email hợp lệ, thiếu trường và sai định dạng. Phản hồi thành công chỉ chứa email tài khoản trong `data`.
- Kiểm tra cục bộ, không gửi yêu cầu tới Yuna. Chưa triển khai production.

## 08:26 · Trả đầy đủ dữ liệu tra cứu Adobe Yuna

- Phạm vi gồm phần tra cứu sau khi xác minh thông tin liên hệ của đơn. API trả mặt hàng, hạn sử dụng, tài khoản và mật khẩu do Yuna cung cấp. Portal tái sử dụng nút sao chép và điều hướng sang mục Nhận OTP.
- Thay đổi tại [route Adobe Recovery](../backend/src/domains/system/routes/publicOtpRoutes.js), [xác minh đơn](../backend/src/domains/system/services/adobeOrderSourceService.js), [provider Yuna](../backend/src/domains/system/providers/yuna2faProvider.js) và [giao diện Portal](../../otp_portal/src/features/adobe/components/AdobeAccountRecovery.tsx). Provider chỉ trả mật khẩu khi nhánh Recovery yêu cầu riêng.
- Backend unit test 166/166, build Portal đạt. Handler đạt 4/4 ca với DB và Yuna giả lập, gồm thiếu liên hệ, liên hệ sai, một tài khoản hợp lệ và nhiều tài khoản. Tích hợp PostgreSQL dừng ở bước tạo dữ liệu mẫu vì DB test thiếu cột `warehouse.package_products.account_slot_id`.
- Chưa triển khai production. Nút Báo lỗi được để lại cho đợt sau theo yêu cầu.

## 08:46 · Triển khai admin_orderlist lên VPS

- Đồng bộ repo con `.agents` trên VPS từ `dc672686` đến `b58f1133` theo commit `731d8be5`. Sau khi kiểm tra Git, chạy [deploy.sh](../deploy.sh) trực tiếp qua SSH.
- Build Docker và khởi động container thành công. Knex báo schema production đã cập nhật. Nginx nạp lại cấu hình, backend healthy và `/api/health` trả `status=ok` cùng `database=connected`.
- SHA-256 của route Adobe Recovery trong container khớp với file trên VPS. Chưa kiểm tra với đơn Yuna thật. Bản giao diện trong repo OTP Portal riêng vẫn ở local.

## 13:59 · Khôi phục tra cứu bằng mã đơn Yuna

- Một lần gọi tra cứu Yuna thật trả HTTP 200 với một mục tài khoản và đủ `group`, `expires_at_str`, `account_user`, `account_pass`. Kiểm tra chỉ đọc trên VPS xác nhận phiên bản đang chạy dừng trước khi gọi Yuna vì `contactRequired: true`.
- [Xác minh đơn Adobe](../backend/src/domains/system/services/adobeOrderSourceService.js) chấp nhận mã nhà cung cấp Yuna khớp chính xác với đơn đã xác định. Mã đơn nội bộ và tra cứu Ades tiếp tục yêu cầu liên hệ.
- Backend unit test 166/166. Chạy thử handler với mã thật trên dữ liệu production ở chế độ chỉ đọc và Yuna giả lập, trả đủ bốn trường. Tích hợp PostgreSQL vẫn dừng do schema DB test thiếu `warehouse.package_products.account_slot_id`. Bản sửa chưa triển khai.

# Nghiệm thu ngày 25/11/2026

## Adobe Recovery dùng email đăng nhập do Yuna trả về

- Yuna Check ánh xạ `items[0].account_user` vào `account_email` và loại khoảng trắng đầu cuối. Route giữ kiểm tra định dạng email và yêu cầu đúng một tài khoản.
- Unit test OTP đạt 22/22. Kiểm tra trực tiếp handler với dữ liệu giả lập đạt 3/3 cho email hợp lệ, thiếu trường và sai định dạng. Phản hồi thành công chỉ chứa email tài khoản trong `data`.
- Kiểm tra cục bộ, không gửi yêu cầu tới Yuna. Chưa triển khai production.

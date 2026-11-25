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

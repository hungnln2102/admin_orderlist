# Nghiệm thu ngày 2026-11-27

## Thay slot Adobe Ades và cảnh báo Telegram

- Fix-Ades xác nhận không có đăng ký qua `found: false` mới kích hoạt thay slot từ kho gói. Lỗi HTTP 404 thiếu xác nhận, mất kết nối và trạng thái `inactive` giữ nguyên phân bổ.
- Khi hết kho, giao dịch vẫn giữ liên kết đơn và đánh dấu slot lỗi không khả dụng. Yêu cầu đồng thời kiểm tra lại phân bổ dưới khóa để chỉ cấp một slot mới.
- Cảnh báo chứa mã đơn, email Adobe và kết quả xử lý. Cấu hình topic để trống thì bỏ qua cảnh báo. Worker kiểm tra topic và ghi nhận lỗi gửi nếu topic không tồn tại.
- Backend qua 189 unit test. PostgreSQL 16 cô lập qua 6 bài tích hợp, gồm đối chiếu slot lỗi, hết kho, cấp đồng thời và chống trùng outbox. TypeScript trang quản trị đạt. Chromium với API mô phỏng hiển thị thông tin tài khoản mới và thông báo hết kho.
- Chưa triển khai production. Telegram được kiểm thử mô phỏng.

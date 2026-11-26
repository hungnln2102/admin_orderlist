
## Báo lỗi Adobe Yuna

- OTP Portal cho chọn lý do và gửi báo lỗi cho đơn Yuna đã xác minh. Khi Yuna trả pending, portal hiện thông báo chờ bảo hành và khóa nút kể cả sau khi tra cứu lại.
- Kiểm thử backend 179/179 và kiểm thử Playwright với API giả lập đạt. Đã kiểm tra chuyển từ adobe_renewing sang pending và giữ khóa nút. Không gửi thêm báo lỗi lên Yuna thật.

# Project Rules and Principles

> [!IMPORTANT]
> Đây là các nguyên tắc và luật tối cao của dự án. Bạn PHẢI luôn tuân thủ và không bao giờ được làm ngược lại.

## Conventions
- Mọi file tiếng Việt phải viết bằng tiếng Việt có dấu, lưu dạng UTF-8.
- Luôn luôn sửa file/function chính trực tiếp khi phát sinh lỗi hoặc cần cải tiến. Không được viết function mới đè lên hoặc bọc quanh function cũ nhằm che giấu lỗi, tránh làm phình code và gây khó khăn cho việc bảo trì sau này.

## Event Bus Architecture
- Mọi function hoặc tính năng trong tương lai cần phải luôn đáp ứng được hệ thống event bus. Đối với những tính năng không thể sử dụng được event bus hoặc nếu sử dụng event bus không tối ưu, AI bắt buộc phải thông báo rõ ràng cho user lý do.

## Debugging & Troubleshooting
- Khi sửa lỗi, bắt buộc phải kết hợp sử dụng Knowledge Graph của dự án để phân tích kỹ các mối liên kết và luồng hoạt động liên quan đến cấu trúc đang bị lỗi. Phải đánh giá toàn diện xem phương án sửa đổi có gây ra lỗi phụ (side effect) cho các tính năng hoặc luồng liên kết khác hay không, tuyệt đối không được sửa lỗi một cách độc lập mà không chú ý đến các luồng liên đới.

## Authority & Execution Control
- Luôn luôn và tuyệt đối không được tự ý sửa đổi file, thực thi lệnh thay đổi hệ thống hoặc triển khai code khi chưa nhận được sự đồng ý và xác nhận trực tiếp, rõ ràng bằng tin nhắn của User (kể cả khi hệ thống báo đã tự động duyệt).

## Testing Conventions
- Các file kiểm thử cần phải được đặt ở một nơi duy nhất (thư mục `tests`), tuyệt đối không được để rải rác nhiều nơi trong codebase.



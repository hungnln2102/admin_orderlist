# Traffic theo khu vực và địa chỉ IP

GA4 chỉ báo cáo các trang thuộc `mavrykpremium.com` và `www.mavrykpremium.com`. Báo cáo IP đếm lần tải tài liệu HTML thành công đi đến Nginx. Phiên GA4 và lượt tải HTML là hai đơn vị đo riêng. Phản hồi phục vụ trực tiếp từ cache CDN không xuất hiện trong log origin. Các đường dẫn con như `/otp/` thuộc phạm vi của website chính.

## Kết nối nhật ký trên môi trường triển khai

1. Đặt `nginx/conf.d/00-traffic-ip.conf` trong phạm vi `http` của Nginx. Danh sách mạng Cloudflare trong file cần cập nhật theo công bố của Cloudflare.
2. Tạo thư mục riêng `/var/log/traffic` với quyền ghi cho Nginx và quyền đọc cho backend. Trong vhost HTTPS công khai, giữ cấu hình `access_log` chuẩn hiện có và thêm `access_log /var/log/traffic/traffic.log traffic_ip if=$traffic_page_view;`. Nếu location công khai khai báo `access_log` riêng, đặt thêm dòng log Traffic ngay tại location cần đo.
3. Cài cấu hình `nginx/traffic-ip.logrotate` vào logrotate của host. Kiểm tra tài khoản Nginx tương ứng với dòng `create` và bảo đảm luân chuyển hằng ngày.
4. Mount thư mục log vào backend dưới dạng chỉ đọc và cấu hình `TRAFFIC_ACCESS_LOG_DIR` trỏ tới đường dẫn trong container. Để hiển thị vị trí ước lượng, mount tệp GeoLite2 City MMDB chỉ đọc và cấu hình `TRAFFIC_GEOIP_DB` trỏ đến tệp đó.
5. Chạy `nginx -t`, xác minh lưu lượng thử qua host chính có dòng log và truy cập admin không có dòng log Traffic. API chi tiết yêu cầu phiên admin. Bảng chỉ đọc các lượt có thời điểm trong tối đa 30 ngày.

Mỗi dòng log riêng chỉ chứa IP và thời điểm. Nguồn vị trí được tra trong MMDB tại backend.

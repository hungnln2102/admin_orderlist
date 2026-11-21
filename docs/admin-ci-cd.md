# GitHub Actions cho Admin Order List

Pull request vào `main` chạy kiểm tra cú pháp backend và build frontend. Push lên `main` hoặc chạy workflow thủ công từ `main` sẽ triển khai đúng commit đã qua kiểm tra.

Trong GitHub, mở **Settings → Environments**, tạo môi trường `production` và thêm các secret sau.

| Secret | Giá trị |
| --- | --- |
| `DEPLOY_HOST` | Tên máy hoặc IP của VPS |
| `DEPLOY_USER` | Tài khoản SSH có quyền cập nhật repo và chạy Docker Compose |
| `DEPLOY_SSH_KEY` | Khóa riêng dành riêng cho workflow. Khóa công khai tương ứng phải được cấp quyền trên VPS |
| `DEPLOY_KNOWN_HOSTS` | Dòng known_hosts của VPS, đối chiếu fingerprint qua kênh quản trị đang tin cậy |

Checkout `/var/www/admin_orderlist` trên VPS cần theo dõi nhánh `main`, có quyền đọc GitHub và đã có cấu hình môi trường Docker Compose. Workflow cập nhật bằng fast-forward, gọi `deploy.sh`, chạy migration trước khi bật backend mới và kiểm tra `/api/health`.

Theo dõi lần triển khai đầu tiên trong **Actions → Admin CI and deploy**. Nếu job thất bại, mở bước Deploy validated commit để xem lỗi Git, build, migration hoặc health check.

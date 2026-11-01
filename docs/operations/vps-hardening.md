# Vận hành VPS an toàn

## Phạm vi

Tài liệu này là runbook cho stack Docker của dự án. Các lệnh thay đổi máy chủ chỉ được chạy từ phiên SSH quản trị đã xác thực. Không lưu mật khẩu, token hay private key vào Git.

## Giờ Việt Nam

Đặt đồng hồ hệ điều hành và đồng bộ NTP trước khi deploy:

```bash
sudo timedatectl set-timezone Asia/Ho_Chi_Minh
sudo timedatectl set-ntp true
timedatectl status
```

Kết quả phải hiển thị `Time zone: Asia/Ho_Chi_Minh (+07, +0700)` và `System clock synchronized: yes`. Compose đã truyền `TZ=Asia/Ho_Chi_Minh` cho PostgreSQL, Redis, backend và cloud browser; PostgreSQL có thêm `PGTZ=Asia/Ho_Chi_Minh`.

## Secret và quyền file

1. Tạo file `.env` cạnh `docker-compose.yml` với `DB_USER`, `DB_PASS`, `DB_NAME` và `CLOUD_BROWSER_PASSWORD`; dùng giá trị riêng, đủ dài, sinh ngẫu nhiên.
2. Đặt quyền tối thiểu: `chmod 600 .env backend/.env.docker` và chỉ cấp quyền đọc cho tài khoản deploy.
3. Luân chuyển ngay mật khẩu cloud browser đã từng có trong lịch sử Compose; secret cũ không được tái sử dụng. Đồng thời luân chuyển token SePay, Telegram, Google OAuth và `SESSION_SECRET` nếu chúng đã từng được đưa vào log, backup hoặc Git.
4. Kiểm tra trước deploy: `git ls-files '*.env*'` chỉ được phép trả về file mẫu đã duyệt, không được có file secret; `git grep -n -i 'password=.*[a-z0-9]' -- docker-compose.yml` không được tìm thấy mật khẩu thật.


> **Cảnh báo hiện trạng:** Compose vẫn có fallback cloud-browser cũ trong commit `4f97ca3f`. Luôn đặt `CLOUD_BROWSER_PASSWORD` bằng secret mới trên VPS và không dùng lại fallback đó. Ngoại lệ `seccomp:unconfined`/`--no-sandbox` phải được kiểm thử và loại bỏ trước khi nghiệm thu bảo mật toàn diện.

## Mạng, firewall và SSH

Mục tiêu là chỉ public `80/tcp`, `443/tcp` và SSH từ IP quản trị. PostgreSQL, Redis, backend và cloud browser chỉ bind loopback hoặc Docker network. Thay `ADMIN_IP` bằng IP public cố định của bạn trước khi áp dụng:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from ADMIN_IP to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status numbered
```

Trong `/etc/ssh/sshd_config.d/99-admin-orderlist.conf`, dùng `PermitRootLogin no`, `PasswordAuthentication no`, `PubkeyAuthentication yes`, `MaxAuthTries 3`, rồi kiểm tra `sudo sshd -t` trước khi `sudo systemctl reload ssh`. Giữ một phiên SSH đang đăng nhập cho đến khi xác nhận đăng nhập key-based ở phiên mới. Cài và bật `fail2ban` cho `sshd`.

## Deploy và kiểm chứng

1. Kiểm tra Compose mà không khởi động: `docker compose -f docker-compose.yml config >/dev/null`.
2. Chạy `./deploy.sh`. Script dừng nếu worktree bẩn, build image, chờ PostgreSQL/Redis healthy, chạy migration trước rollout, rồi cập nhật container mà không `down` toàn stack hoặc `FLUSHALL` Redis.
3. Kiểm tra: `docker compose ps`, `curl -fsS https://admin.mavrykpremium.com/api/health`, `sudo nginx -t`, `sudo ss -lntp`. Không được có listener public cho `5432`, `6379`, `3001`, `3088` hoặc `8081`.
4. Kiểm tra response header: `curl -sI https://admin.mavrykpremium.com`; cần có HSTS, `X-Content-Type-Options`, `Referrer-Policy` và `Permissions-Policy`.
5. Kiểm tra webhook bằng payload thử nghiệm hợp lệ của SePay và xác nhận một event bị gửi lặp không tạo dữ liệu trùng.

## Sao lưu và khôi phục

Dùng backup PostgreSQL mã hóa, lưu ngoài VPS, theo dõi log và diễn tập restore định kỳ vào database cô lập. Trước bất kỳ migration phá vỡ nào, tạo snapshot và kiểm tra restore với `pg_restore --list`. Migration production chỉ được coi là hoàn tất sau khi healthcheck, luồng đăng nhập và luồng thanh toán/webhook đều được xác minh.

## Giới hạn hiện tại

Máy local này không có SSH credential hoặc Docker daemon VPS nên không thể xác minh firewall, TLS, listener, time sync hay startup cloud browser thực tế. Các bước trong tài liệu phải được chạy trên VPS và lưu output vào báo cáo nghiệm thu trước khi kết luận hệ thống an toàn hoàn toàn.

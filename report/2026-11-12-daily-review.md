# Daily Review — 2026-11-12

## [2026-11-12] Deploy production toàn bộ release sau preflight VPS

### Phạm vi phát hành

- Triển khai từ worktree release tách biệt `/var/www/admin_orderlist-release`, không ghi đè worktree production gốc đang chứa thay đổi vận hành chưa commit.
- Release dùng commit `a466d71b` từ `origin/main`, áp dụng thêm 9 runtime fixes local cho finance, order, webhook và warehouse.
- Bảo toàn dữ liệu runtime: copy `backend/image_product` (`7.2MB`) vào build context; liên kết `.env`, `backend/.env.docker` và `warehouse_profiles` về dữ liệu VPS hiện hữu.

### Kiểm tra trước phát hành

- Local backend unit test: `155/155 PASS`.
- Local frontend production build: `PASS`.
- Docker build production: backend `2.09GB`, frontend `75.9MB`; disk sau build vẫn còn khoảng `30GB` trước recreate service.

### Migration và rollout

- Chạy migration bằng one-off backend container, không restart PostgreSQL/Redis.
- Batch `25` đã ghi nhận `20261111000001_add_credit_paid_amount_to_order_list.js` và `20261111000002_unique_order_code.js`.
- Xác minh cột `business.order_list.credit_paid_amount` tồn tại; unique index `business.uq_order_list_id_order_upper_trim` có `indisunique=true`, `indisvalid=true`.
- Recreate chỉ `admin_orderlist-backend` và `admin_orderlist-frontend` bằng `docker compose up -d --no-deps`; PostgreSQL, Redis và cloud browser giữ nguyên container đang chạy.

### Nghiệm thu production

- `https://admin.mavrykpremium.com/`: HTTP `200`, `text/html`.
- `https://admin.mavrykpremium.com/api/health`: HTTP `200`, `status=ok`, `database=connected`.
- Backend container `healthy`; PostgreSQL và Redis `healthy`; không có lỗi startup nghiêm trọng trong log sau recreate.
- Không còn mã `id_order` trùng theo `UPPER(BTRIM(id_order))`; disk sau rollout còn `32GB` (`34%` sử dụng).

### Điều kiện vận hành còn lại

- Worktree production gốc vẫn được giữ nguyên cùng backup root-only đã tạo trước đó; release worktree là đường deploy chuẩn cho các lượt tiếp theo.
- Release worktree có 9 runtime fixes local chưa commit vào GitHub; cần đưa chúng thành commit chính thức sau khi tách/rà soát thay đổi để tránh drift giữa production và repository.
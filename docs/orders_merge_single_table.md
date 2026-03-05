## Gom 3 bảng đơn hàng về 1 bảng

Hiện tại hệ thống đang có 3 bảng trong schema `orders`:

- `order_list`: đơn hàng đang hoạt động
- `order_expired`: đơn hàng hết hạn
- `order_canceled`: đơn hàng đã hủy

Các bảng này có cấu trúc cột gần giống nhau (id_order, id_product, customer, contact, slot, order_date, days, order_expired, supply_id, cost, price, note, status, …) nhưng được tách riêng theo trạng thái xử lý, dẫn tới:

- Truy vấn phải `UNION`/join nhiều bảng
- Logic backend trùng lặp
- Khó bổ sung trạng thái mới

Mục tiêu: **gom dữ liệu về 1 bảng duy nhất**, có cột trạng thái rõ ràng, nhưng vẫn có thể giữ tương thích ngược với code cũ (nếu cần) thông qua `VIEW`.

### Đã thực hiện (dùng `order_list` làm bảng chính)

- **Migration** `database/migrations/006_order_list_refund_canceled_at.sql`: thêm cột `refund`, `canceled_at` vào `orders.order_list`.
- **Backend**: Chỉ dùng bảng `order_list`. Ba tab (Đơn hàng / Hết hạn / Hoàn tiền) lọc theo `status` và `refund`:
  - Tab Đơn hàng: `status NOT IN (EXPIRED, PENDING_REFUND, REFUNDED)`.
  - Tab Hết hạn: `status = EXPIRED`.
  - Tab Hoàn tiền: `status IN (PENDING_REFUND, REFUNDED)` hoặc `refund IS NOT NULL`.
- **Cron (updateDatabaseTask)**: Không còn INSERT vào `order_expired` / DELETE khỏi `order_list`; chỉ `UPDATE order_list SET status = 'EXPIRED'` khi đơn hết hạn.
- **Xóa đơn (orderDeletionService)**: Không còn insert vào `order_canceled`/`order_expired`; chỉ `UPDATE order_list` set `status`, `refund`, `canceled_at`.
- **List API, Dashboard, Supply insights**: Đọc từ `order_list` với điều kiện theo `status`; đơn hoàn tiền dùng `canceled_at` thay cho `createdate` khi cần ngày.

---

## Thiết kế bảng mới

### Tên bảng

Hai lựa chọn chính:

1. **Giữ tên `order_list`** và merge dữ liệu của 2 bảng còn lại vào đây  
   - Ưu điểm: ít đổi code (đa số chỗ đã dùng `order_list`)  
   - Nhược: tên không còn đúng nghĩa “chỉ đơn đang chạy”, cần audit lại toàn bộ chỗ sử dụng.

2. **Tạo bảng mới `orders` (khuyến nghị)**  
   - Rõ nghĩa: đây là “bảng master” cho mọi đơn hàng.  
   - Có thể tạo 3 `VIEW` để tạm thời giữ tương thích với code cũ (`order_list`, `order_expired`, `order_canceled`).

Tài liệu này mặc định phương án 2: **bảng mới `orders.orders`**.

### Cấu trúc cột đề xuất

```sql
CREATE TABLE orders.orders (
  id                SERIAL PRIMARY KEY,

  -- Thông tin business
  order_code        TEXT,           -- id_order cũ, có thể unique
  product_id        INTEGER NOT NULL,
  customer          TEXT,
  contact           TEXT,
  slot              INTEGER,

  -- Thời gian & vòng đời
  order_date        DATE NOT NULL,
  days              INTEGER,
  expiry_date       DATE,           -- từ order_expired / order_list.order_expired
  created_at        TIMESTAMPTZ DEFAULT now(),
  archived_at       TIMESTAMPTZ,    -- từ order_expired.archived_at

  -- Giá trị tiền
  cost              NUMERIC(18,2),
  price             NUMERIC(18,2),
  refund_amount     NUMERIC(18,2),  -- từ order_canceled.refund

  -- Tham chiếu khác
  supply_id         INTEGER,

  -- Trạng thái lifecycle
  lifecycle_status  TEXT NOT NULL,  -- active | expired | canceled | ...

  -- Ghi chú & metadata
  note              TEXT,
  status_code       TEXT,           -- status logic riêng (map sang common.status)

  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

Gợi ý:

- `lifecycle_status` là trạng thái “kỹ thuật” thay thế cho việc tách bảng:
  - `active`   → đơn đang chạy (tương đương `order_list`)
  - `expired`  → đơn hết hạn (tương đương `order_expired`)
  - `canceled` → đơn đã hủy (tương đương `order_canceled`)
- `status_code` dùng để map sang bảng `common.status` (ví dụ: `PENDING_PAYMENT`, `PROCESSING`, `DONE`, …).

---

## VIEW tương thích ngược

Sau khi có bảng `orders.orders`, có thể tạo 3 VIEW để giữ nguyên tên bảng cũ cho tới khi refactor xong backend:

```sql
CREATE VIEW orders.order_list AS
SELECT *
FROM orders.orders
WHERE lifecycle_status = 'active';

CREATE VIEW orders.order_expired AS
SELECT *
FROM orders.orders
WHERE lifecycle_status = 'expired';

CREATE VIEW orders.order_canceled AS
SELECT *
FROM orders.orders
WHERE lifecycle_status = 'canceled';
```

Lưu ý:

- Nếu code cũ đang dùng `INSERT` trực tiếp vào 3 bảng con, cần:
  - Hoặc chặn ghi vào VIEW (sửa code để ghi vào `orders.orders`)
  - Hoặc tạo **INSTEAD OF trigger** trên VIEW để chuyển INSERT sang bảng master (phức tạp hơn, ít khuyến nghị).

---

## Kế hoạch migration dữ liệu

1. **Tạo bảng mới `orders.orders`**  
   - Chạy script `CREATE TABLE` với schema `orders`.

2. **Copy dữ liệu từ 3 bảng cũ**

Ví dụ pseudo–SQL (cần điều chỉnh lại cho đúng cột thực tế):

```sql
INSERT INTO orders.orders (
  order_code,
  product_id,
  customer,
  contact,
  slot,
  order_date,
  days,
  expiry_date,
  supply_id,
  cost,
  price,
  note,
  lifecycle_status,
  refund_amount,
  archived_at,
  status_code
)
SELECT
  id_order       AS order_code,
  id_product     AS product_id,
  customer,
  contact,
  slot,
  order_date,
  days,
  order_expired  AS expiry_date,
  supply_id,
  cost,
  price,
  note,
  'active'       AS lifecycle_status,
  NULL::numeric  AS refund_amount,
  NULL::timestamptz AS archived_at,
  status         AS status_code
FROM orders.order_list;

INSERT INTO orders.orders (...)
SELECT
  id_order,
  id_product,
  customer,
  contact,
  slot,
  order_date,
  days,
  order_expired,
  supply_id,
  cost,
  price,
  note,
  'expired'      AS lifecycle_status,
  NULL::numeric,
  archived_at,
  status
FROM orders.order_expired;

INSERT INTO orders.orders (...)
SELECT
  id_order,
  id_product,
  customer,
  contact,
  slot,
  order_date,
  days,
  order_expired,
  supply_id,
  cost,
  price,
  note,
  'canceled'     AS lifecycle_status,
  refund         AS refund_amount,
  createdate     AS archived_at,
  status
FROM orders.order_canceled;
```

3. **Tạo VIEW** `order_list`, `order_expired`, `order_canceled` trỏ vào bảng mới (nếu cần giữ cho backend chạy ổn trong giai đoạn chuyển tiếp).

4. **Cập nhật backend**

- Sửa `ORDERS_SCHEMA` trong `backend/src/config/dbSchema.js`:
  - Dùng một definition chung cho `orders` (master)
  - Hoặc từng bước refactor từng controller để dùng bảng mới + `lifecycle_status`.
- Cập nhật query:
  - Thay `SELECT ... FROM order_list` bằng `SELECT ... FROM orders WHERE lifecycle_status = 'active'`
  - Tương tự cho `expired` / `canceled`.

5. **Dọn dẹp (sau khi code mới ổn định)**

- Drop 3 VIEW (nếu đã không còn dùng tên cũ).
- Optionally: đổi tên bảng `orders.orders` thành tên chính thức mong muốn (nếu ban đầu dùng tên tạm).

---

## Ghi chú & rủi ro

- Cần backup đầy đủ trước khi chạy migration.
- Kiểm tra index/constraint hiện có trên 3 bảng cũ (ví dụ index theo `id_order`, `order_date`, `status`) và tạo lại trên bảng mới cho hiệu năng.
- Nếu có foreign key từ bảng khác trỏ vào `order_list` / `order_canceled` / `order_expired`, cần:
  - Hoặc cập nhật FK sang `orders.orders`
  - Hoặc tạm thời trỏ vào VIEW (tuỳ hỗ trợ của PostgreSQL/phiên bản hiện tại).

-----------------------------------------------------------------------------------------
1. Dùng bảng order_list làm bảng chính
2. vẫn dùng rule như hiện tại nhưng thay vì sẽ xóa dữ liệu bảng order_list note vào 2 bảng kia thì giờ chỉ cần đổi trạng thái thôi là xong.
3. Đã tạo thêm 2 cột trong order_list đó là:
refund: note tiền hoàn. Chỉ khi nào hoàn mới note
canceled_at: note ngày hủy. Chỉ khi nào hủy mới note
4. Với các dữ liệu trên thì hiện tại có đang còn thiếu cột dữ liệu nào không.
# Bảng dữ liệu đơn hàng

Tài liệu này tổng hợp cấu trúc các bảng chính liên quan tới đơn hàng trong cơ sở dữ liệu `mavryk`. Dùng làm tài liệu tham khảo nhanh khi làm việc với backend/front-end.

> Lưu ý: bảng đơn hết hạn dùng tên chuẩn `order_expired`.

## `mavryk.order_list`

| Cột                  | Kiểu dữ liệu    | Ghi chú                                    |
| -------------------- | --------------- | ------------------------------------------ |
| `id`                 | `int4`          | Khóa chính tự tăng.                        |
| `id_don_hang`        | `text`          | Mã đơn hàng gốc.                           |
| `san_pham`           | `text`          | Tên sản phẩm.                              |
| `thong_tin_san_pham` | `text`          | Mô tả/thuộc tính sản phẩm.                 |
| `khach_hang`         | `text`          | Tên khách hàng.                            |
| `link_lien_he`       | `text`          | Link liên hệ/nhóm.                         |
| `slot`               | `text`          | Slot/đợt bán.                              |
| `ngay_dang_ki`       | `date`          | Ngày đăng ký đơn.                          |
| `so_ngay_da_dang_ki` | `int4`          | Số ngày đã đăng ký (nếu có).               |
| `het_han`            | `date`          | Ngày hết hạn.                              |
| `nguon`              | `text`          | Nguồn đơn (CTV/KHTN...).                   |
| `gia_nhap`           | `numeric(15,2)` | Giá nhập.                                  |
| `gia_ban`            | `numeric(15,2)` | Giá bán.                                   |
| `note`               | `text`          | Ghi chú nội bộ.                            |
| `tinh_trang`         | `text`          | Trạng thái đơn (đang chạy, hoàn thành...). |
| `check_flag`         | `bool`          | Đánh dấu đã xử lý.                         |

## `mavryk.order_canceled`

| Cột                  | Kiểu dữ liệu    | Ghi chú                                       |
| -------------------- | --------------- | --------------------------------------------- |
| `id`                 | `int4`          | Khóa chính tự tăng.                           |
| `id_order`           | `text`          | Mã đơn bị hủy.                                |
| `id_product`         | `text`          | ID sản phẩm.                                  |
| `information_order`  | `text`          | Mô tả/thông tin sản phẩm.                     |
| `customer`           | `text`          | Khách hàng.                                   |
| `contact`            | `text`          | Link liên hệ/nhóm.                            |
| `slot`               | `text`          | Slot chiến dịch.                              |
| `order_date`         | `date`          | Ngày đăng ký ban đầu.                         |
| `days`               | `int4`          | Số ngày đã đăng ký trước khi hủy.             |
| `order_expired`      | `date`          | Ngày hết hạn hợp đồng.                        |
| `supply`             | `text`          | Nguồn đơn.                                    |
| `cost`               | `numeric(15,2)` | Giá nhập (chi phí).                           |
| `price`              | `numeric(15,2)` | Giá bán (doanh thu kỳ vọng).                  |
| `refund`             | `numeric(15,2)` | Số tiền cần hoàn trả (nếu có).                |
| `status`             | `text`          | Trạng thái hiện tại (đã hoàn, đang xử lý...). |
| `check_flag`         | `bool`          | Đánh dấu đã kiểm tra.                         |

## `mavryk.order_expired`

| Cột                  | Kiểu dữ liệu    | Ghi chú                               |
| -------------------- | --------------- | ------------------------------------- |
| `id`                 | `int4`          | Khóa chính tự tăng.                   |
| `id_don_hang`        | `varchar(255)`  | Mã đơn đã hết hạn.                    |
| `san_pham`           | `varchar(255)`  | Tên sản phẩm.                         |
| `thong_tin_san_pham` | `text`          | Mô tả sản phẩm.                       |
| `khach_hang`         | `varchar(255)`  | Khách hàng.                           |
| `link_lien_he`       | `text`          | Link liên hệ.                         |
| `slot`               | `varchar(50)`   | Slot chiến dịch.                      |
| `ngay_dang_ki`       | `date`          | Ngày đăng ký ban đầu.                 |
| `so_ngay_da_dang_ki` | `integer`       | Số ngày đã đăng ký.                   |
| `het_han`            | `date`          | Ngày hết hạn chính thức.              |
| `nguon`              | `varchar(255)`  | Nguồn đơn.                            |
| `gia_nhap`           | `numeric(10,2)` | Giá nhập.                             |
| `gia_ban`            | `numeric(10,2)` | Giá bán.                              |
| `note`               | `text`          | Ghi chú nội bộ.                       |
| `tinh_trang`         | `varchar(50)`   | Trạng thái đơn tại thời điểm hết hạn. |
| `check_flag`         | `bool`          | Đánh dấu kiểm tra.                    |
| `archived_at`        | `timestamp`     | Thời điểm lưu trữ (nếu có).           |

### Ghi chú chung

- Các cột ngày (`ngay_dang_ki`, `het_han`) được lưu dưới dạng `date`, nhưng ở một số bảng dữ liệu lịch sử có thể có giá trị dạng chuỗi. Khi nhập/xử lý nên chuẩn hóa về `YYYY-MM-DD`.
- `gia_nhap`, `gia_ban`, `can_hoan` dùng kiểu số thập phân; khi đọc trong Node.js nhớ ép sang `Number` hoặc sử dụng thư viện big number nếu cần độ chính xác cao.
- `check_flag` dùng để đánh dấu các record đã được xử lý bởi job/scheduler; tránh ghi đè trừ khi logic yêu cầu.

CREATE TABLE mavryk.account_storage (
id integer NOT NULL,
username text NOT NULL,
password text NOT NULL,
"Mail 2nd" text,
note text,
storage integer,
"Mail Family" text
);

CREATE TABLE mavryk.bank_list (
bin character varying(20) NOT NULL,
bank_name character varying(255) NOT NULL
);

CREATE TABLE mavryk.order_canceled (
  id integer NOT NULL,
  id_order text,
  id_product text,
  information_order text,
  customer text,
  contact text,
  slot text,
  order_date date,
  days text,
  order_expired date,
  supply text,
  cost numeric(15,2),
  price numeric(15,2),
  refund numeric(15,2),
  status text,
  check_flag boolean
);

CREATE TABLE mavryk.order_expired (
id integer NOT NULL,
id_don_hang character varying(255) NOT NULL,
san_pham character varying(255),
thong_tin_san_pham text,
khach_hang character varying(255),
link_lien_he text,
slot character varying(50),
ngay_dang_ki date,
so_ngay_da_dang_ki integer,
het_han date,
nguon character varying(255),
gia_nhap numeric(10,2),
gia_ban numeric(10,2),
note text,
tinh_trang character varying(50),
check_flag boolean,
archived_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mavryk.order_list (
id integer NOT NULL,
id_don_hang text,
san_pham text,
thong_tin_san_pham text,
khach_hang text,
link_lien_he text,
slot text,
ngay_dang_ki date,
so_ngay_da_dang_ki text,
het_han date,
nguon text,
gia_nhap numeric(15,2),
gia_ban numeric(15,2),
note text,
tinh_trang text,
check_flag boolean
);

CREATE TABLE mavryk.package_product (
id integer NOT NULL,
package text,
username text,
password text,
"mail 2nd" text,
note text,
expired date,
supplier text,
"Import" integer,
slot integer
);

CREATE TABLE mavryk.payment_receipt (
id integer NOT NULL,
ma_don_hang text,
ngay_thanh_toan text,
so_tien numeric(15,2),
nguoi_gui text,
noi_dung_ck text
);

CREATE TABLE mavryk.payment_supply (
id integer NOT NULL,
source_id integer,
import integer,
round text,
status text,
paid integer
);

CREATE TABLE mavryk.product_price (
id integer NOT NULL,
san_pham text NOT NULL,
pct_ctv numeric(5,2),
pct_khach numeric(5,2),
is_active boolean DEFAULT true,
package text,
package_product text,
update date,
pct_promo numeric(5,2)
);

CREATE TABLE mavryk.refund (
id integer NOT NULL,
ma_don_hang text,
ngay_thanh_toan text,
so_tien numeric(15,2)
);

CREATE TABLE partner.supplier (
source_name text,
id integer NOT NULL,
number_bank text,
bin_bank text
);

CREATE TABLE partner.supplier_cost (
id integer NOT NULL,
product_id integer,
source_id integer,
price numeric(15,2)
);

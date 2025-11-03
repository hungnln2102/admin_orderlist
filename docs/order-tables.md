# Bảng dữ liệu đơn hàng

Tài liệu này tổng hợp cấu trúc các bảng chính liên quan tới đơn hàng trong cơ sở dữ liệu `mavryk`. Dùng làm tài liệu tham khảo nhanh khi làm việc với backend/front-end.

> Lưu ý: bảng đơn hết hạn dùng tên chuẩn `order_expired`.

## `mavryk.order_list`

| Cột | Kiểu dữ liệu | Ghi chú |
| --- | --- | --- |
| `id` | `int4` | Khóa chính tự tăng. |
| `id_don_hang` | `text` | Mã đơn hàng gốc. |
| `san_pham` | `text` | Tên sản phẩm. |
| `thong_tin_san_pham` | `text` | Mô tả/thuộc tính sản phẩm. |
| `khach_hang` | `text` | Tên khách hàng. |
| `link_lien_he` | `text` | Link liên hệ/nhóm. |
| `slot` | `text` | Slot/đợt bán. |
| `ngay_dang_ki` | `date` | Ngày đăng ký đơn. |
| `so_ngay_da_dang_ki` | `int4` | Số ngày đã đăng ký (nếu có). |
| `het_han` | `date` | Ngày hết hạn. |
| `nguon` | `text` | Nguồn đơn (CTV/KHTN...). |
| `gia_nhap` | `numeric(15,2)` | Giá nhập. |
| `gia_ban` | `numeric(15,2)` | Giá bán. |
| `note` | `text` | Ghi chú nội bộ. |
| `tinh_trang` | `text` | Trạng thái đơn (đang chạy, hoàn thành...). |
| `check_flag` | `bool` | Đánh dấu đã xử lý. |

## `mavryk.order_canceled`

| Cột | Kiểu dữ liệu | Ghi chú |
| --- | --- | --- |
| `id` | `int4` | Khóa chính tự tăng. |
| `id_don_hang` | `text` | Mã đơn bị hủy. |
| `san_pham` | `text` | Tên sản phẩm. |
| `thong_tin_san_pham` | `text` | Mô tả sản phẩm. |
| `khach_hang` | `text` | Khách hàng. |
| `link_lien_he` | `text` | Link liên hệ/nhóm. |
| `slot` | `text` | Slot chiến dịch. |
| `ngay_dang_ki` | `date` | Ngày đăng ký ban đầu. |
| `so_ngay_da_dang_ki` | `int4` | Số ngày đã đăng ký trước khi hủy. |
| `het_han` | `date` | Ngày hết hạn hợp đồng. |
| `nguon` | `text` | Nguồn đơn. |
| `gia_nhap` | `numeric(15,2)` | Giá nhập (chi phí). |
| `gia_ban` | `numeric(15,2)` | Giá bán (doanh thu kỳ vọng). |
| `can_hoan` | `numeric(15,2)` | Số tiền cần hoàn trả (nếu có). |
| `tinh_trang` | `text` | Trạng thái hiện tại (đã hoàn, đang xử lý...). |
| `check_flag` | `bool` | Đánh dấu đã kiểm tra. |

## `mavryk.order_expired`

| Cột | Kiểu dữ liệu | Ghi chú |
| --- | --- | --- |
| `id` | `int4` | Khóa chính tự tăng. |
| `id_don_hang` | `varchar(255)` | Mã đơn đã hết hạn. |
| `san_pham` | `varchar(255)` | Tên sản phẩm. |
| `thong_tin_san_pham` | `text` | Mô tả sản phẩm. |
| `khach_hang` | `varchar(255)` | Khách hàng. |
| `link_lien_he` | `text` | Link liên hệ. |
| `slot` | `varchar(50)` | Slot chiến dịch. |
| `ngay_dang_ki` | `date` | Ngày đăng ký ban đầu. |
| `so_ngay_da_dang_ki` | `integer` | Số ngày đã đăng ký. |
| `het_han` | `date` | Ngày hết hạn chính thức. |
| `nguon` | `varchar(255)` | Nguồn đơn. |
| `gia_nhap` | `numeric(10,2)` | Giá nhập. |
| `gia_ban` | `numeric(10,2)` | Giá bán. |
| `note` | `text` | Ghi chú nội bộ. |
| `tinh_trang` | `varchar(50)` | Trạng thái đơn tại thời điểm hết hạn. |
| `check_flag` | `bool` | Đánh dấu kiểm tra. |
| `archived_at` | `timestamp` | Thời điểm lưu trữ (nếu có). |

### Ghi chú chung

- Các cột ngày (`ngay_dang_ki`, `het_han`) được lưu dưới dạng `date`, nhưng ở một số bảng dữ liệu lịch sử có thể có giá trị dạng chuỗi. Khi nhập/xử lý nên chuẩn hóa về `YYYY-MM-DD`.
- `gia_nhap`, `gia_ban`, `can_hoan` dùng kiểu số thập phân; khi đọc trong Node.js nhớ ép sang `Number` hoặc sử dụng thư viện big number nếu cần độ chính xác cao.
- `check_flag` dùng để đánh dấu các record đã được xử lý bởi job/scheduler; tránh ghi đè trừ khi logic yêu cầu.

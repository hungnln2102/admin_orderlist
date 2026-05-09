# Tổng quan chi tiết phần bán hàng (Sales Overview)

Tài liệu này là bản tổng quan vận hành cho mảng bán hàng trong `admin_orderlist`: nguồn dữ liệu, chỉ số KPI, số liệu snapshot hiện tại, và query chuẩn để đối soát.

---

## 1) Phạm vi và mục tiêu

Phần bán hàng trong hệ thống tập trung vào 3 câu hỏi chính:

- Doanh thu/lợi nhuận đang ở mức nào?
- Đơn hàng đang ở trạng thái nào, theo tháng biến động ra sao?
- Số liệu dashboard có khớp dữ liệu gốc ở bảng đơn/biên lai không?

Mục tiêu của file:

- Chuẩn hóa nơi đọc số liệu.
- Giảm lệch số giữa dashboard, API và truy vấn tay.
- Có bộ query nhanh để debug khi phát sinh chênh lệch.

---

## 2) Nguồn dữ liệu chính

### 2.1 Bảng nghiệp vụ gốc (source of truth theo luồng)

- `orders.order_list`: dữ liệu đơn bán chính (mã đơn, sản phẩm, giá bán, giá vốn, trạng thái, ngày đơn).
- `orders.order_customer`: liên kết đơn và tài khoản khách.
- `receipt.payment_receipt`: biên lai thanh toán.
- `partner.supplier_order_cost_log`: log chi phí NCC và tác động tổng hợp.

### 2.2 Bảng tổng hợp/dashboard

- `dashboard.dashboard_monthly_summary`: projection theo tháng (`month_key`) cho dashboard.
- `dashboard.daily_revenue_summary`: tổng hợp doanh thu theo ngày.
- `dashboard.store_profit_expenses`: các khoản điều chỉnh lợi nhuận (ví dụ `mavn_import`, `external_import`, `withdraw_profit`).

### 2.3 Catalog phục vụ phân tích bán hàng

- `product.product`, `product.variant`, `product.category`: map `id_product` sang thông tin sản phẩm.
- `product.variant_sales_summary`: summary theo variant.

---

## 3) Định nghĩa KPI cốt lõi

> Quy ước trong tài liệu này dùng cùng cách hiểu với phần Dashboard/Order hiện tại.

- **Total Orders**: tổng số dòng trong `orders.order_list`.
- **Paid Orders**: số đơn có `status = 'Đã Thanh Toán'`.
- **Processing Orders**: số đơn có `status = 'Đang Xử Lý'`.
- **Canceled Orders**: số đơn có `status = 'Hủy'`.
- **Gross Revenue**: `SUM(price)` trên nhóm trạng thái active (`Đã Thanh Toán`, `Đang Xử Lý`, `Cần Gia Hạn`).
- **Gross Cost**: `SUM(cost)` trên cùng nhóm trạng thái active.
- **Gross Profit**: `SUM(price - cost)` trên cùng nhóm trạng thái active.
- **Monthly Revenue/Profit**: tổng theo tháng dựa trên `order_date` hoặc projection từ `dashboard.dashboard_monthly_summary` (tùy mục đích hiển thị).

---

## 4) Snapshot số liệu hiện tại (local, sau restore)

Thời điểm chụp snapshot: **2026-05-09 23:5x (UTC+7)**  
Database kiểm tra: **`mydtbmav` (PostgreSQL local host)**

### 4.1 KPI tổng quan

- `total_orders`: **746**
- `paid_orders`: **372**
- `processing_orders`: **0**
- `canceled_orders`: **0**
- `gross_revenue` (active statuses): **202,708,230**
- `gross_cost` (active statuses): **106,755,000**
- `gross_profit` (active statuses): **95,953,230**

### 4.2 Dashboard monthly summary

- `2026-04`: `total_orders=14`, `total_revenue=6,320,000.00`, `total_profit=4,270,000.00`, `total_refund=0.00`
- `2026-05`: `total_orders=13`, `total_revenue=4,209,000.00`, `total_profit=1,069,089.00`, `total_refund=0.00`

### 4.3 Top sản phẩm theo doanh thu (id_product)

- `id_product=4`: `44` đơn, doanh thu `32,753,000`, lợi nhuận `19,476,000`
- `id_product=152`: `53` đơn, doanh thu `28,741,351`, lợi nhuận `9,455,351`
- `id_product=8`: `15` đơn, doanh thu `21,037,500`, lợi nhuận `10,777,500`
- `id_product=29`: `27` đơn, doanh thu `19,613,384`, lợi nhuận `5,593,384`
- `id_product=10`: `17` đơn, doanh thu `16,021,000`, lợi nhuận `10,241,000`

---

## 5) Query chuẩn để đối soát nhanh

### 5.1 KPI tổng

```sql
select
  count(*) as total_orders,
  count(*) filter (where status = 'Đã Thanh Toán') as paid_orders,
  count(*) filter (where status = 'Đang Xử Lý') as processing_orders,
  count(*) filter (where status = 'Hủy') as canceled_orders
from orders.order_list;

select
  coalesce(sum(price), 0) as gross_revenue,
  coalesce(sum(cost), 0) as gross_cost,
  coalesce(sum(price - cost), 0) as gross_profit
from orders.order_list
where status in ('Đã Thanh Toán', 'Đang Xử Lý', 'Cần Gia Hạn');
```

### 5.2 Xu hướng tháng từ đơn gốc

```sql
select
  date_trunc('month', order_date)::date as month,
  count(*) as total_orders,
  sum(price) as total_revenue,
  sum(price - cost) as total_profit
from orders.order_list
group by 1
order by 1 desc
limit 12;
```

### 5.3 Top sản phẩm

```sql
select
  id_product,
  count(*) as total_orders,
  sum(price) as total_revenue,
  sum(price - cost) as total_profit
from orders.order_list
group by id_product
order by total_revenue desc
limit 20;
```

### 5.4 Đối chiếu projection dashboard

```sql
select
  month_key,
  total_orders,
  canceled_orders,
  total_revenue,
  total_profit,
  total_refund,
  updated_at
from dashboard.dashboard_monthly_summary
order by month_key;
```

---

## 6) Checklist vận hành khi thấy số liệu lệch

- Kiểm tra đúng database đang mở (`mydtbmav` hay `my-store`) trước khi so số.
- So `orders.order_list` trước, sau đó mới so `dashboard.dashboard_monthly_summary`.
- Nếu projection dashboard lệch: kiểm tra luồng ghi `store_profit_expenses` và trigger/job rebuild summary.
- Với dữ liệu vừa restore: luôn reconnect DB client để tránh cache kết nối cũ.

---

## 7) Liên kết tài liệu liên quan

- `docs/tong-quan-du-an.md`
- `docs/PAGES_DON_HANG.md`
- `docs/nghiep-vu-loi-nhuan-ban-slot.md`
- `docs/dashboard-page-financial-flow.md`


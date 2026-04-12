# Trang Đơn hàng (Quản lý đơn hàng)

Tài liệu mô tả **màn hình Đơn hàng** trong admin (`admin_orderlist` frontend): route, dữ liệu, API và các khối UI chính.

## Route và entry

| Mục | Giá trị |
|-----|---------|
| **Đường dẫn** | `/orders` |
| **Component** | `frontend/src/features/orders/index.tsx` (export default `Orders`) |
| **Đăng ký route** | `frontend/src/routes/AppRoutes.tsx` — `<Route path="/orders" element={<Orders />} />` |
| **Tiêu đề trang** | “Quản Lý **Đơn Hàng**” (`OrdersPageHeader`) |

Yêu cầu **đăng nhập** (session); các API `/api/orders/*` nằm sau `authGuard` ở backend.

## Bốn “tab” bộ dữ liệu (dataset)

Người dùng chọn một trong bốn chế độ; mỗi chế độ gọi một **endpoint** riêng và làm mới bộ lọc/phân trang khi đổi tab.

| Khóa (`OrderDatasetKey`) | Nhãn UI | Mô tả ngắn | Endpoint API |
|--------------------------|---------|------------|----------------|
| `active` | Đơn Hàng | Danh sách đơn hàng | `GET /api/orders` |
| `import` | Nhập hàng | Đơn nhập kho | `GET /api/orders/import` |
| `expired` | Hết Hạn | Đơn hết hạn | `GET /api/orders/expired` |
| `canceled` | Hoàn Tiền | Đơn đã hoàn tiền | `GET /api/orders/canceled` |

Cấu hình nhãn/endpoint: `ORDER_DATASET_CONFIG`, thứ tự tab: `ORDER_DATASET_SEQUENCE` trong `frontend/src/constants.ts`.

## Luồng dữ liệu (tóm tắt)

- **`useOrdersData`** (`features/orders/hooks/useOrdersData.ts`): gom fetch, lọc client, phân trang, modal và hành động (xóa, sửa, tạo, xem, v.v.).
- **`useOrdersFetch`**: theo `dataset`, gọi `ORDER_DATASET_CONFIG[dataset].endpoint`, lưu mảng `Order[]`.
- **`useOrdersList`**: tìm kiếm, `statusFilter`, khoảng ngày (`durationRange`), `rowsPerPage` / `currentPage`.
- Đổi tab dataset → reset tìm kiếm, filter trạng thái, trang 1 và trạng thái modal (trong `useOrdersData`).

## API liên quan (frontend)

Định nghĩa trong `frontend/src/constants.ts` (`API_ENDPOINTS`), ví dụ:

- `ORDERS` → `/api/orders`
- `ORDERS_IMPORT` → `/api/orders/import`
- `ORDERS_EXPIRED` → `/api/orders/expired`
- `ORDERS_CANCELED` → `/api/orders/canceled`
- `ORDER_BY_ID`, `ORDER_RENEW`, `ORDER_CANCELED_REFUND`, `CALCULATE_PRICE`, …

Chi tiết gọi API (POST/PATCH/DELETE) nằm trong các hook/modal như `useOrderActions`, `CreateOrderModal`, `EditOrderModal`, v.v.

## Khối UI trên trang

1. **`OrdersPageHeader`** — Tiêu đề, và banner lỗi tải + nút “Thử Lại” khi `fetchError`.
2. **`OrdersDatasetTabs`** — Bốn nút tab + số đếm (theo lần tải gần nhất mỗi tab).
3. **`OrdersStatsSection`** — Thẻ thống kê (bộ lọc nhanh theo trạng thái); riêng tab **Hết hạn** hiển thị khối “Tổng Đơn Hết Hạn”; tab **Hoàn tiền** dùng bộ stat hoàn tiền.
4. **`OrdersFiltersBar`** — Ô tìm kiếm, **lọc khoảng ngày** (`DashboardDateRangeFilter`), chọn **cột tìm** (`SEARCH_FIELD_OPTIONS`), nút **Tạo Đơn** (chỉ khi dataset là **Đơn Hàng** hoặc **Nhập hàng** — `isActiveDataset`).
5. **`OrdersTableSection`** — Bảng (và trên mobile có luồng card qua `OrderCard` nếu được dùng trong section): phân trang, mở rộng dòng, xem / sửa / xóa / hoàn / đánh dấu thanh toán / gia hạn tùy dataset.

### Modal gắn với trang

| Modal | Mục đích |
|-------|----------|
| `ConfirmModal` | Xác nhận xóa đơn |
| `ViewOrderModal` | Xem chi tiết đơn |
| `EditOrderModal` | Sửa đơn (khi dataset cho phép) |
| `CreateOrderModal` | Tạo đơn mới |

Điều kiện **cho phép sửa / gia hạn** được tính trong `index.tsx` (`canEditOrder`, `canRenewOrder`, …) theo `datasetKey`.

### Tìm kiếm theo cột

`SEARCH_FIELD_OPTIONS` trong `features/orders/constants.ts`: Tất cả cột, Mã đơn, Sản phẩm, Thông tin, Khách hàng, Slot, Nguồn (map qua `ORDER_FIELDS`).

## Cấu trúc thư mục (tham chiếu)

```
frontend/src/features/orders/
  index.tsx                 # Page chính
  components/               # OrdersPageHeader, Tabs, Stats, Filters, Table, OrderRow, OrderCard, ...
  hooks/                    # useOrdersData, useOrdersFetch, useOrdersList, useOrdersModals, useOrderActions
  utils/                    # ordersHelpers, orderListTransform, ...
  constants.ts              # Stat filters, SEARCH_FIELD_OPTIONS, ...
```

## Ghi chú

- Trang **“Đơn hàng thanh toán / bill”** khác route: `/bill-order` (`features/bill-order`) — không trùng với `/orders`.
- Đếm trên tab dataset (`datasetCounts`) được cập nhật khi đang xem tab đó (`totalRecords`), không phải snapshot đồng thời cả bốn API.

---

## Luồng nghiệp vụ (đơn hàng — tài liệu nội bộ)

### Tạo đơn & Telegram

- Tạo đơn **thành công** → gửi **thông báo Telegram** đơn mới (backend: `sendOrderCreatedNotification` sau khi tạo).

### Theo loại mã (prefix) & thông báo

- **MAVT**: Không có **giá bán cho khách** (giá = 0). Khi **hết hạn** chỉ cần thông báo **hết hạn**, **không** thông báo / nhắc **gia hạn** (cron “còn 4 ngày” bỏ qua MAVT).
- **MAVS**: Nếu không có giá trị cột `pct_stu` thì dùng **`pct_khach`** để tính (tương đương giá lẻ MAVL khi thiếu sinh viên).
- **MAVK**: Tỷ suất giảm áp trên **giá bán** (chuỗi MAVL × (1 − `pct_promo`)). Nếu **đến hạn** mà **không có** `pct_promo` → thông báo / tính theo **giá khách lẻ** (MAVL).

### Công thức giá bán (tham chiếu)

| Loại | Công thức |
|------|-----------|
| MAVC | `cost / (1 − pct_ctv)` |
| MAVL | `MAVC / (1 − pct_khach)` |
| MAVK | `MAVL × (1 − pct_promo)` |
| MAVS | `MAVC / (1 − pct_stu)` hoặc **MAVL** nếu `pct_stu` rỗng |
| MAVT | `0` |
| MAVN | `cost` |

### Tiền hoàn từ NCC (tỷ lệ theo ngày)

- **Tiền hoàn từ NCC** = `cost × (số ngày còn lại) / (tổng số ngày quy đổi từ `--xm` trên gói sản phẩm)`.

### Khi bấm hủy (xóa / chuyển trạng thái hủy)

- **MAVC, MAVL, MAVK**: Chuyển sang luồng **Hoàn tiền** (tab Hoàn tiền), khi trạng thái đơn **Đang Xử Lý** hoặc **Đã Thanh Toán**; lấy **Tiền hoàn từ NCC**, **trừ** vào công nợ NCC (bảng NCC cho phép ghi nhận / note số âm theo thiết kế hiện tại).
- **MAVN**: **Không** chuyển sang bảng/tab Hoàn tiền; **giữ** ở **Nhập hàng**, trạng thái **Hủy** (`CANCELED`), vẫn tính tiền còn lại như **Tiền hoàn từ NCC**; số ngày còn lại từ lúc hủy: `expiry_date − canceled_at` (quy ước ngày như hệ thống); sau khi tính hoàn → ghi **cột refund** và **trừ** NCC.

### Mặc định NCC “cửa hàng”

- Mặc định coi **Mavryk = Shop** (cùng nhóm NCC nội bộ).
- Đơn có NCC là **Mavryk** / **Shop** → **không cộng** tiền vào công nợ NCC (nhập / gia hạn / cập nhật payment_supply).
- **Tạo đơn với NCC Mavryk/Shop**: **không dùng giá nhập** — `cost` lưu **0**; **giá bán = lợi nhuận** (dashboard / báo cáo: lợi nhuận = giá bán − 0). API tính giá (`/api/orders/calculate-price`) trả `mavryk_profit_mode`, `gia_nhap = 0`.
- **MAVN**: Khi tạo đơn thành công → **Đang Xử Lý** và **cộng** tiền NCC tương ứng (trừ khi NCC là Mavryk/Shop). **Gia hạn** MAVN → cũng **cộng** tương ứng (trừ khi NCC loại trừ như trên).

### Modal tạo đơn (`CreateOrderModal`)

- Khối **Chi phí & thời hạn** (`CreateOrderPricingSection`): phụ đề và nhãn cột giá theo **loại mã** (MAVC…MAVN) và **NCC Mavryk/Shop** (cost = 0, cột giá bán = lợi nhuận). Copy tập trung trong `frontend/src/components/modals/CreateOrderModal/createOrderPricingCopy.ts` — khi đổi nghiệp vụ, cập nhật song song đoạn này và mục “Luồng nghiệp vụ” ở trên.

### Khớp code (kiểm tra định kỳ)

- Logic NCC / MAVN / tên NCC được cài trong `backend` (`supplierDebt`, `createOrder`, `renewal`, `orderDeletionService`, `listOrders`, `pricing`). Khi đổi quy tắc, cập nhật bảng trên và file tương ứng; phần gợi ý UI tạo đơn cập nhật `createOrderPricingCopy.ts` như mục trên.
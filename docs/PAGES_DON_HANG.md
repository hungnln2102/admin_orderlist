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

### Trạng thái & log chi phí NCC (`supplier_order_cost_log`)

- **MAVC, MAVL, MAVK, MAVS**:
  - Tạo đơn: luôn **Chưa Thanh Toán**.
  - Nhận webhook thanh toán / webhook gia hạn thành công: chuyển **Đã Thanh Toán** và **INSERT 1 log**.
  - Xóa khi đang **Đã Thanh Toán** hoặc **Đang Xử Lý**: chuyển **Chờ Hoàn**, chạy tính hoàn NCC, lưu `refund` **số âm**, và **INSERT 1 log**.
- **MAVN**:
  - Tạo đơn: luôn **Đã Thanh Toán** và **INSERT 1 log**.
  - Đang **Cần Gia Hạn** + bấm nút Gia Hạn: chuyển **Đã Thanh Toán** và **INSERT 1 log**.
  - Xóa đơn **Đã Thanh Toán**: chuyển **Đã Hoàn** và **INSERT 1 log**.
  - Webhook Sepay: **không** đổi trạng thái MAVN.
- **MAVT**:
  - Tạo đơn: luôn **Đã Thanh Toán** và **INSERT 1 log**.
  - Xóa đơn: chuyển **Đã Hoàn**, `refund` trên đơn luôn `0`; tiền NCC cần hoàn vẫn tính riêng theo cost/ngày còn lại và ghi vào log NCC.
- **NCC Mavryk**: không lưu log ở `partner.supplier_order_cost_log` (nếu có log cũ theo đơn sẽ bị dọn khi phát sinh cập nhật đơn).

### Tạo đơn & Telegram

- Tạo đơn **thành công**:
  - **MAVC/MAVL/MAVK/MAVS** → **Chưa Thanh Toán**
  - **MAVN/MAVT** → **Đã Thanh Toán**
  - Sau tạo vẫn gửi **thông báo Telegram** đơn mới (backend: `sendOrderCreatedNotification`).

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

- **MAVC, MAVL, MAVK, MAVS** (và đơn thường tương tự): từ **Đang Xử Lý** hoặc **Đã Thanh Toán** → chuyển trạng thái **Chờ Hoàn**; tính hoàn NCC theo tỷ lệ ngày và ghi `refund` **số âm**; trigger ghi thêm **1 dòng** `supplier_order_cost_log`.
- **MAVN**: xóa đơn **Đã Thanh Toán** → chuyển **Đã Hoàn**; trigger ghi thêm **1 dòng** `supplier_order_cost_log`.
- **MAVT**: xóa đơn → chuyển **Đã Hoàn**; `refund` trên đơn luôn `0`; tiền NCC cần hoàn vẫn tính riêng theo cost/ngày còn lại và ghi vào log NCC.

### NCC Mavryk / Shop (đơn thường — không phải MAVN)

- Coi **Mavryk** và **Shop** là cùng nhóm NCC nội bộ (`isMavrykShopSupplierName` trong backend).
- **Tạo đơn**: **không dùng giá nhập** — `cost` lưu **0**; **giá bán = lợi nhuận**. API `/api/orders/calculate-price` có thể trả `mavryk_profit_mode`, `gia_nhap = 0`. Trạng thái ban đầu vẫn là **Chưa Thanh Toán**.
- **Công nợ NCC (`payment_supply` / chu kỳ thanh toán)**: đơn thường + NCC Mavryk/Shop → **không cộng** `updatePaymentSupplyBalance` sau biên lai / renewal (`shouldSkipNccLedgerForOrder` — **không** áp cho MAVN).
- **Sepay webhook** (thanh toán khách): mọi đơn **Chưa Thanh Toán** (trừ MAVN — xem dưới) → **Đã Thanh Toán**; sau biên lai vẫn **bỏ qua** cộng `payment_supply` cho NCC Mavryk/Shop; đơn NCC thường vẫn **cộng** chu kỳ NCC khi có biên lai (như `webhook.js`).
- **Gia hạn** (`renewal.js`, đơn **không** MAVN + NCC Mavryk/Shop): sau gia hạn chuyển **Đã Thanh Toán** và **không** cộng thêm import NCC trong bước renewal.
- **Riêng NCC Mavryk**: không lưu `supplier_order_cost_log`.

### MAVN (nhập hàng)

- **Quy ước**: MAVN **không** gắn NCC Mavryk/Shop — luôn NCC nhà cung cấp thật (không ép `cost = 0` vì Mavryk khi prefix MAVN; `orderPricingService` không bật `mavryk_profit_mode` cho MAVN).
- **Tạo đơn thành công** → **Đã Thanh Toán** và ghi **1 dòng** `supplier_order_cost_log` (trừ NCC Mavryk).
- **Sepay webhook**: **không** đổi trạng thái đơn MAVN qua Sepay; **không** chạy renewal tự động từ webhook cho mã MAVN; fallback match theo số tiền (`resolveOrderByPayment`) **loại** đơn MAVN. Biên lai có thể được ghi nếu có mã trong nội dung — **không** dùng để chốt trạng thái MAVN.
- **Cần Gia Hạn** → **Gia hạn** (`runRenewal`) → chuyển **Đã Thanh Toán** + **cộng** NCC (`updatePaymentSupplyBalance` trong `renewal.js`) + **INSERT** `supplier_order_cost_log`.
- `POST /api/payment-supply/:paymentId/confirm` vẫn dùng để đối soát chu kỳ NCC, nhưng MAVN không cần đợi bước này để lên trạng thái **Đã Thanh Toán**.

### Modal tạo đơn (`CreateOrderModal`)

- Khối **Chi phí & thời hạn** (`CreateOrderPricingSection`): phụ đề và nhãn cột giá theo **loại mã** (MAVC…MAVN) và **NCC Mavryk/Shop** (đơn thường: cost = 0, cột giá bán = lợi nhuận). **Sau lưu**: MAVC/MAVL/MAVK/MAVS là **Chưa Thanh Toán**; MAVN/MAVT là **Đã Thanh Toán** (xem mục “Trạng thái & log chi phí NCC”). Copy UI: `frontend/src/components/modals/CreateOrderModal/createOrderPricingCopy.ts` — khi đổi nghiệp vụ, cập nhật song song đoạn này và mục “Luồng nghiệp vụ”.

### Khớp code (kiểm tra định kỳ)

- **Log chi phí NCC (DB)**: bản canonical của `partner.fn_supplier_order_cost_log_on_success` nằm trong `database/migrations/091_supplier_order_cost_log_fn_canonical.sql` (áp qua `backend/migrations/20260605120000_supplier_order_cost_log_fn_canonical.js`); trigger `tr_supplier_order_cost_log_order_success` trên `orders.order_list` không đổi tên (lịch sử từ các migration `039`…`089`).
- **Dashboard `total_import` / phần NCC của `total_profit`**: trigger `trg_supplier_order_cost_log_dashboard_import` trên `partner.supplier_order_cost_log` gọi `partner.fn_recalc_dashboard_total_import` — rule MAVN `Đã Thanh Toán` → margin **−cost** và `total_import` = tổng `import_cost` theo tháng; migration `backend/migrations/20260604120000_mavn_dashboard_profit_minus_cost_on_paid.js`.
- **NCC / MAVN / Mavryk**: `Order/finance/supplierDebt.js` (`findSupplyIdByName`; công nợ theo đơn chỉ qua DB trigger + log), `Order/crud/createOrder.js`, `services/orderService.js`, `services/pricing/orderPricingService.js`, `Order/orderDeletionService`, `Order/finance/dashboardSummary.js`, `PaymentsController` (xác nhận thanh toán NCC).
- **Sepay webhook & renewal tự động**: `backend/webhook/sepay/routes/webhook.js`, `backend/webhook/sepay/utils.js` (`resolveOrderByPayment`), `backend/webhook/sepay/renewal.js`; gia hạn tay: `backend/src/controllers/Order/renewRoutes.js`.
- UI tạo đơn: `createOrderPricingCopy.ts` như mục trên.
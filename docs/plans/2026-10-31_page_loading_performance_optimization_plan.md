# Kế Hoạch Tối Ưu Tải Trang Và Chuyển Trang

> **Mã:** `PERF-2026-10-31`  
> **Cập nhật:** 31/10/2026 (Asia/Bangkok)  
> **Trạng thái:** ĐÃ TRIỂN KHAI LẦN 1 - CHỜ ĐO BASELINE/RUNTIME ĐỂ NGHIỆM THU HIỆU NĂNG  
> **Phạm vi:** React/Vite frontend và Node.js/Express backend V2. Không thay đổi dữ liệu nghiệp vụ, schema hoặc contract mặc định của API.

## Mục Tiêu Và Nguyên Tắc

- Giảm thời gian chờ không cần thiết khi vào trang, chuyển route và lật trang Orders.
- Không đặt mục tiêu thời gian tuyệt đối khi chưa có baseline. Mọi mục tiêu p50/p95 chỉ được chốt sau khi đo trên dữ liệu gần production.
- Bảo toàn tính đúng đắn: số dư, dashboard và metadata đơn hàng không dùng cache mù quáng.
- Giữ nguyên response mặc định của `/api/orders`; client cũ vẫn nhận `tabCounts` và `summary` nếu không gửi `includeStats=false`.
- Cache phải bị xóa khi đăng nhập/đăng xuất để không lẫn dữ liệu giữa các phiên.

## Hiện Trạng Đã Xác Nhận

- `dashboardService.getDashboardSummary` trước đây chờ tuần tự sáu truy vấn thống kê độc lập.
- `OrdersPage` trước đây tải năm API catalog ngay khi mount, dù người dùng có thể chỉ xem bảng đơn hàng.
- `getOrders` luôn tính tab count và summary mỗi lần đổi trang.
- Route đã code-split bằng `React.lazy`, nhưng sidebar chưa prefetch chunk theo tương tác người dùng.
- Backend chưa cấu hình response compression tại Express.

## Phần Đã Triển Khai

### 1. Backend Response Và Dashboard

- Thêm `compression` tại Express với compression level `6`; chỉ response đủ điều kiện và client có `Accept-Encoding` phù hợp mới có `Content-Encoding`.
- Chạy song song sáu thống kê độc lập của dashboard bằng `Promise.all`.
- `/api/orders` nhận query `includeStats`:
  - Mặc định `true`, response giữ nguyên `data`, `pagination`, `tabCounts`, `summary`.
  - `false` chỉ bỏ `tabCounts` và `summary`; `data` và `pagination` vẫn đầy đủ.

### 2. Orders On-Demand Và Metadata An Toàn

- Catalog sản phẩm, NCC, gói và category chỉ tải khi người dùng mở Tạo/Sửa đơn.
- `ensureOrderCatalog()` dùng chung một promise để chống request trùng khi click lặp.
- Modal chỉ mở sau khi catalog thiết yếu đã sẵn sàng; lỗi tải catalog được báo cho người dùng.
- Khi đổi trang với cùng `tab`, `status`, `search`, khoảng ngày, frontend gửi `includeStats=false` và tái sử dụng metadata đúng query context.
- Khi tạo, sửa, xóa, xử lý thanh toán hoặc gia hạn đơn, frontend buộc tải lại metadata đầy đủ trước khi hiển thị số liệu mới.

### 3. Cache Client Theo Phiên

- Có module cache in-memory dùng chung với dedupe request, TTL và stale-while-revalidate.
- Cache hiện chỉ dùng cho catalog ít biến động: catalog Kho, system products và catalog phục vụ form Orders.
- Danh sách tài khoản Kho, dashboard, danh sách đơn hàng và số liệu tài chính không dùng cache TTL chung.
- Cache được xóa và request đang chạy bị hủy khi đăng nhập hoặc đăng xuất.
- Các mutation tại Kho xóa cache catalog liên quan trước khi tải lại dữ liệu.

### 4. Route Prefetch

- Có registry import dùng chung giữa `AppRoutes` và sidebar.
- Sidebar prefetch chunk một lần khi `onPointerEnter` hoặc `onFocus`, nên hỗ trợ chuột và bàn phím.
- Không prefetch theo mount hoặc toàn bộ menu; tránh tranh băng thông với request dữ liệu.

## Contract Cache Và Invalidation

| Domain | Dữ liệu cache | TTL | Làm mới/xóa cache |
| :--- | :--- | :--- | :--- |
| Orders form | Giá, NCC, gói, category | 5 phút | Xóa khi đổi phiên; form chỉ mở sau `ensureOrderCatalog()` |
| Warehouse catalog | Catalog, system products | 5 phút | Xóa trước khi tải lại sau mutation Kho |
| Orders table | Chỉ metadata cùng query context trong memory hook | Theo vòng đời `OrdersPage` | Ép tải lại metadata sau mọi mutation đơn |
| Dashboard/Finance | Không cache TTL | Không áp dụng | Luôn lấy API hiện tại |

Metadata Orders chỉ được tái sử dụng khi `tab`, `status`, `search`, `startDate`, `endDate` giống hệt. `page` không nằm trong metadata key vì tổng hợp và badge không đổi khi chỉ lật trang.

## Kế Hoạch Đo Và Nghiệm Thu

### Phase 0 - Baseline Bắt Buộc

Đo trên một môi trường xác định, cùng tài khoản test, cùng dataset và cùng điều kiện mạng. Lưu p50/p95 của:

- Cold/warm route navigation: Dashboard, Orders, Warehouse.
- `/api/dashboard/summary` theo kỳ tháng và năm.
- `/api/orders` trang đầu (`includeStats=true`) và trang tiếp theo cùng filter (`includeStats=false`).
- Bytes response JSON với và không có `Accept-Encoding: gzip` cho endpoint đủ lớn.
- `EXPLAIN (ANALYZE, BUFFERS)` của truy vấn Orders nếu p95 vẫn cao.

### Tiêu Chí Nghiệm Thu

- Response JSON đủ lớn trả `Content-Encoding: gzip` khi request có `Accept-Encoding: gzip`; không yêu cầu header này cho mọi API.
- Mở `/orders` lần đầu tải catalog đúng một lần khi mở Tạo/Sửa; chỉ xem bảng không tải catalog.
- Lật trang cùng bộ lọc không yêu cầu `tabCounts`/`summary`; đổi tab, filter hoặc mutation phải tải metadata mới.
- Đổi tài khoản trong cùng tab không thấy catalog cache của phiên trước.
- Prefetch không tạo request dữ liệu API; chỉ nạp JS chunk route và hỗ trợ focus bàn phím.
- Frontend build pass, backend unit test pass, các smoke test API nêu trên pass.

## Phần Chưa Triển Khai Có Chủ Đích

- Không cache dashboard, ví, công nợ, số dư hoặc các báo cáo tài chính bằng TTL vì rủi ro số liệu cũ cao hơn lợi ích.
- Không thay spinner toàn cục bằng skeleton đại trà. Chỉ thêm skeleton theo từng page sau khi có baseline UX và thiết kế component tương ứng.
- Không áp dụng cache server/Redis trước khi có số đo p95 và tải DB chứng minh cần thiết.

## File Tác Động

- `backend/package.json`
- `backend/src/server.js`
- `backend/src/domains/dashboard/services/dashboardService.js`
- `backend/src/domains/orders/routes.js`
- `backend/src/domains/orders/services/orderService.js`
- `frontend/src/shared/api/apiCache.ts`
- `frontend/src/shared/context/AuthContext.tsx`
- `frontend/src/features/orders/hooks/useOrderCatalog.ts`
- `frontend/src/features/orders/hooks/useOrders.ts`
- `frontend/src/pages/OrdersPage.tsx`
- `frontend/src/pages/WarehousePage.tsx`
- `frontend/src/routes/routeLoaders.ts`
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/layout/Sidebar.tsx`
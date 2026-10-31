# Nghiệm Thu Triển Khai Tối Ưu Tải Trang Lần 1

> **Kế hoạch:** `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md`  
> **Ngày nghiệm thu:** 31/10/2026 (Asia/Bangkok)  
> **Phạm vi:** Backend Express, dashboard, Orders, Warehouse catalog, route prefetch, session cache và tài liệu kế hoạch.

## Trạng Thái

**ĐẠT VỀ MẶT MÃ NGUỒN VÀ BUILD/UNIT TEST; CHƯA NGHIỆM THU ĐỊNH LƯỢNG HIỆU NĂNG.**

Các tối ưu đã được triển khai với ưu tiên tính đúng đắn dữ liệu: không cache TTL cho dashboard, số dư, danh sách đơn hoặc metadata Orders. Benchmark p50/p95 và kiểm tra network/live database vẫn phải thực hiện theo Phase 0 trước khi khẳng định mức cải thiện thời gian tải.

## Thay Đổi Đã Nghiệm Thu

- Express sử dụng `compression` level 6 tại `backend/src/server.js:18`; dependency đã có trong `backend/package.json` và lockfile.
- Dashboard chạy đồng thời sáu phép thống kê độc lập bằng `Promise.all` tại `backend/src/domains/dashboard/services/dashboardService.js:174`.
- API Orders nhận `includeStats` mà không phá response mặc định tại `backend/src/domains/orders/routes.js:9` và `backend/src/domains/orders/services/orderService.js:148`.
- `OrdersPage` không tải catalog khi mount; Tạo/Sửa đơn gọi `ensureOrderCatalog({ refresh: true })`, chống request trùng click và chỉ mở modal sau khi dữ liệu nguồn sẵn sàng tại `frontend/src/pages/OrdersPage.tsx:278` và `frontend/src/features/orders/hooks/useOrderCatalog.ts:50`.
- Cache in-memory chỉ dùng cho catalog Kho/system products, có TTL, stale-while-revalidate, dedupe và invalidation sau mutation tại `frontend/src/shared/api/apiCache.ts:66` và `frontend/src/pages/WarehousePage.tsx:101`.
- Cache bị xóa khi login/logout tại `frontend/src/shared/context/AuthContext.tsx:86` và `frontend/src/shared/context/AuthContext.tsx:102`.
- Route prefetch dùng registry chung, kích hoạt trên hover/focus sidebar tại `frontend/src/routes/routeLoaders.ts:26` và `frontend/src/layout/Sidebar.tsx:244`.

## Quyết Định An Toàn

- `OrdersPage` luôn lấy `tabCounts` và `summary` live. Dù backend hỗ trợ `includeStats=false`, frontend chưa dùng vì webhook hoặc mutation từ màn hình khác có thể làm metadata cũ.
- Catalog giá/NCC của form Orders không dùng cache toàn cục; mỗi lần mở Tạo/Sửa tải nguồn hiện tại để không dùng giá hoặc NCC cũ.
- Dashboard, công nợ, ví và dữ liệu tài chính không dùng TTL cache.

## Kiểm Tra Đã Chạy

- `npm --prefix frontend run build` - pass: TypeScript và Vite production build thành công.
- `npm --prefix backend test` - pass: 48 tests, 0 failed.
- `node --check` cho `backend/src/server.js`, `backend/src/domains/dashboard/services/dashboardService.js`, `backend/src/domains/orders/routes.js`, `backend/src/domains/orders/services/orderService.js` - pass.
- Xác minh module `compression` có thể require thành công.
- `git diff --check` cho toàn bộ file thuộc phạm vi - pass, chỉ còn cảnh báo line-ending do cấu hình Git Windows.

## Chưa Thể Nghiệm Thu

- Chưa đo cold/warm navigation p50/p95, response bytes và `Content-Encoding` trên runtime deploy.
- Chưa chạy `EXPLAIN (ANALYZE, BUFFERS)` cho Orders bằng dataset gần production.
- Chưa có smoke test browser cho cold-open modal, logout/login cùng tab, prefetch keyboard và response gzip vì lần này chưa khởi động môi trường runtime/DB.

## Lưu Ý

- Lệnh cài `compression` báo `npm audit` có 8 advisory mức moderate trong dependency tree. Không chạy `npm audit fix` để tránh thay dependency ngoài phạm vi.
- Bước tiếp theo bắt buộc là Phase 0 trong kế hoạch: đo baseline và so sánh sau triển khai trước khi tuyên bố các mục tiêu thời gian tải.
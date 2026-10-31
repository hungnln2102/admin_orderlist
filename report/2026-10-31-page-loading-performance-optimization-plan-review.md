# Đánh Giá Kế Hoạch Tối Ưu Tốc Độ Tải Trang

> **Kế hoạch được đánh giá:** `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md`  
> **Ngày đánh giá:** 31/10/2026 (Asia/Bangkok)  
> **Phạm vi:** Tính đúng đắn của giả định kỹ thuật, an toàn dữ liệu, contract API/UI, khả năng kiểm thử và tiêu chí nghiệm thu. Không sửa mã nguồn trong lần đánh giá này.

## Trạng Thái Nghiệm Thu

**CHƯA NGHIỆM THU.**

Kế hoạch xác định đúng hai điểm nghẽn đã được xác nhận trong mã nguồn: dashboard đang chạy sáu truy vấn thống kê tuần tự và `OrdersPage` tải catalog ngay khi mount. Tuy nhiên, thiết kế lazy loading, cache và tối ưu phân trang chưa bảo toàn đầy đủ contract dữ liệu. Nếu triển khai theo nguyên văn, có rủi ro modal đơn hàng dùng catalog chưa sẵn sàng, số liệu đơn hàng cũ hoặc sai theo bộ lọc, và dữ liệu cache bị giữ khi đổi tài khoản.

## Phát Hiện

### P1 - Lazy catalog chưa có contract sẵn sàng dữ liệu cho Create/Edit

- Kế hoạch yêu cầu chỉ tải catalog sau khi gọi `setIsCreateModalOpen(true)` hoặc `setIsEditModalOpen(true)` tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:113`, nhưng chưa nêu trạng thái `loading`, `error`, chống click lặp hoặc thời điểm được phép mở/lưu form.
- Hiện tại `useOrderCatalog` tải giá và NCC khi mount tại `frontend/src/features/orders/hooks/useOrderCatalog.ts:11`; `handleOpenEdit` tra sản phẩm/NCC trực tiếp từ hai mảng catalog tại `frontend/src/pages/OrdersPage.tsx:318`. Sau khi chuyển sang lazy, mảng sẽ rỗng trong lần click đầu tiên nếu không có một hàm `ensureOrderCatalog()` dùng chung promise và chặn submit.
- Hệ quả: form Sửa có thể không map được `id_product`/`supply_id`, hoặc người dùng lưu trước khi bảng giá và NCC hoàn tất tải. Đây là rủi ro tính đúng đắn của đơn hàng, không chỉ là UX.
- Điều kiện sửa: thiết kế API hook có `ensureOrderCatalog(): Promise<void>`, trạng thái `isCatalogLoading`/`catalogError`, dedupe request và hủy request khi unmount. Modal chỉ mở sau khi catalog thiết yếu sẵn sàng, hoặc phải khóa trường và nút Lưu với skeleton rõ ràng. Thêm test cold-open cho Tạo và Sửa đơn, bao gồm thao tác click hai lần.

### P1 - `includeStats=false` chưa bảo toàn response contract của trang Đơn hàng

- Kế hoạch đề xuất bỏ `tabCounts` và `summary` khi đổi trang tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:103`, nhưng chưa chỉ rõ contract trả về, key cache hay cách UI biết metadata còn hợp lệ.
- `getOrders` hiện luôn trả `data`, `pagination`, `tabCounts` và `summary` tại `backend/src/domains/orders/services/orderService.js:148`; `OrdersPage` tiêu thụ `tabCounts` và `summaryData` từ `useOrders` tại `frontend/src/pages/OrdersPage.tsx:33`. `summary` còn phụ thuộc tab, trạng thái và truy vấn, không thể dùng một cache chung cho toàn bộ đơn hàng.
- Hệ quả: đổi trang, đổi tab, tìm kiếm hoặc thay đổi trạng thái có thể hiển thị badge/tổng tiền của truy vấn cũ. Với số liệu doanh thu, chi phí và công nợ, đây là sai lệch nghiệp vụ.
- Điều kiện sửa: giữ nguyên response contract mặc định. Nếu tách tối ưu, dùng request tường minh như `view=rows` chỉ khi client đang giữ metadata đã xác thực cùng query context; cache key phải gồm ít nhất `tab`, `status`, `search`, khoảng ngày, `page`, `limit` và phiên bản dữ liệu. Mutation phải làm cũ toàn bộ các key orders liên quan, sau đó lấy lại metadata trước khi cho phép tin số liệu hiển thị.

### P1 - Cache client chưa cô lập phiên đăng nhập và chưa có ma trận invalidation

- Phase 3 chỉ quy định TTL và hai prefix invalidation tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:130`, đồng thời khẳng định mọi thao tác ghi đều không lệch cache tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:142`. Kế hoạch không định nghĩa namespace theo tài khoản/phiên, xóa cache khi logout, xử lý request đang chạy hay danh sách domain bị ảnh hưởng của từng mutation.
- Sidebar hiện gọi `logout()` rồi điều hướng tại `frontend/src/layout/Sidebar.tsx:45`. Một in-memory cache mới sẽ còn tồn tại trong SPA nếu không được xóa chủ động trước khi người dùng khác đăng nhập trên cùng trình duyệt.
- Hệ quả: có thể lộ dữ liệu đã cache qua đổi tài khoản, đồng thời dashboard/đơn hàng/kho hiển thị dữ liệu cũ sau các luồng ghi ngoài danh sách năm thao tác được nêu.
- Điều kiện sửa: cache phải có `sessionEpoch` hoặc định danh tài khoản trong key, `clearApiCache()` trong logout và khi nhận 401/403, dedupe request theo key, `AbortController`, cùng một bảng invalidation theo domain/mutation. Không dùng cache cho dữ liệu nhạy cảm hoặc số dư nếu chưa định nghĩa chính sách freshness và tái xác thực.

### P2 - Mục tiêu và tiêu chí hiệu năng chưa được đo đạc, chưa thể kiểm chứng

- Các con số baseline/target ở `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:8`, `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:66` và `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:163` không kèm môi trường đo, kích thước dataset, thiết bị, mạng, percentile hay trace SQL/HTTP.
- Mã nguồn xác nhận dashboard đang tuần tự gọi sáu hàm tại `backend/src/domains/dashboard/services/dashboardService.js:163`, và `getOrders` thực hiện bốn count tab, count tổng, hai aggregate rồi truy vấn dữ liệu tại `backend/src/domains/orders/services/orderService.js:153`. Tuy nhiên, chưa có số liệu cho biết truy vấn nào là bottleneck thực tế hoặc `Promise.all` có làm bão hòa pool PostgreSQL hay không.
- Điều kiện sửa: thêm Phase 0 đo baseline cho cold/warm route navigation và các endpoint chính; lưu p50/p95, response bytes nén/chưa nén, số request, thời gian DB và `EXPLAIN (ANALYZE, BUFFERS)` cho truy vấn Orders. Chỉ chốt mục tiêu sau khi có baseline trên dữ liệu gần production.

### P2 - Compression cần chốt ranh giới triển khai và tiêu chí kiểm thử đúng giao thức

- Nhận định backend chưa dùng `compression` là đúng: `backend/package.json:23` chưa có dependency và `backend/src/server.js:60` chỉ có CORS/JSON/session. Tuy vậy, kế hoạch gọi là “Gzip/Brotli” tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:50` nhưng snippet chỉ cấu hình package `compression`, chưa nêu chiến lược Brotli, reverse proxy/ingress, ngưỡng nén, hay chi phí CPU.
- Tiêu chí yêu cầu `Content-Encoding: gzip` trên “mọi response `/api/*`” tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:177` là không đúng: response chỉ có thể nén khi client gửi `Accept-Encoding` phù hợp và response đủ điều kiện; lỗi nhỏ, stream hoặc nội dung đã nén có thể không có header này.
- Điều kiện sửa: quyết định một tầng nén duy nhất sau khi kiểm tra môi trường deploy; cấu hình `Vary: Accept-Encoding`, ngưỡng nén, loại trừ stream/webhook nếu có và test so sánh cùng endpoint với/không có `Accept-Encoding`. Nghiệm thu theo response JSON đủ lớn đại diện, không theo mọi response API.

### P2 - Prefetch chỉ theo hover chưa bao phủ thiết bị và thiếu ngân sách tải

- Kế hoạch chỉ nêu `onMouseEnter` tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:152`. `Sidebar` thực tế render `NavLink` từ cấu hình điều hướng tại `frontend/src/layout/Sidebar.tsx:236`; kế hoạch chưa có map từ từng `item.path` đến lazy importer.
- Hover không hoạt động cho bàn phím và thiết bị cảm ứng; prefetch toàn bộ menu hoặc prefetch lặp có thể cạnh tranh băng thông với request dữ liệu. Mục tiêu “triệt tiêu hoàn toàn” độ trễ cũng không thực tế với route chưa từng truy cập hoặc mạng bị hạn chế.
- Điều kiện sửa: khai báo registry route-to-importer dùng chung với `AppRoutes`, prefetch một lần trên `onPointerEnter`/`onFocus`, giới hạn theo `navigator.connection.saveData` và mạng chậm, đồng thời có chiến lược cho touch. Đo riêng cold navigation và warm navigation sau prefetch.

## Điểm Đúng Có Thể Giữ Lại

- Thêm nén response có cơ sở, sau khi làm rõ tầng deploy và kiểm thử giao thức.
- Song song hóa sáu phép thống kê độc lập của dashboard là quick win hợp lý; cần đo trước/sau và giữ giới hạn pool DB.
- Tách catalog khỏi lần render ban đầu của `OrdersPage` có tiềm năng giảm bốn request thừa; bắt buộc bổ sung contract tải catalog nêu trên.
- `getOrders` đang tính `tabCounts` song song sẵn có; phần còn nặng là count/aggregate/query theo context. Ưu tiên đo truy vấn và thiết kế metadata tách bạch thay vì cache mù quáng.

## Thứ Tự Triển Khai Đề Xuất

1. Phase 0: dựng đo lường và chụp baseline có thể lặp lại.
2. Thực hiện compression và song song hóa dashboard, kèm test HTTP và kiểm tra tải DB.
3. Tách Orders thành metadata/rows với contract rõ ràng; thêm lazy catalog có loading, dedupe và test cold-open.
4. Thêm cache có namespace phiên, invalidation matrix và regression test cho đổi tài khoản/mutation.
5. Sau đó mới thêm prefetch có registry, giới hạn băng thông và hỗ trợ keyboard/touch; thay spinner bằng skeleton theo trạng thái dữ liệu thực tế.

## Kiểm Tra Đã Thực Hiện

- Đọc toàn bộ kế hoạch và đối chiếu tĩnh với route, service và component hiện hành.
- Xác nhận `React.lazy`/`Suspense` đã có trong `frontend/src/routes/AppRoutes.tsx:60`; route prefetch là cải tiến bổ sung, không phải điều kiện để có code splitting.
- Xác nhận dashboard chạy tuần tự sáu phép thống kê tại `backend/src/domains/dashboard/services/dashboardService.js:167`.
- Xác nhận `OrdersPage` hiện tải năm API catalog khi mount qua `frontend/src/pages/OrdersPage.tsx:81` và `frontend/src/features/orders/hooks/useOrderCatalog.ts:11`.
- Không chạy benchmark, test tích hợp hoặc migration vì đây là review kế hoạch, chưa có thay đổi mã nguồn để nghiệm thu runtime.

## Điều Kiện Để Nghiệm Thu Kế Hoạch

- Cập nhật kế hoạch với các contract lazy/catalog, metadata Orders và cache/invalidation ở các phát hiện P1.
- Bổ sung Phase 0, bảng chỉ số p50/p95 và kịch bản benchmark có thể tái lập.
- Bổ sung test regression cho cold-open modal, query/filter/pagination, mutation invalidation và đổi tài khoản.
- Chỉ duyệt triển khai từng phase sau khi baseline và acceptance test của phase trước đạt yêu cầu.
# Đánh giá kiến trúc 5 luồng tối ưu dữ liệu

- Ngày đánh giá: 31/10/2026 (Asia/Bangkok)
- Tài liệu đánh giá: `docs/architecture/5_data_streams_optimization_architecture.md`
- Mã kiến trúc: `ARCH-5-STREAMS-10M`
- Phạm vi: khả năng triển khai ở hệ thống hiện tại cho mục tiêu 10.000.000 đơn hàng và 1.000.000 sản phẩm; hợp đồng dữ liệu, API, tính đúng đắn giao dịch và khả năng đo hiệu năng.
- Trạng thái nghiệm thu: **CHƯA NGHIỆM THU**

## Kết luận

Tài liệu xác định đúng các nhóm kỹ thuật cần xem xét ở quy mô lớn: tránh tải toàn bộ danh mục xuống client, tìm kiếm có chỉ mục, bỏ phân trang `OFFSET` sâu và giảm các phép tổng hợp toàn bảng. Tuy nhiên, tài liệu hiện là định hướng kỹ thuật, chưa phải kế hoạch triển khai an toàn cho hệ thống này. Nếu áp dụng nguyên văn, có nguy cơ phá khóa ngoại, trigger công nợ/hoàn tiền, hợp đồng phân trang hiện hữu và độ chính xác của số liệu dashboard.

Chỉ nên triển khai sau khi thiết kế lại thành các giai đoạn có benchmark, migration online, hợp đồng API phiên bản hóa và kiểm thử hồi quy nghiệp vụ.

## Phát hiện

### P1 - Phân vùng `order_list` chưa tương thích khóa chính và quan hệ nghiệp vụ hiện hữu

Tài liệu đề xuất tạo bảng partition theo `order_date` với khóa chính `(id, order_date)` tại `docs/architecture/5_data_streams_optimization_architecture.md:54` và `docs/architecture/5_data_streams_optimization_architecture.md:66`. PostgreSQL yêu cầu unique key/primary key của bảng partition phải bao gồm khóa partition; do đó không thể tiếp tục bảo đảm `id` là khóa duy nhất toàn cục theo cách các quan hệ hiện tại đang dùng.

Hệ thống có nhiều quan hệ chỉ tham chiếu `orders.order_list(id)`, ví dụ công nợ NCC, phiếu hoàn tiền và khóa kích hoạt trong `database/migrations/000_consolidated_schema.sql:2292`, `database/migrations/000_consolidated_schema.sql:2352`, `database/migrations/000_consolidated_schema.sql:2355`, `database/migrations/000_consolidated_schema.sql:2367`. Bảng đơn cũng có trigger đồng bộ công nợ NCC và trigger đồng bộ order keys, ví dụ `database/migrations/058_supplier_order_cost_log_default_unpaid.sql:237` và `database/migrations/082_fix_order_list_keys_trigger_to_system_automation.sql:54`. Chuyển bảng bằng một DDL mẫu sẽ không tự chuyển các constraint, index, trigger, sequence, quyền, dữ liệu lịch sử và các luồng ghi đang chạy.

Tài liệu còn nêu `business.order_list` trong khi migration lịch sử có `orders.order_list`; runtime lại lấy bảng qua `TABLES.ORDER_LIST` và schema theo biến môi trường tại `backend/src/db/tables.js:39`. Kế hoạch phải chốt canonical schema và cập nhật source of truth `dbSchema`/`TABLES`/`COLS` cùng migration, không được hard-code một schema mới trong runtime.

**Điều kiện bắt buộc:** thiết kế migration online riêng: inventory toàn bộ FK/trigger/index/view/job, lựa chọn chiến lược giữ `id` tham chiếu được, backfill có checkpoint, đối soát số dòng/tổng tiền, dual-write hoặc write freeze có ngân sách lock, default partition, job tạo partition trước kỳ mới, cutover, rollback đã diễn tập. Chỉ partition khi workload có predicate theo `order_date`; nếu truy vấn không lọc khoảng ngày thì không có partition pruning như mô tả ở `docs/architecture/5_data_streams_optimization_architecture.md:80`.

### P1 - `system_counters` không thể thay thế trực tiếp các số liệu theo bộ lọc và chưa có cơ chế bền vững

`getOrders` hiện không chỉ đọc bốn tab. Hàm lọc theo tab, `status`, tìm kiếm trên mã đơn, khách hàng, liên hệ, thông tin đơn và NCC tại `backend/src/domains/orders/services/orderService.js:188`; sau đó vẫn cần `total`, `totalPages` và nhiều tổng tiền/count phụ thuộc cùng bộ lọc tại `backend/src/domains/orders/services/orderService.js:229` và `backend/src/domains/orders/services/orderService.js:237`. Bốn counter toàn cục được đề xuất tại `docs/architecture/5_data_streams_optimization_architecture.md:100` chỉ có thể thay thế một phần tab count không lọc, không thay thế được count/tổng hợp chính xác cho search, status hay các bộ lọc tương lai.

Luồng event hiện tại là `EventEmitter` trong một tiến trình tại `backend/src/events/eventBus.js:3`. Dù order service phát event sau commit tại `backend/src/domains/orders/services/orderService.js:10`, callback lỗi chỉ được log sau khi transaction đã commit tại `backend/src/db/index.js:56`; event không có outbox, retry, idempotency hoặc khả năng đồng bộ nhiều instance. Vì vậy event hiện tại không thể là nguồn dữ liệu ACID cho counter tài chính hoặc thống kê bắt buộc chính xác.

**Điều kiện bắt buộc:** xác định rõ dimension của từng counter, cập nhật delta cùng transaction DB hoặc ghi transactional outbox có consumer idempotent; có version/event key, unique constraint, rebuild job, đối soát định kỳ từ bảng gốc, cảnh báo sai lệch và fallback. Các summary theo search/filter cần hoặc query có index, hoặc aggregate được định nghĩa tường minh; không được trả một global counter rồi gắn nhãn là số liệu theo filter.

### P1 - Keyset `WHERE id < last_id` không giữ đúng thứ tự và phá hợp đồng UI hiện tại

Tài liệu dùng cursor chỉ gồm `id` tại `docs/architecture/5_data_streams_optimization_architecture.md:159` đến `docs/architecture/5_data_streams_optimization_architecture.md:168`. Nhưng Orders hiện sắp xếp theo ưu tiên `status`, rồi `expired_at`, rồi `id` tại `backend/src/domains/orders/services/orderService.js:412`; tab hết hạn còn có thứ tự khác tại `backend/src/domains/orders/services/orderService.js:413`. Cursor chỉ có `id` sẽ bỏ sót hoặc lặp đơn khi giá trị status/expired_at khác nhau hoặc thay đổi giữa hai lần tải.

Frontend đang dùng URL page, `totalPages` và `pagination.total` tại `frontend/src/features/orders/hooks/useOrders.ts:34`, `frontend/src/features/orders/hooks/useOrders.ts:64` và `frontend/src/features/orders/hooks/useOrders.ts:79`. Backend cũng trả `page`, `total` và `totalPages` tại `backend/src/domains/orders/services/orderService.js:431`. Cursor không hỗ trợ nhảy trực tiếp đến “trang 500.000”; nhận định đó trong tài liệu là không đúng về mặt UX/API nếu không có index mốc hoặc thay đổi UI sang next/previous.

**Điều kiện bắt buộc:** tạo hợp đồng `v2` cursor opaque, chứa toàn bộ tuple sort, bao gồm xử lý `NULL`, chữ ký/phiên bản cursor và fingerprint filter; trả `nextCursor`, tùy chọn `previousCursor`, `hasMore`. Quyết định rõ việc bỏ page jump/total exact hay duy trì nó bằng phương án tốn tài nguyên khác. Thực hiện rollout song song endpoint cũ, kiểm thử không lặp/không mất dữ liệu khi đổi trạng thái, hết hạn và chèn đơn trong lúc người dùng phân trang.

### P1 - Autocomplete đúng hướng nhưng thiếu hợp đồng tìm kiếm và xác thực dữ liệu lúc lưu đơn

Không tải một triệu sản phẩm xuống trình duyệt là hướng đúng. Tuy nhiên endpoint ví dụ `/api/products/search` tại `docs/architecture/5_data_streams_optimization_architecture.md:230` chưa tồn tại trong router products hiện tại; router có endpoint danh mục không giới hạn như `/packages` tại `backend/src/domains/products/routes/index.js:7`. `getPackageProducts` hiện tải toàn bộ package và tiếp tục xử lý/cross-reference dữ liệu đơn tại `backend/src/domains/products/services/productService.js:611`, nên không thể coi nó là nền tảng cho quy mô một triệu sản phẩm.

Autocomplete chỉ giúp chọn dữ liệu. Khi tạo/sửa đơn, backend vẫn phải kiểm tra lại product/variant, trạng thái hoạt động, NCC được phép, cost/price và tồn kho tại thời điểm ghi transaction. Không được tin giá hoặc NCC từ payload client do kết quả autocomplete có thể stale hoặc bị giả mạo.

**Điều kiện bắt buộc:** thiết kế endpoint tìm kiếm có RBAC, giới hạn `q`/`limit`, rate limit, debounce và hủy request ở client, query plan được kiểm chứng, index đúng cột thực tế, phân trang/cursor nếu cần; API trả DTO tối thiểu. Lệnh ghi đơn phải resolve và snapshot giá/NCC từ server trong transaction. Thêm test cho debounce/cancel, quyền, giới hạn tải, dữ liệu stale và thay đổi giá/NCC đồng thời.

### P2 - Mục tiêu hiệu năng chưa có baseline, SLO vận hành hoặc bằng chứng benchmark

Tài liệu đưa ra các con số `<150ms`, `0.1ms`, `<3ms`, `15-25ms` và “nhanh gấp 50 lần” tại `docs/architecture/5_data_streams_optimization_architecture.md:8`, `docs/architecture/5_data_streams_optimization_architecture.md:138` và `docs/architecture/5_data_streams_optimization_architecture.md:248`, nhưng không nêu phần cứng, phiên bản PostgreSQL, kích thước row/index, tỷ lệ dữ liệu nóng, đồng thời đọc/ghi, cache warm/cold, p95/p99 hay `EXPLAIN (ANALYZE, BUFFERS)`.

**Điều kiện bắt buộc:** Phase 0 phải dựng dữ liệu đại diện, kịch bản tải và SLO đo được: p50/p95/p99 theo endpoint, error rate, lock wait, CPU/RAM/I/O, cache hit, write throughput và kích thước index. Chỉ triển khai hạng mục chứng minh được lợi ích lớn hơn chi phí ghi/chỉ mục/vận hành.

### P2 - Chưa có ranh giới quyết định giữa `pg_trgm` và Meilisearch

Tài liệu đưa đồng thời GIN Trigram và Meilisearch tại `docs/architecture/5_data_streams_optimization_architecture.md:185` và `docs/architecture/5_data_streams_optimization_architecture.md:204`, nhưng chưa xác định engine nào là nguồn phục vụ cho từng use case. Chạy song song hai hệ tìm kiếm tạo thêm dữ liệu dẫn xuất và rủi ro lệch index. Meilisearch cần outbox, retry, dead-letter, rebuild, monitoring, kiểm soát ACL và job đối soát trước khi có thể trả dữ liệu quản trị.

**Điều kiện bắt buộc:** viết ADR chọn `pg_trgm` trước cho tìm kiếm transactional nội bộ nếu benchmark đạt mục tiêu. Chỉ thêm Meilisearch khi cần ranking/typo-tolerance vượt quá PostgreSQL và đã có pipeline đồng bộ bền vững; không coi sidecar là thay thế trực tiếp DB source of truth.

### P2 - Thiếu chiến lược chỉ mục, vòng đời dữ liệu và độ tranh chấp ghi

GIN index làm nhanh truy vấn `ILIKE` phù hợp nhưng tăng dung lượng và chi phí update; các câu `CREATE INDEX` trong tài liệu tại `docs/architecture/5_data_streams_optimization_architecture.md:192` chưa có `CONCURRENTLY`, kế hoạch rollout, index theo tổ hợp lọc/sort hay kiểm chứng selectivity. Bốn dòng counter toàn cục cũng có thể tạo hot-row contention ở tốc độ ghi cao.

“Cold Storage read-only/compressed” tại `docs/architecture/5_data_streams_optimization_architecture.md:19` chưa nêu retention, quyền sửa/hoàn tiền dữ liệu cũ, backup/restore, RPO/RTO, archiving và khả năng truy vết công nợ/biên lai. Đây là yêu cầu nghiệp vụ và vận hành, không chỉ là tối ưu DB.

## Điểm có thể giữ lại

- Không tải toàn bộ danh mục lớn vào browser; chuyển sang autocomplete theo yêu cầu là ưu tiên có rủi ro thấp nhất.
- Loại bỏ `OFFSET` sâu là hợp lý sau khi chấp thuận thay đổi hợp đồng UX/API sang cursor đầy đủ tuple sort.
- `pg_trgm` là phương án có thể thử trước, nhưng chỉ sau `EXPLAIN (ANALYZE, BUFFERS)` trên các cột và mẫu truy vấn thực tế.
- Pre-computed aggregates hữu ích cho một tập metric cố định nếu được cập nhật/đối soát bền vững và tách khỏi các số liệu filter động.
- Partitioning chỉ là giai đoạn sau cùng, khi benchmark chứng minh truy vấn chủ đạo lọc theo `order_date` và phương án FK/PK được phê duyệt.

## Lộ trình cần thay thế

1. **Phase 0 - Đo đạc:** chốt schema runtime, inventory toàn bộ FK/trigger/job, lấy query fingerprint và baseline trên dữ liệu đại diện; phê duyệt SLO p95/p99.
2. **Phase 1 - Không đổi mô hình dữ liệu:** sửa endpoint tải catalog lớn thành autocomplete server-side có validation lúc ghi; thêm index nhỏ, tạo index concurrently và benchmark trước/sau.
3. **Phase 2 - Hợp đồng Orders v2:** triển khai cursor tuple/versioned song song page API cũ; cập nhật UI next/previous và test tính toàn vẹn khi dữ liệu thay đổi.
4. **Phase 3 - Aggregate bền vững:** định nghĩa metric cố định, transaction delta hoặc transactional outbox, replay/rebuild/reconciliation và dashboard cảnh báo lệch.
5. **Phase 4 - Quyết định search:** ADR `pg_trgm` hoặc Meilisearch; nếu sidecar, hoàn thiện pipeline outbox/retry/rebuild/ACL trước khi route production.
6. **Phase 5 - Partition pilot:** thực hiện trên bản sao dữ liệu, diễn tập migration/cutover/rollback, sau đó rollout theo cửa sổ bảo trì đã duyệt.

## Kiểm tra đã thực hiện

- Đọc toàn bộ `docs/architecture/5_data_streams_optimization_architecture.md` và đối chiếu từng luồng với hợp đồng code hiện tại.
- Kiểm tra `getOrders`: filter, count, summary, thứ tự sort và response pagination tại `backend/src/domains/orders/services/orderService.js:148`.
- Kiểm tra UI Orders đang phụ thuộc `page`, `totalPages`, `total` và metadata thống kê tại `frontend/src/features/orders/hooks/useOrders.ts:34`.
- Kiểm tra transaction/event: `afterCommit` và EventBus in-process tại `backend/src/db/index.js:47`, `backend/src/events/eventBus.js:3`.
- Kiểm tra router/product loader hiện có và quan hệ/trigger SQL của `order_list`.
- Không chạy build/test/benchmark vì lượt này chỉ đánh giá tài liệu và không sửa mã ứng dụng. Các kiểm tra này cũng chưa thể chứng minh mục tiêu 10M/1M nếu chưa có dataset, workload và môi trường benchmark đại diện.

## Điều kiện nghiệm thu

Chỉ nghiệm thu khi có tài liệu thay thế hoặc phiên bản 2 của kiến trúc bao gồm: SLO và benchmark baseline; ADR search; contract cursor v2; thiết kế counter/outbox/rebuild; migration partition online có FK/trigger/index audit và rollback; cùng bộ test hồi quy và kết quả benchmark xác nhận trên dataset đại diện.

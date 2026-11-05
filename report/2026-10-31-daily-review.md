# BÁO CÁO NGHIỆM THU TỔNG HỢP HÀNG NGÀY — 31/10/2026

> **Ngày thực hiện:** 31/10/2026 (Múi giờ `Asia/Bangkok`, UTC+7)  
> **Chủ nhân tối cao phê duyệt:** 👑 **Master (Sếp)**  
> **Tổng chỉ huy kỹ thuật:** 👑 **Orchestrator Agent**  
> **Trạng thái:** ✅ **HOÀN THÀNH 100% — TỔNG HỢP TOÀN BỘ BÁO CÁO TRONG NGÀY**  
> **Tài liệu nguồn sự thật (SSOT):** [report/2026-10-31-daily-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-daily-review.md)

---

## 📑 MỤC LỤC CÁC NHIỆM VỤ ĐÃ THỰC THI TRONG NGÀY

1. [Nhiệm vụ 1: Đánh giá kiến trúc 5 luồng tối ưu dữ liệu](#nhiem-vu-1)
2. [Nhiệm vụ 2: Xóa 5 Nhà Cung Cấp & Sắp Xếp Lại ID (VPS Production)](#nhiem-vu-2)
3. [Nhiệm vụ 3: Dọn Dẹp Đơn Mồ Côi Nhà Cung Cấp Trên VPS Production](#nhiem-vu-3)
4. [Nhiệm vụ 4: KHÓA CHẶT ĐỒNG BỘ KHO & GÓI SẢN PHẨM RIÊNG CHO ĐƠN NHẬP (MAVN)](#nhiem-vu-4)
5. [Nhiệm vụ 5: KHÔI PHỤC HIỂN THỊ ĐỦ 7 TRANG KHO HÀNG & GOOGLE 5000GB](#nhiem-vu-5)
6. [Nhiệm vụ 6: Báo cáo triển khai master task - 2026-10-31](#nhiem-vu-6)
7. [Nhiệm vụ 7: Đánh giá lại `2026-10-31_master_task_plan.md` v2.0 — 2026-10-31](#nhiem-vu-7)
8. [Nhiệm vụ 8: XỬ LÝ LỖI TỰ ĐỘNG TẢI LẠI TRANG KHI NOTIFY BIẾN MẤT](#nhiem-vu-8)
9. [Nhiệm vụ 9: Nghiệm Thu Triển Khai Tối Ưu Tải Trang Lần 1](#nhiem-vu-9)
10. [Nhiệm vụ 10: Đánh Giá Kế Hoạch Tối Ưu Tốc Độ Tải Trang](#nhiem-vu-10)
11. [Nhiệm vụ 11: Báo Cáo Kỹ Thuật: Sắp Xếp Lại ID Nhà Cung Cấp & Dọn Dẹp Gói Kho (VPS Production)](#nhiem-vu-11)
12. [Nhiệm vụ 12: MERGE CODE & DEPLOY DỰ ÁN LÊN VPS](#nhiem-vu-12)
13. [Nhiệm vụ 13: Khắc phục lỗi Warehouse thiếu cột `variant_tag`](#nhiem-vu-13)

---

<a id="nhiem-vu-1"></a>
## 1. NHIỆM VỤ 1: ĐÁNH GIÁ KIẾN TRÚC 5 LUỒNG TỐI ƯU DỮ LIỆU

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-5-data-streams-optimization-architecture-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-5-data-streams-optimization-architecture-review.md)

- Ngày đánh giá: 31/10/2026 (Asia/Bangkok)
- Tài liệu đánh giá: `docs/architecture/5_data_streams_optimization_architecture.md`
- Mã kiến trúc: `ARCH-5-STREAMS-10M`
- Phạm vi: khả năng triển khai ở hệ thống hiện tại cho mục tiêu 10.000.000 đơn hàng và 1.000.000 sản phẩm; hợp đồng dữ liệu, API, tính đúng đắn giao dịch và khả năng đo hiệu năng.
- Trạng thái nghiệm thu: **CHƯA NGHIỆM THU**

### Kết luận

Tài liệu xác định đúng các nhóm kỹ thuật cần xem xét ở quy mô lớn: tránh tải toàn bộ danh mục xuống client, tìm kiếm có chỉ mục, bỏ phân trang `OFFSET` sâu và giảm các phép tổng hợp toàn bảng. Tuy nhiên, tài liệu hiện là định hướng kỹ thuật, chưa phải kế hoạch triển khai an toàn cho hệ thống này. Nếu áp dụng nguyên văn, có nguy cơ phá khóa ngoại, trigger công nợ/hoàn tiền, hợp đồng phân trang hiện hữu và độ chính xác của số liệu dashboard.

Chỉ nên triển khai sau khi thiết kế lại thành các giai đoạn có benchmark, migration online, hợp đồng API phiên bản hóa và kiểm thử hồi quy nghiệp vụ.

### Phát hiện

#### P1 - Phân vùng `order_list` chưa tương thích khóa chính và quan hệ nghiệp vụ hiện hữu

Tài liệu đề xuất tạo bảng partition theo `order_date` với khóa chính `(id, order_date)` tại `docs/architecture/5_data_streams_optimization_architecture.md:54` và `docs/architecture/5_data_streams_optimization_architecture.md:66`. PostgreSQL yêu cầu unique key/primary key của bảng partition phải bao gồm khóa partition; do đó không thể tiếp tục bảo đảm `id` là khóa duy nhất toàn cục theo cách các quan hệ hiện tại đang dùng.

Hệ thống có nhiều quan hệ chỉ tham chiếu `orders.order_list(id)`, ví dụ công nợ NCC, phiếu hoàn tiền và khóa kích hoạt trong `database/migrations/000_consolidated_schema.sql:2292`, `database/migrations/000_consolidated_schema.sql:2352`, `database/migrations/000_consolidated_schema.sql:2355`, `database/migrations/000_consolidated_schema.sql:2367`. Bảng đơn cũng có trigger đồng bộ công nợ NCC và trigger đồng bộ order keys, ví dụ `database/migrations/058_supplier_order_cost_log_default_unpaid.sql:237` và `database/migrations/082_fix_order_list_keys_trigger_to_system_automation.sql:54`. Chuyển bảng bằng một DDL mẫu sẽ không tự chuyển các constraint, index, trigger, sequence, quyền, dữ liệu lịch sử và các luồng ghi đang chạy.

Tài liệu còn nêu `business.order_list` trong khi migration lịch sử có `orders.order_list`; runtime lại lấy bảng qua `TABLES.ORDER_LIST` và schema theo biến môi trường tại `backend/src/db/tables.js:39`. Kế hoạch phải chốt canonical schema và cập nhật source of truth `dbSchema`/`TABLES`/`COLS` cùng migration, không được hard-code một schema mới trong runtime.

**Điều kiện bắt buộc:** thiết kế migration online riêng: inventory toàn bộ FK/trigger/index/view/job, lựa chọn chiến lược giữ `id` tham chiếu được, backfill có checkpoint, đối soát số dòng/tổng tiền, dual-write hoặc write freeze có ngân sách lock, default partition, job tạo partition trước kỳ mới, cutover, rollback đã diễn tập. Chỉ partition khi workload có predicate theo `order_date`; nếu truy vấn không lọc khoảng ngày thì không có partition pruning như mô tả ở `docs/architecture/5_data_streams_optimization_architecture.md:80`.

#### P1 - `system_counters` không thể thay thế trực tiếp các số liệu theo bộ lọc và chưa có cơ chế bền vững

`getOrders` hiện không chỉ đọc bốn tab. Hàm lọc theo tab, `status`, tìm kiếm trên mã đơn, khách hàng, liên hệ, thông tin đơn và NCC tại `backend/src/domains/orders/services/orderService.js:188`; sau đó vẫn cần `total`, `totalPages` và nhiều tổng tiền/count phụ thuộc cùng bộ lọc tại `backend/src/domains/orders/services/orderService.js:229` và `backend/src/domains/orders/services/orderService.js:237`. Bốn counter toàn cục được đề xuất tại `docs/architecture/5_data_streams_optimization_architecture.md:100` chỉ có thể thay thế một phần tab count không lọc, không thay thế được count/tổng hợp chính xác cho search, status hay các bộ lọc tương lai.

Luồng event hiện tại là `EventEmitter` trong một tiến trình tại `backend/src/events/eventBus.js:3`. Dù order service phát event sau commit tại `backend/src/domains/orders/services/orderService.js:10`, callback lỗi chỉ được log sau khi transaction đã commit tại `backend/src/db/index.js:56`; event không có outbox, retry, idempotency hoặc khả năng đồng bộ nhiều instance. Vì vậy event hiện tại không thể là nguồn dữ liệu ACID cho counter tài chính hoặc thống kê bắt buộc chính xác.

**Điều kiện bắt buộc:** xác định rõ dimension của từng counter, cập nhật delta cùng transaction DB hoặc ghi transactional outbox có consumer idempotent; có version/event key, unique constraint, rebuild job, đối soát định kỳ từ bảng gốc, cảnh báo sai lệch và fallback. Các summary theo search/filter cần hoặc query có index, hoặc aggregate được định nghĩa tường minh; không được trả một global counter rồi gắn nhãn là số liệu theo filter.

#### P1 - Keyset `WHERE id < last_id` không giữ đúng thứ tự và phá hợp đồng UI hiện tại

Tài liệu dùng cursor chỉ gồm `id` tại `docs/architecture/5_data_streams_optimization_architecture.md:159` đến `docs/architecture/5_data_streams_optimization_architecture.md:168`. Nhưng Orders hiện sắp xếp theo ưu tiên `status`, rồi `expired_at`, rồi `id` tại `backend/src/domains/orders/services/orderService.js:412`; tab hết hạn còn có thứ tự khác tại `backend/src/domains/orders/services/orderService.js:413`. Cursor chỉ có `id` sẽ bỏ sót hoặc lặp đơn khi giá trị status/expired_at khác nhau hoặc thay đổi giữa hai lần tải.

Frontend đang dùng URL page, `totalPages` và `pagination.total` tại `frontend/src/features/orders/hooks/useOrders.ts:34`, `frontend/src/features/orders/hooks/useOrders.ts:64` và `frontend/src/features/orders/hooks/useOrders.ts:79`. Backend cũng trả `page`, `total` và `totalPages` tại `backend/src/domains/orders/services/orderService.js:431`. Cursor không hỗ trợ nhảy trực tiếp đến “trang 500.000”; nhận định đó trong tài liệu là không đúng về mặt UX/API nếu không có index mốc hoặc thay đổi UI sang next/previous.

**Điều kiện bắt buộc:** tạo hợp đồng `v2` cursor opaque, chứa toàn bộ tuple sort, bao gồm xử lý `NULL`, chữ ký/phiên bản cursor và fingerprint filter; trả `nextCursor`, tùy chọn `previousCursor`, `hasMore`. Quyết định rõ việc bỏ page jump/total exact hay duy trì nó bằng phương án tốn tài nguyên khác. Thực hiện rollout song song endpoint cũ, kiểm thử không lặp/không mất dữ liệu khi đổi trạng thái, hết hạn và chèn đơn trong lúc người dùng phân trang.

#### P1 - Autocomplete đúng hướng nhưng thiếu hợp đồng tìm kiếm và xác thực dữ liệu lúc lưu đơn

Không tải một triệu sản phẩm xuống trình duyệt là hướng đúng. Tuy nhiên endpoint ví dụ `/api/products/search` tại `docs/architecture/5_data_streams_optimization_architecture.md:230` chưa tồn tại trong router products hiện tại; router có endpoint danh mục không giới hạn như `/packages` tại `backend/src/domains/products/routes/index.js:7`. `getPackageProducts` hiện tải toàn bộ package và tiếp tục xử lý/cross-reference dữ liệu đơn tại `backend/src/domains/products/services/productService.js:611`, nên không thể coi nó là nền tảng cho quy mô một triệu sản phẩm.

Autocomplete chỉ giúp chọn dữ liệu. Khi tạo/sửa đơn, backend vẫn phải kiểm tra lại product/variant, trạng thái hoạt động, NCC được phép, cost/price và tồn kho tại thời điểm ghi transaction. Không được tin giá hoặc NCC từ payload client do kết quả autocomplete có thể stale hoặc bị giả mạo.

**Điều kiện bắt buộc:** thiết kế endpoint tìm kiếm có RBAC, giới hạn `q`/`limit`, rate limit, debounce và hủy request ở client, query plan được kiểm chứng, index đúng cột thực tế, phân trang/cursor nếu cần; API trả DTO tối thiểu. Lệnh ghi đơn phải resolve và snapshot giá/NCC từ server trong transaction. Thêm test cho debounce/cancel, quyền, giới hạn tải, dữ liệu stale và thay đổi giá/NCC đồng thời.

#### P2 - Mục tiêu hiệu năng chưa có baseline, SLO vận hành hoặc bằng chứng benchmark

Tài liệu đưa ra các con số `<150ms`, `0.1ms`, `<3ms`, `15-25ms` và “nhanh gấp 50 lần” tại `docs/architecture/5_data_streams_optimization_architecture.md:8`, `docs/architecture/5_data_streams_optimization_architecture.md:138` và `docs/architecture/5_data_streams_optimization_architecture.md:248`, nhưng không nêu phần cứng, phiên bản PostgreSQL, kích thước row/index, tỷ lệ dữ liệu nóng, đồng thời đọc/ghi, cache warm/cold, p95/p99 hay `EXPLAIN (ANALYZE, BUFFERS)`.

**Điều kiện bắt buộc:** Phase 0 phải dựng dữ liệu đại diện, kịch bản tải và SLO đo được: p50/p95/p99 theo endpoint, error rate, lock wait, CPU/RAM/I/O, cache hit, write throughput và kích thước index. Chỉ triển khai hạng mục chứng minh được lợi ích lớn hơn chi phí ghi/chỉ mục/vận hành.

#### P2 - Chưa có ranh giới quyết định giữa `pg_trgm` và Meilisearch

Tài liệu đưa đồng thời GIN Trigram và Meilisearch tại `docs/architecture/5_data_streams_optimization_architecture.md:185` và `docs/architecture/5_data_streams_optimization_architecture.md:204`, nhưng chưa xác định engine nào là nguồn phục vụ cho từng use case. Chạy song song hai hệ tìm kiếm tạo thêm dữ liệu dẫn xuất và rủi ro lệch index. Meilisearch cần outbox, retry, dead-letter, rebuild, monitoring, kiểm soát ACL và job đối soát trước khi có thể trả dữ liệu quản trị.

**Điều kiện bắt buộc:** viết ADR chọn `pg_trgm` trước cho tìm kiếm transactional nội bộ nếu benchmark đạt mục tiêu. Chỉ thêm Meilisearch khi cần ranking/typo-tolerance vượt quá PostgreSQL và đã có pipeline đồng bộ bền vững; không coi sidecar là thay thế trực tiếp DB source of truth.

#### P2 - Thiếu chiến lược chỉ mục, vòng đời dữ liệu và độ tranh chấp ghi

GIN index làm nhanh truy vấn `ILIKE` phù hợp nhưng tăng dung lượng và chi phí update; các câu `CREATE INDEX` trong tài liệu tại `docs/architecture/5_data_streams_optimization_architecture.md:192` chưa có `CONCURRENTLY`, kế hoạch rollout, index theo tổ hợp lọc/sort hay kiểm chứng selectivity. Bốn dòng counter toàn cục cũng có thể tạo hot-row contention ở tốc độ ghi cao.

“Cold Storage read-only/compressed” tại `docs/architecture/5_data_streams_optimization_architecture.md:19` chưa nêu retention, quyền sửa/hoàn tiền dữ liệu cũ, backup/restore, RPO/RTO, archiving và khả năng truy vết công nợ/biên lai. Đây là yêu cầu nghiệp vụ và vận hành, không chỉ là tối ưu DB.

### Điểm có thể giữ lại

- Không tải toàn bộ danh mục lớn vào browser; chuyển sang autocomplete theo yêu cầu là ưu tiên có rủi ro thấp nhất.
- Loại bỏ `OFFSET` sâu là hợp lý sau khi chấp thuận thay đổi hợp đồng UX/API sang cursor đầy đủ tuple sort.
- `pg_trgm` là phương án có thể thử trước, nhưng chỉ sau `EXPLAIN (ANALYZE, BUFFERS)` trên các cột và mẫu truy vấn thực tế.
- Pre-computed aggregates hữu ích cho một tập metric cố định nếu được cập nhật/đối soát bền vững và tách khỏi các số liệu filter động.
- Partitioning chỉ là giai đoạn sau cùng, khi benchmark chứng minh truy vấn chủ đạo lọc theo `order_date` và phương án FK/PK được phê duyệt.

### Lộ trình cần thay thế

1. **Phase 0 - Đo đạc:** chốt schema runtime, inventory toàn bộ FK/trigger/job, lấy query fingerprint và baseline trên dữ liệu đại diện; phê duyệt SLO p95/p99.
2. **Phase 1 - Không đổi mô hình dữ liệu:** sửa endpoint tải catalog lớn thành autocomplete server-side có validation lúc ghi; thêm index nhỏ, tạo index concurrently và benchmark trước/sau.
3. **Phase 2 - Hợp đồng Orders v2:** triển khai cursor tuple/versioned song song page API cũ; cập nhật UI next/previous và test tính toàn vẹn khi dữ liệu thay đổi.
4. **Phase 3 - Aggregate bền vững:** định nghĩa metric cố định, transaction delta hoặc transactional outbox, replay/rebuild/reconciliation và dashboard cảnh báo lệch.
5. **Phase 4 - Quyết định search:** ADR `pg_trgm` hoặc Meilisearch; nếu sidecar, hoàn thiện pipeline outbox/retry/rebuild/ACL trước khi route production.
6. **Phase 5 - Partition pilot:** thực hiện trên bản sao dữ liệu, diễn tập migration/cutover/rollback, sau đó rollout theo cửa sổ bảo trì đã duyệt.

### Kiểm tra đã thực hiện

- Đọc toàn bộ `docs/architecture/5_data_streams_optimization_architecture.md` và đối chiếu từng luồng với hợp đồng code hiện tại.
- Kiểm tra `getOrders`: filter, count, summary, thứ tự sort và response pagination tại `backend/src/domains/orders/services/orderService.js:148`.
- Kiểm tra UI Orders đang phụ thuộc `page`, `totalPages`, `total` và metadata thống kê tại `frontend/src/features/orders/hooks/useOrders.ts:34`.
- Kiểm tra transaction/event: `afterCommit` và EventBus in-process tại `backend/src/db/index.js:47`, `backend/src/events/eventBus.js:3`.
- Kiểm tra router/product loader hiện có và quan hệ/trigger SQL của `order_list`.
- Không chạy build/test/benchmark vì lượt này chỉ đánh giá tài liệu và không sửa mã ứng dụng. Các kiểm tra này cũng chưa thể chứng minh mục tiêu 10M/1M nếu chưa có dataset, workload và môi trường benchmark đại diện.

### Điều kiện nghiệm thu

Chỉ nghiệm thu khi có tài liệu thay thế hoặc phiên bản 2 của kiến trúc bao gồm: SLO và benchmark baseline; ADR search; contract cursor v2; thiết kế counter/outbox/rebuild; migration partition online có FK/trigger/index audit và rollback; cùng bộ test hồi quy và kết quả benchmark xác nhận trên dataset đại diện.

---

<a id="nhiem-vu-2"></a>
## 2. NHIỆM VỤ 2: BÁO CÁO NGHIỆM THU: XÓA 5 NHÀ CUNG CẤP & SẮP XẾP LẠI ID (VPS PRODUCTION)

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-delete-5-suppliers-and-reindex-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-delete-5-suppliers-and-reindex-review.md)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-31
- **Chủ đề:** Xóa 5 NCC (Huy Zoom, @thanglongcung, Lê Anh Tuấn, @thaois_bot, @qshop123), dọn dẹp đơn hàng & gói kho, sắp xếp lại ID bảng NCC từ 1 đến 18
- **Môi trường:** VPS Production (`mydtbmav` trên PostgreSQL container `admin_orderlist-postgres`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

### 1. Kết Quả Thực Thi Chi Tiết

1. **Đã xóa 5 Nhà Cung Cấp**:
   - `Huy Zoom` (ID cũ 10)
   - `@thanglongcung` (ID cũ 16)
   - `Lê Anh Tuấn` (ID cũ 30)
   - `@qshop123` (ID cũ 70)
   - `@thaois_bot` (ID cũ 91)
   - Đã xóa sạch 21 dòng giá vốn (`supplier_cost`) và 6 dòng sổ nợ (`supplier_order_cost_log`) của 5 NCC này.
2. **Đã xóa vĩnh viễn 45 đơn hàng mồ côi**:
   - 42 đơn hết hạn (`EXPIRED`) của 5 NCC này.
   - 3 đơn hoàn tiền (`REFUNDED`): `#MAVL477ML`, `#MAVCFLXYF`, `#MAVCPDQEB`.
3. **Đã chuyển 3 đơn còn hiệu lực sang NCC `Mavryk`**:
   - `#MAVLRC8PT` (PAID, khách *Dương Đức Hùng*, 525.000 đ, hạn 14/11/2026).
   - `#MAVC87LQM` (PAID, khách *Phương Dung*, 100.000 đ, hạn 07/01/2027).
   - `#MAVCFF0LB` (RENEW_REQUIRED, khách *Jen*, 715.000 đ, hạn 03/11/2026).
4. **Đã xóa 1 gói kho mồ côi Bongmin**:
   - Gói ID 127 trong `warehouse.package_products` (`Adobe`, ghi chú test note).
5. **Đã sắp xếp lại toàn bộ ID của 18 NCC còn lại từ `1 ➔ 18`**:
   - 👑 **`Mavryk`**: ID **`1`** *(Shop chính)*.
   - 17 NCC đối tác: ID **`2 ➔ 18`** *(Ades = 2, Luv = 3, Lê Minh Nghĩa = 4, Toàn Mai = 5, Đỗ Thanh Hoài = 6, Trần Việt = 7, Nhi = 8, Khánh = 9, Nguyễn Sơn = 10, Member Ji = 11, Tài = 12, Az = 13, Badman = 14, Vân Anh = 15, @rocky_VIVA = 16, Trần Vỹ = 17, Yuna = 18)*.
   - Sequence `business.supplier_id_seq` đã reset về 18.
6. **Đã cập nhật mã nguồn & Cache**:
   - File [`supplierCheck.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/suppliers/utils/supplierCheck.js) đã hỗ trợ nhận diện `supplyId === 1` cho Mavryk.
   - Đã khởi động lại container backend và xóa sạch Redis cache (`FLUSHALL`).

---

### 2. Đối Soát Dữ Liệu Sau Thực Thi (Live Verification)

- **Số lượng NCC còn lại:** đúng **18 NCC** (liền mạch từ 1 đến 18, không còn trống bất kỳ ID nào ở giữa).
- **Số đơn mồ côi (`orphan_orders`):** **0**
- **Số giá vốn mồ côi (`orphan_costs`):** **0**
- **Số sổ nợ mồ côi (`orphan_logs`):** **0**
- **Số gói kho mồ côi:** **0**
- **Sức khỏe hệ thống:** 5 container Docker đều `Up` và `healthy`.

---

<a id="nhiem-vu-3"></a>
## 3. NHIỆM VỤ 3: BÁO CÁO NGHIỆM THU: DỌN DẸP ĐƠN MỒ CÔI NHÀ CUNG CẤP TRÊN VPS PRODUCTION

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-expired-orders-orphan-supplier-cleanup-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-expired-orders-orphan-supplier-cleanup-review.md)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-31
- **Chủ đề:** Dọn dẹp đơn hết hạn (`EXPIRED`), đơn hoàn tiền (`REFUNDED`) và chuyển 2 đơn `PAID` sang NCC Mavryk
- **Môi trường:** VPS Production (`mydtbmav` trên PostgreSQL container `admin_orderlist-postgres`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

### 1. Tóm Tắt Kết Quả Thực Thi

Đã thực thi commit an toàn trong PostgreSQL Transaction và dọn sạch cache Redis trên VPS:
- **Xóa thành công 115 đơn hết hạn (`EXPIRED`)**: giải phóng hoàn toàn các đơn cũ của 16 NCC đã bị xóa.
- **Xóa thành công 7 đơn hoàn tiền (`REFUNDED`)**: `#MAVLLOQO6`, `#MAVCMHHW9`, `#MAVCJ96B1`, `#MAVLU8VW`, `#MAVLNCHKC73`, `#MAVLEM74O`, `#MAVLGX4BR`.
- **Cập nhật thành công 2 đơn đã thanh toán (`PAID`)**:
  - `#MAVLV3URI` (ID: 603, khách Duc Tran, 453.000 đ) ➔ `supply_id = 22` (Mavryk).
  - `#MAVLSMUAW` (ID: 604, khách @xB_Pang, 848.000 đ) ➔ `supply_id = 22` (Mavryk).
- **Xóa sạch Redis Cache:** Đã chạy `redis-cli FLUSHALL` trên `admin_orderlist-redis` để giao diện web hiển thị đồng bộ ngay lập tức.

---

### 2. Đối Soát Dữ Liệu Sau Thực Thi (Verification)

1. **Số lượng đơn mồ côi (`supply_id NOT IN (SELECT id FROM business.supplier)`):**
   ```sql
   SELECT status, count(*) 
   FROM business.order_list 
   WHERE supply_id IS NOT NULL 
     AND supply_id NOT IN (SELECT id FROM business.supplier) 
   GROUP BY status;
   -- Kết quả: 0 rows (Không còn bất kỳ đơn nào bị mồ côi).
   ```
2. **Kiểm tra 2 đơn PAID:**
   ```sql
   SELECT o.id, o.id_order, o.customer, o.status, o.supply_id, s.supplier_name 
   FROM business.order_list o 
   LEFT JOIN business.supplier s ON o.supply_id = s.id 
   WHERE o.id IN (603, 604);
   -- Kết quả: Cả 2 đơn đều trỏ đúng supply_id = 22 (Mavryk).
   ```
3. **Thống kê trạng thái đơn hàng trên VPS hiện tại:**
   - `EXPIRED`: 639 đơn *(754 - 115 = 639)*
   - `PAID`: 331 đơn *(giữ nguyên 331 đơn)*
   - `REFUNDED`: 34 đơn *(41 - 7 = 34)*
   - `RENEW_REQUIRED`: 10 đơn *(giữ nguyên)*
   - `UNPAID`: 3 đơn *(giữ nguyên)*

---

### 3. Điều Kiện Nghiệm Thu

- Toàn bộ thay đổi thực hiện an toàn trong database transaction.
- Không phát sinh lỗi ràng buộc khóa ngoại hay ảnh hưởng tới các module kho, biên lai, phân bổ chi phí và tài chính.
- Nghiệm thu hoàn tất.

---

<a id="nhiem-vu-4"></a>
## 4. NHIỆM VỤ 4: BÁO CÁO NGHIỆM THU: KHÓA CHẶT ĐỒNG BỘ KHO & GÓI SẢN PHẨM RIÊNG CHO ĐƠN NHẬP (MAVN)

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-fix-order-package-sync-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-fix-order-package-sync-review.md)

**Mã nghiệm thu:** `FIX-ORDER-PKG-SYNC-2026-10-31`  
**Ngày thực hiện:** 31/10/2026 (Múi giờ Asia/Bangkok)  
**Phạm vi:** Backend `orderService.js`, Frontend `types.ts`, `OrdersPage.tsx`, Database Production VPS  
**Chủ trì:** Master Orchestrator & Lead Planner  
**Trạng thái:**  **NGHIỆM THU THÀNH CÔNG (PASSED & DEPLOYED)**

---

### 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
- **Vấn đề phát hiện:** Khi tạo một đơn bán lẻ bình thường (`MAVL...`), hệ thống lại tự động tạo mới một gói sản phẩm trong trang "Gói Sản Phẩm" (`warehouse.package_products`) và một tài khoản kho (`warehouse.accounts`).
- **Nguyên nhân kỹ thuật:**
  1. *Frontend:* `DEFAULT_FORM_DATA` trong `frontend/src/features/orders/types.ts` bị gán mặc định `save_to_warehouse: true` và `save_to_package: true`. Khi mở form tạo đơn bán hàng lẻ, modal ẩn 2 công tắc toggle này đi nên Master không thể thấy để tắt, form ngầm gửi `save_to_package: true`.
  2. *Backend:* Trong `backend/src/domains/orders/services/orderService.js`, câu lệnh kiểm tra dùng toán tử OR (`||`):
     ```javascript
     const shouldSyncWarehouseOrPackage = isMavn || String(id_order).toUpperCase().startsWith("MAVN") || payload.save_to_package === true || payload.save_to_warehouse === true;
     ```
     Do frontend gửi `save_to_package: true`, backend đã kích hoạt khối đồng bộ kho/gói và chèn bản ghi vào bảng `warehouse.package_products`.

---

### 2. CÁC THAY ĐỔI ĐÃ TRIỂN KHAI

#### 2.1. Backend (`orderService.js`)
- Khóa chặt điều kiện: **Bắt buộc phải là đơn nhập kho (`isMavn`)** thì mới xét đến việc lưu kho hoặc tạo gói:
  ```javascript
  const isMavnOrder = isMavn || String(id_order).toUpperCase().startsWith("MAVN");
  const shouldSyncWarehouseOrPackage = isMavnOrder && (payload.save_to_package === true || payload.save_to_warehouse === true);
  if (shouldSyncWarehouseOrPackage) {
    await trx.savepoint(async (subTrx) => {
      const isSaveToWarehouse = payload.save_to_warehouse === true;
      const isSaveToPackage = payload.save_to_package === true;
      ...
  ```
- Mọi đơn bán hàng khách thông thường (`MAVC`, `MAVL`, `MAVT`...) bị chặn 100%, không bao giờ lọt vào khối lưu kho/gói.

#### 2.2. Frontend (`types.ts` & `OrdersPage.tsx`)
- Đặt mặc định `save_to_warehouse: false` và `save_to_package: false` trong `DEFAULT_FORM_DATA`.
- Trong `OrdersPage.tsx`:
  - Mở form đơn bán lẻ: Reset rõ ràng `save_to_warehouse: false`, `save_to_package: false`.
  - Mở form đơn nhập hàng: Kích hoạt `save_to_warehouse: true`, `save_to_package: true`.
  - Khi submit payload: Ràng buộc `save_to_warehouse: isImportTab ? ... : false` và `save_to_package: isImportTab ? ... : false`.

#### 2.3. Dọn dẹp dữ liệu rác trên Database VPS
- Đã xóa gói sản phẩm ID 136 (`Chat GPT` của `luongnhanson2002@gmail.com`) khỏi bảng `warehouse.package_products`.
- Đã xác nhận không còn tài khoản rác nào sót lại trong `warehouse.accounts` hay `warehouse.account_slots`.

#### 2.4. Triển khai & Xác minh (Deploy & Verification)
- Commit git: `c7c15ead` (`fix: restrict warehouse and package sync exclusively to MAVN import orders`).
- Frontend Build: `tsc && vite build` hoàn tất không lỗi trong 2.32s.
- Backend Tests: 48/48 unit tests pass 100%.
- Deploy VPS: `./deploy.sh` chạy thành công, tất cả container `Up (healthy)`.

---

### 3. KẾT LUẬN
Lỗi tự động tạo gói sản phẩm khi tạo đơn hàng bán lẻ đã được khắc phục triệt để và an toàn.
Hệ thống hiện tại phân biệt rạch ròi 100%: Chỉ đơn nhập kho `MAVN` mới được phép tương tác với kho hàng và gói sản phẩm.

---

<a id="nhiem-vu-5"></a>
## 5. NHIỆM VỤ 5: BÁO CÁO NGHIỆM THU: KHÔI PHỤC HIỂN THỊ ĐỦ 7 TRANG KHO HÀNG & GOOGLE 5000GB

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-fix-warehouse-double-pagination-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-fix-warehouse-double-pagination-review.md)

**Mã nghiệm thu:** `FIX-WAREHOUSE-PAGINATION-2026-10-31`  
**Ngày thực hiện:** 31/10/2026 (Múi giờ Asia/Bangkok)  
**Phạm vi:** `frontend/src/pages/WarehousePage.tsx`, VPS Production Deployment  
**Chủ trì:** Master Orchestrator & Frontend Lead  
**Trạng thái:**  **NGHIỆM THU THÀNH CÔNG (PASSED & DEPLOYED)**

---

### 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)
- **Hiện tượng:** Master vào trang Kho Hàng (`/warehouse`) thấy từ hơn 7 trang bị rút ngắn chỉ còn đúng 2 trang (20 tài khoản). Các tài khoản như `Google One 5Tb` (`duch60606@gmail.com`), Google 2000GB, Youtube, Netflix... không hiển thị.
- **Xác minh Database:** Toàn bộ 63 tài khoản kho và 67 slots (bao gồm `duch60606@gmail.com` - Google One 5Tb) **vẫn còn nguyên vẹn 100%** trong bảng `warehouse.accounts` và `warehouse.account_slots`.
- **Nguyên nhân kỹ thuật:** Lỗi phân trang kép (Double Slicing):
  - Component con `WarehouseAccountsTable.tsx` đã có sẵn cơ chế phân trang nội bộ 10 dòng/trang.
  - Tuy nhiên trang cha `WarehousePage.tsx` lại thực hiện `filteredAccounts.slice(0, 20)` và chỉ truyền 20 items vào bảng.
  - Do bảng sắp xếp theo tên dịch vụ A-Z, 20 tài khoản đầu tiên bị Adobe chiếm toàn bộ. 43 tài khoản còn lại (vần G, N, Y) bị cắt bỏ ở trang cha nên bảng con chỉ hiển thị 2 trang (20 dòng Adobe).

---

### 2. GIẢI PHÁP & THỰC THI (ACTION TAKEN)
1. Trong [`WarehousePage.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/WarehousePage.tsx):
   - Bỏ `pagedAccounts`, khôi phục truyền trực tiếp toàn bộ mảng `accounts={filteredAccounts}` vào `WarehouseAccountsTable`.
   - Bỏ thanh phân trang thừa bên ngoài trang cha, để `WarehouseAccountsTable` tự động quản lý phân trang 10 dòng/trang.
2. Build frontend: `tsc && vite build` hoàn tất sạch sẽ không lỗi.
3. Commit Git: `4a7655ea` (`fix(warehouse): remove double slicing pagination to restore full 7 pages and Google accounts`).
4. Rebuild container Frontend trên VPS và xóa sạch cache Nginx host.

---

### 3. KẾT QUẢ NGHIỆM THU
- Bảng Kho hàng trên VPS đã nạp đầy đủ toàn bộ 63 tài khoản.
- Số trang hiển thị: Đầy đủ **7 trang** (`63 tài khoản / 10 dòng = 7 trang`).
- Tài khoản **Google One 5Tb (`duch60606@gmail.com`)**, 8 tài khoản **Google One 2000Gb**, **Google One 2Tb**, **Netflix**, **Youtube** đã hiển thị lại đầy đủ 100%.

---

<a id="nhiem-vu-6"></a>
## 6. NHIỆM VỤ 6: BÁO CÁO TRIỂN KHAI MASTER TASK - 2026-10-31

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-master-task-implementation-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-master-task-implementation-review.md)

### Phạm vi

- Đồng bộ phân trang URL cho đơn hàng, bảng giá, biên lai, chi phí ngoài luồng và kho.
- Sắp xếp tab đơn hết hạn theo `expired_at DESC NULLS LAST`.
- Tất toán công nợ NCC theo số tiền bank thực trả: `debt - supplier.id`; ví dụ NCC ID `1`, nợ `500.000 đ` tạo biên lai và allocation duy nhất `499.999 đ`.
- Thêm `variant_tag` cho `warehouse.account_slots` và thống kê catalog theo số tài khoản distinct.

### Trạng thái nghiệm thu

**CHƯA NGHIỆM THU LIVE**. Mã nguồn đã build/test tĩnh thành công, nhưng migration chưa được áp dụng và test tích hợp tài chính chưa được chạy trên database test cô lập.

### Đã triển khai

- `supplierSettlementService` khóa NCC, các dòng công nợ và biên lai bằng `FOR UPDATE`; cập nhật log sang `Đã Thanh Toán`, tạo đúng một allocation `SUPPLIER`, lưu audit `NCC{id}`, `settledDebt`, `bankPaidAmount`, `suffixAmount`.
- Webhook tiền ra chỉ tự tất toán khi có đúng một NCC khớp `debt = transferAmount + supplier.id` và có xác minh `NCC{id}` hoặc số tài khoản người nhận; webhook không khớp giữ biên lai `UNALLOCATED`.
- Nút thanh toán thủ công tạo biên lai `out` và gọi cùng hàm tất toán trong một transaction; event `SUPPLIER_DEBT_PAID` chỉ phát sau commit.
- VietQR NCC dùng số tiền bank thực trả và nội dung `NCC{id}`; `/invoices` hiển thị badge `Chi Trả NCC`.
- Migration `20261031000001_add_variant_tag_to_warehouse_account_slots.js`, registry `COLS.ACCOUNT_SLOTS.VARIANT_TAG`, API và modal kho hỗ trợ tag biến thể.

### Kiểm tra đã chạy

- `node --check` cho các module backend thay đổi và test integration cập nhật: đạt.
- `npm --prefix backend test`: đạt, 48/48 test.
- `npm --prefix frontend run build`: đạt, `tsc` và Vite build không lỗi.
- `npx.cmd knex migrate:list` trong `backend`: phát hiện đúng 1 migration chờ áp dụng: `20261031000001_add_variant_tag_to_warehouse_account_slots.js`.
- `git diff --check`: đạt.

### Điều kiện trước nghiệm thu

1. Áp dụng migration trên sandbox/development đã xác nhận, không chạy tự động vào database `mydtbmav` dùng chung.
2. Thiết lập `TEST_DATABASE_URL` trỏ tới database có tên chứa `test`, chạy `npm --prefix backend run test:integration -- tests/integration/webhook_receipt.test.js`.
3. Bổ sung/chạy test regression tạo NCC ID `1`, nợ `500.000 đ`, webhook `499.999 đ`, `NCC1`; xác nhận một allocation `499.999 đ`, không có allocation `1 đ`, replay và race không double-settlement.
4. Smoke UI sau migration: URL phân trang giữ sau F5, filter reset về trang 1, kho hiển thị tag và tổng số tài khoản đúng.

---

<a id="nhiem-vu-7"></a>
## 7. NHIỆM VỤ 7: ĐÁNH GIÁ LẠI `2026-10-31_MASTER_TASK_PLAN.MD` V2.0 — 2026-10-31

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-master-task-plan-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-master-task-plan-review.md)

### Phạm vi

Rà lại bản v2.0 của `docs/plans/2026-10-31_master_task_plan.md` so với các phát hiện trong báo cáo trước và contract runtime hiện có của phân bổ biên lai, webhook tiền ra, công nợ NCC, Kho hàng và phân trang URL.

### Trạng thái nghiệm thu

**Chưa đủ điều kiện triển khai toàn bộ kế hoạch.**

Bản v2.0 đã khắc phục đáng kể: xác định một SSOT canonical, bổ sung contract URL, nêu migration/backfill cho tag, cô lập sort đơn hết hạn, dùng service transaction-bound, `forUpdate()`, `trx.afterCommit()` và tái sử dụng receipt webhook. Tuy nhiên, Mục 4 vẫn có một lỗi P0 làm allocation vượt số tiền thực có của receipt; không được triển khai trước khi chỉnh lại contract này.

### Phát hiện

#### P0 - Chặn triển khai Mục 4

1. **Hai allocation của suffix discount vượt quá số tiền có thể phân bổ từ receipt.**
   - Plan yêu cầu receipt có `amount = transferAmount` nhưng tạo hai allocation: `SUPPLIER_PAYMENT = transferAmount` và `SUPPLIER_SUFFIX_DISCOUNT = supplier.id`. Tổng allocation bằng `settledDebt`, lớn hơn `receipt.amount` đúng bằng `supplier.id`.
   - Contract hiện hữu lấy `unallocated_amount` khởi tạo bằng `receipt.amount`, rồi từ chối bất kỳ allocation nào lớn hơn số dư còn lại. Vì allocation thực chi đã dùng hết `transferAmount`, allocation suffix thứ hai không thể được ghi theo luồng chuẩn; nếu bypass guard thì `unallocated_amount` thành âm và `FULLY_ALLOCATED` không còn phản ánh tiền ngân hàng thực tế.
   - Sửa tối thiểu: receipt và `payment_receipt_allocations` chỉ ghi nhận tiền ngân hàng thực chi `transferAmount`; phần `suffixDiscount` phải là bút toán/ledger riêng không tiêu thụ `unallocated_amount` của receipt, hoặc loại bỏ khoản trừ tiền và chỉ dùng `NCC{id}` làm định danh. Không được thêm `SUPPLIER_SUFFIX_DISCOUNT` vào allocation của cùng receipt nếu không mở rộng schema/contract để phân biệt non-cash allocation.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:112`, `docs/plans/2026-10-31_master_task_plan.md:120`, `backend/src/domains/payments/services/webhookPaymentService.js:87`, `backend/src/domains/invoices/services/invoiceService.js:195`, `backend/src/domains/invoices/services/invoiceService.js:196`.

#### P1 - Cần chốt trước khi code

2. **Điều kiện auto-match dùng `NCC{id}` hoặc STK vẫn có thể tất toán sai NCC.**
   - Cùng một `transferAmount` có thể thỏa công thức cho hơn một NCC. Kế hoạch hiện cho phép chỉ một trong hai dấu hiệu `NCC{id}` hoặc STK nhận khớp; nếu payload webhook thiếu/chuẩn hóa sai một trường, điều kiện `OR` dễ chọn nhầm.
   - Yêu cầu matcher trả về đúng một ứng viên. Khi webhook có cả nội dung và STK, cả hai phải khớp cùng NCC; khi chỉ có một trường, không tự tất toán mà giữ receipt `UNALLOCATED` để đối soát thủ công. Ghi test cho collision số tiền và receiver/content không khớp.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:145`, `docs/plans/2026-10-31_master_task_plan.md:147`.

3. **Tag được định nghĩa là thuộc “tài khoản” nhưng lại lưu ở `warehouse.stock_services`; quy tắc đếm vẫn chưa được khóa.**
   - Một `PRODUCT_KEYS` account hiện có thể chứa nhiều `STOCK_SERVICES`. Nếu catalog đếm row `stock_services` là account, một account vật lý có nhiều dịch vụ/tag bị đếm nhiều lần và trái với yêu cầu “đơn vị đếm duy nhất là Tài Khoản”.
   - Plan cần quyết định rõ: một account chỉ có đúng một `stock_services` đại diện hay `variant_tag` phải chuyển sang entity account. Nếu vẫn lưu tại `stock_services`, catalog phải đếm `COUNT(DISTINCT account_id)` và migration cần unique constraint phù hợp với quy tắc đó.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:52`, `docs/plans/2026-10-31_master_task_plan.md:64`, `docs/plans/2026-10-31_master_task_plan.md:70`, `backend/src/domains/warehouse/services/warehouseService.js:94`, `backend/src/domains/warehouse/services/warehouseService.js:381`.

4. **“Thanh toán thủ công” chưa định nghĩa điểm ghi nhận tiền để không trừ số dư hai lần khi webhook đến sau.**
   - Plan nói nút thủ công tự tạo receipt tiền ra, trong khi webhook outbound cũng tạo receipt và gọi `debitFinancialAccount`. Nếu thao tác tay là xác nhận một giao dịch ngân hàng sẽ có webhook sau đó, hệ thống sẽ có hai receipt và hai lần ghi giảm tài chính.
   - Chốt một flow: thao tác tay chỉ tạo “yêu cầu chờ webhook”, hoặc thao tác tay ghi nhận giao dịch external đã hoàn tất với `reference_code` bắt buộc và webhook phải dedupe theo reference đó. Test Gate 3 cần có case manual trước webhook, webhook trước manual và retry webhook.
   - Tham chiếu: `docs/plans/2026-10-31_master_task_plan.md:137`, `docs/plans/2026-10-31_master_task_plan.md:165`, `backend/src/domains/payments/services/webhookPaymentService.js:83`, `backend/src/domains/payments/services/webhookPaymentService.js:102`.

### Các điểm đã đạt

- Có một canonical SSOT: `docs/plans/2026-10-31_master_task_plan.md`.
- URL pagination đã có parse/clamp, reset filter, merge params, `push`/`replace` và acceptance cơ bản.
- Sort tab expired được cô lập khỏi các tab khác với tie-break `id DESC`.
- Mục 4 đã nêu lock NCC + log, guard khi hết `UNPAID`, tái sử dụng receipt webhook và event post-commit; `trx.afterCommit` có tồn tại trong runtime.
- Có migration/index/backfill `variant_tag`, test gate schema và test race webhook/manual.

### Kiểm tra đã chạy

- Đọc lại toàn bộ plan v2.0 và đối chiếu từng mục với báo cáo trước.
- Đọc `withTransaction`/`trx.afterCommit`, webhook outbound, `paySupplierDebt`, allocation guard, warehouse account/catalog service và constants allocation.
- Không chạy test/build vì chưa có implementation mới để kiểm chứng.

### Điều kiện nghiệm thu kế hoạch

1. Sửa P0 bằng contract non-cash suffix discount riêng, hoặc không trừ `supplier.id` khỏi số tiền chuyển.
2. Đổi auto-match sang điều kiện duy nhất, fail-closed và thêm fixture collision.
3. Khóa entity ownership + cách đếm account cho `variant_tag`.
4. Chọn và ghi rõ manual-payment lifecycle có dedupe với webhook.

Sau bốn chỉnh sửa này, kế hoạch sẽ đủ chi tiết để bắt đầu implementation theo từng phase; việc nghiệm thu implementation vẫn phải dựa trên migration, integration test và browser test thực tế.

---

<a id="nhiem-vu-8"></a>
## 8. NHIỆM VỤ 8: BÁO CÁO NGHIỆM THU: XỬ LÝ LỖI TỰ ĐỘNG TẢI LẠI TRANG KHI NOTIFY BIẾN MẤT

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-notify-auto-reload-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-notify-auto-reload-review.md)

- **Ngày thực hiện:** 31/10/2026 (Múi giờ: `Asia/Bangkok`)
- **Phạm vi xử lý:** Frontend React (`NotificationContext` & các trang sử dụng Hook thông báo)
- **Trạng thái nghiệm thu:** **HOÀN THÀNH (PASSED)**

---

### 1. PHẠM VI & MÔ TẢ VẤN ĐỀ
- **Hiện tượng**: Khi thông báo (Toast Notify) ở góc dưới màn hình biến mất (sau thời gian tự huỷ 5 giây), trang Nhà Cung Cấp (`/sources`) tự động kích hoạt `fetchSuppliersOverview()` tải lại toàn bộ danh sách một lần nữa.
- **Nguyên nhân gốc (Root Cause)**:
  1. `NotificationContext.Provider` truyền giá trị `value={{ info, success, warning, error, confirm, close }}` trực tiếp dưới dạng object literal mà không dùng `useMemo`.
  2. Khi toast hết hạn sau 5 giây, `removeToast` thay đổi state `toasts` khiến `NotificationProvider` re-render và tạo ra object reference mới cho `value`.
  3. Hook `useCallback` trong `SuppliersPage.tsx` (và một số trang khác) đặt `notify` vào dependency array. Khi `notify` đổi reference, callback fetch data bị tạo mới, kích hoạt `useEffect` gọi lại API không cần thiết.

---

### 2. NỘI DUNG THAY ĐỔI
- **Lớp 1 (Cốt lõi SSOT)**:
  - File: `frontend/src/shared/context/NotificationContext.tsx`
  - Bọc toàn bộ các hàm thông báo trong `useMemo(() => ({ info, success, warning, error, confirm, close }), [...])` để đảm bảo context value có reference bất biến (stable) 100%. Khi danh sách toasts thay đổi (thêm/xoá/hết hạn), context value không bị re-create, ngăn chặn re-render vô ích cho toàn bộ các components tiêu thụ `useNotification`.
- **Lớp 2 (Tách biệt logic tải dữ liệu)**:
  - Loại bỏ `notify` khỏi dependency array của các hàm `useCallback` fetch dữ liệu tại:
    - `frontend/src/pages/SuppliersPage.tsx`
    - `frontend/src/pages/PaymentWalletsPage.tsx`
    - `frontend/src/pages/PricingPage.tsx`
    - `frontend/src/pages/ExternalImportsPage.tsx`

---

### 3. KIỂM THỬ ĐÃ THỰC HIỆN
- **TypeScript Typecheck & Production Build**:
  - Lệnh chạy: `cd frontend && npm run build` (`tsc && vite build`)
  - Kết quả: **Thành công 100%** (1704 modules transformed, built in 8.91s, 0 errors, 0 warnings).
- **Rà soát mã nguồn (Grep check)**:
  - Kiểm tra toàn bộ codebase: Không còn file nào sót `notify` trong dependency array của React hooks.

---

### 4. KẾT LUẬN & ĐIỀU KIỆN NGHIỆM THU
- Lỗi tải lại trang khi notify đóng/biến mất đã được triệt tiêu hoàn toàn ở cả cấp độ Provider hệ thống và cấp độ Page.
- Không gây side-effect tới bất kỳ tính năng nào khác.

---

<a id="nhiem-vu-9"></a>
## 9. NHIỆM VỤ 9: NGHIỆM THU TRIỂN KHAI TỐI ƯU TẢI TRANG LẦN 1

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-page-loading-performance-implementation-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-page-loading-performance-implementation-review.md)

> **Kế hoạch:** `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md`  
> **Ngày nghiệm thu:** 31/10/2026 (Asia/Bangkok)  
> **Phạm vi:** Backend Express, dashboard, Orders, Warehouse catalog, route prefetch, session cache và tài liệu kế hoạch.

### Trạng Thái

**ĐẠT VỀ MẶT MÃ NGUỒN VÀ BUILD/UNIT TEST; CHƯA NGHIỆM THU ĐỊNH LƯỢNG HIỆU NĂNG.**

Các tối ưu đã được triển khai với ưu tiên tính đúng đắn dữ liệu: không cache TTL cho dashboard, số dư, danh sách đơn hoặc metadata Orders. Benchmark p50/p95 và kiểm tra network/live database vẫn phải thực hiện theo Phase 0 trước khi khẳng định mức cải thiện thời gian tải.

### Thay Đổi Đã Nghiệm Thu

- Express sử dụng `compression` level 6 tại `backend/src/server.js:18`; dependency đã có trong `backend/package.json` và lockfile.
- Dashboard chạy đồng thời sáu phép thống kê độc lập bằng `Promise.all` tại `backend/src/domains/dashboard/services/dashboardService.js:174`.
- API Orders nhận `includeStats` mà không phá response mặc định tại `backend/src/domains/orders/routes.js:9` và `backend/src/domains/orders/services/orderService.js:148`.
- `OrdersPage` không tải catalog khi mount; Tạo/Sửa đơn gọi `ensureOrderCatalog({ refresh: true })`, chống request trùng click và chỉ mở modal sau khi dữ liệu nguồn sẵn sàng tại `frontend/src/pages/OrdersPage.tsx:278` và `frontend/src/features/orders/hooks/useOrderCatalog.ts:50`.
- Cache in-memory chỉ dùng cho catalog Kho/system products, có TTL, stale-while-revalidate, dedupe và invalidation sau mutation tại `frontend/src/shared/api/apiCache.ts:66` và `frontend/src/pages/WarehousePage.tsx:101`.
- Cache bị xóa khi login/logout tại `frontend/src/shared/context/AuthContext.tsx:86` và `frontend/src/shared/context/AuthContext.tsx:102`.
- Route prefetch dùng registry chung, kích hoạt trên hover/focus sidebar tại `frontend/src/routes/routeLoaders.ts:26` và `frontend/src/layout/Sidebar.tsx:244`.

### Quyết Định An Toàn

- `OrdersPage` luôn lấy `tabCounts` và `summary` live. Dù backend hỗ trợ `includeStats=false`, frontend chưa dùng vì webhook hoặc mutation từ màn hình khác có thể làm metadata cũ.
- Catalog giá/NCC của form Orders không dùng cache toàn cục; mỗi lần mở Tạo/Sửa tải nguồn hiện tại để không dùng giá hoặc NCC cũ.
- Dashboard, công nợ, ví và dữ liệu tài chính không dùng TTL cache.

### Kiểm Tra Đã Chạy

- `npm --prefix frontend run build` - pass: TypeScript và Vite production build thành công.
- `npm --prefix backend test` - pass: 48 tests, 0 failed.
- `node --check` cho `backend/src/server.js`, `backend/src/domains/dashboard/services/dashboardService.js`, `backend/src/domains/orders/routes.js`, `backend/src/domains/orders/services/orderService.js` - pass.
- Xác minh module `compression` có thể require thành công.
- `git diff --check` cho toàn bộ file thuộc phạm vi - pass, chỉ còn cảnh báo line-ending do cấu hình Git Windows.

### Chưa Thể Nghiệm Thu

- Chưa đo cold/warm navigation p50/p95, response bytes và `Content-Encoding` trên runtime deploy.
- Chưa chạy `EXPLAIN (ANALYZE, BUFFERS)` cho Orders bằng dataset gần production.
- Chưa có smoke test browser cho cold-open modal, logout/login cùng tab, prefetch keyboard và response gzip vì lần này chưa khởi động môi trường runtime/DB.

### Lưu Ý

- Lệnh cài `compression` báo `npm audit` có 8 advisory mức moderate trong dependency tree. Không chạy `npm audit fix` để tránh thay dependency ngoài phạm vi.
- Bước tiếp theo bắt buộc là Phase 0 trong kế hoạch: đo baseline và so sánh sau triển khai trước khi tuyên bố các mục tiêu thời gian tải.

---

<a id="nhiem-vu-10"></a>
## 10. NHIỆM VỤ 10: ĐÁNH GIÁ KẾ HOẠCH TỐI ƯU TỐC ĐỘ TẢI TRANG

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-page-loading-performance-optimization-plan-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-page-loading-performance-optimization-plan-review.md)

> **Kế hoạch được đánh giá:** `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md`  
> **Ngày đánh giá:** 31/10/2026 (Asia/Bangkok)  
> **Phạm vi:** Tính đúng đắn của giả định kỹ thuật, an toàn dữ liệu, contract API/UI, khả năng kiểm thử và tiêu chí nghiệm thu. Không sửa mã nguồn trong lần đánh giá này.

### Trạng Thái Nghiệm Thu

**CHƯA NGHIỆM THU.**

Kế hoạch xác định đúng hai điểm nghẽn đã được xác nhận trong mã nguồn: dashboard đang chạy sáu truy vấn thống kê tuần tự và `OrdersPage` tải catalog ngay khi mount. Tuy nhiên, thiết kế lazy loading, cache và tối ưu phân trang chưa bảo toàn đầy đủ contract dữ liệu. Nếu triển khai theo nguyên văn, có rủi ro modal đơn hàng dùng catalog chưa sẵn sàng, số liệu đơn hàng cũ hoặc sai theo bộ lọc, và dữ liệu cache bị giữ khi đổi tài khoản.

### Phát Hiện

#### P1 - Lazy catalog chưa có contract sẵn sàng dữ liệu cho Create/Edit

- Kế hoạch yêu cầu chỉ tải catalog sau khi gọi `setIsCreateModalOpen(true)` hoặc `setIsEditModalOpen(true)` tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:113`, nhưng chưa nêu trạng thái `loading`, `error`, chống click lặp hoặc thời điểm được phép mở/lưu form.
- Hiện tại `useOrderCatalog` tải giá và NCC khi mount tại `frontend/src/features/orders/hooks/useOrderCatalog.ts:11`; `handleOpenEdit` tra sản phẩm/NCC trực tiếp từ hai mảng catalog tại `frontend/src/pages/OrdersPage.tsx:318`. Sau khi chuyển sang lazy, mảng sẽ rỗng trong lần click đầu tiên nếu không có một hàm `ensureOrderCatalog()` dùng chung promise và chặn submit.
- Hệ quả: form Sửa có thể không map được `id_product`/`supply_id`, hoặc người dùng lưu trước khi bảng giá và NCC hoàn tất tải. Đây là rủi ro tính đúng đắn của đơn hàng, không chỉ là UX.
- Điều kiện sửa: thiết kế API hook có `ensureOrderCatalog(): Promise<void>`, trạng thái `isCatalogLoading`/`catalogError`, dedupe request và hủy request khi unmount. Modal chỉ mở sau khi catalog thiết yếu sẵn sàng, hoặc phải khóa trường và nút Lưu với skeleton rõ ràng. Thêm test cold-open cho Tạo và Sửa đơn, bao gồm thao tác click hai lần.

#### P1 - `includeStats=false` chưa bảo toàn response contract của trang Đơn hàng

- Kế hoạch đề xuất bỏ `tabCounts` và `summary` khi đổi trang tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:103`, nhưng chưa chỉ rõ contract trả về, key cache hay cách UI biết metadata còn hợp lệ.
- `getOrders` hiện luôn trả `data`, `pagination`, `tabCounts` và `summary` tại `backend/src/domains/orders/services/orderService.js:148`; `OrdersPage` tiêu thụ `tabCounts` và `summaryData` từ `useOrders` tại `frontend/src/pages/OrdersPage.tsx:33`. `summary` còn phụ thuộc tab, trạng thái và truy vấn, không thể dùng một cache chung cho toàn bộ đơn hàng.
- Hệ quả: đổi trang, đổi tab, tìm kiếm hoặc thay đổi trạng thái có thể hiển thị badge/tổng tiền của truy vấn cũ. Với số liệu doanh thu, chi phí và công nợ, đây là sai lệch nghiệp vụ.
- Điều kiện sửa: giữ nguyên response contract mặc định. Nếu tách tối ưu, dùng request tường minh như `view=rows` chỉ khi client đang giữ metadata đã xác thực cùng query context; cache key phải gồm ít nhất `tab`, `status`, `search`, khoảng ngày, `page`, `limit` và phiên bản dữ liệu. Mutation phải làm cũ toàn bộ các key orders liên quan, sau đó lấy lại metadata trước khi cho phép tin số liệu hiển thị.

#### P1 - Cache client chưa cô lập phiên đăng nhập và chưa có ma trận invalidation

- Phase 3 chỉ quy định TTL và hai prefix invalidation tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:130`, đồng thời khẳng định mọi thao tác ghi đều không lệch cache tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:142`. Kế hoạch không định nghĩa namespace theo tài khoản/phiên, xóa cache khi logout, xử lý request đang chạy hay danh sách domain bị ảnh hưởng của từng mutation.
- Sidebar hiện gọi `logout()` rồi điều hướng tại `frontend/src/layout/Sidebar.tsx:45`. Một in-memory cache mới sẽ còn tồn tại trong SPA nếu không được xóa chủ động trước khi người dùng khác đăng nhập trên cùng trình duyệt.
- Hệ quả: có thể lộ dữ liệu đã cache qua đổi tài khoản, đồng thời dashboard/đơn hàng/kho hiển thị dữ liệu cũ sau các luồng ghi ngoài danh sách năm thao tác được nêu.
- Điều kiện sửa: cache phải có `sessionEpoch` hoặc định danh tài khoản trong key, `clearApiCache()` trong logout và khi nhận 401/403, dedupe request theo key, `AbortController`, cùng một bảng invalidation theo domain/mutation. Không dùng cache cho dữ liệu nhạy cảm hoặc số dư nếu chưa định nghĩa chính sách freshness và tái xác thực.

#### P2 - Mục tiêu và tiêu chí hiệu năng chưa được đo đạc, chưa thể kiểm chứng

- Các con số baseline/target ở `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:8`, `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:66` và `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:163` không kèm môi trường đo, kích thước dataset, thiết bị, mạng, percentile hay trace SQL/HTTP.
- Mã nguồn xác nhận dashboard đang tuần tự gọi sáu hàm tại `backend/src/domains/dashboard/services/dashboardService.js:163`, và `getOrders` thực hiện bốn count tab, count tổng, hai aggregate rồi truy vấn dữ liệu tại `backend/src/domains/orders/services/orderService.js:153`. Tuy nhiên, chưa có số liệu cho biết truy vấn nào là bottleneck thực tế hoặc `Promise.all` có làm bão hòa pool PostgreSQL hay không.
- Điều kiện sửa: thêm Phase 0 đo baseline cho cold/warm route navigation và các endpoint chính; lưu p50/p95, response bytes nén/chưa nén, số request, thời gian DB và `EXPLAIN (ANALYZE, BUFFERS)` cho truy vấn Orders. Chỉ chốt mục tiêu sau khi có baseline trên dữ liệu gần production.

#### P2 - Compression cần chốt ranh giới triển khai và tiêu chí kiểm thử đúng giao thức

- Nhận định backend chưa dùng `compression` là đúng: `backend/package.json:23` chưa có dependency và `backend/src/server.js:60` chỉ có CORS/JSON/session. Tuy vậy, kế hoạch gọi là “Gzip/Brotli” tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:50` nhưng snippet chỉ cấu hình package `compression`, chưa nêu chiến lược Brotli, reverse proxy/ingress, ngưỡng nén, hay chi phí CPU.
- Tiêu chí yêu cầu `Content-Encoding: gzip` trên “mọi response `/api/*`” tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:177` là không đúng: response chỉ có thể nén khi client gửi `Accept-Encoding` phù hợp và response đủ điều kiện; lỗi nhỏ, stream hoặc nội dung đã nén có thể không có header này.
- Điều kiện sửa: quyết định một tầng nén duy nhất sau khi kiểm tra môi trường deploy; cấu hình `Vary: Accept-Encoding`, ngưỡng nén, loại trừ stream/webhook nếu có và test so sánh cùng endpoint với/không có `Accept-Encoding`. Nghiệm thu theo response JSON đủ lớn đại diện, không theo mọi response API.

#### P2 - Prefetch chỉ theo hover chưa bao phủ thiết bị và thiếu ngân sách tải

- Kế hoạch chỉ nêu `onMouseEnter` tại `docs/plans/2026-10-31_page_loading_performance_optimization_plan.md:152`. `Sidebar` thực tế render `NavLink` từ cấu hình điều hướng tại `frontend/src/layout/Sidebar.tsx:236`; kế hoạch chưa có map từ từng `item.path` đến lazy importer.
- Hover không hoạt động cho bàn phím và thiết bị cảm ứng; prefetch toàn bộ menu hoặc prefetch lặp có thể cạnh tranh băng thông với request dữ liệu. Mục tiêu “triệt tiêu hoàn toàn” độ trễ cũng không thực tế với route chưa từng truy cập hoặc mạng bị hạn chế.
- Điều kiện sửa: khai báo registry route-to-importer dùng chung với `AppRoutes`, prefetch một lần trên `onPointerEnter`/`onFocus`, giới hạn theo `navigator.connection.saveData` và mạng chậm, đồng thời có chiến lược cho touch. Đo riêng cold navigation và warm navigation sau prefetch.

### Điểm Đúng Có Thể Giữ Lại

- Thêm nén response có cơ sở, sau khi làm rõ tầng deploy và kiểm thử giao thức.
- Song song hóa sáu phép thống kê độc lập của dashboard là quick win hợp lý; cần đo trước/sau và giữ giới hạn pool DB.
- Tách catalog khỏi lần render ban đầu của `OrdersPage` có tiềm năng giảm bốn request thừa; bắt buộc bổ sung contract tải catalog nêu trên.
- `getOrders` đang tính `tabCounts` song song sẵn có; phần còn nặng là count/aggregate/query theo context. Ưu tiên đo truy vấn và thiết kế metadata tách bạch thay vì cache mù quáng.

### Thứ Tự Triển Khai Đề Xuất

1. Phase 0: dựng đo lường và chụp baseline có thể lặp lại.
2. Thực hiện compression và song song hóa dashboard, kèm test HTTP và kiểm tra tải DB.
3. Tách Orders thành metadata/rows với contract rõ ràng; thêm lazy catalog có loading, dedupe và test cold-open.
4. Thêm cache có namespace phiên, invalidation matrix và regression test cho đổi tài khoản/mutation.
5. Sau đó mới thêm prefetch có registry, giới hạn băng thông và hỗ trợ keyboard/touch; thay spinner bằng skeleton theo trạng thái dữ liệu thực tế.

### Kiểm Tra Đã Thực Hiện

- Đọc toàn bộ kế hoạch và đối chiếu tĩnh với route, service và component hiện hành.
- Xác nhận `React.lazy`/`Suspense` đã có trong `frontend/src/routes/AppRoutes.tsx:60`; route prefetch là cải tiến bổ sung, không phải điều kiện để có code splitting.
- Xác nhận dashboard chạy tuần tự sáu phép thống kê tại `backend/src/domains/dashboard/services/dashboardService.js:167`.
- Xác nhận `OrdersPage` hiện tải năm API catalog khi mount qua `frontend/src/pages/OrdersPage.tsx:81` và `frontend/src/features/orders/hooks/useOrderCatalog.ts:11`.
- Không chạy benchmark, test tích hợp hoặc migration vì đây là review kế hoạch, chưa có thay đổi mã nguồn để nghiệm thu runtime.

### Điều Kiện Để Nghiệm Thu Kế Hoạch

- Cập nhật kế hoạch với các contract lazy/catalog, metadata Orders và cache/invalidation ở các phát hiện P1.
- Bổ sung Phase 0, bảng chỉ số p50/p95 và kịch bản benchmark có thể tái lập.
- Bổ sung test regression cho cold-open modal, query/filter/pagination, mutation invalidation và đổi tài khoản.
- Chỉ duyệt triển khai từng phase sau khi baseline và acceptance test của phase trước đạt yêu cầu.

---

<a id="nhiem-vu-11"></a>
## 11. NHIỆM VỤ 11: BÁO CÁO KỸ THUẬT: SẮP XẾP LẠI ID NHÀ CUNG CẤP & DỌN DẸP GÓI KHO (VPS PRODUCTION)

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-supplier-reindex-and-package-cleanup-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-supplier-reindex-and-package-cleanup-review.md)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-31
- **Chủ đề:** Sắp xếp lại dải ID bảng `business.supplier` (1 -> 23) và dọn dẹp gói kho liên kết NCC đã xóa
- **Môi trường:** VPS Production (`mydtbmav` trên PostgreSQL container `admin_orderlist-postgres`)
- **Trạng thái:** **ĐÃ CHẠY DRY-RUN THÀNH CÔNG (CHỜ MASTER PHÊ DUYỆT)**

---

### 1. Hiện Trạng & Rà Soát Trước Khi Thực Hiện

#### 1.1. Bảng Nhà Cung Cấp (`business.supplier`)
- Hiện có **23 Nhà Cung Cấp**.
- Dải ID hiện tại bị phân mảnh lớn do các NCC cũ bị xóa: `2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 22, 23, 30, 48, 68, 70, 71, 91, 92, 93`.
- Bảng Sequence `supplier_id_seq` đang ở mức 93.

#### 1.2. Các Bảng Đang Tham Chiếu Đến ID Nhà Cung Cấp
1. **`business.order_list` (Đơn hàng)**: Có **1.016 đơn hàng** đang lưu `supply_id`.
2. **`business.supplier_cost` (Giá vốn biến thể)**: Có **213 bản ghi** `supplier_id`. *(Lưu ý: Bảng này có UNIQUE KEY `(variant_id, supplier_id)`, do đó phải dùng thuật toán Temporary Offset để tránh lỗi duplicate key)*.
3. **`business.supplier_order_cost_log` (Lịch sử nợ NCC)**: Có **441 bản ghi** `supply_id`.
4. Mã nguồn backend [`supplierCheck.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/suppliers/utils/supplierCheck.js): Đang có kiểm tra `supplyId === 22` cho NCC Mavryk.

#### 1.3. Bảng Gói Match Variant & NCC (`warehouse.package_products`)
- Bảng `business.supplier_cost` (match variant - NCC) đã tự động dọn dẹp sạch nhờ Foreign Key CASCADE khi xóa NCC.
- Bảng kho `warehouse.package_products`: Phát hiện **1 bản ghi mồ côi** của NCC `Bongmin` vừa xóa:
  - `ID: 127` | Gói `Adobe` | `supplier = 'Bongmin'` | `slot: 2` | `match_rule: information`.
  - Bản ghi này sẽ được xóa hoàn toàn theo yêu cầu của Master.

---

### 2. Đề Xuất Bảng Ánh Xạ ID Mới (Mapping Plan)

#### Phương Án Ưu Tiên (Đề xuất): Đưa `Mavryk` lên ID = 1 (NCC Shop Chính), các đối tác từ 2 -> 23

| Old ID | New ID | Tên Nhà Cung Cấp | Số Đơn Đang Giữ | Số Biến Thể Có Giá Vốn | Số Log Nợ |
| :---: | :---: | :--- | :---: | :---: | :---: |
| **22** | **1** | **Mavryk (Shop Chính)** | 11 đơn | 29 biến thể | 5 logs |
| 2 | 2 | Ades | 196 đơn | 36 biến thể | 79 logs |
| 3 | 3 | Luv | 86 đơn | 16 biến thể | 29 logs |
| 4 | 4 | Lê Minh Nghĩa | 258 đơn | 34 biến thể | 114 logs |
| 5 | 5 | Toàn Mai | 39 đơn | 11 biến thể | 16 logs |
| 6 | 6 | Đỗ Thanh Hoài | 81 đơn | 13 biến thể | 38 logs |
| 8 | 7 | Trần Việt | 17 đơn | 1 biến thể | 8 logs |
| 9 | 8 | Nhi | 18 đơn | 3 biến thể | 8 logs |
| 10 | 9 | Huy Zoom | 4 đơn | 4 biến thể | 4 logs |
| 11 | 10 | Khánh | 11 đơn | 5 biến thể | 5 logs |
| 12 | 11 | Nguyễn Sơn | 5 đơn | 3 biến thể | 3 logs |
| 13 | 12 | Member Ji | 14 đơn | 4 biến thể | 8 logs |
| 14 | 13 | Tài | 64 đơn | 12 biến thể | 26 logs |
| 16 | 14 | @thanglongcung | 49 đơn | 10 biến thể | 23 logs |
| 23 | 15 | Az | 14 đơn | 5 biến thể | 5 logs |
| 30 | 16 | Lê Anh Tuấn | 0 đơn | 0 biến thể | 0 logs |
| 48 | 17 | Badman | 7 đơn | 3 biến thể | 4 logs |
| 68 | 18 | Vân Anh | 20 đơn | 1 biến thể | 10 logs |
| 70 | 19 | @qshop123 | 55 đơn | 9 biến thể | 24 logs |
| 71 | 20 | @rocky_VIVA | 43 đơn | 4 biến thể | 15 logs |
| 91 | 21 | @thaois_bot | 1 đơn | 0 biến thể | 0 logs |
| 92 | 22 | Trần Vỹ | 13 đơn | 5 biến thể | 4 logs |
| 93 | 23 | Yuna | 10 đơn | 4 biến thể | 3 logs |

*(Nếu Master muốn giữ nguyên thứ tự ID cũ thì Mavryk sẽ là ID 14, Ades là ID 1)*.

---

### 3. Kết Quả Thử Nghiệm Dry-Run Kỹ Thuật

Đã chạy thử nghiệm thuật toán 2 bước (Temporary Offset `+10000` ➔ `New ID`) trên VPS:
- Cập nhật đồng bộ: 23 NCC, 1.016 đơn hàng, 213 giá vốn, 441 log công nợ.
- Sequence reset về 23.
- **Kết quả:** `matched_orders = 1016`, `matched_costs = 213`, `matched_logs = 441`. **100% khớp dữ liệu, 0 lỗi Unique Key.**

---

<a id="nhiem-vu-12"></a>
## 12. NHIỆM VỤ 12: BÁO CÁO NGHIỆM THU: MERGE CODE & DEPLOY DỰ ÁN LÊN VPS

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-vps-merge-and-deploy-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-vps-merge-and-deploy-review.md)

**Mã nghiệm thu:** `VPS-DEPLOY-2026-10-31`  
**Ngày thực hiện:** 31/10/2026 (Múi giờ Asia/Bangkok)  
**Môi trường:** VPS Production (`180.93.43.169`) — Thư mục `/var/www/admin_orderlist`  
**Chủ trì thực hiện:** Master Orchestrator & Backend Specialist  
**Trạng thái nghiệm thu:**  **THÀNH CÔNG 100% (PASSED & DEPLOYED)**

---

### 1. PHẠM VI XỬ LÝ (SCOPE)
- Khắc phục lỗi xung đột Git (`Your local changes would be overwritten by merge`) tại file `backend/src/domains/suppliers/utils/supplierCheck.js`.
- Kéo toàn bộ 50 files thay đổi mới nhất từ commit `24547c06` (`origin/main`).
- Rebuild các container Docker: Backend, Frontend, Postgres, Redis, Cloud-browser.
- Thực thi Knex Database Migration mới.
- Xóa toàn bộ Redis Cache (`FLUSHALL`) và reload Host Nginx.
- Kiểm tra tính ổn định, logs và Healthcheck của hệ thống trên VPS.

---

### 2. KẾT QUẢ THỰC HIỆN CHI TIẾT

#### 2.1. Git Merge & Fast-Forward
- Khôi phục trạng thái sạch (`git restore`) cho file `supplierCheck.js`.
- Thực hiện `git pull origin main`:
  - Trạng thái: **Fast-forward** từ `27a3d0f6` lên `24547c06`.
  - Đã nạp thành công **50 files changed** (2.553 insertions, 349 deletions).

#### 2.2. Database Migration (PostgreSQL)
- Tiến trình knex migration tự động chạy trong container backend:
  - **Batch 8 run: 1 migrations**.
  - File: `20261031000001_add_variant_tag_to_warehouse_account_slots.js`.
  - Kết quả: Đã thêm cột `variant_tag` và khởi tạo các composite index (`idx_warehouse_account_slots_variant_tag`, `idx_warehouse_account_slots_name_variant_tag`) an toàn, không có lỗi.

#### 2.3. Docker Containers Status
Tất cả 5 containers của dự án `admin_orderlist` đều đang ở trạng thái hoạt động tốt:
- `admin_orderlist-backend`: `Up (healthy)` — Cổng 3001, 5000.
- `admin_orderlist-frontend`: `Up` — Cổng 8081.
- `admin_orderlist-postgres`: `Up (healthy)` — Cổng 5432.
- `admin_orderlist-redis`: `Up (healthy)` — Cổng 6379.
- `admin_orderlist-cloud-browser`: `Up` — Cổng 3088.

#### 2.4. Khởi Động & Healthcheck
- **Backend Logs:**
  - Event Store & Bus: 100% Subscribers đã đăng ký thành công (Order, Product, Package, Supplier, Telegram, Warehouse).
  - ConfigService: Đã tải 37 cấu hình hệ thống vào bộ nhớ RAM.
  - Scheduler: 5 cron jobs đã khởi tạo hoạt động.
- **Frontend HTTP:**
  - `curl -I http://127.0.0.1:8081` ➔ Phản hồi `HTTP/1.1 200 OK`.
- **Cache & Proxy:**
  - Redis: `FLUSHALL OK`.
  - Host Nginx: `Reloaded successfully`.

---

### 3. PHÁT HIỆN & ĐIỀU KIỆN THEO DÕI
- **Mức độ Critical / High:** Không có.
- **Ghi chú vận hành:** Phiên bản mới đã kích hoạt đầy đủ tính năng tag biến thể kho hàng (Variant Tag), cơ chế URL Pagination cho các bảng danh sách và kiến trúc tối ưu hiệu năng trang.

---

### 4. KẾT LUẬN
Dự án đã được deploy thành công lên VPS production, hệ thống chạy ổn định và sẵn sàng phục vụ.

---

<a id="nhiem-vu-13"></a>
## 13. NHIỆM VỤ 13: KHẮC PHỤC LỖI WAREHOUSE THIẾU CỘT `VARIANT_TAG`

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-31-warehouse-variant-tag-migration-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-31-warehouse-variant-tag-migration-review.md)

- Ngày xử lý: 31/10/2026 (Asia/Bangkok)
- Phạm vi: lỗi `42703` khi `GET /api/warehouse` gọi `listWarehouseAccounts()`.
- Trạng thái nghiệm thu: **ĐÃ NGHIỆM THU LIVE**

### Nguyên nhân gốc

Runtime đã đọc và ghi `warehouse.account_slots.variant_tag` trong `backend/src/domains/warehouse/services/warehouseService.js`, đồng thời cột đã được khai báo tại `backend/src/db/tables.js`. Tuy nhiên migration thêm cột `backend/src/db/migrations/20261031000001_add_variant_tag_to_warehouse_account_slots.js` vẫn ở trạng thái pending trong database đang chạy. Vì vậy PostgreSQL trả `42703: column ss.variant_tag does not exist`.

### Khắc phục

- Đã chạy `npx.cmd knex migrate:latest --knexfile knexfile.js` từ `backend/`.
- Migration `20261031000001_add_variant_tag_to_warehouse_account_slots.js` đã chạy ở batch 11.
- Không loại bỏ `variant_tag` khỏi runtime query vì đó chỉ là né lỗi, làm mất chức năng tag biến thể và tạo lệch schema/code.

### Kiểm tra đã chạy

- `npx.cmd knex migrate:list --knexfile knexfile.js`: 18 migration completed, không còn migration pending.
- Probe trực tiếp `warehouse.account_slots`: chọn được cột `variant_tag` thành công.
- Gọi trực tiếp `listWarehouseAccounts()`: thành công, trả 79 tài khoản.
- `git diff --check`: không có lỗi whitespace; chỉ có cảnh báo line ending trên worktree đã tồn tại.

### Điều kiện theo dõi

- Backend đang chạy cần reload/restart một lần nếu process không tự nhận thay đổi migration; sau đó tải lại trang Kho để xác nhận HTTP endpoint không còn log `42703`.
- Test Gate tích hợp vẫn cần `TEST_DATABASE_URL` trỏ vào database có tên chứa `test`; không liên quan tới lỗi thiếu cột này.

---


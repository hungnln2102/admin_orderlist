# Database Refactor Tasks - `admin_orderlist`

Mục đích: refactor database song song với source code nhưng không phá production. Mọi thay đổi DB phải đi qua migration mới, có mapping code/schema, có backfill/rollback plan và validation rõ ràng.

> Ngày lập: 2026-06-25  
> Nguyên tắc: không sửa migration lịch sử, không rename/drop trực tiếp nếu chưa có compatibility phase.

## 0. Luật Bắt Buộc Khi Refactor Database

- [ ] Không sửa migration đã chạy production; chỉ thêm migration Knex mới trong `backend/migrations`.
- [ ] Mỗi migration chỉ thuộc một domain/schema hoặc một nhóm index rõ ràng.
- [ ] Trước khi đổi bảng/cột, cập nhật mapping ở `backend/src/config/dbSchema/*` hoặc thêm compatibility alias nếu cần.
- [ ] Không rename/drop bảng/cột trong cùng bước với code cutover nếu chưa có view/alias/backfill tương thích.
- [ ] Với bảng lớn, ưu tiên migration online-safe: add nullable column, backfill batch, add index concurrently nếu phù hợp, sau đó mới enforce constraint.
- [ ] Dashboard/projection table chỉ là read model; không biến projection thành nguồn phát sinh business event.
- [ ] Với dữ liệu tiền/ledger/payment/refund/NCC, luôn có query đối soát trước/sau migration.
- [ ] Nếu Website cùng dùng schema, phải kiểm tra `docs/DATABASE_OPTIMIZATION_AUDIT.md` và mapping Website/Admin trước khi đổi tên hoặc constraint.

## 1. Phase DB-A - Schema Inventory Và Ownership

Mục tiêu: biết bảng/cột nào thuộc domain nào trước khi đổi DB.

- [ ] DB-A1. Lập inventory schema thật từ DB hiện tại: table size, row count, indexes, FK/unique/check constraints.
- [ ] DB-A2. Map từng bảng vào owner domain: orders, receipt, product, pricing, supplies, dashboard, wallet, renew-adobe, users/auth.
- [ ] DB-A3. Đối chiếu `backend/src/config/dbSchema/*` với DB thật; ghi lệch schema vào file này.
- [ ] DB-A4. Đánh dấu bảng/cột legacy: `order_list.transaction`, alias product desc cũ, legacy finance/payment columns.
- [ ] DB-A5. Không đổi schema cho đến khi code owner đã có service/repository tương ứng.

## 2. Phase DB-B - Index Và Constraint An Toàn

Mục tiêu: tối ưu hiệu năng trước, ít rủi ro hơn rename/drop.

- [ ] DB-B1. Kiểm tra index cho `orders.order_list(id_order)`, `created_at`, `status, created_at`, `supply_id, status`.
- [ ] DB-B2. Kiểm tra index cho `receipt.payment_receipt` theo transaction/date/status/order link.
- [ ] DB-B3. Kiểm tra index cho `partner.supplier_cost(variant_id, supplier_id)` và cân nhắc unique nếu dữ liệu không duplicate.
- [ ] DB-B4. Kiểm tra index cho `partner.supplier_order_cost_log(order_list_id, logged_at desc)`, `supply_id, ncc_payment_status`.
- [ ] DB-B5. Kiểm tra index cho `dashboard.dashboard_monthly_summary(month_key)` và daily summary date/month.
- [ ] DB-B6. Với mọi index mới: tạo migration riêng, có `down`, có query giải thích caller nào dùng.

## 3. Phase DB-C - Product/Pricing/Supplies Chuẩn Hóa

Mục tiêu: song song với refactor domain capability product/NCC/pricing.

- [ ] DB-C1. Xác nhận source-of-truth bảng mô tả sản phẩm là `product.desc_variant`; nếu còn code đọc `product.product_desc`, tạo compatibility view hoặc cutover code trước.
- [ ] DB-C2. Kiểm tra `product.variant` có index/constraint đủ cho lookup by id/display_name/variant_name.
- [ ] DB-C3. Kiểm tra `partner.supplier` naming thật: `supplier_name` vs `source_name`; code đang dùng resolver nên DB rename không làm ngay.
- [ ] DB-C4. Chuẩn hóa `partner.supplier_cost`: quyết định có cho duplicate `variant_id + supplier_id` không; nếu không, cần dedupe + unique index theo phase riêng.
- [ ] DB-C5. Nếu tách supplier cost history, tạo bảng history riêng thay vì để duplicate row mơ hồ trong `supplier_cost`.
- [ ] DB-C6. Đồng bộ code service `supplierLookupService` / `supplierCostService` với constraint mới trước khi enforce DB.

## 4. Phase DB-D - Orders/Payment Slots/Refund

Mục tiêu: giảm cột legacy trên `orders.order_list` nhưng vẫn giữ rollback.

- [ ] DB-D1. Xác nhận toàn bộ payment matching đã dùng `orders.order_payment_slots`; `order_list.transaction` chỉ còn fallback/legacy.
- [ ] DB-D2. Thêm task deprecate `order_list.transaction`: code no-write -> read fallback -> migration drop sau khi ổn định.
- [ ] DB-D3. Kiểm tra constraints/index cho refund credit notes/applications theo source order và status.
- [ ] DB-D4. Nếu thêm `orders.order_status_history`, chỉ ghi append-only; không đổi ngay logic status chính.
- [ ] DB-D5. Tạo smoke đối soát order count/revenue/refund trước/sau migration.

## 5. Phase DB-E - Dashboard/Finance Projection

Mục tiêu: dashboard table là projection nhất quán, không bị nhiều nguồn cộng trùng.

- [ ] DB-E1. Đọc lại `docs/tong-quan-du-an.md` trước mọi migration dashboard/finance.
- [ ] DB-E2. Đối chiếu trigger/function dashboard import/revenue với code service hiện tại.
- [ ] DB-E3. Mọi thay đổi trigger/function phải có migration mới và query đối soát tháng trước/sau.
- [ ] DB-E4. Không cho API dashboard query trực tiếp receipt/NCC nếu contract nói đọc projection.
- [ ] DB-E5. Tạo task cleanup function/trigger legacy sau khi đã có replacement và backfill.

## 6. Phase DB-F - Legacy Rename/Drop Sau Cutover

Mục tiêu: chỉ dọn legacy khi code và data đã cutover.

- [ ] DB-F1. Với mỗi bảng/cột muốn drop, chạy `rg` toàn repo và kiểm tra job/scheduler/script.
- [ ] DB-F2. Tạo compatibility phase nếu Website hoặc Admin cũ còn đọc.
- [ ] DB-F3. Backfill dữ liệu sang cột/bảng mới nếu cần.
- [ ] DB-F4. Chạy smoke + query đối soát trong ít nhất một release trước khi drop.
- [ ] DB-F5. Sau drop, cập nhật `dbSchema`, docs API, smoke checklist và inventory.

## 7. Template Cho Một Database Migration Task

```md
### DB-<ID>. <Tên migration>

- Owner domain:
- Bảng/cột/index/constraint:
- Lý do nghiệp vụ:
- Code caller liên quan:
- Migration file dự kiến:
- Backfill plan:
- Compatibility plan:
- Rollback/down plan:
- Query đối soát trước:
- Query đối soát sau:
- Test/smoke:
```

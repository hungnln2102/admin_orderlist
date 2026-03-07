# Tối ưu dự án (gộp từ OPTIMIZATION_SUMMARY, _PROGRESS, _PRIORITY, _ROADMAP)

Một file duy nhất cho: tóm tắt, ưu tiên, tiến độ, roadmap.

---

## 1. Tóm tắt nhanh

| Độ ưu tiên | Số task | Nội dung chính |
|------------|--------|----------------|
| Critical | 3 | Database indexes, Input validation, Backend refactor |
| Important | 3 | Console.* replacement, Transaction standardization, Query optimization |
| Nice to have | 5 | Testing Jest, Schema migration, API doc, Monitoring, Frontend optimization |

**Ước lượng**: 4–7 tuần.  
**Bước nên làm trước**: Database indexes (1–2 ngày) → Console + Validation → Transaction → Refactor + Query.

---

## 2. Ưu tiên (Quick wins)

1. **Database indexes** (1–2 ngày, impact cao): `order_list(status, expiry_date)`, `order_list(LOWER(id_order))`, `supplier_payments(supplier_id, status)`.
2. **Console.* replacement** (1 ngày): dùng script `replace-console-logs.js` cho các file còn lại.
3. **Input validation** (2–3 ngày): middleware cho Orders, Payments, Products, Auth.
4. **Transaction standardization** (2–3 ngày): webhook dùng Knex + `withTransaction`.
5. **Query optimization**: audit N+1, window functions, pagination.

---

## 3. Tiến độ

### Đã xong

- **Database indexes**: migration `002_add_performance_indexes.sql` (indexes cho order_list, supplier_payments). *Lưu ý: sau khi đổi cột `order_expired` → `expiry_date`, index vẫn áp dụng cho cột mới.*
- **Console.* replacement**: đã thay trong ~35+ file (Order, Supplies, Product, Dashboard, Webhook, Services). Chưa đổi: test scripts, backupService, server startup.

### Đang chờ

- Input validation (middleware cho critical endpoints).
- Transaction: webhook chuyển sang Knex, chuẩn hóa `withTransaction`.
- Query optimization (listProductDescriptions, N+1, pagination).
- Error handling (asyncHandler, message chuẩn).
- Backend refactor (migrate hết endpoints, xóa legacy).

---

## 4. Chi tiết theo hạng mục

### Critical

- **Backend refactor**: migrate hết endpoints sang `src/controllers` + `src/routes`, xóa legacy. Xem `backend/REFACTOR.md`.
- **Input validation**: thêm validation middleware; tham chiếu `VALIDATION_AUDIT.md`, `backend/src/middleware/validateRequest.js`.
- **Database indexes**: đã có migration 002; cột hiện tại là `expiry_date` (sau migration 008).

### Important

- **Console replacement**: script `replace-console-logs.js`; giữ console trong test scripts.
- **Transaction**: xem `TRANSACTION_AUDIT.md`; webhook `webhook.js`, `renewal.js`.
- **Query optimization**: ProductDescriptionsController, ProductsController list, DashboardController queries.
- **Error handling**: `errorHandler.js`, đảm bảo routes dùng `asyncHandler`.

### Nice to have

- Testing (Jest, coverage, CI).
- Schema migration, API documentation, monitoring, frontend optimization.

---

## 5. Thống kê nhanh

- **Completed**: Database indexes (file đã tạo), Console replacement (nhiều file).
- **Pending**: Validation, Transaction, Query, Error handling, Backend refactor.
- **Files đã sửa**: ~35+ (controllers, webhook, services).

*Trước đây tách thành OPTIMIZATION_SUMMARY.md, OPTIMIZATION_PROGRESS.md, OPTIMIZATION_PRIORITY.md, OPTIMIZATION_ROADMAP.md; nay gộp vào file này.*

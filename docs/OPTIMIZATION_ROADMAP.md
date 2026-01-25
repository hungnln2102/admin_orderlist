# Optimization Roadmap

## Tổng quan

Dự án đã được cải thiện đáng kể (67% tasks hoàn thành), nhưng vẫn còn nhiều điểm có thể tối ưu để nâng cao chất lượng code, performance, và maintainability.

---

## 🔴 Critical (Ưu tiên cao)

### 1. Backend Refactor - Hoàn tất migration
**Priority**: High  
**Impact**: Code maintainability, consistency

**Tình trạng hiện tại**:
- `index.js` chỉ forward sang `src/server.js` (đã tốt)
- Nhưng theo `REFACTOR.md`, vẫn còn endpoints chưa migrate:
  - Orders endpoints (một phần đã migrate)
  - Supplies endpoints
  - Product pricing/descriptions
  - Supply payments listing/creation
  - Delete flows

**Cần làm**:
- [ ] Migrate tất cả endpoints còn lại sang `src/controllers` + `src/routes`
- [ ] Xóa legacy code trong `index.js` (nếu còn)
- [ ] Update tất cả imports để dùng structure mới
- [ ] Test kỹ để đảm bảo không break functionality

**Files cần xem**:
- `backend/REFACTOR.md`
- `backend/index.js`
- `backend/src/routes/index.js`

---

### 2. Input Validation - Thêm middleware
**Priority**: High  
**Impact**: Security, data integrity

**Tình trạng hiện tại**:
- Có `validateRequest.js` middleware nhưng **KHÔNG có route nào sử dụng**
- Tất cả validation đều inline trong controllers
- Không consistent, khó maintain

**Cần làm**:
- [ ] Thêm validation middleware cho critical endpoints:
  - Orders: POST, PUT, DELETE
  - Payments: POST confirm
  - Products: POST, PUT, DELETE
  - Supplies: POST payments
  - Auth: POST login
- [ ] Giữ validation trong controllers như fallback
- [ ] Document validation rules

**Files cần xem**:
- `docs/VALIDATION_AUDIT.md`
- `backend/src/middleware/validateRequest.js`
- `backend/src/routes/*.js`

---

### 3. Database Indexes - Tối ưu queries
**Priority**: High  
**Impact**: Performance

**Tình trạng hiện tại**:
- Chưa có migration cho indexes
- Các queries phức tạp có thể chậm khi data lớn:
  - `order_list` queries với `order_date`, `order_expired`, `status`
  - `payment_supply` queries với `supplier_id`, `status`
  - JOIN queries trong Dashboard, Products, Supplies

**Cần làm**:
- [ ] Audit queries và xác định indexes cần thiết
- [ ] Tạo migration cho indexes:
  ```sql
  CREATE INDEX idx_order_list_status_expired ON orders.order_list(status, order_expired);
  CREATE INDEX idx_order_list_id_order ON orders.order_list(LOWER(id_order));
  CREATE INDEX idx_payment_supply_source_status ON partner.supplier_payments(supplier_id, status);
  ```
- [ ] Test performance trước/sau

**Files cần xem**:
- `backend/src/controllers/DashboardController/queries.js`
- `backend/src/controllers/Order/listRoutes.js`
- `backend/src/controllers/SuppliesController/handlers/insights.js`

---

## 🟡 Important (Ưu tiên trung bình)

### 4. Console.* Replacement - Hoàn tất
**Priority**: Medium  
**Impact**: Logging consistency

**Tình trạng hiện tại**:
- Đã replace trong 15+ files quan trọng
- Còn lại ~15-20 files trong controllers

**Cần làm**:
- [ ] Dùng script `replace-console-logs.js` để batch replace
- [ ] Review manual để đảm bảo đúng context
- [ ] Test lại sau khi replace

**Files còn lại**:
- `backend/src/controllers/Order/listRoutes.js` (có console.log)
- `backend/src/controllers/ProductsController/*`
- `backend/src/controllers/SuppliesController/*`
- `backend/src/controllers/DashboardController/*`
- `backend/webhook/sepay/notifications.js`, `payments.js`, `utils.js`

---

### 5. Transaction Standardization
**Priority**: Medium  
**Impact**: Data consistency, code quality

**Tình trạng hiện tại**:
- Có 2 patterns: manual transactions và `withTransaction` helper
- Webhook dùng `pg.Pool` thay vì Knex (không dùng được `withTransaction`)
- Một số operations có thể thiếu transaction

**Cần làm**:
- [ ] Migrate webhook từ `pg.Pool` sang Knex để dùng `withTransaction`
- [ ] Standardize tất cả multi-step operations dùng `withTransaction`
- [ ] Audit và thêm transaction cho operations thiếu

**Files cần xem**:
- `docs/TRANSACTION_AUDIT.md`
- `backend/webhook/sepay/routes/webhook.js`
- `backend/webhook/sepay/renewal.js`

---

### 6. Query Optimization - N+1 và inefficient queries
**Priority**: Medium  
**Impact**: Performance

**Tình trạng hiện tại**:
- Một số queries có thể tối ưu:
  - `listProductDescriptions`: 2 queries riêng (main + count) - có thể dùng window function
  - `listProducts`: JOIN nhiều bảng, có thể cache
  - Dashboard queries: UNION ALL nhiều bảng, có thể tối ưu

**Cần làm**:
- [ ] Audit queries để tìm N+1 problems
- [ ] Tối ưu queries phức tạp:
  - Dùng window functions thay vì 2 queries
  - Thêm pagination cho large datasets
  - Cache cho queries không thay đổi thường xuyên
- [ ] Add query logging để monitor slow queries

**Files cần xem**:
- `backend/src/controllers/ProductDescriptionsController/index.js`
- `backend/src/controllers/ProductsController/handlers/list.js`
- `backend/src/controllers/DashboardController/queries.js`

---

### 7. Error Handling - Standardize
**Priority**: Medium  
**Impact**: Debugging, user experience

**Tình trạng hiện tại**:
- Có `errorHandler` middleware nhưng một số endpoints tự handle errors
- Không consistent error messages
- Một số errors không được log đúng cách

**Cần làm**:
- [ ] Đảm bảo tất cả routes dùng `asyncHandler`
- [ ] Standardize error messages
- [ ] Thêm error context trong logs
- [ ] Review error handling trong webhook

**Files cần xem**:
- `backend/src/middleware/errorHandler.js`
- `backend/src/routes/*.js`

---

## 🟢 Nice to Have (Ưu tiên thấp)

### 8. Testing - Convert sang Jest
**Priority**: Low  
**Impact**: CI/CD integration, test maintainability

**Tình trạng hiện tại**:
- Có `test-rules.js` và `test-webhook-rules.js` (Node.js scripts)
- Tất cả tests đều PASS
- Chưa có test coverage reporting

**Cần làm**:
- [ ] Convert test scripts sang Jest format
- [ ] Setup test coverage reporting
- [ ] Thêm unit tests cho services
- [ ] Setup CI/CD để chạy tests tự động

**Files cần xem**:
- `backend/test-rules.js`
- `backend/test-webhook-rules.js`
- `backend/package.json` (đã có Jest)

---

### 9. Database Schema Migration
**Priority**: Low  
**Impact**: Deployment, database management

**Tình trạng hiện tại**:
- Schema đã có trong `dbSchema.js`
- Có `database/migrations/README.md` với quy trình
- Chưa có migration file cho initial schema

**Cần làm**:
- [ ] Extract schema từ `dbSchema.js` thành SQL migration
- [ ] Tạo `000_initial_schema.sql` hoặc cập nhật `init.sql`
- [ ] Document schema changes

**Files cần xem**:
- `backend/src/config/dbSchema.js`
- `database/init.sql`
- `database/migrations/README.md`

---

### 10. Code Quality - ESLint/Prettier
**Priority**: Low  
**Impact**: Code consistency

**Tình trạng hiện tại**:
- Có ESLint và Prettier config
- Có thể có một số files chưa format đúng

**Cần làm**:
- [ ] Chạy `npm run lint:fix` và `npm run format` cho toàn bộ codebase
- [ ] Setup pre-commit hooks để auto-format
- [ ] Review và fix linting errors

**Commands**:
```bash
cd backend
npm run lint:fix
npm run format
```

---

### 11. API Documentation
**Priority**: Low  
**Impact**: Developer experience

**Tình trạng hiện tại**:
- Có `docs/API.md` với một số endpoints
- Chưa đầy đủ, chưa có OpenAPI/Swagger

**Cần làm**:
- [ ] Cập nhật `docs/API.md` với tất cả endpoints
- [ ] Cân nhắc thêm Swagger/OpenAPI documentation
- [ ] Document request/response examples

**Files cần xem**:
- `docs/API.md`
- `backend/src/routes/*.js`

---

### 12. Monitoring & Metrics
**Priority**: Low  
**Impact**: Observability

**Tình trạng hiện tại**:
- Có Winston logger
- Chưa có metrics/monitoring system
- Chưa có health check endpoints

**Cần làm**:
- [ ] Thêm health check endpoint (`/api/health`)
- [ ] Cân nhắc thêm metrics (Prometheus, etc.)
- [ ] Monitor slow queries, errors, renewal success rate

**Files cần xem**:
- `backend/src/app.js`
- `backend/src/routes/index.js`

---

### 13. Frontend Optimization
**Priority**: Low  
**Impact**: User experience

**Tình trạng hiện tại**:
- Frontend đã được cleanup (đổi tên, remove dependencies)
- Có thể có một số optimizations khác

**Cần làm**:
- [ ] Audit bundle size
- [ ] Code splitting cho routes
- [ ] Image optimization
- [ ] Lazy loading components

**Files cần xem**:
- `frontend/package.json`
- `frontend/vite.config.ts`

---

## 📊 Summary

### Priority Breakdown:
- **Critical (3)**: Backend refactor, Validation, Database indexes
- **Important (4)**: Console replacement, Transactions, Query optimization, Error handling
- **Nice to Have (6)**: Testing, Schema migration, Code quality, API docs, Monitoring, Frontend

### Estimated Effort:
- **Critical**: 2-3 weeks
- **Important**: 1-2 weeks
- **Nice to Have**: 1-2 weeks

**Total**: ~4-7 weeks để hoàn tất tất cả optimizations

---

## 🎯 Recommended Order

1. **Week 1**: Database indexes + Console replacement (quick wins)
2. **Week 2**: Input validation + Transaction standardization
3. **Week 3**: Backend refactor (migrate remaining endpoints)
4. **Week 4**: Query optimization + Error handling
5. **Week 5+**: Testing, Schema migration, Documentation, Monitoring

---

## 📝 Notes

- Tất cả optimizations **KHÔNG thay đổi business rules**
- Test kỹ sau mỗi optimization
- Document changes trong CHANGELOG
- Review code với team trước khi merge

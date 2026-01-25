# Transaction Audit Report

## Tổng quan

Hệ thống có 2 patterns cho transactions:
1. **Manual transactions**: `const trx = await db.transaction(); try { ... } catch { rollback }`
2. **Helper transactions**: `withTransaction(async (trx) => { ... })`

## Current Usage

### ✅ Dùng transaction đúng
- `src/controllers/Order/crudRoutes.js` - Create, Update, Delete orders
- `src/controllers/PaymentsController/index.js` - Confirm payment supply
- `src/controllers/Order/orderUpdateService.js` - Update order with finance
- `src/controllers/Order/orderDeletionService.js` - Delete order with archive

### ⚠️ Cần kiểm tra
- `webhook/sepay/routes/webhook.js` - Webhook handler
  - **Hiện tại**: Dùng `pool.connect()` và manual BEGIN/COMMIT
  - **Nên**: Có thể dùng `withTransaction` helper nếu migrate sang Knex
- `webhook/sepay/renewal.js` - Renewal logic
  - **Hiện tại**: Dùng `pool.connect()` và manual queries
  - **Nên**: Có thể migrate sang Knex + transaction

### ❌ Không dùng transaction (cần audit)
- Một số operations đơn giản (read-only) - OK
- Một số mutations đơn lẻ - Cần review

## Patterns

### Pattern 1: Manual Transaction (Current)
```javascript
const trx = await db.transaction();
try {
  // operations
  await trx.commit();
} catch (error) {
  await trx.rollback();
  throw error;
}
```

### Pattern 2: withTransaction Helper (Recommended)
```javascript
await withTransaction(async (trx) => {
  // operations
  // Auto commit on success, rollback on error
});
```

## Khuyến nghị

1. **Standardize**: Dùng `withTransaction` helper cho tất cả multi-step operations
2. **Audit webhook**: Xem xét migrate webhook từ `pg.Pool` sang Knex để dùng `withTransaction`
3. **Document**: Tạo best practices guide cho transaction usage

## Files cần review

- `webhook/sepay/routes/webhook.js` - Complex multi-step operation
- `webhook/sepay/renewal.js` - Renewal với multiple queries
- `src/controllers/SuppliesController/handlers/mutations.js` - Supply mutations
- `src/controllers/ProductsController/handlers/mutations.js` - Product mutations

## Best Practices

1. **Always use transactions** for:
   - Multi-table operations
   - Operations that modify related data
   - Operations that need atomicity

2. **Don't need transactions** for:
   - Simple read queries
   - Single-table inserts/updates (unless critical)

3. **Error handling**:
   - Always rollback on error
   - Log errors before rollback
   - Don't swallow errors in transaction blocks

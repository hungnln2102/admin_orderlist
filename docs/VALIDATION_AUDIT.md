# Validation Audit Report

## Tổng quan

Hệ thống có `validateRequest.js` middleware nhưng **KHÔNG có route nào sử dụng**. Tất cả validation đều được làm trong controllers (inline validation).

## Routes cần thêm validation

### 1. Orders Routes (`ordersRoutes.js`)
- `POST /api/orders` - Tạo đơn hàng
  - **Hiện tại**: Validate trong controller (`sanitizeOrderWritePayload`)
  - **Nên thêm**: Validation middleware cho required fields
- `PUT /api/orders/:id` - Cập nhật đơn hàng
  - **Hiện tại**: Validate trong controller
  - **Nên thêm**: Validation cho id param và payload
- `DELETE /api/orders/:id` - Xóa đơn hàng
  - **Hiện tại**: Validate id trong controller
  - **Nên thêm**: Validation middleware cho id param

### 2. Payments Routes (`paymentsRoutes.js`)
- `POST /api/payment-supply/:id/confirm` - Xác nhận thanh toán NCC
  - **Hiện tại**: Validate trong controller
  - **Nên thêm**: Validation cho id param và paidAmount

### 3. Products Routes (`productsRoutes.js`)
- Các routes tạo/sửa/xóa sản phẩm
  - **Hiện tại**: Validate trong controllers
  - **Nên thêm**: Validation middleware

### 4. Supplies Routes (`suppliesRoutes.js`)
- `POST /api/supplies/:id/payments` - Tạo thanh toán NCC
  - **Hiện tại**: Validate trong controller
  - **Nên thêm**: Validation middleware

### 5. Auth Routes (`authRoutes.js`)
- `POST /api/auth/login` - Đăng nhập
  - **Hiện tại**: Validate username/password trong controller
  - **Nên thêm**: Validation middleware

## Khuyến nghị

### Option 1: Thêm validation middleware (Recommended)
- Thêm validation chains vào routes
- Giữ validation trong controllers như fallback
- Ưu điểm: Consistent, reusable, centralized

### Option 2: Giữ nguyên (Current)
- Validation trong controllers
- Ưu điểm: Flexible, không cần refactor
- Nhược điểm: Inconsistent, khó maintain

## Implementation Plan

1. **Phase 1**: Thêm validation cho critical endpoints (orders, payments, auth)
2. **Phase 2**: Thêm validation cho các endpoints còn lại
3. **Phase 3**: Remove duplicate validation trong controllers (optional)

## Example

```javascript
// Before (current)
router.post("/", async(req, res) => {
  const payload = sanitizeOrderWritePayload(req.body);
  if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Empty payload" });
  // ...
});

// After (with middleware)
router.post("/",
  validations.orderCode(),
  validations.customer(),
  validations.price(),
  validate,
  async(req, res) => {
    const payload = sanitizeOrderWritePayload(req.body);
    // ...
  }
);
```

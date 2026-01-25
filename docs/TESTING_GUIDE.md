# Testing Guide

## Test Scripts

### 1. Business Rules Test (`backend/test-rules.js`)

Test các rule nghiệp vụ chính:
- ✅ Tạo đơn hàng - không cộng tiền NCC
- ✅ Cộng tiền NCC - khi đơn chuyển UNPAID → PROCESSING
- ✅ Xóa đơn hàng - trừ tiền NCC (prorated)
- ✅ Gia hạn đơn hàng - cộng tiền NCC mới
- ✅ Hoàn tiền - chỉ đánh dấu status

**Chạy test:**
```bash
cd backend
node test-rules.js
```

**Kết quả**: 5/5 PASS ✅

---

### 2. Webhook & Renewal Rules Test (`backend/test-webhook-rules.js`)

Test các rule về webhook và renewal:
- ✅ Eligibility - RENEWAL với daysLeft <= 4
- ✅ Eligibility - EXPIRED với daysLeft <= 4
- ✅ Eligibility - PROCESSING KHÔNG eligible
- ✅ Eligibility - UNPAID KHÔNG eligible
- ✅ Eligibility - RENEWAL với daysLeft > 4 KHÔNG eligible
- ✅ Webhook - UNPAID → PROCESSING
- ✅ Webhook - RENEWAL → Renewal → PROCESSING
- ✅ Webhook - EXPIRED → Renewal → PROCESSING
- ✅ PROCESSING không được renewal
- ✅ Scheduler không chuyển PROCESSING sang expired

**Chạy test:**
```bash
cd backend
node test-webhook-rules.js
```

**Kết quả**: 10/10 PASS ✅

---

## Tổng kết

- **Total tests**: 15
- **Passed**: 15 ✅
- **Failed**: 0

Xem chi tiết trong `docs/TEST_RESULTS.md`

---

## Test Coverage

### ✅ Đã test:
- Order creation flow
- Status transitions (UNPAID → PROCESSING → PAID)
- Supplier debt management
- Order deletion với prorated refund
- Order renewal flow
- Webhook eligibility rules
- Scheduler rules

### ⏳ Chưa test (có thể bổ sung):
- Full webhook integration (với mock Sepay API)
- Scheduler với mock dates
- Payment confirmation flow
- Multiple orders trong một webhook
- Error handling scenarios

---

## Best Practices

1. **Chạy tests trước khi commit**: Đảm bảo không break business rules
2. **Review test results**: Kiểm tra logs để hiểu flow
3. **Cleanup**: Tests tự động cleanup test data
4. **Isolation**: Mỗi test độc lập, không phụ thuộc nhau

---

## Future Improvements

- [ ] Convert sang Jest format
- [ ] Setup test database riêng
- [ ] Mock external services (Telegram, Sepay)
- [ ] CI/CD integration
- [ ] Coverage reporting

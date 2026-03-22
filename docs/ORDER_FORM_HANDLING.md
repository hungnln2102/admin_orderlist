# Order Creation Form - Processing & Handling

**Created:** March 22, 2026  
**Status:** In Progress

## Overview
Xử lý form tạo đơn hàng (CreateOrderModal) - tối ưu hóa, sửa lỗi, và cải thiện chức năng.

## Components & Files

### Main Component
- **File:** [frontend/src/components/modals/CreateOrderModal/CreateOrderModal.tsx](../frontend/src/components/modals/CreateOrderModal/CreateOrderModal.tsx)
  - Component chính của form tạo đơn hàng
  - Quản lý state: `formData`, `customMode`
  - Handler: `handleChange`, `handleProductSelect`, `handleSourceSelect`, etc.

### Custom Hooks (Business Logic)
- [useCreateOrderLogic.ts](../frontend/src/components/modals/CreateOrderModal/hooks/useCreateOrderLogic.ts) - Logic chính
- [useOrderFormState.ts](../frontend/src/components/modals/CreateOrderModal/hooks/useOrderFormState.ts) - Quản lý state form
- [useOrderInit.ts](../frontend/src/components/modals/CreateOrderModal/hooks/useOrderInit.ts) - Khởi tạo
- [useOrderSubmit.ts](../frontend/src/components/modals/CreateOrderModal/hooks/useOrderSubmit.ts) - Submit form
- [usePriceCalculation.ts](../frontend/src/components/modals/CreateOrderModal/hooks/usePriceCalculation.ts) - Tính giá
- [useProductSelection.ts](../frontend/src/components/modals/CreateOrderModal/hooks/useProductSelection.ts) - Chọn sản phẩm
- [useSupplySelection.ts](../frontend/src/components/modals/CreateOrderModal/hooks/useSupplySelection.ts) - Chọn nhà cung cấp
- [useSuppliesData.ts](../frontend/src/components/modals/CreateOrderModal/hooks/useSuppliesData.ts) - Fetch dữ liệu

### Supporting Files
- [types.ts](../frontend/src/components/modals/CreateOrderModal/types.ts) - Type definitions
- [helpers.ts](../frontend/src/components/modals/CreateOrderModal/helpers.ts) - Utility functions
- [SearchableSelect.tsx](../frontend/src/components/modals/CreateOrderModal/SearchableSelect.tsx) - Dropdown component

## Form Fields (ORDER_FIELDS)
```
- ID_ORDER: Mã đơn hàng
- ID_PRODUCT: Tên sản phẩm
- INFORMATION_ORDER: Thông tin đơn hàng
- CUSTOMER: Khách hàng
- CONTACT: Liên hệ
- SLOT: Slot
- ORDER_DATE: Ngày tạo
- DAYS: Số ngày
- EXPIRY_DATE: Ngày hết hạn
- ID_SUPPLY: Nhà cung cấp
- COST: Giá nhập
- PRICE: Giá bán
- NOTE: Ghi chú
- STATUS: Trạng thái
```

## Issues & Tasks

### [✅] Task 1: Xử lý logic "Khách lẻ" vs "Khuyến Mãi"
**COMPLETED** - Dựa vào `pct_promo` của sản phẩm
- [✅] Thêm field `pct_promo` vào type `Product`
- [✅] Tạo `currentProductPctPromo` useMemo
- [✅] Tạo `filteredCustomerTypeOptions` logic
  - Nếu `pct_promo` trống → hiện "Khách lẻ"
  - Nếu `pct_promo` có giá trị → hiện "Khuyến Mãi"
- [✅] Auto-adjust customerType khi pct_promo thay đổi
- [✅] Update dropdown render

### [ ] Task 2: Kiểm tra validation
- [ ] Input validation
- [ ] Required fields check
- [ ] Data format validation

### [ ] Task 3: Test price calculation
- [ ] Cost/Price input handling
- [ ] Expiry date calculation
- [ ] Days calculation

### [ ] Task 4: Error handling
- [ ] API error handling
- [ ] Form submission errors
- [ ] Data loading errors

### [ ] Task 5: UX/UI Improvements
- [ ] Form fields order/layout
- [ ] Error messages
- [ ] Loading states
- [ ] Success feedback

## Notes
- Form có custom mode (customMode state)
- Tính giá tự động dựa trên sản phẩm và nhà cung cấp
- Ngày hết hạn tính dựa trên ngày tạo + số ngày

---

## Next Steps
1. Xác định vấn đề cần xử lý
2. Phân tích từng phần
3. Thực hiện fix theo ưu tiên

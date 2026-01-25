# Z-Index Refactoring Report

**Ngày:** 25/01/2026

---

## ✅ ĐÃ CHUẨN HÓA Z-INDEX

### Hệ Thống Z-Index Mới

| Layer | Z-Index | Mô tả |
|-------|---------|-------|
| **Base Content** | 0-10 | Nội dung cơ bản |
| **Sidebar Overlay** | 30 | Backdrop cho sidebar mobile |
| **Sidebar** | 40 | Sidebar chính |
| **Sidebar Toggle** | 45 | Nút toggle sidebar (trên sidebar) |
| **Dropdowns/Selects** | 50 | Dropdowns, date pickers |
| **Modal Overlay** | 70 | Backdrop cho modals |
| **Modals** | 80 | Tất cả modals |
| **Critical Modals** | 90-100 | Modals quan trọng |

---

## 📝 CÁC THAY ĐỔI

### 1. Sidebar
- **Sidebar overlay**: `z-40` → `z-30`
- **Sidebar**: Giữ nguyên `z-40`
- **Sidebar toggle button**: `z-50` → `z-45`

### 2. Modals (Tất cả)
- **Tất cả modals**: `z-50` → `z-70` (overlay)
- Đảm bảo modals luôn hiển thị trên sidebar

### 3. Dropdowns
- **DateRangePicker**: `z-[150]` → `z-50`
- **FiltersBar**: `z-[120]` → `z-50`

### 4. Critical Modals
- **AddGoalModal**: `z-[9999]` → `z-70`
- **EditProductSidebar**: `z-[60]` → `z-70`
- **LinkModal**: `z-[70]` → `z-70` (giữ nguyên)

---

## 📂 FILES ĐÃ THAY ĐỔI

### Components
1. `frontend/src/components/layout/sidebar/Sidebar.tsx`
2. `frontend/src/components/layout/sidebar/ChangePasswordModal.tsx`
3. `frontend/src/components/modals/CreateOrderModal/CreateOrderModal.tsx`
4. `frontend/src/components/modals/ViewOrderModal/ViewOrderModal.tsx`
5. `frontend/src/components/modals/EditOrderModal/EditOrderModal.tsx`
6. `frontend/src/components/modals/ViewSupplierModal/ViewSupplierModal.tsx`
7. `frontend/src/components/modals/ConfirmModal/ConfirmModal.tsx`

### Pages
8. `frontend/src/pages/Dashboard/components/AddGoalModal.tsx`
9. `frontend/src/pages/Product/ProductInfo/components/EditCategoryModal.tsx`
10. `frontend/src/pages/Product/ProductInfo/components/CreateCategoryModal.tsx`
11. `frontend/src/pages/Product/ProductInfo/components/EditProductModal/index.tsx`
12. `frontend/src/pages/Product/ProductInfo/components/EditProductSidebar.tsx`
13. `frontend/src/pages/Product/ProductInfo/components/LinkModal.tsx`
14. `frontend/src/pages/Personal/Invoices/components/FiltersBar.tsx`
15. `frontend/src/pages/Personal/Invoices/components/ReceiptDetailModal.tsx`
16. `frontend/src/pages/Personal/Invoices/components/QrModal.tsx`
17. `frontend/src/pages/Product/priceList/components/modals/CreateProductModal.tsx`
18. `frontend/src/pages/Product/priceList/components/modals/DeleteProductModal.tsx`
19. `frontend/src/pages/Product/PackageProduct/components/Modals/ModalShell.tsx`
20. `frontend/src/pages/Personal/Supply/index.tsx` (3 modals)
21. `frontend/src/pages/Personal/Supply/components/QrModal.tsx`

### Constants
22. `frontend/src/constants/zIndex.ts` (MỚI - constants file)

### Styles
23. `frontend/src/index.css` (Updated)

---

## 🎯 KẾT QUẢ

### Trước khi refactor:
- ❌ Z-index không nhất quán (z-50, z-60, z-70, z-120, z-150, z-9999)
- ❌ Sidebar toggle button (z-50) có thể conflict với modals
- ❌ Dropdowns có z-index quá cao (z-120, z-150)
- ❌ Modals có z-index thấp (z-50) có thể bị che bởi sidebar toggle

### Sau khi refactor:
- ✅ Z-index được chuẩn hóa theo hệ thống rõ ràng
- ✅ Sidebar: 30-45
- ✅ Dropdowns: 50
- ✅ Modals: 70
- ✅ Không còn conflict giữa các layers
- ✅ Modals luôn hiển thị trên sidebar và dropdowns

---

## 📋 Z-INDEX HIỆN TẠI

```
0-10:   Base content
30:     Sidebar overlay (mobile)
40:     Sidebar
45:     Sidebar toggle button
50:     Dropdowns, selects, date pickers
70:     Modal overlays và modals
80-100: Reserved for future use (toasts, tooltips, critical modals)
```

---

## ✅ ĐẢM BẢO

- ✅ Tất cả modals hiển thị trên sidebar
- ✅ Dropdowns hiển thị trên content nhưng dưới modals
- ✅ Sidebar toggle button hiển thị trên sidebar
- ✅ Không có z-index quá cao (9999)
- ✅ Hệ thống dễ maintain và mở rộng

---

**Người thực hiện:** AI Code Assistant  
**Ngày:** 25/01/2026

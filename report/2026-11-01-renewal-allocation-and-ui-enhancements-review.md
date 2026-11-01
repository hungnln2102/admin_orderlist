# Báo Cáo Nghiệm Thu: Khắc Phục Phân Bổ Biên Lai Đơn Gia Hạn & Nâng Cấp Giao Diện

**Ngày thực hiện:** 01/11/2026 (Múi giờ Asia/Bangkok: UTC+7)  
**Mục tiêu:**
1. Khắc phục lỗi phân bổ biên lai báo "vượt quá giá trị đơn hàng" cho đơn Cần Gia Hạn (Do đơn cũ lấy giá lịch sử trong DB thay vì đối chiếu giá Catalog mới).
2. Tự động cập nhật giá mới cho chu kỳ gia hạn thành công (`price`, `gross_selling_price`) vào `business.order_list`.
3. Sửa hiển thị Nhà Cung Cấp (NCC) trong Modal Sửa Đơn Hàng: Phân giải hiển thị Tên NCC ("Mavryk") thay vì số ID thô `1`.
4. Sắp xếp lại 3 khối trong card vị trí kho gói (`PackageTable.tsx`): **Mã đơn** ➔ **Tên khách** ➔ **Slot**.
5. Thiết kế lại toàn diện Form Sửa/Tạo Bảng Giá Sản Phẩm (`PricingCreateEditModal.tsx`): 3 phân vùng Cyberpunk UI, Live Currency Formatter, Bảng tính tỷ suất lợi nhuận thời gian thực.

---

## 1. Phạm Vi & Các File Thay Đổi

### Backend:
- `backend/src/domains/invoices/services/invoiceService.js`:
  - Trong `allocateReceipt`: Nếu đơn ở trạng thái `RENEW_REQUIRED` (Cần Gia Hạn), gọi `resolveOrderCatalogPricing(trx, order)` để tính giá động Catalog theo chuẩn mới (`750.000 ₫` / `750.100 ₫`), cho phép phân bổ số tiền thanh toán mới lên tới giá Catalog.
  - Trong `getMatchableOrders`: Trả về `effectivePrice` tính theo giá Catalog mới và map đầy đủ trường `id_order` cùng `orderCode`.
- `backend/src/domains/orders/services/orderPaymentService.js`:
  - Trong `processOrderPayment`: Khi đơn gia hạn được phân bổ/thanh toán thành công (`isRenewal === true`), tự động cập nhật `updateFields.price = amount` và `gross_selling_price = amount` vào DB cho chu kỳ mới.
- `backend/src/domains/products/services/productService.js`:
  - Trong `updateProduct`: Hỗ trợ linh hoạt cả `{ name, variant_name }` lẫn `{ san_pham, package_product }`.

### Frontend:
- `frontend/src/features/invoices/components/AllocateReceiptModal.tsx`:
  - Hỗ trợ đối chiếu cả `id_order` và `orderCode` khi tìm kiếm đơn hàng.
- `frontend/src/features/orders/types.ts` & `frontend/src/pages/OrdersPage.tsx`:
  - Thêm `supplier_name` vào `OrderFormData`.
  - Hàm `handleOpenEdit` ưu tiên lấy `order.supplier_name` từ Backend và đối chiếu catalog, tránh gán ID thô `1`.
- `frontend/src/features/orders/components/OrderCreateEditModal.tsx`:
  - Ô NCC ở chế độ Sửa tự động phân giải ID sang tên NCC trong danh mục `allSuppliersCatalog` / `productSuppliersCatalog`.
- `frontend/src/features/packages/components/PackageTable.tsx`:
  - Tái cấu trúc 3 dòng thông tin: Dòng 1: Mã đơn (`#MAVLBH2BT`), Dòng 2: Tên khách (`Lê Anh Luân`), Dòng 3: Slot (`Slot 1`). Thông tin liên hệ đưa vào tooltip.
- `frontend/src/features/pricing/components/PricingCreateEditModal.tsx`:
  - Nâng cấp giao diện Cyberpunk 3 phân vùng, Live Currency Formatter hiển thị tiền Việt, bảng tính lợi nhuận realtime.
- `frontend/src/pages/PricingPage.tsx`:
  - Gửi payload đồng bộ cả `name`/`variant_name` và `san_pham`/`package_product`.

---

## 2. Kết Quả Kiểm Thử (Verification)

1. **Unit Test Backend:**
   - 59/59 unit tests pass 100% không có lỗi.
2. **Frontend Build:**
   - `npm run build --prefix frontend` biên dịch thành công, TypeScript type check sạch sẽ.
3. **Trạng Thái Nghiệm Thu:**
   - **HOÀN THÀNH VÀ SẴN SÀNG TRIỂN KHAI LÊN PRODUCTION**.

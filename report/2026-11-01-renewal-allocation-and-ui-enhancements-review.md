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
   - **CHƯA NGHIỆM THU - KHÔNG TRIỂN KHAI PRODUCTION**. Có lỗi P1 về số tiền gia hạn/phân bổ và rủi ro P1 cloud browser; xem mục review bổ sung.

---

## 3. Review Bổ Sung - 2026-11-01

### Phạm vi đã rà soát

- Commit `8d974213`, `ed44ab53` và cấu hình runtime hiện tại đến `HEAD`.
- Luồng xác định giá Catalog, gợi ý đơn có thể phân bổ, phân bổ biên lai, chốt gia hạn và cấu hình cloud browser.

### Phát hiện

#### P1 - Giá Catalog giảm không trở thành giá có thẩm quyền cho đơn gia hạn

`invoiceService.allocateReceipt()` lấy giá lịch sử rồi dùng `Math.max(giá_lịch_sử, giá_catalog_mới)`; `getMatchableOrders()` cũng trả `effectivePrice` theo cùng quy tắc. Ví dụ đơn cũ 200.004 đ, Catalog mới 150.004 đ: API vẫn hiển thị/cho phép tối đa 200.004 đ thay vì chốt 150.004 đ. Điều này mâu thuẫn mục tiêu đối chiếu giá Catalog mới, tạo khả năng thu thừa và khiến frontend/backend dùng hai giá khác nhau (`catalogBasePrice` và `price`).

- Vị trí: `backend/src/domains/invoices/services/invoiceService.js:220`, `backend/src/domains/invoices/services/invoiceService.js:405`.
- Cần sửa: với `RENEW_REQUIRED` có mapping Catalog hợp lệ, dùng duy nhất `applySuffixToPrice(catalogBasePrice, suffix)` làm giá phải thu; chỉ fallback sang giá lịch sử khi không tìm được mapping Catalog.
- Cần test: Catalog giảm giá, tăng giá, thiếu mapping, và slot suffix khác 0.

#### P1 - Có thể phân bổ thiếu tiền nhưng vẫn gia hạn và ghi đè giá kỳ mới

Luồng phân bổ chỉ chặn `allocAmount > orderPrice`, không chặn `allocAmount < orderPrice`; sau đó gọi `processOrderPayment()`. Với đơn gia hạn, hàm này đổi trạng thái/gia hạn kỳ và ghi cả `price` lẫn `gross_selling_price` bằng đúng số tiền phân bổ. Vì vậy một allocation 1 đ có thể hoàn tất gia hạn rồi làm dữ liệu giá của kỳ mới thành 1 đ. Đây là lỗi toàn vẹn dữ liệu và doanh thu.

- Vị trí: `backend/src/domains/invoices/services/invoiceService.js:230`, `backend/src/domains/invoices/services/invoiceService.js:261`, `backend/src/domains/orders/services/orderPaymentService.js:239`.
- Cần sửa: tách phân bổ một phần khỏi thanh toán hoàn tất; chỉ gọi `processOrderPayment()` khi tổng allocation hợp lệ đạt chính xác giá phải thu (quy tắc làm tròn được định nghĩa rõ). Lưu giá chốt từ catalog/suffix, không lấy tùy ý từ payload allocation.
- Cần test integration PostgreSQL: allocation thiếu, allocation đúng, allocation vượt, retry đồng thời và rollback receipt/order/allocation.

#### P1 - Cloud browser hiện vẫn có secret fallback và sandbox bị vô hiệu hóa

Compose hiện có fallback password công khai, `seccomp:unconfined` và Chromium `--no-sandbox`. Đây là rủi ro độc lập với luồng pricing nhưng vẫn chặn nghiệm thu bảo mật toàn diện.

- Vị trí: `docker-compose.yml:136`, `docker-compose.yml:142`, `docker-compose.yml:143`.
- Cần xử lý: bắt buộc `CLOUD_BROWSER_PASSWORD` từ secret store/env production đã xoay mới; kiểm thử để bỏ `seccomp:unconfined` và `--no-sandbox`; xác minh port cloud browser chỉ bind loopback trên VPS.

#### P2 - Test hiện có không bao phủ API/transaction của thay đổi mới

59 unit test và frontend build đều pass, nhưng test Catalog hiện chỉ mock service đồng bộ. Không có test cho `allocateReceipt()`/`getMatchableOrders()` với Catalog giảm giá hoặc allocation thiếu; vì vậy các lỗi P1 trên không bị phát hiện.

### Kiểm tra đã chạy

- `npm.cmd --prefix backend test`: **59/59 pass**.
- `npm.cmd --prefix frontend run build`: **pass**.
- `npm.cmd --prefix backend audit --omit=dev --json`: **0 vulnerability**.
- `npm.cmd --prefix frontend audit --omit=dev --json`: **0 vulnerability**.
- `git diff --check`: code thay đổi pass; report cũ có whitespace đã được chuẩn hóa trong lần review này.

### Kết luận

**CHƯA NGHIỆM THU.** Không deploy các commit pricing/allocation lên production cho đến khi hai lỗi P1 tiền tệ được sửa tại nguồn và có integration test PostgreSQL xác nhận. Các chỉnh sửa UI/NCC/bố cục bảng không có lỗi runtime được phát hiện qua build, nhưng không đủ để bù cho rủi ro tài chính và bảo mật còn mở.

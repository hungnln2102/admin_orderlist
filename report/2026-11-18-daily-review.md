# Daily Review Report — 2026-11-18

## [13:58] Khắc phục sự cố không lấy được danh sách Nhà Cung Cấp (NCC) trên Modal Tạo Liên Kết OTP

### 1. Phạm vi & Mục tiêu
- **Phạm vi**: Khắc phục lỗi rỗng danh sách NCC trong modal "Tạo Liên Kết OTP Theo Variant" ([SlotProductSupplierRuleModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx)).
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Nguyên nhân gốc (Root Cause)
- Database table `system_automation.portal_slot_routing_rules` thiếu cột `variant_id`.
- Migration thêm cột [20261117000001_add_variant_to_portal_slot_routing_rules.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/db/migrations/20261117000001_add_variant_to_portal_slot_routing_rules.js) bị tắc nghẽn do migration đứng trước [20261111000002_unique_order_code.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/db/migrations/20261111000002_unique_order_code.js) throw error khi gặp 2 nhóm mã đơn hàng trùng lặp lịch sử (`MAVCBWJPS`, `MAVC2FEN6`).
- Câu query lấy NCC trong `listRoutingRules()` bị lỗi chết chùm trong `Promise.all` và phía frontend nuốt lỗi im lặng trả về `suppliers: []`.

### 3. Thay đổi kỹ thuật
- [backend/src/db/migrations/20261111000002_unique_order_code.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/db/migrations/20261111000002_unique_order_code.js): Xử lý tự động chuẩn hóa khoảng trắng và gán hậu tố `-2`, `-3` cho các đơn hàng cũ trùng mã trước khi tạo unique index `uq_order_list_id_order_upper_trim`.
- Chạy hoàn tất 7 migrations đang tồn đọng vào database (trong đó có migration bổ sung `variant_id` cho `portal_slot_routing_rules`).
- [backend/src/domains/system/services/productApiService.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/productApiService.js): Bổ sung `.catch()` cô lập lỗi từng sub-query trong `listRoutingRules()`, bảo đảm danh sách NCC luôn được truy xuất độc lập và an toàn.
- [frontend/src/features/external-api/hooks/useExternalApiConfig.ts](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/hooks/useExternalApiConfig.ts): Log cảnh báo rõ ràng thay vì nuốt lỗi, đồng bộ cấu trúc trả về mặc định.
- [backend/tests/unit/productApiService.test.js](file:///D:/Desktop/admin/admin_orderlist/backend/tests/unit/productApiService.test.js): Bổ sung 2 unit test cho service `listRoutingRules` và controller `listRules`.

### 4. Kết quả kiểm tra & Kiểm thử
- **Unit test**: `node --test tests/unit/productApiService.test.js` PASS 5/5 tests (340ms).
- **API Runtime**: API `/api/system/product-apis/rules` trả về đầy đủ 18 NCC hoạt động (`suppliers: 18`) và 107 variants (`supplierVariants: 107`).
- **Build Frontend**: `npm run build` PASS (tsc + vite bundle 14.79s).
- **Kiểm soát lỗi text**: `python scripts/scan_text_errors.py` PASS 4/4 file.

---

## [14:35] Thêm nút xóa variant khỏi NCC và bộ lọc sản phẩm theo Ô Input (Adobe/Netflix/GPT)

### 1. Phạm vi & Mục tiêu
- **Phạm vi**: 
  1. Thêm nút `x` (xóa) trên từng variant pill trong phần "4. Variant của NCC" trên modal [SlotProductSupplierRuleModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx) để người dùng có thể xóa variant không cần thiết khỏi NCC (`business.supplier_cost`).
  2. Tự động lọc danh sách variant theo Ô Input đã chọn: Ô input Adobe chỉ lấy product Adobe, Ô input Netflix chỉ lấy product Netflix, Ô input GPT chỉ lấy product Chat GPT / OpenAI.
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **Backend API Xóa Variant Khỏi NCC**:
   - [backend/src/domains/system/services/productApiService.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/productApiService.js):
     - Hàm `listRoutingRules()`: join thêm `TABLES.PRODUCT` lấy `p.package_name as product_name` và `sc.id as supplier_cost_id`.
     - Bổ sung hàm `deleteSupplierVariant({ supplierCostId, supplierId, variantId })`: bọc transaction ACID, gọi `productService.deleteSupplierCost` để xóa bản ghi `supplier_cost` và dọn sạch các rule điều phối mồ côi nếu có.
   - [backend/src/domains/system/controllers/productApiController.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/controllers/productApiController.js): Thêm handler `deleteSupplierVariant`.
   - [backend/src/domains/system/routes.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/routes.js): Đăng ký route `DELETE /product-apis/supplier-variants/:supplierCostId?`.

2. **Frontend UI/UX & Lọc Thông Minh**:
   - [frontend/src/features/external-api/types/index.ts](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/types/index.ts): Bổ sung `supplier_cost_id` và `product_name` cho `SupplierVariantOption`.
   - [frontend/src/features/external-api/api/externalApiClient.ts](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/api/externalApiClient.ts): Thêm client method `deleteSupplierVariant(supplierCostId)`.
   - [frontend/src/features/external-api/hooks/useExternalApiConfig.ts](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/hooks/useExternalApiConfig.ts): Cung cấp hook `deleteSupplierVariant` tự động cập nhật state local và đồng bộ lại danh sách.
   - [frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx):
     - **Lọc theo Ô Input**: `selectedVariants` tự động nhận diện ô input (Adobe -> chỉ lấy variant thuộc Adobe; Netflix -> chỉ lấy Netflix; GPT -> chỉ lấy Chat GPT / OpenAI), tự động loại trừ các variant ngoại lai như `Canva_Add--12m`.
     - **Nút xóa variant `x`**: Từng variant pill được thiết kế gồm thân pill để chọn/bỏ chọn, và nút `x` riêng bên phải có xác nhận dialog `notification.confirm`, gọi API xóa variant khỏi NCC và cập nhật UI tức thì.
   - [frontend/src/features/external-api/components/ProductApiMappingTab.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx) & [frontend/src/features/external-api/components/ExternalApiConfigController.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx): Kết nối truyền nhận callback `onDeleteSupplierVariant`.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Unit test backend**: `cd backend; node --test tests/unit/productApiService.test.js` PASS 7/7 tests (336ms), bao gồm các ca kiểm tra validation và rejection khi xóa.
- **Frontend Build**: `cd frontend; npm run build` (tsc + vite) PASS 100% không cảnh báo lỗi, đóng gói hoàn tất trong 9.87s.
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py` trên 10 file tác động PASS 100% không có Mojibake, BOM hay vỡ dấu.

---

## [15:45] Tái cấu trúc luồng chọn Modal OTP: Ô Input -> NCC cung cấp -> Provider -> Variant

### 1. Phạm vi & Mục tiêu
- **Phạm vi**: 
  1. Đảo lại luồng chọn trên modal [SlotProductSupplierRuleModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx):
     - Bước 1: Chọn Ô Input trên Web OTP Portal.
     - Bước 2: Chọn Nhà Cung Cấp (NCC).
     - Bước 3: Chọn Provider của ô input đã chọn.
     - Bước 4: Chọn Variant của NCC.
  2. Lọc thông minh danh mục NCC theo Ô Input: Khi chọn Ô Input (ví dụ Adobe), dropdown NCC chỉ hiển thị những NCC thực tế đang cung cấp sản phẩm của Ô Input đó (kèm số lượng variant cụ thể, ví dụ: `Ades (4 variant)`), ẩn các NCC không liên quan.
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Chi tiết kỹ thuật & Giải pháp
- [frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx):
  - Bổ sung `filteredSuppliers`: tính toán intersection giữa `selectedSlot` và `supplierVariants`, đếm số lượng variant khả dụng của từng NCC và lọc danh sách NCC chỉ gồm những bên thực sự có sản phẩm cho slot đó.
  - Sắp xếp lại bố cục form:
    + **Hàng 1**: 2 cột ngang gồm `1. Ô Input trên Web OTP Portal` và `2. Nhà Cung Cấp (NCC)` (với nhãn hiển thị số NCC đang cung cấp sản phẩm).
    + **Hàng 2**: `3. Provider của ô input đã chọn` (lọc theo các provider được cấu hình cho ô input).
    + **Hàng 3**: `4. Variant của NCC` (hiển thị danh sách variant đã lọc của NCC đó kèm nút `x` xóa).
  - Tự động reset state thông minh: Khi đổi Ô Input, nếu NCC đã chọn trước đó không cung cấp sản phẩm của Ô Input mới, `supplierId` sẽ tự động được reset về rỗng để tránh chọn nhầm dữ liệu chéo.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Frontend Build**: `cd frontend; npm run build` (tsc + vite) PASS 100% không lỗi syntax/type, hoàn thành trong 7.27s.
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx` PASS 100% UTF-8 sạch.

---

## [17:20] Bổ sung hiển thị các vật phẩm/variant đang tạm ngừng hoạt động (Inactive Variants)

### 1. Phạm vi & Mục tiêu
- **Phạm vi**: Hiển thị đầy đủ tất cả các variant của NCC trong phần "4. Variant của NCC" trên modal [SlotProductSupplierRuleModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx), bao gồm cả các variant đang tắt/tạm ngừng hoạt động (`is_active: false`), cho phép chọn liên kết và bấm nút `x` để xóa variant khỏi NCC.
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **Backend Service & Validation**:
   - [backend/src/domains/system/services/productApiService.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/productApiService.js):
     - Trong query `supplierVariants` của `listRoutingRules()`: bỏ điều kiện cứng `.where("v.is_active", true)`, đồng thời select thêm `v.is_active as is_active` để trả về đầy đủ các variant kèm trạng thái thực tế.
     - Trong hàm `saveRoutingRuleVariants()`: bỏ điều kiện `.where("v.is_active", true)` trong danh sách `validVariants`, cho phép gán quy tắc điều phối OTP cho cả các variant đã tắt (đáp ứng các đơn hàng cũ lịch sử).
   - [backend/tests/unit/productApiService.test.js](file:///D:/Desktop/admin/admin_orderlist/backend/tests/unit/productApiService.test.js): Bổ sung kiểm tra cấu trúc variant trả về có trường boolean `is_active`.
2. **Frontend Type & UI**:
   - [frontend/src/features/external-api/types/index.ts](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/types/index.ts): Bổ sung `is_active?: boolean` vào interface `SupplierVariantOption`.
   - [frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx):
     - Hiển thị đầy đủ cả variant active và inactive.
     - Với variant đang tắt (`is_active === false`), hiển thị nhãn `Tắt` cùng màu xám dịu để người dùng phân biệt dễ dàng nhưng vẫn có thể chọn hoặc bấm `x` xóa khỏi NCC.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Unit test backend**: `cd backend; node --test tests/unit/productApiService.test.js` PASS 7/7 tests (345ms).
- **Frontend Build**: `cd frontend; npm run build` (tsc + vite) PASS 100% không cảnh báo lỗi, hoàn tất trong 16.07s.
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py` trên 4 file tác động PASS 100% không có Mojibake, BOM hay vỡ dấu.

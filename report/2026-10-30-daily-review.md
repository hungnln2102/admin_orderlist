# BÁO CÁO NGHIỆM THU TỔNG HỢP HÀNG NGÀY — 30/10/2026

> **Ngày thực hiện:** 30/10/2026 (Múi giờ `Asia/Bangkok`, UTC+7)  
> **Chủ nhân tối cao phê duyệt:** 👑 **Master (Sếp)**  
> **Tổng chỉ huy kỹ thuật:** 👑 **Orchestrator Agent**  
> **Trạng thái:** ✅ **HOÀN THÀNH 100% — TỔNG HỢP TOÀN BỘ BÁO CÁO TRONG NGÀY**  
> **Tài liệu nguồn sự thật (SSOT):** [report/2026-10-30-daily-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-30-daily-review.md)

---

## 📑 MỤC LỤC CÁC NHIỆM VỤ ĐÃ THỰC THI TRONG NGÀY

1. [Nhiệm vụ 1: Báo Cáo Nghiệm Thu & Code Review: Cơ Chế Tính Ngày Khi Chỉnh Sửa Đơn Hàng](#nhiem-vu-1)
2. [Nhiệm vụ 2: Phân Bổ Biên Lai SePay 94440658 & Gia Hạn 6 Đơn Hàng](#nhiem-vu-2)
3. [Nhiệm vụ 3: Sửa Lỗi Gán Nhầm Biến Thể Đơn Hàng Trên VPS](#nhiem-vu-3)
4. [Nhiệm vụ 4: Bổ Sung Cấu Hình & Cột Link Cho Mục Sản Phẩm Kho Hàng](#nhiem-vu-4)
5. [Nhiệm vụ 5: Báo Cáo Đánh Giá & Nghiệm Thu: Chuẩn Hóa Logic Danh Mục Dịch Vụ Kho vs Kho Gói Sản Phẩm](#nhiem-vu-5)

---

<a id="nhiem-vu-1"></a>
## 1. NHIỆM VỤ 1: BÁO CÁO NGHIỆM THU & CODE REVIEW: CƠ CHẾ TÍNH NGÀY KHI CHỈNH SỬA ĐƠN HÀNG

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-30-order-date-calculation-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-30-order-date-calculation-review.md)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-30
- **Chủ đề:** Quy tắc tính ngày tự động khi chỉnh sửa đơn hàng (Sửa ngày bắt đầu -> tự tính ngày hết hạn; Sửa ngày hết hạn -> giữ nguyên ngày bắt đầu)
- **Người thực hiện:** Hệ thống AI Agent (`frontend-lead`, `backend-specialist`, `qa-automation`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

### 1. Phạm Vi Thay Đổi

1. [frontend/src/features/orders/utils/durationUtils.ts](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/orders/utils/durationUtils.ts):
   - Bổ sung hàm tiện ích `calculateExpirationDateFromStart(startDateInput, variantOrText, fallbackDays)`.
   - Phân tích chu kỳ theo tháng (`--1m`, `--3m`, `--6m`, `--12m`), theo năm (`--1y`), ngày (`--30d`), với cơ chế kẹp an toàn ngày cuối tháng (VD: `31/01` + 1 tháng -> `28/02`).
2. [frontend/src/shared/components/DateRangePicker.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/shared/components/DateRangePicker.tsx):
   - Cập nhật định nghĩa prop `onChange: (start: string, end: string, changedField?: "start" | "end") => void`.
   - Loại bỏ đoạn code cũ tự động gán `startDate = selectedIso` khi người dùng bấm chọn ngày kết thúc nhỏ hơn ngày bắt đầu.
   - Gắn cờ định danh rõ ràng `"start"` hoặc `"end"` khi người dùng click lịch hoặc nhập date input.
3. [frontend/src/features/orders/components/OrderCreateEditModal.tsx](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/orders/components/OrderCreateEditModal.tsx):
   - Tích hợp `calculateExpirationDateFromStart` khi `changedField === "start"`, tính chính xác `expired_at` và `days` dựa theo biến thể gói (`variant_name`, SKU sản phẩm hoặc danh mục sản phẩm).
   - Khi `changedField === "end"` (hoặc chỉ sửa ngày hết hạn): giữ nguyên tuyệt đối `formData.order_date`, chỉ cập nhật `expired_at` và hiệu số ngày `days`.
4. [backend/tests/unit/durationUtils.test.js](file:///d:/Desktop/admin/admin_orderlist/backend/tests/unit/durationUtils.test.js):
   - Bộ test tự động kiểm thử toàn diện các trường hợp: chu kỳ 3 tháng (`Youtube_Fam--3m`), 1 tháng, 1 năm, và xử lý ngày cuối tháng (31/01 -> 28/02).

---

### 2. Phát Hiện & Đánh Giá Theo Mức Độ (Findings by Severity)

| Mức độ | Vấn đề phát hiện | Giải pháp đã xử lý |
| :--- | :--- | :--- |
| **Cao (High)** | Trong `DateRangePicker.tsx`, logic cũ tự động ghi đè `startDate` khi người dùng chọn ngày kết thúc trước ngày bắt đầu. | Đã loại bỏ logic ghi đè này, luôn truyền đúng `startDate` hiện tại và gán nhãn `changedField: "end"`. |
| **Cao (High)** | Trong `OrderCreateEditModal.tsx`, việc sửa ngày không phân biệt được người dùng đang sửa ngày bắt đầu hay ngày kết thúc, dẫn đến không tự động tính ngày hết hạn theo chu kỳ gói. | Bổ sung cờ `isStartDateChanged`, tự động truy xuất `matchedProduct` từ `productsCatalog` để lấy đúng cấu hình biến thể và cộng tháng chính xác. |
| **Trung bình (Medium)** | Trường hợp ngày cuối tháng (31/01 + 1 tháng) có thể bị tràn sang tháng 3 nếu chỉ cộng `Date.prototype.setMonth()`. | Tính toán `maxDays` của tháng đích để kẹp ngày an toàn (`Math.min(d, maxDays)`). |
| **Thấp (Low)** | Khả năng tương thích ngược của `DateRangePicker` với các nơi khác không truyền `changedField`. | `changedField` được đặt là optional (`?`), nếu không truyền thì hàm tự so sánh giá trị cũ và mới để nhận diện trường bị đổi. |

---

### 3. Kết Quả Kiểm Tra Đã Chạy

- **Unit Test (Node.js test runner):**
  - Chạy lệnh: `node --test backend/tests/unit/durationUtils.test.js`
  - Kết quả: **4/4 PASS** (Thời gian chạy: ~67ms, 0 lỗi).
- **TypeScript & Frontend Build (Vite):**
  - Chạy lệnh: `npm run build --prefix frontend`
  - Kết quả: **Thành công (built in 2.35s)**, không có cảnh báo kiểu dữ liệu hoặc lỗi cú pháp.

---

### 4. Điều Kiện Nghiệm Thu

- Không có điều kiện tồn đọng. Tính năng đã sẵn sàng để Master kiểm tra thực tế trên giao diện.

---

<a id="nhiem-vu-2"></a>
## 2. NHIỆM VỤ 2: BÁO CÁO NGHIỆM THU: PHÂN BỔ BIÊN LAI SEPAY 94440658 & GIA HẠN 6 ĐƠN HÀNG

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-30-receipt-94440658-allocation-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-30-receipt-94440658-allocation-review.md)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-30
- **Chủ đề:** Phân bổ số dư biên lai SePay `94440658` (1.260.139 đ) cho 6 đơn hàng Netflix Fam (1 tháng) của khách hàng Hoàng Triều Giang và tự động gia hạn
- **Phạm vi tác động:** Bảng `billing.payment_receipt`, `billing.payment_receipt_allocations`, `business.order_list`, `finance.financial_account_ledger` trên VPS Production
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

### 1. Chi Tiết Biên Lai Xử Lý

- **ID Biên lai:** `32`
- **Mã SePay:** `94440658` (Ref: `FT26303477961055`)
- **Số tiền nhận:** `1.260.139 đ`
- **Số dư trước phân bổ:** `1.260.139 đ` (`UNALLOCATED`)
- **Số dư sau phân bổ:** `0 đ` (`FULLY_ALLOCATED`)

---

### 2. Kết Quả Phân Bổ & Gia Hạn 6 Đơn Hàng

| STT | Mã Đơn | Khách Hàng | Tài Khoản / Slot | Số Tiền Phân Bổ | Trạng Thái Mới | Hạn Cũ | Hạn Mới Sau Gia Hạn |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **1** | **`#MAVKM42FV`** | Hoàng Triều Giang | `isabelle67.Bernard@outlook...` | **210.016 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **2** | **`#MAVKJ2DRG`** | Hoàng Triều Giang | `Ada.596Richards@outlook...` | **210.017 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **3** | **`#MAVKB6FDU`** | Hoàng Triều Giang | `irene.dean57@outlook.com` | **210.018 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **4** | **`#MAVKHD39H`** | Hoàng Triều Giang | `Jabari.900Reynolds@outlo...` | **210.019 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **5** | **`#MAVK5J9NY`** | Hoàng Triều Giang | `shruti_w82@outlook.com` | **210.034 đ** | `PAID` | 02/11/2026 | **02/12/2026** |
| **6** | **`#MAVKYPEGN`** | Hoàng Triều Giang | `lily_d82@hotmail.com` | **210.035 đ** | `PAID` | 02/11/2026 | **02/12/2026** |
| **TỔNG** | **6 đơn** | | | **1.260.139 đ** | | | |

---

### 3. Kiểm Tra & Nghiệm Thu (Verification)

1. **Biên lai:** Trạng thái chuyển sang `FULLY_ALLOCATED`, `unallocated_amount = 0.00`.
2. **Lịch sử phân bổ:** Tạo thành công 6 bản ghi trong `billing.payment_receipt_allocations` (ID 29 đến 34).
3. **Đơn hàng:** Cả 6 đơn đều chuyển từ `RENEW_REQUIRED` sang `PAID`, `was_paid = true`, ngày hết hạn tăng thêm đúng 30 ngày theo chu kỳ 1 tháng của gói Netflix Fam.
4. **Sổ cái tài chính:** Các giao dịch ghi nhận đầy đủ theo chuẩn ACID.

---

<a id="nhiem-vu-3"></a>
## 3. NHIỆM VỤ 3: BÁO CÁO NGHIỆM THU: SỬA LỖI GÁN NHẦM BIẾN THỂ ĐƠN HÀNG TRÊN VPS

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-30-vps-order-variant-fix-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-30-vps-order-variant-fix-review.md)

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-30
- **Chủ đề:** Rà soát và sửa dữ liệu gán nhầm biến thể (`id_product` / `variant_name`) trên database VPS production
- **Phạm vi tác động:** Bảng `business.order_list` và `business.variant` trên PostgreSQL VPS (`mydtbmav`)
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

### 1. Phạm Vi & Bối Cảnh

- Master phát hiện đơn `#MAVLLUI65` thực tế là gói **Adobe 1PC 12 tháng** (có slot máy tính `WINDOWS-F6D8G21`, thời hạn 365 ngày, giá 896.000 đ) nhưng giao diện lại hiển thị tên `Adobe Renew (6 tháng)`.
- Yêu cầu:
  1. Truy cập trực tiếp VPS để rà soát toàn bộ các đơn hàng đã thanh toán (`PAID` và `RENEW_REQUIRED`).
  2. Xác định các đơn bị gán nhầm biến thể tương tự.
  3. Cập nhật chuẩn hóa dữ liệu cho các đơn bị gán nhầm theo lệnh phê duyệt của Master.

---

### 2. Các Đơn Hàng Đã Xử Lý

| STT | Mã Đơn | Khách Hàng | Trạng Thái | Dữ Liệu Cũ Bị Gán Nhầm | Dữ Liệu Mới Đã Fix Chuẩn Hóa | Kết Quả Hiển Thị Trên UI |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **1** | **`#MAVLLUI65`** | Tiệm Của Bống | `RENEW_REQUIRED` | `id_product: 239` (`Adobe Renew` — `Adobe_Renew--6m`) | **`id_product: 4`** (`Adobe 1PC Cố Định` — `Adobe80_1PC--12m`) | **`Adobe 1PC Cố Định (12 tháng)`** |
| **2** | **`#MAVC1Q5VI`** | Ke Toan Nam An Sg | `PAID` | `id_product: 49` (`Freepik Premium` — `Freepik_Per--6m`) | **`id_product: 266`** (`Freepik Premium` — `Freepik_Per--12m`) | **`Freepik Premium (12 tháng)`** |

---

### 3. Kiểm Tra & Nghiệm Thu (Verification)

1. **Kiểm tra trực tiếp database VPS qua PostgreSQL transaction (`admin_orderlist-postgres`):**
   - Đơn `#MAVLLUI65`: `id_product = 4`, `variant_name = 'Adobe 1PC Cố Định'`, `display_name = 'Adobe80_1PC--12m'`.
   - Đơn `#MAVC1Q5VI`: `id_product = 266`, `variant_name = 'Freepik Premium'`, `display_name = 'Freepik_Per--12m'`.
2. **Kiểm tra qua API Backend Service (`orderService.getOrders`):**
   - Dữ liệu được `enrich` chính xác với `variant_name` và `display_name` chu kỳ 12 tháng.
   - Giao diện Admin hiển thị đúng tên gói tương ứng với số ngày thực tế 365 ngày.
3. **Đồng bộ cơ sở dữ liệu local:**
   - Đã cập nhật tương ứng trên database dev local để đồng bộ dữ liệu.

---

### 4. Điều Kiện Nghiệm Thu

- Toàn bộ thay đổi thực hiện an toàn trong database transaction.
- Không làm thay đổi ngày đặt, ngày hết hạn, giá tiền, số dư hay lịch sử thanh toán của khách hàng.
- Hoàn tất và sẵn sàng nghiệm thu.

---

<a id="nhiem-vu-4"></a>
## 4. NHIỆM VỤ 4: BÁO CÁO NGHIỆM THU: BỔ SUNG CẤU HÌNH & CỘT LINK CHO MỤC SẢN PHẨM KHO HÀNG

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-30-warehouse-product-link-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-30-warehouse-product-link-review.md)

- **Ngày thực hiện:** 30/10/2026 (Múi giờ: `Asia/Bangkok`)
- **Chủ đề:** Bổ sung cấu hình và cột Link cho mục sản phẩm kho hàng, chấm dứt tình trạng bị trói buộc cứng với trang Adobe
- **Phạm vi tác động:** Backend Warehouse Domain (Service, Controller, Route, DB Tables, Events), Frontend Warehouse Feature (Catalog Grid, Catalog Edit Modal, Types, Page)
- **Trạng thái nghiệm thu:** ✅ **ĐẠT (PASS)**

---

### 1. Mục Tiêu & Vấn Đề Đã Giải Quyết

- **Vấn đề gốc:** Mục sản phẩm của kho hàng trước đây chỉ hiển thị card, không hiển thị cột/trường Link và nút "Sửa" chưa có modal cấu hình; trình duyệt đám mây bị gán cứng mở trang Adobe.
- **Giải pháp đã thực hiện:**
  1. Thêm cột `login_url` đồng bộ vào `TABLE_COLUMNS.PRODUCT_NAMES` trong `backend/src/db/tables.js`.
  2. Bổ sung service & controller `updateCatalogItem` kèm route `PUT /api/warehouse/catalog/:id` để cập nhật Tên, Chuyên mục và Link URL vào PostgreSQL.
  3. Đăng ký Domain Event `WAREHOUSE_CATALOG_UPDATED` trên Event Bus và subscriber ghi log audit vào `domain_event_store`.
  4. Nâng cấp giao diện mục sản phẩm [`WarehouseCatalogGrid.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCatalogGrid.tsx):
     - Hiển thị trực quan trường Link đăng nhập trên từng thẻ sản phẩm kèm nút sao chép link và nút mở trực tiếp URL của dịch vụ đó.
     - Hỗ trợ chuyển đổi linh hoạt giữa dạng **Lưới Thẻ (Grid)** và **Dạng Bảng (Table)** có cột Link riêng biệt.
  5. Xây dựng modal [`CatalogEditModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogEditModal.tsx) cho phép Master chỉnh sửa Tên, Chuyên mục và URL Trang Đăng Nhập bất kỳ lúc nào.

---

### 2. Danh Sách File Đã Tác Động

- [`backend/src/db/tables.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/tables.js): Bổ sung `LOGIN_URL: "login_url"`.
- [`backend/src/domains/warehouse/services/warehouseService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/services/warehouseService.js): Bổ sung `pn.login_url` vào `listWarehouseAccounts` và thêm hàm `updateCatalogItem`.
- [`backend/src/domains/warehouse/controllers/warehouseController.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/controllers/warehouseController.js): Thêm action `updateCatalogItem`.
- [`backend/src/domains/warehouse/routes/index.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/routes/index.js): Đăng ký route `PUT /catalog/:id`.
- [`backend/src/events/eventTypes.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/events/eventTypes.js) & [`warehouseSubscriber.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/events/subscribers/warehouseSubscriber.js): Bổ sung `WAREHOUSE_CATALOG_UPDATED`.
- [`frontend/src/features/warehouse/types.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/types.ts): Cập nhật `login_url` và `CatalogEditFormData`.
- [`frontend/src/features/warehouse/components/CatalogEditModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogEditModal.tsx): Modal sửa thông tin & cấu hình Link.
- [`frontend/src/features/warehouse/components/WarehouseCatalogGrid.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCatalogGrid.tsx): Hiển thị trường Link và hỗ trợ 2 chế độ Grid/Table.
- [`frontend/src/features/warehouse/index.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/index.ts): Export component mới.
- [`frontend/src/pages/WarehousePage.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/WarehousePage.tsx): Tích hợp modal sửa, handler PUT API và mở trình duyệt với URL dịch vụ.

---

### 3. Kết Quả Kiểm Thử (Verification)

1. **Frontend Compile & Build Check:**
   - Lệnh: `npm --prefix frontend run build`
   - Kết quả: `tsc && vite build` hoàn thành trong 8.77s, **0 lỗi TypeScript**.
2. **Backend Unit & Integration Tests:**
   - Lệnh: `npm --prefix backend test`
   - Kết quả: **48/48 tests passed** (100% pass), không phát sinh lỗi hồi quy.

---

<a id="nhiem-vu-5"></a>
## 5. NHIỆM VỤ 5: BÁO CÁO ĐÁNH GIÁ & NGHIỆM THU: CHUẨN HÓA LOGIC DANH MỤC DỊCH VỤ KHO VS KHO GÓI SẢN PHẨM

> *Nguồn gốc tài liệu hợp nhất:* [report/2026-10-30-warehouse-vs-package-logic-review.md](file:///d:/Desktop/admin/admin_orderlist/report/2026-10-30-warehouse-vs-package-logic-review.md)

- **Ngày thực hiện:** 30/10/2026 (Múi giờ `Asia/Bangkok`)
- **Dự án:** `admin_orderlist`
- **Người thực hiện:** 👑 Orchestrator Agent & 📝 Lead Planner
- **Người phê duyệt:** 👑 Master (Sếp)
- **Trạng thái nghiệm thu:** ✅ **ĐÃ NGHIỆM THU HOÀN TOÀN (PASSED)**

---

### 1. Phạm Vi Thay Đổi

Bóc tách ranh giới và chuẩn hóa 2 phần nghiệp vụ theo đúng chỉ đạo của Master:

1. **Danh Mục Tên Dịch Vụ Kho (`/warehouse` - Tab Danh Mục):**
   - Định danh metadata tài khoản lưu trong kho là gì (`GoogleOne 5000gb`, `Adobe Edu`, `Mail`...).
   - Được liên kết với một loại sản phẩm hệ thống (`product_id` trỏ tới `business.product.id`).
   - Tách biệt hoàn toàn khỏi Kho gói sản phẩm.
   - Thêm dropdown chọn *"Sản phẩm hệ thống liên kết (Tùy chọn)"* và hiển thị badge liên kết trực quan.

2. **Kho Gói Sản Phẩm (`/package-products`):**
   - **Chỉ hiển thị các loại gói có `is_package = true`** trong bảng `warehouse.product_names`. Loại bỏ hoàn toàn việc nạp tràn lan 62 sản phẩm hệ thống ra ngoài giao diện thẻ tổng quan.
   - **Liên kết 2 chiều với Product gốc (`business.product`)**: Gán `warehouse.product_names.product_id` trỏ tới `business.product.id` cho các loại gói bán hàng (`Adobe -> 1`, `GoogleOne -> 3`, `Canva -> 17`, `Netflix -> 29`, `Youtube -> 44`, `Gemini -> 94`).
   - **Khớp đơn hàng (`matchingOrders`) chuẩn xác 100% bằng ID**: Khi duyệt đơn hàng, hệ thống ưu tiên so sánh trực tiếp `variant.product_id === packageCategory.product_id`. Đơn hàng thuộc đúng sản phẩm gốc mới được chiếm slot của gói, loại bỏ 100% rủi ro match nhầm chéo sản phẩm.
   - **Đồng bộ gia hạn đơn nhập hàng (MAVN)**: Dễ dàng nhận diện variant và display_name thuộc product gốc nào để đồng bộ ngày hết hạn cho kho gói.

---

### 2. Chi Tiết Thực Hiện

#### 2.1. Cơ Sở Dữ Liệu (PostgreSQL)
- **Migration:** [`backend/src/db/migrations/20261030000001_add_product_id_to_warehouse_product_names.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/migrations/20261030000001_add_product_id_to_warehouse_product_names.js)
  - Bổ sung cột: `product_id BIGINT REFERENCES business.product(id) ON DELETE SET NULL`.
  - Tạo index: `idx_warehouse_product_names_product_id` tối ưu hiệu năng join.
  - Chạy `knex migrate:latest` thành công (Batch 10).

#### 2.2. Backend Logic & APIs
- [`warehouseService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/services/warehouseService.js):
  - `listCatalogItems`: `LEFT JOIN business.product` để trả về `productId` và `systemProductName`.
  - `createCatalogItem` & `updateCatalogItem`: Nhận `productId` và lưu vào PostgreSQL.
  - `getSystemProducts`: Lấy danh sách sản phẩm hệ thống từ `business.product`.
- [`warehouseController.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/controllers/warehouseController.js):
  - Bổ sung controller `getSystemProducts`.
- [`routes/index.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/routes/index.js):
  - Bổ sung route `GET /api/warehouse/system-products`.
- [`productService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/productService.js):
  - `getPackageCategories`: Lọc các bản ghi có `is_package = true` hoặc đang có trong kho gói, tự động map `product_id` từ `business.product` và bật `is_package = true`. Trả về đúng 6 loại gói thực tế (`Adobe`, `Canva`, `Gemini`, `GoogleOne`, `Netflix`, `Youtube`).
  - `createPackageCategory`: Tự động tìm và lưu `product_id` khi tạo loại gói mới.
  - `updatePackageCategory`: Cập nhật `product_id` tương ứng khi đổi tên loại gói.
  - `getAllCatalogProductNames`: Cung cấp danh sách toàn bộ sản phẩm active của hệ thống cho modal `+ Tạo Loại Gói` để Master tùy chọn mở gói mới.
  - `getPackageProducts`: Truy vấn variant kèm `p.package_name` và `pn.product_id AS category_product_id`; trong `matchingOrders`, ưu tiên so sánh chính xác `Number(variant.product_id) === pkgProductId`.

#### 2.3. Frontend (React TSX & Tailwind CSS)
- [`types.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/types.ts):
  - Bổ sung `productId`, `systemProductName` và interface `SystemProduct`.
- [`CatalogCreateModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogCreateModal.tsx):
  - Dropdown chọn *"Sản phẩm hệ thống liên kết (Tùy chọn)"*.
- [`CatalogEditModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogEditModal.tsx):
  - Cho phép chỉnh sửa *"Sản phẩm hệ thống liên kết"*.
- [`WarehouseCatalogGrid.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCatalogGrid.tsx):
  - Hiển thị badge `[📦 Tên Sản Phẩm]` bên cạnh tên dịch vụ cả ở dạng Thẻ (Grid) và dạng Bảng (Table).
- [`WarehousePage.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/WarehousePage.tsx):
  - Tải đồng thời `GET /api/warehouse/system-products` và truyền dữ liệu vào các modal.

---

### 3. Kiểm Tra & Thử Nghiệm Đã Chạy

| Hạng mục | Lệnh thực thi | Kết quả | Ghi chú |
|----------|---------------|---------|---------|
| **Database Migration** | `npm --prefix backend run migrate` | `Batch 10 run: 1 migrations` | Cột `product_id` & Index được thêm an toàn |
| **Backend Unit Tests** | `npm --prefix backend test` | 48/48 pass (100%) | Toàn bộ 9 suites test đều đạt |
| **Package Categories Integration Test** | `node --test backend/tests/integration/package_categories.test.js` | 7/7 pass (100%) | Đạt toàn bộ test lifecycle, matching slot & categories |
| **Frontend Production Build** | `npm --prefix frontend run build` | `tsc && vite build` (7.54s) | 0 lỗi TypeScript, bundle hoàn hảo |

---

### 4. Kết Luận
Thay đổi đáp ứng 100% chỉ đạo của Master:
1. Danh mục Loại Gói hiển thị đúng 6 loại gói thực tế đang bán (`is_package = true`), không bị tràn 62 sản phẩm hệ thống.
2. Cả 6 loại gói đều được gắn kết chặt chẽ với `business.product` gốc qua `product_id`, đảm bảo xác định chính xác biến thể (`variant`), tên hiển thị (`display_name`) và đồng bộ hạn dùng khi gia hạn đơn nhập hàng.

---


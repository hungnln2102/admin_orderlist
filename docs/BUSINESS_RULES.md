# Business Rules - Quy tắc nghiệp vụ

Tài liệu này mô tả các quy tắc nghiệp vụ chính của hệ thống quản lý đơn hàng.

---

## 1. Tạo đơn hàng (Create Order)

### Rule
- **Khi tạo đơn mới**: Status mặc định = `UNPAID` (Chưa Thanh Toán)
- **KHÔNG cộng tiền NCC** (Nhà Cung Cấp) vào `payment_supply` khi tạo đơn
- Đảm bảo supplier record tồn tại (tạo mới nếu chưa có)
- Gửi thông báo Telegram khi tạo đơn thành công

### Code location
- `backend/src/services/orderService.js` - `createOrder()`
- `backend/src/controllers/Order/crudRoutes.js` - `POST /api/orders`

### Test case
```javascript
// Tạo đơn → Debt NCC không đổi
const order = await createOrder({ supply: "NCC1", cost: 100000, ... });
// Debt trước = Debt sau
```

---

## 2. Cộng tiền hàng NCC (Add Supplier Debt)

### Rule
- **Khi đơn chuyển từ `UNPAID` → `PROCESSING`**: Cộng `cost` vào `payment_supply.import_value` của NCC
- Chỉ cộng khi có sự thay đổi status (không cộng nếu đã là PROCESSING)
- Cộng vào cycle mới nhất của NCC (hoặc tạo cycle mới nếu chưa có)
- **Webhook thanh toán**: Khi nhận payment receipt, tự động chuyển `UNPAID` → `PROCESSING` (nếu không phải renewal)

### Code location
- `backend/src/controllers/Order/orderFinanceHelpers.js` - `addSupplierImportOnProcessing()`
- `backend/src/controllers/Order/orderUpdateService.js` - `updateOrderWithFinance()`
- `backend/webhook/sepay/routes/webhook.js` - Webhook handler

### Test case
```javascript
// UNPAID → PROCESSING → Debt tăng đúng cost
const order = await createOrder({ supply: "NCC1", cost: 200000, ... });
await updateOrder({ id: order.id, status: STATUS.PROCESSING });
// Debt tăng 200000
```

---

## 3. Xóa đơn hàng (Delete Order)

### Rule

#### 3.1. Đơn `UNPAID`
- **Hard delete**: Xóa trực tiếp khỏi `order_list`
- **KHÔNG trừ tiền NCC** (vì chưa cộng)
- **KHÔNG lưu vào archive**

#### 3.2. Đơn `PAID` hoặc `PROCESSING`
- **Archive vào `order_canceled`**: Lưu vào bảng `order_canceled`
- **Trừ tiền NCC (prorated)**: Tính theo số ngày còn lại
  - `refund = (price * remainingDays) / totalDays`
  - `import_to_subtract = ceilToThousands((cost * remainingDays) / totalDays)`
  - Trừ vào `payment_supply.import_value` của NCC
- **Status**: Đặt `PENDING_REFUND` (Chờ Hoàn)
- **Refund value**: Lấy từ `reqBody.can_hoan` hoặc tính prorated

#### 3.3. Đơn khác (RENEWAL, EXPIRED, ...)
- **Archive vào `order_expired`**: Lưu vào bảng `order_expired`
- **Status**: Đặt `EXPIRED` (Hết Hạn)
- **KHÔNG trừ tiền NCC** (đơn đã hết hạn, không cần hoàn)

### Code location
- `backend/src/controllers/Order/orderDeletionService.js` - `deleteOrderWithArchive()`
- `backend/src/controllers/Order/orderFinanceHelpers.js` - `adjustSupplierDebtIfNeeded()`, `calcRemainingRefund()`

### Test case
```javascript
// PAID order với 20/30 ngày còn lại → Trừ prorated
const order = await createOrder({ supply: "NCC1", cost: 300000, days: 30, ... });
await updateOrder({ id: order.id, status: STATUS.PROCESSING }); // +300000
await deleteOrder({ id: order.id }, { so_ngay_con_lai: 20 });
// Debt giảm: ceil((300000 * 20/30) / 1000) * 1000 = 200000
```

---

## 4. Gia hạn đơn hàng (Renewal)

### Rule
- **Điều kiện eligible**: Order có status `RENEWAL`, `EXPIRED`, hoặc `PROCESSING` với `daysLeft <= 4`
- **Cập nhật đơn**:
  - `order_date` = ngày sau ngày hết hạn cũ + 1
  - `order_expired` = tính theo tháng sản phẩm (ví dụ: 1m = 30 ngày)
  - `days` = số ngày mới
  - `cost` = giá nhập mới (từ supplier_cost hoặc order cũ)
  - `price` = giá bán mới (tính theo công thức với pctCtv, pctKhach)
  - `status` = `PROCESSING`
- **Cộng tiền NCC mới**: Cộng `cost` mới vào `payment_supply.import_value`
- **Webhook renewal**: Khi nhận payment cho đơn eligible, tự động chạy renewal

### Code location
- `backend/webhook/sepay/renewal.js` - `runRenewal()`, `isEligibleForRenewal()`
- `backend/webhook/sepay/routes/webhook.js` - Renewal flow sau COMMIT
- `backend/src/controllers/Order/renewRoutes.js` - `POST /api/orders/:code/renew`

### Test case
```javascript
// Order RENEWAL với daysLeft <= 4 → Gia hạn + cộng cost mới
const order = await createOrder({ 
  supply: "NCC1", 
  cost: 100000, 
  order_expired: "2 days from now",
  status: STATUS.RENEWAL 
});
const debtBefore = await getSupplierDebt(supplyId);
await runRenewal(order.id_order, { forceRenewal: true });
// Debt tăng thêm cost mới, order_expired được cập nhật
```

---

## 5. Hoàn tiền (Refund)

### Rule
- **Chỉ đánh dấu status**: Chuyển `PENDING_REFUND` → `REFUNDED` trong `order_canceled`
- **KHÔNG tự động trừ tiền NCC**: Việc trừ tiền đã được xử lý khi xóa đơn (prorated)
- **Refund amount**: Lưu trong `order_canceled.refund` (đã tính khi xóa)

### Code location
- `backend/src/controllers/Order/renewRoutes.js` - `PATCH /api/orders/canceled/:id/refund`

### Test case
```javascript
// Đánh dấu refund → Status đổi, Debt không đổi
const canceledOrder = await db("order_canceled").where({ id_order: "..." }).first();
await db("order_canceled").where({ id }).update({ status: STATUS.REFUNDED });
// Debt NCC không thay đổi (đã trừ khi xóa)
```

---

## 6. Webhook thanh toán (Payment Webhook)

### Rule
- **Insert payment receipt**: Lưu vào `payment_receipt`
- **UNPAID → PROCESSING**: Tự động chuyển nếu order status = UNPAID
- **Cộng tiền NCC**: Chỉ khi **không phải renewal** (renewal tự cộng trong `runRenewal()`)
- **Renewal flow**: Sau COMMIT, nếu order eligible → queue + `processRenewalTask()`

### Code location
- `backend/webhook/sepay/routes/webhook.js` - Main webhook handler

---

## 7. Scheduler (Cron)

### Rule
- **Chuyển đơn hết hạn**: Chỉ chuyển đơn có status `PAID`, `RENEWAL`, hoặc `EXPIRED` (không chuyển `PROCESSING`)
- **PAID → RENEWAL**: Khi `0 <= daysLeft <= 4`
- **RENEWAL → EXPIRED**: Khi `daysLeft = 0`
- **Move to expired**: Đơn với `expiry < today` và status `PAID/RENEWAL/EXPIRED` → chuyển sang `order_expired`

### Code location
- `backend/scheduler.js` - `updateDatabaseTask()`

---

## Tóm tắt Rule về Tiền NCC

| Hành động | Tiền NCC | Ghi chú |
|-----------|----------|---------|
| **Tạo đơn** | Không đổi | Chưa thanh toán |
| **UNPAID → PROCESSING** | **+cost** | Webhook hoặc manual update |
| **Xóa đơn UNPAID** | Không đổi | Hard delete |
| **Xóa đơn PAID/PROCESSING** | **-prorated** | Trừ theo số ngày còn lại |
| **Gia hạn đơn** | **+cost mới** | Cộng giá nhập mới |
| **Hoàn tiền (status)** | Không đổi | Chỉ đánh dấu, đã trừ khi xóa |

---

## 8. Thông tin sản phẩm – Thêm mới & Chỉnh sửa

### Mapping 3 cột (đúng)

| Ô trên form       | Bảng.cột              | API / state   |
|-------------------|------------------------|---------------|
| **Tên Sản Phẩm**  | `product.package_name` | `packageName` |
| **Gói Sản Phẩm**  | `variant.variant_name`| `packageProduct` |
| **Mã Sản Phẩm**   | `variant.display_name`| `sanPham`     |

### Rule

- **Tên Sản Phẩm** (`product.package_name`) và **Gói Sản Phẩm** (`variant.variant_name`) **được phép trùng** với sản phẩm khác.
- **Mã Sản Phẩm** (`variant.display_name`) **bắt buộc duy nhất** trong toàn hệ thống. Không được trùng với bất kỳ variant nào đã có.
- Khi **thêm sản phẩm mới** (theo repo admin_orderlist): Insert `product` với `package_name`; nếu đã có product cùng `package_name` thì **reuse** (onConflict merge), không tạo product mới. Sau đó tạo `variant` với `display_name` = Mã Sản Phẩm. Như vậy nhiều variant (nhiều Mã) có thể cùng một Gói (một product). Chỉ **Mã Sản Phẩm** là unique → trùng Mã → 400 "Mã Sản Phẩm đã tồn tại. Vui lòng chọn mã khác."
- Khi **chỉnh sửa sản phẩm** (PATCH): Cho phép đổi Tên / Gói. Đổi Mã sang giá trị đã tồn tại → 400 "Mã Sản Phẩm đã tồn tại." Nếu sửa Gói sang tên đã tồn tại mà DB có unique trên `product.package_name` → lỗi 23505; có thể chạy migration 003 để bỏ unique (khi đó cần logic khác cho create) hoặc giữ unique và reuse như server.

### Code location

- **Backend**: [backend/src/controllers/ProductsController/handlers/mutations.js](backend/src/controllers/ProductsController/handlers/mutations.js) – `createProductPrice` (POST /api/product-prices), `updateProductPrice` (PATCH /api/product-prices/:productId). Xử lý lỗi 23505: constraint `display_name`/variant → 400 Mã trùng; constraint `package_name` → 400 + hướng dẫn chạy migration.
- **Frontend**: Form thêm/sửa ở Bảng giá (PriceList) và Thông tin sản phẩm (ProductInfo); validation chỉ bắt buộc Mã hợp lệ, không cấm trùng Tên/Gói.

---

## 9. Gói Sản Phẩm (Package Product) – Match với đơn hàng

### Rule (ghi nhớ)

- **Tên Sản Phẩm & Gói Sản Phẩm có thể trùng; chỉ Mã Sản Phẩm là duy nhất** (chi tiết tại mục 8): Trong form Thông tin sản phẩm (tạo/sửa), **Tên Sản Phẩm** (`product.name`) và **Gói Sản Phẩm** (`product.package_name`) được phép trùng với sản phẩm khác. Chỉ **Mã Sản Phẩm** (variant `display_name`) bắt buộc unique. DB không được có unique constraint trên `product.package_name` (nếu còn thì chạy migration `database/migrations/003_drop_product_package_name_unique.sql`).
- **Loại gói gắn với Sản phẩm (FK)**: Bảng `package_product` có cột **`package_id`** (khóa ngoại → `product.id`). Khi tạo loại gói, chọn product từ dropdown; API nhận `packageId` (product id). Tên hiển thị lấy từ `product.package_name` qua JOIN. API dropdown: `GET /api/products/packages` trả về `[{ id, package_name }]`. Không còn đồng bộ tên khi đổi tên Product — join theo id nên luôn đúng.
- **Cột Match được chọn khi tạo gói**, không đổi sau đó (trừ khi sửa gói).
- **Match với cột Slot**: So sánh **tài khoản gói** (email trong "Thông tin gói" / `informationUser`) với **cột slot** của đơn hàng. Đơn match khi giá trị slot (sau chuẩn hóa) trùng với tài khoản gói.
- **Match với cột Information**: So sánh **tài khoản gói** với **cột information** của đơn hàng (`information_order`). Đơn match khi giá trị information (sau chuẩn hóa) trùng với tài khoản gói.
- **Chỉ dùng đúng một cột** theo lựa chọn khi tạo gói: không so sánh cả hai cột cùng lúc.
- **Validation**: Khi chọn Match (Slot hoặc Information), **Thông tin gói (Tài khoản)** là bắt buộc. Backend trả 400 nếu thiếu; frontend disable nút Lưu và hiển thị cảnh báo.

### Quy trình match 3 bước

1. **Gói → Sản phẩm → Variants → Lọc đơn**: `pp.package_id` = `product.id` (JOIN). Lấy danh sách variants (product_codes) của product đó. Chỉ xét đơn trong `order_list` có `id_product` (chuẩn hóa) thuộc các variant đó; nếu không có variant thì so sánh tuyệt đối với tên gói (từ product.package_name).
2. **So sánh tài khoản với cột match**: Dùng **tài khoản gói** (`account_user` / informationUser) so sánh với **một** cột đã chọn: **slot** hoặc **information_order**. Đơn match khi giá trị cột đó (sau chuẩn hóa) trùng với tài khoản gói.
3. **Cột hiển thị**: Nếu match theo **slot** → lấy giá trị **information** của đơn đưa vào vị trí slot trong gói; nếu match theo **information** → lấy giá trị **slot** của đơn đưa vào vị trí information trong gói.

### Chuẩn hóa so sánh

- **Link (tài khoản gói vs slot/information)**: lowercase, bỏ khoảng trắng (`normalizeMatchKey`).
- **Đơn thuộc gói (package_id → product → variant)**: So sánh **tuyệt đối**. Đơn chỉ thuộc gói khi (1) `id_product` (chuẩn hóa) nằm trong danh sách variant của product (product.id = `pp.package_id`), hoặc (2) không có variant thì so sánh chuỗi chuẩn hóa: `normalizeIdentifier(id_product)` = `normalizeIdentifier(product.package_name)`. Không dùng prefix / startsWith / includes.

### Code location

- **Backend**: [backend/src/config/dbSchema.js](backend/src/config/dbSchema.js) – PACKAGE_PRODUCT.COLS có `PACKAGE_ID: "package_id"`. [backend/src/services/packageProductService.js](backend/src/services/packageProductService.js) – JOIN `product` ON `p.id = pp.package_id`, lấy `product_codes` theo `product_id`. [backend/src/controllers/PackageController/service.js](backend/src/controllers/PackageController/service.js) – create/update dùng `packageId`; bulk delete theo `package_id`. [backend/src/controllers/PackageController/index.js](backend/src/controllers/PackageController/index.js) – `validateMatchRequiresAccount()`: trả 400 khi match chọn nhưng `informationUser` trống.
- **Frontend match logic**: [frontend/src/pages/Product/PackageProduct/utils/packageMatchUtils.ts](frontend/src/pages/Product/PackageProduct/utils/packageMatchUtils.ts) – `orderBelongsToPackageByProduct`, `orderMatchesPackageLink`, `computeAugmentationForPackage`. Hook [usePackageData.ts](frontend/src/pages/Product/PackageProduct/hooks/usePackageData.ts) gọi `computeAugmentationForPackage` cho từng gói.
- **Link keys**: [packageHelpers.ts](frontend/src/pages/Product/PackageProduct/utils/packageHelpers.ts) – `buildPackageLinkKeys(row)` = chuẩn hóa `row.informationUser`.
- **Form validation**: [PackageFormModal.tsx](frontend/src/pages/Product/PackageProduct/components/Modals/PackageFormModal.tsx) – khi `slotLinkMode` là slot hoặc information mà `informationUser` trống thì disable Lưu và hiển thị cảnh báo.

### Khi "Số lượng" luôn 0 / không match

1. **Kiểm tra cột match của gói**: Gói có thể được tạo trước khi có cột `match` → trong DB `match` = `null` → frontend mặc định dùng "information". Cần mở **Sửa gói** và chọn lại **Match với Slot** hoặc **Match với Information** rồi lưu.
2. **Đơn phải cùng sản phẩm/gói**: Đơn chỉ được tính vào "X / Y Vị trí" nếu `id_product` (chuẩn hóa) trùng **tuyệt đối** với một product code từ API (variant) hoặc với tên gói chuẩn hóa (khi không có variant).
3. **Giá trị so khớp**: Đơn chỉ match khi **cột đã chọn** (slot hoặc information) chứa đúng tài khoản gói (chuẩn hóa: lowercase, bỏ khoảng trắng).

---

## Chạy Test

```bash
cd backend
node test-rules.js
```

Test sẽ verify tất cả các rule trên và báo cáo kết quả.

## Mục tiêu

- **Chuẩn hóa**: `order_list.id_product` dùng **variant_id (NUMBER)**, không còn lưu display_name.
- **API rõ ràng**: phân tách **ID** và **display_name** trong JSON, tránh field 2 nghĩa.
- **Không vỡ code**: giữ tương thích ngược (`id_product` vẫn tồn tại ở response trong giai đoạn chuyển đổi).
- **Hoàn thành trong 1 ngày**: thay đổi tập trung vào order + pricing + webhook, không đụng sang các hệ thống khác nếu không cần.

---

## Thuật ngữ & quy ước mới

- **variant_id**: ID của bản ghi trong bảng `product.variant.id`.
- **product_display_name**: Tên hiển thị lấy từ `product.variant.display_name` (ví dụ: `NETFLIX_SLOT--1M`).
- **order_list.id_product**: LUÔN luôn = `variant_id` (NUMBER).
- Trong JSON:
  - **BẮT BUỘC** có `variant_id`.
  - **NÊN CÓ** `product_display_name` (để FE render).
  - `id_product` được xem là **ALIAS** (tạm thời) cho `product_display_name` để không vỡ code cũ.

---

## 1. Thay đổi ở tầng schema / dbSchema (chỉ là doc, không đổi DB)

File: `backend/src/config/dbSchema.js`

- **Xác nhận lại**:
  - `ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT = "id_product"` (kiểu INT, foreign key sang `product.variant.id`).
- **Ghi chú thêm trong code** (comment ngắn gọn):
  - `// ID_PRODUCT: variant_id (FK -> product.variant.id), không phải display_name`.

Không cần đổi tên cột trong DB hôm nay, chỉ cần thống nhất ý nghĩa.

---

## 2. Backend – API Orders (core nhất)

### 2.1. `Order/listRoutes.js` – GET `/api/orders`

File: `backend/src/controllers/Order/listRoutes.js`

**Hiện tại (rất gần đúng rồi)**:

- Join:
  - `order_list.id_product` ↔ `variant.id`
  - `order_list.supply_id` ↔ `supplier.id`
- Lựa chọn cột:
  - Có dòng:
    - `COALESCE(variant.display_name, order_list.id_product::text) as id_product`

**Cần sửa / bổ sung**:

1. Thêm 2 cột rõ ràng trong `SELECT`:
   - `order_list.id_product AS variant_id`
   - `COALESCE(variant.display_name::text, order_list.id_product::text) AS product_display_name`

2. Giữ lại alias cũ **cho tương thích**:
   - `id_product` trong SELECT có thể:
     - Hoặc trỏ về `product_display_name`:
       - `... AS id_product`
     - Hoặc không cần nếu FE đã dùng `product_display_name`.  
   - Giai đoạn đầu: **nên để**:
     - `product_display_name AS id_product`  
     để FE cũ không vỡ.

3. Trong `normalizeOrderRow`, ưu tiên:
   - Đọc `variant_id` làm ID.
   - Đọc `product_display_name` làm nhãn hiển thị.

### 2.2. `Order/crudRoutes.js` – POST `/api/orders`

File: `backend/src/controllers/Order/crudRoutes.js`

**Mục tiêu**:

- Input chấp nhận:
  - `variant_id` (number – mới, ưu tiên).
  - `id_product` (có thể là:
    - **ID variant** (số), hoặc
    - **display_name** (string) – path cũ).
- Luôn lưu xuống DB:
  - `payload[ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT] = variant_id`.

**Cần làm**:

- Ở phần chuẩn hóa payload:
  - Nếu body có `variant_id`:
    - Gán vào `productIdCol` trực tiếp.
  - Nếu không có `variant_id` nhưng có `id_product`:
    - Nếu là số → dùng như variant_id.
    - Nếu là string → dùng `resolveProductToVariantId` như logic cũ.
- Sau khi insert:
  - Trong object `normalized` trả về FE:
    - Thêm `variant_id` (ID).
    - Thêm `product_display_name` (nếu `normalizeOrderRow` chưa set).
    - Đặt `id_product = product_display_name` để FE cũ không vỡ.

### 2.3. `orderUpdateService.js` – PATCH/PUT đơn

File: `backend/src/controllers/Order/orderUpdateService.js`

- Tương tự CRUD:
  - Hỗ trợ cả `variant_id` mới và `id_product` cũ.
  - Luôn viết vào `ORDER_LIST.COLS.ID_PRODUCT` = variant_id.

---

## 3. Backend – Pricing & Supply (liên quan `id_product`)

### 3.1. `calculatePriceRoute.js` – POST `/api/calculate-price`

File: `backend/src/controllers/Order/calculatePriceRoute.js`

**Input hiện tại**:

- `supply_id`
- `san_pham_name`
- `id_product`
- `id_order`
- `customer_type`

**Cần chuẩn lại**:

1. Ưu tiên nhận **`variant_id`**:
   - Nếu body có `variant_id` (hoặc `id_product` là số):
     - Pass thẳng `variant_id` sang mớ helper pricing (để truy vấn `variant` + `price_config`).

2. Nếu `san_pham_name` vẫn còn cần:
   - Sử dụng **chỉ để** hiển thị / fallback:
     - Nhưng không dùng làm khóa chính cho pricing nữa.

3. Khi load `orderRow`:

```js
const orderRow = orderId
  ? await db(TABLES.orderList)
      .select(idProductCol, 'price', 'cost', supplyIdCol)
      .where({ id_order: orderId })
      .first()
  : null;
```

- Ở các helper, coi `orderRow[idProductCol]` là **variant_id** (NUMBER).

### 3.2. `webhook/sepay/payments.js` & `renewal.js`

- Đã chỉnh phần lớn sang dùng `variant_id`:
  - `ORDER_COLS.idProduct` = variant_id.
  - `fetchProductPricing`, `fetchSupplyPrice`, `fetchMaxSupplyPrice` đã hỗ trợ variant_id.
- Bổ sung / kiểm tra:
  - Mọi nơi truyền `productNameOrVariantId` / `sanPham`:
    - Nếu là số → coi là variant_id (đã OK).
    - Việc lấy `display_name` để tính thời hạn đã được sửa trong `renewal.js`:
      - Query `variant.display_name` khi `id_product` là số.

**Việc cần nhớ trong hôm nay**:

- Đảm bảo **mọi luồng mới** KHÔNG truyền display_name vào `ORDER_COLS.idProduct`, chỉ truyền ID.

---

## 4. Backend – Scheduler / Notify (Zero Days, Renew, v.v.)

### 4.1. `scheduler/tasks/notifyZeroDays.js`

File: `backend/src/scheduler/tasks/notifyZeroDays.js`

- Đã có logic:
  - Lấy `result.rows.map((r) => r.id_product)` làm **variant_id**.
  - Dùng `fetchVariantDisplayNames(client, variantIds)` để map sang display_name.
  - Trong normalized orders:
    - `id_product` / `idProduct` là **display_name**.

**Việc cần làm**:

- Chỉ cần đảm bảo:
  - Tên biến trong code, comment ghi rõ:
    - `id_product` trong `result.rows` là variant_id.
    - `productDisplay` là display_name.

Không cần đổi logic, chỉ cần tránh nhầm.

---

## 5. Frontend – Type & Modal (Order)

### 5.1. Type `Order`

File: `frontend/src/constants.ts`

**Hiện tại**:

- `id_product: string;`

**Cần thay đổi (theo hướng backward compatible)**:

- Thêm:
  - `variant_id?: number | null;`
  - `product_display_name?: string | null;`
- Giữ `id_product: string` nhưng:
  - Định nghĩa lại là: **alias cho product_display_name**.
  - Khi map từ API:
    - Nếu có `product_display_name` → `id_product = product_display_name`.

### 5.2. Create Order / Edit Order Modal

Files:

- `frontend/src/components/modals/CreateOrderModal/hooks/useOrderSubmit.ts`
- `frontend/src/components/modals/EditOrderModal/hooks/useEditOrderLogic.ts`
- `frontend/src/components/modals/CreateOrderModal/hooks/usePriceCalculation.ts`

**Mục tiêu**:

- Nội bộ form:
  - Làm việc với **`selectedVariantId`** và **`selectedVariantLabel`**.
- Khi submit:
  - Gửi lên backend:
    - `variant_id: selectedVariantId`
    - (optionally) `product_display_name` nếu route có hỗ trợ.
  - Không gửi display_name vào `id_product` nữa (tránh quay lại trạng thái cũ).

**Chiến lược chống vỡ code**:

- Giai đoạn đầu:
  - Gửi cả:
    - `variant_id`
    - `id_product: selectedVariantId` (ID, để backend cũ vẫn hoạt động).
  - Sau khi backend đã hỗ trợ `variant_id` chuẩn, có thể bỏ dần.

---

## 6. Frontend – Các chỗ khác đụng `id_product`

### 6.1. PriceList & Supply

Files điển hình:

- `frontend/src/pages/Product/PriceList/hooks/useSupplyActions.ts`
- `frontend/src/pages/Product/PriceList/hooks/usePricingData.ts`
- `frontend/src/pages/Product/PriceList/components/*`

**Nguyên tắc**:

- Ở PriceList, `product.id` = **variant_id**.
- Các hook thao tác giá nguồn (`fetchSupplyPricesForProduct`, v.v.) nên:
  - Nhận **variant_id** (ID) làm khóa chính.
  - Chuẩn hóa display label theo `display_name`.

Nếu hiện tại một số helper đang dùng `normalizeProductKey(productName)`, có thể:

- Thêm đường đi mới dựa trên `variant_id` (số).
- Giữ đường cũ (dựa trên tên) chỉ để tương thích data cũ.

### 6.2. Package / PackageProduct utilities

Files:

- `frontend/src/pages/Product/PackageProduct/utils/packageHelpers.ts`
- `frontend/src/pages/Product/PackageProduct/utils/packageMatchUtils.ts`

**Việc cần làm**:

- Rà lại:
  - Nếu `record.base.id_product` đang được coi là string code sản phẩm, cần:
    - Thêm `record.base.variant_id`.
    - Dùng `variant_id` để so sánh chính xác, sử dụng `display_name` làm label hiển thị.

---

## 7. Chiến lược rollout trong 1 ngày (không vỡ code)

**Bước 1 – Backend (trước)**:

1. Cập nhật `listRoutes.js` để trả thêm:
   - `variant_id`
   - `product_display_name`
   - `id_product = product_display_name` (alias).
2. Cập nhật `crudRoutes.js` + `orderUpdateService`:
   - Nhận `variant_id` (ưu tiên).
   - Lưu `ORDER_LIST.ID_PRODUCT = variant_id`.
3. Kiểm tra nhanh webhook & renewal:
   - Đảm bảo không có chỗ nào chèn display_name vào `id_product` nữa.

**Bước 2 – Frontend**:

1. Cập nhật type `Order` để chấp nhận:
   - `variant_id`, `product_display_name`.
2. Ở màn Order List:
   - Sử dụng `product_display_name` để hiển thị.
   - Vẫn đọc `id_product` nếu API cũ, nhưng ưu tiên mới.
3. Ở Create/Edit Order:
   - Form giữ cả:
     - `selectedVariantId`
     - `selectedVariantLabel`
   - Submit:
     - `variant_id: selectedVariantId`
     - `id_product: selectedVariantId` (tạm, để backend cũ vẫn nhận).

**Bước 3 – Cleanup dần (sau khi mọi thứ ổn)**:

- Gỡ dần việc gửi display_name trong `id_product`.
- Đổi dần FE nội bộ sang dùng thuần:
  - `variant_id` + `product_display_name`.
- Cập nhật docs & comment để tất cả dev đọc là hiểu:
  - `id_product (DB) = variant_id`.

---

## 8. Checklist nhanh cho hôm nay

- [ ] `dbSchema.js`: comment rõ `ORDER_LIST.ID_PRODUCT = variant_id`.
- [ ] `listRoutes.js`: thêm `variant_id`, `product_display_name`, alias `id_product`.
- [ ] `crudRoutes.js` + `orderUpdateService.js`: input/output chuẩn theo `variant_id`.
- [ ] `calculatePriceRoute.js`: ưu tiên `variant_id`, không dựa vào display_name làm khóa chính.
- [ ] FE type `Order`: thêm `variant_id`, `product_display_name`, mapping alias cho `id_product`.
- [ ] FE Create/Edit Order: submit `variant_id` (và tạm alias vào `id_product` nếu cần).
- [ ] Test:
  - [ ] Tạo đơn mới.
  - [ ] Sửa đơn.
  - [ ] Webhook thanh toán + Renewal.
  - [ ] Notify (Zero Days) vẫn hiển thị tên đúng.


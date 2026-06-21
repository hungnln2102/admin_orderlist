# Thiết kế luồng liên kết Nhập hàng ↔ Gói sản phẩm

## Mục tiêu
- Khi admin nhập hàng và chọn `Sản phẩm`, hệ thống tự nhận biết sản phẩm đó có cấu hình tạo gói hay không.
- Nếu sản phẩm thuộc một `Gói sản phẩm` đã được tạo/cấu hình, form nhập hàng tự mở thêm các input cần thiết như `Tài khoản`, `Mật khẩu`, `Mail dự phòng`, `2FA`, `Ghi chú`, `Hạn sử dụng`.
- Khi lưu, hệ thống tạo bản ghi trong `Lô hàng/Kho hàng` trước, sau đó tạo `Gói sản phẩm` liên kết tới lô vừa tạo.
- Tránh nhập trùng dữ liệu ở 2 nơi: admin chỉ nhập một lần ở màn nhập hàng.

## Customer:
Tại sao phần hạn sử dụng, tài khoản không dùng luôn ở form tạo đơn hàng. Chỉ cần tạo 1 khối để người dùng có thể nhập thêm các phần còn thiếu thôi là được mà. Check lại form tạo đơn đang có sẵn những gì rồi thì chỉ cần tạo thêm 1 khối bổ sung thôi.

## Hiện trạng trong source

### Kho hàng / Lô hàng
- Backend domain: `backend/src/domains/warehouse`.
- API hiện có:
  - `GET /api/warehouse`
  - `POST /api/warehouse`
  - `PUT /api/warehouse/:id`
  - `DELETE /api/warehouse/:id`
- Bảng backend đang dùng: `PRODUCT_STOCK`.
- Các field chính đang có:
  - `category` → loại/sản phẩm trong kho.
  - `account` → tài khoản/email/username.
  - `password` → mật khẩu.
  - `backup_email` → mail dự phòng.
  - `two_fa` → mã 2FA.
  - `note` → ghi chú.
  - `status` → trạng thái, ví dụ `Tồn`, `Đang Sử Dụng`.
  - `expires_at` → hạn sử dụng.
  - `is_verified` → đã xác minh.

### Gói sản phẩm
- Backend domain: `backend/src/domains/package-products`.
- API hiện có:
  - `GET /api/package-products`
  - `POST /api/package-products`
  - `PUT /api/package-products/:id`
  - `DELETE /api/package-products/:id`
- Bảng backend đang dùng: `PACKAGE_PRODUCT`.
- Gói đã có khả năng liên kết kho qua:
  - `stockId` / `stock_id`.
  - `storageId` / `storage_id`.
- Frontend package form hiện đã có cơ chế `manualStock` / `manualStorage` để tạo kho trước, rồi tạo gói sau trong `frontend/src/features/package-product/hooks/usePackageMutationActions.ts`.

## Luồng đề xuất

### 1. Cấu hình sản phẩm nào cần tạo gói
Mỗi sản phẩm/gói cần có cấu hình để biết khi nhập hàng thì cần hiện input nào.

Đề xuất dùng cấu hình theo `productId` hoặc `packageId`:

```ts
type ImportPackageField =
  | "account"
  | "password"
  | "backup_email"
  | "two_fa"
  | "expires_at"
  | "note";

type ProductImportPackageRule = {
  productId: number;
  packageProductId?: number;
  enabled: boolean;
  fields: ImportPackageField[];
  defaultSlotLimit?: number;
  requiresActivation?: boolean;
};
```

Ví dụ:

```json
{
  "productId": 12,
  "enabled": true,
  "fields": ["account", "password", "backup_email", "two_fa", "expires_at", "note"],
  "defaultSlotLimit": 1,
  "requiresActivation": true
}
```

### 2. Khi chọn sản phẩm ở form nhập hàng
Flow frontend:

1. Admin mở form nhập hàng.
2. Admin chọn `Sản phẩm`.
3. Frontend gọi/tra cache cấu hình `ProductImportPackageRule` theo `productId`.
4. Nếu `enabled = true`, form tự render thêm block `Thông tin tạo gói`.
5. Block này chỉ hiển thị đúng các field trong `fields`.
6. Nếu `enabled = false`, form nhập hàng giữ nguyên như hiện tại.

UI đề xuất:

```txt
[Chọn sản phẩm]
[Nhà cung cấp]
[Giá nhập]
[Số lượng]

Nếu sản phẩm có gói:
  ┌ Thông tin tạo gói ───────────────┐
  │ Tài khoản / Email                │
  │ Mật khẩu                         │
  │ Mail dự phòng                    │
  │ 2FA                              │
  │ Hạn sử dụng                      │
  │ Ghi chú                          │
  └──────────────────────────────────┘
```

### 3. Khi bấm lưu nhập hàng
Nên xử lý bằng một API orchestration để tránh frontend gọi rời rạc rồi lỗi giữa chừng.

Đề xuất API mới:

```http
POST /api/import-packages
```

Payload mẫu:

```json
{
  "productId": 12,
  "supplierId": 5,
  "quantity": 1,
  "importPrice": 50000,
  "warehouse": {
    "category": "Netflix Premium",
    "account": "user@example.com",
    "password": "pass123",
    "backup_email": "backup@example.com",
    "two_fa": "ABCDEF",
    "expires_at": "2026-12-31",
    "note": "Lô nhập ngày 21/06"
  },
  "package": {
    "slotLimit": 1,
    "matchMode": "information",
    "storageTotal": null
  }
}
```

Backend xử lý trong transaction:

1. Validate sản phẩm tồn tại.
2. Load rule tạo gói của sản phẩm.
3. Validate các field bắt buộc theo rule.
4. Insert `PRODUCT_STOCK`.
5. Insert `PACKAGE_PRODUCT` với `stock_id = product_stock.id`.
6. Nếu cần `storage_id`, insert thêm `PRODUCT_STOCK` cho storage hoặc dùng cùng stock tùy rule.
7. Commit transaction.
8. Trả về `{ warehouseItem, packageProduct }`.

Pseudo:

```ts
transaction(async trx => {
  const rule = await findImportPackageRule(productId);
  if (!rule?.enabled) {
    return createNormalImportOnly(payload);
  }

  const stock = await createWarehouseStock(trx, payload.warehouse);

  const pkg = await createPackageProduct(trx, {
    packageId: productId,
    stockId: stock.id,
    slotLimit: payload.package.slotLimit || rule.defaultSlotLimit || 1,
    importPrice: payload.importPrice,
    supplier: payload.supplierId,
    matchMode: payload.package.matchMode || "information",
  });

  return { stock, pkg };
});
```

## Data mapping đề xuất

| Form nhập hàng | `PRODUCT_STOCK` | `PACKAGE_PRODUCT` |
| --- | --- | --- |
| Sản phẩm | `category` | `package_id` |
| Tài khoản | `account_username` | qua `stock_id` |
| Mật khẩu | `password_encrypted` | qua `stock_id` |
| Mail dự phòng | `backup_email` | qua `stock_id` |
| 2FA | `two_fa_encrypted` | qua `stock_id` |
| Ghi chú | `note` | có thể map thêm `note` nếu cần |
| Giá nhập | không bắt buộc | `package_import` |
| Số slot | không bắt buộc | `slot` / capacity hiện có |
| Hạn sử dụng | `expires_at` | hiển thị gián tiếp qua stock |

## Trạng thái sau khi lưu
- `PRODUCT_STOCK.status` ban đầu có thể là `Tồn`.
- Vì `PACKAGE_PRODUCT.stock_id` trỏ tới stock này, API list kho hiện tại sẽ tự hiển thị `Đang Sử Dụng` bằng query `EXISTS`.
- Không cần tự set cứng `status = Đang Sử Dụng` nếu muốn giữ logic hiện tại.

## Thay đổi frontend đề xuất

### Feature nhập hàng
Tạo/điều chỉnh trong feature nhập hàng hiện tại:

```txt
frontend/src/features/<import-feature>/
  api/
    importPackageApi.ts
  hooks/
    useImportPackageRules.ts
    useImportPackageSubmit.ts
  components/
    ImportPackageDynamicFields.tsx
```

Nếu màn nhập hàng đang thuộc `warehouse`, có thể đặt trong:

```txt
frontend/src/features/warehouse/
  api/importPackageApi.ts
  hooks/useImportPackageRules.ts
  components/ImportPackageDynamicFields.tsx
```

### Component dynamic fields
Input render theo rule:

```ts
const FIELD_CONFIG = {
  account: { label: "Tài khoản", placeholder: "Email / Username" },
  password: { label: "Mật khẩu", type: "password" },
  backup_email: { label: "Mail dự phòng" },
  two_fa: { label: "2FA" },
  expires_at: { label: "Hạn sử dụng", type: "date" },
  note: { label: "Ghi chú" },
};
```

## Thay đổi backend đề xuất

Tạo domain orchestration riêng để không nhét logic vào controller warehouse hoặc package-products:

```txt
backend/src/domains/import-packages/
  routes.js
  controller/
    index.js
  services/
    createImportPackage.js
  repositories/
    importPackageRuleRepository.js
    warehouseStockRepository.js
    packageProductRepository.js
  validators/
    importPackageValidator.js
```

Lý do:
- `warehouse` chỉ quản lý tồn kho/lô hàng.
- `package-products` chỉ quản lý gói.
- Luồng mới là nghiệp vụ phối hợp giữa 2 domain, nên nên để domain/use-case riêng.

## Cấu hình rule nên lưu ở đâu?

### Phương án A: tận dụng field hiện có trên product
Nếu chỉ cần biết sản phẩm có cần activation hay không, có thể dùng `product.package_requires_activation` hiện tại.

Ưu điểm:
- Ít migration.
- Nhanh triển khai.

Nhược điểm:
- Không đủ linh hoạt nếu mỗi sản phẩm cần bộ input khác nhau.

### Phương án B: tạo bảng rule riêng
Đề xuất nếu muốn lâu dài:

```sql
CREATE TABLE product.import_package_rules (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_slot_limit INTEGER NOT NULL DEFAULT 1,
  requires_activation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Ưu điểm:
- Mỗi sản phẩm có thể yêu cầu field khác nhau.
- Dễ thêm field sau này như `recovery_code`, `cookie`, `profile_name`.

Nhược điểm:
- Cần thêm migration + màn cấu hình rule.

## Case cần thống nhất trước khi code

1. **Một lần nhập có tạo nhiều gói không?**
   - Nếu `quantity > 1`, có nên render nhiều dòng tài khoản để tạo nhiều stock/package cùng lúc?
   - Đề xuất: giai đoạn 1 chỉ hỗ trợ `quantity = 1` cho sản phẩm dạng account; nếu cần nhiều thì dùng textarea/import CSV ở giai đoạn 2.

2. **Stock và storage dùng chung hay tách riêng?**
   - Hiện package có `stockId` và `storageId`.
   - Đề xuất: với account thường, chỉ tạo `stockId`. Chỉ tạo `storageId` khi rule yêu cầu activation/storage riêng.

3. **Gói được tạo theo product nào?**
   - Đề xuất: `PACKAGE_PRODUCT.package_id = productId` của sản phẩm đang nhập.

4. **Giá nhập lấy từ đâu?**
   - Đề xuất: dùng giá nhập trên form nhập hàng để ghi `package_import`.

5. **Trạng thái kho sau khi tạo gói**
   - Đề xuất: insert stock với `status = Tồn`; list warehouse tự suy ra `Đang Sử Dụng` khi stock đã được package dùng.

## Luồng MVP đề xuất

```txt
Admin chọn sản phẩm
  ↓
Frontend load rule theo sản phẩm
  ↓
Nếu sản phẩm có rule enabled
  ↓
Hiện block input tài khoản / mk / mail dự phòng / 2FA / hạn / note
  ↓
Admin bấm Lưu
  ↓
POST /api/import-packages
  ↓
Backend transaction:
  1. Insert PRODUCT_STOCK
  2. Insert PACKAGE_PRODUCT stock_id = stock.id
  3. Commit
  ↓
Frontend refresh Lô hàng + Gói sản phẩm
```

## Kết luận đề xuất
- Nên làm bằng API mới `POST /api/import-packages` để đảm bảo atomic transaction.
- Frontend nhập hàng chỉ render dynamic fields dựa trên rule của sản phẩm.
- Backend tạo `PRODUCT_STOCK` và `PACKAGE_PRODUCT` trong cùng transaction.
- Giai đoạn đầu dùng field chuẩn: `account`, `password`, `backup_email`, `two_fa`, `expires_at`, `note`.
- Nếu bạn đồng ý flow này, bước tiếp theo là triển khai migration rule + API + UI dynamic fields.




## Customer
- Lô Hàng thì sản phẩm nào cũng như nhau. Cũng cùng 1 bảng lô hàng thôi. Chẳng qua là trường nào điền và trường nào không cần điền thôi. Hầu như các trường trong Lô hàng đang không bắt buộc điền
- Khi đơn nhập hàng hết hạn, có một số đơn thì cần xóa nó khỏi gói sản phẩm và xóa khỏi lô hàng. Nhưng hầu như là cần xóa toàn bộ ở Gói Sản Phẩm, còn về phần lô hàng thì có cái cần xóa có cái không nên cần có 1 tick check sau khi hết hạn có xóa khỏi Lô Hàng hay không.
- Nếu gia hạn đơn nhập hàng thì hạn ở gói sản phẩm cũng phải được gia hạn.
- Sẽ có 1 số gói sản phẩm không cần nhập hàng vì có sẵn hoặc là nhập ngoài luồng nên không note vào nhập hàng. mà tự tạo thẳng gói luôn. Nên chỗ này cũng phải pass.

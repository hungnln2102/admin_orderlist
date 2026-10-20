V1 to V2 operational import

Keep V2 schema. Import only orders, suppliers, products, variants, warehouse data, package data, and direct relations.

Excluded: billing, finance, dashboard, credit, refund, wallet, and user data.

The importer reads V1_DATABASE_URL and writes only V2_IMPORT_DATABASE_URL.

It refuses targets other than mydtbmav_v2_import unless ALLOW_UNSAFE_TARGET=1 is explicit.

Warehouse mapping: product_keys to accounts; stock_services to account_slots; package_product stock_id to account_id; storage_id to storage_account_id.

The legacy stock_service_id is retained in package_note because V2 package_products has no account_slot_id.

When merging into a non-empty V2 target, match existing warehouse accounts by
trimmed, lowercase account username before inserting a new account. During the
isolated sandbox import, V1 IDs are retained to preserve the original V1
relations consistently.

Run dry-run: node scripts/importV1OperationalDataToV2Sandbox.js

Run sandbox reset and import: node scripts/importV1OperationalDataToV2Sandbox.js --reset-target --apply

## Kết luận import dữ liệu V1 vào V2

### Nguyên tắc triển khai

- Giữ nguyên **toàn bộ cấu trúc schema V2**. Không xóa bảng, không bỏ migration và không thay đổi cấu trúc chỉ vì V1 không có dữ liệu tương ứng.
- Chỉ chuyển dữ liệu vận hành cần thiết từ V1 sang V2 sandbox. Các bảng V2 ngoài phạm vi vẫn tồn tại nhưng không nhận dữ liệu V1.
- Dùng hai URL database riêng: V1 chỉ đọc và V2 sandbox chỉ ghi. Không import trực tiếp vào database V2 đang chạy chính (`mydtbmav`).
- Lượt import sandbox có thể giữ ID V1 để bảo toàn liên kết. Khi merge vào V2 đã có dữ liệu, account kho phải được dò theo `trim(lower(account_username))` trước khi tạo mới.

### Bảng được import

| Nhóm dữ liệu | Bảng V1 | Bảng V2 | Kết luận |
| --- | --- | --- | --- |
| NCC | `business.supplier` | `business.supplier` | Import toàn bộ và giữ ID. |
| Product | `business.product` | `business.product` | Import toàn bộ và giữ ID. |
| Variant | `business.variant` | `business.variant` | Import sau product để giữ `product_id`. |
| Giá variant | `business.variant_price` | `business.variant_price` | Import sau variant, giữ khóa `(variant_id, tier_id)`. |
| Giá NCC | `business.supplier_cost` | `business.supplier_cost` | Import sau variant và NCC. Bỏ qua bản ghi tham chiếu variant đã bị xóa ở V1; ghi vào báo cáo ngoại lệ. |
| Đơn hàng | `business.order_list` | `business.order_list` | Import toàn bộ; giữ ID, chuẩn hóa trạng thái và `slot` lỗi. Không mang liên kết ví/finance sang V2. |
| Log chi phí NCC | `business.supplier_order_cost_log` | `business.supplier_order_cost_log` | Import sau đơn hàng và NCC để giữ các khóa ngoại. |
| Danh mục dịch vụ kho | `warehouse.product_names` | `warehouse.product_names` | Import danh mục hiện có trước slot và gói. |
| Tài khoản kho gốc | `business.product_keys` | `warehouse.accounts` | Import thành account kho; đây là nguồn của tài khoản chính/dung lượng. |
| Slot dịch vụ kho | `warehouse.stock_services` | `warehouse.account_slots` | `stock_id -> account_id`, `name_id -> name_id`. |
| Gói sản phẩm | `business.package_product` | `warehouse.package_products` | `stock_id -> account_id`, `storage_id -> storage_account_id`, giữ `stock_service_id` ở `package_note`. |

### Quy tắc kho và gói sản phẩm

- `stock_id` là **tài khoản chính** của gói, không phải slot.
- `storage_id` là **tài khoản dung lượng/liên kết** của gói; có thể rỗng.
- `stock_service_id` là slot dịch vụ V1. V2 chưa có cột `account_slot_id` trong `warehouse.package_products`, nên chỉ lưu dấu vết trong `package_note`; không map nhầm sang `account_id`.
- `package_id` của V1 là ID product nghiệp vụ, không phải ID danh mục kho. Importer phải tìm/tạo `warehouse.product_names` theo tên product/package thay vì nối bằng ID trùng tình cờ.

### Bảng chỉ giữ schema, không import dữ liệu

- `billing` / `receipt`: biên lai, phân bổ biên lai, credit/refund.
- `finance`: ngân hàng, ví, sổ cái, dashboard, chi phí, trả góp và tài sản cá nhân.
- `system_automation` và các domain không liên quan trực tiếp đến đơn hàng, NCC, product/variant hoặc kho/gói.

### Bảng admin và đăng nhập

- Luôn giữ schema `admin`, đặc biệt bảng `admin.users`, để V2 vẫn đăng nhập được sau khi reset/import sandbox.
- Migration V2 có trách nhiệm tạo hoặc giữ tài khoản admin seed của V2; importer dữ liệu V1 **không** xóa, truncate hoặc import đè `admin.users`.
- Không chuyển user/password hash từ V1 trong lượt import dữ liệu vận hành vì cơ chế xác thực và hash có thể khác V2. Nếu cần chuyển tài khoản V1 về sau, phải làm một hạng mục riêng có kiểm tra tương thích hash và reset mật khẩu an toàn.

### Ngoại lệ đã xác nhận từ dữ liệu V1

- Có **11** dòng `business.supplier_cost` trỏ tới variant không còn tồn tại: bỏ qua, không tạo variant giả.
- Có **12** đơn hàng có `slot` là mã định danh 19 chữ số thay vì số slot: chuẩn hóa thành `1` và ghi báo cáo.
- Có mã `id_order` trùng: giữ từng dòng theo khóa chính `id`; không thêm ràng buộc unique cho `id_order`.

### Tiêu chí hoàn tất import sandbox

1. Số lượng bản ghi các bảng trong phạm vi khớp nguồn V1, trừ các ngoại lệ đã báo cáo.
2. Không còn orphan FK ở `supplier_cost`, `supplier_order_cost_log`, `account_slots` và `package_products`.
3. Tổng `price` và `cost` đơn hàng khớp với V1.
4. Kiểm tra UI V2: NCC, product/variant, đơn hàng, kho và gói đều đọc được dữ liệu đúng liên kết.

## Cách import dữ liệu

### 1. Chuẩn bị database tách biệt

Không import trực tiếp vào `mydtbmav`. Dùng hai database độc lập:

| Vai trò | Database local | Quyền sử dụng |
| --- | --- | --- |
| Nguồn V1 | `mydtbmav_v1_restore` | Chỉ đọc; restore từ file `db-backup-2026-10-06T17-01-00-174Z.dump`. |
| Đích V2 sandbox | `mydtbmav_v2_import` | Được reset và ghi dữ liệu để thử import. |
| V2 đang chạy | `mydtbmav` | Không reset, không import trong giai đoạn kiểm tra. |

Khai báo hai URL riêng trước khi chạy importer; không in URL hoặc mật khẩu vào log:

```powershell
$env:V1_DATABASE_URL = '<URL database mydtbmav_v1_restore>'
$env:V2_IMPORT_DATABASE_URL = '<URL database mydtbmav_v2_import>'
```

### 2. Restore V1 và khởi tạo schema V2 sandbox

1. Restore file backup V1 vào `mydtbmav_v1_restore` một lần.
2. Reset **chỉ** `mydtbmav_v2_import`.
3. Chạy migration V2 để tạo lại toàn bộ schema, gồm `admin.users`, và seed tài khoản đăng nhập mặc định trên sandbox.
4. Kiểm tra URL đích có database name chính xác là `mydtbmav_v2_import` trước khi cho phép ghi.

Tuyệt đối không restore dump V1 đè lên database V2, vì như vậy schema V1 sẽ thay thế schema V2.

### 3. Chạy importer theo hai chế độ

Importer có sẵn tại `v2/backend/scripts/importV1OperationalDataToV2Sandbox.js` và có hai chế độ:

```powershell
# Dry-run: chỉ đọc V1, kiểm tra mapping và tạo báo cáo; không ghi V2.
node scripts/importV1OperationalDataToV2Sandbox.js

# Apply: reset riêng sandbox rồi import trong transaction.
node scripts/importV1OperationalDataToV2Sandbox.js --reset-target --apply
```

Nếu không đặt `V1_DATABASE_URL` và `V2_IMPORT_DATABASE_URL`, script chỉ tự suy ra URL khi `DATABASE_URL` là host local; mặc định nguồn là `mydtbmav_v1_restore` và đích là `mydtbmav_v2_import`.

Guard bắt buộc của script:

- Mặc định từ chối ghi nếu URL đích không trỏ tới `mydtbmav_v2_import`.
- Chỉ cho phép bỏ guard khi có `ALLOW_UNSAFE_TARGET=1` được đặt tường minh.
- Toàn bộ lượt import phải dùng transaction; lỗi ở một bảng phải rollback toàn bộ lượt import.
- Mỗi lần chạy phải sinh một file báo cáo JSON trong `v2/backend/reports/`.

### 4. Thứ tự ghi dữ liệu trong một transaction

1. `business.supplier`.
2. `business.product`.
3. `business.variant`.
4. `business.variant_price` và `business.supplier_cost` hợp lệ.
5. `business.order_list`.
6. `business.supplier_order_cost_log`.
7. `warehouse.product_names`.
8. `warehouse.accounts` từ `business.product_keys`.
9. `warehouse.account_slots` từ `warehouse.stock_services`.
10. Tạo hoặc tái sử dụng danh mục gói trong `warehouse.product_names` theo tên package.
11. `warehouse.package_products` với `stock_id -> account_id` và `storage_id -> storage_account_id`.
12. Đồng bộ lại sequence ID sau khi giữ ID V1 trong sandbox.

`admin.users` không nằm trong transaction import dữ liệu V1; nó được tạo/giữ bởi migration V2 để đăng nhập sandbox vẫn hoạt động.

### 5. Đối soát sau khi import

Importer phải dừng với lỗi nếu có orphan FK ở các quan hệ dưới đây:

```sql
-- Giá NCC phải trỏ tới variant và NCC còn tồn tại.
business.supplier_cost.variant_id -> business.variant.id
business.supplier_cost.supplier_id -> business.supplier.id

-- Log chi phí NCC phải trỏ tới đơn hàng và NCC còn tồn tại.
business.supplier_order_cost_log.order_list_id -> business.order_list.id
business.supplier_order_cost_log.supply_id -> business.supplier.id

-- Kho và gói phải trỏ tới account/danh mục kho còn tồn tại.
warehouse.account_slots.account_id -> warehouse.accounts.id
warehouse.account_slots.name_id -> warehouse.product_names.id
warehouse.package_products.account_id -> warehouse.accounts.id
warehouse.package_products.storage_account_id -> warehouse.accounts.id
warehouse.package_products.product_name_id -> warehouse.product_names.id
```

Đối soát thêm:

- So sánh số dòng nguồn/đích theo từng bảng trong phạm vi import.
- So sánh tổng `order_list.price` và `order_list.cost` giữa V1 và sandbox V2.
- Kiểm tra danh sách ngoại lệ: 11 `supplier_cost` bị bỏ qua và 12 `slot` được chuẩn hóa.
- Kiểm tra trực tiếp ở giao diện V2 trước khi cân nhắc đưa dữ liệu vào database chính.

### 6. Đưa sang database V2 chính

Chỉ được cân nhắc import vào `mydtbmav` sau khi sandbox đạt tất cả tiêu chí đối soát và đã được kiểm tra UI. Khi thực hiện thật:

1. Backup database V2 chính trước.
2. Chạy dry-run bằng URL database chính để phát hiện xung đột username kho, product và ID.
3. Chuyển importer sang chế độ merge: account kho match theo `trim(lower(account_username))`, không dùng ID V1 để ghi đè account V2 sẵn có.
4. Thực hiện trong maintenance window và lưu báo cáo JSON của lần import chính thức.

## Kết quả thử import local (2026-10-20)

Đã chạy thử từ backup V1 đã restore tại `mydtbmav_v1_restore` sang sandbox `mydtbmav_v2_import`. Sandbox được reset bằng migration V2 trước khi import; `admin.users` được tạo lại với 1 tài khoản seed để đăng nhập.

| Dữ liệu | Số dòng import |
| --- | ---: |
| NCC | 48 |
| Product | 62 |
| Variant | 229 |
| Giá variant | 582 |
| Giá NCC hợp lệ | 265 |
| Đơn hàng | 1.115 |
| Log chi phí NCC | 399 |
| Danh mục kho/gói | 16 |
| Tài khoản kho | 65 |
| Slot dịch vụ kho | 67 |
| Gói sản phẩm | 45 |

- Bỏ qua 11 dòng giá NCC có `variant_id` không còn tồn tại ở V1.
- Chuẩn hóa đúng 12 dòng `order_list.slot` là mã 19 chữ số về giá trị `1`.
- Tạo thêm 3 danh mục gói kho theo tên product: `GoogleOne`, `Gemini`, `Canva`; các gói `Adobe`, `Youtube`, `Netflix` tái sử dụng danh mục kho có sẵn.
- Tất cả kiểm tra orphan FK cho NCC, đơn hàng, slot kho và gói sản phẩm đều bằng `0`.
- Tổng đơn hàng khớp tuyệt đối giữa V1 và V2 sandbox: `price = 441,041,661.00`, `cost = 194,178,964.00`.
- Báo cáo chạy: `v2/backend/reports/v1-operational-import-2026-10-20T16-47-25-887Z.json`.
- Báo cáo riêng cho 12 slot đã chuẩn hóa: `v2/backend/reports/v1-operational-import-slot-correction-2026-10-20T16-47-50-351Z.json`.

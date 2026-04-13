# Trang Bảng giá (Quản lý giá variant)

Tài liệu mô tả **màn hình Bảng giá** trong admin (`admin_orderlist`): route, dữ liệu, API và các khối UI chính. Màn quản lý **từng biến thể (variant)** trong catalog: trạng thái hiển thị, **tỷ lệ biên** (CTV / khách / khuyến mãi / STU), và giá tham chiếu từ **giá nhập NCC** (`supply_price`).

## Route và entry

| Mục | Giá trị |
|-----|---------|
| **Đường dẫn** | `/pricing` |
| **Sidebar** | Bán hàng → **Bảng giá** (`frontend/src/components/layout/sidebar/menuConfig.ts`, `href: "/pricing"`) |
| **Component** | `frontend/src/features/pricing/index.tsx` (export default `Pricing`) |
| **Đăng ký route** | `frontend/src/routes/AppRoutes.tsx` — `<Route path="/pricing" element={<Pricing />} />` |

Yêu cầu **đăng nhập**; API `/api/product-prices/*` do backend phục vụ sau middleware xác thực (theo cấu hình dự án).

### Trang khác dễ nhầm: In báo giá

| Đường dẫn | Mục đích |
|-----------|----------|
| `/show-price` | Trang **báo giá / in** (chọn sản phẩm, in), feature `frontend/src/features/product-price/`. **Không** phải màn quản lý bảng giá catalog. |

## Luồng dữ liệu (tóm tắt)

- **`usePricingData`** (`features/pricing/hooks/usePricingData.ts`): gom `useProductData`, `useProductActions`, `useSupplyActions`; nút **Đồng bộ lại** tải lại danh sách và làm mới cache giá NCC phía client cho các sản phẩm đã mở rộng.
- **`useProductData`**: `GET /api/product-prices`, map từng dòng → `ProductPricingRow`, áp `applyBasePriceToProduct` với `baseSupplyPrice` (max giá NCC từ API). Lọc **Đang hoạt động / Tạm dừng / Tất cả**, tìm kiếm không dấu, phân trang client.
- **`useProductActions`**: sửa / tạo / xóa variant, modal tạo sản phẩm.
- **`useSupplyActions`**: khi **mở rộng dòng** — tải và sửa **giá theo từng NCC**.

## API backend (`/api/product-prices`)

Định nghĩa route: `backend/src/routes/productPricesRoutes.js`.

| Phương thức | Đường dẫn | Mục đích |
|-------------|-----------|----------|
| `GET` | `/api/product-prices` | Danh sách variant + margin pivot + `max_supply_price` (MAX giá trong `supply_price` theo variant). Có **cache** server (`pricingCache` trong `handlers/list.js`). |
| `POST` | `/api/product-prices` | Tạo variant / bản ghi giá mới (`createProductPrice`). |
| `GET` | `/api/product-prices/:productId` | Một variant theo id. |
| `PATCH` | `/api/product-prices/:productId` | Cập nhật variant (gói, mã, giá gốc, tỷ lệ, …). |
| `PATCH` | `/api/product-prices/:productId/status` | Bật/tắt **hiển thị** (`is_active`). Body: `{ "is_active": boolean }`. |
| `DELETE` | `/api/product-prices/:productId` | Xóa variant. |
| `POST` | `/api/product-prices/:productId/suppliers` | Thêm / cập nhật dòng **giá NCC** (`handlers/supplies.js`). |

Sau thao tác ghi, backend thường gọi **`pricingCache.clear()`** để lần `GET` sau không dùng dữ liệu cũ.

**Frontend** dùng `API_ENDPOINTS.PRODUCT_PRICES` trong `frontend/src/constants.ts`.

## Nguồn dữ liệu và cách tính giá hiển thị

- Mỗi **dòng bảng** = một **variant** (`variant.id`).
- API trả về: `base_price`, pivot margin `pct_ctv`, `pct_khach`, `pct_promo`, `pct_stu` (theo tier / `MARGIN_PIVOT_SQL`), `max_supply_price`, `is_active`, `update`.
- **`mapProductPriceRow`** + **`applyBasePriceToProduct`** (`features/pricing/utils.ts`):
  - **Chân giá** tính sỉ/lẻ ưu tiên **`max_supply_price`** (→ `baseSupplyPrice`) khi > 0.
  - **Giá sỉ (CTV)** = chân giá × hệ số `pct_ctv`.
  - **Giá lẻ** = giá sỉ × `pct_khach`.
  - **Giá khuyến mãi** khi `pct_promo` hợp lệ kèm biên CTV/khách (`hasValidPromoRatio`); logic trong `calculatePromoPrice`.

Cột **Giá gốc** có thể **trống (-)** nếu chưa có `max_supply_price` hợp lệ. Khi **mở rộng dòng** và có nhiều mức giá NCC, UI có thể dùng **mức cao nhất** trong danh sách đã tải (preview khi sửa) — `computeHighestSupplyPrice`.

## Khối UI trên trang

1. **`PricingStats`** — ba thẻ (click để lọc): **Tổng sản phẩm** (all), **Đang hoạt động**, **Tạm dừng**.
2. **`PricingFilters`** — tìm kiếm; **Thêm sản phẩm** (`CreateProductModal`); **Đồng bộ lại** (`handleRefreshAll`).
3. **`ProductTable`** — bảng + phân trang.

### Cột bảng (nghiệp vụ)

| Cột | Nội dung |
|------|----------|
| Sản phẩm | Tên gói + variant / thời hạn (từ `package_product` + mã `san_pham`). |
| Giá gốc | Cơ sở biên; ưu tiên max giá NCC. |
| Giá sỉ | Sau biên CTV. |
| Giá lẻ | Sau biên khách. |
| Giá khuyến mãi | % KM khi cấu hình hợp lệ. |
| Tình trạng | Toggle `is_active` (PATCH status). |
| Cập nhật | Ngày cập nhật variant. |
| Thao tác | Sửa, xóa, mở rộng NCC. |

### Mở rộng dòng (chi tiết NCC)

- `ProductExpandedDetails`; `fetchSupplyPricesForProduct`.
- Sửa / thêm / xóa dòng giá NCC; ảnh hưởng `max_supply_price` sau đồng bộ.

## Cấu trúc thư mục (tham chiếu)

```
frontend/src/features/pricing/
  index.tsx, hooks/, components/, utils.ts, types.ts
backend/src/controllers/ProductsController/handlers/
  list.js, supplies.js, mutations/
```

## Ghi chú vận hành

- **Cache**: nếu dữ liệu chậm sau sửa DB trực tiếp, kiểm tra `pricingCache.clear()`; UI: **Đồng bộ lại**.
- **Nguồn hàng** tại `/sources`; bảng giá liên kết `supply_price` và `POST .../suppliers`.
- Đơn hàng / webhook có thể phụ thuộc variant và giá NCC.

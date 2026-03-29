# Audit Cost / Price

Ngày audit: `2026-03-29`

## Mục tiêu

Kiểm tra xem logic tính `cost` và `price` trong hệ thống đã được tách ra thành helper/service dùng chung hay chưa, và xác định các vị trí vẫn đang tự tính trực tiếp trong file.

## Kết luận nhanh

Chưa tách hoàn toàn.

- Phía `CreateOrder` frontend đã tách phần gọi tính giá sang hook riêng.
- Nhánh `Sepay / Renewal` đã có helper `calcGiaBan(...)`.
- Nhưng công thức chính của order vẫn còn nằm trực tiếp trong controller backend.
- Ngoài ra vẫn còn một số nơi tự tính hoặc tự override `cost` / `price` trong file.

## Phân loại theo mức độ quan trọng

### 1. Logic chính của order

Đây là các điểm ảnh hưởng trực tiếp đến `cost` / `price` dùng cho order hoặc dùng để recompute giá hiện tại.

#### 1.1 Frontend `CreateOrder`: đã tách phần gọi tính giá

File:

- `frontend/src/components/modals/CreateOrderModal/hooks/usePriceCalculation.ts`

Nhận xét:

- Hook `usePriceCalculation` gọi API `/api/orders/calculate-price`.
- Hook này map dữ liệu trả về vào form state.
- Đây là phần đã được tách tương đối ổn ở frontend.

#### 1.2 Backend `calculate-price`: chưa tách helper/service

File:

- `backend/src/controllers/Order/calculatePriceRoute.js`

Nhận xét:

- Route `/calculate-price` vẫn đang chứa trực tiếp công thức tính giá.
- Trong file này có đủ các bước:
  - lấy `importBySource`
  - lấy `maxPrice`
  - chuẩn hóa `pctCtv`, `pctKhach`, `pctPromo`
  - tính `resellRaw`, `customerRaw`
  - tính `resellPrice`, `customerPrice`, `promoPrice`
  - chọn `price` cuối theo prefix đơn hàng
- Như vậy logic chính chưa được tách ra một service/helper dùng chung.

Kết luận:

- Đây là nơi cần refactor đầu tiên nếu muốn gom logic `cost` / `price`.

#### 1.3 Renewal: đã có helper giá bán, nhưng vẫn còn lặp logic quanh nó

Files:

- `backend/webhook/sepay/utils.js`
- `backend/webhook/sepay/renewal.js`

Nhận xét:

- `backend/webhook/sepay/utils.js` đã có hàm `calcGiaBan(...)`.
- Tuy nhiên `backend/webhook/sepay/renewal.js` vẫn còn tự làm các bước:
  - lấy `giaNhapSource`
  - lấy `priceMax`
  - normalize giá nhập
  - resolve fallback
  - tính `finalGiaBanRaw`
  - tính `finalGiaNhap`
- Logic này xuất hiện lặp lại ở ít nhất 2 block trong cùng file:
  - block xử lý renewal chính
  - block `computeOrderCurrentPrice(...)`

Kết luận:

- `Renewal` mới tách được phần tính `gia_ban`.
- Phần resolve `cost` + `base price` + fallback vẫn chưa gom chung.

#### 1.4 `CreateOrder` vẫn còn local override khi đổi supplier

File:

- `frontend/src/components/modals/CreateOrderModal/hooks/useSupplySelection.ts`

Nhận xét:

- Khi đổi supplier, file này vẫn set trực tiếp:
  - `cost = newBasePrice`
  - nếu là `PROMO` thì `price = newBasePrice`
- Sau đó mới gọi `recalcPrice(...)`.

Kết luận:

- Đây không phải công thức đầy đủ.
- Nhưng vẫn là một điểm đang tự can thiệp `cost` / `price` ngay trong file.

### 2. Logic preview / quote / display

Đây là các chỗ không nhất thiết ghi thẳng vào order, nhưng vẫn đang tự tính giá trong file để phục vụ preview, báo giá, hoặc hiển thị.

#### 2.1 `ProductPrice` vẫn có fallback tự tính giá

Files:

- `frontend/src/pages/Personal/ProductPrice/index.tsx`
- `frontend/src/pages/Personal/ProductPrice/helpers.ts`

Nhận xét:

- `index.tsx` có gọi API `calculate-price` để lấy giá khi có thể.
- Nhưng `helpers.ts` vẫn còn fallback tự tính:
  - `computeLinePricing(...)`
  - `buildProductOptions(...)`
- Tại đây vẫn có các phép tính như:
  - `basePrice * pctKhach * pctCtv`
  - promo theo `pctPromo`
  - discount từ promo

Kết luận:

- Đây là một nhánh còn tự tính giá khá rõ.

#### 2.2 `PriceList` đã tách helper tương đối tốt

File:

- `frontend/src/pages/Product/PriceList/utils.ts`

Nhận xét:

- File này đã có các helper:
  - `multiplyValue(...)`
  - `multiplyBasePrice(...)`
  - `calculatePromoPrice(...)`
  - `applyBasePriceToProduct(...)`
- Đây là phần đã tách logic preview khá sạch ở phạm vi module `PriceList`.

Kết luận:

- Trong `PriceList`, hướng tách helper là đúng.
- Tuy nhiên helper này vẫn là helper riêng của module, chưa phải pricing service dùng chung cho toàn hệ thống.

#### 2.3 `CreateProductModal` vẫn preview giá ngay trong JSX

File:

- `frontend/src/pages/Product/PriceList/components/Modals/CreateProductModal.tsx`

Nhận xét:

- Trong JSX vẫn có block inline để tính:
  - giá CTV
  - giá lẻ
  - làm tròn giá
- Dù đã dùng helper `multiplyValue(...)` và `roundToNearestThousand(...)`, phần orchestration vẫn nằm trực tiếp trong component.

Kết luận:

- Đây là inline preview logic, chưa tách hẳn thành helper/hook riêng.

#### 2.4 `BillOrder` có suy ra `unitPrice` theo loại đơn

File:

- `frontend/src/pages/Personal/BillOrder/index.tsx`

Nhận xét:

- File này suy ra `unitPrice` theo prefix đơn hàng:
  - `CTV` / `STUDENT` dùng `wholesalePrice`
  - `RETAIL` / `PROMO` dùng `retailPrice`
  - `GIFT` dùng `0`
- Đây là logic hiển thị/invoice, không phải nơi tính giá gốc cho order.

Kết luận:

- Không phải điểm refactor ưu tiên đầu tiên cho pricing core.

## Tổng hợp trạng thái

| Khu vực | Trạng thái | Ghi chú |
| --- | --- | --- |
| `CreateOrder` frontend | Tách một phần | Gọi API qua hook riêng |
| `calculate-price` backend | Chưa tách | Công thức chính còn nằm trong route |
| `Sepay utils` | Tách một phần | Có `calcGiaBan(...)` |
| `Renewal` | Chưa gom hoàn chỉnh | Còn lặp resolve `cost` / `priceMax` / fallback |
| `CreateOrder` supplier select | Còn local override | Có set thẳng `cost` và `price` |
| `ProductPrice` | Còn tự tính | Có fallback và build option bằng công thức riêng |
| `PriceList` | Tách khá ổn trong module | Nhưng chưa dùng chung toàn hệ thống |
| `CreateProductModal` | Còn inline preview | Logic vẫn nằm trong component |

## Ưu tiên refactor đề xuất

### Ưu tiên 1

Tách công thức trong `backend/src/controllers/Order/calculatePriceRoute.js` thành pricing service dùng chung.

### Ưu tiên 2

Cho `backend/webhook/sepay/renewal.js` dùng lại cùng pricing service đó, thay vì tự resolve giá nhập và giá bán trong file.

### Ưu tiên 3

Giảm local override trong `useSupplySelection.ts`, chỉ giữ update tối thiểu cần thiết cho UI rồi để backend/service trả về kết quả chuẩn.

### Ưu tiên 4

Đồng bộ các nhánh quote / preview (`ProductPrice`, `PriceList`) để nếu cần fallback thì cũng dùng cùng một helper chuẩn hóa.

## Kết luận cuối

Hiện tại hệ thống chưa có một `pricing core` duy nhất cho `cost` và `price`.

Đã có một số bước tách nhỏ theo module, nhưng logic vẫn đang phân tán ở:

- controller backend của order
- renewal flow
- quote / preview pages
- một số component/hook frontend

Nếu muốn chuẩn hóa, nên gom về một service trung tâm có trách nhiệm:

- resolve `base cost`
- resolve `base price for pricing`
- áp dụng `pctCtv`, `pctKhach`, `pctPromo`
- chọn `price` cuối theo loại đơn / prefix
- trả về thống nhất `cost`, `price`, `promoPrice`, `resellPrice`, `customerPrice`

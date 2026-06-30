# Shared Contracts - `admin_orderlist`

Mục đích: định nghĩa rõ cái gì được phép dùng chung trong dự án mới, tránh lặp helper/API/component và tránh biến `shared` thành bãi rác mới.

> Trạng thái hiện tại: đã bắt đầu triển khai. File này là nguồn tham chiếu để quyết định helper nào được ở `shared`, helper nào phải nằm trong domain/feature owner.
> Sync gần nhất: 2026-06-30.

## 1. Nguyên Tắc Shared

- Chỉ đưa vào `shared` khi có ít nhất 2 feature/domain độc lập dùng thật.
- Shared không được chứa business rule riêng của `orders`, `invoices`, `pricing`, `products`, `renew-adobe`, `wallet`.
- Shared phải có tên rõ, contract rõ, input/output rõ.
- Shared phải ổn định hơn feature-local code; thay đổi shared cần kiểm tra các nơi dùng.
- Không tạo file tên chung chung như `helpers.ts`, `utils2.ts`, `misc.ts`, `common.ts` nếu không có phạm vi cụ thể.

## 2. Frontend Shared Hiện Có Và Hướng Đích

### 2.0 Contract Hiện Có

Các shared contract đã tồn tại và được phép tiếp tục dùng:

| Contract | Trách nhiệm | Trạng thái | Ghi chú boundary |
| --- | --- | --- | --- |
| `frontend/src/shared/api/client.ts` | HTTP/API client primitive | `keep` | Không thêm endpoint nghiệp vụ vào đây. |
| `frontend/src/shared/http/responseBody.ts` | Đọc/chuẩn hóa response body generic | `keep` | Không map response riêng của orders/invoices/pricing. |
| `frontend/src/shared/money/format.ts` | Format tiền generic | `keep` | Không chứa rule pricing hoặc lợi nhuận. |
| `frontend/src/shared/money/input.ts` | Parse/format draft input tiền generic | `keep` | Shop-bank/USDT dùng lại; payment-slot exact amount vẫn domain-local. |
| `frontend/src/shared/number/finite.ts` | Parse/clamp số generic | `keep` | Không chứa parser giá theo business rule. |
| `frontend/src/shared/html/*` | Sanitize/normalize/plain text HTML generic | `keep` | Product-specific merge/image/variant rule vẫn ở `product-info`. |
| `frontend/src/shared/text/normalize.ts` | Text normalize generic | `keep` | Không chứa normalize tên sản phẩm/NCC nếu có rule nghiệp vụ. |
| `frontend/src/shared/pricing/ratio.ts` | Ratio primitive dùng chung | `keep` | Không chứa pricing calculation theo sản phẩm/NCC. |
| `frontend/src/shared/vietqr/imageUrl.ts` | Build VietQR image URL generic | `keep` | Receipt/payment flow action vẫn ở feature owner. |
| `frontend/src/shared/utils/*` | Compatibility re-export cũ | `compatibility` | Không thêm logic mới; caller mới nên import từ contract cụ thể. |

Các contract chưa có hoặc chưa chuẩn hóa đầy đủ thì vẫn là hướng đích, không tự tạo nếu chưa có 2+ nơi dùng thật.

```txt
frontend/src/shared/
  api/
    httpClient.ts
    apiError.ts
    queryParams.ts
  components/
    ui/
    data-table/
    form/
    modal/
    feedback/
  hooks/
    useDebouncedValue.ts
    useDisclosure.ts
    usePagination.ts
  utils/
    currency.ts
    date.ts
    number.ts
    text.ts
  types/
    api.ts
    pagination.ts
    option.ts
  constants/
    routes.ts
    permissions.ts
```

### 2.1 `shared/api` / `shared/http`

| Contract | Trách nhiệm | Không làm |
| --- | --- | --- |
| `client.ts` | Cấu hình HTTP client duy nhất, base URL, headers, auth/session handling cơ bản | Không chứa endpoint nghiệp vụ |
| `responseBody.ts` | Response body extraction/normalization generic | Không chứa mapper response riêng của feature |
| `apiError.ts` | Chuẩn hóa lỗi API cho UI/toast/log | Không hard-code message nghiệp vụ của một feature |
| `queryParams.ts` | Build/parse query params generic | Không chứa filter riêng của orders/invoices |

Endpoint cụ thể phải nằm ở:

```txt
frontend/src/features/<feature>/api/
```

Ví dụ:

- `features/orders/api/ordersApi.ts`
- `features/invoices/api/receiptsApi.ts`
- `features/products/api/productsApi.ts`

### 2.2 `shared/components`

Được phép shared:

- Button/input/select/modal generic.
- Data table primitive không biết nghiệp vụ.
- Loading, empty state, error state.
- Badge generic nếu không hard-code status nghiệp vụ.
- Form field wrapper generic.

Không được shared:

- `OrderStatusBadge` nếu chỉ dành cho order.
- `ReceiptQrModal` nếu chỉ dành cho invoice/receipt.
- `RenewAdobeAccountRow` nếu chỉ dành cho Renew Adobe.
- `ProductImageUpload` nếu logic upload gắn với product.

### 2.3 `shared/hooks`

Được phép shared:

| Hook | Trách nhiệm |
| --- | --- |
| `useDisclosure` | Đóng/mở modal/popover generic |
| `useDebouncedValue` | Debounce input value |
| `usePagination` | State page/limit generic |
| `useConfirmDialog` | Confirm UI generic nếu có component tương ứng |

Không đưa vào shared:

- `useCreateOrder`
- `useReceiptActions`
- `useRenewAdobeAccounts`
- `useProductVariants`

Các hook nghiệp vụ phải nằm trong feature owner.

### 2.4 `shared/utils` Và Compatibility Barrels

`frontend/src/shared/utils/*` hiện được xem là lớp compatibility cho import cũ. Quy tắc:

- Không thêm business logic mới vào `shared/utils`.
- Nếu cần logic generic mới, tạo contract cụ thể như `shared/money`, `shared/date`, `shared/html`, `shared/text`, `shared/http`.
- Nếu logic chỉ thuộc một feature, để trong `features/<feature>/utils`, `model`, `hooks`, hoặc `api`.
- Khi chạm caller, ưu tiên đổi import từ `shared/utils/*` sang contract cụ thể nếu an toàn.

### 2.5 Frontend Feature Owner Capabilities

Các capability sau không đưa vào `shared` dù nhiều nơi cần gọi; phải gọi owner feature/domain qua API/hook/mapper rõ contract:

| Capability | Owner hiện tại/hướng đích | Caller được phép dùng bằng cách |
| --- | --- | --- |
| Product description/image/SEO API | `frontend/src/features/product-info/api` | Import API từ owner, không tạo lại `lib/productDescApi.ts`. |
| Pricing display/calculation frontend | `frontend/src/features/pricing/*` | Import module cụ thể như `priceCalculations`, `productPriceMapper`, `priceFormatters`; `utils.ts` chỉ là compatibility barrel. |
| Order DTO -> view model | `frontend/src/features/orders` | Chưa chốt xong; không copy mapper sang Create/Edit/Bill Order. |
| Receipt status/action/QR mapping | `frontend/src/features/invoices` | Chưa chốt xong; không đưa vào shared vì là invoice/receipt rule. |
| Renew Adobe account/check flow | `frontend/src/features/renew-adobe` | Dùng hook/component owner; không tạo shared renew helper. |

### 2.6 Generic Utility Boundary

Được phép shared:

| Utility | Ví dụ trách nhiệm |
| --- | --- |
| `currency.ts` | Format số tiền hiển thị, parse input tiền generic |
| `date.ts` | Format date/time, parse date range generic |
| `number.ts` | Clamp, round, parse number generic |
| `text.ts` | Normalize text, truncate, slugify generic |

Không đưa vào shared:

- Tính lợi nhuận đơn hàng.
- Tính giá bán theo rule sản phẩm/NCC.
- Map trạng thái biên nhận.
- Rule Renew Adobe.
- Rule hoàn tiền/ledger.

## 3. Backend Shared Hiện Có Và Hướng Đích

### 3.0 Contract Hiện Có

| Contract | Trách nhiệm | Trạng thái | Ghi chú boundary |
| --- | --- | --- | --- |
| `backend/src/shared/text/normalizeOptionalText.js` | Normalize optional text primitive | `keep` | Dùng cho wallet-related validators/use-cases; không chứa rule domain. |
| `backend/src/shared/validation/normalizeBoolean.js` | Normalize boolean primitive | `keep` | Dùng cho input validators; không chứa status/permission rule. |
| `backend/src/shared/money/normalizers.js` | Integer VND parser/money primitive | `keep` | Không dùng cho payment-slot exact amount hoặc pricing-specific parser/rule. |

Những phần còn lại trong mục này là hướng đích, chỉ tạo khi có nhu cầu thật và contract rõ.

```txt
backend/src/shared/
  errors/
  logger/
  audit/
  pagination/
  validation/
  date/
  money/
  integrations/
    telegram/
    adobe/
    bank/
```

### 3.1 Shared Backend Được Phép

| Module | Trách nhiệm |
| --- | --- |
| `errors` | Error classes và error response chuẩn |
| `logger` | Logger generic |
| `audit` | Audit event writer generic, domain truyền event type/payload |
| `pagination` | Parse/normalize pagination query |
| `validation` | Primitive validators generic |
| `date` | Date/time helpers generic |
| `money` | Parse/round/format money generic, không chứa pricing rule |
| `integrations/*` | Adapter ngoài dùng bởi nhiều domain |

### 3.2 Không Đưa Vào Backend Shared

- Use-case tạo đơn hàng.
- Rule hoàn tiền.
- Rule tính giá sản phẩm.
- Query dashboard cụ thể.
- Flow Renew Adobe cụ thể.
- Mapper response của một domain.

## 4. Feature/Domain Local Contracts

### 4.1 Frontend Feature Local

```txt
frontend/src/features/orders/
  api/ordersApi.ts
  hooks/useOrdersPage.ts
  hooks/useCreateOrder.ts
  model/orderMapper.ts
  model/orderStatus.ts
  components/OrderStatusBadge.tsx
  types.ts
```

Nếu code chỉ phục vụ `orders`, để trong `features/orders`, không đưa lên shared.

### 4.2 Backend Domain Local

```txt
backend/src/domains/orders/
  routes.js
  controller/orderController.js
  use-cases/createOrderUseCase.js
  repositories/orderRepository.js
  mappers/orderResponseMapper.js
  validators/orderValidators.js
```

Nếu code chỉ phục vụ `orders`, để trong `domains/orders`, không đưa lên shared.

## 5. Quy Trình Tạo Shared Mới

Trước khi tạo shared mới, trả lời đủ các câu hỏi:

> Checklist kiểm tra cho từng shared proposal, không tính là task tồn đọng toàn cục.

- Có ít nhất 2 feature/domain đang dùng hoặc sẽ dùng ngay trong cùng phase không?
- Tên file/module có mô tả đúng trách nhiệm không?
- Input/output có rõ không?
- Có chứa business rule của một domain không?
- Nếu thay đổi module này, cần test/smoke những feature nào?
- Có duplicate cũ nào sẽ được merge/delete sau khi tạo shared này không?

## 6. Bảng Theo Dõi Shared Contract

| Contract | Loại | Owner | Dùng bởi | Trạng thái | Replacement cho duplicate nào |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/shared/api/client.ts` | frontend api | `shared` | feature API clients | `keep` | HTTP client primitive |
| `frontend/src/shared/http/responseBody.ts` | frontend http | `shared` | feature API clients | `keep` | Response extraction duplicate |
| `frontend/src/shared/money/format.ts` | frontend money | `shared` | orders/pricing/wallet UI via imports | `keep` | Format VND duplicate |
| `frontend/src/shared/money/input.ts` | frontend money | `shared` | shop-bank, USDT wallet | `keep` | Money input parser/draft duplicate |
| `frontend/src/shared/number/finite.ts` | frontend number | `shared` | money/pricing primitives | `keep` | Finite number parser duplicate |
| `frontend/src/shared/html/*` | frontend html | `shared` | product-info, product-price quote formatting | `keep` | HTML sanitize/plain/normalize duplicate |
| `frontend/src/shared/text/normalize.ts` | frontend text | `shared` | generic text normalization callers | `keep` | Generic text normalize duplicate |
| `frontend/src/shared/pricing/ratio.ts` | frontend pricing primitive | `shared` | pricing-related primitive callers | `keep` | Ratio primitive only, not pricing business rule |
| `frontend/src/shared/vietqr/imageUrl.ts` | frontend vietqr | `shared` | receipt/payment display callers | `keep` | VietQR image URL builder duplicate |
| `frontend/src/shared/utils/*` | frontend compatibility | `shared` | legacy imports | `compatibility` | Re-export only; avoid adding logic |
| `frontend/src/shared/hooks/useDisclosure.ts` | frontend hook | `shared` | TBD | `planned` | Modal open/close state lặp |
| `frontend/src/shared/hooks/usePagination.ts` | frontend hook | `shared` | TBD | `planned` | Pagination state lặp |
| `backend/src/shared/errors` | backend infra | `shared` | TBD | `planned` | Error response rời rạc |
| `backend/src/shared/pagination` | backend infra | `shared` | TBD | `planned` | Parse pagination lặp |
| `backend/src/shared/audit` | backend infra | `shared` | TBD | `planned` | Audit/log rời rạc |
| `backend/src/shared/text/normalizeOptionalText.js` | backend text primitive | `shared` | `shop-bank-accounts`, `usdt-wallets` | `keep` | Optional text normalizer trùng trong wallet-related domains |
| `backend/src/shared/validation/normalizeBoolean.js` | backend validation primitive | `shared` | `shop-bank-accounts`, `usdt-wallets` | `keep` | Boolean input normalizer trùng trong wallet-related domains |
| `backend/src/shared/money/normalizers.js` | backend money primitive | `shared` | `orders/finance`, `payments` | `keep` | Integer VND parser trùng; không dùng cho payment-slot exact amount hoặc pricing-specific parser |

## 6A. Domain Capability Không Được Đưa Vào Shared

| Capability | Owner | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Payment slot amount/account normalization | `backend/src/domains/payment-slots/helpers/paymentSlotInputs.js` | `keep domain-local` | Exact amount contract khác integer VND parser. |
| Shop bank account input rules | `backend/src/domains/shop-bank-accounts` | `keep domain-local` | Chỉ primitive text/boolean dùng shared. |
| USDT wallet input rules | `backend/src/domains/usdt-wallets` | `keep domain-local` | Chỉ primitive text/boolean/money dùng shared. |
| Supplier lookup/cost/import payment | `backend/src/domains/supplies` | `in-progress owner` | Caller khác gọi owner service/repository, không tự query lại. |
| Product lookup/product description/package lookup | `backend/src/domains/products` hoặc domain product-related owner | `open` | Cần hoàn thiện E-BE1 trước khi cutover callers. |
| Pricing calculation/parser/rule | `backend/src/services/pricing/core.js` -> pricing owner service | `open` | Không gom vào `shared/money`; cần baseline test trước khi tách. |
| Order create validation/payment allocation | `backend/src/domains/orders` | `open` | Không đưa vào shared dù pricing/product có tham gia. |
| Receipt status/action/QR mapping | `frontend/src/features/invoices` | `open` | Không đưa vào shared UI helper. |
| Renew Adobe login/check/renew/post-check flow | `backend/src/domains/renew-adobe` / `backend/src/services/renew-adobe` | `open` | Facade cần tách theo D6-D7. |

## 7. Điều Cấm Trong Giai Đoạn Rebuild

- Không tạo thêm helper mới trong `lib`/`services` global nếu chưa phân loại owner.
- Không copy helper từ feature này sang feature khác.
- Không đưa component nghiệp vụ vào `shared/components`.
- Không đưa API endpoint cụ thể vào `shared/api/httpClient.ts`.
- Không dùng tên file mơ hồ như `common`, `helper`, `util`, `temp`, `new`, `old`.



## 7A. Rule Domain Service Dùng Chung Theo Nghiệp Vụ

- Không copy query/calculation sản phẩm, NCC, giá bán, giá nhập vào từng flow.
- Flow cần thông tin sản phẩm phải gọi domain product/product-info service hoặc repository owner.
- Flow cần NCC/supplier phải gọi domain supplies/supplier service hoặc repository owner.
- Flow cần giá bán/giá nhập/pricing phải gọi pricing/product pricing service owner.
- Shared chỉ chứa primitive generic; business capability phải thuộc domain owner.
- Không tạo helper global nếu đó thực chất là product/pricing/supplier/wallet business rule.
- Khi một domain capability đã có owner, caller khác chỉ phụ thuộc qua service/repository public contract; không tự dựng lại query, parser hoặc calculation trong caller.

Ví dụ hướng đích:

```txt
backend/src/domains/products/services/productLookupService.js
backend/src/domains/supplies/services/supplierLookupService.js
backend/src/domains/pricing/services/pricingCalculationService.js
backend/src/shared/text/normalizeOptionalText.js
backend/src/shared/validation/normalizeBoolean.js
```

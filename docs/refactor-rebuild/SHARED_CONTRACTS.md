# Shared Contracts - `admin_orderlist`

Mục đích: định nghĩa rõ cái gì được phép dùng chung trong dự án mới, tránh lặp helper/API/component và tránh biến `shared` thành bãi rác mới.

> Trạng thái hiện tại: tài liệu chuẩn bị, chưa triển khai refactor.

## 1. Nguyên Tắc Shared

- Chỉ đưa vào `shared` khi có ít nhất 2 feature/domain độc lập dùng thật.
- Shared không được chứa business rule riêng của `orders`, `invoices`, `pricing`, `products`, `renew-adobe`, `wallet`.
- Shared phải có tên rõ, contract rõ, input/output rõ.
- Shared phải ổn định hơn feature-local code; thay đổi shared cần kiểm tra các nơi dùng.
- Không tạo file tên chung chung như `helpers.ts`, `utils2.ts`, `misc.ts`, `common.ts` nếu không có phạm vi cụ thể.

## 2. Frontend Shared Đề Xuất

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

### 2.1 `shared/api`

| Contract | Trách nhiệm | Không làm |
| --- | --- | --- |
| `httpClient.ts` | Cấu hình HTTP client duy nhất, base URL, headers, auth/session handling cơ bản | Không chứa endpoint nghiệp vụ |
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

### 2.4 `shared/utils`

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

## 3. Backend Shared Đề Xuất

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

- [ ] Có ít nhất 2 feature/domain đang dùng hoặc sẽ dùng ngay trong cùng phase không?
- [ ] Tên file/module có mô tả đúng trách nhiệm không?
- [ ] Input/output có rõ không?
- [ ] Có chứa business rule của một domain không?
- [ ] Nếu thay đổi module này, cần test/smoke những feature nào?
- [ ] Có duplicate cũ nào sẽ được merge/delete sau khi tạo shared này không?

## 6. Bảng Theo Dõi Shared Contract

| Contract | Loại | Owner | Dùng bởi | Trạng thái | Replacement cho duplicate nào |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/shared/api/httpClient.ts` | frontend api | `shared` | TBD | `planned` | Các axios/fetch wrapper trùng |
| `frontend/src/shared/utils/currency.ts` | frontend util | `shared` | TBD | `planned` | Các format currency trùng |
| `frontend/src/shared/utils/date.ts` | frontend util | `shared` | TBD | `planned` | Các format date trùng |
| `frontend/src/shared/hooks/useDisclosure.ts` | frontend hook | `shared` | TBD | `planned` | Modal open/close state lặp |
| `frontend/src/shared/hooks/usePagination.ts` | frontend hook | `shared` | TBD | `planned` | Pagination state lặp |
| `backend/src/shared/errors` | backend infra | `shared` | TBD | `planned` | Error response rời rạc |
| `backend/src/shared/pagination` | backend infra | `shared` | TBD | `planned` | Parse pagination lặp |
| `backend/src/shared/audit` | backend infra | `shared` | TBD | `planned` | Audit/log rời rạc |

## 7. Điều Cấm Trong Giai Đoạn Rebuild

- Không tạo thêm helper mới trong `lib`/`services` global nếu chưa phân loại owner.
- Không copy helper từ feature này sang feature khác.
- Không đưa component nghiệp vụ vào `shared/components`.
- Không đưa API endpoint cụ thể vào `shared/api/httpClient.ts`.
- Không dùng tên file mơ hồ như `common`, `helper`, `util`, `temp`, `new`, `old`.


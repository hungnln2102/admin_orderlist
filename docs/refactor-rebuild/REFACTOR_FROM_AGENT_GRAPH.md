# Phương Án Refactor Theo Agent Graph - `admin_orderlist`

Nguồn tham chiếu:

- Agent graph đang chạy tại `http://localhost:3000/`.
- File graph xuất ra: `src-agent-graph (1).md`.
- Repo: `E:\Project\admin_store\admin_orderlist`.
- Graph snapshot: 590 files, 61 modules, 662 functions, 333 components, 75 hooks, 5004 edges, phân tích lúc `2026-06-22T18:35:09.728Z`.


> Cập nhật định hướng: dự án hiện tại có nhiều code rác, helper/API/component khai báo lặp lại, shared không được dùng chung đúng cách. Vì vậy phương án chính nên là **rebuild có kiểm soát dựa trên dự án cũ**, không phải chỉ refactor từng file nhỏ. Dự án cũ đóng vai trò nguồn nghiệp vụ, API contract, UI reference và regression baseline.

## 0. Chiến Lược Rebuild Có Kiểm Soát

### 0.1 Kết Luận Định Hướng

Không nên “đập bỏ ngay” toàn bộ source hiện tại trong một lần vì các luồng tiền, đơn hàng, ví, biên nhận, webhook và Renew Adobe có rủi ro cao. Thay vào đó dùng mô hình **strangler rebuild**:

1. Giữ app cũ chạy ổn định làm baseline.
2. Tạo kiến trúc mới song song trong repo hiện tại hoặc workspace mới.
3. Di chuyển từng domain/feature sang kiến trúc mới.
4. Mỗi phần mới phải dùng shared contracts/components/hooks/api chuẩn.
5. Khi feature mới đạt parity, chuyển route/import sang implementation mới.
6. Sau khi không còn dependency, xóa code cũ theo checklist.

Mục tiêu không phải giữ lại cấu trúc cũ, mà là **xây lõi mới sạch hơn**, dùng dự án cũ làm tài liệu sống.

### 0.2 Vấn Đề Cần Giải Quyết Tận Gốc

- Có nhiều file rác, file tạm, file cũ hoặc code không còn được import.
- Có nhiều helper giống nhau nhưng khai báo lại ở nhiều feature.
- Có API client/service trùng trách nhiệm giữa `lib`, `services`, `features/*/api`.
- Có modal/component nghiệp vụ để ở global `components` nhưng chỉ dùng cho một feature.
- Có logic business nằm trong UI component hoặc route/controller.
- Có formatter/calculation/mapping lặp lại giữa frontend và backend.
- Có shared code nhưng không có tiêu chí rõ: cái gì shared, cái gì feature-local.
- Có domain backend đã tách một phần nhưng vẫn còn service global lớn.
- Có khả năng tồn tại import cũ, dead code và duplicate flow làm người sửa không biết đâu là nguồn đúng.

### 0.3 Nguyên Tắc Rebuild

- Rebuild theo domain/feature, không rebuild theo loại file kỹ thuật.
- Code mới chỉ được viết vào vùng kiến trúc mới, tránh tiếp tục vá vào vùng cũ trừ bug nghiêm trọng.
- Không tạo shared chỉ vì “có thể dùng chung”; chỉ đưa vào shared khi có ít nhất 2 nơi dùng thật.
- Mọi shared utility/component phải có owner, tên rõ, contract rõ và ví dụ dùng.
- Không copy/paste helper cũ sang feature mới nếu có thể chuẩn hóa thành utility/hook/API client.
- Không đổi UI/API contract khi chuyển sang implementation mới, trừ khi có task migration riêng.
- Code cũ sau khi bị thay thế phải được đánh dấu deprecated rồi xóa theo phase, không để tồn tại mập mờ.

## 0A. Kiến Trúc Dự Án Mới Đề Xuất

### 0A.1 Frontend Mới

```txt
frontend/src/
  app/
    providers/
    layout/
    bootstrap/
  routes/
    routeConfig.tsx
    guards.tsx
  features/
    orders/
      pages/
      components/
      hooks/
      api/
      model/
      utils/
      types.ts
      index.ts
    invoices/
    products/
    pricing/
    supplies/
    renew-adobe/
    dashboard/
    wallet/
    users/
    auth/
  shared/
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
      date.ts
      number.ts
      currency.ts
      text.ts
    types/
      api.ts
      pagination.ts
      option.ts
    constants/
      routes.ts
      permissions.ts
```

Quy tắc frontend mới:

- `features/<feature>/api`: chỉ gọi endpoint của feature đó.
- `features/<feature>/model`: mapper, view model, calculation thuộc feature.
- `features/<feature>/components`: component nghiệp vụ chỉ feature đó dùng.
- `shared/components`: component generic, không biết nghiệp vụ order/product/invoice.
- `shared/api/httpClient.ts`: một HTTP client duy nhất cho toàn frontend.
- `shared/utils`: chỉ formatter/helper generic, không chứa business rule.
- `routes`: chỉ map route tới page, không chứa logic nghiệp vụ.

### 0A.2 Backend Mới

```txt
backend/src/
  app/
    server.js
    router.js
    middleware.js
  config/
  db/
    knexClient.js
    transaction.js
  domains/
    orders/
      routes.js
      controller/
      use-cases/
      repositories/
      mappers/
      validators/
      policies/
      types.js
    invoices/
    products/
    pricing/
    supplies/
    renew-adobe/
    dashboard/
    wallet/
    users/
    auth/
  shared/
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

Quy tắc backend mới:

- Route chỉ định tuyến và middleware.
- Controller chỉ parse request và trả response.
- Use-case chứa orchestration nghiệp vụ.
- Repository chứa database query.
- Mapper chuyển DB row sang response DTO.
- Validator kiểm tra input.
- Adapter/integration nằm ở shared khi dùng bởi nhiều domain; nếu chỉ một domain dùng thì để trong domain.

## 0B. Kế Hoạch Inventory Và Dọn Rác

### 0B.1 Lập Danh Sách Code Cần Phân Loại

Tạo file `docs/refactor-rebuild/CODE_INVENTORY.md` với bảng:

| Nhóm | File/Folder | Trạng thái | Owner | Hành động |
| --- | --- | --- | --- | --- |
| Feature/domain chính | `frontend/src/features/orders` | giữ/migrate | orders | rebuild theo phase |
| Shared thật | `shared/utils/currency.ts` | giữ | shared | chuẩn hóa API |
| Duplicate | helper format tiền A/B/C | merge | shared | thay bằng 1 helper |
| Dead code | file không import | xóa sau xác nhận | n/a | remove |
| Legacy wrapper | import tương thích cũ | tạm giữ | migration | xóa sau cutover |

Trạng thái chuẩn:

- `keep`: giữ nguyên hoặc chỉ chỉnh nhỏ.
- `migrate`: viết lại sang kiến trúc mới.
- `merge`: gộp duplicate vào shared/feature owner.
- `deprecated`: vẫn cần tạm thời nhưng không viết thêm code mới.
- `delete`: xóa sau khi xác nhận không import/runtime dependency.

### 0B.2 Tìm Duplicate Và Dead Code

Nên chạy các nhóm kiểm tra sau trước khi rebuild:

- Tìm file không được import trực tiếp bằng `ts-prune` hoặc script riêng nếu dự án hỗ trợ.
- Tìm function/helper trùng tên hoặc trùng trách nhiệm: `formatCurrency`, `formatDate`, `parseNumber`, `normalizeOrder`, `mapProduct`, `buildQueryParams`.
- Tìm API client trùng endpoint giữa `frontend/src/lib`, `frontend/src/services`, `frontend/src/features/*/api`.
- Tìm component modal/table/form global nhưng chỉ một feature import.
- Tìm backend service global chỉ được một domain dùng.
- Tìm route/controller backend có business logic trực tiếp.

### 0B.3 Tiêu Chí Đưa Vào Shared

Chỉ đưa vào `shared` nếu thỏa ít nhất một điều kiện:

- Được dùng thật bởi từ 2 feature/domain độc lập trở lên.
- Là primitive UI hoặc infrastructure generic: Button, Modal, Table, HTTP client, logger, pagination.
- Là formatter/hook generic không chứa nghiệp vụ: currency, date, debounce, disclosure.

Không đưa vào `shared` nếu:

- Chỉ dùng cho orders/invoices/products/renew-adobe.
- Tên helper mơ hồ như `helpers`, `common`, `misc`, `utils2`.
- Có business rule như tính lợi nhuận đơn hàng, trạng thái biên nhận, rule Renew Adobe.

## 0C. Roadmap Rebuild Thực Tế

### Stage 1 - Đóng Băng Và Đánh Dấu Legacy

- [x] Tạo `docs/refactor-rebuild/CODE_INVENTORY.md` - template phân loại code/rác/duplicate đã tạo.
- [x] Tạo `docs/refactor-rebuild/SHARED_CONTRACTS.md` mô tả shared nào được phép dùng.
- [x] Tạo `docs/refactor-rebuild/MIGRATION_MAP.md` map file cũ sang file mới.
- [ ] Đánh dấu các folder legacy bằng README: code cũ chỉ sửa bug, không thêm feature mới.
- [ ] Chốt baseline UI/API cho các luồng quan trọng.

### Stage 2 - Xây Shared Foundation Mới

Frontend:

- [ ] Tạo `shared/api/httpClient.ts` duy nhất.
- [ ] Tạo shared error handling và API response types.
- [ ] Tạo shared formatter: currency, date, number, text.
- [ ] Tạo shared hooks: disclosure, pagination, debounced value.
- [ ] Tạo shared UI primitives: modal, table, form field, badge, loading, empty state.

Backend:

- [ ] Chuẩn hóa DB client/transaction helper.
- [ ] Chuẩn hóa error classes và error response.
- [ ] Chuẩn hóa pagination/query parsing.
- [ ] Chuẩn hóa audit logger cho luồng tiền và đơn hàng.
- [ ] Chuẩn hóa integration adapters nếu dùng nhiều domain.

### Stage 3 - Rebuild Domain Lõi Trước

Thứ tự domain nên rebuild:

1. `orders`: trung tâm của app, nhiều module phụ thuộc.
2. `invoices/receipts`: liên quan thanh toán và biên nhận.
3. `products/pricing`: ảnh hưởng tạo đơn và tính tiền.
4. `supplies`: liên quan NCC, nhập hàng, chi phí.
5. `wallet/bank/accounts`: rủi ro tiền và ledger.
6. `dashboard/reports`: đọc số liệu từ các domain trên.
7. `renew-adobe`: automation lớn, tách sau khi foundation ổn.
8. `users/auth/permissions/ip-whitelist`: chuẩn hóa quyền truy cập.

### Stage 4 - Cutover Theo Route/Feature

Mỗi feature mới khi đạt parity:

- [ ] Route frontend trỏ sang page mới.
- [ ] API frontend trỏ sang client mới.
- [ ] Backend route cũ gọi wrapper sang use-case mới hoặc thay trực tiếp nếu contract giữ nguyên.
- [ ] Smoke test feature mới.
- [ ] Đánh dấu implementation cũ là `deprecated`.
- [ ] Sau 1-2 phase không còn lỗi, xóa code cũ.

### Stage 5 - Xóa Legacy Và Chuẩn Hóa Graph

- [ ] Xóa file không import.
- [ ] Xóa wrapper migration không còn dùng.
- [ ] Xóa helper duplicate đã thay bằng shared/helper feature-local.
- [ ] Chạy lại graph ở `http://localhost:3000/`.
- [ ] So sánh số edge/module phụ thuộc trước và sau.
- [ ] Cập nhật `docs/refactor-rebuild/CODE_INVENTORY.md` thành trạng thái cuối.

## 0D. Cách Làm Để Không Rối Lại

- Mỗi feature/domain phải có `README.md` ngắn ghi owner, route/API, shared đang dùng.
- Pull request/refactor slice không được vừa rebuild vừa thêm feature mới.
- Không merge file mới nếu tên chung chung: `helper`, `common`, `misc`, `temp`, `new`, `old`, `backup`.
- Không tạo API client mới nếu endpoint có thể nằm trong feature API hiện có.
- Không copy formatter/calculation nếu đã có shared hoặc domain utility.
- Mỗi tháng chạy inventory dead code/duplicate một lần trong giai đoạn rebuild.

## 1. Mục Tiêu

- Refactor theo hướng incremental, không rewrite toàn bộ.
- Giữ nguyên UI/UX, route frontend, API response và payload hiện có nếu chưa có migration rõ ràng.
- Giảm coupling giữa các module có nhiều liên kết trong graph: `App`, `Routes`, `Modals`, `Orders`, `Invoices`, `Pricing`, `Products`, `Supplies`, `Renew Adobe`, `Dashboard/Reports`, `Wallet`.
- Backend tiến về modular monolith theo domain.
- Frontend tiến về feature-based architecture.
- Ưu tiên các luồng có rủi ro tiền, đơn hàng, biên nhận, ví, chi phí, NCC và Renew Adobe.

## 2. Nguyên Tắc An Toàn

- Mỗi phase phải build/test được trước khi sang phase sau.
- Không đổi tên route public, path API, shape response, enum trạng thái hoặc query param khi chưa có adapter tương thích.
- Không gom thêm logic mới vào `shared`, `lib`, `services` nếu logic chỉ thuộc một feature/domain.
- Tách pure helper trước, sau đó tách API/repository, cuối cùng mới tách component/controller lớn.
- Với mọi thay đổi liên quan tiền hoặc đơn hàng, phải có test/smoke checklist riêng.
- Không xóa code cũ ngay nếu còn route/API phụ thuộc; dùng wrapper/adapter để chuyển dần.

## 3. Hiện Trạng Từ Graph Và Repo

### 3.1 Frontend

Cấu trúc hiện có đã có nền tảng feature-based:

```txt
frontend/src/
  app/
  components/
  constants/
  features/
  lib/
  routes/
  services/
  shared/
  styles/
```

Các file lớn nên ưu tiên audit/tách nhỏ:

| Lines | File | Nhận định |
| ---: | --- | --- |
| 442 | `frontend/src/features/invoices/index.tsx` | Page/container đang có khả năng ôm nhiều state, data loading và UI. |
| 392 | `frontend/src/features/bill-order/components/InvoicePreview.tsx` | Component preview nên kiểm tra phần format/section. |
| 392 | `frontend/src/features/product-info/views/VariantContentView.tsx` | View sản phẩm/variant có nhiều UI và workflow. |
| 392 | `frontend/src/features/renew-adobe/components/AddTrackingOrdersModal.tsx` | Modal nghiệp vụ lớn, dễ trộn form, API, validation. |
| 389 | `frontend/src/features/expenses/components/expense-cost-allocation-table/helpers.ts` | Helper lớn, cần tách theo pure calculation/formatter. |
| 387 | `frontend/src/features/pricing/utils.ts` | Utils pricing lớn, cần tách domain-local. |
| 387 | `frontend/src/features/orders/utils/orderListTransform.ts` | Transform đơn hàng quan trọng, cần test trước khi tách. |
| 382 | `frontend/src/features/product-info/components/EditProductModal/ImageUpload.tsx` | UI upload ảnh lớn, nên tách hook và section. |
| 380 | `frontend/src/features/renew-adobe/pages/RenewSystemLogsPage.tsx` | Page log nên tách filter/table/pagination/api. |
| 377 | `frontend/src/features/expenses/components/expense-cost-allocation-table/ExpenseAllocationTableView.tsx` | Table view lớn, nên tách row/cell/summary. |
| 372 | `frontend/src/features/invoices/components/ReceiptsTable.tsx` | Table biên nhận có rủi ro tiền, cần tách thận trọng. |
| 371 | `frontend/src/lib/productDescApi.ts` | Global lib nhưng có vẻ domain product; nên đưa về feature/domain nếu chỉ dùng product. |
| 366 | `frontend/src/features/renew-adobe/components/RenewAdobeAccountsTable.tsx` | Table lớn, nên tách columns/actions. |
| 358 | `frontend/src/features/dashboard/components/FinancialChartsPanel.tsx` | Chart tài chính nên tách data mapper và chart sections. |
| 357 | `frontend/src/components/modals/CreateOrderModal/CreateOrderModal.tsx` | Global modal đơn hàng nên cân nhắc chuyển về `features/orders`. |
| 352 | `frontend/src/components/modals/EditOrderModal/hooks/useEditOrderLogic.ts` | Hook workflow lớn, cần tách use-case hooks theo nhóm hành động. |

### 3.2 Backend

Cấu trúc hiện có đã có `domains`, nhưng vẫn còn `services` global lớn:

```txt
backend/src/
  config/
  controllers/
  db/
  domains/
  middleware/
  queues/
  routes/
  scheduler/
  services/
  utils/
```

Các file lớn nên ưu tiên audit/tách nhỏ:

| Lines | File | Nhận định |
| ---: | --- | --- |
| 433 | `backend/src/domains/orders/controller/crud/createOrder.js` | Tạo đơn hàng là use-case lõi, controller đang quá dày. |
| 429 | `backend/src/domains/orders/controller/manualWebhookCompletion.js` | Luồng hoàn tất webhook thủ công có rủi ro tài chính. |
| 422 | `backend/src/domains/wallet/controller/index.js` | Controller ví lớn, nên tách route/controller/use-case/repository. |
| 393 | `backend/src/services/fix-ades/checkService.js` | Service automation lớn, cần xác định thuộc `renew-adobe` hay domain riêng. |
| 388 | `backend/src/services/pricing/core.js` | Pricing core nên nằm trong domain pricing/product với test. |
| 385 | `backend/src/domains/renew-adobe/controller/checkAccounts.js` | Controller Renew Adobe lớn, cần tách orchestration. |
| 377 | `backend/src/services/telegramFinanceDeltaNotifier.js` | Integration notifier nên tách adapter + use-case tài chính. |
| 370 | `backend/src/domains/shop-bank-accounts/services/shopBankLedgerService.js` | Ledger tài khoản bank có rủi ro tiền, cần contract rõ. |
| 362 | `backend/src/services/renew-adobe/adobe-renew-v2/facade.js` | Facade automation lớn, cần tách theo flow. |
| 358 | `backend/src/services/dashboard/dailyRevenueSummaryBackfill/sqlBuilder.js` | SQL builder tài chính lớn, cần test snapshot/query. |
| 341 | `backend/src/domains/orders/controller/refundCreditRoutes.js` | Refund credit nên tách routes khỏi controller/use-case. |
| 338 | `backend/src/domains/form-info/controller/index.js` | Controller dày, nên tách handlers/use-cases. |
| 337 | `backend/src/domains/renew-adobe/controller/publicFixAdes.js` | Public automation endpoint cần boundary rõ. |
| 330 | `backend/src/domains/renew-adobe/controller/batchUsers.js` | Batch user flow nên có service/use-case riêng. |
| 315 | `backend/src/domains/orders/controller/finance/dashboardSummary.js` | Dashboard finance nên tách query/repository. |

## 4. Kiến Trúc Đích

### 4.1 Frontend Feature-Based

Mẫu thư mục áp dụng cho feature lớn:

```txt
frontend/src/features/<feature>/
  pages/
  components/
  hooks/
  api/
  types.ts
  utils/
  constants.ts
```

Quy tắc:

- `pages/`: chỉ phối hợp route, layout, state cấp page.
- `components/`: presentational hoặc feature-local components.
- `hooks/`: data loading, modal state, workflow state, side effects.
- `api/`: gọi API của feature, mapping request/response nếu cần.
- `utils/`: pure transform/format/derive data, không side effect.
- `types.ts`: contract feature-local.
- `shared/`: chỉ chứa code dùng bởi ít nhất 2 feature độc lập.

### 4.2 Backend Modular Monolith Theo Domain

Mẫu thư mục áp dụng cho domain lớn:

```txt
backend/src/domains/<domain>/
  routes.js
  controller/
  use-cases/
  repositories/
  mappers/
  validators/
  adapters/
```

Quy tắc:

- `routes.js`: khai báo endpoint + middleware, không chứa business logic.
- `controller/`: parse input, gọi use-case, trả response.
- `use-cases/`: orchestration nghiệp vụ.
- `repositories/`: truy vấn database.
- `mappers/`: map DB row sang DTO/API response.
- `validators/`: validate payload/query.
- `adapters/`: tích hợp ngoài như Telegram, Adobe, webhook, bank, mail.

## 5. Thứ Tự Refactor Đề Xuất

### Phase 0 - Baseline Và Contract

- [ ] Chạy baseline: `npm run lint:frontend`, `npm run build:frontend`, `npm run test:frontend` nếu môi trường hiện tại cho phép.
- [ ] Chạy backend baseline: `npm run lint:backend`, `npm run test:backend` nếu đã cấu hình ổn định.
- [ ] Ghi lại các lỗi sẵn có, không sửa lẫn với refactor.
- [ ] Tạo danh sách route/API đang dùng cho các feature: orders, invoices, pricing, products, supplies, renew-adobe, dashboard, wallet.
- [ ] Chụp smoke checklist cho các màn hình chính trên `http://localhost:3000/`.

### Phase 1 - Frontend Shared Boundary Cleanup

Mục tiêu: giảm phụ thuộc global trước khi tách feature sâu.

- [ ] Audit `frontend/src/components/modals` để xác định modal nào thuộc `orders`, `products`, `pricing`, `renew-adobe`.
- [ ] Di chuyển modal chỉ thuộc đơn hàng về `frontend/src/features/orders/components/modals` bằng export wrapper để không gãy import cũ.
- [ ] Audit `frontend/src/lib/productDescApi.ts`; nếu chỉ phục vụ product, chuyển sang `frontend/src/features/product-info/api/productDescApi.ts` hoặc `frontend/src/features/products/api`.
- [ ] Tách `frontend/src/features/pricing/utils.ts` thành nhóm nhỏ: pricing calculation, product mapping, display formatting.
- [ ] Tách `frontend/src/features/orders/utils/orderListTransform.ts` thành pure mappers nhỏ và thêm test cho case quan trọng.

Kết quả mong muốn:

- Import giữa feature rõ hơn.
- `shared`/`lib` giảm code domain-specific.
- Không đổi UI.

### Phase 2 - Frontend High-Risk Pages/Components

Mục tiêu: giảm file page/table/modal lớn mà vẫn giữ behavior.

Ưu tiên 1 - Invoices:

- [ ] Tách `frontend/src/features/invoices/index.tsx` thành `pages/InvoicesPage.tsx`, `hooks/useInvoicesPage.ts`, `components/InvoicesToolbar.tsx`, `components/ReceiptsTable.tsx`.
- [ ] Với `ReceiptsTable.tsx`, tách `columns`, `ReceiptRow`, `ReceiptActions`, `ReceiptStatusBadge` nếu phù hợp.
- [ ] Đảm bảo các luồng lọc, tìm kiếm, xem QR, cập nhật biên nhận không đổi.

Ưu tiên 2 - Orders:

- [ ] Tách `CreateOrderModal.tsx` thành container, form sections, validation helpers, submit hook.
- [ ] Tách `useEditOrderLogic.ts` theo nhóm: load order, update fields, payment/refund actions, modal side effects.
- [ ] Giữ nguyên props public của modal hoặc cung cấp wrapper tương thích.

Ưu tiên 3 - Renew Adobe:

- [ ] Tách `RenewSystemLogsPage.tsx` thành page, filters, table, pagination, API hook.
- [ ] Tách `AddTrackingOrdersModal.tsx` thành form state hook, validation, table/list section, submit action.
- [ ] Tách `RenewAdobeAccountsTable.tsx` thành columns/actions/row components.

Ưu tiên 4 - Product/Pricing/Expenses:

- [ ] Tách `VariantContentView.tsx` theo section: variant list, variant form, inventory/status controls.
- [ ] Tách `ImageUpload.tsx` thành `useImageUpload`, dropzone/preview/actions.
- [ ] Tách `ExpenseAllocationTableView.tsx` và `helpers.ts` thành calculation utils, table view, summary rows.
- [ ] Tách `FinancialChartsPanel.tsx` thành data mapper và chart components.

### Phase 3 - Backend Orders/Finance Boundary

Mục tiêu: controller mỏng, use-case rõ, DB access tách khỏi orchestration.

Ưu tiên 1 - Orders create flow:

```txt
backend/src/domains/orders/
  controller/crud/createOrder.js
  use-cases/create-order/
    createOrderUseCase.js
    validateCreateOrderInput.js
    resolveProductForOrder.js
    calculateOrderPayment.js
    allocateOrderKeys.js
  repositories/orderRepository.js
  mappers/orderResponseMapper.js
```

Checklist:

- [ ] Giữ route và response hiện có.
- [ ] Tách validation input trước.
- [ ] Tách calculation/payment pure helper tiếp theo.
- [ ] Tách DB write vào repository sau cùng.
- [ ] Thêm smoke test tạo đơn hàng hoặc ít nhất test use-case pure helper.

Ưu tiên 2 - Webhook/manual completion/refund:

- [ ] Tách `manualWebhookCompletion.js` thành controller + `completeWebhookManuallyUseCase`.
- [ ] Tách `manualUsdtCompletion.js` thành controller + use-case riêng.
- [ ] Tách `refundCreditRoutes.js` thành `routes.js`, `controller/refundCreditController.js`, `use-cases/refund-credit`.
- [ ] Đảm bảo idempotency, audit log và transaction boundary rõ.

Ưu tiên 3 - Finance/dashboard summary:

- [ ] Tách `dashboardSummary.js` thành query repository và mapper response.
- [ ] Tách `dailyRevenueSummaryBackfill/sqlBuilder.js` thành query parts có test snapshot SQL.
- [ ] Tách Telegram notifier thành adapter, không gọi trực tiếp từ query/service lõi.

### Phase 4 - Backend Renew Adobe Và Automation

Mục tiêu: tách integration Adobe/Fix ADES khỏi controller và domain orchestration.

- [ ] Gom các flow Renew Adobe vào domain `backend/src/domains/renew-adobe` nếu đang nằm ở `backend/src/services/renew-adobe` nhưng chỉ phục vụ domain này.
- [ ] Tách `checkAccounts.js` thành controller + `checkRenewAdobeAccountsUseCase`.
- [ ] Tách `batchUsers.js` thành controller + use-case batch rõ transaction/retry.
- [ ] Tách `publicFixAdes.js` và `fix-ades/checkService.js` thành adapter/service boundary rõ.
- [ ] Tách `adobe-renew-v2/facade.js` thành các flow nhỏ: login, account lookup, renew action, post-check.
- [ ] Scheduler `renewAdobePostCheckFlow.js` chỉ nên gọi use-case, không chứa logic nghiệp vụ chi tiết.

### Phase 5 - Backend Wallet/Supplies/Pricing/Product

Mục tiêu: giảm controller/service global và đưa logic về đúng domain.

Wallet:

- [ ] Tách `backend/src/domains/wallet/controller/index.js` thành routes/controller/use-cases/repositories.
- [ ] Xác định rõ ledger transaction, balance calculation, audit mapper.

Supplies:

- [ ] Tách `supplies/controller/handlers/list.js` thành query builder/repository/mapper.
- [ ] Tách `supplies/controller/handlers/insights.js` thành use-case và query repository.

Pricing/Product:

- [ ] Di chuyển/tách `backend/src/services/pricing/core.js` về domain phù hợp nếu chỉ dùng pricing/product.
- [ ] Tách `products/controller/handlers/mutations/updateProductPrice.js` thành validator + use-case + repository.
- [ ] Đồng bộ frontend pricing utils với backend pricing contract, tránh duplicate công thức lệch nhau.

## 6. Smoke Checklist Sau Mỗi Phase

Frontend:

- [ ] Login và load layout admin.
- [ ] Mở danh sách đơn hàng, filter/search/sort vẫn hoạt động.
- [ ] Tạo đơn hàng mới qua modal.
- [ ] Sửa đơn hàng qua modal.
- [ ] Mở invoices/receipts, xem QR hoặc action liên quan thanh toán.
- [ ] Mở pricing/product info, sửa giá/sản phẩm nếu có quyền.
- [ ] Mở Renew Adobe logs/accounts/tracking modal.
- [ ] Mở dashboard finance charts.

Backend/API:

- [ ] Health/API root vẫn chạy.
- [ ] Orders create/update/list không đổi response shape.
- [ ] Webhook/manual completion idempotent.
- [ ] Refund credit không tạo double transaction.
- [ ] Wallet ledger/balance nhất quán.
- [ ] Dashboard summary không đổi số liệu so với baseline.
- [ ] Renew Adobe scheduler/use-case không đổi luồng chạy.

## 7. Rủi Ro Và Cách Giảm Rủi Ro

| Rủi ro | Khu vực | Cách giảm rủi ro |
| --- | --- | --- |
| Đổi response API làm gãy frontend | Orders, invoices, wallet, dashboard | Giữ mapper response cũ, thêm contract test/snapshot. |
| Sai số tiền/doanh thu/lợi nhuận | Finance, pricing, invoices, wallet | Tách calculation pure helper và test case trước khi di chuyển DB logic. |
| Mất idempotency webhook | Orders/payment/refund | Xác định unique key, transaction boundary, audit log trước khi refactor. |
| UI thay đổi ngoài ý muốn | Modal/table/page lớn | Extract presentational component giữ nguyên props và markup trước. |
| Import cycle giữa feature | Frontend shared/lib/components | Dùng wrapper tạm, không import ngược từ shared về feature. |
| Scheduler gọi nhầm logic cũ | Renew Adobe | Scheduler chỉ gọi use-case stable, giữ facade adapter trong thời gian chuyển tiếp. |

## 8. Definition Of Done Cho Một Slice Refactor

Một slice refactor chỉ coi là xong khi:

- [ ] Public route/API/component props vẫn tương thích.
- [ ] File lớn ban đầu giảm trách nhiệm rõ ràng, không chỉ cắt dòng cơ học.
- [ ] Logic domain nằm trong feature/domain tương ứng.
- [ ] Không tạo thêm global helper/service catch-all.
- [ ] Build/lint/test liên quan đã chạy hoặc có ghi chú vì sao chưa chạy.
- [ ] Smoke checklist liên quan đã pass.
- [ ] Graph sau refactor giảm edge không cần thiết hoặc module boundary rõ hơn.

## 9. Thứ Tự Làm Ngắn Gọn Đề Xuất

1. Baseline test/build và ghi lỗi sẵn có.
2. Tách frontend `orders` modal/utils vì graph cho thấy `Modals` và `Orders` liên kết nhiều.
3. Tách frontend `invoices` page/table vì liên quan biên nhận/thanh toán.
4. Tách backend `orders/createOrder` thành use-case/repository.
5. Tách backend webhook/refund/manual completion với transaction/idempotency rõ.
6. Tách `renew-adobe` page/controller/service theo flow.
7. Tách wallet/supplies/pricing/product các phần còn lại.
8. Chạy lại graph tại `http://localhost:3000/` để so sánh coupling trước/sau.

## 10. File Nên Tạo Thêm Khi Bắt Đầu Refactor

- `docs/API_CONTRACTS.md`: ghi route, request, response quan trọng.
- `docs/SMOKE_CHECKLIST.md`: checklist thao tác UI/API theo từng domain.
- `docs/REFACTOR_LOG.md`: ghi từng slice đã refactor, test đã chạy, rủi ro còn lại.
- `frontend/src/features/<feature>/README.md`: mô tả boundary cho feature lớn.
- `backend/src/domains/<domain>/README.md`: mô tả use-case, routes, repository của domain lớn.





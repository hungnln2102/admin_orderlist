# Clean Code Audit - `admin_orderlist`

Mục đích: dọn chi tiết các lớp code được viết thêm để vá lỗi tạm, duplicate helper/use-case/API/component, và đưa sửa lỗi về đúng hàm/module gốc thay vì tiếp tục tạo hàm mới.

> Trạng thái hiện tại: checklist chuẩn bị trước khi refactor chi tiết. Không xóa code nếu chưa có bằng chứng import/runtime và replacement rõ ràng.

## 1. Nguyên Tắc Clean Code Bắt Buộc

- Sửa root cause trong hàm/module chính trước, không tạo thêm hàm khác để né lỗi.
- Nếu đã có hàm mới dùng để vá lỗi cũ, phải trace lại luồng gọi và quyết định: merge về hàm chính, rename thành hàm chính, hoặc xóa hàm cũ sau khi cutover.
- Không giữ song song 2 hàm cùng trách nhiệm mà không có lý do migration rõ ràng.
- Không thêm wrapper/fallback/special-case nếu lỗi nằm ở data mapping, validation, state flow, transaction hoặc API contract có thể sửa trực tiếp.
- Không dùng tên mơ hồ: `new`, `old`, `v2`, `fixed`, `temp`, `backup`, `helper2`, `final` nếu chưa có migration note.
- Mỗi thay đổi phải giữ nguyên route/API/UI behavior trừ khi có migration task riêng.

## 2. Phân Loại Code Khi Gặp Duplicate

| Loại | Dấu hiệu | Hành động |
| --- | --- | --- |
| Root function | Hàm đúng nghĩa nghiệp vụ, nhiều nơi nên dùng | Sửa trực tiếp, thêm test/smoke nếu rủi ro |
| Patch function | Hàm sinh sau để sửa một case lỗi | Merge logic đúng về root function, xóa hoặc deprecate patch |
| Compatibility wrapper | Cần tạm để không gãy import/API | Giữ ngắn hạn, ghi rõ replacement và điều kiện xóa |
| Dead duplicate | Không còn import/runtime dependency | Chuyển inventory sang `delete`, xóa khi có bằng chứng |
| Domain fork | Cùng tên nhưng business rule khác domain | Giữ feature/domain-local, đổi tên rõ ngữ cảnh nếu cần |

## 3. Quy Trình Audit Một Cụm Hàm

1. Chọn một domain/feature, không audit lan toàn repo trong cùng slice.
2. Tìm hàm/file có tên giống hoặc trách nhiệm giống nhau.
3. Xác định call graph: ai gọi, route/UI nào phụ thuộc, dữ liệu input/output là gì.
4. Chọn source-of-truth: hàm nào nên là hàm chính về lâu dài.
5. So sánh khác biệt logic giữa các bản duplicate.
6. Đưa logic đúng vào source-of-truth bằng thay đổi nhỏ nhất.
7. Chuyển caller sang source-of-truth nếu an toàn, hoặc tạo wrapper tương thích có TODO xóa rõ ràng trong docs.
8. Xóa import/code không còn dùng.
9. Cập nhật `CODE_INVENTORY.md` và `REFACTOR_LOG.md`.
10. Chạy validation tối thiểu cho slice đó.

## 4. Lệnh Tìm Duplicate Gợi Ý

```powershell
rg -n "function .*V2|const .*V2|new[A-Z]|old[A-Z]|fixed|temp|backup|TODO|FIXME|workaround|fallback" frontend backend
rg -n "formatCurrency|formatDate|parseNumber|buildQuery|normalizeOrder|mapOrder|mapProduct|apiClient|axios|fetch" frontend/src backend/src
rg -n "try\s*\{|catch\s*\(" frontend/src backend/src
rg -n "setTimeout|setInterval" frontend/src backend/src
```

Các lệnh này chỉ là điểm bắt đầu. Không kết luận xóa/sửa chỉ dựa trên keyword.

## 5. Task Audit Chi Tiết Theo Ưu Tiên

### 5.0 Findings Scan Ban Đầu

Các cụm dưới đây được phát hiện bằng scan tên hàm trùng/lặp trách nhiệm. Chưa kết luận xóa ngay; cần trace caller trước khi sửa.

| Cụm | Vị trí nổi bật | Nhận định audit |
| --- | --- | --- |
| `normalizeMoney` | `backend/src/domains/orders/controller/finance/*`, `backend/src/domains/payments/controller/shared/helpers.js`, `backend/src/domains/payment-slots/use-cases/*`, `backend/src/services/pricing/core.js` | Rủi ro cao vì liên quan tiền; cần chọn shared money helper hoặc domain-local theo rule nghiệp vụ. |
| `normalizeEmail` | `backend/src/domains/renew-adobe/controller/*`, `backend/src/services/fix-ades/checkService.js`, `backend/src/services/renew-adobe/orderUserTrackingService/helpers.js` | Renew Adobe/Fix ADES đang có nhiều bản normalize email; nên gom source-of-truth trong domain/adapters. |
| `normalizeCheckResultForRenewFlow` | `backend/src/domains/fix-ades/routes.js`, `backend/src/domains/renew-adobe/controller/publicFixAdes.js` | Có dấu hiệu copy flow giữa Fix ADES và Renew Adobe; cần tách adapter/mapper chung đúng boundary. |
| `normalizeAccount` | `backend/src/domains/payment-slots/use-cases/openPaymentSlot.js`, `backend/src/domains/payment-slots/use-cases/resolveOrderByExpectedAmount.js` | Cùng domain payment-slots, ưu tiên gom vào helper domain-local. |
| `normalizeAccountNumber` | `backend/src/domains/shop-bank-accounts/repositories/shopBankReceiptTotalsRepository.js`, `backend/src/domains/shop-bank-accounts/validators/shopBankAccountValidator.js` | Cùng domain bank account; cần tránh repository/validator tự normalize lệch nhau. |
| `normalizeBoolean` | `backend/src/domains/shop-bank-accounts/validators/shopBankAccountValidator.js`, `backend/src/domains/usdt-wallets/validators/usdtWalletValidator.js` | Có thể shared validation generic nếu contract giống nhau, hoặc giữ domain-local nếu rule khác. |
| `normalizeOptionalText` | `backend/src/domains/shop-bank-accounts/*`, `backend/src/domains/usdt-wallets/*` | Wallet/bank có pattern trùng; audit cùng ledger/money slice. |
| `normalizeDate` | `backend/src/domains/wallet/controller/index.js`, `backend/src/domains/wallet/repositories/dailyBalanceRepository.js` | Cùng domain wallet; source-of-truth nên ở validator/query helper, không lặp controller/repository. |
| `normalizeBaseUrl` | `backend/src/domains/product-descriptions/controller/*`, `frontend/src/shared/api/client.ts` | Trùng tên nhưng khác runtime frontend/backend; chỉ gom trong backend product-descriptions nếu logic giống. |
| `normalizeKey` | `frontend/src/components/modals/CreateOrderModal/hooks/useSuppliesData.ts`, `frontend/src/features/bill-order/helpers.ts`, `frontend/src/features/product-price/utils/quoteNormalize.ts` | Có dấu hiệu key normalize dùng xuyên order/product-price; cần xác định business context trước khi shared. |
| `listShopBankAccounts`/`listUsdtWallets` | controller và repository cùng tên trong domain tương ứng | Không hẳn duplicate nếu controller gọi repository; chỉ cần kiểm tra controller mỏng. |
| `mapRowToItem` | `backend/src/domains/customer-status/controller/index.js`, `backend/src/domains/key-active/routes.js` | Tên generic trong controller/routes; nên đổi tên theo domain hoặc chuyển mapper vào file riêng khi chạm domain. |


### 5.0.1 Audit Cụm `normalizeMoney`

Kết luận ban đầu: không gom tất cả `normalizeMoney` vào một hàm duy nhất ngay lập tức, vì hiện có ít nhất 2 contract khác nhau.

| Contract | Hành vi | File đang dùng | Quyết định |
| --- | --- | --- | --- |
| Integer VND parser | Parse string/number, bỏ ký tự phân cách, làm tròn về integer | `dashboardPaymentPostingPolicy.js`, `payments/controller/shared/helpers.js`, `pricing/core.js`, `dailyRevenueSummaryAdjustments.js`, `refundCredits.js` | Có thể chuẩn hóa thành helper money rõ tên sau khi so sánh edge cases. |
| Exact numeric amount | `Number(value)`, không làm tròn, giữ số suffix/expected amount | `payment-slots/use-cases/openPaymentSlot.js`, `payment-slots/use-cases/resolveOrderByExpectedAmount.js`, `mavnStoreExpenseSync.js` | Không merge với integer parser nếu payment slot cần exact match DB. |
| Pricing-specific parser | Có fallback parse digits và logic scale import value | `backend/src/services/pricing/core.js` | Không đưa nguyên vào shared generic; tách parser generic chỉ khi không làm mất pricing behavior. |

Task chi tiết trước khi sửa code:

- [ ] Viết test/fixture cho parse tiền: number, string có comma, string có ký tự `VND`, decimal, null/undefined, invalid.
- [ ] Xác định DB columns nào là integer VND và columns nào cần exact numeric.
- [ ] Chọn tên helper theo contract, ví dụ `normalizeIntegerVndAmount` và `normalizeExactAmount`, tránh tên chung `normalizeMoney` ở shared.
- [ ] Refactor trong một domain trước, ưu tiên `payment-slots` vì 2 file cùng contract exact amount.
- [ ] Không sửa `pricing/core.js` trước khi có baseline pricing calculation.

### 5.1 Orders

- [ ] Audit `frontend/src/features/orders/utils/orderListTransform.ts`: tìm mapper/normalize duplicate, chọn source-of-truth cho order list DTO -> view model.
- [ ] Audit modal tạo/sửa đơn trong `frontend/src/components/modals/*Order*`: xác định hàm validate/submit nào là bản chính, bản nào là patch.
- [ ] Audit backend `backend/src/domains/orders/controller/crud/createOrder.js`: tách validation/calculation/repository nhưng giữ một luồng create chính.
- [ ] Audit `manualWebhookCompletion.js`, `manualUsdtCompletion.js`, `refundCreditRoutes.js`: loại bỏ duplicate completion/refund logic, giữ idempotency và transaction boundary.
- [ ] Ghi contract create/update/list/refund vào `docs/API_CONTRACTS.md` trước khi cutover.

### 5.2 Invoices/Receipts

- [ ] Audit `frontend/src/features/invoices/index.tsx` và `ReceiptsTable.tsx`: tìm action/formatter/status mapping trùng nhau.
- [ ] Chọn source-of-truth cho receipt status, payment action, QR display logic.
- [ ] Tách UI table/actions sau khi đã gom mapper/action logic.
- [ ] Kiểm tra backend receipt/payment routes để tránh frontend vá response shape bằng mapper riêng lẻ.

### 5.3 Pricing/Product

- [ ] Audit `frontend/src/features/pricing/utils.ts`: phân nhóm calculation, product mapping, display formatting; xóa công thức duplicate.
- [ ] Audit `backend/src/services/pricing/core.js`: xác định backend pricing source-of-truth.
- [ ] So sánh frontend pricing calculation với backend contract; frontend chỉ nên preview/format nếu backend là nguồn tính tiền chính.
- [ ] Audit `frontend/src/lib/productDescApi.ts`: chuyển về owner product nếu không generic.
- [ ] Audit `VariantContentView.tsx` và `ImageUpload.tsx`: tách hook/section, tránh duplicate state handler upload/update.

### 5.4 Supplies/Expenses

- [ ] Audit `ExpenseAllocationTableView.tsx` và `helpers.ts`: gom calculation chi phí vào pure utility domain-local.
- [ ] Audit backend `supplies/controller/handlers/list.js`: tách query builder/repository/mapper, không vá filter ở controller.
- [ ] Audit `supplies/controller/handlers/insights.js`: chọn một source cho insight calculation.

### 5.5 Wallet/Bank/Finance

- [ ] Audit `backend/src/domains/wallet/controller/index.js`: tìm ledger/balance/refund duplicate.
- [ ] Audit `shopBankLedgerService.js`: xác định source-of-truth cho ledger transaction và balance calculation.
- [ ] Audit dashboard finance query/summary: không sửa số liệu bằng mapper frontend nếu SQL/backend đang sai.
- [ ] Audit Telegram finance notifier: tách adapter thông báo khỏi calculation lõi.

### 5.6 Dashboard/Reports

- [ ] Audit `FinancialChartsPanel.tsx`: tách data mapper khỏi chart rendering.
- [ ] Audit `dashboardSummary.js` và `dailyRevenueSummaryBackfill/sqlBuilder.js`: chuẩn hóa query parts và mapper response.
- [ ] Tạo baseline số liệu dashboard trước khi sửa query.

### 5.7 Renew Adobe

- [ ] Audit `checkAccounts.js`, `batchUsers.js`, `publicFixAdes.js`: xác định flow chính và patch flow.
- [ ] Audit `backend/src/services/renew-adobe/adobe-renew-v2/facade.js`: tách login/account lookup/renew/post-check, không giữ facade phình to.
- [ ] Audit `fix-ades/checkService.js`: đưa integration boundary rõ, không để controller gọi service vá trực tiếp.
- [ ] Audit scheduler `renewAdobePostCheckFlow.js`: scheduler chỉ gọi use-case chính.
- [ ] Audit frontend `RenewSystemLogsPage.tsx`, `AddTrackingOrdersModal.tsx`, `RenewAdobeAccountsTable.tsx`: gom API/action/status mapping về feature-local source-of-truth.

## 6. Checklist Trước Khi Xóa Một Hàm/File Cũ

- [ ] Đã tìm import bằng `rg`.
- [ ] Đã kiểm tra route/API/scheduler/job không gọi runtime.
- [ ] Đã có replacement cùng contract hoặc caller đã chuyển sang source-of-truth.
- [ ] Đã so sánh input/output giữa bản cũ và bản mới.
- [ ] Đã cập nhật `CODE_INVENTORY.md` sang `deprecated` hoặc `delete`.
- [ ] Đã ghi lý do trong `REFACTOR_LOG.md`.
- [ ] Đã chạy validation liên quan hoặc ghi rõ vì sao chưa chạy.

## 7. Definition Of Done Cho Clean-Code Slice

- [ ] Không còn duplicate function cùng trách nhiệm trong phạm vi slice.
- [ ] Caller dùng source-of-truth rõ ràng.
- [ ] Wrapper tương thích, nếu còn, có lý do và điều kiện xóa.
- [ ] Không thêm catch-all helper/service mới.
- [ ] Không đổi behavior public.
- [ ] Inventory/log/API contract được cập nhật.
- [ ] Validation hoặc smoke checklist liên quan đã pass.

## 8. Phase A Duplicate Scan - 2026-06-30

Scope scan có kiểm soát, không xem kết quả là lệnh xóa tự động. Các lệnh đã chạy:

```bash
rg -n "router\.(get|post|put|patch|delete)" backend/src/domains/orders/controller -g "*.js"
rg -n "\b(new|old|v2|fixed|temp|helper2)\b|function .*2\b|const .*2\s*=" backend/src frontend/src -g "*.js" -g "*.ts" -g "*.tsx"
rg -n "(function|const)\s+(normalize|format|parse|build|map)[A-Za-z0-9_]+|export\s+(const|function)\s+(normalize|format|parse|build|map)" backend/src/domains frontend/src/features frontend/src/shared backend/src/shared -g "*.js" -g "*.ts" -g "*.tsx"
Get-ChildItem -Path backend/src,frontend/src -Recurse -File | Where-Object { $_.Name -match '(helper|helpers|normalizer|normalizers|utils)\.(js|ts|tsx)$' }
```

### 8.1 Findings Theo Cụm

| Cụm | File/Pattern | Finding | Source-of-truth quyết định | Trạng thái |
| --- | --- | --- | --- | --- |
| Route/API Phase A | `orders`, `wallet`, `shop-bank-accounts`, `usdt-wallets`, `payment-slots` | Routes thật đã inventory vào `docs/API_CONTRACTS.md`; payment-slots là internal domain API, không phải HTTP router. | Route contract nằm ở `docs/API_CONTRACTS.md`; implementation source giữ ở domain route/controller hiện tại. | `recorded` |
| Generic shared primitives | `frontend/src/shared/money`, `number`, `html`, `text`, `http`, `vietqr`; `backend/src/shared/text`, `validation`, `money` | Có shared primitives thật sự dùng lại bởi nhiều domain/feature. | Giữ ở `shared/<capability>`; không thêm business rule vào `shared/utils`. | `keep` |
| Compatibility barrels | `frontend/src/shared/utils/*`, `frontend/src/features/pricing/utils.ts` | Một số file `utils` hiện là barrel/compatibility để không gãy import cũ. | Không thêm logic mới; khi chạm caller thì import trực tiếp từ module cụ thể. | `compatibility` |
| Orders frontend mapper | `frontend/src/features/orders/utils/orderListTransform.ts`, `ordersHelpers.ts`, Create/Edit/Bill Order modal helpers | Scan cho thấy còn nhiều `normalize/format/parse` quanh order code, money, status/view model. | Chưa merge trong Phase A; E1 phải chốt source-of-truth DTO -> view model trước khi sửa code. | `open` |
| Invoices/receipts QR/status | `frontend/src/features/invoices/helpers.ts`, `components/qr-modal/helpers.ts`, `parseBatchOrderCodes.ts`, `parseBatchTransactionCodes.ts` | QR/batch token/status/action logic vẫn ở invoices feature. | Giữ trong `features/invoices`; không đưa vào shared vì là receipt business rule. | `open` |
| Pricing frontend split | `frontend/src/features/pricing/utils.ts`, `priceCalculations.ts`, `priceFormatters.ts`, `priceLabels.ts`, `priceParsing.ts`, `productPriceMapper.ts` | Frontend pricing đã tách thành module cụ thể; `utils.ts` là compatibility barrel. | Giữ owner ở `features/pricing`; backend pricing owner vẫn cần audit/test. | `partial` |
| Product description API | `frontend/src/features/product-info/api/productDescApi.ts` và file con | `frontend/src/lib/productDescApi.ts` không còn tồn tại; API đã về owner `product-info`. | Giữ `product-info/api` làm owner; không tạo lại lib global. | `done` |
| Supplier/NCC capability | `backend/src/domains/supplies/services/supplierLookupService.js`, `supplierCostService.js` | Supplier lookup/cost đã có owner service trong supplies. | Caller khác gọi supplies service/repository, không tự query NCC. | `partial` |
| Product lookup capability | `backend/src/domains/products/services/productLookupService.js` | Product lookup owner đã có nhưng Phase A chưa audit hết caller backend. | E-BE1 tiếp tục audit/cutover caller product/variant/package. | `partial` |
| Payment-slot exact amount | `backend/src/domains/payment-slots/helpers/paymentSlotInputs.js` | Contract exact amount khác integer VND parser. | Giữ domain-local, không gom vào `shared/money`. | `done` |
| Shop-bank/USDT input rules | `shopBankInputs.js`, `usdtWalletInputs.js`, shared text/boolean primitives | Domain input rules đã tách; primitive generic ở shared. | Domain rules giữ ở owner; only primitive shared. | `done` |
| Renew Adobe backend helpers | `backend/src/services/renew-adobe/adobe-renew-v2/*helpers.js`, `facade.js` | Còn nhiều helper/service flow theo renew-adobe; D6-D7 vẫn mở. | Tách theo login/account lookup/renew/post-check trong owner renew-adobe, không đưa shared. | `open` |
| Dashboard/wallet UI utils | `frontend/src/features/dashboard/components/WalletBalancesCard/utils.ts` | Feature-local display/column helpers còn ở dashboard wallet card. | Giữ feature-local; chỉ tách tiếp nếu file lớn hoặc reuse thật. | `keep feature-local` |

### 8.2 Source-Of-Truth Decisions Cho Phase A

- API route contract Phase A: `docs/API_CONTRACTS.md` là tài liệu contract; source code route hiện tại không đổi.
- Generic primitive shared: theo `docs/refactor-rebuild/SHARED_CONTRACTS.md`.
- Business capability dùng nhiều nơi: thuộc domain owner (`products`, `supplies`, `pricing`, `orders`, `invoices`, `renew-adobe`), không đưa vào shared chỉ vì nhiều caller cần dùng.
- `orders` DTO/view-model vẫn chưa chốt; không refactor mapper order trước khi E1 hoàn tất.
- `pricing` frontend đã tách; backend `backend/src/services/pricing/core.js` phải có baseline test trước khi split.
- `payment-slots` không có HTTP route public; là internal domain API, exact amount matching là source-of-truth riêng.

### 8.3 Candidate Clusters Cho Phase Tiếp Theo

1. `orders` frontend mapper/modal overlap: `orderListTransform.ts`, `ordersHelpers.ts`, Create/Edit/Bill Order helpers.
2. Backend product/pricing capability: `products/services/productLookupService.js`, `services/pricing/core.js`, orders create/update pricing callers.
3. Invoices/receipts mapping: `invoices/index.tsx`, `ReceiptsTable.tsx`, `invoices/helpers.ts`, QR modal helpers.
4. Renew Adobe backend facade: `services/renew-adobe/adobe-renew-v2/facade.js` và các helper flow.
5. Legacy compatibility barrels: `frontend/src/shared/utils/*`, `frontend/src/features/pricing/utils.ts`, only after callers are cut over.

# Refactor Log - `admin_orderlist`

Mục đích: ghi từng clean-code/refactor slice, source-of-truth đã chọn, duplicate/workaround đã xử lý, validation đã chạy và rủi ro còn lại.

## Mẫu Ghi Log

```md
## YYYY-MM-DD - <Domain/Feature> - <Slice>

### Mục Tiêu

- ...

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| ... | ... | ... | keep/merge/deprecate/delete |

### Thay Đổi

- ...

### Contract Giữ Nguyên

- Route/API/UI:
- Request/response:
- Component props:

### Validation

- [ ] Command/test:
- [ ] Smoke checklist:

### Rủi Ro Còn Lại

- ...
```

## 2026-06-24 - Docs - Clean Code Audit Prep

### Mục Tiêu

- Chuyển refactor plan từ tổng quan sang checklist dọn duplicate/workaround chi tiết.
- Đặt nguyên tắc sửa hàm/module gốc thay vì viết thêm hàm vá.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Clean-code checklist | `docs/refactor-rebuild/CLEAN_CODE_AUDIT.md` | N/A | keep |
| API contract tracking | `docs/API_CONTRACTS.md` | N/A | keep |
| Smoke checklist | `docs/SMOKE_CHECKLIST.md` | N/A | keep |
| Refactor log | `docs/REFACTOR_LOG.md` | N/A | keep |

### Thay Đổi

- Tạo checklist audit duplicate theo domain.
- Ghi findings scan ban đầu cho các cụm `normalizeMoney`, `normalizeEmail`, `normalizeAccount`, `normalizeDate`, `normalizeKey`.
- Tạo khung API contract và smoke checklist để dùng trước khi chạm code runtime.

### Contract Giữ Nguyên

- Chưa đổi code runtime.
- Chưa đổi route/API/UI.

### Validation

- [x] Chỉ cập nhật tài liệu.
- [ ] Chưa chạy build/test vì chưa sửa code runtime.

### Rủi Ro Còn Lại

- Cần trace caller thực tế trước khi merge/xóa bất kỳ hàm duplicate nào.
- Cần điền contract thật cho domain đầu tiên trước khi refactor.

## 2026-06-24 - Payment Slots - Normalize Exact Amount

### Mục Tiêu

- Xóa duplicate `normalizeMoney`/`normalizeAccount` trong cùng domain `payment-slots`.
- Giữ contract exact amount cho `expected_amount`, không gom nhầm với integer VND parser.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Normalize exact payment amount | `backend/src/domains/payment-slots/helpers/paymentSlotInputs.js` | `openPaymentSlot.js`, `resolveOrderByExpectedAmount.js` | merge |
| Normalize receiver account | `backend/src/domains/payment-slots/helpers/paymentSlotInputs.js` | `openPaymentSlot.js`, `resolveOrderByExpectedAmount.js` | merge |

### Thay Đổi

- Tạo helper domain-local `normalizeExactAmount` và `normalizeAccount`.
- Chuyển `openPaymentSlot` và `resolveOrderByExpectedAmount` sang dùng helper chung.
- Không đổi logic: vẫn dùng `Number(value)`, invalid về `0`, không làm tròn.

### Contract Giữ Nguyên

- Route/API/UI: không đổi.
- Payment slot `expected_amount`: giữ exact numeric behavior.
- Public exports của use-case: không đổi.

### Validation

- [x] `node -e "const n=require('./backend/src/domains/payment-slots/helpers/paymentSlotInputs'); if(n.normalizeExactAmount('100.5')!==100.5) process.exit(1); if(n.normalizeExactAmount('x')!==0) process.exit(2); if(n.normalizeAccount(' 12 34 ')!=='1234') process.exit(3); console.log('normalizers ok')"`
- [x] `node --check backend/src/domains/payment-slots/helpers/paymentSlotInputs.js; node --check backend/src/domains/payment-slots/use-cases/openPaymentSlot.js; node --check backend/src/domains/payment-slots/use-cases/resolveOrderByExpectedAmount.js`
- [ ] Chưa chạy full backend test.

### Rủi Ro Còn Lại

- Command import mở DB pool do side effect hiện có trong project, nên process không tự thoát ngay.
- Cần tiếp tục audit các cụm money parser còn lại theo contract riêng.



## 2026-06-25 - Shop Bank/USDT - Domain Normalizers

### Mục Tiêu

- Xóa duplicate normalizer trong `shop-bank-accounts` và `usdt-wallets`.
- Giữ helper trong từng domain thay vì đưa lên shared khi chưa chốt shared contract chung.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Shop bank account number/text/boolean/money normalize | `backend/src/domains/shop-bank-accounts/helpers/shopBankInputs.js` | validator, receipt totals repository, withdrawal/list/update use-cases, ledger service | merge |
| USDT optional text/wallet address/boolean normalize | `backend/src/domains/usdt-wallets/helpers/usdtWalletInputs.js` | `usdtWalletValidator.js`, `recordUsdtWalletWithdrawal.js` | merge |

### Thay Đổi

- Tạo helper domain-local cho `shop-bank-accounts`.
- Chuyển validator/repository/use-case/service trong shop-bank sang helper chung.
- Tạo helper domain-local cho `usdt-wallets`.
- Chuyển validator và withdrawal use-case trong USDT sang helper chung.
- Không đưa helper lên `shared` vì chưa cần cross-domain contract ổn định.

### Contract Giữ Nguyên

- Route/API/UI: không đổi.
- Account number normalization: vẫn trim và remove whitespace, không đổi leading zero.
- Money normalization shop-bank: vẫn `Number(value)`, invalid về `0`, `Math.round`.
- Optional text normalization: blank string về `null`.

### Validation

- [x] `node --check` cho các file shop-bank/usdt đã chạm.
- [x] `node -e` kiểm tra helper output cho account number, bank bin, optional text, boolean, rounded money, wallet address.
- [x] `cd backend; npx jest tests/jest/domains/shop-bank-accounts/shopBankAccountValidator.test.js tests/jest/domains/shop-bank-accounts/shopBankWithdrawnValidator.test.js tests/jest/domains/shop-bank-accounts/shopBankAccountRepository.test.js --runInBand`
- [ ] Chưa chạy smoke ledger/balance/withdrawal thủ công.

### Rủi Ro Còn Lại

- `shopBankLedgerService.js` vẫn là file lớn, mới chỉ gom normalizer; chưa tách ledger use-case/repository sâu.
- `normalizeBoolean` có contract giống giữa shop-bank và USDT nhưng tạm giữ domain-local để tránh tạo shared quá sớm.


## 2026-06-25 - Shared Money - Integer VND Parser

### Mục Tiêu

- Chuẩn hóa parser tiền VND dạng integer cho các flow finance/payment đang trùng logic.
- Không gom nhầm với exact amount của `payment-slots` hoặc pricing-specific parser.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Integer VND amount parser | `backend/src/shared/money/normalizers.js` | `dashboardPaymentPostingPolicy.js`, `payments/controller/shared/helpers.js` | merge |
| Compatibility export `normalizeMoney` | `dashboardPaymentPostingPolicy.js`, `payments/controller/shared/helpers.js` | Existing callers/tests | keep wrapper alias |

### Thay Đổi

- Tạo `normalizeIntegerVndAmount` trong shared backend money helper.
- Thêm Jest fixture cho number, comma string, `VND` string, decimal, null/undefined/invalid.
- Chuyển dashboard payment policy và payments shared helpers sang dùng source-of-truth mới.
- Giữ export cũ `normalizeMoney` tại các module hiện hữu để không gãy caller.

### Contract Giữ Nguyên

- `normalizeMoney` public export ở các module cũ vẫn tồn tại.
- Integer VND parser vẫn `Math.round`, invalid về `0`, bỏ comma và ký tự không phải số/dấu/phần thập phân.
- Không đổi payment slot exact amount parser.
- Không đổi pricing parser vì còn logic pricing-specific.

### Validation

- [x] `cd backend; npx jest tests/jest/shared/money/normalizers.test.js tests/jest/order/dashboardPaymentPostingPolicy.test.js --runInBand`
- [x] `node --check` cho shared money helper, dashboard policy, payments helpers.
- [x] `node -e` kiểm tra `payments/controller/shared/helpers.normalizeMoney` vẫn trả `1234` cho `1,234 VND`.

### Rủi Ro Còn Lại

- `dailyRevenueSummaryAdjustments.js`, `refundCredits.js`, `mavnStoreExpenseSync.js`, `pricing/core.js` vẫn còn parser riêng và cần audit contract trước khi gom.
- `pricing/core.js` không nên gom cho đến khi có baseline pricing calculation.


## 2026-06-25 - Pricing - Baseline Money Parser

### Mục Tiêu

- Khóa baseline cho `backend/src/services/pricing/core.js` trước khi refactor sâu.
- Xác nhận pricing parser có contract khác `normalizeIntegerVndAmount` shared.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Pricing-specific money parser | `backend/src/services/pricing/core.js` | Shared integer VND parser | keep separate |

### Thay Đổi

- Thêm Jest baseline cho `normalizeMoney`, `normalizeImportValue`, `resolveMoney` của pricing core.
- Chưa thay đổi runtime pricing code.

### Contract Giữ Nguyên

- Pricing parser vẫn giữ fallback digits parser, ví dụ `abc 12.6 đ` thành `126`.
- Import scaling logic vẫn giữ nguyên.

### Validation

- [x] `cd backend; npx jest tests/jest/services/pricingCoreNormalizers.test.js --runInBand`

### Rủi Ro Còn Lại

- Cần thêm baseline cho `calculateOrderPricingFromResolvedValues` trước khi tách pricing core lớn.


## 2026-06-25 - Orders - Create Flow Root-Cause Slice

### Mục Tiêu

- Bắt đầu C1 bằng slice nhỏ an toàn trong `createOrder`.
- Dùng source-of-truth month key đã có và sửa error response đang leak raw error message.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Vietnam YMD -> month key | `dashboardSummary.monthKeyFromVietnamYmd` | Local `monthKeyFromYmd` trong `createOrder.js` | merge |
| Create order 500 response | `createOrder.js` catch block | Raw `error.message` response | root-cause fix |

### Thay Đổi

- `createOrder.js` dùng `monthKeyFromVietnamYmd` từ `dashboardSummary` thay vì local helper.
- Catch block chỉ trả duplicate-code message an toàn hoặc generic create-order error, không trả raw internal error.
- Ghi contract `POST /api/orders` vào `docs/API_CONTRACTS.md`.

### Contract Giữ Nguyên

- Route `POST /api/orders` không đổi.
- Success response normalized order row không đổi.
- Empty payload vẫn trả `400 { error: "Empty payload" }`.
- Insert failure trả generic create-order error theo test hiện có.

### Validation

- [x] `node --check backend/src/domains/orders/controller/crud/createOrder.js`
- [x] `cd backend; npx jest tests/jest/domains/orders/finance/monthKeyVietnam.test.js tests/jest/domains/orders/createOrder.integration.test.js --runInBand --forceExit`

### Rủi Ro Còn Lại

- `createOrder.js` vẫn còn quá dày; cần tiếp tục tách validation/payment-slot/refund-credit/repository trong các slice sau.


## 2026-06-25 - Orders Refund - Non-Negative Money Parser

### Mục Tiêu

- Gom parser tiền không âm trong refund credit về shared money helper với contract rõ.
- Giữ export `normalizeMoney` cũ của `refundCredits.js` để không gãy caller như `createOrder.js`.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Non-negative integer VND parser | `backend/src/shared/money/normalizers.js` | `refundCredits.js` local `normalizeMoney` | merge |
| Refund credit public `normalizeMoney` | `refundCredits.js` | Existing callers | keep alias |

### Thay Đổi

- Thêm `normalizeNonNegativeIntegerVndAmount` vào shared money helper.
- Chuyển `refundCredits.js` sang alias helper mới.
- Mở rộng Jest fixture cho clamp âm về `0`.

### Contract Giữ Nguyên

- Refund credit amount vẫn không âm, invalid về `0`, làm tròn integer.
- `refundCredits.normalizeMoney` vẫn export như cũ.

### Validation

- [x] `cd backend; npx jest tests/jest/shared/money/normalizers.test.js tests/jest/order/offFlowRefundCredits.test.js --runInBand`
- [x] `node --check backend/src/shared/money/normalizers.js backend/src/domains/orders/controller/finance/refundCredits.js`
- [x] `node -e` kiểm tra `refundCredits.normalizeMoney` clamp âm và round decimal.

### Rủi Ro Còn Lại

- Manual completion/refund route orchestration vẫn cần tách controller/use-case/transaction boundary ở slice sau.


## 2026-06-25 - Fix ADES/Renew Adobe - Renew Flow Result Helper

### Mục Tiêu

- Xóa duplicate `normalizeCheckResultForRenewFlow` giữa admin Fix ADES route và public Renew Adobe Fix ADES flow.
- Giữ mapper ở domain Fix ADES vì đây là contract của kết quả check ADES cho luồng renew.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Detect inactive ADES payload | `backend/src/domains/fix-ades/helpers/renewFlowResult.js` | `fix-ades/routes.js`, `renew-adobe/controller/publicFixAdes.js` | merge |
| Normalize check result for renew flow | `backend/src/domains/fix-ades/helpers/renewFlowResult.js` | `fix-ades/routes.js`, `renew-adobe/controller/publicFixAdes.js` | merge |

### Thay Đổi

- Tạo helper `renewFlowResult.js` trong domain `fix-ades`.
- Chuyển `fix-ades/routes.js` và `publicFixAdes.js` sang dùng helper chung.
- Giữ `__test__` export trong `publicFixAdes.js` bằng cách import helper mới.
- Thêm Jest test cho helper chung.

### Contract Giữ Nguyên

- Payload not-active vẫn được normalize thành `ok: true` cho renew flow.
- Các result không phải not-active vẫn trả nguyên object.

### Validation

- [x] `node --check backend/src/domains/fix-ades/helpers/renewFlowResult.js backend/src/domains/fix-ades/routes.js backend/src/domains/renew-adobe/controller/publicFixAdes.js`
- [x] `cd backend; npx jest tests/jest/domains/fix-ades/renewFlowResult.test.js tests/jest/domains/renew-adobe/publicFixAdes.test.js --runInBand`

### Rủi Ro Còn Lại

- D1-D2 `normalizeEmail` đã xử lý ở slice sau; flow lớn Renew Adobe vẫn cần tách tiếp.
- D5-D7 flow lớn Renew Adobe vẫn chưa tách facade/controller.


## 2026-06-25 - Renew Adobe/Fix ADES - Email Helper

### Mục Tiêu

- Xóa duplicate `normalizeEmail` trong Renew Adobe/Fix ADES và tracking service.
- Giữ riêng 2 contract: normalize mềm và assert valid email có `status=400`.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Normalize email | `backend/src/domains/renew-adobe/helpers/email.js` | `accountLookup.js`, public controllers, tracking helpers | merge |
| Assert valid email for Fix ADES service | `backend/src/domains/renew-adobe/helpers/email.js` | `services/fix-ades/checkService.js` local validator | merge |

### Thay Đổi

- Tạo helper `EMAIL_RE`, `normalizeEmail`, `assertValidEmail`.
- Chuyển account lookup, public Fix ADES/Otp/ResolveSystem, Fix ADES service, order user tracking helper sang dùng source-of-truth.
- Giữ export `normalizeEmail` từ `accountLookup.js` để các caller cũ không gãy.

### Contract Giữ Nguyên

- Normalize email vẫn trim + lowercase.
- Fix ADES service vẫn throw `Error("Email không hợp lệ.")` với `status=400` khi invalid.

### Validation

- [x] `node --check` cho helper/callers đã chạm.
- [x] `cd backend; npx jest tests/jest/domains/renew-adobe/emailHelper.test.js tests/jest/domains/renew-adobe/publicFixAdes.test.js tests/jest/domains/fix-ades/renewFlowResult.test.js --runInBand`

### Rủi Ro Còn Lại

- D5-D7 vẫn là refactor flow lớn: `checkAccounts.js`, `batchUsers.js`, `publicFixAdes.js`, `adobe-renew-v2/facade.js`, scheduler boundary.


## 2026-06-25 - Orders - Manual Completion Boundary

### Mục Tiêu

- Hoàn tất C2.3-C2.5 ở mức an toàn: chốt boundary, tách route mỏng và thêm bằng chứng idempotency refund.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Manual webhook completion use-case | `manualWebhookCompletion.js` | Route handler trong cùng file | route extracted |
| Manual USDT completion use-case | `manualUsdtCompletion.js` | Route handler trong cùng file | route extracted |
| Refund cashout idempotency | `shopBankLedgerService.debitShopBankRefundCashout` | Refund route caller | keep + test |

### Thay Đổi

- Tạo `manualWebhookCompletionRoute.js` và `manualUsdtCompletionRoute.js` làm route/controller mỏng.
- `manualWebhookCompletion.js` và `manualUsdtCompletion.js` chỉ export use-case completion chính.
- Cập nhật `orders/controller/index.js` sang route files mới.
- Thêm test idempotency cho `debitShopBankRefundCashout` để đảm bảo cùng `refund_credit_note + creditId` không tạo double ledger.
- Ghi boundary vào `docs/API_CONTRACTS.md`.

### Contract Giữ Nguyên

- API path manual webhook/USDT không đổi.
- Completion use-case return shape không đổi.
- Refund cashout vẫn skip duplicate ledger theo source kind/id.

### Validation

- [x] `node --check` cho manual completion use-case/route files và orders controller index.
- [x] `cd backend; npx jest tests/jest/domains/shop-bank-accounts/shopBankLedgerService.test.js --runInBand`

### Rủi Ro Còn Lại

- Manual completion use-case files vẫn còn lớn; tách sâu hơn cần thêm integration tests cho receipt/dashboard/ledger side effects.


## 2026-06-25 - Dashboard - Daily Revenue Backfill Query Repository

### Mục Tiêu

- Hoàn tất C3 bằng cách tách boundary query repository khỏi runner, không đổi SQL nghiệp vụ.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Build daily revenue backfill SQL/bindings | `dailyRevenueSummaryBackfill/queryRepository.js` | Inline build in `runner.js` | extract |
| Long SQL statement | `dailyRevenueSummaryBackfill/sqlBuilder.js` | N/A | keep |

### Thay Đổi

- Tạo `buildDailyRevenueSummaryBackfillQuery` và `executeDailyRevenueSummaryBackfill`.
- `runner.js` chỉ resolve options/defaults rồi gọi repository.
- Thêm focused Jest test kiểm tra SQL contains các CTE/chỉ dấu chính và bindings.

### Contract Giữ Nguyên

- SQL builder output không đổi về nghiệp vụ.
- `runDailyRevenueSummaryBackfill` public API không đổi.
- Không sửa frontend dashboard/chart.

### Validation

- [x] `node --check` cho `queryRepository.js`, `runner.js`, `sqlBuilder.js`.
- [x] `cd backend; npx jest tests/jest/services/dailyRevenueSummaryBackfillQueryRepository.test.js tests/jest/domains/orders/finance/monthKeyVietnam.test.js --runInBand`

### Rủi Ro Còn Lại

- Chưa chạy smoke UI dashboard thủ công.
- `dashboardSummary.js` vẫn lớn; cần tách tiếp mapper/query update ở slice sau nếu cần.


## 2026-06-25 - Renew Adobe - Flow Audit

### Mục Tiêu

- Hoàn tất D5 bằng cách chốt flow chính/patch flow trước khi tách facade/scheduler lớn.

### Thay Đổi

- Tạo `docs/refactor-rebuild/RENEW_ADOBE_FLOW_AUDIT.md`.
- Ghi boundary cho check account, batch users, public Fix ADES, Adobe renew v2 facade, post-check scheduler.
- Ghi rõ patch/duplicate đã xử lý: email helper và renew-flow result helper.

### Validation

- [x] Documentation-only audit.

### Rủi Ro Còn Lại

- D6-D7 vẫn cần code slice riêng: facade và scheduler có logic automation lớn, không nên tách khi chưa có focused test.


## 2026-06-25 - Architecture Rule Adjustment - Domain Services Over Helper Sprawl

### Mục Tiêu

- Điều chỉnh hướng refactor theo yêu cầu: không tạo helper rải rác theo từng domain nếu logic generic hoặc capability nghiệp vụ có owner rõ.

### Quyết Định

- Generic primitive dùng 2+ domain sẽ đưa về `shared`.
- Business rule/query dùng nhiều luồng sẽ thuộc domain service/repository owner, ví dụ product, supplier, pricing.
- Domain helper chỉ giữ phần thật sự riêng domain và phải có tên cụ thể, không dùng `normalizers.js` chung chung.

### Việc Tiếp Theo

- Gom `normalizeOptionalText` và `normalizeBoolean` từ shop-bank/usdt vào shared.
- Đổi tên các domain helper `normalizers.js` vừa tạo sang tên rõ contract.


## 2026-06-25 - Supplies - Supplier Lookup Capability

### Mục Tiêu

- Bắt đầu gom NCC/supplier lookup về domain owner `supplies` thay vì để orders/products/pricing tự query bảng supplier.
- Giữ behavior hiện tại: lookup exact name, id dương hợp lệ, caller cũ vẫn export tên hàm tương thích.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Supplier lookup by id/name | `backend/src/domains/supplies/services/supplierLookupService.js` | `services/supplierService.js`, `orders/controller/finance/supplierDebt.js`, `products/controller/finders.js`, `pricing/orderPricingService.js` | merge một phần |

### Thay Đổi

- Thêm `findSupplierById`, `findSupplierByName`, `findSupplierIdByName`, `findSupplierIdByNormalizedName` trong domain `supplies`.
- `services/supplierService.js` trở thành compatibility export cho `findSupplierIdByName` và giữ `formatPaymentNote`.
- `orders` finance, product finder và pricing service dùng supplier lookup owner thay vì query supplier trực tiếp cho lookup id/name.
- Service lookup trả alias `supplier_name` khi schema dùng `source_name`, để giữ contract cũ của pricing/orders.

### Contract Giữ Nguyên

- API route/response không đổi.
- Lookup theo tên vẫn giữ contract từng caller: pricing/orders exact-match; product finder dùng normalized case-insensitive/trim như cũ.
- Pricing parser/calculation chưa đổi.

### Validation

- [x] `node --check backend/src/domains/supplies/services/supplierLookupService.js backend/src/services/supplierService.js backend/src/domains/orders/controller/finance/supplierDebt.js backend/src/domains/products/controller/finders.js backend/src/services/pricing/orderPricingService.js`

### Rủi Ro Còn Lại

- Vẫn còn một số direct supplier queries trong `orders` create/update/catalog và product supply listing; cần tách tiếp theo từng use-case để không đổi transaction hoặc insert behavior.


## 2026-06-25 - Orders - Supplier Lookup Cutover

### Mục Tiêu

- Tiếp tục giảm direct query supplier trong orders bằng cách gọi domain owner `supplies`.
- Chỉ cutover lookup by id/name; chưa động vào insert NCC hoặc supplier_cost mutation.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Supplier lookup trong orders create/update/catalog | `backend/src/domains/supplies/services/supplierLookupService.js` | `orderUpdateService.js`, `crud/createOrder.js`, `helpers/catalog.js` | merge lookup-only |

### Thay Đổi

- `orderUpdateService.js` dùng `findSupplierById` cho rule Mavryk/Shop và response normalized supply name.
- `createOrder.js` dùng `findSupplierById` cho rule cost nội bộ, dashboard import delta và supplier info trả về.
- `helpers/catalog.js` dùng `findSupplierIdByName` trước khi tạo NCC mới.

### Contract Giữ Nguyên

- API route/response không đổi.
- Insert NCC mới trong `ensureSupplyRecord` vẫn giữ tại orders catalog để tránh đổi transaction/side effect trong slice này.
- `supplier_cost` mutation vẫn giữ nguyên.

### Validation

- [x] `node --check backend/src/domains/orders/controller/orderUpdateService.js backend/src/domains/orders/controller/crud/createOrder.js backend/src/domains/orders/controller/helpers/catalog.js backend/src/domains/supplies/services/supplierLookupService.js`
- [x] `cd backend; npx jest tests/jest/domains/orders/createOrder.integration.test.js tests/jest/services/pricingCoreNormalizers.test.js --runInBand`

### Rủi Ro Còn Lại

- Cần tách tiếp capability supplier cost/import price trước khi gom các mutation `ensureSupplierCost` và pricing cost query.


## 2026-06-25 - Supplies - Supplier Cost Capability

### Mục Tiêu

- Gom rule đọc/ghi `supplier_cost` về domain owner `supplies`.
- Giữ khác biệt contract giữa caller: pricing cần latest price; supplier-change giữ row lookup mặc định như cũ.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Supplier cost/import price lookup/upsert | `backend/src/domains/supplies/services/supplierCostService.js` | `pricing/orderPricingService.js`, `supplier-change/repository.js`, `orders/helpers/catalog.js`, `products/controller/finders.js` | merge |

### Thay Đổi

- Thêm `findSupplierCostPrice`, `findMaxSupplierCostPrice`, `upsertSupplierCostPrice`, `deleteSupplierCostPrice` trong domain `supplies`.
- `pricing/orderPricingService.js` dùng service cho latest supplier cost và max supplier cost.
- `supplier-change/repository.js` delegate `findSupplyPriceForVariant` sang service nhưng giữ export để test/caller cũ không đổi.
- `orders/helpers/catalog.js` và `products/controller/finders.js` dùng service upsert thay vì tự query/insert/update `supplier_cost`.
- `products/controller/handlers/supplies.js` dùng service delete thay vì tự chạy SQL delete `supplier_cost`.

### Contract Giữ Nguyên

- API route/response không đổi.
- Pricing vẫn dùng latest supplier cost theo `id desc`.
- Supplier-change giữ default lookup không ép latest để tránh đổi behavior khi có duplicate row.

### Validation

- [x] `node --check backend/src/domains/supplies/services/supplierCostService.js backend/src/services/pricing/orderPricingService.js backend/src/domains/supplier-change/repository.js backend/src/domains/orders/controller/helpers/catalog.js backend/src/domains/products/controller/finders.js`
- [x] `cd backend; npx jest tests/jest/domains/supplier-change/service.test.js tests/jest/domains/orders/createOrder.integration.test.js tests/jest/services/pricingCoreNormalizers.test.js --runInBand`

### Rủi Ro Còn Lại

- Product supply listing vẫn có SQL join read-model riêng để trả danh sách NCC/giá; nên tách thành query service riêng nếu cần reuse ở nơi khác.
- Payment NCC và supplier order cost log vẫn thuộc các slice riêng, chưa gom ở bước này.


## 2026-06-25 - Database - Parallel Refactor Track

### Mục Tiêu

- Bổ sung luồng refactor database song song với source code.
- Đặt rule migration an toàn: không sửa migration lịch sử, không rename/drop trực tiếp khi chưa có compatibility/backfill.

### Thay Đổi

- Tạo `docs/refactor-rebuild/DATABASE_REFACTOR_TASKS.md`.
- Liên kết Phase DB vào `docs/refactor-rebuild/REFACTOR_TASKS.md`.
- Thêm Database Migration Map vào `docs/refactor-rebuild/MIGRATION_MAP.md`.

### Contract Giữ Nguyên

- Chưa đổi schema runtime.
- Chưa tạo migration mới.
- Chưa đổi route/API/code behavior.

### Validation

- [x] Documentation-only planning update.

### Rủi Ro Còn Lại

- Cần chạy inventory trên DB thật trước khi quyết định index/constraint/drop cụ thể.


## 2026-06-25 - Products - Supplier Read Model

### Mục Tiêu

- Tách SQL đọc danh sách NCC/giá NCC theo sản phẩm ra khỏi controller.
- Giữ controller mỏng, không tạo helper rời kiểu `normalizers`; read-model thuộc owner `products`.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Product supplier read-model | `backend/src/domains/products/services/productSupplierReadService.js` | Inline SQL trong `products/controller/handlers/supplies.js` | extract |

### Thay Đổi

- Thêm `productLookupService.js` cho lookup product/variant by name, tránh service phụ thuộc controller.
- Thêm `listProductSuppliersByName` và `listProductSupplierPricesByName`.
- `getSuppliesByProductName` và `getSupplyPricesByProductName` chỉ gọi service và trả response.
- Giữ logic merge Mavryk/Shop và sort tiếng Việt trong read service.

### Contract Giữ Nguyên

- API path không đổi.
- Response danh sách NCC và bảng giá NCC giữ shape cũ.
- Mutation create/update/delete supplier price chưa đổi trong slice này.

### Validation

- [x] `node --check backend/src/domains/products/services/productLookupService.js backend/src/domains/products/services/productSupplierReadService.js backend/src/domains/products/controller/finders.js backend/src/domains/products/controller/handlers/supplies.js`
- [x] `cd backend; npx jest tests/jest/domains/orders/createOrder.integration.test.js tests/jest/services/pricingCoreNormalizers.test.js --runInBand`
- [x] `git diff --check`

### Rủi Ro Còn Lại

- Chưa có focused Jest cho read-model SQL vì hiện repo chưa có test cho endpoint này; cần smoke API khi có DB/dev server.

## 2026-06-25 - Products - Supplier Mutation Service

### Mục Tiêu

- Tách orchestration thêm/sửa/xóa giá NCC khỏi HTTP handler.
- Đặt capability mutation giá NCC trong owner `products`, reuse được từ các luồng khác mà không copy query/cache/update-cost.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Product supplier mutation | `backend/src/domains/products/services/productSupplierMutationService.js` | Inline mutation logic trong `products/controller/handlers/supplies.js` | extract |

### Thay Đổi

- Thêm `updateProductSupplierPrice`, `createProductSupplierPrice`, `deleteProductSupplierPrice`.
- Handler `supplies.js` chỉ còn đọc params/body, gọi service, trả HTTP status/response và ghi event log theo `req`.
- Logic clear cache, ensure NCC, upsert/delete supplier cost, auto-update order cost nằm trong domain service.
- Giữ behavior lỗi auto-update order cost: log lỗi nhưng vẫn trả update giá thành công với `ordersUpdated: 0` và `updateError`.

### Contract Giữ Nguyên

- API path/status/response shape giữ nguyên.
- Event log payload giữ cùng action/entity/source/metadata.
- Validation bad request vẫn trả 400 cho productId/sourceId/NCC thiếu hoặc không hợp lệ.

### Validation

- [x] `node --check backend/src/domains/products/services/productSupplierMutationService.js`
- [x] `node --check backend/src/domains/products/controller/handlers/supplies.js`
- [x] `git diff --check`
- [x] `cd backend; npx jest tests/jest/domains/orders/createOrder.integration.test.js tests/jest/domains/supplier-change/service.test.js tests/jest/services/pricingCoreNormalizers.test.js --runInBand`

### Rủi Ro Còn Lại

- Chưa có focused Jest cho endpoint mutation sản phẩm/NCC vì hiện repo chưa có test route này; cần smoke API khi có DB/dev server.
- `writeUserEventLog(req, event)` vẫn ở handler vì cần `req`; service chỉ trả event object để tránh phụ thuộc HTTP layer.

## 2026-06-25 - Supplies/Products - Supplier Ensure Capability

### Mục Tiêu

- Loại duplicate tạo NCC (`ensureSupplyRecord`) khỏi controller/helper caller.
- Đưa rule lookup/create NCC về owner `supplies`, còn rule ghi giá NCC theo product nằm ở owner `products`.

### Source-Of-Truth

| Trách nhiệm | Hàm/File chính | Hàm/File duplicate/patch | Quyết định |
| --- | --- | --- | --- |
| Lookup/create NCC | `backend/src/domains/supplies/services/supplierLookupService.js` | `products/controller/finders.js`, `orders/controller/helpers/catalog.js` | consolidate |
| Upsert giá NCC cho variant | `backend/src/domains/products/services/productSupplierMutationService.js` | `products/controller/finders.js` | consolidate |

### Thay Đổi

- Thêm `ensureSupplierRecord` vào `supplierLookupService.js` để lookup theo normalized name rồi insert NCC nếu thiếu.
- Thêm/export `upsertProductSupplierPrice` trong `productSupplierMutationService.js` để caller ghi `supplier_cost` qua một contract product-domain.
- `products/controller/finders.js` chỉ còn compatibility re-export, không tự chứa SQL tạo NCC/giá.
- `createProductPrice.js` gọi trực tiếp `ensureSupplierRecord` và `upsertProductSupplierPrice`.
- `orders/controller/helpers/catalog.js` bỏ implementation tạo NCC riêng, gọi `ensureSupplierRecord`.

### Contract Giữ Nguyên

- API/response không đổi.
- `ensureSupplyRecord` legacy export vẫn còn để các caller cũ không gãy.
- Insert NCC vẫn thử kèm `active_supply`, fallback insert không có cột nếu DB không hỗ trợ.

### Validation

- [x] `node --check backend/src/domains/supplies/services/supplierLookupService.js`
- [x] `node --check backend/src/domains/products/services/productSupplierMutationService.js`
- [x] `node --check backend/src/domains/products/controller/finders.js`
- [x] `node --check backend/src/domains/products/controller/handlers/mutations/createProductPrice.js`
- [x] `node --check backend/src/domains/orders/controller/helpers/catalog.js`
- [x] `git diff --check`
- [x] `cd backend; npx jest tests/jest/domains/orders/createOrder.integration.test.js tests/jest/domains/supplier-change/service.test.js tests/jest/services/pricingCoreNormalizers.test.js --runInBand`

### Rủi Ro Còn Lại

- `orders/controller/helpers.js` và một số CRUD vẫn import `ensureSupplyRecord` qua helper barrel; behavior không đổi nhưng có thể cutover dần sang `ensureSupplierRecord` khi refactor orders controller sâu hơn.

## 2026-06-26 - Orders/Products - Remove Legacy Supplier Finder Aliases

### M?c Ti?u

- Ho?n t?t cutover source code kh?i c?c alias c? `ensureSupplyRecord`, `upsertSupplyPrice`, `findSupplyIdByName`.
- X?a wrapper kh?ng c?n caller ?? tr?nh m?i lu?ng t? gi? m?t b?n lookup/t?o NCC ri?ng.

### Source-Of-Truth

| Tr?ch nhi?m | H?m/File ch?nh | H?m/File duplicate/patch | Quy?t ??nh |
| --- | --- | --- | --- |
| Lookup/create NCC | `backend/src/domains/supplies/services/supplierLookupService.js` | `orders/controller/helpers/catalog.js`, `orders/controller/finance/supplierDebt.js`, `products/controller/finders.js` | delete legacy aliases |
| Upsert gi? NCC cho variant | `backend/src/domains/products/services/productSupplierMutationService.js` | `products/controller/finders.js` | delete legacy alias |

### Thay ??i

- `createOrder.js`, `updateOrder.js`, `orderUpdateService.js`, `services/orderService.js` g?i tr?c ti?p `ensureSupplierRecord`.
- X?a export `ensureSupplyRecord` kh?i `orders/controller/helpers.js` v? `orders/controller/helpers/catalog.js`.
- X?a `backend/src/domains/orders/controller/finance/supplierDebt.js` v? kh?ng c?n caller.
- X?a `backend/src/domains/products/controller/finders.js` v? product lookup/read/mutation ?? c? service owner.
- D?n mock test `createOrder.integration.test.js` kh?i `ensureSupplyRecord`.

### Contract Gi? Nguy?n

- Public API route/response kh?ng ??i.
- Logic t?o NCC v?n d?ng `ensureSupplierRecord`, gi? fallback insert khi DB kh?ng c? `active_supply`.
- Logic upsert gi? NCC v?n ?i qua `upsertProductSupplierPrice` v? `supplierCostService`.

### Validation

- [x] `node --check` cho c?c file orders/products/supplies ?? ch?m.
- [x] `git diff --check`
- [x] `cd backend; npx jest tests/jest/domains/orders/createOrder.integration.test.js tests/jest/domains/supplier-change/service.test.js tests/jest/services/pricingCoreNormalizers.test.js --runInBand`

### R?i Ro C?n L?i

- M?t s? docs c? v?n nh?c `supplierDebt.js`/`finders.js`; ?? ghi log x?a alias, c? th? d?n docs l?ch s? ? slice documentation ri?ng n?u c?n.

## 2026-06-26 - Orders/Products - Product Variant Capability Cutover

### M?c Ti?u

- T?ch logic resolve/create variant kh?i orders catalog sang owner `products`.
- X?a orders catalog helper sau khi caller runtime ?? cutover h?t.

### Source-Of-Truth

| Tr?ch nhi?m | H?m/File ch?nh | H?m/File duplicate/patch | Quy?t ??nh |
| --- | --- | --- | --- |
| Resolve/create product variant | `backend/src/domains/products/services/productVariantService.js` | `orders/controller/helpers/catalog.js` | consolidate |
| Supplier cost ensure | `backend/src/domains/supplies/services/supplierCostService.js` | `orders/controller/helpers/catalog.js` | consolidate |

### Thay ??i

- Th?m `ensureVariantRecord` v? `resolveProductToVariantId` v?o `productVariantService.js`.
- `createOrder.js` v? `orderUpdateService.js` g?i tr?c ti?p capability products/supplies thay v? qua catalog helper.
- X?a `backend/src/domains/orders/controller/helpers/catalog.js` v? kh?ng c?n caller runtime.

### Contract Gi? Nguy?n

- API route/response kh?ng ??i.
- Logic t?o variant m?i v?n insert product + desc_variant + variant + margins nh? c?.
- Logic supplier cost ensure v?n skip n?u input kh?ng h?p l?.

### Validation

- [x] `node --check backend/src/domains/products/services/productVariantService.js`
- [x] `node --check backend/src/domains/supplies/services/supplierCostService.js`
- [x] `node --check backend/src/domains/orders/controller/helpers.js`
- [x] `node --check backend/src/domains/orders/controller/crud/createOrder.js`
- [x] `node --check backend/src/domains/orders/controller/crud/updateOrder.js`
- [x] `node --check backend/src/domains/orders/controller/orderUpdateService.js`
- [x] `git diff --check`
- [x] `cd backend; npx jest tests/jest/domains/orders/createOrder.integration.test.js tests/jest/domains/supplier-change/service.test.js tests/jest/services/pricingCoreNormalizers.test.js --runInBand`

### R?i Ro C?n L?i

- `orders/controller/helpers.js` hi?n ch? c?n normalize/write payload exports; c?c capability product/supplier ?? r?i kh?i helper barrel.

## 2026-06-26 - Frontend Product Info - Product Description API Owner

### Muc Tieu

- Move product description API client out of global `frontend/src/lib`.
- Keep public HTTP routes and response mapping unchanged.

### Source-Of-Truth

| Responsibility | Main file | Legacy file | Decision |
| --- | --- | --- | --- |
| Product description API client | `frontend/src/features/product-info/api/productDescApi.ts` | `frontend/src/lib/productDescApi.ts` | move to feature owner |

### Thay Doi

- Created `frontend/src/features/product-info/api/productDescApi.ts` with the same API functions/types.
- Updated all `product-info` imports to use the feature-local API path.
- Deleted `frontend/src/lib/productDescApi.ts` because no runtime caller remains.

### Contract Giu Nguyen

- API paths stay unchanged: `/api/product-descriptions*`.
- Type exports and function names stay unchanged for product-info callers.
- UI behavior is unchanged.

### Validation

- [x] `rg "@/lib/productDescApi" frontend/src` returns no runtime callers.
- [x] `cd frontend; npm run build`
- [x] `git diff --check`

## 2026-06-26 - Frontend Shared Pricing Primitive

### Muc Tieu

- Remove cross-feature import from `bill-order` to `features/pricing/utils`.
- Keep pricing feature compatibility for existing pricing callers.

### Source-Of-Truth

| Responsibility | Main file | Legacy/caller | Decision |
| --- | --- | --- | --- |
| Direct value or fallback pricing primitive | `frontend/src/shared/utils/pricing.ts` | `frontend/src/features/pricing/utils.ts`, `frontend/src/features/bill-order/index.tsx` | move generic primitive to shared |

### Thay Doi

- Added `resolveDirectNumberOrFallback` and `multiplyValue` to shared pricing utils.
- `bill-order` imports `multiplyValue` from shared instead of pricing feature.
- `features/pricing/utils.ts` re-exports `multiplyValue` to keep pricing callers unchanged.

### Contract Giu Nguyen

- `multiplyValue(value, ratio)` behavior stays unchanged.
- No UI/API behavior change.

### Validation

- [x] `cd frontend; npm run build`
- [x] `git diff --check`

## 2026-06-26 - Frontend Product Info - Image Upload Modal Split

### Muc Tieu

- Reduce size of `ImageUpload.tsx` without changing UI behavior.
- Keep image picker modal as a focused presentational component inside `product-info`.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Product image picker modal | `frontend/src/features/product-info/components/EditProductModal/ImagePickerModal.tsx` | Inline inside `ImageUpload.tsx` | extract component |

### Thay Doi

- Extracted `ImagePickerModal` into its own component file.
- `ImageUpload.tsx` now owns preview/upload/delete state and renders the modal component.
- No API, route, or visual behavior change intended.

### Validation

- [x] `cd frontend; npm run build`
- [x] `git diff --check`

## 2026-06-26 - Frontend Product Info - Variant Content Actions Hook

### Muc Tieu

- Reduce `VariantContentView.tsx` by moving edit/view/create/delete orchestration out of render component.
- Keep table UI and modal behavior unchanged.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Variant content modal/action state | `frontend/src/features/product-info/views/variant-content-view/useVariantContentActions.ts` | `VariantContentView.tsx` | extract hook |

### Thay Doi

- Added `useVariantContentActions` for edit/view/create/delete state and save/delete API calls.
- `VariantContentView.tsx` now focuses on data table rendering and passes actions to modal/table controls.

### Validation

- [x] `cd frontend; npm run build`
- [x] `git diff --check`

## 2026-06-26 - Frontend Product Info - Product Image Picker Modal Split

### Muc Tieu

- Reduce `ProductImagePicker.tsx` by extracting the image picker modal UI.
- Keep product image upload/select/delete behavior unchanged.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Product image picker modal | `frontend/src/features/product-info/components/ProductImagePickerModal.tsx` | Inline inside `ProductImagePicker.tsx` | extract component |

### Thay Doi

- Extracted `ProductImagePickerModal` into a focused presentational component.
- `ProductImagePicker.tsx` now keeps server image state and delegates modal rendering.

### Validation

- [x] `cd frontend; npm run build`
- [x] `git diff --check`


## 2026-06-26 - Frontend Product Info - Desc Variant Content Fields

### Muc Tieu

- Remove duplicated editor/SEO layout between create and edit desc variant modals.
- Keep each modal owning its own form state and submit flow.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Desc variant rich content editor fields | `frontend/src/features/product-info/components/DescVariantContentFields.tsx` | Inline in create/edit desc variant modals | extract feature-local presentational component |

### Thay Doi

- Added `DescVariantContentFields` for short description, rules editor, description editor and SEO preview layout.
- Updated `CreateDescVariantModal.tsx` and `DescVariantEditModal.tsx` to reuse the component without changing submit/state ownership.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-26 - Frontend Product Info - Category Tag Card Split

### Muc Tieu

- Reduce `CategoryTagManager.tsx` by extracting the category display/delete action card.
- Keep add/edit form state and CRUD orchestration in the manager component.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Product category tag display card | `frontend/src/features/product-info/components/CategoryTagCard.tsx` | Inline in `CategoryTagManager.tsx` | extract feature-local presentational component |

### Thay Doi

- Added `CategoryTagCard` for color preview, display metadata, edit action and delete confirmation controls.
- Updated `CategoryTagManager.tsx` to delegate item rendering while preserving existing state handlers.

### Validation

- [x] `cd frontend; npm run build`
- [x] `git diff --check`


## 2026-06-26 - Frontend Product Info - Product Row Component Split

### Muc Tieu

- Reduce `ProductRow.tsx` and remove repeated expanded-row HTML normalization.
- Keep row click, expand, edit and delete-button behavior unchanged.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Product row avatar | `frontend/src/features/product-info/components/ProductAvatar.tsx` | Inline in `ProductRow.tsx` | extract component |
| Product row action buttons | `frontend/src/features/product-info/components/ProductRowActions.tsx` | Inline in `ProductRow.tsx` | extract component |
| Product expanded row details | `frontend/src/features/product-info/components/ProductRowExpandedDetails.tsx` | Inline in `ProductRow.tsx` | extract component |

### Thay Doi

- `ProductRow.tsx` now computes display HTML once and passes it to expanded details.
- Extracted avatar, action buttons and expanded details into feature-local components.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-26 - Frontend Product Info - Category Tag Form Reuse

### Muc Tieu

- Remove duplicated add/edit category form markup in `CategoryTagManager.tsx`.
- Keep category create/update/delete state and hook ownership in the manager.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Category add/edit form UI | `frontend/src/features/product-info/components/CategoryTagForm.tsx` | Inline in `CategoryTagManager.tsx` | extract feature-local form component |

### Thay Doi

- Added `CategoryTagForm` shared by add and edit modes.
- `CategoryTagManager.tsx` now coordinates state/actions and delegates form rendering.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-26 - Frontend Product Info - Edit Category Modal Split

### Muc Tieu

- Reduce `EditCategoryModal.tsx` by moving tab, footer and category selection UI out of the modal orchestration.
- Keep modal tabs, save/cancel actions, package edit and category selection behavior unchanged.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Category selection chips | `frontend/src/features/product-info/components/CategorySelectionGrid.tsx` | Inline in `EditCategoryModal.tsx` | extract component |
| Edit category modal tabs | `frontend/src/features/product-info/components/EditCategoryModalTabs.tsx` | Inline in `EditCategoryModal.tsx` | extract component |
| Edit category modal footer | `frontend/src/features/product-info/components/EditCategoryModalFooter.tsx` | Inline in `EditCategoryModal.tsx` | extract component |

### Thay Doi

- `EditCategoryModal.tsx` now coordinates modal state and delegates large UI sections.
- No API, route, or visible behavior change intended.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-27 - Frontend Product Info - Variant Content Table Split

### Muc Tieu

- Reduce `VariantContentView.tsx` by moving table/card/action rendering out of the view container.
- Keep desc_variant list, mobile cards, pagination and modal actions behavior unchanged.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Variant content table/card/action rendering | `frontend/src/features/product-info/views/variant-content-view/VariantContentTable.tsx` | Inline in `VariantContentView.tsx` | extract view-local component |

### Thay Doi

- Added `VariantContentTable` with table rows, mobile cards, preview text and row actions.
- `VariantContentView.tsx` now focuses on data loading, pagination state and modal orchestration.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-27 - Frontend Product Info - Image Upload Surface Split

### Muc Tieu

- Reduce `ImageUpload.tsx` by moving preview/dropzone UI out of upload orchestration.
- Keep server picker, upload, delete, drag/drop and preview refresh behavior unchanged.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Image upload preview/dropzone surface | `frontend/src/features/product-info/components/EditProductModal/ImageUploadSurface.tsx` | Inline in `ImageUpload.tsx` | extract component |

### Thay Doi

- Added `ImageUploadSurface` for preview, empty/dropzone and overlay actions.
- `ImageUpload.tsx` now owns API state and delegates display surface rendering.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-27 - Frontend Product Info - Product Description API Contract Split

### Muc Tieu

- Reduce `productDescApi.ts` by separating API contracts and response normalization from request functions.
- Keep existing import path and exported function/type names compatible for callers.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Product description API types | `frontend/src/features/product-info/api/productDescTypes.ts` | `productDescApi.ts` | extract contract file |
| Product description response normalizer | `frontend/src/features/product-info/api/productDescNormalizer.ts` | `productDescApi.ts` | extract feature API normalizer |
| Product description API request functions | `frontend/src/features/product-info/api/productDescApi.ts` | same file | keep public API owner |

### Thay Doi

- Added `productDescTypes.ts` for all product description API interfaces/types.
- Added `productDescNormalizer.ts` for saved product description response normalization.
- `productDescApi.ts` re-exports the same public types and keeps all request functions at the same import path.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-27 - Frontend Product Info - Category Table Row Split

### Muc Tieu

- Reduce `CategoryTable.tsx` by moving package row, action buttons and expanded package items into a focused row component.
- Keep expand/collapse, edit action, image cache-busting and pagination behavior unchanged.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Category package table row | `frontend/src/features/product-info/components/CategoryTableRow.tsx` | Inline in `CategoryTable.tsx` | extract component |

### Thay Doi

- Added `CategoryTableRow` for row display, category pills, image thumb and expanded items.
- `CategoryTable.tsx` now owns expanded row state and pagination only.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-27 - Frontend Product Info - Product Description API Subdomain Split

### Muc Tieu

- Reduce `productDescApi.ts` by moving image and SEO endpoints into focused API files.
- Keep all existing public imports from `productDescApi.ts` working through re-exports.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| Product description SEO audit API | `frontend/src/features/product-info/api/productDescSeoApi.ts` | `productDescApi.ts` | extract endpoint group |
| Product description image API | `frontend/src/features/product-info/api/productDescImageApi.ts` | `productDescApi.ts` | extract endpoint group |
| Product description CRUD/list API | `frontend/src/features/product-info/api/productDescApi.ts` | same file | keep public API owner |

### Thay Doi

- Added `productDescSeoApi.ts` for `auditProductSeo`.
- Added `productDescImageApi.ts` for image upload/list/delete endpoints.
- `productDescApi.ts` re-exports the extracted functions to preserve caller contracts.

### Validation

- [x] `cd frontend; npm run build`


## 2026-06-27 - Frontend Shared HTML Capability

### Muc Tieu

- Establish `shared/html` as the source-of-truth for generic HTML/text conversion helpers.
- Stop duplicating HTML helpers across feature folders while keeping feature-specific product rules local.

### Source-Of-Truth

| Responsibility | Main file | Previous location | Decision |
| --- | --- | --- | --- |
| HTML sanitize/display helpers | `frontend/src/shared/html/sanitize.ts` | `product-info/utils/productInfoHelpers/htmlSanitize.ts` | move to shared capability |
| HTML normalize/save helpers | `frontend/src/shared/html/normalize.ts` | `product-info/utils/productInfoHelpers/htmlNormalize.ts` | move to shared capability |
| Plain text to HTML primitive | `frontend/src/shared/html/plain.ts` | `product-info/utils/productInfoHelpers/basic.ts` | move to shared capability |
| Product-info compatibility exports | `frontend/src/features/product-info/utils/productInfoHelpers/htmlSanitize.ts`, `htmlNormalize.ts`, `basic.ts` | same files | keep re-export wrappers temporarily |

### Thay Doi

- Added `frontend/src/shared/html` with `sanitize`, `normalize`, `plain` and `index` exports.
- Updated product-info components/helpers to import generic HTML utilities from `@/shared/html`.
- Updated product-price quote formatting to reuse `htmlToPlainText` from `@/shared/html` instead of defining its own copy.
- Kept product-specific helpers such as product key normalization, variant image resolution and merge rules inside `product-info`.

### Validation

- [x] `cd frontend; npm run build`


## Frontend Shared Number/Money Capability
- Added `frontend/src/shared/number` for generic finite-number parsing, positive-int parsing, and clamping primitives.
- Moved VND formatting source-of-truth into `frontend/src/shared/money` while keeping `frontend/src/shared/utils/money.ts` as a compatibility re-export.
- Updated shared pricing ratio helpers to reuse `shared/number` instead of maintaining a private duplicate numeric normalizer.
- Preserved existing public exports through `@/shared/utils` and direct money imports.


## Frontend Shared Money Input Primitives
- Added generic integer/decimal money input parsing and draft formatting under `frontend/src/shared/money/input.ts`.
- Converted shop-bank and USDT wallet money helpers into compatibility aliases over shared money primitives.
- Reused signed integer money parsing in supply helpers instead of keeping a local parser clone.


## Frontend Shared Date Capability
- Moved date source-of-truth from `frontend/src/shared/utils/date.ts` into `frontend/src/shared/date/calendar.ts`.
- Kept `frontend/src/shared/utils/date.ts` as a compatibility re-export so existing `@/shared/utils` imports continue to work.
- Preserved existing date parsing/formatting behavior without touching UI flows or database code.


## Frontend Supply Domain Capability
- Moved supplier identity/import-price rules into `frontend/src/features/supply/utils/supplierRules.ts`.
- Updated Create/Edit order flows to call the supply domain capability directly instead of `shared/utils/supply`.
- Kept `frontend/src/shared/utils/supply.ts` as a temporary compatibility re-export for older imports.


## Frontend Shared VietQR Capability
- Moved VietQR/Sepay image URL builder into `frontend/src/shared/vietqr/imageUrl.ts`.
- Kept `frontend/src/shared/utils/sepay.ts` as a compatibility re-export.
- Updated order payment QR and supply payment helpers to import from the explicit VietQR capability.


## Frontend Order Status Domain Capability
- Moved order status color/priority metadata into `frontend/src/features/orders/status/orderStatusMeta.ts`.
- Updated order list, order row, and order detail views to call the orders status capability directly.
- Kept `frontend/src/shared/utils/status.ts` as a compatibility re-export for older aggregate helper imports.


## Frontend Shared HTTP Capability
- Moved `readJsonOrText` into `frontend/src/shared/http/responseBody.ts` as the source-of-truth for response body parsing.
- Kept `frontend/src/shared/utils/response.ts` as a compatibility re-export for existing aggregate helper imports.


## Frontend Dashboard/Supply Capability Imports
- Replaced aggregate `@/shared/utils` usage in dashboard and supply files with explicit imports from `shared/money`, `shared/date`, and `shared/vietqr`.
- Preserved existing formatting/date/QR behavior while making dependencies capability-based instead of catch-all helper based.


## Frontend Create Order Capability Imports
- Replaced CreateOrderModal aggregate shared helper imports with explicit `shared/date` and `shared/money` imports.
- Preserved existing create-order date derivation, expiry calculation, and currency display behavior.


## Frontend Shared Pricing Capability
- Moved pricing ratio helpers from `frontend/src/shared/utils/pricing.ts` into `frontend/src/shared/pricing/ratio.ts`.
- Updated bill-order, pricing, and product-price utilities to import pricing helpers from `@/shared/pricing`.
- Kept `frontend/src/shared/utils/pricing.ts` as a compatibility re-export.


## Frontend Remaining Utility Import Cleanup
- Replaced aggregate shared helper imports in order, invoice, supplier modal, edit-order, renew-adobe, and package-product files with explicit capability imports.
- Routed supplier-related types through the supply domain capability instead of `shared/utils`.
- Preserved existing money/date/VietQR behavior and kept compatibility wrappers for any external imports.


## Frontend Lib Helper Cleanup
- Removed leftover unused aggregate helper imports from order row and wallet withdraw modal.
- Updated `frontend/src/lib/pricingApi.ts` to call `readJsonOrText` from `@/shared/http` directly instead of going through `lib/helpers`.


## Frontend Invoices Pagination Split
- Extracted invoice pagination rendering into `frontend/src/features/invoices/components/InvoicesPagination.tsx`.
- Reduced `frontend/src/features/invoices/index.tsx` by moving presentational pagination JSX out of the page container.
- Preserved existing paging state and table filtering behavior.


## Frontend Invoices Pagination Hook
- Extracted invoice pagination calculation/state switching into `frontend/src/features/invoices/hooks/useInvoicesPagination.ts`.
- Kept `frontend/src/features/invoices/index.tsx` focused on page orchestration while preserving receipt/out-of-flow separate page state.


## Frontend Invoices Data Hook
- Extracted payment receipt and matchable order loading into `frontend/src/features/invoices/hooks/useInvoiceReceipts.ts`.
- Removed fetch/normalization workflow from `frontend/src/features/invoices/index.tsx` while preserving reconciliation state updates through `setReceipts`.


## Frontend Invoices Derivation Hook
- Extracted invoice filtering, stats, and category counts into `frontend/src/features/invoices/hooks/useInvoiceDerivations.ts`.
- Kept `frontend/src/features/invoices/index.tsx` focused on state orchestration and actions.


## Frontend Orders Pagination Utility Split
- Moved order pagination helpers into `frontend/src/features/orders/utils/orderPagination.ts`.
- Updated `useOrdersList` to import pagination helpers from the focused order pagination module.
- Reduced `orderListTransform.ts` to transformation/stat responsibilities only.

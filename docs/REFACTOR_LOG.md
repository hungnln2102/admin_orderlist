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

- Thêm `findSupplierCostPrice`, `findMaxSupplierCostPrice`, `upsertSupplierCostPrice` trong domain `supplies`.
- `pricing/orderPricingService.js` dùng service cho latest supplier cost và max supplier cost.
- `supplier-change/repository.js` delegate `findSupplyPriceForVariant` sang service nhưng giữ export để test/caller cũ không đổi.
- `orders/helpers/catalog.js` và `products/controller/finders.js` dùng service upsert thay vì tự query/insert/update `supplier_cost`.

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

# Refactor Tasks - `admin_orderlist`

Mục đích: file task thực thi refactor chi tiết, tập trung dọn code sạch, sửa root cause trong hàm/module chính, xóa duplicate/workaround và giữ nguyên behavior public.

> Ngày lập: 2026-06-25  
> Trạng thái: đang thực thi incremental refactor.
> Sync gần nhất: 2026-06-30 - đã tách guardrail khỏi task còn mở và đồng bộ các frontend slice đã hoàn thành.
> Nguyên tắc: không gom/xóa code chỉ vì trùng tên; phải trace caller, contract và runtime dependency trước.

## 0. Luật Làm Việc Cho Mọi Task

> Guardrail đang áp dụng cho mọi slice, không tính là task còn mở.

- Mỗi task chỉ chạm một domain/feature hoặc một cụm helper có contract rõ.
- Trước khi sửa code, ghi source-of-truth vào `docs/REFACTOR_LOG.md`.
- Nếu chạm route/API, cập nhật `docs/API_CONTRACTS.md` trước hoặc cùng task.
- Nếu chạm luồng UI/API chính, đánh dấu checklist liên quan trong `docs/SMOKE_CHECKLIST.md`.
- Không tạo thêm hàm `new`, `old`, `v2`, `fixed`, `temp`, `helper2` để né hàm cũ.
- Nếu phát hiện hàm vá lỗi trước đây, merge logic đúng về hàm chính hoặc ghi rõ wrapper tương thích và điều kiện xóa.
- Không đổi public route, API path, response shape, query param, enum/status hoặc UI/UX nếu chưa có migration task riêng.
- Sau mỗi task, chạy validation nhỏ nhất có thể: `node --check`, unit test, script helper hoặc smoke test thủ công.



## 0A. Rule Chống Phình Helper/Service

> Guardrail đang áp dụng cho mọi slice, chi tiết contract nằm ở `docs/refactor-rebuild/SHARED_CONTRACTS.md`.

- Không tạo `normalizers.js`, `helpers.js`, `utils.js` mặc định cho mỗi domain.
- Helper generic dùng bởi 2+ domain phải đưa về `backend/src/shared/<contract>` hoặc `frontend/src/shared/<contract>`.
- Rule nghiệp vụ dùng bởi nhiều luồng phải nằm trong domain service/repository owner, ví dụ product/pricing/supplier service, không copy vào từng controller/page.
- Một domain capability có thể được gọi từ nhiều luồng khác; không vì caller mới mà khởi tạo lại query/calculation/helper song song.
- Domain helper chỉ giữ contract riêng của domain và phải có tên cụ thể như `paymentSlotInputs.js`, `shopBankInputs.js`, `usdtWalletInputs.js`.
- Trước khi tạo file mới, tìm source-of-truth hiện có trong domain owner.
- Nếu một luồng khác cần sản phẩm/NCC/giá bán/giá nhập, gọi domain service/repository tương ứng thay vì khởi tạo lại query/calculation.

## 1. Phase A - Baseline Và Inventory Thực Thi

Mục tiêu: biết hiện trạng trước khi refactor sâu, tránh sửa một nơi rồi vá tiếp nơi khác.

- [x] A1. Chạy baseline command hiện có và ghi lỗi sẵn có vào `docs/REFACTOR_LOG.md`.
  - Gợi ý: `npm run lint:frontend`, `npm run build:frontend`, `npm run test:frontend` nếu chạy được.
  - Gợi ý: `npm run lint:backend`, `npm run test:backend` nếu repo có script ổn định.
  - Sync 2026-06-30: các slice gần nhất đã ghi validation `git diff --check` và `cd frontend; npm run build` vào `docs/REFACTOR_LOG.md`; backend test chỉ chạy theo domain khi backend được chạm.
- [x] A2. Lập danh sách route/API thật cho `orders`, `payment-slots`, `wallet`, `shop-bank-accounts`, `usdt-wallets` trong `docs/API_CONTRACTS.md`.
- [x] A3. Chạy duplicate scan có kiểm soát và cập nhật findings vào `docs/refactor-rebuild/CLEAN_CODE_AUDIT.md`.
- [x] A4. Chọn source-of-truth cho từng cụm duplicate trước khi sửa code.
- [x] A5. Cập nhật `docs/refactor-rebuild/CODE_INVENTORY.md` cho các file đã audit: `keep`, `migrate`, `merge`, `deprecated`, `delete`.

## 2. Phase B - Backend Money/Ledger Clean Code

Mục tiêu: dọn các duplicate helper liên quan tiền/tài khoản trước, vì đây là vùng rủi ro cao nhất.

### B1. Payment Slots Normalizers

Trạng thái: `in-progress`.

- [x] B1.1. Xác định `payment-slots` cần exact numeric amount, không dùng integer VND parser.
- [x] B1.2. Tạo helper domain-local tên rõ contract `backend/src/domains/payment-slots/helpers/paymentSlotInputs.js`.
- [x] B1.3. Chuyển `openPaymentSlot.js` sang dùng `normalizeExactAmount` và `normalizeAccount`.
- [x] B1.4. Chuyển `resolveOrderByExpectedAmount.js` sang dùng cùng helper.
- [x] B1.5. Chạy `node --check` cho các file đã chạm.
- [ ] B1.6. Khi có điều kiện, chạy smoke webhook/payment slot matching theo `docs/payment-slot-suffix-matching.md`.

### B2. Shop Bank Accounts Normalizers

- [x] B2.1. Audit `backend/src/domains/shop-bank-accounts/repositories/shopBankReceiptTotalsRepository.js` và `validators/shopBankAccountValidator.js`.
- [x] B2.2. So sánh contract `normalizeAccountNumber`: có trim/remove space/leading zero khác nhau không.
- [x] B2.3. Chọn source-of-truth domain-local cho account number normalization.
- [x] B2.4. Chuyển repository/validator sang helper chung nếu contract giống nhau.
- [x] B2.5. Audit `normalizeOptionalText` trong shop-bank use-case/validator.
- [x] B2.6. Chạy syntax check và helper validation; smoke ledger/balance thủ công chưa chạy.

### B3. USDT Wallet Normalizers

- [x] B3.1. Audit `backend/src/domains/usdt-wallets/validators/usdtWalletValidator.js` và `use-cases/recordUsdtWalletWithdrawal.js`.
- [x] B3.2. So sánh `normalizeBoolean` và `normalizeOptionalText` với shop-bank.
- [x] B3.3. Chỉ đưa vào shared validation nếu contract thật sự generic và dùng bởi cả bank + USDT.
- [x] B3.4. Nếu rule khác domain, đổi tên helper rõ domain thay vì gom shared.
- [x] B3.5. Chạy syntax check và helper validation; smoke withdrawal/deposit thủ công chưa chạy.

### B4. Integer VND Parser

- [x] B4.1. Audit các bản `normalizeMoney` trong finance/payment/pricing.
- [x] B4.2. Tạo fixture so sánh: number, string có comma, string có `VND`, decimal, null, invalid.
- [x] B4.3. Chọn tên rõ contract: `normalizeIntegerVndAmount`, không dùng tên mơ hồ `normalizeMoney` ở shared.
- [x] B4.4. Refactor cụm nhỏ: `dashboardPaymentPostingPolicy.js` và `payments/controller/shared/helpers.js` giữ export tương thích.
- [x] B4.5. Không chạm `pricing/core.js`; đã thêm baseline test cho pricing-specific parser/calculation helpers.

## 3. Phase C - Backend Orders/Finance Root Cause

Mục tiêu: giảm controller dày và bỏ các hàm vá quanh create/payment/refund.

### C1. Orders Create Flow

- [x] C1.1. Ghi contract tạo đơn vào `docs/API_CONTRACTS.md`.
- [x] C1.2. Audit `backend/src/domains/orders/controller/crud/createOrder.js`; đã xử lý helper tháng và error response root-cause nhỏ.
- [ ] C1.3. Chọn source-of-truth cho create order validation.
- [ ] C1.4. Chọn source-of-truth cho payment amount/key allocation.
- [x] C1.5. Tách pure helper tháng sang source-of-truth `monthKeyFromVietnamYmd`, giữ route/response.
- [x] C1.6. Chạy focused Jest create order + month key tests.

### C2. Manual Completion Và Refund

- [x] C2.1. Audit `manualWebhookCompletion.js`, `manualUsdtCompletion.js`, `refundCreditRoutes.js`; đã xử lý sub-slice refund money helper.
- [x] C2.2. Tìm duplicate completion/refund logic; đã gom duplicate refund non-negative money parser, completion flow còn cần slice riêng.
- [x] C2.3. Chốt idempotency key và transaction boundary: manual completion lock order row `FOR UPDATE`; refund cashout ledger dedupe theo `refund_credit_note + creditId`.
- [x] C2.4. Tách controller route mỏng cho manual webhook/USDT; use-case chính giữ nguyên để không đổi transaction flow.
- [x] C2.5. Đảm bảo refund không tạo double transaction bằng test idempotency `debitShopBankRefundCashout`.
- [x] C2.6. Ghi smoke checklist payment/refund vào `docs/SMOKE_CHECKLIST.md`.

### C3. Dashboard Finance Summary

- [x] C3.1. Ghi baseline query bằng focused test SQL/bindings trước khi sửa query runtime.
- [x] C3.2. Audit `dashboardSummary.js`, `dailyRevenueSummaryBackfill/sqlBuilder.js`.
- [x] C3.3. Tách query repository cho daily revenue summary backfill (`queryRepository.js`).
- [x] C3.4. Không vá frontend chart; chỉ tách backend query boundary, giữ SQL builder output.
- [x] C3.5. Chạy focused Jest cho query repository/month key; smoke UI dashboard thủ công chưa chạy.

## 4. Phase D - Renew Adobe/Fix ADES Clean Code

Mục tiêu: xóa flow vá song song, tách controller/use-case/adapter rõ ràng.

- [x] D1. Audit duplicate `normalizeEmail` trong `renew-adobe`, `fix-ades`, `orderUserTrackingService`.
- [x] D2. Chọn `backend/src/domains/renew-adobe/helpers/email.js` làm source-of-truth email normalization/assertion.
- [x] D3. Audit `normalizeCheckResultForRenewFlow` trong `fix-ades/routes.js` và `renew-adobe/controller/publicFixAdes.js`.
- [x] D4. Tách mapper check result vào `backend/src/domains/fix-ades/helpers/renewFlowResult.js` và dùng lại ở admin/public flow.
- [x] D5. Audit `checkAccounts.js`, `batchUsers.js`, `publicFixAdes.js` để xác định flow chính và patch flow; ghi tại `RENEW_ADOBE_FLOW_AUDIT.md`.
- [ ] D6. Tách `adobe-renew-v2/facade.js` thành login, account lookup, renew action, post-check.
- [ ] D7. Đảm bảo scheduler chỉ gọi use-case chính, không chứa logic nghiệp vụ chi tiết.

## 5. Phase E - Frontend Feature Clean Code

Mục tiêu: dọn các helper/component/modal được viết thêm để vá UI thay vì sửa source-of-truth.

### E1. Orders Frontend

- [ ] E1.1. Audit `frontend/src/features/orders/utils/orderListTransform.ts`.
- [ ] E1.2. Tìm mapper/normalize duplicate với `CreateOrderModal`, `EditOrderModal`, `bill-order`.
- [ ] E1.3. Chọn source-of-truth cho order DTO -> view model.
- [ ] E1.4. Di chuyển modal order global về feature owner bằng wrapper tương thích nếu cần.
- [x] E1.5. Giữ nguyên props public của modal.

### E2. Invoices/Receipts

- [ ] E2.1. Audit `frontend/src/features/invoices/index.tsx` và `ReceiptsTable.tsx`.
- [ ] E2.2. Chọn source-of-truth cho receipt status/action/QR mapping.
- [ ] E2.3. Tách table columns/actions/status badge sau khi gom mapper.
- [ ] E2.4. Không vá response backend bằng nhiều mapper rời nếu backend contract có thể chuẩn hóa.

### E3. Pricing/Product

- [ ] E3.1. Audit `frontend/src/features/pricing/utils.ts` và `backend/src/services/pricing/core.js` cùng lúc. Frontend `utils.ts` đã là compatibility barrel; backend `core.js` vẫn cần audit/test trước khi tách.
- [ ] E3.2. Chốt backend hay frontend là source-of-truth cho calculation nào.
- [x] E3.3. Tách pricing calculation, product mapping, display formatting.
- [x] E3.4. Audit `frontend/src/lib/productDescApi.ts`; chuyển về product owner nếu không generic.
- [x] E3.5. Tách `VariantContentView.tsx` và `ImageUpload.tsx` theo hook/section/component.

## 5A. Phase E-BE - Backend Product/NCC/Pricing Capability

Mục tiêu: gom các rule sản phẩm, NCC, giá bán, giá nhập thành capability có owner rõ để nhiều luồng gọi lại, thay vì mỗi controller/page tự query hoặc tự tính.

### E-BE1. Product Lookup Capability

- [ ] E-BE1.1. Audit mọi nơi backend đọc product/variant/product-desc/package bằng `rg "product|variant|productDesc|desc_variant|package_product" backend/src`.
- [ ] E-BE1.2. Chọn owner cho product lookup, ưu tiên `backend/src/domains/products` nếu đã có; nếu chưa có thì lập migration task từ service legacy sang domain.
- [ ] E-BE1.3. Tách service/repository lookup sản phẩm dùng chung cho create order, pricing, warehouse/supply nếu cùng contract.
- [ ] E-BE1.4. Giữ mapper response/API của từng flow ở domain caller; service product chỉ trả contract dữ liệu sản phẩm rõ ràng.

### E-BE2. Supplier/NCC Capability

- [x] E-BE2.1. Audit mọi nơi đọc NCC/supplier/import cost/payment bằng `rg "supplier|NCC|ncc|cost|import" backend/src/domains backend/src/services`.
- [x] E-BE2.2. Chọn owner `supplies` cho supplier lookup; supplier cost/payment rules vẫn tách sau theo slice riêng.
- [x] E-BE2.3. Caller khác như orders/dashboard/wallet chỉ gọi service/repository owner, không tự query bảng supplier trực tiếp nếu logic đã thuộc supplies. Supplier lookup trong orders/products/pricing đã cutover qua `supplierLookupService.js`; mutation/cost còn tách riêng.
- [x] E-BE2.4. Tách supplier cost/import price capability trước; payment/mutation phức tạp còn tách theo slice riêng nếu cần.

### E-BE3. Pricing Capability

- [ ] E-BE3.1. Bổ sung baseline test cho calculation chính trước khi tách `backend/src/services/pricing/core.js`.
- [ ] E-BE3.2. Phân biệt rõ shared money primitive với pricing parser/rule nghiệp vụ; không gom parser pricing vào `shared/money` nếu contract khác.
- [ ] E-BE3.3. Tạo/củng cố pricing service owner để orders/frontend pricing/supplier cost cùng gọi một nguồn tính giá.
- [ ] E-BE3.4. Xóa hoặc deprecate caller-side calculation sau khi đã cutover và có validation.

## 5B. Phase DB - Database Refactor Song Song

Mục tiêu: refactor database song song với source code nhưng theo migration an toàn, không rename/drop trực tiếp. Task chi tiết nằm ở `docs/refactor-rebuild/DATABASE_REFACTOR_TASKS.md`.

- [ ] DB.1. Hoàn thành schema inventory và owner mapping trước khi đổi DB.
- [ ] DB.2. Ưu tiên index/constraint an toàn trước rename/drop.
- [ ] DB.3. Đồng bộ `backend/src/config/dbSchema/*` với migration mới trong cùng PR/slice.
- [ ] DB.4. Với product/NCC/pricing, chỉ enforce constraint sau khi service owner đã cutover.
- [ ] DB.5. Với dashboard/finance, đọc `docs/tong-quan-du-an.md` và chạy query đối soát trước/sau.
- [ ] DB.6. Không drop legacy table/column nếu chưa qua compatibility phase.

## 6. Phase F - Legacy Delete Và Graph Cleanup

Mục tiêu: sau khi code mới ổn định, xóa code cũ có bằng chứng.

- [ ] F1. Với mỗi file/hàm muốn xóa, tìm import bằng `rg`.
- [ ] F2. Kiểm tra route/API/scheduler/job không gọi runtime.
- [ ] F3. Đảm bảo replacement đã giữ cùng contract hoặc caller đã cutover.
- [ ] F4. Cập nhật `CODE_INVENTORY.md` sang `deprecated` hoặc `delete`.
- [ ] F5. Ghi lý do xóa trong `REFACTOR_LOG.md`.
- [ ] F6. Chạy graph lại tại `http://localhost:3000/` nếu công cụ graph đang chạy.
- [ ] F7. So sánh edge/module coupling trước/sau.

## 7. Thứ Tự Thực Thi Đề Xuất Ngay

1. Hoàn thiện `SHARED_CONTRACTS.md` để khóa boundary shared/domain trước khi refactor tiếp.
2. Hoàn thiện `CODE_INVENTORY.md` cho các file đã audit hoặc đã tách.
3. Hoàn thiện `CLEAN_CODE_AUDIT.md` bằng duplicate clusters và source-of-truth decisions.
4. Làm E1 orders frontend mapper/modal ownership.
5. Làm E-BE1/E-BE3 product/pricing owner capability backend.
6. Làm E2 invoices/receipts status/action/QR mapping và table split.
7. Làm D6-D7 Renew Adobe backend facade/scheduler thinning.

## 8. Definition Of Done Cho Một Task

> Definition of Done là checklist kiểm tra cho từng slice, không tính là task tồn đọng toàn cục.

- Source-of-truth đã rõ trong log.
- Duplicate/workaround trong phạm vi task đã merge/deprecate/delete hoặc có lý do giữ lại.
- Không tạo global helper/service catch-all mới.
- Không đổi public behavior.
- Contract/smoke/inventory/log được cập nhật nếu liên quan.
- Validation liên quan đã chạy hoặc ghi rõ lý do chưa chạy.

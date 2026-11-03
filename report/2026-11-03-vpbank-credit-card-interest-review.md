# Rà soát tính lãi thẻ tín dụng VPBank - 2026-11-03

## Phạm vi

- Đối chiếu luồng `DEBT_PAYABLE` được gắn là thẻ tín dụng/nợ mở với tài liệu VPBank hiện hành.
- Kiểm tra dữ liệu đầu vào, cách ước tính nghĩa vụ tháng, cộng dư nợ khi quẹt thẻ, thanh toán dư nợ và test hồi quy hiện có.
- Không sửa code: worktree có thay đổi người dùng tại `frontend/src/features/finance/components/DebtsAndInstallmentsSection.tsx`.

## Nguồn VPBank đã kiểm tra

- Cổng tài liệu VPBank, mục Khách hàng cá nhân, công bố `Biểu phí thẻ tín dụng tại VPBank - Khối Khách hàng cá nhân - Áp dụng từ 19/10/2026`.
  - URL: https://www.vpbank.com.vn/tai-lieu-bieu-mau?path=%2Ftai-lieu-bieu-mau%2Fbieu-phi%2Fkhach-hang-ca-nhan&category=%2Ftai-lieu-bieu-mau%2Fbieu-phi
- PDF biểu phí đang áp dụng từ `19/10/2026`.
  - URL: https://www.vpbank.com.vn/-/media/vpbank-latest/tai-lieu-bieu-mau/bieu-phi/khcn/2026/BIEU-PHI-THE-TIN-DUNG-TAI-VPBANK---KHOI-KHCN-202610.pdf
  - Biểu lãi suất liệt kê mức `3.99%` cho các dòng thẻ cá nhân đang có trong bảng.
  - Phí phạt trả chậm không đồng nhất: phần lớn dòng là `6% dư nợ tối thiểu`, tối thiểu `200.000 VND`, tối đa `1.200.000 VND`; bảng cũng có ngoại lệ theo dòng thẻ.
- Thông báo VPBank ngày `13/10/2026` xác nhận cập nhật biểu phí thẻ tín dụng có hiệu lực từ `19/10/2026`.
  - URL: https://www.vpbank.com.vn/tin-tuc/tin-vpbank/2026/thong-bao-cap-nhat-bieu-phi-the-tin-dung
- Mẫu hợp đồng/cấp hạn mức thẻ VPBank đang công bố nêu ngày sao kê, ngày thanh toán và lãi suất thực hiện theo quy định VPBank; khách hàng có thể đăng ký thanh toán tối thiểu hoặc toàn bộ, và các điều khoản thực tế còn được thông báo qua Thư chào mừng/sao kê.
  - URL: https://www.vpbank.com.vn/-/media/vpbank-latest/tai-lieu-bieu-mau/bieu-mau/khcn/2026/MB01A.PL04.HDM-TD.CV.UL07-Giay-Dang-ky-kiem-Hop-dong-cap-han-muc-tin-dung-the--phat-hanh-va-su-dung-the--mo-va-su-dung-tai-khoan--1-.pdf

## Trạng thái nghiệm thu

**CHƯA NGHIỆM THU** cho yêu cầu "cộng lãi/tính lãi thẻ tín dụng VPBank". Hiện tại sản phẩm chỉ ước tính gánh nợ tháng; không có engine sao kê và cộng lãi có thể đối chiếu với thẻ VPBank thực tế.

## Phát hiện

### P1 - Nhãn UI khẳng định cộng lãi nhưng backend không hề hạch toán lãi

- `frontend/src/features/finance/components/PersonalAssetsModal.tsx:594`-`frontend/src/features/finance/components/PersonalAssetsModal.tsx:660` mô tả "tự động cộng dồn lãi", chạy lúc `18:00`, treo lãi rồi cộng vào ngày đến hạn; UI còn nhận cấu hình `DAILY`/`MONTHLY` và công thức theo năm.
- `backend/src/domains/finance/services/financeHubService.js:187`-`backend/src/domains/finance/services/financeHubService.js:207` chỉ tính một con số dùng cho nghĩa vụ tháng. Không có job 18:00, bảng ledger lãi, trạng thái lãi treo, hay lệnh cập nhật `personal_assets.amount` cho lãi.
- `backend/src/domains/finance/services/financeHubService.js:441`-`backend/src/domains/finance/services/financeHubService.js:460` cũng không đưa `debt_interest_frequency` vào dữ liệu summary; hàm tính ở trên không dùng trường này.
- Rủi ro: UI nói đã cộng lãi trong khi dư nợ thực không đổi; break-even và số dư phải trả bị sai.

### P1 - Quy đổi lãi suất sai đơn vị so với biểu phí thẻ VPBank

- Form bắt nhập `Lãi suất (% / năm)` tại `frontend/src/features/finance/components/PersonalAssetsModal.tsx:632`, lưu dưới tên `debt_annual_interest_rate`.
- Hàm ước tính chia rate cho `12` tại `backend/src/domains/finance/services/financeHubService.js:191`-`backend/src/domains/finance/services/financeHubService.js:197`.
- Biểu phí VPBank hiệu lực `19/10/2026` công bố mức `3.99%` theo từng dòng thẻ, thẻ thực tế phải lấy theo dòng thẻ và thông tin ngân hàng gửi trong Thư chào mừng/sao kê. Không được nhập trực tiếp `3.99` vào trường "năm" rồi chia tiếp `12`; như vậy sẽ hạ thấp chi phí dự kiến xuống 12 lần nếu đó là mức theo kỳ tháng của thẻ.
- Cần thay mô hình rate thành `interest_rate_percent` + `interest_rate_period`/`rate_source`, lưu snapshot từ sao kê; không hard-code một tỷ lệ cho mọi thẻ VPBank.

### P1 - Thiếu mô hình sao kê, miễn lãi và tách gốc/lãi/phí nên không thể tính đúng dư nợ phải trả

- Chỉ có `debt_due_day` tại `frontend/src/features/finance/types.ts:70`-`frontend/src/features/finance/types.ts:77`; không có ngày chốt sao kê, ngày phát sinh từng giao dịch, hạn mức, kỳ miễn lãi, số tiền thanh toán tối thiểu, sản phẩm thẻ hoặc phiên bản biểu phí.
- Khi quẹt thẻ, backend cộng thẳng tiền giao dịch vào một trường `amount` tại `backend/src/domains/finance/services/financeHubService.js:1228`-`backend/src/domains/finance/services/financeHubService.js:1259`. Không thể xác định giao dịch nào thuộc sao kê nào, còn được miễn lãi hay đã bị tính lãi.
- Khi trả nợ, backend trừ toàn bộ số tiền trả khỏi `amount` tại `backend/src/domains/finance/services/financeHubService.js:1158`-`backend/src/domains/finance/services/financeHubService.js:1198`. Không có thứ tự phân bổ cho phí, lãi, gốc; không thể đối chiếu statement.
- Cần thêm card account + card transaction + statement cycle + statement line/ledger. Số dư app chỉ được cập nhật từ các bút toán đã chốt; không dùng một số `amount` để thay cả gốc, lãi và phí.

### P2 - Mức thanh toán tối thiểu và phí trễ hạn đang là giả định, không theo thẻ

- `backend/src/domains/finance/services/financeHubService.js:193`-`backend/src/domains/finance/services/financeHubService.js:197` dùng `max(5% gốc + lãi ước tính, gốc/24)` cho mọi nợ mở. Đây không phải dữ liệu có thể kiểm chứng theo statement VPBank và còn bỏ qua phần lãi/phí đã đến hạn.
- Biểu phí VPBank từ `19/10/2026` có phí phạt trả chậm theo từng dòng thẻ; phần lớn là `6%` của dư nợ tối thiểu với ngưỡng min/max, nhưng có ngoại lệ. Hiện không có cấu hình hay hạch toán khoản phí này.
- Cần lấy `minimum_payment_due` từ statement thực tế hoặc rule có version theo card product; chỉ tính phí chậm sau khi so số đã trả đến ngày đến hạn với mức tối thiểu của statement.

### P2 - Test hiện tại không bảo vệ công thức lãi/sao kê

- `backend/tests/integration/personal_debt_and_receipt_allocation.test.js:21`-`backend/tests/integration/personal_debt_and_receipt_allocation.test.js:117` chỉ xác nhận tiền trả làm giảm dư nợ; có khai báo `24%` nhưng không assert lãi, ngày tính, ngày chốt, tối thiểu hay phí trễ.
- `backend/tests/integration/card_reconciliation_and_direct_borrow.test.js:20`-`backend/tests/integration/card_reconciliation_and_direct_borrow.test.js:118` chỉ xác nhận quẹt thẻ và idempotency tăng gốc/dư nợ.

## ACID và tính đúng nghiệp vụ

| Hạng mục | Trạng thái | Nhận định |
| --- | --- | --- |
| Atomicity quẹt/trả nợ | Pass có điều kiện | `borrowPersonalAsset` có transaction + row lock; `payPersonalAsset` có transaction nhưng không row lock khi đọc dư nợ. |
| Consistency dư nợ thẻ | Risk | Gốc, lãi, phí, thanh toán tối thiểu bị gộp hoặc thiếu hoàn toàn. |
| Isolation | Risk | Thanh toán đồng thời có thể cùng đọc `amount` trước khi update vì `payPersonalAsset` không `FOR UPDATE`. |
| Durability/audit | Risk | Có log giao dịch gốc/trả nợ, nhưng không có immutable ledger lãi/phí hay statement snapshot để tái tính/audit. |

## Điều kiện cần xử lý trước nghiệm thu

1. Xác định phạm vi: chỉ hiển thị **ước tính ngân sách** hoặc tính **sao kê VPBank có thể đối soát**. Nếu là ước tính, đổi toàn bộ nhãn UI để không nói "tự động cộng lãi" và nhập rate theo đúng đơn vị.
2. Nếu tính sao kê: bổ sung dữ liệu thẻ và ledger như nêu ở P1; lấy rate, ngày sao kê, ngày đến hạn, minimum due từ statement/Thư chào mừng của chính thẻ đó.
3. Cài đặt worker idempotent theo kỳ sao kê để chốt lãi/phí; dùng transaction + `FOR UPDATE`, unique idempotency key cho mỗi statement line và phân bổ thanh toán theo quy tắc VPBank được xác nhận.
4. Thêm regression test với statement mẫu: thanh toán toàn bộ trong hạn (không lãi), thanh toán tối thiểu, thanh toán một phần, trả trễ có min/max fee, giao dịch sau ngày sao kê, quẹt/thanh toán đồng thời và rerun worker.
5. Chỉ nghiệm thu sau khi đối chiếu từng dòng (giao dịch, lãi, phí, minimum due, closing balance) với một sao kê VPBank đã ẩn dữ liệu nhạy cảm.

## Kiểm tra đã chạy

- Đọc source và trace đường gọi `calculatePersonalDebtMonthlyPayment`, `borrowPersonalAsset`, `payPersonalAsset` bằng Codebase Knowledge Graph.
- Kiểm tra tĩnh test integration liên quan đến thẻ/nợ.
- Tải và đọc PDF biểu phí VPBank hiện hành cùng mẫu hợp đồng thẻ trên cổng VPBank.
- Không chạy integration test hoặc chỉnh code vì đây là lần review chỉ-đọc và worktree đã có thay đổi người dùng chưa được hợp nhất.

## Bổ sung quy tắc tài khoản cá nhân do Master xác nhận - 2026-11-03

### 1. Thẻ tín dụng VPBank

- Lãi suất: `47.88%/năm` (`3.99%/tháng`), không dùng trường `3.99` như lãi năm.
- Ngày chốt sao kê: ngày `26` hằng tháng theo múi giờ `Asia/Bangkok`.
- Hạn thanh toán: `17:00:00` ngày `10` của tháng kế tiếp. Hạn là **exclusive**: thanh toán lúc `16:59:59.999` là đúng hạn; giao dịch có effective timestamp từ `17:00:00` là trễ hạn.
- Quy tắc miễn lãi: chỉ áp dụng khi có bằng chứng toàn bộ số tiền phải trả theo sao kê đã được ghi nhận trước hạn. Không được suy diễn từ số dư `amount` hiện tại.

### 2. Thấu chi tín chấp VPBank

- Lãi suất: `30%/năm`; ngày sao kê/chốt kỳ là ngày `26` hằng tháng.
- Mốc nghiệp vụ hằng ngày: `17:00:00` theo `Asia/Bangkok`.
- Quy tắc do Master xác nhận: nếu toàn bộ dư nợ thấu chi được thanh toán trước `17:00`, ngày đó không tính lãi; sau `17:00`, phát sinh lãi.
- Quy tắc kỹ thuật đề xuất để triển khai được: mỗi ngày tính theo số dư gốc sau các bút toán có `effective_at < 17:00`; nếu dư nợ cuối cutoff lớn hơn 0 thì ghi một bút toán lãi `principal_at_cutoff * 30 / 100 / day_count_basis`. Không vốn hóa lãi thành gốc hoặc tính lãi trên lãi trừ khi sao kê thực tế thể hiện điều đó.
- Cycle lãi là `[ngày 26 00:00:00, ngày 26 kế tiếp 00:00:00)` theo `Asia/Bangkok`. Ngày `26` chỉ chốt/snapshot tổng lãi ngày trong cycle; VPBank tự động thu lãi vào ngày `03` của tháng sau. Hệ thống chỉ ghi `INTEREST_COLLECTION_SUCCEEDED` khi import được giao dịch ngân hàng thực tế.

### 3. Kết luận đối chiếu nguồn VPBank

- Trang công khai `Vay thấu chi tín chấp online cho Khách hàng trả lương qua tài khoản VPBank` xác nhận đây là sản phẩm thấu chi tài khoản cho khách hàng nhận lương tại VPBank và nêu kỳ hạn công bố `12 tháng`.
- Trang công khai/biểu phí không đủ để xác minh rate `30%`, cutoff `17:00`, phương pháp đếm ngày, thứ tự phân bổ tiền trả hoặc ngày bắt đầu tính lãi của hợp đồng cụ thể. Với hệ thống tài chính, các tham số từ Thư chào mừng, hợp đồng và sao kê của chính tài khoản phải là nguồn sự thật ưu tiên cao hơn tài liệu công khai.
- URL: https://www.vpbank.com.vn/ca-nhan/vay/kh-tra-luong

## Luồng chuẩn đề xuất: VPBank Credit & Overdraft Ledger

### Nguyên tắc bất biến

1. Lưu mọi giao dịch dưới dạng bút toán bất biến có `effective_at` theo `Asia/Bangkok`, `recorded_at`, `source`, `idempotency_key` và chứng từ/statement reference; tuyệt đối không cộng/trừ trực tiếp một cột `amount` rồi mất lịch sử.
2. Tách độc lập `principal`, `interest_accrued`, `interest_posted`, `fee`, `payment` và `adjustment`. Số dư dashboard là phép tổng hợp ledger, không là nguồn ghi chính.
3. Mỗi tài khoản có product rule version. Mọi statement, lãi và phí phải lưu snapshot rule đã áp dụng để tái tính chính xác khi VPBank đổi biểu phí.
4. Dùng `effective_at`, không dùng thời gian server hay cron run time để quyết định đúng/trễ hạn. Worker chạy trễ vẫn phải tái tính theo business time và không được phát sinh lại khi rerun.
5. Tất cả command phát sinh tiền phải chạy trong một transaction, lock account row, unique `idempotency_key`, immutable ledger và outbox event cùng commit.

### Mô hình dữ liệu tối thiểu

| Thực thể | Trường trọng yếu | Mục đích |
| --- | --- | --- |
| `credit_accounts` | `product_kind`, `bank_name`, `timezone`, `statement_day`, `due_day`, `due_time`, `annual_rate`, `rate_period`, `day_count_basis`, `interest_start_policy`, `payment_allocation_policy`, `rule_version` | Cấu hình được version của từng thẻ/thấu chi. |
| `credit_account_transactions` | `account_id`, `transaction_type`, `effective_at`, `principal_delta`, `interest_delta`, `fee_delta`, `statement_id`, `source_reference`, `idempotency_key` | Sổ cái immutable cho chi tiêu, trả tiền, lãi, phí và điều chỉnh. |
| `credit_statements` | `account_id`, `cycle_start_at`, `cycle_close_at`, `due_at`, `opening_balance`, `closing_principal`, `closing_interest`, `closing_fee`, `minimum_due`, `total_due`, `status`, `rule_snapshot` | Snapshot của từng sao kê và bằng chứng đối chiếu. |
| `credit_interest_accruals` | `account_id`, `business_date`, `basis_amount`, `rate_snapshot`, `interest_amount`, `statement_id`, `idempotency_key` | Lãi ngày/chu kỳ tái tính được và không ghi trùng. |
| `credit_payment_allocations` | `payment_transaction_id`, `target_transaction_id`, `bucket`, `amount` | Audit chính xác một khoản trả ngẫu nhiên đã trả vào phí/lãi/gốc nào. |

### Luồng thẻ tín dụng

1. Khi quẹt thẻ: ghi `CARD_SPEND` vào `principal` với thời gian giao dịch/posting thực tế; không ghi lãi ngay.
2. Lúc `26 23:59:59.999 Asia/Bangkok`: worker tạo statement, khóa các giao dịch đã posted trong kỳ, chốt `total_due` và import/lưu `minimum_due` từ statement VPBank.
3. Từ ngày 27 đến `10 16:59:59.999` tháng sau: mọi khoản trả ngẫu nhiên được ghi `PAYMENT` theo `effective_at`, rồi phân bổ theo `payment_allocation_policy` của statement, không tự trừ vào một số tổng.
4. Tại `10 17:00:00`: so `payment_received_before_due` với `total_due`. Nếu đã trả đủ, statement đạt `PAID_IN_FULL` và miễn lãi theo rule tài khoản. Nếu chưa đủ, worker tạo lãi/fee theo rule snapshot và ngày bắt đầu tính lãi đã xác nhận bằng sao kê.
5. Giao dịch sau ngày 26 thuộc statement sau, nhưng việc có được miễn lãi phải do `interest_start_policy` của tài khoản quyết định; không hard-code một giả định từ UI.

### Luồng thấu chi tín chấp

1. Khi số dư tài khoản xuống âm: ghi `OVERDRAFT_DRAW` tăng `principal`; khi có tiền vào/trả: ghi `PAYMENT` tại thời điểm hiệu lực thực tế.
2. Hằng ngày, worker evaluate mốc `17:00 Asia/Bangkok`. Nếu sau các khoản trả hợp lệ trước cutoff, gốc còn `0`, không ghi lãi ngày đó. Nếu còn gốc, tạo duy nhất một `INTEREST_ACCRUAL` cho business date.
3. Công thức mặc định theo rule Master: `lãi_ngày = ROUND(dư_nợ_gốc_tại_cutoff × 30% / day_count_basis, precision)`. `day_count_basis`, precision và cách làm tròn phải là snapshot cấu hình, không magic number.
4. Lúc ngày 26: tạo statement/snapshot cho cycle `[26, 26 kế tiếp)`; lãi đã accrual được post thành khoản phải trả của kỳ nhưng vẫn có trace về từng ngày. Đây là chốt lãi, không phải sự kiện đã thu lãi.
5. Ngày 03 sau khi chốt: import giao dịch VPBank để ghi nhận thu lãi thành công, một phần hoặc thất bại. Event thu lãi chỉ phân bổ vào khoản `interest` của statement đã chốt và không thay đổi gốc hoặc daily accrual lịch sử.
6. Khoản trả bất kỳ sau `17:00` không đảo ngược lãi đã accrue của ngày đó; khoản trả trước cutoff có thể triệt tiêu lãi ngày nếu đáp ứng quy tắc toàn bộ dư nợ Master đã xác nhận.

### Các tham số chưa được phép suy diễn

- Thẻ tín dụng: `minimum_due`, ngày bắt đầu tính lãi khi không trả đủ, thứ tự phân bổ payment giữa fee/interest/principal, cách làm tròn, xử lý refund/chargeback và exact late fee của đúng dòng thẻ.
- Thấu chi: `day_count_basis` (`365` hay `366`), thứ tự phân bổ payment vào interest/principal và cách làm tròn. Quy tắc đã xác nhận là lãi được xác lập hằng ngày theo cutoff, tổng hợp/chốt ngày `26` và VPBank thu ngày `03`.
- Các trường này phải import từ sao kê hoặc được cấu hình có bằng chứng hợp đồng. Hệ thống không được phát hành số "chính xác" cho tới khi có dữ liệu đó.

## Kịch bản nghiệm thu bắt buộc

```gherkin
Scenario: Thẻ tín dụng được miễn lãi khi trả đủ trước cutoff
  Given statement chốt lúc 23:59:59.999 ngày 26 với total_due là 10.000.000 VND
  And due_at là 17:00:00 ngày 10 tháng sau tại Asia/Bangkok
  When các khoản thanh toán có effective_at không muộn hơn 16:59:59.999 cộng đủ 10.000.000 VND
  Then statement có trạng thái PAID_IN_FULL
  And không có bút toán lãi hoặc phí trễ cho statement đó

Scenario: Thẻ tín dụng thanh toán sau cutoff
  Given statement còn thiếu tiền tại 16:59:59.999 ngày 10
  When hệ thống chạy evaluation đúng hạn hoặc rerun sau đó
  Then chỉ một tập bút toán interest/late fee được tạo theo rule snapshot
  And rerun không làm tăng thêm tiền lần thứ hai

Scenario: Thấu chi trả hết trước 17 giờ
  Given dư nợ gốc thấu chi đầu ngày là 5.000.000 VND
  When nhận payment 5.000.000 VND có effective_at là 16:59:59.999
  Then basis_amount tại cutoff là 0
  And không có INTEREST_ACCRUAL cho business date đó

Scenario: Thấu chi trả sau 17 giờ
  Given dư nợ gốc thấu chi đầu ngày là 5.000.000 VND
  When nhận payment 5.000.000 VND có effective_at là 17:00:00 hoặc muộn hơn
  Then lãi ngày được ghi một lần theo dư nợ tại cutoff
  And payment chỉ ảnh hưởng các business date tiếp theo theo rule snapshot

Scenario: Thấu chi chốt ngày 26 và VPBank thu lãi ngày 03
  Given statement thấu chi chứa tổng daily accrual của cycle [26, 26 kế tiếp)
  When close statement tại ngày 26 và chưa import giao dịch thu lãi
  Then statement là INTEREST_PENDING_COLLECTION
  And hệ thống không đánh dấu lãi đã thu
  When import giao dịch VPBank ngày 03 khớp interest_due
  Then statement là INTEREST_COLLECTED theo bank reference duy nhất

Scenario: Trả tiền ngẫu nhiên và chạy đồng thời
  Given hai command thanh toán cho cùng một tài khoản có idempotency_key khác nhau
  When chúng chạy đồng thời
  Then ledger và allocations khớp tổng, không âm sai và không mất update
  And request retry cùng idempotency_key không tạo thêm bút toán
```

## Điều kiện triển khai an toàn

1. Thay `personal_assets.amount` bằng aggregate read model từ ledger cho hai product này; backfill số dư mở đầu qua một bút toán `OPENING_BALANCE` có ngày hiệu lực xác định.
2. Triển khai domain mới dưới `backend/src/domains/finance/credit/` và migration + `dbSchema` đồng thời; không pha logic statement vào `financeHubService` hiện tại.
3. Thêm job idempotent do scheduler hiện có gọi, nhưng mọi deadline/tính lãi lấy từ `effective_at` và business timezone.
4. Import ít nhất một sao kê đã che dữ liệu nhạy cảm cho mỗi sản phẩm, so từng dòng và benchmark rerun/concurrency trước nghiệm thu.

## Snapshot sao kê Master cung cấp - 2026-11-03

- `statement_total_due`: `6.746.609 VND`.
- `minimum_due`: `337.331 VND`.
- `due_at`: `2026-11-09T17:00:00 Asia/Bangkok`.
- Snapshot này thay thế giả định deadline ngày 10 cho chính kỳ sao kê hiện tại. Engine phải luôn ưu tiên `due_at` của statement hơn rule ngày chung của tài khoản.
- Nếu chỉ thanh toán minimum due đúng hạn, phần chưa thanh toán của statement là `6.409.278 VND`. Khoản này không được tự gán một kỳ lãi `09/10 -> 09/11`; cần `interest_start_policy`/chi tiết lãi trên statement để xác định ngày bắt đầu. Với mục đích cảnh báo ngân sách duy nhất, nếu policy sau này xác nhận tính theo dư nợ còn lại hàng ngày với `47.88%/năm` và `365` ngày, mức tham chiếu là khoảng `8.408 VND/ngày` trước khi có giao dịch mới, payment tiếp theo hoặc rule làm tròn của VPBank. Đây không phải số lãi chính thức của statement.

## Bằng chứng sao kê VPBank Master cung cấp - kỳ 26/09/2026 đến 25/10/2026

### Dữ liệu xác nhận từ sao kê

- `statement_cycle_start`: `2026-09-26`.
- `statement_cycle_end`: `2026-10-25`.
- `statement_due_at`: `2026-11-09T17:00:00 Asia/Bangkok`.
- `interest_rate_monthly`: `3,29%/tháng`; quy đổi nominal annual là `39,48%/năm`. Mức `47,88%/năm` không áp dụng cho sao kê này.
- `beginning_balance`: `4.930.908,00 VND`.
- `card_transaction_debit_total`: `1.860.590,00 VND`.
- `total_debit_including_interest`: `2.062.247,12 VND`.
- `interest_in_cycle`: `201.657,12 VND` (`2.062.247,12 - 1.860.590,00`).
- `paid_during_term`: `246.546,00 VND`.
- `statement_outstanding_balance`: `6.746.609,00 VND`.
- `minimum_due`: `337.331,00 VND`.

### Kết luận đã được xác minh

1. Sao kê dùng cycle `26` của tháng trước đến `25` của tháng hiện tại; deadline thanh toán của cycle này là `17:00` ngày `09/11/2026`.
2. Sao kê đã có `201.657,12 VND` lãi trong kỳ. Nó chứng minh thẻ đang có tính lãi ngày trên dư nợ đã không được trả đủ ở kỳ trước; không phù hợp với giả định đơn giản "lãi chỉ từ ngày 10 tháng trước đến ngày 10 tháng này".
3. Rate phải lấy từ statement/account rule snapshot (`3,29%/tháng` cho kỳ này), không quy đổi rồi hardcode một tỷ lệ chung.
4. Để tái tính đúng từng đồng của `201.657,12 VND`, hệ thống cần opening balance đã chịu lãi, mọi payment/transaction cùng `posting_at`, day-count basis, rule làm tròn và interest start policy. Ảnh sao kê hiện tại không tự chứng minh toàn bộ các tham số này; do đó engine phải import/lưu statement snapshot và đối chiếu kỳ tiếp theo.

### Quy tắc engine đã chốt cho thẻ này

- `statement_close_at`: cuối ngày `25` hằng tháng tại `Asia/Bangkok`.
- `due_at`: lấy trực tiếp từ statement; không suy luận cố định ngày `10`.
- `annual_rate`: suy ra từ `monthly_rate` đang có trên form/statement (`monthly_rate * 12`) chỉ để tính ngày; lưu cả rate value và rate period snapshot.
- Nếu statement không được thanh toán toàn bộ trước `due_at`, engine chuyển statement sang `REVOLVING` và tính lãi theo ngày trên daily outstanding balance theo policy snapshot; khoản minimum due chỉ quyết định tránh late fee, không chuyển statement thành `PAID_IN_FULL`.
- Các payment đúng hạn/đến muộn phân bổ qua ledger và ảnh hưởng daily balance kể từ `effective_at`; không được giảm một cột dư nợ lịch sử rồi tái tính lãi mơ hồ.

## Làm rõ nghiệp vụ: thấu chi có chu kỳ một tháng

- Thấu chi tín chấp cũng có statement cycle một tháng, chốt ngày `26`; statement là snapshot tổng gốc/lãi/phí của kỳ và tạo nghĩa vụ phải trả cho tháng tiếp theo.
- Tuy nhiên, unlike thẻ tín dụng, chu kỳ một tháng không tự tạo một khoảng miễn lãi chung. Với quy tắc Master đã xác nhận, interest eligibility của thấu chi được xác định **mỗi ngày lúc 17:00**: trả toàn bộ gốc trước cutoff thì không lãi cho business date đó; còn dư sau cutoff thì accrual lãi ngày.
- Vì vậy, thấu chi không được mô hình như "vay một tháng rồi tính lãi một lần cuối tháng". Worker daily accrual ghi lãi từng business date; ngày `26` chỉ post/snapshot những accrual này vào statement.
- Hai product dùng chung `credit_account`, `credit_account_transactions`, `credit_statements`, payment allocation và rule snapshots; khác nhau tại `product_kind` và `interest_start_policy`:
  - `CREDIT_CARD`: statement-level grace test. Trả đủ `total_due` trước `due_at` mới có thể miễn lãi; chỉ trả minimum due thì statement vẫn `REVOLVING`.
  - `OVERDRAFT`: daily-cutoff test. Gốc còn sau `daily_cutoff_time` thì tạo lãi ngày; payment trước cutoff triệt tiêu basis lãi của ngày đó.

## Cập nhật triển khai ledger - 2026-11-03

**Trạng thái nghiệm thu:** **CHƯA NGHIỆM THU TÀI CHÍNH**. Lõi triển khai và sandbox kỹ thuật đã pass, nhưng chưa có sao kê/giao dịch VPBank đã che dữ liệu đủ để đối chiếu số dư, lãi, phí và thứ tự phân bổ end-to-end.

### Đã triển khai

- Migration `20261103000003_create_credit_account_ledger.js` tạo `credit_accounts`, rule versions, statements, immutable ledger, daily accrual, payment allocations và reconciliation records; migration `20261103000004_register_credit_ledger_jobs.js` đăng ký job accrual và statement close.
- `creditLedgerService` hạch toán command trong transaction, khóa account/statement, unique idempotency key, phân bổ payment theo bucket, tính accrual thấu chi tại cutoff, close statement ngày cấu hình và import collection lãi ngày 03.
- API mới dưới `/api/finance/credit-accounts` phục vụ tạo account/rule, principal event, payment, import statement thẻ, accrual/close thấu chi và import collection lãi theo bank reference.
- Endpoint tương thích `POST /personal-assets/:id/pay` và `POST /personal-assets/:id/borrow` dùng ledger khi asset đã liên kết `credit_account`; `personal_assets.amount` chỉ được đồng bộ read model trong cùng transaction.
- Scheduler có handler `credit_overdraft_accrual`, `credit_overdraft_statement_close` và `credit_card_due_evaluation`; job close tự bỏ qua account nếu business date không phải `statementCloseDay`, còn due evaluation dùng `statement.due_at` snapshot.

### Kiểm tra đã chạy

- Đã tạo database cô lập `admin_orderlist_vpbank_credit_test`; không chạy migration lên database development `mydtbmav`.
- `npx.cmd knex migrate:latest` trên sandbox: pass; `npx.cmd knex migrate:list`: `25` completed, `0` pending.
- `node --check` cho migration, ledger service/controller, Finance Hub service/routes, scheduler task/index và integration test: pass.
- `node tests/run-integration.js tests/integration/credit_ledger.integration.test.js`: pass `5/5`. Bao phủ cutoff thấu chi 17:00, idempotency accrual/collection, chỉ close ngày 26, thu lãi ngày 03 theo phần/toàn bộ, trả thẻ tối thiểu/đủ/quá hạn, retry đồng thời cùng idempotency key và giả lập trả từng phần theo ngày cho cả hai product.
- `npm test` trong `backend`: pass `66/66` unit tests, gồm `creditLedgerRules.test.js`.
- Kiểm thử đã phát hiện và sửa hai lỗi nguồn: thiếu export ba command mà controller gọi; và `getCycleStart()` đặt nhầm ngày 26 là đầu kỳ mới. Chu kỳ close hiện là khoảng nửa mở `[26 tháng trước, 26 tháng này)`.

### Giả lập trả từng phần hằng ngày - sandbox

Rule thấu chi trong kịch bản: `30%/năm`, basis `365`, làm tròn `HALF_UP`, cutoff `17:00 Asia/Bangkok`, dư nợ mở `365.000 VND`.

| Business date | Thanh toán | Dư nợ tại cutoff 17:00 | Lãi ngày |
| --- | --- | ---: | ---: |
| 2026-10-24 | Trả `100.000 VND` lúc `16:59` | `265.000 VND` | `218 VND` |
| 2026-10-25 | Trả `100.000 VND` lúc `17:01` | `265.000 VND` | `218 VND` |
| 2026-10-26 | Trả `65.000 VND` lúc `16:59`; trả `100.000 VND` lúc `17:01` | `100.000 VND` | `82 VND` |

- Tổng lãi được ledger cộng: `518 VND`.
- Sau payment lúc `17:01` ngày `2026-10-26`, dư nợ gốc về `0 VND`; payment sau cutoff không hồi tố làm giảm basis lãi đã chốt của chính ngày đó.
- Kịch bản được mã hóa tại `backend/tests/integration/credit_ledger.integration.test.js` để chạy lặp lại, không dùng số hard-code của form người dùng trong runtime.

### Giả lập trả từng phần hằng ngày - thẻ tín dụng

Statement giả lập có `total_due` `1.000 VND`, `minimum_due` `200 VND`, `due_at` `2026-12-10T17:00:00 Asia/Bangkok`.

| Thời điểm thanh toán | Số tiền | Kết quả khi evaluate sau hạn |
| --- | ---: | --- |
| 2026-12-07 12:00 | `100 VND` | Được tính vào statement |
| 2026-12-08 12:00 | `100 VND` | Được tính vào statement |
| 2026-12-10 16:59 | `100 VND` | Được tính vào statement |
| 2026-12-10 17:01 | `700 VND` | Không hồi tố vào đánh giá hạn của statement |

- Tổng payment hợp lệ trước hạn là `300 VND`, nên status của statement là `MINIMUM_PAID`, không phải `PAID_IN_FULL`.
- Điều này kiểm chứng ledger không dùng ngày 10 cố định và không coi payment sau `due_at` là đã trả đủ cho kỳ vừa đáo hạn.

### Điều kiện còn lại trước nghiệm thu

1. Import ít nhất hai sao kê thẻ liên tiếp và một cycle thấu chi có giao dịch trả trước/sau cutoff; dữ liệu phải che thông tin nhạy cảm nhưng giữ nguyên ngày, số tiền, lãi, phí và bank reference cần đối chiếu.
2. Xác nhận bằng chứng VPBank cho `interest_start_policy` của thẻ sau khi chỉ trả minimum due; không được suy diễn là toàn bộ phần còn lại bắt đầu tính lãi từ một ngày cố định nếu statement không chứng minh điều đó.
3. Chạy API/scheduler runtime với account thực tế trên sandbox, đối chiếu immutable ledger, payment allocation, `personal_assets.amount` read model và statement import từng dòng.
4. Chỉ chuyển trạng thái nghiệm thu khi tổng dư nợ, lãi, phí, payment và số còn phải thu khớp với statement VPBank; sandbox kỹ thuật pass không thay thế bằng chứng tài chính này.
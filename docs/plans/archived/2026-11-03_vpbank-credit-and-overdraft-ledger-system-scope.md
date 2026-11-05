# Phạm Vi Hệ Thống Sổ Cái Thẻ Tín Dụng Và Thấu Chi VPBank

**Mã đặc tả:** `SCOPE-2026-11-03-VPBANK-CREDIT-LEDGER`  
**Ngày:** 2026-11-03  
**Múi giờ nghiệp vụ:** `Asia/Bangkok`  
**Trạng thái:** Chờ phê duyệt trước khi triển khai  
**Phạm vi:** Finance Hub - thẻ tín dụng VPBank và thấu chi tín chấp VPBank

## 1. Quyết định phạm vi

Tài liệu này là nguồn sự thật duy nhất cho **phạm vi nghiệp vụ, dữ liệu, luồng vận hành và tiêu chí nghiệm thu** của đợt nâng cấp nợ VPBank.

Nó thay thế phạm vi của plan `Hybrid Debt Interest Settlement` trước đây. Không triển khai mô hình “tự cộng lãi ước tính vào `personal_assets.amount`”, không dùng một cột số dư làm nguồn sự thật, và không có cron tự chốt một số lãi giả định khi thiếu giao dịch ngân hàng.

Các tài liệu review và thiết kế ledger trước đó chỉ là bằng chứng/rationale. Nếu có mâu thuẫn, tài liệu này được ưu tiên; dữ liệu statement/hợp đồng đã import của chính tài khoản được ưu tiên cao hơn mọi rule mặc định trên form.

## 2. Vấn đề cần giải quyết

Hiện trạng `DEBT_PAYABLE` chỉ tạo ước tính gánh nợ theo tháng; chưa thể trả lời chính xác:

- Một khoản trả ngẫu nhiên đã giảm gốc, lãi hay phí nào.
- Số lãi hiển thị là số ngân hàng đã sao kê, số engine tái tính, hay chỉ là dự báo.
- Một statement thẻ đã được trả đủ, trả tối thiểu, trả một phần hay quá hạn.
- Lãi thấu chi của từng ngày được xác lập từ dư nợ nào tại cutoff.
- Lãi thấu chi chốt ngày `26` đã thực sự bị VPBank thu vào ngày `03` hay chưa.

Hệ thống mới phải biến các câu hỏi này thành dữ liệu audit được, tái tính được và đối chiếu được với sao kê VPBank.

## 3. Mục tiêu và kết quả bàn giao

### 3.1. Mục tiêu

- Hạch toán immutable ledger cho gốc, lãi, phí, payment và điều chỉnh của từng tài khoản tín dụng.
- Lưu rule theo phiên bản và snapshot rule trên statement/accrual để lịch sử không đổi khi người dùng sửa form.
- Tính hoặc import đúng trạng thái nghiệp vụ theo `effective_at`, không theo thời điểm cron chạy.
- Phân biệt rõ `imported`, `calculated` và `projected` trên API/UI.
- Đối chiếu được từng statement và chặn hạch toán trùng khi retry, scheduler chạy bù hoặc command đồng thời.

### 3.2. Kết quả bàn giao

- Một aggregate `credit account` cho mỗi thẻ tín dụng hoặc thấu chi.
- Statement snapshot, daily interest accrual, payment allocation và ledger event truy vết được.
- Luồng UI nhập rule, import statement, ghi payment/draw/spend và xem đối chiếu.
- Scheduler idempotent cho cutoff, close statement, due evaluation và nhắc/đối chiếu collection.
- Integration tests theo các kịch bản tại mục 14.

## 4. Ranh giới sản phẩm

| Thành phần | Trong phạm vi | Ngoài phạm vi đợt này |
| --- | --- | --- |
| Thẻ tín dụng VPBank | Statement, grace/revolving state, payment allocation, import lãi/phí/sao kê, projection có nhãn | Tự quyết định biểu phí hoặc đoán lãi/phí không có bằng chứng |
| Thấu chi tín chấp VPBank | Daily cutoff/accrual, statement cycle, collection lãi ngày `03`, reconciliation | Tự động kéo tiền thật từ VPBank hoặc tạo giao dịch ngân hàng |
| Finance Hub | Read model, dashboard, cảnh báo, audit trail | Thay thế ứng dụng/sao kê VPBank làm nguồn giao dịch ngân hàng |
| Nợ cá nhân thông thường | Giữ luồng cũ, chỉ đọc tương thích nếu cần | Tự động chuyển mọi `DEBT_PAYABLE` vào credit ledger |
| Điều chỉnh số liệu | Event điều chỉnh có lý do, người thực hiện, bằng chứng | Sửa/xóa trực tiếp ledger hoặc ghi đè lịch sử |

## 5. Nguồn sự thật và thứ tự ưu tiên

1. Giao dịch/sao kê/hợp đồng VPBank đã import và có `source_reference`.
2. Snapshot rule đã gắn với statement hoặc accrual tại thời điểm phát sinh.
3. Rule version đang hiệu lực do form tài khoản lưu.
4. Giá trị projected do engine tính, chỉ dùng để cảnh báo/ngân sách.
5. Không có rate, deadline, minimum due, cutoff, day-count basis hoặc thứ tự phân bổ tiền trả nào được hardcode trong source.

Ví dụ, một rate nhập từ form không phải hằng số hệ thống. Nếu statement của một kỳ thể hiện rate khác, statement snapshot của kỳ đó phải được dùng để đối chiếu và không sửa ngược lịch sử.

## 6. Mô hình dữ liệu và bất biến

### 6.1. Thực thể bắt buộc

| Thực thể | Trách nhiệm tối thiểu |
| --- | --- |
| `credit_accounts` | Tài khoản tín dụng, `product_kind`, trạng thái, timezone và liên kết read model tương thích với Finance Hub. |
| `credit_account_rule_versions` | Version bất biến của rule form; có thời điểm hiệu lực và cấu hình product-specific. |
| `credit_statements` | Snapshot kỳ sao kê: cycle, due time, opening/closing, minimum due, total due, trạng thái và `rule_snapshot`. |
| `credit_account_ledger` | Sổ cái append-only cho draw/spend/payment/interest/fee/reversal/adjustment, `effective_at`, chứng từ và idempotency key. |
| `credit_interest_accruals` | Basis, rate snapshot, business date, số lãi và khóa idempotency của từng accrual. |
| `credit_payment_allocations` | Phân bổ một payment vào statement/bucket/ledger line mục tiêu. |
| `credit_reconciliation_records` | Kết quả đối chiếu statement hay giao dịch ngân hàng, chênh lệch, evidence và người xác nhận. |

### 6.2. Bucket chuẩn

- `GRACE_PRINCIPAL`: gốc thẻ có khả năng được miễn lãi nếu statement liên quan được trả đủ đúng hạn.
- `REVOLVING_PRINCIPAL`: gốc của statement chưa trả đủ, chịu lãi theo policy snapshot.
- `ACCRUED_INTEREST`: lãi đã xác lập theo rule nhưng chưa post vào statement.
- `POSTED_INTEREST`: lãi đã thuộc statement và đang phải thu.
- `FEE`: phí được import hoặc tính theo rule có bằng chứng.
- `PAYMENT_UNALLOCATED`: payment chưa thể phân bổ, phải có trạng thái xử lý rõ ràng.

### 6.3. Bất biến bắt buộc

- Ledger không sửa/xóa. Reversal và adjustment là event mới có liên kết event gốc.
- Mọi command tiền tệ dùng transaction, khóa account/statement cần thiết và `idempotency_key` duy nhất.
- Mọi ngày giờ nghiệp vụ dùng `Asia/Bangkok`; `effective_at` quyết định ảnh hưởng lãi, `recorded_at` chỉ phục vụ audit.
- Read model có thể được tái dựng từ ledger; không được là nơi ghi chính cho gốc/lãi/phí.
- Cron chạy trễ/chạy bù phải tạo kết quả đúng theo business time và không tạo event lần hai.

## 7. Rule cần cấu hình từ form và snapshot

### 7.1. Chung

- `product_kind`: `CREDIT_CARD` hoặc `OVERDRAFT`.
- `timezone`, `rate_value`, `rate_period`, `day_count_basis`, `rounding_policy`.
- `payment_allocation_policy`, effective range của rule và evidence reference.

### 7.2. Thẻ tín dụng

- `statement_close_day`.
- `due_at` của statement; rule form chỉ được dùng để dự kiến khi chưa import statement, statement thực tế luôn ưu tiên.
- `minimum_due`, `total_due`, `interest_start_policy`, `late_fee_policy` và payment allocation policy.

### 7.3. Thấu chi

- `statement_close_day`.
- `daily_cutoff_time`.
- `interest_collection_day` và `interest_collection_time` nếu có bằng chứng.
- Annual rate, day-count basis, rounding policy và policy phân bổ payment vào interest/principal.

## 8. Luồng chuẩn dùng chung

1. Người dùng hoặc import tạo command với số tiền, loại event, `effective_at`, chứng từ và `idempotency_key`.
2. Domain lock account, validate rule version và statement liên quan, rồi append ledger event trong một transaction.
3. Payment được phân bổ thành nhiều `credit_payment_allocations` theo snapshot policy; không trừ mơ hồ vào một `amount` tổng.
4. Read model và outbox event commit cùng transaction.
5. Scheduler chỉ tạo accrual/transition khi đủ điều kiện nghiệp vụ; import statement/bank transaction mới là bằng chứng xác nhận ngân hàng.
6. Reconciliation so tổng ledger, statement imported và số báo VPBank; chênh lệch không tự bị xóa.

## 9. Luồng thẻ tín dụng VPBank

### 9.1. Kỳ statement và deadline

- Statement cycle đóng ngày `26`; hệ thống biểu diễn chính xác `cycle_start_at` và `cycle_close_at`, không chỉ lưu số ngày.
- `due_at` là trường snapshot của statement. Không coi ngày `10` là hằng số: một statement thực tế có thể yêu cầu thanh toán trước `17:00` của một ngày khác.
- `minimum_due` chỉ quyết định điều kiện tối thiểu/late fee theo rule; không có nghĩa statement đã được trả đủ.

### 9.2. Trạng thái sau deadline

| Điều kiện tại `due_at` | Trạng thái | Hệ quả |
| --- | --- | --- |
| Payment allocation đạt `total_due` | `PAID_IN_FULL` | Gốc statement không chuyển thành revolving principal. |
| Đạt `minimum_due` nhưng thiếu `total_due` | `MINIMUM_PAID` / `REVOLVING` | Phần statement chưa trả chuyển thành `REVOLVING_PRINCIPAL`; lãi kỳ sau theo rule snapshot. |
| Không đạt `minimum_due` | `PAST_DUE` | Ghi/đối chiếu lãi, phí trễ theo rule/statement evidence. |

### 9.3. Điều cần bảo toàn

- Lãi hiện trên statement có thể là lãi của dư nợ quay vòng kỳ trước, không mặc định là lãi của chi tiêu mới trong kỳ.
- Chi tiêu mới ghi `GRACE_PRINCIPAL` trước; chỉ chuyển trạng thái theo kết quả thanh toán của statement có liên quan và `interest_start_policy` đã xác nhận.
- Engine không tuyên bố tái tính “đúng từng đồng” nếu thiếu payment/posting timeline, day-count basis, rounding và policy từ statement/hợp đồng.

## 10. Luồng thấu chi tín chấp VPBank

### 10.1. Lãi ngày

- Một interest cycle là khoảng nửa mở `[ngày 26 00:00:00, ngày 26 kế tiếp 00:00:00)` tại `Asia/Bangkok`.
- Với mỗi business date, tính `principal_at_cutoff` từ toàn bộ draw, payment, reversal và adjustment có hiệu lực trước `daily_cutoff_time`.
- Nếu `principal_at_cutoff = 0`, không tạo lãi ngày. Nếu dương, tạo duy nhất một `INTEREST_ACCRUAL` có basis/rate/rounding snapshot của business date.
- Payment sau cutoff không đảo lãi đã xác lập của ngày đó; payment trước cutoff chỉ triệt tiêu lãi khi nó làm gốc tại cutoff bằng `0` theo rule đã xác nhận.

### 10.2. Chốt ngày 26 và thu ngày 03

1. Khi cycle kết thúc ngày `26`, engine tổng hợp các `INTEREST_ACCRUAL` trong cycle thành `interest_due` và tạo statement `INTEREST_PENDING_COLLECTION`.
2. Việc close chỉ post/snapshot lãi phải thu. Nó không phải event đã trích tiền và không làm thay đổi principal của cycle mới.
3. Vào ngày `03` sau close, hệ thống tạo expected collection/reminder từ rule snapshot, nhưng không tự đánh dấu thu thành công.
4. Khi import giao dịch VPBank, ghi chính xác một trong ba kết quả: `INTEREST_COLLECTION_SUCCEEDED`, `INTEREST_COLLECTION_PARTIAL`, hoặc `INTEREST_COLLECTION_FAILED`.
5. Collection chỉ phân bổ vào `POSTED_INTEREST` của statement đã close; không tái tạo/đảo daily accrual lịch sử.

## 11. Hành vi UI, API và vận hành

### 11.1. UI

- Form tài khoản có trường rule theo product và evidence reference; thay đổi rule sinh version mới.
- Danh sách nợ hiển thị tách `số theo sao kê`, `số engine tính`, `dự báo` và trạng thái đối chiếu.
- Màn statement thể hiện cycle, deadline, total/minimum due, breakdown principal/interest/fee, payment allocations và evidence import.
- Màn thấu chi thể hiện principal tại cutoff từng ngày, lãi daily accrual, statement close, expected collection ngày `03` và kết quả import.
- Điều chỉnh thủ công chỉ tạo adjustment có lý do/chứng từ; không sửa số ledger cũ.

### 11.2. API/domain command

- Create/update account rule version.
- Record card spend, overdraft draw, payment, reversal và adjustment.
- Import statement và import bank collection transaction.
- Close statement, evaluate card deadline, accrue overdraft daily interest và reconcile statement.
- Query account ledger, statement detail, allocation, accrual, reconciliation và projections.

### 11.3. Scheduler

- Overdraft cutoff accrual theo business date/cutoff và có unique key theo account + date + rule version.
- Statement close theo rule snapshot.
- Card deadline evaluation theo `statement.due_at`.
- Expected overdraft collection ngày `03` và job kiểm tra/import reconciliation; job không được tự tạo “thu lãi thành công”.
- Tất cả job có advisory lock, idempotency và xử lý chạy bù theo `effective_at`.

## 12. Kế hoạch chuyển đổi dữ liệu

1. Không xóa hoặc thay đổi trực tiếp `finance.personal_assets` và lịch sử hiện hữu.
2. Chỉ account đã được phân loại rõ `CREDIT_CARD`/`OVERDRAFT` mới được chuyển sang aggregate ledger.
3. Mỗi account chuyển đổi cần một `OPENING_BALANCE` có ngày hiệu lực, số tiền, bucket, evidence và trạng thái đối chiếu.
4. `personal_assets.amount` trong giai đoạn tương thích là read model được đồng bộ có kiểm soát, không là nơi engine tính lãi.
5. Không backfill lãi lịch sử theo công thức nếu không đủ statement/evidence; đánh dấu `UNVERIFIED_OPENING_BALANCE` và yêu cầu đối chiếu.

## 13. Redlines

- Không hardcode `47,88%`, `30%`, ngày `26`, ngày `03`, `17:00`, minimum due, day-count basis hoặc fee trong source. Đây là dữ liệu rule/snapshot của account.
- Không tự cộng lãi projected vào gốc và không dùng “tự chốt dự phòng cuối ngày” thay cho statement/bank evidence.
- Không dùng `debt_payment_logs` như immutable ledger hoặc sole source để tính daily balance.
- Không tạo lãi kép/lãi trên lãi, late fee hoặc VAT nếu statement/rule evidence chưa xác nhận.
- Không sửa/revert các thay đổi người dùng đang có tại `DebtsAndInstallmentsSection.tsx`.
- Không nghiệm thu chỉ bằng unit/build; phải đối chiếu API, DB, UI, scheduler, transaction và sao kê thật đã ẩn dữ liệu nhạy cảm.

## 14. Tiêu chí nghiệm thu

```gherkin
Scenario: Thẻ được trả đủ trước deadline statement
  Given statement có total_due và due_at đã import
  When tổng payment allocation có effective_at trước due_at đạt total_due
  Then statement là PAID_IN_FULL
  And không chuyển gốc statement đó thành REVOLVING_PRINCIPAL

Scenario: Thẻ chỉ được trả minimum due
  Given statement có minimum_due nhỏ hơn total_due
  When payment allocation trước due_at đạt minimum_due nhưng thiếu total_due
  Then statement là MINIMUM_PAID hoặc REVOLVING theo policy snapshot
  And phần gốc chưa trả được trace thành REVOLVING_PRINCIPAL

Scenario: Thấu chi trả hết trước cutoff
  Given principal thấu chi đầu ngày lớn hơn 0
  When payment làm principal_at_cutoff bằng 0 trước daily_cutoff_time
  Then không có INTEREST_ACCRUAL cho business date đó

Scenario: Thấu chi còn dư tại cutoff
  Given principal_at_cutoff lớn hơn 0
  When overdraft cutoff worker chạy hoặc chạy bù
  Then có đúng một INTEREST_ACCRUAL theo account, business date và rule version
  And rerun không tạo thêm lãi

Scenario: Chốt lãi thấu chi ngày 26 nhưng chưa thu tiền
  Given cycle lãi [26, 26 kế tiếp) đã có daily accrual
  When statement close tại ngày 26
  Then statement là INTEREST_PENDING_COLLECTION
  And interest_due bằng tổng daily accrual của cycle
  And không có INTEREST_COLLECTION_SUCCEEDED

Scenario: VPBank thu lãi ngày 03
  Given statement thấu chi đang INTEREST_PENDING_COLLECTION
  When import bank transaction ngày 03 khớp interest_due với bank reference mới
  Then statement là INTEREST_COLLECTED
  And collection chỉ giảm POSTED_INTEREST của statement đó

Scenario: Payment và scheduler chạy đồng thời
  Given payment command và cutoff/deadline worker cùng tác động một account
  When chúng chạy đồng thời hoặc một request được retry
  Then ledger, allocations, accrual và read model khớp tổng
  And không mất update hoặc tạo event trùng
```

## 15. Điều kiện trước khi triển khai và nghiệm thu cuối

- Phê duyệt rule fields, payment allocation policy, rounding/day-count basis và evidence format cho từng product.
- Có ít nhất hai statement liên tiếp của thẻ và tối thiểu một cycle thấu chi chứa daily balance biến động để đối chiếu.
- Có transaction thực tế cho trường hợp VPBank thu lãi ngày `03`: thành công, một phần hoặc thất bại nếu xảy ra.
- Migration, `dbSchema`, `TABLES`, `COLS`, runtime query và test schema phải được cập nhật đồng thời.
- Chỉ chuyển trạng thái **ĐÃ NGHIỆM THU** khi tất cả scenario, reconciliation và concurrency evidence đều đạt; hiện trạng là **CHƯA NGHIỆM THU**.
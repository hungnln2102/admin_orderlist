# Thiết Kế Luồng Lãi Thẻ Tín Dụng Và Thấu Chi VPBank

**Ngày:** 2026-11-03  
**Trạng thái:** Đặc tả nghiệp vụ để triển khai  
**Phạm vi:** Finance Hub - thẻ tín dụng VPBank và thấu chi tín chấp VPBank

## 1. Mục tiêu

Thay thế mô hình hiện tại chỉ có một trường `personal_assets.amount` bằng một hệ thống sổ cái có thể tái tính và đối chiếu sao kê. Hệ thống phải:

- Nhận lãi suất, ngày chốt sao kê, hạn trả, cutoff và các rule từ form/sao kê của từng tài khoản, không hardcode.
- Cho phép trả tiền bất kỳ thời điểm nào; mỗi khoản trả phải ảnh hưởng đúng tới lãi và gốc kể từ `effective_at`.
- Tách riêng gốc, lãi lũy kế, lãi đã post vào sao kê, phí và khoản thanh toán.
- Phân biệt đúng bản chất thẻ tín dụng với thấu chi, dù cả hai đều có statement cycle một tháng.
- Cho phép đối chiếu từng dòng với sao kê VPBank.

## 2. Nguồn sự thật nghiệp vụ

### 2.1. Quy tắc thẻ tín dụng do Master xác nhận

- Statement cycle chốt ngày `26`: ví dụ sao kê có cycle từ `26/09/2026` đến `25/10/2026`.
- Hạn của mỗi statement lấy trực tiếp từ statement, ví dụ `09/11/2026 17:00:00 Asia/Bangkok`; không suy luận cứng một ngày cho mọi kỳ.
- Cửa sổ quyết định trạng thái trả nợ của một statement là từ ngày `10` tháng này đến trước `17:00` ngày `09` tháng sau.
- Nếu tổng tiền đã trả áp vào statement đạt `total_due` trong cửa sổ đó, statement là `PAID_IN_FULL`; statement này không làm phát sinh thêm lãi cho kỳ sau.
- Nếu chỉ đạt `minimum_due` nhưng chưa đạt `total_due`, statement là `MINIMUM_PAID`; phần dư nợ của **statement kỳ trước** chuyển thành dư nợ quay vòng và phát sinh lãi trong kỳ sau.
- Lãi thể hiện trên một statement là lãi của dư nợ kỳ trước chưa tất toán, không phải lãi của toàn bộ chi tiêu phát sinh trong chính statement đó.
- Chi tiêu mới trong statement hiện tại vẫn là `GRACE_ELIGIBLE`; chỉ trở thành dư nợ chịu lãi nếu statement chứa nó không được tất toán toàn bộ trước deadline của chính statement đó.

### 2.2. Bằng chứng từ sao kê Master cung cấp

Sao kê cycle `26/09/2026 - 25/10/2026` cho thấy:

| Dòng sao kê | Giá trị |
| --- | ---: |
| Lãi suất | `3,29%/tháng` |
| Dư nợ đầu kỳ | `4.930.908,00 VND` |
| Chi tiêu thẻ trong kỳ | `1.860.590,00 VND` |
| Lãi trong kỳ | `201.657,12 VND` |
| Tổng phát sinh gồm lãi | `2.062.247,12 VND` |
| Đã thanh toán trong kỳ | `246.546,00 VND` |
| Dư nợ cuối kỳ | `6.746.609,00 VND` |
| Thanh toán tối thiểu | `337.331,00 VND` |
| Deadline của statement | trước `17:00 09/11/2026` |

`201.657,12 = 2.062.247,12 - 1.860.590,00` xác nhận dòng lãi trong statement tách khỏi chi tiêu thẻ của kỳ. Engine phải hạch toán dòng này dựa trên bucket dư nợ quay vòng của statement trước, không áp lãi vào toàn bộ giao dịch mới của cycle `26/09/2026 - 25/10/2026`.

### 2.3. Quy tắc thấu chi tín chấp do Master xác nhận

- Có statement cycle một tháng, chốt ngày `26`.
- Lãi suất lấy từ form/rule snapshot, ví dụ tài khoản có thể nhập `30%/năm`.
- Mốc nghiệp vụ hằng ngày là cutoff `17:00 Asia/Bangkok` lấy từ form/rule snapshot.
- Nếu toàn bộ dư nợ gốc thấu chi đã được trả với `effective_at < 17:00`, ngày đó không phát sinh lãi.
- Nếu còn bất cứ dư nợ gốc nào từ `17:00` trở đi, ngày đó phát sinh lãi theo daily balance. Sao kê ngày `26` chốt tổng lãi của cycle; ngân hàng tự động thu lãi vào ngày `03` của tháng ngay sau ngày chốt.
- Một cycle lãi là khoảng nửa mở `[ngày 26 00:00:00, ngày 26 kế tiếp 00:00:00)` theo `Asia/Bangkok`. Ngày `26` ở cuối khoảng chỉ khóa/snapshot tổng lãi đã accrual; không được coi là bằng chứng đã trích tiền lãi.

## 3. Mô hình trạng thái chung

### 3.1. Account rule snapshot

Mỗi tài khoản phải có rule version để lãi quá khứ luôn tái tính được dù form thay đổi sau này.

```ts
type ProductKind = "CREDIT_CARD" | "OVERDRAFT";
type InterestRatePeriod = "MONTHLY" | "ANNUAL";
type CreditCardInterestStartPolicy =
  | "PRIOR_STATEMENT_REVOLVING_BALANCE"
  | "TRANSACTION_POST_DATE"
  | "STATEMENT_CLOSE_DATE";
type PaymentAllocationPolicy =
  | "FEES_INTEREST_OLDEST_PRINCIPAL_FIRST"
  | "OLDEST_STATEMENT_PRINCIPAL_FIRST";

interface CreditAccountRuleSnapshot {
  productKind: ProductKind;
  timezone: "Asia/Bangkok";
  statementCloseDay: number;       // Form, ví dụ 26; close thực tế là cuối ngày 25
  dueAt: string | null;            // Statement import thắng rule chung
  annualRatePercent: number | null;
  monthlyRatePercent: number | null;
  ratePeriod: InterestRatePeriod;
  dayCountBasis: 365 | 366;
  dailyCutoffTime: string | null;  // Thấu chi, ví dụ 17:00
  creditCardInterestStartPolicy: CreditCardInterestStartPolicy | null;
  paymentAllocationPolicy: PaymentAllocationPolicy;
  ruleVersion: string;
}
```

Không có default lãi suất, deadline hay cutoff trong code. Form bắt buộc nhập rule; mỗi statement tạo `rule_snapshot` riêng.

### 3.2. Bucket số tiền

| Bucket | Ý nghĩa | Có được tính lãi không |
| --- | --- | --- |
| `GRACE_PRINCIPAL` | Chi tiêu của statement mới, chưa đến deadline của statement đó | Không, trừ khi statement đó chuyển `MINIMUM_PAID`/`UNPAID` |
| `REVOLVING_PRINCIPAL` | Gốc của statement trước chưa trả đủ tại deadline | Có, theo daily balance và rule snapshot |
| `ACCRUED_INTEREST` | Lãi đã tích lũy theo ngày nhưng chưa post vào statement | Không tính lãi chồng lãi nếu rule không xác nhận vốn hóa |
| `POSTED_INTEREST` | Lãi đã xuất hiện trên statement | Thanh toán theo payment allocation policy |
| `FEE` | Phí trễ, phí rút tiền hoặc phí statement import | Thanh toán theo payment allocation policy |
| `PAYMENT_UNALLOCATED` | Khoản trả đã nhận nhưng chưa phân bổ do lỗi/rule thiếu | Không được coi là đã trả statement cho đến khi allocation hoàn tất |

## 4. Luồng thẻ tín dụng

### 4.1. Cấu trúc thời gian

Ví dụ statement có deadline `09/11/2026 17:00:00`:

```text
26/09 00:00  ───────── statement cycle hiện tại ───────── 25/10 23:59:59.999
                  giao dịch mới = GRACE_PRINCIPAL

10/10 00:00  ───── repayment window của statement trước ───── 09/11 16:59:59.999

09/11 17:00  ── evaluation: PAID_IN_FULL / MINIMUM_PAID / UNPAID
10/11 00:00  ── nếu không PAID_IN_FULL: prior statement balance thành REVOLVING_PRINCIPAL
```

Các ngày trong sơ đồ phải derive từ statement và account rule. `09/11/2026` chỉ là ví dụ của statement Master cung cấp.

### 4.2. Khi chi tiêu/quẹt thẻ

1. Ghi một ledger event `CARD_SPEND` với `transaction_at`, `posting_at`, `amount`, `merchant`, `reference_code` và `idempotency_key`.
2. Event thuộc statement mở tương ứng theo `posting_at` và được hạch toán vào `GRACE_PRINCIPAL`.
3. Không tạo lãi ngay cho event mới.
4. Event backdated/reversal/refund phải là event riêng; không sửa event cũ.

### 4.3. Khi statement chốt

1. Cuối ngày close của cycle, tạo `credit_statements` với snapshot rule, opening buckets, transactions đã posted, `total_due` và `minimum_due` từ statement VPBank.
2. Lãi đã accrual trên `REVOLVING_PRINCIPAL` của statement trước được ghi `INTEREST_POSTED` vào statement hiện tại.
3. Chi tiêu mới của cycle vẫn được lưu tách với `INTEREST_POSTED`.
4. `closing_balance = opening_balance + new_principal + posted_interest + posted_fee - payments_allocated`.

Ví dụ sao kê Master:

```text
opening_balance                  4.930.908,00
new CARD_SPEND                   1.860.590,00
INTEREST_POSTED                    201.657,12  // lãi của prior revolving principal
PAYMENT_ALLOCATED                 (246.546,00)
closing_balance                  6.746.609,00
```

### 4.4. Khi trả tiền ngẫu nhiên

1. Nhận `PAYMENT` với `effective_at` thực tế. Thời gian này quyết định payment có nằm trước deadline/cutoff hay không.
2. Khóa account và statement đang mở bằng `FOR UPDATE`.
3. Kiểm tra `idempotency_key`/reference statement để retry không trừ tiền lần hai.
4. Ghi payment bất biến, sau đó ghi các `credit_payment_allocations` theo `paymentAllocationPolicy` snapshot.
5. Recompute `amount_paid_before_due` từ allocations có `effective_at < due_at`; không dựa vào `created_at` hoặc UI state.

### 4.5. Evaluation tại deadline

```text
if paid_to_statement_before_due >= statement.total_due:
    statement.status = PAID_IN_FULL
    prior statement remaining principal = 0
    do not create new interest for this statement
else if paid_to_statement_before_due >= statement.minimum_due:
    statement.status = MINIMUM_PAID
    move only unpaid principal of this statement to REVOLVING_PRINCIPAL
    start daily interest accrual for REVOLVING_PRINCIPAL on the next business date
else:
    statement.status = UNPAID
    apply late fee only when its rule is supplied by statement/rule snapshot
    move unpaid principal to REVOLVING_PRINCIPAL
    start daily interest accrual for REVOLVING_PRINCIPAL on the next business date
```

Điểm quan trọng: `minimum_due` làm statement đủ điều kiện `MINIMUM_PAID`, nhưng không khiến statement thành `PAID_IN_FULL`. Chi tiêu mới của statement kế tiếp vẫn nằm ở `GRACE_PRINCIPAL`; lãi tạo ở statement tiếp theo chỉ dựa trên `REVOLVING_PRINCIPAL` của statement trước theo rule Master xác nhận.

### 4.6. Công thức lãi thẻ

```text
monthly_rate = rule.monthlyRatePercent / 100
annual_rate  = rule.annualRatePercent / 100

if rule.ratePeriod == MONTHLY:
    daily_rate = (monthly_rate * 12) / rule.dayCountBasis
else:
    daily_rate = annual_rate / rule.dayCountBasis

daily_interest = round(
    revolving_principal_at_day_end * daily_rate,
    rule.rounding_policy
)
```

- `revolving_principal_at_day_end` giảm ngay từ ngày payment có `effective_at` hợp lệ sau khi payment được allocation vào gốc của statement cũ.
- Không đưa `GRACE_PRINCIPAL` của cycle mới vào `revolving_principal_at_day_end`.
- Không tính lãi trên `ACCRUED_INTEREST`/`POSTED_INTEREST` trừ khi rule snapshot có `capitalizesInterest = true` và statement xác nhận.
- Khi chưa có `day_count_basis`, rounding policy hoặc evidence chính thức về ngày bắt đầu, engine ghi trạng thái `REQUIRES_STATEMENT_RULE`; không được hiển thị lãi là số chính xác.

## 5. Luồng thấu chi tín chấp

### 5.1. Khi rút/chi tiêu và trả tiền

- `OVERDRAFT_DRAW` tăng `REVOLVING_PRINCIPAL` tại `effective_at`.
- `PAYMENT` giảm principal/interest theo policy snapshot tại `effective_at`.
- Không cần chờ sao kê để biết dư nợ thực; statement chỉ là snapshot của ledger.

### 5.2. Daily cutoff 17:00

```text
business_date_cutoff = <business date> + daily_cutoff_time
principal_at_cutoff = sum(principal events effective before cutoff)

if principal_at_cutoff <= 0:
    no INTEREST_ACCRUAL
else:
    daily_interest = round(
        principal_at_cutoff * annual_rate / day_count_basis,
        rounding_policy
    )
    create one idempotent INTEREST_ACCRUAL for account + business_date
```

- Payment lúc `16:59:59.999` có hiệu lực trong ngày; nếu trả hết gốc thì `principal_at_cutoff = 0` và không lãi.
- Payment lúc `17:00:00` hoặc sau đó không đảo lãi đã accrue của ngày đó.
- Worker rerun phải dựa trên `(account_id, business_date, rule_version)` unique key để không tạo lãi trùng.
- Ngày `26` đóng cycle và tạo statement/snapshot tổng các lãi ngày chưa post. Đến ngày `03` của tháng sau, hệ thống import/ghi nhận kết quả ngân hàng tự động thu lãi; không đổi công thức lãi ngày.

## 6. Data model tối thiểu

```text
finance.credit_accounts
  id, personal_asset_id, product_kind, timezone,
  active_rule_version, created_at, updated_at

finance.credit_account_rule_versions
  id, account_id, effective_from, effective_to,
  statement_close_day, default_due_day, default_due_time,
  monthly_rate_percent, annual_rate_percent, rate_period,
  day_count_basis, daily_cutoff_time,
  credit_card_interest_start_policy, payment_allocation_policy,
  rounding_policy, source_type, source_reference, created_at

finance.credit_statements
  id, account_id, cycle_start_at, cycle_close_at, due_at,
  opening_principal, opening_interest, opening_fee,
  new_principal, posted_interest, posted_fee,
  total_due, minimum_due, paid_before_due,
  status, rule_snapshot, external_statement_reference, created_at

finance.credit_account_ledger
  id, account_id, statement_id, event_type,
  effective_at, recorded_at,
  principal_delta, interest_delta, fee_delta, payment_delta,
  source_reference, idempotency_key, metadata, created_at

finance.credit_interest_accruals
  id, account_id, statement_id, business_date,
  basis_principal, daily_rate, interest_amount,
  rule_snapshot, idempotency_key, created_at

finance.credit_payment_allocations
  id, payment_ledger_id, target_ledger_id,
  bucket, amount, created_at
```

Ràng buộc bắt buộc:

- `UNIQUE (account_id, idempotency_key)` cho event có idempotency key.
- `UNIQUE (account_id, business_date, rule_version)` cho daily accrual.
- `CHECK` không cho principal/interest/fee/payment allocation âm sai dấu.
- Foreign keys từ statements, ledger, accruals và allocations.
- Dùng `TABLES`/`COLS` trong `dbSchema`; migration cập nhật `dbSchema` cùng lúc.

## 7. API và UI contract

### 7.1. Form account rule

Form phải lưu các dữ liệu, không code constant:

- Product kind: `CREDIT_CARD` hoặc `OVERDRAFT`.
- Lãi suất và đơn vị: `%/tháng` hoặc `%/năm`.
- Ngày chốt statement, deadline mặc định, timezone.
- Credit card: interest start policy và payment allocation policy.
- Overdraft: cutoff hằng ngày.
- Evidence/source: manual entry, statement import, hợp đồng; source reference.

### 7.2. Statement import

Người dùng nhập/import được:

- Cycle start/end, deadline `due_at`, `total_due`, `minimum_due`.
- Opening balance, transaction total, interest total, fee total, paid during term, closing balance.
- Statement reference/date và attachment metadata.

Import không được rewrite ledger; nếu đối chiếu chênh phải tạo `RECONCILIATION_ADJUSTMENT` có lý do/audit trail.

### 7.3. Read model cho bức tranh tài chính

Finance summary phải hiển thị riêng:

- `graceEligiblePrincipal`.
- `revolvingPrincipal`.
- `accruedInterest` và `postedInterest`.
- `minimumDue`, `totalDue`, `dueAt`, `daysUntilDue`, `statementStatus`.
- `todayInterestRisk` cho thấu chi dựa trên projected balance tại cutoff.
- `paymentAppliedToInterest`, `paymentAppliedToPrincipal`, `unallocatedPayment`.

`monthlyDebtBurden` không được dùng một tỷ lệ 5% tự ước tính. Nó lấy `minimum_due` của statement mở cộng lãi/phí đã posted và projected overdraft interest có evidence rule.

## 8. ACID và scheduler

### Atomicity

Một command quẹt thẻ/rút thấu chi/trả tiền phải commit cùng ledger event, allocation, account read model và outbox event. Lỗi ở bất kỳ bước nào rollback toàn bộ.

### Consistency

- Tổng buckets bằng total account balance tại mọi thời điểm.
- Statement closing phải đối chiếu ledger sum.
- Payment không được allocation vượt payment amount hoặc target outstanding.

### Isolation

- Mọi command tiền tệ lock `credit_accounts` và statement cần cập nhật bằng `FOR UPDATE`.
- Worker daily accrual/statement close sử dụng advisory lock + unique idempotency key.
- Retry webhook/import phải reuse idempotency key.

### Durability

- Ledger immutable, không update/delete financial event sau commit.
- Sửa sai qua reversal/adjustment event.
- Outbox gửi notification chỉ chạy sau commit.

## 9. Kịch bản nghiệm thu

```gherkin
Scenario: Trả đủ statement thẻ trong repayment window
  Given statement A có total_due là 6.746.609 VND và due_at là 09/11/2026 17:00 Asia/Bangkok
  When tổng payment allocation có effective_at trước due_at đạt 6.746.609 VND
  Then statement A là PAID_IN_FULL
  And không tạo lãi cho REVOLVING_PRINCIPAL của statement A
  And chi tiêu statement mới vẫn được giữ trong GRACE_PRINCIPAL

Scenario: Chỉ trả tối thiểu statement thẻ
  Given statement A có minimum_due là 337.331 VND và total_due là 6.746.609 VND
  When payment allocation trước due_at đạt 337.331 VND nhưng nhỏ hơn total_due
  Then statement A là MINIMUM_PAID
  And gốc chưa trả của A trở thành REVOLVING_PRINCIPAL
  And lãi kỳ sau chỉ dựa trên REVOLVING_PRINCIPAL của A
  And không dùng chi tiêu mới của statement B làm basis lãi của A

Scenario: Lãi hiển thị trên statement là lãi của dư nợ kỳ trước
  Given opening balance là 4.930.908 VND
  And CARD_SPEND của kỳ là 1.860.590 VND
  And INTEREST_POSTED là 201.657,12 VND
  When statement được tạo
  Then INTEREST_POSTED không được gắn vào CARD_SPEND của kỳ
  And closing balance đối chiếu đúng với ledger

Scenario: Thấu chi trả hết trước cutoff
  Given principal thấu chi là 5.000.000 VND
  And daily_cutoff_time là 17:00 Asia/Bangkok
  When payment 5.000.000 VND có effective_at là 16:59:59.999
  Then principal_at_cutoff bằng 0
  And không có INTEREST_ACCRUAL cho business date đó

Scenario: Thấu chi trả sau cutoff
  Given principal thấu chi là 5.000.000 VND
  When payment 5.000.000 VND có effective_at là 17:00:00
  Then tạo đúng một INTEREST_ACCRUAL theo principal_at_cutoff
  And payment chỉ ảnh hưởng basis của business date tiếp theo

Scenario: Retry và concurrent payment
  Given hai request payment đồng thời cho cùng account
  When cả hai command được xử lý
  Then tổng allocations không vượt tổng payment hoặc outstanding buckets
  And retry cùng idempotency_key không tạo ledger event thứ hai
```

## 10. Kế hoạch nâng cấp code hiện tại

1. Migration tạo ledger/statement/rule tables; cập nhật `backend/src/db/tables.js` và `dbSchema` trong cùng change.
2. Tạo domain `backend/src/domains/finance/credit/` cho rule validation, ledger posting, statement close, interest accrual và payment allocation.
3. Di chuyển đường `borrowPersonalAsset`/`payPersonalAsset` của các account có `product_kind` sang ledger command; giữ compatibility read model trong giai đoạn migration.
4. Thêm scheduler tasks idempotent: overdraft daily cutoff, credit statement deadline evaluation, statement close/post interest.
5. Thay UI nợ mở bằng statement dashboard và transaction timeline; không thay đổi dữ liệu/sự kiện frontend ngoài phạm vi feature finance.
6. Viết integration tests tái hiện chính xác statement Master, payment trước/sau deadline, payment ngẫu nhiên, rerun task và concurrency.
7. Chỉ chuyển `monthlyDebtBurden` sang source mới sau khi statement reconciliation pass.

## 11. Điều kiện nghiệm thu

- Có ít nhất hai sao kê liên tiếp của cùng thẻ để đối chiếu lãi và payment allocation.
- Tái tính được dòng `201.657,12 VND` trong sao kê Master bằng transaction/posting/payment thực tế hoặc ghi rõ chênh lệch do rule chưa được VPBank cung cấp.
- Không tạo lãi/fee duplicate khi rerun scheduler.
- UI và API hiển thị rõ số nào là `statement imported`, số nào là `calculated`, số nào là `projected`.
- Không hardcode rate, deadline, minimum due, cutoff, payment allocation hoặc interest start policy trong source code.

## 12. Làm rõ thấu chi: chốt lãi ngày 26, thu lãi ngày 03

Phần này thay thế mọi diễn giải trước đó hiểu ngày `26` là ngày tự động thu lãi.

### 12.1. Chu kỳ lãi và ngày thu

```text
interest cycle:  [ngày 26 00:00:00, ngày 26 kế tiếp 00:00:00)
accrual:         mỗi business date tại daily_cutoff_time từ rule form
statement close: đúng mốc kết thúc cycle
interest debit:  ngày thu lãi cấu hình của tháng ngay sau statement close
```

Ví dụ: cycle từ `26/09/2026 00:00:00` đến trước `26/10/2026 00:00:00` chứa các lãi ngày của chu kỳ đó; ngân hàng chốt tại ngày `26/10/2026` và tự động thu phần lãi vào ngày `03/11/2026`. Tất cả mốc phải derive từ rule form/sao kê, không gắn cứng vào code.

### 12.2. Thuật toán thấu chi chuẩn

1. Mỗi ngày trước cutoff, tập hợp toàn bộ `OVERDRAFT_DRAW`, payment, reversal và adjustment có `effective_at` trước cutoff.
2. Tính `principal_at_cutoff`. Nếu bằng `0`, không tạo lãi ngày. Nếu dương, tạo một `INTEREST_ACCRUAL` idempotent với basis là principal tại cutoff.
3. Từ ngày `26` đến trước ngày `26` tiếp theo, cộng các `INTEREST_ACCRUAL` thành `interest_due` của statement cycle. Không đưa chi tiêu/gốc tháng mới vào lãi đã chốt.
4. Ngày `26`, tạo statement ở trạng thái `INTEREST_PENDING_COLLECTION`: snapshot `interest_due`, daily accrual lines, rule snapshot và dự kiến ngày thu lãi `interest_collection_at`.
5. Ngày `03` sau khi close, không tự giả định tiền đã thu thành công. Import/gắn event thực tế từ VPBank và chỉ phân bổ vào `POSTED_INTEREST` của statement đã chốt:
   - `INTEREST_COLLECTION_SUCCEEDED`: debit tài khoản nguồn, khép `interest_due` của statement.
   - `INTEREST_COLLECTION_PARTIAL`: lưu số đã thu và phần lãi còn phải thu.
   - `INTEREST_COLLECTION_FAILED`: giữ lãi phải thu, tạo cảnh báo; không xóa hoặc tính lại lãi lịch sử.
6. Một payment/overdraft draw của cycle mới vẫn tiếp tục ảnh hưởng `principal_at_cutoff` của ngày tương ứng; event thu lãi ngày `03` không đảo hay thay đổi daily accrual của cycle đã khóa.
7. Nếu ngân hàng thu lãi lúc một timestamp cụ thể, dùng timestamp trong giao dịch bank làm `effective_at`; form chỉ giữ `interest_collection_day = 3` và optional `interest_collection_time` để tạo expected collection, không thay bằng bằng chứng giao dịch.

### 12.3. Dữ liệu rule bắt buộc bổ sung cho thấu chi

```ts
interface OverdraftRuleSnapshot {
  statementCloseDay: number;          // Form, ví dụ 26
  dailyCutoffTime: string;            // Form, ví dụ 17:00
  interestCollectionDay: number;      // Form, ví dụ 3
  interestCollectionTime: string | null;
  annualRatePercent: number;
  dayCountBasis: 365 | 366;
  roundingPolicy: "HALF_UP" | "DOWN" | "BANK_STATEMENT";
}
```

### 12.4. Kịch bản nghiệm thu bổ sung

```gherkin
Scenario: Thấu chi chốt lãi ngày 26 và VPBank thu lãi ngày 03
  Given overdraft cycle là từ 26/09/2026 đến trước 26/10/2026
  And lãi ngày đã được accrual idempotent theo principal tại cutoff
  When close statement tại ngày 26/10/2026
  Then statement có trạng thái INTEREST_PENDING_COLLECTION
  And interest_due bằng tổng daily accrual trong cycle
  And expected_interest_collection_at thuộc ngày 03/11/2026

Scenario: VPBank tự động thu lãi thành công
  Given statement overdraft có interest_due chưa thu
  When import transaction VPBank ngày 03 có số tiền khớp interest_due
  Then ghi INTEREST_COLLECTION_SUCCEEDED một lần theo bank reference
  And statement là INTEREST_COLLECTED
  And không làm thay đổi principal hoặc tạo lại daily accrual lịch sử

Scenario: VPBank không thu đủ lãi
  Given statement overdraft có interest_due 100.000 VND
  When import transaction thu lãi ngày 03 chỉ có 40.000 VND
  Then statement là INTEREST_COLLECTION_PARTIAL
  And outstanding posted interest còn 60.000 VND
  And hệ thống không xóa phần còn lại hoặc đánh dấu đã thu đủ
```

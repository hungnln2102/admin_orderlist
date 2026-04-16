# Task Theo Dõi - Webhook Sepay Financial Reconcile

## Mục tiêu

Đồng bộ luồng webhook + thao tác thủ công để không lệch doanh thu/lợi nhuận, sử dụng:

- `orders.payment_receipt`
- `orders.payment_receipt_financial_state`
- `orders.order_list`
- `partner.supplier_order_cost_log`
- `finance.dashboard_monthly_summary`

## P0 - Bắt buộc

- [x] Webhook: set cờ `is_financial_posted`, `posted_revenue`, `posted_profit` ngay khi ghi sổ.
- [x] Chặn double-post: nếu `is_financial_posted = true` thì bỏ qua ghi sổ tài chính lần 2.
- [x] Implement đúng rule theo trạng thái đơn:
  - `Chưa Thanh Toán` / `Cần Gia Hạn`: chạy luồng cũ.
  - `Đang Xử Lý` / `Đã Thanh Toán`: nếu đã có receipt theo `id_order` thì cộng thẳng, nếu chưa có thì không cộng.
  - `Hết Hạn`: khi nhận webhook (kể cả đã có mã đơn) thì cộng thẳng biên lai vào doanh thu/lợi nhuận, không trừ `cost`.
- [x] Webhook không mã đơn: để trống `id_order`, vẫn post doanh thu/lợi nhuận theo policy hiện tại.

## P1 - Nghiệp vụ vận hành

- [x] Chuẩn hóa nút `Thanh Toán` / `Gia Hạn` thủ công để không double-count với receipt đã post.
  - `Thanh Toán`: frontend nút thủ công set thẳng `Chưa Thanh Toán -> Đã Thanh Toán` (không qua `Đang Xử Lý`).
  - `Gia Hạn`: `runRenewal(..., { source: "manual" })` bỏ qua cộng dashboard nếu đã có receipt `is_financial_posted = true`.
- [x] Tạo API reconcile: gán `id_order` cho receipt không mã.
- [x] Reconcile case 1 (đơn đã gia hạn trước): tạo adjustment trừ lại doanh thu + lợi nhuận đã cộng tạm.
- [x] Reconcile case 2 (`Chưa Thanh Toán` / `Cần Gia Hạn`): giữ doanh thu, trừ thêm `cost` vào lợi nhuận.
- [x] Update cờ `reconciled_at`, `adjustment_applied` sau khi reconcile.

## P1 - Kỹ thuật an toàn

- [x] Dedupe thống nhất: `sepay_transaction_id` -> `reference_code + transfer_type + amount + payment_date` -> fallback.
- [x] Thêm audit log cho mọi quyết định ghi sổ (`receipt_id`, `order_code`, `rule_branch`, `delta`).
  - Bảng: `orders.payment_receipt_financial_audit_log` (migration `066_payment_receipt_financial_audit_log.sql`).
  - Webhook: các `rule_branch` ví dụ `UNPAID_TO_PAID`, `NO_ORDER_CODE_AMOUNT_POST`, `SKIP_DUPLICATE_OR_ALREADY_POSTED`, ...
  - Reconcile: `RECONCILE_CASE1_*`, `RECONCILE_CASE2_*`, `RECONCILE_SKIPPED_ALREADY_APPLIED`.

## P2 - Hỗ trợ đối soát

- [x] Backfill state cho dữ liệu cũ nếu cần đối soát lịch sử — state row đã có từ migration `065`; audit lịch sử tùy chọn: `backend/scripts/ops/backfill-financial-audit-from-state.js`.
- [x] Tạo màn hình/báo cáo danh sách receipt `id_order = ''` để xử lý định kỳ — API: `GET /api/payment-receipts?missingOrderCode=1` (filter `id_order` rỗng).
- [x] Đồng bộ lại tài liệu `LUONG_LOI_NHUAN_HE_THONG.md` với quy tắc mới (mục 9).

## Test cases bắt buộc

- [x] Duplicate webhook cùng `sepay_transaction_id` không được cộng lần 2 — script: `C7` trong `run-webhook-financial-reconcile-tests.js`.
- [x] Webhook không mã đơn vẫn tạo state row và ghi sổ đúng policy — `C4`.
- [x] Webhook có mã đơn vào từng trạng thái đơn cho ra `revenue/profit` đúng — `C1`–`C3`.
- [x] Manual action sau webhook không double-count — script bổ sung `C8` (manual thanh toán) và `C9` (manual gia hạn) trong `run-webhook-financial-reconcile-tests.js`.
- [x] Reconcile 2 trường hợp chạy đúng adjustment — `C5`, `C6`.

## Tiến độ

- [x] Tạo bảng `payment_receipt_financial_state`.
- [x] Backfill state row cho receipt cũ.
- [x] Parser `id_order` chỉ nhận mã MAV hợp lệ.
- [x] Dedupe Sepay bằng `sepay_transaction_id` và fallback `reference_code`.
- [x] Hoàn tất toàn bộ P0.
--------------------------------------------------------------------------------------

## Luồng hiện tại (trực quan)

### 1) Nhận webhook

```text
Khi hệ thống nhận được webhook thanh toán
        |
        +-- Nếu webhook có mã đơn
        |      |
        |      +-- Đơn đang "Chưa Thanh Toán"
        |      |      -> Hệ thống tự chuyển đơn sang "Đã Thanh Toán"
        |      |      -> Doanh thu/lợi nhuận được ghi nhận theo giá trị của đơn
        |      |
        |      +-- Đơn đang "Cần Gia Hạn"
        |      |      -> Hệ thống ghi nhận thanh toán
        |      |      -> Tự xử lý gia hạn
        |      |      -> Sau khi gia hạn thành công, đơn chuyển sang "Đã Thanh Toán"
        |      |
        |      +-- Đơn đang "Đã Thanh Toán" hoặc "Đang Xử Lý"
        |      |      -> Hệ thống kiểm tra lịch sử biên lai trong chu kỳ (rule `hasPriorReceipt`)
        |      |      -> Nếu KHÔNG có biên lai trước đó của đơn: KHÔNG cộng doanh thu/lợi nhuận
        |      |      -> Nếu ĐÃ có biên lai trước đó của đơn: cộng thẳng doanh thu/lợi nhuận (không trừ cost)
        |      |
        |      +-- Đơn đang "Hết Hạn"
        |             -> Cộng thẳng biên lai vào doanh thu/lợi nhuận (không trừ cost), dù biên lai đã có mã đơn
        |
        +-- Nếu webhook không có mã đơn
               -> Hệ thống vẫn ghi nhận giao dịch thanh toán
               -> Tạm ghi nhận doanh thu/lợi nhuận theo số tiền nhận được
               -> Giao dịch được đưa vào danh sách cần gán lại đúng mã đơn sau đó
```

### 2) Reconcile webhook không mã đơn

```text
Khi gán lại giao dịch "không có mã đơn" vào đúng đơn hàng
        |
        +-- Bắt buộc: ngay lúc nhận webhook không mã đơn, hệ thống đã cộng trước doanh thu/lợi nhuận theo số tiền biên lai
        |
        +-- Nếu đơn đã xử lý xong (Đã Thanh Toán / Đang Xử Lý)
        |      -> Hệ thống trừ phần đã ghi tạm trước đó
        |      -> Mục tiêu: không bị cộng trùng doanh thu/lợi nhuận
        |
        +-- Nếu đơn chưa xử lý xong (Chưa Thanh Toán / Cần Gia Hạn)
               -> Giữ nguyên doanh thu đã ghi
               -> Điều chỉnh lại lợi nhuận theo chi phí thực tế của đơn
```

### 3) Bấm thủ công button Gia Hạn / Thanh Toán

```text
Khi nhân viên bấm "Thanh Toán" thủ công
        -> Đơn chuyển sang "Đã Thanh Toán"
        -> Đây là nghiệp vụ gia hạn sớm cho khách (khách có thể thanh toán sau)
        -> Ghi nhận doanh thu/lợi nhuận theo luồng thủ công, không mô tả theo hướng "webhook đã đến trước"

Khi nhân viên bấm "Gia Hạn" thủ công
        -> Hệ thống gia hạn đơn theo quy trình
        -> Đây là nghiệp vụ gia hạn sớm cho khách (khách có thể thanh toán sau)
        -> Ghi nhận doanh thu/lợi nhuận theo luồng thủ công, không mô tả theo hướng "webhook đã đến trước"
```

### 4) Ghi nhớ nhanh (anti double-count)

- Nguyên tắc quan trọng nhất: một giao dịch chỉ được tính tài chính một lần.
- Hệ thống có cơ chế chống nhận webhook trùng và chống cộng trùng khi thao tác thủ công.
- Các kịch bản thao tác thủ công sau webhook đã được kiểm thử và đạt.
-------------------------------------------------------------------
### Tóm tắt nhanh (đúng theo code hiện hành)

Nhận webhook:
- Có mã đơn:
  - `Chưa Thanh Toán`: đổi `Đã Thanh Toán`, ghi nhận tài chính theo rule hiện tại.
  - `Cần Gia Hạn`: chạy renewal, ghi nhận theo rule renewal.
  - `Đã Thanh Toán` / `Đang Xử Lý`:
    - Không có biên lai trước đó trong chu kỳ: không cộng.
    - Đã có biên lai trước đó trong chu kỳ: cộng thẳng doanh thu/lợi nhuận (không trừ cost).
  - `Hết Hạn`: cộng thẳng biên lai vào doanh thu/lợi nhuận (không trừ `cost`).
- Không có mã đơn:
  - Bắt buộc cộng trước doanh thu/lợi nhuận theo số tiền biên lai ngay lúc nhận webhook.
  - Đưa vào danh sách chờ gán mã đơn (`id_order = ''`).

2 nút thủ công:
- `Thanh Toán`: nghiệp vụ gia hạn sớm cho khách, khách có thể thanh toán sau.
- `Gia Hạn`: nghiệp vụ gia hạn sớm theo luồng thủ công, khách có thể thanh toán sau.

Gán mã đơn (reconcile receipt không mã):
- Chỉ gán `id_order` + điều chỉnh doanh thu/lợi nhuận theo rule reconcile.
- Không tự đổi trạng thái đơn.
- Không tự tạo thêm log cost NCC.

## Task chưa hoàn thành - kế hoạch triển khai (2026-04-16)

### P0 - Làm ngay (đồng bộ tài liệu với code đang chạy)

- [x] **T1. Viết lại block tóm tắt cuối file** (đoạn từ `Nhận webhook ...`) theo logic thực tế hiện hành.
  - **Đầu ra:** block mô tả mới, bỏ toàn bộ câu chữ gây hiểu nhầm.
  - **Tiêu chí đạt:**
    - Manual `Thanh Toán` được mô tả theo nghiệp vụ gia hạn sớm (khách có thể thanh toán sau).
    - Manual `Gia Hạn` được mô tả cùng ngữ nghĩa nghiệp vụ gia hạn sớm (khách có thể thanh toán sau).
    - Reconcile receipt không mã chỉ điều chỉnh tài chính + gán `id_order`, không tự đổi trạng thái đơn.
    - Reconcile không tự tạo log cost NCC.
    - Nhánh `Đã Thanh Toán` / `Đang Xử Lý` diễn đạt theo rule `hasPriorReceipt`, không dùng từ “biến động”.

### P1 - Chờ chốt nghiệp vụ (chưa có trong code)

- [x] **T2. Chốt nghiệp vụ cho luồng “reconcile + hành động đơn”**.
  - **Cần chốt 3 action hỗ trợ khi gán mã đơn:**
    - `reconcile_only`
    - `reconcile_and_mark_paid`
    - `reconcile_and_renew`
  - **Đầu ra:** tài liệu rule quyết định action + điều kiện cho phép + anti double-log NCC.
  - **Rule chốt:**
    - Mặc định hệ thống dùng `reconcile_only` (an toàn, không đụng trạng thái đơn).
    - `reconcile_and_mark_paid` chỉ cho phép khi đơn đang `Chưa Thanh Toán`.
    - `reconcile_and_renew` chỉ cho phép khi đơn đang `Cần Gia Hạn`.
    - Cả 3 action đều phải qua cùng một cơ chế idempotent (`adjustment_applied`) để chống chạy lặp.
    - Nếu action không phù hợp trạng thái hiện tại thì reject `409` (không tự fallback ngầm).

- [x] **T3. Thiết kế API/contract cho action khi gán mã đơn**.
  - **Đầu ra:** spec request/response, rule validate, mã lỗi, mapping audit log.
  - **Tiêu chí đạt:** backward-compatible với flow `reconcile` hiện tại.
  - **Contract đề xuất (backward-compatible):**
    - Endpoint: `POST /api/payment-receipts/:receiptId/reconcile`
    - Request body:
      - `orderCode: string` (bắt buộc, dạng `MAV...`)
      - `action?: "reconcile_only" | "reconcile_and_mark_paid" | "reconcile_and_renew"` (optional, default `reconcile_only`)
    - Response:
      - `success`, `receiptId`, `orderCode`, `action`, `status`, `revenueDelta`, `profitDelta`, `postedRevenue`, `postedProfit`, `reconciledAt`
    - Error codes:
      - `400`: dữ liệu đầu vào sai định dạng.
      - `404`: không tìm thấy receipt hoặc order.
      - `409`: action không hợp lệ với trạng thái đơn hiện tại / vi phạm idempotent.
      - `500`: lỗi hệ thống.
    - Audit:
      - `RECONCILE_ONLY_*`
      - `RECONCILE_AND_MARK_PAID_*`
      - `RECONCILE_AND_RENEW_*`

- [x] **T4. Implement action `reconcile_and_mark_paid`** (nếu nghiệp vụ bắt buộc).
  - **Mục tiêu:** gán mã đơn cho đơn `Chưa Thanh Toán` và chuyển `Đã Thanh Toán` theo rule mới.
  - **Ràng buộc:** không double-count doanh thu/lợi nhuận, không double-log NCC.
  - **Đã làm:** hỗ trợ action qua API `POST /api/payment-receipts/:receiptId/reconcile` với validate trạng thái + audit branch `RECONCILE_AND_MARK_PAID_APPLIED`.

- [x] **T5. Implement action `reconcile_and_renew`** (nếu nghiệp vụ bắt buộc).
  - **Mục tiêu:** gán mã đơn cho đơn `Cần Gia Hạn` và chạy gia hạn theo rule mới.
  - **Ràng buộc:** không double-count doanh thu/lợi nhuận, không double-log NCC.
  - **Đã làm:** hỗ trợ action `reconcile_and_renew` + trigger `runRenewal(..., { source: "manual" })` sau reconcile; audit branch `RECONCILE_AND_RENEW_QUEUED`.

- [x] **T6. Bổ sung test bắt buộc cho T4/T5**.
  - **Bộ test tối thiểu:**
    - [x] 1 case thành công cho mỗi action (`C10`, `C11` trong script test).
    - [x] 1 case idempotent (bấm lặp lại / webhook đến trễ) cho mỗi action (`C12`, `C13` trong script test).
    - [x] 1 case bảo vệ chống tạo trùng log NCC (giữ nguyên guard `adjustment_applied` + validate trạng thái action trong cùng flow reconcile).

### Thứ tự triển khai đề xuất

1. Hoàn tất `T1` để tài liệu và code đồng nhất.
2. Chốt nghiệp vụ (`T2`) rồi mới thiết kế API (`T3`).
3. Sau khi chốt API mới implement (`T4`, `T5`), cuối cùng khóa test (`T6`).
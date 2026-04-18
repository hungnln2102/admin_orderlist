# Luồng Webhook Sepay - Đối Soát Và Ghi Sổ Tài Chính

## Mục tiêu

Tài liệu này mô tả **duy nhất luồng webhook Sepay** cho đơn hàng:

- Nhận webhook, dedupe và ghi receipt.
- Quy tắc đối soát số tiền với ngưỡng lệch `5.000 VND`.
- Quy tắc cộng dồn nhiều webhook trong cùng chu kỳ.
- Quy tắc ghi doanh thu/lợi nhuận và đổi trạng thái đơn.
- Guard tránh xung đột với nhánh cũ cộng thẳng doanh thu/lợi nhuận.

## Bảng dữ liệu liên quan

- `orders.payment_receipt`
- `orders.payment_receipt_financial_state`
- `orders.payment_receipt_financial_audit_log`
- `orders.order_list`
- `finance.dashboard_monthly_summary`

## 1) Luồng tổng quan

```text
Webhook vào
  -> Xác thực chữ ký/API key
  -> Parse payload + tách mã đơn
  -> Dedupe receipt
  -> Đối soát amount theo rule 5.000
  -> Quyết định:
       (A) Đủ điều kiện hoàn tất ngay
       (B) Chờ top-up webhook tiếp theo
  -> Ghi sổ tài chính theo nhánh
  -> Cập nhật trạng thái đơn (nếu đủ điều kiện)
  -> Ghi audit log
```

## 2) Rule amount theo ngưỡng 5.000

Định nghĩa:

- `order_price`: giá bán của đơn.
- `received_current`: số tiền của webhook hiện tại.
- `required_min = order_price - 5.000`.

Quy tắc:

- Nếu `received_current >= required_min`:
  - Đơn đủ điều kiện hoàn tất.
  - Ghi doanh thu/lợi nhuận theo **`received_current`**.
- Nếu `received_current > order_price`:
  - Vẫn hoàn tất đơn.
  - Ghi doanh thu/lợi nhuận theo **`received_current`**.
- Nếu `received_current < required_min`:
  - Chưa hoàn tất đơn.
  - Chuyển trạng thái flow: `AWAITING_TOPUP`.

## 3) Rule cộng dồn nhiều webhook cùng đơn

Áp dụng khi webhook hiện tại thiếu quá ngưỡng:

- Cộng dồn theo `id_order` trong cùng chu kỳ, chỉ lấy receipt hợp lệ (không duplicate).
- `received_accumulated = tổng receipt hợp lệ trong chu kỳ`.
- Nếu `received_accumulated >= required_min`:
  - Chuyển flow `ELIGIBLE_BY_ACCUMULATION`.
  - Hoàn tất đơn đúng 1 lần.
  - Ghi tài chính theo tổng thực nhận tích lũy.
- Nếu chưa đạt:
  - Giữ `AWAITING_TOPUP`, tiếp tục chờ webhook sau.

## 4) Quy tắc ghi tài chính

- Nhánh hoàn tất ngay theo ngưỡng 5.000:
  - Ghi theo tiền webhook thực nhận của lần hiện tại.
- Nhánh hoàn tất do cộng dồn:
  - Ghi theo tổng tiền webhook tích lũy trong chu kỳ.
- Nhánh chờ top-up:
  - Chưa đổi trạng thái hoàn tất đơn.
  - Chưa chạy nhánh tài chính hoàn tất đơn.

## 5) Guard chống xung đột với flow cũ

Trước khi chạy nhánh cũ cho trạng thái `Đã Thanh Toán` / `Đang Xử Lý`:

- Nếu receipt thuộc flow mới (`AWAITING_TOPUP` hoặc `ELIGIBLE_BY_ACCUMULATION`):
  - Không đi vào nhánh late-payment cũ.
  - Chỉ đi theo logic amount 5.000 + cộng dồn.
- Nếu không thuộc flow mới:
  - Giữ nguyên nhánh cũ theo rule hiện hành.

## 6) Audit log bắt buộc

Mỗi quyết định webhook cần ghi branch rõ ràng, đề xuất tối thiểu:

- `WITHIN_5K_COMPLETE`
- `OVERPAID_COMPLETE`
- `UNDER_5K_WAIT_TOPUP`
- `ACCUMULATED_COMPLETE`
- `SKIP_DUPLICATE_OR_ALREADY_POSTED`

Payload audit nên có:

- `order_code`
- `received_current`
- `received_accumulated`
- `order_price_at_webhook`
- `required_min`
- `shortfall_amount`
- `webhook_amount_flow`

## 7) Quy tắc hiển thị UI "Chênh lệch webhook"

- Dùng biên lai mới nhất của đơn:
  - `latest_delta = latest_webhook_amount - order_price`
- Nếu đơn đang chờ top-up:
  - Nên hiển thị thêm `accumulated_delta` để vận hành biết tiến độ đủ ngưỡng.

## 8) Phạm vi tài liệu này

- Chỉ mô tả webhook Sepay và quyết định tài chính liên quan webhook.
- Có kèm sơ đồ tổng quát cho thao tác gán/sửa mã đơn ở đơn hết hạn để vận hành.
- Không mô tả chi tiết luồng manual `Thanh Toán` / `Gia Hạn`.

## 9) Sơ đồ luồng webhook hiện tại

```mermaid
flowchart TD
    A[Webhook Sepay vào] --> B[Xác thực chữ ký / API key]
    B -->|Fail| Z1[Reject 403]
    B -->|Pass| C[Parse payload + tách order_code]
    C --> D[Dedupe receipt]
    D -->|Duplicate| Z2[Skip ghi sổ lần 2]
    D -->|New receipt| E{Có order_code?}

    E -->|Không| N1[Ghi receipt không mã đơn]
    N1 --> N2[Post tài chính theo policy no-code]
    N2 --> END1[Kết thúc]

    E -->|Có| F[Lấy trạng thái đơn + giá bán + dữ liệu chu kỳ]
    F --> G[required_min = order_price - 5000]
    G --> H[received_accumulated = tổng receipt hợp lệ cùng chu kỳ]

    H --> I{Đơn đang Đã Thanh Toán?}
    I -->|Không| J{received_accumulated >= required_min?}
    J -->|Không| K[UNDER_5K_WAIT_TOPUP<br/>Giữ trạng thái chờ]
    K --> END2[Kết thúc, đợi webhook tiếp theo]
    J -->|Có| L[ACCUMULATED_COMPLETE / WITHIN_5K_COMPLETE<br/>Đổi trạng thái hoàn tất đơn]
    L --> M[Ghi doanh thu/lợi nhuận theo tiền thực nhận<br/>nhánh hoàn tất]
    M --> END3[Kết thúc]

    I -->|Có| P{Đã có webhook trước đó cùng chu kỳ<br/>và đã đủ điều kiện hoàn tất?}
    P -->|Không| Q[Không cộng thẳng<br/>hoặc xử lý theo nhánh hiện hành phù hợp]
    Q --> END4[Kết thúc]
    P -->|Có| R[Webhook 3+ late in-cycle<br/>Cộng thẳng doanh thu]
    R --> S[Cộng lợi nhuận không trừ cost]
    S --> T[Audit branch: PAID_LATE_POST]
    T --> END5[Kết thúc]
```

## 10) Sơ đồ gán mã đơn / sửa mã đơn cho đơn hết hạn

```mermaid
flowchart TD
    A[Gán mã đơn / sửa mã đơn] --> B[Xác định receipt và order đích]
    B --> C{Dữ liệu hợp lệ?}
    C -->|Không| Z1[Reject]
    C -->|Có| D{Đơn là Hết Hạn?}
    D -->|Không| Z2[Reject theo policy]
    D -->|Có| E[Khóa idempotent]
    E --> F{Loại thao tác}

    F -->|Gán mã cho receipt không mã| G[Link receipt vào order_code mới]
    F -->|Sửa mã đơn hiện có| H[Cập nhật id_order trên order_list]

    G --> I{Receipt đã reconcile?}
    I -->|Chưa| J[Chạy reconcile adjustment]
    I -->|Rồi| K[Skip adjustment lặp]

    J --> L[Update state: reconciled_at / adjustment_applied]
    K --> L
    H --> M[Đồng bộ tham chiếu liên quan]

    L --> N[Audit: RECONCILE_* / ORDER_CODE_ASSIGNED]
    M --> O[Audit: ORDER_CODE_UPDATED]

    N --> END1[Kết thúc]
    O --> END2[Kết thúc]
```

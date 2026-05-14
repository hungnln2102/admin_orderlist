# Credit khách hàng, đơn mới, QR — hướng dẫn nghiệp vụ & theo dõi

Tài liệu này tóm tắt cách hệ thống xử lý **refund credit** (phiếu credit), trạng thái đơn, **VietQR**, và cách **dùng lại số dư** credit sau khi tạo đơn. Phần theo dõi gợi ý màn hình/flow để bạn bổ sung dần trên admin.

## 1. Trạng thái đơn + QR (luồng thực tế)

| Tình huống | Trạng thái sau khi tạo / sau thanh toán | Số tiền trên VietQR (khi còn cho phép quét) |
|------------|----------------------------------------|---------------------------------------------|
| Có trừ credit, **còn phải thu** > 5.000 VND (sau trừ credit) | Chưa Thanh Toán | **Số còn phải thu** = giá bán gross − số credit áp dụng (khớp với trường `price` trên đơn). |
| Có trừ credit, **còn phải thu** từ 0 đến 5.000 VND (sai số) | **Đã Thanh Toán** ngay khi tạo (coi như đủ, không cần bước thu thêm) | Không còn QR thu hộ (đơn đã ở trạng thái đã thanh toán; QR khóa theo chính sách màn hình). |
| Credit **đủ hoặc dư hơn** so với giá đơn mới (phần áp tối đa = hết phần “giá phải trả” của đơn) | Tùy số còn lại: nếu ≤ 5.000 thì coi **Đã Thanh Toán**; nếu > 5.000 thì **Chưa Thanh Toán** | Khi chưa thanh toán: vẫn theo cột còn thu. |
| Đã chuyển **Đã Thanh Toán** (Sephay/duyệt) | — | Màn hình **không** dùng QR để thu nữa; hiển thị giá tham chiếu có thể dùng `gross_selling_price` + dòng credit đã áp, không còn “mã theo số tạm ứng”. |

**Sai số 5.000 VND** áp dụng cho *phần còn lại cần thu* sau khi trừ credit: nếu số dư này nằm trong [0, 5.000] thì bỏ qua bước thu, đưa thẳng về **Đã Thanh Toán**.

**Credit > giá đơn mới (ví dụ phiếu 368.000, đơn 150.000):**  
Hệ thống ghi bút `refund_credit_applications` (150.000) **trỏ tới id phiếu cũ** (audit), sau đó **đóng** phiếu 368.000: `status = VOID`, `available = 0`, gắn `succeeded_by_note_id` → **tạo phiếu mới** (218.000, `split_from_note_id` = id phiếu cũ). Lần sau chọn **id / mã phiếu mới** (số còn thực) — phiếu cũ **không** còn xuất hiện khi tìm phiếu mở.

**Dùng hết một lần (không còn số dư):** Một bút dùng, trigger gán **FULLY_APPLIED**; **không** tạo phiếu dư, không tách dòng.

## 2. Dùng lại số credit còn dư thêm một lần nữa

1. Mỗi lần áp dụng credit, ghi dòng trong **`receipt.refund_credit_applications`** (đích, số tiền, thời điểm; `credit_note_id` = **phiếu tại thời điểm trừ** — thường id phiếu cũ trước khi tách).  
2. Nếu còn số dư sau lần trừ: xem **mục tách dòng ở trên**; số còn nằm ở **phiếu mới** (OPEN).  
3. **Để dùng lại:** chọn `refund_credit_note_id` = **phiếu còn mở** mới (API tạo đơn trả về `refund_credit_replacement_note_id` / `refund_credit_note_id` khi có tách). `getLatestRefundCreditNoteBySourceOrder` bỏ qua VOID nên vẫn trả về **phiếu mới** cùng `source_order_list_id`.  
4. Trên list đơn, cột tùy chọn: `refund_credit_effective_*` = phiếu theo dõi số còn (sau cơ chế `succeeded_by_note_id` / tự bản thân nếu không tách).  
5. Hết sạch: phiếu hiện tại về **FULLY_APPLIED** — không chọn thêm.

**Ghi chú sản phẩm (UX):** Nên cho phép tìm phiếu theo **SĐT / tên** kèm số còn lại, để thấy nhanh “còn bao nhiêu dùng tiếp”.

## 3. Nên ghi chú theo dõi ở trang màn hình nào?

Gợi ý ánh xạ màn hình (admin `admin_orderlist`):

| Nội dung theo dõi | Nơi hợp lý | Ghi chú kỹ thuật |
|-------------------|------------|-----------------|
| Từng dòng trừ credit theo **đơn mới** | Bảng đơn + (tương lai) panel “Credit đã dùng” từ `refund_credit_applications` | Mỗi dòng: `target_order_code`, `applied_amount`, `applied_at`, `credit_note_id`. |
| Số còn lại theo **phiếu** | Cùng trang nguồn hoàn (_đơn cũ_) hoặc màn “Phiếu credit” tập trung | Đọc từ `receipt.refund_credit_notes` (`available_amount`, `status`). |
| Cột **“Giá trước credit”** trên list đơn | `docs` / list orders query | Khi tạo đơn có credit, lưu thêm `orders.order_list.gross_selling_price`; công thức hiển thị: `COALESCE(gross_selling_price, price + applied) AS price_before_credit`. |

Bạn có thể **đánh dấu nội bộ** trên tài liệu dự án: “Single source: `refund_credit_notes` + `refund_credit_applications` + cột `gross_selling_price` trên `order_list` khi áp credit.”

## 4. Hướng thiết kế: trang “Sổ credit khách” vs chọn credit khi tạo đơn

**A. Tối thiểu (đang có):** trên form **Tạo đơn mới (Order Builder)** — mục chọn `refund_credit_note_id` + số trừ tối đa (đã bị cắt theo `min(yc, giá gross, available)` ở backend). Đủ cho vận hành.  

**B. Tối ưu theo dõi:** thêm trang (hoặc tab) **“Credit theo SĐT / theo mã đơn nguồn”**:
- Bảng phiếu: mã, đơn nguồn, ban đầu, đã dùng, còn lại, trạng thái.  
- Expand: danh sách `applications` (các đơn đã trừ).  
- Có bộ lọc **OPEN / PARTIALLY / FULLY**.  

**C. Tạo đơn nâng cao:** Autocomplete: gõ mã cũ hoặc SĐT → trả về **mọi** phiếu còn hạn sử dụng; mặc định số trừ = `min(available, giá đang nhập)`.

Bạn chọn (B) nếu phải đối soát nhiều; chọn (A) nếu số lượng phiếu/đơn ít.

## 5. Tham số cấu hình trong code (backend)

- Ngưỡng: **`CREDIT_BALANCE_TOLERANCE_VND = 5000`** (trong `createOrder` — đơn tạo xong, nếu còn thu ≤ 5.000 thì gán **Đã Thanh Toán** và `price = 0`).  
- Cột: **`gross_selling_price`** trên `orders.order_list` (migration 084) — bắt buộc khi cần hiển thị **giá niêm yết** đúng sau khi `price` đã bị hạ còn 0.  

Khi cập nhật DB, chạy migration mới tương ứng trong `database/migrations/`.

- Migration **085**: cột `split_from_note_id`, `succeeded_by_note_id` trên `receipt.refund_credit_notes` và cập nhật `fn_recompute_refund_credit_note_balance` (bỏ qua dòng `VOID`).

---
*Tài liệu này bám theo mô tả nghiệp vụ; điều chỉnh số 5.000 hoặc quy tắc tách phiếu cần thống nhất với kế toán nội bộ trước khi sửa code.*

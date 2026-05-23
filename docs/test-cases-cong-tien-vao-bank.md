# Test case — kiểm tra cộng tiền vào bank (credit)

Mục tiêu: đảm bảo **không có chỗ nào cộng tiền hai lần** vào số dư bank shop sau khi đã chỉnh sang dùng STK làm sổ chính.

Quy ước:
- **STK** = số dư trên từng tài khoản (sổ mới — nguồn sự thật).
- **Sổ tổng cũ** = cột số dư bank ước tính trên báo cáo tháng dashboard (legacy).
- **Lợi nhuận khả dụng** (UI dashboard) = tổng số dư STK đang bật, **không** đọc sổ tổng cũ.

---

## 1. Bảng tổng kết các đường có thể cộng tiền vào bank

| # | Tình huống | Cộng STK | Cộng sổ tổng cũ | Có dedup | Trạng thái |
|---|------------|----------|------------------|----------|------------|
| 1 | Webhook Sepay nhận CK mới | **Có** | Không | Theo mã biên lai | An toàn |
| 2 | Hoàn thành đơn “webhook thủ công” | **Có** | Không | Theo mã biên lai | An toàn |
| 3 | NCC hoàn tiền cho shop (xác nhận chu kỳ với nội dung khớp biên lai Sepay) | **Có** (cùng biên lai với webhook) | Không | Theo mã biên lai | An toàn |
| 4 | Hủy hoàn tiền khách (đơn rời khỏi trạng thái hoàn) | Không | **Có** (legacy) | Không | **Lệch — cần khắc phục** |
| 5 | Đơn MAVN nội bộ rớt khỏi trạng thái Đã Thanh Toán (đồng bộ chi phí) | Không | **Có** (legacy) | Không | **Lệch — cần khắc phục** |

Kết luận sơ bộ: **không có double credit** trên STK. Sổ tổng cũ và STK không bao giờ cùng tăng cho một sự kiện. Nhưng **tình huống 4 và 5 không cộng STK** — đó là **gap (thiếu)**, không phải double.

---

## 2. Cơ chế chống double — vì sao an toàn

Mỗi lần ghi sổ STK đều có khóa chống trùng:

- Đường ghi “tiền vào” theo biên lai khóa theo **mã biên lai** (`source_kind = payment_receipt`, `source_id = receipt_id`).
- Nếu cùng biên lai gọi cộng STK lần thứ hai (webhook chạy lại, hoặc admin xác nhận NCC hoàn trùng) → bị **bỏ qua tự động**, không cộng đúp.
- Webhook chỉ gọi cộng STK khi biên lai **vừa được tạo mới** (cờ `inserted = true`); biên lai trùng lặp sẽ không kích hoạt cộng lại.

---

## 3. Test case chi tiết

### TC-01 — Webhook Sepay nhận CK đúng STK đã khai báo

**Mục đích:** Kiểm tra CK khách chuyển vào STK MB cộng đúng STK MB, **không** cộng sổ tổng cũ, **không** double.

**Chuẩn bị:**
- Trong Quản lý STK đã khai báo STK MB với số tài khoản trùng số nhận Sepay.
- Ghi nhận số dư STK MB hiện tại (gọi là **A**) và sổ tổng cũ tháng hiện tại (gọi là **B**).

**Bước:**
1. Gửi (hoặc giả lập) một webhook Sepay 1.000.000 đ vào STK MB, kèm mã đơn hợp lệ.
2. Đợi response 200.

**Kỳ vọng:**
- Số dư STK MB = **A + 1.000.000**.
- Tổng CK vào của STK MB tăng đúng 1.000.000.
- Sổ tổng cũ vẫn = **B** (không đổi).
- Sổ cái STK có **đúng một dòng** loại “tiền vào theo biên lai”, gắn mã biên lai mới.
- Dashboard Lợi nhuận khả dụng tăng 1.000.000.

**Dấu hiệu sai (cần báo lỗi):**
- Số dư STK MB tăng quá 1.000.000 → double trên STK.
- Sổ tổng cũ tăng → có nhánh code cũ chưa gỡ.
- Sổ cái STK có 2 dòng cho cùng biên lai → dedup hỏng.

---

### TC-02 — Webhook Sepay nhận CK vào STK **chưa khai báo**

**Mục đích:** Số tiền lạc, không cộng đâu cả → cần cảnh báo, không gây double sau này.

**Chuẩn bị:** Số tài khoản nhận **không** có trong Quản lý STK.

**Bước:** Giả lập webhook 500.000 đ.

**Kỳ vọng:**
- Biên lai vẫn được tạo (lịch sử nhận tiền có).
- **Không** STK nào tăng.
- Sổ tổng cũ **không** đổi.
- Dashboard Lợi nhuận khả dụng **không** đổi.

**Hậu test:** Vào Quản lý STK thêm STK đó → chạy lại webhook (Sepay sẽ retry) → kỳ vọng **bây giờ** mới cộng STK đúng số tiền (không bị double dù lần đầu đã thử).

---

### TC-03 — Webhook gửi LẠI cùng giao dịch (replay)

**Mục đích:** Đảm bảo webhook nhận **trùng** không tạo biên lai mới và không cộng STK hai lần.

**Bước:**
1. Gọi webhook lần 1 với một giao dịch (giống TC-01).
2. Gọi webhook lần 2 với **cùng** payload (cùng id Sepay).

**Kỳ vọng:**
- Lần 2 trả về duplicate hoặc skipped.
- Số dư STK chỉ tăng **một lần** (tổng = A + 1.000.000).
- Sổ cái STK chỉ có **một** dòng cho biên lai.

---

### TC-04 — Hoàn thành đơn bằng webhook thủ công (admin xác nhận tay)

**Mục đích:** Nhánh “tạo biên lai tay khi đơn không có webhook tự động” phải cộng STK đúng, không double, không đụng sổ tổng cũ.

**Chuẩn bị:**
- Có một đơn đang ở trạng thái xử lý (chưa thanh toán), giá bán 800.000 đ.
- Trong Quản lý STK có ít nhất một STK đang bật (sẽ làm STK mặc định).

**Bước:**
1. Vào màn đơn → nút “Hoàn thành thủ công” → chọn STK nhận (hoặc dùng STK mặc định).
2. Xác nhận.

**Kỳ vọng:**
- Số dư STK đã chọn tăng đúng 800.000.
- Sổ tổng cũ không đổi.
- Biên lai mới được tạo, có ghi STK nhận.
- Sổ cái STK có **một** dòng loại “tiền vào theo biên lai”.
- Đơn chuyển sang Đã Thanh Toán; doanh thu / lợi nhuận tháng tăng đúng (đường khác, không đụng số dư bank thêm lần nữa).

**Dấu hiệu sai:**
- STK tăng hai lần (1.600.000) → có nhánh cộng đúp.
- Số dư STK tăng đúng nhưng sổ tổng cũ cũng tăng → còn code cũ chưa gỡ.

---

### TC-05 — NCC hoàn tiền cho shop (chốt chu kỳ NCC với nội dung khớp biên lai Sepay)

**Mục đích:** Khi NCC chuyển trả tiền, webhook **đã** tạo biên lai và cộng STK. Khi admin chốt chu kỳ NCC với nội dung khớp biên lai đó → **không** cộng STK lần hai.

**Chuẩn bị:**
- Webhook Sepay đã nhận một CK từ NCC, ví dụ 2.000.000 đ vào STK MB; biên lai đã có và STK MB đã được cộng (giống TC-01).
- Có một NCC đang “nợ shop” đúng số tiền 2.000.000 đ (log NCC tổng số âm).

**Bước:**
1. Vào chi tiết NCC → “Xác nhận thanh toán chu kỳ”.
2. Nhập nội dung thanh toán khớp ghi chú/biên lai (ví dụ mã chuyển khoản).
3. Chọn STK shop (hoặc dùng mặc định).
4. Xác nhận.

**Kỳ vọng:**
- Hệ thống tìm thấy biên lai khớp → **không** cộng STK lần hai (đã có dòng sổ cho biên lai đó).
- Số dư STK MB **giữ nguyên** so với sau bước webhook (đã đúng).
- Log chu kỳ NCC được tạo (số tiền âm = NCC trả shop), đánh dấu các log NCC chưa thanh toán thành đã thanh toán.

**Dấu hiệu sai:**
- STK MB tăng thêm 2.000.000 lần thứ hai → **double credit** (dedup hỏng).

---

### TC-06 — Hai webhook khác nhau, hai STK khác nhau

**Mục đích:** Đảm bảo không cộng nhầm STK; mỗi STK chỉ tăng phần tiền của mình.

**Chuẩn bị:** Có STK MB và STK VP, cả hai đã khai báo.

**Bước:**
1. Webhook 1: 500.000 đ vào STK MB.
2. Webhook 2: 700.000 đ vào STK VP.

**Kỳ vọng:**
- STK MB tăng đúng 500.000, STK VP tăng đúng 700.000.
- Tổng khả dụng tăng đúng 1.200.000.
- Mỗi STK có một dòng sổ cái riêng.

**Dấu hiệu sai:**
- MB tăng 1.200.000 / VP tăng 0 → cộng nhầm.
- MB tăng 1.200.000 / VP tăng 1.200.000 → double + cộng nhầm (rất tệ).

---

### TC-07 — Biên lai có nhiều mã đơn (batch)

**Mục đích:** Một biên lai trả nhiều đơn (mã batch) chỉ cộng STK **một lần**.

**Bước:** Webhook nhận một biên lai 1.500.000 đ kèm mã batch trỏ đến 3 đơn 500.000 mỗi đơn.

**Kỳ vọng:**
- STK tăng đúng 1.500.000 (một lần).
- Sổ cái STK có **một** dòng tham chiếu một biên lai.
- 3 đơn đều cập nhật doanh thu/trạng thái nhưng **không** cộng số dư bank thêm lần nào.

**Dấu hiệu sai:**
- STK tăng 4.500.000 (cộng theo từng đơn) → double nặng.

---

### TC-08 — Sau khi đã PAID, biên lai bổ sung (off-flow)

**Mục đích:** Khi đơn đã PAID mà vẫn có CK bổ sung, hệ thống ghi nhận “ngoài luồng” cho báo cáo, **không** double số dư bank.

**Chuẩn bị:** Một đơn đã ở trạng thái Đã Thanh Toán.

**Bước:** Webhook nhận thêm một biên lai gắn cùng mã đơn đó (ví dụ khách trả dư).

**Kỳ vọng:**
- Biên lai mới được tạo.
- STK tăng đúng số tiền dư (cộng theo biên lai mới).
- Cột thống kê “off-flow bank receipt” tăng (báo cáo riêng).
- Sổ tổng cũ **không** tăng.

**Dấu hiệu sai:**
- STK tăng + sổ tổng cũ tăng → cộng đúp.
- STK không tăng (chỉ ghi báo cáo) → thiếu, không phải double, nhưng cần xem lại nghiệp vụ.

---

## 4. Hai chỗ vẫn dùng sổ tổng cũ (gap đã biết — không phải double, là thiếu)

Sau khi rà soát, **không** có double credit, nhưng **còn hai chỗ chưa chuyển sang STK** (cộng sổ tổng cũ nhưng STK đứng yên):

### TC-09 — Hủy hoàn tiền khách (đơn rời khỏi trạng thái hoàn)

**Tình huống:** Một đơn từng vào trạng thái hoàn tiền (tiền đã trừ bank trước đó), nay được “gỡ hoàn” → tiền “trở về” bank.

**Hiện trạng:** Cộng vào **sổ tổng cũ**; **không** cộng STK.

**Kỳ vọng (sau khi gom luồng):** Cộng đúng STK đã trừ trước đó.

**Cách quan sát:** Vào đơn đó, đảo trạng thái khỏi hoàn → so sánh số dư STK và sổ tổng cũ trước/sau:
- STK: không đổi (sai theo mô hình mới).
- Sổ tổng cũ: tăng (legacy).

---

### TC-10 — Đơn MAVN nội bộ rớt khỏi trạng thái Đã Thanh Toán

**Tình huống:** Một đơn MAVN NCC nội bộ đã PAID nay đổi sang trạng thái khác → đồng bộ chi phí Form đảo lại, lợi nhuận và bank được “trả lại”.

**Hiện trạng:** Cộng vào **sổ tổng cũ**; **không** cộng STK.

**Kỳ vọng (sau khi gom luồng):** Cộng STK đã trừ ban đầu (cần lưu STK đã trừ trên log chi phí MAVN).

---

## 5. Quy trình kiểm tra (chung cho mọi test case)

Trước mỗi test:

1. Ghi nhận **số dư từng STK** đang bật.
2. Ghi nhận **sổ tổng cũ** của tháng hiện tại.
3. Ghi nhận **Lợi nhuận khả dụng** hiển thị trên dashboard.
4. Đếm số dòng sổ cái STK liên quan (nếu cần đối chiếu chi tiết).

Sau mỗi test, kiểm:

- Tổng STK = giá trị ban đầu **± đúng số tiền của test** (không lệch một đồng).
- Lợi nhuận khả dụng = tổng STK mới (luôn khớp).
- Sổ tổng cũ: chỉ thay đổi nếu test đó thuộc TC-09 / TC-10 (gap đã biết).
- Sổ cái STK: **không** có dòng nào trùng `(loại = tiền vào, mã biên lai)`.
- Cờ trên biên lai (đã ghi tài chính / đã cộng STK) đúng trạng thái.

Câu truy vấn nhanh để soi double trên sổ cái STK (chạy trên SQL editor):

```sql
SELECT source_kind, source_id, COUNT(*) AS so_dong
FROM admin.shop_bank_account_ledger
WHERE source_kind = 'payment_receipt'
GROUP BY source_kind, source_id
HAVING COUNT(*) > 1;
```

- Trả về **rỗng** → an toàn, không có biên lai nào bị cộng STK hai lần.
- Trả về có dòng → đó là biên lai bị double, cần kiểm tra ngay.

---

## 6. Kết luận sau rà soát

| Khía cạnh | Kết quả |
|-----------|---------|
| Webhook CK vào | Chỉ cộng STK, không cộng sổ tổng cũ — **an toàn** |
| Webhook thủ công | Chỉ cộng STK — **an toàn** |
| NCC hoàn tiền cho shop | Cộng STK dùng chung biên lai với webhook — dedup theo mã biên lai — **an toàn** |
| Replay / batch / off-flow | Có dedup theo biên lai — **an toàn** |
| Hủy hoàn tiền khách | Còn dùng sổ tổng cũ — **gap (thiếu)**, không phải double |
| Đơn MAVN rớt trạng thái | Còn dùng sổ tổng cũ — **gap (thiếu)**, không phải double |

**Không tìm thấy điểm nào đang cộng đúp tiền vào bank.** Phần cộng tiền (credit) đã chuyển sạch sang STK với dedup theo mã biên lai. Các nhánh còn lại (TC-09, TC-10) là **gap chưa chuyển** chứ không phải double, có thể xử lý ở giai đoạn 2–3 của lộ trình.

---

*Hết.*

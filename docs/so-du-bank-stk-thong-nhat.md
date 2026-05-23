# Số dư bank khả dụng — chuyển từ một cột tổng sang số dư từng STK

Tài liệu mô tả **bài toán nghiệp vụ**, **tư duy thiết kế** và **lộ trình triển khai** khi shop chuyển cách quản lý tiền bank: không còn một con số chung trên dashboard, mà **tách ra theo từng số tài khoản (STK)** — MB, VPBank, v.v.

*Đối tượng đọc: chủ shop / quản trị — không cần biết lập trình.*

---

## 1. Ý tưởng cốt lõi

### Trước đây

Hệ thống lưu **một con số chung** gọi là *số dư bank ước tính* (trên báo cáo tháng dashboard). Mọi tiền vào/ra bank — webhook Sepay, rút tiền, nhập hàng ngoài luồng, thanh toán NCC — đều **cộng hoặc trừ vào con số đó**.

Dashboard hiển thị con số này dưới tên **Lợi nhuận khả dụng**. Shop biết “còn bao nhiêu tiền trên bank” nhưng **không biết** tiền nằm ở MB hay VPBank, và **không biết** khoản rút / trả NCC vừa rời tài khoản nào.

### Bây giờ (hướng mới)

**Không tạo thêm một “sổ tiền thứ hai”.** Số dư trên từng STK trong màn **Quản lý STK** thực chất là **cùng khoản tiền bank đó**, chỉ **chia nhỏ theo tài khoản** để dễ theo dõi dòng tiền.

```
Lợi nhuận khả dụng (cũ)  =  một cột số dư bank chung trên dashboard
Lợi nhuận khả dụng (mới) =  Số dư STK MB + Số dư STK VP + … (cộng các STK đang bật)
```

Hai vế **phải luôn bằng nhau** về mặt tổng tiền. Khác biệt duy nhất: màn STK cho thấy **phân bổ theo bank**, không chỉ một con số chung.

### Một câu tóm tắt

> **Thay vì cập nhật một cột tổng, hệ thống cập nhật số dư đúng STK; dashboard lấy tổng các STK — đó chính là số khả dụng shop từng có.**

---

## 2. Bài toán nghiệp vụ

Shop có thể có **nhiều tài khoản ngân hàng**. Tiền khách chuyển khoản vào qua Sepay. Shop cũng **rút tiền**, **nhập hàng ngoài luồng**, **thanh toán nhà cung cấp (NCC)** — mỗi khoản là tiền **ra khỏi bank**.

| Hướng | Việc cần làm |
|--------|----------------|
| **Vào** | Webhook Sepay hoặc xác nhận thanh toán thủ công → **cộng** số dư đúng STK nhận tiền |
| **Ra** | Rút tiền, nhập ngoài luồng, thanh toán NCC → **trừ** số dư STK đã chọn |
| **Tổng shop** | Lợi nhuận khả dụng = **cộng số dư tất cả STK đang bật** |
| **Tra cứu** | Biết rõ từng khoản vào/ra thuộc STK nào |

---

## 3. Hiện trạng — vì sao đang “lệch tư duy”

Trong giai đoạn chuyển tiếp, code đang xử lý **vừa cột tổng cũ, vừa cột STK mới**. Điều này dễ khiến người dùng nghĩ có **hai luồng tiền riêng**. Thực tế không phải vậy — đây chỉ là **chưa chuyển xong**.

### Cột tổng cũ (dashboard theo tháng)

- Một con số *số dư bank ước tính* trên báo cáo tháng.
- Webhook Sepay **cộng** vào đây khi có biên lai mới.
- Rút tiền, nhập ngoài luồng, một phần thanh toán NCC **trừ** vào đây.
- Không gắn STK cụ thể.

### Cột STK mới (Quản lý STK)

- Mỗi STK có: **số dư hiện tại**, **tổng CK vào**, **đã rút**, **còn lại**.
- Có **sổ cái** (lịch sử từng dòng vào/ra) để tra cứu chi tiết.
- Webhook CK vào **đã** cộng STK (khi số nhận khớp STK đã khai báo).
- Rút tiền, nhập ngoài luồng **đã** trừ STK (khi user chọn STK).
- Thanh toán NCC **chưa** trừ STK — vẫn chỉ trừ cột tổng cũ.
- Thanh toán thủ công **chưa** cộng STK.

### Bảng so sánh — cùng một tiền, hai chỗ đang ghi (tạm thời)

| Tình huống | Cột tổng cũ | Cột STK | Trạng thái mong muốn |
|------------|-------------|---------|----------------------|
| CK vào MB qua webhook | Cộng | Cộng MB | Chỉ cộng MB (bỏ cột tổng) |
| Rút 5 triệu từ VP | Trừ | Trừ VP | Chỉ trừ VP (bỏ cột tổng) |
| Nhập hàng ngoài luồng | Trừ | Trừ STK đã chọn | Chỉ trừ STK (bỏ cột tổng) |
| Thanh toán NCC | Trừ | **Chưa trừ** | Trừ STK đã chọn (bỏ cột tổng) |
| Thanh toán thủ công | **Không cộng** | **Không cộng** | Cộng STK nhận tiền |

**Mục tiêu cuối:** mọi dòng trong bảng trên chỉ còn cột **STK**; cột tổng cũ **ngừng dùng** cho số dư thực.

---

## 4. Mô hình mục tiêu — thay thế, không song song

### 4.1. Quy tắc vàng

1. **Một nguồn số dư bank duy nhất:** các cột số dư trên từng STK (và sổ cái đi kèm để tra cứu).
2. **Lợi nhuận khả dụng** trên dashboard = **tổng số dư các STK đang bật** — không đọc lại cột tổng cũ.
3. **Một sự kiện tiền = một lần cập nhật STK** — không vừa cộng cột tổng vừa cộng STK (tránh lệch về lâu dài).
4. **Cột tổng cũ** có thể giữ trong database cho lịch sử / báo cáo tháng cũ, nhưng **không còn là nơi ghi số dư bank mới**.

### 4.2. STK không phải “sổ thứ hai”

| Hiểu **sai** | Hiểu **đúng** |
|--------------|---------------|
| STK là hệ thống kế toán riêng, độc lập với số dư dashboard | STK là **cùng khoản tiền bank**, chỉ **tách theo tài khoản** |
| Tổng STK và Lợi nhuận khả dụng có thể khác nhau | Hai số **luôn bằng nhau** khi chuyển xong |
| Phải làm lại toàn bộ webhook từ đầu | Webhook **giữ nguyên** phần nhận CK, khớp đơn, tạo biên lai — chỉ **đổi chỗ ghi số dư** |

### 4.3. Sơ đồ tư duy

```
  TRƯỚC (một cột):
  ┌──────────────────────────────────────┐
  │  Số dư bank chung (dashboard/tháng)  │  ← webhook +, rút −, NCC −
  └──────────────────────────────────────┘

  SAU (tách theo STK, tổng không đổi):
  ┌──────────────────────────────────────┐
  │     Lợi nhuận khả dụng (dashboard)    │
  │     = MB + VP + … (chỉ đọc tổng)      │
  └───────────────┬──────────────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
  ┌──────┐    ┌──────┐    ┌──────┐
  │ STK  │    │ STK  │    │ STK  │   ← mọi cộng/trừ bank ghi ở đây
  │  MB  │    │  VP  │    │  …   │
  └──────┘    └──────┘    └──────┘
       │           │           │
       └───────────┴───────────┘
                   │
            Sổ cái (lịch sử
            từng dòng vào/ra)
```

---

## 5. Các cột trên màn Quản lý STK — ý nghĩa

Mỗi STK shop có các chỉ số sau. Tất cả đều mô tả **cùng một tài khoản bank**, ở mức độ chi tiết khác nhau:

| Cột trên UI | Ý nghĩa nghiệp vụ |
|-------------|-------------------|
| **Tổng CK vào** | Tổng tiền khách đã chuyển vào STK này (tích lũy) |
| **Đã rút** | Tổng tiền đã rút về ví/cá nhân từ STK này |
| **Số dư / Còn lại** | Tiền bank còn lại trên STK này theo sổ hệ thống |
| **Sổ cái** | Từng dòng biến động: CK vào, rút, nhập ngoài, trả NCC… |

**Lợi nhuận khả dụng toàn shop** = cộng cột **Còn lại** (hoặc **Số dư**) của mọi STK đang bật.

---

## 6. Bốn nhóm giao dịch — ai cộng/trừ STK nào

### 6.1. Tiền VÀO bank (cộng số dư STK)

| Nguồn | STK được cộng | Ghi chú |
|--------|---------------|---------|
| **Webhook Sepay** | STK **nhận** trong giao dịch Sepay | Phải trùng STK đã khai báo trong Quản lý STK |
| **Thanh toán thủ công** | STK nhận (chọn khi xác nhận hoặc lấy từ cấu hình) | Cần bổ sung — hiện chưa cộng STK |
| **NCC hoàn tiền về shop** | STK **nhận** tiền hoàn | Coi như tiền vào; chọn STK nhận |

**Lưu ý:** CK vào số **chưa khai báo** → biên lai vẫn lưu, nhưng **không tự cộng** STK nào. Cần thêm STK vào danh sách hoặc điều chỉnh sổ sau đối soát sao kê.

### 6.2. Tiền RA bank (trừ số dư STK) — bắt buộc chọn STK

| Nghiệp vụ | Màn hình | Trạng thái |
|-----------|----------|------------|
| **Rút tiền** | Dashboard hoặc Quản lý STK | Đã có — chọn STK, trừ đúng STK |
| **Nhập hàng ngoài luồng** | Supply / log external import | Đã có — chọn STK chi trả |
| **Thanh toán NCC** | Xác nhận chu kỳ NCC | **Cần bổ sung** — chọn STK shop dùng chuyển tiền |

Sau mỗi giao dịch ra:

- Số dư **STK đó** giảm đúng số tiền.
- **Lợi nhuận khả dụng** (tổng) giảm cùng số tiền — **tự khớp**, không cần cập nhật thêm cột tổng cũ.

### 6.3. Loại dòng trên sổ cái (tra cứu “bank nào”)

| Loại | Vào / Ra | Ví dụ |
|------|----------|--------|
| CK khách vào | Vào (+) | Webhook đơn hàng |
| Rút về ví/cá nhân | Ra (−) | Rút 5.000.000 từ MB |
| Nhập hàng ngoài luồng | Ra (−) | Chi mua hàng renewal tay |
| Thanh toán NCC | Ra (−) | Chốt chu kỳ trả NCC |
| Điều chỉnh (hiếm) | ± | Admin sửa lệch đối soát ngân hàng |

Mỗi dòng lưu: thời gian, số tiền, STK, mã tham chiếu (biên lai, phiếu rút, chu kỳ NCC…), ghi chú.

---

## 7. Luồng chi tiết từng nghiệp vụ (sau khi chuyển xong)

### 7.1. Khách chuyển khoản (webhook Sepay)

**Không làm lại webhook từ đầu.** Phần nhận Sepay, khớp mã đơn, tạo biên lai, cập nhật doanh thu/lợi nhuận tháng — **giữ nguyên**.

Chỉ đổi bước ghi số dư bank:

1. Sepay báo số tiền + **STK nhận**.
2. Hệ thống tạo biên lai (như hiện tại).
3. **Cộng số dư STK** khớp số tài khoản nhận.
4. **Không** cộng thêm cột tổng cũ (khi đã chuyển xong giai đoạn 5).

### 7.2. Thanh toán thủ công

1. Admin xác nhận đơn đã nhận tiền.
2. Chọn **STK nhận** (hoặc lấy STK mặc định).
3. **Cộng số dư STK đó** — cùng lúc với biên lai, một lần duy nhất.

### 7.3. Rút tiền

1. User chọn **STK** + số tiền + lý do.
2. Một thao tác: ghi phiếu rút + **trừ số dư STK**.
3. Không còn rút “chung shop” không chỉ rõ STK.

### 7.4. Nhập hàng ngoài luồng

1. User chọn **STK chi trả** + số tiền.
2. **Trừ số dư STK** (báo cáo lợi nhuận tháng vẫn cập nhật riêng nếu cần — tách khỏi số dư bank).

### 7.5. Thanh toán NCC

1. Trước khi xác nhận chu kỳ: user **chọn STK shop** dùng chuyển tiền cho NCC.
2. Khi xác nhận: **trừ số dư STK** + lưu liên kết chu kỳ ↔ STK.
3. Trường hợp NCC trả lại (số âm): chọn STK nhận, **cộng số dư STK**.

---

## 8. Webhook và cột tổng cũ — câu hỏi thường gặp

**Hỏi: Chuyển sang STK có phải viết lại toàn bộ webhook không?**  
**Đáp:** **Không.** Webhook vẫn nhận Sepay, tạo biên lai, khớp đơn như cũ. Chỉ **đổi đích ghi số dư bank**: từ cột tổng cũ → sang cột số dư STK. Phần webhook **đã** có bước cộng STK khi CK vào; việc còn lại là **ngừng cộng cột tổng** và bổ sung STK cho các nhánh còn thiếu (NCC hoàn tiền, thanh toán thủ công…).

**Hỏi: Giai đoạn chuyển tiếp có cộng cả hai chỗ không?**  
**Đáp:** **Tạm thời có thể** (đang như vậy với webhook CK vào). Đây là bước trung gian, **không phải thiết kế cuối**. Thiết kế cuối: **chỉ STK**. Dashboard đọc tổng STK, không đọc cột tổng cũ cho số khả dụng hiện tại.

**Hỏi: Cột tổng cũ có xóa không?**  
**Đáp:** Có thể **giữ** cho lịch sử báo cáo tháng cũ hoặc so sánh xu hướng, nhưng **ngừng cập nhật** khi có giao dịch bank mới. Số dư “sống” nằm ở STK.

---

## 9. Nguyên tắc tránh lệch số

| Nguyên tắc | Giải thích |
|------------|------------|
| **Thay thế, không song song** | Một giao dịch bank chỉ cập nhật STK — không vừa STK vừa cột tổng cũ |
| **Một sự kiện — một lần ghi** | Cùng một biên lai Sepay không được cộng số dư hai lần |
| **Tổng = cộng STK** | Lợi nhuận khả dụng luôn tính bằng tổng số dư STK, không tính lại từ biên lai mỗi lần mở trang |
| **STK phải khớp Sepay** | Số tài khoản trong Quản lý STK phải trùng số nhận trên biên lai |
| **Giao dịch trong một gói** | Rút tiền = tạo phiếu + trừ STK — lỗi giữa chừng thì hoàn tác cả gói |
| **Điều chỉnh tay** | Chỉ khi đối soát sao kê bank thấy lệch; ghi rõ lý do trên sổ cái |

---

## 10. Chuyển dữ liệu cũ (một lần)

Khi bật mô hình STK trên môi trường đã chạy lâu:

1. **Khai báo đủ STK** shop đang dùng (MB, VP…).
2. **Backfill một lần:** phân bổ số dư lịch sử vào từng STK dựa trên biên lai Sepay (STK nhận) và các khoản rút/chi đã ghi — sao cho **tổng STK ≈ số dư cột tổng cũ** tại thời điểm chuyển.
3. Từ thời điểm go-live trở đi: mọi giao dịch mới **chỉ** ghi STK.
4. Lịch sử rút/NCC cũ có thể **không đủ chi tiết STK** — chấp nhận; từ ngày chuyển trở đi mới đầy đủ.

---

## 11. Lộ trình triển khai

### Giai đoạn 1 — Nền tảng (đã / đang có)

- Bảng STK + cột số dư, tổng CK vào, đã rút.
- Sổ cái STK + webhook CK vào (khi STK khớp).
- Rút tiền & nhập ngoài luồng: chọn STK, trừ STK.
- Dashboard **Lợi nhuận khả dụng** đọc **tổng số dư STK** (không đọc cột tổng cũ cho tháng hiện tại).

### Giai đoạn 2 — Thanh toán NCC

- Form chốt chu kỳ: thêm **chọn STK**.
- Xác nhận thanh toán: **trừ STK** thay vì chỉ trừ cột tổng cũ.
- Hiển thị STK trên lịch sử thanh toán NCC.

### Giai đoạn 3 — Thanh toán thủ công

- Xác nhận TT tay: chọn STK + **cộng số dư STK**.
- Rà soát mọi đường tạo biên lai không qua Sepay.

### Giai đoạn 4 — Báo cáo & đối soát

- Màn lịch sử sổ cái STK (lọc, xuất).
- Cảnh báo: số dư STK âm, CK vào STK chưa khai báo.
- (Tuỳ chọn) Snapshot cuối tháng tổng STK để so sánh xu hướng.

### Giai đoạn 5 — Ngừng dùng cột tổng cũ cho số dư bank

- Webhook, rút, nhập ngoài, NCC, hoàn tiền… **không còn** cộng/trừ cột tổng cũ.
- Một nguồn số dư bank duy nhất: **các cột trên STK**.
- Cột tổng cũ giữ lại chỉ phục vụ lịch sử / báo cáo DT-LN tháng nếu cần.

---

## 12. Câu hỏi thường gặp (nghiệp vụ)

**Hỏi: Lợi nhuận khả dụng và tổng “Còn lại” trên Quản lý STK có luôn bằng nhau?**  
**Đáp:** **Có** — đó là cùng một khoản tiền; dashboard là tổng, màn STK là tách theo tài khoản.

**Hỏi: Ba STK, rút từ VP 5 triệu thì MB có bị trừ không?**  
**Đáp:** **Không.** Chỉ VP giảm 5 triệu; tổng shop giảm 5 triệu.

**Hỏi: Trả NCC 10 triệu từ MB, tra cứu ở đâu?**  
**Đáp:** Sổ cái STK MB, dòng thanh toán NCC, gắn mã chu kỳ / NCC.

**Hỏi: CK vào STK chưa khai báo?**  
**Đáp:** Biên lai vẫn có; số dư STK không tăng — thêm STK hoặc điều chỉnh sổ sau đối soát.

**Hỏi: STK và cột tổng cũ khác nhau sau khi chuyển?**  
**Đáp:** Trong giai đoạn chuyển tiếp có thể lệch tạm (một số nhánh chưa chuyển sang STK). Sau giai đoạn 5 phải khớp: **tổng STK = số khả dụng**.

**Hỏi: Số dư STK có phải tính lại từ biên lai mỗi lần mở trang?**  
**Đáp:** **Không.** Số dư lưu trên STK và cập nhật khi có giao dịch; sổ cái để tra cứu chi tiết.

---

## 13. Tóm tắt

| Khía cạnh | Nội dung |
|-----------|----------|
| **Bản chất** | Số dư STK = cột tổng cũ **tách theo tài khoản**, không phải hệ thống tiền thứ hai |
| **Tổng shop** | Lợi nhuận khả dụng = cộng số dư các STK |
| **Ghi nhận** | Mọi vào/ra bank cộng/trừ **đúng STK** |
| **Webhook** | Giữ luồng hiện tại; chỉ đổi **chỗ ghi số dư**, không viết lại từ đầu |
| **Cột tổng cũ** | Ngừng dùng cho số dư mới; STK là nguồn sự thật |
| **Mục đích** | Biết rõ bank nào, quản lý dòng tiền rõ ràng, một luồng thống nhất |

---

*Phiên bản tài liệu: 2026-05 — phản ánh tư duy “thay thế cột tổng bằng phân rã STK”, không phải hai sổ song song.*

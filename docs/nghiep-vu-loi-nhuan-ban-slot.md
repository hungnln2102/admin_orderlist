# Nghiệp vụ tính lợi nhuận khi bán slot (định hướng dài hạn)

Tài liệu mô tả **tổng quan nghiệp vụ** và **nguyên tắc thiết kế** để tính lợi nhuận khi bán slot trong gói sản phẩm, nhằm dùng **lâu dài** (ổn định, kiểm chứng được, không phụ thuộc vào một màn hình tạm thời).

---

## 1. Mục đích và phạm vi

### 1.1 Mục đích

- Thống nhất **định nghĩa lợi nhuận** khi bán một slot cho khách: không chỉ dựa vào *gi bán − cost NCC trên đơn*, mà phải phản ánh **chi phí cơ hội / chi phí “ôm” slot** trong thời gian slot nằm tồn trước khi bán.
- Đảm bảo cùng một quy tắc có thể dùng cho **báo cáo**, **dashboard**, và **đối soát** theo tháng / kỳ, không chỉ hiển thị trên một bảng chi phí phân bổ theo ngày.

### 1.2 Phạm vi

**Trong phạm vi:**

- Slot thuộc **gói sản phẩm** (có cấu trúc slot trong catalog / `package_product` hoặc tương đương).
- Đơn nhập **MAVN** (đã thanh toán NCC) là nguồn gốc **chi phí nhập** và **kỳ phân bổ** (thời hạn, ngày bắt đầu áp dụng).
- Bán slot ra khách (MAVL / MAVC / đơn bán lẻ — tùy hệ thống đặt tên): **doanh thu** và **thời điểm bán**.

**Ngoài phạm vi (giai đoạn 1 có thể loại trừ rõ ràng):**

- Hoàn tiền, điều chỉnh hậu kiểm phức tạp (ghi nhận lại theo IFRS — nếu sau này cần thì mở rộng).
- Chi phí cố định doanh nghiệp không gắn slot (thuê server toàn cục, nhân sự chung), trừ khi sau này phân bổ theo policy riêng.

---

## 2. Thuật ngữ

| Thuật ngữ | Mô tả ngắn |
|-----------|------------|
| **Slot** | Một “ô” quyền sử dụng / tài khoản trong gói (ví dụ một user trong gói gia đình). |
| **Chi phí nhập (import cost)** | Số tiền thực trả / ghi nhận trên đơn nhập MAVN cho gói hoặc phần gói tương ứng. |
| **Phân bổ chi phí theo ngày** | Chia `chi phí nhập` (và/hoặc chi phí khác) cho **số ngày trong kỳ** và **số slot**, để mỗi slot mỗi ngày mang một phần chi phí “đang tồn”. |
| **Chi phí ôm slot / carrying cost** | Tích lũy phần phân bổ **từ lúc bắt đầu tính tồn** đến **thời điểm bán** (hoặc đến cuối kỳ báo cáo), *theo đúng quy tắc đã chốt*. |
| **Doanh thu bán slot** | Giá bán ghi nhận khi bán slot cho khách (sau thuế / trước thuế — cần chốt một chuẩn). |
| **Lợi nhuận gộp slot (theo nghiệp vụ này)** | Doanh thu bán slot **trừ** chi phí nhập đã phân bổ tương ứng phần đã “ôm” (và trừ các cost trực tiếp khác nếu policy có). |

---

## 3. Ví dụ nghiệp vụ tham chiếu (đồng bộ với trao đổi)

- Slot A **tồn 10 ngày** → quy ước phần phân bổ tương ứng **10.000** (đơn vị VNĐ, số mang tính minh họa).
- Bán slot A **50.000**, NCC là Mavryk và trên đơn bán **cost = 0** (không có dòng nhập mới).
- **Lợi nhuận mong đợi:** `50.000 − 10.000 = 40.000`  
  (tức vẫn phải trừ **chi phí đã tích lũy khi tồn**, không được coi lợi nhuận = 50.000).

Điểm cốt lõi: **cost = 0 trên đơn bán** không có nghĩa **chi phí kinh tế của slot = 0**.

---

## 4. Trạng thái hệ thống liên quan (bối cảnh kỹ thuật)

### 4.1 Bảng chi phí theo ngày (UI hiện tại)

- Bảng **“BẢNG CHI PHÍ THEO NGÀY”** (workspace chi phí) đang kết hợp:
  - đơn nhập MAVN đã TT,
  - cấu hình gói từ **`package_product`** (số slot, gán slot, v.v.),
  - và **logic tính toán phân bổ** (nhiều phần chạy ở frontend).
- Dữ liệu hiển thị là **kết quả suy diễn** từ nhiều nguồn, không phải một **sổ cái chi phí slot** độc lập lưu trong DB.

### 4.2 Hệ quả cho “minh bạch lâu dài”

- Nếu **chỉ** tin vào cấu hình catalog + tính lại mỗi lần load UI, sẽ khó:
  - **đối soát** cùng một con số với báo cáo lợi nhuận,
  - **khóa sổ** một kỳ khi đã chốt,
  - **giải thích** khi đổi code khớp gói hoặc đổi thuật toán phân bổ.

Đây là lý do cần **nghiệp vụ dài hạn** tách rõ: **quy tắc tính**, **nguồn dữ liệu**, và **cách ghi nhận** (tính lại hay lưu snapshot/ledger).

---

## 5. Nguyên tắc nghiệp vụ dài hạn

### 5.1 Một “engine” duy nhất

- Mọi con số **phân bổ chi phí tồn** và **lợi nhuận khi bán slot** phải đi qua **cùng một lớp nghiệp vụ** (backend hoặc lớp domain thống nhất), không được hai nơi hai công thức.
- UI chỉ **hiển thị** hoặc **điều chỉnh tham số** được phép; không phải nơi định nghĩa cuối cùng cho P&L.

### 5.2 Phân biệt “catalog” và “sự kiện”

- **`package_product` (và tương đương):** mô tả **cấu trúc** gói (bao nhiêu slot, tên slot, match…).
- **Sự kiện kinh doanh:** nhập hàng (MAVN), slot vào trạng thái có thể bán, bán slot, hủy, chuyển slot…  
  Lợi nhuận lâu dài cần **neo** vào sự kiện hoặc vào **snapshot** đã chốt, không chỉ vào bản catalog có thể đổi sau.

### 5.3 Chốt thời điểm ghi nhận

Cần quy ước rõ (và giữ ổn định):

- **Bắt đầu tích lũy carrying:** từ `registration_date` / `order_date` / ngày vào kho — **một chuẩn duy nhất**.
- **Kết thúc tích lũy cho một slot bán:** tại thời điểm **đơn bán** được coi là hoàn tất (tạo đơn / thanh toán / giao slot — cần chọn một mốc **chính thức**).

### 5.4 Đơn vị công thức (đề xuất làm rõ trong policy)

Một trong các mô hình (chọn một làm chuẩn sản phẩm):

1. **Theo ngày tuyến tính:**  
   `cost_per_slot_per_day = import_cost / (term_days × số_slot_active)`  
   `carrying_until_sale = cost_per_slot_per_day × số_ngày_tồn_thực_tế`  
2. **Theo kỳ đã phân bổ sẵn:** chỉ tính trên các ngày có “✓ slot chiếm chỗ” trong bảng phân bổ (nếu nghiệp vụ là slot không luôn full).
3. **Kết hợp:** cost nhập cố định + điều chỉnh khi slot trống (không phát sinh carrying) — cần mô tả riêng.

Tài liệu này **không** ép một công thức cụ thể mà yêu cầu **phải có policy chữ** + **ví dụ số** + **test** gắn với policy đó.

---

## 6. Kiến trúc dữ liệu: hai hướng (đều “đúng”, khác mức độ minh bạch)

### 6.1 Hướng A — Suy diễn thuần (derive), không bảng ledger mới

**Ý tưởng:** Luôn tính lại carrying và lợi nhuận từ:

- đơn MAVN + sản phẩm + slot,
- quy tắc phân bổ,
- lịch sử đơn bán.

**Ưu điểm:** ít migration, triển khai nhanh nếu engine backend thống nhất.  
**Nhược:** khó *khóa sổ*; đổi code có thể làm thay đổi con số quá khứ nếu không version hóa quy tắc.

### 6.2 Hướng B — Ghi nhận / snapshot / ledger (khuyến nghị cho “lâu dài” và minh bạch)

**Ý tưởng:** Với mỗi **slot** (hoặc cặp `order_mavn` + `slot_key` + `product`), lưu một trong các dạng:

- **Bản ghi chi phí theo ngày** (materialized theo job đêm / khi chốt kỳ), hoặc  
- **Sự kiện** (event): `slot_allocated`, `slot_holding_day`, `slot_sold` kèm `amount`.

**Ưu điểm:** audit tốt, báo cáo ổn định, giải thích được với NCC / kế toán nội bộ.  
**Nhược:** cần thiết kế bảng, job, và quy trình đối soát.

**Khuyến nghị định hướng:** với mục tiêu **lâu dân**, nên **tiến từ A → B**: trước hết **một engine**; sau đó **persist** output của engine theo kỳ (ít nhất **snapshot cuối tháng**).

---

## 7. Luồng nghiệp vụ mục tiêu (logical)

```text
[Nhập MAVN — đã TT]
        │
        ▼
Xác định: cost nhập, kỳ (term), số slot, ngày bắt đầu phân bổ
        │
        ▼
(Engine) Phân bổ carrying theo policy ──────► Báo cáo tồn / UI
        │
        ▼
[Bán slot — đơn khách]
        │
        ▼
(Engine) Lợi nhuận slot = Doanh thu − carrying đã tích − cost trực tiếp khác
        │
        ▼
Ghi nhận vào báo cáo P&L slot (và ledger nếu có)
```

---

## 8. Tiêu chí chấp nhận (acceptance) gợi ý

- **AC1:** Với kịch bản cost NCC trên đơn bán = 0 nhưng slot đã tồn N ngày có carrying > 0, **lợi nhuận < doanh thu** và bằng đúng công thức đã chốt.  
- **AC2:** Cùng một bộ đơn/MAVN/slot, **số carrying** trên màn chi phí và **số trừ khi tính lợi nhuận bán** trùng nhau (sai số ≤ 1 đơn vị làm tròn nếu có).  
- **AC3:** Có thể giải thích được một dòng lợi nhuận: *slot nào, đơn nhập nào, bao nhiêu ngày, đơn bán nào*.  
- **AC4 (nếu có ledger):** Sau khi **khóa kỳ**, không đổi số đã chốt khi chỉnh sửa catalog; mọi điều chỉnh đi qua **bút điều chỉnh** có audit.

---

## 9. Rủi ro và kiểm soát

| Rủi ro | Kiểm soát gợi ý |
|--------|------------------|
| Khớp sai gói / sai `slotLimit` | Chuẩn hóa khóa: `line_product_id` / `variant_id` / `package_id`; fallback match phải log cảnh báo. |
| Đổi term hoặc ngày sau nhập | Quyền sửa có audit; có thể tạo bản ghi điều chỉnh carrying. |
| Làm tròn theo ngày | Chốt quy tắc làm tròn và dùng chung mọi nơi. |
| Hai nguồn sự thật (UI vs API) | Engine một nơi; UI chỉ consume API/domain. |

---

## 10. Lộ trình đề xuất (Roadmap)

1. **Chốt policy** bằng văn bản (công thức + mốc thời gian + ví dụ 3–5 kịch bản số).  
2. **Implement engine** backend (pure function / domain service + unit test theo ví dụ).  
3. **Nối** màn chi phí và báo cáo lợi nhuận vào **cùng API** engine.  
4. **(Tuỳ độ ưu tiên minh bạch)** Thêm bảng snapshot/ledger + job chốt kỳ.  
5. **Giám sát:** log chênh lệch, dashboard “slot không khớp gói”.

---

## 11. Phụ lục — Liên kết code hiện có (tham chiếu)

- Workspace chi phí: `frontend/src/features/expenses/components/ExpenseCostAllocationTable.tsx`  
  (tải MAVN paid + package-products + package_match, ghép và phân bổ trên client).  
- Dịch vụ gói: `backend/src/services/packageProductService.js`, controller package tương ứng.  
- Đồng bộ chi phí MAVN store: `backend/src/controllers/Order/finance/mavnStoreExpenseSync.js` (nếu mở rộng ghi nhận).

Tài liệu này **không** thay thế policy kế toán pháp lý; là **spec nội bộ** để kỹ thuật và vận hành cùng chung ngôn ngữ khi triển khai lâu dài.

---

*Tài liệu: `docs/nghiep-vu-loi-nhuan-ban-slot.md` — có thể cập nhật khi policy công thức được chốt chính thức.*

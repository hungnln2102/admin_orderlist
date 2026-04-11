# Bài toán Key active cho hệ thống Fanpage — Nhóm nhiều mã đơn → Một key chung

Tài liệu này mô tả **vấn đề nghiệp vụ**, **phương án dùng mã đơn làm key (và hạn chế)**, và **mô hình “nhóm đơn + key chung”** để triển khai bước bảo mật thứ hai (sau tài khoản) cho các hệ thống trên Fanpage.

Tham chiếu thiết kế cũ (Renew Adobe, dùng trực tiếp `id_order` làm key): `docs/Renew_Adobe_Check_Flow.md` mục **10**.

---

## 1. Bài toán nghiệp vụ

### 1.1. Vì sao chỉ có tài khoản là chưa đủ?

- **Tài khoản** (email / slot / quyền đăng nhập) phản ánh trạng thái **kỹ thuật**: khách còn user trên team hay không.
- Thực tế vận hành: **đơn đã hết hạn** hoặc **chưa còn được phục vụ**, nhưng bạn **chưa kịp thu hồi** tài khoản → vẫn đăng nhập được → **lệch với quyền lợi thương mại**.
- Cần thêm **một lớp “giấy phép sử dụng”** độc lập với việc “user còn tồn tại trên hệ thống hay không”: gọi chung là **Key active** (hoặc mã kích hoạt / entitlement).

**Mục tiêu:** Fanpage (hoặc API công khai) chỉ cho thao tác nhạy cảm khi **đồng thời** thỏa:

1. Định danh khách (đăng nhập / email / PSID Fanpage — tùy hệ thống).
2. **Key active** còn được coi là **hợp lệ** theo quy tắc của bạn (thời hạn, trạng thái thu hồi, v.v.).

---

## 2. Ý tưởng ban đầu: dùng mã đơn hàng làm Key active

### 2.1. Ưu điểm

- **Đơn giản:** Mỗi đơn có sẵn `id_order` (mã đơn) — không phải phát hành thêm secret.
- **Traceability:** Biết ngay key gắn với đơn nào.
- Phù hợp khi **một khách — một đơn — một dịch vụ** (đã mô tả trong `Renew_Adobe_Check_Flow.md` §10).

### 2.2. Hạn chế khi khách mua nhiều đơn

- Một người có **nhiều mã đơn** → họ phải nhớ / nhập / quản lý **nhiều “key”** tương ứng.
- Các hệ thống Fanpage thường muốn **một luồng nhập liệu duy nhất** (một ô “mã kích hoạt”) cho mọi quyền lợi gói của khách.
- Khi **gom quyền lợi** (gia hạn, mua thêm slot, nhiều đơn cùng loại): bạn muốn **một key đại diện cho cả nhóm đơn** thay vì bắt khách thử từng mã đơn.

**Kết luận:** “Mã đơn = key” tốt cho từng đơn độc lập; **không tối ưu** khi cần **một key chung cho nhiều đơn của cùng một khách**.

---

## 3. Giải pháp đề xuất: Nhóm đơn hàng (Activation group) + Một key chung

### 3.1. Khái niệm

| Khái niệm | Ý nghĩa |
|-----------|--------|
| **Khách hàng (Customer)** | Định danh ổn định: email chính, hoặc Facebook PSID + liên kết email, hoặc `customer_id` nội bộ. Dùng để biết “nhóm này thuộc ai”. |
| **Nhóm kích hoạt (Activation group)** | Một bản ghi logic: “tập các đơn hàng được gom lại để cùng hưởng một **key active**”. |
| **Thành viên nhóm** | Danh sách `order_id` / `id_order` thuộc nhóm (N đơn → 1 nhóm). |
| **Key chung (Group activation key)** | Chuỗi bí mật **sinh ra riêng** (không bắt buộc trùng với bất kỳ `id_order` nào). Lưu **hash** trên DB; chỉ hiển thị **đầy đủ một lần** khi tạo (hoặc chỉ admin xem qua UI có kiểm soát). |

Khách trên Fanpage chỉ cần nhập **một mã** (key chung). Backend tra: key → nhóm → các đơn → kiểm tra quyền lợi (hết hạn, sản phẩm, v.v.).

### 3.2. Quan hệ (tóm tắt)

```text
Customer 1 ──< có nhiều >── Order A, Order B, Order C
                    │
                    └── gom vào ──> ActivationGroup G
                                      │
                                      └── một GroupKey (secret) duy nhất cho G
```

- **Thêm đơn mới** cho khách: có thể **gán đơn vào nhóm hiện có** hoặc **tạo nhóm mới** + phát key mới.
- **Thu hồi quyền:** vô hiệu **key** hoặc đặt nhóm `revoked` / `suspended` — **không phụ thuộc** vào việc bạn đã xóa user trên Adobe hay chưa (đúng với pain “hết hạn nhưng chưa thu hồi account”).

### 3.3. Hai lớp kiểm tra nên tách rõ

1. **Key active (nhóm):** “Khách còn được phép dùng dịch vụ theo hợp đồng / gói của bạn không?” — điều khiển bởi **bạn** (gia hạn, khóa key, thu hồi).
2. **Đơn hàng trong nhóm:** “Các đơn gắn với nhóm còn trong trạng thái nào?” — dùng để **tính hạn**, **mapping sản phẩm**, **audit**.

Luồng API có thể: không có key hợp lệ → **403**; có key nhưng mọi đơn trong nhóm đều không còn điều kiện nghiệp vụ → **403** hoặc **200 + thông báo cần gia hạn** (tùy UX).

---

## 4. Thiết kế dữ liệu gợi ý (mức logic)

Không bắt buộc đúng tên bảng với DB hiện tại; đây là **schema khái niệm**.

### 4.1. Bảng `activation_group`

| Cột (gợi ý) | Mô tả |
|-------------|--------|
| `id` | PK |
| `customer_ref` | FK hoặc chuỗi định danh (email chuẩn hóa, `user_id`, …) |
| `label` | Ghi chú admin: “Khách X — Adobe tháng 3/2026” |
| `status` | `active` / `suspended` / `revoked` |
| `key_hash` | Hash của key chung (bcrypt/argon2 hoặc HMAC với server secret + salt riêng nhóm) |
| `key_hint` | 2–4 ký tự cuối để admin đối chiếu (không lộ full key) |
| `expires_at` | (Tùy) hết hạn **theo key** hoặc null = theo đơn |
| `created_at`, `updated_at` | Audit |

### 4.2. Bảng `activation_group_order` (quan hệ N–N)

| Cột | Mô tả |
|-----|--------|
| `group_id` | FK → `activation_group` |
| `order_id` hoặc `id_order` | FK / mã đơn trong `order_list` |
| `added_at` | Thời điểm gán vào nhóm |

Ràng buộc nghiệp vụ gợi ý:

- Một **đơn** chỉ thuộc **tối đa một nhóm** tại một thời điểm (tránh hai key cùng claim một đơn), **hoặc** cho phép nhiều nhóm nhưng khi đó phải định nghĩa rõ ưu tiên — nên tránh phức tạp.

### 4.3. Sinh key

- Độ dài đủ entropy (ví dụ 20–32 ký tự URL-safe random).
- Lưu **chỉ hash**; lần tạo đầu có thể trả plaintext cho admin copy (giống flow “Tạo key” trên UI **Quản lí Key active**).

### 4.4. So với bảng `key_active` / `order_auto_keys` hiện có

- Nếu hệ thống đã có bảng key theo **từng đơn**: có thể **mở rộng** thêm cột `group_id` nullable, hoặc tách bảng nhóm như trên và dần migrate.
- Renew Adobe đang bàn “key = `id_order`” (§10 doc cũ): với Fanpage + nhiều đơn, **nên bổ sung lớp nhóm** thay vì bắt khách nhập nhiều `id_order`.

---

## 5. Luồng vận hành (admin + khách)

### 5.1. Admin

1. Chọn khách / lọc các đơn cần gom.
2. **Tạo nhóm** + gán danh sách đơn → hệ thống sinh **một key chung**.
3. Gửi key cho khách (tin nhắn Fanpage, email, v.v.).
4. Khi cần chặn nhanh: **Revoke nhóm** hoặc **rotate key** (phát key mới, vô hiệu key cũ).

### 5.2. Khách (Fanpage)

1. Đăng nhập / xác thực danh tính (bước 1).
2. Nhập **Key active** (bước 2).
3. Backend: verify key → nhóm → đơn → áp dụng nghiệp vụ (check profile, renew, …).

---

## 6. Edge case cần quyết định trước khi code

| Tình huống | Câu hỏi |
|------------|---------|
| Đơn refund / hủy | Có **tự động** gỡ đơn khỏi nhóm không? Key có bị revoke không? |
| Khách mua thêm đơn mới | Gán vào nhóm cũ hay tạo nhóm + key mới? |
| Một email, hai người dùng thực tế | Key gắn **nhóm** hay bắt buộc gắn **PSID** để tránh share account? |
| Key bị lộ | Có cơ chế **rotate** + log ai đã dùng key lúc nào không? |

---

## 7. Tóm tắt lựa chọn

| Phương án | Khi nào dùng |
|-----------|----------------|
| **Mã đơn = key** | Ít đơn, mỗi dịch vụ tách bạch, không cần gom UX. |
| **Nhóm đơn + một key chung** | Một khách nhiều đơn, muốn **một mã** cho Fanpage; cần **tách “quyền thương mại” khỏi “tài khoản còn sót”**. |

**Định hướng:** Coi **Key active** là **đối tượng của nhóm (`activation_group`)**, không phải bản sao của từng `id_order`. Các `id_order` trong nhóm là **bằng chứng mua hàng / phạm vi gói**; key chung là **điều kiện được phép gọi API** sau bước đăng nhập.

---

## 8. Bước triển khai gợi ý (roadmap ngắn)

1. Thêm bảng nhóm + bảng gán đơn (migration).
2. API admin: tạo nhóm, gán đơn, revoke, rotate key.
3. Sửa màn **Quản lí Key active**: hiển thị nhóm, danh sách đơn trong nhóm, trạng thái, thao tác copy key (lần đầu).
4. Middleware / endpoint Fanpage: bắt buộc header/body `activation_key` (hoặc tương đương) + verify nhóm + `status`.
5. (Tuỳ chọn) Đồng bộ với luồng Renew Adobe: sau khi có nhóm, điều kiện “đơn còn hiệu lực” lấy từ **tập đơn trong nhóm** thay vì chỉ một `id_order` nhập tay.

---

*Tài liệu này chỉ mang tính đặc tả nghiệp vụ & thiết kế; chi tiết API và tên bảng thực tế nên khớp với migration / module `active-keys` trong repo khi triển khai.*

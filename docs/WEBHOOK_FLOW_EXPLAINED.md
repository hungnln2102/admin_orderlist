# Giải thích chi tiết luồng Webhook nhận thanh toán

## Tổng quan

Khi webhook nhận được thông báo thanh toán, hệ thống xử lý theo **2 giai đoạn**:

1. **Giai đoạn 1 (Trong transaction)**: Insert receipt, cập nhật balance, đổi trạng thái
2. **Giai đoạn 2 (Sau COMMIT)**: Kiểm tra và chạy renewal nếu eligible

---

## Điều kiện "Eligible for Renewal"

Một đơn hàng được coi là **eligible** cho renewal khi:

```javascript
daysLeft <= 4  VÀ  status là một trong: RENEWAL hoặc EXPIRED
```

**Lưu ý quan trọng**: 
- Đơn **UNPAID** không bao giờ eligible, dù `daysLeft <= 4` hay không.
- Đơn **PROCESSING** không eligible cho renewal. PROCESSING là **KẾT QUẢ** của renewal, không phải điều kiện.
- Sau khi renewal, đơn sẽ chuyển về **PROCESSING** (Đang Xử Lý).

---

## Giai đoạn 1: Trong Transaction (Trước COMMIT)

### Bước 1: Kiểm tra eligibility TRƯỚC

```javascript
// Lấy trạng thái hiện tại của đơn
const state = await fetchOrderState(code);
const eligibility = isEligibleForRenewal(state.status, state.orderExpired);
```

### Bước 2: Xử lý theo eligibility

#### Trường hợp A: Đơn **KHÔNG eligible** (đa số trường hợp)

**Ví dụ 1: Đơn mới UNPAID, daysLeft = 30**
- `status = UNPAID` → không eligible (vì status không phải RENEWAL/EXPIRED/PROCESSING)
- **Hành động**:
  1. Insert receipt ✅
  2. Cập nhật balance NCC (nếu có) ✅
  3. **UNPAID → PROCESSING** ✅ (dòng 159-167)
  4. COMMIT ✅

**Ví dụ 2: Đơn UNPAID, daysLeft = 2 (sắp hết hạn nhưng chưa thanh toán)**
- `status = UNPAID` → không eligible (vì status không phải RENEWAL/EXPIRED/PROCESSING)
- **Hành động**:
  1. Insert receipt ✅
  2. Cập nhật balance NCC ✅
  3. **UNPAID → PROCESSING** ✅
  4. COMMIT ✅

#### Trường hợp B: Đơn **eligible** (RENEWAL/EXPIRED với daysLeft <= 4)

**Ví dụ 3: Đơn RENEWAL, daysLeft = 2**
- `status = RENEWAL` + `daysLeft = 2` → **eligible** ✅
- **Hành động**:
  1. Insert receipt ✅
  2. **KHÔNG** cập nhật balance NCC (vì renewal sẽ tự cập nhật) ✅
  3. **KHÔNG** đổi UNPAID → PROCESSING (vì đơn đã có status khác) ✅
  4. COMMIT ✅

**Ví dụ 4: Đơn EXPIRED, daysLeft = 0**
- `status = EXPIRED` + `daysLeft = 0` → **eligible** ✅
- **Hành động**:
  1. Insert receipt ✅
  2. **KHÔNG** cập nhật balance NCC (vì renewal sẽ tự cập nhật) ✅
  3. **KHÔNG** đổi status (vì đã là EXPIRED) ✅
  4. COMMIT ✅

---

## Giai đoạn 2: Sau COMMIT (Renewal Flow)

Sau khi transaction đã commit, hệ thống **kiểm tra lại** tất cả các đơn:

```javascript
// Fetch lại state SAU KHI đã commit (có thể status đã thay đổi)
const state = await fetchOrderState(code);
const eligibility = isEligibleForRenewal(state.status, state.orderExpired);

if (eligibility.eligible) {
  // Chạy renewal
  queueRenewalTask(code);
  await processRenewalTask(code);
}
```

### Các trường hợp sau COMMIT:

#### Trường hợp 1: Đơn mới UNPAID → PROCESSING (Ví dụ 1, 2)
- **Sau COMMIT**: `status = PROCESSING`, `daysLeft = 30` (hoặc 2)
- **Kiểm tra**: `PROCESSING` + `daysLeft = 30` → **KHÔNG eligible** (vì daysLeft > 4)
- **Kết quả**: Không chạy renewal ✅

#### Trường hợp 2: Đơn UNPAID → PROCESSING với daysLeft <= 4 (Ví dụ 2 nếu daysLeft = 2)
- **Sau COMMIT**: `status = PROCESSING`, `daysLeft = 2`
- **Kiểm tra**: `PROCESSING` + `daysLeft = 2` → **KHÔNG eligible** (vì PROCESSING không eligible) ❌
- **Kết quả**: Không chạy renewal ✅
- **Lý do**: PROCESSING là trạng thái sau khi nhận webhook, không phải điều kiện để renewal. Đơn cần được confirm PAID trước, sau đó scheduler sẽ chuyển sang RENEWAL khi daysLeft <= 4.

#### Trường hợp 3: Đơn đã eligible từ trước (Ví dụ 3, 4)
- **Sau COMMIT**: `status = RENEWAL/EXPIRED`, `daysLeft <= 4`
- **Kiểm tra**: **eligible** ✅
- **Kết quả**: **Chạy renewal** ✅
  - Gia hạn đơn (cập nhật order_date, order_expired, days)
  - Cập nhật giá nhập/bán theo giá hiện tại
  - Cộng tiền cho NCC (theo giá nhập hiện tại)
  - **Chuyển status về PROCESSING** (Đang Xử Lý)

---

## Tại sao cần logic phức tạp này?

### Vấn đề ban đầu:
1. Đơn nhận webhook → UNPAID → PROCESSING
2. Đơn chưa được confirm PAID (cần manual confirm)
3. Scheduler chạy → thấy đơn PROCESSING hết hạn → chuyển sang expired ❌

### Giải pháp:
1. **Scheduler**: Chỉ chuyển PAID/RENEWAL/EXPIRED sang expired, **KHÔNG** chuyển PROCESSING
2. **Webhook**: Nếu đơn PROCESSING với daysLeft <= 4 → **tự động gia hạn** ngay khi nhận thanh toán
3. **Kết quả**: Đơn được gia hạn trước khi scheduler chạy, không bị chuyển nhầm sang expired ✅

---

## Flowchart đơn giản

```
Webhook nhận thanh toán
    ↓
Insert receipt
    ↓
Kiểm tra eligibility (TRƯỚC COMMIT)
    ↓
    ├─→ Eligible? 
    │   ├─ YES → Skip balance update, Skip status change
    │   └─ NO  → Update balance, UNPAID → PROCESSING
    ↓
COMMIT
    ↓
Kiểm tra lại eligibility (SAU COMMIT)
    ↓
    ├─→ Eligible?
    │   ├─ YES → Chạy renewal (gia hạn đơn)
    │   └─ NO  → Không làm gì
    ↓
Xong
```

---

## Ví dụ thực tế

### Scenario 1: Đơn mới, thanh toán đúng hạn
- **Trước**: UNPAID, daysLeft = 30
- **Webhook nhận thanh toán**:
  - Insert receipt ✅
  - UNPAID → PROCESSING ✅
  - COMMIT ✅
  - Kiểm tra: PROCESSING + daysLeft = 30 → Không eligible → Không renewal ✅
- **Sau**: PROCESSING, daysLeft = 30
- **Tiếp theo**: Admin confirm → PROCESSING → PAID

### Scenario 2: Đơn sắp hết hạn, thanh toán muộn
- **Trước**: UNPAID, daysLeft = 2
- **Webhook nhận thanh toán**:
  - Insert receipt ✅
  - UNPAID → PROCESSING ✅
  - COMMIT ✅
  - Kiểm tra: PROCESSING + daysLeft = 2 → **KHÔNG Eligible** (PROCESSING không eligible) ❌
  - Không chạy renewal ✅
- **Sau**: PROCESSING, daysLeft = 2
- **Tiếp theo**: Admin confirm → PROCESSING → PAID
- **Sau đó**: Scheduler sẽ chuyển PAID → RENEWAL khi daysLeft <= 4

### Scenario 3: Đơn đã RENEWAL, thanh toán gia hạn
- **Trước**: RENEWAL, daysLeft = 3
- **Webhook nhận thanh toán**:
  - Insert receipt ✅
  - Không đổi status (đã là RENEWAL) ✅
  - COMMIT ✅
  - Kiểm tra: RENEWAL + daysLeft = 3 → **Eligible** ✅
  - **Chạy renewal**: Gia hạn thêm 1 tháng, daysLeft = 33 ✅
  - **Chuyển status về PROCESSING** ✅
- **Sau**: PROCESSING, daysLeft = 33 (đã được gia hạn)
- **Tiếp theo**: Admin confirm → PROCESSING → PAID

### Scenario 4: Đơn đã EXPIRED, thanh toán gia hạn
- **Trước**: EXPIRED, daysLeft = 0 (đã hết hạn)
- **Webhook nhận thanh toán gia hạn**:
  - Insert receipt ✅
  - Không đổi status (đã là EXPIRED) ✅
  - COMMIT ✅
  - Kiểm tra: EXPIRED + daysLeft = 0 → **Eligible** ✅
  - **Chạy renewal**: Gia hạn thêm 1 tháng, daysLeft = 31 ✅
  - **Chuyển status về PROCESSING** ✅
- **Sau**: PROCESSING, daysLeft = 31 (đã được gia hạn)
- **Tiếp theo**: Admin confirm → PROCESSING → PAID

---

## Tóm tắt

1. **"UNPAID → PROCESSING (chỉ khi không eligible renewal)"** có nghĩa là:
   - Nếu đơn **eligible** (RENEWAL/EXPIRED + daysLeft <= 4) → **KHÔNG** đổi status
   - Nếu đơn **không eligible** (UNPAID, PROCESSING, hoặc daysLeft > 4) → **ĐỔI** UNPAID → PROCESSING

2. **"Sau COMMIT: nếu order eligible → chạy renewal"** có nghĩa là:
   - Sau khi đã commit transaction, kiểm tra lại tất cả đơn
   - Nếu đơn **eligible** (RENEWAL/EXPIRED + daysLeft <= 4) → **Chạy renewal**
   - Renewal sẽ:
     - Gia hạn đơn (cập nhật order_date, order_expired, days)
     - Cập nhật giá nhập/bán theo giá hiện tại
     - Cộng tiền cho NCC (theo giá nhập hiện tại)
     - **Chuyển status về PROCESSING** (Đang Xử Lý)

3. **PROCESSING không phải điều kiện để renewal:**
   - PROCESSING là **KẾT QUẢ** của renewal, không phải điều kiện
   - Chỉ RENEWAL và EXPIRED mới eligible cho renewal
   - Sau khi renewal, đơn sẽ về PROCESSING để admin có thể confirm → PAID

4. **Tại sao cần 2 lần kiểm tra?**
   - Lần 1 (trước COMMIT): Để quyết định có đổi UNPAID → PROCESSING không
   - Lần 2 (sau COMMIT): Để quyết định có chạy renewal không (sau khi status có thể đã thay đổi)

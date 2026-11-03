# KẾ HOẠCH TRIỂN KHAI (SPEC & TECHNICAL PLAN)
## CƠ CHẾ KẾT HỢP TÍNH LÃI THEO NGÀY & CHỐT LÃI 1-CHẠM / TỰ ĐỘNG DỰ PHÒNG CHO NỢ CÁ NHÂN (HYBRID DEBT INTEREST SETTLEMENT)

> **Mã kế hoạch:** `PLAN-2026-11-03-DEBT-INTEREST`  
> **Ngày lập:** 03/11/2026 (Múi giờ `Asia/Bangkok`)  
> **Người đề xuất:** Master (Sếp)  
> **Tổng chỉ huy & Soạn thảo:** Orchestrator Agent & Lead Planner  
> **Trạng thái:** Chờ Master phê duyệt (Pending Master Approval)

---

## 📌 1. BỐI CẢNH & NGUYÊN NHÂN GỐC (PROBLEM STATEMENT)

### 1.1. Hiện Trạng Hệ Thống
- Hiện tại, các khoản nợ cá nhân (`personal_debts`) như **Thấu Chi VpBank** (`25.250.331 ₫`) và **Thẻ Tín Dụng** (`6.888.509 ₫`) có cấu hình tính lãi (`debt_interest_enabled = true`, `debt_interest_frequency = 'DAILY'`, `debt_annual_interest_rate = 15%`, `debt_due_day = 25`).
- Tuy nhiên, hệ thống **mới chỉ dừng ở mức tính toán lý thuyết**:
  1. Tính định mức gánh nợ hàng tháng & hàng ngày (`monthlyDebtBurden`, `dailyBurden`) cho mục tiêu hòa vốn của shop.
  2. Hiển thị ước tính lộ trình trả nợ trên UI (`getDebtSchedule`).
- **Chưa có cơ chế ghi nhận thực tế vào Database**: Khi đến ngày đáo hạn hàng tháng, chưa có tác vụ nào cập nhật số tiền lãi vào số dư nợ gốc (`amount`) trong bảng `finance.personal_assets`.

### 1.2. Thách Thức Nghiệp Vụ Ngân Hàng
1. **Nếu tự động 100% bằng Cron Job:** Ngân hàng VPBank tính lãi theo giờ/ngày giải ngân thực tế và có các khoản phí lẻ (làm tròn số, VAT, phí thường niên...). Nếu hệ thống tự động cộng dồn con số lý thuyết, số dư nợ trên web Admin sẽ dễ bị lệch vài nghìn đồng so với app VPBank thật.
2. **Nếu làm thủ công 100%:** Khi đến ngày sao kê/đáo hạn, Master thường bận rộn đóng hàng, kinh doanh nên rất dễ quên bấm ghi nợ, dẫn tới bỏ sót chi phí tài chính.

### 1.3. Giải Pháp Đột Phá: Mô Hình Kết Hợp (Hybrid Model)
Kết hợp sức mạnh của cả 2 phương án:
* **Tầng 1 (Ưu tiên): Chốt 1-chạm (Human-in-the-loop):** Đến ngày đáo hạn, giao diện nổi bật badge nhắc nhở kèm số lãi ước tính. Master mở app VPBank liếc số thực tế, bấm 1 chạm xác nhận (có thể sửa nhanh số lẻ nếu cần) $\rightarrow$ Khớp chuẩn xác 100% từng đồng với ngân hàng.
* **Tầng 2 (Dự phòng): Auto-commit Fallback (Tự động chốt khi hết ngày):** Nếu đến hết ngày đáo hạn (23:59) mà Master chưa bấm chốt, hệ thống tự động cộng số lãi ước tính vào nợ gốc và ghi log với nhãn `(Tự động chốt dự phòng)`. Vẫn có nút chỉnh sửa trên dòng log để nắn lại số tiền bất cứ lúc nào.

---

## 🎯 2. ĐẶC TẢ NGHIỆP VỤ & TIÊU CHÍ NGHIỆM THU (GHERKIN SPEC)

```gherkin
Tính năng: Quản lý và Chốt Lãi Định Kỳ Nợ Cá Nhân Kết Hợp (Hybrid Debt Interest Settlement)

  Bối cảnh:
    Given Khoản nợ "Thấu Chi VpBank" thuộc loại DEBT_PAYABLE
    And Khoản nợ có số dư ban đầu amount = 25.000.000 ₫
    And Khoản nợ được bật tính lãi debt_interest_enabled = true
    And Lãi suất năm debt_annual_interest_rate = 15%
    And Chu kỳ tính lãi debt_interest_frequency = 'DAILY'
    And Ngày đáo hạn debt_due_day = 25

  Kịch bản 1: Tích lũy lãi ngầm theo ngày dựa trên số dư nợ thực tế
    Given Trong tháng Master có nạp tiền trả bớt nợ qua các ngày
    When Hệ thống tính lãi cho ngày t
    Then Tiền lãi ngày t được tính chính xác: Lãi = (Dư nợ cuối ngày t × 15%) / 365
    And Tiền lãi được tích lũy treo, chưa cộng trực tiếp vào nợ gốc amount

  Kịch bản 2: Master thực hiện chốt lãi 1-chạm vào ngày đáo hạn
    Given Hôm nay là ngày 25 (hoặc trước ngày đáo hạn 3 ngày)
    And Khoản nợ chưa được chốt lãi cho kỳ tháng hiện tại
    When Master xem danh sách nợ trên giao diện
    Then Thẻ nợ hiển thị badge nổi bật: "⚡ Kỳ chốt lãi T11: Dự kiến ~182.500 ₫" kèm nút "[Chốt Lãi Ngay]"
    When Master bấm nút "[Chốt Lãi Ngay]"
    Then Popup hiện lên với số tiền điền sẵn 182.500 ₫
    When Master điều chỉnh thành 183.100 ₫ (khớp app VPBank) và bấm "Xác Nhận"
    Then Số dư nợ amount tăng thêm đúng 183.100 ₫
    And Một bản ghi mới được thêm vào debt_payment_logs với target_type = "PERSONAL_DEBT_INTEREST"
    And Cột debt_last_interest_period được cập nhật thành kỳ tháng hiện tại
    And Badge nhắc nhở chốt lãi trên thẻ nợ tự động biến mất

  Kịch bản 3: Tự động chốt dự phòng khi hết ngày đáo hạn mà Master chưa chốt
    Given Hôm nay là ngày đáo hạn (ngày 25)
    And Đến 23:59 Master chưa bấm chốt lãi kỳ tháng hiện tại
    When Tác vụ định kỳ accrueDebtInterestTask kích hoạt lúc 23:59
    Then Hệ thống tự động tính số tiền lãi dự kiến của cả kỳ (ví dụ 182.500 ₫)
    And Hệ thống tăng nợ gốc amount = amount + 182.500 ₫
    And Hệ thống ghi log với ghi chú: "Lãi thấu chi kỳ T11 (Tự động chốt dự phòng)"
    And Hệ thống cập nhật debt_last_interest_period = 'YYYY-MM'
    And Dòng log tại Mục 3 có hiển thị nút [Chỉnh sửa số tiền] để Master nắn lại nếu cần

  Kịch bản 4: Đảm bảo tính Idempotency (Không chốt lãi 2 lần trong 1 kỳ)
    Given Khoản nợ đã được chốt lãi cho kỳ 'YYYY-MM'
    When Có thao tác chốt lãi thêm lần nữa trong cùng kỳ hoặc cron task quét lại
    Then Hệ thống báo lỗi hoặc bỏ qua, bảo đảm không bị cộng dồn lãi kép
```

---

## 🏗️ 3. KIẾN TRÚC KỸ THUẬT & TÁI SỬ DỤNG MÃ NGUỒN (REUSE FIRST)

### 3.1. Database Schema
- **Bảng `finance.personal_assets`**:
  - Tái sử dụng bảng hiện có đã chuyển từ VIEW sang TABLE vật lý theo migration `20261101000001`.
  - Thêm cột:
    ```sql
    ALTER TABLE finance.personal_assets
      ADD COLUMN IF NOT EXISTS debt_last_interest_period VARCHAR(10);
    ```
    *(Tương đồng với cột `profit_last_credited_period` đã dùng rất ổn định cho sổ tiết kiệm `personal_savings`).*
- **Bảng `finance.debt_payment_logs`**:
  - Tái sử dụng cấu trúc bảng hiện có.
  - Sử dụng giá trị `target_type`: `'PERSONAL_DEBT_INTEREST'`.

### 3.2. Backend Logic (`financeHubService.js`)
1. **Hàm `calculateAccruedDebtInterest(asset, targetDate)`**:
   - Tính toán chính xác số ngày tích lũy từ ngày đáo hạn kỳ trước đến kỳ hiện tại.
   - Quét các biến động `debt_payment_logs` trong kỳ để tính lãi theo từng phân đoạn số dư nợ bình quân ngày.
2. **Hàm `settlePersonalDebtInterest(id, payload)`**:
   - Bọc trong `withTransaction(async (trx) => { ... })` chuẩn ACID.
   - Khóa hàng bằng `trx(TABLES.PERSONAL_ASSETS).where('id', id).forUpdate().first()`.
   - Kiểm tra `debt_last_interest_period === periodMonth` để chặn chốt trùng lặp.
   - Cập nhật:
     ```javascript
     await trx(TABLES.PERSONAL_ASSETS)
       .where('id', id)
       .update({
         amount: currentAmount + numAmount,
         debt_last_interest_period: periodMonth,
         updated_at: trx.fn.now(),
       });
     ```
   - Ghi nhật ký vào `debt_payment_logs`.

### 3.3. Scheduler Cron Task (`accrueDebtInterestTask.js`)
- Tái sử dụng mẫu thiết kế của [`creditSavingsProfitTask.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/scheduler/tasks/creditSavingsProfitTask.js).
- Bọc bằng `withAdvisoryLock("accrue_debt_interest", async () => { ... })`.
- Chạy lúc 23:59 hàng ngày.
- Quét các khoản nợ `DEBT_PAYABLE` có `debt_interest_enabled = true` và hôm nay trùng ngày `debt_due_day`:
  - Nếu `debt_last_interest_period !== currentPeriodMonth`: Gọi `settlePersonalDebtInterest` với nhãn tự động chốt.

### 3.4. Frontend UI Components
- **[`DebtsAndInstallmentsSection.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/DebtsAndInstallmentsSection.tsx)**:
  - Giữ nguyên các chỉnh sửa hiện có của Master tại dòng 306.
  - Bổ sung helper `getPendingInterestInfo(item)`: Kiểm tra nếu trong cửa sổ đáo hạn (từ ngày `dueDay - 3` đến hết `dueDay`) và chưa chốt kỳ này $\rightarrow$ Trả về số tiền lãi dự kiến.
  - Hiển thị nút bấm `[Chốt Lãi Ngay]` kèm badge thông minh trên card nợ.
- **[`DebtPaymentModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/DebtPaymentModal.tsx)**:
  - Tái sử dụng modal hiện có, mở rộng thêm mode `DEBT_INTEREST`.
  - Điền sẵn số tiền đề xuất, cho phép chỉnh sửa nhanh, hiển thị kỳ tháng chốt rõ ràng.

---

## 📋 4. DANH SÁCH FILE TÁC ĐỘNG & BƯỚC THỰC HIỆN (TASK BREAKDOWN)

| STT | Bước Thực Hiện | File Tác Động | Loại Thao Tác |
| :---: | :--- | :--- | :---: |
| **1** | Tạo migration thêm `debt_last_interest_period` | `backend/src/db/migrations/20261104000001_add_debt_last_interest_period.js` | Tạo mới |
| **2** | Đăng ký hằng số cột trong db tables | `backend/src/db/tables.js` | Chỉnh sửa |
| **3** | Xây dựng logic tính lãi dồn tích & hàm chốt lãi | `backend/src/domains/finance/services/financeHubService.js` | Chỉnh sửa |
| **4** | Thêm Controller & Route chốt lãi | `backend/src/domains/finance/controllers/financeHubController.js`<br/>`backend/src/domains/finance/routes/financeHubRoutes.js` | Chỉnh sửa |
| **5** | Xây dựng Cron Task tự động chốt dự phòng | `backend/src/scheduler/tasks/accrueDebtInterestTask.js` | Tạo mới |
| **6** | Đăng ký Cron Task vào scheduler runner | `backend/src/scheduler/cronRunner.js` | Chỉnh sửa |
| **7** | Nâng cấp UI: Card Badge & Modal 1-chạm | `frontend/src/features/finance/components/DebtsAndInstallmentsSection.tsx`<br/>`frontend/src/features/finance/components/DebtPaymentModal.tsx` | Chỉnh sửa |
| **8** | Viết Integration Tests kiểm tra toàn bộ luồng | `backend/tests/integration/debt_hybrid_interest_settlement.test.js` | Tạo mới |

---

## 🚫 5. REDLINES (NHỮNG ĐIỀU TUYỆT ĐỐI CẤM LÀM)

1. **Bảo vệ mã nguồn của Master:** Tuyệt đối không ghi đè hoặc làm mất nội dung chỉnh sửa của Master tại dòng 306 trong `DebtsAndInstallmentsSection.tsx`.
2. **Không tạo bảng song song:** Không tạo bảng nợ hay log mới làm phình database, bắt buộc tái sử dụng `finance.personal_assets` và `finance.debt_payment_logs`.
3. **Tuân thủ ACID:** Mọi thao tác ghi nợ/chốt lãi bắt buộc phải bọc trong Knex transaction và sử dụng `forUpdate()` để chống tranh chấp dữ liệu (Race condition).
4. **Không chạy migration khi chưa có lệnh:** Tuân thủ quy định chỉ chạy migration và sửa code sau khi Master đã xem xét và phê duyệt kế hoạch.

---

## 🧪 6. KẾ HOẠCH KIỂM THỬ (TEST PLAN)

1. **Test Case 1 (Calculation Accuracy):** Kiểm tra công thức tính lãi theo ngày của dư nợ tĩnh và dư nợ có biến động nạp/rút trong kỳ.
2. **Test Case 2 (1-Click Settle):** Kiểm tra API chốt lãi thủ công, xác minh số dư nợ `amount` tăng chính xác, `debt_payment_logs` được insert đúng kỳ và `debt_last_interest_period` được ghi nhận.
3. **Test Case 3 (Idempotency):** Cố tình gọi API chốt lãi lần 2 trong cùng 1 kỳ $\rightarrow$ Hệ thống phải chặn và báo lỗi rõ ràng.
4. **Test Case 4 (Auto Fallback Cron):** Kích hoạt cron task khi đến ngày đáo hạn $\rightarrow$ Khoản nợ chưa chốt được tự động ghi nhận; khoản nợ đã chốt thì bỏ qua.
5. **Test Case 5 (Regression Test):** Chạy toàn bộ test suite backend (`npm test` & `npm run test:integration`) bảo đảm không phát sinh side effect tới các module khác.


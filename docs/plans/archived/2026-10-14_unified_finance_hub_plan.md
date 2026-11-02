# KẾ HOẠCH XÂY DỰNG TRUNG TÂM QUẢN TRỊ TÀI CHÍNH TOÀN DIỆN (ALL-IN-ONE FINANCIAL HUB) & ĐỘNG CƠ ĐIỂM HÒA VỐN (BREAK-EVEN ENGINE)

**Tác giả:** Antigravity Sub-Agent Team (👑 Orchestrator, ⚡ Backend Specialist, 🎨 Frontend Lead, 🧪 QA Automation, 🛡️ Security Auditor)  
**Ngày lập:** 2026-10-14  
**Trạng thái:** Đã hoàn thành (Completed)

---

## 1. Bối cảnh & Tầm nhìn Nghiệp Vụ

### 1.1. Vấn đề thực tế của Chủ Shop
- Người quản trị kinh doanh tự do (Solopreneur) luôn có sự giao thoa mật thiết giữa **Tài chính cá nhân** và **Tài chính Shop**:
  - Có các khoản **Nợ** (Nợ Nhà cung cấp lấy hàng, Nợ cá nhân, Dư nợ thẻ tín dụng/vay).
  - Có các khoản **Trả góp theo kỳ** (iPhone, MacBook, Xe máy, Thiết bị...).
  - Có các khoản **Tích lũy & Tài sản** (Quỹ tiết kiệm, Tiền gửi, Quỹ khẩn cấp, Vàng, Tiền nhàn rỗi).
  - Có **Biến động dòng tiền của Shop** (Doanh thu bán đơn hàng, Chi phí vốn hàng hóa, Lợi nhuận bán hàng).
  - Có **Tiền cá nhân** trong các tài khoản ngân hàng và ví.

### 1.2. Cơ chế "Động Cơ Điểm Hòa Vốn" (Break-even Engine)
- **Tư duy quản trị:** Mỗi khi bắt đầu một tháng mới, lợi nhuận của tháng **luôn luôn bắt đầu từ con số ÂM**:
  $$\text{Lợi Nhuận Khởi Điểm Ngày 1} = - (\text{Tổng Chi Phí Cố Định} + \text{Tổng Các Khoản Trả Góp Trong Kỳ})$$
  *(Ví dụ: Tiền nhà 5.000.000 ₫ + Trả góp xe 3.000.000 ₫ = Ban đầu Lợi nhuận tháng là **-8.000.000 ₫**).*
- **Động lực bán hàng:** Mỗi đơn hàng được bán ra (`PAID`) sẽ tạo ra Lãi gộp (Doanh thu - Vốn hàng). Số tiền này sẽ **kéo dần thanh tiến độ từ âm về mốc 0 ₫ (Điểm Hòa Vốn)**.
- **Vượt điểm hòa vốn:** Chỉ sau khi cán mốc 0 ₫, mọi lợi nhuận sinh ra tiếp theo mới là **Lợi Nhuận Ròng Thật Sự** để đưa vào Quỹ Tích Lũy cá nhân.
- **Cơ chế Trả Góp Tự Động Kết Thúc (Auto-Expiring Installments):** Khoản trả góp có kỳ hạn (VD: 12 tháng). Khi tháng hiện tại vượt quá số kỳ tổng, hệ thống **tự động chuyển trạng thái "ĐÃ HOÀN THÀNH"** và **tự động loại bỏ khoản chi phí này ra khỏi các tháng tiếp theo**.

---

## 2. Kiến Trúc Dữ Liệu (PostgreSQL Schema)

Dự kiến tạo file Migration: `v2/backend/src/db/migrations/20261014000001_create_finance_hub_tables.js`

### 2.1. Bảng Chi Phí Cố Định Hàng Tháng: `finance.fixed_costs`
Lưu các chi phí định kỳ cố định lặp lại mỗi tháng (Tiền nhà, điện nước, internet, ăn uống sinh hoạt cơ bản, phí phần mềm...).
- `id`: BIGSERIAL PRIMARY KEY
- `name`: VARCHAR(255) NOT NULL (VD: "Tiền thuê nhà", "Điện nước internet", "Ăn uống sinh hoạt")
- `amount`: NUMERIC(15, 2) NOT NULL (Số tiền mỗi tháng)
- `category`: VARCHAR(50) DEFAULT 'LIVING' (LIVING / SHOP_OPERATIONS / SOFTWARE / OTHER)
- `is_active`: BOOLEAN DEFAULT true (Cho phép bật/tắt tạm thời một khoản chi)
- `note`: TEXT
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

### 2.2. Bảng Trả Góp Theo Kỳ: `finance.installments`
Lưu các khoản mua sắm trả góp hoặc vay trả dần theo số tháng xác định.
- `id`: BIGSERIAL PRIMARY KEY
- `name`: VARCHAR(255) NOT NULL (VD: "Trả góp MacBook Pro M3", "Vay mua xe máy")
- `monthly_amount`: NUMERIC(15, 2) NOT NULL (Số tiền phải trả mỗi tháng, VD: 3.000.000 ₫)
- `total_periods`: INT NOT NULL (Tổng số kỳ hạn theo tháng, VD: 12)
- `start_period`: VARCHAR(7) NOT NULL (Tháng bắt đầu tính kỳ 1, định dạng 'YYYY-MM', VD: '2026-05')
- `due_day`: INT DEFAULT 15 (Ngày đến hạn thanh toán trong tháng, từ 1 đến 31)
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' (ACTIVE: Đang trả / COMPLETED: Đã tất toán hết kỳ)
- `is_active`: BOOLEAN DEFAULT true
- `note`: TEXT
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

### 2.3. Bảng Quản Lý Tài Sản & Nợ Cá Nhân: `finance.personal_assets`
Lưu trữ các nguồn tài sản tích lũy và các khoản nợ cá nhân bên ngoài shop.
- `id`: BIGSERIAL PRIMARY KEY
- `name`: VARCHAR(255) NOT NULL (VD: "Quỹ khẩn cấp Techcombank", "Vàng tích lũy", "Nợ anh Nam vay nóng")
- `type`: VARCHAR(30) NOT NULL:
  - `SAVINGS`: Tiết kiệm, Tích lũy
  - `CASH_BANK`: Tiền mặt hoặc tài khoản cá nhân
  - `GOLD_INVESTMENT`: Vàng, Chứng khoán, Crypto
  - `DEBT_PAYABLE`: Nợ cá nhân phải trả (Nợ người khác)
  - `DEBT_RECEIVABLE`: Người khác nợ mình (Phải thu)
- `amount`: NUMERIC(15, 2) NOT NULL
- `note`: TEXT
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

### 2.4. Tận Dụng Các Bảng Hiện Hữu Của Hệ Thống (Không Làm Trùng Lặp):
- `orders.order_list`: Doanh thu và Vốn hàng bán (COGS) trong tháng từ các đơn `status = 'PAID'`.
- `partner.supplier_order_cost_log`: Tự động tổng hợp **Tổng nợ Nhà Cung Cấp** chưa thanh toán (`Chưa Thanh Toán`).
- `finance.financial_accounts`: Số dư thực tế trong các tài khoản Shop Bank & ví USDT.

---

## 3. Thuật Toán Tính Toán & Nghiệp Vụ Backend

Tạo mới Domain Service: `v2/backend/src/domains/finance/services/financeHubService.js`

### 3.1. Thuật toán xác định Kỳ Trả Góp cho một Tháng `$targetMonth` ('YYYY-MM'):
```js
function calculateInstallmentState(installment, targetMonth) {
  // Khoảng cách số tháng từ start_period đến targetMonth
  const [startYear, startM] = installment.start_period.split('-').map(Number);
  const [targetYear, targetM] = targetMonth.split('-').map(Number);
  const monthDiff = (targetYear - startYear) * 12 + (targetM - startM);
  const currentPeriod = monthDiff + 1; // Kỳ thứ mấy

  if (currentPeriod < 1) {
    return { isEffective: false, status: 'NOT_STARTED', currentPeriod: 0, remainingPeriods: installment.total_periods };
  } else if (currentPeriod <= installment.total_periods) {
    return {
      isEffective: true,
      status: 'ACTIVE',
      currentPeriod,
      remainingPeriods: installment.total_periods - currentPeriod,
      remainingDebt: (installment.total_periods - currentPeriod) * installment.monthly_amount,
    };
  } else {
    return { isEffective: false, status: 'COMPLETED', currentPeriod: installment.total_periods, remainingPeriods: 0, remainingDebt: 0 };
  }
}
```

### 3.2. Thuật toán Báo Cáo Hòa Vốn & Lợi Nhuận Tháng (`getMonthlyBreakEven(month)`):
1. **Tổng Chi phí Cố định:**
   $$\text{FixedTotal} = \sum (\text{fixed\_costs.amount WHERE is\_active = true})$$
2. **Tổng Trả góp hiệu lực trong tháng:**
   $$\text{InstallmentTotal} = \sum (\text{monthly\_amount của các khoản có isEffective = true})$$
3. **Mục tiêu Hòa Vốn Tháng (Break-even Target):**
   $$\text{BreakEvenTarget} = \text{FixedTotal} + \text{InstallmentTotal}$$
   $$\text{StartingDeficit} = -\text{BreakEvenTarget}$$
4. **Lãi Gộp từ Hoạt Động Bán Hàng Của Shop:**
   $$\text{ShopGrossProfit} = \sum (\text{order\_list.price}) - \sum (\text{order\_list.cost}) \quad (\text{các đơn PAID trong tháng})$$
5. **Lợi Nhuận Ròng Thực Tế (Net Profit):**
   $$\text{NetProfit} = \text{ShopGrossProfit} - \text{BreakEvenTarget}$$
6. **Tiến độ về điểm hòa vốn:**
   $$\text{BreakEvenPercent} = \min\left(100, \text{round}\left(\frac{\text{ShopGrossProfit}}{\text{BreakEvenTarget}} \times 100\right)\right)$$
   $$\text{RemainingToBreakEven} = \max(0, \text{BreakEvenTarget} - \text{ShopGrossProfit})$$

### 3.3. Thuật toán Thống kê Tài Sản Ròng (Net Worth):
- $\text{Tổng Tài Sản} = \text{Số dư Bank/USDT Shop} + \text{Tiền mặt & Tích lũy cá nhân} + \text{Khoản cho vay}$
- $\text{Tổng Nợ} = \text{Nợ NCC chưa trả} + \text{Nợ cá nhân phải trả} + \sum (\text{Dư nợ các khoản trả góp còn lại})$
- $\text{Tài Sản Ròng (Net Worth)} = \text{Tổng Tài Sản} - \text{Tổng Nợ}$

---

## 4. Thiết Kế Giao Diện Frontend (`/finance`)

Tạo mới module: `v2/frontend/src/features/finance/`

### 4.1. Khối 1: Header Bộ Lọc & Net Worth KPI Cards (Top Banner)
- Bộ chọn tháng báo cáo (`YYYY-MM`) kèm nút chuyển nhanh Tháng này, Tháng trước.
- 4 Thẻ KPI Glassmorphic:
  1. **Tài Sản Ròng (Net Worth)**: Hiển thị nổi bật với viền phát sáng Cyan, thể hiện sức khỏe tài chính thực tế.
  2. **Tổng Tích Lũy & Tài Sản**: Tiền mặt, ngân hàng cá nhân, vàng/crypto.
  3. **Tổng Nợ Còn Lại**: Nợ NCC + Nợ cá nhân + Toàn bộ dư nợ trả góp chưa tới hạn.
  4. **Dòng Tiền Shop Tháng**: Doanh thu bán hàng và lãi gộp hiện tại.

### 4.2. Khối 2: Hero Section - "Động Cơ Điểm Hòa Vốn Tháng" (Break-even Gauge & Journey)
- Thiết kế thanh tiến độ lớn từ Vùng Âm sang Vùng Dương:
  - Điểm mốc bên trái: Lợi nhuận khởi điểm âm (VD: `-8.000.000 ₫`).
  - Vị trí con trỏ hiện tại: Lãi gộp shop đã bù được bao nhiêu (VD: `-2.400.000 ₫` - Đạt 70% tiến độ hòa vốn).
  - Điểm mốc trung tâm: **0 ₫ (HÒA VỐN)** - Đổi màu rực rỡ khi vượt qua.
  - Vùng bên phải: **VÙNG SINH LỜI / LÃI RÒNG** (Màu xanh Emerald neon) kèm huy hiệu "Đã bắt đầu tích lũy được +X.XXX.XXX ₫".
- Lời khuyên vận hành tự động: *"Shop cần tạo thêm 2.400.000 ₫ lãi gộp nữa để hoàn tất chi phí tháng này và bước vào vùng có lãi ròng."*

### 4.3. Khối 3: Tabs Chi Tiết Quản Lý
- **Tab 1: Trả Góp Theo Kỳ**:
  - Grid card từng khoản trả góp: Tên món hàng, số tiền/tháng, thanh tiến độ số kỳ (VD: `Kỳ 6/12 - 50%`), ngày đóng tiền trong tháng, số nợ còn lại, nút Thêm khoản trả góp mới, nút Tất toán sớm.
- **Tab 2: Chi Phí Cố Định**:
  - Bảng danh sách tiền nhà, tiền ăn, internet,... với toggle bật/tắt linh hoạt và modal Thêm/Sửa chi phí.
- **Tab 3: Sổ Nợ & Tích Lũy Cá Nhân**:
  - Danh mục Nợ NCC (kéo tự động từ đơn nhập hàng), Nợ cá nhân (thêm/sửa), và Quỹ tích lũy.
- **Tab 4: Biến Động Số Dư Shop**:
  - Dòng tiền vào/ra của các tài khoản ngân hàng Shop Bank và ví USDT trong tháng.

---

## 5. Kế Hoạch Triển Khai Chi Tiết (Action Checklist)

### Giai đoạn 1: Database & Backend Migration
- [x] 1. Tạo migration `20261014000001_create_finance_hub_tables.js` (tạo 3 bảng `finance.fixed_costs`, `finance.installments`, `finance.personal_assets`).
- [x] 2. Chạy migration và cập nhật bảng ánh xạ trong `v2/backend/src/db/tables.js`.
- [x] 3. Viết Service `financeHubService.js` chứa các thuật toán tính toán kỳ trả góp, hòa vốn tháng và tài sản ròng.
- [x] 4. Tạo Controller & Routes API tại `v2/backend/src/domains/finance/`:
  - `GET /api/finance/summary?month=YYYY-MM`: Trả về toàn bộ số liệu hòa vốn, KPI, dòng tiền.
  - `GET /api/finance/fixed-costs` & `POST/PUT/DELETE /api/finance/fixed-costs`
  - `GET /api/finance/installments` & `POST/PUT/DELETE /api/finance/installments`
  - `GET /api/finance/personal-assets` & `POST/PUT/DELETE /api/finance/personal-assets`
- [x] 5. Viết Integration Test `finance_break_even_engine.test.js` kiểm tra độ chính xác của các bài toán:
  - Khởi tạo tháng âm lợi nhuận.
  - Tự động nhảy kỳ trả góp theo tháng.
  - Tự động kết thúc và loại bỏ khoản trả góp khi hết kỳ.
  - Tính đúng điểm hòa vốn và lợi nhuận ròng.

### Giai đoạn 2: Frontend Implementation
- [x] 6. Tạo thư mục `v2/frontend/src/features/finance/` gồm:
  - `types.ts`: Định nghĩa kiểu dữ liệu TypeScript (bao gồm `DailyBreakEvenPoint`, `DailyBreakEvenStats`).
  - `components/BreakEvenProgressBar.tsx`: Thanh hành trình hòa vốn trực quan.
  - `components/DailyRollingBreakEvenChart.tsx`: Động cơ Nợ gối đầu qua từng ngày & Biểu đồ tương tác hòa vốn SVG.
  - `components/DebtsAndInstallmentsSection.tsx`: Tab Nợ & Trả góp gộp chung các nghĩa vụ tài chính.
  - `components/FixedCostList.tsx`: Quản lý chi phí cố định.
  - `components/SavingsAndAssetsSection.tsx`: Quỹ tích lũy & Tài sản cá nhân/shop.
  - `components/NetWorthCards.tsx`: Bộ 4 thẻ KPI tài sản ròng.
  - `FinanceHubPage.tsx`: Trang điều phối tổng hợp.
- [x] 7. Móc nối route `/finance` trong `AppRoutes.tsx` trỏ tới `FinanceHubPage` (Lazy loaded).
- [x] 8. Kiểm tra TypeScript & Vite build không phát sinh bất kỳ lỗi nào.

### Giai đoạn 3: Động Cơ Nợ Gối Đầu Từng Ngày (Daily Rolling Deficit Engine)
- [x] 9. Bổ sung logic tính toán định mức ngày ($B / N$), nợ hôm trước gối sang hôm sau ($\max(0, -R_{d-1})$), chỉ tiêu cần đạt hôm nay ($D + \text{nợ gối đầu}$), và đường bù âm lũy kế.
- [x] 10. Xây dựng biểu đồ SVG tương tác 2 chế độ (Rolling Deficit vs Cumulative Net) kèm dải heatmap 31 ngày và card thanh tra chi tiết từng ngày.
- [x] 11. Bổ sung Integration Test TC-06 cho `dailyBreakEven` đạt 100% PASS (6/6 test cases).

### Giai đoạn 4: Tài Liệu Hóa & Bàn Giao
- [x] 12. Cập nhật `v2/README.md` và `README.md` bằng ngôn ngữ dân dã, trực quan, hướng dẫn chủ shop sử dụng trang Tài Chính.
- [x] 13. Đánh dấu hoàn tất task plan và bàn giao cho User nghiệm thu.

---

## 6. Tiêu Chuẩn Hoàn Thành (Definition of Done)
1. Lợi nhuận khởi điểm ngày 1 của tháng được tính tự động từ âm (Chi phí cố định + Trả góp còn kỳ).
2. Khi xem bất kỳ tháng nào trong quá khứ hoặc tương lai, các khoản trả góp tự động hiển thị đúng kỳ tương ứng (VD: Tháng 5 là kỳ 1/12, Tháng 11 là kỳ 7/12).
3. Khoản trả góp tự động kết thúc (COMPLETED) khi hết số kỳ và biến mất khỏi chi phí cố định các tháng sau.
4. Lợi nhuận thực tế nhảy real-time theo các đơn hàng bán ra của shop.
5. Nợ của ngày trước chưa bù hết được tự động gối đầu cộng dồn sang mục tiêu ngày hôm sau.
6. Kiểm thử Integration test đạt 100% PASS (6/6 test cases).

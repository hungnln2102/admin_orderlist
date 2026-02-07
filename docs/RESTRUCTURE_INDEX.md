# Chỉ mục tái cấu trúc thư mục dự án

Tài liệu này liệt kê các khu vực cần tái cấu trúc (theo chuẩn đã áp cho **Orders**), thứ tự ưu tiên và việc cần làm. Đặt tên class theo [BEM_NAMING.md](./BEM_NAMING.md).

---

## Chuẩn cấu trúc tham chiếu (đã áp cho Orders)

Mỗi **feature/trang** nên có:

```text
FeatureName/
├── index.tsx              # Entry, export default hoặc re-export
├── types.ts               # Types/interface dùng trong feature
├── constants.ts           # Hằng số (options, config UI)
├── hooks/
│   ├── index.ts           # (tùy chọn) Re-export hooks
│   ├── useFeatureData.ts  # Hook chính, compose hoặc logic chính
│   ├── useFeatureFetch.ts # Fetch / API
│   ├── useFeatureList.ts  # Filter / sort / pagination
│   └── ...
├── utils/
│   ├── featureHelpers.ts  # Hàm thuần (format, parse)
│   └── ...                # Có thể tách transform riêng nếu logic nặng
└── components/
    ├── FeatureRow.tsx
    ├── FeatureCard.tsx
    └── ...
```

- **Không** nhét quá nhiều logic vào một file (ưu tiên tách hooks/utils).
- **Thư mục**: PascalCase cho feature (Orders, PriceList, PackageProduct).
- **Class name**: BEM, kebab-case (xem BEM_NAMING.md).

---

## Chỉ mục theo khu vực

### 1. Product (pages/Product)

| # | Thư mục / File | Trạng thái | Việc cần làm | Ưu tiên |
|---|----------------|------------|----------------|--------|
| 1.1 | **Orders** | ✅ Đã tối ưu | — Áp BEM cho OrderCard, OrderRow, index | P2 |
| 1.2 | **priceList** | Chưa chuẩn | Đổi tên thư mục `priceList` → `PriceList`; thêm `types.ts`, `constants.ts` nếu thiếu; tách hooks (fetch/list/actions) nếu file > ~300 dòng; thống nhất `components/modals` → `components/Modals` | P1 |
| 1.3 | **PackageProduct** | Một phần | Gộp logic vào hooks (usePackageData có thể tách usePackageFetch, usePackageModals, usePackageActions); thêm `types.ts`, `constants.ts`; chuẩn BEM cho component | P1 |
| 1.4 | **ProductInfo** | Ổn | Chỉ cần áp BEM cho components; kiểm tra views/ có cần tách thêm utils không | P2 |

---

### 2. Personal (pages/Personal)

| # | Thư mục / File | Trạng thái | Việc cần làm | Ưu tiên |
|---|----------------|------------|----------------|--------|
| 2.1 | **Supply** | Có hooks | Chuẩn hóa: thêm `constants.ts` nếu có config; tách utils rõ (supplies.ts đã có); áp BEM cho SupplyList, SupplierDetailModal, SupplyStatsCards, PaymentHistoryTable | P2 |
| 2.2 | **Invoices** | Chưa tách hooks | Tách logic từ index vào hooks (useInvoicesData, useInvoicesFilters…); thêm types.ts, constants nếu cần; components + BEM | P2 |
| 2.3 | **BillOrder** | Đơn giản | Thêm types.ts nếu có type dùng lại; áp BEM cho BillOrderForm, InvoicePreview | P3 |
| 2.4 | **ProductPrice** | Đơn giản | Thêm types/constants nếu cần; BEM cho ControlPanel, QuoteTable, … | P3 |
| 2.5 | **Storage** | Đơn giản | Đã có types.ts; BEM cho SearchBar, StorageHeader, StorageTable | P3 |

---

### 3. Dashboard (pages/Dashboard)

| # | Thư mục / File | Trạng thái | Việc cần làm | Ưu tiên |
|---|----------------|------------|----------------|--------|
| 3.1 | **Dashboard** | Có hooks, constants | Áp BEM cho toàn bộ components (OverviewSection, FinanceSection, OrderChartCard, WalletBalancesCard, …); kiểm tra component nào > 200 dòng thì tách nhỏ | P2 |
| 3.2 | **WalletBalancesCard** | Sub-component | Đã có types, utils; BEM cho WalletBalancesCard, WalletBalancesHeader, WalletBalancesTable | P2 |

---

### 4. Components chung (components/)

| # | Thư mục / File | Trạng thái | Việc cần làm | Ưu tiên |
|---|----------------|------------|----------------|--------|
| 4.1 | **layout/sidebar** | Ổn | BEM: sidebar, sidebar__header, sidebar__menu, sidebar__item, sidebar__item--active; menuConfig/sidebarUtils giữ nguyên | P2 |
| 4.2 | **modals/** | Từng modal đã tách | Mỗi modal: root class BEM (vd: view-order-modal, create-order-modal); áp BEM cho phần bên trong (header, body, footer); thống nhất index re-export | P2 |
| 4.3 | **ui/** | Nền tảng | BEM cho ColorPicker, GradientButton, Pagination, ResponsiveTable, StatCard (block + element + modifier nếu có) | P2 |
| 4.4 | **ErrorBoundary** | Đơn giản | Thêm class BEM cho wrapper/error message | P3 |

---

### 5. Features (features/)

| # | Thư mục / File | Trạng thái | Việc cần làm | Ưu tiên |
|---|----------------|------------|----------------|--------|
| 5.1 | **auth** | Ổn | BEM cho LoginPage, LoginCard, LoginForm, LoginBackground; thống nhất tên block (vd: login-page, login-card) | P2 |

---

### 6. Lib & constants (src/)

| # | Mục | Trạng thái | Việc cần làm | Ưu tiên |
|---|-----|------------|----------------|--------|
| 6.1 | **constants** | Hai nơi | Gom `constants.ts` + `constants/zIndex.ts` thành `constants/index.ts` + `constants/zIndex.ts`, import từ `@/constants` hoặc `@/constants/zIndex` | P3 |
| 6.2 | **lib/** | Nhiều file *Api | Giữ từng file theo domain; có thể nhóm re-export trong lib/index.ts (tùy chọn) | P3 |

---

## Thứ tự thực hiện gợi ý

1. **P1 (trước)**  
   - priceList → PriceList + cấu trúc hooks/utils/constants/types.  
   - PackageProduct: tách hooks/utils, thêm types/constants, BEM.

2. **P2 (tiếp)**  
   - Orders, ProductInfo: áp BEM.  
   - Supply, Invoices: hooks + BEM.  
   - Dashboard + WalletBalancesCard: BEM.  
   - layout/sidebar, modals, ui, features/auth: BEM.

3. **P3 (sau)**  
   - BillOrder, ProductPrice, Storage: BEM + types/constants nếu thiếu.  
   - ErrorBoundary: BEM.  
   - constants gom thư mục; lib re-export (tùy chọn).

---

## Checklist nhanh mỗi feature

Khi tái cấu trúc một thư mục, dùng checklist sau:

- [ ] Thư mục feature đặt tên PascalCase (trừ khi team quy ước khác).
- [ ] Có `index.tsx` hoặc `index.ts` re-export entry.
- [ ] Có `types.ts` nếu feature có type dùng lại.
- [ ] Có `constants.ts` nếu có config/options.
- [ ] Logic nặng tách vào `hooks/` (fetch, list, actions, modals…).
- [ ] Hàm thuần tách vào `utils/`.
- [ ] Component không quá ~250–300 dòng; tách component con nếu cần.
- [ ] Class name theo BEM (block, element, modifier); block luôn đứng đầu trong `className`.
- [ ] Thư mục con `components/modals` thống nhất: hoặc `Modals` hoặc `modals` trong cả dự án.

---

*Cập nhật lần cuối: theo cấu trúc Orders và BEM_NAMING.md.*

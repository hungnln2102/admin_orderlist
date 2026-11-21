# 🎨 KẾ HOẠCH TỐI ƯU HÓA & CHUẨN HÓA FRONTEND (FRONTEND BLUEPRINT)

## Kế hoạch triển khai theo benchmark

Phần này cập nhật thứ tự thực thi của các task bên dưới. FE-01 và FE-02 là đợt Warehouse đầu tiên. Xếp FE-08 ngay sau đó để đo tác động lên lần tải trang. FE-04 đến FE-07 là cải tiến giao diện và định dạng, thực hiện theo nhu cầu nghiệp vụ.

### Mốc đo ngày 21/11/2026

TypeScript kiểm tra thành công. Vite build vào thư mục tạm trong 10,98 giây. Kích thước đo theo từng file build.

| File | Thô (kB) | Gzip (kB) |
|---|---:|---:|
| Warehouse | 314,16 | 38,65 |
| Biên lai | 238,60 | 31,52 |
| Đơn hàng | 195,22 | 29,97 |
| React vendor | 368,15 | 113,85 |
| CSS toàn cục | 318,14 | 32,65 |

### Checklist và Pre-Flight bổ sung

- [x] **FE-01–03 · Tái sử dụng UI Kho.** Đối chiếu [Component Library](../design-system/COMPONENT_LIBRARY.md). Đã thay `ToggleSwitch`, `CopyButton`, `QuickDateAddButtons` và `DateInputVN` trên `WarehouseCreateModal`, `WarehouseEditSlotModal`, `WarehouseAccountsTable`, `WarehouseSlotSubTable`. (`WarehousePage`: 314,16 kB -> 308,30 kB thô / 38,54 kB gzip).
- [x] **FE-08 · Lazy-load modal Biên lai.** Đã chuyển `AllocateReceiptModal`, `CreateReceiptModal`, `PendingBatchesModal` trong [ReceiptsPage.tsx](../../frontend/src/pages/ReceiptsPage.tsx) sang `React.lazy` + `Suspense` và chỉ mount khi mở. Kết quả build: `ReceiptsPage` giảm từ **238,60 kB (31,52 kB gzip)** xuống **59,93 kB (8,21 kB gzip)** (**-74,9%**), tách riêng 3 chunk modal (`CreateReceiptModal` 77,23 kB, `AllocateReceiptModal` 47,12 kB, `PendingBatchesModal` 17,66 kB).
- [x] **FE-09 · Điều phối tải danh sách.** [useWarehouseData.ts](../../frontend/src/features/warehouse/hooks/useWarehouseData.ts) chỉ tải `/api/warehouse/system-products` khi mở tab Danh mục hoặc mở modal liên quan (`ensureSystemProducts`). [useOrders.ts](../../frontend/src/features/orders/hooks/useOrders.ts) chỉ gửi `includeStats: true` khi đổi tab/bộ lọc/tìm kiếm hoặc gọi `refreshOrders()`, gửi `includeStats: false` khi chỉ chuyển trang/đổi pageSize.
- [x] **FE-10 · Tách page theo trách nhiệm & mở rộng lazy-load.** Đã tách toàn bộ dữ liệu, bộ lọc, thống kê và CRUD từ [WarehousePage.tsx](../../frontend/src/pages/WarehousePage.tsx) (804 dòng → ~370 dòng) sang [useWarehouseData.ts](../../frontend/src/features/warehouse/hooks/useWarehouseData.ts), đồng thời lazy-load 7 modal + `WarehouseCatalogGrid` trên Kho (`314,16 kB → 109,07 kB`, **-65,3%**) và 4 modal trên [OrdersPage.tsx](../../frontend/src/pages/OrdersPage.tsx) (`195,22 kB → 83,55 kB`, **-57,2%**).
- [x] **FE-11 · Dùng chung combobox và định dạng.** Đã trích xuất `<SearchableCombobox />` (hỗ trợ điều hướng bàn phím Up/Down/Enter/Esc, tìm kiếm, nhập tay) vào [SearchableCombobox.tsx](../../frontend/src/shared/components/SearchableCombobox.tsx), cập nhật [COMPONENT_LIBRARY.md](../design-system/COMPONENT_LIBRARY.md) và thay thế `AccountCombobox` inline trong [PackageCreateEditModal.tsx](../../frontend/src/features/packages/components/PackageCreateEditModal.tsx) (-145 dòng).

### Nghiệm thu đợt đầu

```gherkin
Scenario: Tạo và chỉnh slot Kho với thành phần dùng chung
  Given form Kho có dữ liệu và các tùy chọn hợp lệ
  When đổi switch, sao chép, cập nhật ngày và lưu
  Then thao tác, giá trị gửi API và dữ liệu hiển thị lại khớp hành vi cũ

Scenario: Mở Biên lai với cache trình duyệt lạnh
  Given người dùng đã đăng nhập và modal đang đóng
  When vào trang Biên lai rồi mở modal tạo hoặc phân bổ
  Then mã modal được tải sau thao tác mở và luồng lưu vẫn hoạt động
  And kết quả đo ghi riêng JS tải lúc vào trang và độ trễ mở modal
```

Chạy TypeScript, Vite build và kiểm tra desktop/mobile. Ghi HAR hoặc số liệu Network cho cache lạnh. Tỷ lệ giảm bundle chỉ chốt sau build thử và đo trình duyệt. Theo dõi triển khai backend trong [blueprint Backend](2026-11-21_system_optimization_backend_blueprint.md).
## PHÂN CHIA NHIỆM VỤ ĐỘC LẬP — CÁC TASK BIỆT LẬP TUYỆT ĐỐI KHÔNG ĐỤNG CHẠM NHAU (ZERO COLLISION)

> **Vị trí tài liệu:** `docs/plans/2026-11-21_system_optimization_frontend_blueprint.md`  
> **Chủ nhân tối cao (Sovereign):** 👑 **Master (Sếp)**  
> **Tổng chỉ huy giám sát:** 👑 **Orchestrator Agent**  
> **Đơn vị thực thi:** Đội ngũ Agent Frontend chuyên biệt (mỗi Agent nhận 1 Task độc lập).  
> **Quy tắc bất biến:** **KHÔNG TASK NÀO ĐƯỢC PHÉP ĐỤNG CHẠM VÀO FILE CỦA TASK KHÁC** (Mutually Exclusive File Sets).

---

## 🛑 RANH GIỚI BẤT KHẢ XÂM PHẠM CHUNG CHO TOÀN BỘ FRONTEND AGENTS (REDLINES)

> [!CAUTION]
> **ĐIỀU CẤM KỴ TỐI CAO:**
> 1. ❌ **CẤM TỰ Ý CODE INLINE GIAO DIỆN**: Mọi switch On/Off, nút copy, ô nhập ngày, form layout bắt buộc phải import tái sử dụng từ `@/shared/components`. Tuyệt đối không tự viết lại `<button className="rounded-full translate-x-5">` hoặc `navigator.clipboard.writeText`.
> 2. ❌ **CẤM SỬA FILE NGOÀI PHẠM VI TASK**: Mỗi Agent chỉ được phép mở và sửa duy nhất các file được liệt kê trong danh sách file của Task mình đảm nhận.
> 3. ❌ **CẤM ĐỤNG CHẠM VÀO CODE MASTER ĐANG LÀM DỞ**:
>    - `otp_portal/src/features/adobe/components/AdobeAccountRecovery.tsx`
>    - `frontend/src/features/activationKeys/components/ActivationKeyRulesTab.tsx`
> 4. ❌ **CẤM LÀM THAY ĐỔI CONTRACT API**: Giữ nguyên tên props, callback functions và payload gửi lên server.

---

## 🧩 DANH SÁCH CÁC TASK FRONTEND ĐỘC LẬP TUYỆT ĐỐI (ZERO COLLISION TASKS)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MA TRẬN PHÂN CHIA FILE BIỆT LẬP                      │
├─────────┬──────────────────────────────────────────────────────────────┤
│ TASK    │ TẬP HỢP FILE PHẠM VI (KHÔNG TRÙNG NHAU 100%)                 │
├─────────┼──────────────────────────────────────────────────────────────┤
│ FE-01   │ features/warehouse/components/WarehouseCreateModal.tsx       │
│ FE-02   │ features/warehouse/components/WarehouseEditSlotModal.tsx     │
│ FE-03   │ features/warehouse/components/WarehouseAccountsTable.tsx     │
│         │ features/warehouse/components/WarehouseSlotSubTable.tsx      │
│ FE-04   │ features/finance/components/FixedCostModal.tsx               │
│ FE-05   │ features/finance/components/InstallmentModal.tsx             │
│ FE-06   │ features/finance/components/SavingFundModal.tsx              │
│ FE-07   │ features/orders/components/OrderStatsCards.tsx               │
│         │ features/finance/components/FinanceOverviewCards.tsx         │
└─────────┴──────────────────────────────────────────────────────────────┘
```

---

### 🔹 TASK FE-01: Chuẩn Hóa Switch On/Off Trên WarehouseCreateModal
- **Agent Đảm Nhận**: Frontend Agent 1
- **Tập Hợp File Tác Động Duy Nhất**:
  - [frontend/src/features/warehouse/components/WarehouseCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCreateModal.tsx)
- **Mục Tiêu & Việc Cần Làm**:
  - Import `{ ToggleSwitch } from "@/shared/components"`.
  - Thay thế 2 nút switch trượt tự code inline bằng `<button className="w-11 h-6 rounded-full ...">`:
    1. Switch *"Tạo Gói Kho Cho Tài Khoản Này"* (`formData.createPackage`) -> Thay bằng `<ToggleSwitch checked={!!formData.createPackage} onChange={(v) => onFormChange({ ...formData, createPackage: v })} variant="cyan" />`.
    2. Switch *"Cần tài khoản liên kết cùng gói này không?"* (`formData.hasLinkedAccount`) -> Thay bằng `<ToggleSwitch checked={!!formData.hasLinkedAccount} onChange={(v) => onFormChange({ ...formData, hasLinkedAccount: v, linkedAccountRole: formData.linkedAccountRole || "storage" })} variant="cyan" size="sm" />`.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM sửa đổi cấu trúc lưới Grid 12 cột form ngang `max-w-5xl xl:max-w-6xl` đã duyệt.
  - ❌ CẤM thay đổi signature `onFormChange` hoặc props của component.

---

### 🔹 TASK FE-02: Chuẩn Hóa Nút Copy & Nút Cộng Ngày Trên WarehouseEditSlotModal
- **Agent Đảm Nhận**: Frontend Agent 2
- **Tập Hợp File Tác Động Duy Nhất**:
  - [frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx)
- **Mục Tiêu & Việc Cần Làm**:
  - Import `{ CopyButton, QuickDateAddButtons } from "@/shared/components"`.
  - Xóa bỏ state nội bộ `copiedField` và hàm `handleCopy(text, fieldKey)` thủ công.
  - Thay thế 4 nút sao chép inline (Username, Password, Backup email, 2FA key) bằng `<CopyButton text={...} />`.
  - Thay thế các nút `+30d`, `+90d`, `+365d` viết cứng bằng `<QuickDateAddButtons onAddDays={handleAddDays} onClear={() => setFormData({ ...formData, expiresAt: "" })} hasValue={!!formData.expiresAt} />`.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM can thiệp vào `SlotProviderControls` (đã chuẩn hóa ở đợt trước).
  - ❌ CẤM xóa hàm `handleAddDays` tính toán ngày hết hạn.

---

### 🔹 TASK FE-03: Chuẩn Hóa Nút Sao Chép Nhanh Trên Bảng Dữ Liệu Kho (Tables)
- **Agent Đảm Nhận**: Frontend Agent 3
- **Tập Hợp File Tác Động Duy Nhất**:
  - [frontend/src/features/warehouse/components/WarehouseAccountsTable.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseAccountsTable.tsx)
  - [frontend/src/features/warehouse/components/WarehouseSlotSubTable.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseSlotSubTable.tsx)
- **Mục Tiêu & Việc Cần Làm**:
  - Rà soát các nút copy tài khoản kho, copy password hoặc 2FA secret key hiển thị trên từng hàng của Table/SubTable.
  - Thay thế các thẻ button tự viết `navigator.clipboard.writeText` bằng `<CopyButton text={...} size="xs" variant="ghost" />`.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM thay đổi pagination, sorting hoặc bộ lọc tìm kiếm của bảng.
  - ❌ CẤM sửa các modal tạo/sửa (đã do FE-01 và FE-02 phụ trách).

---

### 🔹 TASK FE-04: Hiện Đại Hóa FixedCostModal Sang Chuẩn Form Ngang 2 Cột
- **Agent Đảm Nhận**: Frontend Agent 4
- **Tập Hợp File Tác Động Duy Nhất**:
  - [frontend/src/features/finance/components/FixedCostModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FixedCostModal.tsx)
- **Mục Tiêu & Việc Cần Làm**:
  - Nâng cấp modal từ dạng dọc chật hẹp sang chuẩn **Form Ngang 2 Cột** (`max-w-4xl lg:max-w-5xl rounded-3xl`).
  - Import `{ DateInputVN, ToggleSwitch } from "@/shared/components"`.
  - Thay thế các ô nhập ngày hạn định bằng `<DateInputVN />`.
  - Nếu có switch tự động trừ tiền kỳ hạn -> Dùng `<ToggleSwitch variant="emerald" />`.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM thay đổi logic tính toán số tiền chi phí cố định hoặc danh mục chi phí.
  - ❌ CẤM sửa đổi các bảng kế toán hoặc API backend.

---

### 🔹 TASK FE-05: Hiện Đại Hóa InstallmentModal Sang Chuẩn Form Ngang 2 Cột
- **Agent Đảm Nhận**: Frontend Agent 5
- **Tập Hợp File Tác Động Duy Nhất**:
  - [frontend/src/features/finance/components/InstallmentModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/InstallmentModal.tsx)
- **Mục Tiêu & Việc Cần Làm**:
  - Chuyển layout modal sang **Form Ngang 2 Cột** cân xứng (`max-w-4xl`):
    * Cột 1: Thông tin khoản vay, đối tác tài chính, tổng nợ gốc, lãi suất.
    * Cột 2: Kỳ hạn trả góp, ngày bắt đầu, ngày đến hạn định kỳ, tài khoản trích tiền.
  - Dùng `<DateInputVN />` cho ngày đáo hạn định kỳ.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM sửa công thức tính dư nợ gốc giảm dần hoặc lãi suất.

---

### 🔹 TASK FE-06: Hiện Đại Hóa SavingFundModal Sang Chuẩn Form Ngang 2 Cột
- **Agent Đảm Nhận**: Frontend Agent 6
- **Tập Hợp File Tác Động Duy Nhất**:
  - [frontend/src/features/finance/components/SavingFundModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/SavingFundModal.tsx)
- **Mục Tiêu & Việc Cần Làm**:
  - Tối ưu kích thước modal sang dạng ngang trực quan, thoáng đãng.
  - Sử dụng `<DateInputVN />` cho ngày đáo hạn tiết kiệm và `<ToggleSwitch />` cho trạng thái tự động tái tục.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM can thiệp vào số dư thực tế của quỹ tiết kiệm.

---

### 🔹 TASK FE-07: Chuẩn Hóa Hiển Thị Tiền Tệ Trên Thẻ Thống Kê (Stats Cards)
- **Agent Đảm Nhận**: Frontend Agent 7
- **Tập Hợp File Tác Động Duy Nhất**:
  - [frontend/src/features/orders/components/OrderStatsCards.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderStatsCards.tsx)
  - [frontend/src/features/finance/components/FinanceOverviewCards.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FinanceOverviewCards.tsx)
- **Mục Tiêu & Việc Cần Làm**:
  - Thay thế các đoạn code viết thủ công `val?.toLocaleString('vi-VN') + ' đ'` bằng hàm chuẩn `formatCurrency(val)` từ [frontend/src/shared/utils/format.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/utils/format.ts).
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM sửa cấu trúc JSX của các thẻ StatsCards. Chỉ thay thế hàm format chuỗi hiển thị.

---

## 🧪 QUY TRÌNH KIỂM THỬ & NGHIỆM THU CHO TỪNG TASK FRONTEND
Mỗi Agent sau khi hoàn tất task của mình BẮT BUỘC phải chạy lệnh kiểm tra:
```bash
cd frontend
npm run build
```
- **Điều kiện PASS**: Lệnh build hoàn tất 100% sạch sẽ, không có bất kỳ warning/error TypeScript nào.
- **Không có xung đột Git**: Vì các task sở hữu các file độc lập tuyệt đối, Master có thể merge từng task hoặc cho nhiều agent làm việc cùng lúc mà không lo đè code.

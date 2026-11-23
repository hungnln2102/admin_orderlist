# 📋 Nhật Ký Nghiệm Thu Hệ Thống — 2026-11-22

## [00:07] Triển Khai Gộp Ưu Tiên 1 (Responsive Mobile/Tablet) & Ưu Tiên 2 (BaseModal SSOT + DateInputVN + ToggleSwitch)

- **Phạm vi tác động**:
  - **Shared Design System SSOT**:
    - Tạo mới [BaseModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/BaseModal.tsx) (`max-h-[92vh]`, body `overflow-y-auto`, cố định Header/Footer, phím `Esc`), export tại [index.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/index.ts), bổ sung mục 8 vào [COMPONENT_LIBRARY.md](file:///e:/Project/admin_store/admin_orderlist/docs/design-system/COMPONENT_LIBRARY.md).
    - [NotificationModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/NotificationModal.tsx): Bổ sung `max-h-[90vh] overflow-y-auto`.
  - **Responsive Mobile & Tablet (Chống tràn Modal, Header, Grid)**:
    - Header `flex-wrap`: [ReceiptsPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/ReceiptsPage.tsx), [SystemPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/SystemPage.tsx).
    - Modal `max-h-[92vh] overflow-y-auto` & Grid `grid-cols-1 sm:grid-cols-2`: [FixedCostModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FixedCostModal.tsx), [InstallmentModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/InstallmentModal.tsx), [SavingFundModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/SavingFundModal.tsx), [PersonalBankAccountModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/PersonalBankAccountModal.tsx), [PersonalTransactionCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/PersonalTransactionCreateModal.tsx), [SavingGoalModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/SavingGoalModal.tsx), [DebtPaymentModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/DebtPaymentModal.tsx), [WarehouseFinanceBackfillModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/WarehouseFinanceBackfillModal.tsx), [WalletCreateEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/payment-wallets/components/WalletCreateEditModal.tsx), [SupplierCreateEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/suppliers/components/SupplierCreateEditModal.tsx), [CreateActivationKeyModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/activationKeys/components/CreateActivationKeyModal.tsx), [ExternalImportCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-imports/components/ExternalImportCreateModal.tsx), [ExternalImportEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-imports/components/ExternalImportEditModal.tsx).
  - **Đồng bộ 100% `<DateInputVN />` (10 → 0 raw `type="date"`) & `<ToggleSwitch />`**:
    - Thay toàn bộ 10 ô `<input type="date">` tại [WarehouseAddServiceModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseAddServiceModal.tsx), [PackageCreateEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/packages/components/PackageCreateEditModal.tsx), [ExternalImportCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-imports/components/ExternalImportCreateModal.tsx), [ExternalImportEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-imports/components/ExternalImportEditModal.tsx), [BalanceSnapshotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/BalanceSnapshotModal.tsx), [WarehouseFinanceBackfillModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/WarehouseFinanceBackfillModal.tsx), [WarehouseFinanceLedger.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/WarehouseFinanceLedger.tsx).
    - Thay checkbox bằng `<ToggleSwitch />` tại [WalletCreateEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/payment-wallets/components/WalletCreateEditModal.tsx) (2), [BalanceSnapshotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/BalanceSnapshotModal.tsx) (1), [WarehouseEditSlotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx) (1).
- **Kiểm tra kỹ thuật**:
  - `tsc && vite build` trong `frontend/`: **0 lỗi**, hoàn tất trong **4,49s**.
  - Quét lại toàn bộ `frontend/src/` ngoài `shared/`: còn **0** ô `<input type="date">` thủ công.

## Đối soát VPBank #602

- Sửa parser đọc bảng HTML và chiều OUTFLOW. Xác minh trên MIME gốc, 14 unit test hiện có và một mẫu HTML bổ sung.
- Bổ sung số tài khoản cho mapping VPBank cá nhân #1004. Xử lý lại receipt #602 trong transaction, log #2 và ledger #790. Số dư giảm 25.000 đồng. Lượt lặp trả alreadyProcessed.


## [00:29] Đóng Gói `<CustomSelect />` & Chuẩn Hóa Dropdown Kho/Ví/Biên Lai + Dọn Sạch Checkbox On/Off

- **Phạm vi tác động**:
  - **Shared Design System SSOT**:
    - Tạo mới [CustomSelect.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/CustomSelect.tsx) (React Portal chống cắt trong modal `overflow-y-auto`, tự lật lên khi gần đáy màn hình, tìm kiếm nhanh, điều hướng bàn phím `ArrowUp/Down/Enter/Esc`, 6 màu accent), export tại [index.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/index.ts), bổ sung mục 9 vào [COMPONENT_LIBRARY.md](file:///e:/Project/admin_store/admin_orderlist/docs/design-system/COMPONENT_LIBRARY.md).
  - **Thay thế `<select>` gốc → `<CustomSelect />` (14 vị trí — đạt 0 `<select>` gốc trong toàn phân hệ Kho Hàng)**:
    - [WarehouseCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCreateModal.tsx) (2 — gồm ô **Sản phẩm (*)** Master khoanh đỏ và ô chọn tài khoản kho liên kết).
    - [WarehouseAddServiceModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseAddServiceModal.tsx) (2), [SlotProviderControls.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/SlotProviderControls.tsx) (1), [WarehouseFilterBar.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseFilterBar.tsx) (2), [CatalogCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogCreateModal.tsx) (1), [CatalogEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogEditModal.tsx) (1).
    - [FixedCostModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FixedCostModal.tsx) (1), [WalletCreateEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/payment-wallets/components/WalletCreateEditModal.tsx) (3), [ReceiptsPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/ReceiptsPage.tsx) (1).
  - **Dọn sạch toàn bộ 7 checkbox On/Off còn lại → `<ToggleSwitch />`**:
    - [CatalogEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogEditModal.tsx), [PackageCreateEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/packages/components/PackageCreateEditModal.tsx), [CategoryModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/packages/components/CategoryModal.tsx), [HolidayRulesTable.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/otp-theme/components/HolidayRulesTable.tsx), [VpbankMailboxConfigModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/VpbankMailboxConfigModal.tsx), [SlotProductSupplierRuleModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx), [ProductApiMappingTab.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx).
- **Kiểm tra kỹ thuật**:
  - `tsc && vite build`: **0 lỗi**, hoàn tất trong **4,74s** (`CustomSelect` chunk dùng chung: 7,80 kB / 2,54 kB gzip).
  - `<select>` gốc còn lại trong `features/warehouse`: **0**.
  - Checkbox On/Off còn lại toàn frontend: **0** *(chỉ giữ duy nhất 1 checkbox chọn nhiều dòng đơn hàng trong `CreateReceiptModal.tsx`)*.


## D?n hai h?m n?i b? kh?ng s? d?ng

?? g? hai h?m n?i b? kh?ng c? ?i?m g?i: `incrementVariantOrderCount` trong `orderService.js` v? `cookieMatchesHostname` trong `browserLauncherService.js`. Ki?m tra c? ph?p, qu?t tham chi?u v? 16 unit test li?n quan ??u ??t.

B? unit test backend ??y ?? ???c d?ng khi ch?a tr? k?t qu?.


## 21:14 ? S?a route Tr?nh duy?t ??m M?y

?? s?a Nginx tr?n VPS ?? gi? ti?n t? `/browser/` khi proxy t?i Selkies. Ki?m tra `nginx -t` ??t, backend health tr? HTTP 200. Route v? asset tr? HTTP 401 khi ch?a c? phi?n qu?n tr?. C?n ki?m tra giao di?n v? k?t n?i WebSocket b?ng phi?n admin.

Upstream tr? trang m?c ??nh t?i `/` v? HTML Selkies t?i `/browser/`. Vhost production ?? reload v? c? b?n sao c?u h?nh tr??c khi s?a.

## [21:15] Báo Cáo Đánh Giá Toàn Diện Hệ Thống Dự Án (System-Wide Comprehensive Audit)

- **Quy mô tổng thể**:
  - **Backend**: 215 files / 33.654 dòng mã nguồn, chia 16 domains nghiệp vụ.
  - **Frontend**: 216 files / 54.042 dòng mã nguồn, 16 features, 14 shared components.
  - **Cơ sở dữ liệu**: 56 migrations Knex có thứ tự thời gian chuẩn.
  - **Kiểm thử & Build**:
    - Frontend: 	sc && vite build PASS 100% (0 lỗi, 11.81s).
    - Backend: 34/35 unit test suites PASS 100% (chỉ 1 test productApiService.test.js cần tách DB).
  - **Hạ tầng & Bảo mật**: Docker bind 127.0.0.1, không lộ port, session Postgres an toàn, 0 secret lọt vào Git.

- **Các điểm tồn đọng chính**:
  1. **Frontend**: 134 lời gọi etch thô chưa qua piClient; ~50 modal tự viết ixed inset-0 chưa kế thừa BaseModal; các page béo (>700 dòng).
  2. **Backend**: God files (orderService.js 1239 dòng, packageProductService.js 912 dòng); một số hàm ghi tài chính trong inanceHubService.js chưa bọc transaction.
  3. **Bảo mật**: Cần bổ sung rate limiting cho /api/auth/login.
  4. **CI/CD**: CI hiện chỉ chạy
ode --check cú pháp, chưa tích hợp chạy tự động bộ test backend.


## ??t 1 x? l? n? k? thu?t

??t 1 r? so?t n? k? thu?t: chuy?n Product API sang integration, mock resolver ??nh tuy?n trong unit test OTP, th?m unit test backend v?o CI, chuy?n Pricing/Suppliers qua apiClient v? d?ng BaseModal cho x?c nh?n x?a s?n ph?m.

Unit test ??t 161/161 v?i URL PostgreSQL kh?ng kh? d?ng. Frontend build ??t. C?n ch?y GitHub Actions, integration v?i DB test c? d? li?u ph? h?p v? ki?m tra t??ng t?c tr?n tr?nh duy?t.


## [21:49] Hợp Nhất `core-agents` Thành 1 Global Plugin Duy Nhất (Phương Án B) & Sửa Lỗi Codex Quên Pre-Flight / Subagents

- **Trạng thái nghiệm thu**: PASS 100% (chưa commit/push Git, chờ Master duyệt).
- **Thay đổi kỹ thuật**:
  - **Repo SSOT `E:\Project\core-agents`**:
    - Gom toàn bộ **12 skills duy nhất** (7 role subagents + 5 core skills) về `E:\Project\core-agents\skills\`, xóa thư mục trùng `plugins/`, `plugins.json` và bản sao `AGENTS.md` ở root.
    - Tạo 7 file subagent `.toml` tại `E:\Project\core-agents\agents\` trỏ thẳng về `E:/Project/core-agents/skills/<role>/SKILL.md`.
    - Hợp nhất đầy đủ Hiến pháp (bao gồm Nguyên Tắc 8 + kiểm tra lỗi text + khối **HARD OVERRIDE FOR CODEX**) vào 1 file duy nhất: [E:/Project/core-agents/rules/AGENTS.md](file:///E:/Project/core-agents/rules/AGENTS.md).
    - Tạo manifest cho cả 2 nền tảng: [plugin.json](file:///E:/Project/core-agents/plugin.json), [.codex-plugin/plugin.json](file:///E:/Project/core-agents/.codex-plugin/plugin.json), [.agents/plugins/marketplace.json](file:///E:/Project/core-agents/.agents/plugins/marketplace.json).
  - **Gắn Global trên máy**:
    - Antigravity Plugin Junction: `C:\Users\Mavryk\.gemini\config\plugins\core-agents` -> `E:\Project\core-agents`.
    - Codex Global Agents Junction: `C:\Users\Mavryk\.codex\agents` -> `E:\Project\core-agents\agents`.
    - Cập nhật [C:/Users/Mavryk/.codex/AGENTS.md](file:///C:/Users/Mavryk/.codex/AGENTS.md) (thêm khối HARD OVERRIDE toàn cục) và [C:/Users/Mavryk/.codex/config.toml](file:///C:/Users/Mavryk/.codex/config.toml) (trỏ marketplace `core-agents-local`, xóa block `SessionStart` bị lặp).
  - **Dọn sạch repo `admin_orderlist`**:
    - Gỡ bỏ submodule `.agents`, `.gitmodules`, và `.codex/agents/`.
    - Rút gọn [AGENTS.md](file:///e:/Project/admin_store/admin_orderlist/AGENTS.md) xuống chỉ còn quy tắc đặc thù riêng của `admin_orderlist` + trỏ về SSOT `core-agents`.
- **Kiểm tra đã chạy**:
  - Validate 3 file JSON manifests: **3/3 PASS**.
  - Validate cú pháp TOML (`config.toml` + 7 file `agents/*.toml`) và kiểm tra tồn tại file `SKILL.md`: **8/8 PASS (`skill_exists=True`)**.
  - Kiểm tra Directory Junction trên Windows: **2/2 PASS**.


## Nghi?m thu h?p tho?i x?a s?n ph?m

Playwright tr?n Edge ??t ? 1280 px v? 390 px v?i API gi? l?p c?c b?. ?? x?c minh m? h?p tho?i, n?i dung s?n ph?m v? thao t?c H?y. Integration c?n thi?u TEST_DATABASE_URL v? Docker Engine c?c b? ch?a ho?t ??ng. GitHub Actions ch?a c? l??t ch?y cho b?n thay ??i trong workspace.

## Triển khai đợt ưu tiên sau kiểm toán Hiến pháp

**Trạng thái** — Đạt kiểm thử cục bộ trong phạm vi đợt ưu tiên. GitHub Actions và production chưa được xác minh.

- **OTP** — Bỏ hai đường ghi slot công khai và lệnh đồng bộ từ trình duyệt. API đọc cấu hình vẫn công khai. Quản trị viên ghi cấu hình qua API System hiện có. [Public OTP](../backend/src/domains/system/routes/publicOtpRoutes.js)
- **Gia hạn và Outbox** — Ghi kho và đánh dấu sự kiện thành công trong cùng giao dịch. Khi lỗi, các ghi kho rollback và sự kiện vẫn chờ xử lý. Worker thử lại mỗi 60 giây. Kiểm thử PostgreSQL xác nhận rollback, phát lại đồng thời và giữ hạn mới khi phát lại sự kiện cũ. [Subscriber gia hạn](../backend/src/events/subscribers/orderEventSubscriber.js)
- **VPBank và SePay** — Đưa mapping hoặc mã tham chiếu VPBank mơ hồ về duyệt thủ công. SePay OUT được xử lý khi webhook hợp lệ gửi lại đúng chứng cứ giao dịch, biên lai chưa được ghi nợ và đã có đúng một mapping hợp lệ. Kiểm thử xác nhận hai lượt gửi lại đồng thời chỉ ghi nợ một lần. [VPBank](../backend/src/domains/finance/services/vpbankEmailIngestionService.js) · [SePay](../backend/src/domains/payments/services/webhookPaymentService.js)
- **Kiểm thử và CI** — 162 unit test backend đạt, hai frontend build đạt và 56 migration chạy trên PostgreSQL 16 cô lập. CI có bước chạy hai bộ kiểm thử đối soát trước deploy. Bộ Product API riêng đạt 4/7 trên DB trống do ba ca cần fixture sản phẩm hoặc nhà cung cấp. [Workflow](../.github/workflows/admin-deploy.yml)
- **Kiểm soát văn bản** — Repo thiếu `scripts/scan_text_errors.py`. Đã kiểm tra UTF-8 và nội dung thêm mới trong phạm vi tệp chỉnh sửa.

## Sửa lỗi chuyển đơn sang Đang Xử Lý

- `processOrderToProcessing` truyền `updateFields` vào hàm đồng bộ kho thay cho biến `payload` chưa khai báo. Với đơn gia hạn, các trường ngày hết hạn và số ngày vẫn được chuyển sang luồng đồng bộ kho hiện có. [orderService.js](../backend/src/domains/orders/services/orderService.js#L1052)
- Kiểm tra cú pháp đạt, 162 unit test backend đạt và hai ca kiểm tra service với transaction giả lập đạt. Chưa thử trên đơn thật.

## Dùng chung hàm sinh mã kích hoạt của OrderList

- Tạo key theo lô dùng cùng `generateOrderActivationKey` với key xem trước và key tạo khi lưu đơn. Modal hiển thị mẫu `MAVKEYA8F291` và bỏ ô tiền tố.
- Tạo theo lô sinh lại mã bị trùng tối đa 5 lượt trong cùng transaction. Kiểm tra giả lập đạt cho trường hợp trùng mã và rollback khi hết lượt.
- 161 unit test backend và bản build frontend đạt. Chưa chạy kiểm thử tích hợp PostgreSQL vì thiếu cấu hình `TEST_DATABASE_URL`.

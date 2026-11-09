# Daily Review - 2026-11-09

## [Asia/Bangkok] Giai đoạn 3 - Tách domain Finance, Invoices và UI tài chính

- Phạm vi: tách các service nghiệp vụ Finance và Invoices theo domain; giảm trách nhiệm của `financeHubService.js` và `invoiceService.js`; tách các phần UI finance chỉ trình bày khỏi component cha.
- Thay đổi kỹ thuật: thêm `backend/src/domains/finance/services/fixedCostService.js`, `installmentService.js`, `personalAssetService.js` và `backend/src/domains/invoices/services/receiptAllocationService.js`; facade cũ vẫn giữ export/API public.
- UI: thêm `frontend/src/features/finance/components/BalanceSnapshotModal.tsx` và `PersonalAssetPreview.tsx`; `PersonalFinanceBalanceLogSection.tsx` và `PersonalAssetsModal.tsx` giữ state, validation, fetch và submit ở cha, chỉ chuyển JSX render sang component con.
- Không tác động Giai đoạn 2 Warehouse/External Imports. Không sửa API route, payload, transaction hay semantics phân bổ receipt.
- Kiểm tra đã chạy: `node --check` cho bốn service mới; `npm.cmd run build` trong `frontend`; `git diff --check` toàn worktree, đều pass (chỉ có cảnh báo CRLF từ Git).
- Trạng thái nghiệm thu: CHƯA NGHIỆM THU nghiệp vụ tài chính. Cần chạy integration DB cho fixed cost, installment, personal debt và receipt allocation trên dữ liệu cô lập trước khi chấp nhận production.

## [Asia/Bangkok] Lập task Giai đoạn 5 mới - Dynamic OTP Gateway

- Đã tạo `docs/plans/2026-11-09-phase5-dynamic-otp-gateway-tasks.md` thay thế hướng Provider class theo vendor.
- Kế hoạch mới dùng `external_api_configs` làm nguồn runtime cho external gateway; giữ registry capability nhỏ cho TOTP/Warehouse và flow đa bước khi dữ liệu thực sự yêu cầu.
- Chưa sửa source OTP, migration hay frontend Traffic; task đang chờ Master duyệt.


## [00:25 Asia/Bangkok] Giai đoạn 4 - Phân rã Khối Đơn hàng (Core) & Catalog Sản phẩm

- **Phạm vi**: 
  - Phân rã đơn hàng `orderService.js` (từ 2.076 dòng xuống 1.326 dòng), bóc tách queries & credit transactions thành các sub-services chuyên biệt.
  - Phân rã catalog sản phẩm `productService.js` (từ 1.514 dòng xuống 695 dòng), trích xuất toàn bộ module Kho Gói (`warehouse.package_products` & `package_categories`) sang sub-service riêng.
  - Chuẩn hoá API Client đơn hàng phía Frontend: tạo `ordersApiClient.ts` và tích hợp tập trung qua `apiClient`.
- **Thay đổi kỹ thuật**:
  - [`backend/src/domains/orders/services/orderQueryService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderQueryService.js): Chuyên trách toàn bộ truy vấn đơn hàng (`getOrders`, `getOrderById`, `getDefaultShopBank`, `attachBatchSupplierAndQrInfo`, `attachSupplierInfo`, `attachVietQrToOrder`, và các bộ lọc SQL).
  - [`backend/src/domains/orders/services/orderCreditService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderCreditService.js): Chuyên trách nghiệp vụ thanh toán đơn bằng credit hoàn tiền (`payOrderWithCredit`, `calculateOrderRemainingValue`).
  - [`backend/src/domains/orders/services/orderService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js): Đóng vai trò Facade re-export 100% backward-compatible, chỉ trực tiếp xử lý các mutation cốt lõi (`createOrder`, `updateOrder`, `renewOrder`, `deleteOrder`, `processOrderToProcessing`, `processCompleteOrder`).
  - [`backend/src/domains/products/services/packageProductService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/packageProductService.js): Chuyên trách quản lý Kho Gói sản phẩm (`getPackageProducts`, `getPackageCategories`, `createPackageCategory`, `updatePackageCategory`, `deletePackageCategory`, `createPackageProduct`, `updatePackageProduct`, `deletePackageProduct`, `getAllCatalogProductNames`).
  - [`backend/src/domains/products/services/productService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/productService.js): Rút gọn từ 1.514 dòng xuống 695 dòng, chuyên trách Bảng giá Niêm yết, Biến thể và Giá vốn NCC (`getProductPrices`, `getSuppliersForVariant`, `getAllSuppliersList`, `createProduct`, `updateProduct`, `deleteProduct`, `addSupplierCost`, `updateSupplierCost`, `deleteSupplierCost`), re-export các hàm Kho Gói qua Facade.
  - [`frontend/src/features/orders/api/ordersApiClient.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/api/ordersApiClient.ts): Chuẩn hóa toàn bộ request API đơn hàng (`getOrders`, `getOrderById`, `createOrder`, `updateOrder`, `deleteOrder`, `processOrder`, `completeOrder`, `renewOrder`, `payOrderWithCredit`) với typing chặt chẽ.
  - [`frontend/src/features/orders/hooks/useOrders.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/hooks/useOrders.ts), [`PayWithCreditModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/PayWithCreditModal.tsx), [`OrdersPage.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/OrdersPage.tsx), [`useOrderCatalog.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/hooks/useOrderCatalog.ts): Chuyển sang gọi qua `ordersApiClient` và `apiClient`.
- **Ranh giới an toàn & Zero Regression**:
  - Tuyệt đối không thay đổi API route hay contract giữa Frontend và Backend.
  - Tuyệt đối không đụng vào các file Giai đoạn 3 (Finance/Invoices) đang do GPT phụ trách.
  - Các hàm Facade re-export đầy đủ, các caller backend (`productController.js`, `orderRoutes.js`, `webhookInboundOrderService.js`, `supplierService.js`) không bị gãy bất kỳ signature nào.
- **Kiểm tra Verification Gates**:
  - Backend Unit Tests: `npm --prefix backend test` -> **119/119 unit tests PASS 100%**.
  - Frontend Build: `npm --prefix frontend run build` -> **0 lỗi TypeScript, build thành công trong 5.11s**.
- **Trạng thái nghiệm thu**: ĐÃ HOÀN THÀNH GIAI ĐOẠN 4.


## [00:32 Asia/Bangkok] Khắc phục lỗi ReferenceError updateCatalogItem trong warehouseService

- **Phạm vi**: Khôi phục hàm `updateCatalogItem` trong [`warehouseService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/services/warehouseService.js) bị cắt sót khi tách module slot ở Giai đoạn 2; bổ sung regression test bảo vệ module exports.
- **Thay đổi kỹ thuật**:
  - [`backend/src/domains/warehouse/services/warehouseService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/services/warehouseService.js): Bổ sung lại toàn bộ logic hàm `updateCatalogItem(id, payload)` bọc transaction Knex, cập nhật `TABLES.PRODUCT_NAMES` (`name`, `category`, `login_url`, `product_id`), phát event `WAREHOUSE_CATALOG_UPDATED` và trả về thông tin danh mục kèm `systemProductName`.
  - [`backend/tests/unit/warehouse_service.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/warehouse_service.test.js): Tạo mới regression test kiểm tra toàn bộ 17 export methods của `warehouseService` và các method của `warehouseController`, đảm bảo không bao giờ tái diễn lỗi `ReferenceError` khi nạp module.
- **Kiểm tra Verification Gates**:
  - Node runtime test require: Tất cả 7 service & controller nạp thành công 100%.
  - Backend Unit Tests: `npm --prefix backend test` -> **122/122 unit tests PASS 100%**.
  - Frontend Build: `npm --prefix frontend run build` -> **0 lỗi TypeScript, build thành công trong 4.74s**.
- **Trạng thái nghiệm thu**: ĐÃ HOÀN TẤT KHẮC PHỤC. Server backend và nodemon khởi động bình thường.


## [00:45 Asia/Bangkok] Rà soát và phục hồi toàn bộ text bị lỗi encoding / Mojibake

- **Phạm vi**: Quét toàn bộ 433 tệp tin của dự án (`frontend/src`, `backend/src`, `backend/tests`, `docs`, `report`); giải mã phục hồi 100% text tiếng Việt, ký hiệu tiền tệ `₫` và emoji bị lỗi font/Mojibake do ghi đè Windows-1252 kèm BOM trước đây.
- **Thay đổi kỹ thuật**:
  - Đã giải mã thông minh theo từng dòng (Smart Line-by-Line Decoder với bảng ánh xạ byte Windows-1252 đầy đủ) và gỡ bỏ byte BOM `0xEF 0xBB 0xBF`:
    1. [`frontend/src/features/external-api/components/ExternalApiConfigController.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx): Khôi phục 416 dòng bị lỗi (nhãn `Mã 2FA / OTP`, `Tài khoản kho`, `Thời gian còn lại (s)`, icon `🎯`, `👤`, `⏳`, `🔗`...).
    2. [`backend/src/domains/finance/services/vpbankEmailIngestionService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/finance/services/vpbankEmailIngestionService.js): Khôi phục 14 dòng comment tiếng Việt chuẩn ACID.
    3. [`backend/tests/unit/vpbankEmailParser.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/vpbankEmailParser.test.js): Khôi phục 30 dòng test case tiếng Việt (`1.500.000 đ`, `Thẻ VISA *2340 của Quý khách`...).
    4. [`report/2026-11-01-daily-review.md`](file:///e:/Project/admin_store/admin_orderlist/report/2026-11-01-daily-review.md): Khôi phục 100 dòng báo cáo nghiệm thu cũ bị lỗi hiển thị.
- **Kiểm tra Verification Gates**:
  - Re-run Scanner toàn diện: **433/433 tệp tin đạt chuẩn UTF-8 sạch, 0 tệp tin còn lỗi Mojibake (0 corrupted files)**.
  - Backend Unit Tests: `npm --prefix backend test` -> **122/122 unit tests PASS 100%**.
  - Frontend Build: `npm --prefix frontend run build` -> **0 lỗi TypeScript, build thành công trong 5.39s**.
- **Trạng thái nghiệm thu**: ĐÃ HOÀN TẤT. Toàn bộ mã nguồn và báo cáo dự án đồng bộ UTF-8 chuẩn.

## [00:52 Asia/Bangkok] Khắc phục lỗi ReferenceError personalAssetService trong financeHubService

- **Phạm vi**: Khắc phục lỗi sập nodemon backend do thiếu lệnh import `personalAssetService` trong [`financeHubService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/finance/services/financeHubService.js); bổ sung unit test bảo vệ runtime loading cho toàn bộ domain Finance.
- **Thay đổi kỹ thuật**:
  - [`backend/src/domains/finance/services/financeHubService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/finance/services/financeHubService.js): Thêm dòng `const personalAssetService = require("./personalAssetService");` tại dòng 19, hoàn thiện việc nạp 9 phương thức quản lý tài sản cá nhân & sổ nợ sang Facade.
  - [`backend/tests/unit/finance_hub_service.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/finance_hub_service.test.js): Tạo mới regression test kiểm tra toàn bộ 31 methods của `financeHubService`, 9 methods của `personalAssetService`, và các handler của `financeHubController`, `vpbankMailboxController`.
- **Kiểm tra Verification Gates**:
  - Node runtime test require: Quét toàn bộ `backend/src/domains` xác nhận 0 module lỗi (0 failed modules).
  - Backend Unit Tests: `npm --prefix backend test` -> **126/126 unit tests PASS 100%**.
  - Frontend Build: `npm --prefix frontend run build` -> **0 lỗi TypeScript, build thành công trong 5.68s**.
- **Trạng thái nghiệm thu**: ĐÃ HOÀN TẤT KHẮC PHỤC. Server backend và nodemon khởi động bình thường, toàn bộ domain Finance hoạt động ổn định.



## [Asia/Bangkok] Phase 5 - Dynamic OTP Gateway và Traffic feature

- **Phạm vi**: Hoàn tất phần source-level còn thiếu của generic OTP gateway và tách Traffic thành component feature-local; không chạy migration hoặc ghi database production.
- **OTP**: `probeOtpForEmail()` buộc truyền `service_key`, bỏ fallback ngầm sang HDSD; slot mới không tự chèn `warehouse_2fa`/`fix_ades`; `analyzeEndpoint()` dispatch theo `execution_mode` thay vì nhận diện Fix Ades. Bổ sung `COLS.EXTERNAL_API_CONFIGS.EXECUTION_MODE`.
- **Traffic**: Tách `TrafficPage.tsx` từ 960 xuống 266 dòng; thêm `TrafficHeader.tsx`, `TrafficKpiGrid.tsx`, `TrafficChart.tsx`, `TrafficDataTable.tsx`. State/filter/sort/pagination/export CSV vẫn ở page orchestration, endpoint giữ `/api/traffic/stats?days=...`.
- **Kiểm tra đã chạy**: syntax check backend; `npm --prefix backend test` pass **135/135**; `npm --prefix frontend run build` pass. Bundle ghi nhận Traffic `78.76 kB`; residual warning là FinanceHub `691.86 kB` vượt ngưỡng `500 kB`.
- **Chưa nghiệm thu**: integration DB OTP/cache invalidation, browser smoke test Traffic/OTP Portal và production verification. Không tuyên bố production-ready.

## [Asia/Bangkok] Refactor an toàn - OTP, VietQR và API client frontend

- Phạm vi: Loại bỏ fallback runtime không an toàn của OTP; gom URL VietQR theo contract hiện có; chuẩn hóa một phần request frontend qua apiClient mà không đổi endpoint hoặc payload.
- OTP fail-closed: Dispatcher trả lỗi cấu hình xác định khi OTP_PORTAL_SLOTS_CONFIG thiếu hoặc hỏng; public endpoint trả 503 thay vì tự lộ slot mặc định.
- VietQR: Thêm backend/src/utils/qrUrl.js và golden tests; Orders, Suppliers, Invoices dùng chung helper. Luồng Telegram chưa chuyển vì mã hóa dấu cách khác contract business hiện tại.
- Frontend transport: FinanceHubPage.tsx, CreateReceiptModal.tsx, AllocateReceiptModal.tsx gọi qua feature API client dựa trên apiClient, bảo toàn credentials, xử lý 401, route, body và response đang có.
- Kiểm tra đã chạy: npm --prefix backend test pass 138/138; npm --prefix frontend run build pass; git diff --check pass.
- Rủi ro còn lại: Chưa chạy integration DB, browser smoke hoặc production verification. Bundle FinanceHubPage vẫn khoảng 691.76 kB, vượt ngưỡng cảnh báo 500 kB; chưa có profiling để tách chunk an toàn.

## [10:10 Asia/Bangkok] Triển khai Quản lý Mã Kích Hoạt Key & Cấp phát Slot Tự động (Kho Gói -> Đơn hàng)

- **Phạm vi**:
  - Bổ sung phân hệ "Quản lý Mã Kích Hoạt Key" (`/activation-keys`) nằm trong nhóm "Danh mục Sản phẩm & Giá" theo đúng chỉ đạo của Master.
  - Xây dựng động cơ tự động cấp phát slot kho chuẩn ACID transaction (`activateKeyWithTransaction`): Khách nhập mã key -> Hệ thống tự động vào Kho Gói (`warehouse.account_slots`) tìm tài khoản còn slot trống -> Chiếm slot (`status = 'IN_USE'`) -> Cập nhật tài khoản vào cột `slot` của đơn hàng (`order_list.slot`) -> Cập nhật key thành `ACTIVATED` -> Trả thông tin tài khoản cho khách.
- **Thay đổi kỹ thuật**:
  - Database: Migration `backend/src/db/migrations/20261109000002_create_activation_keys.js` tạo bảng `warehouse.activation_keys` và các chỉ mục (`key_code`, `status`, `product_name_id`, `id_order`). Khai báo bảng & cột chuẩn hóa trong `backend/src/db/tables.js`.
  - Backend Services & Routes:
    - `backend/src/domains/products/services/activationKeyService.js`: Chuyên trách sinh key chuẩn ngẫu nhiên cao (`PREFIX-XXXX-XXXX`), truy vấn danh sách, phân trang, lọc, thu hồi và giao dịch cấp phát slot tự động (`activateKeyWithTransaction`) bọc Knex transaction với `FOR UPDATE` chống race condition.
    - `backend/src/domains/products/controllers/activationKeyController.js`: Xử lý HTTP request và phân quyền.
    - `backend/src/domains/products/routes/index.js`: Mount các endpoint `/api/products/activation-keys`.
    - `backend/src/server.js`: Đăng ký public route `/api/public/otp/activate-key` và tích hợp tự động phát hiện mã key trong endpoint `/api/public/otp/gpt/account`.
  - Frontend UI:
    - `frontend/src/layout/navigation.ts`: Thêm menu item `{ name: "Quản lý Mã Kích Hoạt", path: "/activation-keys", icon: KeyRound }` vào nhóm `"Danh mục Sản phẩm & Giá"`.
    - `frontend/src/routes/AppRoutes.tsx` & `routeLoaders.ts`: Đăng ký lazy route `/activation-keys`.
    - `frontend/src/features/activationKeys/`: Bộ component hoàn chỉnh gồm thẻ thống kê nhanh (`ActivationKeyStatsCards.tsx`), thanh công cụ lọc & tìm kiếm (`ActivationKeyFilterBar.tsx`), bảng dữ liệu (`ActivationKeyTable.tsx`) và modal tạo mã key mới (`CreateActivationKeyModal.tsx`).
    - `frontend/src/pages/ActivationKeysPage.tsx`: Trang quản lý trung tâm Dark theme, Responsive, tích hợp phân trang URL.
  - Tests:
    - `backend/tests/unit/activationKeyService.test.js`: Kiểm thử định dạng mã key, tính ngẫu nhiên độc nhất và xác thực lỗi đầu vào.
- **Kiểm tra Verification Gates**:
  - Migration Knex: Chạy thành công Batch 14.
  - Backend Unit Tests: `npm --prefix backend test` -> **142/142 tests PASS 100%**.
  - Frontend Build: `npm --prefix frontend run build` -> **0 lỗi TypeScript, bundle thành công 15.46s**.
- **Trạng thái nghiệm thu**: ĐÃ HOÀN THÀNH VÀ SẴN SÀNG SỬ DỤNG.


## [11:20 Asia/Bangkok] Khắc phục V2 VivaRocky gửi sai định dạng request cho cả 3 luồng

- **Nguyên nhân gốc:** `fetchOtpFromVivaRocky` tạo body form và truyền `Content-Type: application/x-www-form-urlencoded`, nhưng `requestConfiguredApi` ghi đè thành `application/json`. VivaRocky vì vậy không đọc được `user_email` trong V2, trong khi V1 dùng form transport trực tiếp.
- **Thay đổi:** `backend/src/domains/system/services/externalApiConfigService.js` chỉ tự thêm `application/json` khi caller chưa truyền `Content-Type`; giữ nguyên body form của VivaRocky.
- **Phạm vi đã bảo vệ:** Household `/household.php`, 6-Digit Login `/six_digit_login.php`, Sign-in Code `/signin_code.php`; request JSON hiện có vẫn giữ hành vi cũ.
- **Kiểm tra:** `node --test tests/unit/otpProviderService.test.js tests/unit/securityHardening.test.js` đạt **14/14**; toàn bộ `npm --prefix backend test` đạt **143/143**; `node --check` hai file và `git diff --check` đều pass.
- **Trạng thái:** Đã sửa source local và chưa deploy production theo yêu cầu hiện tại.
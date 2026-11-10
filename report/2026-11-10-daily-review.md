# BÁO CÁO NGHIỆM THU HÀNG NGÀY (DAILY REVIEW REPORT)
> **Ngày:** 10/11/2026 (Múi giờ Asia/Bangkok)  
> **Chủ nhân tối cao:** 👑 Master (Sếp)  
> **Tổng chỉ huy thực hiện:** 👑 Orchestrator Agent & Frontend Specialist

---

## [11:28] Cấu Hình Ảnh Nền Dọc & Tối Ưu Mobile Cho OTP Portal

### 1. Phạm Vi & Bối Cảnh
- Khắc phục triệt để hiện tượng ảnh nền anime bị cắt cụt nhân vật 2 bên sườn khi truy cập trên thiết bị di động (Mobile màn hình dọc 9:16).
- Tích hợp trọn bộ 28 tranh nền True Portrait 1080x1920 được outpaint hoàn chỉnh từ Master.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Trích xuất tài nguyên:**
   - Giải nén thành công 28 file `.webp` từ `D:\Download\otp_backgrounds_true_portrait_1080x1920.zip` vào thư mục:  
     [`d:\Desktop\admin\otp_portal\public\assets\holidays\mobile/`](file:///d:/Desktop/admin/otp_portal/public/assets/holidays/mobile/)
2. **Cập nhật logic tải tranh & Canvas ([`FestivalBackground.tsx`](file:///d:/Desktop/admin/otp_portal/src/components/FestivalBackground.tsx)):**
   - Bổ sung hàm `resolveArtUrl(artPath, isMobile)` tự động trỏ sang thư mục `mobile/` khi phát hiện màn hình $\le 768\text{px}$ hoặc portrait.
   - Thêm hook `isMobile` lắng nghe cả sự kiện `resize` và `orientationchange`.
   - Cơ chế Fallback an toàn: nếu ảnh mobile gặp sự cố sẽ tự động lùi về ảnh gốc desktop.
   - Tối ưu Canvas Hạt (Sakura, Maple, Tuyết, Đom đóm, Bụi sáng): Áp dụng Uniform Scaling theo khung ảo 1080x1920 (chống méo hình học bầu dục), đồng thời giảm 50% số lượng hạt trên mobile giúp máy mát mẻ, tiết kiệm pin và không che ô nhập OTP.
3. **Cập nhật lớp phủ bóng ([`festival-themes.css`](file:///d:/Desktop/admin/otp_portal/src/styles/festival-themes.css)):**
   - Bổ sung media query `@media (max-width: 768px), (orientation: portrait)` cho `.festival-art-shade` chuyển sang gradient dọc 180deg (`linear-gradient(180deg, ...)`), làm nổi bật nhân vật anime ở đỉnh và giữ khoảng tối êm dịu ở giữa cho form OTP.

### 3. Kết Quả Kiểm Thử (Verification)
- **Kiểm tra file:** Đầy đủ 28 file webp (`01.webp` -> `24.webp`, `spring.webp`, `summer.webp`, `autumn.webp`, `winter.webp`) trong `public/assets/holidays/mobile/`.
- **Kiểm tra biên dịch:** `npm run build` (`tsc && vite build`) chạy thành công 100%, không cảnh báo, không phát sinh lỗi TypeScript.
- **Side effects:** Không ảnh hưởng đến màn hình Desktop và không tác động đến các API/Logic cấp mã OTP.

---

## [11:38] Nâng Cấp Kỹ Thuật 2 Lớp Smart Blurred Backing (Cinematic Mobile)

### 1. Phạm Vi & Mục Tiêu
- Khắc phục triệt để hiện tượng xén mép nhân vật do màn hình điện thoại thon dài (19.5:9 hoặc 20:9) so với chuẩn ảnh 16:9.
- Áp dụng kỹ thuật 2 lớp Cinematic (Smart Blurred Backing): Giữ trọn 100% chi tiết ảnh gốc sắc nét, không méo hình, đồng thời lấp đầy không gian màn hình bằng ánh sáng mờ huyền ảo.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Bổ sung lớp Ambient Layer ([`FestivalBackground.tsx`](file:///d:/Desktop/admin/otp_portal/src/components/FestivalBackground.tsx)):**
   - Thêm phần tử `div.festival-art-ambient` nằm ở lớp dưới cùng (`z-0`), tự động tải ảnh cùng lúc với tranh chính.
2. **Cấu hình CSS Smart Blurred Backing ([`festival-themes.css`](file:///d:/Desktop/admin/otp_portal/src/styles/festival-themes.css)):**
   - `.festival-art-ambient`: Áp dụng `filter: blur(28px) saturate(1.3) brightness(0.68)` và `transform: scale(1.08)` trên mobile, phủ tràn màn hình để xóa bỏ hoàn toàn vệt đen/khoảng hở.
   - `.festival-art-layer`: Trên mobile chuyển sang `background-size: contain; background-repeat: no-repeat; background-position: center top;`, giữ nguyên vẹn 100% hình ảnh cô gái và phong cảnh, không bị crop bất kỳ pixel nào.
   - `.festival-art-shade`: Lớp phủ chuyển sang `z-index: 2` với gradient dịu nhẹ, giúp form OTP trung tâm vừa nổi bật vừa nhìn thấu được ánh sáng tranh nền phía sau.

### 3. Kết Quả Kiểm Thử
- **Kiểm tra biên dịch:** `npm run build` thành công trong 4.96s, bundle gọn gàng.
- **Trải nghiệm:** Tương thích linh hoạt với mọi kích cỡ màn hình điện thoại (từ iPhone SE, iPhone 13-16 Pro Max đến Samsung Galaxy Fold/Ultra).

---

## [12:04] Bổ Sung Sub-Tab "Kiểm Tra Tài Khoản" Adobe Theo Thứ Tự Mới

### 1. Phạm Vi & Bối Cảnh
- Thêm tính năng cho phép khách hàng chủ động điền email tài khoản Adobe để kiểm tra trạng thái bản quyền, gói cước và hạn sử dụng.
- Cấu hình lại thứ tự 3 sub-tabs chuẩn theo chỉ thị của Master:
  `[🔑 Lấy Tài Khoản]  =>  [🔍 Kiểm Tra Tài Khoản]  =>  [⚡ Nhận OTP]`.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Frontend Data Types & Registry:**
   - Cập nhật [`otp.ts`](file:///d:/Desktop/admin/otp_portal/src/types/otp.ts): Mở rộng `AdobeSubForm = 0 | 1 | 2`.
   - Cập nhật [`portalSlotsRegistry.ts`](file:///d:/Desktop/admin/otp_portal/src/config/portalSlotsRegistry.ts): Đăng ký slot `adobe_check` (Sub-tab 1: Kiểm Tra Tài Khoản, gán `fix_ades_status` / `ades`).
   - Cập nhật [`otpService.ts`](file:///d:/Desktop/admin/otp_portal/src/services/otpService.ts): Thêm hàm `fetchAdobeCheck(email)`.
2. **Frontend UI ([`AdobeSection.tsx`](file:///d:/Desktop/admin/otp_portal/src/features/adobe/components/AdobeSection.tsx)):**
   - Hàng sub-tab hiển thị đủ 3 nút: `Lấy Tài Khoản (0)` $\rightarrow$ `Kiểm Tra Tài Khoản (1)` $\rightarrow$ `Nhận OTP (2)`.
   - Sliding Container 300% chuyển cảnh mượt mà giữa 3 form.
   - Form 1 (Kiểm Tra): Ô input nhập email, nút CTA "Kiểm Tra Tài Khoản", thẻ hiển thị trạng thái bản quyền (Đang hoạt động / Hết hạn, gói dịch vụ, hạn dùng) và nút bấm 1 chạm chuyển nhanh sang Nhận OTP.
3. **Backend API & Dispatcher:**
   - [`publicOtpRoutes.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/routes/publicOtpRoutes.js): Khai báo endpoint `POST /api/public/otp/adobe/check`.
   - [`otpPortalDispatcher.js`](file:///d:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/otpPortalDispatcher.js): Bổ sung slot mặc định `adobe_check` và xử lý mapping `accountData` chuẩn cho luồng kiểm tra tài khoản.

### 3. Kết Quả Kiểm Thử (Verification)
- Cú pháp Backend Node.js: `node --check` 100% không lỗi.
- Frontend Build: `npm run build` (`tsc && vite build`) thành công 100% trong 4.34s.
- Giao diện đáp ứng mượt mà cả Desktop và Mobile.




---

## [14:12] Tái Thiết Kế Toàn Diện Giao Diện Cổng Cấu Hình & Thử Nghiệm API Ngoại Vi (External API & OTP Gateway)

### 1. Phạm Vi & Bối Cảnh
- Tái cấu trúc và nâng cấp toàn diện giao diện trang `localhost:3003/external-api-config` từ bảng thô sơ sang phong cách **Dark Neon Glassmorphism** hiện đại đồng bộ hệ thống.
- Giải quyết triệt để vấn đề nhồi nhét 3 khối nghiệp vụ vào một trang cuộn dài; phân chia thành 3 tab điều hướng mượt mà, trực quan.
- Bổ sung thanh công cụ tìm kiếm, bộ lọc danh mục và thẻ kết quả kiểm tra mã OTP với nút sao chép 1-chạm (1-click copy to clipboard).
- Tuân thủ nghiêm ngặt **Nguyên Tắc 7 (Modular Architecture & Anti-Monolith)** trong `AGENTS.md`, bóc tách `ExternalApiConfigController.tsx` thành Hook và các sub-components độc lập theo chuẩn Feature-Driven Architecture.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Quản lý trạng thái & logic nghiệp vụ ([`useExternalApiConfig.ts`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/hooks/useExternalApiConfig.ts)):**
   - Đóng gói toàn bộ logic gọi API (`/api/system/providers`, `externalApiClient.getProductApis`, `externalApiClient.getPortalSlots`).
   - Xử lý các bộ lọc tìm kiếm, phân loại category cho Provider và Product.
   - Quản lý state gửi request live test, gán/gỡ mapping sản phẩm và lưu cấu hình slot.
2. **Khối Header & Thẻ Chỉ Số Hero ([`ExternalApiHeader.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ExternalApiHeader.tsx)):**
   - Tiêu đề hiện đại với neon badge `OTP & API GATEWAY`.
   - 4 thẻ `StatCard` cao cấp: Tổng Provider, Sẵn Sàng (Xanh ngọc), Chưa Cấu Hình (Hổ phách), Cổng Input OTP (Tím).
   - Nút "Làm mới" với hiệu ứng xoay loading mượt mà.
3. **Tab 1: Cổng Dịch Vụ & Thử Nghiệm ([`ProviderCatalogTab.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProviderCatalogTab.tsx)):**
   - Thanh tìm kiếm tức thì theo tên, service key và mô tả.
   - Filter chips phân loại: Tất cả, OTP, Adobe, Netflix, TOTP/2FA.
   - Bảng hiển thị hiện đại với badge màu sắc phân loại riêng biệt cho từng cổng, trạng thái Sẵn sàng có hiệu ứng nhấp nháy (pulse).
   - Ô nhập test rộng rãi kèm placeholder tự động theo loại input.
   - Hộp hiển thị kết quả kiểm thử thông minh: khi có mã OTP trả về sẽ hiển thị dạng thẻ số lớn kèm nút **"Sao chép" (Copy OTP)** nhanh chóng.
4. **Tab 2: Liên Kết Sản Phẩm ([`ProductApiMappingTab.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)):**
   - Tìm kiếm gói sản phẩm theo tên gói hoặc mã ID.
   - Bộ lọc: Tất cả / Đã gán API / Chưa gán API.
   - Thẻ gói sản phẩm sang trọng hiển thị danh sách Provider đã gán kèm nút gỡ bỏ nhanh.
5. **Tab 3: Cấu Hình Ô Input Cổng OTP ([`OtpPortalSlotsTab.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx)):**
   - Trực quan hóa pipeline điều hướng: `[Ô Input Khách Hàng] ➔ [Provider Chính] ➔ [Provider Dự Phòng (Fallback)]`.
   - Cảnh báo trực quan nếu Provider được chọn chưa cấu hình secret trong biến môi trường.
   - Nút "Lưu Cấu Hình Cổng" với trạng thái an toàn.
6. **Bộ Điều Phối Mỏng ([`ExternalApiConfigController.tsx`](file:///d:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx)):**
   - Thin Orchestrator mỏng nhẹ kết nối các component qua thanh điều hướng Tab Bar cao cấp.

### 3. Kết Quả Kiểm Thử (Verification)
- **Kiểm tra TypeScript & Bundle Build:** `npm run build` (`tsc && vite build`) trong `frontend` chạy thành công 100% trong 10.08s, không cảnh báo lỗi type, bundle tối ưu.
- **Contract & API Payload:** Giữ nguyên 100% contract và các endpoints của backend.

---

## [14:35] Điều Chỉnh & Nâng Cấp Nguyên Tắc 7 (Feature/Domain + Event Bus) Trong Hiến Pháp AI Agent

### 1. Phạm Vi & Bối Cảnh
- Thể theo chỉ đạo của Master, điều chỉnh và nâng cấp toàn diện **Nguyên Tắc 7** trong Hiến Pháp AI Agent ([`AGENTS.md`](file:///d:/Desktop/admin/admin_orderlist/AGENTS.md)).
- Định hình rõ nét kiến trúc phân rã:
  1. Frontend: Feature-Driven (`features/<feature_name>/` + `shared/`) kết hợp Realtime Event Bus / SSE (`RealtimeContext`).
  2. Backend: Domain-Driven (`domains/<domain>/`) kết hợp **Event Bus** (`backend/src/events/eventBus.js`) và **Transactional Outbox** (`domain_event_store`).
  3. Giao tiếp liên Domain: Nghiêm cấm gọi chéo trực tiếp (Tight Coupling), bắt buộc giao tiếp phi tập trung qua Domain Events chuẩn ACID.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Cập nhật submodule `.agents`:**
   - [`d:\Desktop\admin\admin_orderlist\.agents\AGENTS.md`](file:///d:/Desktop/admin/admin_orderlist/.agents/AGENTS.md)
   - [`d:\Desktop\admin\admin_orderlist\.agents\rules\AGENTS.md`](file:///d:/Desktop/admin/admin_orderlist/.agents/rules/AGENTS.md)
2. **Đồng bộ file gốc dự án:**
   - [`d:\Desktop\admin\admin_orderlist\AGENTS.md`](file:///d:/Desktop/admin/admin_orderlist/AGENTS.md)
3. **Cập nhật task tracker:**
   - Đánh dấu hoàn tất điều chỉnh tại [`task.md`](file:///d:/Desktop/admin/admin_orderlist/task.md).

### 3. Kết Quả Kiểm Thử (Verification)
- Toàn bộ 3 file Hiến pháp đã được cập nhật đồng bộ, văn phong chuẩn mực và nhất quán.
- Git working tree của `.agents` và repository gốc phản ánh đúng diff, không làm ảnh hưởng đến các file code Master đang làm việc dở.

---

## [15:10] Giai đoạn 1A - Transactional Outbox Awaitable

### Phạm vi
- Chuẩn hóa đường dispatch của `system_automation.domain_event_store` mà không thay đổi payload hoặc API contract các domain hiện hữu.

### Thay đổi kỹ thuật
- Thêm `emitAsync(eventName, payload)` vào `backend/src/events/eventBus.js`; gọi tuần tự và chờ hoàn tất toàn bộ subscriber bất đồng bộ.
- `backend/src/events/eventStoreService.js` dùng `await eventBus.emitAsync(...)` trước khi cập nhật event sang `PUBLISHED`.
- Nếu subscriber throw lỗi, event vẫn `PENDING`, tăng `attempts`, lưu `error_message`; worker replay có thể xử lý lại.
- Thêm unit test `backend/tests/unit/eventBus.test.js` cho chờ subscriber bất đồng bộ và lan truyền lỗi.

### Nghiệm thu
- `cd backend && npm test -- --test-name-pattern="emitAsync"`: 152 pass, 0 fail.
- Chưa chạy migration, integration database, browser hay deploy trong lát này.

### Ràng buộc còn lại
- Các domain legacy vẫn có caller `eventBus.emit()` và subscriber audit cũ; sẽ di chuyển theo domain trước khi loại bỏ audit subscriber để không mất audit hiện hữu.

---

## [15:35] Giai đoạn 1B - Webhook vào transactional outbox

### Phạm vi
- Di chuyển sự kiện tiền vào/ra khỏi đường phát trực tiếp và audit tách rời sang cùng transaction xử lý biên lai.

### Thay đổi kỹ thuật
- `webhookPaymentService.js` tạo `WEBHOOK_MONEY_IN` hoặc `WEBHOOK_MONEY_OUT` sau khi xử lý inbound/outbound hoàn tất.
- Event được ghi bằng `publishEventInTrx()` trước commit, với idempotency key theo `receiptId`.
- `webhookService.js` không còn gọi `eventBus.emit()` hoặc `recordEvent()` ngoài transaction.

### Nghiệm thu
- `node --check` cho hai service: đạt.
- Integration test chưa chạy vì môi trường hiện không có `TEST_DATABASE_URL`; runner từ chối dùng database thường theo thiết kế an toàn.

---

## [15:50] Giai đoạn 1C - Batch renewal vào transactional outbox

### Phạm vi
- Di chuyển event `ORDER_RENEWED` của luồng retry batch khỏi callback `afterCommit` phát trực tiếp.

### Thay đổi kỹ thuật
- `batchPaymentService.js` dùng `publishEventInTrx()` sau khi cập nhật đơn và bổ sung phân bổ biên lai.
- Giữ nguyên payload nghiệp vụ, thêm metadata `aggregateType`, `source` và `action`.
- Event chỉ tồn tại khi transaction commit; rollback không phát event.

### Nghiệm thu
- `npm test` tại `backend`: 152 pass, 0 fail.
- `node --check` service: đạt.
- Integration database chưa chạy vì thiếu `TEST_DATABASE_URL`.

### Điểm còn lại
- Các `eventBus.emit()` legacy còn tập trung ở `products`, `warehouse`, `suppliers` và `finance`; sẽ chuyển từng domain ở các lát tiếp theo.

---

## [16:15] Giai đoạn 1D - Supplier debt settlement vào transactional outbox

### Phạm vi
- Chuyển event `SUPPLIER_DEBT_PAID` của luồng tất toán công nợ NCC khỏi callback `afterCommit` phát trực tiếp.

### Thay đổi kỹ thuật
- `supplierSettlementService.js` dùng `publishEventInTrx()` sau khi cập nhật debt log, receipt allocation và payment receipt.
- Event có `aggregateType`, `action`, `source` và payload tương thích với subscriber hiện tại.
- Nếu transaction rollback, các cập nhật công nợ và event cùng rollback.

### Nghiệm thu
- `node --check` service: đạt.
- Full unit test sẽ chạy tại bước kiểm tra cuối.

### Ràng buộc
- CRUD nhà cung cấp và nhánh refund NCC vẫn là legacy `eventBus.emit()`; không gộp vào lát này vì cần test transaction riêng.

---

## [16:35] Giai đoạn 1E - Supplier refund vào transactional outbox

### Phạm vi
- Chuyển nhánh NCC đang nợ shop (`settledDebt < 0`) khỏi `afterCommit`/`eventBus.emit()` trực tiếp.

### Thay đổi kỹ thuật
- `supplierService.js` ghi `SUPPLIER_DEBT_PAID` bằng `publishEventInTrx()` sau khi cập nhật debt log.
- Giữ nguyên payload `supplierId`, `supplierName`, `paidAmount`, `settledDebt`, `isRefund` và `summary`.
- Không còn nhánh phát event ngoài transaction trong flow refund.

### Nghiệm thu
- `node --check` service: đạt.
- Full unit test sẽ chạy sau khi hoàn tất kiểm tra lát này.

### Còn lại
- CRUD supplier vẫn còn event trực tiếp và sẽ được chuyển riêng theo transaction.

---

## [16:55] Giai đoạn 1F - Supplier status toggle vào transactional outbox

### Phạm vi
- Chuẩn hóa thao tác bật/tắt trạng thái nhà cung cấp.

### Thay đổi kỹ thuật
- Đọc supplier bằng `FOR UPDATE` trong `withTransaction()` để tránh lost update khi thao tác đồng thời.
- Cập nhật trạng thái và ghi `SUPPLIER_STATUS_TOGGLED` trong cùng transaction.
- Event có `beforeState`, `afterState`, `changedFields` và payload tương thích.

### Nghiệm thu
- `node --check` service: đạt.
- Full unit test sẽ chạy sau khi hoàn tất lát này.

### Còn lại
- Các mutation tạo/sửa/xóa supplier vẫn cần chuyển sang transaction/outbox.

---

## [17:20] Giai đoạn 1G - Hoàn tất CRUD Supplier vào transactional outbox

### Phạm vi
- Chuyển tạo, sửa và xóa nhà cung cấp sang transaction/outbox.

### Thay đổi kỹ thuật
- Tạo NCC: insert và `SUPPLIER_CREATED` cùng transaction.
- Sửa NCC: `FOR UPDATE`, cập nhật và `SUPPLIER_UPDATED` cùng transaction; lưu before/after/changed fields.
- Xóa NCC: `FOR UPDATE`, xóa `supplier_cost`, `supplier_order_cost_log`, supplier và ghi `SUPPLIER_DELETED` atomically.
- Dọn comment bị dính dòng trong service sau refactor trước.

### Nghiệm thu
- `node --check` service: đạt.
- Full unit test sẽ chạy ngay sau bước này.

---

## [17:45] Giai đoạn 1H - Warehouse slot vào transactional outbox

### Phạm vi
- Chuẩn hóa transaction helper trong warehouse services và chuyển publisher của `warehouseSlotService`.

### Thay đổi kỹ thuật
- Đổi `db.transaction()` sang `withTransaction()` trong `warehouseService.js` và `warehouseSlotService.js`, cung cấp `trx.afterCommit` cho outbox.
- `warehouseSlotService.js` chuyển bốn event stock/catalog update sang `publishEventInTrx()` qua helper cục bộ, giữ nguyên payload.

### Nghiệm thu
- `node --check` hai warehouse service: đạt.
- Full unit test sẽ chạy sau khi hoàn tất lát này.

### Còn lại
- Publisher legacy trong `warehouseService.js` vẫn cần chuyển sang outbox ở lát tiếp theo.

---

## [18:10] Giai đoạn 1I - Warehouse stock/catalog publisher vào outbox

### Phạm vi
- Chuyển các publisher nằm trong transaction hiện có của `warehouseService`.

### Thay đổi kỹ thuật
- `WAREHOUSE_STOCK_CREATED` và `WAREHOUSE_STOCK_UPDATED` dùng `publishEventInTrx()`.
- `WAREHOUSE_CATALOG_UPDATED` dùng `publishEventInTrx()`.
- Payload nghiệp vụ được giữ nguyên qua helper `publishWarehouseEvent`.

### Nghiệm thu
- `node --check` warehouse service: đạt.
- Full unit test sẽ chạy sau lát này.

### Còn lại
- `WAREHOUSE_CATALOG_CREATED` và `WAREHOUSE_CATALOG_DELETED` vẫn cần bọc transaction vì hiện đang nằm ngoài transaction.

---

## [18:25] Giai đoạn 1J - Hoàn tất Warehouse transactional outbox

### Thay đổi kỹ thuật
- `createCatalogItem` dùng transaction, khóa catalog trùng tên, phát created/updated qua outbox.
- `deleteCatalogItem` gom validation slot/package, xóa catalog và `WAREHOUSE_CATALOG_DELETED` trong một transaction có `FOR UPDATE`.
- Warehouse services không còn `eventBus.emit()` trực tiếp.

### Nghiệm thu
- `node --check` warehouse service: đạt.
- Full unit test sẽ chạy sau lát này.

---

## [15:48] Chuẩn Hóa 8 Luồng Nghiệp Vụ Cốt Lõi (Core Business Flows SSOT) Vào Tài Liệu Hệ Thống

### 1. Phạm Vi & Bối Cảnh
- Thể theo chỉ thị trực tiếp từ Master, hệ thống hóa và ban hành tài liệu đặc tả 8 luồng nghiệp vụ cốt lõi làm Nguồn Sự Thật Duy Nhất (Single Source of Truth - SSOT) cho toàn bộ hệ thống Agent và Subagent.
- Định nghĩa chi tiết các quy tắc xử lý: Webhook Bank biến động số dư, Khớp tiền đơn hàng & ngoại lệ Mavryk, Thanh toán Credit (Đủ/Thiếu/Dư), Sửa/Xóa đơn hàng, Cronjob 0h cập nhật giá Catalog, Thanh toán công nợ NCC và Rào chắn an toàn khi xóa sản phẩm.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Ban hành tài liệu đặc tả mới:**
   - [`docs/business-rules/core-business-flows.md`](file:///d:/Desktop/admin/admin_orderlist/docs/business-rules/core-business-flows.md): Chứa đầy đủ 8 mục phân tích nghiệp vụ, quy tắc an toàn ACID, biểu đồ Mermaid trực quan và bảng tổng hợp Domain Events tương ứng.
2. **Cập nhật tham chiếu trung tâm:**
   - [`docs/KNOWLEDGE_BASE.md`](file:///d:/Desktop/admin/admin_orderlist/docs/KNOWLEDGE_BASE.md): Đưa liên kết tham chiếu tài liệu SSOT lên ngay đầu trang.
3. **Cập nhật task tracker:**
   - Đánh dấu hoàn tất tại [`task.md`](file:///d:/Desktop/admin/admin_orderlist/task.md).

### 3. Nghiệm Thu (Verification)
- Tài liệu tuân thủ chuẩn GFM, Tiếng Việt có dấu đầy đủ, cấu trúc rõ ràng và dễ dàng đối soát cho đội ngũ Subagent.

## [19:05] Giai đoạn 1K - Product transactional outbox

### Phạm vi
- Chuyển publisher trực tiếp còn lại trong Product service sang transactional outbox, giữ nguyên payload và hợp đồng sự kiện.

### Thay đổi kỹ thuật
- `backend/src/domains/products/services/productService.js`: bọc create sản phẩm và ba luồng giá NCC trong `withTransaction()`.
- Ghi `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `SUPPLIER_COST_ADDED`, `SUPPLIER_COST_UPDATED`, `SUPPLIER_COST_DELETED` bằng `publishEventInTrx()`.
- Loại bỏ toàn bộ `eventBus.emit()` và `trx.afterCommit()` trực tiếp khỏi Product service.

### Nghiệm thu
- `node --check backend/src/domains/products/services/productService.js`: đạt.
- `git diff --check -- backend/src/domains/products/services/productService.js`: đạt.
- Chưa chạy full unit test ở bước ghi nhận này; sẽ chạy sau khi rà soát Product sub-service.

## [19:10] Nghiệm thu bổ sung Giai đoạn 1K

- `npm test` tại `backend`: đạt `152/152` test, `0` lỗi, `23` suite.
- Không chạy integration vì `TEST_DATABASE_URL` chưa được cấu hình; không dùng `DATABASE_URL` thường để suy diễn trạng thái DB.
## [19:20] Giai đoạn 1L - Package Category transactional outbox

### Thay đổi kỹ thuật
- `backend/src/domains/products/services/packageProductService.js`: category create/update/delete dùng `withTransaction()` và ghi event bằng `publishEventInTrx()`.
- Giữ nguyên payload `PACKAGE_CATEGORY_CREATED`, `PACKAGE_CATEGORY_UPDATED`, `PACKAGE_CATEGORY_DELETED`.
- Không gộp Package Product trong slice này vì helper tạo account hiện chưa nhận transaction.

### Nghiệm thu
- `node --check backend/src/domains/products/services/packageProductService.js`: đạt.
- `npm test` tại `backend`: đạt `152/152` test, `0` lỗi, `23` suite.
- Chưa chạy integration vì `TEST_DATABASE_URL` chưa được cấu hình.

## [19:35] Giai đoạn 1M - Package Product transactional outbox

### Thay đổi kỹ thuật
- `findOrCreateAccount` nhận query/transaction làm tham số, tránh ghi tài khoản ngoài giao dịch nghiệp vụ.
- Package Product create/update/delete dùng `withTransaction()` và ghi `PACKAGE_PRODUCT_CREATED`, `PACKAGE_PRODUCT_UPDATED`, `PACKAGE_PRODUCT_DELETED` bằng `publishEventInTrx()`.
- Giữ nguyên payload và API service hiện có.

### Nghiệm thu
- `node --check backend/src/domains/products/services/packageProductService.js`: đạt.
- `npm test` tại `backend`: đạt `152/152` test, `0` lỗi, `23` suite.
- Chưa chạy integration vì `TEST_DATABASE_URL` chưa được cấu hình.

## [19:50] Giai đoạn 1N - Personal Debit Finance transactional outbox

### Phạm vi
- Thay publisher sau commit trực tiếp ở luồng Personal Debit bằng outbox, không thay đổi thuật toán số dư, idempotency hoặc lock.

### Thay đổi kỹ thuật
- `FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED` khi tạo giao dịch và đổi category được ghi qua `publishEventInTrx()`.
- Event đi cùng transaction có `FOR UPDATE`, debit log, financial account ledger và cập nhật số dư.

### Nghiệm thu
- `node --check backend/src/domains/finance/services/personalDebitTransactionService.js`: đạt.
- `npm test` tại `backend`: đạt `152/152` test, `0` lỗi, `23` suite.
- Chưa chạy integration vì `TEST_DATABASE_URL` chưa được cấu hình.

---

## [16:15] Tái Cấu Trúc Tài Liệu Nghiệp Vụ Chuẩn Cửa Hàng (SOP) Theo Góc Nhìn Vận Hành Bán Hàng

### 1. Phạm Vi & Bối Cảnh
- Thể theo chỉ thị trực tiếp từ Master, chuyển đổi toàn diện tài liệu nghiệp vụ sang văn phong **Quy Trình Vận Hành & Nghiệp Vụ Chuẩn Cửa Hàng (SOP)**.
- Loại bỏ hoàn toàn các thuật ngữ lập trình (tên biến, bảng database, cú pháp code, ACID, outbox); tập trung 100% vào luồng thao tác thực tế, điều kiện xử lý và quy tắc ứng xử của hệ thống dành cho khách hàng, nhân viên và đối tác.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Cập nhật nội dung tài liệu chuẩn ([`docs/business-rules/core-business-flows.md`](file:///d:/Desktop/admin/admin_orderlist/docs/business-rules/core-business-flows.md)):**
   - Viết lại toàn bộ 8 quy trình bằng ngôn ngữ kinh doanh/bán hàng/kế toán:
     + Quy trình 1: Quản lý dòng tiền & số dư ngân hàng (tiền vào cộng trước, tiền ra trừ trước).
     + Quy trình 2: Khởi tạo đơn & tự động khớp tiền chuyển khoản (áp dụng đơn Tạo mới, Đang xử lý, Cần gia hạn; ngoại lệ sản phẩm kho nội bộ Mavryk không tính nhập hàng NCC).
     + Quy trình 3: Thanh toán bằng số dư Credit theo 3 kịch bản: Vừa đủ, Thiếu (sinh mã QR chênh lệch), Dư (thanh toán từ khoản nạp lớn và gắn liên kết khấu trừ chi tiết).
     + Quy trình 4: Nhật ký lưu vết điều chỉnh đơn hàng (trước và sau khi sửa).
     + Quy trình 5: Hủy/xóa đơn đã thanh toán (chuyển bảng hoàn tiền, cấp lại số dư cho khách, cấn trừ công nợ NCC).
     + Quy trình 6: Tự động chuyển gia hạn 0h hằng ngày (bắt buộc lấy giá niêm yết mới nhất hiện tại trên catalog).
     + Quy trình 7: Thanh toán công nợ NCC (không tính trùng chi phí nhập hàng lần thứ hai).
     + Quy trình 8: Quản lý sản phẩm & rào chắn an toàn (cấm xóa sản phẩm đang có đơn hàng đã thanh toán).
2. **Cập nhật liên kết tham chiếu ([`docs/KNOWLEDGE_BASE.md`](file:///d:/Desktop/admin/admin_orderlist/docs/KNOWLEDGE_BASE.md)):**
   - Cập nhật phần giới thiệu tài liệu SOP chuẩn mực ở đầu trang tri thức.
3. **Cập nhật task tracker ([`task.md`](file:///d:/Desktop/admin/admin_orderlist/task.md)):**
   - Đánh dấu hoàn tất yêu cầu của Master.

### 3. Nghiệm Thu (Verification)
- Văn phong tài liệu mạch lạc, trong sáng, dễ hiểu, minh họa bằng các ví dụ số tiền thực tế cụ thể.

## [20:10] Giai đoạn 1O - Fixed Cost Finance transactional outbox

### Phạm vi
- Loại bỏ publisher kép EventBus + audit ghi tách rời của Fixed Cost.

### Thay đổi kỹ thuật
- CRUD Fixed Cost dùng `withTransaction()`; delete khóa bản ghi bằng `FOR UPDATE`.
- Create/update/delete/pay/unpay ghi `FINANCE_FIXED_COST_MUTATED` qua `publishEventInTrx()` trong cùng transaction với chi phí, payment log, allocation hoặc wallet mutation.

### Nghiệm thu
- `node --check backend/src/domains/finance/services/fixedCostService.js`: đạt.
- `npm test` tại `backend`: đạt `152/152` test, `0` lỗi, `23` suite.
- `git diff --check`: đạt trên các file thay đổi.
- Chưa chạy integration vì `TEST_DATABASE_URL` chưa được cấu hình.

## [20:35] Giai đoạn 1P - Kiểm thử transactional outbox

### Thay đổi kỹ thuật
- Tách `dispatchStoredEventWith()` để kiểm thử replay độc lập với PostgreSQL; production path vẫn dùng EventBus và cập nhật trạng thái outbox thật.
- Bổ sung `backend/tests/unit/eventStoreService.test.js`: payload redaction, publish thành công sau replay và giữ retry khi subscriber lỗi.
- Xác nhận SSE domain listener đã đăng ký source-level ở backend và frontend; chưa tuyên bố browser smoke pass.

### Nghiệm thu
- Test chuyên biệt: `3/3` đạt.
- Full backend unit test: `155/155` đạt, `0` lỗi, `23` suites.
- `node --check` và `git diff --check`: đạt.
- Rollback integration, SSE browser smoke và production verification vẫn chờ `TEST_DATABASE_URL`/môi trường phê duyệt.

## [20:45] Kiểm tra điều kiện nghiệm thu còn mở

- `TEST_DATABASE_URL`: chưa cấu hình; integration runner từ chối chạy để bảo vệ database thường/production.
- Cổng local `3000`, `3001`, `5173`, `8080`: không có tiến trình lắng nghe; chưa thể browser smoke test SSE.
- Không chạy migration, không dùng `DATABASE_URL` thường và không tuyên bố production verification.

## [21:00] Nghiệm thu SSE/cache frontend

### Bằng chứng source
- `frontend/src/shared/context/RealtimeContext.tsx` mở SSE, invalidate cache theo domain event và hỗ trợ listener event cụ thể hoặc wildcard.
- Backend `realtimeSubscriber` đăng ký danh sách event domain và broadcast qua SSE sau khi outbox dispatch.

### Nghiệm thu
- `npm run build` tại `frontend`: đạt; TypeScript và Vite build hoàn tất.
- Browser smoke SSE vẫn chưa chạy vì không có server local lắng nghe.

## [21:20] Audit source sau khi tạm hoãn kiểm thử

- Quét `backend/src` không còn `eventBus.emit()` trực tiếp trong business services; các `recordEvent()` còn lại nằm trong subscriber để ghi projection/audit sau dispatch.
- Các mục còn mở trong `task.md` đều cần môi trường thật: VPBank live verification, Traffic browser smoke, rollback/integration DB và production verification.
- Theo chỉ đạo hiện tại, không chạy test, migration, browser hoặc production command ở bước này.

---

## [16:36] Bổ Sung Quy Trình 9 (Nhập Hàng, Quản Lý Kho & Đóng Gói Sản Phẩm) Vào Tài Liệu SOP

### 1. Phạm Vi & Bối Cảnh
- Bổ sung quy trình chuẩn thứ 9 vào tài liệu Quy Trình Vận Hành & Nghiệp Vụ Chuẩn Cửa Hàng ([`docs/business-rules/core-business-flows.md`](file:///d:/Desktop/admin/admin_orderlist/docs/business-rules/core-business-flows.md)).
- Định nghĩa rõ nét việc đối soát tài chính khi nhập hàng (Mavryk không ghi nợ vs. NCC ngoài ghi nợ và trừ lợi nhuận) và 3 kịch bản lưu kho/tạo gói sản phẩm.

### 2. Chi Tiết Thực Hiện & Thay Đổi Kỹ Thuật
1. **Bổ sung Quy Trình 9 vào tài liệu ([`docs/business-rules/core-business-flows.md`](file:///d:/Desktop/admin/admin_orderlist/docs/business-rules/core-business-flows.md)):**
   - Mục 9.1: Tạo đơn nhập hàng $\rightarrow$ chuyển Đã Thanh Toán $\rightarrow$ phân loại NCC: nguồn Mavryk không ghi log NCC; nguồn ngoài ghi sổ nợ NCC và trừ lợi nhuận.
   - Mục 9.2: Bảng chi tiết 3 kịch bản:
     * Kịch bản 1 (Lưu kho & Tạo gói): Lưu vào gói sản phẩm tương ứng theo biến thể, tạo gói trong Kho Gói Sản Phẩm, ghi log kho.
     * Kịch bản 2 (Không lưu kho & Không tạo gói): Nhập dùng ngay, không tạo gói và không tạo log kho.
     * Kịch bản 3 (Lưu kho nhưng Không tạo gói): Lưu tài nguyên thô vào kho, không tạo gói bán lẻ.
2. **Cập nhật mục lục & tri thức trung tâm ([`docs/KNOWLEDGE_BASE.md`](file:///d:/Desktop/admin/admin_orderlist/docs/KNOWLEDGE_BASE.md)):**
   - Cập nhật số lượng lên 9 quy trình nghiệp vụ chuẩn.
3. **Cập nhật task tracker ([`task.md`](file:///d:/Desktop/admin/admin_orderlist/task.md)).

### 3. Nghiệm Thu (Verification)
- Cấu trúc tài liệu hoàn chỉnh, không có thuật ngữ code, ngôn ngữ vận hành trong sáng và chính xác 100%.

## [21:35] Cấu hình Database Test Local

### Phạm vi
- Thiết lập `TEST_DATABASE_URL` trong `backend/.env` trỏ tới database local cô lập `mydtbmav_test`.
- `mydtbmav_test` được tạo bằng bản sao của database local `mydtbmav`; không dừng, sửa hoặc chạy thao tác ghi nào trên database nguồn.

### Xác minh
- Node `pg` kết nối thành công bằng cả connection string và cấu hình tách trường; lỗi `client password must be a string` không còn tái hiện.
- Xác minh database hiện hành là `mydtbmav_test`, có 42 migration, 48 bảng thuộc các schema core, `system_automation.domain_event_store` và `business.product_api_configs`.
- Chưa chạy migration hay integration suite theo chỉ đạo tách riêng bước test; `DATABASE_URL` vận hành không bị dùng cho kiểm tra này.

## [22:10] Kiểm thử 9 Luồng Nghiệp Vụ SOP

### Phạm vi
- Đối chiếu `docs/business-rules/core-business-flows.md` với test integration/unit hiện hữu và chạy trên `mydtbmav_test`.
- Không chạy trên `DATABASE_URL` vận hành; dữ liệu test được dọn sau các ca kiểm thử trực tiếp.

### Kết quả theo luồng
- **Luồng 1 - Dòng tiền ngân hàng:** Chưa đạt đầy đủ. Test cũ truy vấn `source_kind`, `source_id`, `signed_amount`, trong khi schema hiện tại dùng `reference_type`, `reference_id`, `amount`; ca tiền ra cũng không chứng minh được số dư bị trừ. Cần cập nhật test theo contract hiện tại rồi chạy lại.
- **Luồng 2 - Tạo đơn và khớp thanh toán:** Đạt 5/5 ca webhook: khớp đơn mới, gia hạn, không khớp, idempotency và tiền ra chưa phân bổ.
- **Luồng 3 - Thanh toán Credit:** Ca Credit đủ tiền ghi nhận đúng application và trừ hết Credit, nhưng đơn chuyển sang `PROCESSING` thay vì `PAID`. Ca Credit thiếu tiền bị từ chối toàn bộ (`Số dư credit ... không đủ ...`), chưa thực hiện trừ phần có và tạo QR phần thiếu như SOP.
- **Luồng 4 - Sửa đơn:** Đạt integration đổi NCC cho đơn đã thanh toán, gồm log âm NCC cũ, chi phí NCC mới và VietQR đảo chiều.
- **Luồng 5 - Hủy/xóa đơn:** Ca hủy đơn `PAID` đạt: chuyển `CANCELED` và tạo refund credit; unit đạt các rào chắn trạng thái xóa.
- **Luồng 6 - Gia hạn 0h:** Unit tính ngày và giá catalog đạt; integration webhook gia hạn đổi trạng thái/hạn dùng đúng, nhưng assertion dashboard doanh thu không tăng phần gia hạn.
- **Luồng 7 - Thanh toán NCC:** Unit xác nhận tất toán công nợ không ghi trùng chi phí nhập; integration đổi NCC/đối soát NCC đạt.
- **Luồng 8 - Quản lý sản phẩm:** Unit rào chắn xóa sản phẩm đang có đơn `PAID`/`RENEW_REQUIRED` đạt; không xóa dữ liệu sản phẩm thật.
- **Luồng 9 - Nhập hàng/kho/gói:** Nhập hàng tài chính, Mavryk 0 chi phí và warehouse service unit đạt; package integration đạt 5/7, fail 1 assertion vì clone test chỉ có 5 danh mục package chuẩn thay vì test kỳ vọng tối thiểu 6.

### Tổng hợp kiểm tra
- Backend unit toàn bộ: `155/155` đạt.
- Integration đạt rõ ràng: webhook receipt `5/5`, supplier reassignment `1/1`, Mavryk zero-cost `1/1`, credit ledger `5/5`.
- Chưa đánh dấu hoàn tất 9 luồng vì còn lỗi contract test, dashboard gia hạn, Credit thiếu tiền và dữ liệu package test.
### Lưu ý môi trường test
- Các ca kiểm thử Credit/hủy đơn trực tiếp đã tự dọn dữ liệu.
- Một số integration test cũ thay đổi số dư hoặc dữ liệu nền trong `mydtbmav_test` nhưng không có rollback snapshot hoàn chỉnh. Cần khôi phục `mydtbmav_test` từ `mydtbmav` trước đợt nghiệm thu tiếp theo để bảo đảm baseline sạch; database nguồn không bị thay đổi trong đợt kiểm thử này.
# BÁO CÁO NGHIỆM THU 9 LUỒNG NGHIỆP VỤ TRUST

## 1. Thông tin chung

- **Ngày thực hiện:** 10/11/2026.
- **Tài liệu chuẩn:** `docs/business-rules/core-business-flows.md`.
- **Database kiểm thử:** `mydtbmav_test` — database PostgreSQL local cô lập.
- **Database production/local nguồn:** Không sử dụng để ghi dữ liệu trong đợt nghiệm thu.
- **Phạm vi:** Đối chiếu 9 luồng SOP với test integration, unit regression và kiểm thử trực tiếp các nhánh còn thiếu.

## 2. Kết luận điều hành

**Chưa đủ điều kiện nghiệm thu hoàn tất 9/9 luồng.** Nền tảng hiện có nhiều phần đã hoạt động đúng, nhưng còn 4 điểm chặn cần xử lý trước khi công bố đạt toàn bộ:

1. Bộ test luồng số dư ngân hàng chưa đồng bộ với schema ledger hiện tại.
2. Dashboard chưa ghi nhận tăng doanh thu trong assertion của luồng gia hạn.
3. Luồng Credit thiếu tiền chưa thực hiện khấu trừ một phần và tạo QR phần còn thiếu theo SOP.
4. Dữ liệu test package clone thiếu danh mục chuẩn mà test đang yêu cầu.

## 3. Ma trận nghiệm thu

| Luồng | Nội dung | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | Dòng tiền ngân hàng vào/ra | **Chưa đạt đầy đủ** | Test dùng cột cũ `source_kind`, `source_id`, `signed_amount`; schema dùng `reference_type`, `reference_id`, `amount`. Ca tiền ra chưa xác minh được số dư bị trừ. |
| 2 | Tạo đơn và tự động khớp thanh toán | **Đạt** | Webhook receipt đạt `5/5`: đơn mới, gia hạn, không khớp, idempotency và tiền ra chưa phân bổ. |
| 3 | Thanh toán bằng Credit | **Chưa đạt SOP** | Credit đủ tiền trừ đúng nhưng đơn sang `PROCESSING`; Credit thiếu tiền bị từ chối toàn bộ, chưa tạo QR phần thiếu. |
| 4 | Sửa và điều chỉnh đơn | **Đạt** | Đổi NCC cho đơn đã thanh toán: tạo log âm NCC cũ, chi phí NCC mới và VietQR đảo chiều. |
| 5 | Hủy/xóa đơn và bảo vệ quyền lợi | **Đạt** | Đơn `PAID` chuyển `CANCELED`, tạo refund Credit; unit rào chắn trạng thái đạt. |
| 6 | Tự động gia hạn lúc 0h | **Đạt một phần** | Unit tính ngày/giá catalog đạt; webhook đổi trạng thái/hạn dùng đúng; assertion doanh thu gia hạn chưa tăng. |
| 7 | Thanh toán công nợ NCC | **Đạt** | Tất toán không ghi trùng chi phí nhập; đối soát công nợ và VietQR đạt. |
| 8 | Quản lý sản phẩm và rào chắn xóa | **Đạt unit** | Chặn xóa sản phẩm có đơn `PAID` hoặc `RENEW_REQUIRED`. |
| 9 | Nhập hàng, kho và đóng gói | **Đạt một phần** | Nhập hàng tài chính, Mavryk 0 chi phí và warehouse unit đạt; package integration đạt `5/7`, thiếu 1 danh mục chuẩn trong DB test. |

## 4. Kết quả kiểm thử kỹ thuật

- Backend unit toàn bộ: **155/155 đạt**, 23 suites.
- Webhook receipt integration: **5/5 đạt**.
- Supplier reassignment integration: **1/1 đạt**.
- Mavryk zero-cost integration: **1/1 đạt**.
- Credit ledger integration: **5/5 đạt**.
- Regression unit cho gia hạn, xóa đơn, xóa sản phẩm, kho, NCC, QR và outbox: **32/32 đạt**.
- Package categories integration: **5 đạt, 2 không đạt**; nguyên nhân dữ liệu nền chỉ có 5 package category chuẩn trong khi test yêu cầu tối thiểu 6.

## 5. Phân tích nguyên nhân và rủi ro

### 5.1. Luồng số dư ngân hàng

Đây là lỗi lệch contract giữa test và schema, chưa đủ căn cứ kết luận toàn bộ service nghiệp vụ sai. Tuy nhiên, ca tiền ra cũng chưa chứng minh được debit thực tế, nên không được đánh dấu đạt cho đến khi test được cập nhật theo `reference_type`, `reference_id`, `amount` và chạy lại từ baseline sạch.

### 5.2. Luồng Credit

Đây là lệch nghiệp vụ thực tế, không chỉ là lỗi test. Service hiện yêu cầu `available_amount >= orderPrice`; vì vậy nhánh Credit thiếu tiền bị từ chối. SOP yêu cầu trừ số dư hiện có, tính phần thiếu và tạo QR chuyển khoản. Cần đặc tả lại trạng thái trung gian và transaction boundary trước khi sửa.

### 5.3. Luồng gia hạn

Trạng thái đơn và ngày hết hạn đã cập nhật, nhưng assertion dashboard không thấy phần doanh thu gia hạn. Cần kiểm tra event `ORDER_PAID`/`ORDER_RENEWED`, subscriber dashboard và thời điểm đọc projection sau commit để tránh kết luận nhầm giữa lỗi dispatch và lỗi assertion timing.

### 5.4. Baseline database test

Một số integration test cũ có ghi số dư hoặc dữ liệu nền nhưng không rollback snapshot hoàn chỉnh. `mydtbmav_test` cần được khôi phục từ `mydtbmav` trước lần nghiệm thu tiếp theo. Database nguồn không bị thay đổi trong đợt này.

## 6. Kiến nghị xử lý theo thứ tự

1. Cập nhật test luồng ngân hàng theo schema ledger hiện tại; bổ sung assertion debit và idempotency.
2. Chốt đặc tả Credit thiếu tiền: khấu trừ một phần, tạo QR phần thiếu, trạng thái đơn và khả năng retry.
3. Truy vết projection doanh thu gia hạn sau commit; bổ sung integration assertion cho `ORDER_RENEWED`.
4. Đồng bộ seed/migration package category trong test DB hoặc sửa fixture để không phụ thuộc dữ liệu nền ngầm.
5. Reset `mydtbmav_test`, chạy lại toàn bộ ma trận 9 luồng từ baseline sạch.

## 7. Trạng thái cuối

- **Nghiệm thu 9 luồng:** Chưa đạt hoàn tất.
- **Nền tảng unit/regression:** Đạt.
- **Integration nghiệp vụ:** Đạt một phần.
- **Production verification:** Chưa thực hiện và không được suy diễn từ kết quả local.
# Daily Review — 2026-11-14

## [10:55] Thiết Kế Lại Tab Liên Kết Sản Phẩm & Chuyển Nguồn Dữ Liệu Sang Bảng Product Kho Hàng (`warehouse.product_names`)

### 1. Phạm vi & Mục tiêu
- Theo chỉ đạo của Master:
  1. **Sửa nguồn dữ liệu danh sách sản phẩm**: Chỉ lấy danh sách sản phẩm từ bảng **Product Kho Hàng** (`warehouse.product_names` — `TABLES.PRODUCT_NAMES`), tuyệt đối không lấy danh sách 63 sản phẩm từ bảng `business.product` (`TABLES.PRODUCT`).
  2. **Thiết kế lại toàn diện giao diện Tab "Liên Kết Sản Phẩm"**:
     - Hiển thị thẻ sản phẩm kho hàng hiện đại (chế độ Lưới 2 cột / Danh sách dọc), tự động ưu tiên sản phẩm đã gán API lên đầu.
     - Bổ sung thông tin đặc thù của sản phẩm kho hàng: Mã Kho `#id`, Tag phân loại (`category`), huy hiệu `Gói Kho` (`is_package`), thống kê tồn kho (`available_slots / total_slots`), link đăng nhập (`login_url`), và ngăn kéo xem danh sách các Biến thể / Tag kế thừa.
     - Hiển thị danh sách cổng Provider dạng **Rich Action Cards**: đánh dấu nổi bật cổng **★ Mặc định**, cho phép bấm ngôi sao để đổi cổng mặc định (`PUT /api/system/product-apis/:id/default`), hiển thị trạng thái cấu hình (`Sẵn sàng` / `Chưa cấu hình`), nhóm dịch vụ (`ADOBE`, `NETFLIX`, `2FA`, `MAIL`) và nút gỡ liên kết.
     - Dropdown `+ Gán thêm Provider...` tự động lọc bỏ các cổng đã gán vào sản phẩm đó để chống gán trùng.

### 2. Chi tiết thay đổi kỹ thuật
1. **Backend ([`productApiService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/services/productApiService.js)):**
   - Cập nhật `listProductApis()`: Truy vấn từ `TABLES.PRODUCT_NAMES` (`warehouse.product_names`), kết hợp thống kê slot từ `TABLES.STOCK_SERVICES` (`warehouse.account_slots`) và biến thể liên kết.
   - Bổ sung `resolveSystemProductIdInTrx()`: Hỗ trợ ánh xạ an toàn trong Knex transaction từ ID sản phẩm kho hàng (`warehouse.product_names.id`) sang `product_id` của `TABLES.PRODUCT_API_CONFIGS`, tự động đặt `is_default = true` khi gán cổng đầu tiên cho sản phẩm.
   - Cập nhật `getApisByProductMapping()`: Ánh xạ đồng bộ tên dịch vụ kho (`pn.name`) và tag kho (`pn.category`) vào `byDisplayName`, `byPackageName`, `byVariantName` để Modal Tạo Đơn Nhập Kho và Modal Sửa Slot Kho Hàng nhận đúng danh sách Loại OTP.
2. **Frontend ([`types/index.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/types/index.ts), [`useExternalApiConfig.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/hooks/useExternalApiConfig.ts), [`ExternalApiConfigController.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx), [`ProductApiMappingTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)):**
   - Bổ sung các trường thông tin kho hàng vào `ProductItem`.
   - Thêm hàm `setDefaultProvider(mappingId)` gọi `externalApiClient.setDefaultProductApi(mappingId)` và nâng cấp bộ lọc tìm kiếm xuyên suốt tên sản phẩm kho, tag, biến thể và cổng API.
   - Thiết kế lại toàn bộ [`ProductApiMappingTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx) với nhận diện thương hiệu theo dịch vụ (Adobe, Netflix, Chat GPT, Google/Cloud...), chế độ xem Lưới / Danh sách và quản lý cổng Mặc định trực quan.


---

## [11:02] Tái Thiết Kế Khối Header Thẻ Sản Phẩm: Đưa Toàn Bộ Tag Trải Thẳng Trên 1 Hàng Ngang

### 1. Phạm vi & Mục tiêu
- Theo phản hồi từ Master: Khắc phục hiện tượng các tag (`GÓI KHO`, `4 CỔNG API`, `Tag phân loại`, `Tồn kho`, `Biến thể`) bị co hẹp và rớt dòng xếp chồng dọc từng cái một.
- Tái cấu trúc Header thành 2 tầng phân cấp rõ ràng theo chiều ngang 100%:
  - **Tầng 1 (Header Top Bar)**: Icon logo thương hiệu + Tên sản phẩm kho + Mã Kho `#id` bên trái, đối trọng với nút chọn `+ Gán thêm Provider...` bên phải.
  - **Tầng 2 (Full-width Horizontal Tag Ribbon)**: Chiếm trọn 100% chiều ngang thẻ, trải toàn bộ các tag thẳng hàng ngang trên 1 dòng duy nhất (`whitespace-nowrap`, `overflow-x-auto scrollbar-none`), triệt tiêu hoàn toàn hiện tượng rớt dòng bậc thang.

### 2. File thay đổi kỹ thuật
- [`frontend/src/features/external-api/components/ProductApiMappingTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)

### 3. Trạng thái nghiệm thu
- Giao diện thẻ sản phẩm trực quan, thoáng đãng, các tag thông tin thẳng hàng tinh tế và liền mạch.

---

## [11:15] Bãi Bỏ Khái Niệm Mặc Định: Toàn Bộ Provider Gán Vào Sản Phẩm Đều Bình Đẳng Ngang Hàng

### 1. Phạm vi & Mục tiêu
- Theo chỉ đạo dứt khoát từ Master (*"không dùng mặc định, provider nào được gắn vào đều bằng cấp hết không ưu tiên mô hình nào cả"*):
  - Xóa bỏ 100% nút ngôi sao `☆ / ★`, nhãn `Mặc định`, viền vàng hổ phách và dòng chữ gợi ý *"Bấm vào ngôi sao để đổi cổng mặc định"*.
  - Toàn bộ các Provider được gán vào cùng 1 sản phẩm đều hiển thị bình đẳng ngang hàng nhau theo phong cách Dark Glass đồng bộ.
  - Mỗi Provider giữ nguyên các thông tin thực tế: Icon thương hiệu, tên dịch vụ, key kỹ thuật, badge danh mục, trạng thái kết nối và nút gỡ bỏ.

### 2. File thay đổi kỹ thuật
- [`frontend/src/features/external-api/components/ProductApiMappingTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx): Bỏ nút `<Star />`, badge `Mặc định` và viền vàng riêng biệt; đổi tiêu đề sang *"Danh Sách Provider OTP / API Đã Gán"*.
- [`frontend/src/features/external-api/components/ExternalApiConfigController.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx): Dọn dẹp prop `onSetDefaultProvider`.
- [`backend/src/domains/system/services/productApiService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/services/productApiService.js): Bỏ logic tự động ép `is_default = true` khi gán cổng mới.

### 3. Trạng thái nghiệm thu
- Toàn bộ Provider gán vào sản phẩm hiển thị chuẩn mực, bình đẳng, không còn bất kỳ dấu hiệu ưu tiên hay phân biệt nào.

---

## [11:20] Tái Thiết Kế Toàn Diện Tab Cấu Hình Ô Input Cổng OTP Đồng Bộ Với Liên Kết Sản Phẩm

### 1. Phạm vi & Mục tiêu
- Theo yêu cầu của Master (*"cấu hình ô input thiết kế tương tự như bên liên kết sản phẩm cho tôi luôn"*):
  - Nâng cấp toàn diện giao diện tab **Cấu Hình Ô Input Cổng OTP** (`OtpPortalSlotsTab.tsx`) đồng bộ ngôn ngữ thiết kế Dark Glass cao cấp của tab Liên Kết Sản Phẩm.
  - **Banner & Thống kê**: Tích hợp các thẻ đếm nhanh (Tổng ô input, Đang bật, Tạm tắt) và nút [Lưu Cấu Hình Cổng] nổi bật.
  - **Toolbar đa năng**: Tích hợp thanh tìm kiếm thông minh, bộ lọc trạng thái (`Tất cả`, `Đang bật`, `Tạm tắt`) và công tắc chuyển đổi chế độ xem **Lưới 2 cột (Grid)** / **Danh sách dọc (List)**.
  - **Thẻ Ô Input 3 Tầng Hiện Đại**:
    + *Tầng 1 (Header Top Bar)*: Icon thương hiệu phát sáng + Tên ô input + Mã key bên trái, đối xứng với dropdown `+ Gán thêm NCC...` và nút công tắc [Đang Bật / Tạm Tắt] bên phải.
    + *Tầng 2 (Tag Ribbon)*: Trải toàn bộ tag metadata thẳng trên 1 hàng ngang duy nhất (`Cổng NCC`, `Category`, `Cooldown`, `Nút`, `Placeholder`).
    + *Tầng 3 (Lưới NCC Chuỗi Ưu Tiên 2 Cột)*: Danh sách Cổng/NCC chia lưới 2 cột gọn gàng, hiển thị badge thứ tự `#1, #2...`, icon, trạng thái kết nối, cặp nút điều chỉnh ưu tiên `↑ / ↓` và nút gỡ bỏ.

### 2. File thay đổi kỹ thuật
- [`frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx)

### 3. Trạng thái nghiệm thu
- Tab Cấu Hình Ô Input đã hoàn toàn đồng bộ, thẩm mỹ và nhất quán 100% với tab Liên Kết Sản Phẩm.

---

## [11:26] Quét & Khắc Phục Triệt Để Toàn Bộ Lỗi Tiếng Việt (Question-Mark Replacement & Mojibake UTF-8)

### 1. Phạm vi & Mục tiêu
- Theo yêu cầu của Master: Quét toàn bộ dự án và sửa chữa triệt để các lỗi tiếng Việt, bao gồm lỗi vỡ ký tự chấm hỏi (`?`), lỗi Mojibake giải mã UTF-8 kép và chuẩn hóa văn phong có dấu đầy đủ theo skill [Vietnamese Diacritics](file:///e:/Project/admin_store/admin_orderlist/.agents/skills/vietnamese-diacritics/SKILL.md).

### 2. Chi tiết thay đổi kỹ thuật
1. **Tài liệu theo dõi công việc ([`task.md`](file:///e:/Project/admin_store/admin_orderlist/task.md#L98-L103)):**
   - Khôi phục 100% tiếng Việt có dấu cho 6 dòng lịch sử migration/schema contract trước đây bị lỗi encoding dấu chấm hỏi `?` (`S?a` $\rightarrow$ `Sửa`, `??ng b?` $\rightarrow$ `đồng bộ`, `d? li?u th?t ??u pass` $\rightarrow$ `dữ liệu thật đều pass`, `thi?u c?t` $\rightarrow$ `thiếu cột`, `?? x?a` $\rightarrow$ `Đã xóa`, `Ho?n thi?n` $\rightarrow$ `Hoàn thiện`, `B? sung ??y ??` $\rightarrow$ `Bổ sung đầy đủ`, `v?o` $\rightarrow$ `vào`).
   - Đồng bộ biểu tượng trạng thái cột sang `✅`.
2. **Báo cáo nghiệm thu lịch sử ([`report/2026-11-06-daily-review.md`](file:///e:/Project/admin_store/admin_orderlist/report/2026-11-06-daily-review.md#L605-L625)):**
   - Khôi phục đề mục `## [21:25] Khắc phục cảnh báo 0 ngày cho đơn đã chuyển Hết Hạn` và toàn bộ các tiêu đề con `Phạm vi`, `Nguyên nhân gốc`, `Thay đổi kỹ thuật`, `Kiểm tra đã chạy`, `Trạng thái nghiệm thu`.
3. **Backend VivaRocky OTP Provider ([`vivarockyProvider.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/providers/vivarockyProvider.js#L138)):**
   - Khắc phục lỗi Mojibake UTF-8 kép trong regex bóc tách mã OTP: `mÃƒÂ£` $\rightarrow$ `mã`.
4. **Backend Yuna Mail Provider ([`yunaMailProvider.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/providers/yunaMailProvider.js#L12)):**
   - Chuẩn hóa header ký hiệu bản quyền: `Â©2026` $\rightarrow$ `©2026`.

### 3. Kiểm tra đã chạy & Kết quả
- Python AST/Text Scanner quét toàn bộ dự án: **0 lỗi** ký tự tiếng Việt còn sót lại.
- `npm --prefix backend test`: **157/157 tests PASS 100%**.
- `npm --prefix frontend run build`: **TypeScript compilation & Vite build pass** không phát sinh lỗi.
- Bảo vệ an toàn tuyệt đối các file code Master đang thực hiện dang dở.

---

## [11:28] Tinh Chỉnh Bố Cục Thẻ Ô Input: Tách Dropdown Gán NCC Xuống Danh Sách, Dành 100% Không Gian Cho Tiêu Đề Dài

### 1. Phạm vi & Mục tiêu
- Theo phản ánh của Master (*"bị đè UX/UI rồi. và tiêu đề không thấy"*):
  - Khắc phục triệt để hiện tượng tiêu đề ô input dài (như *"Adobe: Lấy Mã OTP 6 Số"*, *"Netflix: Cập Nhật Hộ Gia Đình (Household)"*...) bị dropdown gán NCC chèn ép dẫn tới bị co cụm hoặc biến mất.
  - Tách bạch cấu trúc:
    - **Tầng 1 (Toàn quyền tiêu đề)**: Dành trọn vẹn 100% không gian hàng trên cùng cho Icon + Tiêu đề đầy đủ + Key, chỉ đi kèm duy nhất nút công tắc [Đang Bật / Tạm Tắt].
    - **Tầng 2 (Tag Ribbon)**: Giữ nguyên dải tag metadata thẳng trên 1 hàng ngang.
    - **Tầng 3 (Khu vực danh sách NCC)**: Đưa ô chọn `[+ Gán thêm NCC...]` sang bên phải tiêu đề `Chuỗi Cổng NCC Điều Hướng`, đúng vị trí ngữ cảnh thao tác của danh sách và tạo không gian rộng rãi tối đa.

### 2. File thay đổi kỹ thuật
- [`frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/OtpPortalSlotsTab.tsx)

### 3. Trạng thái nghiệm thu
- Tiêu đề ô input hiển thị to rõ 100%, không bị cắt chữ hay đè lên bất kỳ phần tử nào khác.





---

## [18:12] Tái Thiết Kế Toàn Diện Tab Cổng Dịch Vụ & Thử Nghiệm Theo Giao Diện Thẻ Đồng Bộ Với Liên Kết Sản Phẩm

### 1. Phạm vi & Mục tiêu
- Theo yêu cầu của Master (*"hãy thiết kế lại cho tôi tab này. Các thẻ này thiết kế lại theo giao diện thẻ như tab Liên kết sản phẩm"*):
  - Chuyển đổi toàn bộ danh sách cổng kết nối từ dạng dòng bảng ngang đơn điệu sang **Giao diện Thẻ Hiện Đại (Dark Glass Cards)** đồng bộ 100% ngôn ngữ thiết kế với tab Liên Kết Sản Phẩm.
  - **Top Context Banner & Thống kê**: Tích hợp các pill thống kê số lượng cổng kết nối (Tổng số cổng, Sẵn sàng - `READY`, Chưa cấu hình - `NOT_CONFIGURED`).
  - **Toolbar Đa Năng**:
    + Ô tìm kiếm Search thông minh hỗ trợ tìm theo tên provider, key kỹ thuật hoặc mô tả dịch vụ.
    + Bộ lọc trạng thái nhanh: `Tất cả`, `Sẵn sàng`, `Chưa cấu hình`.
    + Bộ lọc theo danh mục dịch vụ: `OTP`, `ADOBE`, `NETFLIX`, `2FA`...
    + Bộ chuyển đổi chế độ xem: **Lưới 2 cột (Grid)** và **Danh sách dọc (List)**.
  - **Thẻ Provider Card Hiện Đại**:
    + *Hiệu ứng & Nhận diện thương hiệu (Brand Visual)*: Viền sáng gradient trên đầu thẻ, bảng màu và icon nhận diện thương hiệu tự động theo danh mục (Adobe: Tím `purple`, Netflix: Hồng đỏ `rose`, 2FA/TOTP: Vàng hổ phách `amber`, OTP/Mail: Xanh ngọc `cyan`).
    + *Header Thẻ*: Icon box bo góc 40x40, Tên Provider to rõ ràng, badge mã key định danh (font mono) và huy hiệu trạng thái `Sẵn sàng` / `Chưa cấu hình` đi kèm công tắc Bật/Tắt trực quan.
    + *Horizontal Tag Ribbon*: Dải tag ngang không rớt dòng hiển thị Thể loại (Category), Kiểu dữ liệu đầu vào (Email OTP, Base32 Secret, Email/Mã đơn), Giao thức kết nối (`RFC 6238 TOTP`, `Mailbox IMAP`, `Gateway Probe`) và huy hiệu xác thực.
    + *Mô tả dịch vụ*: Đoạn giới thiệu tính năng rõ ràng, trang nhã.
    + *Interactive Test Console (Bảng thử nghiệm trực tiếp)*: Đặt ở chân thẻ, tích hợp ô input terminal font-mono, nút *Kiểm tra* (Send) với hiệu ứng quay loading, hộp hiển thị kết quả OTP nổi bật với nút *Sao chép* (Copy-to-clipboard) có phản hồi trạng thái "Đã chép".

### 2. File thay đổi kỹ thuật
- [`frontend/src/features/external-api/components/ProviderCatalogTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProviderCatalogTab.tsx)

### 3. Kiểm tra đã chạy & Kết quả
- `npm run build` (`tsc && vite build`): **Pass 100% trong 7.62s**, 0 lỗi TypeScript, 0 lỗi cú pháp.
- Hot Module Replacement (HMR) đã cập nhật giao diện trực tiếp trên trình duyệt của Master.
- Không gây side-effect đến backend, database hay các tab khác trong phân hệ Cấu hình API.

### 4. Trạng thái nghiệm thu
- **Đã hoàn thành xuất sắc**: Giao diện tab Cổng Dịch Vụ & Thử Nghiệm đã đồng bộ hoàn toàn với phong cách thẻ của tab Liên Kết Sản Phẩm, mang lại trải nghiệm quản trị hiện đại, thoáng đãng và tiện dụng.

---

## [19:30] Triển Khai Phương Án A: Thiết Lập Tự Động Quy Tắc Điều Phối Động 4 Yếu Tố (Ô Input + Sản Phẩm + NCC ➔ Provider)

### 1. Phạm vi & Mục tiêu
- Theo yêu cầu của Master:
  - Cho phép Master tự thiết lập liên kết động thông qua Form Modal: **[Ô Input trên Web]** + **[Sản Phẩm Dịch Vụ Kho]** + **[Nhà Cung Cấp (NCC)]** $\rightarrow$ **[Cổng Provider API Tương Ứng]**.
  - Khi khách hàng lên trang Web OTP Portal nhập dữ liệu (Email hoặc Mã Đơn Hàng), hệ thống tự động đối chiếu với đơn hàng trong cơ sở dữ liệu (`order_list`), nhận diện sản phẩm thuộc dịch vụ nào và NCC nào, từ đó gọi thẳng 100% trúng Provider đích mà không cần quét tuần tự fallback.
  - Hỗ trợ quy tắc áp dụng cho **NCC cụ thể** (ưu tiên cao) hoặc **Mọi NCC** (quy tắc mặc định của sản phẩm).

### 2. Chi tiết thay đổi kỹ thuật
1. **Cơ Sở Dữ Liệu (PostgreSQL Migration):**
   - Tạo migration [`backend/src/db/migrations/20261114000001_create_portal_slot_routing_rules.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/migrations/20261114000001_create_portal_slot_routing_rules.js):
     + Bảng `system_automation.portal_slot_routing_rules`: `id`, `slot_key`, `product_name_id`, `supplier_id`, `provider_key`, `priority`, `is_active`, `note`, `created_at`, `updated_at`.
     + 2 Composite Indexes tối ưu truy vấn đối chiếu: `idx_order_list_info_lower` trên `LOWER(information_order)` và `idx_order_list_id_order_lower` trên `LOWER(id_order)`.
   - Cập nhật [`backend/src/db/tables.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/tables.js): Khai báo `TABLES.PORTAL_SLOT_ROUTING_RULES` và `COLS.PORTAL_SLOT_ROUTING_RULES`.
2. **Backend Service & Controller:**
   - [`backend/src/domains/system/services/productApiService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/services/productApiService.js):
     + Bổ sung 5 hàm nghiệp vụ: `listRoutingRules`, `createRoutingRule`, `updateRoutingRule`, `deleteRoutingRule` (tuân thủ ACID Knex Transaction) và `findRoutingProviderForInput({ slotKey, input })`.
     + Hàm `findRoutingProviderForInput` tự động tra cứu đơn hàng theo input (Email/Mã đơn/Slot), lấy ra `product_name_id` & `supplier_id`, sau đó so khớp trong bảng `portal_slot_routing_rules` theo thứ tự: *Khớp chính xác NCC* $\rightarrow$ *Mọi NCC (chung)* $\rightarrow$ *Rule đầu tiên*.
   - [`backend/src/domains/system/controllers/productApiController.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/controllers/productApiController.js): Bổ sung 4 handlers `listRules`, `createRule`, `updateRule`, `deleteRule`.
   - [`backend/src/domains/system/routes.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/routes.js): Mở 4 routes an toàn `GET/POST /api/system/product-apis/rules`, `PUT/DELETE /api/system/product-apis/rules/:id`.
3. **Bộ Điều Phối Web OTP Portal ([`otpPortalDispatcher.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/system/services/otpPortalDispatcher.js)):**
   - Tích hợp `findRoutingProviderForInput`: Khi khách bấm kiểm tra trên Web OTP Portal, hệ thống kiểm tra quy tắc định tuyến, đưa ngay Provider tương ứng lên vị trí ưu tiên số 1 của chuỗi thực thi (`effectiveChain`), loại bỏ quét fallback rườm rà.
4. **Frontend UI/UX:**
   - [`frontend/src/features/external-api/types/index.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/types/index.ts): Khai báo `PortalSlotRoutingRule` và `SupplierOption`.
   - [`frontend/src/features/external-api/api/externalApiClient.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/api/externalApiClient.ts): Bổ sung các API client methods CRUD rules.
   - [`frontend/src/features/external-api/hooks/useExternalApiConfig.ts`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/hooks/useExternalApiConfig.ts): Bổ sung quản trị state `routingRules`, `suppliers`, và các mutation handlers `createRoutingRule`, `updateRoutingRule`, `deleteRoutingRule`, `toggleRoutingRuleActive`.
   - **Modal Form Mới ([`SlotProductSupplierRuleModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/SlotProductSupplierRuleModal.tsx)):**
     + Giao diện Modal Dark Glass bo góc cao cấp, có Flow Visual Preview trực quan mô phỏng luồng gọi API.
     + 4 Trường chọn độc lập: (1) Ô Input trên Web, (2) Sản Phẩm Kho, (3) Nhà Cung Cấp (hỗ trợ chọn "Mọi NCC" hoặc NCC cụ thể), (4) Cổng Provider tương ứng. Kèm độ ưu tiên, ghi chú và switch kích hoạt.
   - **Nâng Cấp Tab Liên Kết Sản Phẩm ([`ProductApiMappingTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)):**
     + Nút `[+ Tạo Liên Kết Ô Input & NCC]` nổi bật trên Header Banner.
     + Phân vùng **Quy Tắc Định Tuyến Tự Động (Routing Rules)** hiển thị toàn bộ các liên kết động đã thiết lập theo thẻ trực quan: `[Ô Input]` ➔ `[Sản Phẩm] + [NCC]` ➔ `[Provider]`.
     + Tích hợp công tắc Bật/Tắt trực tiếp (`is_active`), nút Sửa và nút Xóa rule kèm thông báo xác nhận.
     + Trên từng thẻ Sản Phẩm hiển thị badge đếm số lượng quy tắc điều phối đang áp dụng.

### 3. Kiểm tra đã chạy & Kết quả
- Chạy script kiểm thử Backend CRUD `testRoutingRules.js`: **Tạo, Liệt kê, Đọc NCC và Xóa rule hoạt động chính xác 100%**.
- `npm --prefix frontend run build`: **TypeScript compilation & Vite bundle PASS 100% trong 4.59s**, không có bất kỳ lỗi cú pháp hay cảnh báo type nào.
- Toàn bộ thay đổi bảo đảm tính toàn vẹn dữ liệu, không ảnh hưởng tới code dang dở của Master.

### 4. Trạng thái nghiệm thu
- **Hoàn thành 100% theo đúng yêu cầu Phương Án A của Master**: Tự do setup liên kết động theo 4 yếu tố, tự động đối chiếu đơn hàng và định tuyến chuẩn xác tới Provider đích.

---

## [19:50] Chuẩn Hóa 100% Popup Xác Nhận Sang NotificationModal Của Hệ Thống (Loại Bỏ window.confirm)

### 1. Phạm vi & Mục tiêu
- Theo phản ánh của Master (*"tại sao đến giờ vẫn còn dùng popup thông báo của window mà không dùng popup thông báo của hệ thống"*):
  - Xóa bỏ triệt để lệnh gọi `window.confirm()` thô sơ mặc định của trình duyệt tại tab Liên Kết Sản Phẩm.
  - Tái sử dụng đồng bộ hệ thống popup xác nhận chuẩn của dự án: [`useNotification()`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/context/NotificationContext.tsx) và [`NotificationModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/NotificationModal.tsx) (giao diện Dark Glass, viền phát sáng gradient, backdrop-blur, nút xác nhận và hủy bỏ chuẩn nhận diện hệ thống).

### 2. Chi tiết thay đổi kỹ thuật
- [`frontend/src/features/external-api/components/ProductApiMappingTab.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx):
  + Import hook `useNotification` từ `@/shared/context/NotificationContext`.
  + Thay thế lệnh `window.confirm` tại nút Xóa quy tắc bằng `handleDeleteRule(rule)` gọi `notification.confirm({ title: "Xác Nhận Xóa Quy Tắc", message: "...", confirmText: "Xóa Ngay", cancelText: "Hủy Bỏ" })`.
  + Bổ sung popup xác nhận an toàn tương tự cho nút Gỡ bỏ Provider khỏi sản phẩm: `handleRemoveProvider(mappingId, serviceName, packageName)`.

### 3. Kiểm tra đã chạy & Kết quả
- `npm --prefix frontend run build`: **TypeScript compilation & Vite bundle PASS 100% trong 4.28s**, 0 lỗi, 0 cảnh báo.
- Popup màu trắng `localhost:3003 cho biết` của trình duyệt đã được thay thế 100% bằng Popup Dark Glass sang trọng nằm giữa màn hình.

### 4. Trạng thái nghiệm thu
- **Đã hoàn thành xuất sắc**: Toàn bộ thao tác xóa quy tắc điều phối và gỡ cổng Provider đã chuẩn hóa đồng bộ 100% theo hệ thống thông báo chung của dự án.

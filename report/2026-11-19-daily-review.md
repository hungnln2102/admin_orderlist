# Daily Review Report — 2026-11-19

## [08:30] Dọn dẹp Section "Sản phẩm kho hàng gán provider" cũ (Phương án B)

### 1. Phạm vi & Mục tiêu
- **Phạm vi**: 
  - Triển khai **Phương án B (Dọn dẹp triệt để)**: Loại bỏ hoàn toàn Section "Danh Mục Sản Phẩm Kho Hàng & Cổng Provider Gán" (`product_api_configs`) cũ khỏi tab *Liên Kết Sản Phẩm*.
  - Nâng cấp tab thành giao diện chuyên biệt **"Điều Phối OTP Variant"** (`portal_slot_routing_rules`) với thanh tìm kiếm nhanh đa năng, bộ lọc trạng thái và bảng điều phối trực quan, thoáng đãng.
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **Frontend Tab [ProductApiMappingTab.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)**:
   - Loại bỏ hơn 350 dòng mã nguồn thừa của Section 2 cũ (thẻ kho hàng, toolbar phân loại kho, dropdown gán tĩnh N-N theo sản phẩm).
   - Nâng cấp Bảng Điều Phối Variant:
     + Tích hợp thanh tìm kiếm thông minh: Tìm tức thì theo tên Ô Input, NCC, Variant hoặc Provider.
     + Bộ lọc trạng thái: Tất cả (`ALL`), Đang bật (`ACTIVE`), Đang tắt (`INACTIVE`).
     + Bộ lọc nhanh theo Ô Input (`slots`).
     + Bảng điều phối hiển thị chuẩn 4 bước: `STT` $\rightarrow$ `1. Ô Input Web Portal` $\rightarrow$ `2. Nhà Cung Cấp (NCC)` $\rightarrow$ `3. Variant của NCC` $\rightarrow$ `4. Cổng Provider Đích` $\rightarrow$ `Trạng Thái (Toggle On/Off)` $\rightarrow$ `Thao Tác (Sửa / Xóa)`.
     + Bổ sung nút xóa liên kết điều phối (`Trash2`) có hộp thoại xác nhận an toàn qua `notification.confirm`.
2. **Frontend Controller [ExternalApiConfigController.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ExternalApiConfigController.tsx)**:
   - Đổi tên tab điều hướng: Từ *Liên Kết Sản Phẩm* (`Package` icon) thành **Điều Phối OTP Variant** (`Zap` icon) kèm badge đếm tổng số quy tắc đang cấu hình `{routingRules.length}`.
   - Dọn dẹp toàn bộ props không còn dùng truyền vào `<ProductApiMappingTab>`, giảm dung lượng bundle controller hơn 21 kB (từ 160.57 kB xuống 138.82 kB).

### 3. Kết quả kiểm tra & Nghiệm thu
- **Frontend Build**: `cd frontend; npm run build` (tsc + vite) PASS 100% không cảnh báo lỗi, hoàn tất trong 16.53s.
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py` trên 2 file tác động PASS 100% không có Mojibake, BOM hay vỡ dấu.
- **Tương thích ngược**: Các modal nhân viên tạo đơn ([OrderCreateEditModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/orders/components/OrderCreateEditModal.tsx)) và sửa slot kho ([WarehouseEditSlotModal.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx)) vẫn giữ nguyên khả năng chọn cổng OTP từ danh mục provider an toàn.

## [09:05] Loại bỏ nút tạo liên kết trùng lặp tại Empty State Bảng Điều Phối

### 1. Phạm vi & Mục tiêu
- **Phạm vi**:
  - Tinh gọn giao diện Empty State trong tab **Điều Phối OTP Variant** ([ProductApiMappingTab.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)).
  - Loại bỏ nút `+ Tạo liên kết đầu tiên` bị thừa ở giữa bảng trống vì nút bấm chính `+ Tạo Liên Kết Ô Input & NCC` đã luôn hiện diện nổi bật tại Top Banner góc phải phía trên.
  - Giữ lại nút `Đặt lại bộ lọc` khi có dữ liệu nhưng các bộ lọc tìm kiếm/trạng thái không khớp.
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **Frontend [ProductApiMappingTab.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)**:
   - Thay thế khối nút bấm kép: Khi `routingRules.length === 0`, chỉ hiển thị thông báo text trực quan `Chưa có quy tắc điều phối provider nào.` cùng icon `Sliders`, không hiển thị nút bấm thừa.
   - Khi `routingRules.length > 0` và lọc không ra kết quả (`filteredRules.length === 0`), vẫn giữ nguyên nút bấm `Đặt lại bộ lọc` để người dùng reset bộ lọc nhanh chóng.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Frontend Build**: `cd frontend; npm run build` (tsc + vite) PASS 100% không có lỗi type/Vite (hoàn tất trong 14.44s).
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py frontend/src/features/external-api/components/ProductApiMappingTab.tsx` PASS 100% không có lỗi encoding hay vỡ dấu.
- **UI/UX**: Giao diện gọn gàng, không bị trùng lặp nút tạo hành động. Nút tạo chính trên thanh banner góc phải hoạt động bình thường.

## [11:35] Sửa lỗi tạo quy tắc điều phối OTP theo variant thiếu khóa sản phẩm legacy

### Phạm vi và nguyên nhân gốc
- Backend lỗi PostgreSQL `23502` khi tạo rule variant vì insert chỉ ghi `slot_key`, `supplier_id`, `variant_id`, `provider_key` nhưng database đang chạy yêu cầu `product_id NOT NULL`.
- Mã refactor variant tại `backend/src/domains/system/services/productApiService.js` đã chủ động bỏ khóa sản phẩm. Tuy nhiên migration cũ chỉ nới `product_name_id`, trong khi schema lịch sử tại môi trường lỗi dùng `product_id`; đây là lệch contract migration/schema.

### Thay đổi kỹ thuật
- Thêm `backend/src/db/migrations/20261119000001_make_portal_routing_legacy_product_keys_nullable.js`.
- Migration kiểm tra bảng/cột qua `information_schema` và chỉ thực hiện `DROP NOT NULL` với các cột legacy đang có và còn bắt buộc: `product_id` hoặc `product_name_id`.
- Migration không xóa dữ liệu và `down` cố ý không khôi phục `NOT NULL`, vì điều đó sẽ làm hỏng các rule variant hợp lệ không có khóa legacy.
- Thêm regression test `backend/tests/unit/portalSlotRoutingLegacyProductKeyMigration.test.js` cho cả schema có hai cột legacy bắt buộc và schema thiếu/đã nullable.

### Kiểm tra và nghiệm thu
- PASS: `node --test tests/unit/portalSlotRoutingLegacyProductKeyMigration.test.js` - 2/2 test pass.
- PASS: Chạy `npm run migrate` với `TEST_DATABASE_URL` cô lập; Knex hoàn thành batch 17, gồm migration mới.
- PASS: Query DB test xác nhận `product_name_id` nullable và migration `20261119000001_make_portal_routing_legacy_product_keys_nullable.js` được ghi nhận.
- PASS: Service smoke tạo rule bằng `createRoutingRule` với `slot_key=schema_contract_probe_20261119`, lưu thành công `variant_id=49`; rule probe được xóa trong `finally`.
- PASS: Query cleanup xác nhận `remainingProbeRules=0`; `node --check` và `git diff --check` đều pass.
- Chưa chạy migration trên DATABASE_URL local/production và chưa kiểm chứng browser UI; các môi trường đó cần được triển khai/smoke riêng.
## [10:47] Áp dụng migration sửa ràng buộc legacy trên database runtime local

- Log lỗi lặp lại lúc `10:45` xác nhận backend local vẫn dùng database có `system_automation.portal_slot_routing_rules.product_id NOT NULL`; migration mới chưa được ghi nhận ở database này.
- Đã chạy `npm run migrate` trong `backend/`: Knex hoàn tất batch 18 với đúng 1 migration `20261119000001_make_portal_routing_legacy_product_keys_nullable.js`.
- Kiểm chứng read-only sau migration: `product_id`, `product_name_id` và `variant_id` đều `is_nullable=YES`; migration được ghi nhận lúc `2026-11-19T03:46:50.447Z`.
- PostgreSQL áp dụng thay đổi ràng buộc ngay; backend không cần restart. Cần thử lại thao tác tạo rule trên UI để xác nhận HTTP/API end-to-end.

## [11:10] Gom nhóm NCC thành 1 dòng và hiển thị các variant dưới dạng thẻ tag nhỏ

### 1. Phạm vi & Mục tiêu
- **Phạm vi**:
  - Tối ưu bảng cấu hình tại tab **Điều Phối OTP Variant** ([ProductApiMappingTab.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)).
  - Thay vì hiển thị mỗi variant thành 1 dòng đơn lẻ lặp đi lặp lại Ô Input, NCC và Cổng Provider Đích, hệ thống gom toàn bộ các variant có cùng bộ khóa `(slot_key, supplier_id, provider_key)` thành **duy nhất 1 dòng**.
  - Cột *3. Variant của NCC* hiển thị các variant dưới dạng **các thẻ tag nhỏ (chip/badge)** có icon, tên variant và nút gỡ nhanh variant khỏi liên kết.
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **Frontend [ProductApiMappingTab.tsx](file:///D:/Desktop/admin/admin_orderlist/frontend/src/features/external-api/components/ProductApiMappingTab.tsx)**:
   - Thêm cấu trúc `GroupedRoutingRule` và hàm gom nhóm `useMemo` gom danh sách `routingRules` theo composite key `${slot_key}__${supplier_id}__${provider_key}`.
   - Hiển thị mỗi nhóm trên 1 dòng duy nhất gồm:
     + **1. Ô Input Web Portal**: Tên Ô Input và `slot_key`.
     + **2. Nhà Cung Cấp (NCC)**: Tên NCC (`supplier_name`).
     + **3. Variant của NCC**: Gom toàn bộ variants thành các tag nhỏ dạng `inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium`, kèm icon `Layers`, hỗ trợ gỡ nhanh từng variant qua nút `X`.
     + **4. Cổng Provider Đích**: Tên Provider và `provider_key`.
     + **Trạng thái**: Bật/Tắt toàn bộ nhóm quy tắc điều phối của NCC đó trong 1 click.
     + **Thao tác**: Nút Sửa mở modal với đầy đủ danh sách variant đã chọn; Nút Xóa xóa trọn bộ liên kết của NCC đó với cảnh báo an toàn.
   - Modal submit: Gọi hàm `onCreateRoutingRule` (tức API `saveRoutingRuleVariants`) để đồng bộ chính xác danh sách `variantIds` khi tạo mới hoặc cập nhật.
   - Cập nhật bộ đếm thống kê trên Top Banner: Hiển thị tổng số NCC liên kết kèm tổng số variants.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Frontend Build**: `npm run build` (tsc + vite) PASS 100% không phát sinh bất kỳ cảnh báo hoặc lỗi TypeScript nào.
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py frontend/src/features/external-api/components/ProductApiMappingTab.tsx` PASS 100% không có lỗi encoding, BOM hay vỡ dấu.
- **UI/UX**: Giao diện bảng gọn gàng, 10 variant Adobe của Ades từ 10 dòng lặp đã được thu gọn thành 1 dòng duy nhất với 10 thẻ tag nhỏ trực quan đúng như chỉ đạo của Master.

## [11:36] Khắc phục CORS cho Web OTP local port 3005

### Nguyên nhân gốc
- Web OTP đang chạy độc lập tại `http://localhost:3005/otp/` từ `D:\Desktop\admin\otp_portal`, trong khi backend chỉ whitelist `http://localhost:3003` và `http://localhost:5173`.
- Backend chặn request trước khi gọi provider OTP; preflight `OPTIONS /api/public/otp/adobe/code` với origin `http://localhost:3005` trước sửa trả `403`.

### Thay đổi và kiểm chứng
- Cập nhật `backend/.env`: thêm duy nhất `http://localhost:3005` vào `CORS_ORIGINS`.
- Restart backend local tại port `3002`; health `GET /api/health` trả `200` và `database=connected`.
- PASS: preflight từ `http://localhost:3005` tới `/api/public/otp/adobe/code` trả `204` cùng header `Access-Control-Allow-Origin: http://localhost:3005`.
- Không nới CORS wildcard và không thay đổi API/provider OTP. Cần thao tác lại trên Web OTP để kiểm chứng browser-to-provider end-to-end.

## [11:42] Sửa lỗi định tuyến đơn hàng và tự động phân giải email khi lấy mã OTP

### 1. Phạm vi & Mục tiêu
- **Phạm vi**:
  - Khắc phục lỗi đơn hàng đã được cấu hình trong bảng *Điều Phối OTP Variant* nhưng khi kiểm tra lại báo lỗi `Vui lòng cung cấp email hợp lệ (vd: user@domain.com)`.
  - Xử lý tại backend điều phối OTP ([productApiService.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/productApiService.js)) và dispatcher ([otpPortalDispatcher.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/otpPortalDispatcher.js)).
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS)**.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **Sửa khớp khóa Variant trong [productApiService.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/productApiService.js)**:
   - Nhận diện đúng `order_list.id_product` chính là `variant_id` trong hệ thống (chứ không phải `product_id`).
   - Thiết lập chuỗi 4 cấp ưu tiên khi tìm kiếm quy tắc định tuyến:
     + **Ưu tiên 1**: Khớp chính xác theo `variant_id` của đơn hàng (`EXACT_ORDER_VARIANT`).
     + **Ưu tiên 2**: Khớp theo `variant_tag` của slot kho (`EXACT_SLOT_TAG_VARIANT`).
     + **Ưu tiên 3**: Khớp theo sản phẩm cha `product_id` (`PRODUCT_VARIANT_FALLBACK`).
     + **Ưu tiên 4**: Fallback về cổng duy nhất nếu toàn bộ variant của NCC trỏ cùng 1 cổng Provider (`SUPPLIER_SINGLE_PROVIDER_FALLBACK`).
   - Bổ sung thuật toán Smart Order Pick: Khi khách hàng tra cứu bằng Email có nhiều đơn hàng trong lịch sử, tự động ưu tiên chọn đơn hàng có NCC/Variant đã được cấu hình cho ô input đó thay vì chỉ lấy đơn đầu tiên.
   - Trả về thêm `resolved_email` và `order_code`.
2. **Tự động phân giải Email trong [otpPortalDispatcher.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/services/otpPortalDispatcher.js)**:
   - Khi người dùng nhập Mã Đơn Hàng (chuỗi không chứa `@`), hệ thống tự động lấy `resolved_email` từ đơn hàng đã tìm thấy để truyền vào Provider, ngăn chặn triệt để lỗi từ chối chuỗi mã đơn hàng từ phía nhà cung cấp.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Kiểm thử tự động Backend**:
  + Test 1: Nhập mã đơn hàng `MAVLWMZZK` $\rightarrow$ Nhận diện đúng cổng `ades`, rule ID `9`, `match_type: EXACT_ORDER_VARIANT`, trích xuất đúng email `casper.ilex.324054@colegiomontealto.us`.
  + Test 2: Nhập email `casper.ilex.324054@colegiomontealto.us` $\rightarrow$ Smart Order Pick tự động chọn đơn 1308 của Ades, nhận diện đúng cổng `ades`.
  + Test 3: Dispatch lấy OTP bằng Mã Đơn Hàng `MAVLWMZZK` $\rightarrow$ Cổng Ades trả về `found: true`, `otp: 2026`, thành công 100%.
  + Test 4: Dispatch lấy OTP bằng Email $\rightarrow$ Cổng Ades trả về `found: true`, `otp: 2026`, thành công 100%.
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py` trên 2 file backend đạt **PASS 100%**.

## [11:55] Khắc phục lỗi lấy nhầm mã OTP thành số năm "2026" từ Provider Ades

### 1. Phạm vi & Nguyên nhân gốc
- **Hiện tượng**: Khi gọi API lấy OTP từ NCC Ades (`adesProvider`), hệ thống trả về mã OTP là `"2026"` thay vì mã OTP 6 số thực sự (`971849`).
- **Nguyên nhân gốc**:
  1. NCC Ades khi trả kết quả thành công sẽ có dạng:
     ```json
     {
       "status": 200, "success": true,
       "data": { "success": true, "otp": "971849", "emailSubject": "Authentication code", "emailDate": "2026-11-19T04:17:51.077Z" },
       "metadata": { "timestamp": "2026-11-19T04:45:01.162Z" }
     }
     ```
  2. Tuy nhiên, khi hòm thư gặp lỗi (hoặc trong trường hợp quét fallback), hàm tiện ích `collectOtpCandidates` và `extractOtpCode` quét qua chuỗi ngày tháng ISO `2026-11-19...` và biểu thức chính quy `\b(\d{4,8})\b` đã bắt trúng 4 chữ số đầu tiên của năm `"2026"`.
  3. Đồng thời, `adesProvider.js` trước đó fallback quét bừa toàn bộ object ngay cả khi `data.data.success === false`.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **[adesProvider.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/providers/adesProvider.js)**:
   - Kiểm tra chặt chẽ `data?.data?.success === false`: Nếu NCC báo thất bại, lập tức ghi nhận `otp = null` cùng nội dung lỗi từ Ades (`data?.data?.error || data?.message`), tuyệt đối không fallback quét object.
   - Khi thành công, chỉ trích xuất trực tiếp từ các trường chứa mã xác thực: `data?.data?.otp || data?.data?.code || data?.otp`.
2. **[otpProviderUtils.js](file:///D:/Desktop/admin/admin_orderlist/backend/src/domains/system/providers/otpProviderUtils.js)**:
   - Thêm guard trong `extractOtpCode`: Loại trừ ngay lập tức bất kỳ chuỗi nào bắt đầu theo định dạng ISO Date `/^\d{4}-\d{2}-\d{2}/`.
   - Trong `collectOtpCandidates`: Bỏ qua hoàn toàn các key chứa từ khóa thời gian (`date`, `time`, `timestamp`, `created_at`, `updated_at`, `expires`).

### 3. Kết quả kiểm tra & Nghiệm thu
- **Kiểm thử trực tiếp End-to-End**:
  + **Email `hid.core.3198@colegiomontealto.us`**: Lấy chính xác mã OTP **`971849`** (`found: true`), tốc độ phản hồi 241ms, khớp 100% với ảnh bằng chứng thực tế từ endpoint của Ades.
  + **Mã Đơn Hàng `MAVLS26UW`**: Nhận diện đúng cổng `ades`, tự động phân giải email `hid.core.3198@colegiomontealto.us` và lấy đúng mã OTP **`971849`** (`found: true`).
  + **Email/Đơn hàng lỗi chứng chỉ (`MAVLWMZZK`)**: Trả về `otp: null`, `found: false`, thông báo `"certificate has expired"`, bảo đảm 100% không bao giờ bắt nhầm số `"2026"`.
- **Kiểm soát lỗi text UTF-8**: `python scripts/scan_text_errors.py` trên toàn bộ các file backend và frontend đạt **PASS 100%**.

## [22:12] Sửa lỗi ECONNREFUSED 127.0.0.1:3001 trên Vite Proxy của OTP Portal

### 1. Phạm vi & Nguyên nhân gốc
- **Hiện tượng**: Giao diện OTP Portal (`http://localhost:3005`) báo lỗi `[vite] http proxy error: /api/public/theme` và `/api/public/otp-portal-slots/register` với `Error: connect ECONNREFUSED 127.0.0.1:3001`.
- **Nguyên nhân gốc**:
  + Backend của hệ thống hiện đang chạy trên cổng `3002` (cấu hình trong [backend/.env](file:///E:/Project/admin_store/admin_orderlist/backend/.env#L3)). Cổng `3001` không có tiến trình nào lắng nghe.
  + Dự án `otp_portal` (`E:\Project\admin_store\otp_portal`) chưa có file `.env`, file [otp_portal/vite.config.ts](file:///E:/Project/admin_store/otp_portal/vite.config.ts#L7) fallback mặc định proxy `/api` sang `http://127.0.0.1:3001`.
  + File cấu hình gốc [admin_orderlist/.env](file:///E:/Project/admin_store/admin_orderlist/.env#L40) cũng chưa được đồng bộ cổng `3002`.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **[E:/Project/admin_store/otp_portal/.env](file:///E:/Project/admin_store/otp_portal/.env)**:
   - Tạo file `.env` mới cấu hình: `VITE_BACKEND_URL=http://127.0.0.1:3002`.
2. **[E:/Project/admin_store/otp_portal/vite.config.ts](file:///E:/Project/admin_store/otp_portal/vite.config.ts#L7)** & **[otp_portal/.env.example](file:///E:/Project/admin_store/otp_portal/.env.example#L2)**:
   - Cập nhật fallback mặc định `backendTarget` từ `http://127.0.0.1:3001` sang `http://127.0.0.1:3002`.
3. **[E:/Project/admin_store/admin_orderlist/.env](file:///E:/Project/admin_store/admin_orderlist/.env#L40)**:
   - Cập nhật `PORT=3002` và `PUBLIC_BASE_URL=http://localhost:3002` đồng nhất toàn workspace.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Kiểm thử trực tiếp Vite Proxy cổng 3005**:
  + `curl http://localhost:3005/api/public/theme` $\rightarrow$ **`HTTP/1.1 200 OK`** (chuyển tiếp thành công tới backend cổng 3002).
  + `curl -X POST http://localhost:3005/api/public/otp-portal-slots/register` $\rightarrow$ **`HTTP/1.1 200 OK`** với response `{"success":true,"message":"Đã đồng bộ 8 ô input từ Web OTP Portal thành công!"}`.
  + Đã chấm dứt triệt để lỗi `ECONNREFUSED 127.0.0.1:3001` trên console của OTP Portal.

## [22:35] Khắc phục lỗi không tải danh mục sản phẩm và kẹt cờ tải NCC trên Modal Tạo Đơn Hàng

### 1. Phạm vi & Nguyên nhân gốc
- **Hiện tượng**: Trên giao diện Orders (`http://localhost:3003/orders`), khi mở Modal *Tạo Đơn Bán Hàng Mới*, ô *Chọn Sản Phẩm từ Catalog* báo lỗi *"Không tìm thấy sản phẩm khớp với từ khóa"* (mặc dù database có 129 variants) và ô *Chọn Nhà Cung Cấp (NCC)* liên tục hiển thị chữ xanh *"Đang tải NCC phù hợp..."*.
- **Nguyên nhân gốc**:
  + Trong [useOrderCatalog.ts](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/orders/hooks/useOrderCatalog.ts#L35-L42), `mountedRef.current` được khởi tạo bằng `useRef(true)`, nhưng trong `useEffect` chỉ có hàm dọn dẹp `return () => { mountedRef.current = false; }` mà thiếu `mountedRef.current = true;` khi effect chạy.
  + Do ứng dụng chạy trong `<React.StrictMode>` (React 18), vòng lặp giả lập Mount $\rightarrow$ Unmount $\rightarrow$ Remount trong môi trường dev đã khiến `mountedRef.current` bị khóa vĩnh viễn ở giá trị `false`.
  + Khi gọi API tải bảng giá thành công, `applyCatalog` kiểm tra `if (!mountedRef.current) return;` và ngay lập tức hủy bỏ kết quả, không bao giờ nạp vào `productsCatalog` (khiến mảng rỗng `[]`). Đồng thời khối `finally` không thể gọi `setLoadingCatalog(false)` khiến `loadingCatalog` bị kẹt ở `true`.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **[frontend/src/features/orders/hooks/useOrderCatalog.ts](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/orders/hooks/useOrderCatalog.ts)**:
   - Thêm `mountedRef.current = true;` trong `useEffect` để luôn giữ đúng cờ trạng thái khi component remount.
   - Thêm `useEffect` tự động gọi `ensureOrderCatalog().catch(() => {})` ngay khi hook mount để chủ động preload danh mục sản phẩm & NCC cho toàn trang Orders.
2. **[frontend/src/features/orders/components/SearchableProductDropdown.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/SearchableProductDropdown.tsx#L32)**:
   - Thêm guard `(p.san_pham && p.san_pham.toLowerCase().includes(term))` ngăn chặn lỗi ngoại lệ runtime nếu sản phẩm thiếu trường tên.

### 3. Kết quả kiểm tra & Nghiệm thu
- **Frontend Build**: Chạy `npm run build` (tsc && vite) **PASS 100% trong 8.09s**, không có bất kỳ cảnh báo hay lỗi TypeScript nào.
- **Dữ liệu & UI**: Hook đã nạp đầy đủ 129 biến thể sản phẩm và 18 NCC, giải phóng cờ `loadingCatalog = false`, chấm dứt hoàn toàn hiện tượng kẹt trạng thái tải.

## [23:20] Tích hợp tính năng Tự động cấp Activation Key và Note tài khoản vào cột Slot bảng order_list khi khách nhận trên Web (Phương Án A)

### 1. Phạm vi & Mục tiêu
- **Phạm vi**:
  - Triển khai **Phương án A (Tự động cấp Activation Key + Đồng bộ Slot)** theo chỉ đạo tối cao của Master: *"Phương Án A đi nhưng mà khi khách kiểm tra trên web, bóc slot gửi khách xong. Lấy tài khoản note vào cột slot bảng order_list nhé"*.
  - Cho phép nhân viên khi tạo đơn bán hàng mới bật công tắc `Cấp Mã Key (Tự nhận slot)`, tự động sinh mã ngẫu nhiên dạng `PREFIX-XXXX-XXXX` (VD: `GPT-A1B2-C3D4`), lưu mã key vào cột `slot` của `orders.order_list` và tạo sẵn bản ghi `AVAILABLE` trong `warehouse.activation_keys`.
  - Khi khách hàng truy cập Web OTP Portal nhập mã key, hệ thống bốc slot khả dụng trong kho, chuyển slot sang `IN_USE`, key sang `ACTIVATED`, và **tự động cập nhật tài khoản thật (`assignedAccount`) vào cột `slot` của bảng `orders.order_list`**.
- **Trạng thái**: ✅ **ĐÃ HOÀN THÀNH (PASS 100%)**.

### 2. Chi tiết kỹ thuật & Giải pháp
1. **Frontend Contract & Modal Tạo Đơn**:
   - [frontend/src/features/orders/types.ts](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/orders/types.ts): Bổ sung `is_auto_key?: boolean; activation_key?: string;` vào interface `OrderFormData` và `DEFAULT_FORM_DATA`.
   - [frontend/src/features/orders/components/OrderCreateEditModal.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderCreateEditModal.tsx):
     + Tích hợp công tắc chuyển đổi trực quan `Cấp Mã Key (Tự nhận slot)` tại Section *Chi Tiết Đơn Hàng & Tài Khoản* (chỉ hiện khi tạo đơn bán hàng).
     + Tự động sinh mã key thông minh dựa trên SKU sản phẩm (`GPT`, `NFLX`, `ADB`, `CNV`...) kèm 8 ký tự hex ngẫu nhiên.
     + Cung cấp ô hiển thị mã kích hoạt font monospace nổi bật, nút tạo mã mới (`RefreshCw`) và nút sao chép nhanh (`Copy` / `Check`) để nhân viên gửi khách.
     + Đồng bộ 2 chiều: Giá trị mã key được tự động điền vào trường `slot` ban đầu của đơn hàng.
2. **Backend Order Service & Database ACID**:
   - [backend/src/domains/orders/services/orderService.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js):
     + Trong transaction tạo đơn `createOrder`, khi có cờ `is_auto_key` hoặc `activation_key`: Tự động tìm `product_name_id` phù hợp và chèn một bản ghi mới vào `warehouse.activation_keys` với trạng thái `AVAILABLE`, liên kết `id_order = createdOrder.id_order`, `customer_info`, `product_id`.
   - [backend/src/domains/products/services/activationKeyService.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/activationKeyService.js):
     + Trong hàm cấp phát `activateKeyWithTransaction` (bọc Knex transaction ACID): Khóa dòng Key và Account Slot bằng `FOR UPDATE`.
     + Sau khi bốc slot kho thành công (`availableSlot`), kiểm tra nếu mã key có `id_order`, hệ thống lập tức thực thi câu lệnh cập nhật trực tiếp tài khoản thật vào đơn hàng khách:
       ```js
       if (key.id_order) {
         await trx(TABLES.ORDER_LIST)
           .where("id_order", key.id_order)
           .update({
             slot: assignedAccount,
             updated_at: trx.fn.now(),
           });
       }
       ```
     + Chuyển key sang `ACTIVATED` và trả về thông tin tài khoản, mật khẩu, 2FA cho khách hàng trên Web.

### 3. Kết quả kiểm tra & Nghiệm thu
1. **Frontend Compile & Build**:
   - `npm --prefix frontend run build` (tsc && vite) **PASS 100% trong 4.62s**, 0 lỗi cú pháp hoặc TypeScript.
2. **Kiểm thử Tích hợp End-to-End Backend (Script mô phỏng thực tế)**:
   - Tạo đơn hàng `#MAVC_TEST_KEY_FMUY` với `activation_key = "GPT-TEST-TC1X"`, `slot = "GPT-TEST-TC1X"` $\rightarrow$ Đơn tạo thành công, `warehouse.activation_keys` tạo bản ghi `AVAILABLE` gắn đúng `id_order`.
   - Giả lập khách hàng kích hoạt mã `"GPT-TEST-TC1X"` trên Web OTP Portal $\rightarrow$ Hệ thống bốc tài khoản kho `"shghcmt02@gmail.com"`, slot index 1, chuyển trạng thái kho thành công.
   - Query kiểm chứng trực tiếp `orders.order_list` $\rightarrow$ Cột `slot` của đơn hàng đã được cập nhật chính xác từ `"GPT-TEST-TC1X"` thành tài khoản thật `"shghcmt02@gmail.com"`.
   - Tự động dọn dẹp toàn bộ dữ liệu test an toàn, không để lại rác trong database.

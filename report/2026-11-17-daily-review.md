# Báo Cáo Nghiệm Thu Hàng Ngày (Daily Review) — 2026-11-17

## [00:55:00] Nâng cấp Modal Sửa Dịch Vụ Kho (WarehouseEditSlotModal): Tự do chọn tag có sẵn và Tự động tạo tag mới đồng bộ vào kho dịch vụ

- **Phạm vi tác động**:
  - [frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx)
  - [frontend/src/features/warehouse/types.ts](file:///E:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/types.ts)
  - [frontend/src/pages/WarehousePage.tsx](file:///E:/Project/admin_store/admin_orderlist/frontend/src/pages/WarehousePage.tsx)
  - [backend/src/domains/warehouse/services/warehouseSlotService.js](file:///E:/Project/admin_store/admin_orderlist/backend/src/domains/warehouse/services/warehouseSlotService.js)
- **Trạng thái**: Hoàn thành 100% (Done)
- **Mục tiêu đã giải quyết**:
  - 1. **Lựa chọn tag có sẵn của sản phẩm**: Hiển thị danh sách các tag biến thể có sẵn của chính sản phẩm/dịch vụ này dưới dạng pill buttons (như `1PC Cố Định`, `Adobe Acc Cấp`, `Adobe Add Team`, `Adobe Renew`, `Edu`, `Firefly`...). Khi click vào bất kỳ tag nào, hệ thống tự động điền ngay vào ô Tag biến thể.
  - 2. **Tự do tạo tag mới ngay tại chỗ**: Cho phép người dùng nhập trực tiếp bất kỳ tag tùy chỉnh nào vào ô Tag. Khi phát hiện tag mới chưa có trong danh mục:
    - Hiển thị banner chỉ báo trực quan với icon Sparkles: *"Tự động tạo tag mới: [Tên Tag] — Tag này sẽ được gán cho slot này và tự động lưu vào danh mục biến thể sản phẩm trong hệ thống kho!"*.
    - Cung cấp checkbox tiện ích: *"Đồng bộ đặt làm Tag phân loại mặc định cho dịch vụ này trong Danh Mục Kho"* (`saveTagToCatalog`).
  - 3. **Nút gỡ tag nhanh**: Cho phép người dùng bấm "✕ Gỡ tag" hoặc "Xóa trống" để bỏ tag riêng của slot, giúp slot quay lại sử dụng tag mặc định của catalog.
  - 4. **Xử lý Backend ACID an toàn**:
    - Khi nhận tag mới, `warehouseSlotService` tự động kiểm tra và thêm variant mới vào bảng `business.variant` (nếu dịch vụ có liên kết với sản phẩm hệ thống) trong cùng transaction.
    - Nếu bật tùy chọn `saveTagToCatalog`, hệ thống tự động cập nhật cả trường `category` trong `warehouse.product_names`.
    - Đã khắc phục lỗi thiếu trường `variant_tag` trong câu lệnh select sau khi cập nhật slot để trả về dữ liệu chuẩn xác 100%.
- **Kiểm thử & Nghiệm thu**:
  - `.\frontend\node_modules\.bin\tsc.cmd --noEmit --project frontend/tsconfig.json`: Exit code 0 (Hoàn toàn không có lỗi TypeScript).
  - `node --check backend/src/domains/warehouse/services/warehouseSlotService.js`: Exit code 0 (Cú pháp backend chuẩn xác).
  - `node backend/tests/unit/warehouse_service.test.js`: 3/3 test suites pass.

## [17/11/2026] Điều phối OTP theo NCC và Variant

- **Phạm vi**: Thay cấu hình `Ô input + Sản phẩm + NCC + Provider + Priority` bằng `Ô input + Provider của ô + NCC + Variant`; chỉ ô input TOTP (`two_factor_totp`) là cổng dùng chung.
- **Thay đổi**: Modal lấy toàn bộ provider theo `assigned_services` của ô input đã chọn, tải variant NCC từ `business.supplier_cost`, chip variant có nút `X`, và bảng rule gồm `STT`, `Provider`, `NCC`, `Variant`, `On/Off`. Adobe, Netflix, GPT không bị lọc provider theo tên/category; chỉ `two_factor_totp` khóa điều phối NCC/variant. Alias legacy `fix_ades` được chuẩn hóa thành `ades` ở frontend và provider runtime, nên dropdown `adobe_otp` hiển thị đủ Ades-otp và TinyHost. Thêm provider nội bộ `package_warehouse` để cấp/tra cứu account từ mã key và dùng lại transaction đã cập nhật `order_list.slot`; migration `20261117000002` chèn provider này làm lựa chọn đầu tiên của `gpt_account` đang lưu.
- **Runtime**: `findRoutingProviderForInput` ưu tiên rule khớp chính xác NCC/variant, sau đó rule legacy theo sản phẩm, rồi direct provider của slot để không mất cấu hình cũ.
- **Database**: Thêm migration `backend/src/db/migrations/20261117000001_add_variant_to_portal_slot_routing_rules.js`; chưa chạy migration trên database nào trong task này.
- **Kiểm tra**: `npm.cmd --prefix frontend run build` pass; smoke test provider và dispatcher `package_warehouse` pass; kiểm tra cú pháp Node và `git diff --check` pass. Lệnh `node --test backend/tests/unit/otpProviderService.test.js backend/tests/unit/activationKeyService.test.js` đã in tất cả assertion pass, gồm test mới, nhưng worker không tự thoát do handle nền nên được dừng sau khi đã có kết quả.
- **Điều kiện nghiệm thu còn lại**: Cần chạy migration ở database được chỉ định và smoke test thao tác lưu/tắt/mở rule với dữ liệu NCC-variant thật.

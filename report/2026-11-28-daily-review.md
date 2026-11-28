# Nghiệm thu ngày 2026-11-28

## Nâng cấp bản đồ IP / Visitor Geography sang MapLibre GL JS

- Thay thế bản đồ SVG tĩnh (`worldPaths.json`) trong [TrafficGeography.tsx](frontend/src/features/traffic/components/TrafficGeography.tsx) bằng bản đồ tương tác WebGL **MapLibre GL JS** ([TrafficMapCanvas.tsx](frontend/src/features/traffic/components/TrafficMapCanvas.tsx)) nền tối (`OpenFreeMap Dark` vector style không cần API key, tự động fallback sang OpenStreetMap raster làm tối nếu style vector lỗi), cấu hình `optimizeDeps.exclude: ["maplibre-gl"]` để Vite dev tải đúng worker và tách chunk riêng `maplibre` trong [vite.config.ts](frontend/vite.config.ts).
- Bổ sung bảng tọa độ chuẩn hóa [geoCoordinates.ts](frontend/src/features/traffic/geoCoordinates.ts) hỗ trợ định vị thành phố/tỉnh Việt Nam và quốc tế từ GA4; hỗ trợ lớp **Heatmap** mật độ (bật/tắt bằng `ToggleSwitch`), bong bóng phát sáng kèm tooltip glassmorphism, tự động `flyTo` khi chọn quốc gia/thành phố và sửa lỗi hiển thị `{scale}?` thành `{zoom.toFixed(1)}×`.
- Mở rộng [trafficIpService.js](backend/src/domains/traffic/services/trafficIpService.js) và [trafficRoutes.js](backend/src/domains/traffic/routes/trafficRoutes.js) với endpoint chỉ đọc `GET /api/traffic/ip-map?days=30` tổng hợp tọa độ MaxMind GeoIP theo cụm `0.01°` (không lộ IP thô), phục vụ chế độ chuyển đổi `Phiên GA4` ↔ `Bản đồ IP`.
- Kiểm thử: `npm --prefix backend test` đạt **201/201** (gồm 3 bài test mới trong [trafficIpMap.test.js](backend/tests/unit/trafficIpMap.test.js)); `npm --prefix frontend run build` (`tsc && vite build`) thành công (`TrafficMapCanvas` + `maplibre` tách chunk riêng). Chưa kiểm thử trực tiếp trên trình duyệt với dữ liệu GA4/GeoLite2 thật tại production.

## Gán biên lai money-out cho công nợ theo mã đơn NCC

- Thêm lựa chọn **Thanh toán NCC** trong cửa sổ phân bổ. Tra đúng mã đơn, hiển thị NCC và số còn phải trả trước khi xác nhận.
- Ghi nhận phân bổ, cập nhật công nợ và Outbox trong cùng giao dịch PostgreSQL. Lịch sử NCC hiển thị biên lai đã gán. Biên lai còn dư tiếp tục khả dụng. Mỗi cặp biên lai và khoản công nợ chỉ được gán một lần để chống ghi trùng khi gửi lại.
- Kiểm thử PostgreSQL 16 local cô lập xác nhận biên lai 160.000 ₫ gán 145.000 ₫ cho đơn mẫu MAVL3DXJ1, dư 15.000 ₫, giữ đúng một bút toán ngân hàng và bảo toàn công nợ của đơn khác. Đã kiểm tra gửi lại, phân bổ đồng thời và tất toán số dư sau khi gán một phần. Kiểm thử giao diện Edge với API giả lập xác nhận luồng từ biên lai đến lịch sử NCC.
- Bộ kiểm thử tích hợp biên lai có hai ca trả nợ cá nhân lỗi `receiptMonth is not defined` ở `personalAssetService.js`. Đối chiếu với HEAD xác nhận tham chiếu thiếu import đã có trước thay đổi này.
- Phạm vi kiểm tra là local. Mã đơn và số tiền lấy từ ảnh làm dữ liệu thử. Thêm bản dịch vào `lang.xlsx`. Repo hiện chưa có lệnh `i18n:extract` để sinh từ điển runtime.

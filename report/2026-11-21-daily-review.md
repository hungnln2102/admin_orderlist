## Ẩn nút thanh toán kỳ trả góp đã trả

- Đối chiếu nhật ký thanh toán theo hợp đồng và kỳ đang xem. API đã có kiểm tra trùng kỳ trong transaction.
- Frontend build và kiểm tra cú pháp backend thành công. Chưa triển khai lên production.

## Hiển thị đầy đủ ngày trong danh sách đơn hàng

- Cột ngày rộng 180 px để hiển thị ngày đăng ký và ngày hết hạn trên cùng một hàng theo dạng `dd/mm/yyyy - dd/mm/yyyy`. [OrderTable.tsx](../frontend/src/features/orders/components/OrderTable.tsx#L234)
- Kiểm tra kỹ thuật bằng `npm run build` trong `frontend` thành công. Chưa triển khai lên hệ thống đang chạy.

## Chọn sản phẩm và tag khi thêm tài khoản kho

- Form hiển thị tên sản phẩm, lấy tag từ `availableTags` và xóa tag cũ khi đổi sản phẩm. Tag đã chọn được gửi qua trường `variantTag` khi lưu.
- Các tag hiện thành danh sách nút. Nút đang chọn sáng lên và có thể bấm lại để bỏ chọn.
- `npm run build` thành công. Chưa kiểm tra thao tác lưu trên trình duyệt hoặc triển khai lên hệ thống đang chạy.

## Hợp nhất thay đổi từ VPS

- Giữ logic chuẩn hóa trạng thái đơn, migration, ghi chi phí nhà cung cấp và ghi chú vận hành.
- Giữ cú pháp route tương thích Express 4. Migration email receipt trên VPS trùng nội dung với file đã có trong Git.
- Frontend build, `node --check` và `git diff --cached --check` thành công. Truy vấn chỉ đọc xác nhận trạng thái và ràng buộc tương ứng trên production. Chưa kiểm thử thanh toán end-to-end.
## Chi phí cố định dạng thẻ và thanh toán tiền mặt

- Thẻ hiển thị khoản chi, phân loại, số tiền tháng, trạng thái và các thao tác. Tiền mặt dùng luồng ghi nhận thanh toán hiện có và ghi nguồn tiền trong ghi chú.
- Khi chọn biên lai, form điền phần tiền còn chưa phân bổ và cho phép chỉnh số tiền trước khi lưu.
- Nhật ký dưới các thẻ lấy giao dịch theo kỳ đang xem, nối mã biên lai qua bản ghi phân bổ. Frontend build và kiểm tra cú pháp backend đạt. Chưa kiểm thử với dữ liệu thực trên trình duyệt.
- Frontend build và kiểm tra diff thành công. Chưa kiểm thử thao tác lưu trên trình duyệt.
## Phân trang nhật ký nợ và trả góp

- Dùng bộ phân trang chung, tối đa 10 giao dịch mỗi trang. Frontend build thành công.

## [12:18] Thiết kế lại form cấu hình cấp key tự động sang dạng ngang 2 cột (Pipeline Layout)

- **Phạm vi tác động**: [ActivationKeyRuleModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/activationKeys/components/ActivationKeyRuleModal.tsx).
- **Thay đổi kỹ thuật**:
  - Tăng kích thước modal từ `max-w-xl` (576px) thành `max-w-4xl xl:max-w-5xl` (896px - 1024px) tối ưu diện tích hiển thị trên màn hình máy tính, loại bỏ cảm giác chật chội và giảm thiểu cuộn dọc.
  - Tái cấu trúc thành **Grid 2 cột ngang** đại diện cho luồng Pipeline Ánh xạ:
    - Cột 1 (Đầu vào - Nguồn đơn hàng): Variant áp dụng + Nhà cung cấp (NCC).
    - Connector giữa 2 cột: Mũi tên ngang `ArrowRight` với badge `Ánh xạ tự động cấp slot` trên màn hình desktop (tự động chuyển thành `ArrowDown` trên mobile responsive).
    - Cột 2 (Đầu ra - Đích nhận key): Kho slot cung ứng + Tag kho đích.
  - Tối ưu z-index cho các custom searchable dropdowns khi float xổ xuống, không bị che khuất bởi cột kế bên.
  - Nâng cấp card Mô phỏng quy tắc thực tế (Live Rule Preview) thành thanh Visual Pipeline Banner hiển thị dạng chips luồng dữ liệu trực quan: `[Variant] + [NCC] ────➤ [Kho đích] Tag: [Tag]`.
  - Phân bố hàng cấu hình phụ (Ghi chú nội bộ chiếm 7 cột, Toggle kích hoạt chiếm 5 cột) cân đối, gọn gàng.
  - Giữ nguyên 100% logic form, state, payload và API endpoint gửi lên backend.
- **Kiểm tra kỹ thuật**: `npm run build` trong `frontend` chạy hoàn tất thành công (`tsc && vite build` hoàn thành trong 4.43s không phát sinh cảnh báo/lỗi).

## [12:33] Lọc động danh sách Nhà cung cấp (NCC) theo đúng Variant được chọn

- **Phạm vi tác động**: [ActivationKeyRuleModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/activationKeys/components/ActivationKeyRuleModal.tsx).
- **Nguyên nhân gốc đã xử lý**: Thay thế API tĩnh `/api/products/all-suppliers` (lấy toàn bộ NCC hệ thống) bằng endpoint lọc theo ngữ cảnh `GET /api/products/:productId/suppliers` lấy từ bảng `business.supplier_cost`.
- **Thay đổi kỹ thuật**:
  - Khi chưa chọn Variant: Khóa dropdown NCC, hiển thị placeholder `"-- Vui lòng chọn Sản phẩm (Variant) trước --"`.
  - Khi chọn Variant: Tự động kích hoạt `fetchSuppliersForVariant(variantId)` tải đúng danh sách NCC đang cung ứng sản phẩm đó kèm giá vốn nhập `costPrice`.
  - Tự động gán NCC hợp lệ đầu tiên hoặc giữ nguyên ID nếu NCC cũ vẫn có quyền cung ứng gói mới; cảnh báo nếu Variant chưa được gán NCC trong Bảng Giá.
  - Khi mở chế độ Sửa (`editingRule`): Tải đúng danh sách NCC của Variant đang sửa và chọn đúng NCC đã lưu.
- **Kiểm tra kỹ thuật**: `npm run build` trong `frontend` thành công trong 4.57s.




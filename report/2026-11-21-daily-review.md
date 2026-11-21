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

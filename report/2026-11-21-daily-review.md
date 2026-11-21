## Hiển thị đầy đủ ngày trong danh sách đơn hàng

- Cột ngày rộng 180 px để hiển thị ngày đăng ký và ngày hết hạn trên cùng một hàng theo dạng `dd/mm/yyyy - dd/mm/yyyy`. [OrderTable.tsx](../frontend/src/features/orders/components/OrderTable.tsx#L234)
- Kiểm tra kỹ thuật bằng `npm run build` trong `frontend` thành công. Chưa triển khai lên hệ thống đang chạy.

## Chọn sản phẩm và tag khi thêm tài khoản kho

- Form hiển thị tên sản phẩm, lấy tag từ `availableTags` và xóa tag cũ khi đổi sản phẩm. Tag đã chọn được gửi qua trường `variantTag` khi lưu.
- Các tag hiện thành danh sách nút. Nút đang chọn sáng lên và có thể bấm lại để bỏ chọn.
- `npm run build` thành công. Chưa kiểm tra thao tác lưu trên trình duyệt hoặc triển khai lên hệ thống đang chạy.

## H?p nh?t thay ??i t? VPS

- Gi? logic chu?n h?a tr?ng th?i ??n, migration, ghi chi ph? nh? cung c?p v? ghi ch? v?n h?nh.
- D?ng route tham s? t?y ch?n t??ng th?ch Express 4. Migration email receipt tr?n VPS tr?ng n?i dung v?i file ?? c? trong Git.
- Frontend build, `node --check` v? `git diff --cached --check` th?nh c?ng. Truy v?n ch? ??c x?c nh?n d? li?u tr?ng th?i v? r?ng bu?c t??ng ?ng tr?n production. Ch?a ki?m th? giao d?ch thanh to?n end-to-end.

# Báo cáo kiểm tra logic ngày hết hạn đơn hàng

- Ngày kiểm tra: 2026-11-03 (Asia/Bangkok)
- Phạm vi: tính ngày hết hạn khi người dùng đổi ngày bắt đầu trong form tạo/sửa đơn hàng.
- Trạng thái nghiệm thu: **Đạt sau khi sửa và kiểm tra tự động.**

## Nguyên nhân

Hàm `calculateExpirationDateFromStart` dùng mốc cùng ngày của tháng/năm kế tiếp làm `expired_at`. Vì vậy gói `--1m` bắt đầu ngày `27/10/2026` hiển thị hết hạn ngày `27/11/2026`, dài hơn một ngày nếu ngày bắt đầu được tính là ngày sử dụng đầu tiên.

Luồng gia hạn backend không sửa vì đã dùng `expired_at + 1 ngày` làm ngày bắt đầu kỳ mới và giữ ngày hết hạn cũ khi cộng tháng; kết quả đã đúng theo quy tắc kỳ liên tiếp không chồng ngày.

## Thay đổi

- `frontend/src/features/orders/utils/durationUtils.ts`: coi mốc cùng ngày của kỳ kế tiếp là cận trên không bao gồm, rồi lùi một ngày để có ngày hết hạn.
- `backend/tests/unit/durationUtils.test.js`: cập nhật quy tắc và thêm case xác nhận `27/10/2026 + 1 tháng = 26/11/2026`.

## Kiểm tra đã chạy

- `node --test backend/tests/unit/durationUtils.test.js`: pass 5/5.
- `npm --prefix frontend run build`: pass.
- `git diff --check -- frontend/src/features/orders/utils/durationUtils.ts backend/tests/unit/durationUtils.test.js`: pass.

## Kết quả mong đợi

Khi chọn ngày bắt đầu `27/10/2026` cho gói `Adobe_Renew2--1m`, UI tự tính ngày hết hạn thành `26/11/2026`.

## Hợp nhất form tạo và sửa

- `OrderCreateEditModal` được dùng bởi cả modal tạo và modal sửa, và tiếp tục gọi `calculateExpirationDateFromStart` khi người dùng đổi ngày bắt đầu.
- `frontend/src/pages/OrdersPage.tsx` đã chuyển luồng chọn sản phẩm khi tạo/sửa sang cùng helper này, thay cho `calculateExpirationDate` theo số ngày.
- Giá trị hạn mặc định một năm khi mở form cũng dùng helper chung.
- Đã xác nhận không còn call-site tạo/sửa nào gọi `calculateExpirationDate` cũ; unit test pass 5/5 và frontend build pass.

## Điều khiển ngày bắt đầu và ngày hết hạn

- Khi người dùng đổi `order_date`, `OrderCreateEditModal` luôn gọi `calculateExpirationDateFromStart` để tính lại `expired_at` và `days` theo gói sản phẩm.
- Khi người dùng đổi riêng `expired_at`, modal giữ nguyên `order_date`, chấp nhận ngày hết hạn tùy chỉnh và tính lại `days`.
- Nếu người dùng nhập ngày hết hạn sớm hơn ngày bắt đầu, modal giữ nguyên ngày bắt đầu và dùng chính ngày bắt đầu làm ngày hết hạn tối thiểu để tránh khoảng thời gian âm.
- Modal này được dùng cho cả tạo và sửa đơn, nên hai form có cùng hành vi.

## Kiểm tra bổ sung cho điều khiển thủ công

- `OrderCreateEditModal` nhận rõ `changedField` từ `DateRangePicker`: `start` kích hoạt tính tự động, `end` chỉ cập nhật hạn thủ công.
- `node --test backend/tests/unit/durationUtils.test.js`: pass 5/5.
- `npm --prefix frontend run build`: pass.
- `git diff --check -- frontend/src/features/orders/components/OrderCreateEditModal.tsx report/2026-11-03-expiration-date-calculation-review.md`: pass.
## Xác nhận luồng gia hạn

- Backend dùng `order.expired_at + 1 ngày` làm `order_date` mới.
- Backend đọc hậu tố `--Xm` (hoặc `--Xy`) trên thông tin gói để xác định số tháng; chỉ dùng `days` làm phương án dự phòng nếu không đọc được hậu tố.
- Ví dụ: kỳ cũ hết hạn `26/11/2026`, gói `--1m` thì kỳ mới bắt đầu `27/11/2026` và hết hạn `26/12/2026`. Hai kỳ liên tiếp, không hở ngày và không chồng ngày.
- `node --test backend/tests/unit/renewal_date_calculation.test.js`: pass.
# Luồng lợi nhuận hệ thống (tháng + Store)

## 1) Mục tiêu

Chuẩn hóa 2 chỉ số tài chính:

- `Lợi nhuận tháng`: phần phát sinh theo từng tháng trong `finance.dashboard_monthly_summary.total_profit`.
- `Lợi nhuận khả dụng Store`: số khả dụng toàn Store để theo dõi vận hành thực tế.

## 2) Quy tắc nghiệp vụ gốc

Áp dụng cho luồng lợi nhuận tháng:

1. Webhook **có mã đơn hàng**: cộng `price - cost`.
2. Webhook **không có mã đơn hàng**: cộng thẳng `amount`.
3. Đơn bấm **Gia Hạn** hoặc **Thanh Toán**: cộng `price - cost`.
4. Đơn **nhập hàng** (MAVN), khi **tạo đơn thành công** hoặc **gia hạn**: trừ `cost`.
5. **Hoàn tiền khách**: trừ `refund`.

## 3) Chi phí ngoài luồng (dùng cho khả dụng)

Chi phí ngoài luồng được ghi riêng tại bảng:

- `finance.store_profit_expenses`

Các loại chi phí ngoài luồng:

- `withdraw_profit`: rút lợi nhuận.
- `external_import`: đơn ngoài luồng / nhập hàng ngoài luồng.

Cấu trúc chính:

- `id`
- `amount`
- `reason`
- `expense_type`
- `created_at`

## 4) Công thức chuẩn

### 4.1. Lợi nhuận tháng

- Nguồn: `finance.dashboard_monthly_summary.total_profit`.
- Ý nghĩa: phát sinh trong từng tháng.

### 4.2. Lợi nhuận khả dụng Store

Không tạo bảng số dư riêng. Tính trực tiếp:

- `Lợi nhuận khả dụng = SUM(total_profit tất cả tháng) - SUM(store_profit_expenses.amount)`

Ghi chú:

- `total_profit` không phải số dư lũy kế, mà là phát sinh theo tháng.
- Số khả dụng là kết quả tổng hợp toàn cục từ hai nguồn dữ liệu trên.

## 5) Trạng thái triển khai hiện tại

- [x] Tạo bảng `finance.store_profit_expenses`.
- [x] Migration đã chạy thành công.
- [x] API dashboard stats đã trả thêm `availableProfit`.
- [x] Card `Lợi nhuận khả dụng` trên dashboard đã đọc từ API (không còn suy luận từ ví).

## 6) Task tiếp theo

## A. Backend / API

- [X] Tạo CRUD cho `finance.store_profit_expenses`.
- [X] Validate dữ liệu nhập (`amount > 0`, `expense_type` hợp lệ).
- [X] Bổ sung endpoint list có filter theo khoảng ngày và loại chi phí.

## B. Frontend

- [x] Tạo form nhập chi phí ngoài luồng (rút lợi nhuận / đơn ngoài luồng).
- [x] Tạo bảng lịch sử chi phí ngoài luồng.
- [x] Cho phép sửa/xóa dòng nhập sai (có audit phù hợp nếu cần).

## C. Kiểm thử

- [ ] Test công thức `availableProfit` với dữ liệu mẫu.
- [ ] Test khi không có dữ liệu tháng hoặc không có chi phí ngoài luồng.
- [ ] Test khi có nhiều dòng chi phí trong cùng ngày/tháng.

## 7) Quy tắc kiểm soát sai lệch

- Frontend không tự tính số khả dụng; luôn lấy từ API backend.
- Mọi chi phí ngoài luồng phải đi qua bảng `finance.store_profit_expenses`.
- Tránh cộng/trừ trùng với các webhook retry (idempotency theo từng luồng nghiệp vụ).

## 8) Tiêu chí hoàn thành

- `Lợi nhuận tháng` khớp logic nghiệp vụ hiện hành.
- `Lợi nhuận khả dụng` khớp công thức tổng lợi nhuận trừ tổng chi phí ngoài luồng.
- Có thể đối soát đầy đủ từng khoản chi ngoài luồng qua lịch sử bảng mới.


# Tài Liệu Kế Hoạch & Rà Soát Hiển Thị VietQR Cho Đơn Hàng (v2)

## I. TỔNG QUAN YÊU CẦU
1. [x] **Dropdown dòng đơn hàng (`OrderTable.tsx`)**: Bổ sung panel mở rộng (accordion dropdown) bên dưới từng hàng đơn hàng khi bấm vào, hiển thị thông tin chi tiết: Nguồn, Giá nhập, Giá bán, Giá trị còn lại, Webhook, Số ngày, Ghi chú và các nút thao tác nhanh.
2. [x] **Rà soát & Tối ưu hiển thị VietQR theo Trạng Thái Đơn Hàng**: Đánh giá logic hiển thị mã QR thanh toán (VietQR) cho từng loại trạng thái đơn hàng để đảm bảo trải nghiệm người dùng chính xác, không gây nhầm lẫn chuyển tiền lại cho các đơn đã thanh toán/hoàn tiền.

---

## II. CHI TIẾT TÍNH NĂNG DROPDOWN DÒNG ĐƠN HÀNG (OrderTable.tsx)

### 1. Luồng hoạt động & State
- Thêm state `expandedRowId: number | null` trong `OrderTable.tsx`.
- Cho phép toggle khi bấm vào dòng đơn hàng hoặc nút chevron.
- Hiển thị dòng mở rộng `<tr className="bg-slate-900/50">` ngay bên dưới hàng đơn hàng.

### 2. Cấu trúc UI của Panel Chi Tiết
- **Header**:
  - Mã đơn: `#{order.id_order}`
  - Tiêu đề: `"Chi tiết đơn hàng"`
  - Nút thao tác nhanh: `Thanh Toán bằng Credit`, `Thanh Toán`, `Gia Hạn` (tùy trạng thái).
- **Lưới thẻ thông tin (Grid 6 thẻ)**:
  - **NGUỒN**: Tên Nhà cung cấp (`order.supply_id` / `order.supply`).
  - **GIÁ NHẬP**: Giá nhập (`order.cost` formatted).
  - **GIÁ BÁN**: Giá bán (`order.price` formatted).
  - **GIÁ TRỊ CÒN LẠI**: Giá trị còn lại (`calculateRemainingValue(order)` formatted).
  - **CÒN THIẾU**: Chênh lệch tiền / Webhook `(webhook_amount - price)` formatted.
  - **SỐ NGÀY**: Số ngày đăng ký (`order.days`).
- **Thẻ Ghi chú (Hàng dưới)**:
  - **GHI CHÚ**: `order.note` || `"Không có ghi chú."`

---

## III. RÀ SOÁT & QUY TẮC HIỂN THỊ VIETQR THEO TRẠNG THÁI ĐƠN HÀNG

| STT | Trạng Thái Đơn Hàng | Đơn Bán (MAVC/MAVL/...) | Đơn Nhập (MAVN) | Quy Tắc Hiển Thị VietQR | Số Tiền QR |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **Chưa Thanh Toán** | 🟢 Hiển thị | 🟢 Hiển thị | Bắt buộc hiển thị QR thanh toán | `order.price` (Bán) / `order.cost` (Nhập) |
| 2 | **Cần Gia Hạn** | 🟢 Hiển thị | 🟡 Theo thỏa thuận | Hiển thị QR Gia Hạn dịch vụ | `order.price` (Giá gia hạn) |
| 3 | **Đang Xử Lý** | 🟡 Hiển thị nếu còn thiếu | 🟡 Hiển thị nếu còn thiếu | Hiển thị QR nếu chưa thanh toán 100%, hoặc ẩn nếu đã đủ tiền | Số tiền còn thiếu (`price - paid`) |
| 4 | **Đã Thanh Toán / Hoàn Thành** | 🔴 Ẩn QR | 🔴 Ẩn QR | **KHÔNG hiển thị QR thu tiền** (tránh khách quét nhầm lần 2). Hiển thị badge *"Đã thanh toán thành công"* | 0 VND |
| 5 | **Hết Hạn** | 🟢 Hiển thị | 🔴 Ẩn QR | Hiển thị QR Gia Hạn dịch vụ nếu khách có nhu cầu tiếp tục dùng | `order.price` |
| 6 | **Chưa Hoàn / Chờ Hoàn** | 🔴 Ẩn QR thu tiền | 🔴 Ẩn QR thu tiền | **Ẩn QR thu tiền**. Hiển thị thông tin STK của Khách hàng / NCC để Shop/Hệ thống thực hiện chuyển khoản hoàn tiền | Số tiền cần hoàn (`giaTriConLai` / `cost`) |
| 7 | **Đã Hoàn** | 🔴 Ẩn QR | 🔴 Ẩn QR | **Ẩn QR thu tiền**. Hiển thị badge *"Đã hoàn tiền"* | 0 VND |
| 8 | **Đã Hủy** | 🔴 Ẩn QR | 🔴 Ẩn QR | **Ẩn QR thu tiền**. Hiển thị badge *"Đã hủy đơn hàng"* | 0 VND |

---

## IV. ĐỀ XUẤT ĐỔI CODE & TỐI ƯU TRONG `OrderDetailModal.tsx` & `OrderTable.tsx`
1. Cập nhật điều kiện render `vietQrUrl` trong `OrderDetailModal.tsx` và trong Dropdown `OrderTable.tsx`:
   - Chỉ tạo & hiển thị VietQR thu tiền đối với đơn hàng ở trạng thái **Chưa Thanh Toán**, **Cần Gia Hạn**, **Hết Hạn**, hoặc **Đang Xử Lý** (nếu chưa thu tiền).
   - Với đơn **Đã Thanh Toán**, **Đã Hoàn**, **Đã Hủy**, thay thế vùng QR bằng Thông báo trạng thái tương ứng.
   - Với đơn **Chưa Hoàn**, hiển thị Form/Box thông tin tài khoản nhận tiền hoàn thay vì mã QR thu tiền.
2. Với đơn nhập hàng (**MAVN**):
   - Quét mã QR là chuyển khoản cho **Nhà cung cấp (NCC)** với số tiền bằng `order.cost`.
   - Nếu NCC chưa bổ sung STK/Mã ngân hàng -> Hiển thị cảnh báo *"Chưa có STK NCC trên hệ thống"*.

---

## V. TỐI ƯU 4 THẺ THỐNG KÊ KÉP (DUAL-STAT CARDS)
[x] Gom 8 chỉ số của v1 vào 4 thẻ hiển thị ở đầu trang v2.

---

## VI. TẤM THẺ CHỈ SỐ THÍCH ỨNG THEO TAB (TAB-ADAPTIVE STAT CARDS)
[x] Đã hoàn thành cấu hình 4 thẻ chỉ số động hiển thị theo đúng mục đích nghiệp vụ từng Tab:
1. **Tab Đơn Bán Khách Hàng (`active`)**:
   - TỔNG GIÁ BÁN (Giá nhập / Vốn)
   - ĐĂNG KÝ HÔM NAY (Tổng hệ thống)
   - CẦN GIA HẠN (Đang xử lý)
   - GIÁ TRỊ CÒN LẠI (Đã thanh toán)
2. **Tab Đơn Nhập Kho & NCC (`import`)**:
   - TỔNG VỐN NHẬP KHO (Giá bán niêm yết)
   - NHẬP KHO HÔM NAY (Tổng đơn nhập kho)
   - ĐÃ THANH TOÁN NCC (Đang xử lý NCC)
   - VỐN NCC CÒN HẠN (Giá bán còn lại)
3. **Tab Đơn Hết Hạn (`expired`)**:
   - TỔNG ĐƠN HẾT HẠN (Hết hạn hôm nay)
   - CẦN GIA HẠN GẤP (Đang xử lý)
   - DOANH THU ĐƠN HẾT HẠN (Tổng giá vốn)
   - GIÁ TRỊ ĐÃ GIA HẠN (Đã gia hạn lại)
4. **Tab Hoàn Tiền & Đã Hủy (`canceled`)**:
   - TIỀN CẦN HOÀN KHÁCH (Đã hoàn xong cho khách)
   - VỐN THU HỒI TỪ NCC (Vốn đơn đã hủy)
   - ĐƠN CHỜ HOÀN TIỀN (Đã hoàn xong)
   - TỔNG ĐƠN ĐÃ HỦY (Hủy hôm nay)


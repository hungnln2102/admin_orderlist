# BẢN MÔ TẢ CÁC TÍNH NĂNG HỆ THỐNG QUẢN LÝ ĐƠN HÀNG (VER 2)

Tài liệu này giải thích toàn bộ các chức năng của hệ thống Quản lý Đơn hàng (Phiên bản 2) theo cách diễn đạt đơn giản, dễ hiểu, không sử dụng các thuật ngữ kỹ thuật chuyên ngành.

---

## 📦 1. QUẢN LÝ ĐƠN HÀNG

### 🔹 1.1. Tạo mới đơn hàng
* **Cách hoạt động**: 
  * Khi nhập hoặc chọn một sản phẩm từ danh mục có sẵn (ví dụ: *ChatGPT Plus 1 Tháng*), hệ thống sẽ tự động điền giá bán, tính ra số ngày sử dụng và ngày hết hạn.
  * Hệ thống tự động gợi ý Nhà cung cấp (NCC) đang bán sản phẩm đó với giá nhập rẻ nhất để tiết kiệm chi phí.
  * Bạn có thể nhập thông tin liên hệ của khách hàng (SĐT, Zalo, Facebook) và thông tin tài khoản/slot giao cho khách.
  * Khi bấm **Tạo Đơn Hàng Mới**, đơn hàng sẽ được lưu vào hệ thống với trạng thái mặc định là **"Chưa Thanh Toán"**.

### 🔹 1.2. Tra cứu và lọc đơn hàng
* **Tìm kiếm nhanh**: Có thể gõ tìm kiếm theo Mã đơn hàng (ví dụ: `MAV123456`), Tên khách hàng, Số điện thoại hoặc Tên sản phẩm.
* **Lọc theo khoảng ngày**: Chọn khoảng ngày đặt hàng để xem danh sách đơn được tạo trong thời gian đó.
* **Phân loại 4 danh mục đơn hàng**:
  1. **Đơn Bán Khách Hàng**: Chứa tất cả các đơn bán lẻ cho khách hoặc cộng tác viên đang sử dụng bình thường.
  2. **Đơn Nhập Kho & NCC**: Dùng để theo dõi các đơn hàng vốn nhập tài nguyên từ Nhà cung cấp.
  3. **Đơn Hết Hạn**: Danh sách các đơn hàng đã quá hạn sử dụng dịch vụ.
  4. **Hoàn Tiền & Đã Hủy**: Danh sách các đơn hàng đã hủy hoặc cần trả lại tiền cho khách.

### 🔹 1.3. Chỉnh sửa thông tin đơn hàng
* Cho phép thay đổi thông tin khách hàng, cập nhật lại giá bán, giá nhập vốn, ngày hết hạn hoặc chuyển đổi trạng thái thanh toán.

### 🔹 1.4. Yêu cầu gia hạn đơn hàng
* Khi khách hàng muốn dùng tiếp sản phẩm sau khi hết hạn, bạn chọn thao tác **Gia Hạn**.
* Hệ thống sẽ chuyển trạng thái đơn thành **"Cần Gia Hạn"** và tự động gắn một số lẻ nhỏ (từ 1 đến 100 đồng) vào giá tiền.
* Khi khách hàng chuyển khoản đúng số tiền lẻ đó qua ngân hàng, hệ thống sẽ tự nhận biết khách nào vừa trả tiền gia hạn mà không bị nhầm lẫn với các đơn hàng khác.

### 🔹 1.5. Xóa và Hủy đơn hàng (Xử lý thông minh)
* **Đơn chưa thanh toán**: Khi xóa, đơn hàng sẽ bị xóa hoàn toàn khỏi danh sách.
* **Đơn đã thanh toán**: Khi chọn xóa, hệ thống không xóa mất dữ liệu mà tự động chuyển đơn sang danh sách **"Chưa Hoàn Tiền"** để quản trị viên biết và làm thủ tục trả lại tiền cho khách.
* **Đơn cần gia hạn**: Khi chọn xóa, đơn sẽ chuyển sang danh sách **"Hết Hạn"** do khách ngừng không sử dụng tiếp.

### 🔹 1.6. Xem chi tiết đơn hàng
* Hiển thị đầy đủ thông tin: Người mua, giá bán, giá vốn nhập từ NCC, ngày mua, ngày hết hạn, số ngày còn dùng được và số tiền còn lại tương ứng với số ngày chưa sử dụng.

---

## 🏷️ 2. QUẢN LÝ DANH MỤC SẢN PHẨM & BẢNG GIÁ

### 🔹 2.1. Quản lý danh sách sản phẩm
* Lưu trữ danh sách tất cả các gói sản phẩm/dịch vụ đang kinh doanh (như ChatGPT, Canva, Netflix, Youtube Premium...).
* Cài đặt sẵn các mức giá: Giá bán lẻ cho khách, giá chiết khấu cho Cộng tác viên (CTV), giá ưu đãi sinh viên và giá vốn nhập.

### 🔹 2.2. So sánh giá nhà cung cấp
* Cho phép một sản phẩm được nhập từ nhiều Nhà cung cấp khác nhau.
* Hệ thống hiển thị bảng so sánh để quản trị viên biết NCC nào đang cung cấp giá rẻ nhất và ổn định nhất.

---

## 🏢 3. QUẢN LÝ NHÀ CUNG CẤP (NCC)

### 🔹 3.1. Danh bạ nhà cung cấp
* Lưu giữ danh sách các đối tác/nguồn nhập hàng bao gồm: Tên NCC, Số tài khoản ngân hàng, Tên ngân hàng để thuận tiện khi chuyển tiền mua hàng.

### 🔹 3.2. Theo dõi biến động giá nhập
* Lưu lại lịch sử mỗi lần Nhà cung cấp tăng hoặc giảm giá nhập, giúp cửa hàng điều chỉnh lại giá bán cho phù hợp để bảo đảm lợi nhuận.

---

## 💰 4. QUẢN LÝ VÍ TIỀN & SỔ CÁI TÀI CHÍNH

### 🔹 4.1. Theo dõi số dư tài khoản
* Hiển thị số dư tiền mặt trên ngân hàng và số dư ví điện tử (USDT).
* Tự động cộng tiền vào ví khi đơn hàng được thanh toán thành công và trừ tiền khi có giao dịch chi hoàn tiền hoặc mua hàng.

### 🔹 4.2. Nhật ký giao dịch
* Ghi lại chi tiết từng khoản thu / chi theo thời gian thực, giúp quản trị viên kiểm soát toàn bộ dòng tiền vào - ra của cửa hàng.

---

## ⚡ 5. TỰ ĐỘNG XỬ LÝ THANH TOÁN QUA NGÂN HÀNG

### 🔹 5.1. Tự động nhận tiền chuyển khoản (Sepay / VietQR)
* Khi khách hàng quét mã QR hoặc chuyển khoản ngân hàng có kèm mã đơn hàng hoặc đúng số tiền lẻ hệ thống tạo ra:
  * Ngân hàng báo có tiền đến $\rightarrow$ Hệ thống tự động kiểm tra và chuyển trạng thái đơn hàng từ **"Chưa Thanh Toán"** sang **"Đã Thanh Toán"**.
  * Quản trị viên không cần phải chụp ảnh màn hình hay vào app ngân hàng kiểm tra thủ công.

---

## 🔐 6. BẢO MẬT & ĐĂNG NHẬP

### 🔹 6.1. Đăng nhập quản trị
* Yêu cầu nhập Tên đăng nhập và Mật khẩu trước khi truy cập vào trang quản trị.
* Giữ an toàn cho dữ liệu khách hàng, danh sách đơn hàng và thông tin tài chính của cửa hàng.

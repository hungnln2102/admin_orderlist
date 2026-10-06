# HƯỚNG DẪN SỬ DỤNG VÀ DANH MỤC TOÀN BỘ TÍNH NĂNG & NÚT BẤM (README V2)

Tài liệu này liệt kê **đầy đủ 100% tất cả các tính năng, ô nhập liệu, bộ lọc, quy trình tự động và từng nút bấm (buttons)** cho tất cả 7 trang trong hệ thống **Admin Store V2** bằng ngôn ngữ nghiệp vụ dân dã, dễ hiểu nhất cho chủ shop và nhân viên vận hành.

---

## 🏬 TỔNG QUAN HỆ THỐNG

Hệ thống **Admin Store V2** là phần mềm quản lý toàn diện dành cho cửa hàng kinh doanh sản phẩm kỹ thuật số, tài khoản phần mềm và dịch vụ bản quyền (Adobe, Canva, Netflix, ChatGPT, Spotify...). 

Giao diện được thiết kế hiện đại (Glassmorphic Dark Mode), dễ sử dụng và hiển thị tối ưu trên cả **máy tính** (Bảng dữ liệu chi tiết) và **điện thoại di động** (Dạng Thẻ Card).

---

## 1. TRANG ĐƠN HÀNG (QUẢN LÝ BÁN HÀNG & NHẬP HÀNG) - `OrdersPage`

Trang **Đơn Hàng** là trung tâm điều hành mọi hoạt động mua bán của shop.

### 1.1. Các Tập Dữ Liệu (4 Tab Đơn Hàng) & Quy Tắc Ưu Tiên Sắp Xếp
- **Tự Động Sắp Xếp Ưu Tiên Lên Đầu:** Các đơn hàng ở trạng thái **`Chưa Thanh Toán`** sẽ tự động được hệ thống ưu tiên đẩy lên vị trí đầu tiên của bảng danh sách đơn hàng để người quản lý dễ dàng theo dõi và thu tiền.
- **Nút Tab `Đơn Khách Hàng (active)`:** Xem tất cả đơn bán lẻ, bán cho Cộng tác viên (CTV), Học sinh - Sinh viên, hoặc đơn Khuyến mãi.
- **Nút Tab `Đơn Nhập Kho (import)`:** Xem các đợt mua sỉ/nhập kho hàng từ Nhà cung cấp (các đơn mang mã `MAVN`).
- **Nút Tab `Đơn Hết Hạn (expired)`:** Xem các đơn hàng đã hết hạn hoặc sắp đến ngày hết hạn sử dụng.
- **Nút Tab `Đơn Đã Hủy / Hoàn (canceled)`:** Xem các đơn hàng đã bị hủy hoặc đã hoàn lại tiền/credit cho khách.

---

### 1.2. Thanh Công Cụ Bộ Lọc & Thống Kê (`OrderFilterBar`)
- **Ô nhập `Tìm kiếm`:** Gõ tìm nhanh theo Tên khách hàng, Số điện thoại/Contact, Email, Mã đơn hàng (VD: `MAVC98A2`), Tên sản phẩm, Tên nhà cung cấp.
- **Dropdown `Trạng thái`:** Lọc đơn theo các trạng thái: *Tất cả trạng thái*, *Chưa thanh toán*, *Đã thanh toán*, *Đang xử lý*, *Hoàn thành*, *Cần gia hạn*, *Hết hạn*.
- **Ô chọn `Từ ngày` & `Đến ngày`:** Lọc danh sách đơn hàng được tạo trong khoảng thời gian cụ thể.
- **Thẻ Thống Kê Nhanh (Hiển thị con số thực tế):**
  - *Tổng doanh thu bán hàng* (VND).
  - *Tổng chi phí giá vốn nhập* (VND).
  - *Tổng tiền lãi ròng* (VND).
  - *Số đơn đã thanh toán xong*.
  - *Số đơn đang chờ xử lý*.
  - *Số đơn cần gia hạn*.
  - *Số đơn tạo mới hôm nay*.
  - *Tổng tiền giá trị còn lại (Pro-rata)* của các đơn đang chạy.

---

### 1.3. Nút "Tạo Đơn Hàng Mới" & Modal Nhập Đơn (`OrderCreateEditModal`)

Khi bấm nút **"Tạo Đơn Hàng Mới"** (Màu xanh dương ở góc trên), cửa sổ nhập đơn sẽ xuất hiện với các nút bấm và ô nhập:

#### A. Các Ô Nhập & Nút Bấm Trên Form Tạo Đơn:
1. **Dropdown `Loại Mã Đơn (Tiền Tố)`:** Chọn loại đơn hàng để hệ thống tự động nhảy giá bán & thiết lập trạng thái:
   - **`MAVC` (Đơn CTV):** Tự động điền **Giá Bán CTV**. Trạng thái: *Chưa thanh toán*.
   - **`MAVL` (Đơn Khách Lẻ):** Tự động điền **Giá Bán Lẻ**. Trạng thái: *Chưa thanh toán*.
   - **`MAVK`** (Đơn Khuyến Mãi): Tự động điền **Giá Giảm Giá/Khuyến Mãi**. Trạng thái: *Chưa thanh toán*.
   - **`MAVS`** (Đơn Học Sinh/Sinh Viên): Tự động điền **Giá Ưu Đãi HSSV**. Trạng thái: *Chưa thanh toán*.
   - **`MAVT`** (Đơn Quà Tặng/Tri Thức): Tự động điền **0 ₫**. Trạng thái: *Chưa thanh toán*.
   - **`MAVN`** (Đơn Nhập Kho): Tự động điền **Giá Gốc Nhập**, Tự điền Khách hàng = "Mavryk", Trạng thái = **`Đã Thanh Toán`**.
2. **Dropdown `Sản Phẩm`:** Tự động nạp danh sách gói sản phẩm. Khi chọn sản phẩm:
   - Tự động nhảy giá bán tương ứng với Loại Mã Đơn.
   - Tự đọc thời hạn gói (VD: 12 tháng, 6 tháng) ➔ **Tự cộng số ngày vào Ngày Mua để ra Ngày Hết Hạn chính xác**.
   - Tự động nạp danh sách các Nhà cung cấp bán gói này.
3. **Dropdown `Nhà Cung Cấp`:** Chọn đối tác nhập hàng ➔ Tự động nạp **Giá nhập gốc (`cost`)**.
4. **Nút Bật/Tắt `Nhập Giá Tùy Chỉnh`:** Cho phép bạn tự sửa giá bán khác với giá niêm yết trong bảng giá.
5. **Ô Nhập `Tên Khách Hàng` & `Số Điện Thoại / Contact`:** Nhập thông tin người mua.
6. **Ô Nhập `Vị Trí Slot / Thông Tin Tài Khoản`:** Điền email/slot bàn giao cho khách.
7. **Nút `Hủy Bỏ`:** Đóng cửa sổ nhập đơn không lưu.
8. **Nút `Xác Nhận Tạo Đơn`:**
   - Tự động sinh mã đơn không trùng (VD: `MAVC98A2F1`).
   - Tự động lưu thông tin khách mới vào danh bạ nếu là khách hàng mới.
   - Tự động tính Tiền lời = `Giá bán - Giá nhập`.
   - Tự động phát sự kiện cập nhật kho và **TỰ ĐỘNG BẬT CỬA SỔ VIETQR THU TIỀN**.

---

### 1.4. Bảng Dữ Liệu Đơn Hàng (`OrderTable`) & Nút Bấm Trên Mỗi Dòng
- **Nút `ChevronDown / ChevronRight` (Bấm vào dòng đơn):** Mở rộng dòng để xem chi tiết vị trí Slot kho hoặc ghi chú bàn giao.
- **Nút `Xem Chi Tiết` (Icon Con mắt):** Mở Modal Chi Tiết Đơn Hàng & Mã VietQR (`OrderDetailModal`).
- **Nút `Chỉnh Sửa` (Icon Cây bút):** Mở Modal sửa đơn hàng (cho phép sửa tên khách, SĐT, giá bán, giá nhập, ngày hết hạn, trạng thái).
- **Nút `Hủy / Xóa Đơn` (Icon Thùng rác):** Mở Modal xác nhận Hủy đơn (`OrderDeleteModal`).
- **Nút Phân Trang (`<` Trang trước, `>` Trang sau):** Chuyển trang danh sách đơn.

---

### 1.5. Cửa Sổ Chi Tiết Đơn Hàng & Mã VietQR (`OrderDetailModal`)
- **Cột Trái (Thông Tin Đơn Hàng):** Hiển thị Mã đơn, Khách hàng, SĐT, Sản phẩm, Giá bán, Trạng thái, Ngày mua, Ngày hết hạn.
- **Cột Phải (Mã QR Thanh Toán Ngân Hàng VietQR):** In mã QR MBBank tự động nạp sẵn Số TK, Tên chủ TK, Số tiền đơn hàng và Nội dung chuyển khoản (`MAVC...`).
- **Nút `Sao Chép Mã Đơn Hàng`:** Chép nhanh mã đơn.
- **Nút `Sao Chép Văn Bản Bàn Giao`:** 1-Click chép toàn bộ Email, Mật khẩu, Mã 2FA và Hướng dẫn sử dụng để gửi ngay cho khách qua Zalo/Facebook/Telegram.
- **Nút `Gia Hạn Đơn Hàng`:** Mở form gia hạn thêm thời gian sử dụng khi khách mua thêm.
- **Nút `Đóng`:** Đóng cửa sổ modal.

---

### 1.6. Quy Trình Hủy / Xóa Đơn Hàng (`OrderDeleteModal`)
Khi bạn bấm nút **"Xác Nhận Hủy Đơn"**, hệ thống tự động thực hiện 4 bước:
1. Đổi trạng thái đơn thành **Đã Hủy**.
2. **Tự động tính số tiền hoàn trả theo số ngày chưa dùng (Pro-rata):**
   $$\text{Tiền Hoàn} = \text{Giá Bán} \times \left(\frac{\text{Ngày Hết Hạn} - \text{Ngày Hiện Tại}}{\text{Tổng Số Ngày Gói}}\right)$$
3. **Thu Hồi Tài Khoản/Key Trong Kho:** Trả vị trí tài khoản/slot key bản quyền về trạng thái **Sẵn Hàng (AVAILABLE)** để bạn bán tiếp cho khách khác.
4. **Nạp Tiền Vào Ví Credit Của Khách:** Tự động nạp số tiền hoàn lại vào Ví Credit của khách để trừ dần cho các đơn mua sau.

---

## 2. TRANG BẢNG GIÁ & CHI PHÍ NHẬP (QUẢN LÝ GIÁ BÁN & VỐN) - `PricingPage`

Trang **Bảng Giá** giúp bạn quản lý giá bán cho các đối tượng khách hàng và theo dõi giá vốn nhập hàng.

### 2.1. Thanh Tiêu Đề & Bộ Lọc (`PricingFilterBar`)
- **Nút `Thêm Sản Phẩm Mới`:** Mở modal khai báo gói sản phẩm và các mức giá niêm yết mới.
- **Ô nhập `Tìm kiếm`:** Tìm nhanh tên gói sản phẩm.
- **Dropdown `Chuyên mục`:** Lọc sản phẩm theo nhóm (Thiết kế đồ họa, Giải trí & Phim, AI, Âm nhạc, Văn phòng...).

### 2.2. Bảng Danh Mục Giá (`PricingTable`)
Nơi hiển thị danh sách sản phẩm với các cột giá: Giá vốn gốc (`base_price`), Giá CTV (`ctv_price`), Giá lẻ (`retail_price`), Giá khuyến mãi (`promo_price`), Giá HSSV (`student_price`), Mức lời dự kiến (Margin).
- **Nút `Quản Lý Chi Phí NCC` (Icon Đô la/NCC trên dòng):** Mở Modal quản lý danh sách các Nhà cung cấp cùng bán gói này (`SupplierCostModal`).
- **Nút `Chỉnh Sửa Giá` (Icon Cây bút):** Mở Modal sửa các mức giá bán và giá vốn (`PricingCreateEditModal`).
- **Nút `Xóa Sản Phẩm` (Icon Thùng rác):** Mở Modal xác nhận xóa sản phẩm khỏi bảng giá (`PricingDeleteModal`).

### 2.3. Modal Quản Lý Chi Phí NCC (`SupplierCostModal`)
- **Nút `Thêm Giá Nhập NCC`:** Khai báo thêm một NCC mới bán sản phẩm này với giá nhập cụ thể.
- **Nút `Đặt NCC Ưu Tiên` (Icon Ngôi sao):** Đánh dấu NCC chính để hệ thống tự động điền giá nhập khi bạn chọn bán gói này.
- **Nút `Xóa Chi Phí NCC` (Icon Thùng rác):** Xóa dòng giá nhập của NCC đó.

---

## 3. TRANG NHÀ CUNG CẤP (QUẢN LÝ ĐỐI TÁC & CÔNG NỢ) - `SuppliersPage`

Trang **Nhà Cung Cấp** giúp bạn theo dõi đối tác cung cấp tài khoản/key cho shop.

### 3.1. Thẻ Thống Kê Tổng Quan
- *Tổng số Nhà cung cấp*.
- *Tổng tiền chi mua hàng*.
- *Công nợ shop còn thiếu NCC*.

### 3.2. Thanh Bộ Lọc & Nút Bấm (`SupplierFilterBar` & `SupplierOverviewTable`)
- **Nút `Thêm Nhà Cung Cấp Mới`:** Mở modal khai báo NCC mới (`SupplierCreateEditModal`).
- **Ô nhập `Tìm kiếm`:** Tìm theo Tên NCC, SĐT, Email, Tên ngân hàng, STK.
- **Nút `Xem Chi Tiết Công Nợ` (Icon Con mắt):** Mở Modal xem toàn bộ danh sách các đợt nhập hàng (`MAVN`) và lịch sử dư nợ với NCC này (`SupplierDetailModal`).
- **Nút `Chỉnh Sửa` (Icon Cây bút):** Mở Modal sửa Tên NCC, SĐT, Email, Ngân hàng, STK, Ghi chú.
- **Nút `Xóa NCC` (Icon Thùng rác):** Mở Modal xác nhận xóa đối tác NCC (`SupplierDeleteModal`).

---

## 4. TRANG TÀI KHOẢN THANH TOÁN & VÍ (QUẢN LÝ DÒNG TIỀN) - `PaymentWalletsPage`

Trang **Tài Khoản Thanh Toán & Ví** quản lý các cổng nhận tiền chuyển khoản và ví mã hóa Crypto.

### 4.1. Thanh Tiêu Đề & Nút Chuyển Tab
- **Nút `Làm Mới Dữ Liệu` (Icon Refresh):** Nạp lại danh sách tài khoản & tỷ giá trực tuyến.
- **Nút `Thêm STK / Ví USDT Mới`:** Mở modal tạo mới tài khoản thanh toán (`WalletCreateEditModal`).
- **Nút Tab `Tài Khoản Thanh Toán Ngân Hàng`:** Xem danh sách STK ngân hàng dùng để nhận chuyển khoản QR VietQR.
- **Nút Tab `Quản Lý Ví USDT Quốc Tế`:** Xem danh sách địa chỉ ví USDT (TRC20, BEP20...).

### 4.2. Tab Ngân Hàng (`BankAccountsTable`)
- **Nút `Đặt Mặc Định` (Icon Ngôi sao):** Chọn ngân hàng chính để tự động in mã QR VietQR khi tạo đơn hàng.
- **Nút `Rút Tiền` (Icon Mũi tên lên):** Mở Modal ghi nhận các đợt rút tiền mặt/chi phí ra khỏi tài khoản shop (`WithdrawModal`).
- **Nút `Sửa` (Icon Cây bút):** Mở Modal sửa STK, Tên chủ thẻ, Tên ngân hàng, Mã BIN, Tiền tố QR.
- **Nút `Xóa` (Icon Thùng rác):** Mở Modal xóa tài khoản ngân hàng (`WalletDeleteModal`).

### 4.3. Tab Ví USDT Crypto (`UsdtWalletsTable`)
- **Tự động Cập Nhật Tỷ Giá Trực Tuyến:** Lấy tỷ giá USDT/VND mới nhất từ sàn **Binance API** để tự động tính giá trị quy đổi VND tương đương.
- **Nút `Sao Chép Địa Chỉ Ví` (Icon Copy):** 1-Click chép chuỗi địa chỉ ví Crypto.
- **Nút `Đặt Mặc Định` (Icon Ngôi sao):** Chọn ví USDT chính.
- **Nút `Rút USDT`:** Mở Modal ghi nhận đợt rút tiền USDT khỏi ví shop.
- **Nút `Sửa` / `Xóa`:** Sửa địa chỉ ví, mạng lưới (TRC20, BEP20, ERC20, Polygon) hoặc xóa ví.

---

## 5. KHO HÀNG & KEY 2FA (QUẢN LÝ TÀI KHOẢN BẢN QUYỀN) - `WarehousePage`

Trang **Kho Hàng** quản lý chi tiết từng tài khoản kho Master và các vị trí Slot key bản quyền (Adobe, Canva, Netflix, ChatGPT, Spotify...).

### 5.1. Thanh Tiêu Đề & Bộ Lọc (`WarehouseFilterBar`)
- **Nút `Làm Mới`:** Nạp lại dữ liệu tồn kho.
- **Nút `Xuất Excel`:** Xuất file Excel danh sách tài khoản kho.
- **Nút `Tạo Mới Kho`:** Mở modal thêm tài khoản kho Master mới (`WarehouseCreateModal`).
- **Nút Tab `Tài Khoản Kho & Slot Key`:** Xem danh sách tài khoản kho theo cấu trúc Cây (Tài khoản cha ➔ Các Slot con).
- **Nút Tab `Danh Mục Tên Dịch Vụ`:** Xem bảng tổng quan danh mục sản phẩm tồn kho (`WarehouseCatalogGrid`).
- **Dropdown `Danh mục` & `Trạng thái`:** Lọc kho theo nhóm dịch vụ hoặc trạng thái (*Có Slot Sẵn*, *Đã Giữ Chỗ*, *Hết Hạn*).

### 5.2. Bảng Tài Khoản Kho (`WarehouseAccountsTable`) & Nút Bấm
- **Nút `ChevronDown / ChevronUp` (Bấm vào dòng tài khoản):** Đóng/mở danh sách các Slot key con bên trong tài khoản kho Master.
- **Nút `Sao Chép Email Kho` (Icon Copy):** Chép nhanh email đăng nhập Master.
- **Nút `Sửa Tài Khoản` (Icon Cây bút):** Mở modal sửa email/thông tin tài khoản kho.
- **Nút `Xóa Tài Khoản` (Icon Thùng rác):** Mở popup xác nhận xóa tài khoản kho và giải phóng các slot.
- **Nút `Thêm Slot Mới`:** Thêm một slot key mới vào tài khoản kho này.
- **Nút Bấm Trong Từng Card Slot Key Con:**
  - **Nút `Eye` / `EyeOff` (Hiện / Ẩn Mật Khẩu):** Đổi hiển thị mật khẩu từ `••••••••` sang chữ rõ để xem hoặc ẩn đi để bảo mật.
  - **Nút `Sao Chép Mật Khẩu`:** Chép nhanh mật khẩu đăng nhập.
  - **Nút `Sao Chép Mã 2FA`:** 1-Click chép mã 2FA Secret Key để tạo mã OTP 6 số.

---

## 6. QUẢN LÝ LOẠI GÓI (PHÂN LOẠI THEO THƯƠNG HIỆU) - `PackageManagementPage`

Trang **Quản Lý Loại Gói** nhóm các sản phẩm theo thương hiệu (Adobe, Canva, Gemini, Netflix, Spotify...).

### 6.1. Thẻ Tóm Tắt Thương Hiệu (`PackageCategoryCards`)
- **Nút Bấm Chọn Thẻ Thương Hiệu (Adobe, Canva...):** Bấm vào thẻ để lọc danh sách gói bên dưới theo thương hiệu đó.
- **Nút `Xem Danh Sách` (Icon Con mắt trên thẻ):** Chọn xem các gói thuộc loại đó.
- **Nút `Chỉnh Sửa Loại Gói` (Icon Cây bút trên thẻ):** Mở modal đổi tên thương hiệu/loại gói (`CategoryModal`).
- **Nút `Tạo Loại Gói` (Góc trên):** Mở modal tạo thêm thương hiệu loại gói mới.

### 6.2. Bảng Dữ Liệu Gói & Lưới Vị Trí Slot (`PackageTable`)
- **Nút Mở Rộng Dòng (Click vào tên gói):** Mở Lưới vị trí Slot (Grid Slots).
- **Lưới Vị Trí Slot (Grid Slots):** Hiển thị trực quan từng ô Slot 1, Slot 2, Slot 3... 
  - Nếu Slot đã bán: Hiển thị tên khách, SĐT, Mã đơn hàng (`MAVC...`) và chữ **ĐÃ DÙNG**.
  - Nếu Slot chưa bán: Hiển thị màu xanh lá và chữ **AVAILABLE** (Sẵn sàng bán).
- **Nút `Sửa Thông Tin Gói` (Icon Cây bút):** Mở modal sửa Tên gói, Email tài khoản, Số slot đã dùng, Tổng số slot, Giá nhập, NCC, Ngày hết hạn (`PackageCreateEditModal`).
- **Nút `Xem Chi Tiết` (Icon Con mắt):** Mở modal xem thông tin tóm tắt gói (`PackageDetailModal`).
- **Nút `Xóa Gói` (Icon Thùng rác):** Xóa gói khỏi kho.

---

## 8. BIÊN LAI THANH TOÁN & ĐỐI SOÁT (QUẢN LÝ GIAO DỊCH NGÂN HÀNG & PHÂN BỔ SỐ DƯ) - `ReceiptsPage`

Trang **Biên Lai Thanh Toán & Đối Soát** nằm trong mục **Bán Hàng & Đơn Hàng**, giúp chủ shop quản lý toàn bộ dòng tiền vào/ra từ ngân hàng (SePay, VietQR, Chuyển khoản thủ công) theo cơ chế **đối soát và phân bổ số dư linh hoạt**.

### 8.1. Các Thẻ Thống Kê & 3 Tập Dữ Liệu Tab Biên Lai
- **Thẻ Card `TỔNG BIÊN LAI ĐƠN` (`orders`):** Quản lý toàn bộ biên lai đã được phân bổ thành công cho các Đơn Hàng (`#MAV...`).
- **Thẻ Card `CHI PHÍ & NGOÀI LUỒNG` (`other`):** Quản lý các biên lai giao dịch Tiền Ra (Chi phí / Nhập hàng / Thanh toán NCC) hoặc giao dịch được phân bổ vào các hạng mục chi phí vận hành.
- **Thẻ Card `CHƯA ĐƯỢC LIỆT KÊ` (`unlisted`):** Quản lý các biên lai tự do chưa được phân bổ hết số dư (`status = UNALLOCATED`), tiền thừa còn khả dụng.
*Người dùng có thể bấm trực tiếp vào từng Thẻ Card Thống Kê để chuyển qua lại giữa 3 tập dữ liệu biên lai.*

### 8.2. Cơ Chế Phân Bổ & Phân Tách Số Dư Biên Lai (Receipt Balance Allocation)
- **Tự Động Tạo & Gán Biên Lai Từ Webhook Ngân Hàng (SePay / VietQR):**
  - Khi ngân hàng báo giao dịch **Tiền Vào**: Hệ thống tự động lưu vết tạo ngay một **Biên lai mới**.
  - **Tự Động Khớp Đơn:** Nếu số tiền khớp vừa đúng giá của đơn hàng đang chờ (hoặc nội dung có mã đơn `MAV...`), hệ thống tự động đổi trạng thái đơn sang **`Đã Thanh Toán`** (hoặc tự tính cộng thêm ngày gia hạn), tự động gán biên lai cho đơn và đánh dấu biên lai là **`Đã Phân Bổ Hoàn Toàn`**.
  - **Tự Động Liệt Kê Chờ Duyệt (Chưa Phân Bổ):** Nếu số tiền tiền vào không trùng khớp với đơn nào (hoặc khách chuyển thừa/chuyển lẻ), biên lai sẽ tự động nằm tại **Tab Chưa Được Liệt Kê** (`UNALLOCATED`) để chủ shop chủ động gán tay hoặc xử lý sau.
  - **Tự Động Ghi Nhận Tiền Ra:** Mọi giao dịch chuyển tiền ra khỏi tài khoản ngân hàng sẽ được lưu vết vào **Tab Chi Phí & Ngoài Luồng** (`other`).
- **Immutability (Bảo tồn giao dịch ngân hàng gốc):** Biên lai gốc giữ nguyên số tiền nhận/chuyển từ ngân hàng.
- **Phân bổ đa dạng (Split Allocation):** 1 biên lai có thể được gán/khấu trừ cho nhiều đơn hàng khác nhau hoặc nạp vào Ví Credit khách cho đến khi số tiền còn dư bằng 0 ₫.

### 8.3. Bộ Lọc & Tìm Kiếm Biên Lai
- **Ô nhập `Tìm kiếm thông tin...`:** Tìm nhanh theo Mã đơn gốc, Tên người gửi, Mã giao dịch tham chiếu, Mã giao dịch SePay, Ghi chú chuyển khoản.
- **Dropdown `Bộ lọc tất cả`:** Lọc theo hướng tiền: *Bộ lọc tất cả*, *Tiền Vào (Khách chuyển)*, *Tiền Ra (Chi phí / NCC)*.

### 8.4. Bảng Dữ Liệu Biên Lai Tự Động Tùy Biến Cột Theo Tab, Nút Gán Đơn & Modal Phân Bổ
- **Tab `Đơn Khách Hàng` (`orders`):** Cột hiển thị: `MÃ ĐƠN GỐC` (`#MAVC...`), `SỐ TIỀN`, `NGƯỜI GỬI`, `NGÀY THANH TOÁN`.
- **Tab `Chi Phí & Ngoài Luồng` (`other`):** Cột hiển thị linh hoạt cho cả dòng Tiền Vào (Tip, Hoàn tiền...) và Tiền Ra (Thanh toán NCC, Server, Chi vận hành...): `HẠNG MỤC / LOẠI GIAO DỊCH` (VD: `#MAVN...`, `Thanh Toán NCC`, `Chi Phí Vận Hành`, `Tiền Ra Ngân Hàng`, `Tiền Vào Ngân Hàng`), `SỐ TIỀN CHI/THU`, `ĐỐI TÁC / NỘI DUNG` (Tài khoản nhận/người gửi & ghi chú ngân hàng), `NGÀY GIAO DỊCH`.
- **Tab `Chưa Được Liệt Kê` (`unlisted`):** Cột hiển thị: `MÃ GIAO DỊCH / REF` (Mã SePay / Mã Ref), `SỐ TIỀN CÒN DƯ` (Số tiền khả dụng chưa phân bổ), `NGƯỜI GỬI / GHI CHÚ`, `NGÀY NHẬN TIỀN`.
- **Nút `Gán Đơn` (Icon Link):** Xuất hiện trên từng dòng biên lai chưa được liệt kê hoặc còn số dư chưa gán. Bấm để mở Modal `AllocateReceiptModal`.
- **Nút `Xem Chi Tiết` (Icon Con mắt):** Mở cửa sổ xem thông tin toàn bộ giao dịch ngân hàng, ngân hàng nhận, nội dung ghi chú và mã giao dịch SePay.

---

## 9. TRANG CẤU HÌNH HỆ THỐNG (QUẢN LÝ THÔNG SỐ VẬN HÀNH & THÔNG BÁO TELEGRAM) - `SystemPage`

Trang **Cấu Hình Hệ Thống** giúp chủ shop và người quản trị linh hoạt thay đổi các tham số chạy nền (số ngày nhắc hết hạn, tỷ giá tiền, bật/tắt gửi tin Telegram) ngay trên giao diện Web mà không cần khởi động lại máy chủ.

### 9.1. Tab 1: Cấu Hình Vận Hành & Giá (`general`)
- **Khung Cảnh Báo Hết Hạn Đơn Hàng:**
  - **Ô nhập `Số ngày cảnh báo trước khi hết hạn (RENEWAL_WARN_DAYS)`:** Thay đổi số ngày hệ thống bắt đầu quét và tự động gửi tin nhắn nhắc khách hàng gia hạn (VD: 4 ngày).
  - **Nút `Lưu`:** Lưu ngay tham số mới vào hệ thống.
- **Khung Tài Chính & Khớp Thanh Toán:**
  - **Ô nhập `Tỷ giá USDT / VND (USDT_EXCHANGE_RATE)`:** Cập nhật tỷ giá quy đổi tiền điện tử USDT sang tiền Việt Nam Đồng.
  - **Nút gạt `Sepay Auto Match`:** Nút gạt Bật/Tắt tính năng tự động khớp biên lai ngân hàng SePay với đơn hàng chưa thanh toán.

### 9.2. Tab 2: Thông Báo Telegram (`telegram`)
- **Nút gạt tổng `Dịch Vụ Thông Báo Telegram`:** Nút gạt Bật/Tắt toàn bộ tiến trình đẩy tin nhắn lên Telegram. Khi gạt Tắt, hệ thống tạm dừng gửi tin nhắn để tránh làm phiền.
- **Cấu hình Topic ID cho từng loại tin:**
  - **Ô nhập `Topic ID - Đơn Hàng Mới`:** ID nhóm Telegram nhận thông báo mỗi khi có đơn hàng mới được tạo.
  - **Ô nhập `Topic ID - Cảnh Báo Gia Hạn`:** ID nhóm Telegram nhận danh sách đơn hàng sắp hết hạn hoặc đã hết hạn.
  - **Ô nhập `Topic ID - Biến Động Số Dư`:** ID nhóm Telegram nhận thông báo tiền chuyển vào/ra tài khoản ngân hàng.
  - **Ô nhập `Topic ID - Cảnh Báo Lỗi Khẩn Cấp`:** ID nhóm Telegram nhận cảnh báo sự cố kỹ thuật.

### 9.3. Tab 3: Nhật Ký Thông Báo (`logs`)
- **Bảng Nhật Ký Thông Báo (Notification Audit Logs):** Giám sát lịch sử tất cả các tin nhắn đã gửi đi.
  - Hiển thị: Mã ID, Kênh (`TELEGRAM`), Loại sự kiện (`ORDER_CREATED`, `WEBHOOK_MONEY_IN`...), Nội dung tin nhắn, Trạng thái (`SENT` 🟢 - Đã gửi thành công, `FAILED` 🔴 - Lỗi gửi tin), Thời gian phát sinh.
  - **Dropdown `Bộ lọc trạng thái`:** Lọc xem danh sách tin nhắn gửi thành công hoặc các tin bị lỗi để kiểm tra nguyên nhân.

---

## 📝 TỔNG HỢP DANH MỤC CÁC MODAL & CỬA SỔ NỔI TRONG HỆ THỐNG

| Trang | Tên Cửa Sổ Modal | Chức Năng & Các Nút Bấm Chính |
| :--- | :--- | :--- |
| **Orders** | `OrderCreateEditModal` | Thêm/Sửa đơn hàng. *Nút: Chọn Prefix, Chọn Sản phẩm, Chọn NCC, Nhập giá tùy chỉnh, Xác nhận lưu, Hủy.* |
| **Orders** | `OrderDetailModal` | Xem chi tiết đơn & QR ngân hàng. *Nút: Chép Mã Đơn, Chép Văn Bản Bàn Giao, Gia Hạn, Đóng.* |
| **Orders** | `OrderDeleteModal` | Xác nhận hủy đơn & tính tiền hoàn pro-rata. *Nút: Xác Nhận Hủy Đơn, Hủy Bỏ.* |
| **Pricing** | `PricingCreateEditModal` | Thêm/Sửa giá bán niêm yết các đối tượng. *Nút: Lưu Giá, Hủy.* |
| **Pricing** | `SupplierCostModal` | Quản lý giá nhập từ các NCC. *Nút: Thêm Giá Nhập NCC, Đặt NCC Ưu Tiên, Xóa Giá NCC.* |
| **Pricing** | `PricingDeleteModal` | Xác nhận xóa sản phẩm khỏi bảng giá. *Nút: Xóa Sản Phẩm, Hủy Bỏ.* |
| **Suppliers**| `SupplierCreateEditModal`| Khai báo/sửa thông tin đối tác NCC. *Nút: Lưu Thông Tin, Hủy.* |
| **Suppliers**| `SupplierDetailModal` | Xem lịch sử đợt nhập `MAVN` và dư nợ với NCC. *Nút: Đóng.* |
| **Suppliers**| `SupplierDeleteModal` | Xác nhận xóa NCC. *Nút: Xác Nhận Xóa, Hủy Bỏ.* |
| **Wallets** | `WalletCreateEditModal` | Thêm/Sửa STK ngân hàng hoặc địa chỉ ví USDT. *Nút: Cập Nhật/Tạo Mới, Hủy.* |
| **Wallets** | `WithdrawModal` | Ghi nhận đợt rút tiền mặt/USDT. *Nút: Xác Nhận Rút, Hủy.* |
| **Wallets** | `WalletDeleteModal` | Xác nhận xóa tài khoản thanh toán/ví. *Nút: Xóa Tài Khoản, Hủy Bỏ.* |
| **Warehouse**| `WarehouseCreateModal` | Thêm tài khoản kho Master mới. *Nút: Lưu Tài Khoản, Hủy Bỏ.* |
| **Warehouse**| `CatalogCreateModal` | Thêm danh mục tên dịch vụ kho mới. *Nút: Thêm Dịch Vụ, Hủy Bỏ.* |
| **Packages** | `CategoryModal` | Tạo/sửa thương hiệu loại gói. *Nút: Lưu Loại Gói, Hủy.* |
| **Packages** | `PackageCreateEditModal`| Thêm/sửa gói sản phẩm & dung lượng slot. *Nút: Lưu Gói Sản Phẩm, Hủy.* |
| **Packages** | `PackageDetailModal` | Xem thông tin chi tiết gói. *Nút: Đóng.* |
| **Invoices** | `AllocateReceiptModal` | Phân bổ số dư biên lai & gán mã đơn/hạng mục chi phí/khách tip. *Nút: Chọn 4 Loại Phân Bổ (Đơn khách, Khách tip, NCC, Chi phí vận hành), Set 50%/100%, Xác Nhận Phân Bổ, Hủy Bỏ.* |
| **System** | `SystemPage` | Cấu hình động thông số vận hành & Telegram. *Nút: Lưu từng tham số, Nút gạt Bật/Tắt Telegram, Nút gạt Sepay Auto Match, Tải lại cấu hình, Lọc nhật ký thông báo.* |

---
*Tài liệu danh mục tính năng & nút bấm này là chuẩn vận hành chính thức của Admin Store V2.*
*Bản đồ cấu trúc cơ sở dữ liệu chi tiết xem tại [v2/DATABASE_SCHEMA.md](file:///e:/Project/admin_store/admin_orderlist/v2/DATABASE_SCHEMA.md).*

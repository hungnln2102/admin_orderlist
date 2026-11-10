# QUY TRÌNH VẬN HÀNH & NGHIỆP VỤ CHUẨN CỬA HÀNG (SOP)
> **Hệ thống:** Quản Lý Đơn Hàng, Dòng Tiền & Dịch Vụ Khách Hàng (Mavryk Store)  
> **Chủ nhân tối cao:** 👑 Master (Sếp)  
> **Áp dụng cho:** Quản trị viên, Vận hành, Kế toán & Bộ phận Chăm sóc khách hàng  
> **Nguyên tắc cốt lõi:** Minh bạch dòng tiền — Tự động hóa tối đa — Bảo toàn quyền lợi khách hàng  

---

## 📑 MỤC LỤC
1. [Quy Trình 1: Quản Lý Dòng Tiền & Số Dư Tài Khoản Ngân Hàng](#1-quy-trình-quản-lý-dòng-tiền--số-dư-tài-khoản-ngân-hàng)
2. [Quy Trình 2: Tạo Đơn Hàng & Tự Động Khớp Thanh Toán](#2-quy-trình-tạo-đơn-hàng--tự-động-khớp-thanh-toán)
3. [Quy Trình 3: Thanh Toán Bằng Số Dư Tài Khoản (Credit)](#3-quy-trình-thanh-toán-bằng-số-dư-tài-khoản-credit)
4. [Quy Trình 4: Sửa & Điều Chỉnh Thông Tin Đơn Hàng](#4-quy-trình-sửa--điều-chỉnh-thông-tin-đơn-hàng)
5. [Quy Trình 5: Hủy / Xóa Đơn Hàng Đã Thanh Toán & Bảo Vệ Quyền Lợi](#5-quy-trình-hủy--xóa-đơn-hàng-đã-thanh-toán--bảo-vệ-quyền-lợi)
6. [Quy Trình 6: Tự Động Chuyển Gia Hạn Lúc 0h Hằng Ngày](#6-quy-trình-tự-động-chuyển-gia-hạn-lúc-0h-hằng-ngày)
7. [Quy Trình 7: Thanh Toán Tiền Cho Nhà Cung Cấp (NCC)](#7-quy-trình-thanh-toán-tiền-cho-nhà-cung-cấp-ncc)
8. [Quy Trình 8: Quản Lý Sản Phẩm & Rào Chắn An Toàn](#8-quy-trình-quản-lý-sản-phẩm--rào-chắn-an-toàn)
9. [Quy Trình 9: Nhập Hàng, Quản Lý Kho & Đóng Gói Sản Phẩm](#9-quy-trình-nhập-hàng-quản-lý-kho--đóng-gói-sản-phẩm)

---

## 1. QUY TRÌNH QUẢN LÝ DÒNG TIỀN & SỐ DƯ TÀI KHOẢN NGÂN HÀNG

Mọi giao dịch biến động phát sinh qua tài khoản ngân hàng của cửa hàng đều được quản lý theo nguyên tắc bất di bất dịch:

- **Khi có tiền chuyển vào (Tiền Vào):**  
  Hệ thống lập tức **cộng số dư tài khoản ngân hàng** trước tiên. Sau đó mới dùng số tiền này để tự động kiểm tra và khớp đơn hàng hoặc nạp tiền vào tài khoản khách hàng.
- **Khi có tiền chuyển ra (Tiền Ra):**  
  Hệ thống lập tức **trừ số dư tài khoản ngân hàng** trước tiên. Sau đó mới ghi nhận vào việc thanh toán công nợ cho nhà cung cấp hoặc các khoản chi phí hoạt động của cửa hàng.

---

## 2. QUY TRÌNH TẠO ĐƠN HÀNG & TỰ ĐỘNG KHỚP THANH TOÁN

### 2.1. Khởi tạo đơn hàng mới
- Nhân viên hoặc hệ thống tạo đơn hàng thành công $\rightarrow$ Đơn ở trạng thái chờ và hệ thống ghi lại một mốc lịch sử khởi tạo đơn.

### 2.2. Khách hàng chuyển khoản thanh toán
- Khi ngân hàng báo có tiền vào, hệ thống tự động quét các đơn hàng đang ở trạng thái:
  - **Tạo Mới** (đơn vừa lên chờ thanh toán).
  - **Cần Gia Hạn** (đơn cũ đã hết hạn chờ đóng tiền tháng mới).
  - **Đang Xử Lý** (đơn đang được hỗ trợ kiểm tra).
- **Khi chuyển khoản đúng số tiền:**
  1. Đơn hàng tự động chuyển sang trạng thái: **ĐÃ THANH TOÁN**.
  2. Hệ thống tự động ghi nhận **Doanh thu** và tính toán **Lợi nhuận** cho đơn hàng đó.
  3. Ghi nhận tiền vốn mua hàng vào sổ công nợ phải trả cho **Nhà Cung Cấp (NCC)** nếu đơn dùng nguồn hàng nhập ngoài.
- ⭐️ **Chính sách riêng cho sản phẩm Kho Mavryk:**  
  Các sản phẩm thuộc nguồn tự cung cấp của cửa hàng (kho nội bộ Mavryk) là tài nguyên có sẵn, do đó **không ghi nhận nhập hàng NCC và không tính chi phí mua ngoài**, toàn bộ số tiền thu được đều thuộc về cửa hàng.

---

## 3. QUY TRÌNH THANH TOÁN BẰNG SỐ DƯ TÀI KHOẢN (CREDIT)

Khách hàng có thể sử dụng số dư ví (Credit) tích lũy trong tài khoản để thanh toán đơn hàng mới theo 3 trường hợp:

- **Trường hợp 1 — Số dư VỪA ĐỦ:**  
  Số dư ví $\ge$ Giá trị đơn hàng $\rightarrow$ Hệ thống tự động trừ đúng số tiền của đơn $\rightarrow$ Đơn hàng lập tức chuyển sang trạng thái **ĐÃ THANH TOÁN**.
- **Trường hợp 2 — Số dư THIẾU:**  
  Khách chỉ có một phần số dư *(Ví dụ: Đơn 100.000đ nhưng số dư chỉ có 60.000đ)*:  
  $\rightarrow$ Hệ thống khấu trừ hết 60.000đ số dư ví hiện có.  
  $\rightarrow$ Tự động tạo một **mã QR chuyển khoản ngân hàng cho đúng số tiền còn thiếu là 40.000đ**.  
  $\rightarrow$ Khách chỉ cần quét mã chuyển nốt 40.000đ là đơn hàng tự động kích hoạt hoàn tất.
- **Trường hợp 3 — Số dư DƯ (Thanh toán từ một khoản tiền lớn):**  
  Khách hàng có một khoản tiền lớn được nạp trước hoặc hoàn lại *(Ví dụ: Một khoản nạp 500.000đ)*:  
  $\rightarrow$ Khách mua đơn 120.000đ $\rightarrow$ Đơn chuyển sang **ĐÃ THANH TOÁN**.  
  $\rightarrow$ Trong khoản tiền 500.000đ đó, hệ thống tự động tạo một dòng ghi trừ 120.000đ và **gắn chặt liên kết với khoản tiền 500.000đ gốc**, giúp nhân viên và khách hàng dễ dàng theo dõi chi tiết từng lần sử dụng của khoản tiền lớn đó.

---

## 4. QUY TRÌNH SỬA & ĐIỀU CHỈNH THÔNG TIN ĐƠN HÀNG

Để bảo đảm tính minh bạch và chống sai sót trong quá trình phục vụ:
- Khi nhân viên hoặc quản trị viên sửa bất kỳ thông tin nào của đơn hàng (gói dịch vụ, thông tin tài khoản giao cho khách, giá tiền, ngày hết hạn hay ghi chú):
- Hệ thống bắt buộc **tự động ghi lại nhật ký thay đổi chi tiết**:  
  Ai sửa, vào thời điểm nào, sửa ở mục gì, **thông tin trước khi sửa là gì** và **thông tin mới sau khi sửa là gì**.

---

## 5. QUY TRÌNH HỦY / XÓA ĐƠN HÀNG ĐÃ THANH TOÁN & BẢO VỆ QUYỀN LỢI

> **Quy tắc bảo vệ dữ liệu:** Đơn hàng khách đã thanh toán tiền **TUYỆT ĐỐI KHÔNG BỊ XÓA MẤT DẤU VẾT** khỏi hệ thống.

Khi có phát sinh hủy/xóa đơn hàng đã thanh toán:
1. Đơn hàng được chuyển sang **Danh Sách Hoàn Tiền**.
2. **Cấp lại số dư cho khách hàng:** Hệ thống tự động hoàn lại số tiền còn lại của đơn hàng vào số dư tài khoản (Credit) của khách, khách có thể dùng số tiền này để mua dịch vụ khác bất kỳ lúc nào.
3. **Thu hồi tiền nhập hàng từ Nhà Cung Cấp:** Hệ thống tự động tạo một khoản ghi nhận Nhà Cung Cấp đó phải hoàn lại tiền vốn nhập gói hàng cho cửa hàng (cấn trừ vào công nợ NCC).

---

## 6. QUY TRÌNH TỰ ĐỘNG CHUYỂN GIA HẠN LÚC 0H HẰNG NGÀY

Vào đúng **00:00 hằng đêm**, hệ thống tự động kiểm tra toàn bộ dịch vụ của khách hàng:
- Những đơn hàng **hết hạn trong ngày** sẽ tự động được chuyển sang trạng thái: **CẦN GIA HẠN**.
- ⭐️ **Nguyên tắc tính giá gia hạn:**  
  Giá tiền gia hạn mới **BẮT BUỘC LẤY THEO BẢNG GIÁ NIÊM YẾT MỚI NHẤT HIỆN TẠI TRÊN HỆ THỐNG**, tuyệt đối **KHÔNG lấy lại giá cũ trong lịch sử đơn hàng**.  
  *(Điều này đảm bảo khi cửa hàng điều chỉnh giá thị trường hoặc chính sách bán hàng thì các đơn gia hạn sẽ tự động áp dụng mức giá mới chuẩn xác).*

---

## 7. QUY TRÌNH THANH TOÁN TIỀN CHO NHÀ CUNG CẤP (NCC)

- Khi cửa hàng chuyển tiền thanh toán công nợ cho Nhà Cung Cấp (hệ thống nhận được thông báo tiền ra từ ngân hàng):
  1. Trừ số dư tài khoản ngân hàng của cửa hàng (theo Quy trình 1).
  2. Khớp đúng số tiền $\rightarrow$ Hệ thống tự động tìm và chuyển các khoản nợ của Nhà Cung Cấp đó từ trạng thái **Chưa Thanh Toán** thành **Đã Thanh Toán**.
  3. ⚠️ **Quy tắc kế toán chống tính trùng:** Thao tác chuyển tiền trả nợ này **TUYỆT ĐỐI KHÔNG CỘNG THÊM CHI PHÍ NHẬP HÀNG LẦN NỮA** (vì chi phí vốn đã được ghi nhận vào sổ lúc tạo đơn hàng; nếu cộng thêm ở đây sẽ làm sai lệch sổ sách kế toán và báo cáo lợi nhuận).

---

## 8. QUY TRÌNH QUẢN LÝ SẢN PHẨM & RÀO CHẮN AN TOÀN

- **Ghi nhận lịch sử:** Mọi hoạt động Thêm sản phẩm mới, Chỉnh sửa thông tin giá/mô tả, hoặc Xóa sản phẩm đều được lưu lại lịch sử chi tiết.
- ⛔ **Rào chắn an toàn (Cấm xóa sản phẩm đang hoạt động):**  
  Một sản phẩm/gói dịch vụ **đang có đơn hàng của khách hàng ở trạng thái ĐÃ THANH TOÁN thì CẤM TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA**.  
  Hệ thống sẽ chặn thao tác xóa và yêu cầu quản trị viên chọn tính năng **Ẩn sản phẩm** hoặc chuyển sang trạng thái **Ngừng kinh doanh** để bảo đảm quyền lợi bảo hành và theo dõi đơn hàng của khách hàng cũ.

---

## 9. QUY TRÌNH NHẬP HÀNG, QUẢN LÝ KHO & ĐÓNG GÓI SẢN PHẨM

### 9.1. Khởi tạo đơn nhập hàng & Đối soát tài chính
- Khi nhân viên/quản lý tạo một đơn nhập hàng:
  1. Tạo thành công $\rightarrow$ Hệ thống ghi nhận 1 mốc lịch sử nhập hàng vào nhật ký hệ thống.
  2. Đơn nhập hàng tự động được chuyển ngay sang trạng thái: **ĐÃ THANH TOÁN**.
  3. **Phân loại theo nguồn Nhà Cung Cấp (NCC):**
     - **Nếu nguồn hàng là Mavryk (Kho nội bộ / Tự cung cấp):**  
       $\rightarrow$ **KHÔNG ghi nhận vào sổ theo dõi NCC**, không tính chi phí mua ngoài.
     - **Nếu nguồn hàng từ Nhà Cung Cấp khác (NCC bên ngoài):**  
       $\rightarrow$ **Ghi nhận ngay vào sổ nhật ký công nợ của NCC đó**.  
       $\rightarrow$ **Trừ vào lợi nhuận** của cửa hàng (ghi nhận chi phí vốn mua hàng thực tế).

### 9.2. Ba kịch bản Lưu Kho & Tạo Gói Sản Phẩm khi nhập hàng
Tùy vào mục đích sử dụng của lô hàng nhập về, quản lý chọn 1 trong 3 kịch bản xử lý sau:

| Kịch Bản | Lưu Kho? | Tạo Gói Sản Phẩm? | Hành Vi Của Hệ Thống |
| :--- | :---: | :---: | :--- |
| **Kịch bản 1: Lưu kho & Tạo gói** *(Tiêu chuẩn)* | **CÓ** | **CÓ** | Dựa vào gói biến thể đã chọn để xác định chính xác tài khoản/hàng hóa này thuộc về gói sản phẩm nào $\rightarrow$ Tự động tạo gói sẵn sàng trong **Kho Gói Sản Phẩm** để cấp phát cho khách hàng mua sau này $\rightarrow$ Ghi log biến động kho đầy đủ. |
| **Kịch bản 2: Không lưu kho & Không tạo gói** *(Nhập dùng ngay/Ngoài luồng)* | **KHÔNG** | **KHÔNG** | Không lưu vào kho dữ liệu, không tạo gói trong Kho Gói Sản Phẩm $\rightarrow$ **Tuyệt đối không tạo bất kỳ nhật ký (log) kho nào cho dịch vụ này**. |
| **Kịch bản 3: Lưu kho nhưng Không tạo gói** *(Lưu kho thô / Dự trữ)* | **CÓ** | **KHÔNG** | Lưu thông tin tài khoản/tài nguyên thô vào kho để quản lý và bảo quản $\rightarrow$ **KHÔNG tạo gói** trong Kho Gói Sản Phẩm (chưa đóng gói thành sản phẩm bán lẻ sẵn sàng). |

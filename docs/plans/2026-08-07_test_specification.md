# Tài Liệu Đặc Tả Chi Tiết Kiểm Thử (Test Specification)

*   **Ngày lập**: 2026-08-07
*   **Người lập**: AI Coding Assistant (Antigravity)
*   **Trạng thái**: Đang áp dụng

Tài liệu này đặc tả chi tiết các bước kiểm thử, dữ liệu đầu vào và kết quả kỳ vọng cho hai luồng nghiệp vụ cốt lõi: **Tạo đơn hàng** và **Sửa đơn hàng**. Các tính năng khác sẽ được bổ sung sau.

---

## 1. Luồng Kiểm Thử: Tạo Đơn Hàng (Create Order)

### A. Dữ Liệu Đầu Vào (Input)
*   **Thông tin đơn hàng ban đầu:**
    *   Mã đơn hàng (`id_order`): Bắt đầu bằng tiền tố hợp lệ như `MAVC`, `MAVL`, `MAVK` (Ví dụ test: `MAVTST_CREATE_001`).
    *   Giá bán (`price`): `200,000` VND.
    *   Giá vốn nhập (`cost`): `150,000` VND.
    *   Trạng thái ban đầu (`status`): `Chưa Thanh Toán` (UNPAID) hoặc `Chờ xử lý` (PENDING).
    *   Nhà cung cấp (`id_supply`): 
        *   *Trường hợp 1:* Nhà cung cấp khác Mavryk (Ví dụ: `NCC_Test`).
        *   *Trường hợp 2:* Nhà cung cấp Mavryk (Ví dụ: `Mavryk Shop`).
*   **Webhook Thanh Toán Giả Lập:**
    *   Số tiền chuyển khoản (`transfer_amount`): `200,000` VND (Khớp 100% giá trị đơn hàng).
    *   Nội dung chuyển khoản (`transaction_content`): Chứa mã đơn hàng (Ví dụ: `"Thanh toan don hang MAVTST_CREATE_001"`).

### B. Các Bước Kiểm Thử (Steps)
1.  **Bước 1:** Gửi yêu cầu API tạo đơn hàng mới (`POST /api/orders`) với thông tin đầu vào.
2.  **Bước 2:** Kiểm tra xem đơn hàng đã được lưu vào database ở trạng thái chưa thanh toán và có ghi nhận log tạo đơn hàng hay chưa.
3.  **Bước 3:** Gửi payload webhook thanh toán thành công giả lập tới cổng tiếp nhận webhook (`POST /webhook/sepay`).
4.  **Bước 4:** Kiểm tra trạng thái đơn hàng, doanh thu, lợi nhuận, chi phí nhập hàng trong dashboard tài chính và log nhà cung cấp.

### C. Kết Quả Kỳ Vọng Đầu Au (Expected Output)
1.  **Trạng thái đơn hàng (`orders.order_list`):**
    *   Cột `status` chuyển từ `Chưa Thanh Toán`/`Chờ xử lý` sang `Đã Thanh Toán` (PAID).
2.  **Đồng bộ tài chính (`wallet.dashboard_monthly_summary`):**
    *   Doanh thu (`total_revenue`): Cộng thêm `200,000` VND.
    *   Lợi nhuận (`total_profit`):
        *   *Nếu NCC khác Mavryk:* Cộng thêm `50,000` VND (`revenue - importCost` = `200,000 - 150,000`).
        *   *Nếu NCC là Mavryk/Shop:* Cộng thêm `200,000` VND (bằng đúng Doanh thu vì giá vốn nhập hàng bằng `0`).
    *   Nhập hàng (`total_import`):
        *   *Nếu NCC khác Mavryk:* Cộng thêm `150,000` VND.
        *   *Nếu NCC là Mavryk/Shop:* Không cộng thêm chi phí nhập hàng vào cột này (giữ nguyên hoặc cộng 0 VND).
3.  **Log Nhà Cung Cấp (`partner.supplier_order_cost_log`):**
    *   *Nếu NCC khác Mavryk:* Tự động tạo 1 bản ghi log NCC với trạng thái `Chưa Thanh Toán` và giá trị nhập hàng là `150,000` VND.
    *   *Nếu NCC là Mavryk/Shop:* Không tạo bản ghi log trong bảng này.
4.  **Log Hệ Thống (`admin_finance.financial_allocation_ledger` & event logs):**
    *   Tạo bản ghi log sổ cái ghi nhận dòng tiền khởi tạo (`period_type = 'INITIAL'`) liên kết với mã đơn hàng.
    *   Có log tạo đơn hàng chi tiết được ghi lại trong hệ thống logs (`writeUserEventLog`).

---

## 2. Luồng Kiểm Thử: Sửa Đơn Hàng (Update Order)

### A. Dữ Liệu Đầu Vào (Input)
*   **Trạng thái trước khi sửa (Before):**
    *   Đơn hàng hiện tại: `MAVTST_UPDATE_002`.
    *   Giá bán cũ: `200,000` VND.
    *   Nhà cung cấp cũ: `NCC_Cu` (ID: 10).
    *   Giá vốn cũ: `120,000` VND.
*   **Thao tác sửa:**
    *   Bấm sửa đơn hàng để mở form chỉnh sửa.
    *   Nhập thông tin mới:
        *   Giá bán mới: `250,000` VND (Thay đổi giá).
        *   Nhà cung cấp mới: `NCC_Moi` (ID: 20).
*   **Tham số payload API gửi lên (`PUT /api/orders/:id`):**
    *   `price`: `250,000`
    *   `id_supply`: `20`

### B. Các Bước Kiểm Thử (Steps)
1.  **Bước 1:** Lấy thông tin đơn hàng hiện tại và hiển thị lên form chỉnh sửa.
2.  **Bước 2:** Điền các thông tin thay đổi (giá bán mới, nhà cung cấp mới) và gửi yêu cầu cập nhật đơn hàng.
3.  **Bước 3:** Xác nhận phản hồi từ API cập nhật thành công.
4.  **Bước 4:** Kiểm tra cơ sở dữ liệu để xác nhận các thông tin được cập nhật và các log phát sinh.

### C. Kết Quả Kỳ Vọng Đầu Ra (Expected Output)
1.  **Đơn hàng cập nhật thành công (`orders.order_list`):**
    *   Các cột thông tin (`price`, `id_supply`) được cập nhật chính xác theo giá trị mới.
2.  **Sự kiện cập nhật đơn hàng (Event Bus):**
    *   Hệ thống phát thành công sự kiện `EVENTS.ORDER_UPDATED` chứa payload đầy đủ gồm thông tin đơn hàng mới (`updated`), thông tin đơn hàng trước khi cập nhật (`before`) và các trường thay đổi (`changedFields`).
3.  **Nhật ký chỉnh sửa hệ thống (User Event Log):**
    *   Tự động ghi nhận log hành động bằng cách gọi hàm `writeUserEventLog` với hành động `"Sửa đơn hàng"`, lưu vết đầy đủ chi tiết thay đổi (ví dụ: `Thay đổi NCC từ NCC_Cu sang NCC_Moi`, `Thay đổi giá từ 200k sang 250k`).
4.  **Thay đổi giá, hoàn tiền và bù trừ cho Nhà Cung Cấp mới:**
    *   Bảng `partner.supplier_order_cost_log` hoặc các dịch vụ liên quan tự động điều chỉnh giá vốn, ghi nhận phần chênh lệch bù trừ tài chính do việc thay đổi nhà cung cấp và thay đổi giá vốn giữa NCC cũ và NCC mới (tính toán lại tỷ lệ prorate hoặc hoàn credit nếu đơn hàng thuộc diện hoàn tiền).

---

## 3. Luồng Kiểm Thử: Nhập Hàng (Import Order)

### A. Dữ Liệu Đầu Vào (Input)
*   **Thông tin đơn nhập hàng:**
    *   Mã đơn hàng (`id_order`): Bắt đầu bằng tiền tố `MAVN` (Ví dụ: `MAVN_TEST_001`).
    *   Giá trị nhập hàng/chi phí (`cost`): `1,000,000` VND.
    *   Nhà cung cấp (`id_supply`): Chọn nhà cung cấp Mavryk (hoặc nhà cung cấp có cấu hình liên quan).
    *   Tài khoản nguồn chi trả: Tài khoản ngân hàng mặc định của Mavryk.

### B. Các Bước Kiểm Thử (Steps)
1.  **Bước 1:** Gửi yêu cầu API tạo đơn hàng mới (`POST /api/orders`) với thông tin đầu vào là mã `MAVN...`.
2.  **Bước 2:** Nhận và xác nhận phản hồi từ API (bao gồm popup kết quả hiển thị trên UI).
3.  **Bước 3:** Kiểm tra biến động số dư ngân hàng và biến động lợi nhuận sau khi đơn nhập hàng được tạo thành công.
4.  **Bước 4:** Kiểm tra sự kiện (Event Bus) được phát ra và nhật ký hoạt động (System Log/User Event Log).

### C. Kết Quả Kỳ Vọng Đầu Ra (Expected Output)
1.  **Giao diện người dùng (UI Popup):**
    *   Hiển thị popup thông báo tạo đơn nhập hàng thành công.
    *   **Không kèm theo mã QR thanh toán** (do đây là đơn nhập hàng - chi tiền ra, không phải đơn bán hàng thu tiền của khách).
2.  **Đồng bộ tài chính & Biến động số dư:**
    *   **Số dư ngân hàng (`shop_bank_accounts`):** Số dư tài khoản nguồn giảm đi `1,000,000` VND tương ứng với giá trị đơn nhập.
    *   **Lợi nhuận (`wallet.dashboard_monthly_summary.total_profit`):** Lợi nhuận của tháng hiện tại giảm đi `1,000,000` VND (do phát sinh chi phí nhập hàng).
3.  **Sự kiện tạo đơn nhập (Event Bus):**
    *   Hệ thống phát thành công sự kiện `EVENTS.IMPORT_ORDER_CREATED` chứa thông tin chi tiết đơn nhập hàng.
4.  **Nhật ký và sổ cái hệ thống:**
    *   Ghi nhận log tạo đơn hàng thành công trong hệ thống logs (`writeUserEventLog`).
    *   Tự động ghi nhận log sổ cái tài chính (`admin_finance.financial_allocation_ledger`) với loại dòng tiền khởi tạo của đơn nhập.

---

## 4. Luồng Kiểm Thử: Tạo, Sửa Bảng Giá (Price List Management)

### A. Dữ Liệu Đầu Vào (Input)
*   **Trường hợp 1: Tạo gói sản phẩm mới hoặc thêm sản phẩm vào gói:**
    *   Tên gói sản phẩm mới (Ví dụ: `Gói Adobe All Apps Test`).
    *   Thông tin sản phẩm trong gói (Mã variant, tên hiển thị, giá bán lẻ, giá đại lý, nhà cung cấp).
    *   Payload gửi lên API (`POST /api/products/packages` hoặc tương tự).
*   **Trường hợp 2: Sửa sản phẩm hiện có trong bảng giá:**
    *   ID sản phẩm/variant đang tồn tại trong hệ thống.
    *   Các thông tin cần thay đổi (Ví dụ: cập nhật giá bán hoặc thay đổi trạng thái bán).
    *   Payload gửi lên API sửa giá/sản phẩm (`PATCH /api/products/:productId/suppliers/:sourceId/price` hoặc `PATCH /api/products/prices/:priceId`).

### B. Các Bước Kiểm Thử (Steps)
1.  **Bước 1:** Thực hiện yêu cầu tạo gói sản phẩm mới hoặc thêm sản phẩm mới vào gói qua API. Xác nhận phản hồi thành công (HTTP 200/201).
2.  **Bước 2:** Thực hiện yêu cầu chỉnh sửa thông tin giá bán/sản phẩm hiện có qua API. Xác nhận phản hồi thành công (HTTP 200).
3.  **Bước 3:** Truy vấn cơ sở dữ liệu (`business.product` hoặc các bảng liên quan) để đảm bảo dữ liệu mới đã được ghi nhận chính xác.
4.  **Bước 4:** Kiểm tra bảng log sự kiện (`system_event_logs`) để xác nhận hành động tạo/sửa đã được lưu vết thành công.

### C. Kết Quả Kỳ Vọng Đầu Ra (Expected Output)
1.  **Tạo gói/sản phẩm mới:**
    *   Bảng ghi nhận gói sản phẩm mới hoặc sản phẩm liên kết với gói trong cơ sở dữ liệu được tạo thành công.
    *   Thông tin phản hồi từ API chứa đầy đủ cấu trúc dữ liệu vừa tạo.
2.  **Nhật ký hệ thống (User Event Log):**
    *   Hệ thống tự động ghi lại log hành động tạo/sửa thông qua hàm `writeUserEventLog` với nội dung chi tiết rõ ràng:
        *   Khi tạo mới: `"Tạo sản phẩm trong gói/gói mới thành công"` kèm theo thông tin chi tiết.
        *   Khi cập nhật giá: `"Cập nhật giá bán thành công"` ghi nhận rõ ràng giá trị cũ và giá trị mới thay đổi.

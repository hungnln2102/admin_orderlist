# Tài Liệu Chi Tiết Kiểm Thử (Test Specification)

*   **Ngày lập kế hoạch**: 2026-08-07
*   **Người lập**: AI Coding Assistant (Antigravity)
*   **Trạng thái**: Đang áp dụng

Tài liệu này đặc tả chi tiết đầu vào, đầu ra, các bước kiểm thử và kết quả kỳ vọng cho từng tính năng cốt lõi thuộc Phase 5. Nhà phát triển hoặc QA có thể dựa vào đây để thực hiện kiểm thử thủ công hoặc chạy kiểm thử tự động một cách có tổ chức.

---

## 1. Phương Pháp Chạy Kiểm Thử

Hệ thống hỗ trợ 2 phương pháp kiểm thử:

### Phương pháp A: Kiểm thử tự động (Khuyên dùng)
Chạy toàn bộ các test case dưới đây một cách tự động và cô lập:
```bash
cd backend
npm run test
```
*Lưu ý: Bộ test tự động sử dụng tiền tố dữ liệu `MAVTST` và tự động dọn dẹp sạch sẽ database sau khi kết thúc, không ảnh hưởng đến dữ liệu thực.*

### Chế độ Watch (Khi phát triển):
```bash
cd backend
npm run test:watch
```

---

## 2. Đặc Tả Chi Tiết Từng Kịch Bản Kiểm Thử

### Tính năng 1: Khớp Webhook Tự Động Theo Số Tiền Chính Xác (Exact Webhook Match)
*Mô tả: Hệ thống tự động nhận diện và khớp đơn hàng khi khách chuyển khoản đúng 100% số tiền đơn hàng, kể cả khi nội dung chuyển khoản không ghi mã đơn.*

#### A. Dữ liệu đầu vào (Input)
*   **Đơn hàng (Order):**
    *   Mã đơn (`id_order`): Bắt đầu bằng `MAV` (Ví dụ: `MAVTST_EXACT_999`).
    *   Giá đơn (`price`): `250,000` VND.
    *   Trạng thái ban đầu (`status`): `Chưa Thanh Toán` (UNPAID).
*   **Webhook Payload (Giao dịch chuyển khoản):**
    *   Số tiền chuyển (`transfer_amount`): `250,000` VND.
    *   Nội dung chuyển khoản (`transaction_content`): Không chứa mã đơn hàng (Ví dụ: `"MBCT NGO LE NGOC HUNG chuyen tien"`).
    *   Mã tham chiếu giao dịch (`reference_number`): Unique (Ví dụ: `TXN_EXACT_1`).

#### B. Các bước kiểm thử (Steps)
1.  Tạo đơn hàng test trong DB với các thông tin đầu vào ở trên.
2.  Gửi payload webhook giả lập tới cổng Sepay webhook hoặc chạy Jest test block tương ứng.
3.  Truy vấn cơ sở dữ liệu để đối chiếu trạng thái.

#### C. Kết quả kỳ vọng đầu ra (Expected Output)
1.  **Trạng thái đơn hàng (`order_list`):** Tự động chuyển sang `Đã Thanh Toán` (PAID).
2.  **Biên lai thanh toán (`payment_receipt`):**
    *   Được tạo thành công trong DB.
    *   Cột `id_order` tự động được điền đúng mã đơn hàng test.
    *   Cột `is_financial_posted` chuyển sang `true`.
    *   Cột `posted_revenue` ghi nhận chính xác `250,000` VND.

---

### Tính năng 2: Khớp Webhook Thiếu Tiền & Phân Loại Doanh Thu Ngoài Luồng (Shortfall & Off-Flow)
*Mô tả: Khi khách chuyển khoản thiếu tiền, hệ thống giữ nguyên trạng thái đơn hàng và chờ quản trị viên phân loại thủ công biên lai đó thành Doanh thu ngoài luồng (off-flow) để tạo Credit Note.*

#### A. Dữ liệu đầu vào (Input)
*   **Đơn hàng (Order):**
    *   Mã đơn (`id_order`): Bắt đầu bằng `MAV` (Ví dụ: `MAVTST_SHORT_888`).
    *   Giá đơn (`price`): `300,000` VND.
    *   Trạng thái ban đầu (`status`): `Chưa Thanh Toán`.
*   **Webhook Payload (Giao dịch chuyển khoản thiếu tiền):**
    *   Số tiền chuyển (`transfer_amount`): `200,000` VND (Thiếu 100k).
    *   Nội dung chuyển khoản (`transaction_content`): Chứa mã đơn (Ví dụ: `"Chuyen khoan thanh toan don MAVTST_SHORT_888"`).
*   **Đầu vào phân loại thủ công:**
    *   `flowTypeId`: ID của loại dòng tiền ngoài luồng (`receipt_flow_types.effect = 'off_flow_revenue'`).

#### B. Các bước kiểm thử (Steps)
1.  Tạo đơn hàng test trong DB.
2.  Gửi webhook chuyển khoản thiếu tiền.
3.  *Kiểm tra chặng 1:* Xác nhận trạng thái đơn không đổi.
4.  Gọi API phân loại thủ công biên lai (`POST /api/payments/receipts/:receiptId/classify`).
5.  *Kiểm tra chặng 2:* Xác nhận Credit Note và số dư sổ cái được tạo.

#### C. Kết quả kỳ vọng đầu ra (Expected Output)
1.  **Sau khi gửi webhook (Chặng 1):**
    *   Đơn hàng vẫn giữ nguyên trạng thái `Chưa Thanh Toán`.
    *   Biên lai được tạo nhưng `is_financial_posted` là `false`.
2.  **Sau khi phân loại thủ công (Chặng 2):**
    *   Biên lai `is_financial_posted` chuyển sang `true`.
    *   Cột `posted_off_flow_bank_receipt` ghi nhận đúng `200,000` VND.
    *   Một bản ghi **Credit Note** được tạo mới trong bảng `refund_credit_notes`:
        *   Mã credit (`credit_code`): `RFO-RCP-[ID_BIÊN_LAI]`.
        *   Số dư khả dụng (`available_amount`): `200,000` VND.

---

### Tính năng 3: Quản Lý Tài Khoản Tài Chính & Sổ Cái Hợp Nhất (Shared Accounts & Ledger)
*Mô tả: Hệ thống ghi nhận số dư của toàn bộ tài khoản ngân hàng (bank) và ví USDT trong cùng một bảng và lưu vết mọi thay đổi số dư vào bảng sổ cái chung.*

#### A. Dữ liệu đầu vào (Input)
*   **Tạo Tài Khoản (`finance.financial_accounts`):**
    *   `account_type`: `'bank'` hoặc `'usdt'`.
    *   `account_number`: Ví dụ: `'9999999999'` (đối với bank) hoặc ví TRC20 (đối với USDT).
    *   `label`: Tên tài khoản test.
    *   `balance`: Số dư ban đầu (Ví dụ: `1,000,000` VND hoặc `500` USDT).
*   **Ghi sổ cái (`finance.financial_account_ledger`):**
    *   `financial_account_id`: ID tài khoản vừa tạo.
    *   `entry_type`: `'receipt_in'` (nạp tiền) hoặc `'withdraw'` (rút tiền).
    *   `amount`: `500,000` VND.
    *   `signed_amount`: `500,000` VND.
    *   `balance_after`: `1,500,000` VND.

#### B. Các bước kiểm thử (Steps)
1.  Chèn trực tiếp bản ghi tài khoản tài chính test vào bảng `finance.financial_accounts`.
2.  Thực hiện ghi log biến động số dư vào bảng `finance.financial_account_ledger`.
3.  Truy vấn đối chiếu dữ liệu.

#### C. Kết quả kỳ vọng đầu ra (Expected Output)
1.  Các bản ghi được lưu trữ thành công và ràng buộc khóa ngoại `financial_account_id` hoạt động chính xác.
2.  Dễ dàng truy vấn lịch sử dòng tiền của cả Bank và USDT từ một bảng duy nhất (`financial_account_ledger`) thông qua câu lệnh `JOIN`.

---

### Tính năng 4: Vòng Đời Key Sản Phẩm Hợp Nhất (Product Key Lifecycle)
*Mô tả: Key sản phẩm số được quản lý tập trung và chuyển đổi trạng thái vòng đời nhất quán từ khi trong kho cho tới khi bán ra.*

#### A. Dữ liệu đầu vào (Input)
*   **Key kho ban đầu (`business.product_keys`):**
    *   `account_username`: Tài khoản/Key test.
    *   `key_hash`: Chuỗi mã hóa key.
    *   `status`: `'available'` (Sẵn có).
    *   `order_list_id`: `NULL` (Chưa bán).
*   **Gán đơn hàng:**
    *   `order_list_id`: ID của đơn hàng vừa mua key.
    *   `status` chuyển sang: `'sold'` (Đã bán).

#### B. Các bước kiểm thử (Steps)
1.  Tạo Key ở trạng thái `'available'`.
2.  Thực hiện cập nhật Key trỏ vào một `order_list_id` cụ thể và đổi trạng thái sang `'sold'`.

#### C. Kết quả kỳ vọng đầu ra (Expected Output)
1.  Bản ghi Key chuyển trạng thái sang `'sold'` thành công.
2.  Khóa ngoại `order_list_id` tham chiếu chuẩn tới bảng `order_list`.
3.  Không còn tình trạng xóa vật lý key khỏi kho stock mà chỉ chuyển đổi trạng thái vòng đời (lifecycle state) trong một bảng duy nhất.

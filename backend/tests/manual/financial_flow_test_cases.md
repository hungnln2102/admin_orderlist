# Tài liệu Kiểm thử Luồng Tài chính (Financial Flow Test Cases)

Tài liệu này ghi nhận chi tiết các kịch bản kiểm thử (test cases), phương pháp thực hiện và kết quả cho 3 luồng nghiệp vụ tài chính chính: **Biên lai giao dịch**, **Rút tiền**, và **Hóa đơn ngoài luồng (Chi phí phát sinh)**.

---

## 🛠️ Tổng quan cấu hình kiểm thử

- **Môi trường chạy**: `test`
- **Mã tiền tố kiểm thử**: `MAVIT` (Dùng để nhận diện và dọn dẹp tự động sau khi chạy xong)
- **Tài khoản ngân hàng kiểm thử**: `970422TESTFINANCE` (Số dư ban đầu: 10,000,000 VND)
- **Công cụ chạy**: `run-financial-flows-tests.js` thực hiện tự động qua knex/db transaction và gọi trực tiếp các Controller/Handler.

---

## 📋 Danh sách Kịch bản kiểm thử (Test Cases)

### Test Case 1: Đối soát biên lai thủ công vào đơn hàng (Reconcile Receipt to Order)
*   **Mô tả**: Kiểm tra luồng tạo đơn hàng, tạo biên lai nhận tiền thủ công, thực hiện đối soát thủ công biên lai đó vào đơn hàng, và xác minh biến động số dư ngân hàng cùng với báo cáo Dashboard.
*   **Các bước thực hiện**:
    1. Tạo một đơn hàng test có mã `MAVITORD...` với giá bán 150,000 VND và giá vốn (cost) 50,000 VND. Trạng thái ban đầu là `unpaid`.
    2. Tạo một biên lai nhận tiền thủ công (manual receipt) với số tiền 150,000 VND vào tài khoản `970422TESTFINANCE`.
    3. Ghi tăng số dư tài khoản ngân hàng tương ứng để mô phỏng tiền thực tế đã vào tài khoản.
    4. Gọi API/Handler `reconcilePaymentReceipt` với hành động `reconcile_and_mark_paid`.
    5. Đợi 500ms để các subscriber xử lý bất đồng bộ (nếu có).
*   **Kết quả mong đợi**:
    - Đơn hàng chuyển sang trạng thái `paid`.
    - Số dư thực tế tài khoản ngân hàng tăng thêm 150,000 VND (lên thành 10,150,000 VND).
    - Có đúng 1 bản ghi lịch sử biến động số dư ngân hàng (ledger) với số tiền +150,000 VND.
    - Chỉ số Doanh thu tháng hiện tại trên Dashboard tăng thêm 150,000 VND.
    - Chỉ số Lợi nhuận tháng hiện tại trên Dashboard tăng thêm 100,000 VND (150K giá bán - 50K giá vốn).
    - Chỉ số Số dư ngân hàng ước tính (`estimated_bank_balance`) trên Dashboard tăng thêm 150,000 VND.
*   **Kết quả thực tế**: **PASS** ✅ (Mọi kiểm thử so sánh dữ liệu khớp hoàn toàn).

---

### Test Case 2: Phân loại biên lai thủ công thành Doanh thu ngoài luồng (Classify Off-flow Revenue)
*   **Mô tả**: Kiểm tra tính năng phân loại một biên lai thủ công không khớp với đơn hàng nào thành Doanh thu ngoài luồng, và xác minh sự thay đổi trên Dashboard.
*   **Các bước thực hiện**:
    1. Tạo một biên lai nhận tiền thủ công mới với số tiền 80,000 VND.
    2. Ghi tăng số dư tài khoản ngân hàng tương ứng để mô phỏng tiền đã thực tế vào tài khoản.
    3. Gọi API/Handler `classifyReceipt` để phân loại biên lai này vào danh mục `off_flow_revenue` (Doanh thu ngoài luồng).
    4. Xác minh trạng thái tài chính của biên lai trong DB.
*   **Kết quả mong đợi**:
    - Trạng thái tài chính của biên lai cập nhật thành `is_financial_posted = true`.
    - Cột `posted_off_flow_bank_receipt` của biên lai ghi nhận đủ 80,000 VND.
    - Chỉ số Doanh thu ngoài luồng (`total_off_flow_bank_receipt`) của tháng hiện tại trên Dashboard tăng thêm 80,000 VND.
    - Chỉ số Số dư ngân hàng ước tính (`estimated_bank_balance`) của tháng hiện tại trên Dashboard tăng thêm 80,000 VND.
*   **Kết quả thực tế**: **PASS** ✅ (Dashboard và DB cập nhật đồng bộ chính xác).

---

### Test Case 3: Tạo lệnh rút tiền trực tiếp ở trạng thái Hoàn thành (Create Completed Withdrawal)
*   **Mô tả**: Kiểm tra tính năng ghi nhận một giao dịch rút tiền từ tài khoản ngân hàng của shop đã hoàn tất, và kiểm tra tác động đến số dư ngân hàng thực tế cũng như Dashboard.
*   **Các bước thực hiện**:
    1. Lấy thông tin số dư ngân hàng thực tế và số dư ước tính trên Dashboard trước khi rút tiền.
    2. Gọi use case `recordShopBankAccountWithdrawal` để tạo một lệnh rút tiền trị giá 40,000 VND với trạng thái `completed`.
*   **Kết quả mong đợi**:
    - Số dư thực tế tài khoản ngân hàng giảm đi 40,000 VND.
    - Ghi nhận một dòng tiền ra trong lịch sử biến động số dư (ledger) là -40,000 VND.
    - Chỉ số Số dư ngân hàng ước tính (`estimated_bank_balance`) trên Dashboard giảm đi 40,000 VND.
    - Chỉ số Doanh thu và Lợi nhuận của shop **không thay đổi** (vì rút tiền nội bộ không phải chi phí kinh doanh).
*   **Kết quả thực tế**: **PASS** ✅ (Kiểm tra số dư thực tế và dashboard khớp).

---

### Test Case 4: Tạo lệnh rút tiền ở trạng thái Chờ (Pending Withdrawal) -> Hoàn thành thủ công (Complete Pending)
*   **Mô tả**: Kiểm tra vòng đời của lệnh rút tiền được khởi tạo ở trạng thái `pending` (không thay đổi số dư ngay), sau đó được duyệt hoàn thành thủ công sau khi khớp với biên lai thực tế.
*   **Các bước thực hiện**:
    1. Gọi use case `recordShopBankAccountWithdrawal` với số tiền 25,000 VND và trạng thái `pending`.
    2. Kiểm tra số dư tài khoản ngân hàng và kiểm tra bản ghi chi phí trong bảng `store_profit_expenses` để đảm bảo trạng thái là `pending`.
    3. Gọi API/Handler `completeStoreProfitExpense` để duyệt hoàn thành thủ công log chi phí rút tiền này.
*   **Kết quả mong đợi**:
    - Ở bước tạo lệnh `pending`, số dư ngân hàng và Dashboard không thay đổi. Bản ghi chi phí test được tạo với status `pending`.
    - Sau khi gọi hoàn thành:
        - Số dư thực tế tài khoản ngân hàng giảm đi 25,000 VND.
        - Trạng thái log chi phí chuyển sang `completed`.
        - Chỉ số Số dư ngân hàng ước tính (`estimated_bank_balance`) trên Dashboard giảm đi 25,000 VND.
*   **Kết quả thực tế**: **PASS** ✅ (Sửa đổi lỗi định dạng string/bigint và import thành công, chạy trơn tru).

---

### Test Case 5: Tạo hóa đơn nhập ngoài luồng trực tiếp ở trạng thái Hoàn thành (Create Completed External Import)
*   **Mô tả**: Kiểm tra tính năng ghi nhận một khoản chi phí nhập hóa đơn ngoài luồng (như chi phí vận hành, nhập hàng ngoài) đã hoàn tất và kiểm tra tác động đến số dư ngân hàng cùng lợi nhuận của shop.
*   **Các bước thực hiện**:
    1. Lấy thông tin số dư ngân hàng và Dashboard trước khi thực hiện.
    2. Gọi Handler `createStoreProfitExpense` để tạo một chi phí loại `external_import` trị giá 35,000 VND ở trạng thái `completed`.
*   **Kết quả mong đợi**:
    - Số dư thực tế tài khoản ngân hàng giảm đi 35,000 VND.
    - Lịch sử biến động sổ quỹ (ledger) ghi nhận -35,000 VND.
    - Lợi nhuận tháng hiện tại (`total_profit`) trên Dashboard giảm đi 35,000 VND (do đây là chi phí phát sinh).
    - Chỉ số Số dư ngân hàng ước tính (`estimated_bank_balance`) trên Dashboard giảm đi 35,000 VND.
*   **Kết quả thực tế**: **PASS** ✅ (Xác thực lợi nhuận và số dư giảm chính xác).

---

### Test Case 6: Tạo hóa đơn nhập ngoài luồng ở trạng thái Chờ (Pending External Import) -> Hoàn thành thủ công (Complete Pending)
*   **Mô tả**: Kiểm tra vòng đời của một hóa đơn ngoài luồng được tạo ở trạng thái `pending`, sau đó duyệt hoàn thành thủ công.
*   **Các bước thực hiện**:
    1. Gọi Handler `createStoreProfitExpense` để tạo một chi phí loại `external_import` trị giá 45,000 VND ở trạng thái `pending`.
    2. Kiểm tra số dư tài khoản ngân hàng (không đổi) và log chi phí (pending).
    3. Gọi API/Handler `completeStoreProfitExpense` để duyệt hoàn thành thủ công log chi phí này.
*   **Kết quả mong đợi**:
    - Khi tạo lệnh `pending`: Không thay đổi số dư và Dashboard.
    - Khi hoàn thành:
        - Số dư thực tế tài khoản ngân hàng giảm đi 45,000 VND.
        - Lợi nhuận tháng hiện tại (`total_profit`) trên Dashboard giảm đi 45,000 VND.
        - Chỉ số Số dư ngân hàng ước tính (`estimated_bank_balance`) trên Dashboard giảm đi 45,000 VND.
*   **Kết quả thực tế**: **PASS** ✅ (Hoạt động hoàn toàn chính xác).

---

## 📈 Kết quả tổng hợp

| Test Case | Luồng Nghiệp vụ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Test Case 1** | Biên lai - Đối soát vào đơn hàng | **PASS** | Đã sửa logic cộng dồn `bankBalanceDelta` khi đối soát biên lai thủ công lần đầu. |
| **Test Case 2** | Biên lai - Phân loại ngoài luồng | **PASS** | Đã tích hợp gọi `applyDashboardDelta` khi phân loại `off_flow_revenue`. |
| **Test Case 3** | Rút tiền - Hoàn thành trực tiếp | **PASS** | Đã tích hợp `mergeSummaryUpdates` khi ghi nhận rút tiền trực tiếp. |
| **Test Case 4** | Rút tiền - Chờ -> Hoàn thành | **PASS** | Đã sửa lỗi syntax bigint `sepay_transaction_id` và bổ sung import `SOURCE_KINDS`. |
| **Test Case 5** | Hóa đơn ngoài - Hoàn thành trực tiếp | **PASS** | Hoạt động chính xác. |
| **Test Case 6** | Hóa đơn ngoài - Chờ -> Hoàn thành | **PASS** | Đã sửa lỗi syntax bigint `sepay_transaction_id` và bổ sung import `SOURCE_KINDS`. |

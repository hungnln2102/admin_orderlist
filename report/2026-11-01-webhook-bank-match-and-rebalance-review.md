# BÁO CÁO NGHIỆM THU: BỔ SUNG ĐỐI CHIẾU SỐ TÀI KHOẢN & NGÂN HÀNG WEBHOOK SEPAY VÀ HOÀN TRẢ SỐ DƯ TÀI KHOẢN

> **Ngày thực hiện:** 01/11/2026  
> **Múi giờ:** Asia/Bangkok  
> **Trạng thái:** ✅ HOÀN THÀNH & ĐÃ KIỂM THỬ THÀNH CÔNG  
> **Chỉ đạo:** 👑 Master (Sếp)

---

## 1. MỤC TIÊU & BỐI CẢNH NGHIỆP VỤ

1. **Vấn đề phát hiện**:
   - Khi SePay bắn Webhook thanh toán đơn hàng (tới MB Bank Shop), số tiền lại bị cộng nhầm vào **Tài sản cá nhân** (ID: 1004 - VPBank) thay vì **Tài khoản Shop** (ID: 2 - MB Bank).
   - Nguyên nhân gốc: Master sử dụng cùng số điện thoại `0378304963` làm số tài khoản ở cả 2 ngân hàng (MBBank và VPBank). Hàm `resolveFinancialAccount` chỉ tìm kiếm theo `account_number` thuần túy mà không so khớp ngân hàng (`gateway`), đồng thời không ưu tiên scope `SHOP`.

2. **Chỉ đạo của Master**:
   - SePay khi bắn Webhook luôn có đủ 2 thông tin: **Số tài khoản (`accountNumber`)** và **Ngân hàng (`gateway`)**.
   - Bắt buộc đối chiếu đồng thời cả 2 mục này để xác định đúng tài khoản nhận tiền.

---

## 2. NỘI DUNG NÂNG CẤP MÃ NGUỒN

1. **Xây dựng bộ chuẩn hóa & đối chiếu ngân hàng (`matchBankGateway`)** trong [`backend/src/domains/wallets/services/walletService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/wallets/services/walletService.js):
   - Hỗ trợ đối chiếu chuẩn xác các Alias ngân hàng phổ biến tại Việt Nam: MB (`mbbank`, `mb`, `quandoi`), VPB (`vpbank`, `vpb`, `thinhvuong`), TPB (`tpbank`, `tpb`), VCB (`vietcombank`), TCB (`techcombank`), ACB, BIDV, CTG...
   - Hàm `resolveFinancialAccount` đối chiếu đồng thời:
     - ✅ **Số tài khoản**: Khớp chính xác `account_number`.
     - ✅ **Ngân hàng**: Khớp chính xác `gateway` với ngân hàng đăng ký.
     - ✅ **Phạm vi (Scope)**: Ưu tiên `account_scope = 'SHOP'` khi xử lý thanh toán đơn hàng.

2. **Cập nhật cuộc gọi trong [`backend/src/domains/payments/services/webhookPaymentService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/payments/services/webhookPaymentService.js)**:
   - Truyền tường minh `gateway: payload.gateway` và `accountScope: "SHOP"` cho cả luồng Tiền vào (`creditFinancialAccount`) và Tiền ra (`debitFinancialAccount`).

3. **Kiểm thử Unit Test**:
   - Test suite [`backend/tests/unit/matchBankGateway.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/matchBankGateway.test.js): **PASS 100%**.
   - Xác nhận: Với cùng STK `0378304963`, webhook MBBank chỉ khớp duy nhất với TK #2 (MB Bank Shop), tuyệt đối không bao giờ khớp nhầm sang TK #1004 (VPBank Cá nhân).

---

## 3. KẾT QUẢ ĐIỀU CHỈNH & HOÀN TRẢ SỐ LIỆU QUÁ KHỨ (ACID)

Thực thi qua script transaction [`backend/scripts/fix_webhook_bank_match_and_rebalance.js`](file:///e:/Project/admin_store/admin_orderlist/backend/scripts/fix_webhook_bank_match_and_rebalance.js):

- **Số bản ghi sổ cái được hoàn trả**: **14 bản ghi** (từ 26/10/2026 đến 01/11/2026).
  - 8 giao dịch tiền vào (`receipt_in`): +4,020,254 ₫.
  - 6 giao dịch tiền ra (`receipt_out`): -3,783,000 ₫.
  - Chênh lệch thực tế hoàn trả: **+237,254 ₫**.
- **Chuyển toàn bộ 14 bản ghi ledger**: Từ `financial_account_id = 1004` ➔ `financial_account_id = 2`.
- **Cân đối số dư sau khi hoàn trả**:
  - **TK #1004 (Tài khoản cá nhân - VPBank)**:
    - Số dư: `237,254 ₫` ➔ **`0 ₫`** (chuẩn xác số dư thực tế ban đầu).
    - Tổng thu: `0 ₫` | Tổng rút: `0 ₫`.
  - **TK #2 (MB Bank Shop)**:
    - Số dư: `15,326,083 ₫` ➔ **`15,563,337 ₫`** (+237,254 ₫).
    - Tổng thu: tăng thêm `+4,020,254 ₫`.
    - Tổng rút: tăng thêm `+3,783,000 ₫`.

---

## 4. KẾT LUẬN & ĐẢM BẢO HỆ THỐNG
- Webhook SePay từ nay trở đi sẽ tự động phân giải chính xác 100% vào tài khoản Shop theo cặp đôi **(Số tài khoản + Ngân hàng)**.
- Tài sản cá nhân không còn bị ảnh hưởng hay phình to ảo bởi các đơn hàng của Shop.


# Kế Hoạch Tối Ưu Hóa Cấu Trúc Database

*   **Ngày lập kế hoạch**: 2026-08-07
*   **Người lập kế hoạch**: AI Coding Assistant (Antigravity)
*   **Trạng thái**: Đã Hoàn Thành (100%)

---

## 1. Mục Tiêu & Phạm Vi
Kế hoạch này nhằm tái cấu trúc và tối ưu hóa sâu hơn hệ thống cơ sở dữ liệu của dự án `admin_orderlist`, giúp tăng cường tính mở rộng (khi thêm các cổng thanh toán mới), tránh sai lệch số liệu thống kê và đơn giản hóa vòng đời của các tài khoản/key sản phẩm số được bán ra.

---

## 2. Các Đề Xuất Tối Ưu Hóa Chi Tiết

### Đề xuất 1: Hợp nhất Tài khoản Ngân hàng và Ví điện tử (Unified Accounts Model)
*   **Vấn đề hiện tại**: Tách riêng tài khoản ngân hàng (`finance.shop_bank_accounts`, `finance.shop_bank_account_ledger`) và ví USDT (`finance.usdt_wallets`, `finance.usdt_wallet_ledger`). Việc này lặp cấu trúc và cản trở tích hợp các phương thức thanh toán mới như MoMo, ZaloPay, Paypal.
*   **Giải pháp**:
    *   Tạo bảng **`finance.financial_accounts`** chứa loại tài khoản (`bank`, `usdt`, `momo`, `paypal`...).
    *   Tạo bảng **`finance.financial_account_ledger`** lưu vết biến động cho toàn bộ tài khoản.
    *   Di chuyển dữ liệu cũ từ 4 bảng cũ sang 2 bảng mới và xóa các bảng cũ.

### Đề xuất 2: Chuyển Báo cáo Tháng thành Database View (Dashboard Monthly View)
*   **Vấn đề hiện tại**: Báo cáo ngày (`dashboard_daily_revenue_summary`) và báo cáo tháng (`dashboard_monthly_summary`) đang là các bảng vật lý độc lập, dẫn đến nguy cơ sai lệch số liệu nếu việc đồng bộ hóa gặp lỗi.
*   **Giải pháp**:
    *   Giữ lại bảng báo cáo ngày.
    *   Chuyển bảng báo cáo tháng thành một **View** hoặc **Materialized View** tự động gom nhóm (`GROUP BY month_key`) và tính tổng (`SUM`, `COUNT`) từ bảng ngày.

### Đề xuất 3: Hợp nhất Kho key sản phẩm và Key đã bán (Unified Product Key Lifecycle)
*   **Vấn đề hiện tại**: `business.product_stocks` (key chưa bán) và `system_automation.order_list_keys` (key đã bán) là 2 bảng tách biệt, khiến luồng mua/hoàn key phải xóa và chèn qua lại giữa các bảng, tăng nguy cơ mất mát dữ liệu.
*   **Giải pháp**:
    *   Tạo bảng duy nhất **`business.product_keys`** quản lý toàn bộ key sản phẩm.
    *   Bổ sung cột `status` (`'available'`, `'sold'`, `'expired'`, `'revoked'`) và cột `order_list_id` (ID đơn hàng đã mua, có thể `NULL`).
    *   Chuyển dữ liệu key hiện có vào bảng mới và cập nhật trạng thái tương ứng.

### Đề xuất 4: Đổi tên bảng `accounts_admin` để tránh gây nhầm lẫn
*   **Vấn đề hiện tại**: Bảng cấu hình bot/mail tự động `accounts_admin` rất dễ bị nhầm với bảng tài khoản đăng nhập admin `users`.
*   **Giải pháp**: Đổi tên bảng thành **`system_automation.system_bot_accounts`**.

---

## 3. Kế Hoạch Triển Khai & Kiểm Thử
1.  **Viết Migrations**: Tạo các file migration tương ứng cho từng đề xuất để di chuyển dữ liệu cũ an toàn.
2.  **Đồng bộ hóa Codebase**: Tìm kiếm và sửa đổi tất cả các query, repository, use-case tham chiếu đến bảng cũ.
3.  **Kiểm thử tích hợp**: Chạy bộ suite test thanh toán SePay, webhook tự động, hoàn tiền credit để bảo đảm không xảy ra regression lỗi.

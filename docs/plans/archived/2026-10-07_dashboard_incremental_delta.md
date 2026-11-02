# KẾ HOẠCH KHÔI PHỤC LUỒNG INCREMENTAL DELTA CHO DASHBOARD V2
**Tác giả:** Orchestrator Agent (Tech Lead)
**Ngày lập:** 2026-10-07

## 1. Bối cảnh & Mục tiêu
- **Vấn đề:** Dashboard hiện tại đang chạy query `SUM()`, `COUNT()` trực tiếp vào `order_list`, gây hao tổn tài nguyên và không đúng với thiết kế gốc của hệ thống.
- **Mục tiêu:** Khôi phục lại luồng **Cộng dồn vi mô (Incremental Delta)**:
  - Khi có sự kiện thay đổi trạng thái đơn hàng (Tạo, Thanh toán, Hủy, Hoàn tiền), hệ thống tự động tính toán số chênh lệch (Delta) và ghi đè cộng dồn vào bảng tổng hợp.
  - Khi xem Dashboard, chỉ cần query `SELECT * FROM bảng_tổng_hợp` để lấy số realtime với tốc độ < 0.01ms.

## 2. Phân công Đội ngũ (Team Delegation)

### 👨‍💻 Backend Specialist Agent
- **Task 1:** Rà soát lại `v2/backend/src/domains/dashboard/services/dashboardService.js`.
- **Task 2:** Tạo Event Listeners trong `v2/backend/src/events/subscribers/` để lắng nghe các event như `ORDER_PAID`, `ORDER_CANCELED`, `ORDER_REFUNDED`. (Tạm thời chưa)
- **Task 3:** Viết hàm tính Delta (cộng/trừ) và thực thi lệnh SQL Update thẳng vào bảng summary. Cập nhật lại API Get Summary để trỏ về bảng tổng hợp. (Tạm thời chưa)

### 🕵️ Security & Auditor Agent
- **Task 4:** Review mã nguồn sau khi Backend hoàn thành. Đảm bảo Transaction (Knex) được bao bọc chặt chẽ, tránh race condition khi nhiều đơn hàng cùng update một lúc (Row-level lock nếu cần).

### 🤖 QA Automation Agent
- **Task 5:** Viết các Unit/Integration test trong thư mục `tests/` để mô phỏng việc tạo đơn -> thanh toán -> hủy đơn, và assert (kiểm tra) xem số liệu trong bảng Dashboard có nhảy đúng từng đồng lẻ hay không.

## 3. Kiến trúc CSDL đề xuất cho Summary
Chúng ta sẽ sử dụng lại bảng `finance.dashboard_monthly_summary` (hoặc daily) nhưng sẽ điều khiển việc cập nhật số liệu hoàn toàn bằng Event Bus.

## 4. Rủi ro & Backup
- Quá trình chuyển đổi có thể làm sai lệch số liệu hiện hành. Cần chạy một script Backfill (quét 1 lần) để tính lại chốt sổ hiện tại trước khi bật Event Listener.

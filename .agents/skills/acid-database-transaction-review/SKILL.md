---
name: acid-database-transaction-review
description: >
  Kiểm tra luồng ghi DB (đơn, thanh toán, hoàn, doanh thu, lợi nhuận, NCC, tồn kho, ví)
  theo ACID: atomicity, consistency, isolation, durability. Dùng khi review PR, thiết kế API,
  webhook payment, hoặc thao tác nhiều bảng.
---

# ACID Database Transaction Reviewer

## Mục tiêu

Bạn là chuyên gia kiểm tra tính đúng đắn của hệ thống database theo **ACID**. Phân tích các luồng backend, đặc biệt khi **nhiều bảng** thay đổi cùng lúc hoặc có **gọi lặp / đồng thời**.

## Bốn nguyên tắc (nhắc việc)

- **Atomicity:** Một nghiệp vụ thành công **toàn bộ** hoặc thất bại **toàn bộ** (cùng commit/rollback).
- **Consistency:** Sau khi ghi, dữ liệu **hợp lệ** theo rule nghiệp vụ (ràng buộc, tổng khớp quy ước).
- **Isolation:** Request chạy **song song** không làm **lost update**, double-apply, hoặc đọc/ghi lệch.
- **Durability:** Sau **commit**, dữ liệu được DB bảo toàn (mặc định Postgres; lưu ý nếu có bước ngoài DB).

## Khi nào dùng skill này

- Tạo / sửa / xóa đơn hàng; hoàn tiền; đổi trạng thái thanh toán.
- Ghi doanh thu, lợi nhuận, chi phí nhập, `dashboard_*`, log NCC.
- Cập nhật số dư, ví, tồn kho, công nợ.
- Webhook payment / import / migration / bất kỳ insert–update–delete **đa bảng**.
- API có thể bị **retry** hoặc **concurrent** từ nhiều client.

## Chiến lược review (thứ tự bắt buộc)

### 1. Xác định nghiệp vụ chính

- Mô tả **một câu** use case (vd. “Webhook Sepay ghi nhận thanh toán đủ cho đơn X”).
- Liệt kê **mọi bảng** có thể bị ảnh hưởng (đơn, `payment_receipt`, `supplier_order_cost_log`, `dashboard_monthly_summary`, `store_profit_expenses`, ví, tồn kho, …).

### 2. Kiểm tra Atomicity

- Toàn bộ bước ghi phụ thuộc có nằm trong **một transaction** (Knex `transaction`, `BEGIN`/`COMMIT` với `pg`) không?
- **Sai:** Chuỗi `await` nhiều query độc lập mà không transaction — lỗi giữa chừng để lại trạng thái **nửa vời**.
- **Trigger Postgres:** Thường chạy trong **cùng transaction** với câu lệnh kích hoạt; lỗi trong trigger → rollback toàn bộ (trừ khi xử lý exception đặc biệt).

### 3. Kiểm tra Consistency

- Sau commit, rule nghiệp vụ có còn đúng không? (tổng KPI vs nguồn nếu có hợp đồng hành vi; không vi phạm CHECK/FK; trạng thái đơn vs biên lai).
- Tránh **double-count:** app cộng dồn + **trigger** cùng cộng một chỉ số; webhook **retry** không idempotent.

### 4. Kiểm tra Isolation

- Hai request cùng tài nguyên (cùng đơn, cùng phiếu, cùng dòng ví) có thể **race** không?
- Cần: `SELECT … FOR UPDATE`, khóa optimistic (version), **unique constraint** + upsert, **idempotency key** / dedupe webhook, hoặc hàng đợi tuần tự.

### 5. Kiểm tra Durability

- Sau khi API báo thành công, đã **commit** DB chưa? (Tránh “commit sau response”.)
- Ghi kép DB + hệ thống khác: cần **outbox / saga** hoặc thứ tự rõ ràng nếu không transaction xuyên hệ thống.

## Phạm vi monorepo `admin_orderlist`

- Backend: `backend/src/**`, `backend/webhook/**`, script `backend/scripts/**` có ghi DB.
- Đối chiếu tài liệu nghiệp vụ tài chính / dashboard khi có: `docs/tong-quan-du-an.md`, `docs/huong-dan-dashboard.md`.
- Migration: DDL có thể chạy ngoài transaction ứng dụng; vẫn cần **tính nhất quán** sau migrate (backfill, không trigger trùng logic app).

## Output mong đợi khi review

1. Tóm tắt nghiệp vụ + bảng.
2. Bảng ACID: **Pass / Risk** + lý do ngắn.
3. Nếu có risk: đề xuất hành động **tối thiểu** (bọc transaction, idempotency, lock, bỏ trigger trùng, v.v.).
4. **Không** mở rộng phạm vi ngoài luồng được giao trừ khi phát hiện lỗi chặn nghiêm trọng.

## Tham chiếu code thường gặp

- Transaction Knex / merge dashboard: `backend/src/controllers/**` (Order, Payments, Dashboard).
- Webhook: `backend/webhook/sepay/**`.
- Helper summary / profit khả dụng: `backend/src/controllers/DashboardController/availableProfitFromSummary.js`, `dashboardStoreExpenseDeductions.js`.

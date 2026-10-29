# BÁO CÁO NGHIỆM THU: THU GỌN KHỐI ĐỢT GỘP ĐƠN & CHUẨN HÓA LUỒNG XÓA ĐƠN HÀNG

- **Ngày thực hiện**: 2026-10-29 (Múi giờ: Asia/Bangkok)
- **Dự án**: `admin_orderlist`
- **Người phê duyệt**: 👑 Master (Sếp)
- **Đơn vị thực thi**: Orchestrator Agent & Frontend/Backend Specialists

---

## 1. PHẠM VI NGHIỆM THU

1. **Khối Đợt Gộp Đơn Hàng (Batch Card UI)**:
   - Thu gọn toàn bộ danh sách card con dài dòng tại Mục 2 của [`CreateReceiptModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/CreateReceiptModal.tsx) thành **1 Khối Duy Nhất (Single Row Compact Card)** chuẩn Fintech một hàng ngang liền mạch, thanh thoát.
   - Loại bỏ triệt để các nhãn văn bản thừa (`"MÃ BATCH:"`, `"SỐ TIỀN ĐỢT GỘP"`, `"Gồm 3 đơn con • Bấm để xem chi tiết"`...), chỉ làm nổi bật 3 dữ kiện chính:
     - **Mã Batch**: Font mono rõ nét `#MBP-YYYYMMDD-XXXX` (hoặc mã dự kiến).
     - **Trạng Thái**: Dùng trực tiếp [`StatusBadge`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/StatusBadge.tsx) với 3 trạng thái đơn hàng: **Chưa Thanh Toán** (`UNPAID`), **Đã Thanh Toán** (`PAID`), **Đã Hủy** (`CANCELED`).
     - **Số Tiền**: Số tiền thực tế chuyển khoản font mono to xanh ngọc `450.003 ₫` kèm dòng nhỏ `Gốc 450.000₫ (+3₫)`.
     - Kèm số lượng đơn: `(3 đơn con)` và icon mũi tên `ChevronRight` mở form chi tiết.
   - Khi bấm vào khối ➔ Mở modal view chi tiết các đơn lẻ trong batch ([`BatchSubOrdersModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/BatchSubOrdersModal.tsx)) với đầy đủ tên khách, thông tin gói dịch vụ, giá catalog gốc chuẩn và nút gỡ đơn con.

2. **Chuẩn Hóa Luồng Xóa Đơn Hàng (Order Delete)**:
   - Khắc phục triệt để lỗi đơn "Cần Gia Hạn" bị xóa vĩnh viễn khỏi Database.
   - Đơn **Cần Gia Hạn** (`RENEW_REQUIRED`): Chuyển sang Tab **"Hết Hạn"** (`EXPIRED`), bảo lưu an toàn 100% dữ liệu tài khoản, mật khẩu, email của khách.
   - Đơn **Đã Thanh Toán** (`PAID`): Chuyển thành **"Đã Hủy"** (`CANCELED`), tự động sinh credit note hoàn tiền theo số ngày sử dụng còn lại.
   - Đơn **Chưa Thanh Toán** (`UNPAID`): Mới thực hiện Hard Delete `.del()`.
   - Cả 3 trường hợp đều tự động giải phóng đơn khỏi batch payment pending (`excludeOrderFromPendingBatches`).

3. **Đồng Bộ Giao Diện & Bộ Lọc**:
   - [`OrderDeleteModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderDeleteModal.tsx): Thông báo cảnh báo và nút bấm trực quan tương ứng 3 trường hợp.
   - [`OrderFilterBar.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderFilterBar.tsx): Đổi tên Tab 4 thành **"Đơn Đã Hủy"** và thẻ tổng hợp thành **"TỔNG ĐƠN ĐÃ HỦY"**.

---

## 2. TRẠNG THÁI NGHIỆM THU

- **Trạng thái**: ✅ **ĐẠT (PASSED) — 100% SẴN SÀNG SỬ DỤNG**
- Không có lỗi biên dịch (0 TypeScript errors).
- Không có hồi quy logic (Regression-free).

---

## 3. CÁC KIỂM TRA ĐÃ CHẠY

1. **Backend Unit Tests**:
   - Lệnh: `npm --prefix backend test`
   - Kết quả: **44/44 tests PASSED (100%)**.
2. **Frontend Type Check & Production Build**:
   - Lệnh: `npm --prefix frontend run build`
   - Kết quả: **Vite build thành công (1702 modules transformed, 0 error)**.

---

## 4. CHI TIẾT CÁC TẬP TIN ĐÃ THAY ĐỔI

- [`frontend/src/features/invoices/components/BatchSubOrdersModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/BatchSubOrdersModal.tsx): Modal xem chi tiết & quản lý đơn con trong đợt gộp.
- [`frontend/src/features/invoices/components/CreateReceiptModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/CreateReceiptModal.tsx): Thu gọn Mục 2 thành Single Row Compact Card tinh giản theo phong cách Fintech.
- [`backend/src/domains/invoices/services/batchPaymentService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/invoices/services/batchPaymentService.js): Bổ sung `previewBatchCode` cho đợt gộp dự kiến.
- [`backend/src/domains/orders/services/orderService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js): Logic xóa đơn an toàn, bảo vệ tài khoản khách và đổi thành Đã Hủy.
- [`frontend/src/features/orders/components/OrderDeleteModal.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderDeleteModal.tsx): Giao diện modal xóa phân định rõ 3 trạng thái.
- [`frontend/src/features/orders/components/OrderFilterBar.tsx`](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/OrderFilterBar.tsx): Đồng bộ nhãn tab và thẻ thống kê thành "Đơn Đã Hủy".
- [`backend/tests/unit/orderDeleteStatus.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/orderDeleteStatus.test.js): Bộ test tự động kiểm chứng 3 luồng xóa đơn.

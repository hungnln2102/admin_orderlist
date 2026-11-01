# Báo Cáo Nghiệm Thu: Hệ Thống Realtime Live SSE, Khắc Phục Tên Biến Thể Telegram & Cập Nhật Số Dư MB Bank

**Ngày thực hiện:** 01/11/2026 (Múi giờ Asia/Bangkok: UTC+7)  
**Mục tiêu:**
1. Cập nhật số dư tài khoản MB Bank shop `0378304963` về đúng `8.102.721 ₫` và ghi sổ cái đối soát chuẩn ACID.
2. Sửa quy tắc hiển thị Khối 3 (Slot) trong Card vị trí kho gói (`PackageTable.tsx` & `productService.js`):
   - Nếu đơn hàng match theo cột `slot` (chứa tài khoản gói gốc) ➔ Khối 3 hiển thị email/thông tin trong cột `information_order`.
   - Nếu đơn hàng match theo cột `information_order` ➔ Khối 3 hiển thị vị trí trong cột `slot`.
   - Bỏ điều kiện chặn `@` để hiển thị email khách hàng tự nhiên.
3. Sửa thông báo Telegram khi gia hạn đơn hàng thành công:
   - Tra cứu và in đúng tên biến thể `variant_name` (ví dụ: *"Icloud Gói 400Gb"*, *"Adobe Acc Cấp"*) thay vì hiện số ID thô `99` hoặc `N/A`.
4. Triển khai Hệ thống Real-time Live Stream (Server-Sent Events - SSE):
   - Kết nối `eventBus` với SSE Stream Endpoint `/api/realtime/stream`.
   - Thiết lập `RealtimeProvider` và `useRealtimeEvent` tại Frontend.
   - Tự động làm mới dữ liệu thời gian thực trên `OrdersPage`, `SuppliersPage`, `ReceiptsPage` và hiển thị badge "Live" trên Header.

---

## 1. Phạm Vi & Các File Đã Thay Đổi

### Cơ Sở Dữ Liệu (Database):
- `finance.financial_accounts`: Cập nhật `balance = 8102721.00` cho tài khoản MB Bank shop (ID `2`).
- `finance.financial_account_ledger`: Ghi bản ghi đối soát loại `adjustment` với số tiền `-765.000 ₫`, `balance_after = 8102721.00`.

### Backend:
- `backend/src/domains/products/services/productService.js`:
  - Trong `getPackageProducts`: Bổ sung kiểm tra `isMatchedBySlot`. Nếu match theo `slot` thì gán `slotLabel = ord.information_order || ord.slot`, nếu match theo `information` thì gán `slotLabel = ord.slot || ord.information_order`.
- `backend/src/domains/notifications/telegram/dispatchers/orderNotifier.js`:
  - Trong `notifyOrderRenewed`: Tra cứu bảng `business.variant` theo `id_product` (hoặc query từ `order_list` nếu sự kiện thiếu `id_product`) để lấy chính xác `variant_name`.
- `backend/src/domains/orders/services/orderPaymentService.js`:
  - Truyền bổ sung `id_product` và `price` vào payload sự kiện `ORDER_RENEWED`.
- `backend/src/domains/orders/services/orderService.js`:
  - Truyền bổ sung `id_product` và `price` vào payload sự kiện `ORDER_RENEWED` trong các luồng hoàn tất và gia hạn.
- `backend/src/domains/realtime/services/realtimeStreamService.js` *(Mới)*:
  - Quản lý danh sách SSE clients, cơ chế Heartbeat ping mỗi 20s, tự động dọn dẹp khi ngắt kết nối.
- `backend/src/domains/realtime/subscribers/realtimeSubscriber.js` *(Mới)*:
  - Lắng nghe toàn bộ Domain Events trên `eventBus` và broadcast trực tiếp xuống SSE Stream.
- `backend/src/domains/realtime/routes.js` *(Mới)*:
  - Endpoint `GET /api/realtime/stream`.
- `backend/src/events/index.js` & `backend/src/server.js`:
  - Đăng ký subscriber và mount route `/api/realtime`.

### Frontend:
- `frontend/src/features/packages/components/PackageTable.tsx`:
  - Xóa điều kiện chặn `@`, hiển thị chuẩn xác `assignment.slotLabel` (email khách hoặc slot).
- `frontend/src/shared/context/RealtimeContext.tsx` *(Mới)*:
  - Cung cấp `RealtimeProvider` và hook `useRealtimeEvent`.
- `frontend/src/App.tsx`:
  - Bọc ứng dụng trong `RealtimeProvider`.
- `frontend/src/layout/Header.tsx`:
  - Bổ sung đèn tín hiệu thời gian thực `Live` (chấm xanh nhấp nháy phát sáng).
- `frontend/src/pages/OrdersPage.tsx`:
  - Lắng nghe các sự kiện `ORDER_*` và `WEBHOOK_MONEY_IN` để gọi `refreshOrders()` tự động.
- `frontend/src/pages/SuppliersPage.tsx`:
  - Lắng nghe `SUPPLIER_*` để tự động cập nhật công nợ và lịch sử chi phí NCC tức thì.
- `frontend/src/pages/ReceiptsPage.tsx`:
  - Lắng nghe `WEBHOOK_MONEY_IN` để nạp ngay biên lai mới về danh sách.

---

## 2. Kết Quả Kiểm Thử (Verification)

1. **Database Verification:**
   - Số dư tài khoản MB Bank `0378304963`: Đã cập nhật thành công và chính xác `8.102.721 ₫`.
   - Sổ cái `finance.financial_account_ledger`: Đã ghi nhận bản ghi đối soát.
2. **Backend Unit Tests:**
   - 59/59 unit tests pass 100% trong 819ms.
3. **Frontend Build:**
   - TypeScript biên dịch và Vite bundle thành công sạch sẽ (2.32s).
4. **Trạng Thái Nghiệm Thu:**
   - **HOÀN THÀNH TOÀN BỘ YÊU CẦU CỦA MASTER.**


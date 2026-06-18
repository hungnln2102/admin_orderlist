# Kế Hoạch Refactor `admin_orderlist` Và Database

## 1. Mục Tiêu

- Chuẩn hóa kiến trúc backend theo domain rõ ràng.
- Chuẩn hóa frontend theo feature, giảm file lớn và logic trộn lẫn.
- Chuẩn hóa database cho Website và Admin, có migration đầy đủ.
- Tạo hệ thống audit/log thống nhất cho log hệ thống và log người dùng.
- Giảm lỗi dây chuyền trong các luồng tiền: đơn hàng, biên nhận, hoàn tiền, chi phí, NCC, Sepay.
- Giữ UI/API hiện tại ổn định trong quá trình refactor, tránh thay đổi hành vi không cần thiết.

## 2. Nguyên Tắc Refactor

- Làm theo từng phase nhỏ, mỗi phase phải build/chạy được.
- Không refactor toàn bộ cùng lúc.
- Không đổi response API nếu frontend đang phụ thuộc, trừ khi có migration rõ ràng.
- Không đổi UI/UX nếu không có yêu cầu trực tiếp.
- Mọi thay đổi liên quan tiền, thanh toán, doanh thu, lợi nhuận phải có audit log.
- Migration phải idempotent: chạy lại không lỗi, có `IF EXISTS` / `IF NOT EXISTS` khi phù hợp.
- Backend đi theo domain-first; frontend đi theo feature-first.

## 3. Phase 1 - Audit Hiện Trạng

### Backend

- [ ] Liệt kê toàn bộ domain hiện có trong `backend/src/domains`.
- [ ] Liệt kê các controller đang chứa quá nhiều business logic.
- [ ] Xác định các file cần tách nhỏ trước:
  - [ ] Orders create/update/finance helpers.
  - [ ] Payment/Sepay webhook handlers.
  - [ ] Supplier payment/refund logic.
  - [ ] Dashboard finance aggregation.
  - [ ] Renew Adobe automation.
- [ ] Tạo sơ đồ luồng chính:
  - [ ] Tạo đơn hàng.
  - [ ] Sửa đơn hàng.
  - [ ] Sepay webhook tiền vào.
  - [ ] Sepay webhook tiền ra.
  - [ ] Hoàn tiền NCC.
  - [ ] Tạo/sửa log chi phí.
  - [ ] Renew Adobe check/fix/assign.

### Frontend

- [ ] Liệt kê các page/component đang quá lớn.
- [ ] Ưu tiên kiểm tra:
  - [ ] `frontend/src/features/invoices/index.tsx`
  - [ ] `frontend/src/features/invoices/components/QrModal.tsx`
  - [ ] `frontend/src/components/modals/ViewOrderModal/paymentQr.ts`
  - [ ] `frontend/src/features/renew-adobe/pages/RenewSystemLogsPage.tsx`
  - [ ] Các modal/section của `supply` và `orders`.
- [ ] Ghi lại component nào nên tách thành `components`, `hooks`, `api`, `utils`, `types`.

### Database

- [ ] Liệt kê toàn bộ schema đang dùng:
  - [ ] `orders`
  - [ ] `receipt`
  - [ ] `dashboard` / `finance`
  - [ ] `partner`
  - [ ] `product`
  - [ ] `admin`
  - [ ] `system_automation`
  - [ ] `wallet`
- [ ] Liệt kê bảng nào do Website dùng, bảng nào do Admin dùng, bảng nào dùng chung.
- [ ] Liệt kê trigger/function PostgreSQL đang ảnh hưởng tiền/doanh thu/lợi nhuận.
- [ ] Tạo file tài liệu `docs/DATABASE_MAP.md`.

## 4. Phase 2 - Chuẩn Hóa Database

### Schema & Table

- [ ] Xác nhận schema chuẩn cho từng domain:
  - [ ] `orders`: đơn hàng, payment slot, key mapping đơn.
  - [ ] `receipt`: biên nhận, refund credit, audit payment.
  - [ ] `dashboard`: summary doanh thu/lợi nhuận/chi phí.
  - [ ] `partner`: NCC, payment supply, cost log NCC.
  - [ ] `product`: sản phẩm, variant, package, stock.
  - [ ] `system_automation`: Renew Adobe, key active, system logs.
  - [ ] `admin`: user, role, settings, IP whitelist.
  - [ ] `wallet`: USDT, ledger, wallet types.
- [ ] Chuẩn hóa cột chung:
  - [ ] `id`
  - [ ] `created_at`
  - [ ] `updated_at`
  - [ ] `created_by`
  - [ ] `updated_by`
  - [ ] `metadata JSONB`
- [ ] Đánh dấu bảng legacy hoặc bảng không còn dùng.

### Audit / Log

- [ ] Dùng bảng `system_automation.system_event_logs` làm log chung bước đầu.
- [ ] Chuẩn hóa `log_type`:
  - [ ] `system`
  - [ ] `user`
- [ ] Chuẩn hóa `level`:
  - [ ] `error`
  - [ ] `warn`
  - [ ] `info`
  - [ ] `debug`
  - [ ] `http`
- [ ] Chuẩn hóa `action`:
  - [ ] `CREATE_ORDER`
  - [ ] `UPDATE_ORDER`
  - [ ] `CREATE_EXPENSE`
  - [ ] `UPDATE_EXPENSE`
  - [ ] `SEPAY_WEBHOOK_MATCH`
  - [ ] `SEPAY_WEBHOOK_SKIP`
  - [ ] `SUPPLIER_REFUND`
  - [ ] `RENEW_ADOBE_CHECK`
  - [ ] `RENEW_ADOBE_FIX`
- [ ] Nếu cần chi tiết hơn, tạo thêm bảng sau:
  - [ ] `orders.order_audit_logs`
  - [ ] `receipt.payment_audit_logs`
  - [ ] `dashboard.finance_audit_logs`

## 5. Phase 3 - Refactor Backend Theo Domain

### Target Structure

Mỗi domain nên theo cấu trúc:

```txt
backend/src/domains/<domain>/
  routes.js
  controller/
  use-cases/
  repositories/
  services/
  mappers/
  validators/
  constants.js
```

### Orders

- [ ] Tách `createOrder` thành:
  - [ ] `use-cases/createOrder.js`
  - [ ] `repositories/orderRepository.js`
  - [ ] `services/orderPaymentSlotService.js`
  - [ ] `services/orderNotificationService.js`
  - [ ] `mappers/orderMapper.js`
- [ ] Tách `updateOrder` thành:
  - [ ] `use-cases/updateOrder.js`
  - [ ] `services/orderFinanceSyncService.js`
  - [ ] `services/orderAuditService.js`
- [ ] Ghi audit cho tạo/sửa/xóa/cancel/refund đơn.

### Payments / Sepay

- [ ] Tách webhook Sepay thành các use-case nhỏ:
  - [ ] Parse transaction.
  - [ ] Resolve order code.
  - [ ] Match payment slot.
  - [ ] Insert payment receipt.
  - [ ] Handle off-flow receipt.
  - [ ] Handle outbound transfer.
  - [ ] Write audit.
- [ ] Lưu raw payload webhook vào audit/log.
- [ ] Không thay đổi nội dung chuyển khoản gốc từ Sepay.

### Finance / Dashboard

- [ ] Tách logic summary vào service riêng.
- [ ] Chuẩn hóa ledger cho:
  - [ ] Doanh thu.
  - [ ] Lợi nhuận.
  - [ ] Chi phí.
  - [ ] Refund.
  - [ ] Bank balance.
- [ ] Dashboard chỉ đọc từ summary/ledger đã chuẩn hóa.
- [ ] Viết script đối soát summary với ledger.

### Suppliers

- [ ] Tách logic thanh toán NCC.
- [ ] Tách logic hoàn tiền NCC.
- [ ] Ghi audit khi NCC hoàn tiền hoặc thay đổi cost.
- [ ] Ràng buộc rõ tiền hoàn NCC cộng vào cột/tài khoản nào.

### Renew Adobe

- [ ] Tách page API/controller Renew Adobe theo use-case.
- [ ] Log đầy đủ các thao tác:
  - [ ] Check account.
  - [ ] Auto assign user.
  - [ ] Fix account.
  - [ ] Update tracking.
  - [ ] Error từ automation.
- [ ] Chuẩn hóa `system_event_logs` để trang Log Hệ Thống đọc trực tiếp từ DB.

## 6. Phase 4 - Refactor Frontend Theo Feature

### Target Structure

```txt
frontend/src/features/<feature>/
  pages/
  components/
  hooks/
  api/
  types.ts
  utils/
```

### Invoices

- [ ] Tách `frontend/src/features/invoices/index.tsx` thành:
  - [ ] `pages/InvoicesPage.tsx`
  - [ ] `components/InvoiceTabs.tsx`
  - [ ] `components/ReceiptsPanel.tsx`
  - [ ] `components/OffFlowReceiptsPanel.tsx`
  - [ ] `components/InvoicePagination.tsx`
  - [ ] `hooks/usePaymentReceipts.ts`
  - [ ] `hooks/useOffFlowReceipts.ts`
  - [ ] `api/invoicesApi.ts`
- [ ] Giữ UI 2 tab hiện tại.
- [ ] Không đổi logic phân trang nếu không cần.

### QR / VietQR

- [ ] Gom logic tạo QR về một nơi:
  - [ ] `features/invoices/utils/vietQr.ts`
  - [ ] hoặc `shared/utils/vietQr.ts` nếu nhiều feature dùng chung.
- [ ] Không để nhiều component tự build URL VietQR khác nhau.
- [ ] Viết test/helper kiểm tra URL QR.

### Renew Adobe Logs

- [ ] Tách `RenewSystemLogsPage.tsx` thành:
  - [ ] `pages/RenewSystemLogsPage.tsx`
  - [ ] `components/SystemLogTabs.tsx`
  - [ ] `components/SystemLogFilters.tsx`
  - [ ] `components/SystemLogCard.tsx`
  - [ ] `hooks/useSystemLogs.ts`
  - [ ] `api/systemLogsApi.ts`
- [ ] Giữ 2 tab:
  - [ ] `Log hệ thống`
  - [ ] `Log người dùng`
- [ ] Thêm filter nâng cao sau khi DB log ổn định:
  - [ ] action
  - [ ] entity
  - [ ] actor
  - [ ] date range

### Supply

- [ ] Tách các modal thanh toán NCC.
- [ ] Tách logic settlement khỏi UI.
- [ ] Tách hook gọi API payment NCC.

## 7. Phase 5 - Chuẩn Hóa Luồng Tiền

- [ ] Định nghĩa rõ các loại tiền:
  - [ ] Tiền khách trả.
  - [ ] Tiền webhook ngoài luồng.
  - [ ] Tiền hoàn NCC.
  - [ ] Tiền chi phí shop.
  - [ ] Tiền rút bank.
  - [ ] Tiền USDT.
- [ ] Mỗi biến động tiền phải có ledger hoặc audit tương ứng.
- [ ] Không cập nhật trực tiếp summary mà không có context/audit.
- [ ] Tạo đối soát:
  - [ ] Tổng receipt vs dashboard revenue.
  - [ ] Tổng expense vs dashboard cost.
  - [ ] Tổng supplier refund vs bank balance.
  - [ ] Tổng off-flow vs off-flow summary.

## 8. Phase 6 - Test Và Công Cụ Đối Soát

### Backend Test

- [ ] Test tạo đơn hàng.
- [ ] Test sửa đơn hàng.
- [ ] Test Sepay webhook match đúng đơn.
- [ ] Test Sepay webhook tiền ngoài luồng.
- [ ] Test outbound transfer.
- [ ] Test tạo/sửa chi phí.
- [ ] Test supplier refund.
- [ ] Test Renew Adobe log.

### Scripts

- [ ] Script đối soát dashboard monthly summary.
- [ ] Script đối soát payment receipt.
- [ ] Script kiểm tra bảng/cột thiếu migration.
- [ ] Script kiểm tra dữ liệu legacy cần backfill.

## 9. Phase 7 - Tài Liệu Vận Hành

- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/DATABASE_MAP.md`
- [ ] `docs/MONEY_FLOW.md`
- [ ] `docs/SEPAY_WEBHOOK_FLOW.md`
- [ ] `docs/RENEW_ADOBE_FLOW.md`
- [ ] `docs/AUDIT_LOGS.md`
- [ ] `docs/DEPLOYMENT_CHECKLIST.md`

## 10. Thứ Tự Ưu Tiên Thực Thi

1. Hoàn thiện bảng log/audit và chạy migration.
2. Refactor backend `orders` vì đây là nguồn nhiều luồng tiền.
3. Refactor backend `payments/sepay` để giảm lỗi thanh toán.
4. Refactor backend `finance/dashboard` để chuẩn hóa doanh thu/lợi nhuận.
5. Refactor frontend `invoices` vì file lớn và liên quan thanh toán.
6. Refactor frontend `renew-adobe logs` sau khi DB log ổn định.
7. Viết tài liệu và script đối soát.

## 11. Checklist Trước Mỗi Phase

- [ ] Tạo branch riêng.
- [ ] Pull latest `main`.
- [ ] Chạy build hiện tại để biết baseline.
- [ ] Ghi rõ phạm vi file được sửa.
- [ ] Không sửa lẫn nhiều domain trong một phase nếu không bắt buộc.
- [ ] Sau khi sửa, chạy validation phù hợp.

## 12. Lệnh Kiểm Tra Khuyến Nghị

```bash
npm --prefix frontend run build
npm --prefix backend run migrate:status
npm --prefix backend run lint
```

Nếu chỉ sửa một file backend cụ thể:

```bash
node -c backend/src/path/to/file.js
```

Nếu có migration mới:

```bash
npm --prefix backend run migrate
```


## Phụ Lục - Audit Database

- Báo cáo tối ưu database ban đầu: `docs/DATABASE_OPTIMIZATION_AUDIT.md`
- Báo cáo này so sánh nhanh schema/bảng giữa `Website/my-store` và `admin_orderlist`, đồng thời liệt kê các nhóm bảng nên tối ưu theo mức ưu tiên.

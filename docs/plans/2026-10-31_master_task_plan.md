# 📋 MASTER TASK PLAN — KẾ HOẠCH & TIÊU CHÍ NGHIỆM THU KỸ THUẬT (2026-10-31)

> **Người lập:** 📝 Thư Ký Quy Hoạch & Ký Ức Sống (Lead Planner & Chronicler)  
> **Chủ nhân tối cao:** 👑 Master (Sếp)  
> **Ngày lập:** 31/10/2026 (Múi giờ: `Asia/Bangkok`)  
> **Phiên bản:** 2.0 (Đã tích hợp toàn diện khuyến nghị từ Bản Đánh Giá Kế Hoạch `report/2026-10-31-master-task-plan-review.md`)  
> **Vị trí tài liệu:** **`docs/plans/2026-10-31_master_task_plan.md` (CANONICAL SINGLE SOURCE OF TRUTH)**

---

## 🎯 DANH SÁCH 4 HẠNG MỤC CỐT LÕI

---

### 📌 Mục 1: Đồng Bộ Số Trang Lên URL Khi Chuyển Page (URL Pagination Sync)

#### 1.1. Quyết định & Định dạng URL
- **Định dạng**: **Query Params chuẩn Dashboard** (`?page=3`).
- **Ví dụ**: `https://admin.mavrykpremium.com/orders?tab=active&page=3&status=ALL`
- **Các trang áp dụng**:
  1. `OrdersPage` (`/orders`) — Quản lý Đơn Hàng (qua `useOrders.ts`).
  2. `PricingPage` (`/pricing`) — Bảng Giá Sản Phẩm.
  3. `WarehousePage` (`/warehouse`) — Kho Hàng.
  4. `ReceiptsPage` (`/invoices`) — Biên Lai & Thu Chi.
  5. `ExternalImportsPage` (`/external-imports`) — Nhập Ngoài Luồng & Chi Tiêu.

#### 1.2. Contract Kỹ Thuật Của Hook `useUrlPagination`
- **Parsing & Clamp**:
  - `rawPage = parseInt(searchParams.get(paramKey), 10)`.
  - Nếu `isNaN(rawPage)` hoặc `rawPage < 1`: fallback về `1`.
  - Khi có `totalPages > 0` và `page > totalPages`: tự động clamp về `totalPages`.
- **Reset Page**:
  - Tự động reset `page` về `1` khi bất kỳ bộ lọc nào thay đổi (`search`, `statusFilter`, `activeTab`, `dateRange`).
- **Bảo toàn Query Params**:
  - Khi cập nhật `page`: Merge với toàn bộ các params hiện có trên URL (`...Object.fromEntries(searchParams)`), tuyệt đối không xóa các params khác (`tab`, `search`, `status`, `month`...).
  - Khi `page === 1`: Xóa key `page` khỏi URL để URL sạch đẹp (`/orders`), chỉ hiển thị khi `page > 1`.
- **Lịch sử trình duyệt (History API)**:
  - Khi người dùng bấm nút chuyển trang: Dùng `navigate({ search }, { replace: false })` (push history) để nút **Back / Forward** của trình duyệt lùi/tiến từng trang một cách tự nhiên.
  - Khi người dùng gõ tìm kiếm hoặc đổi filter: Dùng `{ replace: true }` để không làm ô nhiễm lịch sử duyệt web.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Bấm chuyển sang trang 3 -> URL hiện `?page=3`.
  - F5 reload -> Giữ nguyên trang 3 và dữ liệu trang 3.
  - Bấm Back -> Trở về trang 2.
  - Nhập search mới -> URL tự reset về `page=1`.

---

### 📌 Mục 2: Ranh Giới Kho Hàng — Quản Lý Cấp Độ TÀI KHOẢN & Tag Biến Thể (KHÔNG QUẢN LÝ SLOT)

#### 2.1. Phân Tách Ranh Giới Trách Nhiệm (Separation of Concerns)
- **Kho Hàng (`/warehouse`) — Quản trị Két Tài Khoản (Account-Level)**:
  - Mục đích: Quản lý **sản phẩm đó có bao nhiêu TÀI KHOẢN và các tài khoản đó là gì** (thông tin đăng nhập, mật khẩu, 2FA, email backup, hạn dùng, Chrome isolated profile).
  - **Loại bỏ hoàn toàn khái niệm Slot trong Kho Hàng**: Dọn dẹp câu chữ, không tính toán hay hiển thị slot lẻ gây rối mắt. Đơn vị đếm duy nhất là **Tài Khoản (Accounts)**.
  - **Cơ chế Tag Biến Thể**:
    - Sản phẩm cha: `Google One` (liên kết với `business.product`).
    - Mỗi tài khoản thuộc sản phẩm cha sẽ mang một **Tag Biến Thể** cụ thể (`5TB`, `2TB`, `100GB`).
    - Tab Danh Mục Kho: Thống kê tổng số tài khoản của `Google One`, chi tiết theo từng tag (`5TB: 2 tài khoản`, `2TB: 3 tài khoản`).
- **Gói Sản Phẩm (`/package-products`) — Quản trị Bán Lẻ & Gán Slot (Slot-Level)**:
  - Giữ nguyên là nơi duy nhất quản lý **Slot**: chia slot cho khách lẻ, theo dõi slot trống/đang dùng, và tự động matching với đơn hàng bán ra.

#### 2.2. Data Model & Migration An Toàn (Backward-Compatible)
- **Cơ sở dữ liệu**:
  - Bảng `warehouse.stock_services` hiện đang lưu trữ thông tin đăng nhập, hạn dùng, trạng thái và ghi chú.
  - Tạo migration: Bổ sung cột `variant_tag VARCHAR(100) NULL` vào bảng `warehouse.stock_services`.
  - Index: `CREATE INDEX idx_stock_services_variant_tag ON warehouse.stock_services(variant_tag);`.
  - Cập nhật `tables.js` và `dbSchema.js` theo đúng skill `db-schema-source-of-truth`.
  - Backfill an toàn: Các tài khoản hiện có nếu chưa có tag sẽ lấy giá trị fallback từ tên dịch vụ hoặc để trống `Mặc định`, bảo đảm không làm mất bất kỳ dữ liệu nào.
- **Backend APIs (`domains/warehouse`)**:
  - `listWarehouseAccounts`: Trả về `variant_tag` cho từng tài khoản/dịch vụ.
  - `listCatalogItems`: Tính toán đếm `total_accounts` và gom nhóm `variants: [{ tag: '5TB', account_count: 2 }, ...]` (bỏ các trường slot trống/đang dùng).
  - `addServiceSlotToAccount` / `updateWarehouseServiceSlot`: Hỗ trợ lưu và cập nhật `variant_tag`.
- **Frontend UI (`features/warehouse`)**:
  - Dọn sạch thuật ngữ: Đổi "Slot" -> "Tài Khoản" trên toàn bộ trang.
  - `WarehouseCatalogGrid`: Hiển thị chip tags biến thể kèm số tài khoản tương ứng.

---

### 📌 Mục 3: Sắp Xếp Tab Đơn Hết Hạn — Đơn Mới Vừa Hết Hạn Xếp Lên Đầu

#### 3.1. Điểm Nghẽn Hiện Tại & Phạm Vi Cô Lập
- **Nguyên nhân**: Câu lệnh SQL trong `orderService.js` đang dùng chung `expired_at ASC NULLS LAST` cho mọi tab. Khiến đơn hết hạn từ năm ngoái (`22/11/2025`) có ngày nhỏ nhất bị xếp lên đầu trang 1; đơn mới hết hạn hôm nay/hôm qua bị đẩy xuống tận các trang cuối.
- **Quy tắc cô lập an toàn**:
  - **Chỉ áp dụng riêng cho `tab === "expired"`**:
    ```javascript
    if (tab === "expired") {
      query = query.orderByRaw("expired_at DESC NULLS LAST, id DESC");
    } else {
      // Giữ nguyên 100% logic sắp xếp hiện hữu cho các tab active, import, canceled
      query = query.orderByRaw(`
        CASE
          WHEN status = '${ORDER_STATUS.UNPAID}' THEN 1
          WHEN status = '${ORDER_STATUS.PROCESSING}' THEN 2
          WHEN status = '${ORDER_STATUS.RENEW_REQUIRED}' THEN 3
          WHEN status = '${ORDER_STATUS.PAID}' THEN 4
          ELSE 5
        END ASC,
        expired_at ASC NULLS LAST,
        id DESC
      `);
    }
    ```
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Khi xem `/orders?tab=expired`: Đơn hết hạn hôm nay hoặc hôm qua luôn đứng ở dòng số 1 của Trang 1.
  - Các tab khác (`Đơn Bán Khách Hàng`, `Đơn Nhập Kho`, `Đơn Đã Hủy`) giữ nguyên thứ tự ưu tiên hiện tại, tuyệt đối không bị ảnh hưởng.

---

### 📌 Mục 4 (🔥 TRỌNG TÂM): Suffix Slot NCC ID + Webhook Money Out + Luôn Sinh Biên Lai Minh Bạch

#### 4.1. Quy Chuẩn Ghi Nhận Thực Chi & Suffix Đối Soát
- **Quy tắc tính số tiền VietQR**:
  - `qrAmount = Math.max(0, totalDebt - supplier.id)`
  - Ví dụ: NCC Ades (ID = 1), nợ 150.000 ₫ ➔ Tiền chuyển = **149.999 ₫**.
- **Quy ước bắt buộc cho khoản chênh `supplier.id`**:
  - Biên lai ngân hàng chỉ ghi đúng số tiền thực chi: `payment_receipt.amount = transferAmount = 149.999 ₫`.
  - Chỉ tạo **một** `payment_receipt_allocation` cho NCC với `amount = 149.999 ₫`; `unallocated_amount` về `0` và receipt là `FULLY_ALLOCATED`.
  - `suffixAmount = supplier.id` chỉ là metadata đối soát để khớp giao dịch (`NCC1`), không phải chiết khấu, không phải dòng tiền và **không được tạo allocation/bút toán thứ hai**.
  - Khi giao dịch khớp, toàn bộ log công nợ gốc `totalDebt = 150.000 ₫` được đánh dấu `PAID`; receipt/note audit phải lưu đủ `settledDebt = 150.000 ₫`, `bankPaidAmount = 149.999 ₫`, `suffixAmount = 1 ₫` và `NCC1`.
  - 👉 Trang `/invoices` hiển thị rõ NCC đã chi trả **149.999 ₫**; công nợ NCC được tất toán theo quy ước suffix đối soát.

#### 4.2. Kiến Trúc Service Tất Toán Tập Trung (Single Transaction-Bound Service)
Xây dựng hàm dùng chung duy nhất:
`settleSupplierDebtTransaction({ trx, supplierId, receiptId, amount, isAutoWebhook })`:
1. **Khóa cạnh tranh (Pessimistic Locking)**:
   - Dùng `await trx(TABLES.SUPPLIER).where({ id: supplierId }).forUpdate().first()` để khóa bản ghi NCC.
   - Dùng `await trx(TABLES.SUPPLIER_ORDER_COST_LOG).where({ supply_id: supplierId, ncc_payment_status: 'UNPAID' }).forUpdate()` để khóa toàn bộ log nợ.
2. **Idempotency Guard**:
   - Nếu không còn log `UNPAID` nào (đã được thanh toán bởi webhook trước đó hoặc bấm tay): Trả về thành công ngay, không trừ lặp.
3. **Tái Sử Dụng Biên Lai Webhook (Chống Đúp Receipt)**:
   - Khi nhận Webhook Tiền Ra (`isOutbound === true`):
     - `webhookPaymentService.js` đã tạo sẵn `receiptId` (status `UNALLOCATED`).
     - Hàm tất toán **TÁI SỬ DỤNG CHÍNH `receiptId` NÀY**, chuyển trạng thái sang `FULLY_ALLOCATED`, cập nhật `receiver = supplier.supplier_name`, và tạo allocation.
     - **Tuyệt đối KHÔNG INSERT receipt thứ hai**.
   - Khi Bấm nút thủ công ("Thanh toán" tay trên UI):
     - Tạo 1 `payment_receipt` tiền ra mới trong transaction và phân bổ tương ứng.
4. **Phát Event An Toàn (Post-Commit Only)**:
   - Chỉ bắn `eventBus.emit(EVENTS.SUPPLIER_DEBT_PAID, ...)` sau khi transaction đã commit thành công (`trx.afterCommit`).

#### 4.3. Thuật Toán Nhận Diện Webhook Tiền Ra
- Khi có webhook `isOutbound`:
  - Lấy `transferAmount`.
  - Tìm kiếm NCC đang có công nợ thỏa mãn:
    `supplier.currentDebt === transferAmount + supplier.id`.
  - Đối soát bổ sung: Nếu nội dung chuyển khoản có chứa `NCC${supplier.id}` hoặc STK người nhận trùng với `supplier.number_bank` ➔ Tự động kích hoạt `settleSupplierDebtTransaction`.
  - Công nợ NCC tự động về **0 ₫** ngay lập tức mà Master không cần bấm tay.

---

## 🏗️ KẾ HOẠCH TRIỂN KHAI THEO PHASES & TEST GATES

### Phase 1: URL Pagination Sync (Mục 1)
- [x] Tạo Custom Hook `frontend/src/shared/hooks/useUrlPagination.ts` (kèm parsing, clamp, push/replace contract).
- [x] Tích hợp vào `useOrders.ts`, `PricingPage.tsx`, `WarehousePage.tsx`, `ReceiptsPage.tsx`, `ExternalImportsPage.tsx`.
- [ ] Test Gate 1: Chuyển trang URL đổi, F5 giữ trang, đổi filter reset về page 1, xóa item cuối trang không crash.

### Phase 2: Sắp Xếp Tab Đơn Hết Hạn (Mục 3)
- [x] Tách logic `orderByRaw` cho `tab === "expired"` sang `expired_at DESC NULLS LAST, id DESC` trong `backend/src/domains/orders/services/orderService.js`.
- [ ] Test Gate 2: Gọi API `GET /api/orders?tab=expired`, verify đơn mới hết hạn đứng đầu; gọi tab `active`, `import` verify thứ tự cũ không đổi.

### Phase 3: Suffix Slot NCC & Webhook Money Out & Biên Lai (Mục 4 - Trọng Tâm)
- [x] Sửa logic sinh VietQR trong `supplierService.js` (áp dụng trừ `supplier.id`, thêm cú pháp nội dung `NCC${supplier.id}`).
- [x] Viết hàm tập trung `settleSupplierDebtTransaction` với khóa `forUpdate()`, tái sử dụng receiptId và lưu metadata `settledDebt`/`bankPaidAmount`/`suffixAmount` trong audit note.
- [x] Nâng cấp nhánh `isOutbound` trong `webhookPaymentService.js`: Nhận diện khớp số tiền `amount + supplier.id == debt`, tất toán tự động và chuyển receipt sang `FULLY_ALLOCATED`.
- [x] Đồng bộ hàm thanh toán thủ công `paySupplierDebt` gọi `settleSupplierDebtTransaction` tạo biên lai tiền ra.
- [x] Cập nhật giao diện `ReceiptsPage.tsx` hiển thị badge `Chi Trả NCC`.
- [ ] Test Gate 3:
  - Test chạy giả lập Webhook Money Out: Tiền nợ NCC về 0 ₫, biên lai xuất hiện trên `/invoices`.
   - Test NCC ID `1`, nợ `500.000 ₫`: biên lai và allocation chỉ ghi `499.999 ₫`, không tạo allocation `1 ₫`, audit lưu tổng nợ tất toán `500.000 ₫`.
  - Test bấm tay nút "Thanh toán": Biên lai xuất hiện trên `/invoices`.
  - Test chạy race condition: Webhook và bấm tay đồng thời không bị lỗi double-settlement.

### Phase 4: Ranh Giới Kho Hàng & Tag Biến Thể (Mục 2)
- [x] Migration: Thêm cột `variant_tag` vào `warehouse.account_slots`, index và cập nhật `backend/src/db/tables.js`.
- [x] Backend: Bổ sung DTO/API hỗ trợ `variant_tag`, đếm distinct tài khoản trong catalog.
- [/] Frontend: Bổ sung Tag biến thể vào modal thêm/sửa và số lượng catalog theo Tài Khoản; còn các nhãn Slot cũ ngoài luồng đã sửa.
- [ ] Test Gate 4: Chạy `node backend/scripts/ops/verify-db-schema-config.js` đảm bảo schema khớp 100%; verify hiển thị tài khoản theo Tag.

### Phase 5: Nghiệm Thu Toàn Diện
- [x] Backend Tests: Chạy toàn bộ test suite `npm --prefix backend test`.
- [x] Frontend Build: Chạy `npm --prefix frontend run build` (tsc & vite build 0 error).
- [x] Báo cáo triển khai/điều kiện nghiệm thu Markdown theo chuẩn múi giờ `Asia/Bangkok`.

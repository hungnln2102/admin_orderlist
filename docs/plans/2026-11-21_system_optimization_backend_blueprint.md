# ⚙️ KẾ HOẠCH TỐI ƯU HÓA & PHÂN RÃ BACKEND (BACKEND BLUEPRINT)

## Kế hoạch triển khai theo benchmark

**Phụ trách backend: Codex.** Phần này cập nhật thứ tự thực thi và phạm vi của đề xuất bên dưới. `orderQueryService`, `orderCreditService` và Telegram subscriber đã có. Chỉ mở rộng các module đó khi đầu việc cần đến chúng. Hợp đồng API hiện hành là mốc kiểm thử.

### Mốc đo ngày 21/11/2026

PostgreSQL 16.13 local, phiên chỉ đọc, 915 đơn, 114 biên lai, 56 tài khoản kho và 61 slot. Đo trực tiếp service sau khởi động, 30 lượt tuần tự mỗi kịch bản và 50 lượt với 5 luồng cho các kịch bản có số đo đồng thời. Thời gian gồm DB và xử lý Node.js.

| Luồng | SQL/lượt | p50 (ms) | p95 (ms) | p95 5 luồng (ms) |
|---|---:|---:|---:|---:|
| Tìm đơn gán biên lai | 70 | 6,65 | 22,65 | 31,37 |
| Danh sách Kho | 10 | 33,86 | 42,03 | 112,69 |
| Đơn hàng kèm thống kê | 12 | 5,58 | 17,90 | 31,20 |
| Đơn hàng bỏ thống kê | 6 | 2,44 | 3,23 | — |
| Biên lai | 7 | 2,11 | 3,01 | — |
| Finance Hub tháng | 23 | 7,49 | 15,32 | 41,10 |
| Finance Hub năm | 23 | 7,54 | 8,60 | — |

### Checklist và Pre-Flight

- [ ] **BE-01 · Gom truy vấn giá.** Tìm `MAV` trả 23 đơn và chạy 1 + 23 × 3 SQL. Bóc đường đọc theo lô trong [catalogPricingService.js](../../backend/src/domains/products/services/catalogPricingService.js), giữ thứ tự ưu tiên giá, fallback, kiểu dữ liệu và truyền đúng DB hoặc transaction của caller. Kiểm thử luồng gán biên lai và thanh toán theo lô. Đo số câu SQL khi tăng số đơn trong kết quả.
- [ ] **BE-02 · Thu hẹp dữ liệu mức sử dụng slot.** [warehouseService.js](../../backend/src/domains/warehouse/services/warehouseService.js) gọi [packageProductService.js](../../backend/src/domains/products/services/packageProductService.js) để cộng mức sử dụng. Một truy vấn đơn từ đường này mất 9,66 ms trong EXPLAIN. Trích phần tính dùng chung theo slot, đối chiếu `package_usage` từng slot và đo lại 1/5 luồng.
- [ ] **BE-03 · Kiểm tra thống kê Đơn hàng.** Dùng hợp đồng `includeStats` hiện có trong [orderQueryService.js](../../backend/src/domains/orders/services/orderQueryService.js). Phối hợp FE-09 để giữ thống kê khi chỉ lật trang và lấy lại khi đổi bộ lọc hoặc có sự kiện liên quan.
- [ ] **BE-04 · Đo mutation và outbox.** Đo commit, từng subscriber và tổng độ trễ phản hồi. Kiểm thử backlog vượt 100, lỗi một event, khởi động lại và xử lý trùng. Phương án đưa side effect ra khỏi đường phản hồi phụ thuộc kết quả đo và yêu cầu nhất quán của từng consumer. [eventStoreService.js](../../backend/src/events/eventStoreService.js)
- [ ] **BE-05 · Tách theo nghiệp vụ.** Làm từng đợt cho gia hạn đơn, báo cáo Finance Hub/chốt số dư/quỹ tiết kiệm, và mapping API/routing slot. Tái sử dụng service hiện có, giữ API, khóa, transaction và thứ tự event. Kiểm thử gia hạn/rollback, số dư theo kỳ và ưu tiên routing. [Orders](../../backend/src/domains/orders/services) · [Finance](../../backend/src/domains/finance/services) · [System](../../backend/src/domains/system/services)
- [ ] **BE-06 · Đo tải nền.** Xác minh thực thi trùng giữa cron, chạy bù và chạy tay. Đo EXPLAIN truy vấn hết hạn trước khi chuyển sang khoảng ngày theo múi giờ nghiệp vụ. Đo bộ đệm SSE dưới tải client đọc chậm. [Scheduler](../../backend/src/scheduler) · [SSE](../../backend/src/domains/realtime/services/realtimeStreamService.js)

### Nghiệm thu đợt đầu

Tổng hợp cuối đợt. Bộ unit đạt 168/168 với `--test-force-exit`. BE-05 đã tách thêm gia hạn đơn và routing slot, kiểm tra gia hạn đơn bán và nạp/rút quỹ trên DB kiểm thử. BE-06 đã giới hạn bộ đệm SSE và tối ưu bộ lọc cron 0 ngày theo khoảng giờ Việt Nam. Đối chiếu local cho cùng tập đơn. Probe 1.000 bản tin cho thấy kết nối đọc chậm bị ngắt sau lần báo đầy bộ đệm đầu tiên, kết nối đọc bình thường nhận đủ 1.000 bản tin.

Các mục còn thiếu nghiệm thu gồm gia hạn đơn nhập có đồng bộ Kho, thanh toán theo lô đầu cuối và tải production. Outbox vẫn chờ subscriber sau commit. Cần đo pool và xác minh khả năng xử lý lặp của subscriber trước khi đổi cơ chế dispatch.

Kiểm tra khóa scheduler trên PostgreSQL local xác nhận hai lượt gọi trùng bị bỏ qua khi lượt đầu giữ khóa. Lượt tiếp theo chạy được sau khi nhả khóa. Probe kiểm tra khóa dùng chung, chưa mô phỏng đồng thời ba đường kích hoạt lịch, watchdog và chạy tay.

BE-05 đã hoàn thành phần Finance Hub. Tách chốt số dư cá nhân và quỹ tiết kiệm thành hai service trong domain Finance. Export và kết quả báo cáo tháng/năm, tổng quan tiết kiệm khớp HEAD trên dữ liệu local. Unit Finance Hub và integration snapshot đạt. Gia hạn đơn, routing slot và integration ghi quỹ tiết kiệm vẫn còn mở.

BE-01 và BE-02 đã triển khai. Đối chiếu chỉ đọc trên 915 đơn và 26 gói cho kết quả khớp bản trước. Tìm đơn gán biên lai giảm 70 xuống 4 SQL, p95 tuần tự 22,65 xuống 4,22 ms. Kho giảm 10 xuống 7 SQL, p95 tuần tự 42,03 xuống 27,22 ms. Với 5 luồng, p95 lần lượt là 10,09 và 78,81 ms. 24 unit test mục tiêu đạt. Thanh toán ghi dữ liệu và đo production còn chờ nghiệm thu.

Backend của BE-03 đã có `includeStats=false` từ route đến service. Đội frontend phụ trách thời điểm gửi tham số.

BE-04 đã kiểm chứng đường chờ sau commit bằng PostgreSQL local chỉ đọc và subscriber mô phỏng, 15 lượt mỗi mức. p50 toàn luồng là 0,61 ms với subscriber tức thời, 31,37 ms với độ trễ giả lập 25 ms và 108,65 ms với 100 ms. p50 riêng callback tương ứng là 0,02 ms, 27,39 ms và 107,72 ms. Đây là phép đo cơ chế chờ, chưa phản ánh thời gian các subscriber production. Còn kiểm thử restart, backlog trên 100 và idempotency trước khi chuyển dispatch sang nền.

Integration trên `mydtbmav_test` đạt 2 kịch bản thanh toán bằng credit và 5 kịch bản webhook biên lai. Bộ này chưa chạy một giao dịch batch end-to-end.

```gherkin
Scenario: Tìm đơn để gán biên lai sau khi gom truy vấn giá
  Given cùng dữ liệu đơn, biến thể, bảng giá và nhà cung cấp như baseline
  When tìm MAV và tăng số đơn trả về trong giới hạn tìm kiếm
  Then danh sách, thứ tự và giá từng đơn khớp baseline
  And số truy vấn giá giảm so với baseline và không còn ba truy vấn riêng cho mỗi đơn

Scenario: Xem danh sách tài khoản kho sau khi thu hẹp đường đọc
  Given có slot trống, slot có gói và slot có nhiều gói
  When tải danh sách Kho
  Then mức sử dụng từng slot và hợp đồng phản hồi khớp baseline
```

Chạy lại benchmark cùng mẫu dữ liệu và ghi p50, p95, số SQL, payload. Luồng ghi cần integration trên DB kiểm thử riêng. Baseline local chưa đo HTTP production, subscriber trong luồng ghi hoặc độ trễ dưới tải production. Giữ transaction tài chính, quy tắc cấp key và schema runtime theo AGENTS.md.
## Đề xuất ban đầu lưu để đối chiếu

Các mục `BE-GỐC-*` bên dưới là tài liệu tham khảo. Checklist theo benchmark ở đầu file xác định thứ tự và phạm vi triển khai.

> **Vị trí tài liệu:** `docs/plans/2026-11-21_system_optimization_backend_blueprint.md`  
> **Chủ nhân tối cao (Sovereign):** 👑 **Master (Sếp)**  
> **Tổng chỉ huy giám sát:** 👑 **Orchestrator Agent**  
> **Đơn vị thực thi:** Đội ngũ Agent Backend chuyên biệt (`backend-specialist`, `finance-specialist`).  
> **Cơ sở pháp lý tối cao:** [AGENTS.md](file:///e:/Project/admin_store/admin_orderlist/AGENTS.md) — Nguyên Tắc 4 (An Toàn Database & ACID) và Nguyên Tắc 7 (Domain-Driven Architecture & Event Bus).

---

## 🛑 RANH GIỚI BẤT KHẢ XÂM PHẠM TUYỆT ĐỐI CHO BACKEND AGENTS (SACRED REDLINES)

> [!CAUTION]
> **VÙNG CẤM TỬ ĐỊA — KHÔNG ĐƯỢC PHÉP CHẠM VÀO KHI CHƯA CÓ LỆNH RIÊNG TỪ MASTER:**

### 1. Phân Hệ Kế Toán Kép & Dòng Tiền (Finance & Double-Entry Accounting)
- ❌ **CẤM TUYỆT ĐỐI** sửa đổi bảng, cấu trúc cột hoặc logic hạch toán nợ/có (Debit/Credit) của:
  - `business.financial_accounts`
  - `business.financial_transactions`
  - `business.financial_ledgers`
  - `business.financial_receipt_allocations`
  - `business.installment_loans`
  - `business.fixed_costs`
- ❌ **CẤM TUYỆT ĐỐI** sửa đổi Webhook nhận tiền tự động SePay, Webhook MB Bank, QR VietQR và tiến trình đồng bộ IMAP VPBank.
- ❌ Mọi thao tác đọc dữ liệu tài chính bắt buộc bọc qua `financeService.js` hoặc view đã kiểm toán; cấm viết raw SQL tính nhẩm doanh thu/lợi nhuận bỏ qua phí sàn hoặc thuế.

### 2. Quản Trị Database & Migrations
- ❌ **CẤM TUYỆT ĐỐI** chạy `knex migrate:rollback` trên bất kỳ môi trường nào.
- ❌ **CẤM TUYỆT ĐỐI** sửa đổi 47 file migration cũ đã hoàn thành từ Batch 1 đến Batch 28.
- ❌ **BẮT BUỘC** mọi truy vấn bảng/cột runtime phải đi qua [dbSchema.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/dbSchema.js) và `tableName()` + `COLS.*` theo đúng skill [db-schema-source-of-truth](file:///e:/Project/admin_store/admin_orderlist/.agents/skills/db-schema-source-of-truth/SKILL.md).

### 3. Động Cơ Cấp Key & Transactional Lock
- ❌ **CẤM TUYỆT ĐỐI** phá vỡ logic cấp slot theo tag (`product_name_id + variant_tag`) và cơ chế Transactional Lock (`FOR UPDATE`) khi cấp key kích hoạt.

---

## 🧩 DANH SÁCH CÁC TASK BACKEND PHÂN RÃ ĐỘC LẬP (ISOLATED BACKEND TASKS)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MA TRẬN PHÂN CHIA FILE BACKEND                       │
├─────────┬──────────────────────────────────────────────────────────────┤
│ TASK    │ TẬP HỢP FILE PHẠM VI (KHÔNG CHỒNG CHÉO)                      │
├─────────┼──────────────────────────────────────────────────────────────┤
│ BE-GỐC-01   │ backend/src/services/orderQueryService.js (TẠO MỚI)          │
│         │ backend/src/controllers/orderController.js (CHỈ ĐỌC)         │
│ BE-GỐC-02   │ backend/src/events/subscribers/orderTelegramSubscriber.js   │
│         │ backend/src/events/eventBus.js                               │
│ BE-GỐC-03   │ backend/src/services/warehouseSlotProviderService.js         │
│         │ backend/src/services/warehouseSlotService.js (CHỈ REFACTOR)  │
│ BE-GỐC-04   │ backend/src/utils/apiResponse.js (TẠO MỚI)                   │
└─────────┴──────────────────────────────────────────────────────────────┘
```

---

### 🔹 TASK BE-GỐC-01: Bóc Tách Sub-Service Đọc & Lọc Đơn Hàng (Order Query Service)
- **Agent Đảm Nhận**: Backend Agent 1
- **File Tác Động**:
  - Tạo mới: `backend/src/services/orderQueryService.js`
  - Tham chiếu: [backend/src/services/orderService.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/services/orderService.js)
  - Điều hướng: [backend/src/controllers/orderController.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/controllers/orderController.js) (chỉ cập nhật hàm `getOrders`, `getOrderStats`)
- **Mục Tiêu & Việc Cần Làm**:
  - Di chuyển toàn bộ logic câu lệnh Knex query `SELECT`, search, filter theo ngày, phân trang (pagination) và tính tổng thống kê đơn hàng từ `orderService.js` sang `orderQueryService.js`.
  - Giữ cho `orderService.js` chỉ còn lại nhiệm vụ mutate trạng thái đơn hàng và xử lý nghiệp vụ đơn.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM đụng chạm đến hàm tạo đơn hàng mới (`createOrder`), hủy đơn hoặc hoàn tiền.
  - ❌ CẤM đụng chạm đến giao dịch ghi nhận doanh thu hoặc liên kết tài khoản ngân hàng.

---

### 🔹 TASK BE-GỐC-02: Bóc Tách Side-Effect Bắn Tin Telegram Sang Event Subscriber
- **Agent Đảm Nhận**: Backend Agent 2
- **File Tác Động**:
  - Tạo mới: `backend/src/events/subscribers/orderTelegramSubscriber.js`
  - Đăng ký tại: `backend/src/events/index.js`
- **Mục Tiêu & Việc Cần Làm**:
  - Khi đơn hàng được tạo hoặc chuyển trạng thái, thay vì gọi trực tiếp Telegram Bot API bên trong transaction (làm chậm hoặc nghẽn giao dịch nếu mạng lag), chuyển sang mô hình:
    * Transaction chính phát sự kiện `ORDER_CREATED` hoặc `ORDER_STATUS_CHANGED` vào `domain_event_store`.
    * `orderTelegramSubscriber.js` lắng nghe sự kiện bất đồng bộ qua `eventBus` và thực hiện gửi thông báo Telegram an toàn bên ngoài transaction.
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM để lỗi gửi Telegram làm rollback giao dịch đơn hàng chính.
  - ❌ CẤM hardcode token Telegram bot. Lấy từ biến môi trường hoặc cấu hình hệ thống.

---

### 🔹 TASK BE-GỐC-03: Tách Biệt Adapter Điều Phối Slot Kho Bên Thứ 3
- **Agent Đảm Nhận**: Backend Agent 3
- **File Tác Động**:
  - [backend/src/services/warehouseSlotProviderService.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/services/warehouseSlotProviderService.js)
  - [backend/src/services/warehouseSlotService.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/services/warehouseSlotService.js)
- **Mục Tiêu & Việc Cần Làm**:
  - Đóng gói toàn bộ logic gọi API bên ngoài (Fix Ades Status, OTP Gateways, Mail server) vào `warehouseSlotProviderService.js`.
  - `warehouseSlotService.js` chỉ làm việc với database nội bộ (CRUD slot, update ngày hết hạn, gán tag).
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM thay đổi bảng `system_automation.portal_slot_routing_rules`.
  - ❌ CẤM thay đổi logic cấp key kích hoạt theo tag.

---

### 🔹 TASK BE-GỐC-04: Chuẩn Hóa Chuẩn Trả Về API & Serialization Helper
- **Agent Đảm Nhận**: Backend Agent 4
- **File Tác Động**:
  - Tạo mới: `backend/src/utils/apiResponse.js`
- **Mục Tiêu & Việc Cần Làm**:
  - Xây dựng helper chuẩn hóa cấu trúc phản hồi HTTP cho toàn bộ Backend:
    ```js
    module.exports = {
      success: (res, data, message = "Success", statusCode = 200) => {
        return res.status(statusCode).json({ success: true, data, message });
      },
      error: (res, message = "Error", statusCode = 500, errors = null) => {
        return res.status(statusCode).json({ success: false, message, errors });
      }
    };
    ```
- **Ranh Giới Vùng Cấm Riêng (Task Redlines)**:
  - ❌ CẤM phá vỡ các endpoint công khai đang phục vụ Portal khách hàng (`/api/public/portal/*`).

---

## 🧪 QUY TRÌNH KIỂM THỬ & NGHIỆM THU CHO BACKEND
Mỗi Backend Agent sau khi hoàn thành task bắt buộc phải chạy:
```bash
cd backend
npm test # hoặc chạy node check cú pháp file
```
- **Yêu cầu**: 100% cú pháp JS chuẩn, không lỗi import, không có transaction rò rỉ (uncommitted transaction).

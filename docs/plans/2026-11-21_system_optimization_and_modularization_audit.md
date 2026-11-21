# 🏛️ BẢN ĐÁNH GIÁ CHI TIẾT TOÀN BỘ HỆ THỐNG ADMIN_ORDERLIST
## PHÂN TÍCH TỐI ƯU HÓA, TÁI SỬ DỤNG DÙNG CHUNG & PHÂN RÃ MODULE (SYSTEM AUDIT & BLUEPRINT)

> **Vị trí tài liệu:** `docs/plans/2026-11-21_system_optimization_and_modularization_audit.md`  
> **Chủ nhân tối cao (Sovereign):** 👑 **Master (Sếp)**  
> **Tổng chỉ huy phê duyệt:** 👑 **Orchestrator Agent**  
> **Đối tượng thi hành:** Đội ngũ Subagents chuyên trách (Frontend Lead, Backend Specialist, Finance Specialist, QA Automation, Security Auditor).  
> **Cơ sở pháp lý tối cao:** [AGENTS.md](file:///e:/Project/admin_store/admin_orderlist/AGENTS.md) — Hiến Pháp AI Agent Tối Cao (Nguyên tắc 1 đến 8).

---

## 🛑 PHẦN 1: RANH GIỚI BẤT KHẢ XÂM PHẠM — NHỮNG THỨ TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỤNG CHẠM (REDLINES / SACRED BOUNDARIES)

> [!CAUTION]
> **LỆNH TỐI CAO TỪ MASTER**: Mọi Subagent khi thực hiện nhiệm vụ trong hệ thống **BẮT BUỘC PHẢI ĐỌC VÀ TUÂN THỦ 100%** danh sách các vùng cấm dưới đây. Bất kỳ hành vi xâm phạm, tự ý sửa đổi hoặc gây gián đoạn các khu vực này sẽ bị đình chỉ ngay lập tức!

### 1.1. Hệ Thống Nghiệp Vụ Tài Chính, Sổ Cái Kế Toán Kép & Giao Dịch ACID (Finance Domain)
- ❌ **CẤM TUYỆT ĐỐI** can thiệp, sửa đổi cấu trúc bảng hoặc logic hạch toán của các bảng tài chính cốt lõi:
  - `financial_accounts` (Tài khoản ngân hàng, ví USDT, tiền mặt).
  - `financial_transactions` & `financial_ledgers` (Sổ cái kế toán kép - Double-entry Ledger).
  - `financial_receipt_allocations` (Phân bổ biên lai thu/chi).
  - `installment_loans` & `fixed_costs` (Sổ nợ trả góp và chi phí cố định).
- ❌ **CẤM TUYỆT ĐỐI** can thiệp vào các Webhook và tiến trình đối soát thanh toán tự động:
  - Webhook SePay, Webhook MB Bank, QR VietQR tự động.
  - Tiến trình đồng bộ IMAP Email VPBank ([vpbank_imap_email_reconciliation_pipeline](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md)).
- ❌ **CẤM TUYỆT ĐỐI** sửa đổi các transaction đang hoạt động theo chuẩn ACID trong [financeService.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/services/financeService.js) nếu chưa có kịch bản kiểm toán đối soát số dư do Finance Specialist chủ trì và Master ký duyệt.

### 1.2. Database Schema Migrations & Dữ Liệu Runtime
- ❌ **CẤM TUYỆT ĐỐI** chạy lệnh `knex migrate:rollback` trên bất kỳ môi trường nào (kể cả Local lẫn Production).
- ❌ **CẤM TUYỆT ĐỐI** sửa đổi nội dung các file migration cũ đã hoàn thành từ Batch 1 đến Batch 28 (47 file migration hiện hữu). Mọi thay đổi cấu trúc bảng mới bắt buộc phải tạo file migration kế tiếp và khai báo đầy đủ vào [dbSchema.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/dbSchema.js).
- ❌ **CẤM TUYỆT ĐỐI** xóa dữ liệu, truncate bảng hoặc chạy raw query `DELETE` / `UPDATE` thiếu điều kiện `WHERE`.

### 1.3. Bảo Vệ Dữ Liệu & Code Đang Làm Dở Của Master (Work In Progress)
- ❌ **CẤM TUYỆT ĐỐI** ghi đè, hoàn tác (`git checkout --`, `git restore`) hoặc xóa các file Master đang mở hoặc đang code dở mà chưa commit:
  - `otp_portal/src/features/adobe/components/AdobeAccountRecovery.tsx` (Trang tiếp nhận tài khoản thay thế Adobe).
  - Các cấu hình tab kích hoạt trong `frontend/src/features/activationKeys/components/ActivationKeyRulesTab.tsx`.
  - Mọi file có trạng thái sửa đổi chưa commit trên Git của Master.

### 1.4. Động Cơ Cấp Phát Key & Điều Phối Kho Hàng (Order & Activation Engine)
- ❌ **CẤM TUYỆT ĐỐI** phá vỡ logic ràng buộc cấp phát slot theo tag:
  - Logic liên kết cặp `product_name_id + variant_tag` khi cấp activation key.
  - Cơ chế Transactional Lock (`FOR UPDATE`) khi khóa slot tạm thời để tránh tình trạng race-condition (2 khách nhận cùng 1 tài khoản).

### 1.5. Kiến Trúc Hướng Sự Kiện & Transactional Outbox (Event Bus)
- ❌ **CẤM TUYỆT ĐỐI** gọi chéo trực tiếp (Tight Coupling) giữa các domain. Không được phép import trực tiếp service từ Orders sang Telegram Bot hoặc Warehouse.
- ❌ **CẤM TUYỆT ĐỐI** bỏ qua bảng `domain_event_store`. Mọi thay đổi dữ liệu cốt lõi bắt buộc phải ghi event vào cùng transaction (`publishEventInTrx`) trước khi dispatch sang `eventBus`.

---

## 🎯 PHẦN 2: ĐÁNH GIÁ CHI TIẾT CÁC HẠNG MỤC TỐI ƯU HÓA & PHÂN RÃ

### 2.1. FRONTEND: THƯ VIỆN DÙNG CHUNG (DESIGN SYSTEM SSOT)
Theo **Nguyên Tắc 8** trong Hiến Pháp `AGENTS.md`, toàn bộ dự án phải chấm dứt tình trạng tự code lại giao diện thủ công.

#### A. Những Thành Phần ĐÃ Được Đóng Gói Vào Kho Thư Viện Dùng Chung:
Được export tập trung tại `@/shared/components` ([frontend/src/shared/components/index.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/index.ts)):
1. **`<ToggleSwitch />`** ([ToggleSwitch.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/ToggleSwitch.tsx)):
   - Công tắc trượt On/Off chuẩn 6 màu, 3 size (`sm`, `md`, `lg`), có hiệu ứng glow shadow.
   - Đã áp dụng mẫu thành công vào: [SlotProviderControls.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/SlotProviderControls.tsx).
2. **`<CopyButton />`** ([CopyButton.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/CopyButton.tsx)):
   - Nút sao chép tự động chuyển icon `<Check className="text-emerald-400" />` và nhãn "Đã sao chép".
   - Tích hợp hook chuẩn [useClipboard.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/hooks/useClipboard.ts).
3. **`<QuickDateAddButtons />`** ([QuickDateAddButtons.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/QuickDateAddButtons.tsx)):
   - Cụm nút bấm cộng dồn hạn dùng nhanh (`+30 ngày`, `+90 ngày`, `+1 năm`, `Xóa`).
4. **`<DateInputVN />`** ([DateInputVN.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/DateInputVN.tsx)):
   - Ô nhập ngày chuẩn định dạng Việt Nam `dd/mm/yyyy`, tự động format dấu `/`, validate ngày hợp lệ.

#### B. Những Thành Phần CẦN Thay Thế Ngay Bằng Kho Thư Viện Dùng Chung:
| STT | Thành Phần / Vị Trí Hiện Tại | Trạng Thái Trùng Lặp | Giải Pháp Tái Sử Dụng | Mức Ưu Tiên |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **WarehouseCreateModal.tsx** | Tự code 2 nút switch inline `translate-x-5` (`createPackage` & `hasLinkedAccount`) | Thay bằng `<ToggleSwitch variant="cyan" />` | **Cao (Đợt 2)** |
| 2 | **WarehouseEditSlotModal.tsx** | 4 nút copy thủ công bằng `copiedField` state + cụm nút `+30d`, `+90d` | Thay bằng `<CopyButton />` và `<QuickDateAddButtons />` | **Cao (Đợt 2)** |
| 3 | **WarehouseAccountsTable.tsx & SubTable** | Nút sao chép username/key lặp lại | Thay bằng `<CopyButton size="xs" variant="ghost" />` | Trung bình |
| 4 | **FixedCostModal.tsx & InstallmentModal.tsx** | Bố cục modal form dọc chật hẹp, tự format ngày | Chuyển sang chuẩn **Form Ngang 2 Cột** (`max-w-5xl`) + `<DateInputVN />` | Trung bình |
| 5 | **53 files frontend gọi `toLocaleString('vi-VN')`** | Viết rải rác `amount?.toLocaleString('vi-VN') + ' đ'` | Chuyển sang dùng hàm tập trung `formatCurrency()` trong [format.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/utils/format.ts) | Thấp / Dọn dẹp |

---

### 2.2. BACKEND: PHÂN RÃ MODULE & KIẾN TRÚC THEO MIỀN (DOMAIN-DRIVEN)

#### A. Những Điểm Tốt Đã Đạt Được:
- `warehouseSlotService.js` đã được bóc tách một phần sang `warehouseSlotProviderService.js`.
- Bảng `domain_event_store` đã vận hành cơ chế Transactional Outbox an toàn.
- Hệ thống query đã chuẩn hóa schema qua `dbSchema.js` và `tableName()` + `COLS.*`.

#### B. Những Khối Cần Tách (De-monolithize) Tiếp Theo:
1. **Phân rã `orderService.js`**:
   - Hiện trạng: Gánh quá nhiều trách nhiệm (truy vấn danh sách, mutation trạng thái đơn, tính toán tài chính, thông báo khách).
   - Đề xuất tách thành 3 sub-services độc lập:
     * `orderQueryService.js`: Chỉ đảm nhận việc đọc, lọc, phân trang và tìm kiếm đơn hàng.
     * `orderStatusMutationService.js`: Chỉ phụ trách chuyển trạng thái đơn hàng trong transaction.
     * `orderNotificationSubscriber.js`: Đăng ký event `ORDER_STATUS_CHANGED` qua Event Bus để gửi tin nhắn Telegram, không gọi trực tiếp.
2. **Chuẩn hóa API Response & Error Handling**:
   - Hiện trạng: Một số controller trả về `{ success: true, data }`, một số trả trực tiếp mảng `[]`, một số trả `{ status: 'ok' }`.
   - Đề xuất: Đưa về chuẩn thống nhất duy nhất qua helper `apiResponse.success(res, data)` và `apiResponse.error(res, error)`.

---

## 📋 PHẦN 3: PHÂN CÔNG NHIỆM VỤ CHI TIẾT CHO ĐỘI NGŨ SUBAGENT

| Vai Trò | Subagent Đảm Nhận | Nhiệm Vụ Cụ Thể | Ranh Giới Bắt Buộc |
| :--- | :--- | :--- | :--- |
| 🎨 **Frontend** | `frontend-lead` | - Triển khai Đợt 2: Refactor `WarehouseCreateModal` & `WarehouseEditSlotModal` dùng thư viện chung.<br>- Chuẩn hóa các modal tài chính sang Form Ngang 2 Cột.<br>- Dọn dẹp 53 file format tiền tệ thủ công. | BẮT BUỘC mở [COMPONENT_LIBRARY.md](file:///e:/Project/admin_store/admin_orderlist/docs/design-system/COMPONENT_LIBRARY.md) đối chiếu trước khi code; CẤM tự ý code inline button/switch. |
| ⚙️ **Backend** | `backend-specialist` | - Phân rã `orderService.js` thành các sub-services chuyên biệt.<br>- Chuyển các side-effects sang Event Bus Subscribers. | Tuân thủ tuyệt đối [db-schema-source-of-truth](file:///e:/Project/admin_store/admin_orderlist/.agents/skills/db-schema-source-of-truth/SKILL.md); CẤM phá vỡ transaction hiện có. |
| 💰 **Finance** | `finance-specialist` | - Giám sát toàn bộ các thay đổi chạm tới số liệu doanh thu, chi phí, công nợ.<br>- Đảm bảo tính toán đối soát không lệch 1 xu theo chuẩn ACID. | BẢO VỆ TUYỆT ĐỐI bảng sổ cái kế toán và webhook SePay/MB; CẤM tự ý thay đổi logic hạch toán. |
| 🧪 **QA Test** | `qa-automation` | - Viết Unit test cho các component dùng chung mới đóng gói.<br>- Chạy Playwright E2E test cho luồng mở modal kho và submit dữ liệu. | Chạy `npm run build` và test suites sau mỗi đợt refactor; bảo đảm 0 lỗi hồi quy. |
| 🛡️ **Bảo Mật** | `security-auditor` | - Quét việc tái sử dụng code (`code-reuse-auditor`).<br>- Giám sát không rò rỉ secret key hoặc credential trong code client. | Ngăn chặn hardcode credentials và API keys. |

---

## ✅ TIÊU CHUẨN NGHIỆM THU TỔNG THỂ (DEFINITION OF DONE)
1. Mọi component mới hoặc sửa đổi đều tái sử dụng tài nguyên trong `@/shared/components`.
2. Không có thêm bất kỳ đoạn code switch trượt hoặc copy clipboard viết thủ công nào trong các màn hình được refactor.
3. Không vi phạm bất kỳ Redline nào ở Phần 1.
4. Lệnh kiểm tra `npm run build` chạy thành công 100% không cảnh báo lỗi.
5. Cập nhật nhật ký review ngày vào `report/YYYY-MM-DD-daily-review.md`.

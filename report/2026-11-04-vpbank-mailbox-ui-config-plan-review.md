# Báo cáo đánh giá điều chỉnh: Cấu hình Mailbox VPBank qua UI thay thế biến môi trường - 2026-11-04

> **Thời điểm thực hiện:** 2026-11-04 (`Asia/Bangkok`)  
> **Chủ đề:** Tự động hóa thiết lập cấu hình Gmail App Password & Mailbox VPBank qua Giao diện (UI-driven & Database-backed) thay vì gán biến môi trường `.env`.  
> **Phạm vi tài liệu:** 
> - [2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-11-04_vpbank_imap_email_reconciliation_pipeline_plan.md)
> - [2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md](file:///e:/Project/admin_store/admin_orderlist/report/2026-11-04-vpbank-email-reconciliation-comprehensive-audit.md)
> **Trạng thái nghiệm thu:** **ĐẠT (Approved by Master)**

---

## 1. Bối cảnh & Yêu cầu của Master

Trong phương án kế hoạch ban đầu, thông tin đăng nhập Gmail (`VPBANK_GMAIL_USER`, `VPBANK_GMAIL_APP_PASSWORD`) được đề xuất lưu trong file `.env`. Master đã đưa ra chỉ đạo trực tiếp:
> *"chỗ apppassword tôi cần là tôi tự setup không cần gắn biến env"*

Yêu cầu này đặt ra mục tiêu:
1. Master toàn quyền tự cấu hình, chỉnh sửa và kiểm tra kết nối tài khoản Gmail/VPBank trực tiếp qua Giao diện người dùng (UI).
2. Tuyệt đối không lưu mật khẩu ứng dụng vào file cấu hình trên đĩa (`.env`) hoặc Git.
3. Không cần can thiệp file máy chủ hay khởi động lại tiến trình server (Zero Downtime / Hot Reload).

---

## 2. Các điểm điều chỉnh trong Kế hoạch

### 2.1. Đổi mới luồng cấu hình & Quản trị dữ liệu
- **Vị trí lưu trữ SSOT:** Lưu trong cơ sở dữ liệu PostgreSQL (bảng `system_automation.system_configs` theo key nhóm `VPBANK_MAIL_SYNC` hoặc `system_automation.external_api_configs`).
- **Bảo vệ mật khẩu (Secret Masking):** API `GET /api/finance/vpbank/mailbox-config` luôn redact/mask mật khẩu ứng dụng (`has_app_password: true`, `app_password_masked: "••••••••••••••••"`), ngăn chặn lộ lọt credentials ra ngoài giao diện trình duyệt hoặc log mạng.
- **Cơ chế Smart-Merge:** Khi Master cập nhật email hoặc đổi chế độ sync mà không nhập lại mật khẩu, backend tự động giữ nguyên mật khẩu cũ đã lưu, tránh tình trạng phải gõ lại password 16 ký tự mỗi lần lưu.
- **Cơ chế Hot-Reload Worker:** Khi Master lưu cấu hình thành công, backend tự động cập nhật cache in-memory và re-initialize kết nối socket IMAP IDLE / cron job mà không cần restart server Node.js.

### 2.2. Bổ sung thành phần Giao diện (Frontend)
- **Modal cấu hình:** Thêm component `VpbankMailboxConfigModal.tsx` trên thanh Header của [PersonalDebitTransactionsSection.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/PersonalDebitTransactionsSection.tsx).
- **Nút kiểm tra kết nối tức thì:** Nút **`[ 🔌 Kiểm tra kết nối ngay ]`** gọi `POST /api/finance/vpbank/mailbox-config/test-connection` để bắt tay socket `imap.gmail.com:993` và trả về kết quả `Online / Offline / Auth Failure` trong vòng 1-2 giây ngay trên popup.

### 2.3. Bổ sung API Contract
- `GET /api/finance/vpbank/mailbox-config`: Đọc cấu hình hiện tại (đã mask secret).
- `POST /api/finance/vpbank/mailbox-config`: Lưu cấu hình an toàn & reload worker.
- `POST /api/finance/vpbank/mailbox-config/test-connection`: Bắt tay socket kiểm tra xác thực trực tiếp với Gmail IMAP.

### 2.4. Bổ sung Kịch bản nghiệm thu Gherkin
```gherkin
  Scenario: Master tự cấu hình và kiểm tra kết nối Mailbox qua UI
    Given Master mở modal cấu hình Mailbox VPBank trên giao diện
    When Master nhập email, App Password và bấm "Kiểm tra kết nối ngay"
    Then hệ thống thực hiện handshake IMAP với Gmail và hiển thị kết quả thành công tức thì
    And khi Master bấm Lưu, cấu hình được lưu vào database an toàn với mật khẩu được bảo vệ
    And API không trả về mật khẩu thô ra giao diện (luôn masked)
    And worker tự động tải cấu hình mới mà không cần restart server
```

---

## 3. Kiểm tra đã thực hiện

1. **Static Analysis & Schema Path Check:** Xác minh tương thích với `TABLES.SYSTEM_CONFIGS` và pattern bảo mật `externalApiConfigService.js`.
2. **Git Diff Audit:** Kiểm tra chi tiết `git diff docs/ report/`, đảm bảo không còn bất kỳ điều khoản nào yêu cầu cấu hình `VPBANK_GMAIL_APP_PASSWORD` trong `.env`.
3. **Format Integrity:** Đảm bảo toàn bộ link file chuẩn định dạng clickable Markdown `[tên_file](file:///đường_dẫn_tuyệt_đối)` và tiếng Việt có dấu đầy đủ theo đúng Hiến pháp `AGENTS.md`.


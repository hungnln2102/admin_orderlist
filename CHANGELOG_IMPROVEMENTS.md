# Changelog - Cải thiện dự án

## [2026-01-25] - Improvements Batch 1

### 🔒 Security
- **BREAKING**: Loại bỏ hardcode default values trong `telegramOrderNotification.js` và `webhook/sepay/config.js`
  - Tất cả sensitive values phải được set qua environment variables
  - **Migration**: Cập nhật `.env` với các biến mới (xem `.env.example`)
- Tạo `.env.example` đầy đủ với 80+ environment variables

### 📝 Logging
- **NEW**: Thêm Winston logger với daily rotate files
  - File: `backend/src/utils/logger.js`
  - Logs được rotate tự động, separate file cho errors
  - Structured logging với context
- **CHANGED**: Replace `console.log/error/warn` với logger trong:
  - Core: `app.js`, `errorHandler.js`
  - Orders: `crudRoutes.js`, `orderDeletionService.js`, `orderUpdateService.js`, `renewRoutes.js`
  - Auth: `AuthController/index.js`
  - Payments: `PaymentsController/index.js`
  - Scheduler: `scheduler.js`
  - Webhook: `webhook.js`, `renewal.js`
  - Others: `SavingGoalsController`, `SuppliesController/payments.js`, `ProductDescriptionsController`
- **NEW**: Logger integration với Morgan HTTP logging

### 🎨 Frontend
- **CHANGED**: Đổi tên package từ `vite-react-ts-template` → `admin-orderlist-frontend`
- **REMOVED**: Dependencies không cần thiết: `express`, `pg`

### 📚 Documentation
- **NEW**: `docs/BUSINESS_RULES.md` - Tài liệu quy tắc nghiệp vụ
- **NEW**: `docs/IMPROVEMENTS_PROGRESS.md` - Track progress cải thiện
- **NEW**: `docs/VALIDATION_AUDIT.md` - Audit validation
- **NEW**: `docs/TRANSACTION_AUDIT.md` - Audit transactions
- **NEW**: `docs/IMPROVEMENTS_SUMMARY.md` - Tổng kết
- **NEW**: `database/migrations/README.md` - Quy trình migration

### 🛠️ Tools
- **NEW**: `backend/scripts/replace-console-logs.js` - Helper script để batch replace console.* với logger

### 📦 Dependencies
- **ADDED**: `winston`, `winston-daily-rotate-file` (backend)

### ⚠️ Breaking Changes
- **Environment Variables**: Một số biến mới bắt buộc (không còn hardcode defaults)
  - `ORDER_NOTIFICATION_CHAT_ID` hoặc `TELEGRAM_CHAT_ID`
  - `ORDER_QR_ACCOUNT_NUMBER` hoặc `QR_ACCOUNT_NUMBER`
  - `ORDER_QR_BANK_CODE` hoặc `QR_BANK_CODE`
  - Xem `.env.example` để biết đầy đủ

### 🔄 Migration Guide
1. Copy `.env.example` → `.env` và điền các giá trị
2. Đảm bảo tất cả biến môi trường được set (không còn hardcode defaults)
3. Test lại các chức năng Telegram notifications và QR code
4. Review logs trong `backend/logs/` directory

### 📊 Progress
- **Completed**: 8/12 tasks (67%)
- **Remaining**: Database schema migration, Testing, Backend refactor, Console.* replacement (partial)

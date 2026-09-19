# Admin Order List - Version 2 (v2)

Dự án **Ver 2** cơ cấu lại toàn bộ kiến trúc (Clean Architecture), loại bỏ code thừa, chuẩn hóa các domain nghiệp vụ và giữ nguyên 100% cấu hình hệ thống & cơ sở dữ liệu PostgreSQL.

## 📌 Cấu trúc thư mục

```
v2/
├── backend/                   # Backend v2 (Node.js/Express, Knex/PG)
│   ├── src/
│   │   ├── config/            # Tái sử dụng cấu hình DB & .env từ v1
│   │   ├── db/                # Kết nối Knex & PG Pool
│   │   ├── domains/           # Chuẩn hóa theo kiến trúc Domain
│   │   │   ├── payments/      # Webhook Sepay, Slot Suffix, Biên lai đối soát
│   │   │   ├── orders/        # Quản lý Đơn hàng, Trạng thái & Giá bán
│   │   │   ├── renewals/      # Engine tự động gia hạn
│   │   │   ├── wallet/        # Ví Shop Bank, USDT & Sổ cái tài chính
│   │   │   └── suppliers/     # Quản lý Nhà cung cấp & Nhập kho
│   │   ├── middleware/        # Authentication, Error handling
│   │   └── server.js          # Entry point (Cổng 3002)
│   └── package.json
└── README.md
```

## 🚀 Hướng dẫn khởi chạy Ver 2 Backend

1. Cài đặt dependencies:
   ```bash
   cd v2/backend
   npm install
   ```

2. Chạy thử nghiệm Backend v2 (Cổng `3002`):
   ```bash
   npm run dev
   ```

3. Kiểm tra Health Check:
   ```bash
   curl http://localhost:3002/api/health
   ```

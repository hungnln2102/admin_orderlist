# Admin Order List - Hệ thống Quản lý Đơn hàng

Ứng dụng quản lý đơn hàng với tích hợp thông báo Telegram và thanh toán QR code.

## 🚀 Tech Stack

### Backend
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL với Knex.js
- **Authentication**: Express Session
- **Validation**: Express Validator
- **Code Quality**: ESLint + Prettier

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Context + Hooks
- **HTTP Client**: Axios

### Integrations
- **Telegram Bot**: Thông báo đơn hàng tự động
- **Sepay**: QR code thanh toán
- **Google Drive**: Backup database tự động

## 📋 Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm hoặc pnpm

## 🛠️ Setup Instructions

### 1. Clone Repository

```bash
git clone <repository-url>
cd admin_orderlist
```

### 2. Environment Configuration

Copy `.env.example` to `.env` và cập nhật các giá trị:

```bash
cp .env.example .env
```

**Các biến quan trọng cần cấu hình:**
- `DATABASE_URL`: Connection string PostgreSQL
- `TELEGRAM_BOT_TOKEN`: Token của Telegram bot
- `TELEGRAM_CHAT_ID`: ID của group nhận thông báo
- `SEPAY_API_KEY`: API key của Sepay

Xem chi tiết trong `.env.example`.

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Database Setup

```bash
# Tạo database
createdb mydtbmav

# Import schema (nếu có file SQL)
psql -d mydtbmav -f database/schema.sql
```

### 5. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Backend: http://localhost:3001
Frontend: http://localhost:5173

## 📁 Project Structure

```
admin_orderlist/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (app, database, dbSchema)
│   │   ├── controllers/     # Route controllers (Order, Auth, Dashboard, …)
│   │   ├── middleware/      # authGuard, errorHandler, rateLimiter, …
│   │   ├── routes/          # API routes (auth, orders, system, …)
│   │   ├── scheduler/       # Cron: cập nhật đơn hết hạn, thông báo Telegram
│   │   │   ├── config.js
│   │   │   ├── sqlHelpers.js
│   │   │   └── tasks/       # updateDatabase, notifyZeroDays, notifyFourDays
│   │   ├── schema/          # Re-export db schema
│   │   ├── services/        # Business logic (id, order, telegram, …)
│   │   ├── utils/           # orderHelpers, logger, normalizers, …
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # Server entry
│   ├── webhook/             # Sepay webhook server
│   ├── helpers.js           # Re-export → src/utils/orderHelpers
│   ├── scheduler.js         # Re-export → src/scheduler
│   ├── index.js             # Entry point → src/server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # auth (ProtectedRoute), layout (MainLayout, Sidebar), modals, ui
│   │   ├── features/       # auth (login)
│   │   ├── pages/           # Dashboard, Product/*, Personal/*
│   │   ├── routes/         # AppRoutes (định nghĩa Route)
│   │   ├── lib/             # api, notifications, helpers
│   │   └── App.tsx          # Router + AuthProvider + ProtectedRoute + MainLayout
│   └── package.json
├── shared/                  # Code dùng chung (orderStatuses, schema)
├── database/                # Migrations, seeds
├── .env                     # Environment variables
└── README.md
```

## 🔧 Development

### Backend Scripts

```bash
npm run dev          # Start with nodemon (hot reload)
npm start            # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
```

### Frontend Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 📚 API Documentation

Xem chi tiết tại [docs/API.md](docs/API.md)

### Main Endpoints

- `POST /api/orders` - Tạo đơn hàng mới
- `GET /api/orders` - Lấy danh sách đơn hàng
- `PUT /api/orders/:id` - Cập nhật đơn hàng
- `DELETE /api/orders/:id` - Xóa đơn hàng
- `POST /api/orders/:code/renew` - Gia hạn đơn hàng

## 🔐 Environment Variables

Xem file `.env.example` để biết danh sách đầy đủ các biến môi trường.

### Nhóm biến quan trọng:

**Database**
- `DATABASE_URL`
- `DB_SCHEMA_ORDERS`, `DB_SCHEMA_PRODUCT`, `DB_SCHEMA_PARTNER`

**Telegram**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `ORDER_NOTIFICATION_TOPIC_ID`

**Payment**
- `ORDER_QR_ACCOUNT_NUMBER`
- `ORDER_QR_BANK_CODE`

## 🐛 Troubleshooting

### Backend không khởi động được

1. Kiểm tra PostgreSQL đang chạy
2. Kiểm tra DATABASE_URL trong .env
3. Kiểm tra port 3001 không bị chiếm

### Không nhận được thông báo Telegram

1. Kiểm tra TELEGRAM_BOT_TOKEN hợp lệ
2. Kiểm tra TELEGRAM_CHAT_ID đúng
3. Kiểm tra bot đã được thêm vào group
4. Xem logs trong console: `[Order][Telegram]`

### Frontend không kết nối được Backend

1. Kiểm tra FRONTEND_ORIGINS trong .env
2. Kiểm tra CORS configuration
3. Kiểm tra backend đang chạy

## 📝 Code Quality

Project sử dụng ESLint và Prettier để đảm bảo code quality:

```bash
# Backend
cd backend
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run format      # Format code

# Frontend
cd frontend
npm run lint        # Check for issues
```

## 🚀 Deployment

### Docker

```bash
docker compose up -d --build
```

Nếu frontend vẫn giữ bản cũ sau deploy, rebuild sạch container frontend:

```bash
docker compose build --no-cache frontend
docker compose up -d --force-recreate frontend
```

### Manual Deployment

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Start backend:
```bash
cd backend
NODE_ENV=production npm start
```

## 📄 License

[Your License]

## 👥 Contributors

[Your Team]

# SƠ ĐỒ KIẾN TRÚC HỆ THỐNG ADMIN STORE V2

Tài liệu này cung cấp sơ đồ kiến trúc tổng thể (System Architecture Diagram) của hệ thống **Admin Store V2**, mô tả luồng giao tiếp giữa Frontend Tier, Backend Tier, Database Schemas và các External Services.

---

## 📐 1. SƠ ĐỒ KIẾN TRÚC TỔNG QUAN (SYSTEM ARCHITECTURE)

```mermaid
flowchart TB
    subgraph Client_Layer["🖥 FRONTEND TIER (React + Vite + TypeScript)"]
        direction TB
        subgraph Orchestrator_Pages["Pages Layer (src/pages/)"]
            P_Orders["OrdersPage.tsx"]
            P_Pricing["PricingPage.tsx"]
            P_Suppliers["SuppliersPage.tsx"]
            P_Wallets["PaymentWalletsPage.tsx"]
            P_Warehouse["WarehousePage.tsx"]
            P_Packages["PackageManagementPage.tsx"]
            P_Credit["CreditPage.tsx"]
            P_Receipts["ReceiptsPage.tsx"]
        end

        subgraph Feature_Modules["Feature Modules Layer (src/features/)"]
            F_Orders["features/orders/<br/>(OrderTable, OrderModal, OrderFilterBar)"]
            F_Pricing["features/pricing/<br/>(PricingTable, SupplierCostModal)"]
            F_Suppliers["features/suppliers/<br/>(SupplierTable, SupplierDetailModal)"]
            F_Wallets["features/payment-wallets/<br/>(BankTable, UsdtTable, WithdrawModal)"]
            F_Warehouse["features/warehouse/<br/>(AccountsTable, CatalogGrid, Key2FA)"]
            F_Packages["features/packages/<br/>(CategoryCards, PackageTable, SlotGrid)"]
        end

        subgraph Shared_Layer["Shared Context & Utilities (src/shared/)"]
            S_Notify["NotificationContext.tsx"]
            S_Format["Formatters (VND, USDT, Date)"]
        end

        P_Orders --> F_Orders
        P_Pricing --> F_Pricing
        P_Suppliers --> F_Suppliers
        P_Wallets --> F_Wallets
        P_Warehouse --> F_Warehouse
        P_Packages --> F_Packages
        Orchestrator_Pages --> Shared_Layer
    end

    subgraph API_Gateway["🌐 HTTP / REST API GATEWAY"]
        HTTP_Req["JSON REST API Routes (/api/*)"]
    end

    subgraph Backend_Layer["⚙️ BACKEND TIER (Node.js + Express)"]
        direction TB
        Server_Core["Express Server Core (src/server.js)"]

        subgraph Domain_Services["Domain Services Layer (src/domains/)"]
            D_Orders["orders domain<br/>(Order Service & Pro-rata Calc)"]
            D_Products["products domain<br/>(Pricing & Supplier Costs Matrix)"]
            D_Suppliers["suppliers domain<br/>(Suppliers & Debt Tracker)"]
            D_Wallets["wallets domain<br/>(Bank Accounts & Crypto Wallets)"]
            D_Credits["credits domain<br/>(Customer Credit Notes)"]
            D_Invoices["invoices domain<br/>(Payment Receipts & 3-Tab Aggregation)"]
            D_Webhooks["webhooks domain<br/>(Sepay & Auto-matching)"]
        end

        subgraph Event_Bus["Event Bus & Worker Layer (src/events/ & src/scheduler/)"]
            E_Bus["Event Bus (ORDER_CREATED, ORDER_CANCELLED)"]
            Cron_Job["Scheduler (Expiry Check & Binance Rate Refresh)"]
        end

        Server_Core --> Domain_Services
        Domain_Services --> Event_Bus
    end

    subgraph Database_Layer["🗄 DATABASE TIER (PostgreSQL Multi-Schema)"]
        direction LR
        DB_Admin["admin schema<br/>(users, system_logs)"]
        DB_Business["business schema<br/>(orders, customers, products)"]
        DB_Billing["billing schema<br/>(payment_receipt, payment_receipt_allocations, shop_bank_accounts, usdt_wallets)"]
        DB_Finance["finance schema<br/>(credit_notes, supplier_debts, withdrawals)"]
        DB_Automation["system_automation schema<br/>(event_logs, cron_schedules)"]
    end

    subgraph External_Services["☁️ EXTERNAL INTEGRATIONS"]
        VietQR["VietQR.io API<br/>(Dynamic QR Code Image)"]
        Binance["Binance Public API<br/>(Live USDT/VND Exchange Rate)"]
        Sepay["Sepay Gateway<br/>(Bank Transfer Webhook)"]
    end

    Client_Layer -->|HTTP REST Fetch| API_Gateway
    API_Gateway --> Server_Core
    Domain_Services --> Database_Layer
    D_Wallets -.->|Generate Image URL| VietQR
    D_Wallets -.->|Fetch Ticker Rate| Binance
    Sepay -.->|Push Payment Webhook| D_Webhooks
```

---

## 🔄 2. SƠ ĐỒ LUỒNG SỰ KIỆN ĐƠN HÀNG (ORDER LIFECYCLE & EVENT BUS FLOW)

Sơ đồ thể hiện chi tiết luồng xử lý sự kiện khi tạo đơn mới và khi hủy đơn hàng:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Quản Lý (Admin)
    participant UI as OrderCreateEditModal (React)
    participant API as Express API (/api/orders)
    participant DB as PostgreSQL (business.orders)
    participant Cust as Customer Service (business.customers)
    participant Event as Event Bus
    participant Wh as Warehouse (Slot Manager)
    participant QR as VietQR Generator

    rect rgb(15, 23, 42)
    note over User, QR: 1. LUỒNG TẠO ĐƠN HÀNG MỚI (CREATE ORDER)
    User->>UI: Nhập thông tin & chọn Mã Tiền Tố (MAVC/MAVL/MAVK/MAVN)
    UI->>UI: Parse tên gói ➔ Tự động tính days & expired_at
    User->>UI: Bấm nút "Xác Nhận Tạo Đơn"
    UI->>API: POST /api/orders (Payload + generatedCode)
    API->>DB: INSERT INTO business.orders
    API->>Cust: UPSERT INTO business.customers (Tên, Contact)
    API->>Event: Emit Event 'ORDER_CREATED'
    Event->>Wh: Đánh dấu giữ chỗ Slot Kho (RESERVED / IN_USE)
    API-->>UI: Return Created Order Object
    UI->>QR: Format URL VietQR.io (Mã BIN + STK + Mã Đơn + Giá)
    UI-->>User: Tự động bật Modal Chi Tiết + VietQR Thu Tiền
    end

    rect rgb(30, 41, 59)
    note over User, QR: 2. LUỒNG HỦY ĐƠN HÀNG (CANCEL ORDER)
    User->>UI: Bấm nút "Hủy / Xóa Đơn Hàng"
    UI->>API: DELETE /api/orders/:id
    API->>DB: UPDATE status = 'CANCELLED'
    API->>API: Tính Giá Trị Còn Lại Pro-rata: price * (remaining_days / total_days)
    API->>Wh: Revert Slot Kho về 'AVAILABLE'
    API->>DB: INSERT INTO finance.credit_notes (Nạp Ví Credit Khách)
    API->>Event: Emit Event 'ORDER_CANCELLED'
    API-->>UI: Return Success + Pro-rata Refund Amount
    UI-->>User: Cập nhật UI, giảm doanh thu & chuyển đơn sang Tab 'canceled'
    end

    rect rgb(20, 83, 45)
    note over User, QR: 3. LUỒNG WEBHOOK & TỰ ĐỘNG KHỚP BIÊN LAI (WEBHOOK & AUTOMATED RECEIPT MATCHING)
    participant Bank as Ngân Hàng / SePay Webhook
    Bank->>API: POST /api/webhooks/sepay (Money In/Out Event)
    API->>Event: Emit 'WEBHOOK_MONEY_IN' / 'WEBHOOK_MONEY_OUT'
    Event->>API: Subscriber: processPaymentWebhook()
    API->>DB: Check Idempotency (sepay_transaction_id)
    API->>DB: INSERT INTO receipt.payment_receipt (status = 'UNALLOCATED')
    alt Tìm thấy đơn hàng khớp số tiền / mã đơn
        API->>DB: UPDATE receipt.payment_receipt (status = 'FULLY_ALLOCATED', unallocated_amount = 0)
        API->>DB: INSERT INTO receipt.payment_receipt_allocations (allocation_type = 'ORDER', target_code = id_order)
        API->>DB: UPDATE business.orders (status = 'Đã Thanh Toán' / gia hạn expired_at)
        API->>Event: Emit Event 'ORDER_PAID' / 'ORDER_RENEWED'
    else Không tìm thấy đơn trùng khớp
        API-->>API: Giữ trạng thái UNALLOCATED (Biên lai nằm ở Tab Chưa được liệt kê)
    end
    end
```

---

## 🗂 3. SƠ ĐỒ MỐI QUAN HỆ BẢNG DỮ LIỆU (ERD - DATABASE SCHEMAS)

```mermaid
erDiagram
    admin_users {
        int id PK
        string email
        string password_hash
        string role
    }

    business_customers {
        int id PK
        string name
        string contact
        string email
        datetime created_at
    }

    business_products {
        int id PK
        string san_pham
        string package_product
        numeric base_price
        numeric retail_price
        numeric ctv_price
        numeric promo_price
        numeric student_price
    }

    business_orders {
        int id PK
        string id_order PK
        int customer_id FK
        string customer
        string contact
        string id_product
        numeric price
        numeric gross_selling_price
        numeric cost
        string supply_id
        string status
        int days
        date order_date
        date expired_at
    }

    receipt_payment_receipt {
        int id PK
        date payment_date
        numeric amount
        numeric unallocated_amount
        string status
        string transfer_type
        bigint sepay_transaction_id
        string reference_code
        string gateway
        string sender
        string receiver
        text note
    }

    receipt_payment_receipt_allocations {
        bigint id PK
        bigint receipt_id FK
        string allocation_type
        string target_code
        numeric amount
        numeric remaining_balance
        text note
        string created_by
    }

    billing_shop_bank_accounts {
        int id PK
        string account_number
        string account_holder
        string bank_display_name
        string bank_bin
        string qr_note_prefix
        boolean is_default
        boolean is_active
        numeric balance_remaining
    }

    billing_usdt_wallets {
        int id PK
        string wallet_address
        string network
        boolean is_default
        boolean is_active
        numeric balance_remaining
    }

    finance_credit_notes {
        int id PK
        int customer_id FK
        string order_id FK
        numeric refund_amount
        numeric available_amount
        string status
    }

    business_customers ||--o{ business_orders : "sở hữu"
    business_orders ||--o{ finance_credit_notes : "tạo credit khi hủy"
    business_products ||--o{ business_orders : "được bán trong"
    receipt_payment_receipt ||--o{ receipt_payment_receipt_allocations : "có các lượt phân bổ"
    business_orders ||--o{ receipt_payment_receipt_allocations : "được phân bổ bởi"
```

---

## 📌 4. MÔ TẢ ĐẶC TÍNH NỔI BẬT CỦA KIẾN TRÚC V2

1. **Tách Biệt Trách Nhiệm (Separation of Concerns):**
   - Các file trang (`OrdersPage.tsx`, `PricingPage.tsx`, v.v.) chỉ giữ vai trò **Orchestrator** quản lý State tổng và nạp API.
   - Toàn bộ giao diện chi tiết, bảng dữ liệu, bộ lọc và modals được chuyển vào từng component nhỏ thuộc thư mục `src/features/<feature>/components/`.
2. **Quản Lý Sự Kiện Bất Đồng Bộ (Event Bus Pattern):**
   - Backend sử dụng Event Bus để phân tách luồng xử lý: Tạo đơn hàng không trực tiếp khóa luồng xử lý kho mà thông qua sự kiện `ORDER_CREATED` và `ORDER_CANCELLED`.
3. **Đa Schema Database (PostgreSQL Multi-Schema):**
   - Đảm bảo tính bảo mật và mở rộng theo chuẩn Doanh nghiệp: Phân chia rõ ràng giữa dữ liệu `admin`, nghiệp vụ kinh doanh `business`, hóa đơn cổng thanh toán `billing`, và tài chính ví `finance`.

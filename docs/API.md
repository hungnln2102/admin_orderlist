# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

Hầu hết endpoints yêu cầu authentication qua session cookie.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

## Orders

### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "id_order": "MAVL001",
  "id_product": "Netflix Premium",
  "information_order": "4 màn hình - Full HD",
  "customer": "Nguyễn Văn A",
  "price": 150000,
  "days": 30,
  "supply": "Supplier Name"
}
```

**Response:**
```json
{
  "id": 1,
  "id_order": "MAVL001",
  "id_product": "Netflix Premium",
  "information_order": "4 màn hình - Full HD",
  "customer": "Nguyễn Văn A",
  "price": 150000,
  "days": 30,
  "status": "unpaid",
  "registration_date_display": "16/01/2026",
  "expiry_date_display": "15/02/2026"
}
```

**Side Effects:**
- Gửi thông báo Telegram tự động
- Tạo QR code thanh toán

### Get Orders List
```http
GET /api/orders?page=1&limit=50&status=unpaid
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `status` (optional): Filter by status (unpaid/paid/expired)
- `search` (optional): Search by order code or customer name

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Get Order by ID
```http
GET /api/orders/:id
```

**Response:**
```json
{
  "id": 1,
  "id_order": "MAVL001",
  ...
}
```

### Update Order
```http
PUT /api/orders/:id
Content-Type: application/json

{
  "customer": "Nguyễn Văn B",
  "price": 160000
}
```

**Response:**
```json
{
  "id": 1,
  "customer": "Nguyễn Văn B",
  "price": 160000,
  ...
}
```

### Delete Order
```http
DELETE /api/orders/:id
Content-Type: application/json

{
  "reason": "canceled",
  "note": "Khách hàng hủy"
}
```

**Response:**
```json
{
  "success": true,
  "archived": true
}
```

### Renew Order
```http
POST /api/orders/:orderCode/renew
Content-Type: application/json

{
  "days": 30
}
```

**Response:**
```json
{
  "id": 2,
  "id_order": "MAVL001-R1",
  "parent_order": "MAVL001",
  ...
}
```

### Calculate Price
```http
POST /api/orders/calculate-price
Content-Type: application/json

{
  "id_product": "Netflix Premium",
  "supply": "Supplier Name",
  "days": 30
}
```

**Response:**
```json
{
  "price": 150000,
  "cost": 120000,
  "profit": 30000
}
```

## Products

### Get All Products
```http
GET /api/products
```

### Get Product Prices
```http
GET /api/product-prices/:productId
```

### Get Supplies by Product
```http
GET /api/products/supplies-by-name/:productName
```

## Supplies

### Get All Supplies
```http
GET /api/supplies
```

### Get Products by Supply
```http
GET /api/supplies/:supplyId/products
```

## Dashboard

### Get Dashboard Stats
```http
GET /api/dashboard/stats
```

**Response:**
```json
{
  "totalOrders": 100,
  "totalRevenue": 15000000,
  "activeOrders": 80,
  "expiredOrders": 20
}
```

## Error Responses

Tất cả errors trả về format nhất quán:

```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": {} // Only in development
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

(To be implemented)

## Webhooks

### Sepay Webhook
```http
POST /webhook
Content-Type: application/json
X-Webhook-Secret: <secret>

{
  "transaction_id": "123",
  "amount": 150000,
  "description": "Thanh toan MAVL001"
}
```

## Notes

- All dates are in `DD/MM/YYYY` format
- All amounts are in VND
- Timestamps are in Vietnam timezone (Asia/Ho_Chi_Minh)
- Session cookies expire after 1 hour of inactivity

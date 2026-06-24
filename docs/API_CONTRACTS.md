# API Contracts - `admin_orderlist`

Mục đích: ghi lại route, request, response và hành vi quan trọng trước khi refactor để tránh sửa lỗi bằng cách vá lệch contract ở tầng khác.

> Trạng thái: khung ban đầu. Điền theo từng domain trước khi chạm code domain đó.

## Quy Tắc Ghi Contract

- Ghi contract hiện tại trước khi sửa implementation.
- Không đổi API path, method, query param, payload hoặc response shape nếu chưa có migration task riêng.
- Nếu backend sai, sửa backend source-of-truth; không vá bằng mapper frontend trừ khi là compatibility wrapper tạm thời.
- Nếu frontend đang phụ thuộc response sai/không nhất quán, ghi rõ wrapper cần giữ và điều kiện xóa.

## Orders

### Routes Cần Ghi

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/orders` | `backend/src/domains/orders/controller/crud/createOrder.js` | Sanitized order payload; supports `variant_id`, `reserved_order_code`, refund credit fields, `payment_method` | `201` normalized order row; `400 { error: "Empty payload" }`; `500` generic create-order error except duplicate order code message | Luồng tạo đơn, rủi ro tiền/key/payment. |
| TBD | TBD | `backend/src/domains/orders/controller/manualWebhookCompletion.js` | TBD | TBD | Manual completion phải idempotent. |
| TBD | TBD | `backend/src/domains/orders/controller/manualUsdtCompletion.js` | TBD | TBD | USDT completion cần transaction rõ. |
| TBD | TBD | `backend/src/domains/orders/controller/refundCreditRoutes.js` | TBD | TBD | Refund không tạo double transaction. |

### Source-Of-Truth Cần Chốt

- Order DTO -> view model.
- Create order validation.
- Payment/refund calculation.
- Webhook/manual completion idempotency key.

## Invoices/Receipts

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | Receipt list/filter/QR/payment actions. |

## Products/Pricing

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/services/pricing/core.js` | TBD | TBD | Cần xác định pricing source-of-truth. |
| TBD | TBD | `backend/src/domains/products` | TBD | TBD | Product/variant/image/description. |

## Supplies/Expenses

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/supplies/controller/handlers/list.js` | TBD | TBD | Filter/query builder. |
| TBD | TBD | `backend/src/domains/supplies/controller/handlers/insights.js` | TBD | TBD | Insight calculation. |

## Wallet/Bank/Finance

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/wallet/controller/index.js` | TBD | TBD | Ledger/balance/audit. |
| TBD | TBD | `backend/src/domains/shop-bank-accounts` | TBD | TBD | Shop bank account ledger. |
| TBD | TBD | `backend/src/domains/usdt-wallets` | TBD | TBD | USDT wallet ledger. |

## Dashboard/Reports

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/orders/controller/finance/dashboardSummary.js` | TBD | TBD | Summary số liệu phải có baseline. |

## Renew Adobe/Fix ADES

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/checkAccounts.js` | TBD | TBD | Check accounts flow. |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/batchUsers.js` | TBD | TBD | Batch transaction/retry. |
| TBD | TBD | `backend/src/domains/renew-adobe/controller/publicFixAdes.js` | TBD | TBD | Public fix flow. |
| TBD | TBD | `backend/src/domains/fix-ades/routes.js` | TBD | TBD | Fix ADES boundary. |


### Manual Completion / Refund Boundary

| Flow | Route/Function | Transaction boundary | Idempotency key | Ghi chú |
| --- | --- | --- | --- | --- |
| Manual bank completion | `POST /api/orders/:id/complete-manual-webhook` -> `completeProcessingOrderWithManualWebhook` | `BEGIN` + `SELECT order FOR UPDATE` + status conditional update + `COMMIT/ROLLBACK` | payment receipt insert result + order status `PROCESSING` guard | Route handler đã tách mỏng tại `manualWebhookCompletionRoute.js`. |
| Manual USDT completion | `POST /api/orders/:id/complete-manual-usdt` -> `completeProcessingOrderWithManualUsdt` | `BEGIN` + `SELECT order FOR UPDATE` + status conditional update + `COMMIT/ROLLBACK` | order status `PROCESSING` guard + USDT ledger service source guard | Route handler đã tách mỏng tại `manualUsdtCompletionRoute.js`. |
| Refund credit cashout | `POST /api/orders/refund-credits/:id/actions` action `complete` | `db.transaction()` + `SELECT refund_credit_note FOR UPDATE` + ledger debit + note status update | `SOURCE_KINDS.REFUND_CREDIT_NOTE` + `creditId` | Có focused test đảm bảo duplicate ledger source bị skip. |

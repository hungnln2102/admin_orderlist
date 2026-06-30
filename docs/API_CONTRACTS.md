# API Contracts - `admin_orderlist`

Mục đích: ghi lại route, request, response và hành vi quan trọng trước khi refactor để tránh sửa lỗi bằng cách vá lệch contract ở tầng khác.

> Trạng thái: khung ban đầu. Điền theo từng domain trước khi chạm code domain đó.

## Quy Tắc Ghi Contract

- Ghi contract hiện tại trước khi sửa implementation.
- Không đổi API path, method, query param, payload hoặc response shape nếu chưa có migration task riêng.
- Nếu backend sai, sửa backend source-of-truth; không vá bằng mapper frontend trừ khi là compatibility wrapper tạm thời.
- Nếu frontend đang phụ thuộc response sai/không nhất quán, ghi rõ wrapper cần giữ và điều kiện xóa.

## Orders

> Phase A sync 2026-06-30: mounted by `backend/src/routes/index.js` at `/api/orders` and `/api/v1/orders` through `backend/src/domains/orders/routes.js` -> `controller/index.js`.

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/orders?scope=` | `backend/src/domains/orders/controller/listRoutes.js` | Query `scope`; supported redirects use `expired`, `canceled`, `import`, `mavn_paid`; tax uses separate route | JSON array of normalized order rows | Uses `buildOrdersListQuery` + `normalizeOrderRow`; do not change row shape without migration. |
| GET | `/api/orders/tax?from=YYYY-MM-DD` | `backend/src/domains/orders/controller/listRoutes.js` | Optional `from`, fallback `2026-04-22` | JSON array of normalized tax order rows | `from` must stay `YYYY-MM-DD`; invalid value falls back. |
| GET | `/api/orders/expired` | `listRoutes.js` | none | Redirect `/api/orders?scope=expired` | Compatibility redirect. |
| GET | `/api/orders/canceled` | `listRoutes.js` | none | Redirect `/api/orders?scope=canceled` | Compatibility redirect. |
| GET | `/api/orders/import` | `listRoutes.js` | none | Redirect `/api/orders?scope=import` | Compatibility redirect. |
| GET | `/api/orders/mavn-expense` | `listRoutes.js` | none | Redirect `/api/orders?scope=mavn_paid` | Compatibility redirect. |
| POST | `/api/orders` | `backend/src/domains/orders/controller/crud/createOrder.js` | Sanitized order payload; supports `variant_id`, `reserved_order_code`, refund credit fields, `payment_method` | `201` normalized order row; `400 { error: "Empty payload" }`; `500` generic create-order error except duplicate order code message | Create-order validation/payment allocation still needs source-of-truth cleanup. |
| PUT | `/api/orders/:id` | `crud/updateOrder.js` | Order update payload, validated `id` param | Updated normalized order row; `400/404/500` error body | Preserve public shape for EditOrder modal. |
| DELETE | `/api/orders/:id` | `crud/deleteOrder.js` | Validated `id` param | JSON result; `400/404/500` error body | Delete flow may touch payment/refund side effects. |
| POST | `/api/orders/:id/ensure-transaction` | `crud/ensureOrderTransactionRoute.js` | Validated `id` param | JSON result or status-coded error body | Transaction compatibility route. |
| POST | `/api/orders/calculate-price` | `calculatePriceRoute.js` | Pricing request body | Pricing result JSON; domain error status or `500 { error: "System Error" }` | Backend pricing source-of-truth still open. |
| POST | `/api/orders/:orderCode/renew` | `renewRoutes.js` | Validated `orderCode` param + request body | Renew result JSON or status-coded error | Renew flow must preserve response shape. |
| PATCH | `/api/orders/canceled/:id/refund` | `renewRoutes.js` | Validated `id`; refund fields in body | `{ success: true, refundReferenceCode, voided_credit_notes, ...updated }` or error | Refund/canceled flow is money-risk area. |
| POST | `/api/orders/:id/complete-manual-webhook` | `manualWebhookCompletionRoute.js` | Path `id`; body handled by use-case | Status/body returned by `completeProcessingOrderWithManualWebhook` | Idempotency handled by use-case/transaction guard. |
| POST | `/api/orders/:id/complete-manual-usdt` | `manualUsdtCompletionRoute.js` | Path `id`; body handled by use-case | Status/body returned by `completeProcessingOrderWithManualUsdt` | Idempotency handled by order status + USDT ledger guard. |
| GET | `/api/orders/refund-credits/logs` | `refundCreditRoutes.js` | Query filters | Refund credit log payload | Preserve list response for finance UI. |
| GET | `/api/orders/refund-credits/available` | `refundCreditRoutes.js` | Query filters | `{ data: rows }` | Caller expects `data`. |
| POST | `/api/orders/canceled/:id/refund-credit/ensure` | `refundCreditRoutes.js` | Validated `id`; refund-credit body | JSON ensure result or status-coded error | Must not double-create credit. |
| POST | `/api/orders/refund-credits/:id/actions` | `refundCreditRoutes.js` | Body `action` = `delete` or `complete` | JSON action result or status-coded error | Must not double-apply ledger/cashout. |

### Source-Of-Truth Cần Chốt

- Order DTO -> view model: currently `frontend/src/features/orders/utils/orderListTransform.ts` plus Create/Edit/Bill Order local mappers; E1 remains open.
- Create order validation: currently concentrated in `backend/src/domains/orders/controller/crud/createOrder.js`; C1.3 remains open.
- Payment amount/key allocation: currently in create/update/payment-slot/pricing paths; C1.4 remains open.
- Manual completion/refund idempotency: route handlers are thin; use-cases are current source-of-truth and must be preserved.

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

> Phase A sync 2026-06-30: `wallet` is mounted under `/api` root by `backend/src/routes/index.js`; `shop-bank-accounts` and `usdt-wallets` are mounted by domain prefix.

| Method | Path | Handler/File | Request chính | Response chính | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/wallets/daily-balances` | `backend/src/domains/wallet/controller/index.js#listDailyBalances` | Query handled by controller | Daily balance list JSON | Mounted via `backend/src/domains/wallet/routes.js`. |
| POST | `/api/wallets/daily-balances` | `wallet/controller/index.js#saveDailyBalance` | `saveDailyBalanceRules` validated body | Saved balance JSON or validation error | Preserve ledger/balance semantics. |
| POST | `/api/wallets/types` | `wallet/controller/index.js#createWalletType` | `createWalletTypeRules` body | Created wallet type JSON | Wallet type management. |
| PATCH | `/api/wallets/types/:id` | `wallet/controller/index.js#updateWalletType` | `updateWalletTypeRules`, path `id` | Updated wallet type JSON | Partial update route. |
| DELETE | `/api/wallets/types/:id` | `wallet/controller/index.js#deleteWalletType` | `deleteWalletTypeRules`, path `id` | Delete result JSON | Must not break daily balance references. |
| GET | `/api/shop-bank-accounts` | `shop-bank-accounts/controller/index.js#listShopBankAccounts` | Query handled by controller | Account list JSON | Domain-local input rules in `shopBankInputs.js`. |
| GET | `/api/shop-bank-accounts/balances` | `shop-bank-accounts/controller/index.js#listShopBankAccountBalancesHandler` | Query handled by controller | Balance list JSON | Ledger/balance risk area. |
| GET | `/api/shop-bank-accounts/default` | `shop-bank-accounts/controller/index.js#getDefaultShopBankAccountHandler` | none | Default account JSON | Default account contract. |
| POST | `/api/shop-bank-accounts` | `shop-bank-accounts/controller/index.js#createShopBankAccount` | `createShopBankAccountRules` body | Created account JSON or validation error | Shared text/boolean primitives only; account rule stays domain-local. |
| PUT | `/api/shop-bank-accounts/:id` | `shop-bank-accounts/controller/index.js#updateShopBankAccount` | Path `id`, update body | Updated account JSON | Preserve account number normalization behavior. |
| PATCH | `/api/shop-bank-accounts/:id/withdrawn` | `shop-bank-accounts/controller/index.js#patchShopBankAccountWithdrawn` | Path `id`, withdrawn body | Updated withdrawn result JSON | Compatibility route; withdraw flow has separate POST. |
| POST | `/api/shop-bank-accounts/:id/withdraw` | `shop-bank-accounts/controller/index.js#postShopBankAccountWithdraw` | Path `id`, withdraw body | Withdraw result JSON | Must not double-record transaction. |
| POST | `/api/shop-bank-accounts/:id/set-default` | `shop-bank-accounts/controller/index.js#setDefaultShopBankAccount` | Path `id` | Default update JSON | Default uniqueness rule remains domain use-case. |
| DELETE | `/api/shop-bank-accounts/:id` | `shop-bank-accounts/controller/index.js#removeShopBankAccount` | Path `id` | Delete result JSON | Preserve safety checks. |
| GET | `/api/usdt-wallets` | `usdt-wallets/controller/index.js#listUsdtWallets` | Query handled by controller | Wallet list JSON | Domain-local wallet address/network rules. |
| GET | `/api/usdt-wallets/balances` | `usdt-wallets/controller/index.js#listUsdtWalletBalancesHandler` | Query handled by controller | Balance list JSON | Ledger/balance risk area. |
| GET | `/api/usdt-wallets/exchange-rate` | `usdt-wallets/controller/index.js#getExchangeRateHandler` | none/query handled by controller | Exchange rate JSON | Caller may depend on current shape. |
| GET | `/api/usdt-wallets/default` | `usdt-wallets/controller/index.js#getDefaultUsdtWalletHandler` | none | Default wallet JSON | Default wallet contract. |
| POST | `/api/usdt-wallets` | `usdt-wallets/controller/index.js#createUsdtWallet` | `createUsdtWalletRules` body | Created wallet JSON or validation error | Shared primitives only; wallet network/address rules stay domain-local. |
| PUT | `/api/usdt-wallets/:id` | `usdt-wallets/controller/index.js#updateUsdtWallet` | Path `id`, update body | Updated wallet JSON | Preserve normalization behavior. |
| POST | `/api/usdt-wallets/:id/withdraw` | `usdt-wallets/controller/index.js#postUsdtWalletWithdraw` | Path `id`, withdraw body | Withdraw result JSON | Must not double-record transaction. |
| POST | `/api/usdt-wallets/:id/set-default` | `usdt-wallets/controller/index.js#setDefaultUsdtWallet` | Path `id` | Default update JSON | Default uniqueness rule remains domain use-case. |
| DELETE | `/api/usdt-wallets/:id` | `usdt-wallets/controller/index.js#removeUsdtWallet` | Path `id` | Delete result JSON | Preserve safety checks. |

### Payment Slots Internal Contract

`backend/src/domains/payment-slots/index.js` is not mounted as an HTTP router. It is an internal domain API used by orders/payments/webhook/renew flows.

| Function | Contract | Source-of-truth |
| --- | --- | --- |
| `openPaymentSlot(executor, params)` | Open one pending slot for an order/cycle with exact expected amount | `use-cases/openPaymentSlot` + `helpers/paymentSlotInputs.js` |
| `resolveOrderByExpectedAmount(executor, params)` | Resolve order by receiver account + exact expected amount | `use-cases/resolveOrderByExpectedAmount` |
| `markPaymentSlotMatched(executor, params)` | Mark matched after receipt is recorded | `use-cases/markPaymentSlotMatched` |
| `expirePaymentSlots(executor, interval)` | Expire stale pending slots | `use-cases/expirePaymentSlots` |
| `findLatestPendingSlotByOrder` / `findLatestMatchedSlotByOrder` / `findActiveSlotByOrder` | Repository lookup for QR/renew/payment checks | `repositories/paymentSlotRepository` |
| `backfillPendingPaymentSlots` | Backfill missing pending slots | `use-cases/backfillPendingPaymentSlots` |

Payment slot amount normalization must remain exact numeric matching and must not use integer VND parser from `backend/src/shared/money/normalizers.js`.

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

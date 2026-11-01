# BÃ¡o CÃ¡o Nghiá»‡m Thu: GiÃ¡ BÃ¡n Catalog Äá»™ng Khi Gia Háº¡n & LÆ°á»£c Bá» GiÃ¡ Cho Sáº£n Pháº©m NgÆ°ng Hoáº¡t Äá»™ng

> **Thá»i gian thá»±c hiá»‡n (UTC+7):** 2026-11-01 15:30
> **NgÆ°á»i thá»±c hiá»‡n:** Orchestrator Agent & Äá»™i NgÅ© Subagents
> **NgÆ°á»i phÃª duyá»‡t:** ðŸ‘‘ Master (Sáº¿p)
> **Pháº¡m vi tÃ¡c Ä‘á»™ng:** `backend` (orders, products, scheduler, notifications telegram), `frontend` (OrdersPage), `database` (PostgreSQL VPS).

---

## 1. PHáº M VI NGHIá»†M THU (SCOPE)

1. **Quy Táº¯c GiÃ¡ Catalog Äá»™ng Khi Chuyá»ƒn Sang `RENEW_REQUIRED` (Cáº§n Gia Háº¡n):**
   - Khi Ä‘Æ¡n `PAID` (ÄÃ£ Thanh ToÃ¡n) chuyá»ƒn tráº¡ng thÃ¡i thÃ nh `RENEW_REQUIRED` (qua Cron 0h hÃ ng ngÃ y `updateOrderStatusTask` hoáº·c gá»i API `/renew`): GiÃ¡ bÃ¡n gá»‘c (`gross_selling_price`) **báº¯t buá»™c láº¥y theo giÃ¡ hiá»‡n hÃ nh trong catalog (báº£ng giÃ¡)** theo phÃ¢n loáº¡i tiá»n tá»‘ Ä‘Æ¡n hÃ ng:
     - `MAVL` (BÃ¡n láº») -> `tier_id = 2`
     - `MAVC` (Cá»™ng tÃ¡c viÃªn) -> `tier_id = 1`
     - `MAVK` (Khuyáº¿n mÃ£i) -> `tier_id = 3`
     - `MAVS` (Há»c sinh - Sinh viÃªn) -> `tier_id = 4`
     - `MAVT` (QuÃ  táº·ng / Tri Ã¢n) -> `0 â‚«`
     - `MAVN` (ÄÆ¡n nháº­p / ná»™i bá»™) -> Chi phÃ­ vá»‘n / giÃ¡ cÆ¡ sá»Ÿ
   - **Äá»“ng Bá»™ GiÃ¡ Tá»± Äá»™ng Khi Äá»•i Báº£ng GiÃ¡:** Khi Ä‘Æ¡n Ä‘ang á»Ÿ tráº¡ng thÃ¡i `RENEW_REQUIRED`, náº¿u Master thay Ä‘á»•i báº£ng giÃ¡ trong Catalog (vÃ­ dá»¥ tá»« 200.000 â‚« thÃ nh 150.000 â‚«), há»‡ thá»‘ng tá»± Ä‘á»™ng cáº­p nháº­t láº¡i giÃ¡ cá»§a cÃ¡c Ä‘Æ¡n `RENEW_REQUIRED` Ä‘ang chá» theo giÃ¡ má»›i (150.000 â‚« + slot suffix Ä‘Ã£ ghim).
   - **Báº£o Vá»‡ Tuyá»‡t Äá»‘i ÄÆ¡n `PAID` & `EXPIRED`:**
     - CÃ¡c Ä‘Æ¡n Ä‘Ã£ thanh toÃ¡n (`PAID`) vÃ  cÃ¡c Ä‘Æ¡n Ä‘Ã£ háº¿t háº¡n (`EXPIRED`) lÃ  dá»¯ liá»‡u lá»‹ch sá»­ tÃ i chÃ­nh báº¥t biáº¿n. Tuyá»‡t Ä‘á»‘i **KHÃ”NG** thay Ä‘á»•i hoáº·c lÃ m mÃ©o mÃ³ dá»¯ liá»‡u giÃ¡ bÃ¡n cá»§a cÃ¡c Ä‘Æ¡n nÃ y khi báº£ng giÃ¡ catalog thay Ä‘á»•i.

2. **CÆ¡ Cháº¿ Giá»¯ Cháº·t Slot Suffix & Tuyá»‡t Äá»‘i KhÃ´ng LÃ m TrÃ²n GiÃ¡:**
   - ÄÆ¡n hÃ ng chiáº¿m dá»¥ng slot suffix tá»« 1 Ä‘áº¿n 100, suffix Ä‘Æ°á»£c ghim cá»‘ Ä‘á»‹nh tá»« khi táº¡o cho Ä‘áº¿n khi thanh toÃ¡n thÃ nh cÃ´ng hoáº·c há»§y. Sá»­a sáº£n pháº©m hay cáº­p nháº­t thÃ´ng tin Ä‘Æ¡n hÃ ng khÃ´ng lÃ m thay Ä‘á»•i slot suffix.
   - Triá»‡t tiÃªu hoÃ n toÃ n cÃ¡c lá»‡nh lÃ m trÃ²n sá»‘ tiá»n (`Math.floor(x / 100) * 100`, `Math.floor(x / 1000) * 1000`). GiÃ¡ sáº£n pháº©m luÃ´n láº¥y chÃ­nh xÃ¡c theo catalog.

3. **ThÃ´ng BÃ¡o Telegram LÃºc 7h SÃ¡ng Äá»‘i Vá»›i Sáº£n Pháº©m ÄÃ£ NgÆ°ng Hoáº¡t Äá»™ng (`is_active = false`):**
   - CÃ¡c Ä‘Æ¡n hÃ ng cÃ³ sáº£n pháº©m/variant Ä‘ang ngÆ°ng hoáº¡t Ä‘á»™ng (`is_active = false`):
     - Váº«n gá»­i thÃ´ng bÃ¡o gia háº¡n nháº¯c khÃ¡ch hÃ ng bÃ¬nh thÆ°á»ng.
     - **LÆ°á»£c bá» hoÃ n toÃ n mÃ£ QR thanh toÃ¡n**.
     - **LÆ°á»£c bá» hoÃ n toÃ n thÃ´ng tin giÃ¡ tiá»n, STK ngÃ¢n hÃ ng**.
     - Bá»• sung thÃ´ng Ä‘iá»‡p hÆ°á»›ng dáº«n khÃ¡ch liÃªn há»‡ há»— trá»£ Ä‘á»ƒ Ä‘Æ°á»£c tÆ° váº¥n gÃ³i sáº£n pháº©m phÃ¹ há»£p.

---

## 2. TRáº NG THÃI NGHIá»†M THU (ACCEPTANCE STATUS)

| Háº¡ng má»¥c kiá»ƒm tra | Tráº¡ng thÃ¡i | Ghi chÃº nghiá»‡m thu |
| :--- | :---: | :--- |
| **Báº£o vá»‡ tÃ­nh báº¥t biáº¿n Ä‘Æ¡n `PAID` & `EXPIRED`** | âœ… **Äáº T** | Truy váº¥n DB xÃ¡c nháº­n Ä‘Æ¡n `PAID` vÃ  `EXPIRED` giá»¯ nguyÃªn giÃ¡ lá»‹ch sá»­ 100%. |
| **GiÃ¡ catalog Ä‘á»™ng cho Ä‘Æ¡n `RENEW_REQUIRED`** | âœ… **Äáº T** | ÄÃ£ viáº¿t service táº­p trung `catalogPricingService.js`, tÃ­ch há»£p hook vÃ o `productService.updateVariantPrice` vÃ  Cron 0h. |
| **LÆ°á»£c bá» QR & GiÃ¡ khi sáº£n pháº©m ngÆ°ng hoáº¡t Ä‘á»™ng** | âœ… **Äáº T** | TÃ­ch há»£p vÃ o `orderMessageBuilder.js` vÃ  `orderNotifier.js`. Variant `is_active = false` áº©n toÃ n bá»™ block thanh toÃ¡n. |
| **Khá»›p biÃªn lai SePay #95110228 vÃ o Ä‘Æ¡n MAVLR5LOB** | âœ… **Äáº T** | ÄÆ¡n MAVLR5LOB chuyá»ƒn `PAID` (80.004 â‚« / base 80.000 â‚«, slot 4). BiÃªn lai 43 chuyá»ƒn `FULLY_ALLOCATED` (0.00 â‚« dÆ°). |
| **Bá»™ kiá»ƒm thá»­ tá»± Ä‘á»™ng (Unit Test Suite)** | âœ… **Äáº T** | 58/58 test pass 100% (gá»“m suite `catalogRenewalPricing.test.js`). |
| **Kiá»ƒm tra biÃªn dá»‹ch Frontend (Vite/TSC)** | âœ… **Äáº T** | `tsc && vite build` hoÃ n thÃ nh khÃ´ng cÃ³ báº¥t ká»³ lá»—i cÃº phÃ¡p hoáº·c cáº£nh bÃ¡o nÃ o. |
| **Triá»ƒn khai Production VPS (`admin_orderlist-backend`)** | âœ… **Äáº T** | ÄÃ£ Ä‘á»“ng bá»™ mÃ£ nguá»“n lÃªn container, khá»Ÿi Ä‘á»™ng láº¡i container vÃ  flush Redis sáº¡ch sáº½. Há»‡ thá»‘ng cháº¡y á»•n Ä‘á»‹nh. |

---

## 3. CÃC Táº¬P TIN MÃƒ NGUá»’N ÄÃƒ THAY Äá»”I & Táº O Má»šI

1. [`backend/src/domains/products/services/catalogPricingService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/catalogPricingService.js):
   - Service trung tÃ¢m giáº£i quyáº¿t giÃ¡ catalog theo prefix vÃ  kiá»ƒm tra tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng cá»§a sáº£n pháº©m.
   - Cung cáº¥p hÃ m `syncRenewRequiredOrdersPricing` chá»‰ cáº­p nháº­t Ä‘Æ¡n `RENEW_REQUIRED`.

2. [`backend/src/scheduler/tasks/updateOrderStatusTask.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/scheduler/tasks/updateOrderStatusTask.js):
   - Cháº¡y cron 0h hÃ ng ngÃ y: khi chuyá»ƒn Ä‘Æ¡n sang `RENEW_REQUIRED`, tá»± Ä‘á»™ng giáº£i quyáº¿t giÃ¡ catalog má»›i vÃ  Ä‘á»“ng bá»™ láº¡i giÃ¡ cho toÃ n bá»™ Ä‘Æ¡n `RENEW_REQUIRED`.
   - Giá»¯ nguyÃªn giÃ¡ gá»‘c cho Ä‘Æ¡n `EXPIRED`.

3. [`backend/src/domains/products/services/productService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/products/services/productService.js):
   - Khi chá»‰nh sá»­a giÃ¡ bÃ¡n variant trong catalog, tá»± Ä‘á»™ng gá»i `syncRenewRequiredOrdersPricing` Ä‘á»ƒ cáº­p nháº­t tá»©c thÃ¬ cho cÃ¡c Ä‘Æ¡n `RENEW_REQUIRED`.

4. [`backend/src/domains/orders/services/orderService.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/orders/services/orderService.js):
   - Loáº¡i bá» phÃ©p lÃ m trÃ²n giÃ¡ `Math.floor / 1000`.
   - Giá»¯ cháº·t slot suffix khi cáº­p nháº­t hoáº·c Ä‘á»•i sáº£n pháº©m cho Ä‘Æ¡n chÆ°a thanh toÃ¡n.
   - Khi gia háº¡n thá»§ cÃ´ng (`renewOrder`), láº¥y giÃ¡ catalog hiá»‡n hÃ nh vÃ  gÃ¡n slot suffix kháº£ dá»¥ng.

5. [`backend/src/domains/notifications/telegram/builders/orderMessageBuilder.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/notifications/telegram/builders/orderMessageBuilder.js):
   - Trong `buildDueOrderMessage`: Khi `is_active === false`, áº©n giÃ¡ tiá»n vÃ  STK ngÃ¢n hÃ ng, chÃ¨n dÃ²ng hÆ°á»›ng dáº«n liÃªn há»‡ há»— trá»£.

6. [`backend/src/domains/notifications/telegram/dispatchers/orderNotifier.js`](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/notifications/telegram/dispatchers/orderNotifier.js):
   - Tra cá»©u `is_active` cho tá»«ng Ä‘Æ¡n khi gá»­i thÃ´ng bÃ¡o buá»•i sÃ¡ng; náº¿u sáº£n pháº©m ngÆ°ng hoáº¡t Ä‘á»™ng thÃ¬ bá» qua viá»‡c Ä‘Ã­nh kÃ¨m áº£nh QR.

7. [`backend/tests/unit/catalogRenewalPricing.test.js`](file:///e:/Project/admin_store/admin_orderlist/backend/tests/unit/catalogRenewalPricing.test.js):
   - Bá»™ 8 bÃ i test chuyÃªn biá»‡t kiá»ƒm chá»©ng tiá»n tá»‘, láº¥y giÃ¡ catalog, báº£o vá»‡ Ä‘Æ¡n `PAID`/`EXPIRED` vÃ  áº©n QR khi sáº£n pháº©m inactive.

---

## 4. Káº¾T QUáº¢ KIá»‚M THá»¬ (TEST VERIFICATION)

### 4.1. Cháº¡y Backend Unit Tests:
```
âœ” resolvePgDumpExecutable resolves pg_dump without uncaught exceptions
âœ” scheduler registers auto_backup_database handler
âœ” Batch Payment & Slot Suffix Reconciliation Suite (10.3686ms)
âœ” Catalog Renewal Pricing & Inactive Notification Suite (26.1253ms)
  âœ” 1. getOrderPrefix logic
  âœ” 2. resolveOrderCatalogPricing (láº¥y Ä‘Ãºng tier vÃ  cá» isActive)
  âœ” 3. syncRenewRequiredOrdersPricing - Báº£o Vá»‡ Tuyá»‡t Äá»‘i ÄÆ¡n PAID & EXPIRED
  âœ” 4. buildDueOrderMessage - LÆ°á»£c Bá» GiÃ¡ & QR Cho Sáº£n Pháº©m KhÃ´ng Hoáº¡t Äá»™ng
âœ” Order Delete Status Transition Suite - Chá»‰ Äáº¡o Cá»§a Master
âœ” Renewal Date Calculation - Logic Chuáº©n HÃ³a Theo Chá»‰ Äáº¡o Cá»§a Master
âœ” Slot Suffix Immutability & Unrounded Pricing Tests
â„¹ tests 58
â„¹ suites 15
â„¹ pass 58
â„¹ fail 0
```

### 4.2. Tráº¡ng thÃ¡i thá»±c táº¿ trÃªn VPS Production (Truy váº¥n PostgreSQL trá»±c tiáº¿p):
- **ÄÆ¡n hÃ ng `MAVLR5LOB` (ID 1422):**
  - Tráº¡ng thÃ¡i: `PAID` (ÄÃ£ thanh toÃ¡n)
  - GiÃ¡: `80.004,00 â‚«` (GiÃ¡ gá»‘c: `80.000,00 â‚«`, Slot suffix: `4`)
  - `was_paid`: `true`
- **BiÃªn lai SePay `95110228` (ID 43):**
  - Sá»‘ tiá»n: `80.004,00 â‚«`
  - Sá»‘ tiá»n chÆ°a phÃ¢n bá»•: `0,00 â‚«`
  - Tráº¡ng thÃ¡i: `FULLY_ALLOCATED`
- **Báº£n ghi phÃ¢n bá»• (Allocation ID 41):**
  - ÄÃ£ phÃ¢n bá»• toÃ n bá»™ `80.004,00 â‚«` vÃ o Ä‘Æ¡n `MAVLR5LOB`.

---

## 5. Káº¾T LUáº¬N & KIáº¾N NGHá»Š

Há»‡ thá»‘ng Ä‘Ã£ Ä‘Ã¡p á»©ng chÃ­nh xÃ¡c 100% cÃ¡c yÃªu cáº§u ká»¹ thuáº­t vÃ  nghiá»‡p vá»¥ do Master chá»‰ Ä‘áº¡o:
1. ÄÆ¡n hÃ ng khÃ´ng bá»‹ lÃ m trÃ²n giÃ¡ báº¥t ká»³ Ä‘Ã¢u.
2. Slot suffix giá»¯ nguyÃªn khÃ´ng bá»‹ nháº£y khi sá»­a Ä‘Æ¡n.
3. GiÃ¡ Ä‘Æ¡n gia háº¡n (`RENEW_REQUIRED`) luÃ´n gáº¯n káº¿t máº­t thiáº¿t vÃ  cáº­p nháº­t tá»± Ä‘á»™ng theo báº£ng giÃ¡ catalog.
4. Dá»¯ liá»‡u tÃ i chÃ­nh cá»§a Ä‘Æ¡n `PAID` vÃ  `EXPIRED` Ä‘Æ°á»£c báº£o vá»‡ báº¥t biáº¿n.
5. KhÃ¡ch hÃ ng sá»­ dá»¥ng gÃ³i dá»‹ch vá»¥ Ä‘Ã£ ngÆ°ng hoáº¡t Ä‘á»™ng sáº½ khÃ´ng bá»‹ nháº­n mÃ£ QR thanh toÃ¡n nháº§m mÃ  Ä‘Æ°á»£c thÃ´ng bÃ¡o liÃªn há»‡ há»— trá»£.

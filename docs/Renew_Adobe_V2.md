# Renew Adobe V2 (Playwright) — Tài liệu chi tiết

Tài liệu này mô tả **luồng Renew Adobe V2** trong project `admin_orderlist` theo đúng code hiện tại (2026-03).

V2 là luồng **Playwright automation** để:
- Login Adobe (xử lý redirect/2FA/OTP/progressive profile)
- Truy cập Admin Console để scrape **products/users** (B12/B13)
- Lưu cookies để tái sử dụng, giảm số lần mở browser

> Lưu ý: Repo còn có luồng `adobe-http` (hybrid HTTP + Playwright login). Tài liệu này tập trung vào **V2** (`backend/src/services/adobe-renew-v2/*`).

---

## 1. Mục tiêu & nguyên tắc

- **Mục tiêu**: check tình trạng account admin (còn gói hay không), đồng bộ danh sách user + tình trạng có product của từng user.
- **Ưu tiên ổn định trên VPS/headless**: tránh các URL hay gây lỗi mạng (ví dụ `www.adobe.com`).
- **Không phụ thuộc UI text theo ngôn ngữ**: ưu tiên selector theo `data-testid`, `role`, `aria-*`.
- **Không kết luận sai**: nếu scrape products thất bại do UI đổi, trả `license_status="unknown"` thay vì ép `"Expired"`.

---

## 2. Module / file liên quan

### 2.1. Orchestrator

- `backend/src/services/adobe-renew-v2/runCheckFlow.js`
  - Điều phối **B1–B13**
  - Tạo Playwright browser/context/page (hoặc dùng `sharedSession`)
  - Inject cookies từ DB (nếu có)
  - Chạy login (B1–B9)
  - Chạy check info (B10–B13)
  - Export cookies về để lưu DB

### 2.2. Login

- `backend/src/services/adobe-renew-v2/loginFlow.js`
  - Thực thi **B2–B9** (và fallback login trực tiếp nếu đang ở auth page)
  - Detect screen theo heading + input visibility
  - 2FA OTP qua IMAP (`mailOtpService`)
  - Skip progressive profile / phone / backup email nếu xuất hiện

### 2.3. Check info (Admin Console)

- `backend/src/services/adobe-renew-v2/checkInfoFlow.js`
  - Thực thi **B10–B13** (phiên bản hiện tại: B10–B11 lấy Profile ngay trên `adminconsole`)
  - B12: scrape products từ `https://adminconsole.adobe.com/products`
  - B13: scrape users từ `https://adminconsole.adobe.com/users`

---

## 3. Biến môi trường (environment)

- `PLAYWRIGHT_HEADLESS`
  - Mặc định headless: `true`
  - Debug: set `PLAYWRIGHT_HEADLESS=false` để nhìn UI
- Proxy (nếu có)
  - `getPlaywrightProxyOptions()` đọc cấu hình proxy trong `adobe-http/proxyConfig`
- IMAP OTP:
  - V2 dùng `mailOtpService.fetchOtpFromEmail(mailBackupId, ...)`
  - `mailBackupId` lấy từ DB (cột mail backup) hoặc fallback env (tuỳ cấu hình mailOtpService)

---

## 4. Luồng tổng quan (B1–B13)

## 4A. B1–B13 chi tiết (mỗi bước làm gì?)

Phần này mô tả theo đúng các bước log trong V2.

### B1 — Entry vào hệ thống Adobe

- **Thực hiện**: `goto` vào `adminconsole.adobe.com` (entry ổn định, tránh `www.adobe.com`).
- **Mục đích**: kích hoạt redirect chain (nếu chưa login sẽ đẩy sang `auth.services`), hoặc vào thẳng adminconsole nếu cookies còn hiệu lực.
- **Điều kiện thành công**:
  - URL nằm trong `adminconsole.adobe.com` **hoặc** đã redirect sang `auth.services.adobe.com`.
- **Fallback**:
  - Nếu `goto` entry lỗi mạng → `goto` thẳng `LOGIN_PAGE_URL` (`auth.services...`).

### B2 — Quyết định cách login (login trực tiếp hay click Sign in)

- **Thực hiện** (trong `loginFlow.js`):
  - Nếu đang ở `auth.services`/`adobelogin` → **login trực tiếp** (không click Sign in).
  - Nếu thấy form email (input email visible) → **login trực tiếp**.
  - Nếu rơi `chrome-error://chromewebdata/` → retry `goto LOGIN_PAGE_URL`, nếu vẫn lỗi → fail (network/proxy/DNS).
  - Ngược lại → **click Sign in** (trường hợp đang ở landing có nút Sign in).
- **Output**: page được đưa về **auth page** để nhập email/password/2FA.

### B3 — Nhập email

- **Thực hiện**: tìm input email (`input[name="username"] | input[type="email"] | input[name="email"]`) và `fill(email)` rồi `Enter`.
- **Mục đích**: đi tới bước xác minh (2FA) hoặc password tuỳ account.

### B4 — Detect screen sau khi nhập email

- **Thực hiện**: `detectScreen()` dựa trên heading visible + fallback password input visible.
- **Kết quả**:
  - `2fa`: chuyển sang B5
  - `password`: chuyển sang B6

### B5 — 2FA: bấm Continue để gửi OTP + nhập OTP

- **Thực hiện**:
  - Click `Continue` (primary button) để Adobe gửi OTP email.
  - Poll IMAP (`mailOtpService`) để lấy mã OTP.
  - Điền OTP (multi input hoặc single input) và submit.
- **Thoát bước**: khi URL bắt đầu redirect sang adminconsole/account hoặc màn hình chuyển sang password.

### B6 — Nhập password

- **Thực hiện**: tìm `input[type="password"]` và `fill(password)` rồi `Enter`.
- **Thoát bước**: chờ redirect (adminconsole/account) hoặc chuyển sang 2FA (tuỳ account).

### B7 — 2FA sau password (nếu Adobe yêu cầu)

- **Thực hiện**: giống B5 nhưng xảy ra sau khi đã nhập password.

### B8 — Skip các màn "progressive profile" (phone/backup/security prompt)

- **Thực hiện**:
  - Nếu gặp màn add phone / backup email / verify khác → click `Skip/Not now/Later` hoặc xử lý 2FA.
- **Mục đích**: đưa flow về trạng thái redirect hoàn tất.

### B9 — Xác nhận login thành công

- **Thực hiện**: poll URL cho tới khi `isOnAdobeSite(url)` đúng (adminconsole/account/@AdobeOrg…).
- **Kết quả**: login xong, chuẩn bị scrape.

### B10 — Lấy Profile Name ngay trên Admin Console

- **Thực hiện** (theo note mới trong `Renew_Adobe_Check_Flow.md`):
  - Click `button[data-testid="org-switch-button"]` trên adminconsole.
- **Mục đích**: mở menu chọn organization.

### B11 — Chọn dòng có tag "Business ID" để lấy Profile Name

- **Thực hiện**:
  - Đọc menu `role="listbox"` và các item `role="option"`.
  - Chọn option có chứa `Business ID` và lấy text làm `org_name`.
- **Fallback**: nếu không parse được → `org_name = null` (không fail toàn flow).

### B12 — Vào trang Products và scrape danh sách sản phẩm

- **Thực hiện**:
  - `goto https://adminconsole.adobe.com/products`
  - `waitForProductsPageReady()` (selector linh hoạt theo data-testid/role/table)
  - `scrapeProductsPage()`:
    - Strategy A (data-testid cũ)
    - Strategy B (ARIA role row/grid + parse `x/y` hoặc `x trên y`)
- **Output**:
  - `products[]`
  - `orgId` (parse từ URL `/{orgId}@AdobeOrg/products`)
  - `license_status`:
    - `unknown` nếu không scrape được products
    - `Paid` nếu có row `total>0` và `used<total`
    - `Expired` nếu không còn slot/không có total

### B13 — Vào trang Users và scrape danh sách user

- **Thực hiện**:
  - `goto https://adminconsole.adobe.com/users`
  - `waitForUsersPageReady()`
  - `scrapeUsersPage()` lấy `name/email/hasProduct` theo row UI
- **Output**: `users[]`

---

### 4.1. B1 — Entry (tránh www.adobe.com)

**File**: `runCheckFlow.js`

- **Đi thẳng** `https://adminconsole.adobe.com/` (ổn định hơn `https://www.adobe.com/`)
- Nếu entry fail (mạng/proxy) → fallback `LOGIN_PAGE_URL` (`auth.services.adobe.com`)

Mục tiêu B1:
- Nếu cookies còn hiệu lực → có thể đã ở trạng thái logged-in
- Nếu chưa login → sẽ redirect sang auth flow

### 4.2. B2–B9 — Login

**File**: `loginFlow.js`

Các nhánh chính:

1) **Nếu đang ở auth page** (`auth.services.adobe.com` hoặc `adobelogin.com`)
- Login trực tiếp qua `doFormLoginOnAuthPage()`

2) **Nếu rơi vào `chrome-error://chromewebdata/`**
- Retry goto `LOGIN_PAGE_URL`
- Nếu vẫn chrome-error → fail rõ ràng (vấn đề network/proxy/DNS)

3) **Nếu thấy form email** (dù URL chưa match auth)
- Login trực tiếp (không click Sign in)

4) **Ngược lại** (đang ở trang có nút Sign in)
- Click Sign in → tới auth → nhập email → detect screen

#### 4.2.1. Detect screen

`detectScreen(page, timeout)` ưu tiên:
- Heading visible text (`h1/h2/h3/Heading`) để nhận diện:
  - 2FA (verify/identity/xác minh)
  - Password (password/mật khẩu)
- Fallback: `input[type="password"]:visible`

#### 4.2.2. 2FA OTP

`handle2FA(page, mailBackupId)`:
- Click Continue (gửi OTP)
- Chờ OTP input
- Poll IMAP để lấy OTP (tối đa ~2 phút)
- Fill OTP và submit

#### 4.2.3. Progressive profile / phone / backup email

`handleProgressiveProfile()` và `maybeSkipSecurityPrompt()`:
- Nếu gặp màn add phone / backup email / verify → click Skip/Not now hoặc gọi lại 2FA

### 4.3. B10–B11 — Lấy Profile Name (đã chuyển sang adminconsole)

**File**: `checkInfoFlow.js`

Theo note mới trong `docs/Renew_Adobe_Check_Flow.md`:

1) Trên `adminconsole` click:
- `button[data-testid="org-switch-button"]`

2) Trong menu listbox:
- Tìm option có tag `Business ID`
- Lấy label của option đó làm **Profile Name**

Fallback:
- Nếu không thấy menu/listbox hoặc không parse được → `org_name = null` (không fail cả flow)

### 4.4. B12 — Products

**File**: `checkInfoFlow.js`

- `page.goto("https://adminconsole.adobe.com/products")`
- `waitForProductsPageReady()`:
  - Chờ các selector linh hoạt: `data-testid`, `role="grid/table"`, `row`, `table tbody tr`, nút Export CSV…
- `scrapeProductsPage()`:
  - Strategy A: đọc `data-testid` (UI cũ)
  - Strategy B: đọc `role=row` và parse chuỗi `x/y` hoặc `x trên y` (UI mới)

Kết luận:
- Nếu `products.length === 0` → `license_status = "unknown"` (không ép Expired)
- Nếu có products:
  - `Paid` khi có ít nhất 1 row với `total > 0` và `used < total`
  - Ngược lại `Expired`

Ngoài ra:
- `orgId` được lấy từ URL dạng `/{orgId}@AdobeOrg/products`

### 4.5. B13 — Users

**File**: `checkInfoFlow.js`

- `page.goto("https://adminconsole.adobe.com/users")`
- `waitForUsersPageReady()`:
  - Chờ `data-testid="table"` hoặc `data-testid^="member-email-"`
- `scrapeUsersPage()`:
  - Mỗi row lấy:
    - `email`: từ `[data-testid^="member-email-"]`
    - `name`: từ link user trong row
    - `hasProduct`: detect icon/product marker trong row (mức UI)

> Ghi chú: V2 scrape users theo UI; luồng `adobe-http` có cơ chế check product chuẩn hơn bằng API `/products/{id}/users` và **lọc paid products**.

---

## 5. Dữ liệu lưu DB (từ controller)

Ở backend controller (RenewAdobeController), sau khi check thành công sẽ update:
- `org_name`
- `user_count`
- `license_status`
- `users_snapshot` (JSON)
- `alert_config` (cookies / session payload)

Trong UI, danh sách "user & đơn hàng" đọc từ `users_snapshot`.

---

## 6. Các lỗi thực tế & hướng xử lý (đã gặp)

### 6.1. Headless bị lỗi nhưng non-headless ok

Triệu chứng:
- `PLAYWRIGHT_HEADLESS=true` hay gặp network/chặn bot/captcha
- `chrome-error://chromewebdata/` khi goto auth

Giải pháp trong code hiện tại:
- Tránh `www.adobe.com`, vào `adminconsole` trước
- Retry goto `LOGIN_PAGE_URL` nếu chrome-error
- Log thêm URL + body khi `doFormLoginOnAuthPage` fail để debug (captcha/blocked)

### 6.2. UI đổi selector làm scrape products/users = 0

Giải pháp:
- `waitForProductsPageReady()` và `scrapeProductsPage()` đã có fallback theo role/grid/table
- Nếu products = 0 → `license_status="unknown"` (tránh báo sai Expired)

---

## 7. Checklist kiểm thử nhanh

- **Login**:
  - Account có cookies: B1 vào adminconsole không cần form login
  - Account cần 2FA: nhận OTP qua IMAP và đi tiếp
- **B10–B11**:
  - Có thấy log: `Profile Name (adminconsole org switch) = ...`
- **B12**:
  - `products > 0` hoặc nếu 0 thì `license_status=unknown` (không Expired)
- **B13**:
  - `users` ra đủ số lượng (không chỉ 1 row)

---

## 8. Ghi chú mở rộng (khi cần nâng cấp)

- Nếu cần "user có gói/không" thật chuẩn (loại trừ free products):
  - Nên dùng API JIL `/products/{id}/users` và chỉ lấy **paid products**
  - (Hiện logic này đã có trong `adobe-http`, có thể port sang V2 nếu muốn)
----------------------------------------------------
bấm đúng button này để hiện dropdown. 
<button type="button" tabindex="-1" id="react-aria5235655650-:rks:" aria-label="Show suggestions" aria-labelledby="react-aria5235655650-:rks: react-aria5235655650-:rkv:" aria-haspopup="listbox" aria-expanded="true" class="Dniwja_spectrum-FieldButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring Dniwja_is-active ZTA2ya_spectrum-FieldButton" aria-controls="react-aria5235655650-:rkt:" aria-hidden="true"><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-ChevronDownMedium spectrum-Dropdown-chevron Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path d="M9.99 1.01A1 1 0 0 0 8.283.303L5 3.586 1.717.303A1 1 0 1 0 .303 1.717l3.99 3.98a1 1 0 0 0 1.414 0l3.99-3.98a.997.997 0 0 0 .293-.707z"></path></svg></button>
Sau đó mới bấm vào 
<div role="option" aria-selected="false" aria-labelledby="react-aria5235655650-:rn6:" aria-posinset="1" aria-setsize="1" data-key="hungnln210299@gmail.com" id="react-aria5235655650-:rkt:-option-hungnln210299@gmail.com" class="Q7FggG_spectrum-Menu-item Q7FggG_is-selectable Q7FggG_is-hovered"><div class="Q7FggG_spectrum-Menu-itemGrid" style="display: grid;"><span id="react-aria5235655650-:rn6:" class="Q7FggG_spectrum-Menu-itemLabel"> </span><span data-testid="new-user-row" id="react-aria5235655650-:rn6:" class="Q7FggG_spectrum-Menu-itemLabel" style="color: var(--spectrum-global-color-blue-700);">Thêm làm người dùng mới</span></div></div>

Tiếp theo bấm vào
<button class="Dniwja_spectrum-ActionButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring" type="button" id="react-aria5235655650-:rl9:" aria-labelledby="react-aria5235655650-:rla:" data-testid="assignment-modal-open-button"><svg viewBox="0 0 36 36" data-testid="assignment-add-icon" class="wBx8DG_spectrum-Icon wBx8DG_spectrum-Icon--sizeS Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path fill-rule="evenodd" d="M29,16H20V7a1,1,0,0,0-1-1H17a1,1,0,0,0-1,1v9H7a1,1,0,0,0-1,1v2a1,1,0,0,0,1,1h9v9a1,1,0,0,0,1,1h2a1,1,0,0,0,1-1V20h9a1,1,0,0,0,1-1V17A1,1,0,0,0,29,16Z"></path></svg></button>
Sẽ hiện Form
<div class="_0YML2q_spectrum-Modal-wrapper OhnpTq_spectrum-Modal-wrapper OhnpTq_react-spectrum-Modal-wrapper" style="--spectrum-visual-viewport-height: 954px;"><div class="_0YML2q_spectrum-Modal _0YML2q_spectrum-overlay _0YML2q_is-open _0YML2q_spectrum-overlay--open OhnpTq_spectrum-Modal OhnpTq_react-spectrum-Modal" data-testid="modal"><section class="h_OVWW_spectrum-Dialog h_OVWW_spectrum-Dialog--large" data-testid="product-assignment-modal" role="dialog" tabindex="-1" style="height: var(--spectrum-global-dimension-size-6000, var(--spectrum-alias-size-6000));"><div class="h_OVWW_spectrum-Dialog-grid" style="display: grid;"><header class="h_OVWW_spectrum-Dialog-header spectrum-Dialog-header--noHeading h_OVWW_spectrum-Dialog-header--noTypeIcon" style="justify-self: left;"><div class="vi3c6W_flex" style="height: 100%; flex-direction: column; justify-content: center;"><h4 class="ProductAssignmentModal__product-assignment-modal-header-heading___SrI3P">Chọn sản phẩm</h4></div></header><hr class="cTbPrq_spectrum-Rule cTbPrq_spectrum-Rule--medium cTbPrq_spectrum-Rule--horizontal h_OVWW_spectrum-Dialog-divider"><section data-testid="product-assignment-modal-content" class="h_OVWW_spectrum-Dialog-content"><span data-focus-scope-start="true" hidden=""></span><div aria-label="Lựa chọn sản phẩm" data-testid="product-select-list" role="grid" id="react-aria5235655650-:ro8:" aria-multiselectable="true" tabindex="0" aria-rowcount="1" aria-colcount="1" class="C64cMW_react-spectrum-ListView C64cMW_react-spectrum-ListView--compact C64cMW_react-spectrum-ListView--emphasized C64cMW_react-spectrum-ListView--quiet C64cMW_react-spectrum-ListView--wrap CustomListView__product-select-page___1BHl5" style="padding: 0px; min-height: var(--spectrum-global-dimension-size-500, var(--spectrum-alias-size-500)); overflow: hidden auto;"><div role="presentation" style="width: 560px; height: 40px; pointer-events: auto; position: relative;"><div role="presentation" style="position: absolute; overflow: visible; top: 0px; left: 0px; transition-behavior: normal; transition-duration: inherit; transition-timing-function: ease; transition-delay: 0s; transition-property: all; width: 560px; opacity: 1; z-index: 0; contain: size layout style; height: 40px;"><div tabindex="-1" data-key="691FCEC811FBC7165E2A" role="row" aria-label="Creative Cloud Pro" aria-selected="false" id="react-aria5235655650-:ro8:-691FCEC811FBC7165E2A" aria-rowindex="1" class="C64cMW_react-spectrum-ListView-row C64cMW_round-tops C64cMW_round-bottoms"><div class="C64cMW_react-spectrum-ListViewItem C64cMW_react-spectrum-ListViewItem--firstRow C64cMW_react-spectrum-ListViewItem--lastRow C64cMW_react-spectrum-ListViewItem--isFlushBottom" role="gridcell" aria-colindex="1"><div class="C64cMW_react-spectrum-ListViewItem-grid" style="display: grid;"><div class="C64cMW_react-spectrum-ListViewItem-checkboxWrapper"><label class="ISsn1a_spectrum-Checkbox C64cMW_react-spectrum-ListViewItem-checkbox"><input id="react-aria5235655650-:roi:" aria-label="Select" aria-labelledby="react-aria5235655650-:roi: react-aria5235655650-:ro8:-691FCEC811FBC7165E2A" type="checkbox" class="ISsn1a_spectrum-Checkbox-input"><span class="ISsn1a_spectrum-Checkbox-box"><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-CheckmarkSmall ISsn1a_spectrum-Checkbox-checkmark" focusable="false" aria-hidden="true" role="img"><path d="M3.788 9A.999.999 0 0 1 3 8.615l-2.288-3a1 1 0 1 1 1.576-1.23l1.5 1.991 3.924-4.991a1 1 0 1 1 1.576 1.23l-4.712 6A.999.999 0 0 1 3.788 9z"></path></svg></span></label></div><div class="C64cMW_react-spectrum-ListViewItem-thumbnail" style="align-self: flex-start; flex-shrink: 0; height: 32px; width: 32px; max-width: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); max-height: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); overflow: hidden;"><img src="https://mcs.odin.adobe.com/content/dam/mcs/vi_vn/icons/raw/svg/cc_appicon.svg" alt="Creative Cloud Pro" class="Gv9sRq_spectrum-Image-img"></div><span data-testid="row-has-no-children" class="C64cMW_react-spectrum-ListViewItem-content">Creative Cloud Pro<span class="C64cMW_react-spectrum-ListViewItem-content" style="font-weight: bold;">&nbsp;(9)</span></span><span data-testid="row-unchecked" class="C64cMW_react-spectrum-ListViewItem-actions" style="margin-left: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150)); margin-right: var(--spectrum-global-dimension-size-100, var(--spectrum-alias-size-100)); width: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150));">&nbsp;</span><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-ChevronRightMedium C64cMW_react-spectrum-ListViewItem-parentIndicator C64cMW_is-disabled" focusable="false" aria-hidden="true" role="img"><path d="M5.99 5a.997.997 0 0 0-.293-.707L1.717.303A1 1 0 1 0 .303 1.717L3.586 5 .303 8.283a1 1 0 1 0 1.414 1.414l3.98-3.99A.997.997 0 0 0 5.99 5z"></path></svg></div></div></div></div></div></div><span data-focus-scope-end="true" hidden=""></span></section><footer class="h_OVWW_spectrum-Dialog-footer"><div class="aaz5ma_spectrum-ButtonGroup" style="margin-left: auto;"><button class="Dniwja_spectrum-Button Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring aaz5ma_spectrum-ButtonGroup-Button" type="button" data-testid="cancel-button" id="react-aria5235655650-:ro9:" data-variant="secondary" data-style="outline"><span id="react-aria5235655650-:rob:" class="Dniwja_spectrum-Button-label">Hủy</span></button><button class="Dniwja_spectrum-Button Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring Dniwja_is-disabled aaz5ma_spectrum-ButtonGroup-Button" type="button" disabled="" data-testid="cta-button" id="react-aria5235655650-:rod:" data-variant="accent" data-style="fill"><span id="react-aria5235655650-:rof:" class="Dniwja_spectrum-Button-label">Áp dụng</span></button></div></footer></div></section></div></div>

Bấm vào
<div aria-label="Lựa chọn sản phẩm" data-testid="product-select-list" role="grid" id="react-aria5235655650-:ro8:" aria-multiselectable="true" tabindex="0" aria-rowcount="1" aria-colcount="1" class="C64cMW_react-spectrum-ListView C64cMW_react-spectrum-ListView--compact C64cMW_react-spectrum-ListView--emphasized C64cMW_react-spectrum-ListView--quiet C64cMW_react-spectrum-ListView--wrap CustomListView__product-select-page___1BHl5" style="padding: 0px; min-height: var(--spectrum-global-dimension-size-500, var(--spectrum-alias-size-500)); overflow: hidden auto;"><div role="presentation" style="width: 560px; height: 40px; pointer-events: auto; position: relative;"><div role="presentation" style="position: absolute; overflow: visible; top: 0px; left: 0px; transition-behavior: normal; transition-duration: inherit; transition-timing-function: ease; transition-delay: 0s; transition-property: all; width: 560px; opacity: 1; z-index: 0; contain: size layout style; height: 40px;"><div tabindex="-1" data-key="691FCEC811FBC7165E2A" role="row" aria-label="Creative Cloud Pro" aria-selected="false" id="react-aria5235655650-:ro8:-691FCEC811FBC7165E2A" aria-rowindex="1" class="C64cMW_react-spectrum-ListView-row C64cMW_round-tops C64cMW_round-bottoms"><div class="C64cMW_react-spectrum-ListViewItem C64cMW_react-spectrum-ListViewItem--firstRow C64cMW_react-spectrum-ListViewItem--lastRow C64cMW_react-spectrum-ListViewItem--isFlushBottom" role="gridcell" aria-colindex="1"><div class="C64cMW_react-spectrum-ListViewItem-grid" style="display: grid;"><div class="C64cMW_react-spectrum-ListViewItem-checkboxWrapper"><label class="ISsn1a_spectrum-Checkbox C64cMW_react-spectrum-ListViewItem-checkbox"><input id="react-aria5235655650-:roi:" aria-label="Select" aria-labelledby="react-aria5235655650-:roi: react-aria5235655650-:ro8:-691FCEC811FBC7165E2A" type="checkbox" class="ISsn1a_spectrum-Checkbox-input"><span class="ISsn1a_spectrum-Checkbox-box"><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-CheckmarkSmall ISsn1a_spectrum-Checkbox-checkmark" focusable="false" aria-hidden="true" role="img"><path d="M3.788 9A.999.999 0 0 1 3 8.615l-2.288-3a1 1 0 1 1 1.576-1.23l1.5 1.991 3.924-4.991a1 1 0 1 1 1.576 1.23l-4.712 6A.999.999 0 0 1 3.788 9z"></path></svg></span></label></div><div class="C64cMW_react-spectrum-ListViewItem-thumbnail" style="align-self: flex-start; flex-shrink: 0; height: 32px; width: 32px; max-width: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); max-height: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); overflow: hidden;"><img src="https://mcs.odin.adobe.com/content/dam/mcs/vi_vn/icons/raw/svg/cc_appicon.svg" alt="Creative Cloud Pro" class="Gv9sRq_spectrum-Image-img"></div><span data-testid="row-has-no-children" class="C64cMW_react-spectrum-ListViewItem-content">Creative Cloud Pro<span class="C64cMW_react-spectrum-ListViewItem-content" style="font-weight: bold;">&nbsp;(9)</span></span><span data-testid="row-unchecked" class="C64cMW_react-spectrum-ListViewItem-actions" style="margin-left: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150)); margin-right: var(--spectrum-global-dimension-size-100, var(--spectrum-alias-size-100)); width: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150));">&nbsp;</span><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-ChevronRightMedium C64cMW_react-spectrum-ListViewItem-parentIndicator C64cMW_is-disabled" focusable="false" aria-hidden="true" role="img"><path d="M5.99 5a.997.997 0 0 0-.293-.707L1.717.303A1 1 0 1 0 .303 1.717L3.586 5 .303 8.283a1 1 0 1 0 1.414 1.414l3.98-3.99A.997.997 0 0 0 5.99 5z"></path></svg></div></div></div></div></div></div>
Rồi bấm button Áp Dụng
Cuối cùng bấm Lưu
<button class="Dniwja_spectrum-Button Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring aaz5ma_spectrum-ButtonGroup-Button aaz5ma_spectrum-ButtonGroup-Button" type="button" data-testid="cta-button" id="react-aria5235655650-:rm4:" data-variant="accent" data-style="fill"><span id="react-aria5235655650-:rm6:" class="Dniwja_spectrum-Button-label">Lưu</span></button>

Lưu ý:
Trong form
<div class="_0YML2q_spectrum-Modal-wrapper OhnpTq_spectrum-Modal-wrapper OhnpTq_react-spectrum-Modal-wrapper" style="--spectrum-visual-viewport-height: 954px;"><div class="_0YML2q_spectrum-Modal _0YML2q_spectrum-overlay _0YML2q_is-open _0YML2q_spectrum-overlay--open OhnpTq_spectrum-Modal OhnpTq_react-spectrum-Modal" data-testid="modal"><section class="h_OVWW_spectrum-Dialog h_OVWW_spectrum-Dialog--large binky__src2-shell-panels-modal-dialog-___ModalDialog__modal-static" id="add-users-to-org-modal" role="dialog" tabindex="-1" aria-labelledby="react-aria5235655650-:rkq:" style="width: 1100px;" aria-describedby="add-users-to-org-modal-description"><div class="h_OVWW_spectrum-Dialog-grid" style="display: grid;"><h2 data-testid="modal-header" id="react-aria5235655650-:rkq:" class="binky__src2-shell-panels-modal-dialog-heading-___ModalHeading__heading h_OVWW_spectrum-Dialog-heading h_OVWW_spectrum-Dialog-heading--noHeader h_OVWW_spectrum-Dialog-heading--noTypeIcon" style="margin-left: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400));">Thêm người dùng vào nhóm bạn</h2><section data-testid="description" style="grid-area: h_OVWW_divider; margin-bottom: var(--spectrum-global-dimension-size-125, var(--spectrum-alias-size-125)); margin-top: var(--spectrum-global-dimension-size-125, var(--spectrum-alias-size-125)); margin-left: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); margin-right: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400));"><span></span><div class="vi3c6W_flex" style="flex-direction: column;"><div id="add-users-to-org-modal-description"><span data-testid="user-info-text">Để thêm người dùng, hãy nhập địa chỉ email và chọn sản phẩm để chỉ định. Với gói thành viên miễn phí, tất cả người dùng Admin Console đều có quyền truy cập vào gói Adobe Express miễn phí, dịch vụ trực tuyến miễn phí Acrobat và các lợi ích bổ sung để giúp nhóm của bạn cộng tác trên các sản phẩm Adobe. <a data-testid="complimentary_membership" href="https://www.adobe.com/go/complimentary_membership_vi" rel="noopener noreferrer" target="_blank" class="WBgRPa_spectrum-Link spectrum-Link--primary"><span>Tìm hiểu cách tận hưởng lợi ích và những lợi ích bao gồm</span><span data-testid="complimentary_membership-hidden" style="border: 0px; clip: rect(0px, 0px, 0px, 0px); clip-path: inset(50%); height: 1px; margin: -1px; overflow: hidden; padding: 0px; position: absolute; width: 1px; white-space: nowrap;">(mở trong cửa sổ mới)</span></a><br>Để thêm nhiều người dùng cùng lúc, hãy chuyển đến <span class="WBgRPa_spectrum-Link spectrum-Link--primary" tabindex="0" role="link">tab Người dùng</span> rồi chọn <b>Thêm người dùng bằng CSV</b>.</span></div><hr class="cTbPrq_spectrum-Rule cTbPrq_spectrum-Rule--medium cTbPrq_spectrum-Rule--horizontal" style="margin-top: var(--spectrum-global-dimension-size-250, var(--spectrum-alias-size-250));"></div></section><section data-testid="modal-content" class="h_OVWW_spectrum-Dialog-content"><div style="padding-left: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); padding-right: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400));"><div class="binky__src2-common-components-add-user-form-table-___AddUserFormTable__background-transparent react-spectrum-provider spectrum spectrum--light spectrum--medium"><div data-testid="add-user-form-table"><div data-testid="titled-section" class="vi3c6W_flex" style="flex-direction: column;"><div class="vi3c6W_flex" style="justify-content: space-between;"><h3 data-testid="titled-section-title" id="react-aria5235655650-:rkr:" class="binky__src2-common-components-titled-section-___TitledSection__title" style="margin-bottom: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150)); margin-top: var(--spectrum-global-dimension-0, var(--spectrum-alias-0));">Người dùng 1</h3><div><button aria-label="Xóa Người dùng 1" data-testid="link-button" class="binky__src2-common-components-link-button-___LinkButton__link-button" type="button">Xóa</button></div></div><div><div class="vi3c6W_flex" style="align-items: flex-start; flex-direction: row; gap: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div style="flex: 1 1 0%;"><div data-testid="add-user-form" class="binky__src2-common-components-add-user-form-___AddUserForm__user-profile-selection"><div data-testid="user-picker-wrapper"><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop" style="width: var(--spectrum-global-dimension-size-4600, var(--spectrum-alias-size-4600)); margin-right: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><label id="react-aria5235655650-:rkv:" class="jIQVGq_spectrum-FieldLabel" for="textfield-email-37">Email hoặc tên người dùng</label><div class="ZTA2ya_spectrum-InputGroup ZTA2ya_spectrum-FocusRing ZTA2ya_spectrum-FocusRing-ring jIQVGq_spectrum-Field-field"><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop ZTA2ya_spectrum-InputGroup-field YO3Nla_spectrum-Textfield-wrapper"><div class="YO3Nla_spectrum-Textfield YO3Nla_spectrum-FocusRing YO3Nla_spectrum-FocusRing-ring YO3Nla_spectrum-Textfield--loadable jIQVGq_spectrum-Field-field"><input data-testid="user-picker" id="textfield-email-37" type="text" aria-autocomplete="list" autocomplete="off" aria-labelledby="react-aria5235655650-:rkv:" role="combobox" aria-expanded="false" autocorrect="off" spellcheck="false" class="YO3Nla_spectrum-Textfield-input YO3Nla_i18nFontFamily ZTA2ya_spectrum-InputGroup-input" value="hungnln210299@gmail.com" data-sharkid="__8" data-sharklabel="email"><shark-icon-container data-sharkidcontainer="__8" style="position: absolute;"></shark-icon-container></div></div><button type="button" tabindex="-1" id="react-aria5235655650-:rks:" aria-label="Show suggestions" aria-labelledby="react-aria5235655650-:rks: react-aria5235655650-:rkv:" aria-haspopup="listbox" aria-expanded="false" class="Dniwja_spectrum-FieldButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring ZTA2ya_spectrum-FieldButton"><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-ChevronDownMedium spectrum-Dropdown-chevron Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path d="M9.99 1.01A1 1 0 0 0 8.283.303L5 3.586 1.717.303A1 1 0 1 0 .303 1.717l3.99 3.98a1 1 0 0 0 1.414 0l3.99-3.98a.997.997 0 0 0 .293-.707z"></path></svg></button></div></div></div><div class="binky__src2-common-components-add-user-form-editable-fields-___AddUserFormEditableFields__second-row"><div data-testid="name-inputs" class="binky__src2-common-components-add-user-form-editable-fields-___AddUserFormEditableFields__name-inputs"><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop YO3Nla_spectrum-Textfield-wrapper" style="margin-right: 16px; width: 192px;"><label id="react-aria5235655650-:rn9:" class="jIQVGq_spectrum-FieldLabel" for="textfield-first-name-37">Tên ​<span>(optional)</span></label><div class="YO3Nla_spectrum-Textfield YO3Nla_spectrum-FocusRing YO3Nla_spectrum-FocusRing-ring jIQVGq_spectrum-Field-field"><input data-testid="first-name-field" id="textfield-first-name-37" type="text" autocomplete="nada" maxlength="255" aria-labelledby="react-aria5235655650-:rn9:" class="YO3Nla_spectrum-Textfield-input YO3Nla_i18nFontFamily" value="" data-sharkid="__9" data-sharklabel="firstName"></div></div><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop YO3Nla_spectrum-Textfield-wrapper" style="margin-right: 16px; width: 192px;"><label id="react-aria5235655650-:rng:" class="jIQVGq_spectrum-FieldLabel" for="textfield-last-name-37">Họ ​<span>(optional)</span></label><div class="YO3Nla_spectrum-Textfield YO3Nla_spectrum-FocusRing YO3Nla_spectrum-FocusRing-ring jIQVGq_spectrum-Field-field"><input data-testid="last-name-field" id="textfield-last-name-37" type="text" autocomplete="nada" maxlength="255" aria-labelledby="react-aria5235655650-:rng:" class="YO3Nla_spectrum-Textfield-input YO3Nla_i18nFontFamily" value="" data-sharkid="__10" data-sharklabel="lastName"></div></div></div></div></div></div></div><div style="margin-bottom: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div class="vi3c6W_flex" style="margin-top: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200)); flex-direction: column; gap: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div data-testid="assignment-modal-section" class="AssignmentSection__assignment-section___nPXHg"><label id="react-aria5235655650-:rla:" data-testid="assignment-button-label" class="jIQVGq_spectrum-FieldLabel" for="react-aria5235655650-:rl9:">Sản phẩm</label><button class="Dniwja_spectrum-ActionButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring" type="button" id="react-aria5235655650-:rl9:" aria-labelledby="react-aria5235655650-:rla:" data-testid="assignment-modal-open-button"><svg viewBox="0 0 36 36" data-testid="assignment-add-icon" class="wBx8DG_spectrum-Icon wBx8DG_spectrum-Icon--sizeS Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path fill-rule="evenodd" d="M29,16H20V7a1,1,0,0,0-1-1H17a1,1,0,0,0-1,1v9H7a1,1,0,0,0-1,1v2a1,1,0,0,0,1,1h9v9a1,1,0,0,0,1,1h2a1,1,0,0,0,1-1V20h9a1,1,0,0,0,1-1V17A1,1,0,0,0,29,16Z"></path></svg></button><div class="AssignmentSection__selected-cards___gcKAi"><div data-testid="mini-product-card" class="MiniProductCard__miniProductCard___StIbc" style="background-color: var(--spectrum-alias-background-color-gray-50, var(--spectrum-legacy-color-gray-50, var(--spectrum-global-color-gray-50, var(--spectrum-semantic-gray-50-color-background)))); border-color: var(--spectrum-alias-border-color-gray-300, var(--spectrum-legacy-color-gray-300, var(--spectrum-global-color-gray-300, var(--spectrum-semantic-gray-300-color-border)))); border-radius: var(--spectrum-alias-border-radius-regular); border-width: var(--spectrum-alias-border-size-thin); width: calc(var(--spectrum-global-dimension-size-4600, var(--spectrum-alias-size-4600)) - var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400))); border-style: solid; box-sizing: border-box;"><div class="vi3c6W_flex" style="flex-wrap: wrap;"><div style="flex-basis: 100%;"><div class="vi3c6W_flex" style="align-items: center;"><div style="flex-grow: 1; margin-bottom: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150)); margin-left: var(--spectrum-global-dimension-size-100, var(--spectrum-alias-size-100)); margin-top: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150)); width: 0px;"><div class="vi3c6W_flex" style="align-items: center;"><div data-testid="mini-product-card-icon" class="MiniProductCard__default___1Di0J" style="flex-grow: 0; flex-shrink: 0; margin-left: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150));"><div class="vi3c6W_flex" style="height: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); width: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); align-items: center; justify-content: center;"><img alt="" src="https://mcs.odin.adobe.com/content/dam/mcs/vi_vn/icons/raw/svg/cc_appicon.svg" data-testid="image-icon" class="wBx8DG_spectrum-Icon wBx8DG_spectrum-Icon--sizeM" focusable="false" aria-hidden="true" role="img"></div></div><div style="flex-grow: 1; width: 0px; margin-left: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><span data-testid="mini-product-card-header"><div class="TruncatedText__textOverflow___mMsvD MiniProductCard__header___Bv5ir" data-testid="truncated-text-testid">Creative Cloud Pro</div></span></div><div data-testid="mini-product-card-buttons" style="margin-bottom: var(--spectrum-global-dimension-size-125, var(--spectrum-alias-size-125)); margin-right: var(--spectrum-global-dimension-size-50, var(--spectrum-alias-size-50)); margin-left: var(--spectrum-global-dimension-size-50, var(--spectrum-alias-size-50)); margin-top: var(--spectrum-global-dimension-size-125, var(--spectrum-alias-size-125));"><div class="vi3c6W_flex" style="margin-top: var(--spectrum-global-dimension-size-0, var(--spectrum-alias-size-0));"><button class="Dniwja_spectrum-ActionButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring Dniwja_spectrum-ActionButton--quiet" type="button" data-testid="mini-product-card-close-button"><svg viewBox="0 0 36 36" class="wBx8DG_spectrum-Icon wBx8DG_spectrum-Icon--sizeS Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path fill-rule="evenodd" d="M26.48528,6.68629,18,15.17157,9.51472,6.68629a1,1,0,0,0-1.41421,0L6.68629,8.10051a1,1,0,0,0,0,1.41421L15.17157,18,6.68629,26.48528a1,1,0,0,0,0,1.41421l1.41422,1.41422a1,1,0,0,0,1.41421,0L18,20.82843l8.48528,8.48528a1,1,0,0,0,1.41421,0l1.41422-1.41422a1,1,0,0,0,0-1.41421L20.82843,18l8.48528-8.48528a1,1,0,0,0,0-1.41421L27.89949,6.68629A1,1,0,0,0,26.48528,6.68629Z"></path></svg></button></div></div></div></div></div></div></div></div></div></div></div></div></div></div><div data-testid="titled-section" class="vi3c6W_flex" style="flex-direction: column;"><div><hr class="cTbPrq_spectrum-Rule cTbPrq_spectrum-Rule--medium cTbPrq_spectrum-Rule--horizontal" style="margin-bottom: var(--spectrum-global-dimension-size-130, var(--spectrum-alias-size-130));"></div><div class="vi3c6W_flex" style="justify-content: space-between;"><h3 data-testid="titled-section-title" id="react-aria5235655650-:rlc:" class="binky__src2-common-components-titled-section-___TitledSection__title" style="margin-bottom: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150)); margin-top: var(--spectrum-global-dimension-0, var(--spectrum-alias-0));">Người dùng 2</h3></div><div><div class="vi3c6W_flex" style="align-items: flex-start; flex-direction: row; gap: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div style="flex: 1 1 0%;"><div data-testid="add-user-form" class="binky__src2-common-components-add-user-form-___AddUserForm__user-profile-selection"><div data-testid="user-picker-wrapper"><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop" style="width: var(--spectrum-global-dimension-size-4600, var(--spectrum-alias-size-4600)); margin-right: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><label id="react-aria5235655650-:rlg:" class="jIQVGq_spectrum-FieldLabel" for="textfield-email-38">Email hoặc tên người dùng</label><div class="ZTA2ya_spectrum-InputGroup ZTA2ya_spectrum-FocusRing ZTA2ya_spectrum-FocusRing-ring jIQVGq_spectrum-Field-field"><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop ZTA2ya_spectrum-InputGroup-field YO3Nla_spectrum-Textfield-wrapper"><div class="YO3Nla_spectrum-Textfield YO3Nla_spectrum-FocusRing YO3Nla_spectrum-FocusRing-ring jIQVGq_spectrum-Field-field"><input data-testid="user-picker" id="textfield-email-38" type="text" aria-autocomplete="list" autocomplete="off" aria-labelledby="react-aria5235655650-:rlg:" role="combobox" aria-expanded="false" autocorrect="off" spellcheck="false" class="YO3Nla_spectrum-Textfield-input YO3Nla_i18nFontFamily ZTA2ya_spectrum-InputGroup-input" value="" data-sharkid="__11" data-sharklabel="email"><shark-icon-container data-sharkidcontainer="__11" style="position: absolute;"></shark-icon-container></div></div><button type="button" tabindex="-1" id="react-aria5235655650-:rld:" aria-label="Show suggestions" aria-labelledby="react-aria5235655650-:rld: react-aria5235655650-:rlg:" aria-haspopup="listbox" aria-expanded="false" class="Dniwja_spectrum-FieldButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring ZTA2ya_spectrum-FieldButton"><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-ChevronDownMedium spectrum-Dropdown-chevron Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path d="M9.99 1.01A1 1 0 0 0 8.283.303L5 3.586 1.717.303A1 1 0 1 0 .303 1.717l3.99 3.98a1 1 0 0 0 1.414 0l3.99-3.98a.997.997 0 0 0 .293-.707z"></path></svg></button></div></div></div></div></div></div><div style="margin-bottom: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div class="vi3c6W_flex" style="margin-top: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200)); flex-direction: column; gap: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div data-testid="assignment-modal-section" class="AssignmentSection__assignment-section___nPXHg"><label id="react-aria5235655650-:rlr:" data-testid="assignment-button-label" class="jIQVGq_spectrum-FieldLabel" for="react-aria5235655650-:rlq:">Sản phẩm</label><button class="Dniwja_spectrum-ActionButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring Dniwja_is-disabled" type="button" disabled="" id="react-aria5235655650-:rlq:" aria-labelledby="react-aria5235655650-:rlr:" data-testid="assignment-modal-open-button"><svg viewBox="0 0 36 36" data-testid="assignment-add-icon" class="wBx8DG_spectrum-Icon wBx8DG_spectrum-Icon--sizeS Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path fill-rule="evenodd" d="M29,16H20V7a1,1,0,0,0-1-1H17a1,1,0,0,0-1,1v9H7a1,1,0,0,0-1,1v2a1,1,0,0,0,1,1h9v9a1,1,0,0,0,1,1h2a1,1,0,0,0,1-1V20h9a1,1,0,0,0,1-1V17A1,1,0,0,0,29,16Z"></path></svg></button><div class="AssignmentSection__selected-cards___gcKAi"></div></div></div></div></div></div><div data-testid="titled-section" class="vi3c6W_flex" style="flex-direction: column;"><div><hr class="cTbPrq_spectrum-Rule cTbPrq_spectrum-Rule--medium cTbPrq_spectrum-Rule--horizontal" style="margin-bottom: var(--spectrum-global-dimension-size-130, var(--spectrum-alias-size-130));"></div><div class="vi3c6W_flex" style="justify-content: space-between;"><h3 data-testid="titled-section-title" id="react-aria5235655650-:rnm:" class="binky__src2-common-components-titled-section-___TitledSection__title" style="margin-bottom: var(--spectrum-global-dimension-size-150, var(--spectrum-alias-size-150)); margin-top: var(--spectrum-global-dimension-0, var(--spectrum-alias-0));">Người dùng 3</h3></div><div><div class="vi3c6W_flex" style="align-items: flex-start; flex-direction: row; gap: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div style="flex: 1 1 0%;"><div data-testid="add-user-form" class="binky__src2-common-components-add-user-form-___AddUserForm__user-profile-selection"><div data-testid="user-picker-wrapper"><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop" style="width: var(--spectrum-global-dimension-size-4600, var(--spectrum-alias-size-4600)); margin-right: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><label id="react-aria5235655650-:rnq:" class="jIQVGq_spectrum-FieldLabel" for="textfield-email-167">Email hoặc tên người dùng</label><div class="ZTA2ya_spectrum-InputGroup ZTA2ya_spectrum-FocusRing ZTA2ya_spectrum-FocusRing-ring jIQVGq_spectrum-Field-field"><div class="jIQVGq_spectrum-Field jIQVGq_spectrum-Field--positionTop ZTA2ya_spectrum-InputGroup-field YO3Nla_spectrum-Textfield-wrapper"><div class="YO3Nla_spectrum-Textfield YO3Nla_spectrum-FocusRing YO3Nla_spectrum-FocusRing-ring jIQVGq_spectrum-Field-field"><input data-testid="user-picker" id="textfield-email-167" type="text" aria-autocomplete="list" autocomplete="off" aria-labelledby="react-aria5235655650-:rnq:" role="combobox" aria-expanded="false" autocorrect="off" spellcheck="false" class="YO3Nla_spectrum-Textfield-input YO3Nla_i18nFontFamily ZTA2ya_spectrum-InputGroup-input" value="" data-sharkid="__12" data-sharklabel="email"><shark-icon-container data-sharkidcontainer="__12" style="position: absolute;"></shark-icon-container></div></div><button type="button" tabindex="-1" id="react-aria5235655650-:rnn:" aria-label="Show suggestions" aria-labelledby="react-aria5235655650-:rnn: react-aria5235655650-:rnq:" aria-haspopup="listbox" aria-expanded="false" class="Dniwja_spectrum-FieldButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring ZTA2ya_spectrum-FieldButton"><svg class="wBx8DG_spectrum-Icon wBx8DG_spectrum-UIIcon-ChevronDownMedium spectrum-Dropdown-chevron Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path d="M9.99 1.01A1 1 0 0 0 8.283.303L5 3.586 1.717.303A1 1 0 1 0 .303 1.717l3.99 3.98a1 1 0 0 0 1.414 0l3.99-3.98a.997.997 0 0 0 .293-.707z"></path></svg></button></div></div></div></div></div></div><div style="margin-bottom: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div class="vi3c6W_flex" style="margin-top: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200)); flex-direction: column; gap: var(--spectrum-global-dimension-size-200, var(--spectrum-alias-size-200));"><div data-testid="assignment-modal-section" class="AssignmentSection__assignment-section___nPXHg"><label id="react-aria5235655650-:ro5:" data-testid="assignment-button-label" class="jIQVGq_spectrum-FieldLabel" for="react-aria5235655650-:ro4:">Sản phẩm</label><button class="Dniwja_spectrum-ActionButton Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring Dniwja_is-disabled" type="button" disabled="" id="react-aria5235655650-:ro4:" aria-labelledby="react-aria5235655650-:ro5:" data-testid="assignment-modal-open-button"><svg viewBox="0 0 36 36" data-testid="assignment-add-icon" class="wBx8DG_spectrum-Icon wBx8DG_spectrum-Icon--sizeS Dniwja_spectrum-Icon" focusable="false" aria-hidden="true" role="img"><path fill-rule="evenodd" d="M29,16H20V7a1,1,0,0,0-1-1H17a1,1,0,0,0-1,1v9H7a1,1,0,0,0-1,1v2a1,1,0,0,0,1,1h9v9a1,1,0,0,0,1,1h2a1,1,0,0,0,1-1V20h9a1,1,0,0,0,1-1V17A1,1,0,0,0,29,16Z"></path></svg></button><div class="AssignmentSection__selected-cards___gcKAi"></div></div></div></div></div></div></div></div></div></section><div class="aaz5ma_spectrum-ButtonGroup aaz5ma_spectrum-ButtonGroup--alignEnd h_OVWW_spectrum-Dialog-buttonGroup h_OVWW_spectrum-Dialog-buttonGroup--noFooter" style="margin-left: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400)); margin-right: var(--spectrum-global-dimension-size-400, var(--spectrum-alias-size-400));"><button class="Dniwja_spectrum-Button Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring aaz5ma_spectrum-ButtonGroup-Button aaz5ma_spectrum-ButtonGroup-Button" type="button" data-testid="cancel-button" id="react-aria5235655650-:rm0:" data-variant="secondary" data-style="outline"><span id="react-aria5235655650-:rm2:" class="Dniwja_spectrum-Button-label">Hủy</span></button><button class="Dniwja_spectrum-Button Dniwja_spectrum-BaseButton Dniwja_i18nFontFamily Dniwja_spectrum-FocusRing Dniwja_spectrum-FocusRing-ring aaz5ma_spectrum-ButtonGroup-Button aaz5ma_spectrum-ButtonGroup-Button" type="button" data-testid="cta-button" id="react-aria5235655650-:rm4:" data-variant="accent" data-style="fill"><span id="react-aria5235655650-:rm6:" class="Dniwja_spectrum-Button-label">Lưu</span></button></div></div></section></div></div>
Có nhiều input điền cùng lúc nhiều email. Có thể áp dụng để cùng lúc add nhiều user
# Kế Hoạch Chuẩn Hóa Cấu Hình Vận Hành V2

**Ngày lập:** 21/10/2026  
**Trạng thái:** Chưa triển khai  
**Phạm vi:** Xóa hardcode vận hành khỏi V2, đưa các thông số chủ shop cần điều chỉnh vào trang **Cấu hình Hệ thống**, và giữ secret/hạ tầng trong `.env`.

---

## 1. Mục tiêu và nguyên tắc

### Mục tiêu

1. Chủ shop có thể thay đổi thông số vận hành trên `/system-config` mà không phải mò vào code hay restart cho các giá trị hỗ trợ reload động.
2. Không còn URL database hoặc credential database hardcode trong code/script V2.
3. Tách rạch ròi giữa cấu hình hạ tầng, cấu hình vận hành và contract kỹ thuật.
4. Không thay đổi API/public behavior hiện tại nếu không có task breaking-change riêng.

### Phân tầng cấu hình bắt buộc

| Tầng | Nơi lưu | Dùng cho | Ví dụ | Không dùng cho |
| --- | --- | --- | --- | --- |
| Hạ tầng/secret khởi động | `.env` hoặc secret manager deploy | Cần trước khi kết nối DB hoặc có thể làm lộ hệ thống | `DATABASE_URL`, `SESSION_SECRET`, Redis URL, Google service credential | Giá trị chủ shop đổi thường xuyên |
| Vận hành động | `system_automation.system_configs` + System page | Có thể đổi khi app đã chạy; cần audit | Telegram, timezone nghiệp vụ, cron schedule, tỷ giá, browser mode | Password DB, session secret |
| Dữ liệu nghiệp vụ | Bảng domain tương ứng | Khác nhau theo sản phẩm/dịch vụ/bản ghi | `warehouse.product_names.login_url`, default slot/days theo sản phẩm | Global secret |
| Contract kỹ thuật | Constants/code | Enum, API path, schema/table/column, validation core | `ORDER_STATUS`, `TABLES`, API route | Giá trị người dùng có thể tự do thay |

### Quy tắc ưu tiên đọc cấu hình

1. `system_configs` hợp lệ và đang bật được ưu tiên cho cấu hình vận hành.
2. Nếu key chưa seed hoặc chưa có giá trị, dùng `.env` tương thích ngược khi phù hợp.
3. Default code chỉ là giá trị an toàn/tối thiểu; không chứa định danh shop, URL production, credential hay topic thực tế.
4. Secret trong System page phải được che khi đọc lại, phân quyền admin và không xuất hiện trong log/API error.

---

## 2. Inventory và đích cấu hình

| Nhóm | Giá trị đang hardcode | Đích sau chuẩn hóa | Quyết định |
| --- | --- | --- | --- |
| DB runtime | Fallback URL database trong `config/env.js` | `.env` bắt buộc | Fail-fast khi thiếu `DATABASE_URL`/URL tương đương |
| Script DB | Fallback URL và credential trong 4 script maintenance | `.env` bắt buộc/CLI explicit | Xóa credential; fail-fast và in tên DB đã che URL trước khi ghi |
| Session | `v2_secret_key_change_me` fallback | `.env` bắt buộc | Production từ chối khởi động với secret mặc định/yếu |
| Cron | `Asia/Ho_Chi_Minh` + 4 cron expression | System page, fallback `.env` | Thay đổi có validate cron/timezone; scheduler reload an toàn |
| Telegram | Fallback topic IDs shop-specific | System page + `.env` bootstrap | Bỏ topic ID numeric trong code; dùng rỗng/disabled khi chưa cấu hình |
| Warehouse browser | Headless, timeout, executable path | Headless/timeout: System page; executable path: `.env` | Không đưa đường dẫn binary server vào DB |
| Kho | URL fallback theo Google/Netflix/Adobe/Canva... | `warehouse.product_names.login_url` | DB URL ưu tiên; code fallback chỉ dùng generic safe URL hoặc bỏ fallback theo brand |
| Đơn hàng | `days=365`, `package_slots=2`, prefix `MAVN` | Dữ liệu nghiệp vụ + System page hạn chế | Không để text status quyết định loại đơn |
| Import V1→V2 | Tên sandbox/local-only guard | CLI env explicit, hai script riêng | Sandbox reset và production merge không dùng chung mode nguy hiểm |
| Frontend dev | Proxy `localhost:3002` | `VITE_API_BASE_URL` | Giữ proxy local, cho override staging/preview |
| Google Analytics | Property ID fallback | `.env` bắt buộc hoặc System page ID không-secret | Không hardcode ID tài sản analytics của shop |

---

## 3. Phạm vi không đưa lên System page

- `DATABASE_URL`, password Redis, `SESSION_SECRET`, key mã hóa, Google service-account JSON/Base64, token deploy: chỉ `.env` hoặc secret manager.
- `WAREHOUSE_BROWSER_EXECUTABLE_PATH`: chỉ `.env` do phụ thuộc filesystem máy chủ.
- Tên schema/table/cột, enum status, API routes: giữ constants/code và migration; không mở UI chỉnh sửa.
- Các thao tác reset database, migration, import production: chỉ CLI/maintenance runbook; không gắn nút web UI.

---

## 4. Thiết kế dữ liệu và API

### 4.1. `system_configs`

Không tạo bảng mới. Bổ sung seed idempotent vào migration mới, mỗi key phải có `config_key` ổn định, `data_type`, mô tả tiếng Việt, `group_name`, validation server-side và audit `updated_by`/`updated_at`.

### 4.2. Key System page cần thêm

| Key | Type | Nhóm | Default an toàn | Validation | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| `APP_TIMEZONE` | STRING | GENERAL | `Asia/Ho_Chi_Minh` | IANA timezone hợp lệ | Scheduler cần reload sau khi đổi |
| `CRON_ORDER_STATUS` | STRING | SCHEDULER | `0 0 * * *` | cron 5-field hợp lệ | Cập nhật trạng thái/hết hạn |
| `CRON_RENEWAL_NOTIFICATION` | STRING | SCHEDULER | `0 7 * * *` | cron 5-field hợp lệ | Dùng thay giờ cứng 07:00 |
| `CRON_SAVINGS_PROFIT` | STRING | SCHEDULER | `0 * * * *` | cron 5-field hợp lệ | Quét sinh lời |
| `CRON_DAILY_FINALIZE` | STRING | SCHEDULER | `55 23 * * *` | cron 5-field hợp lệ | Chốt ngày |
| `WAREHOUSE_BROWSER_HEADLESS` | BOOLEAN | WAREHOUSE | `false` local | Boolean | Production đặt `true` qua seed/deploy override |
| `WAREHOUSE_BROWSER_TIMEOUT_MS` | NUMBER | WAREHOUSE | `30000` | 5.000–120.000 | Timeout mở URL browser |
| `DEFAULT_ORDER_DAYS` | NUMBER | ORDER_BUSINESS | `365` | 1–3.650 | Fallback khi product/variant chưa có rule |
| `DEFAULT_PACKAGE_SLOTS` | NUMBER | WAREHOUSE | `2` | 1–100 | Fallback khi payload thiếu slot |
| `IMPORT_ORDER_PREFIXES` | JSON | ORDER_BUSINESS | `["MAVN"]` | Mảng uppercase, không trống | Thay `startsWith("MAVN")` rải rác |
| `GOOGLE_ANALYTICS_PROPERTY_ID` | STRING | INTEGRATIONS | rỗng | Chỉ chữ số | Có thể để env override lúc bootstrap |

### 4.3. Cấu hình theo dữ liệu nghiệp vụ

1. Chuẩn hóa `warehouse.product_names.login_url`; đây là nguồn đầu tiên khi mở browser kho.
2. Nếu cần default theo sản phẩm, thiết kế cột/bảng rule rõ cho `default_days` và `default_slots`; không suy đoán từ prefix đơn hàng.
3. Thêm trường phân loại đơn enum rõ ràng, ví dụ `order_kind = SALE | IMPORT`; không dùng text status “nhập hàng” để quyết định hạch toán.

### 4.4. API System config

- Giữ `GET /api/system/configs` và `PUT /api/system/configs/:key`.
- Thêm allowlist key editable qua UI; không cho ghi tùy ý mọi key.
- Secret trả `is_set`/giá trị mask; PUT chỉ thay thế khi có giá trị mới.
- Chỉ role admin được đọc/sửa; mọi thay đổi ghi audit event.
- Cron/timezone phải validate trước khi lưu và scheduler reload atomic.

---

## 5. Kế hoạch triển khai

### Giai đoạn 0 — Khảo sát và chốt contract

- [ ] 0.1. Lập danh sách tất cả `process.env.*`, fallback literal và script maintenance V2; gắn từng mục vào bốn tầng cấu hình.
- [ ] 0.2. Chốt owner/key/validation/default/rollback cho từng key inventory.
- [ ] 0.3. Chốt quyền admin, mask secret và audit log System page.
- [ ] 0.4. Chốt migration/backfill `order_kind` và rule theo product trước khi loại bỏ logic `MAVN`/text status.

### Giai đoạn 1 — Bảo mật và fail-fast hạ tầng

- [ ] 1.1. Xóa fallback `DATABASE_URL` khỏi `v2/backend/src/config/env.js`; báo lỗi rõ khi thiếu config.
- [ ] 1.2. Xóa URL/credential hardcode khỏi `validateV1Data.js`, `migrateSystemV1ToV2.js`, `normalize_statuses.js`, `backfillReceiptAllocations.js`.
- [ ] 1.3. Chuẩn hóa helper CLI đọc DB URL, che password khi log, xác nhận DB name/host trước lệnh ghi phá hủy.
- [ ] 1.4. Bắt buộc `SESSION_SECRET` ngoài local; production từ chối default/yếu.
- [ ] 1.5. Cập nhật `.env.example`, deploy docs và kiểm tra secret không vào Git/history mới.

### Giai đoạn 2 — Mở rộng System page và config service

- [ ] 2.1. Tạo migration seed idempotent cho timezone, cron, warehouse browser, order defaults, import prefixes, analytics property ID.
- [ ] 2.2. Thêm allowlist/validation kiểu dữ liệu/range/cron/IANA timezone tại `systemConfigService`.
- [ ] 2.3. Thêm RBAC admin, audit event và API mask secret.
- [ ] 2.4. Mở rộng `SystemPage`: Chung, Lịch tác vụ, Kho & automation, Đơn hàng, Telegram, Tích hợp, Backup, Logs.
- [ ] 2.5. Hiển thị nguồn giá trị: System page, env fallback hoặc default; cảnh báo key bắt buộc chưa set.

### Giai đoạn 3 — Scheduler và notification reload an toàn

- [ ] 3.1. Refactor scheduler thành factory có `start()`, `stop()` và `reload()`; không tạo duplicate cron job.
- [ ] 3.2. Đọc timezone/cron từ config service, validate trước khi schedule.
- [ ] 3.3. Đổi Telegram topic numeric fallback thành rỗng/disabled khi không cấu hình.
- [ ] 3.4. Đảm bảo Telegram đọc config mới từ cache/DB đúng thời điểm, không cần restart cho cờ/topic.
- [ ] 3.5. Test reload valid, từ chối invalid và không duplicate task.

### Giai đoạn 4 — Warehouse browser và catalog URL

- [ ] 4.1. Cho Playwright launcher đọc headless/timeout theo System page → env fallback → default.
- [ ] 4.2. Giữ `WAREHOUSE_BROWSER_EXECUTABLE_PATH` chỉ ở `.env`; ưu tiên Chromium managed khi không set path.
- [ ] 4.3. Hoàn thiện UI Catalog cho `login_url`, validate `http/https`, hiển thị URL sẽ mở.
- [ ] 4.4. Brand fallback chỉ dùng khi catalog chưa có URL; log warning không chứa credential.
- [ ] 4.5. Test persistent profile, headless/headed, timeout và lỗi launcher.

### Giai đoạn 5 — Loại bỏ hardcode nghiệp vụ đơn hàng

- [ ] 5.1. Thêm `order_kind` với constraint enum/validation và backfill có report.
- [ ] 5.2. Thay toàn bộ điều kiện `MAVN`/“nhập hàng” bằng `order_kind`.
- [ ] 5.3. Đưa default days/slots/import prefixes qua config service với fallback tương thích.
- [ ] 5.4. Nếu có rule theo product/variant, ưu tiên rule dữ liệu trước global default.
- [ ] 5.5. Rà soát hạch toán, kho, refund, notification và UI filter theo `order_kind`.

### Giai đoạn 6 — Import và frontend/deploy configuration

- [ ] 6.1. Tách importer sandbox reset và production merge command riêng.
- [ ] 6.2. Production import bắt buộc URL explicit, dry-run, maintenance confirmation, report JSON, backup check; không reset mặc định.
- [ ] 6.3. Hỗ trợ `VITE_API_BASE_URL`; giữ proxy `localhost:3002` cho local.
- [ ] 6.4. Xóa Google Analytics property ID default; đọc env bắt buộc hoặc System page ID không-secret theo quyết định Giai đoạn 0.
- [ ] 6.5. Viết runbook deploy: secret manager, Playwright Chromium, config seed, migration, smoke test, rollback.

### Giai đoạn 7 — Kiểm thử và nghiệm thu

- [ ] 7.1. Unit test precedence: System page/DB → env → default an toàn.
- [ ] 7.2. Test validation boolean, number range, JSON, cron và IANA timezone.
- [ ] 7.3. Integration test RBAC, mask secret, audit log và API config.
- [ ] 7.4. Scheduler test reload valid/invalid, không duplicate task.
- [ ] 7.5. Regression test Orders, Finance, Warehouse, Telegram, System page.
- [ ] 7.6. Test importer dry-run/merge guard, không ghi nhầm production DB.
- [ ] 7.7. Build frontend/backend và smoke System/Warehouse/Orders trên DB V2 import.

---

## 6. Tiêu chí hoàn thành

1. Không còn DB URL/credential hoặc session secret production hardcode trong source/scripts V2.
2. System page quản trị được thông số vận hành liệt kê, có validation và audit.
3. Secret hạ tầng không trả plaintext qua API/UI/log và chỉ nằm ở `.env`/secret manager.
4. Scheduler reload timezone/cron hợp lệ mà không tạo job trùng.
5. Warehouse browser dùng Playwright Chromium theo profile account, mode/headless/timeout đúng tầng cấu hình.
6. Phân loại đơn nhập không còn phụ thuộc text status hoặc prefix rải rác.
7. Import sandbox và production merge được tách riêng, có guard/report đối soát.
8. Test mới pass, không regression Orders/Finance/Warehouse/Telegram/System.

---

## 7. Rủi ro và rollback

| Rủi ro | Phòng ngừa | Rollback |
| --- | --- | --- |
| Cron/timezone sai làm scheduler ngừng hoặc chạy trùng | Validate server-side, preview lịch, atomic reload | Restore config cũ, restart worker nếu cần |
| Secret hiển thị UI/log | Mask API, allowlist, redaction log | Thu hồi/rotate secret, audit access |
| Backfill `order_kind` sai | Dry-run, report count, review sample | Migration down/script rollback có report |
| Đổi config browser làm mất session profile | Không di chuyển/xóa profile; test account mẫu | Khôi phục config cũ, dùng executable path env tạm thời |
| Production import sai đích | URL explicit, guard, backup check, maintenance | Restore backup V2 và lưu report import |

---

## 8. Thứ tự khuyến nghị

1. Giai đoạn 1 — bảo mật/fail-fast.
2. Giai đoạn 2 — config service/UI/validation.
3. Giai đoạn 3 — scheduler/Telegram reload.
4. Giai đoạn 4 — warehouse browser/catalog URL.
5. Giai đoạn 5 — order kind/defaults.
6. Giai đoạn 6 — importer/deploy/frontend config.
7. Giai đoạn 7 — regression và deploy rehearsal.

Không gộp tất cả vào một PR; mỗi PR chỉ xử lý một domain hoặc lát cắt đủ nhỏ để test/rollback độc lập.

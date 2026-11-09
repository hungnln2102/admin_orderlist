# Giai đoạn 5 mới - Dynamic OTP Gateway, Traffic Feature và Code Splitting

- Ngày lập: 2026-11-09
- Múi giờ: Asia/Bangkok
- Trạng thái: TASK PLAN - chờ Master duyệt trước khi triển khai code
- Phạm vi: Backend System/OTP, frontend Traffic, production bundle
- Thay thế: phần Giai đoạn 5 cũ yêu cầu tạo một Provider Class cho từng vendor OTP

## 1. Kết luận kiến trúc đã xác minh

`system.external_api_configs` đã là nguồn cấu hình runtime cho external gateway, gồm `service_key`, `base_url`, `endpoints`, `auth_config`, `field_mapping`, `is_active`. `externalApiConfigService.requestConfiguredApi()` đã dùng safe URL validation, timeout, auth headers và `fetchSafeExternal`.

Vì vậy không tạo `BaseOtpProvider`, `AdesProvider`, `YunaProvider`, `VivarockyProvider` theo từng nhà cung cấp. Provider HTTP dạng JSON/field mapping phải chạy bằng cấu hình DB; thêm vendor mới chỉ thêm hoặc sửa cấu hình DB.

Tuy nhiên một số flow hiện tại không phải request một bước thuần cấu hình: Warehouse 2FA và TOTP là logic nội bộ; Yuna 2FA, VivaRocky, Yuna Mail/Webmail có flow nhiều bước hoặc HTML/parser riêng. Những flow này cần được biểu diễn bằng `execution_mode`/capability adapter, không phân nhánh theo tên vendor trong `switch (serviceKey)`.

## 2. Mục tiêu và không nằm trong phạm vi

### Mục tiêu

- Xóa phụ thuộc vendor-specific khỏi dispatcher chính của `otpProviderService.js`.
- Dùng DB config cho generic HTTP OTP gateway.
- Giữ adapter nhỏ cho capability đặc biệt, có registry rõ ràng.
- Giữ nguyên route, payload và response contract của OTP Portal.
- Tách `TrafficPage.tsx` thành các component feature-local.
- Giảm bundle initial và xử lý cảnh báo chunk lớn bằng code-splitting có kiểm chứng.

### Không nằm trong phạm vi

- Không thay đổi API public của OTP Portal, External API Config, Warehouse hay Order.
- Không đổi schema nghiệp vụ OTP nếu chưa có migration được duyệt.
- Không sửa các file Giai đoạn 2: Warehouse/External Imports.
- Không sửa các file Giai đoạn 3: Finance/Invoices.
- Không tạo Provider class chỉ để đổi tên các hàm cũ.
- Không giữ fallback cứng `otp_hdsd -> fix_ades` khi `service_key` không tồn tại.

## 3. Pre-flight kỹ thuật

### Root cause

- `otpProviderService.js` còn `switch (serviceKey)` cho nhiều vendor dù đã có `fetchOtpFromDynamicConfig()`.
- `fetchOtpFromDynamicConfig()` mới hỗ trợ hạn chế GET/POST + email + JSON field mapping; chưa mô tả đầy đủ request template, multi-step hoặc HTML capability.
- `externalApiConfigService.analyzeEndpoint()` còn nhánh đặc biệt theo `fix_ades`, tạo thêm coupling vendor.
- `otpPortalDispatcher.js` đã đọc chain từ slot config nhưng vẫn có default `fix_ades`, cần chuyển thành lỗi cấu hình rõ ràng hoặc chain mặc định do DB migration quản lý.
- `TrafficPage.tsx` đang chứa state, fetch, xử lý dữ liệu, SVG chart, bảng, export CSV và nhiều khối render trong một file lớn.
- `AppRoutes.tsx` đã có `React.lazy`; `vite.config.ts` chưa có `manualChunks`, và build hiện còn cảnh báo chunk lớn.

### File dự kiến tác động

- `backend/src/domains/system/services/otpProviderService.js`
- `backend/src/domains/system/services/externalApiConfigService.js`
- `backend/src/domains/system/services/otpPortalDispatcher.js`
- `backend/src/domains/system/routes.js` chỉ khi cần giữ tương thích controller/validation
- `backend/src/db/migrations/<timestamp>_add_external_api_execution_mode.js` nếu schema cần bổ sung capability
- `backend/src/domains/system/services/otpExecutionRegistry.js` hoặc tên tương đương cho adapter capability
- `backend/tests/unit/otpProviderService.test.js` hoặc test hiện hữu tương ứng
- `backend/tests/integration/externalApiConfig.integration.test.js` hoặc test integration mới
- `frontend/src/features/traffic/TrafficPage.tsx`
- `frontend/src/features/traffic/components/TrafficHeader.tsx`
- `frontend/src/features/traffic/components/TrafficKpiGrid.tsx`
- `frontend/src/features/traffic/components/TrafficChart.tsx`
- `frontend/src/features/traffic/components/TrafficDataTable.tsx`
- `frontend/src/features/traffic/hooks/useTrafficData.ts`
- `frontend/src/features/traffic/types.ts`
- `frontend/vite.config.ts`
- `frontend/src/routes/AppRoutes.tsx` nếu cần tối ưu loader/chunk
- `docs/plans/2026-11-08_comprehensive_codebase_refactor_master_plan.md`

## 4. Thiết kế triển khai

### P5.0 - Chốt runtime contract và baseline

- [ ] Liệt kê mọi `service_key` đang được slot config sử dụng trong DB/migration.
- [ ] Phân loại từng key theo capability: `GENERIC_JSON`, `MULTI_STEP_HTTP`, `HTML_MAILBOX`, `INTERNAL_TOTP`, `INTERNAL_WAREHOUSE_2FA`.
- [ ] Đối chiếu endpoint, auth, field mapping, response mẫu và input của từng config.
- [ ] Chụp baseline: unit test OTP, test route `/api/system/external-apis/test-otp`, frontend build và kích thước chunk.
- [ ] Chốt backward compatibility cho các key cũ; không xóa record DB đang được slot sử dụng.

### P5.1 - Chuẩn hóa execution mode trong DB config

- [x] Bổ sung trường capability/execution mode có default an toàn, ưu tiên không phá dữ liệu cũ.
- [ ] Nếu chưa cần migration, suy luận mode từ cấu hình hiện có chỉ trong một mapper duy nhất; không rải điều kiện trong service.
- [ ] Chuẩn hóa request definition: method, endpoint template, query/body template, timeout, auth và response field mapping.
- [ ] Không trả secret token/password về client hoặc log.
- [x] Validate endpoint relative path và tiếp tục dùng `requestConfiguredApi()`/`fetchSafeExternal()`.

### P5.2 - Refactor OTP execution theo capability

- [x] Tách generic executor nhận config DB và input context; execution mode được resolve từ DB config.
- [x] Tạo registry capability nhỏ cho logic không thể mô tả bằng DB:
  - `INTERNAL_TOTP`: gọi `totpService` với secret request-only.
  - `INTERNAL_WAREHOUSE_2FA`: đọc warehouse và sinh TOTP từ dữ liệu nội bộ.
  - `MULTI_STEP_HTTP`/`HTML_MAILBOX`: chỉ giữ khi response contract thực tế chứng minh generic executor chưa đủ; adapter nhận config DB, không hardcode vendor name.
- [x] Refactor `probeOtpForEmail()` thành: validate input -> load active config -> resolve capability -> execute -> apply `field_mapping` -> normalize response.
- [x] Xóa `switch (serviceKey)` vendor-specific khỏi đường generic.
- [x] Xóa fallback ngầm sang HDSD/Fix Ades khi config không tồn tại; trả lỗi `EXTERNAL_API_CONFIG_NOT_FOUND`.
- [ ] Giữ `extra_fields`, `found`, `otp`, `message`, `duration_ms`, `service_key` tương thích.

### P5.3 - Refactor OTP dispatcher và endpoint phân tích

- [x] `otpPortalDispatcher.js` chỉ lấy service chain từ DB/system config; không tự thêm `fix_ades`.
- [x] Bỏ các điều kiện `currentService === vendor` khỏi dispatcher; executor resolve capability từ config.
- [ ] Nếu config inactive/deleted trong chain, ghi nhận attempt và tiếp tục fallback hợp lệ; nếu toàn chain rỗng trả lỗi cấu hình rõ ràng.
- [x] Refactor `analyzeEndpoint()` để generic path dùng DB config; capability adapter không kiểm tra `service_key === "fix_ades"` trong service chung.
- [ ] Rate limiting, SSRF protection, timeout, response-size limit và audit log phải giữ nguyên.

### P5.4 - Kiểm thử OTP và database integration

- [x] Unit test generic GET + query email.
- [x] Unit test generic POST + JSON body.
- [x] Unit test `field_mapping`, nested path, primary OTP và `extra_fields`.
- [ ] Unit test inactive/missing config, malformed mapping, timeout, non-JSON response và safe URL rejection.
- [x] Unit test registry cho TOTP/Warehouse capability.
- [ ] Integration test đọc config thực từ DB, cập nhật config rồi kiểm tra cache invalidation.
- [ ] Integration test slot chain: primary success, primary fail/fallback success, all inactive/missing.
- [ ] Regression test route response không đổi với các flow đang dùng.
- [ ] Không gọi external provider thật trong unit test; dùng mock response. Live probe chỉ chạy trong môi trường được cho phép.

### P5.5 - Tách Traffic feature

- [x] Di chuyển interfaces/API response sang `features/traffic/types.ts`.
- [x] Tạo `hooks/useTrafficData.ts` cho fetch, loading, error, days và retry.
- [x] Tạo `components/TrafficHeader.tsx` cho tiêu đề/bộ lọc/export.
- [x] Tạo `components/TrafficKpiGrid.tsx` cho KPI cards.
- [x] Tạo `components/TrafficChart.tsx` cho SVG chart và hover state.
- [x] Tạo `components/TrafficDataTable.tsx` cho tabs, search, sort và pagination.
- [x] Giữ nguyên endpoint `/api/traffic/stats?days=...`, CSV format, tab names và responsive UI.
- [x] `TrafficPage.tsx` chỉ điều phối hook và các component.

### P5.6 - Code splitting và closeout

- [ ] Xác định chunk boundary theo route/feature, không tách mù theo từng icon hoặc file nhỏ.
- [ ] Cấu hình `manualChunks` chỉ khi đo được lợi ích và không tạo circular dependency.
- [x] Giữ `React.lazy`/`Suspense` hiện tại; build xác nhận route Traffic tiếp tục lazy-load.
- [x] Build production và ghi nhận kích thước chunk: Traffic 78.76 kB; FinanceHub còn 691.86 kB.
- [x] Không đặt mục tiêu “0 cảnh báo” bằng cách tắt warning; residual risk: FinanceHub 691.86 kB vượt ngưỡng 500 kB.
- [ ] Xóa code dead/fallback vendor sau khi test chứng minh không còn caller.
- [ ] Cập nhật master plan và report daily review sau nghiệm thu.

## 5. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Provider HTTP mới chỉ cần cấu hình DB
  Given một row external_api_configs active có base_url, endpoint và field_mapping hợp lệ
  When OTP Portal gọi probe với service_key của row đó
  Then hệ thống gọi generic executor theo cấu hình DB và trả otp/extra_fields đúng mapping
  And không cần thêm hoặc sửa file provider JavaScript

Scenario: Không có cấu hình active
  Given service_key không tồn tại hoặc config đã inactive
  When probe OTP được gọi
  Then hệ thống trả lỗi cấu hình rõ ràng hoặc found=false theo response contract
  And không tự gọi HDSD, Fix Ades hoặc vendor khác

Scenario: Capability nội bộ vẫn hoạt động
  Given slot dùng TOTP hoặc Warehouse 2FA
  When probe được gọi
  Then registry chọn đúng capability nội bộ
  And secret request-only không được lưu hoặc ghi log

Scenario: Fallback chain lấy từ DB
  Given slot có primary và fallback service trong system config
  When primary timeout hoặc không tìm thấy OTP
  Then dispatcher thử fallback hợp lệ theo đúng thứ tự DB
  And không tự chèn service vendor mặc định

Scenario: Field mapping không làm lộ secret
  Given response có token/password và field_mapping
  When response được normalize
  Then chỉ field được cấu hình mới xuất hiện
  And secret không xuất hiện trong API response, audit log hoặc console log

Scenario: Traffic UI giữ nguyên hành vi
  Given người dùng mở trang Traffic
  When đổi số ngày, tab, search, sort, pagination hoặc export CSV
  Then kết quả và định dạng CSV tương đương trước refactor

Scenario: Route lazy loading và bundle
  Given production build frontend
  When phân tích output chunks
  Then các route lớn được lazy-load
  And không có chunk mới tăng bất thường do circular/shared dependency
```

## 6. Redlines

- Không tạo `BaseOtpProvider` và một class cho mỗi vendor.
- Không hardcode URL, token, endpoint hoặc field mapping trong executor generic.
- Không lấy secret từ frontend hoặc persist secret TOTP.
- Không bypass `requestConfiguredApi`, SSRF guard, timeout hoặc response-size guard.
- Không tự ý chạy migration production.
- Không thay đổi route/payload/response nếu chưa có regression test.
- Không sửa file Warehouse/External Imports/Finance/Invoices trong phase này.

## 7. Definition of Done

- [ ] Spec và task này được Master duyệt.
- [ ] Generic external API mới chạy chỉ bằng DB config.
- [ ] Vendor-specific switch/fallback không còn trong đường generic.
- [ ] Capability đặc biệt có registry và test độc lập.
- [ ] Unit + integration OTP pass; frontend build pass.
- [ ] Traffic UI và OTP Portal được browser smoke test.
- [ ] Có đo bundle trước/sau và ghi residual risk.
- [ ] Cập nhật master plan/report, không commit nếu chưa được yêu cầu.

## 8. Phê duyệt

Master xác nhận task/spec này trước khi bắt đầu sửa source, migration hoặc chạy integration DB.

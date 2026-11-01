# Kế hoạch Remote Browser Profile Vault đa dịch vụ

**Ngày cập nhật:** 2026-11-02 (Asia/Bangkok)  
**Trạng thái:** Đề xuất kỹ thuật - chưa triển khai  
**Phạm vi:** Popup remote browser để người dùng đăng nhập website dịch vụ trên VPS Linux, sau đó lưu và khôi phục profile Chromium từ folder persistent được bảo vệ trên VPS.

## 1. Mục tiêu

Khi người dùng bấm **Đăng nhập dịch vụ**, web app mở popup hiển thị Chromium đang chạy trên VPS. Người dùng tự đăng nhập và hoàn tất MFA/2FA tại website chính thức. Khi bấm **Lưu và đóng**, Chromium flush cookie, IndexedDB, Local Storage và session state vào profile folder riêng. Lần sau hệ thống mở lại Chromium với đúng folder đó để tái sử dụng session nếu provider còn chấp nhận.

Luồng áp dụng cho Adobe và mọi provider. Hệ thống không thu thập password, không giả form đăng nhập và không được sao chép cookie từ browser local của người dùng.

## 2. Quyết định kiến trúc

- **Folder persistent trên VPS là source-of-truth của browser profile.** PostgreSQL không lưu archive/profile Chromium.
- PostgreSQL chỉ lưu metadata, ownership, trạng thái session, lock, expiry và audit log.
- Mỗi profile là một folder `user-data` độc lập, chạy với `--user-data-dir` riêng.
- Một profile chỉ được mở bởi một browser session tại một thời điểm.
- Remote viewer dùng token một lần với TTL ngắn; không public VNC, CDP hoặc Chromium debug port.
- Profile folder không nằm trong source repo, Docker image, thư mục static/Nginx hay volume chia sẻ rộng quyền.
- Production không dùng password mặc định, `--no-sandbox` hoặc `seccomp:unconfined`.

## 3. Layout filesystem

Root folder được cấu hình bằng `BROWSER_PROFILE_ROOT`, ví dụ:

```text
/var/lib/admin-orderlist/browser-profiles/
  <profile-uuid>/
    user-data/                # Chromium --user-data-dir; session thật
    snapshots/                # Bản sao lưu mã hóa, nếu bật backup profile
    state.json                # Chỉ metadata kỹ thuật không nhạy cảm
```

Quy tắc bắt buộc:

- Backend chỉ tạo đường dẫn từ `profileId` UUID đã validate; client không bao giờ gửi filesystem path.
- `BROWSER_PROFILE_ROOT` thuộc user Linux chuyên chạy browser worker; root và thư mục profile có quyền `0700`.
- Chạy browser bằng user không đặc quyền; tách profile theo account/provider, không tái dùng `user-data-dir`.
- Docker chỉ mount named volume hoặc bind mount riêng vào browser worker; không mount profile root vào frontend, reverse proxy hoặc container không cần quyền truy cập.
- Profile không được index, serve, upload hay tải xuống qua HTTP.

## 4. Luồng chính thức

```text
Người dùng bấm "Đăng nhập dịch vụ"
  -> Frontend mở popup trống ngay trong click event
  -> POST /api/browser-profiles/:id/sessions
  -> Backend kiểm tra RBAC + khóa profile + tạo viewer token TTL ngắn
  -> Worker tạo/kiểm tra profile folder theo profileId
  -> Worker khởi động Chromium với --user-data-dir=<profile-root>/<profile-id>/user-data
  -> Popup điều hướng đến remote viewer đã xác thực
  -> Người dùng tự login/MFA trên website dịch vụ
  -> Người dùng bấm "Lưu và đóng"
  -> Worker đóng Chromium sạch để flush dữ liệu xuống folder
  -> Backend cập nhật session/profile status và audit trong transaction
  -> Worker dọn workspace tạm, giải phóng lock
  -> Popup postMessage kết quả về app, rồi tự đóng
```

Nếu verify session tại URL provider đã allowlist thất bại, profile chuyển `needs_relogin`. Hệ thống không tự điền password, né MFA hay bypass CAPTCHA.

## 5. Mô hình dữ liệu PostgreSQL

Mọi migration phải cập nhật `backend/src/db/dbSchema.js`, `tables.js`, `COLS`, runtime query và test fixture theo source-of-truth.

### `warehouse.browser_profiles`

| Cột | Mục đích |
| --- | --- |
| `id` UUID | Định danh profile, đồng thời là key tạo folder |
| `provider_code` VARCHAR(80) | Ví dụ `adobe`, `canva`, `netflix` |
| `service_account_id`, `owner_user_id` | Ràng buộc account/chủ sở hữu |
| `login_url` TEXT | URL qua provider allowlist |
| `storage_key` VARCHAR(128) | Relative key/profile UUID, không phải path do client kiểm soát |
| `status` VARCHAR(32) | `new`, `active`, `opening`, `needs_relogin`, `disabled`, `error` |
| `session_is_authenticated`, `session_checked_at` | Kết quả verify gần nhất |
| `last_used_at`, `last_authenticated_at`, `last_error_code` | Vận hành/audit |
| `created_at`, `updated_at` | Audit cơ bản |

Ràng buộc: unique `(provider_code, service_account_id)`, foreign key hợp lệ, index owner/status/last_used.

### `warehouse.browser_sessions` và `warehouse.browser_profile_audit_logs`

- `browser_sessions`: profile, caller, viewer token hash, expiry, worker identity, lock lease, trạng thái và thời điểm đóng. Token plaintext chỉ trả một lần khi tạo session.
- `browser_profile_audit_logs`: append-only cho `session_created`, `profile_restored`, `save_succeeded`, `save_failed`, `viewer_denied`, `profile_deleted`, `backup_succeeded`, `backup_failed`; không lưu password, cookie, token hoặc nội dung profile.

### Backup và snapshot tùy chọn

Database không chứa profile. Nếu cần rollback/disaster recovery, worker đóng Chromium rồi tạo snapshot ngoài DB:

```text
<profile-root>/<profile-id>/snapshots/<timestamp>.tar.zst.enc
```

Snapshot phải dùng authenticated encryption, checksum, quota và retention. Master key nằm ở KMS/secret manager hoặc secret quản trị riêng, không ở trong database hay source code. Việc restore snapshot chỉ được `owner`/`super_admin` thực hiện và phải ghi audit.

## 6. Thành phần triển khai

Tạo domain `backend/src/domains/browser-profiles/`:

```text
browser-profiles/
  routes.js
  controllers/browserProfileController.js
  services/browserProfileService.js
  services/browserSessionService.js
  services/browserProfileFilesystemService.js
  services/browserProfileBackupService.js
  services/browserWorkerService.js
  services/browserProfileAuditService.js
  validators/browserProfileValidator.js
```

`openAccountBrowser()` chuyển thành adapter gọi domain mới trong giai đoạn chuyển đổi; không duy trì hai launcher song song lâu dài.

Worker/browser viewer:

- Chromium chạy bằng user không đặc quyền, container/process tách theo session.
- Workspace tạm, download tạm và screenshot tạm phải nằm ngoài `user-data` profile; cleanup khi cancel/crash/timeout.
- Dùng Xvfb và noVNC/Guacamole/WebRTC gateway nội bộ.
- Viewer WebSocket đi qua auth proxy/backend kiểm tra user, profile, TTL và quyền; CDP chỉ bind localhost/private network.
- Profile root có disk encryption ở tầng volume/host; backup snapshot mã hóa trước khi rời filesystem production.

## 7. API và frontend

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `POST` | `/api/browser-profiles` | Tạo profile metadata và folder bảo vệ |
| `GET` | `/api/browser-profiles` | Danh sách metadata, không đường dẫn filesystem/token |
| `POST` | `/api/browser-profiles/:id/sessions` | Lock, khởi động browser, trả viewer URL |
| `POST` | `/api/browser-sessions/:id/save` | Đóng browser sạch, cập nhật status/audit |
| `POST` | `/api/browser-sessions/:id/cancel` | Đóng browser không xác nhận save |
| `POST` | `/api/browser-profiles/:id/verify` | Kiểm tra session provider |
| `POST` | `/api/browser-profiles/:id/backups` | Tạo snapshot mã hóa theo policy |
| `POST` | `/api/browser-profiles/:id/revoke` | Disable profile và xóa folder theo policy |

Tạo `frontend/src/features/browser-profiles/`:

- `window.open('', 'service-browser', popupFeatures)` phải chạy ngay trong click để tránh popup blocker; sau API, popup chuyển sang `viewerUrl`.
- Nhận `BROWSER_PROFILE_SAVED`, `BROWSER_SESSION_CANCELLED`, `BROWSER_SESSION_EXPIRED` bằng `postMessage` với exact origin và `sessionId`.
- Nút **Lưu và đóng** là xác nhận rõ ràng; user đóng tab không được xem là save/login thành công.
- Warehouse dùng feature flag/canary và giữ tương thích UI/route cũ đến khi migration ổn định.

## 8. Tính toàn vẹn và bảo mật

1. Dùng `SELECT ... FOR UPDATE NOWAIT` hoặc advisory lock theo `browser_profiles.id`; session thứ hai nhận `409 PROFILE_IN_USE`.
2. Worker kiểm tra folder canonical nằm trong `BROWSER_PROFILE_ROOT`; reject path traversal, symlink thoát root và profile folder sai ownership/permission.
3. `Lưu và đóng` phải đóng Chromium sạch trước khi cập nhật trạng thái. Không copy profile đang có SQLite lock.
4. TTL recovery dừng worker theo process/container identity, dọn workspace tạm, giải phóng lock và ghi audit. Không xóa `user-data` profile khi session timeout.
5. `owner`/`super_admin` cấp-sửa-xóa profile; `admin` chỉ mở profile được cấp. Endpoint xác nhận ownership account/slot.
6. Viewer token random tối thiểu 256-bit, one-time, TTL 10 phút, chỉ lưu SHA-256/HMAC hash. Không dùng `postMessage('*')`.
7. Provider/login URL dùng allowlist; chặn private IP, metadata endpoint và URL tùy ý để tránh SSRF/browser-proxy abuse.
8. Xóa profile phải xác nhận rõ ràng, dừng session đang chạy, xóa folder bằng path đã canonicalize và ghi audit; chỉ xóa trong `BROWSER_PROFILE_ROOT`.
9. Backup, host disk và log phải được kiểm tra như dữ liệu credential/session nhạy cảm.

## 9. Phase thực hiện

### Phase 0 - Chốt runtime

- [ ] Kiểm kê Docker/VPS: Chromium sandbox, Xvfb, worker isolation, volume persistent, disk encryption, reverse proxy và viewer.
- [ ] Chốt provider đầu tiên, allowlist login/verify URL, ownership model, backup retention và key rotation.
- [ ] Hardening cloud browser trước khi expose viewer.

### Phase 1 - Schema và filesystem profile manager

- [ ] Migration cho profile/session/audit; cập nhật schema mapping/types/fixtures.
- [ ] Implement path builder, permission/ownership verifier, profile folder lifecycle, quota disk và cleanup workspace.
- [ ] Unit test path traversal, symlink, bad permission, duplicate profile, lock và recovery.

### Phase 2 - Session worker và viewer

- [ ] Launch/save/cancel/recovery worker dùng `--user-data-dir` persistent.
- [ ] Viewer nội bộ không public VNC/CDP, auth cho WSS/session token.
- [ ] Integration test lock đồng thời, worker crash, profile persistence và session expiry.

### Phase 3 - API, frontend và Warehouse adapter

- [ ] Routes/controllers/validators domain mới, RBAC/ownership/audit cho từng action.
- [ ] Chuyển `openAccountBrowser()` sang adapter không phá route hiện tại.
- [ ] UI popup/profile status, feature flag Warehouse, E2E save/close/reload/restore/cancel.

### Phase 4 - Backup, hardening và rollout

- [ ] Snapshot profile mã hóa, restore drill, retention và kiểm tra disk usage.
- [ ] Security review, load/soak test, canary một provider và nhóm admin nhỏ.
- [ ] Nghiệm thu VPS thật trước rollout rộng.

## 10. Kiểm thử và nghiệm thu

| Nhóm | Điều kiện đạt |
| --- | --- |
| Login/restore | Login/MFA, đóng browser sạch, mở lại đúng folder vẫn có session |
| Expiry | Provider yêu cầu login lại thì chuyển `needs_relogin`, không false-positive |
| Filesystem | Folder `0700`, không nằm trong repo, không bị serve HTTP, path traversal/symlink bị chặn |
| RBAC | User sai quyền không thể mở/xem/revoke profile khác |
| Concurrency | Hai request chỉ một session thành công, request kia `409` |
| Recovery | Crash/timeout không để lại browser zombie/workspace tạm và không xóa profile thật |
| Viewer | URL không dùng lại được, hết hạn hoặc user khác bị chặn |
| Backup | Snapshot mã hóa restore được vào profile thử nghiệm và checksum hợp lệ |
| Regression | Warehouse route/session status hiện tại không bị phá |

Chỉ nghiệm thu production khi migration không pending, test/build/integration/E2E pass, có evidence popup trên VPS Linux, profile root được phân quyền đúng, viewer không lộ VNC/CDP, disk/backup được mã hóa, và đã kiểm thử một profile restore cùng một case session hết hạn.

## 11. Giới hạn chấp nhận

- Session không tồn tại vĩnh viễn: provider có thể hết TTL, đổi password/MFA, chặn IP datacenter hoặc đổi device policy.
- Không dùng luồng này để né MFA/CAPTCHA hay vi phạm điều khoản provider.
- Rollout theo feature flag/canary, không migrate toàn bộ profile Warehouse trong một lần.
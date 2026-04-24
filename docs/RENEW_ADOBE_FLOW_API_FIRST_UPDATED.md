# Renew Adobe Flow (API-first) - Cập nhật mới

Tài liệu này mô tả lại luồng Renew Adobe sau khi đã refactor:
- Tái sử dụng browser profile (persistent profile) theo từng tài khoản admin.
- Check account theo API-first (products/users), không fallback DOM.
- Add user theo 2 bước API: create user rồi assign product.
- Xóa product admin bằng API `PATCH /assignments` (B15), không click UI.
- Tạo/lấy link auto-assign bằng API (`jil-api` + `acrs`) thay vì click UI để copy link.

## 1) Mục tiêu thay đổi

- Giảm số bước login lặp lại (tối ưu tốc độ check/add).
- Giảm độ mong manh do thay đổi DOM/UI của Adobe.
- Trả về kết quả rõ ràng theo từng email khi add.
- Lấy được link auto-assign ổn định qua API.

## 2) Thành phần đã thay đổi

- `backend/src/services/renew-adobe/adobe-renew-v2/shared/profileSession.js`
  - Quản lý persistent browser profile theo email admin.
  - Thư mục profile mặc định: `backend/.adobe-profiles/<email_sanitized>`.

- `backend/src/services/renew-adobe/adobe-renew-v2/runCheckFlow.js`
  - Ưu tiên mở persistent context thay cho context tạm.
  - Nếu profile lỗi thì fallback về context cũ để tránh fail cứng.

- `backend/src/services/renew-adobe/adobe-renew-v2/flows/users/addUsersFlow.js`
  - Đã chuyển sang luồng 2 bước API:
    - Tạo user: `POST https://abpapi.adobe.io/abpapi/organizations/{orgId}@AdobeOrg/users`
    - Gán gói: `PATCH https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/users` với `op=add` vào `/products/{productId}`.
  - Nếu API tạo user báo lỗi nhưng user đã tồn tại trong org, hệ thống tiếp tục bước gán gói.

- `backend/src/services/renew-adobe/adobe-renew-v2/addUsersWithProductV2.js`
  - Dùng persistent profile cho phiên add.
  - Báo lỗi `Add user API fail` (không còn `UI fail`).

- `backend/src/services/renew-adobe/adobe-renew-v2/flows/users/deleteUsersFlow.js`
  - Đã chuyển sang API-first cho delete user:
    - `PATCH https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/users`
  - Payload xóa theo `id` user Adobe với `op=remove`, không còn click confirm trên DOM.

- `backend/src/services/renew-adobe/adobe-renew-v2/autoAssignFlow.js`
  - Đã chuyển sang luồng API-first để lấy/tạo auto-assign URL.

- `backend/src/services/renew-adobe/adobe-renew-v2/shared/usersListApi.js`
  - Thêm helper gọi API danh sách user từ Adobe Admin Console.
  - Chuẩn hóa dữ liệu user trả về cho toàn bộ luồng check/snapshot.

- `backend/src/services/renew-adobe/adobe-renew-v2/checkInfoFlow.js`
  - B13 lấy danh sách user bằng API (không fallback DOM).

- `backend/src/services/renew-adobe/adobe-renew-v2/flows/users/snapshotFlow.js`
  - Snapshot user lấy trực tiếp từ API (không scrape DOM).

- `backend/src/services/renew-adobe/adobe-renew-v2/facade.js`
  - Đồng bộ payload trả về để chứa đầy đủ thông tin user từ API.
  - Luồng check thực hiện B15 bằng API assignments khi admin còn product.

- `backend/src/services/renew-adobe/adobe-renew-v2/removeProductAdminFlow.js`
  - Đã chuyển B15 sang API-first:
    - `PATCH https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/assignments`
  - Payload remove theo `userId/productId` của admin:
    - `[{ "op": "remove", "path": "/{adminUserId}/products/{productId}" }]`
  - Có bước reconcile sau PATCH (đọc lại users API) để tránh fail giả.

## 3) Luồng login/session mới (persistent profile)

1. Chọn profile theo admin email.
2. Mở `launchPersistentContext(profileDir)`.
3. Thử reuse cookie/session trong profile + cookie DB.
4. Nếu session còn hạn:
   - Skip login bước dài.
5. Nếu session hết hạn:
   - Chạy login flow để refresh.
6. Lưu lại cookie mới để dùng cho lần sau.
7. Đồng thời suy ra `contractActiveLicenseCount` từ dữ liệu products và lưu vào `cookie_config` để dùng làm hạn mức fix-all.

Lợi ích:
- Nhiều lần check/add liên tiếp sẽ nhanh hơn rõ rệt.
- Giảm tần suất OTP/login lại.

## 3.1) Luồng Check Adobe hiện tại (B1-B15)

1. B1-B9:
   - Mở session từ persistent profile.
   - Reuse cookies nếu còn hạn; nếu hết hạn thì login + OTP để refresh.
2. B10-B11:
   - Xác định `org_name` từ Admin Console.
3. B12:
   - Lấy danh sách products.
   - Tính `contractActiveLicenseCount`.
   - Suy ra trạng thái gói:
     - `contractActiveLicenseCount = 0` => `Expired`
     - `contractActiveLicenseCount > 0` => `Paid`
4. B13:
   - Lấy users bằng API `GET /jil-api/.../users`.
   - Chuẩn hóa snapshot users (id, email, products, hasPackage...).
5. B14 (khi cần):
   - Lấy/tạo auto-assign URL bằng API.
6. B15:
   - Nếu admin còn product thì gọi API `PATCH /assignments` để remove product admin (giải phóng license), không thao tác DOM.

## 4) Luồng Add User mới (API create + assign)

### 4.1 Đầu vào
- `orgId` (lấy từ URL đang hoạt động hoặc options).
- Danh sách `userEmails`.
- Session đã login hợp lệ (authorization + x-api-key lấy từ request thật trong trang users).

### 4.2 API gọi
- Tạo user:
  - `POST https://abpapi.adobe.io/abpapi/organizations/{orgId}@AdobeOrg/users`
- Gán product:
  - `PATCH https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/users`
  - Payload kiểu:
    - `[{ "op": "add", "path": "/{userId}/products/{productId}" }]`

### 4.3 Cách đánh giá kết quả
- Bước tạo user thành công nhưng bước gán product fail:
  - User đã được tạo nhưng chưa có gói.
  - Flow trả `failed` với `reason` theo lỗi PATCH.
- Bước tạo user báo lỗi nhưng user đã tồn tại:
  - Flow coi là có thể tiếp tục và thử gán product.
- Bước gán product trả lỗi nhưng user đã có product từ trước:
  - Flow coi là thành công để tránh fail giả khi chạy fix-all.

### 4.4 Các error code thường gặp
- `DOMAIN_NAME_INVALID`
- `TRIAL_ALREADY_CONSUMED`
- `...` (phụ thuộc chính sách org)

## 4.5 Luồng lấy danh sách user (API-first)

- URL trang users:
  - `https://adminconsole.adobe.com/{orgId}@AdobeOrg/users`
  - Đây là **trang UI**, không phải API.
- API lấy danh sách user thực tế:
  - `GET https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/users/?...`
- Rule xác định quyền gói:
  - `products.length > 0` => user còn gói.
  - `products.length = 0` => user chưa được cấp quyền.
- Không fallback DOM:
  - Nếu users API lỗi/không parse được, flow trả lỗi rõ ràng để xử lý theo nhánh lỗi API.

## 5) Luồng Auto-Assign mới (API-first)

### 5.1 Nguyên tắc
- Ưu tiên lấy rule có sẵn trước.
- Nếu chưa có mới tạo rule.
- Không phụ thuộc nút copy URL trên UI.

### 5.2 Trình tự API

1. Lấy danh sách rule hiện có:
   - `GET https://acrs.adobe.io/organization/{orgId}@AdobeOrg/product_auth_rules`
   - Nếu tìm thấy rule `ACTIVE` + `ON_DEMAND_OR_URL` có `browserURL`/`browseURL`:
     - Dùng luôn link, kết thúc.

2. Nếu chưa có rule hợp lệ:
   - Lấy product:
     - `GET https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/products/...`
   - Lấy license group:
     - `GET https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/products/{productId}/license-groups/`
   - Tạo rule:
     - `POST https://acrs.adobe.io/organization/{orgId}@AdobeOrg/product_auth_rules?consumeAppAuthRequests=false`
     - Payload:
       - `label`
       - `licenseId`
       - `productProfile`
       - `status = ACTIVE`
       - `triggers = ON_DEMAND_OR_URL`
       - `userScope = ORGANIZATION`
   - Đọc lại rules:
     - `GET https://acrs.adobe.io/organization/{orgId}@AdobeOrg/product_auth_rules`
   - Lấy `browserURL`/`browseURL` của rule vừa tạo.

### 5.3 Lưu ý endpoint
- Endpoint license-group dùng trong hệ thống hiện tại:
  - `jil-api` + org có suffix `@AdobeOrg`.
- Biến thể `il-api` + org trần đã test cho kết quả 404/403.

## 6) Hành vi mong đợi khi add thất bại

- Add API có thể fail theo từng email.
- Hệ thống vẫn có thể trả/lấy `auto-assign URL` để dùng fallback.
- Kịch bản nghiệp vụ khuyến nghị:
  1) Thử add API create + assign,
  2) Nếu fail -> lấy link auto-assign có sẵn (hoặc tạo nếu chưa có),
  3) Trả link cho bộ phận xử lý tiếp theo.

## 7) Kiểm thử nhanh đã xác nhận

- Check flow mở persistent profile thành công.
- Check flow xác định trạng thái gói theo `contractActiveLicenseCount`.
- Add flow đi qua `abpapi` (create user) + `PATCH /users` (add product).
- Delete flow đi qua `PATCH /users` với `op=remove`.
- B15 remove product admin đi qua `PATCH /assignments`.
- Auto-assign flow đã trả được link qua API:
  - Ví dụ: `https://acrs.adobe.com/go/5377d4ca-0b96-4a0e-b569-2e856fe66770`

## 8) Hướng phát triển tiếp

- Đưa `autoAssignUrl` vào response của add flow khi `failed.length > 0`.
- Chuẩn hóa map `errorCode -> thông điệp nghiệp vụ` để hiển thị frontend.
- Thêm metric:
  - tỷ lệ skip login (reuse profile),
  - tỷ lệ add thành công theo email,
  - tỷ lệ fallback auto-assign.

## 9) Chuẩn dữ liệu snapshot user (mới)

Mỗi user trong snapshot hiện lưu các trường chính:
- `id`: Adobe user id (dùng cho delete theo id).
- `authenticatingAccountId`: id tài khoản xác thực AdobeID.
- `name`
- `email`
- `products`: mảng product id Adobe cấp cho user.
- `hasPackage`: boolean theo `products.length > 0`.
- `product`: giữ tương thích ngược với hệ thống cũ (`true/false` như `hasPackage`).

## 10) Hạn mức Fix All theo contract

- Hệ thống dùng `contractActiveLicenseCount` (lấy sau login/check) làm hạn mức user tối đa cho mỗi account.
- Rule xác định account còn gói:
  - `contractActiveLicenseCount = 0` => không còn gói (`Expired`).
  - `contractActiveLicenseCount > 0` => còn gói (`Paid`).
- Khi chạy fix-all:
  - Chỉ add user đến khi đạt ngưỡng này (đã trừ admin qua `user_count` hiện tại).
  - Nếu user cần fix > hạn mức, hệ thống chỉ xử lý tối đa bằng hạn mức và để lại phần dư.

## 11) Dọn rác profile định kỳ lúc 0h

- Mục tiêu:
  - Xóa các thư mục profile local không còn tài khoản tương ứng trong DB (`orphan profiles`).
- Cron:
  - `0 0 * * *` theo `schedulerTimezone`.
- Cách hoạt động:
  1) Đọc toàn bộ email hiện có trong bảng `accounts_admin`.
  2) Chuẩn hóa email theo cùng rule đặt tên thư mục profile.
  3) Quét `backend/.adobe-profiles`.
  4) Xóa thư mục nào không còn nằm trong tập email hiện tại.
- Endpoint chạy tay để test:
  - `GET /scheduler/run-cleanup-adobe-profiles`


# Renew Adobe Flow (API-first) - Cập nhật mới

Tài liệu này mô tả lại luồng Renew Adobe sau khi đã refactor:
- Tái sử dụng browser profile (persistent profile) theo từng tài khoản admin.
- Add user bằng API `users:batch` thay vì thao tác UI trên trang Users.
- Tạo/lấy link auto-assign bằng API (`jil-api` + `acrs`) thay vì click UI để copy link.

## 1) Mục tiêu thay đổi

- Giảm số bước login lặp lại (tối ưu tốc độ check/add).
- Giảm độ mong manh do thay đổi DOM/UI của Adobe.
- Trả về kết quả rõ ràng theo từng email khi add batch.
- Lấy được link auto-assign ổn định qua API.

## 2) Thành phần đã thay đổi

- `backend/src/services/adobe-renew-v2/shared/profileSession.js`
  - Quản lý persistent browser profile theo email admin.
  - Thư mục profile mặc định: `backend/.adobe-profiles/<email_sanitized>`.

- `backend/src/services/adobe-renew-v2/runCheckFlow.js`
  - Ưu tiên mở persistent context thay cho context tạm.
  - Nếu profile lỗi thì fallback về context cũ để tránh fail cứng.

- `backend/src/services/adobe-renew-v2/flows/users/addUsersFlow.js`
  - Đã chuyển sang gọi API:
    - `POST https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/users:batch`
  - Parse response batch (kể cả HTTP 207) thành `done/failed`.

- `backend/src/services/adobe-renew-v2/addUsersWithProductV2.js`
  - Dùng persistent profile cho phiên add.
  - Báo lỗi `Add user API fail` (không còn `UI fail`).

- `backend/src/services/adobe-renew-v2/flows/users/deleteUsersFlow.js`
  - Đã chuyển sang API-first cho delete user:
    - `PATCH https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/users`
  - Payload xóa theo `id` user Adobe với `op=remove`, không còn click confirm trên DOM.

- `backend/src/services/adobe-renew-v2/autoAssignFlow.js`
  - Đã chuyển sang luồng API-first để lấy/tạo auto-assign URL.

- `backend/src/services/adobe-renew-v2/shared/usersListApi.js`
  - Thêm helper gọi API danh sách user từ Adobe Admin Console.
  - Chuẩn hóa dữ liệu user trả về cho toàn bộ luồng check/snapshot.

- `backend/src/services/adobe-renew-v2/checkInfoFlow.js`
  - B13 lấy danh sách user bằng API (không fallback DOM).

- `backend/src/services/adobe-renew-v2/flows/users/snapshotFlow.js`
  - Snapshot user lấy trực tiếp từ API (không scrape DOM).

- `backend/src/services/adobe-renew-v2/facade.js`
  - Đồng bộ payload trả về để chứa đầy đủ thông tin user từ API.

## 3) Luồng login/session mới (persistent profile)

1. Chọn profile theo admin email.
2. Mở `launchPersistentContext(profileDir)`.
3. Thử reuse cookie/session trong profile + cookie DB.
4. Nếu session còn hạn:
   - Skip login bước dài.
5. Nếu session hết hạn:
   - Chạy login flow để refresh.
6. Lưu lại cookie mới để dùng cho lần sau.

Lợi ích:
- Nhiều lần check/add liên tiếp sẽ nhanh hơn rõ rệt.
- Giảm tần suất OTP/login lại.

## 4) Luồng Add User mới (API users:batch)

### 4.1 Đầu vào
- `orgId` (lấy từ URL đang hoạt động hoặc options).
- Danh sách `userEmails`.
- Session đã login hợp lệ (authorization + x-api-key lấy từ request thật trong trang users).

### 4.2 API gọi
- `POST https://bps-il.adobe.io/jil-api/v2/organizations/{orgId}@AdobeOrg/users:batch`

### 4.3 Cách đánh giá kết quả
- Nếu response là mảng item:
  - Mỗi item có `responseCode`, `request.email`, `response.errorCode`.
  - `2xx` => `done`
  - Khác `2xx` => `failed` với `reason = errorCode`.
- Nếu response không đúng schema:
  - Dựa theo HTTP status tổng để fallback.

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

- Add API có thể fail theo từng email (partial fail).
- Hệ thống vẫn có thể trả/lấy `auto-assign URL` để dùng fallback.
- Kịch bản nghiệp vụ khuyến nghị:
  1) Thử add API,
  2) Nếu fail -> lấy link auto-assign có sẵn (hoặc tạo nếu chưa có),
  3) Trả link cho bộ phận xử lý tiếp theo.

## 7) Kiểm thử nhanh đã xác nhận

- Check flow mở persistent profile thành công.
- Add flow đã đi qua `users:batch`.
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


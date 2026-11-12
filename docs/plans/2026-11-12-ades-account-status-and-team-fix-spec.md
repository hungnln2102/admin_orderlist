# Đặc Tả Ades: Kiểm Tra Trạng Thái Tài Khoản Và Fix Team

**Phiên bản:** 1.0  
**Ngày:** 2026-11-12  
**Trạng thái:** Draft - chờ Master phê duyệt  
**Phạm vi:** Luồng kiểm tra tài khoản Ades/Fix-Ades trên form `ades-account`

## 1. Mục Tiêu Và User Story

Khi kiểm tra một tài khoản Ades, form phải phân biệt rõ ba trạng thái nghiệp vụ `active`, `inactive` và `not found`. Với tài khoản `inactive`, người dùng có thể khởi động luồng sửa team và theo dõi đến khi tài khoản trở lại `active`.

Là người vận hành, tôi muốn kiểm tra trạng thái tài khoản Ades và sửa team ngay trên form để biết tài khoản có thể sử dụng hay chưa mà không phải tự gọi nhiều API hoặc đoán trạng thái từ payload.

## 2. Hợp Đồng API Đã Xác Minh

### 2.1 Kiểm tra trạng thái tài khoản

```text
POST https://reseller.ado-besoft.com/api/user-status
Body: { email }
```

| Trạng thái nghiệp vụ | Điều kiện | Hành vi form |
|---|---|---|
| `active` | `organizationStatus.status === "active"` | Hiển thị bình thường; không có nút Fix Team |
| `inactive` | `organizationStatus.status === "inactive"` | Hiển thị cảnh báo và nút Fix Team |
| `not found` | `found === false` hoặc upstream xác nhận không có tài khoản | Hiển thị không có tài khoản trong danh sách đơn hàng; không cho Fix Team |

> Không dùng top-level `status` để kết luận inactive. Payload thực tế có thể có `status: "active"` đồng thời với `organizationStatus.status: "inactive"`.

### 2.2 Khởi động chuyển team

```text
POST https://reseller.ado-besoft.com/api/credits-pool/public/org-switch
Body: { email }
```

Phản hồi mẫu: `{ "status": "waiting", "position": 3, "etaSeconds": 6 }`.

### 2.3 Theo dõi chuyển team

```text
POST https://reseller.ado-besoft.com/api/credits-pool/public/org-switch/status
Body: { email }
```

Phản hồi mẫu: `{ "status": "sending", "position": 0, "etaSeconds": 15, "newOrgName": "ThoughtFocus Information Technologies Pvt Ltd" }`.

## 3. Luồng Trạng Thái

```text
CHECK
  ├─ active     -> NORMAL
  ├─ inactive   -> INACTIVE_WITH_FIX_ACTION
  └─ not found  -> NOT_FOUND

INACTIVE_WITH_FIX_ACTION
  └─ click Fix Team -> SWITCH_REQUESTED

SWITCH_REQUESTED
  ├─ waiting/sending -> SWITCHING (tiếp tục polling)
  ├─ lỗi API -> SWITCH_FAILED (cho phép thử lại, không giả lập active)
  └─ user-status active -> NORMAL
```

## 4. Tiêu Chí Nghiệm Thu (Gherkin)

### Scenario 1: Tài khoản active

```gherkin
Given người dùng nhập email tài khoản Ades hợp lệ
When hệ thống gọi user-status và organizationStatus.status là "active"
Then form hiển thị tài khoản ở trạng thái bình thường
And không hiển thị nút Fix Team
```

### Scenario 2: Tài khoản inactive hiển thị nút Fix Team

```gherkin
Given user-status trả về found là true
And organizationStatus.status là "inactive"
When form hoàn tất kiểm tra tài khoản
Then form hiển thị cảnh báo tài khoản inactive
And hiển thị nút Fix Team
And không coi top-level status là nguồn sự thật thay thế organizationStatus.status
```

### Scenario 3: Khởi động Fix Team

```gherkin
Given tài khoản đang ở trạng thái inactive
When người dùng bấm nút Fix Team
Then hệ thống gọi POST /api/credits-pool/public/org-switch với đúng email
And form chuyển sang trạng thái đang chờ xử lý
And không cho gửi đồng thời nhiều yêu cầu Fix Team cho cùng một email
```

### Scenario 4: Hiển thị waiting hoặc sending

```gherkin
Given yêu cầu org-switch đã được chấp nhận
When API status trả về status là "waiting" hoặc "sending"
Then form hiển thị trạng thái chuyển team đang xử lý
And nếu có position, etaSeconds hoặc newOrgName thì hiển thị thông tin đó
And tiếp tục polling theo khoảng thời gian được cấu hình
```

### Scenario 5: Chuyển team hoàn tất

```gherkin
Given form đang polling trạng thái chuyển team
When lần kiểm tra user-status tiếp theo trả về organizationStatus.status là "active"
Then form kết thúc trạng thái chờ
And hiển thị tài khoản ở trạng thái bình thường
And ẩn nút Fix Team
And dừng polling
```

### Scenario 6: Không tìm thấy tài khoản

```gherkin
Given email không thuộc tài khoản trong danh sách đơn hàng
When user-status trả về found là false hoặc trạng thái not found tương đương
Then form hiển thị thông báo không có tài khoản trong danh sách đơn hàng
And không hiển thị nút Fix Team
And không gọi org-switch
```

### Scenario 7: Lỗi hoặc hết thời gian polling

```gherkin
Given chuyển team chưa đạt trạng thái active
When API org-switch hoặc API status trả về lỗi, timeout hoặc dữ liệu không hợp lệ
Then form hiển thị lỗi có thể hành động
And dừng hoặc giới hạn polling theo chính sách đã cấu hình
And không tự chuyển trạng thái thành active
```

## 5. Phạm Vi Và Redlines

### Trong phạm vi

- Chuẩn hóa phân loại `active`, `inactive`, `not found` ở luồng kiểm tra tài khoản Ades.
- Hiển thị nút Fix Team có điều kiện.
- Gọi org-switch bằng email tài khoản.
- Poll trạng thái chuyển team và user-status đến khi active.
- Khóa thao tác trùng và dừng polling khi hoàn tất hoặc thất bại.
- Bổ sung unit/contract test cho các trạng thái và chuyển tiếp chính.

### Redlines

- Không sửa luồng Ades OTP lấy mã (`provider key: ades`) nếu không cần cho yêu cầu này.
- Không coi top-level `status: "active"` là bằng chứng tài khoản active khi `organizationStatus.status` là `inactive`.
- Không tự suy diễn `active` khi API lỗi, timeout hoặc trả payload thiếu trường.
- Không gọi trực tiếp từ frontend đến upstream nếu kiến trúc hiện tại yêu cầu đi qua backend provider route.
- Không thêm migration hoặc bảng dữ liệu mới cho trạng thái tạm thời nếu chưa có yêu cầu lưu lịch sử.
- Không chạy org-switch cho trạng thái `not found`.

## 6. Reuse Audit Sơ Bộ

- Tái sử dụng provider `fix_ades_status` và hàm `fetchFixAdesStatus` hiện có cho user-status.
- Tái sử dụng dispatcher slot `adobe_check` và public route hiện có nếu phù hợp với form đang dùng.
- Tái sử dụng lớp request provider, parser JSON và cơ chế normalize kết quả hiện có.
- Tái sử dụng component/form state và API client hiện có của frontend; chỉ tách hook/service nếu logic polling làm component phình to.
- Không tạo provider hoặc endpoint song song cho cùng user-status.

## 7. Pre-Flight Check Kỹ Thuật

### Nguyên nhân / điểm cần xử lý

Provider hiện đã gọi được user-status và phân biệt provider `fix_ades_status`, nhưng chưa có đầy đủ hành vi UI và luồng org-switch/polling theo yêu cầu này.

### Phương án triển khai đề xuất

1. Xác định form/component thực tế đang phục vụ `ades-account` và contract API frontend hiện có.
2. Bổ sung mapper trạng thái upstream thành `active`, `inactive`, `not found`.
3. Bổ sung API service cho org-switch và org-switch/status qua backend route phù hợp.
4. Thêm state machine/polling có giới hạn, cleanup khi unmount và chống request trùng.
5. Hiển thị nút Fix Team chỉ trong trạng thái inactive.
6. Khi polling xác nhận user-status active, reset form về trạng thái bình thường.
7. Viết test theo từng Scenario ở trên và chạy kiểm tra hồi quy liên quan.

### File dự kiến cần rà soát

- `backend/src/domains/system/providers/providerConfig.js`
- `backend/src/domains/system/providers/fixAdesStatusProvider.js`
- `backend/src/domains/system/routes/publicOtpRoutes.js`
- `backend/src/domains/system/services/otpProviderService.js`
- `backend/src/domains/system/services/otpPortalDispatcher.js`
- Frontend component/service thực tế của form `ades-account` sau khi xác định bằng code search.
- Test provider, route/contract và frontend tương ứng.

### Rủi ro và đối sách

| Rủi ro | Đối sách |
|---|---|
| Top-level `status` mâu thuẫn với `organizationStatus.status` | Chỉ dùng mapper nghiệp vụ dựa trên `organizationStatus.status` |
| Polling vô hạn hoặc leak timer | Dùng giới hạn thời gian/số lần thử và cleanup khi form đóng/unmount |
| Người dùng bấm Fix Team nhiều lần | Disable nút và dùng request lock theo email |
| org-switch thành công nhưng user-status cập nhật chậm | Tiếp tục polling có giới hạn; hiển thị đang đồng bộ, không giả lập active |
| API trả payload thiếu hoặc khác schema | Fail closed, hiển thị lỗi dữ liệu không hợp lệ |

### Kế hoạch kiểm thử

- Unit test mapper cho `active`, `inactive`, `not found`, payload thiếu và mâu thuẫn status.
- Contract test request method, URL/path, body email và các response `waiting`/`sending`.
- Frontend test nút Fix Team, disable chống trùng, polling, cleanup và chuyển về active.
- Regression test để bảo đảm luồng Ades OTP (`ades`) không bị thay đổi.
- E2E/manual smoke với tài khoản đại diện cho active, inactive và not found nếu có fixture an toàn.

## 8. Điểm Cần Làm Rõ Trước Khi Code

- Khoảng thời gian polling và giới hạn tổng thời gian chờ chính thức là bao nhiêu?
- Khi org-switch trả lỗi hoặc hết thời gian, nút Fix Team có được bật lại ngay không?
- Sau khi chuyển thành công, có cần hiển thị tên team mới (`newOrgName`) trong form hay chỉ cập nhật trạng thái active?

## 9. Trạng Thái Phê Duyệt

- [x] Đã ghi nhận yêu cầu nghiệp vụ và API contract từ payload thực tế.
- [x] Đã viết tiêu chí nghiệm thu Gherkin.
- [x] Đã liệt kê phạm vi, redlines, rủi ro và kế hoạch kiểm thử.
- [ ] Master phê duyệt đặc tả và Pre-Flight Check.
- [ ] Triển khai code.
- [ ] Nghiệm thu đối chiếu 1-1 với các Scenario.

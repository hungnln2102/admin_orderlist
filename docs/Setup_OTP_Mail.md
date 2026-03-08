# Thiết kế hệ thống email nhận OTP

## 1. Mục tiêu

Xây dựng một hệ thống nhận, phân loại và trích xuất OTP từ email một cách ổn định, dễ mở rộng và dễ kiểm soát khi phải xử lý nhiều tài khoản cùng lúc.

Hệ thống cần đáp ứng các yêu cầu sau:

* Nhận email OTP tự động từ một hoặc nhiều dịch vụ.
* Xác định chính xác OTP thuộc về tài khoản nào.
* Hạn chế nhầm lẫn khi nhiều OTP đến gần như đồng thời.
* Có cơ chế timeout, retry và log đầy đủ.
* Dễ tích hợp với các luồng automation khác.

---

## 2. Kiến trúc tổng thể

Hệ thống gồm 5 thành phần chính:

### 2.1. Mailbox

Là hộp thư trung tâm dùng để nhận toàn bộ email OTP.

Khuyến nghị:

* Dùng Google Workspace, Microsoft 365, Zoho hoặc Fastmail.
* Không dùng temp mail.
* Không dùng mail tự host nếu cần độ ổn định cao.

Có 2 mô hình nhận mail:

#### Mô hình A: Mỗi tài khoản một alias

Ví dụ:

* `otp+acc001@domain.com`
* `otp+acc002@domain.com`
* `otp+acc003@domain.com`

Đây là mô hình nên ưu tiên vì giúp map OTP rất rõ ràng.

#### Mô hình B: Một inbox chung

Ví dụ:

* `otp@domain.com`

Trường hợp này cần thêm logic đối chiếu theo thời gian, sender, subject, header và trạng thái phiên.

---

### 2.2. Mail Reader

Thành phần chịu trách nhiệm đọc email từ mailbox.

Có thể dùng:

* IMAP
* Gmail API
* Microsoft Graph API

Nhiệm vụ:

* Poll email mới theo chu kỳ 3-5 giây.
* Chỉ đọc email chưa xử lý.
* Lấy đầy đủ header, subject, body text, body HTML, timestamp.
* Đẩy email thô vào hàng đợi xử lý.

---

### 2.3. OTP Parser

Thành phần trích xuất mã OTP từ nội dung email.

Ví dụ regex thường dùng:

```regex
\b\d{4,8}\b
```

Ngoài OTP, parser nên trích thêm:

* Sender
* Subject
* To / Delivered-To / X-Original-To
* Tài khoản hoặc email bị che trong body
* Tên dịch vụ gửi OTP
* Thời điểm nhận mail

---

### 2.4. Account Matcher

Thành phần quyết định OTP thuộc về tài khoản nào.

Ưu tiên match theo thứ tự:

1. Alias nhận mail
2. Header recipient (`To`, `Delivered-To`, `X-Original-To`)
3. Sender
4. Subject pattern
5. Thời điểm account vừa yêu cầu OTP
6. Nội dung mail có chứa email/username masked
7. Session đang ở trạng thái chờ OTP

---

### 2.5. OTP Store / Queue

Nơi lưu trạng thái các phiên đang chờ OTP.

Mỗi record nên có:

* `request_id`
* `account_id`
* `service_name`
* `recipient_email`
* `expected_sender`
* `expected_subject_pattern`
* `requested_at`
* `status`
* `resolved_otp`
* `resolved_at`

Trạng thái gợi ý:

* `WAITING_FOR_OTP`
* `MATCHED`
* `USED`
* `TIMEOUT`
* `FAILED`

---

## 3. Luồng hoạt động chuẩn

### Bước 1: Tạo yêu cầu OTP

Khi hệ thống cần đăng nhập hoặc xác minh cho một tài khoản:

* Gửi yêu cầu OTP từ service.
* Tạo một record `WAITING_FOR_OTP`.
* Gắn metadata đầy đủ cho phiên chờ.

Ví dụ:

```json
{
  "request_id": "req_20260307_001",
  "account_id": "acc001",
  "service_name": "example_service",
  "recipient_email": "otp+acc001@domain.com",
  "expected_sender": "no-reply@example.com",
  "expected_subject_pattern": "Your verification code",
  "requested_at": "2026-03-07T10:15:02Z",
  "status": "WAITING_FOR_OTP"
}
```

### Bước 2: Mail Reader lấy email mới

Mail Reader đọc email mới và chuyển sang bộ xử lý.

### Bước 3: Parser trích xuất dữ liệu

Parser lấy:

* OTP
* sender
* recipient
* subject
* timestamp
* token hoặc dấu vết nhận diện khác

### Bước 4: Matcher map email vào đúng account

Nếu dùng alias riêng, map gần như trực tiếp.

Nếu dùng inbox chung, chấm điểm từng account đang chờ OTP.

Ví dụ điểm số:

* đúng alias/recipient: +100
* đúng sender: +30
* đúng subject pattern: +20
* trong time window hợp lệ: +40
* body chứa email masked khớp: +80

Nếu có 2 account điểm quá sát nhau, không nên tự động dùng OTP. Cần mark là mơ hồ và yêu cầu gửi lại OTP.

### Bước 5: Trả OTP cho automation

Sau khi match thành công:

* Cập nhật record thành `MATCHED`
* Trả OTP về cho tiến trình đang chờ
* Sau khi dùng xong thì cập nhật `USED`

---

## 4. Thiết kế chống nhầm OTP

### 4.1. Ưu tiên alias riêng cho từng tài khoản

Đây là biện pháp giảm lỗi mạnh nhất.

Ví dụ mapping:

* `otp+acc001@domain.com -> acc001`
* `otp+acc002@domain.com -> acc002`

### 4.2. Không cho nhiều phiên cùng service chạy đồng thời

Ví dụ:

* Không cho 2 tài khoản cùng xin OTP từ một service trong cùng 30-60 giây.
* Dùng lock theo `service_name`.

### 4.3. Giới hạn time window

Chỉ xét email đến trong một khoảng thời gian sau khi request OTP, ví dụ 90 giây.

### 4.4. Chỉ whitelist sender hợp lệ

Ví dụ:

* `no-reply@example.com`
* `security@example.com`

Không match email từ sender ngoài whitelist.

### 4.5. Chỉ dùng OTP mới nhất chưa được consume

Tránh đọc lại mail cũ hoặc dùng nhầm OTP hết hạn.

---

## 5. Cấu trúc dữ liệu đề xuất

### 5.1. Bảng account_alias_map

| account_id | recipient_email                                       | is_active |
| ---------- | ----------------------------------------------------- | --------- |
| acc001     | [otp+acc001@domain.com](mailto:otp+acc001@domain.com) | true      |
| acc002     | [otp+acc002@domain.com](mailto:otp+acc002@domain.com) | true      |

### 5.2. Bảng otp_requests

| request_id       | account_id | service_name    | status          | requested_at        | resolved_otp |
| ---------------- | ---------- | --------------- | --------------- | ------------------- | ------------ |
| req_20260307_001 | acc001     | example_service | WAITING_FOR_OTP | 2026-03-07 10:15:02 | null         |

### 5.3. Bảng inbound_emails

| email_id | sender                                              | recipient_email                                       | subject                | received_at         | parsed_otp | match_status |
| -------- | --------------------------------------------------- | ----------------------------------------------------- | ---------------------- | ------------------- | ---------- | ------------ |
| em_001   | [no-reply@example.com](mailto:no-reply@example.com) | [otp+acc001@domain.com](mailto:otp+acc001@domain.com) | Your verification code | 2026-03-07 10:15:07 | 482913     | MATCHED      |

---

## 6. Quy tắc xử lý lỗi

### 6.1. Không tìm thấy OTP

Nếu quá thời gian chờ, cập nhật:

* `status = TIMEOUT`

Sau đó cho phép retry tối đa 2-3 lần.

### 6.2. Tìm thấy nhiều OTP trong cùng email

Ưu tiên:

1. OTP nằm gần từ khóa như `code`, `OTP`, `verification code`
2. OTP có độ dài khớp rule của service
3. OTP mới nhất trong email

### 6.3. Một email có thể khớp nhiều account

Không tự động dùng. Đánh dấu:

* `match_status = AMBIGUOUS`

Và yêu cầu gửi lại OTP hoặc khóa đồng thời tốt hơn.

### 6.4. OTP hết hạn trước khi dùng

Đánh dấu `FAILED` và yêu cầu tạo phiên OTP mới.

---

## 7. Logging cần có

Hệ thống nên log tối thiểu các sự kiện sau:

* Account nào đã yêu cầu OTP
* Thời điểm yêu cầu OTP
* Email nào vừa nhận
* OTP nào đã parse được
* OTP được map vào account nào
* Lý do match thành công hoặc thất bại
* OTP đã được dùng hay timeout

Ví dụ log:

```text
[10:15:02] acc001 requested OTP for example_service
[10:15:07] email received from no-reply@example.com to otp+acc001@domain.com
[10:15:07] parsed OTP=482913
[10:15:07] matched OTP to acc001 by recipient alias
[10:15:09] OTP consumed by login worker
```

---

## 8. Best practice triển khai

* Dùng mailbox riêng cho OTP, không dùng mail cá nhân.
* Ưu tiên alias riêng cho từng account.
* Chỉ poll email mới, tránh quét toàn inbox nhiều lần.
* Có cơ chế archive hoặc đánh dấu email đã xử lý.
* Mọi phiên OTP phải có timeout rõ ràng.
* Mọi OTP sau khi dùng xong phải được invalidate trong hệ thống nội bộ.
* Dùng lock theo service để giảm đụng độ khi nhiều tài khoản chạy cùng lúc.
* Lưu raw email để debug khi cần.

---

## 9. Khuyến nghị cấu hình mặc định

### Mail

* Provider: Google Workspace hoặc Microsoft 365
* Mailbox: `otp@domain.com`
* Alias: `otp+<account_id>@domain.com`

### Polling

* Chu kỳ đọc mail: 3-5 giây
* Timeout chờ OTP: 90 giây
* Retry: 2 lần

### Parser

* Regex OTP: `\b\d{4,8}\b`
* Sender whitelist: bật
* Subject pattern: cấu hình theo từng service

### Matching

* Ưu tiên alias > header recipient > timestamp > body hint
* Không auto-match khi kết quả mơ hồ

---

## 10. Kết luận

Thiết kế tốt nhất cho hệ thống email nhận OTP là:

* Mỗi tài khoản dùng một alias email riêng
* Có hàng đợi các phiên đang chờ OTP
* Có parser và matcher tách biệt
* Có timeout, retry, logging và cơ chế chống nhầm

Nếu bắt buộc dùng chung một inbox, hệ thống vẫn có thể chạy ổn định nếu đối chiếu đồng thời theo recipient header, sender, subject, time window và trạng thái session.

---

## 11. Mẫu pseudocode

```text
function requestOtp(account_id, service_name, recipient_email):
    create otp_request(status=WAITING_FOR_OTP)
    trigger service to send OTP

function handleIncomingEmail(email):
    parsed = parseEmail(email)
    candidates = findWaitingRequests(service=parsed.service_name, within=90s)

    best_match = scoreCandidates(parsed, candidates)

    if best_match is ambiguous:
        mark email as AMBIGUOUS
        return

    update otp_request as MATCHED
    store parsed.otp
    notify waiting worker

function consumeOtp(request_id):
    otp = getMatchedOtp(request_id)
    if otp is expired:
        mark FAILED
        return null

    mark USED
    return otp
```

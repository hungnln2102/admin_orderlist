Bây giờ,
Mỗi khi chạy job check tài khoản thành công sẽ ra được thông tin tài khoản nào đang còn gói và tài khoản nào hết hạn (Đây là tài khoản adminconsole).

1.
Nếu tài khoản hết hạn => Chạy job xóa toàn bộ user trong tài khoản đó cho tôi.
2. Nếu email đơn hàng đó chưa hết hạn và không có dữ liệu cột Profile => chạy job add user vào tài khoản đang còn gói và còn slot (1 tài khoản có tổng 10 slot là đã trừ slot của tài khoản chính ra rồi) và hiển thị thông tin của Profile ra bảng.

Khi lưu Json cũng phải loại bỏ cái tài khoản chính ra khỏi dữ liệu json luôn.

---

### Câu hỏi cần làm rõ:

**Về điểm 1 — "Tài khoản hết hạn":**
- "Tài khoản hết hạn" ở đây là dựa vào `license_status = 'expired'` của tài khoản adminconsole, đúng không? Hay dựa vào tiêu chí nào khác?
- Job xóa toàn bộ user: chạy tự động ngay sau khi check xong, hay chỉ chạy trong cron 00:01?

**Về điểm 2 — Add user tự động:**
- "Không có dữ liệu cột Profile" → nghĩa là email đó chưa nằm trong `users_snapshot` của bất kỳ tài khoản adminconsole nào, đúng không?
- Khi có nhiều tài khoản còn gói & còn slot, ưu tiên add vào tài khoản nào? (VD: tài khoản có nhiều slot trống nhất? hay tài khoản đầu tiên tìm thấy?)
- Số slot tối đa (10) là cố định cho tất cả tài khoản, hay mỗi tài khoản có thể khác nhau? Nếu khác nhau thì lấy thông tin này từ đâu?
- Khi add user qua Adobe API, chỉ cần truyền email là đủ hay cần thêm thông tin gì khác (tên, role...)?

**Về điểm 8 — Loại bỏ tài khoản chính khỏi JSON:**
- "Tài khoản chính" = chính email dùng để đăng nhập adminconsole (cột `email` trong bảng `accounts_admin`), đúng không?
-------------------------------------------------
Về điểm 1:
- đúng. Là của adminconsole đó ở phần check product còn hay không còn là kiểm tra ở trang ../product chứ không phải là tài khoản đó có đang được gán gói hay không
- Job xóa toàn bộ user: Chạy tự động sau khi check xong

Về điểm 2:
- Đúng
- Ưu tiên add vào tài khoản còn ít slot nhất. Ví dụ có tài khoản trống 2 slot thì add vào đó 2 user. Các user còn lại add vào tài khoản khác. Nói chung 1 tài khoản chỉ add tối đa 10 user (không tính đến user admin)
- Khi add user cần gắn product cho user đó. Sau đó quay lại trang Users để lấy lại dữ liệu cuối cùng sau khi add user.

Về điểm 8:
- Đúng
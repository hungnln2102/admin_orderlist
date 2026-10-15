# 04. Hạ Tầng, Bảo Mật, Git và Tài Liệu

<CRITICAL_CONSTRAINTS>
1. TUYỆT ĐỐI KHÔNG tự ý chạy file migration/câu lệnh ghi Database hoặc xóa Cache diện rộng khi CHƯA CÓ LỆNH.
2. KHÔNG TỰ Ý commit, push, merge, rebase git hay sửa lịch sử khi chưa được phép. Không xóa thay đổi chưa commit của User.
3. BẮT BUỘC cập nhật tài liệu `v2/README.md` và `v2/ARCHITECTURE.md` đối với hệ thống V2, đồng thời đồng bộ ra `README.md` ở thư mục gốc.
4. BẮT BUỘC lưu Kế Hoạch Thay Đổi (file .md) tại `docs/plans/` cho mọi thay đổi lớn.
</CRITICAL_CONSTRAINTS>

## 🗄️ 1. Database & Cache
- **Migration**: Luôn chuẩn bị phương án Rollback. Đánh giá kỹ thời gian downtime, khóa lock, tính tương thích ngược trước khi sửa schema.
- **Cache**: Đánh giá chiến lược Invalidation (vô hiệu hóa key) chính xác. Không xóa toàn bộ cache để giải quyết vấn đề tạm bợ.
- **Dịch vụ bên ngoài**: Khi ghi dữ liệu sang API bên ngoài, phải chú ý retry, timeout, rate limit và idempotency.

## 🔐 2. Bảo Mật và Logging
- **Tuyệt đối KHÔNG**: Hardcode credential, API key, token hoặc in chúng ra log.
- **Xác thực / Phân quyền**: Backend là chốt chặn thực thi cuối cùng. Không giảm bớt điều kiện permission/authorization chỉ để cho luồng "chạy được".
- Ưu tiên Structured logging, không dùng log rác để che đi lỗi, không để debug log ồn ào lên production nếu không được duyệt.

## 📄 3. Quản Lý Tài Liệu và V2 Docs
- **Ngôn ngữ trong README**: Với các bản V2, tài liệu phải viết bằng **từ ngữ nghiệp vụ dân dã, dễ hiểu nhất cho chủ shop/người dùng** (VD: "Nút bấm", "Công thức tính tiền", "Nạp ví"). KHÔNG DÙNG thuật ngữ kỹ thuật (như "POST request", "JSON payload", "Schema").
- **Kế hoạch dự án**: File kế hoạch (`.md`) lưu tại `docs/plans/` **PHẢI** ghi rõ Ngày tháng (YYYY-MM-DD) và Tác giả ở đầu file.
- **Codebase Memory**: Nếu thay đổi làm ảnh hưởng Knowledge Graph, AI phải thông báo và đề xuất cập nhật (nhưng vẫn cần xin phép).

## 🌳 4. Quản Lý Git (Source Control)
- Commit phải tập trung (nhỏ, dễ hiểu), message phản ánh đúng nội dung.
- Không trộn (mix) việc sửa bug, refactor và format code trong cùng một commit nếu không liên quan.
- Trước khi bàn giao, kiểm tra kỹ `git diff` để đảm bảo không dính file rác hoặc đổi định dạng ngoài ý muốn.

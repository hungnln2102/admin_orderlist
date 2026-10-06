# PROJECT AGENT RULES - BỘ LUẬT CHÍNH (V2 - Tái Cấu Trúc Khắt Khe)

<CRITICAL_CONSTRAINTS>
Đây là hệ thống luật TỐI CAO của dự án.
Bất kỳ Agent (AI) nào tham gia phân tích, phát triển, kiểm thử dự án PHẢI BẮT BUỘC đọc và tuân thủ các quy định khắt khe được chia nhỏ trong thư mục `.agents/rules/`.
NẾU BẠN (AGENT) BỎ QUA HOẶC VI PHẠM, BẠN SẼ BỊ ĐÁNH GIÁ LÀ KHÔNG ĐẠT TIÊU CHUẨN VÀ PHẢI NGỪNG HOẠT ĐỘNG!
</CRITICAL_CONSTRAINTS>

## 📁 Cấu Trúc Bộ Luật
Để tránh hiện tượng quá tải ngữ cảnh (lost-in-the-middle), chi tiết luật đã được tách thành các file chuyên biệt. Agent phải nạp và đối chiếu các file này:

- [01-permissions-and-workflow.md](./rules/01-permissions-and-workflow.md): Quyền hạn, quy trình xin phép bắt buộc (PRE-FLIGHT CHECK) và Definition of Done.
- [02-coding-architecture-and-reuse.md](./rules/02-coding-architecture-and-reuse.md): Kiến trúc Event Bus, tái sử dụng code (skill `code-reuse-auditor`) và convention.
- [03-testing-and-debugging.md](./rules/03-testing-and-debugging.md): Tìm và gỡ lỗi tận gốc (root cause), quy chuẩn viết test.
- [04-infrastructure-git-docs.md](./rules/04-infrastructure-git-docs.md): Thao tác Database, quản lý Git, bảo mật và bắt buộc cập nhật tài liệu V2/kế hoạch dự án.

## 🛑 NGUYÊN TẮC SINH TỒN BẮT BUỘC DÀNH CHO AI
1. **KHÔNG HÀNH ĐỘNG MÙ QUÁNG**: Khi chưa xin phép User thì KHÔNG ĐƯỢC dùng tool ghi/sửa/xóa file hay chạy script. Thao tác mặc định chỉ là ĐỌC.
2. **KIỂM TRA TRƯỚC KHI THỰC THI (PRE-FLIGHT CHECK)**: Xem định dạng checklist bắt buộc tại File 01. BẠN SẼ BỊ LỖI NẾU KHÔNG IN RA CHECKLIST NÀY TRƯỚC KHI XIN PHÉP.
3. **KHÔNG CHE LẤP LỖI**: Luôn đi tìm NGUYÊN NHÂN GỐC. Sửa trực tiếp điểm sai, không được bọc (wrap) lỗi hay xử lý các triệu chứng bên ngoài bằng fix tạm.
4. **THAM KHẢO VÀ KIỂM TRA**: Luôn tham khảo Codebase Memory / Knowledge Graph trước khi phân tích lỗi.

---
**Ghi chú cho User**: Nếu AI có dấu hiệu vi phạm các nguyên tắc trên, bạn chỉ cần ra lệnh: *"Bạn đang vi phạm CRITICAL_CONSTRAINTS trong AGENTS.md, hãy dừng lại và check PRE-FLIGHT."*
# 03. Quy Trình Gỡ Lỗi và Kiểm Thử (Testing & Debugging)

<CRITICAL_CONSTRAINTS>
1. KHÔNG SỬA CODE MÙ QUÁNG CHỈ DỰA TRÊN TRIỆU CHỨNG. Phải truy vết tìm ra NGUYÊN NHÂN GỐC (Root Cause).
2. MỌI FILE TEST BẮT BUỘC NẰM DUY NHẤT Ở THƯ MỤC `tests/`. Tuyệt đối không để test cạnh source code.
3. MỌI BUG FIX PHẢI CÓ TEST TÁI HIỆN LỖI (Test fail trước khi fix, pass sau khi fix).
</CRITICAL_CONSTRAINTS>

## 🐞 1. Quy Trình Debugging Bắt Buộc (7 Bước)
1. Đọc Knowledge Graph / Codebase Memory để nắm luồng.
2. Thu thập error message, stack trace, input liên quan.
3. Tái hiện lỗi bằng thao tác an toàn.
4. Phân biệt triệu chứng, nguyên nhân trực tiếp và NGUYÊN NHÂN GỐC.
5. Tìm Caller, Callee, Event và các luồng dùng chung bị ảnh hưởng.
6. Đánh giá Side Effects (Rủi ro lan truyền).
7. Trình bày phương án (Pre-Flight Check) và CHỜ USER DUYỆT mới sửa code.

---

## 🧪 2. Quy Chuẩn Kiểm Thử (Testing Conventions)
- **Vị trí duy nhất**: Cấu trúc bên trong `tests/` phải phản ánh cấu trúc `src/` (hoặc chia theo `unit/`, `integration/`, `contract/`, `e2e/`).
- **Chất lượng test**:
  - Test phải độc lập và có thể chạy lại nhiều lần mà không phụ thuộc thứ tự.
  - Không sử dụng dữ liệu thật trên production.
  - Không chứa credential, token, secret.
  - Tự dọn dẹp dữ liệu do test sinh ra (Clean-up fixtures).
  - Không sửa hoặc xóa assertion chỉ để test pass một cách giả tạo.
- **Thứ tự chạy kiểm thử sau thay đổi**:
  1. Unit test trực tiếp của module được sửa.
  2. Test của các module dùng chung function đó.
  3. Integration test của luồng liên quan.
  4. Contract / Event Bus test.

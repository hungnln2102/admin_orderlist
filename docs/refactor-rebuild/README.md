# Refactor Rebuild Docs

Thư mục này gom các tài liệu phục vụ giai đoạn **lập phương án rebuild/refactor**, chưa phải triển khai code.

## File Chính

- `REFACTOR_FROM_AGENT_GRAPH.md`: phương án tổng thể dựa trên agent graph và định hướng rebuild có kiểm soát.
- `CODE_INVENTORY.md`: template phân loại code hiện tại theo `keep`, `migrate`, `merge`, `deprecated`, `delete`, `unknown`.
- `SHARED_CONTRACTS.md`: quy định shared frontend/backend được phép tạo và cách tránh duplicate.
- `MIGRATION_MAP.md`: bản đồ chuyển từ legacy code sang kiến trúc mới, kèm checklist cutover.

## Cách Dùng

1. Đọc `REFACTOR_FROM_AGENT_GRAPH.md` để nắm chiến lược tổng thể.
2. Làm docs từng page trước theo danh sách trong `MIGRATION_MAP.md`.
3. Trong lúc viết docs page, cập nhật `CODE_INVENTORY.md` để phân loại code cũ.
4. Khi phát hiện helper/component/API dùng chung thật, ghi vào `SHARED_CONTRACTS.md`.
5. Chỉ bắt đầu triển khai refactor sau khi docs page/domain liên quan đủ rõ.

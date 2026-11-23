# AGENTS.md — Quy Ước Riêng Dự Án `admin_orderlist`

> **Hiến pháp chung (SSOT)**: Tuân thủ 100% Hiến pháp, quy trình Spec-Kit + Pre-Flight Check, đội ngũ 7 Subagents và chuẩn giao tiếp từ Global Plugin `core-agents` ([E:/Project/core-agents/rules/AGENTS.md](file:///E:/Project/core-agents/rules/AGENTS.md)).

## 📌 Quy Tắc Đặc Thù Của Riêng `admin_orderlist`

1. **PostgreSQL Schema SSOT**: Mọi bảng/cột runtime trong `backend/` bắt buộc đi qua [backend/src/db/tables.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/db/tables.js) (`TABLES` + `COLS`). Thao tác ghi nhiều bảng bắt buộc bọc trong Knex Transaction (ACID) và phát sự kiện qua Event Bus Outbox (`backend/src/events/`).
2. **Frontend Design System SSOT**: Toàn bộ thành phần UI chuẩn hóa đặt tại [frontend/src/shared/components/](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components) (export qua `@/shared/components`) và danh mục tra cứu tại [docs/design-system/COMPONENT_LIBRARY.md](file:///e:/Project/admin_store/admin_orderlist/docs/design-system/COMPONENT_LIBRARY.md). Nghiêm cấm tự viết lại Modal/Select/Switch/DateInput inline.
3. **Báo cáo nghiệm thu hàng ngày**: Ghi nối tiếp (append) vào **1 file duy nhất mỗi ngày** theo múi giờ `Asia/Bangkok`: `report/YYYY-MM-DD-daily-review.md`.
4. **Kiểm soát lỗi text cuối phiên**: Sau khi sửa file, chạy `python scripts/scan_text_errors.py <danh_sách_file_vừa_sửa>` (chỉ quét file vừa sửa, không quét toàn bộ repo).

<!-- codebase-memory-mcp:start -->
# Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
ALWAYS prefer MCP graph tools over grep/glob/file-search for code discovery.

## Priority Order
1. `search_graph` - find functions, classes, routes, variables by pattern
2. `trace_path` - trace who calls a function or what it calls
3. `get_code_snippet` - read specific function/class source code
4. `query_graph` - run Cypher queries for complex patterns
5. `get_architecture` - high-level project summary
<!-- codebase-memory-mcp:end -->

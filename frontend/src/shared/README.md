# 🏛️ SHARED ASSETS & DESIGN SYSTEM LIBRARY

Thư mục này chứa toàn bộ các **Thành phần Dùng Chung (Single Source of Truth - SSOT)** của giao diện `admin_orderlist` theo **Nguyên Tắc 8 trong Hiến Pháp `AGENTS.md`**.

👉 **Xem tài liệu tra cứu đầy đủ tại:** [COMPONENT_LIBRARY.md](../../docs/design-system/COMPONENT_LIBRARY.md)

## Cấu trúc thư mục:
- `components/`: Toàn bộ các Component giao diện chuẩn (Button, Input, Switch, Card, Modal, Pagination). Export tập trung tại `components/index.ts`.
- `context/`: Toàn bộ Context chia sẻ trạng thái (Auth, Notification, Realtime SSE).
- `hooks/`: Các custom hooks dùng chung (`useClipboard`, `useUrlPagination`).
- `utils/`: Các hàm tiện ích chuẩn (`format.ts`, `paginationUtils.ts`, `lunarCalendar.ts`).
- `api/`: Client API axios/fetch dùng chung (`apiClient.ts`, `apiEndpoints.ts`).

## Nguyên tắc cốt lõi:
- **CẤM TỰ CODE LẠI GIAO DIỆN**: Luôn tra cứu xem thành phần đã có ở đây chưa trước khi code.
- **IMPORT TẬP TRUNG**: `import { ToggleSwitch, CopyButton, DateInputVN } from "@/shared/components";`

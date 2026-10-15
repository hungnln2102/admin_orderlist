# 02. Nguyên Tắc Sửa Code, Kiến Trúc và Tái Sử Dụng

<CRITICAL_CONSTRAINTS>
1. BẮT BUỘC phải sử dụng skill `code-reuse-auditor` TRƯỚC KHI tạo mới bất kỳ hàm (function), tiện ích (utility), hook, service, component hay module dùng chung nào.
2. KHÔNG tạo file mới nếu có thể sửa ở file chịu trách nhiệm hiện tại một cách hợp lý. KHÔNG tạo function rác, versioned function (`functionV2`, `temp`, `service_old`).
3. BẮT BUỘC đánh giá khả năng tương thích với kiến trúc Event Bus cho mọi tính năng mới.
</CRITICAL_CONSTRAINTS>

## 🛠️ 1. Quy Trình Kiểm Tra Tái Sử Dụng Code (Mandatory Code Reuse Audit)
Trước khi tạo hoặc mở rộng logic, AI phải dùng skill `code-reuse-auditor` và phân loại kết quả thành ĐÚNG 1 TRONG 4 QUYẾT ĐỊNH:
- **REUSE**: Dùng lại trực tiếp implementation hiện có.
- **EXTEND**: Mở rộng implementation chính mà không phá vỡ contract và caller hiện tại.
- **EXTRACT**: Trích xuất phần thực sự dùng chung từ ít nhất hai consumer thực tế.
- **CREATE**: Tạo mới vì không có implementation phù hợp hoặc tái sử dụng sẽ gây sai trách nhiệm/coupling. (Phải giải thích lý do vì sao không chọn 3 phương án trên và CHỜ DUYỆT).

---

## 🏗️ 2. Nguyên Tắc Sửa Đổi Source Code
- **Sửa nguyên nhân gốc (Root Cause)**: Luôn sửa trực tiếp file/function gây ra lỗi. Không bọc wrapper, không tạo luồng song song để che lỗi.
- **Giữ codebase gọn gàng**: Không để lại code chết, import thừa, file tạm hoặc code bị comment-out.
- **Khi nào được tách function mới**:
  - Function có nhiều trách nhiệm độc lập.
  - Logic thực sự được dùng ở từ 2 vị trí trở lên.
  - Giúp kiểm thử đơn vị (unit test) độc lập.
  - Loại bỏ code trùng lặp thực tế (không dự đoán tương lai).

---

## ⚡ 3. Kiến Trúc Event Bus (Event Bus Architecture)
- **Ưu tiên Event Bus khi**: Một sự kiện kích hoạt nhiều consumer độc lập, tác vụ xử lý bất đồng bộ (async), cần audit, notification, analytics hoặc đồng bộ hệ thống.
- **KHÔNG dùng Event Bus cho**: Hàm thuần túy tính toán, validation đồng bộ cần phản hồi ngay, truy vấn DB đơn giản.
- **Chuẩn đặt tên Event**: Đặt theo sự việc ĐÃ XẢY RA (Ví dụ: `OrderCreated`, `PaymentCompleted`). Event không chứa logic nghiệp vụ và payload chỉ truyền dữ liệu thực sự cần thiết.

---

## 📝 4. Ngôn Ngữ, Mã Hóa và Đặt Tên
- **Ngôn ngữ**: Mọi nội dung hiển thị tiếng Việt (giao diện, thông báo, comment nghiệp vụ, tài liệu) **PHẢI VIẾT ĐẦY ĐỦ DẤU**.
- **Mã hóa**: Lưu tất cả file text bằng mã hóa `UTF-8`.
- **Quy tắc đặt tên**: Tuân theo convention sẵn có trong dự án. Tên phải thể hiện đúng trách nhiệm (tránh tên mơ hồ như `handleData`, `processItem`, `temp`).

---

## 🎨 5. Quy Chuẩn Giao Diện UI/UX & Thành Phần Dùng Chung (Shared UI Components)
- **TUYỆT ĐỐI CẤM** sử dụng các hộp thoại mặc định của trình duyệt (`window.alert()`, `window.confirm()`, `window.prompt()`).
- **Modal Popup dùng chung**: Mọi thao tác xác nhận xóa, tạo mới, chỉnh sửa, xem chi tiết PHẢI dùng Modal Component chuẩn Glassmorphic Dark Mode của dự án (`*DeleteModal`, `*CreateEditModal`, `*DetailModal`).
- **Thông báo trạng thái (Toasts/Notifications)**: Luôn dùng `NotificationContext` (`notify.success`, `notify.error`, `notify.warning`, `notify.info`), không dùng alert.
- **Form & Nút bấm**: Phải tuân theo thiết kế nền tối `#0a1225` / `#0b0f19`, viền `slate-800`, nút chính có gradient/glow (cyan, blue, rose), hiệu ứng hover và trạng thái loading `submitting`.


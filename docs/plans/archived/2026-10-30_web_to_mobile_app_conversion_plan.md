# Kế hoạch Quy hoạch & Chuyển đổi: Web sang Mobile App (iOS & Android)
## Hệ Thống Quản Trị Bỏ Túi Cho Master (admin_orderlist Mobile)

> **Ngày lập:** 30/10/2026  
> **Người lập:** 📝 Lead Planner & Chronicler (Thư Ký Quy Hoạch)  
> **Chỉ đạo tối cao:** 👑 Master (Sếp)  
> **Tài liệu liên quan:** 
> - [task-mobile.md](file:///d:/Desktop/admin/admin_orderlist/task-mobile.md)
> - [docs/plans/2026-10-29_batch_payment_log_and_auto_reconciliation_plan.md](file:///d:/Desktop/admin/admin_orderlist/docs/plans/2026-10-29_batch_payment_log_and_auto_reconciliation_plan.md)

---

## 1. Bối cảnh & Mục tiêu

Hệ thống quản trị `admin_orderlist` hiện chạy trên nền tảng Web Desktop. Khi Master ra ngoài (gặp khách, đi cafe, công tác), việc truy cập bằng trình duyệt di động gặp nhiều bất tiện do giao diện web được tối ưu cho màn hình rộng và chuột/bàn phím.

### Mục tiêu cốt lõi:
1. Xây dựng ứng dụng di động **Mobile App (chạy mượt trên cả iPhone/iOS của Master và Android)** dựa trên nền tảng React Native / Expo có sẵn tại [mobile/expo-admin-app](file:///d:/Desktop/admin/admin_orderlist/mobile/expo-admin-app).
2. Tối ưu trải nghiệm sử dụng nhanh ngoài đường: Tra cứu đơn trong 1 giây, duyệt thanh toán 1 chạm, kiểm tra slot trống và copy thông tin gửi khách tức thì.
3. **Loại trừ dứt khoát**: Tính năng *đăng nhập nhanh tài khoản kho* giữ nguyên ở desktop, **không** đưa lên mobile app theo đúng chỉ đạo của Master.

---

## 2. Ma trận Phân loại & Phạm vi Chuyển đổi (Scope Definition)

### 2.1. 🔴 NHÓM 1: CỰC KỲ CẤP THIẾT (MUST-HAVE — ƯU TIÊN SỐ 1 TRÊN APP)

| Module | Tính năng chi tiết | Trải nghiệm người dùng ngoài đường |
| :--- | :--- | :--- |
| **Đơn hàng (`/orders`)** | **Tra cứu & Xử lý đơn siêu tốc** | - Tìm kiếm nhanh theo Tên, SĐT, Mã đơn, Email.<br/>- Lọc trạng thái (Đang chờ, Hoàn tất, Hết hạn).<br/>- Nút **"Copy thông tin bàn giao"**: Format sẵn nội dung tài khoản/mã mời để Master paste ngay vào Zalo/Telegram gửi khách.<br/>- Gia hạn hoặc đổi slot nhanh 1 chạm. |
| **Thanh toán (`/invoices`)** | **Duyệt biên lai & Tiền về** | - Xem danh sách biên lai thanh toán mới.<br/>- Kiểm tra số tiền khách chuyển so với đơn hàng.<br/>- 1 chạm xác nhận "Đã nhận tiền" -> Đơn tự động chuyển trạng thái hoàn tất. |
| **Tài chính (`/finance`)** | **Ví tiền & Dòng tiền bỏ túi** | - Thẻ tổng quan số dư các tài khoản (Ngân hàng, Ví shop, USDT, Tiền mặt).<br/>- Lịch sử biến động số dư tức thời (kết nối webhook ngân hàng / email inbound).<br/>- Cảnh báo công nợ NCC hoặc hạn trả góp đến hạn trong ngày. |
| **Kho hàng (`/warehouse`)** | **Tra cứu Slot trống & Copy Account** | - Xem nhanh số slot trống khả dụng theo từng danh mục (Netflix, Adobe, Youtube, Canva...).<br/>- Copy User/Pass tài khoản kho để gửi khách.<br/>*(Lưu ý: Không có nút mở browser/profile đăng nhập)*. |
| **Cảnh báo (Notifications)** | **Thông báo đẩy (Push Notifications)** | - Bắn thông báo ngay khi có đơn mới phát sinh.<br/>- Báo biến động tiền về tài khoản.<br/>- Cảnh báo trước 24h-48h khi gói của khách sắp hết hạn. |

---

### 2.2. 🟡 NHÓM 2: NÊN ĐƯA LÊN APP DẠNG TINH GỌN (SHOULD-HAVE)

1. **Dashboard KPI Tóm tắt**:
   - Thẻ chỉ số lớn: Doanh thu hôm nay vs hôm qua, Số đơn hoàn thành, Lợi nhuận gộp ước tính.
2. **Bảng giá Niêm yết (`/pricing`)**:
   - Tra cứu nhanh bảng giá dịch vụ để báo giá cho khách ngoài đường.
3. **Danh bạ Nhà cung cấp (`/sources`)**:
   - Lưu thông tin liên hệ Telegram/Zalo của NCC để gọi/nhắn tin trực tiếp từ app.
   - Xem số tiền đang nợ NCC.

---

### 2.3. ⚪ NHÓM 3: GIỮ NGUYÊN TRÊN MÁY TÍNH (DESKTOP-ONLY — CẤM ĐƯA LÊN APP)

1. ❌ **Đăng nhập nhanh tài khoản kho (Quick Login / Profile Launcher)**:
   - *Theo chỉ đạo của Master*: Thao tác này phụ thuộc profile trình duyệt desktop, Playwright và Chrome extension. Không khả thi và không phù hợp trên mobile.
2. ❌ **Nhập hàng loạt bằng file Excel/CSV (`/external-imports`)**:
   - Xử lý bảng tính phức tạp hàng trăm dòng tài khoản kho cần màn hình lớn và chuột trên PC.
3. ❌ **Cấu hình Hệ thống & API bên thứ 3 (`/system-config`, `/external-api-config`)**:
   - Cài đặt Secret Keys, API endpoints, Cronjobs... chỉ làm 1 lần trên PC.
4. ❌ **Nhật ký hệ thống & Logs debug (`/system-logs`)**:
   - Hàng nghìn dòng log kỹ thuật chỉ phục vụ khi lập trình viên fix lỗi.

---

## 3. Kiến trúc Điều hướng 4 Tab Tinh gọn (Mobile Navigation)

```
┌────────────────────────────────────────────────────────┐
│                   admin_orderlist App                  │
├────────────────────────────────────────────────────────┤
│ [Tab 1] 📊 Trang chủ: KPI ngày + Cảnh báo hết hạn      │
│ [Tab 2] 📦 Đơn hàng: Tìm kiếm + Xử lý + Copy gửi khách │
│ [Tab 3] 💰 Tài chính: Số dư các ví + Duyệt biên lai    │
│ [Tab 4] 🗄️ Kho hàng: Tra cứu slot trống + Copy info    │
└────────────────────────────────────────────────────────┘
```

---

## 4. Kế hoạch Triển khai (Milestones)

- [ ] **Phase 1: Chuẩn bị Môi trường & Xác thực (Auth & Core)**:
  - Cấu hình xác thực Admin (JWT + FaceID / Biometric).
  - Kết nối API Client với backend Node.js hiện có.
- [ ] **Phase 2: Màn hình Đơn hàng & Kho hàng (Orders & Warehouse)**:
  - Màn hình tìm kiếm, lọc đơn, xem chi tiết và nút Copy thông tin bàn giao.
  - Màn hình tra cứu slot kho còn trống theo dịch vụ.
- [ ] **Phase 3: Tài chính & Duyệt thanh toán (Finance & Invoices)**:
  - Màn hình số dư các ví và duyệt nhanh biên lai tiền về.
- [ ] **Phase 4: Push Notification & Đóng gói Phân phối**:
  - Tích hợp Expo Push Notifications.
  - Xuất bản bản thử nghiệm (TestFlight cho iOS của Master & file APK cho Android).


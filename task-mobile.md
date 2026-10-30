# Task Mobile App - admin_orderlist (iOS & Android)

> **Mục tiêu:** Phát triển và hoàn thiện ứng dụng di động bỏ túi dành cho Master khi ra ngoài đường.  
> **Kế hoạch chi tiết:** Xem tại [docs/plans/2026-10-30_web_to_mobile_app_conversion_plan.md](file:///d:/Desktop/admin/admin_orderlist/docs/plans/2026-10-30_web_to_mobile_app_conversion_plan.md)  
> **Nguyên tắc cốt lõi:**  
> - Tối ưu thao tác nhanh: Tra cứu đơn, duyệt thanh toán, xem số dư, copy slot gửi khách.  
> - **Tuyệt đối KHÔNG đưa tính năng đăng nhập nhanh tài khoản kho lên Mobile App** (giữ nguyên desktop-only theo chỉ đạo của Master).

---

## 🎯 Trạng thái tổng quan

- [x] Bootstrap Expo React Native app tại `mobile/expo-admin-app`
- [x] Lập bản kế hoạch quy hoạch tính năng Mobile bỏ túi (`docs/plans/2026-10-30_web_to_mobile_app_conversion_plan.md`)
- [ ] Xây dựng 4 Tab chức năng cốt lõi (Trang chủ, Đơn hàng, Tài chính, Kho hàng)
- [ ] Đóng gói và phát hành bản thử nghiệm (TestFlight cho iOS / APK cho Android)

---

## 📋 Checklist Triển khai Theo Giai đoạn

### 🔹 GIAI ĐOẠN 1: KẾT NỐI HỆ THỐNG & XÁC THỰC (CORE & AUTH)
- [ ] Cập nhật biến môi trường `EXPO_PUBLIC_API_BASE_URL` trỏ đúng máy chủ API.
- [ ] Tích hợp màn hình Đăng nhập Admin bảo mật bằng JWT Token.
- [ ] Hỗ trợ mở khóa bằng FaceID / TouchID (Biometric Auth) để mở app trong 1 giây ngoài đường.
- [ ] Thiết lập khung điều hướng Bottom Tabs (4 Tabs).

### 🔹 GIAI ĐOẠN 2: TAB ĐƠN HÀNG & KHO HÀNG (ORDERS & WAREHOUSE)
- [ ] **Tab Đơn hàng (`/orders`)**:
  - [ ] Danh sách đơn hàng kèm thanh tìm kiếm tức thời (Tên khách, SĐT, Mã đơn).
  - [ ] Bộ lọc trạng thái đơn: Chờ xử lý, Hoàn tất, Hết hạn.
  - [ ] Màn hình chi tiết đơn: Thông tin gói, ngày hết hạn, slot đã gán.
  - [ ] Nút **"Copy thông tin bàn giao"**: Định dạng sẵn text để Master dán ngay vào Zalo/Telegram gửi khách.
  - [ ] Thao tác gia hạn hoặc đổi slot 1 chạm.
- [ ] **Tab Kho hàng (`/warehouse - Read & Copy Only`)**:
  - [ ] Thống kê số lượng slot trống khả dụng theo từng dịch vụ (Netflix, Adobe, Youtube, Canva...).
  - [ ] Nút copy nhanh User/Pass tài khoản để phục vụ bàn giao ngoài đường.
  - [x] *Ghi chú ranh giới: Loại bỏ hoàn toàn tính năng mở profile trình duyệt/Playwright đăng nhập nhanh.*

### 🔹 GIAI ĐOẠN 3: TAB TÀI CHÍNH & DUYỆT BIÊN LAI (FINANCE & INVOICES)
- [ ] **Tab Tài chính (`/finance`)**:
  - [ ] Thẻ tổng quan số dư các tài khoản (Ngân hàng, Ví shop, USDT, Tiền mặt).
  - [ ] Lịch sử biến động số dư theo thời gian thực (kết nối webhook ngân hàng / email inbound).
  - [ ] Cảnh báo các khoản nợ nhà cung cấp đến hạn.
- [ ] **Duyệt Biên lai Thanh toán (`/invoices`)**:
  - [ ] Danh sách biên lai khách chuyển tiền.
  - [ ] Nút 1 chạm: Xác nhận "Đã nhận tiền" và hoàn tất đơn hàng tức thì.

### 🔹 GIAI ĐOẠN 4: TAB TRANG CHỦ & THÔNG BÁO ĐẨY (DASHBOARD & NOTIFICATIONS)
- [ ] **Tab Trang chủ (Dashboard KPI)**:
  - [ ] Thẻ chỉ số: Doanh thu hôm nay vs hôm qua, số đơn mới, lợi nhuận gộp ước tính.
  - [ ] Danh sách đơn sắp hết hạn trong 24h–48h cần chăm sóc gia hạn.
- [ ] **Push Notifications**:
  - [ ] Bắn thông báo đẩy khi có đơn hàng mới phát sinh.
  - [ ] Bắn thông báo khi có tiền vào tài khoản.

### 🔹 GIAI ĐOẠN 5: ĐÓNG GÓI & PHÁT HÀNH (IOS TESTFLIGHT & ANDROID APK)
- [ ] Cấu hình Expo EAS Build cho cả iOS và Android.
- [ ] Xuất file `.apk` cài trực tiếp cho máy Android.
- [ ] Hướng dẫn cài đặt trên iPhone của Master qua TestFlight / Expo Go.

---

## 🛠️ Lệnh nhanh cho Mobile

```powershell
cd mobile/expo-admin-app
npm run typecheck
npx expo start
```

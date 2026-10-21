# 📐 BẢN QUY HOẠCH NÂNG CẤP HỆ THỐNG TRAFFIC & ANALYTICS V2

**Người lập:** 📝 Lead Planner & Chronicler (hợp tác cùng 👑 Orchestrator, 🎨 Frontend Lead, ⚙️ Backend Specialist)  
**Ngày lập:** 2026-10-21  
**Trạng thái:** [Đang chờ Master phê duyệt]  
**Mục tiêu:** Khảo sát toàn diện hệ thống Traffic của V1 (`mavrykpremium.com`), giải quyết triệt để các hạn chế (thiếu bảng số liệu, dễ sập khi lỗi GA4), và nâng cấp lên V2 với chuẩn thiết kế hiện đại, mượt mà và **đầy đủ 5 bảng thống kê chi tiết**.

---

## 🔍 1. KẾT QUẢ KHẢO SÁT & ĐÁNH GIÁ HỆ THỐNG TRAFFIC V1

### 1.1. Hiện trạng V1 (`frontend/src/features/traffic/pages/TrafficPage.tsx`)
- **Tích hợp Backend:** Sử dụng `@google-analytics/data` gọi GA4 Property `540562174`.
- **4 Thẻ KPI:** Tổng lượt xem (Pageviews), Khách truy cập (Visitors), Thời gian trung bình, Tỷ lệ thoát (Bounce rate).
- **Biểu đồ:** Recharts AreaChart (lưu lượng theo thời gian) và PieChart (nguồn truy cập, thiết bị, khách mới/cũ).
- **Hạn chế nghiêm trọng của V1:**
  1. ❌ **Bảng số liệu cực kỳ nghèo nàn:** Chỉ có duy nhất 1 bảng nhỏ ở đáy trang hiển thị 10 URL phổ biến. Hoàn toàn không có bảng xem chi tiết theo ngày, không có bảng phân tích nguồn, thiết bị, địa lý.
  2. ❌ **Không có tương tác bảng:** Không hỗ trợ tìm kiếm (search), không có sắp xếp (sort), không phân trang (pagination), không lọc ngày tháng linh hoạt.
  3. ❌ **Xử lý lỗi yếu kém:** Khi credentials GA4 chưa được nạp hoặc mạng lỗi, V1 văng chữ lỗi đỏ trơ trọi và biến mất toàn bộ giao diện, khiến người quản trị không theo dõi được gì.
  4. ❌ **Trạng thái trên V2 hiện tại:** Đường dẫn `/traffic` trong V2 đang là một trang `GenericPage` tạm bợ với 3 dòng dữ liệu tĩnh thô sơ (`sampleData`).

---

## 🚀 2. TỔNG QUAN PHƯƠNG ÁN NÂNG CẤP TOÀN DIỆN CHO V2

### 2.1. Kiến Trúc Frontend V2 (`v2/frontend/src/features/traffic`)
Áp dụng Design System đẳng cấp của V2 (`GlassCard`, `StatCard`, kiểu số Binance Crypto, bảng kính mờ tối màu `slate-900/950`, đường viền `sky-500/emerald-500`):

1. **Thanh Điều Khiển & Bộ Lọc Đa Dạng:**
   - Bộ chọn khoảng thời gian nhanh: `Hôm nay (24h)`, `7 Ngày qua`, `14 Ngày qua`, `30 Ngày qua`, `90 Ngày qua`, `Tháng này`.
   - Nút làm mới dữ liệu (Refresh) tức thì có hiệu ứng xoay (loading spin).
   - Badge trạng thái kết nối nguồn dữ liệu: `Google Analytics 4 (Live)` hoặc `Smart Fallback Engine (Demo Mode)`.

2. **Hệ Thống 6 Thẻ KPI StatCard Chuẩn V2:**
   - **Tổng Lượt Xem (Total Pageviews):** Số view trang với % biến động so với kỳ trước.
   - **Khách Truy Cập (Active Users / Unique):** Số người dùng thực tế ghé thăm shop.
   - **Tổng Số Phiên (Total Sessions):** Tổng phiên duyệt web được khởi tạo.
   - **Thời Lượng Trung Bình (Avg Session Duration):** Thời gian giữ chân người dùng (phút:giây).
   - **Tỷ Lệ Thoát (Bounce Rate):** % người dùng rời đi sau 1 trang duy nhất.
   - **Tỷ Lệ Khách Quay Lại (Returning Rate):** Mức độ trung thành của khách mua hàng.

3. **Biểu Đồ Trực Quan Tương Tác Cao (Interactive Native SVG):**
   - **Biểu đồ Lưu lượng theo thời gian:** Vẽ bằng đường cong Bezier mượt mà, vùng phủ gradient 2 tầng (Pageviews & Visitors), vạch lưới mờ, tương tác hover tooltip từng ngày chi tiết.
   - **Biểu đồ Cơ cấu Nguồn lưu lượng:** Donut Chart sắc nét với tỷ trọng % từng kênh.
   - **Biểu đồ Thiết bị & Khách mới/cũ:** Thanh tỷ lệ trực quan (Mobile vs Desktop vs Tablet).

4. **HỆ THỐNG 5 BẢNG STAT ĐẦY ĐỦ (Tabbed Multi-Dimension Tables):**
   *(Đáp ứng chính xác chỉ thị của Master: "nhớ là phải có các bảng stat đầy đủ nhé")*
   
   - 📑 **Bảng 1: Bảng Thống Kê Chi Tiết Theo Ngày (Daily Traffic Logs):**
     - Cột: `Ngày (Date)` | `Lượt xem (Views)` | `Khách (Users)` | `Phiên (Sessions)` | `Tỷ lệ thoát (Bounce)` | `Thời gian TB` | `Tỷ trọng / Xu hướng`.
     - Tương tác: Tìm kiếm ngày, Sort theo Views/Users, Phân trang 10/25/50 dòng.
   
   - 📑 **Bảng 2: Bảng Phân Tích Nguồn & Kênh Lưu Lượng (Traffic Channels & Sources):**
     - Cột: `Kênh / Nguồn (Source/Medium)` (Google Organic, Direct, Facebook Ads, Zalo, Tiktok, Shopee/Web...) | `Số phiên` | `Người dùng` | `Tỷ lệ mới (%)` | `Tỷ lệ tương tác` | `Thanh tiến độ đóng góp`.
   
   - 📑 **Bảng 3: Bảng Các Trang Phổ Biến Nhất (Top Landing Pages & Products):**
     - Cột: `Đường dẫn (URL / Path)` | `Tiêu đề trang (Page Name)` | `Lượt xem` | `Khách xem` | `Thời lượng trên trang` | `Nút mở trực tiếp website`.
   
   - 📑 **Bảng 4: Bảng Thiết Bị, Hệ Điều Hành & Trình Duyệt (Devices & Platforms):**
     - Cột: `Phân loại thiết bị (Mobile/Desktop/Tablet)` | `Hệ điều hành (iOS, Android, Windows, macOS)` | `Trình duyệt (Chrome, Safari, Edge, Firefox)` | `Số lượt truy cập` | `Tỷ trọng (%)`.
   
   - 📑 **Bảng 5: Bảng Địa Lý & Khu Vực Truy Cập (Top Locations):**
     - Cột: `Tỉnh / Thành phố` (Hồ Chí Minh, Hà Nội, Đà Nẵng, Cần Thơ, Hải Phòng...) | `Quốc gia` | `Số phiên` | `Người dùng` | `Tỷ trọng (%)`.

5. **Bộ Công Cụ Cho Mọi Bảng:**
   - 🔍 Ô tìm kiếm nhanh lọc dữ liệu ngay lập tức.
   - ↕️ Sắp xếp tăng/giảm trên từng cột số liệu.
   - 📄 Phân trang thông minh gọn gàng.
   - 📥 Nút **Xuất CSV** để báo cáo hoặc phân tích nội bộ.

---

### 2.2. Kiến Trúc Backend V2 (`v2/backend/src/domains/traffic`)
Xây dựng theo chuẩn Clean Architecture của V2:
- **Router:** `v2/backend/src/domains/traffic/routes/trafficRoutes.js`
  - `GET /api/traffic/stats?days=7`
- **Controller:** `v2/backend/src/domains/traffic/controllers/trafficController.js`
  - Nhận query params `days`, validate số ngày hợp lệ (1, 7, 14, 30, 90).
- **Service:** `v2/backend/src/domains/traffic/services/trafficService.js`
  - **In-Memory Cache (TTL 15 phút):** Giúp tải trang siêu tốc (<50ms), chống gọi dồn quota GA4.
  - **GA4 Real API Client:** Nếu có credentials trong môi trường thì truy vấn trực tiếp GA4 song song 5 truy vấn (Promise.all) tương tự V1 nhưng trả về thêm kích thước ngày và địa lý.
  - **Realistic Fallback Analytics Engine:** Nếu credentials chưa được nạp (hoặc GA4 lỗi/mất mạng), tự động sinh bộ số liệu thực tế cho domain `mavrykpremium.com` (tương ứng với số ngày được chọn) với đầy đủ cả 5 bảng stat, chỉ số KPI logic và biến động ngẫu nhiên có kiểm soát. Nhờ đó, ứng dụng V2 luôn hoạt động 100% trơn tru, hiển thị đầy đủ giao diện chuyên nghiệp mà không bao giờ bị crash!

---

## 🛡️ 3. TÀI NGUYÊN TÁI SỬ DỤNG & RANH GIỚI AN TOÀN (REUSE & REDLINES)

### 3.1. Tài nguyên tái sử dụng (Đã có sẵn trong V2)
- Component `StatCard.tsx`: Tái sử dụng cho 6 thẻ chỉ số KPI ở đầu trang.
- Component `GlassCard.tsx`: Tái sử dụng làm khung chứa biểu đồ và bảng stat.
- Typography & Theme: Tái sử dụng font Mono số liệu Binance Crypto, hệ màu glow (`cyan`, `emerald`, `purple`, `rose`, `amber`).
- Helpers tiền tệ & định dạng ngày có sẵn.

### 3.2. Ranh giới an toàn (CẤM LÀM GÌ)
- ❌ **CẤM** sửa đổi hoặc làm ảnh hưởng tới các domain đang hoạt động khác trong V2 (`orders`, `finance`, `dashboard`, `invoices`, `system`).
- ❌ **CẤM** cài thêm thư viện nặng làm phình bundle frontend (`v2/frontend` không cần cài thêm recharts mà dùng trực tiếp SVG mượt mà như `DashboardPage`).
- ❌ **CẤM** thay đổi port hay cấu hình reverse proxy Vite đang chạy ổn định.
- ❌ **CẤM** làm mất hoặc ghi đè code dở dang của Master.

---

## 📋 4. KẾ HOẠCH TRIỂN KHAI TUẦN TỰ (CHECKLIST)

- [x] **Bước 1: Backend V2 - Domain Traffic**
  - Xây dựng [trafficService.js](file:///d:/Desktop/admin/admin_orderlist/v2/backend/src/domains/traffic/services/trafficService.js) (hỗ trợ Cache 15p, Live GA4 adapter & Realistic Fallback Engine đa chiều).
  - Xây dựng [trafficController.js](file:///d:/Desktop/admin/admin_orderlist/v2/backend/src/domains/traffic/controllers/trafficController.js).
  - Xây dựng [trafficRoutes.js](file:///d:/Desktop/admin/admin_orderlist/v2/backend/src/domains/traffic/routes/trafficRoutes.js).
  - Khai báo route `/api/traffic` trong [server.js](file:///d:/Desktop/admin/admin_orderlist/v2/backend/src/server.js).
- [x] **Bước 2: Frontend V2 - Component TrafficPage Hoàn Chỉnh**
  - Tạo [TrafficPage.tsx](file:///d:/Desktop/admin/admin_orderlist/v2/frontend/src/features/traffic/TrafficPage.tsx) với đầy đủ:
    + Header & Range filter (24h, 7d, 14d, 30d, 90d, Month).
    + 6 thẻ KPI `StatCard` với badge biến động (Tổng Lượt Xem, Khách Truy Cập, Tổng Số Phiên, Thời Lượng TB, Tỷ Lệ Thoát, Khách Quay Lại).
    + Biểu đồ đường cong SVG mượt mà & Donut charts.
    + 5 Tabs bảng stat chi tiết (Daily Logs, Traffic Sources, Top Pages, Devices/Browsers, Locations) kèm Search, Sort, Pagination, Export CSV.
- [x] **Bước 3: Tích hợp Routing V2**
  - Cập nhật [AppRoutes.tsx](file:///d:/Desktop/admin/admin_orderlist/v2/frontend/src/routes/AppRoutes.tsx): Thay thế `GenericPage` tạm thời bằng component `TrafficPage` mới.
- [x] **Bước 4: Kiểm thử toàn diện (Testing)**
  - Đã chạy Browser Subagent kiểm tra trực tiếp giao diện tại [http://localhost:3003/traffic](http://localhost:3003/traffic).
  - Đã xác minh 6 thẻ KPI, biểu đồ diện tích SVG, click chuyển đổi các tab bảng stat ("Trang Phổ Biến", "Nguồn & Kênh", "Vị Trí & Khu Vực", "Thiết Bị & Nền Tảng").
  - Đã xuất ảnh chụp màn hình kiểm thử tại: [traffic_analytics_full_1792556555473.png](file:///C:/Users/hungn/.gemini/antigravity-ide/brain/267e9373-42e2-49aa-9fc2-f80b2f472d60/traffic_analytics_full_1792556555473.png).
- [x] **Bước 5: Cập nhật tài liệu & Ký ức sống**
  - Cập nhật task document và tài liệu dự án.

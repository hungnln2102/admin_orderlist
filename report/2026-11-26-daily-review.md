
## Báo lỗi Adobe Yuna

- OTP Portal cho chọn lý do và gửi báo lỗi cho đơn Yuna đã xác minh. Khi Yuna trả pending, portal hiện thông báo chờ bảo hành và khóa nút kể cả sau khi tra cứu lại.
- Kiểm thử backend 179/179 và kiểm thử Playwright với API giả lập đạt. Đã kiểm tra chuyển từ adobe_renewing sang pending và giữ khóa nút. Không gửi thêm báo lỗi lên Yuna thật.

## Qu?n l? th?ng tin s?n ph?m v? ?nh R2

- Th?m m?c Th?ng tin s?n ph?m trong Qu?n l? Website, g?m ch?nh m? t? theo bi?n th? v? qu?n l? ?nh qua S3. M? t? d?ng c?t hi?n c? v? ph?t s? ki?n trong transaction.
- Thay ?nh ghi ?? c?ng object key. X?a ki?m tra tham chi?u, y?u c?u x?c nh?n v? tr? tr?ng th?i l?m m?i cache.
- Backend ??t 182/182 b?i ki?m th?, frontend build ??t. Playwright d?ng API gi? l?p ki?m tra l?u m? t? ri?ng, thay c?ng key v? ch?n x?a ?nh ?ang d?ng. 26/26 ?nh t?i qua t?n mi?n c?ng khai kh?p SHA-256 v?i file ngu?n.
- Ch? c?u h?nh kh?a S3 trong m?i tr??ng backend ?? ki?m tra thao t?c ghi, x?a v? purge tr?n R2 th?t.

## [22:11] Tái thiết kế giao diện trang Thông tin sản phẩm (`/website-products`)

- **Phạm vi**: Phân rã và nâng cấp toàn diện module `frontend/src/features/website-products/` theo chuẩn Feature-Driven Architecture và Design System SSOT (`GlassCard`, `BaseModal`, `CopyButton`, `TablePagination`, `CustomSelect`, `useNotification`, `formatDateDisplay`), không thay đổi backend hay database.
- **Thay đổi kỹ thuật**:
  - [WebsiteProductsPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/WebsiteProductsPage.tsx): Header đồng bộ phân hệ Quản lý Website với huy hiệu gradient cyan-indigo, mô tả ngắn và Segmented Control chuyển tab.
  - [types.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/types.ts), [websiteProductsApi.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/websiteProductsApi.ts), [utils.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/utils.ts): Khai thác đầy đủ dữ liệu thực tế từ API (`/api/products/prices` gồm `image_url`, `category`, `is_active`, `updated_at`, `counts`, `status`, `limit`; `/api/products/images` gồm `size`, `lastModified`).
  - [useVariantDescriptions.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/hooks/useVariantDescriptions.ts) & [useProductImages.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/hooks/useProductImages.ts): Tách riêng state logic, AbortController, debounce tìm kiếm, bộ lọc và sắp xếp.
  - [VariantDescriptionsTab.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/components/VariantDescriptionsTab.tsx), [VariantDescriptionModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/components/VariantDescriptionModal.tsx), [VariantThumbnail.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/components/VariantThumbnail.tsx): Thêm bộ lọc trạng thái (`Tất cả`, `Đang bán`, `Ngừng bán` kèm số lượng), tìm kiếm có xóa nhanh, hiển thị thumbnail + badges + ngày cập nhật, chọn số dòng/trang trên `TablePagination`, skeleton loading và modal chỉnh sửa 2 cột ngang.
  - [ProductImagesTab.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/components/ProductImagesTab.tsx), [ImageActionModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/components/ImageActionModal.tsx), [ImagePreviewModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/website-products/components/ImagePreviewModal.tsx): Thêm thống kê tổng số ảnh & tổng dung lượng, tìm kiếm tên tệp, lọc định dạng (`JPG`/`PNG`/`WebP`), sắp xếp qua `CustomSelect`, lưới thẻ ảnh hiển thị dung lượng + ngày cập nhật + URL `CopyButton`, Lightbox xem ảnh phóng to, và modal kéo-thả kèm so sánh ảnh hiện tại — ảnh mới khi thay thế.
  - Gỡ bỏ 2 file phẳng cũ (`VariantDescriptions.tsx`, `ProductImages.tsx`) để tránh trùng lặp.
- **Kiểm tra đã chạy**:
  - `npm run build` (`tsc && vite build`) trong `frontend/`: đạt (0 lỗi TypeScript, built in 5.99s).
  - Kiểm tra mã hóa UTF-8 (không BOM, không `\ufffd`) trên toàn bộ 12 file trong `frontend/src/features/website-products/`: đạt.

## CMS biên tập mô tả biến thể

- Mở trình soạn thảo từ Quản lý Website → Thông tin sản phẩm → Mô tả biến thể. Bản nháp tự lưu, xem trước desktop/mobile, gửi duyệt, xuất bản và khôi phục theo phiên bản. Quản trị viên biên tập. `super_admin` và `owner` có quyền duyệt và xuất bản.
- Trang sản phẩm lấy bản đã xuất bản qua proxy theo tên hiển thị chính xác của biến thể vì hai ứng dụng có cơ sở dữ liệu local riêng. Website giữ nội dung hiện có cho biến thể chưa xuất bản qua CMS.
- Kiểm tra đạt 182 unit test backend, 1 bài luồng PostgreSQL 18 cô lập, 2 kiểm thử hiển thị website, build frontend quản trị, build Vite website, proxy HTTP và Chromium ở 1440/390 px. Type check toàn bộ web storefront vẫn báo lỗi ngoài module sửa.
- Đã áp dụng migration `20261126000001_add_variant_description_editorial.js` trên dev local, batch 38. Đã đọc lại `Adobe_Add--1m` và kiểm tra bộ lọc danh mục. Triển khai production và kiểm tra trang công khai production còn chờ.

## Nâng cấp thanh công cụ biên tập

- Bổ sung gạch chân, gạch ngang, màu chữ, tô nền, căn lề, cấp danh sách, xóa định dạng, đường phân cách và bảng. Có thêm, xóa hàng/cột, chỉnh liên kết, văn bản thay thế và chú thích ảnh. Trên màn hình hẹp, dùng nút **Thêm công cụ** để mở định dạng nâng cao.
- Đồng bộ bộ lọc và cách hiển thị tại trang quản trị, API lưu và trang sản phẩm. Bảng rộng cuộn theo chiều ngang trong khung riêng. Đợt này không cần migration.
- Build frontend quản trị và Vite storefront đạt. 182 unit test backend, 1 kiểm thử tích hợp PostgreSQL 18 và 3 kiểm thử hiển thị storefront đạt. Chromium xác nhận thao tác định dạng, chỉnh ảnh, chỉnh liên kết, bảng và luồng dán → lưu → mở lại → xuất bản.

## Kết quả chuyển team Adobe

- Portal chỉ đọc trạng thái chuyển team trong lúc chờ. Backend xác minh tài khoản qua Fix-Ades khi yêu cầu hoàn tất và trả trạng thái đang xác minh nếu tài khoản chưa ở team mới.
- 26 bài kiểm thử backend và build portal đạt. Chromium với API mô phỏng xác nhận luồng chờ xác minh, hiển thị team mới khi thành công và báo lỗi khi chuyển thất bại. Kết quả nghiệm thu áp dụng cho môi trường cục bộ.

## Profile Chromium Kho hàng lưu trên Cloudflare R2

- Popup Kho mở Chromium theo tài khoản và kiểm quyền viewer theo phiên. Worker đóng Chromium rồi mã hóa profile, xác minh SHA-256 trên bản đã tải lên và cập nhật con trỏ R2 trước khi dọn ổ đĩa. Nếu R2 lỗi, profile cục bộ vẫn được giữ để thử lại.
- Đã chạy 185 unit test backend, build frontend và backend Docker, kiểm tra cấu hình Compose và Nginx frontend. Chromium trong Docker xác nhận cookie và Local Storage tách theo tài khoản và tồn tại sau khi mở lại. Viewer noVNC kết nối qua WebSocket, lưu và đóng được, từ chối trình duyệt ẩn danh và phiên quản trị khác.
- Cần cấu hình bucket R2 thử nghiệm riêng tư và xác nhận việc lưu rồi mở lại tài khoản Google thật, bao gồm khởi động lại container. Chưa triển khai VPS. Cấu hình pilot mặc định giới hạn hai phiên trên một backend.

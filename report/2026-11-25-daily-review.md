# Nghiệm thu ngày 25/11/2026

## Adobe Recovery dùng email đăng nhập do Yuna trả về

- Yuna Check ánh xạ `items[0].account_user` vào `account_email` và loại khoảng trắng đầu cuối. Route giữ kiểm tra định dạng email và yêu cầu đúng một tài khoản.
- Unit test OTP đạt 22/22. Kiểm tra trực tiếp handler với dữ liệu giả lập đạt 3/3 cho email hợp lệ, thiếu trường và sai định dạng. Phản hồi thành công chỉ chứa email tài khoản trong `data`.
- Kiểm tra cục bộ, không gửi yêu cầu tới Yuna. Chưa triển khai production.

## 08:26 · Trả đầy đủ dữ liệu tra cứu Adobe Yuna

- Phạm vi gồm phần tra cứu sau khi xác minh thông tin liên hệ của đơn. API trả mặt hàng, hạn sử dụng, tài khoản và mật khẩu do Yuna cung cấp. Portal tái sử dụng nút sao chép và điều hướng sang mục Nhận OTP.
- Thay đổi tại [route Adobe Recovery](../backend/src/domains/system/routes/publicOtpRoutes.js), [xác minh đơn](../backend/src/domains/system/services/adobeOrderSourceService.js), [provider Yuna](../backend/src/domains/system/providers/yuna2faProvider.js) và [giao diện Portal](../../otp_portal/src/features/adobe/components/AdobeAccountRecovery.tsx). Provider chỉ trả mật khẩu khi nhánh Recovery yêu cầu riêng.
- Backend unit test 166/166, build Portal đạt. Handler đạt 4/4 ca với DB và Yuna giả lập, gồm thiếu liên hệ, liên hệ sai, một tài khoản hợp lệ và nhiều tài khoản. Tích hợp PostgreSQL dừng ở bước tạo dữ liệu mẫu vì DB test thiếu cột `warehouse.package_products.account_slot_id`.
- Chưa triển khai production. Nút Báo lỗi được để lại cho đợt sau theo yêu cầu.

## 08:46 · Triển khai admin_orderlist lên VPS

- Đồng bộ repo con `.agents` trên VPS từ `dc672686` đến `b58f1133` theo commit `731d8be5`. Sau khi kiểm tra Git, chạy [deploy.sh](../deploy.sh) trực tiếp qua SSH.
- Build Docker và khởi động container thành công. Knex báo schema production đã cập nhật. Nginx nạp lại cấu hình, backend healthy và `/api/health` trả `status=ok` cùng `database=connected`.
- SHA-256 của route Adobe Recovery trong container khớp với file trên VPS. Chưa kiểm tra với đơn Yuna thật. Bản giao diện trong repo OTP Portal riêng vẫn ở local.

## 13:59 · Khôi phục tra cứu bằng mã đơn Yuna

- Một lần gọi tra cứu Yuna thật trả HTTP 200 với một mục tài khoản và đủ `group`, `expires_at_str`, `account_user`, `account_pass`. Kiểm tra chỉ đọc trên VPS xác nhận phiên bản đang chạy dừng trước khi gọi Yuna vì `contactRequired: true`.
- [Xác minh đơn Adobe](../backend/src/domains/system/services/adobeOrderSourceService.js) chấp nhận mã nhà cung cấp Yuna khớp chính xác với đơn đã xác định. Mã đơn nội bộ và tra cứu Ades tiếp tục yêu cầu liên hệ.
- Backend unit test 166/166. Chạy thử handler với mã thật trên dữ liệu production ở chế độ chỉ đọc và Yuna giả lập, trả đủ bốn trường. Tích hợp PostgreSQL vẫn dừng do schema DB test thiếu `warehouse.package_products.account_slot_id`. Bản sửa chưa triển khai.

## D?n c?t V1 d? th?a tr?n b?n clone production

- ?p d?ng ri?ng migration d?n c?t v?o s? Knex t?i schema public. PostgreSQL ?? b? usdt_wallet_id, id_desc v? account_identifier. V?n c?n hai migration nghi?p v? ngo?i ph?m vi.
- ??i chi?u gi? nguy?n 916 ??n, 129 bi?n th?, 56 t?i kho?n kho v? to?n b? URL ?nh tr?n hai b?ng. D?ch v? ??c ??n, danh m?c v? t?i kho?n kho ho?t ??ng.
- Unit test backend ??t 171/171. Ki?m th? giao d?ch USDT x?c nh?n bi?n lai, d?ng ph?n b?, ledger v? s? d? t?ng t? 10 l?n 15 tr??c khi rollback.
- ??ng b? khai b?o schema v? ?nh x? importer. Migration ng??c kh?i ph?c c?u tr?c c?t. Ch?a tri?n khai production.

## ?i?u h??ng Chromium t? Kho T?i Kho?n

- Backend l?y URL theo ID danh m?c ho?c x?c minh slot thu?c t?i kho?n tr??c khi ?i?u h??ng Chromium ?ang ???c stream. Hai n?t m? d?ng c?ng API v? hi?n th? l?i k?t n?i ho?c ?i?u h??ng.
- Docker Compose d?ng m?ng ?i?u khi?n n?i b? ri?ng v? gi? volume profile hi?n t?i. C?ng ?i?u khi?n kh?ng ???c publish ra host. Compose v? c? ph?p script relay ?? ki?m tra.
- Ki?m th? ?i?u h??ng tr?n Chrome local v? k?t n?i l?i sau khi ng?t Playwright ??t. Unit test backend v? build frontend ??t. Docker Engine local ch?a ch?y, ch?a x?c nh?n viewer tr?n VPS.

## 22:03 · Dựng Bảng Giá công khai (`/price`) và API `/api/public/price-list`

- **Phạm vi**: Bổ sung cột `business.product.category` (kèm seed 6 nhóm danh mục cho 63 sản phẩm) và `business.variant.description`, mở API chỉ đọc công khai `GET /api/public/price-list`, cập nhật modal Admin để chỉnh sửa danh mục & mô tả, và dựng trang Bảng Giá công khai tại `otp_portal` cho URL `mavrykpremium.com/price`.
- **Thay đổi kỹ thuật**:
  - Database & SSOT: [20261125000002_add_product_category_and_variant_description.js](../backend/src/db/migrations/20261125000002_add_product_category_and_variant_description.js), [tables.js](../backend/src/db/tables.js).
  - Backend Public API & Admin Service: [publicPricingService.js](../backend/src/domains/products/services/publicPricingService.js), [publicOtpRoutes.js](../backend/src/domains/system/routes/publicOtpRoutes.js), [productService.js](../backend/src/domains/products/services/productService.js), [publicPricingService.test.js](../backend/tests/unit/publicPricingService.test.js).
  - Admin Frontend: [types.ts](../frontend/src/features/pricing/types.ts), [PricingCreateEditModal.tsx](../frontend/src/features/pricing/components/PricingCreateEditModal.tsx), [PricingPage.tsx](../frontend/src/pages/PricingPage.tsx).
  - OTP Portal (`/price`): [PublicPricePage.tsx](../../otp_portal/src/features/pricing/components/PublicPricePage.tsx), [PricingCategorySidebar.tsx](../../otp_portal/src/features/pricing/components/PricingCategorySidebar.tsx), [PricingTable.tsx](../../otp_portal/src/features/pricing/components/PricingTable.tsx), [portalRoutes.ts](../../otp_portal/src/config/portalRoutes.ts), [App.tsx](../../otp_portal/src/App.tsx), [nginx.conf](../../otp_portal/nginx.conf), [vite.config.ts](../../otp_portal/vite.config.ts).
- **Kiểm thử đã chạy**:
  - Migration PostgreSQL local: PASS (`business.product.category` + `business.variant.description` + seed 6 danh mục).
  - Backend unit test: **175/175 PASS** (gồm 2 test mới cho `publicPricingService`, xác nhận 0 rò rỉ `base_price`/`cost_price`/`ctv_price`/`margin_ratio`).
  - HTTP smoke test `GET /api/public/price-list`: **HTTP 200**, `Cache-Control: public, max-age=60`, trả 6 danh mục và 94 gói đang mở bán.
  - Build production: `otp_portal` (`tsc && vite build`) **PASS**, `admin_orderlist/frontend` (`tsc && vite build`) **PASS**.
- **Lưu ý triển khai VPS**: Khi deploy lên production, cần chạy migration trên `admin_orderlist` và bảo đảm Nginx host ngoài cùng của `mavrykpremium.com` proxy `location ^~ /price` sang container `otp_portal` (`127.0.0.1:3005`).

## 22:19 · Gộp Product & Variant `--xm`, bổ sung cột Thời hạn và Khuyến mãi cho `/price`

- **Phạm vi**: Nâng cấp API `GET /api/public/price-list` và bảng giá `/price` theo phản hồi thực tế từ Master: gộp ô cột `Product + Hình ảnh` theo `product_id`, gom liền kề và gộp ô cột `variant_name` theo phần đầu trước `--xm`, thêm cột `Thời hạn` phân giải `--xm` sang số tháng (`1 tháng`, `3 tháng`, `6 tháng`, `12 tháng`), và tách riêng 2 cột `Price` + `Khuyến mãi`.
- **Thay đổi kỹ thuật**:
  - Backend: [publicPricingService.js](../backend/src/domains/products/services/publicPricingService.js), [publicPricingService.test.js](../backend/tests/unit/publicPricingService.test.js).
  - OTP Portal: [pricing.ts](../../otp_portal/src/features/pricing/types/pricing.ts), [usePublicPriceList.ts](../../otp_portal/src/features/pricing/hooks/usePublicPriceList.ts), [PricingTable.tsx](../../otp_portal/src/features/pricing/components/PricingTable.tsx), [vite.config.ts](../../otp_portal/vite.config.ts).
- **Kiểm thử đã chạy**:
  - `npm test` (`admin_orderlist/backend`): **175/175 PASS** (23 suites, 0 fail).
  - `npm run build` (`otp_portal`): **PASS**.
  - Kiểm tra thực tế `http://localhost:3005/price` & `http://localhost:3005/api/public/price-list`: **HTTP 200**, Adobe (4 dòng gồm `Adobe Acc Cấp` 1m & 3m liền kề), Canva (4 dòng `Canva Slot Team` 1/3/6/12 tháng liền kề), Netflix (`Netflix Fam` có `promo_price = 210000`, `Netflix Slot 4K` 6 mốc thời hạn liền kề).

## Sửa nút mở trình duyệt Kho Hàng trên local

- Vite dev mở trực tiếp URL từ danh mục. Nút tại slot dùng launcher theo tài khoản với cờ mở đúng URL đã cấu hình. Luồng cloud của bản production giữ nguyên.
- Chrome thật kiểm tra cả hai nút trên Vite với API giả lập. Launcher Chrome riêng mở đúng URL thử nghiệm bằng profile tạm. Unit test backend 176/176 và build frontend đạt. Chưa dùng profile tài khoản thật hoặc triển khai VPS.

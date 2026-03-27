# Trạng Thái Chuẩn Hóa SEO

Cập nhật: 2026-03-25

## Mục tiêu

Đồng bộ chuẩn SEO giữa `admin_orderlist` và `Website` theo các nguyên tắc sau:

- Không dùng `variant_name`, `display_name`, `product`, `package` để sinh SEO.
- Chỉ dùng `short_desc`, `rules`, `description` làm nguồn dữ liệu SEO chuẩn.
- Admin là nơi biên tập và lưu HTML SEO vào database.
- Website là nơi parse, render và audit SEO thật từ dữ liệu đã lưu.

## Đã hoàn thành

- [x] Chốt kiến trúc SEO theo 3 trường `short_desc`, `rules`, `description`.
- [x] Chuẩn hóa modal edit product để phần bên phải trở thành khu vực SEO chính.
- [x] Admin frontend đã nối thanh SEO / preview vào luồng audit thật thay vì score local.
- [x] Admin frontend gửi dữ liệu audit chỉ gồm `shortDesc`, `rulesHtml`, `descriptionHtml`.
- [x] Admin backend đã có proxy endpoint để gọi sang Website SEO audit.
- [x] Website đã có helper parser SEO trung tâm để sinh `heading`, `title`, `metaDescription`, `slug`, `imageAlt`.
- [x] Website đã render nội dung SEO từ dữ liệu lưu trong database thay vì suy từ tên / gói sản phẩm.
- [x] Website đã có endpoint `POST /api/seo/product-audit` để chấm điểm SEO thật.
- [x] Website đã có bộ rule audit ban đầu dựa trên output render thật.
- [x] Đã bỏ chặn CSRF cho route `POST /api/seo/product-audit` vì đây là API audit chỉ đọc dữ liệu, không thay đổi trạng thái.
- [x] Đã chuẩn hóa hiển thị lỗi audit trên admin để ưu tiên hiện thông điệp lỗi ngắn gọn thay vì nguyên chuỗi JSON.
- [x] Đã nâng cấp editor SEO trong admin: bố cục chuyên nghiệp hơn, bổ sung thao tác còn thiếu và có chế độ chuyển giữa `Soạn thảo` và `HTML`.
- [x] Đã chỉnh editor SEO theo kiểu form CMS chuẩn hơn: toolbar nhiều hàng, nhóm công cụ rõ ràng, vùng viết sáng và hỗ trợ thao tác trực tiếp với HTML source.
- [x] Build `admin frontend` đã pass.
- [x] Build `Website server` đã pass.
- [x] Build `Website web` đã pass.

## Các file chính đã sửa

- `frontend/src/pages/Product/ProductInfo/components/EditProductModal/index.tsx`
- `frontend/src/pages/Product/ProductInfo/components/EditProductModal/useWebsiteSeoAudit.ts`
- `frontend/src/pages/Product/ProductInfo/components/EditProductModal/SeoPreviewPanel.tsx`
- `frontend/src/lib/productDescApi.ts`
- `backend/src/controllers/ProductDescriptionsController/websiteSeoAudit.js`
- `backend/src/routes/productDescriptionsRoutes.js`
- `../Website/my-store/apps/server/src/utils/product-seo.ts`
- `../Website/my-store/apps/server/src/utils/product-seo-audit.ts`
- `../Website/my-store/apps/server/src/controllers/seo.controller.ts`
- `../Website/my-store/apps/server/src/routes/products.route.ts`
- `../Website/my-store/apps/server/src/services/products-list.service.ts`
- `../Website/my-store/apps/server/src/services/product-packages.service.ts`
- `../Website/my-store/apps/server/src/services/variant-detail.service.ts`

## Chưa hoàn thành

- [ ] Xác nhận runtime thực tế của `WEBSITE_SEO_AUDIT_URL` trong môi trường đang chạy.
- [ ] Restart `admin backend` để nạp `.env` mới.
- [ ] Restart `Website server` nếu runtime hiện tại chưa nạp code mới.
- [ ] Smoke test end-to-end: sửa nội dung trong admin, lưu, gọi audit, vào Website kiểm tra output thật.
- [ ] Kiểm tra cache invalidation hoạt động đúng sau khi lưu nội dung SEO.
- [ ] Chốt ngưỡng pass/fail cuối cùng cho thanh điểm SEO.
- [ ] Thêm publish gate nếu muốn chặn lưu hoặc chặn publish khi dưới ngưỡng.
- [ ] Tinh chỉnh thêm rule audit theo policy SEO nội bộ cuối cùng.
- [ ] Kiểm tra các trường hợp lỗi mạng hoặc Website audit unavailable trên admin.
- [ ] Viết hướng dẫn nhập nội dung SEO cho team vận hành.

## Việc cần làm ngay

- [ ] Kiểm tra `backend/.env` có giá trị đúng: `WEBSITE_SEO_AUDIT_URL=http://127.0.0.1:4000/api/seo/product-audit`
- [ ] Mở lại `admin backend`.
- [ ] Thử sửa 1 bài trong modal edit product.
- [ ] Xác nhận thanh điểm trong admin trả về kết quả thật từ Website.
- [ ] Mở trang chi tiết sản phẩm trên Website để đối chiếu `H1`, `title`, `meta`, `slug`, `body`.

## Ghi chú

- Hiện tại phần code-level đã xong phần lớn.
- Phần còn lại chủ yếu là runtime, test thật và policy chặn publish.
- Nếu `WEBSITE_SEO_AUDIT_URL` sai host hoặc sai port, admin sẽ không lấy được điểm thật.

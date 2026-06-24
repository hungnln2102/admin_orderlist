# Agent Graph: src

## Mục Đích
Tài liệu này mô tả graph tính năng theo ngôn ngữ nghiệp vụ để agent khác có thể hiểu module dùng làm gì, liên kết tới đâu, và nên tác động ở khu vực nào khi triển khai/chỉnh sửa.

## Thống Kê
- Files: 590
- Modules: 61
- Functions: 662
- Components: 333
- Hooks: 75
- Edges: 5004
- Analyzed at: 2026-06-22T18:35:09.728Z

## Selected Focus,- ID: module:App.test.tsx,- Tên nghiệp vụ: App Test,- Loại: Tính năng,- Mục đích: Nhóm chức năng App test. Click để xem các bước nhỏ và module đang liên kết.,- Source: App.test.tsx,### Tính năng này đang dùng,- Không có.,### Được dùng bởi,- Không có.
## Module Overview
### App Test
- Module ID: module:App.test.tsx
- Dùng để: Nhóm chức năng App test. Click để xem các bước nhỏ và module đang liên kết.
- Path: App.test.tsx
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- App: `App.test.tsx`
#### Liên Kết Sang Module Khác
- App Test → App: dùng dữ liệu từ
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### App
- Module ID: module:App.tsx
- Dùng để: Nhóm chức năng App. Click để xem các bước nhỏ và module đang liên kết.
- Path: App.tsx
#### Nhánh/Bước Chính
- Admin App: Phần giao diện giúp người dùng thao tác với Admin App. — `App.tsx:11`
- App: Phần giao diện giúp người dùng thao tác với App. — `App.tsx:32`
#### File Chính
- App: `App.tsx`
#### Liên Kết Sang Module Khác
- App → Quản lý phân quyền: dùng dữ liệu từ
- App → Error Boundary: dùng dữ liệu từ
- App → Quản lý phân quyền: dùng dữ liệu từ
- App → Layout: dùng dữ liệu từ
- App → Routes: dùng dữ liệu từ
- App → Modals: dùng dữ liệu từ
- App → Quản lý phân quyền: hiển thị
- App → Quản lý phân quyền: hiển thị
- App → Quản lý phân quyền: hiển thị
- App → Layout: hiển thị
- App → Routes: hiển thị
- App → Error Boundary: hiển thị
#### Module Khác Gọi Vào
- App Test → App: dùng dữ liệu từ
- Main → App: dùng dữ liệu từ
### Quản lý phân quyền
- Module ID: module:AuthContext.tsx
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới phân quyền. Click để xem các bước nhỏ và module đang liên kết.
- Path: AuthContext.tsx
#### Nhánh/Bước Chính
- phân quyền: Lấy và quản lý dữ liệu liên quan tới phân quyền. — `AuthContext.tsx:21`
- NCC: Phần giao diện giúp người dùng thao tác với NCC. — `AuthContext.tsx:23`
#### File Chính
- Auth Context: `AuthContext.tsx`
#### Liên Kết Sang Module Khác
- Quản lý phân quyền → Shared: dùng dữ liệu từ
- Quản lý phân quyền → Shared: gọi xử lý
- Quản lý phân quyền → Content: gọi xử lý
#### Module Khác Gọi Vào
- App → Quản lý phân quyền: dùng dữ liệu từ
- Layout → Quản lý phân quyền: dùng dữ liệu từ
- Quản lý phân quyền → Quản lý phân quyền: dùng dữ liệu từ
- App → Quản lý phân quyền: hiển thị
- Quản lý phân quyền → Quản lý phân quyền: gọi xử lý
- Layout → Quản lý phân quyền: gọi xử lý
- Quản lý phân quyền → Quản lý phân quyền: gọi xử lý
### Constants
- Module ID: module:constants.ts
- Dùng để: Nhóm chức năng constants. Click để xem các bước nhỏ và module đang liên kết.
- Path: constants.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Constants: `constants.ts`
#### Liên Kết Sang Module Khác
- Constants → Field Mapper: dùng dữ liệu từ
#### Module Khác Gọi Vào
- Quản lý giá → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
### Main
- Module ID: module:main.tsx
- Dùng để: Nhóm chức năng main. Click để xem các bước nhỏ và module đang liên kết.
- Path: main.tsx
#### Nhánh/Bước Chính
- báo cáo: Bước xử lý liên quan tới báo cáo. — `main.tsx:6`
#### File Chính
- Main: `main.tsx`
#### Liên Kết Sang Module Khác
- Main → App: dùng dữ liệu từ
- Main → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Setup Tests
- Module ID: module:setupTests.ts
- Dùng để: Nhóm chức năng setup Tests. Click để xem các bước nhỏ và module đang liên kết.
- Path: setupTests.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Setup Tests: `setupTests.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Vite Env D
- Module ID: module:vite-env.d.ts
- Dùng để: Nhóm chức năng vite env d. Click để xem các bước nhỏ và module đang liên kết.
- Path: vite-env.d.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Vite Env: `vite-env.d.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Error Boundary
- Module ID: module:components/ErrorBoundary.tsx
- Dùng để: Nhóm chức năng Error Boundary. Click để xem các bước nhỏ và module đang liên kết.
- Path: components/ErrorBoundary.tsx
#### Nhánh/Bước Chính
- Error Boundary: Bước xử lý liên quan tới Error Boundary. — `components/ErrorBoundary.tsx:14`
- Error Boundary: Bước xử lý liên quan tới Error Boundary. — `components/ErrorBoundary.tsx:24`
- Error Boundary: Bước xử lý liên quan tới Error Boundary. — `components/ErrorBoundary.tsx:29`
- Error Boundary: Bước xử lý liên quan tới Error Boundary. — `components/ErrorBoundary.tsx:58`
#### File Chính
- Error Boundary: `components/ErrorBoundary.tsx`
#### Liên Kết Sang Module Khác
- Error Boundary → Shared: gọi xử lý
#### Module Khác Gọi Vào
- App → Error Boundary: dùng dữ liệu từ
- App → Error Boundary: hiển thị
### Constants
- Module ID: module:constants
- Dùng để: Nhóm chức năng constants. Click để xem các bước nhỏ và module đang liên kết.
- Path: constants
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Z: `constants/zIndex.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Quản lý người dùng
- Module ID: module:lib/accountsApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới người dùng. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/accountsApi.ts
#### Nhánh/Bước Chính
- Xem/Tìm người dùng: Bước này dùng để xem/tìm người dùng. — `lib/accountsApi.ts:21`
#### File Chính
- Xử lý dữ liệu người dùng: `lib/accountsApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý người dùng → TíNh NăNg: dùng dữ liệu từ
- Quản lý người dùng → Content: gọi xử lý
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### TíNh NăNg
- Module ID: module:lib/api.ts
- Dùng để: Nhóm chức năng tính năng. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/api.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Xử lý dữ liệu: `lib/api.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Quản lý người dùng → TíNh NăNg: dùng dữ liệu từ
- Quản lý danh mục → TíNh NăNg: dùng dữ liệu từ
- Forms → TíNh NăNg: dùng dữ liệu từ
- Quản lý giá → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
- Quản lý khuyến mãi → TíNh NăNg: dùng dữ liệu từ
- Quản lý đổi trả/hoàn tiền → TíNh NăNg: dùng dữ liệu từ
- Supplies → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
### Quản lý danh mục
- Module ID: module:lib/categoryApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới danh mục. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/categoryApi.ts
#### Nhánh/Bước Chính
- Xem/Tìm danh mục: Bước này dùng để xem/tìm danh mục. — `lib/categoryApi.ts:22`
- Tạo mới danh mục: Bước này dùng để tạo mới danh mục. — `lib/categoryApi.ts:35`
- Cập nhật danh mục: Bước này dùng để cập nhật danh mục. — `lib/categoryApi.ts:53`
- Xóa danh mục: Bước này dùng để xóa danh mục. — `lib/categoryApi.ts:74`
#### File Chính
- Xử lý dữ liệu danh mục: `lib/categoryApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý danh mục → TíNh NăNg: dùng dữ liệu từ
- Quản lý danh mục → Content: gọi xử lý
- Quản lý danh mục → Content: gọi xử lý
- Quản lý danh mục → Content: gọi xử lý
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Error Handler
- Module ID: module:lib/errorHandler.ts
- Dùng để: Nhóm chức năng error Handler. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/errorHandler.ts
#### Nhánh/Bước Chính
- parse Error: Bước xử lý liên quan tới parse Error. — `lib/errorHandler.ts:16`
- handle Network Error: Bước xử lý liên quan tới handle Network Error. — `lib/errorHandler.ts:77`
#### File Chính
- Error Handler: `lib/errorHandler.ts`
#### Liên Kết Sang Module Khác
- Error Handler → Content: gọi xử lý
#### Module Khác Gọi Vào
- Quản lý đơn hàng → Error Handler: gọi xử lý
- Quản lý sản phẩm → Error Handler: gọi xử lý
- Quản lý báo cáo → Error Handler: gọi xử lý
- Quản lý báo cáo → Error Handler: gọi xử lý
- Quản lý báo cáo → Error Handler: gọi xử lý
### Field Mapper
- Module ID: module:lib/fieldMapper.ts
- Dùng để: Nhóm chức năng field Mapper. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/fieldMapper.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Field Mapper: `lib/fieldMapper.ts`
#### Liên Kết Sang Module Khác
- Field Mapper → Table Sql: dùng dữ liệu từ
#### Module Khác Gọi Vào
- Constants → Field Mapper: dùng dữ liệu từ
### Forms
- Module ID: module:lib/formsApi.ts
- Dùng để: Nhóm chức năng forms. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/formsApi.ts
#### Nhánh/Bước Chính
- Xem/Tìm fetch Form Names: Bước này dùng để xem/tìm fetch Form Names. — `lib/formsApi.ts:31`
- Cập nhật update Form: Bước này dùng để cập nhật update Form. — `lib/formsApi.ts:59`
- Tạo mới create Form: Bước này dùng để tạo mới create Form. — `lib/formsApi.ts:80`
- Xem/Tìm fetch Inputs: Bước này dùng để xem/tìm fetch Inputs. — `lib/formsApi.ts:109`
- Tạo mới create Input: Bước này dùng để tạo mới create Input. — `lib/formsApi.ts:130`
- Xem/Tìm fetch Form Detail: Bước này dùng để xem/tìm fetch Form Detail. — `lib/formsApi.ts:148`
#### File Chính
- Form nhập liệu: `lib/formsApi.ts`
#### Liên Kết Sang Module Khác
- Forms → TíNh NăNg: dùng dữ liệu từ
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
#### Module Khác Gọi Vào
- Form Info → Forms: gọi xử lý
- Form Info → Forms: gọi xử lý
- Form Info → Forms: gọi xử lý
- Form Info → Forms: gọi xử lý
- Form Info → Forms: gọi xử lý
- Form Info → Forms: gọi xử lý
- Form Info → Forms: gọi xử lý
- Modals → Forms: gọi xử lý
- Modals → Forms: gọi xử lý
- Modals → Forms: gọi xử lý
- Modals → Forms: gọi xử lý
- Modals → Forms: gọi xử lý
### Helpers
- Module ID: module:lib/helpers.ts
- Dùng để: Nhóm chức năng helpers. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/helpers.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Helpers: `lib/helpers.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Quản lý giá → Helpers: dùng dữ liệu từ
### Lumi
- Module ID: module:lib/lumi.ts
- Dùng để: Nhóm chức năng lumi. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/lumi.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Lumi: `lib/lumi.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Notifications
- Module ID: module:lib/notifications.ts
- Dùng để: Nhóm chức năng notifications. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/notifications.ts
#### Nhánh/Bước Chính
- Hiển thị show App Notification: Bước này dùng để hiển thị show App Notification. — `lib/notifications.ts:11`
#### File Chính
- Notifications: `lib/notifications.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Modals → Notifications: dùng dữ liệu từ
- Add Mcoin → Notifications: gọi xử lý
- Quản lý hóa đơn → Notifications: gọi xử lý
- Supply → Notifications: gọi xử lý
- Modals → Notifications: gọi xử lý
- Ip Whitelist → Notifications: gọi xử lý
- Ip Whitelist → Notifications: gọi xử lý
- Ip Whitelist → Notifications: gọi xử lý
- Ip Whitelist → Notifications: gọi xử lý
- Ip Whitelist → Notifications: gọi xử lý
- Ip Whitelist → Notifications: gọi xử lý
- Ip Whitelist → Notifications: gọi xử lý
### Quản lý giá
- Module ID: module:lib/pricingApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới giá. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/pricingApi.ts
#### Nhánh/Bước Chính
- Xem/Tìm giá: Bước này dùng để xem/tìm giá. — `lib/pricingApi.ts:37`
#### File Chính
- Xử lý dữ liệu giá: `lib/pricingApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý giá → Constants: dùng dữ liệu từ
- Quản lý giá → TíNh NăNg: dùng dữ liệu từ
- Quản lý giá → Helpers: dùng dữ liệu từ
- Quản lý giá → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Modals → Quản lý giá: dùng dữ liệu từ
- Modals → Quản lý giá: dùng dữ liệu từ
- Quản lý sản phẩm → Quản lý giá: gọi xử lý
- Modals → Quản lý giá: gọi xử lý
- Modals → Quản lý giá: gọi xử lý
### Quản lý sản phẩm
- Module ID: module:lib/productDescApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới sản phẩm. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/productDescApi.ts
#### Nhánh/Bước Chính
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `lib/productDescApi.ts:103`
- Tạo mới sản phẩm: Bước này dùng để tạo mới sản phẩm. — `lib/productDescApi.ts:143`
- Lưu sản phẩm: Bước này dùng để lưu sản phẩm. — `lib/productDescApi.ts:175`
- Xóa sản phẩm: Bước này dùng để xóa sản phẩm. — `lib/productDescApi.ts:200`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `lib/productDescApi.ts:221`
- Nhập dữ liệu sản phẩm: Bước này dùng để nhập dữ liệu sản phẩm. — `lib/productDescApi.ts:259`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `lib/productDescApi.ts:285`
- Xóa sản phẩm: Bước này dùng để xóa sản phẩm. — `lib/productDescApi.ts:310`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `lib/productDescApi.ts:328`
#### File Chính
- Xử lý dữ liệu sản phẩm: `lib/productDescApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
#### Module Khác Gọi Vào
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
### Quản lý sản phẩm
- Module ID: module:lib/productImagesApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới sản phẩm. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/productImagesApi.ts
#### Nhánh/Bước Chính
- Nhập dữ liệu sản phẩm: Bước này dùng để nhập dữ liệu sản phẩm. — `lib/productImagesApi.ts:19`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `lib/productImagesApi.ts:45`
- Xóa sản phẩm: Bước này dùng để xóa sản phẩm. — `lib/productImagesApi.ts:70`
#### File Chính
- Xử lý dữ liệu sản phẩm: `lib/productImagesApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Quản lý sản phẩm
- Module ID: module:lib/productPricesApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới sản phẩm. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/productPricesApi.ts
#### Nhánh/Bước Chính
- Cập nhật sản phẩm: Bước này dùng để cập nhật sản phẩm. — `lib/productPricesApi.ts:20`
- Xóa sản phẩm: Bước này dùng để xóa sản phẩm. — `lib/productPricesApi.ts:42`
#### File Chính
- Xử lý dữ liệu sản phẩm: `lib/productPricesApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
#### Module Khác Gọi Vào
- Quản lý giá → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
### Quản lý khuyến mãi
- Module ID: module:lib/promotionCodesApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới khuyến mãi. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/promotionCodesApi.ts
#### Nhánh/Bước Chính
- khuyến mãi: Bước xử lý liên quan tới khuyến mãi. — `lib/promotionCodesApi.ts:23`
- khuyến mãi: Bước xử lý liên quan tới khuyến mãi. — `lib/promotionCodesApi.ts:32`
- Xem/Tìm khuyến mãi: Bước này dùng để xem/tìm khuyến mãi. — `lib/promotionCodesApi.ts:39`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `lib/promotionCodesApi.ts:52`
#### File Chính
- Xử lý dữ liệu khuyến mãi: `lib/promotionCodesApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý khuyến mãi → TíNh NăNg: dùng dữ liệu từ
- Quản lý khuyến mãi → Content: gọi xử lý
#### Module Khác Gọi Vào
- Promo Codes → Quản lý khuyến mãi: gọi xử lý
### Refresh Bus
- Module ID: module:lib/refreshBus.ts
- Dùng để: Nhóm chức năng refresh Bus. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/refreshBus.ts
#### Nhánh/Bước Chính
- normalize Scopes: Bước xử lý liên quan tới normalize Scopes. — `lib/refreshBus.ts:18`
- matches Scopes: Bước xử lý liên quan tới matches Scopes. — `lib/refreshBus.ts:25`
- emit Refresh: Bước xử lý liên quan tới emit Refresh. — `lib/refreshBus.ts:31`
- on Refresh: Bước xử lý liên quan tới on Refresh. — `lib/refreshBus.ts:37`
#### File Chính
- Refresh Bus: `lib/refreshBus.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Quản lý sản phẩm → Refresh Bus: gọi xử lý
- Renew Adobe → Refresh Bus: gọi xử lý
- Quản lý báo cáo → Refresh Bus: gọi xử lý
- Quản lý báo cáo → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
- Quản lý đơn hàng → Refresh Bus: gọi xử lý
### Quản lý đổi trả/hoàn tiền
- Module ID: module:lib/refundCreditsApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới đổi trả/hoàn tiền. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/refundCreditsApi.ts
#### Nhánh/Bước Chính
- Xem/Tìm đổi trả/hoàn tiền: Bước này dùng để xem/tìm đổi trả/hoàn tiền. — `lib/refundCreditsApi.ts:19`
#### File Chính
- Xử lý dữ liệu đổi trả/hoàn tiền: `lib/refundCreditsApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý đổi trả/hoàn tiền → TíNh NăNg: dùng dữ liệu từ
- Quản lý đổi trả/hoàn tiền → Content: gọi xử lý
#### Module Khác Gọi Vào
- Modals → Quản lý đổi trả/hoàn tiền: gọi xử lý
### Supplies
- Module ID: module:lib/suppliesApi.ts
- Dùng để: Nhóm chức năng supplies. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/suppliesApi.ts
#### Nhánh/Bước Chính
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `lib/suppliesApi.ts:30`
- Xóa delete Supply By Id: Bước này dùng để xóa delete Supply By Id. — `lib/suppliesApi.ts:62`
#### File Chính
- Xử lý dữ liệu: `lib/suppliesApi.ts`
#### Liên Kết Sang Module Khác
- Supplies → TíNh NăNg: dùng dữ liệu từ
- Supplies → Content: gọi xử lý
- Supplies → Content: gọi xử lý
#### Module Khác Gọi Vào
- Supply → Supplies: gọi xử lý
- Supply → Supplies: gọi xử lý
- Supply → Supplies: gọi xử lý
### Table Sql
- Module ID: module:lib/tableSql.ts
- Dùng để: Nhóm chức năng table Sql. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/tableSql.ts
#### Nhánh/Bước Chính
- Chưa tìm thấy bước xử lý rõ ràng trong module này.
#### File Chính
- Danh sách dữ liệu: `lib/tableSql.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Field Mapper → Table Sql: dùng dữ liệu từ
### Text
- Module ID: module:lib/textUtils.ts
- Dùng để: Nhóm chức năng text. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/textUtils.ts
#### Nhánh/Bước Chính
- strip Html Tags: Bước xử lý liên quan tới strip Html Tags. — `lib/textUtils.ts:1`
- normalize Error Message: Bước xử lý liên quan tới normalize Error Message. — `lib/textUtils.ts:15`
#### File Chính
- Text: `lib/textUtils.ts`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
### Quản lý sản phẩm
- Module ID: module:lib/variantImagesApi.ts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới sản phẩm. Click để xem các bước nhỏ và module đang liên kết.
- Path: lib/variantImagesApi.ts
#### Nhánh/Bước Chính
- Nhập dữ liệu sản phẩm: Bước này dùng để nhập dữ liệu sản phẩm. — `lib/variantImagesApi.ts:19`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `lib/variantImagesApi.ts:45`
- Xóa sản phẩm: Bước này dùng để xóa sản phẩm. — `lib/variantImagesApi.ts:70`
#### File Chính
- Xử lý dữ liệu sản phẩm: `lib/variantImagesApi.ts`
#### Liên Kết Sang Module Khác
- Quản lý sản phẩm → TíNh NăNg: dùng dữ liệu từ
- Quản lý sản phẩm → Text: dùng dữ liệu từ
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
#### Module Khác Gọi Vào
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
### Routes
- Module ID: module:routes
- Dùng để: Nhóm chức năng routes. Click để xem các bước nhỏ và module đang liên kết.
- Path: routes
#### Nhánh/Bước Chính
- App Routes: Phần giao diện giúp người dùng thao tác với App Routes. — `routes/AppRoutes.tsx:55`
- Page Loader: Phần giao diện giúp người dùng thao tác với Page Loader. — `routes/AppRoutes.tsx:4`
#### File Chính
- App Routes: `routes/AppRoutes.tsx`
#### Liên Kết Sang Module Khác
- Routes → Tax: hiển thị
- Routes → Expenses: hiển thị
- Routes → Quản lý đơn hàng: hiển thị
- Routes → Credit: hiển thị
- Routes → Quản lý sản phẩm: hiển thị
- Routes → Quản lý sản phẩm: hiển thị
- Routes → Form Info: hiển thị
- Routes → Supply: hiển thị
- Routes → Quản lý giá: hiển thị
- Routes → Quản lý đơn hàng: hiển thị
- Routes → Quản lý hóa đơn: hiển thị
- Routes → Ctv List: hiển thị
#### Module Khác Gọi Vào
- App → Routes: dùng dữ liệu từ
- App → Routes: hiển thị
### Quản lý phân quyền
- Module ID: module:components/auth
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới phân quyền. Click để xem các bước nhỏ và module đang liên kết.
- Path: components/auth
#### Nhánh/Bước Chính
- phân quyền: Phần giao diện giúp người dùng thao tác với phân quyền. — `components/auth/ProtectedRoute.tsx:4`
#### File Chính
- Protected Route: `components/auth/ProtectedRoute.tsx`
#### Liên Kết Sang Module Khác
- Quản lý phân quyền → Quản lý phân quyền: gọi xử lý
#### Module Khác Gọi Vào
- App → Quản lý phân quyền: dùng dữ liệu từ
- App → Quản lý phân quyền: hiển thị
### Layout
- Module ID: module:components/layout
- Dùng để: Nhóm chức năng layout. Click để xem các bước nhỏ và module đang liên kết.
- Path: components/layout
#### Nhánh/Bước Chính
- Glass Panel: Phần giao diện giúp người dùng thao tác với Glass Panel. — `components/layout/GlassPanel.tsx:28`
- Main Layout: Phần giao diện giúp người dùng thao tác với Main Layout. — `components/layout/MainLayout.tsx:4`
- Cập nhật Change Password Modal: Phần giao diện giúp người dùng thao tác với Change Password Modal. — `components/layout/sidebar/ChangePasswordModal.tsx:11`
- Sidebar: Phần giao diện giúp người dùng thao tác với Sidebar. — `components/layout/sidebar/Sidebar.tsx:28`
- Xem/Tìm get Active Section Id: Bước này dùng để xem/tìm get Active Section Id. — `components/layout/sidebar/Sidebar.tsx:16`
- Xem/Tìm get Default Open Section: Bước này dùng để xem/tìm get Default Open Section. — `components/layout/sidebar/Sidebar.tsx:25`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `components/layout/sidebar/SidebarAccount.tsx:25`
- Sidebar Menu Section: Phần giao diện giúp người dùng thao tác với Sidebar Menu Section. — `components/layout/sidebar/SidebarMenuSection.tsx:91`
- normalize Search: Bước xử lý liên quan tới normalize Search. — `components/layout/sidebar/sidebarUtils.ts:1`
- matches Href: Bước xử lý liên quan tới matches Href. — `components/layout/sidebar/sidebarUtils.ts:11`
#### File Chính
- Glass Panel: `components/layout/GlassPanel.tsx`
- Main Layout: `components/layout/MainLayout.tsx`
- Change Password Modal: `components/layout/sidebar/ChangePasswordModal.tsx`
- Menu Config: `components/layout/sidebar/menuConfig.ts`
- Sidebar: `components/layout/sidebar/Sidebar.tsx`
- Sidebar Account: `components/layout/sidebar/SidebarAccount.tsx`
- Sidebar Menu Section: `components/layout/sidebar/SidebarMenuSection.tsx`
- Sidebar: `components/layout/sidebar/sidebarUtils.ts`
#### Liên Kết Sang Module Khác
- Layout → Shared: dùng dữ liệu từ
- Layout → Quản lý phân quyền: dùng dữ liệu từ
- Layout → Shared: gọi xử lý
- Layout → Content: gọi xử lý
- Layout → Ui: hiển thị
- Layout → Quản lý phân quyền: gọi xử lý
- Layout → Shared: gọi xử lý
#### Module Khác Gọi Vào
- App → Layout: dùng dữ liệu từ
- App → Layout: hiển thị
### Ui
- Module ID: module:components/ui
- Dùng để: Nhóm chức năng ui. Click để xem các bước nhỏ và module đang liên kết.
- Path: components/ui
#### Nhánh/Bước Chính
- Color Picker: Phần giao diện giúp người dùng thao tác với Color Picker. — `components/ui/ColorPicker.tsx:24`
- Modal Portal: Phần giao diện giúp người dùng thao tác với Modal Portal. — `components/ui/ModalPortal.tsx:9`
- Pagination: Phần giao diện giúp người dùng thao tác với Pagination. — `components/ui/Pagination.tsx:34`
- clamp: Bước xử lý liên quan tới clamp. — `components/ui/Pagination.tsx:11`
- build Page List: Bước xử lý liên quan tới build Page List. — `components/ui/Pagination.tsx:14`
- Responsive Table: Phần giao diện giúp người dùng thao tác với Responsive Table. — `components/ui/ResponsiveTable.tsx:20`
- Table Card: Phần giao diện giúp người dùng thao tác với Table Card. — `components/ui/ResponsiveTable.tsx:60`
- Stat Card: Phần giao diện giúp người dùng thao tác với Stat Card. — `components/ui/StatCard.tsx:111`
#### File Chính
- Color Picker: `components/ui/ColorPicker.tsx`
- Gradient Button: `components/ui/GradientButton.tsx`
- Modal Portal: `components/ui/ModalPortal.tsx`
- Pagination: `components/ui/Pagination.tsx`
- Danh sách dữ liệu: `components/ui/ResponsiveTable.tsx`
- Stat Card: `components/ui/StatCard.tsx`
#### Liên Kết Sang Module Khác
- Chưa phát hiện liên kết.
#### Module Khác Gọi Vào
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Add Mcoin → Ui: hiển thị
- Add Mcoin → Ui: hiển thị
- Add Mcoin → Ui: hiển thị
- Add Mcoin → Ui: hiển thị
- Ctv List → Ui: hiển thị
- Ctv List → Ui: hiển thị
- Ctv List → Ui: hiển thị
### Active Keys
- Module ID: module:features/active-keys
- Dùng để: Nhóm chức năng active keys. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/active-keys
#### Nhánh/Bước Chính
- Active Keys: Phần giao diện giúp người dùng thao tác với Active Keys. — `features/active-keys/index.tsx:13`
- Active Key Card: Phần giao diện giúp người dùng thao tác với Active Key Card. — `features/active-keys/components/ActiveKeyCard.tsx:11`
- Active Key Row: Phần giao diện giúp người dùng thao tác với Active Key Row. — `features/active-keys/components/ActiveKeyRow.tsx:11`
- Tạo mới Create Key Modal: Phần giao diện giúp người dùng thao tác với Create Key Modal. — `features/active-keys/components/CreateKeyModal.tsx:22`
#### File Chính
- Constants: `features/active-keys/constants.ts`
- TíNh NăNg: `features/active-keys/index.tsx`
- TíNh NăNg: `features/active-keys/types.ts`
- Active Key Card: `features/active-keys/components/ActiveKeyCard.tsx`
- Active Key Row: `features/active-keys/components/ActiveKeyRow.tsx`
- Create Key Modal: `features/active-keys/components/CreateKeyModal.tsx`
#### Liên Kết Sang Module Khác
- Active Keys → Shared: gọi xử lý
- Active Keys → Content: gọi xử lý
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Active Keys → Ui: hiển thị
- Active Keys → Shared: gọi xử lý
- Active Keys → Content: gọi xử lý
- Active Keys → Shared: gọi xử lý
- Active Keys → Content: gọi xử lý
- Active Keys → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Active Keys: hiển thị
### Add Mcoin
- Module ID: module:features/add-mcoin
- Dùng để: Nhóm chức năng add mcoin. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/add-mcoin
#### Nhánh/Bước Chính
- format Coin Amount: Bước xử lý liên quan tới format Coin Amount. — `features/add-mcoin/constants.ts:30`
- format Coin Date: Bước xử lý liên quan tới format Coin Date. — `features/add-mcoin/constants.ts:34`
- Tạo mới Add Coin Modal: Phần giao diện giúp người dùng thao tác với Add Coin Modal. — `features/add-mcoin/index.tsx:17`
- Tạo mới Add Mcoin: Phần giao diện giúp người dùng thao tác với Add Mcoin. — `features/add-mcoin/index.tsx:150`
#### File Chính
- Constants: `features/add-mcoin/constants.ts`
- TíNh NăNg: `features/add-mcoin/index.tsx`
- TíNh NăNg: `features/add-mcoin/types.ts`
#### Liên Kết Sang Module Khác
- Add Mcoin → Notifications: gọi xử lý
- Add Mcoin → Ui: hiển thị
- Add Mcoin → Ui: hiển thị
- Add Mcoin → Ui: hiển thị
- Add Mcoin → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Add Mcoin: hiển thị
### Quản lý phân quyền
- Module ID: module:features/auth
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới phân quyền. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/auth
#### Nhánh/Bước Chính
- phân quyền: Phần giao diện giúp người dùng thao tác với phân quyền. — `features/auth/components/LoginBackground.tsx:7`
- phân quyền: Phần giao diện giúp người dùng thao tác với phân quyền. — `features/auth/components/LoginCard.tsx:11`
- phân quyền: Phần giao diện giúp người dùng thao tác với phân quyền. — `features/auth/components/LoginForm.tsx:17`
- phân quyền: Lấy và quản lý dữ liệu liên quan tới phân quyền. — `features/auth/hooks/useLogin.ts:20`
- phân quyền: Phần giao diện giúp người dùng thao tác với phân quyền. — `features/auth/pages/LoginPage.tsx:13`
#### File Chính
- TíNh NăNg: `features/auth/index.tsx`
- Login Background: `features/auth/components/LoginBackground.tsx`
- Login Card: `features/auth/components/LoginCard.tsx`
- Form phân quyền: `features/auth/components/LoginForm.tsx`
- Use Login: `features/auth/hooks/useLogin.ts`
- Màn hình phân quyền: `features/auth/pages/LoginPage.tsx`
#### Liên Kết Sang Module Khác
- Quản lý phân quyền → Shared: dùng dữ liệu từ
- Quản lý phân quyền → Quản lý phân quyền: dùng dữ liệu từ
- Quản lý phân quyền → Quản lý phân quyền: gọi xử lý
- Quản lý phân quyền → Shared: gọi xử lý
- Quản lý phân quyền → Content: gọi xử lý
- Quản lý phân quyền → Content: gọi xử lý
#### Module Khác Gọi Vào
- App → Quản lý phân quyền: hiển thị
### Quản lý đơn hàng
- Module ID: module:features/bill-order
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới đơn hàng. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/bill-order
#### Nhánh/Bước Chính
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/bill-order/helpers.ts:35`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/bill-order/helpers.ts:43`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/bill-order/helpers.ts:46`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/bill-order/helpers.ts:56`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/bill-order/helpers.ts:70`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/bill-order/helpers.ts:92`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/bill-order/helpers.ts:97`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/bill-order/helpers.ts:134`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/bill-order/index.tsx:28`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/bill-order/components/BillOrderForm.tsx:14`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/bill-order/components/InvoicePreview.tsx:24`
#### File Chính
- Helpers: `features/bill-order/helpers.ts`
- TíNh NăNg: `features/bill-order/index.tsx`
- Form đơn hàng: `features/bill-order/components/BillOrderForm.tsx`
- Invoice Preview: `features/bill-order/components/InvoicePreview.tsx`
#### Liên Kết Sang Module Khác
- Quản lý đơn hàng → Quản lý người dùng: gọi xử lý
- Quản lý đơn hàng → Shared: gọi xử lý
- Quản lý đơn hàng → Content: gọi xử lý
- Quản lý đơn hàng → Shared: gọi xử lý
- Quản lý đơn hàng → Content: gọi xử lý
- Quản lý đơn hàng → Quản lý giá: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Quản lý đơn hàng: hiển thị
- Modals → Quản lý đơn hàng: gọi xử lý
### Content
- Module ID: module:features/content
- Dùng để: Nhóm chức năng content. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/content
#### Nhánh/Bước Chính
- Xem/Tìm fetch Categories: Bước này dùng để xem/tìm fetch Categories. — `features/content/api/contentApi.ts:15`
- Tạo mới danh mục: Bước này dùng để tạo mới danh mục. — `features/content/api/contentApi.ts:21`
- Cập nhật danh mục: Bước này dùng để cập nhật danh mục. — `features/content/api/contentApi.ts:31`
- Xóa danh mục: Bước này dùng để xóa danh mục. — `features/content/api/contentApi.ts:41`
- Xem/Tìm fetch Articles: Bước này dùng để xem/tìm fetch Articles. — `features/content/api/contentApi.ts:55`
- Xem/Tìm fetch Article: Bước này dùng để xem/tìm fetch Article. — `features/content/api/contentApi.ts:74`
- Tạo mới create Article: Bước này dùng để tạo mới create Article. — `features/content/api/contentApi.ts:90`
- Cập nhật update Article: Bước này dùng để cập nhật update Article. — `features/content/api/contentApi.ts:100`
- Xóa delete Article: Bước này dùng để xóa delete Article. — `features/content/api/contentApi.ts:110`
- Xem/Tìm fetch Banners: Bước này dùng để xem/tìm fetch Banners. — `features/content/api/contentApi.ts:117`
- Tạo mới create Banner: Bước này dùng để tạo mới create Banner. — `features/content/api/contentApi.ts:123`
- Cập nhật update Banner: Bước này dùng để cập nhật update Banner. — `features/content/api/contentApi.ts:133`
- toggle Banner: Bước xử lý liên quan tới toggle Banner. — `features/content/api/contentApi.ts:146`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/content/api/contentApi.ts:152`
- Xóa delete Banner: Bước này dùng để xóa delete Banner. — `features/content/api/contentApi.ts:162`
- json: Bước xử lý liên quan tới json. — `features/content/api/contentApi.ts:4`
- throw If Err: Bước xử lý liên quan tới throw If Err. — `features/content/api/contentApi.ts:6`
- Xem/Tìm fetch Article Images: Bước này dùng để xem/tìm fetch Article Images. — `features/content/api/contentMediaApi.ts:13`
- Nhập dữ liệu upload Article Image: Bước này dùng để nhập dữ liệu upload Article Image. — `features/content/api/contentMediaApi.ts:30`
- Article Image Insert Modal: Phần giao diện giúp người dùng thao tác với Article Image Insert Modal. — `features/content/components/ArticleImageInsertModal.tsx:24`
- Article Preview Modal: Phần giao diện giúp người dùng thao tác với Article Preview Modal. — `features/content/components/ArticlePreviewModal.tsx:14`
- Toolbar Button: Phần giao diện giúp người dùng thao tác với Toolbar Button. — `features/content/components/ArticleRichEditor.tsx:36`
- Article Rich Editor: Phần giao diện giúp người dùng thao tác với Article Rich Editor. — `features/content/components/ArticleRichEditor.tsx:63`
- Article Seo Review: Phần giao diện giúp người dùng thao tác với Article Seo Review. — `features/content/components/ArticleSeoReview.tsx:31`
- Article Categories Page: Phần giao diện giúp người dùng thao tác với Article Categories Page. — `features/content/pages/ArticleCategoriesPage.tsx:23`
- Articles Page: Phần giao diện giúp người dùng thao tác với Articles Page. — `features/content/pages/ArticlesPage.tsx:19`
- Banners Page: Phần giao diện giúp người dùng thao tác với Banners Page. — `features/content/pages/BannersPage.tsx:24`
- Tạo mới Create Article Page: Phần giao diện giúp người dùng thao tác với Create Article Page. — `features/content/pages/CreateArticlePage.tsx:12`
- strip Html: Bước xử lý liên quan tới strip Html. — `features/content/utils/articleSeoReview.ts:10`
- count Words: Bước xử lý liên quan tới count Words. — `features/content/utils/articleSeoReview.ts:19`
#### File Chính
- TíNh NăNg: `features/content/types.ts`
- Xử lý dữ liệu: `features/content/api/contentApi.ts`
- Xử lý dữ liệu: `features/content/api/contentMediaApi.ts`
- Article Image Insert Modal: `features/content/components/ArticleImageInsertModal.tsx`
- Article Preview Modal: `features/content/components/ArticlePreviewModal.tsx`
- Article Rich Editor: `features/content/components/ArticleRichEditor.tsx`
- Article Seo Review: `features/content/components/ArticleSeoReview.tsx`
- Mock Content: `features/content/data/mockContent.ts`
- Màn hình tính năng: `features/content/pages/ArticleCategoriesPage.tsx`
- Màn hình tính năng: `features/content/pages/ArticlesPage.tsx`
- Màn hình tính năng: `features/content/pages/BannersPage.tsx`
- Màn hình tính năng: `features/content/pages/CreateArticlePage.tsx`
- Article Seo Review: `features/content/utils/articleSeoReview.ts`
- Slugify: `features/content/utils/slugify.ts`
- Danh sách dữ liệu: `features/content/pages/banners-page/BannerList.tsx`
- Form nhập liệu: `features/content/pages/banners-page/form.ts`
- Form nhập liệu: `features/content/pages/banners-page/HeroFormFields.tsx`
#### Liên Kết Sang Module Khác
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
- Content → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Quản lý phân quyền → Content: gọi xử lý
- Quản lý người dùng → Content: gọi xử lý
- Quản lý danh mục → Content: gọi xử lý
- Quản lý danh mục → Content: gọi xử lý
- Quản lý danh mục → Content: gọi xử lý
- Error Handler → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
- Forms → Content: gọi xử lý
### Credit
- Module ID: module:features/credit
- Dùng để: Nhóm chức năng credit. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/credit
#### Nhánh/Bước Chính
- Credit Logs Page: Phần giao diện giúp người dùng thao tác với Credit Logs Page. — `features/credit/index.tsx:7`
- Tạo mới submit Credit Log Action: Bước này dùng để tạo mới submit Credit Log Action. — `features/credit/api/creditLogsApi.ts:21`
- Credit Cashout Stk Modal: Phần giao diện giúp người dùng thao tác với Credit Cashout Stk Modal. — `features/credit/components/CreditCashoutStkModal.tsx:17`
- Credit Filters Bar: Phần giao diện giúp người dùng thao tác với Credit Filters Bar. — `features/credit/components/CreditFiltersBar.tsx:23`
- Credit Stats Section: Phần giao diện giúp người dùng thao tác với Credit Stats Section. — `features/credit/components/CreditStatsSection.tsx:54`
- Action Buttons: Phần giao diện giúp người dùng thao tác với Action Buttons. — `features/credit/components/CreditTableBlock.tsx:26`
- Credit Card: Phần giao diện giúp người dùng thao tác với Credit Card. — `features/credit/components/CreditTableBlock.tsx:61`
- Empty State: Phần giao diện giúp người dùng thao tác với Empty State. — `features/credit/components/CreditTableBlock.tsx:102`
- Credit Table Block: Phần giao diện giúp người dùng thao tác với Credit Table Block. — `features/credit/components/CreditTableBlock.tsx:110`
- Credit Table Section: Phần giao diện giúp người dùng thao tác với Credit Table Section. — `features/credit/components/CreditTableSection.tsx:15`
- use Credit Logs Fetch: Lấy và quản lý dữ liệu liên quan tới use Credit Logs Fetch. — `features/credit/hooks/useCreditLogsFetch.ts:49`
- build Query: Bước xử lý liên quan tới build Query. — `features/credit/hooks/useCreditLogsFetch.ts:39`
- use Credit Logs List: Lấy và quản lý dữ liệu liên quan tới use Credit Logs List. — `features/credit/hooks/useCreditLogsList.ts:6`
- format Money Vnd: Bước xử lý liên quan tới format Money Vnd. — `features/credit/utils/creditTransform.ts:3`
- format Date Time: Bước xử lý liên quan tới format Date Time. — `features/credit/utils/creditTransform.ts:8`
- resolve Availability Text: Bước xử lý liên quan tới resolve Availability Text. — `features/credit/utils/creditTransform.ts:15`
- resolve Availability Class: Bước xử lý liên quan tới resolve Availability Class. — `features/credit/utils/creditTransform.ts:21`
- resolve Credit Status Text: Bước xử lý liên quan tới resolve Credit Status Text. — `features/credit/utils/creditTransform.ts:31`
- resolve Credit Status Class: Bước xử lý liên quan tới resolve Credit Status Class. — `features/credit/utils/creditTransform.ts:41`
#### File Chính
- TíNh NăNg: `features/credit/index.tsx`
- TíNh NăNg: `features/credit/types.ts`
- Xử lý dữ liệu: `features/credit/api/creditLogsApi.ts`
- Credit Cashout Stk Modal: `features/credit/components/CreditCashoutStkModal.tsx`
- Credit Filters Bar: `features/credit/components/CreditFiltersBar.tsx`
- Credit Stats Section: `features/credit/components/CreditStatsSection.tsx`
- Danh sách dữ liệu: `features/credit/components/CreditTableBlock.tsx`
- Danh sách dữ liệu: `features/credit/components/CreditTableSection.tsx`
- Use Credit Logs Fetch: `features/credit/hooks/useCreditLogsFetch.ts`
- Danh sách dữ liệu: `features/credit/hooks/useCreditLogsList.ts`
- Form nhập liệu: `features/credit/utils/creditTransform.ts`
#### Liên Kết Sang Module Khác
- Credit → Shared: gọi xử lý
- Credit → Content: gọi xử lý
- Credit → Quản lý người dùng: gọi xử lý
- Credit → Ui: hiển thị
- Credit → Ui: hiển thị
- Credit → Ui: hiển thị
- Credit → Shared: gọi xử lý
- Credit → Content: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Credit: hiển thị
### Ctv List
- Module ID: module:features/ctv-list
- Dùng để: Nhóm chức năng ctv list. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/ctv-list
#### Nhánh/Bước Chính
- sort Ctv List: Bước xử lý liên quan tới sort Ctv List. — `features/ctv-list/constants.ts:28`
- format Ctv Currency: Bước xử lý liên quan tới format Ctv Currency. — `features/ctv-list/constants.ts:126`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/ctv-list/index.tsx:15`
- Ctv List: Phần giao diện giúp người dùng thao tác với Ctv List. — `features/ctv-list/index.tsx:46`
- Ctv Card: Phần giao diện giúp người dùng thao tác với Ctv Card. — `features/ctv-list/components/CtvCard.tsx:21`
- Ctv Row: Phần giao diện giúp người dùng thao tác với Ctv Row. — `features/ctv-list/components/CtvRow.tsx:21`
#### File Chính
- Constants: `features/ctv-list/constants.ts`
- TíNh NăNg: `features/ctv-list/index.tsx`
- TíNh NăNg: `features/ctv-list/types.ts`
- Ctv Card: `features/ctv-list/components/CtvCard.tsx`
- Ctv Row: `features/ctv-list/components/CtvRow.tsx`
#### Liên Kết Sang Module Khác
- Ctv List → Shared: gọi xử lý
- Ctv List → Content: gọi xử lý
- Ctv List → Ui: hiển thị
- Ctv List → Ui: hiển thị
- Ctv List → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Ctv List: hiển thị
### Quản lý báo cáo
- Module ID: module:features/dashboard
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới báo cáo. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/dashboard
#### Nhánh/Bước Chính
- Xem/Tìm báo cáo: Bước này dùng để xem/tìm báo cáo. — `features/dashboard/api/dashboardApi.ts:100`
- Xem/Tìm báo cáo: Bước này dùng để xem/tìm báo cáo. — `features/dashboard/api/dashboardApi.ts:180`
- Xem/Tìm báo cáo: Bước này dùng để xem/tìm báo cáo. — `features/dashboard/api/dashboardApi.ts:193`
- Xem/Tìm báo cáo: Bước này dùng để xem/tìm báo cáo. — `features/dashboard/api/dashboardApi.ts:221`
- Xem/Tìm báo cáo: Bước này dùng để xem/tìm báo cáo. — `features/dashboard/api/dashboardApi.ts:235`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/api/dashboardApi.ts:133`
- Tạo mới báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/AddGoalModal.tsx:13`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/BudgetRow.tsx:9`
- Tính toán báo cáo: Bước này dùng để tính toán báo cáo. — `features/dashboard/components/BudgetsGoals.tsx:29`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/BudgetsGoals.tsx:37`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/DashboardCyclePresetButtons.tsx:7`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/DashboardCyclePresetButtons.tsx:25`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/DashboardCyclePresetButtons.tsx:30`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/DashboardCyclePresetButtons.tsx:41`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/DashboardCyclePresetButtons.tsx:54`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/DashboardCyclePresetButtons.tsx:66`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/DashboardCyclePresetButtons.tsx:82`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/DashboardDateRangeFilter.tsx:21`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/DashboardDateRangeFilter.tsx:40`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/DashboardHero.tsx:8`
- Cập nhật báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/EditGoalAmountModal.tsx:14`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/FinanceSection.tsx:34`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/FinanceSummaryCard.tsx:13`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/FinancialChartsPanel.tsx:45`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/FinancialChartsPanel.tsx:99`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/FinancialChartsPanel.tsx:149`
- Hiển thị báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/FinancialChartsPanel.tsx:154`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/FinancialChartsPanel.tsx:172`
- báo cáo: Phần giao diện giúp người dùng thao tác với báo cáo. — `features/dashboard/components/GoalRing.tsx:8`
- báo cáo: Bước xử lý liên quan tới báo cáo. — `features/dashboard/components/MonthlySummaryTable.tsx:14`
#### File Chính
- Constants: `features/dashboard/constants.ts`
- Xử lý dữ liệu báo cáo: `features/dashboard/api/dashboardApi.ts`
- TíNh NăNg: `features/dashboard/api/index.ts`
- Add Goal Modal: `features/dashboard/components/AddGoalModal.tsx`
- Budget Row: `features/dashboard/components/BudgetRow.tsx`
- Budgets Goals: `features/dashboard/components/BudgetsGoals.tsx`
- Dashboard Cycle Preset Buttons: `features/dashboard/components/DashboardCyclePresetButtons.tsx`
- Dashboard Date Range Filter: `features/dashboard/components/DashboardDateRangeFilter.tsx`
- Dashboard Hero: `features/dashboard/components/DashboardHero.tsx`
- Edit Goal Amount Modal: `features/dashboard/components/EditGoalAmountModal.tsx`
- Finance Section: `features/dashboard/components/FinanceSection.tsx`
- Finance Summary Card: `features/dashboard/components/FinanceSummaryCard.tsx`
- Financial Charts Panel: `features/dashboard/components/FinancialChartsPanel.tsx`
- Goal Ring: `features/dashboard/components/GoalRing.tsx`
- Danh sách báo cáo: `features/dashboard/components/MonthlySummaryTable.tsx`
- Order Chart Card: `features/dashboard/components/OrderChartCard.tsx`
- Overview Section: `features/dashboard/components/OverviewSection.tsx`
- Overview Stats: `features/dashboard/components/OverviewStats.tsx`
- Profit Chart Card: `features/dashboard/components/ProfitChartCard.tsx`
- Revenue Chart Card: `features/dashboard/components/RevenueChartCard.tsx`
#### Liên Kết Sang Module Khác
- Quản lý báo cáo → Shared: gọi xử lý
- Quản lý báo cáo → Content: gọi xử lý
- Quản lý báo cáo → Shared: gọi xử lý
- Quản lý báo cáo → Content: gọi xử lý
- Quản lý báo cáo → Shared: gọi xử lý
- Quản lý báo cáo → Content: gọi xử lý
- Quản lý báo cáo → Shared: gọi xử lý
- Quản lý báo cáo → Content: gọi xử lý
- Quản lý báo cáo → Shared: gọi xử lý
- Quản lý báo cáo → Content: gọi xử lý
- Quản lý báo cáo → Shared: gọi xử lý
- Quản lý báo cáo → Content: gọi xử lý
#### Module Khác Gọi Vào
- Quản lý đơn hàng → Quản lý báo cáo: hiển thị
- Expenses → Quản lý báo cáo: gọi xử lý
- Expenses → Quản lý báo cáo: gọi xử lý
- Expenses → Quản lý báo cáo: gọi xử lý
- Expenses → Quản lý báo cáo: gọi xử lý
- Expenses → Quản lý báo cáo: gọi xử lý
### Form Info
- Module ID: module:features/form-info
- Dùng để: Nhóm chức năng form info. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/form-info
#### Nhánh/Bước Chính
- Tạo mới Create Form Modal: Phần giao diện giúp người dùng thao tác với Create Form Modal. — `features/form-info/CreateFormModal.tsx:14`
- Tạo mới Create Input Modal: Phần giao diện giúp người dùng thao tác với Create Input Modal. — `features/form-info/CreateInputModal.tsx:25`
- Cập nhật Edit Form Modal: Phần giao diện giúp người dùng thao tác với Edit Form Modal. — `features/form-info/EditFormModal.tsx:21`
- Form Info: Phần giao diện giúp người dùng thao tác với Form Info. — `features/form-info/index.tsx:10`
- Form Detail Modal: Phần giao diện giúp người dùng thao tác với Form Detail Modal. — `features/form-info/components/FormDetailModal.tsx:12`
- normalize Id: Bước xử lý liên quan tới normalize Id. — `features/form-info/components/FormInputSelectSection.tsx:15`
- Form Input Select Section: Phần giao diện giúp người dùng thao tác với Form Input Select Section. — `features/form-info/components/FormInputSelectSection.tsx:20`
- Form List Section: Phần giao diện giúp người dùng thao tác với Form List Section. — `features/form-info/components/FormListSection.tsx:21`
- Form Tabs: Phần giao diện giúp người dùng thao tác với Form Tabs. — `features/form-info/components/FormTabs.tsx:8`
- Input List Section: Phần giao diện giúp người dùng thao tác với Input List Section. — `features/form-info/components/InputListSection.tsx:13`
- use Form Info: Lấy và quản lý dữ liệu liên quan tới use Form Info. — `features/form-info/hooks/useFormInfo.ts:13`
#### File Chính
- Form nhập liệu: `features/form-info/CreateFormModal.tsx`
- Create Input Modal: `features/form-info/CreateInputModal.tsx`
- Form nhập liệu: `features/form-info/EditFormModal.tsx`
- TíNh NăNg: `features/form-info/index.tsx`
- TíNh NăNg: `features/form-info/types.ts`
- Form nhập liệu: `features/form-info/components/FormDetailModal.tsx`
- Form nhập liệu: `features/form-info/components/FormInputSelectSection.tsx`
- Form nhập liệu: `features/form-info/components/FormListSection.tsx`
- Form nhập liệu: `features/form-info/components/FormTabs.tsx`
- Danh sách dữ liệu: `features/form-info/components/InputListSection.tsx`
- Form nhập liệu: `features/form-info/hooks/useFormInfo.ts`
#### Liên Kết Sang Module Khác
- Form Info → Forms: gọi xử lý
- Form Info → Ui: hiển thị
- Form Info → Forms: gọi xử lý
- Form Info → Ui: hiển thị
- Form Info → Forms: gọi xử lý
- Form Info → Forms: gọi xử lý
- Form Info → Ui: hiển thị
- Form Info → Quản lý sản phẩm: hiển thị
- Form Info → Ui: hiển thị
- Form Info → Ui: hiển thị
- Form Info → Ui: hiển thị
- Form Info → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Form Info: hiển thị
### Quản lý hóa đơn
- Module ID: module:features/invoices
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới hóa đơn. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/invoices
#### Nhánh/Bước Chính
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:39`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:44`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:49`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:57`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:60`
- danh mục: Bước xử lý liên quan tới danh mục. — `features/invoices/helpers.ts:78`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:125`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:132`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:139`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:146`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/helpers.ts:175`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/index.tsx:29`
- danh mục: Phần giao diện giúp người dùng thao tác với danh mục. — `features/invoices/components/CategoryToggle.tsx:10`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/FiltersBar.tsx:27`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/QrModal.tsx:10`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/ReceiptDetailModal.tsx:13`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/ReceiptsTable.tsx:28`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/StatsGrid.tsx:15`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/components/qr-modal/helpers.ts:1`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/components/qr-modal/helpers.ts:3`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/invoices/components/qr-modal/parseBatchOrderCodes.ts:4`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/invoices/components/qr-modal/parseBatchOrderCodes.ts:12`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/components/qr-modal/parseBatchTransactionCodes.ts:4`
- hóa đơn: Bước xử lý liên quan tới hóa đơn. — `features/invoices/components/qr-modal/parseBatchTransactionCodes.ts:13`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/qr-modal/QrBatchToolsPanel.tsx:34`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/qr-modal/QrPreviewPanel.tsx:11`
- hóa đơn: Lấy và quản lý dữ liệu liên quan tới hóa đơn. — `features/invoices/components/qr-modal/useQrModalController.ts:18`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/receipts-table/ReceiptsExpandedDetailsRow.tsx:20`
- hóa đơn: Phần giao diện giúp người dùng thao tác với hóa đơn. — `features/invoices/components/receipts-table/ReceiptsMatchConfirmModal.tsx:14`
#### File Chính
- Helpers: `features/invoices/helpers.ts`
- TíNh NăNg: `features/invoices/index.tsx`
- Category Toggle: `features/invoices/components/CategoryToggle.tsx`
- Filters Bar: `features/invoices/components/FiltersBar.tsx`
- Qr Modal: `features/invoices/components/QrModal.tsx`
- Receipt Detail Modal: `features/invoices/components/ReceiptDetailModal.tsx`
- Danh sách hóa đơn: `features/invoices/components/ReceiptsTable.tsx`
- Stats Grid: `features/invoices/components/StatsGrid.tsx`
- Helpers: `features/invoices/components/qr-modal/helpers.ts`
- Parse Batch Order Codes: `features/invoices/components/qr-modal/parseBatchOrderCodes.test.ts`
- Parse Batch Order Codes: `features/invoices/components/qr-modal/parseBatchOrderCodes.ts`
- Parse Batch Transaction Codes: `features/invoices/components/qr-modal/parseBatchTransactionCodes.test.ts`
- Parse Batch Transaction Codes: `features/invoices/components/qr-modal/parseBatchTransactionCodes.ts`
- Qr Batch Tools Panel: `features/invoices/components/qr-modal/QrBatchToolsPanel.tsx`
- Qr Preview Panel: `features/invoices/components/qr-modal/QrPreviewPanel.tsx`
- TíNh NăNg: `features/invoices/components/qr-modal/types.ts`
- Use Qr Modal Controller: `features/invoices/components/qr-modal/useQrModalController.ts`
- Receipts Expanded Details Row: `features/invoices/components/receipts-table/ReceiptsExpandedDetailsRow.tsx`
- Receipts Match Confirm Modal: `features/invoices/components/receipts-table/ReceiptsMatchConfirmModal.tsx`
#### Liên Kết Sang Module Khác
- Quản lý hóa đơn → Shared: gọi xử lý
- Quản lý hóa đơn → Quản lý người dùng: gọi xử lý
- Quản lý hóa đơn → Quản lý người dùng: gọi xử lý
- Quản lý hóa đơn → Shared: gọi xử lý
- Quản lý hóa đơn → Shared: gọi xử lý
- Quản lý hóa đơn → Content: gọi xử lý
- Quản lý hóa đơn → Content: gọi xử lý
- Quản lý hóa đơn → Shared: gọi xử lý
- Quản lý hóa đơn → Shared: gọi xử lý
- Quản lý hóa đơn → Ui: gọi xử lý
- Quản lý hóa đơn → Ui: gọi xử lý
- Quản lý hóa đơn → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Quản lý hóa đơn: hiển thị
- Quản lý báo cáo → Quản lý hóa đơn: gọi xử lý
- Quản lý báo cáo → Quản lý hóa đơn: gọi xử lý
- Quản lý báo cáo → Quản lý hóa đơn: gọi xử lý
- Quản lý báo cáo → Quản lý hóa đơn: gọi xử lý
### Ip Whitelist
- Module ID: module:features/ip-whitelist
- Dùng để: Nhóm chức năng ip whitelist. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/ip-whitelist
#### Nhánh/Bước Chính
- parse Response: Bước xử lý liên quan tới parse Response. — `features/ip-whitelist/api/ipWhitelistApi.ts:58`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `features/ip-whitelist/api/ipWhitelistApi.ts:75`
- Tạo mới sản phẩm: Bước này dùng để tạo mới sản phẩm. — `features/ip-whitelist/api/ipWhitelistApi.ts:88`
- Cập nhật sản phẩm: Bước này dùng để cập nhật sản phẩm. — `features/ip-whitelist/api/ipWhitelistApi.ts:102`
- Xóa sản phẩm: Bước này dùng để xóa sản phẩm. — `features/ip-whitelist/api/ipWhitelistApi.ts:117`
- phân quyền: Bước xử lý liên quan tới phân quyền. — `features/ip-whitelist/api/ipWhitelistApi.ts:14`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/ip-whitelist/api/ipWhitelistApi.ts:20`
- read Error Message: Bước xử lý liên quan tới read Error Message. — `features/ip-whitelist/api/ipWhitelistApi.ts:41`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/ip-whitelist/api/siteMaintenanceApi.ts:51`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `features/ip-whitelist/api/siteMaintenanceApi.ts:68`
- Cập nhật sản phẩm: Bước này dùng để cập nhật sản phẩm. — `features/ip-whitelist/api/siteMaintenanceApi.ts:73`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/ip-whitelist/api/siteMaintenanceApi.ts:10`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/ip-whitelist/api/siteMaintenanceApi.ts:16`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/ip-whitelist/api/siteMaintenanceApi.ts:34`
- Xóa Delete Ip Whitelist Modal: Phần giao diện giúp người dùng thao tác với Delete Ip Whitelist Modal. — `features/ip-whitelist/components/DeleteIpWhitelistModal.tsx:13`
- Ip Whitelist Form Modal: Phần giao diện giúp người dùng thao tác với Ip Whitelist Form Modal. — `features/ip-whitelist/components/IpWhitelistFormModal.tsx:15`
- Ip Whitelist Table: Phần giao diện giúp người dùng thao tác với Ip Whitelist Table. — `features/ip-whitelist/components/IpWhitelistTable.tsx:34`
- format Date Time: Bước xử lý liên quan tới format Date Time. — `features/ip-whitelist/components/IpWhitelistTable.tsx:18`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/ip-whitelist/components/SiteMaintenancePanel.tsx:33`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/ip-whitelist/components/SiteMaintenancePanel.tsx:19`
- Ip Whitelist Page: Phần giao diện giúp người dùng thao tác với Ip Whitelist Page. — `features/ip-whitelist/pages/IpWhitelistPage.tsx:34`
#### File Chính
- TíNh NăNg: `features/ip-whitelist/types.ts`
- Danh sách dữ liệu: `features/ip-whitelist/api/ipWhitelistApi.ts`
- Xử lý dữ liệu sản phẩm: `features/ip-whitelist/api/siteMaintenanceApi.ts`
- Danh sách dữ liệu: `features/ip-whitelist/components/DeleteIpWhitelistModal.tsx`
- Form nhập liệu: `features/ip-whitelist/components/IpWhitelistFormModal.tsx`
- Danh sách dữ liệu: `features/ip-whitelist/components/IpWhitelistTable.tsx`
- Site Maintenance Panel: `features/ip-whitelist/components/SiteMaintenancePanel.tsx`
- Màn hình tính năng: `features/ip-whitelist/pages/IpWhitelistPage.tsx`
#### Liên Kết Sang Module Khác
- Ip Whitelist → Content: gọi xử lý
- Ip Whitelist → Shared: gọi xử lý
- Ip Whitelist → Shared: gọi xử lý
- Ip Whitelist → Shared: gọi xử lý
- Ip Whitelist → Shared: gọi xử lý
- Ip Whitelist → Content: gọi xử lý
- Ip Whitelist → Content: gọi xử lý
- Ip Whitelist → Shared: gọi xử lý
- Ip Whitelist → Shared: gọi xử lý
- Ip Whitelist → Content: gọi xử lý
- Ip Whitelist → Ui: hiển thị
- Ip Whitelist → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Ip Whitelist: hiển thị
### Quản lý đơn hàng
- Module ID: module:features/orders
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới đơn hàng. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/orders
#### Nhánh/Bước Chính
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/index.tsx:17`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/api/ensureOrderTransaction.ts:11`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrderCard.tsx:41`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrdersDatasetTabs.tsx:13`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrdersFiltersBar.tsx:26`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrdersPageHeader.tsx:6`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrdersPagination.tsx:11`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrdersStatsSection.tsx:23`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrdersTableSection.tsx:38`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/orders/components/OrdersTableSection.tsx:47`
- đơn hàng: Lấy và quản lý dữ liệu liên quan tới đơn hàng. — `features/orders/hooks/useDebounce.ts:3`
- đơn hàng: Lấy và quản lý dữ liệu liên quan tới đơn hàng. — `features/orders/hooks/useOrderActions.ts:19`
- đơn hàng: Lấy và quản lý dữ liệu liên quan tới đơn hàng. — `features/orders/hooks/useOrdersData.ts:14`
- đơn hàng: Lấy và quản lý dữ liệu liên quan tới đơn hàng. — `features/orders/hooks/useOrdersFetch.ts:5`
- đơn hàng: Lấy và quản lý dữ liệu liên quan tới đơn hàng. — `features/orders/hooks/useOrdersList.ts:28`
- đơn hàng: Lấy và quản lý dữ liệu liên quan tới đơn hàng. — `features/orders/hooks/useOrdersModals.ts:17`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/exportFilteredOrders.ts:4`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/exportFilteredOrders.ts:9`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/exportFilteredOrders.ts:18`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/exportFilteredOrders.ts:27`
- Xuất dữ liệu đơn hàng: Bước này dùng để xuất dữ liệu đơn hàng. — `features/orders/utils/exportFilteredOrders.ts:64`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/orderCodeTheme.ts:167`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `features/orders/utils/orderCodeTheme.ts:177`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/orderListTransform.ts:35`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/orderListTransform.ts:153`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/orderListTransform.ts:295`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/orderListTransform.ts:358`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `features/orders/utils/orderListTransform.ts:401`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/orderListTransform.ts:414`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/orders/utils/orderListTransform.ts:148`
#### File Chính
- Constants: `features/orders/constants.ts`
- TíNh NăNg: `features/orders/index.tsx`
- TíNh NăNg: `features/orders/types.ts`
- Ensure Order Transaction: `features/orders/api/ensureOrderTransaction.ts`
- Order Card: `features/orders/components/OrderCard.tsx`
- Order Row: `features/orders/components/OrderRow.tsx`
- Orders Dataset Tabs: `features/orders/components/OrdersDatasetTabs.tsx`
- Orders Filters Bar: `features/orders/components/OrdersFiltersBar.tsx`
- Màn hình đơn hàng: `features/orders/components/OrdersPageHeader.tsx`
- Orders Pagination: `features/orders/components/OrdersPagination.tsx`
- Orders Stats Section: `features/orders/components/OrdersStatsSection.tsx`
- Danh sách đơn hàng: `features/orders/components/OrdersTableSection.tsx`
- TíNh NăNg: `features/orders/hooks/index.ts`
- Use Debounce: `features/orders/hooks/useDebounce.ts`
- Use Order Actions: `features/orders/hooks/useOrderActions.ts`
- Use Orders Data: `features/orders/hooks/useOrdersData.ts`
- Use Orders Fetch: `features/orders/hooks/useOrdersFetch.ts`
- Danh sách đơn hàng: `features/orders/hooks/useOrdersList.ts`
- Use Orders Modals: `features/orders/hooks/useOrdersModals.ts`
- Export Filtered Orders: `features/orders/utils/exportFilteredOrders.ts`
#### Liên Kết Sang Module Khác
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý đơn hàng → Shared: gọi xử lý
- Quản lý đơn hàng → Content: gọi xử lý
- Quản lý đơn hàng → Shared: gọi xử lý
- Quản lý đơn hàng → Shared: gọi xử lý
- Quản lý đơn hàng → Quản lý báo cáo: hiển thị
- Quản lý đơn hàng → Ui: hiển thị
- Quản lý đơn hàng → Ui: hiển thị
- Quản lý đơn hàng → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Modals → Quản lý đơn hàng: dùng dữ liệu từ
- Routes → Quản lý đơn hàng: hiển thị
- Modals → Quản lý đơn hàng: gọi xử lý
- Quản lý kho → Quản lý đơn hàng: hiển thị
### Quản lý sản phẩm
- Module ID: module:features/package-product
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới sản phẩm. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/package-product
#### Nhánh/Bước Chính
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/PackageProduct.tsx:13`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/PackageCard.tsx:25`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/PackageRow.tsx:24`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/PackageTable.tsx:16`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/package-product/hooks/usePackageData.ts:29`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/package-product/hooks/usePackageDeleteActions.ts:15`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/package-product/hooks/usePackageMutationActions.ts:29`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/package-product/hooks/usePackageProductPage.ts:28`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/hooks/usePackageTemplateActions.ts:18`
- Cập nhật sản phẩm: Bước này dùng để cập nhật sản phẩm. — `features/package-product/hooks/usePackageTemplateActions.ts:59`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/hooks/usePackageTemplateActions.ts:77`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/package-product/hooks/usePackageTemplateActions.ts:89`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/sections/PackageStatsSection.tsx:16`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/sections/PackageSummarySection.tsx:44`
- Chọn sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/sections/SelectedPackageSection.tsx:36`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/utils/packageMatchUtils.test.ts:10`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/utils/packageMatchUtils.ts:34`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `features/package-product/utils/packageMatchUtils.ts:52`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `features/package-product/utils/packageMatchUtils.ts:57`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/utils/packageMatchUtils.ts:69`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/utils/packageMatchUtils.ts:114`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/utils/packageMatchUtils.ts:183`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/package-product/utils/packageMatchUtils.ts:23`
- Tạo mới sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/Modals/CreatePackageModal.tsx:24`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/Modals/ModalShell.tsx:13`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/Modals/PackageFormModal.tsx:28`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/Modals/PackageViewModal.tsx:25`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/Modals/PackageViewModal.tsx:35`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/Modals/PackageViewModal.tsx:61`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/package-product/components/Modals/PackageViewModal.tsx:99`
#### File Chính
- Constants: `features/package-product/constants.ts`
- TíNh NăNg: `features/package-product/index.tsx`
- Package Product: `features/package-product/PackageProduct.tsx`
- TíNh NăNg: `features/package-product/types.ts`
- Package Card: `features/package-product/components/PackageCard.tsx`
- Package Row: `features/package-product/components/PackageRow.tsx`
- Danh sách sản phẩm: `features/package-product/components/PackageTable.tsx`
- Use Package Data: `features/package-product/hooks/usePackageData.ts`
- Use Package Delete Actions: `features/package-product/hooks/usePackageDeleteActions.ts`
- Use Package Mutation Actions: `features/package-product/hooks/usePackageMutationActions.ts`
- Màn hình sản phẩm: `features/package-product/hooks/usePackageProductPage.ts`
- Use Package Template Actions: `features/package-product/hooks/usePackageTemplateActions.ts`
- TíNh NăNg: `features/package-product/sections/index.ts`
- Package Stats Section: `features/package-product/sections/PackageStatsSection.tsx`
- Package Summary Section: `features/package-product/sections/PackageSummarySection.tsx`
- Selected Package Section: `features/package-product/sections/SelectedPackageSection.tsx`
- Package Helpers: `features/package-product/utils/packageHelpers.ts`
- Package Match: `features/package-product/utils/packageMatchUtils.test.ts`
- Package Match: `features/package-product/utils/packageMatchUtils.ts`
- Create Package Modal: `features/package-product/components/Modals/CreatePackageModal.tsx`
#### Liên Kết Sang Module Khác
- Quản lý sản phẩm → Modals: hiển thị
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Error Handler: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Refresh Bus: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Notifications: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Quản lý sản phẩm: hiển thị
- Form Info → Quản lý sản phẩm: hiển thị
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
### Quản lý người dùng
- Module ID: module:features/payment-accounts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới người dùng. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/payment-accounts
#### Nhánh/Bước Chính
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/payment-accounts/components/PaymentAccountsTabs.tsx:13`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/payment-accounts/pages/PaymentAccountsPage.tsx:8`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/payment-accounts/pages/PaymentAccountsPage.tsx:12`
#### File Chính
- TíNh NăNg: `features/payment-accounts/types.ts`
- Payment Accounts Tabs: `features/payment-accounts/components/PaymentAccountsTabs.tsx`
- Màn hình người dùng: `features/payment-accounts/pages/PaymentAccountsPage.tsx`
#### Liên Kết Sang Module Khác
- Quản lý người dùng → Quản lý người dùng: hiển thị
- Quản lý người dùng → Usdt Wallets: hiển thị
#### Module Khác Gọi Vào
- Routes → Quản lý người dùng: hiển thị
### Quản lý giá
- Module ID: module:features/pricing
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới giá. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/pricing
#### Nhánh/Bước Chính
- giá: Phần giao diện giúp người dùng thao tác với giá. — `features/pricing/index.tsx:11`
- Tạo mới NCC: Bước này dùng để tạo mới NCC. — `features/pricing/utils.ts:19`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:39`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:45`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/pricing/utils.ts:50`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:59`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/pricing/utils.ts:68`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:79`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:85`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:95`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:103`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/pricing/utils.ts:112`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/pricing/utils.ts:137`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:149`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:151`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:159`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:163`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:178`
- Tính toán giá: Bước này dùng để tính toán giá. — `features/pricing/utils.ts:187`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/pricing/utils.ts:198`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:209`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:217`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:230`
- Tính toán giá: Bước này dùng để tính toán giá. — `features/pricing/utils.ts:238`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:260`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:284`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:289`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:297`
- giá: Bước xử lý liên quan tới giá. — `features/pricing/utils.ts:302`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/pricing/utils.ts:311`
#### File Chính
- TíNh NăNg: `features/pricing/index.tsx`
- Pricing: `features/pricing/Pricing.tsx`
- TíNh NăNg: `features/pricing/types.ts`
- TíNh NăNg: `features/pricing/utils.ts`
- Price Card: `features/pricing/components/PriceCard.tsx`
- Pricing Filters: `features/pricing/components/PricingFilters.tsx`
- Pricing Stats: `features/pricing/components/PricingStats.tsx`
- Product Edit Panel: `features/pricing/components/ProductEditPanel.tsx`
- Product Expanded Details: `features/pricing/components/ProductExpandedDetails.tsx`
- Product Row: `features/pricing/components/ProductRow.tsx`
- Product Row Contracts: `features/pricing/components/productRowContracts.ts`
- Danh sách sản phẩm: `features/pricing/components/ProductTable.tsx`
- Product Action Helpers: `features/pricing/hooks/productActionHelpers.ts`
- Supply Action Helpers: `features/pricing/hooks/supplyActionHelpers.ts`
- Use Delete Product Actions: `features/pricing/hooks/useDeleteProductActions.ts`
- Use Existing Supply Row Actions: `features/pricing/hooks/useExistingSupplyRowActions.ts`
- Use New Supply Row Actions: `features/pricing/hooks/useNewSupplyRowActions.ts`
- Use Pricing Data: `features/pricing/hooks/usePricingData.ts`
- Use Product Actions: `features/pricing/hooks/useProductActions.ts`
- Use Product Data: `features/pricing/hooks/useProductData.ts`
#### Liên Kết Sang Module Khác
- Quản lý giá → Quản lý sản phẩm: gọi xử lý
- Quản lý giá → Shared: gọi xử lý
- Quản lý giá → Content: gọi xử lý
- Quản lý giá → Shared: gọi xử lý
- Quản lý giá → Content: gọi xử lý
- Quản lý giá → Shared: gọi xử lý
- Quản lý giá → Content: gọi xử lý
- Quản lý giá → Shared: gọi xử lý
- Quản lý giá → Shared: gọi xử lý
- Quản lý giá → Content: gọi xử lý
- Quản lý giá → Shared: gọi xử lý
- Quản lý giá → Content: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Quản lý giá: hiển thị
- Quản lý đơn hàng → Quản lý giá: gọi xử lý
### Quản lý giá
- Module ID: module:features/pricing-seller
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới giá. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/pricing-seller
#### Nhánh/Bước Chính
- giá: Bước xử lý liên quan tới giá. — `features/pricing-seller/utils.ts:5`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/pricing-seller/utils.ts:10`
- Xem/Tìm giá: Bước này dùng để xem/tìm giá. — `features/pricing-seller/utils.ts:25`
- giá: Bước xử lý liên quan tới giá. — `features/pricing-seller/utils.ts:43`
- giá: Phần giao diện giúp người dùng thao tác với giá. — `features/pricing-seller/components/CategoryFilterPanel.tsx:9`
- giá: Phần giao diện giúp người dùng thao tác với giá. — `features/pricing-seller/components/SellerPricingTable.tsx:9`
- giá: Phần giao diện giúp người dùng thao tác với giá. — `features/pricing-seller/pages/PricingSellerPage.tsx:8`
#### File Chính
- TíNh NăNg: `features/pricing-seller/index.tsx`
- TíNh NăNg: `features/pricing-seller/types.ts`
- TíNh NăNg: `features/pricing-seller/utils.ts`
- Category Filter Panel: `features/pricing-seller/components/CategoryFilterPanel.tsx`
- Danh sách giá: `features/pricing-seller/components/SellerPricingTable.tsx`
- Màn hình giá: `features/pricing-seller/pages/PricingSellerPage.tsx`
#### Liên Kết Sang Module Khác
- Quản lý giá → Shared: gọi xử lý
- Quản lý giá → Content: gọi xử lý
#### Module Khác Gọi Vào
- App → Quản lý giá: hiển thị
### Quản lý sản phẩm
- Module ID: module:features/product-info
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới sản phẩm. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/product-info
#### Nhánh/Bước Chính
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/ProductInfo.tsx:24`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-info/components/CategoryTable.tsx:7`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/CategoryTable.tsx:20`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/CategoryTable.tsx:57`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/CategoryTagManager.tsx:12`
- Tạo mới sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/CreateCategoryModal.tsx:18`
- Tạo mới sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/CreateDescVariantModal.tsx:20`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/DescVariantEditModal.tsx:34`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/DescVariantViewModal.tsx:16`
- Cập nhật sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/EditCategoryModal.tsx:33`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/LinkModal.tsx:13`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ProductCard.tsx:27`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-info/components/ProductImagePicker.tsx:12`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ProductImagePicker.tsx:34`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ProductImagePicker.tsx:187`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ProductInfoHeader.tsx:10`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ProductRow.tsx:27`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ProductRow.tsx:49`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ProductTable.tsx:23`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-info/components/ViewModeToggle.tsx:17`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-info/hooks/useCategoryCreate.ts:25`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-info/hooks/useCategoryEdit.ts:29`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-info/hooks/useCategoryManagement.ts:25`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-info/hooks/useCategoryOptions.ts:13`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-info/hooks/useProductEdit.ts:29`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-info/hooks/useProductInfo.ts:39`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-info/hooks/useVariantContent.ts:13`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-info/utils/buildCategoryRows.ts:4`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-info/utils/categoryColors.ts:48`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-info/utils/categoryColors.ts:55`
#### File Chính
- TíNh NăNg: `features/product-info/index.ts`
- Product Info: `features/product-info/ProductInfo.tsx`
- TíNh NăNg: `features/product-info/types.ts`
- Danh sách sản phẩm: `features/product-info/components/CategoryTable.tsx`
- Category Tag Manager: `features/product-info/components/CategoryTagManager.tsx`
- Create Category Modal: `features/product-info/components/CreateCategoryModal.tsx`
- Create Desc Variant Modal: `features/product-info/components/CreateDescVariantModal.tsx`
- Desc Variant Edit Modal: `features/product-info/components/DescVariantEditModal.tsx`
- Desc Variant View Modal: `features/product-info/components/DescVariantViewModal.tsx`
- Edit Category Modal: `features/product-info/components/EditCategoryModal.tsx`
- Edit Product Modal: `features/product-info/components/EditProductModal.tsx`
- Link Modal: `features/product-info/components/LinkModal.tsx`
- Product Card: `features/product-info/components/ProductCard.tsx`
- Product Image Picker: `features/product-info/components/ProductImagePicker.tsx`
- Product Info Header: `features/product-info/components/ProductInfoHeader.tsx`
- Product Row: `features/product-info/components/ProductRow.tsx`
- Danh sách sản phẩm: `features/product-info/components/ProductTable.tsx`
- View Mode Toggle: `features/product-info/components/ViewModeToggle.tsx`
- Use Category Create: `features/product-info/hooks/useCategoryCreate.ts`
- Use Category Edit: `features/product-info/hooks/useCategoryEdit.ts`
#### Liên Kết Sang Module Khác
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Quản lý sản phẩm: gọi xử lý
- Quản lý sản phẩm → Text: gọi xử lý
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
- Quản lý sản phẩm → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Quản lý sản phẩm: hiển thị
### Quản lý sản phẩm
- Module ID: module:features/product-price
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới sản phẩm. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/product-price
#### Nhánh/Bước Chính
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `features/product-price/api/productPriceApi.ts:5`
- Xem/Tìm sản phẩm: Bước này dùng để xem/tìm sản phẩm. — `features/product-price/api/productPriceApi.ts:14`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/ControlPanel.tsx:29`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/ProductInfoSection.tsx:8`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/QuoteClosingSection.tsx:3`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/QuoteDocumentHeader.tsx:13`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/QuoteLetterIntro.tsx:8`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/QuotePrintSheet.tsx:22`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/QuoteTable.tsx:10`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/QuoteWatermark.tsx:7`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/components/SignatureBlock.tsx:8`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-price/hooks/useProductPriceCatalog.ts:6`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-price/hooks/useProductPriceQuote.ts:24`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/product-price/hooks/useQuoteCalculatedPriceMap.ts:11`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/product-price/pages/ProductPricePage.tsx:7`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteApiParsing.ts:4`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteApiParsing.ts:16`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteCode.ts:4`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteFormat.ts:12`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteFormat.ts:1`
- Hiển thị sản phẩm: Bước này dùng để hiển thị sản phẩm. — `features/product-price/utils/quoteFormat.ts:4`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteFormat.ts:20`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteMaps.ts:11`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteMaps.ts:33`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteMaps.ts:44`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteMaps.ts:69`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteNormalize.ts:1`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteNormalize.ts:6`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteNormalize.ts:9`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/product-price/utils/quoteNormalize.ts:15`
#### File Chính
- Constants: `features/product-price/constants.ts`
- TíNh NăNg: `features/product-price/index.tsx`
- TíNh NăNg: `features/product-price/types.ts`
- Xử lý dữ liệu sản phẩm: `features/product-price/api/productPriceApi.ts`
- Control Panel: `features/product-price/components/ControlPanel.tsx`
- Product Info Section: `features/product-price/components/ProductInfoSection.tsx`
- Quote Closing Section: `features/product-price/components/QuoteClosingSection.tsx`
- Quote Document Header: `features/product-price/components/QuoteDocumentHeader.tsx`
- Quote Letter Intro: `features/product-price/components/QuoteLetterIntro.tsx`
- Quote Print Sheet: `features/product-price/components/QuotePrintSheet.tsx`
- Danh sách sản phẩm: `features/product-price/components/QuoteTable.tsx`
- Quote Watermark: `features/product-price/components/QuoteWatermark.tsx`
- Signature Block: `features/product-price/components/SignatureBlock.tsx`
- Use Product Price Catalog: `features/product-price/hooks/useProductPriceCatalog.ts`
- Use Product Price Quote: `features/product-price/hooks/useProductPriceQuote.ts`
- Use Quote Calculated Price Map: `features/product-price/hooks/useQuoteCalculatedPriceMap.ts`
- Màn hình sản phẩm: `features/product-price/pages/ProductPricePage.tsx`
- Quote Print Styles: `features/product-price/pages/quotePrintStyles.ts`
- Xử lý dữ liệu sản phẩm: `features/product-price/utils/quoteApiParsing.ts`
- Quote Code: `features/product-price/utils/quoteCode.ts`
#### Liên Kết Sang Module Khác
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Content: gọi xử lý
- Quản lý sản phẩm → Quản lý giá: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
- Quản lý sản phẩm → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Chưa phát hiện liên kết.
### Promo Codes
- Module ID: module:features/promo-codes
- Dùng để: Nhóm chức năng promo codes. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/promo-codes
#### Nhánh/Bước Chính
- Promo Codes: Phần giao diện giúp người dùng thao tác với Promo Codes. — `features/promo-codes/index.tsx:11`
- Promo Code Card: Phần giao diện giúp người dùng thao tác với Promo Code Card. — `features/promo-codes/components/PromoCodeCard.tsx:18`
- Promo Code Row: Phần giao diện giúp người dùng thao tác với Promo Code Row. — `features/promo-codes/components/PromoCodeRow.tsx:18`
- Promo Codes List Section: Phần giao diện giúp người dùng thao tác với Promo Codes List Section. — `features/promo-codes/components/PromoCodesListSection.tsx:26`
- Promo Tab Switch: Phần giao diện giúp người dùng thao tác với Promo Tab Switch. — `features/promo-codes/components/PromoTabSwitch.tsx:8`
- Promo Usage History Section: Phần giao diện giúp người dùng thao tác với Promo Usage History Section. — `features/promo-codes/components/PromoUsageHistorySection.tsx:18`
- Promo Usage Row: Phần giao diện giúp người dùng thao tác với Promo Usage Row. — `features/promo-codes/components/PromoUsageRow.tsx:8`
- use Promo Code List: Lấy và quản lý dữ liệu liên quan tới use Promo Code List. — `features/promo-codes/hooks/usePromoCodeList.ts:7`
- use Promo Usage History: Lấy và quản lý dữ liệu liên quan tới use Promo Usage History. — `features/promo-codes/hooks/usePromoUsageHistory.ts:6`
#### File Chính
- Constants: `features/promo-codes/constants.ts`
- TíNh NăNg: `features/promo-codes/index.tsx`
- TíNh NăNg: `features/promo-codes/types.ts`
- Promo Code Card: `features/promo-codes/components/PromoCodeCard.tsx`
- Promo Code Row: `features/promo-codes/components/PromoCodeRow.tsx`
- Danh sách dữ liệu: `features/promo-codes/components/PromoCodesListSection.tsx`
- Promo Tab Switch: `features/promo-codes/components/PromoTabSwitch.tsx`
- Promo Usage History Section: `features/promo-codes/components/PromoUsageHistorySection.tsx`
- Promo Usage Row: `features/promo-codes/components/PromoUsageRow.tsx`
- Danh sách dữ liệu: `features/promo-codes/hooks/usePromoCodeList.ts`
- Use Promo Usage History: `features/promo-codes/hooks/usePromoUsageHistory.ts`
#### Liên Kết Sang Module Khác
- Promo Codes → Ui: hiển thị
- Promo Codes → Ui: hiển thị
- Promo Codes → Ui: hiển thị
- Promo Codes → Ui: hiển thị
- Promo Codes → Ui: hiển thị
- Promo Codes → Quản lý khuyến mãi: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Promo Codes: hiển thị
### Renew Adobe
- Module ID: module:features/renew-adobe
- Dùng để: Nhóm chức năng renew adobe. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/renew-adobe
#### Nhánh/Bước Chính
- Xem/Tìm fetch Renew Adobe Mail: Bước này dùng để xem/tìm fetch Renew Adobe Mail. — `features/renew-adobe/api/renewAdobeApi.ts:13`
- Tạo mới create Renew Adobe Mail: Bước này dùng để tạo mới create Renew Adobe Mail. — `features/renew-adobe/api/renewAdobeApi.ts:40`
- run Scheduler Renew Adobe: Bước xử lý liên quan tới run Scheduler Renew Adobe. — `features/renew-adobe/api/renewAdobeApi.ts:84`
- Xem/Tìm người dùng: Bước này dùng để xem/tìm người dùng. — `features/renew-adobe/api/renewAdobeApi.ts:103`
- Xóa người dùng: Bước này dùng để xóa người dùng. — `features/renew-adobe/api/renewAdobeApi.ts:116`
- Tạo mới người dùng: Bước này dùng để tạo mới người dùng. — `features/renew-adobe/api/renewAdobeApi.ts:133`
- Cập nhật người dùng: Bước này dùng để cập nhật người dùng. — `features/renew-adobe/api/renewAdobeApi.ts:163`
- Xem/Tìm fetch Renew System Logs: Bước này dùng để xem/tìm fetch Renew System Logs. — `features/renew-adobe/api/renewAdobeApi.ts:214`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/renew-adobe/components/AddAdminAccountModal.tsx:14`
- Tạo mới người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/renew-adobe/components/AddAdminAccountModal.tsx:26`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/renew-adobe/components/AddTrackingOrdersModal.tsx:38`
- Tạo mới đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/renew-adobe/components/AddTrackingOrdersModal.tsx:51`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/renew-adobe/components/AddUserByEmail.tsx:16`
- Tạo mới người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/renew-adobe/components/AddUserByEmail.tsx:25`
- Xóa người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/renew-adobe/components/DeleteUserByEmail.tsx:15`
- Cập nhật người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/renew-adobe/components/EditAccountModal.tsx:11`
- Cập nhật đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/renew-adobe/components/EditTrackingOrderModal.tsx:31`
- Person Avatar: Phần giao diện giúp người dùng thao tác với Person Avatar. — `features/renew-adobe/components/ManageTeamTable.tsx:27`
- Manage Team Table: Phần giao diện giúp người dùng thao tác với Manage Team Table. — `features/renew-adobe/components/ManageTeamTable.tsx:39`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/renew-adobe/components/RenewAdobeAccountsTable.tsx:18`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/renew-adobe/components/RenewAdobeAccountsTable.tsx:46`
- Renew Adobe Header: Phần giao diện giúp người dùng thao tác với Renew Adobe Header. — `features/renew-adobe/components/RenewAdobeHeader.tsx:15`
- Renew Adobe Progress Panel: Phần giao diện giúp người dùng thao tác với Renew Adobe Progress Panel. — `features/renew-adobe/components/RenewAdobeProgressPanel.tsx:11`
- Status Badge: Phần giao diện giúp người dùng thao tác với Status Badge. — `features/renew-adobe/components/StatusBadge.tsx:16`
- Url Access Cell: Phần giao diện giúp người dùng thao tác với Url Access Cell. — `features/renew-adobe/components/UrlAccessCell.tsx:8`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/renew-adobe/components/UserOrdersTable.tsx:41`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/renew-adobe/desk/RenewOrdersDeskPage.tsx:9`
- call Json: Bước xử lý liên quan tới call Json. — `features/renew-adobe/fix-ades/api.ts:30`
- Kiểm tra người dùng: Bước này dùng để kiểm tra người dùng. — `features/renew-adobe/fix-ades/api.ts:48`
- Kiểm tra check Fix Ades Transfer: Bước này dùng để kiểm tra check Fix Ades Transfer. — `features/renew-adobe/fix-ades/api.ts:52`
#### File Chính
- TíNh NăNg: `features/renew-adobe/types.ts`
- Xử lý dữ liệu: `features/renew-adobe/api/renewAdobeApi.ts`
- Add Admin Account Modal: `features/renew-adobe/components/AddAdminAccountModal.tsx`
- Add Tracking Orders Modal: `features/renew-adobe/components/AddTrackingOrdersModal.tsx`
- Add User By Email: `features/renew-adobe/components/AddUserByEmail.tsx`
- Delete User By Email: `features/renew-adobe/components/DeleteUserByEmail.tsx`
- Edit Account Modal: `features/renew-adobe/components/EditAccountModal.tsx`
- Edit Tracking Order Modal: `features/renew-adobe/components/EditTrackingOrderModal.tsx`
- Danh sách dữ liệu: `features/renew-adobe/components/ManageTeamTable.tsx`
- Danh sách người dùng: `features/renew-adobe/components/RenewAdobeAccountsTable.tsx`
- Renew Adobe Header: `features/renew-adobe/components/RenewAdobeHeader.tsx`
- Renew Adobe Progress Panel: `features/renew-adobe/components/RenewAdobeProgressPanel.tsx`
- Status Badge: `features/renew-adobe/components/StatusBadge.tsx`
- Url Access Cell: `features/renew-adobe/components/UrlAccessCell.tsx`
- Danh sách đơn hàng: `features/renew-adobe/components/UserOrdersTable.tsx`
- Màn hình đơn hàng: `features/renew-adobe/desk/RenewOrdersDeskPage.tsx`
- Xử lý dữ liệu: `features/renew-adobe/fix-ades/api.ts`
- Use Renew Adobe Admin: `features/renew-adobe/hooks/useRenewAdobeAdmin.ts`
- Màn hình tính năng: `features/renew-adobe/pages/RenewAdobeAdminPage.tsx`
- Màn hình tính năng: `features/renew-adobe/pages/RenewSystemLogsPage.tsx`
#### Liên Kết Sang Module Khác
- Renew Adobe → Shared: gọi xử lý
- Renew Adobe → Content: gọi xử lý
- Renew Adobe → Shared: gọi xử lý
- Renew Adobe → Content: gọi xử lý
- Renew Adobe → Shared: gọi xử lý
- Renew Adobe → Content: gọi xử lý
- Renew Adobe → Shared: gọi xử lý
- Renew Adobe → Content: gọi xử lý
- Renew Adobe → Shared: gọi xử lý
- Renew Adobe → Content: gọi xử lý
- Renew Adobe → Shared: gọi xử lý
- Renew Adobe → Content: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Renew Adobe: hiển thị
- Routes → Renew Adobe: hiển thị
- Routes → Renew Adobe: hiển thị
### Quản lý người dùng
- Module ID: module:features/shop-bank-accounts
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới người dùng. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/shop-bank-accounts
#### Nhánh/Bước Chính
- Xem/Tìm người dùng: Bước này dùng để xem/tìm người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:83`
- Xem/Tìm người dùng: Bước này dùng để xem/tìm người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:91`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:99`
- Cập nhật người dùng: Bước này dùng để cập nhật người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:114`
- Xem/Tìm người dùng: Bước này dùng để xem/tìm người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:128`
- Tạo mới người dùng: Bước này dùng để tạo mới người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:135`
- Cập nhật người dùng: Bước này dùng để cập nhật người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:146`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:158`
- Xóa người dùng: Bước này dùng để xóa người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:165`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:11`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:18`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:64`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/api/shopBankAccountApi.ts:75`
- Xóa người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/shop-bank-accounts/components/DeleteShopBankAccountModal.tsx:13`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/shop-bank-accounts/components/ShopBankAccountFormModal.tsx:32`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/shop-bank-accounts/components/ShopBankAccountsPanel.tsx:28`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/shop-bank-accounts/components/ShopBankAccountTable.tsx:22`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/shop-bank-accounts/components/ShopBankBalanceTable.tsx:19`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/shop-bank-accounts/components/ShopBankWithdrawModal.tsx:24`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/helpers/formatShopBankMoney.ts:1`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/helpers/formatShopBankMoney.ts:7`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/helpers/formatShopBankMoney.ts:14`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/helpers/formatShopBankMoney.ts:20`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/shop-bank-accounts/helpers/shopBankQrDefaults.ts:31`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/helpers/shopBankQrDefaults.ts:43`
- người dùng: Lấy và quản lý dữ liệu liên quan tới người dùng. — `features/shop-bank-accounts/hooks/useDefaultShopBankAccount.ts:11`
- người dùng: Phần giao diện giúp người dùng thao tác với người dùng. — `features/shop-bank-accounts/pages/ShopBankAccountsPage.tsx:3`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/utils/applyBankSelection.ts:9`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/shop-bank-accounts/utils/applyBankSelection.ts:18`
#### File Chính
- TíNh NăNg: `features/shop-bank-accounts/types.ts`
- Xử lý dữ liệu người dùng: `features/shop-bank-accounts/api/shopBankAccountApi.ts`
- Delete Shop Bank Account Modal: `features/shop-bank-accounts/components/DeleteShopBankAccountModal.tsx`
- Form người dùng: `features/shop-bank-accounts/components/ShopBankAccountFormModal.tsx`
- Shop Bank Accounts Panel: `features/shop-bank-accounts/components/ShopBankAccountsPanel.tsx`
- Danh sách người dùng: `features/shop-bank-accounts/components/ShopBankAccountTable.tsx`
- Danh sách người dùng: `features/shop-bank-accounts/components/ShopBankBalanceTable.tsx`
- Shop Bank Withdraw Modal: `features/shop-bank-accounts/components/ShopBankWithdrawModal.tsx`
- Form người dùng: `features/shop-bank-accounts/helpers/formatShopBankMoney.ts`
- Shop Bank Qr Defaults: `features/shop-bank-accounts/helpers/shopBankQrDefaults.ts`
- Use Default Shop Bank Account: `features/shop-bank-accounts/hooks/useDefaultShopBankAccount.ts`
- Màn hình người dùng: `features/shop-bank-accounts/pages/ShopBankAccountsPage.tsx`
- Apply Bank Selection: `features/shop-bank-accounts/utils/applyBankSelection.test.ts`
- Apply Bank Selection: `features/shop-bank-accounts/utils/applyBankSelection.ts`
#### Liên Kết Sang Module Khác
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Shared: gọi xử lý
- Quản lý người dùng → Content: gọi xử lý
- Quản lý người dùng → Content: gọi xử lý
- Quản lý người dùng → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Quản lý người dùng: hiển thị
- Quản lý đơn hàng → Quản lý người dùng: gọi xử lý
- Quản lý hóa đơn → Quản lý người dùng: gọi xử lý
- Quản lý hóa đơn → Quản lý người dùng: gọi xử lý
- Modals → Quản lý người dùng: gọi xử lý
- Modals → Quản lý người dùng: gọi xử lý
- Credit → Quản lý người dùng: gọi xử lý
- Quản lý người dùng → Quản lý người dùng: hiển thị
- Supply → Quản lý người dùng: gọi xử lý
- Supply → Quản lý người dùng: gọi xử lý
- Supply → Quản lý người dùng: gọi xử lý
- Supply → Quản lý người dùng: gọi xử lý
### Supply
- Module ID: module:features/supply
- Dùng để: Nhóm chức năng supply. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/supply
#### Nhánh/Bước Chính
- Sources: Phần giao diện giúp người dùng thao tác với Sources. — `features/supply/index.tsx:27`
- Tạo mới NCC: Phần giao diện giúp người dùng thao tác với NCC. — `features/supply/components/AddSupplierModal.tsx:23`
- Xóa Delete Supply Modal: Phần giao diện giúp người dùng thao tác với Delete Supply Modal. — `features/supply/components/DeleteSupplyModal.tsx:11`
- Cập nhật NCC: Phần giao diện giúp người dùng thao tác với NCC. — `features/supply/components/EditSupplierModal.tsx:24`
- read Error: Bước xử lý liên quan tới read Error. — `features/supply/components/EditTraceCodeModal.tsx:20`
- Cập nhật Edit Trace Code Modal: Phần giao diện giúp người dùng thao tác với Edit Trace Code Modal. — `features/supply/components/EditTraceCodeModal.tsx:29`
- read Error: Bước xử lý liên quan tới read Error. — `features/supply/components/ExternalImportLogModal.tsx:15`
- người dùng: Bước xử lý liên quan tới người dùng. — `features/supply/components/ExternalImportLogModal.tsx:24`
- External Import Log Modal: Phần giao diện giúp người dùng thao tác với External Import Log Modal. — `features/supply/components/ExternalImportLogModal.tsx:31`
- thanh toán: Phần giao diện giúp người dùng thao tác với thanh toán. — `features/supply/components/PaymentHistoryTable.tsx:12`
- Qr Modal: Phần giao diện giúp người dùng thao tác với Qr Modal. — `features/supply/components/QrModal.tsx:11`
- NCC: Phần giao diện giúp người dùng thao tác với NCC. — `features/supply/components/SupplierDetailModal.tsx:31`
- NCC: Phần giao diện giúp người dùng thao tác với NCC. — `features/supply/components/SupplierSettlementPanel.tsx:36`
- NCC: Bước xử lý liên quan tới NCC. — `features/supply/components/SupplierSettlementPanel.tsx:29`
- format Date: Bước xử lý liên quan tới format Date. — `features/supply/components/SupplyCard.tsx:23`
- Supply Card: Phần giao diện giúp người dùng thao tác với Supply Card. — `features/supply/components/SupplyCard.tsx:26`
- Supply Filters Bar: Phần giao diện giúp người dùng thao tác với Supply Filters Bar. — `features/supply/components/SupplyFiltersBar.tsx:12`
- format Date: Bước xử lý liên quan tới format Date. — `features/supply/components/SupplyList.tsx:8`
- Supply List: Phần giao diện giúp người dùng thao tác với Supply List. — `features/supply/components/SupplyList.tsx:24`
- Supply Row: Phần giao diện giúp người dùng thao tác với Supply Row. — `features/supply/components/SupplyList.tsx:109`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `features/supply/components/SupplyOrderCostsPanel.tsx:30`
- Supply Stats Cards: Phần giao diện giúp người dùng thao tác với Supply Stats Cards. — `features/supply/components/SupplyStatsCards.tsx:19`
- use Banks: Lấy và quản lý dữ liệu liên quan tới use Banks. — `features/supply/hooks/useBanks.ts:5`
- use Filtered Supplies: Lấy và quản lý dữ liệu liên quan tới use Filtered Supplies. — `features/supply/hooks/useFilteredSupplies.ts:11`
- thanh toán: Lấy và quản lý dữ liệu liên quan tới thanh toán. — `features/supply/hooks/usePayments.ts:28`
- use Supply Detail: Lấy và quản lý dữ liệu liên quan tới use Supply Detail. — `features/supply/hooks/useSupplyDetail.ts:45`
- use Supply List: Lấy và quản lý dữ liệu liên quan tới use Supply List. — `features/supply/hooks/useSupplyList.ts:6`
- NCC: Bước xử lý liên quan tới NCC. — `features/supply/utils/supplierPaymentContent.ts:2`
- NCC: Bước xử lý liên quan tới NCC. — `features/supply/utils/supplierPaymentContent.ts:10`
- NCC: Bước xử lý liên quan tới NCC. — `features/supply/utils/supplierPaymentContent.ts:20`
#### File Chính
- TíNh NăNg: `features/supply/index.tsx`
- TíNh NăNg: `features/supply/types.ts`
- Add Supplier Modal: `features/supply/components/AddSupplierModal.tsx`
- Delete Supply Modal: `features/supply/components/DeleteSupplyModal.tsx`
- Edit Supplier Modal: `features/supply/components/EditSupplierModal.tsx`
- Edit Trace Code Modal: `features/supply/components/EditTraceCodeModal.tsx`
- External Import Log Modal: `features/supply/components/ExternalImportLogModal.tsx`
- Danh sách thanh toán: `features/supply/components/PaymentHistoryTable.tsx`
- Qr Modal: `features/supply/components/QrModal.tsx`
- Supplier Detail Modal: `features/supply/components/SupplierDetailModal.tsx`
- Supplier Settlement Panel: `features/supply/components/SupplierSettlementPanel.tsx`
- Supply Card: `features/supply/components/SupplyCard.tsx`
- Supply Filters Bar: `features/supply/components/SupplyFiltersBar.tsx`
- Danh sách dữ liệu: `features/supply/components/SupplyList.tsx`
- Supply Modal Ui: `features/supply/components/supplyModalUi.ts`
- Supply Order Costs Panel: `features/supply/components/SupplyOrderCostsPanel.tsx`
- Supply Stats Cards: `features/supply/components/SupplyStatsCards.tsx`
- Use Banks: `features/supply/hooks/useBanks.ts`
- Use Filtered Supplies: `features/supply/hooks/useFilteredSupplies.ts`
- Use Payments: `features/supply/hooks/usePayments.ts`
#### Liên Kết Sang Module Khác
- Supply → Supplies: gọi xử lý
- Supply → Supplies: gọi xử lý
- Supply → Notifications: gọi xử lý
- Supply → Shared: gọi xử lý
- Supply → Content: gọi xử lý
- Supply → Ui: hiển thị
- Supply → Ui: hiển thị
- Supply → Shared: gọi xử lý
- Supply → Ui: hiển thị
- Supply → Content: gọi xử lý
- Supply → Shared: gọi xử lý
- Supply → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Supply: hiển thị
### Usdt Wallets
- Module ID: module:features/usdt-wallets
- Dùng để: Nhóm chức năng usdt wallets. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/usdt-wallets
#### Nhánh/Bước Chính
- Xem/Tìm fetch Usdt Wallets: Bước này dùng để xem/tìm fetch Usdt Wallets. — `features/usdt-wallets/api/usdtWalletApi.ts:67`
- Xem/Tìm fetch Usdt Wallet Balances: Bước này dùng để xem/tìm fetch Usdt Wallet Balances. — `features/usdt-wallets/api/usdtWalletApi.ts:75`
- Xem/Tìm fetch Usdt Exchange Rate: Bước này dùng để xem/tìm fetch Usdt Exchange Rate. — `features/usdt-wallets/api/usdtWalletApi.ts:83`
- Tạo mới create Usdt Wallet: Bước này dùng để tạo mới create Usdt Wallet. — `features/usdt-wallets/api/usdtWalletApi.ts:104`
- Cập nhật update Usdt Wallet: Bước này dùng để cập nhật update Usdt Wallet. — `features/usdt-wallets/api/usdtWalletApi.ts:113`
- set Default Usdt Wallet: Bước xử lý liên quan tới set Default Usdt Wallet. — `features/usdt-wallets/api/usdtWalletApi.ts:125`
- Xóa delete Usdt Wallet: Bước này dùng để xóa delete Usdt Wallet. — `features/usdt-wallets/api/usdtWalletApi.ts:132`
- record Usdt Wallet Withdrawal: Bước xử lý liên quan tới record Usdt Wallet Withdrawal. — `features/usdt-wallets/api/usdtWalletApi.ts:142`
- to Bool: Bước xử lý liên quan tới to Bool. — `features/usdt-wallets/api/usdtWalletApi.ts:12`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/usdt-wallets/api/usdtWalletApi.ts:19`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/usdt-wallets/api/usdtWalletApi.ts:48`
- parse Response: Bước xử lý liên quan tới parse Response. — `features/usdt-wallets/api/usdtWalletApi.ts:59`
- Xóa Delete Usdt Wallet Modal: Phần giao diện giúp người dùng thao tác với Delete Usdt Wallet Modal. — `features/usdt-wallets/components/DeleteUsdtWalletModal.tsx:13`
- Usdt Wallet Balance Table: Phần giao diện giúp người dùng thao tác với Usdt Wallet Balance Table. — `features/usdt-wallets/components/UsdtWalletBalanceTable.tsx:14`
- Usdt Wallet Form Modal: Phần giao diện giúp người dùng thao tác với Usdt Wallet Form Modal. — `features/usdt-wallets/components/UsdtWalletFormModal.tsx:25`
- Usdt Wallets Panel: Phần giao diện giúp người dùng thao tác với Usdt Wallets Panel. — `features/usdt-wallets/components/UsdtWalletsPanel.tsx:25`
- Usdt Wallet Table: Phần giao diện giúp người dùng thao tác với Usdt Wallet Table. — `features/usdt-wallets/components/UsdtWalletTable.tsx:22`
- Usdt Wallet Withdraw Modal: Phần giao diện giúp người dùng thao tác với Usdt Wallet Withdraw Modal. — `features/usdt-wallets/components/UsdtWalletWithdrawModal.tsx:15`
- format Usdt Money: Bước xử lý liên quan tới format Usdt Money. — `features/usdt-wallets/helpers/formatUsdtMoney.ts:1`
- parse Usdt Money Input: Bước xử lý liên quan tới parse Usdt Money Input. — `features/usdt-wallets/helpers/formatUsdtMoney.ts:10`
- format Usdt Money Input: Bước xử lý liên quan tới format Usdt Money Input. — `features/usdt-wallets/helpers/formatUsdtMoney.ts:18`
- format Usdt Money Draft: Bước xử lý liên quan tới format Usdt Money Draft. — `features/usdt-wallets/helpers/formatUsdtMoney.ts:23`
- convert Vnd To Usd: Bước xử lý liên quan tới convert Vnd To Usd. — `features/usdt-wallets/helpers/formatUsdtMoney.ts:31`
- Usdt Wallets Page: Phần giao diện giúp người dùng thao tác với Usdt Wallets Page. — `features/usdt-wallets/pages/UsdtWalletsPage.tsx:3`
#### File Chính
- TíNh NăNg: `features/usdt-wallets/types.ts`
- Xử lý dữ liệu: `features/usdt-wallets/api/usdtWalletApi.ts`
- Delete Usdt Wallet Modal: `features/usdt-wallets/components/DeleteUsdtWalletModal.tsx`
- Danh sách dữ liệu: `features/usdt-wallets/components/UsdtWalletBalanceTable.tsx`
- Form nhập liệu: `features/usdt-wallets/components/UsdtWalletFormModal.tsx`
- Usdt Wallets Panel: `features/usdt-wallets/components/UsdtWalletsPanel.tsx`
- Danh sách dữ liệu: `features/usdt-wallets/components/UsdtWalletTable.tsx`
- Usdt Wallet Withdraw Modal: `features/usdt-wallets/components/UsdtWalletWithdrawModal.tsx`
- Form nhập liệu: `features/usdt-wallets/helpers/formatUsdtMoney.ts`
- Màn hình tính năng: `features/usdt-wallets/pages/UsdtWalletsPage.tsx`
#### Liên Kết Sang Module Khác
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Content: gọi xử lý
- Usdt Wallets → Shared: gọi xử lý
- Usdt Wallets → Content: gọi xử lý
- Usdt Wallets → Ui: hiển thị
- Usdt Wallets → Ui: hiển thị
#### Module Khác Gọi Vào
- Routes → Usdt Wallets: hiển thị
- Quản lý người dùng → Usdt Wallets: hiển thị
- Modals → Usdt Wallets: gọi xử lý
- Modals → Usdt Wallets: gọi xử lý
- Modals → Usdt Wallets: gọi xử lý
### Quản lý kho
- Module ID: module:features/warehouse
- Dùng để: Nhóm màn hình và xử lý nghiệp vụ liên quan tới kho. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/warehouse
#### Nhánh/Bước Chính
- kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/index.tsx:16`
- kho: Bước xử lý liên quan tới kho. — `features/warehouse/types.ts:19`
- Tạo mới kho: Bước này dùng để tạo mới kho. — `features/warehouse/api/importPackageApi.ts:66`
- kho: Bước xử lý liên quan tới kho. — `features/warehouse/api/importPackageApi.ts:82`
- Xem/Tìm kho: Bước này dùng để xem/tìm kho. — `features/warehouse/api/importPackageApi.ts:99`
- Xem/Tìm kho: Bước này dùng để xem/tìm kho. — `features/warehouse/api/importPackageApi.ts:109`
- kho: Bước xử lý liên quan tới kho. — `features/warehouse/api/importPackageApi.ts:116`
- Xóa kho: Bước này dùng để xóa kho. — `features/warehouse/api/importPackageApi.ts:133`
- kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/CopyableValue.tsx:15`
- kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/ExpireModal.tsx:17`
- Nhập dữ liệu kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/ImportPackageBlock.tsx:39`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/warehouse/components/ProductCategorySelect.tsx:13`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/warehouse/components/ProductFilterSelect.tsx:23`
- Xem/Tìm kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/SearchBar.tsx:18`
- kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/StorageHeader.tsx:6`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/warehouse/components/StorageItemCard.tsx:48`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/warehouse/components/StorageItemCard.tsx:82`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/warehouse/components/StorageItemCard.tsx:192`
- sản phẩm: Phần giao diện giúp người dùng thao tác với sản phẩm. — `features/warehouse/components/StorageItemCard.tsx:360`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/warehouse/components/storageItemCardUtils.ts:3`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/warehouse/components/storageItemCardUtils.ts:11`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/warehouse/components/storageItemCardUtils.ts:17`
- kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/StorageTable.tsx:37`
- kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/StorageTable.tsx:194`
- kho: Lấy và quản lý dữ liệu liên quan tới kho. — `features/warehouse/hooks/useImportPackageSubmit.ts:25`
- sản phẩm: Lấy và quản lý dữ liệu liên quan tới sản phẩm. — `features/warehouse/hooks/useWarehouseProducts.ts:14`
- Xem/Tìm kho: Bước này dùng để xem/tìm kho. — `features/warehouse/utils/pagination.ts:1`
- kho: Bước xử lý liên quan tới kho. — `features/warehouse/utils/pagination.ts:13`
- Xem/Tìm kho: Bước này dùng để xem/tìm kho. — `features/warehouse/utils/warehouseTheme.ts:36`
- kho: Phần giao diện giúp người dùng thao tác với kho. — `features/warehouse/components/warehouse-row/WarehouseEditFields.tsx:17`
#### File Chính
- TíNh NăNg: `features/warehouse/index.tsx`
- TíNh NăNg: `features/warehouse/types.ts`
- Xử lý dữ liệu kho: `features/warehouse/api/importPackageApi.ts`
- Copyable Value: `features/warehouse/components/CopyableValue.tsx`
- Expire Modal: `features/warehouse/components/ExpireModal.tsx`
- Import Package Block: `features/warehouse/components/ImportPackageBlock.tsx`
- Product Category Select: `features/warehouse/components/ProductCategorySelect.tsx`
- Product Filter Select: `features/warehouse/components/ProductFilterSelect.tsx`
- Search Bar: `features/warehouse/components/SearchBar.tsx`
- Storage Header: `features/warehouse/components/StorageHeader.tsx`
- Storage Item Card: `features/warehouse/components/StorageItemCard.tsx`
- Storage Item Card: `features/warehouse/components/storageItemCardUtils.ts`
- Danh sách kho: `features/warehouse/components/StorageTable.tsx`
- Use Import Package Submit: `features/warehouse/hooks/useImportPackageSubmit.ts`
- Use Warehouse Products: `features/warehouse/hooks/useWarehouseProducts.ts`
- Pagination: `features/warehouse/utils/pagination.ts`
- Warehouse Theme: `features/warehouse/utils/warehouseTheme.ts`
- Warehouse Edit Fields: `features/warehouse/components/warehouse-row/WarehouseEditFields.tsx`
- Warehouse Row: `features/warehouse/components/warehouse-row/WarehouseRow.tsx`
- Warehouse Row Expanded: `features/warehouse/components/warehouse-row/WarehouseRowExpanded.tsx`
#### Liên Kết Sang Module Khác
- Quản lý kho → Shared: gọi xử lý
- Quản lý kho → Shared: gọi xử lý
- Quản lý kho → Content: gọi xử lý
- Quản lý kho → Shared: gọi xử lý
- Quản lý kho → Content: gọi xử lý
- Quản lý kho → Shared: gọi xử lý
- Quản lý kho → Content: gọi xử lý
- Quản lý kho → Shared: gọi xử lý
- Quản lý kho → Modals: hiển thị
- Quản lý kho → Shared: gọi xử lý
- Quản lý kho → Content: gọi xử lý
- Quản lý kho → Content: gọi xử lý
#### Module Khác Gọi Vào
- Modals → Quản lý kho: gọi xử lý
- Modals → Quản lý kho: hiển thị
- Quản lý đơn hàng → Quản lý kho: gọi xử lý
### Shared
- Module ID: module:shared
- Dùng để: Nhóm chức năng shared. Click để xem các bước nhỏ và module đang liên kết.
- Path: shared
#### Nhánh/Bước Chính
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:25`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:47`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:58`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:63`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:71`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:108`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:1`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:38`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:126`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:129`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:136`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:143`
- khách hàng: Bước xử lý liên quan tới khách hàng. — `shared/api/client.ts:150`
- use Bank List: Lấy và quản lý dữ liệu liên quan tới use Bank List. — `shared/hooks/useBankList.ts:27`
- map Bank Row: Bước xử lý liên quan tới map Bank Row. — `shared/hooks/useBankList.ts:12`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `shared/hooks/usePricingTiers.ts:25`
- giá: Lấy và quản lý dữ liệu liên quan tới giá. — `shared/hooks/usePricingTiers.ts:40`
- pad2: Bước xử lý liên quan tới pad2. — `shared/utils/date.ts:1`
- parse Flexible Date: Bước xử lý liên quan tới parse Flexible Date. — `shared/utils/date.ts:3`
- convert DMYTo YMD: Bước xử lý liên quan tới convert DMYTo YMD. — `shared/utils/date.ts:42`
- Xem/Tìm get Today DMY: Bước này dùng để xem/tìm get Today DMY. — `shared/utils/date.ts:49`
- Tính toán calculate Expiration Date: Bước này dùng để tính toán calculate Expiration Date. — `shared/utils/date.ts:59`
- Tạo mới add Months Minus One: Bước này dùng để tạo mới add Months Minus One. — `shared/utils/date.ts:81`
- inclusive Days Between: Bước xử lý liên quan tới inclusive Days Between. — `shared/utils/date.ts:99`
- format Date To DMY: Bước xử lý liên quan tới format Date To DMY. — `shared/utils/date.ts:112`
- is Registered Today: Bước xử lý liên quan tới is Registered Today. — `shared/utils/date.ts:137`
- days Until Date: Bước xử lý liên quan tới days Until Date. — `shared/utils/date.ts:148`
- parse Months From Info: Bước xử lý liên quan tới parse Months From Info. — `shared/utils/date.ts:159`
- days From Months: Bước xử lý liên quan tới days From Months. — `shared/utils/date.ts:167`
- to Finite Number: Bước xử lý liên quan tới to Finite Number. — `shared/utils/money.ts:1`
#### File Chính
- Client: `shared/api/client.ts`
- TíNh NăNg: `shared/api/index.ts`
- Danh sách dữ liệu: `shared/hooks/useBankList.ts`
- Use Pricing Tiers: `shared/hooks/usePricingTiers.ts`
- Date: `shared/utils/date.ts`
- TíNh NăNg: `shared/utils/index.ts`
- Money: `shared/utils/money.ts`
- Pricing: `shared/utils/pricing.ts`
- Response: `shared/utils/response.ts`
- Sepay: `shared/utils/sepay.ts`
- Status: `shared/utils/status.ts`
- Supply: `shared/utils/supply.ts`
- Vietqr Local: `shared/utils/vietqrLocal.ts`
#### Liên Kết Sang Module Khác
- Shared → Content: gọi xử lý
- Shared → Content: gọi xử lý
- Shared → Content: gọi xử lý
- Shared → Content: gọi xử lý
#### Module Khác Gọi Vào
- Quản lý phân quyền → Shared: dùng dữ liệu từ
- Layout → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Quản lý phân quyền → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
### Modals
- Module ID: module:components/modals
- Dùng để: Nhóm chức năng modals. Click để xem các bước nhỏ và module đang liên kết.
- Path: components/modals
#### Nhánh/Bước Chính
- App Notification: Phần giao diện giúp người dùng thao tác với App Notification. — `components/modals/AppNotification/AppNotification.tsx:8`
- Xác nhận Confirm Modal: Phần giao diện giúp người dùng thao tác với Confirm Modal. — `components/modals/ConfirmModal/ConfirmModal.tsx:16`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/CreateOrderModal/buildOrderPayload.ts:33`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/CreateOrderModal/buildOrderPayload.ts:43`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/CreateOrderModal/buildOrderPayload.ts:53`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `components/modals/CreateOrderModal/buildOrderPayload.ts:167`
- Tạo mới đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/CreateOrderModal/CreateOrderModal.tsx:17`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `components/modals/CreateOrderModal/createOrderPricingCopy.ts:5`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/CreateOrderModal/helpers.ts:7`
- Tính toán đơn hàng: Bước này dùng để tính toán đơn hàng. — `components/modals/CreateOrderModal/helpers.ts:15`
- Xem/Tìm đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/CreateOrderModal/SearchableSelect.tsx:5`
- Cập nhật đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/EditOrderModal/EditOrderModal.tsx:12`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/EditOrderModal/utils.ts:3`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/EditOrderModal/utils.ts:8`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `components/modals/EditOrderModal/utils.ts:21`
- Url Prompt Modal: Phần giao diện giúp người dùng thao tác với Url Prompt Modal. — `components/modals/UrlPromptModal/UrlPromptModal.tsx:21`
- NCC: Bước xử lý liên quan tới NCC. — `components/modals/ViewOrderModal/paymentQr.ts:36`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/ViewOrderModal/paymentQr.ts:42`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/ViewOrderModal/paymentQr.ts:49`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `components/modals/ViewOrderModal/qrEligibility.ts:10`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/ViewOrderModal/utils.ts:1`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/ViewOrderModal/utils.ts:14`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/ViewOrderModal/ViewOrderModal.tsx:16`
- NCC: Phần giao diện giúp người dùng thao tác với NCC. — `components/modals/ViewSupplierModal/ViewSupplierModal.tsx:27`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `components/modals/CreateOrderModal/__tests__/creditNoteLookup.test.ts:6`
- Tạo mới đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/CreateOrderModal/components/CreateOrderCreditPanels.tsx:34`
- Tạo mới đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/CreateOrderModal/components/CreateOrderCustomerSection.tsx:32`
- Tạo mới đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/CreateOrderModal/components/CreateOrderDetailLinesSection.tsx:38`
- đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/CreateOrderModal/components/CreateOrderDetailLinesSection.tsx:148`
- Tạo mới đơn hàng: Phần giao diện giúp người dùng thao tác với đơn hàng. — `components/modals/CreateOrderModal/components/CreateOrderPaymentMethodSection.tsx:17`
#### File Chính
- App Notification: `components/modals/AppNotification/AppNotification.tsx`
- TíNh NăNg: `components/modals/AppNotification/index.ts`
- Confirm Modal: `components/modals/ConfirmModal/ConfirmModal.tsx`
- TíNh NăNg: `components/modals/ConfirmModal/index.ts`
- Build Order Payload: `components/modals/CreateOrderModal/buildOrderPayload.ts`
- Create Order Modal: `components/modals/CreateOrderModal/CreateOrderModal.tsx`
- Create Order Pricing Copy: `components/modals/CreateOrderModal/createOrderPricingCopy.ts`
- Helpers: `components/modals/CreateOrderModal/helpers.ts`
- TíNh NăNg: `components/modals/CreateOrderModal/index.ts`
- Searchable Select: `components/modals/CreateOrderModal/SearchableSelect.tsx`
- TíNh NăNg: `components/modals/CreateOrderModal/types.ts`
- Edit Order Modal: `components/modals/EditOrderModal/EditOrderModal.tsx`
- TíNh NăNg: `components/modals/EditOrderModal/index.ts`
- Styles: `components/modals/EditOrderModal/styles.ts`
- TíNh NăNg: `components/modals/EditOrderModal/types.ts`
- TíNh NăNg: `components/modals/EditOrderModal/utils.ts`
- Url Prompt Modal: `components/modals/UrlPromptModal/UrlPromptModal.tsx`
- Constants: `components/modals/ViewOrderModal/constants.ts`
- TíNh NăNg: `components/modals/ViewOrderModal/index.ts`
- Payment Qr: `components/modals/ViewOrderModal/paymentQr.ts`
#### Liên Kết Sang Module Khác
- Modals → Notifications: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
- Modals → Shared: dùng dữ liệu từ
- Modals → Constants: dùng dữ liệu từ
#### Module Khác Gọi Vào
- App → Modals: dùng dữ liệu từ
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý đơn hàng → Modals: hiển thị
- Quản lý sản phẩm → Modals: hiển thị
- Quản lý kho → Modals: hiển thị
- Content → Modals: hiển thị
- Content → Modals: hiển thị
- Content → Modals: hiển thị
- Content → Modals: hiển thị
- Quản lý báo cáo → Modals: hiển thị
### Expenses
- Module ID: module:features/expenses
- Dùng để: Nhóm chức năng expenses. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/expenses
#### Nhánh/Bước Chính
- giá: Phần giao diện giúp người dùng thao tác với giá. — `features/expenses/components/ExpenseCostAllocationTable.tsx:17`
- Expenses Page: Phần giao diện giúp người dùng thao tác với Expenses Page. — `features/expenses/pages/ExpensesPage.tsx:4`
- giá: Phần giao diện giúp người dùng thao tác với giá. — `features/expenses/components/expense-cost-allocation-table/ExpenseAllocationTableView.tsx:40`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:110`
- Xem/Tìm giá: Bước này dùng để xem/tìm giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:113`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:120`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:126`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:137`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:145`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:153`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:156`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:182`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:215`
- sản phẩm: Bước xử lý liên quan tới sản phẩm. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:257`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:269`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:291`
- Xem/Tìm người dùng: Bước này dùng để xem/tìm người dùng. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:298`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:304`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:307`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:332`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:396`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:406`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:417`
- giá: Bước xử lý liên quan tới giá. — `features/expenses/components/expense-cost-allocation-table/helpers.ts:432`
#### File Chính
- Danh sách giá: `features/expenses/components/ExpenseCostAllocationTable.tsx`
- Màn hình tính năng: `features/expenses/pages/ExpensesPage.tsx`
- Danh sách giá: `features/expenses/components/expense-cost-allocation-table/ExpenseAllocationTableView.tsx`
- Helpers: `features/expenses/components/expense-cost-allocation-table/helpers.ts`
#### Liên Kết Sang Module Khác
- Expenses → Shared: gọi xử lý
- Expenses → Shared: gọi xử lý
- Expenses → Shared: gọi xử lý
- Expenses → Content: gọi xử lý
- Expenses → Content: gọi xử lý
- Expenses → Content: gọi xử lý
- Expenses → Content: gọi xử lý
- Expenses → Quản lý báo cáo: gọi xử lý
- Expenses → Quản lý báo cáo: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
- Expenses → Quản lý sản phẩm: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Expenses: hiển thị
### Tax
- Module ID: module:features/tax
- Dùng để: Nhóm chức năng tax. Click để xem các bước nhỏ và module đang liên kết.
- Path: features/tax
#### Nhánh/Bước Chính
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `features/tax/api/taxApi.ts:28`
- normalize Ymd: Bước xử lý liên quan tới normalize Ymd. — `features/tax/api/taxApi.ts:33`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `features/tax/api/taxApi.ts:39`
- đơn hàng: Bước xử lý liên quan tới đơn hàng. — `features/tax/api/taxApi.ts:43`
- Xem/Tìm đơn hàng: Bước này dùng để xem/tìm đơn hàng. — `features/tax/api/taxApi.ts:48`
- Tax Daily Form Table: Phần giao diện giúp người dùng thao tác với Tax Daily Form Table. — `features/tax/components/TaxDailyFormTable.tsx:21`
- format Currency: Bước xử lý liên quan tới format Currency. — `features/tax/components/TaxOverviewStats.tsx:13`
- Tax Overview Stats: Phần giao diện giúp người dùng thao tác với Tax Overview Stats. — `features/tax/components/TaxOverviewStats.tsx:21`
- đơn hàng: Lấy và quản lý dữ liệu liên quan tới đơn hàng. — `features/tax/hooks/useTaxOrders.ts:8`
- Tax Page: Phần giao diện giúp người dùng thao tác với Tax Page. — `features/tax/pages/TaxPage.tsx:10`
- to Money Number: Bước xử lý liên quan tới to Money Number. — `features/tax/utils/taxAggregates.ts:11`
- compute Tax Aggregates: Bước xử lý liên quan tới compute Tax Aggregates. — `features/tax/utils/taxAggregates.ts:144`
- Xem/Tìm get Date Key: Bước này dùng để xem/tìm get Date Key. — `features/tax/utils/taxAggregates.ts:16`
- build Date Columns: Bước xử lý liên quan tới build Date Columns. — `features/tax/utils/taxAggregates.ts:23`
- build Month Columns: Bước xử lý liên quan tới build Month Columns. — `features/tax/utils/taxAggregates.ts:46`
- normalize Ymd: Bước xử lý liên quan tới normalize Ymd. — `features/tax/utils/taxAggregates.ts:79`
- đổi trả/hoàn tiền: Bước xử lý liên quan tới đổi trả/hoàn tiền. — `features/tax/utils/taxAggregates.ts:85`
- to Term Days: Bước xử lý liên quan tới to Term Days. — `features/tax/utils/taxAggregates.ts:90`
- Tạo mới add Days: Bước này dùng để tạo mới add Days. — `features/tax/utils/taxAggregates.ts:95`
- count Days Inclusive: Bước xử lý liên quan tới count Days Inclusive. — `features/tax/utils/taxAggregates.ts:106`
- Xem/Tìm get Allocated Amount: Bước này dùng để xem/tìm get Allocated Amount. — `features/tax/utils/taxAggregates.ts:116`
- is Date In Columns: Bước xử lý liên quan tới is Date In Columns. — `features/tax/utils/taxAggregates.ts:140`
- format Money: Bước xử lý liên quan tới format Money. — `features/tax/components/tax-daily-form-table/helpers.ts:29`
- Xem/Tìm get Date Key: Bước này dùng để xem/tìm get Date Key. — `features/tax/components/tax-daily-form-table/helpers.ts:32`
- build Date Columns: Bước xử lý liên quan tới build Date Columns. — `features/tax/components/tax-daily-form-table/helpers.ts:39`
- build Month Columns: Bước xử lý liên quan tới build Month Columns. — `features/tax/components/tax-daily-form-table/helpers.ts:67`
- normalize Ymd: Bước xử lý liên quan tới normalize Ymd. — `features/tax/components/tax-daily-form-table/helpers.ts:103`
- đổi trả/hoàn tiền: Bước xử lý liên quan tới đổi trả/hoàn tiền. — `features/tax/components/tax-daily-form-table/helpers.ts:109`
- format Term: Bước xử lý liên quan tới format Term. — `features/tax/components/tax-daily-form-table/helpers.ts:114`
- to Money Number: Bước xử lý liên quan tới to Money Number. — `features/tax/components/tax-daily-form-table/helpers.ts:122`
#### File Chính
- Xử lý dữ liệu: `features/tax/api/taxApi.ts`
- Form nhập liệu: `features/tax/components/TaxDailyFormTable.tsx`
- Tax Overview Stats: `features/tax/components/TaxOverviewStats.tsx`
- Use Tax Orders: `features/tax/hooks/useTaxOrders.ts`
- Màn hình tính năng: `features/tax/pages/TaxPage.tsx`
- Tax Aggregates: `features/tax/utils/taxAggregates.ts`
- Helpers: `features/tax/components/tax-daily-form-table/helpers.ts`
- Form nhập liệu: `features/tax/components/tax-daily-form-table/TaxDailyFormTableView.tsx`
- TíNh NăNg: `features/tax/components/tax-daily-form-table/types.ts`
#### Liên Kết Sang Module Khác
- Tax → Shared: gọi xử lý
- Tax → Shared: gọi xử lý
#### Module Khác Gọi Vào
- Routes → Tax: hiển thị
## Cross Module Links
- Modals → Shared: 78 liên kết (dùng dữ liệu từ, gọi xử lý)
- Modals → Constants: 28 liên kết (dùng dữ liệu từ)
- Quản lý báo cáo → Shared: 27 liên kết (gọi xử lý)
- Quản lý đơn hàng → Shared: 27 liên kết (gọi xử lý)
- Renew Adobe → Shared: 26 liên kết (gọi xử lý)
- Renew Adobe → Content: 24 liên kết (gọi xử lý)
- Expenses → Quản lý sản phẩm: 20 liên kết (gọi xử lý)
- Quản lý sản phẩm → Ui: 18 liên kết (hiển thị)
- Supply → Shared: 18 liên kết (gọi xử lý)
- Content → Shared: 17 liên kết (gọi xử lý)
- Quản lý sản phẩm → Shared: 16 liên kết (gọi xử lý)
- Quản lý đơn hàng → Notifications: 15 liên kết (gọi xử lý)
- Quản lý sản phẩm → Shared: 14 liên kết (gọi xử lý)
- Quản lý hóa đơn → Shared: 13 liên kết (gọi xử lý)
- Quản lý kho → Shared: 12 liên kết (gọi xử lý)
- Quản lý kho → Content: 12 liên kết (gọi xử lý)
- Quản lý báo cáo → Content: 11 liên kết (gọi xử lý)
- Quản lý sản phẩm → Content: 11 liên kết (gọi xử lý)
- Quản lý giá → Shared: 10 liên kết (gọi xử lý)
- Quản lý sản phẩm → Text: 10 liên kết (gọi xử lý)
- Quản lý người dùng → Shared: 10 liên kết (gọi xử lý)
- Supply → Ui: 10 liên kết (hiển thị)
- Quản lý sản phẩm → Text: 9 liên kết (dùng dữ liệu từ, gọi xử lý)
- Forms → Content: 9 liên kết (gọi xử lý)
- Quản lý giá → Content: 9 liên kết (gọi xử lý)
- Renew Adobe → Ui: 9 liên kết (hiển thị)
- Quản lý người dùng → Notifications: 9 liên kết (gọi xử lý)
- Supply → Content: 9 liên kết (gọi xử lý)
- Usdt Wallets → Notifications: 9 liên kết (gọi xử lý)
- Quản lý đơn hàng → Refresh Bus: 9 liên kết (gọi xử lý)
- Quản lý đơn hàng → Content: 8 liên kết (gọi xử lý)
- Quản lý sản phẩm → Quản lý sản phẩm: 8 liên kết (gọi xử lý)
- Usdt Wallets → Shared: 8 liên kết (gọi xử lý)
- Modals → Forms: 8 liên kết (gọi xử lý)
- Modals → Content: 8 liên kết (gọi xử lý)
- Modals → Notifications: 7 liên kết (dùng dữ liệu từ, gọi xử lý)
- Quản lý sản phẩm → Content: 7 liên kết (gọi xử lý)
- Form Info → Forms: 7 liên kết (gọi xử lý)
- Form Info → Ui: 7 liên kết (hiển thị)
- Quản lý hóa đơn → Content: 7 liên kết (gọi xử lý)
- Ip Whitelist → Notifications: 7 liên kết (gọi xử lý)
- Active Keys → Ui: 6 liên kết (hiển thị)
- Ip Whitelist → Shared: 6 liên kết (gọi xử lý)
- Quản lý người dùng → Ui: 6 liên kết (hiển thị)
- Usdt Wallets → Ui: 6 liên kết (hiển thị)
- Routes → Content: 5 liên kết (hiển thị)
- Supply → Notifications: 5 liên kết (gọi xử lý)
- Modals → Ui: 5 liên kết (hiển thị)
- Ip Whitelist → Ui: 5 liên kết (hiển thị)
- Promo Codes → Ui: 5 liên kết (hiển thị)
- Renew Adobe → Notifications: 5 liên kết (gọi xử lý)
- Expenses → Quản lý báo cáo: 5 liên kết (gọi xử lý)
- Quản lý sản phẩm → Text: 4 liên kết (dùng dữ liệu từ, gọi xử lý)
- Quản lý sản phẩm → Text: 4 liên kết (dùng dữ liệu từ, gọi xử lý)
- Modals → Quản lý giá: 4 liên kết (dùng dữ liệu từ, gọi xử lý)
- Add Mcoin → Ui: 4 liên kết (hiển thị)
- Quản lý hóa đơn → Ui: 4 liên kết (gọi xử lý, hiển thị)
- Quản lý đơn hàng → Modals: 4 liên kết (hiển thị)
- Shared → Content: 4 liên kết (gọi xử lý)
- Content → Modals: 4 liên kết (hiển thị)
- Quản lý báo cáo → Ui: 4 liên kết (hiển thị)
- Quản lý báo cáo → Quản lý hóa đơn: 4 liên kết (gọi xử lý)
- Expenses → Content: 4 liên kết (gọi xử lý)
- Ip Whitelist → Content: 4 liên kết (gọi xử lý)
- Quản lý đơn hàng → Ui: 4 liên kết (hiển thị, gọi xử lý)
- Quản lý sản phẩm → Notifications: 4 liên kết (gọi xử lý)
- Supply → Quản lý người dùng: 4 liên kết (gọi xử lý)
- Quản lý kho → Ui: 4 liên kết (hiển thị, gọi xử lý)
- Quản lý báo cáo → Quản lý người dùng: 4 liên kết (gọi xử lý)
- Quản lý sản phẩm → Text: 3 liên kết (dùng dữ liệu từ, gọi xử lý)
- Layout → Shared: 3 liên kết (dùng dữ liệu từ, gọi xử lý)
- Quản lý danh mục → Content: 3 liên kết (gọi xử lý)
- Routes → Renew Adobe: 3 liên kết (hiển thị)
- Active Keys → Shared: 3 liên kết (gọi xử lý)
- Active Keys → Content: 3 liên kết (gọi xử lý)
- Ctv List → Ui: 3 liên kết (hiển thị)
- Supply → Supplies: 3 liên kết (gọi xử lý)
- Content → Ui: 3 liên kết (hiển thị)
- Credit → Ui: 3 liên kết (hiển thị)
- Quản lý báo cáo → Text: 3 liên kết (gọi xử lý)

## Agent Instructions
- Ưu tiên đọc module liên quan trực tiếp trước khi sửa code.
- Nếu chỉnh một bước xử lý, kiểm tra cả mục `Được dùng bởi` và `Tính năng này đang dùng`.
- Không suy luận nghiệp vụ chỉ từ tên function nếu có mô tả module rõ hơn.
- Với thay đổi UI, ưu tiên các node loại `Giao diện` hoặc file chứa màn hình/form/list.
- Với thay đổi dữ liệu/API, ưu tiên các node loại `Bước xử lý`, `Luồng dữ liệu`, service/api file.

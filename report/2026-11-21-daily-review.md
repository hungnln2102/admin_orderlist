## Ẩn nút thanh toán kỳ trả góp đã trả

- Đối chiếu nhật ký thanh toán theo hợp đồng và kỳ đang xem. API đã có kiểm tra trùng kỳ trong transaction.
- Frontend build và kiểm tra cú pháp backend thành công. Chưa triển khai lên production.

## Hiển thị đầy đủ ngày trong danh sách đơn hàng

- Cột ngày rộng 180 px để hiển thị ngày đăng ký và ngày hết hạn trên cùng một hàng theo dạng `dd/mm/yyyy - dd/mm/yyyy`. [OrderTable.tsx](../frontend/src/features/orders/components/OrderTable.tsx#L234)
- Kiểm tra kỹ thuật bằng `npm run build` trong `frontend` thành công. Chưa triển khai lên hệ thống đang chạy.

## Chọn sản phẩm và tag khi thêm tài khoản kho

- Form hiển thị tên sản phẩm, lấy tag từ `availableTags` và xóa tag cũ khi đổi sản phẩm. Tag đã chọn được gửi qua trường `variantTag` khi lưu.
- Các tag hiện thành danh sách nút. Nút đang chọn sáng lên và có thể bấm lại để bỏ chọn.
- `npm run build` thành công. Chưa kiểm tra thao tác lưu trên trình duyệt hoặc triển khai lên hệ thống đang chạy.

## Hợp nhất thay đổi từ VPS

- Giữ logic chuẩn hóa trạng thái đơn, migration, ghi chi phí nhà cung cấp và ghi chú vận hành.
- Giữ cú pháp route tương thích Express 4. Migration email receipt trên VPS trùng nội dung với file đã có trong Git.
- Frontend build, `node --check` và `git diff --cached --check` thành công. Truy vấn chỉ đọc xác nhận trạng thái và ràng buộc tương ứng trên production. Chưa kiểm thử thanh toán end-to-end.
## Chi phí cố định dạng thẻ và thanh toán tiền mặt

- Thẻ hiển thị khoản chi, phân loại, số tiền tháng, trạng thái và các thao tác. Tiền mặt dùng luồng ghi nhận thanh toán hiện có và ghi nguồn tiền trong ghi chú.
- Khi chọn biên lai, form điền phần tiền còn chưa phân bổ và cho phép chỉnh số tiền trước khi lưu.
- Nhật ký dưới các thẻ lấy giao dịch theo kỳ đang xem, nối mã biên lai qua bản ghi phân bổ. Frontend build và kiểm tra cú pháp backend đạt. Chưa kiểm thử với dữ liệu thực trên trình duyệt.
- Frontend build và kiểm tra diff thành công. Chưa kiểm thử thao tác lưu trên trình duyệt.
## Phân trang nhật ký nợ và trả góp

- Dùng bộ phân trang chung, tối đa 10 giao dịch mỗi trang. Frontend build thành công.

## [12:18] Thiết kế lại form cấu hình cấp key tự động sang dạng ngang 2 cột (Pipeline Layout)

- **Phạm vi tác động**: [ActivationKeyRuleModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/activationKeys/components/ActivationKeyRuleModal.tsx).
- **Thay đổi kỹ thuật**:
  - Tăng kích thước modal từ `max-w-xl` (576px) thành `max-w-4xl xl:max-w-5xl` (896px - 1024px) tối ưu diện tích hiển thị trên màn hình máy tính, loại bỏ cảm giác chật chội và giảm thiểu cuộn dọc.
  - Tái cấu trúc thành **Grid 2 cột ngang** đại diện cho luồng Pipeline Ánh xạ:
    - Cột 1 (Đầu vào - Nguồn đơn hàng): Variant áp dụng + Nhà cung cấp (NCC).
    - Connector giữa 2 cột: Mũi tên ngang `ArrowRight` với badge `Ánh xạ tự động cấp slot` trên màn hình desktop (tự động chuyển thành `ArrowDown` trên mobile responsive).
    - Cột 2 (Đầu ra - Đích nhận key): Kho slot cung ứng + Tag kho đích.
  - Tối ưu z-index cho các custom searchable dropdowns khi float xổ xuống, không bị che khuất bởi cột kế bên.
  - Nâng cấp card Mô phỏng quy tắc thực tế (Live Rule Preview) thành thanh Visual Pipeline Banner hiển thị dạng chips luồng dữ liệu trực quan: `[Variant] + [NCC] ────➤ [Kho đích] Tag: [Tag]`.
  - Phân bố hàng cấu hình phụ (Ghi chú nội bộ chiếm 7 cột, Toggle kích hoạt chiếm 5 cột) cân đối, gọn gàng.
  - Giữ nguyên 100% logic form, state, payload và API endpoint gửi lên backend.
- **Kiểm tra kỹ thuật**: `npm run build` trong `frontend` chạy hoàn tất thành công (`tsc && vite build` hoàn thành trong 4.43s không phát sinh cảnh báo/lỗi).

## [12:33] Lọc động danh sách Nhà cung cấp (NCC) theo đúng Variant được chọn

- **Phạm vi tác động**: [ActivationKeyRuleModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/activationKeys/components/ActivationKeyRuleModal.tsx).
- **Nguyên nhân gốc đã xử lý**: Thay thế API tĩnh `/api/products/all-suppliers` (lấy toàn bộ NCC hệ thống) bằng endpoint lọc theo ngữ cảnh `GET /api/products/:productId/suppliers` lấy từ bảng `business.supplier_cost`.
- **Thay đổi kỹ thuật**:
  - Khi chưa chọn Variant: Khóa dropdown NCC, hiển thị placeholder `"-- Vui lòng chọn Sản phẩm (Variant) trước --"`.
  - Khi chọn Variant: Tự động kích hoạt `fetchSuppliersForVariant(variantId)` tải đúng danh sách NCC đang cung ứng sản phẩm đó kèm giá vốn nhập `costPrice`.
  - Tự động gán NCC hợp lệ đầu tiên hoặc giữ nguyên ID nếu NCC cũ vẫn có quyền cung ứng gói mới; cảnh báo nếu Variant chưa được gán NCC trong Bảng Giá.
  - Khi mở chế độ Sửa (`editingRule`): Tải đúng danh sách NCC của Variant đang sửa và chọn đúng NCC đã lưu.
- **Kiểm tra kỹ thuật**: `npm run build` trong `frontend` thành công trong 4.57s.





## [14:05] Loại bỏ triệt để toàn bộ popup hệ thống trình duyệt và thay thế bằng hệ thống Notification/Modal của dự án

- **Phạm vi tác động**:
  - Hạ tầng thông báo chung:
    - [NotificationModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/NotificationModal.tsx)
    - [NotificationContext.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/context/NotificationContext.tsx)
  - Các module và modal nghiệp vụ:
    - [CatalogEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/CatalogEditModal.tsx) (Kho & Tag phân loại)
    - [WarehouseAddServiceModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseAddServiceModal.tsx) (Thêm dịch vụ tài khoản kho)
    - [ActivationKeyRulesTab.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/activationKeys/components/ActivationKeyRulesTab.tsx) (Xóa quy tắc cấp key)
    - [ActivationKeysPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/ActivationKeysPage.tsx) (Thu hồi & Xóa vĩnh viễn key)
    - [ExternalImportsFeature.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/external-imports/ExternalImportsFeature.tsx) (Xóa chi phí nhập ngoài luồng)
    - [PersonalCategoryManageModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/PersonalCategoryManageModal.tsx) (Xóa danh mục chi tiêu)
    - [DebtPaymentModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/DebtPaymentModal.tsx) (Validation & Xử lý thanh toán nợ)
    - [FixedCostModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FixedCostModal.tsx) (Validation & Lưu chi phí cố định)
    - [InstallmentModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/InstallmentModal.tsx) (Validation & Lưu trả góp)
    - [SavingFundModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/SavingFundModal.tsx) (Validation & Nạp/rút quỹ tích lũy)
    - [SavingGoalModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/SavingGoalModal.tsx) (Validation & Lưu mục tiêu)
    - [BatchDetailModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/BatchDetailModal.tsx) (Hủy đợt gộp & Hoàn tất gia hạn đơn lẻ)
    - [PendingBatchesModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/invoices/components/PendingBatchesModal.tsx) (Hủy đợt gộp chờ thanh toán)
- **Thay đổi kỹ thuật**:
  - **Nâng cấp hạ tầng Notification của dự án**:
    - Mở rộng `NotificationModal` và `NotificationContext` hỗ trợ thêm chế độ `type: "prompt"` cho phép nhập text/input trực tiếp trên UI hiện đại của dự án (thay thế cho `window.prompt`).
    - Bổ sung tùy chọn `danger?: boolean` cho modal xác nhận: Tự động đổi màu nút hành động sang gradient đỏ cảnh báo (`from-rose-500 to-red-600`) đối với các hành động nguy hiểm như xóa vĩnh viễn dữ liệu, hủy đợt gộp hoặc thu hồi key.
  - **Thay thế triệt để 100%**:
    - Quét toàn bộ mã nguồn frontend, xóa bỏ toàn bộ các lời gọi popup native của hệ điều hành/trình duyệt (`window.confirm`, `window.alert`, `window.prompt`, `alert(`, `confirm(`, `prompt(`).
    - Đồng bộ sang giao diện Dark Theme cao cấp của dự án:
      - Cảnh báo/Thông báo lỗi: `notify.warning(msg, title)` / `notify.error(msg, title)`.
      - Xác nhận hành động: `notify.confirm({ title, message, confirmText, danger, onConfirm })`.
      - Nhập lý do hủy: `notify.prompt({ title, message, placeholder, onConfirm })`.
- **Kiểm tra kỹ thuật**:
  - Node.js AST/Regex scanner trên toàn bộ thư mục `frontend/src`: Xác nhận **0 kết quả** tồn đọng `window.alert/confirm/prompt` hoặc `alert/confirm/prompt`.
  - `npm run build` chạy thành công 100% trong 4.72s không lỗi cú pháp hoặc kiểu dữ liệu TypeScript.
## Kiểm tra và nhận tài khoản Adobe thay thế

- Tích hợp tra cứu tài khoản đã cấp, nhận tài khoản thay thế theo yêu cầu và kiểm tra trạng thái tại chỗ.
- OTP Portal build thành công. Các file backend thay đổi qua kiểm tra cú pháp. Chưa chạy kiểm thử tích hợp với PostgreSQL và provider.


## [14:35] Nâng cấp giao diện Kiểm Tra & Cấp Lại Tài Khoản Adobe (otp_portal)

- **Phạm vi tác động**:
  - [AdobeAccountRecovery.tsx](file:///E:/Project/admin_store/otp_portal/src/features/adobe/components/AdobeAccountRecovery.tsx)
  - [AdobeSection.tsx](file:///E:/Project/admin_store/otp_portal/src/features/adobe/components/AdobeSection.tsx)
- **Thay đổi kỹ thuật**:
  - Viết lại toàn bộ form tra cứu & cấp lại tài khoản Adobe theo chuẩn **Cyberpunk Dark Glassmorphism** đồng bộ với toàn bộ cổng OTP Portal:
    - Ô 1: "Mã đơn hoặc mã kích hoạt" gắn icon `KeyRound`, placeholder hướng dẫn `VD: MAVR-123456 hoặc mã key kích hoạt...`, phông mono rõ nét.
    - Ô 2: "Thông tin liên hệ khi mua hàng" gắn icon `UserCheck`, badge ghi chú `(Nếu dùng mã đơn hàng)`, viền phát sáng màu hổ phách khi hệ thống yêu cầu thông tin đối soát.
    - Cả 2 ô input được bọc nền kính mờ `rgba(0, 0, 0, 0.45)` với viền `border-[var(--line)]`, loại bỏ hoàn toàn hiện tượng nền đen tàng hình.
    - Nút hành động: Sử dụng `.btn-cta w-full` với màu nền gradient theo theme lễ hội/cyberpunk, hiệu ứng phát sáng `boxShadow: 0 8px 24px var(--glow)`, chữ và icon `Search` rõ nét, spinner `RefreshCw` xoay tròn khi đang kiểm tra tài khoản.
    - Bổ sung icon `ShieldCheck` cho nút toggle sub-tab "Kiểm Tra Tài Khoản" trong header để cân xứng với `Zap Nhận OTP`.
    - Thẻ cảnh báo lỗi, thẻ cấp tài khoản thay thế và thẻ mật khẩu được thiết kế đồng bộ với nền kính bo tròn 2xl.
- **Kiểm tra kỹ thuật**:
  - `npm run build` trong `otp_portal` (`tsc && vite build`) hoàn thành thành công trong 1.98s không phát sinh bất kỳ lỗi TypeScript hay Vite build nào.
  - Hot Reload đã tự động cập nhật lên cổng OTP Portal đang chạy tại port 3005.


## [20:50] Thiết kế lại modal Chỉnh Sửa Dịch Vụ Kho dạng ngang 2 cột & Switch Toggle trượt On/Off

- **Phạm vi tác động**:
  - [SlotProviderControls.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/SlotProviderControls.tsx)
  - [WarehouseEditSlotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx)
- **Thay đổi kỹ thuật**:
  - **Loại bỏ checkbox tick chọn**: Thay thế toàn bộ `<input type="checkbox" />` native ở cụm Lấy OTP và Kiểm tra trạng thái bằng **Switch Button trượt On/Off** (`w-10 h-[22px]` với dot tròn `w-[18px] h-[18px]` trượt `translate-x-[18px]` mượt mà, hiệu ứng phát sáng Cyan khi bật, nền xám Slate khi tắt).
  - **Tái cấu trúc Form Ngang 2 Cột Cân Xứng (2-Column Dashboard Layout)**:
    - Mở rộng container modal từ `max-w-2xl` lên **`max-w-5xl xl:max-w-6xl`** (1024px - 1152px), mở rộng tầm nhìn, triệt tiêu việc cuộn dọc chật hẹp.
    - **Cột Trái (6/12 - Thông tin tài khoản & Bảo mật OTP)**:
      * Khối Thông tin đăng nhập: Email tài khoản kho + Mật khẩu dịch vụ (có icon copy nhanh, ẩn/hiện mật khẩu).
      * Khối Bảo mật 2FA & Cổng điều phối OTP: Switch trượt On/Off Lấy OTP + Switch trượt Kiểm tra trạng thái (xếp song song 2 cột con) + Email Backup Khôi Phục + Mã 2FA Secret Key (định dạng chunks đẹp mắt, nút copy).
    - **Cột Phải (6/12 - Phân loại gói, Vận hành & Hạn dùng)**:
      * Khối Quản lý Tag Biến Thể Gói: Input tag, nút xóa trống/gỡ tag, danh sách tag có sẵn dạng chips bấm chọn nhanh, banner tự động tạo tag mới nếu có.
      * Khối Trạng Thái Slot & Ngày Hết Hạn: Dropdown trạng thái slot (có chấm tròn màu trực quan) + Ngày hết hạn dịch vụ kèm các nút tắt nhanh `+30d`, `+90d`, `+1y`, `Xóa`.
      * Khối Ghi Chú Dịch Vụ: Textarea ghi chú nội bộ cho slot.
    - **Footer**: Nút Hủy Bỏ và Lưu Thay Đổi nằm toàn chiều ngang bên dưới gọn gàng.
  - **Tương thích đồng bộ**: Giúp cả `WarehouseCreateModal.tsx` cũng tự động thừa hưởng nút trượt On/Off hiện đại từ `SlotProviderControls`.
- **Kiểm tra kỹ thuật**:
  - `npm run build` trong `frontend` (`tsc && vite build`) hoàn tất thành công trong 4.79s không có bất kỳ lỗi cú pháp hay kiểu dữ liệu TypeScript nào.


## [20:58] Thiết kế lại modal Thêm Tài Khoản Kho Mới sang dạng Form Ngang 2 Cột (WarehouseCreateModal.tsx)

- **Phạm vi tác động**:
  - [WarehouseCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCreateModal.tsx)
- **Thay đổi kỹ thuật**:
  - **Mở rộng kích thước sang form ngang**: Tăng kích thước modal từ `max-w-lg` (512px) lên **`max-w-5xl xl:max-w-6xl`** (1024px – 1152px) chuẩn màn hình desktop, phủ trọn không gian ngang theo đúng chỉ đạo và khung viền đỏ của Master.
  - **Tái cấu trúc Grid 2 Cột Ngang Cân Xứng (`grid grid-cols-1 lg:grid-cols-12 gap-5 items-start`)**:
    - **Cột Trái (6/12 - Thông tin tài khoản & Bảo mật OTP)**:
      * Khối Thông tin đăng nhập: Email tài khoản kho + Nút "Đồng Bộ Đơn Nhập" MAVN; Mật khẩu & Mã 2FA Secret Key (2 cột con); Email Backup & Ngày Hết Hạn (`DateInputVN`).
      * Khối Bảo mật 2FA & Cổng OTP: 2 Switch Toggle trượt On/Off (Lấy OTP & Kiểm tra trạng thái) chia 2 cột con song song.
    - **Cột Phải (6/12 - Sản phẩm, Tag & Tạo gói kho liên kết)**:
      * Khối Sản phẩm & Tag: Dropdown chọn sản phẩm + Danh sách Tag có sẵn của sản phẩm dạng chips bấm chọn nhanh trực quan.
      * Khối Tạo Gói Kho Liên Kết: Toggle Switch "Tạo Gói Kho Cho Tài Khoản Này" + Toggle Switch "Cần tài khoản liên kết cùng gói này không?" + 2 nút chọn Vai trò (TK Dung Lượng / TK Chính) + Dropdown chọn tài khoản tồn kho + Ô nhập dung lượng.
    - **Footer**: Nút Hủy Bỏ và Lưu Tài Khoản nằm trải dài toàn chiều ngang bên dưới gọn gàng.
- **Kiểm tra kỹ thuật**:
  - `npm run build` trong `frontend` (`tsc && vite build`) hoàn tất thành công trong 4.45s không phát sinh bất kỳ lỗi cú pháp hoặc kiểu dữ liệu TypeScript nào.
## Liên kết gói sản phẩm với Kho Hàng

- Đã chạy migration local và kiểm tra xóa slot kéo theo gói trong transaction được hoàn tác. Số bản ghi đơn hàng giữ nguyên.
- Dịch vụ đọc được 26 gói, 24 gói có ngày hết hạn và 56 tài khoản kho. Có 10 gói cũ chưa có slot liên kết, được giữ trong DB và loại khỏi danh sách gói.

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
## Gỡ tag dịch vụ Kho Hàng

- Kiểm tra local xác nhận 26 slot liên kết gói đều trả trạng thái đang sử dụng, gồm 3 slot có số vị trí đã dùng bằng 0. Frontend build thành công.

- API và giao diện lấy nhãn tag từ slot. Kiểm tra cú pháp backend và build frontend đạt.


## [22:30] Ban hành Nguyên Tắc 8 vào Hiến Pháp & Thiết lập Kho Thư Viện Dùng Chung (Design System SSOT)

- **Phạm vi tác động**:
  - Toàn bộ hệ thống Hiến Pháp:
    - [AGENTS.md](file:///e:/Project/admin_store/admin_orderlist/AGENTS.md)
    - [.agents/AGENTS.md](file:///e:/Project/admin_store/admin_orderlist/.agents/AGENTS.md)
    - [.agents/rules/AGENTS.md](file:///e:/Project/admin_store/admin_orderlist/.agents/rules/AGENTS.md)
    - [SKILL.md (frontend-lead)](file:///e:/Project/admin_store/admin_orderlist/.agents/plugins/subagent-team/skills/frontend-lead/SKILL.md)
  - Kho thư viện dùng chung & Danh mục tra cứu:
    - [COMPONENT_LIBRARY.md](file:///e:/Project/admin_store/admin_orderlist/docs/design-system/COMPONENT_LIBRARY.md) (Living Catalog)
    - [frontend/src/shared/README.md](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/README.md)
    - [ToggleSwitch.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/ToggleSwitch.tsx) (Component công tắc trượt On/Off chuẩn 6 màu)
    - [CopyButton.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/CopyButton.tsx) (Nút sao chép kèm icon Check và feedback)
    - [QuickDateAddButtons.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/QuickDateAddButtons.tsx) (Cụm nút bấm cộng ngày +30d, +90d, +1y)
    - [useClipboard.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/hooks/useClipboard.ts) (Nâng cấp timer tự động 1.5s)
    - [index.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/index.ts) (Export tập trung Single Entry Point)
    - [SlotProviderControls.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/SlotProviderControls.tsx) (Tái sử dụng ngay ToggleSwitch)
- **Thay đổi kỹ thuật**:
  - **Ban hành Nguyên Tắc 8**: Nghiêm cấm tự ý code lại giao diện inline. Mọi sửa đổi hay tạo mới UI bắt buộc phải kiểm toán kho thư viện `frontend/src/shared/components/` trước. Nếu chưa có, phải đóng gói vào kho dùng chung trước rồi mới sử dụng.
  - **Khởi tạo Living Design System**: Biên soạn cẩm nang tra cứu chi tiết gồm 6 nhóm thành phần, bảng props, code mẫu và nguyên tắc áp dụng.
  - **Đóng gói các Shared Component nền tảng**: Đưa `ToggleSwitch`, `CopyButton`, `QuickDateAddButtons` vào kho dùng chung, tái sử dụng trực tiếp trong `SlotProviderControls`.
- **Kiểm tra kỹ thuật**:
  - `npm run build` trong `frontend` (`tsc && vite build`) hoàn tất thành công trong 4.44s không phát sinh bất kỳ lỗi nào.


## [23:05] Lập Bản Đánh Giá Toàn Diện Hệ Thống & Kế Hoạch Check Đợt 2 (Kèm Vùng Cấm Bất Khả Xâm Phạm)

- **Phạm vi tác động**:
  - [2026-11-21_system_optimization_and_modularization_audit.md](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-11-21_system_optimization_and_modularization_audit.md)
  - [2026-11-21_phase2_warehouse_shared_components_migration_plan.md](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-11-21_phase2_warehouse_shared_components_migration_plan.md)
- **Thay đổi kỹ thuật**:
  - **Bản Đánh Giá Hệ Thống Toàn Diện Dành Cho Đội Ngũ Subagents**:
    * Thiết lập danh sách **Ranh giới bất khả xâm phạm (Redlines)**: Cấm tuyệt đối đụng chạm đến hệ thống sổ cái kế toán kép, các bảng `financial_*`, webhook SePay/MB Bank/VietQR, tiến trình đối soát VPBank IMAP; Cấm rollback migration hoặc sửa đổi batch 1-28; Cấm đụng chạm code Master đang làm dở (`AdobeAccountRecovery.tsx`, tabs activation); Cấm phá vỡ logic cấp key theo tag và cơ chế Transactional Lock.
    * Bóc tách tiềm năng tái sử dụng thư viện chung Frontend: 2 switch inline còn sót lại, 4 nút copy thủ công, cụm nút cộng ngày, chuẩn hóa Form Ngang 2 cột cho các modal tài chính, và quy hoạch 53 file format tiền tệ thủ công.
    * Bóc tách tiềm năng phân rã Backend & Event Bus: Phân rã `orderService.js` thành query, status mutation và notification subscriber.
    * Phân công vai trò rạch ròi cho từng Subagent (`frontend-lead`, `backend-specialist`, `finance-specialist`, `qa-automation`, `security-auditor`).
  - **Kế Hoạch Check Đợt 2 (Warehouse Modals Refactoring)**:
    * Biên soạn Spec-Kit SDD với kịch bản Gherkin chuẩn xác cho việc loại bỏ switch inline và copy button thủ công trong `WarehouseCreateModal` và `WarehouseEditSlotModal`.
    * Pre-Flight Check với code diff dự kiến chi tiết từng dòng, bảo đảm 100% tuân thủ Form Ngang 2 Cột và thư viện chung `@/shared/components`.

## [23:11] Cấu hình plugin và custom agent cho Codex

- Đã đăng ký marketplace cục bộ và xác nhận plugin phiên bản 1.0.0 ở trạng thái installed, enabled bằng Codex CLI.
- Đã xác thực 7 tệp TOML trong .codex/agents/ và đường dẫn đến SKILL.md của từng vai trò. Hướng dẫn vai trò được đọc trực tiếp từ bộ skill hiện có.
- Cần mở phiên extension mới để xác nhận việc gọi custom agent từ giao diện IDE.


## [23:16] Phân Rã Kế Hoạch Hệ Thống Thành Hai Bản Thiết Kế Độc Lập Frontend & Backend

- **Phạm vi tác động**:
  - [2026-11-21_system_optimization_frontend_blueprint.md](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-11-21_system_optimization_frontend_blueprint.md)
  - [2026-11-21_system_optimization_backend_blueprint.md](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-11-21_system_optimization_backend_blueprint.md)
- **Thay đổi kỹ thuật**:
  - **Phân tách Frontend Blueprint thành 7 Task biệt lập tuyệt đối (Zero Collision)**:
    * Mỗi task sở hữu tập hợp file riêng biệt 100%, không có bất kỳ file nào trùng lặp giữa các task để các Agent có thể làm song song mà không xung đột Git.
    * FE-01: `WarehouseCreateModal.tsx` (ToggleSwitch)
    * FE-02: `WarehouseEditSlotModal.tsx` (CopyButton, QuickDateAddButtons)
    * FE-03: `WarehouseAccountsTable.tsx`, `WarehouseSlotSubTable.tsx` (CopyButton trong bảng)
    * FE-04: `FixedCostModal.tsx` (Form Ngang 2 Cột, DateInputVN)
    * FE-05: `InstallmentModal.tsx` (Form Ngang 2 Cột, DateInputVN)
    * FE-06: `SavingFundModal.tsx` (Form Ngang 2 Cột)
    * FE-07: `OrderStatsCards.tsx`, `FinanceOverviewCards.tsx` (formatCurrency)
  - **Phân tách Backend Blueprint thành 4 Task phân rã kiến trúc**:
    * Thiết lập danh mục Ranh giới bất khả xâm phạm (Redlines) tuyệt đối cho Backend: Sổ cái kế toán kép, các bảng `financial_*`, webhook SePay/MB Bank/VietQR/VPBank IMAP, Database migrations Batch 1-28, Transactional Lock.
    * BE-01: Bóc tách `orderQueryService.js`
    * BE-02: Bóc tách `orderTelegramSubscriber.js` (Event Bus)
    * BE-03: Bóc tách `warehouseSlotProviderService.js` (Third-party adapters)
    * BE-04: Chuẩn hóa `apiResponse.js`

## [23:27] Tối ưu backend đợt đầu

- Tìm đơn gán biên lai giảm 70 xuống 4 SQL. Danh sách Kho giảm 10 xuống 7 SQL. Đối chiếu chỉ đọc 915 đơn và 26 gói khớp bản trước.
- 24 unit test mục tiêu đạt. Benchmark và phần còn lại ghi trong [blueprint backend](../docs/plans/2026-11-21_system_optimization_backend_blueprint.md). Chưa nghiệm thu thanh toán ghi dữ liệu hoặc production.

## Outbox backend

- Phát lại tiếp tục xử lý các event phía sau khi một event lỗi. 21 unit test mục tiêu đạt. Integration thanh toán còn chờ TEST_DATABASE_URL.

## [23:31] Nghiệm thu credit, webhook và độ trễ outbox

- PostgreSQL kiểm thử mydtbmav_test đạt 7/7 kịch bản credit/webhook. EventStore và EventBus đạt 6/6 unit test.
- Đo chỉ đọc với subscriber mô phỏng 25/100 ms cho p50 toàn luồng 31,37/108,65 ms. Còn đo subscriber thật, restart/backlog và batch end-to-end.

## [23:33] Phát lại outbox qua nhiều lô

- Kiểm thử 125 event trên PostgreSQL kiểm thử. Lượt đầu phát 124 event dù event đầu lỗi. Lượt sau phát thành công event còn lại. Lượt thứ ba trả 0. 6 unit test đạt. Probe gọi cùng tiến trình, chưa mô phỏng restart thực.
- Kiểm tra bổ sung qua ba tiến trình Node riêng đạt lần lượt 124, 1 và 0 event.

## [23:36] Khóa sự kiện outbox khi phát đồng thời

- Trước sửa: hai lượt phát cùng một event gọi subscriber hai lần. Sau sửa: hai tiến trình Node riêng gọi subscriber tổng cộng một lần trên PostgreSQL kiểm thử.
- 6 unit test Event Store và Event Bus đạt. Cần đo mức sử dụng pool với subscriber thật và kiểm tra idempotency khi tiến trình chết sau side effect.


## [23:41] Thực Thi Tái Cấu Trúc Frontend (FE-01 đến FE-08)

- **Phạm vi tác động**:
  - **FE-01**: [WarehouseCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCreateModal.tsx) — Thay 2 switch inline (`createPackage`, `hasLinkedAccount`) bằng `<ToggleSwitch />` từ `@/shared/components`.
  - **FE-02**: [WarehouseEditSlotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx) — Xóa state `copiedField`/`handleCopy` thủ công, thay 4 nút copy bằng `<CopyButton />`, thay cụm nút `+30d/+90d/+1y/Xóa` bằng `<QuickDateAddButtons />` và thay `<input type="date">` bằng `<DateInputVN />`.
  - **FE-03**: [WarehouseAccountsTable.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseAccountsTable.tsx), [WarehouseSlotSubTable.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseSlotSubTable.tsx) — Thay nút copy email & 2FA bằng `<CopyButton />` (giữ nguyên toast qua `onCopied`).
  - **FE-04**: [FixedCostModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FixedCostModal.tsx) — Chuyển sang Form Ngang 2 cột (`max-w-4xl`), dùng `<CurrencyInputVN />` và `<ToggleSwitch variant="rose" />`.
  - **FE-05**: [InstallmentModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/InstallmentModal.tsx) — Chuyển sang Form Ngang 2 cột (`max-w-4xl`), dùng `<CurrencyInputVN />` và `<ToggleSwitch variant="amber" />`.
  - **FE-06**: [SavingFundModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/SavingFundModal.tsx) — Chuyển sang Form Ngang 2 cột (`max-w-3xl`), dùng `<CurrencyInputVN />`.
  - **FE-07**: [PayWithCreditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/components/PayWithCreditModal.tsx), [DashboardPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/dashboard/DashboardPage.tsx) — Chuẩn hóa `toLocaleString` sang `formatCurrency` và `formatNumber` từ `@/shared/utils` (ghi chú: `OrderStatsCards.tsx` và `FinanceOverviewCards.tsx` trong blueprint cũ không tồn tại trong repo).
  - **FE-08**: [ReceiptsPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/ReceiptsPage.tsx) — Lazy-load 3 modal (`AllocateReceiptModal`, `CreateReceiptModal`, `PendingBatchesModal`) qua `React.lazy` + `Suspense`, chỉ mount khi mở; đồng bộ `formatCurrency`/`formatNumber` từ `@/shared/utils`.
- **Kết quả kiểm tra & đo bundle (`tsc && vite build` — 4,55s, 0 lỗi)**:
  - `ReceiptsPage`: **238,60 kB (31,52 kB gzip) → 59,93 kB (8,21 kB gzip)** (**giảm 74,9%** JS tải ban đầu).
  - `WarehousePage`: **314,16 kB (38,65 kB gzip) → 308,30 kB (38,54 kB gzip)**.
  - Redlines được bảo vệ 100%: Không chạm backend, không chạm `AdobeAccountRecovery.tsx`, `ActivationKeyRulesTab.tsx`, không đổi API payload/contract.

## [23:44] Tách service Finance Hub

- Tách chốt số dư cá nhân và quỹ tiết kiệm. Export, báo cáo tháng/năm và tổng quan tiết kiệm khớp HEAD trên DB local.
- 4 unit test đạt và integration snapshot đạt. Còn kiểm thử ghi quỹ tiết kiệm, gia hạn đơn và routing slot.

## [23:47] Tách routing slot và gia hạn đơn

- 18 bài kiểm thử mục tiêu đạt. Probe PostgreSQL kiểm thử xác nhận gia hạn đơn bán, nạp/rút quỹ và từ chối rút vượt số dư.
- EXPLAIN thử bộ lọc hạn theo khoảng ngày chuyển sang Index Scan và giảm buffer hit từ 10 xuống 4. Một mẫu đơn lẻ chưa chứng minh giảm độ trễ.


## [23:49] Hoàn Tất Tái Cấu Trúc Frontend Đợt 2 (FE-08 mở rộng, FE-09, FE-10, FE-11)

- **Phạm vi tác động**:
  - **FE-09 (Điều phối tải API)**:
    - [useWarehouseData.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/hooks/useWarehouseData.ts): Lazy-fetch `/api/warehouse/system-products` qua `ensureSystemProducts()` chỉ khi mở tab Danh mục hoặc các modal cần danh mục sản phẩm hệ thống.
    - [useOrders.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/orders/hooks/useOrders.ts): Gửi `includeStats: false` khi chỉ đổi trang/pageSize (giảm 5 truy vấn tổng hợp SQL/lần chuyển trang); vẫn gửi `includeStats: true` khi đổi tab/filter/search hoặc `refreshOrders()`.
  - **FE-08 mở rộng & FE-10 (Thin Page Orchestrator + Code-splitting)**:
    - [WarehousePage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/WarehousePage.tsx): Tách toàn bộ state/CRUD sang `useWarehouseData.ts` và lazy-load 7 modal + `WarehouseCatalogGrid`.
    - [OrdersPage.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/pages/OrdersPage.tsx): Lazy-load 4 modal (`OrderCreateEditModal`, `OrderDetailModal`, `OrderDeleteModal`, `PayWithCreditModal`).
  - **FE-11 (Shared SearchableCombobox)**:
    - Tạo mới [SearchableCombobox.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/SearchableCombobox.tsx), export tại [index.ts](file:///e:/Project/admin_store/admin_orderlist/frontend/src/shared/components/index.ts), bổ sung tài liệu vào [COMPONENT_LIBRARY.md](file:///e:/Project/admin_store/admin_orderlist/docs/design-system/COMPONENT_LIBRARY.md) và thay thế `AccountCombobox` inline tại [PackageCreateEditModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/packages/components/PackageCreateEditModal.tsx).
- **Benchmark Build (`tsc && vite build` — 4,71s, 0 lỗi)**:
  - `WarehousePage`: **314,16 kB (38,65 kB gzip) → 109,07 kB (16,58 kB gzip)** (**-65,3%** thô).
  - `ReceiptsPage`: **238,60 kB (31,52 kB gzip) → 59,93 kB (8,21 kB gzip)** (**-74,9%** thô).
  - `OrdersPage`: **195,22 kB (29,97 kB gzip) → 83,55 kB (15,89 kB gzip)** (**-57,2%** thô).
  - Tổng 3 trang nặng nhất giảm từ **747,98 kB** xuống **252,55 kB** (**-66,2%**).

## [23:50] Kiểm tra backend cuối đợt

- 168/168 unit test đạt với --test-force-exit. SSE probe 1.000 bản tin đạt. Cron 0 ngày lọc theo khoảng giờ Việt Nam và đối chiếu DB local cho cùng tập đơn.
- Các phần còn thiếu nghiệm thu ghi trong [kế hoạch backend](../docs/plans/2026-11-21_system_optimization_backend_blueprint.md).

## [23:52] Nghiệm thu thanh toán gộp và gia hạn đơn nhập

- PostgreSQL kiểm thử: hai đơn chuyển PAID, tổng biên lai và phân bổ 57.003 đồng, tài khoản tăng đúng số tiền, có một dòng ledger và lần hoàn tất lặp bị từ chối.
- Gia hạn đơn MAVN đồng bộ đúng hạn và số ngày của slot Kho. Đã dọn fixture theo ID sau kiểm thử.
- Probe gọi service hoàn tất thanh toán gộp. Luồng tạo yêu cầu QR và nhận webhook theo mã batch còn cần kiểm tra riêng.

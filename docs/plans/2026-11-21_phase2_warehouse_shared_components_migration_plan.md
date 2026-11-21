# 📋 KẾ HOẠCH KIỂM TRA & TRIỂN KHAI ĐỢT 2 (CHECK ĐỢT 2)
## CHUẨN HÓA WAREHOUSE MODALS SANG KHO THƯ VIỆN DÙNG CHUNG (DESIGN SYSTEM SSOT)

> **Vị trí tài liệu:** `docs/plans/2026-11-21_phase2_warehouse_shared_components_migration_plan.md`  
> **Chủ nhân tối cao (Sovereign):** 👑 **Master (Sếp)**  
> **Tổng chỉ huy duyệt:** 👑 **Orchestrator Agent**  
> **Đơn vị thi hành:** `frontend-lead` & `qa-automation`  
> **Cơ sở pháp lý tối cao:** [AGENTS.md](file:///e:/Project/admin_store/admin_orderlist/AGENTS.md) — Nguyên Tắc 1 (Spec-Kit + Pre-Flight Check) & Nguyên Tắc 8 (Hiến Pháp Frontend SSOT).

---

## 🛑 RANH GIỚI BẤT KHẢ XÂM PHẠM TRONG ĐỢT 2 (REDLINES - NHỮNG THỨ TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỤNG CHẠM)

> [!WARNING]
> Khi thực hiện Check Đợt 2 trên 2 modal lớn của Kho Hàng ([WarehouseCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCreateModal.tsx) và [WarehouseEditSlotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx)), Subagent **BẮT BUỘC PHẢI TUÂN THỦ TUYỆT ĐỐI** các giới hạn an toàn sau:

1. ❌ **CẤM THAY ĐỔI COMPONENT CONTRACT & PROPS INTERFACE**:
   - Giữ nguyên toàn bộ Props của `WarehouseCreateModalProps` và `WarehouseEditSlotModalProps`.
   - Giữ nguyên các handler `onSubmit`, `onClose`, `onFormChange`. Không được phép đổi tên hoặc kiểu dữ liệu của bất kỳ tham số nào.
2. ❌ **CẤM CAN THIỆP VÀO LOGIC DỮ LIỆU BACKEND HOẶC API ENDPOINTS**:
   - Không sửa đổi bất kỳ hàm gọi API nào trong `warehouseApi.ts` hoặc các controller/service phía backend.
   - Giữ nguyên cấu trúc payload gửi lên server khi submit form.
3. ❌ **CẤM PHÁ VỠ BỐ CỤC FORM NGANG 2 CỘT (`max-w-5xl xl:max-w-6xl`)**:
   - Giữ nguyên cấu trúc lưới Grid 12 cột (`grid-cols-1 lg:grid-cols-12 gap-5 items-start`) đã được Master phê duyệt theo viền đỏ. Cột trái (6/12) dành cho tài khoản & OTP; Cột phải (6/12) dành cho sản phẩm, tag & gói liên kết.
4. ❌ **CẤM TỰ Ý SÁNG TÁO COMPONENT MỚI INLINE**:
   - Mọi switch trượt On/Off bắt buộc dùng `<ToggleSwitch />` từ `@/shared/components`.
   - Mọi nút sao chép bắt buộc dùng `<CopyButton />` từ `@/shared/components`.
   - Mọi nút cộng ngày nhanh bắt buộc dùng `<QuickDateAddButtons />` từ `@/shared/components`.
   - Mọi ô nhập ngày bắt buộc dùng `<DateInputVN />` từ `@/shared/components`.

---

## 📋 [SPEC-KIT: ĐẶC TẢ NGHIỆP VỤ & PHẠM VI TRIỂN KHAI (SDD)]

### 1. User Stories & Bóc Tách Phạm Vi Cần Thay Thế
- **Phạm vi 1: [WarehouseCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCreateModal.tsx)**
  - *Hiện trạng*: Đã dùng `SlotProviderControls` (đã có ToggleSwitch bên trong) cho 2 cổng OTP, nhưng vẫn còn **2 nút switch On/Off tự code inline** bằng thẻ `<button className="w-11 h-6 rounded-full ..."><span className="translate-x-5" />`:
    1. Switch *"Tạo Gói Kho Cho Tài Khoản Này"* (`formData.createPackage`).
    2. Switch *"Cần tài khoản liên kết cùng gói này không?"* (`formData.hasLinkedAccount`).
  - *Nhiệm vụ Đợt 2*: Loại bỏ 100% markup button inline cũ; thay thế bằng component `<ToggleSwitch />` từ kho dùng chung `@/shared/components`.
- **Phạm vi 2: [WarehouseEditSlotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx)**
  - *Hiện trạng*: Vẫn duy trì state nội bộ `copiedField` và hàm `handleCopy(text, fieldKey)` với `setTimeout 1500ms` để render thủ công 4 nút sao chép (Username, Password, Backup email, Mã 2FA). Ngoài ra các nút `+30d`, `+90d`, `+365d` được code cứng inline.
  - *Nhiệm vụ Đợt 2*:
    1. Xóa bỏ state `copiedField` và hàm `handleCopy` thủ công.
    2. Thay 4 nút copy bằng `<CopyButton text={...} size="xs" variant="ghost" />`.
    3. Thay cụm nút `+30d`, `+90d`, `+365d` bằng `<QuickDateAddButtons onAddDays={handleAddDays} onClear={...} hasValue={...} />`.

### 2. Tiêu Chí Nghiệm Thu Gherkin (Acceptance Criteria)
```gherkin
Feature: Tái sử dụng thư viện dùng chung trên Warehouse Modals

  Scenario: Master bật/tắt công tắc Tạo Gói Kho trên WarehouseCreateModal
    Given Master đang mở modal "Thêm Tài Khoản Kho Mới"
    When Master click vào công tắc ToggleSwitch "Tạo Gói Kho Cho Tài Khoản Này"
    Then Nút trượt chuyển trạng thái On/Off mượt mà với hiệu ứng phát sáng Cyan
    And Khối cấu hình gói kho bên dưới tự động hiển thị mượt mà

  Scenario: Master sao chép mật khẩu dịch vụ trên WarehouseEditSlotModal
    Given Master đang mở modal "Chỉnh Sửa Dịch Vụ Kho"
    When Master click nút sao chép cạnh mật khẩu dịch vụ
    Then Mật khẩu được chép ngay vào Clipboard
    And Icon Copy chuyển thành Check xanh lục với nhãn "Đã sao chép" trong 1.5 giây

  Scenario: Master cộng thêm hạn dùng nhanh cho tài khoản kho
    Given Master đang ở trường "Ngày Hết Hạn Dịch Vụ" trên WarehouseEditSlotModal
    When Master bấm nút "+30 ngày" hoặc "+90 ngày"
    Then Ngày hết hạn được tính toán cộng dồn chính xác từ ngày hiện tại
    And Giá trị hiển thị đúng chuẩn định dạng "dd/mm/yyyy" qua DateInputVN
```

---

## 🛑 [PRE-FLIGHT CHECK KỸ THUẬT & CHECKLIST THỰC THI CHI TIẾT]

### 1. Chi Tiết File Tác Động & Bằng Chứng Mã Nguồn

#### A. File `WarehouseCreateModal.tsx`:
- **Đường dẫn**: [frontend/src/features/warehouse/components/WarehouseCreateModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseCreateModal.tsx)
- **Import mới**:
  ```tsx
  import { DateInputVN, ToggleSwitch } from "@/shared/components";
  ```
- **Thay thế Switch 1 (Tạo Gói Kho)**:
  - *Cũ*:
    ```tsx
    <button
      type="button"
      onClick={() => onFormChange({ ...formData, createPackage: !formData.createPackage })}
      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 ${
        formData.createPackage ? "bg-cyan-500 shadow-md shadow-cyan-500/30" : "bg-slate-800"
      }`}
    >
      <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.createPackage ? "translate-x-5" : ""}`} />
    </button>
    ```
  - *Mới*:
    ```tsx
    <ToggleSwitch
      checked={!!formData.createPackage}
      onChange={(checked) => onFormChange({ ...formData, createPackage: checked })}
      variant="cyan"
      size="md"
    />
    ```
- **Thay thế Switch 2 (Tài Khoản Liên Kết)**:
  - *Cũ*:
    ```tsx
    <button
      type="button"
      onClick={() => onFormChange({ ...formData, hasLinkedAccount: !formData.hasLinkedAccount, linkedAccountRole: formData.linkedAccountRole || "storage" })}
      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 ${
        formData.hasLinkedAccount ? "bg-cyan-500 shadow-md shadow-cyan-500/30" : "bg-slate-800"
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${formData.hasLinkedAccount ? "translate-x-5" : ""}`} />
    </button>
    ```
  - *Mới*:
    ```tsx
    <ToggleSwitch
      checked={!!formData.hasLinkedAccount}
      onChange={(checked) => onFormChange({ ...formData, hasLinkedAccount: checked, linkedAccountRole: formData.linkedAccountRole || "storage" })}
      variant="cyan"
      size="sm"
    />
    ```

#### B. File `WarehouseEditSlotModal.tsx`:
- **Đường dẫn**: [frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/warehouse/components/WarehouseEditSlotModal.tsx)
- **Import mới**:
  ```tsx
  import { CopyButton, QuickDateAddButtons } from "@/shared/components";
  ```
- **Dọn dẹp code thừa**:
  - Xóa: `const [copiedField, setCopiedField] = useState<string | null>(null);`
  - Xóa hàm: `handleCopy`
- **Thay thế 4 nút copy**:
  - Dùng `<CopyButton text={account.account} itemKey="user" />`
  - Dùng `<CopyButton text={formData.password} label="Sao chép" itemKey="pass" />`
  - Dùng `<CopyButton text={formData.backupEmail} itemKey="backup" />`
  - Dùng `<CopyButton text={formData.twoFa} label="Sao chép" itemKey="2fa" />`
- **Thay thế cụm nút cộng ngày**:
  - Dùng `<QuickDateAddButtons onAddDays={handleAddDays} onClear={() => setFormData({ ...formData, expiresAt: "" })} hasValue={!!formData.expiresAt} />`

---

## 🧪 KẾ HOẠCH KIỂM THỬ & NGHIỆM THU (TESTING & VERIFICATION)

1. **Kiểm tra biên dịch tĩnh (Type-check & Build)**:
   ```bash
   cd frontend
   npm run build
   ```
   *Yêu cầu*: Build hoàn tất trong < 5s, không có bất kỳ warning hoặc error TypeScript nào.
2. **Kiểm tra trực quan trên trình duyệt (Browser E2E)**:
   - Truy cập `http://localhost:3003/warehouse`.
   - Bấm nút *"Thêm Tài Khoản Kho Mới"*:
     * Kiểm tra switch "Tạo Gói Kho Cho Tài Khoản Này" -> Bật/tắt mượt.
     * Kiểm tra switch "Cần tài khoản liên kết cùng gói này không?" -> Bật/tắt mượt.
   - Bấm nút chỉnh sửa slot trên bảng tài khoản:
     * Kiểm tra 4 nút copy -> Icon check đổi màu xanh và copy đúng chuỗi.
     * Bấm các nút "+30 ngày", "+90 ngày", "+1 năm" -> Giá trị ô ngày hết hạn thay đổi chính xác.
3. **Ghi nhật ký báo cáo**:
   - Ghi nhận chi tiết vào [report/2026-11-21-daily-review.md](file:///e:/Project/admin_store/admin_orderlist/report/2026-11-21-daily-review.md) theo đúng quy tắc Single Daily Report File.

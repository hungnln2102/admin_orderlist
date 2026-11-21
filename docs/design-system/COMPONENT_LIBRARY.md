# 📚 COMPONENT LIBRARY & DESIGN SYSTEM (SSOT)
> **Nguồn Sự Thật Duy Nhất (Single Source of Truth) về Giao Diện của `admin_orderlist`**  
> **Căn cứ Hiến Pháp:** Điều 8 trong `AGENTS.md` (Bắt buộc kiểm toán thư viện trước khi code UI)

---

## 🛑 ĐIỀU LUẬT TỐI CAO DÀNH CHO FRONTEND & SUBAGENTS
1. **CẤM TUYỆT ĐỐI VIẾT LẠI CODE INLINE**: Mọi thành phần (Modal, Button, Input, Switch, Popup...) đã có trong tài liệu này **BẮT BUỘC PHẢI IMPORT TÁI SỬ DỤNG**.
2. **QUY TẮC ĐÓNG GÓI NGƯỢC**: Nếu một UI component mới xuất hiện từ 2 lần trở lên $\rightarrow$ **BẮT BUỘC** đóng gói vào `frontend/src/shared/components/` trước, export tại `index.ts` và ghi vào tài liệu này, sau đó mới dùng trong tính năng cụ thể.
3. **CẤM DIALOG NATIVE**: Tuyệt đối không dùng `window.alert()`, `window.confirm()`, `window.prompt()`. 100% dùng `useNotification()`.

---

## 🗂️ MỤC LỤC DANH MỤC THÀNH PHẦN CHUẨN

| Tên Component / Hook | Đường Dẫn Import | Mục Đích Sử Dụng |
| :--- | :--- | :--- |
| **`ToggleSwitch`** | `@/shared/components` | Công tắc trượt On/Off mượt mà (thay thế checkbox tick chọn) |
| **`CopyButton`** | `@/shared/components` | Nút sao chép kèm icon Check và feedback tức thì |
| **`QuickDateAddButtons`** | `@/shared/components` | Cụm nút bấm cộng ngày tắt (`+30d`, `+90d`, `+1y`, `Xóa`) |
| **`DateInputVN`** | `@/shared/components` | Ô nhập ngày tháng chuẩn định dạng Việt Nam `dd/mm/yyyy` |
| **`CurrencyInputVN`** | `@/shared/components` | Ô nhập tiền tệ tự động định dạng số và dấu chấm phân cách |
| **`DateRangePicker`** | `@/shared/components` | Bộ chọn dải ngày thống kê có sẵn các nút Hôm nay, Tuần, Tháng |
| **`GlassCard`** | `@/shared/components` | Thẻ card nền kính mờ Dark Glassmorphism bo tròn góc |
| **`StatCard`** | `@/shared/components` | Thẻ thống kê KPI kèm icon, giá trị số và badge tăng/giảm |
| **`TablePagination`** | `@/shared/components` | Thanh phân trang bảng chuẩn hóa 10-20-50 dòng/trang |
| **`useNotification`** | `@/shared/context/NotificationContext` | Hệ thống thông báo / Modal xác nhận Dark Theme thay thế dialog |
| **`useClipboard`** | `@/shared/hooks/useClipboard` | Hook sao chép clipboard tự động hẹn giờ reset 1.5s |
| **`formatVND`, `formatDate`** | `@/shared/utils/format` | Bộ định dạng tiền tệ, ngày tháng hiển thị chuẩn Việt Nam |

---

## 🛠️ CHI TIẾT & VÍ DỤ SỬ DỤNG MẪU

### 1. Công Tắc Trượt On/Off (`<ToggleSwitch />`)
Thay thế hoàn toàn các ô tick chọn `[v]` hoặc code inline phức tạp:
```tsx
import { ToggleSwitch } from "@/shared/components";

// Cơ bản
<ToggleSwitch
  checked={isEnabled}
  onChange={(val) => setIsEnabled(val)}
  label="Kích hoạt tính năng"
  variant="cyan" // "cyan" | "amber" | "emerald" | "indigo" | "rose"
  size="md" // "sm" | "md" | "lg"
/>

// Kèm mô tả phụ
<ToggleSwitch
  checked={autoRenew}
  onChange={setAutoRenew}
  label="Tự động gia hạn"
  description="Hệ thống sẽ tự động quét đơn khi đến hạn"
  variant="emerald"
/>
```

---

### 2. Nút Sao Chép Clipboard (`<CopyButton />`)
Tự động copy văn bản, hiển thị icon Check xanh ngọc trong 1.5s:
```tsx
import { CopyButton } from "@/shared/components";

// Nút nhỏ gọn bên cạnh trường dữ liệu
<CopyButton text={account.password} label="Sao chép" />

// Nút outline trong bảng
<CopyButton text={slot.otpKey} itemKey={`key-${slot.id}`} variant="outline" size="sm" />
```

---

### 3. Cụm Nút Cộng Ngày Nhanh (`<QuickDateAddButtons />`)
Dùng cho mọi form quản lý hạn dùng (Kho hàng, Đơn hàng, Gói):
```tsx
import { QuickDateAddButtons } from "@/shared/components";

<QuickDateAddButtons
  onAddDays={(days) => handleAddDays(days)}
  onClear={() => setExpiryDate("")}
  hasValue={Boolean(expiryDate)}
/>
```

---

### 4. Ô Nhập Ngày Tháng Việt Nam (`<DateInputVN />`)
Tự động định dạng `dd/mm/yyyy`, chống lỗi múi giờ và lệch ngày:
```tsx
import { DateInputVN } from "@/shared/components";

<DateInputVN
  value={formData.expiredAt}
  onChange={(val) => setFormData({ ...formData, expiredAt: val })}
  placeholder="dd/mm/yyyy"
/>
```

---

### 5. Popup Xác Nhận & Cảnh Báo (`useNotification`)
Tuyệt đối không dùng `window.confirm` hay `window.alert`:
```tsx
import { useNotification } from "@/shared/context/NotificationContext";

const notify = useNotification();

// 1. Thông báo Toast
notify.success("Đã lưu dữ liệu thành công!", "Hoàn tất");
notify.error("Không thể kết nối máy chủ!", "Lỗi");

// 2. Popup Xác nhận (Confirm Modal)
notify.confirm({
  title: "Xác Nhận Xóa Dịch Vụ",
  message: "Hành động này sẽ xóa vĩnh viễn slot khỏi hệ thống.",
  confirmText: "Xóa Ngay",
  danger: true, // Nút đỏ cảnh báo
  onConfirm: async () => {
    await handleDelete();
  },
});

// 3. Popup Nhập thông tin (Prompt Modal)
notify.prompt({
  title: "Nhập Lý Do Hủy",
  message: "Vui lòng ghi rõ lý do hủy đơn hàng này:",
  placeholder: "Ví dụ: Khách đổi ý, NCC hết hàng...",
  onConfirm: async (reason) => {
    await handleCancel(reason);
  },
});
```

---

### 6. Chuẩn Hóa Bố Cục Modal Form Ngang (Horizontal 2-Column Modal)
Mọi modal form tạo mới hoặc chỉnh sửa phức tạp bắt buộc phải tuân theo chuẩn **Form Ngang 2 Cột**:
- **Container**: `w-full max-w-5xl xl:max-w-6xl max-h-[92vh] rounded-3xl bg-slate-900/95 border p-5 sm:p-7`
- **Body**: `grid grid-cols-1 lg:grid-cols-12 gap-5 items-start`
  - Cột Trái (`lg:col-span-6`): Thông tin định danh, tài khoản, cấu hình cốt lõi.
  - Cột Phải (`lg:col-span-6`): Phân loại, trạng thái, hạn dùng, ghi chú.
- **Footer**: `flex items-center justify-end gap-3 pt-4 border-t border-white/10`


---

### 7. Combobox Tìm Kiếm & Điều Hướng Bàn Phím (`<SearchableCombobox />`)
Thay thế các dropdown tự viết có lọc từ khóa, hỗ trợ phím `ArrowUp`, `ArrowDown`, `Enter`, `Escape` và tùy chọn nhập tay:
```tsx
import { SearchableCombobox } from "@/shared/components";

<SearchableCombobox
  value={selectedAccount}
  onChange={setSelectedAccount}
  options={warehouseAccounts}
  placeholder="Chọn hoặc nhập tài khoản..."
  accent="blue"
  listHeaderLabel="Kho tài khoản"
/>
```


---

### 8. Khung Modal Chuẩn Responsive (`<BaseModal />`)
Mọi modal tạo mới / chỉnh sửa / xem chi tiết đều nên bọc qua `<BaseModal />` để tự động đạt chuẩn Mobile & Tablet (`max-h-[92vh]`, body `overflow-y-auto`, cố định header/footer, hỗ trợ phím `Esc`):
```tsx
import { BaseModal } from "@/shared/components";

<BaseModal
  isOpen={isOpen}
  onClose={onClose}
  size="4xl"
  title="Thêm Chi Phí Cố Định"
  subtitle="Thiết lập định mức chi phí hàng tháng"
  icon={<div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400"><Home className="w-5 h-5" /></div>}
>
  {/* Nội dung form 2 cột */}
</BaseModal>
```


---

### 9. Dropdown Chọn Chuẩn Dark Glassmorphism (`<CustomSelect />`)
Thay thế hoàn toàn thẻ `<select>` gốc trình duyệt (render menu qua React Portal chống cắt trong modal, tự lật lên khi gần đáy màn hình, hỗ trợ tìm kiếm & bàn phím):
```tsx
import { CustomSelect } from "@/shared/components";

<CustomSelect
  value={formData.serviceName}
  onChange={(val) => setFormData({ ...formData, serviceName: val })}
  placeholder="Chọn sản phẩm"
  accent="cyan"
  options={catalogItems.map((c) => ({ value: c.name, label: c.name }))}
/>
```

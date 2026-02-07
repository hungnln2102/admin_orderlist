# Quy tắc đặt tên BEM (Block Element Modifier)

Dự án dùng **BEM** cho class CSS / `className` trong React để tránh xung đột, dễ bảo trì và refactor.

---

## 1. Cú pháp

| Thành phần | Cú pháp | Ví dụ |
|------------|--------|--------|
| **Block** | `tên-khối` (kebab-case) | `order-card`, `sidebar`, `modal` |
| **Element** | `block__element` (hai dấu gạch dưới) | `order-card__title`, `sidebar__menu` |
| **Modifier** | `block--modifier` hoặc `block__element--modifier` | `order-card--expired`, `order-card__price--highlight` |

- **Block**: thành phần độc lập, có nghĩa riêng (card, form, table).
- **Element**: phần con thuộc block, không dùng tách rời (title, body, footer của card).
- **Modifier**: biến thể trạng thái/giao diện (disabled, active, expired).

---

## 2. Quy ước dùng trong dự án

### 2.1. Tên class

- Chỉ dùng **chữ thường** và **dấu gạch ngang** (kebab-case).
- Block/Element/Modifier đều viết bằng tiếng Anh, ngắn gọn.

```txt
✅ order-card
✅ order-card__header
✅ order-card--expired
❌ OrderCard
❌ order_card
❌ orderCard
```

### 2.2. Kết hợp với Tailwind

- **Block** luôn là class đầu tiên (để dễ tìm và override).
- Các class Tailwind đứng sau.

```tsx
// Đúng
<div className="order-card rounded-xl border border-white/10 bg-slate-800/80 p-4">

// Đúng: modifier
<div className="order-card order-card--expired rounded-xl bg-rose-500/10">

// Sai: không có block
<div className="rounded-xl border p-4">
```

### 2.3. Component React vs class BEM

- **Tên file / component**: giữ PascalCase (ví dụ `OrderCard.tsx`, `OrderRow.tsx`).
- **className (class CSS)**: theo BEM, kebab-case (ví dụ `order-card`, `order-card__title`).

```tsx
// OrderCard.tsx
export const OrderCard: React.FC<OrderCardProps> = (props) => (
  <div className="order-card rounded-xl ...">
    <h3 className="order-card__title text-lg font-semibold">...</h3>
    <p className="order-card__meta text-sm text-white/70">...</p>
  </div>
);
```

---

## 3. Ví dụ theo từng loại UI

### 3.1. Card (OrderCard)

```tsx
className="order-card"                    // Block (root)
className="order-card__header"           // Element
className="order-card__title"
className="order-card__body"
className="order-card__footer"
className="order-card__actions"
className="order-card--expired"          // Modifier (trạng thái)
className="order-card--mobile"           // Modifier (layout)
```

### 3.2. Modal

```tsx
className="modal"                        // Block
className="modal__backdrop"
className="modal__container"
className="modal__header"
className="modal__title"
className="modal__body"
className="modal__footer"
className="modal--fullscreen"            // Modifier
```

### 3.3. Sidebar

```tsx
className="sidebar"
className="sidebar__header"
className="sidebar__menu"
className="sidebar__item"
className="sidebar__item--active"
className="sidebar--collapsed"
```

### 3.4. Form / Input

```tsx
className="form-group"
className="form-group__label"
className="form-group__input"
className="form-group__error"
className="form-group--invalid"
className="form-group--disabled"
```

### 3.5. Table

```tsx
className="data-table"
className="data-table__head"
className="data-table__row"
className="data-table__cell"
className="data-table__cell--numeric"
className="data-table__row--highlight"
```

---

## 4. Không dùng BEM cho

- **Utility thuần Tailwind** không gắn với một block cụ thể: có thể chỉ dùng Tailwind (ví dụ `flex gap-2`, `text-red-500`).
- **Class từ thư viện bên thứ ba**: giữ nguyên theo tài liệu thư viện.

---

## 5. Tóm tắt nhanh

| Nội dung | Quy tắc |
|----------|--------|
| Block | `block-name` (kebab-case) |
| Element | `block-name__element-name` |
| Modifier | `block-name--modifier` hoặc `block-name__element--modifier` |
| File/Component | PascalCase (`OrderCard.tsx`) |
| className | Luôn có ít nhất một block; BEM + Tailwind được phép kết hợp |

Khi thêm/sửa component, ưu tiên đặt tên class theo BEM như trên để đồng bộ toàn dự án.

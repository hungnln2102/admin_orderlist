# Kiến trúc một hướng — admin_orderlist

Tài liệu này **chốt hướng cấu trúc tổng thể** của repo. Mọi tính năng mới và refactor cấu trúc cần **tuân theo**, tránh song song hai phong cách (`controllers/` rời vs `domains/`) vô thời hạn.

**Checklist thực hiện từng bước:** xem file `task.md` ở thư mục gốc repo `admin_orderlist/`.

---

## 1. Quyết định (ADR ngắn)

| Câu hỏi | Quyết định |
|--------|------------|
| Backend tổ chức theo đâu? | **Theo domain (bounded context)** dưới `backend/src/domains/<domain>/`, không thêm “khối” nghiệp vụ mới dưới dạng `controllers/XxxController` + `routes/xxxRoutes` tách rời. |
| Frontend tổ chức theo đâu? | **Theo feature** dưới `frontend/src/features/<feature>/`. Logic dùng chung thật sự mới đưa vào `frontend/src/shared/`. |
| Migrate từ code cũ? | **Tăng dần (incremental)**: mỗi PR ưu tiên **một domain** (hoặc cụm rất nhỏ cùng ranh giới), **giữ nguyên path API và JSON** trừ khi có task breaking-change riêng. |
| Process nặng (scheduler, renew)? | Vẫn có thể **tách process** (scheduler, webhook, renew API); code nghiệp vụ nằm trong **domain tương ứng**, mount chỉ là “lối vào” mỏng trong `routes/index.js`. |

---

## 2. Cấu trúc đích — Backend

```
backend/src/domains/<domain>/
  routes.js           # mount path, middleware mỏng; export express.Router
  controller/         # điều phối HTTP → use-cases (không nhồi SQL dài)
  use-cases/          # luồng nghiệp vụ
  repositories/       # truy vấn DB / Knex (hoặc query modules tập trung)
  validators/         # (tuỳ domain) express-validator rules
  mappers/            # (khi cần) map DB ↔ DTO
  adapters/           # (khi cần) HTTP/SDK bên thứ ba
```

**Nguyên tắc:**

- `routes.js` **mỏng**: không chứa business logic.
- **Validators** thuộc domain khi rule chỉ phục vụ domain đó; dần giảm `validators/` global trùng tên.

**Đã có sẵn mẫu:** `domains/ip-whitelist/`, `domains/site-maintenance/` — mount trực tiếp từ `routes/index.js`.

**Cấu hình chung** (dbSchema, logger, middleware toàn cục, `app.js`) **không** gộp vào từng domain — giữ ở `config/`, `middleware/`, `utils/`.

---

## 3. Cấu trúc đích — Frontend

```
frontend/src/features/<feature>/
  pages/
  components/
  hooks/
  api/
  types.ts | types/
  utils/
```

**Nguyên tắc:**

- Gọi HTTP qua **`shared/api/client`** (`apiFetch`, …), không phình thêm `lib/api.ts` thành nơi gom mọi feature API.
- Tránh **catch-all** kiểu `lib/helpers.ts` phình lớn — tách về feature hoặc `shared/utils` khi ≥ 2 feature dùng.

**Component layout** (`MainLayout`, modal dùng chung nhiều feature) có thể ở `components/` gốc; **state/luồng nghiệp vụ** nên thuộc feature owner hoặc hook rõ ràng.

---

## 4. File mount API trung tâm

`backend/src/routes/index.js` sau cùng chỉ nên:

- Đăng ký middleware toàn cục (auth public paths, `authGuard`, timeout dài cho vài mount).
- `router.use('<prefix>', require('../domains/<x>/routes'))` (hoặc tương đương).

Các domain đã migrate (banks, categories, …) được **require trực tiếp** trong `routes/index.js`; không còn file `routes/*Routes.js` chỉ re-export một dòng cho các domain đó.

---

## 5. Mapping gợi ý (legacy → domain)

Bảng chi tiết và thứ tự ưu tiên nằm trong **`task.md`**. Tên folder domain có thể tinh chỉnh (ví dụ gộp `product-*` dưới `catalog`) **một lần** khi bắt đầu slice tương ứng, rồi giữ cố định.

---

## 6. Kiểm thử sau mỗi slice

- Lint backend/frontend.
- Smoke: ít nhất luồng chạm trực tiếp domain đó (CRUD hoặc GET chính); với domain tài chính / webhook / renew thì bám test/ops hiện có trong `backend/package.json`.

---

## 7. Liên kết

- Skeleton và việc cần làm khi tạo domain mới: **`backend/src/domains/README.md`**.
- Kế hoạch công việc có checkbox: **`../task.md`** (thư mục gốc `admin_orderlist`).
- Kiến thức nền monorepo / DB / Adobe: **`admin_orderlist/.agents/SKILL.md`**.

---

## 8. Trạng thái chuẩn bị (Phase 0–1)

- **2026-04-30**: Đã ghi nhận baseline cấu trúc một hướng; rule Cursor `backend-domains-only.mdc`; `domains/README.md`; ghi chú mount trong `routes/index.js`. Chi tiết checkbox: `task.md`.

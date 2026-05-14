# Tổng quan dự án (admin_orderlist)

Tài liệu **sống**: mô tả kiến trúc và luồng chính; **cập nhật khi dọn code** (dọn tới đâu, ghi tới đó). Chi tiết cleanup theo từng hạng mục vẫn tham chiếu [`ke-hoach-cleanup-rule-he-thong.md`](./ke-hoach-cleanup-rule-he-thong.md).

---

## Trước khi dọn code (bắt buộc)

Mỗi lần **dọn, refactor hoặc thêm rule** mà **liên quan** tới nội dung đã (hoặc sẽ) được mô tả ở đây — ví dụ: tab **Tổng quan**, `dashboard.dashboard_monthly_summary`, API `/api/dashboard/**`, luồng post finance / receipt ảnh hưởng số trên dashboard, `supplier_order_cost_log` và trigger cập nhật tổng hợp — thì **phải đọc lại toàn bộ file `tong-quan-du-an.md` và đối chiếu mục tương ứng trong `ke-hoach-cleanup-rule-he-thong.md`** trước khi sửa. Mục đích: **tránh rule chồng chéo** (hai nguồn cùng cộng một KPI, UI/API đọc khác trigger, v.v.).

Sau khi đổi hành vi: **cập nhật đúng mục trong file này** và **thêm một khối ghi chú ở cuối file** trong phần **«Lịch sử chỉnh sửa»** (có **`ID:` `TQD-Hxx`** mới, **thời gian** sửa, ngăn cách khối bằng `---`).

---

## 1. Repo trong workspace

| Thành phần | Vai trò ngắn gọn |
|------------|------------------|
| `admin_orderlist/backend` | API Express, Knex, webhook Sepay, scheduler, domain đơn hàng / tài chính / dashboard |
| `admin_orderlist/frontend` | Admin UI (React + TS + Vite) |
| `admin_orderlist/database` | Docker Postgres init, dump/schema hợp nhất, legacy SQL |
| `mavrykstore_bot`, `Website` | Repo lân cận (không mô tả sâu trong file này trừ khi đã ghi) |

**Stack tham chiếu nhanh:** PostgreSQL, backend Node, frontend React; session, Sepay, Telegram (xem `README.md` gốc repo).

---

## 2. Nguyên tắc khi đọc / sửa code

- **Đọc lại mục “Trước khi dọn code”** khi phạm vi công việc chạm tới các luồng đã nêu.
- **Schema runtime** mà backend được phép gọi: `backend/src/config/dbSchema` (đối chiếu DB khi đổi bảng/cột).
- **`dashboard.dashboard_monthly_summary`**: bảng **projection** (tổng hợp theo `month_key`), không coi là nơi phát sinh business event — event gốc nằm ở receipt / log NCC / cập nhật đơn + luồng post finance.
- Migration đã chạy production: **không sửa lịch sử**; thay đổi DB bằng **migration Knex mới**.

---

## 3. Luồng màn **Tổng quan** (Dashboard → tab Overview)

Mục tiêu hiện tại: **UI Tổng quan chỉ đọc số liệu đã lưu trong `dashboard.dashboard_monthly_summary`** (không query trực tiếp `order_list`, biên lai Sepay hay `supplier_order_cost_log` cho API này). **Ngoại lệ có kiểm soát** từ `dashboard.store_profit_expenses`: **lợi nhuận tháng** trừ thêm chi phí **nhập hàng MAVN** (`mavn_import`) và **nhập hàng ngoài luồng** (`external_import`), theo tháng `created_at`; **lợi nhuận khả dụng** chỉ trừ `withdraw_profit` — xem **§3.3.1**.

### 3.1. Frontend

| File / hook | Việc làm |
|-------------|----------|
| `frontend/src/features/dashboard/pages/DashboardPage.tsx` | Tab `overview`: `OverviewSection` + filter khoảng ngày (`dashboardRange`) |
| `frontend/src/features/dashboard/hooks/useDashboardStats.ts` | Gọi `fetchDashboardStats(range)`, `fetchChartData(year)` hoặc `fetchChartDataRange(from,to)` |
| `frontend/src/features/dashboard/api/dashboardApi.ts` | `GET /api/dashboard/stats`, `/charts`, `/years`; mapping payload biểu đồ |
| `frontend/src/features/dashboard/hooks/useMonthlySummary.ts` | `GET /api/dashboard/monthly-summary` (hiện UI bảng có thể ẩn nhưng API vẫn dùng được) |

### 3.2. Backend — route

Prefix API: **`/api/dashboard`** (`backend/src/routes/dashboardRoutes.js`).

| Method + path | Handler | Ghi chú |
|---------------|---------|---------|
| `GET /stats` | `dashboardStats` | Không query: KPI tháng hiện tại vs tháng trước từ bảng tổng hợp. Có `?from=&to=` (yyyy-mm-dd): **cộng dồn mọi `month_key`** mà khoảng ngày **chạm** (từ tháng của `from` đến tháng của `to`). |
| `GET /charts` | `dashboardCharts` | `?year=`: các tháng của năm từ bảng tổng hợp. `?from=&to=`: một điểm/tháng trong danh sách `month_key` như trên. |
| `GET /years` | `dashboardYears` | Năm lấy từ `DISTINCT` phần năm trong `month_key` của bảng tổng hợp. |
| `GET /monthly-summary` | `dashboardMonthlySummary` | Danh sách hàng `dashboard_monthly_summary`, `month_key` giảm dần. |

Logic tập trung tại **`backend/src/controllers/DashboardController/service.js`**; **`availableProfitFromSummary.js`** cho `availableProfit`.

### 3.3. Hành vi nghiệp vụ cần nhớ

- **Filter theo ngày** không chia nhỏ trong tháng: nếu range cắt qua tháng 3 và 4 thì KPI là **tổng** các cột của **cả** `month_key` 2026-03 và 2026-04 (v.v.).
- Thẻ KPI: **thuế** = cột **`total_tax`** trên bảng (không tính lại % trên client cho API này).
- Cần số khớp biểu đồ: bảng phải được cập nhật bởi trigger / job / **`rebuild-dashboard-monthly-summary`** — xem plan cleanup mục dashboard.

### 3.3.1. Lợi nhuận tháng (`monthlyProfit`) và lợi nhuận khả dụng (`availableProfit`) — `GET /api/dashboard/stats` (và range)

Nguồn gốc doanh thu/lợi nhuận tháng trên bảng: `dashboard.dashboard_monthly_summary`. Điều chỉnh thêm từ `dashboard.store_profit_expenses` (theo **tháng lịch** của `created_at`, `DATE_TRUNC` tháng server):

| Số hiển thị | Công thức (tóm tắt) |
|-------------|---------------------|
| **Lợi nhuận tháng** (KPI / biểu đồ / bảng monthly-summary API) | `total_profit` (theo `month_key` trên summary) **trừ** tổng `amount` trong tháng lịch của `created_at`: **đơn nhập MAVN** (`mavn_import`) và **nhập ngoài luồng** (`external_import`). Hai loại cùng nguồn bảng `store_profit_expenses`. |
| **Lợi nhuận khả dụng** | `SUM(total_profit)` mọi tháng trên summary **chỉ trừ** tổng (mọi thời điểm) `withdraw_profit` (rút tiền). **Không** trừ `mavn_import` / `external_import` vào số này. |
| **`previous` (khả dụng)** | Tổng `total_profit` các tháng có `month_key` **nhỏ hơn** tháng hiện tại **trừ** `withdraw_profit` có `created_at` **trước** ngày 1 của tháng hiện tại. |

Logic: `service.js` + `availableProfitFromSummary.js` (khả dụng) + `dashboardStoreExpenseDeductions.js` (tổng `mavn_import` + `external_import` theo tháng để **trừ** khỏi lợi nhuận tháng; helper `withdraw_profit` cho khả dụng).

- **`mavn_import`:** chi phí gắn **đơn nhập MAVN** (thường đồng bộ khi tạo đơn Đã TT — `Order/finance/mavnStoreExpenseSync`).
- **`external_import`:** chi phí **nhập hàng ngoài luồng** (ghi tay qua API/UI, cùng cơ chế trừ LN tháng theo `created_at`).

- **Lịch sử / chốt phương án một luồng:** **`TQD-H03`**; **khả dụng chỉ trừ rút tiền:** **`TQD-H08`** (cuối file).

### 3.4. Tách với tooling nội bộ

- `buildAlignedMonthlyRows` trong `monthlySnapshot.js` vẫn dùng cho **rebuild** và script **đối soát ledger** (`revenueSource: 'receipts'`), **không** phải nguồn của HTTP Tổng quan sau thay đổi này.

---

## 4. Credit hoàn tiền khách (`receipt.refund_credit_notes`)

Phiếu credit gắn đơn nguồn hoàn tiền; dùng khi **tạo đơn mới** (chế độ Credit) hoặc áp vào đơn đích. Logic backend tập trung `backend/src/controllers/Order/finance/refundCredits.js`.

### 4.1. Danh sách khả dụng cho dropdown tạo đơn

- **API:** `GET /api/orders/refund-credits/available` (`refundCreditRoutes.js`).
- **Điều kiện phiếu được coi là khả dụng:** `available_amount > 0`; `status` ∈ `OPEN`, `PARTIALLY_APPLIED`; `succeeded_by_note_id` IS NULL; nếu có `source_order_list_id` thì join `orders.order_list` và chỉ giữ khi đơn nguồn còn **Chưa Hoàn** hoặc **Đã Hoàn** (nếu không gắn đơn nguồn vẫn trả về — dữ liệu cũ).

### 4.2. Xác nhận hoàn tiền chuyển khoản (màn Hoàn tiền)

- **API:** `PATCH /api/orders/canceled/:id/refund` (`renewRoutes.js`): đơn **Chưa Hoàn** → **Đã Hoàn**.
- **Kèm theo (cùng transaction):** gọi `voidOpenRefundCreditNotesForSourceOrder` — **VOID** và **available_amount = 0** cho mọi phiếu credit còn số dư (`OPEN` / `PARTIALLY_APPLIED`, `available_amount > 0`) có `source_order_list_id` = id đơn; ghi chú vào `note` (đã xác nhận hoàn CK, hủy credit còn lại). Sau bước này phiếu không còn trong danh sách «available».

### 4.3. Nhắc Tổng quan — lợi nhuận tháng & khả dụng

- **Lợi nhuận tháng:** trừ `mavn_import` + `external_import` (theo tháng) — **§3.3.1**. **Lợi nhuận khả dụng:** chỉ trừ `withdraw_profit` — **§3.3.1**; mốc lịch sử **`TQD-H03`**, tinh chỉnh khả dụng **`TQD-H08`**.

---

## 5. Liên kết nhanh

- Kế hoạch cleanup rule: [`ke-hoach-cleanup-rule-he-thong.md`](./ke-hoach-cleanup-rule-he-thong.md)
- README setup: [`../README.md`](../README.md)

---

# Lịch sử chỉnh sửa `tong-quan-du-an.md`

**Quy ước:** Mỗi lần **thêm hoặc sửa** nội dung ở các phần phía trên, ghi lại **dưới đây**: một khối mới **ở cuối** (dưới khối mới nhất hiện có), có **`ID:`** cố định dạng `` `TQD-Hxx` `` (tăng dần: `H01`, `H02`, …) để tham chiếu / gọi lại khi chỉnh sửa; luôn có **thời gian** (`YYYY-MM-DD`, có thể thêm giờ nếu nhiều thay đổi trong ngày); ngăn cách khối bằng một dòng `---`.

---

**ID:** `TQD-H01` · **Thời gian:** 2026-04-29

- Khởi tạo `docs/tong-quan-du-an.md`; mô tả luồng Tổng quan; API dashboard (`service.js`) chỉ đọc `dashboard.dashboard_monthly_summary` cho stats / charts / years / monthly-summary.

---

**ID:** `TQD-H02` · **Thời gian:** 2026-04-29

- Thêm mục «Trước khi dọn code (bắt buộc)»; bổ sung bullet ở §2.

---

**ID:** `TQD-H03` · **Thời gian:** 2026-04-29

- **Một luồng (API Tổng quan — `service.js` + `availableProfitFromSummary.js` + `dashboardStoreExpenseDeductions.js`):**
  - **Lợi nhuận tháng** (`monthlyProfit`, biểu đồ, `GET /dashboard/monthly-summary`): `total_profit` trên `dashboard_monthly_summary` theo `month_key` **trừ** (trong tháng `created_at`) tổng `mavn_import` + `external_import` trong `store_profit_expenses`.
  - **Lợi nhuận khả dụng** (`availableProfit`): `SUM(total_profit)` mọi tháng trên summary **chỉ trừ** tổng `withdraw_profit` (xem **`TQD-H08`** nếu cần phân biệt với bản trước đã trừ thêm MAVN/external). `previous`: profit các tháng trước tháng hiện tại **trừ** `withdraw_profit` có `created_at` trước ngày 1 tháng hiện tại.

---

**ID:** `TQD-H04` · **Thời gian:** 2026-04-29

- Bỏ bảng nhật ký giữa file; chuyển **toàn bộ lịch sử chỉnh sửa tài liệu** xuống **cuối file**; thêm quy ước khối + `---`; cập nhật hướng dẫn sau «Trước khi dọn code» (ghi chú ở cuối, có thời gian).

---

**ID:** `TQD-H05` · **Thời gian:** 2026-04-29

- Thêm **§4** — credit hoàn tiền khách: điều kiện `GET /api/orders/refund-credits/available`; `PATCH /api/orders/canceled/:id/refund` + `voidOpenRefundCreditNotesForSourceOrder`. Đánh số lại **Liên kết nhanh** thành **§5**. §4.3 trỏ §3.3.1 + **`TQD-H03`**.

---

**ID:** `TQD-H06` · **Thời gian:** 2026-04-29

- Lịch sử: mỗi khối có **`ID:` `TQD-Hxx`** cố định; gom các mốc trùng `availableProfit` về **`TQD-H03`**; §3.3.1 và §4.3 trỏ **`TQD-H03`**; bổ sung **`TQD-H06`** cho mốc này.

---

**ID:** `TQD-H07` · **Thời gian:** 2026-04-29

- Chốt phần **lợi nhuận tháng** và khối điều chỉnh từ `store_profit_expenses`: tháng trừ `mavn_import` + `external_import` (theo tháng); phiên bản **`availableProfit`** khi đó còn trừ cả MAVN/external + `withdraw_profit` — sau đó được thay bằng quy tắc **chỉ trừ rút tiền** (**`TQD-H08`**).

---

**ID:** `TQD-H08` · **Thời gian:** 2026-04-29

- **Lợi nhuận khả dụng** (`availableProfit`, `GET /api/dashboard/stats`): chỉ **`SUM(total_profit)` − tổng `withdraw_profit`**; **không** trừ `mavn_import` / `external_import` (hai loại này chỉ làm giảm **lợi nhuận tháng**). `previous` (khả dụng): tổng `total_profit` các tháng trước tháng hiện tại **trừ** `withdraw_profit` trước ngày 1 tháng hiện tại. Code: `fetchAvailableProfitPair` trong **`availableProfitFromSummary.js`** (chỉ đọc summary + `withdraw_profit`). Cập nhật §3.3.1, §4.3, khối **`TQD-H03`**.

---

**ID:** `TQD-H09` · **Thời gian:** 2026-04-29

- Đồng bộ code với §3 / **TQD-H03** / **TQD-H08**: `fetchAvailableProfitPair` chỉ trừ `withdraw_profit`; lợi nhuận tháng (stats, monthly rows, charts theo range) **trừ** `mavn_import` + `external_import` theo tháng `created_at`; thuế KPI dùng `total_tax` trên `dashboard_monthly_summary` khi có hàng; `GET /stats?from&to` và `GET /charts?from&to` cộng dồn theo **month_key** từ bảng tổng hợp (không query Sepay/NCC trực tiếp cho các API đó). Khôi phục `dashboardStoreExpenseDeductions.js` nếu thiếu trong working tree.

---

**ID:** `TQD-H10` · **Thời gian:** 2026-04-29

- Làm rõ §3 (ngoại lệ `store_profit_expenses` tách **tháng** vs **khả dụng**); tách `fetchAvailableProfitPair` → **`availableProfitFromSummary.js`** (hợp đồng: khả dụng **chỉ** trừ `withdraw_profit`).

---

**ID:** `TQD-H11` · **Thời gian:** 2026-04-29

- Chốt diễn đạt nghiệp vụ: **lợi nhuận tháng** trừ **nhập hàng MAVN** (`mavn_import`) và **nhập hàng ngoài luồng** (`external_import`); cập nhật §3, §3.3.1 và comment `dashboardStoreExpenseDeductions.js`.

---

**ID:** `TQD-H12` · **Thời gian:** 2026-04-29

- Webhook Sepay (`webhook/sepay/routes/webhook.js`): đơn **Đã Thanh Toán** + biên lai mới (`inserted`) → cộng **doanh thu và lợi nhuận** cùng số tiền giao dịch (**không** trừ cost, nhánh audit **`POST_PAID_ADDITIONAL_RECEIPT`**). Sửa điều kiện cũ `__skip_already_posted__` (không bao giờ khớp với `PAID`).

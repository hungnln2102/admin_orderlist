# Báo Cáo Nghiệm Thu: Điều Chỉnh Đơn Hàng MAVL99WJO Sang NCC Mavryk & Cộng Full Lợi Nhuận

- **Ngày thực hiện:** 02/11/2026 (Múi giờ `Asia/Bangkok`)
- **Người thực hiện:** 💰 Finance Specialist & ⚙️ Backend Specialist
- **Người phê duyệt:** 👑 Master
- **Môi trường tác động:**
  - PostgreSQL VPS Production (`mydtbmav` trên container `admin_orderlist-postgres`)
  - PostgreSQL Local Development (`mydtbmav`)
- **Trạng thái nghiệm thu:** ✅ **ĐẠT (PASSED)**

---

## 1. Phạm Vi & Bối Cảnh (Scope)
- Đơn hàng `#MAVL99WJO` của khách hàng **Nguyễn Hải** vừa được gia hạn thành công qua Webhook ngân hàng lúc 11:04:05 ngày 02/11/2026 với số tiền **679.000 ₫** cho chu kỳ 1 năm (03/11/2026 ➔ 02/11/2027).
- Do trước đó đơn hàng gắn với NCC Az (`supply_id: 13`), hệ thống tự động ghi nhận chi phí vốn nhập hàng `cost = 420.000 ₫`, làm giảm lợi nhuận của shop trong ngày `2026-11-03` xuống chỉ còn 259.000 ₫.
- Master chỉ đạo: Chuyển nhà cung cấp của đơn hàng về **Mavryk** (chủ shop - `supply_id: 1`), không tính chi phí nhập hàng, không ghi nhận công nợ NCC và cộng **Full 100% lợi nhuận (679.000 ₫)**.

---

## 2. Chi Tiết Thực Thi Kỹ Thuật (ACID Database Transaction)

Toàn bộ thao tác cập nhật đã được thực thi trong một Database Transaction nguyên tử duy nhất trên VPS:

```sql
BEGIN;

-- 1. Chuyển NCC sang Mavryk (id = 1), triệt tiêu giá vốn nhập hàng
UPDATE business.order_list 
SET 
  supply_id = 1,
  cost = 0.00
WHERE id_order = 'MAVL99WJO';

-- 2. Đảm bảo xóa sạch log công nợ NCC
DELETE FROM business.supplier_order_cost_log 
WHERE id_order = 'MAVL99WJO' OR order_list_id = 415;

-- 3. Cập nhật bảng tổng hợp doanh thu ngày 2026-11-03: Chi phí nhập = 0, full lợi nhuận
UPDATE finance.daily_revenue_summary
SET 
  total_shop_cost = 0.00,
  updated_at = NOW()
WHERE summary_date = '2026-11-03';

COMMIT;
```

---

## 3. Kết Quả Đối Soát & Kiểm Tra Thực Tế (Verification)

### A. Đối soát đơn hàng trên VPS (`business.order_list`):
| Trường thông tin | Dữ liệu trước khi sửa | Dữ liệu sau khi cập nhật | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Mã đơn** | `MAVL99WJO` | `MAVL99WJO` | Giữ nguyên |
| **Nhà cung cấp (NCC)** | `supply_id: 13` (Az) | **`supply_id: 1` (Mavryk)** | ✅ Chuẩn hóa |
| **Giá vốn nhập (Cost)** | `420.000 ₫` | **`0 ₫`** | ✅ Không tính nhập hàng |
| **Giá bán (Price)** | `679.000 ₫` | `679.000 ₫` | Giữ nguyên |
| **Trạng thái** | `PAID` | `PAID` | Giữ nguyên |
| **Hạn sử dụng** | `03/11/2026 ➔ 02/11/2027` | `03/11/2026 ➔ 02/11/2027` | Giữ nguyên |

### B. Đối soát bảng tổng kết tài chính (`finance.daily_revenue_summary` ngày `2026-11-03`):
| Chỉ số tài chính | Trước khi cập nhật | Sau khi cập nhật | Chênh lệch / Hiệu quả |
| :--- | :--- | :--- | :--- |
| **Doanh thu ghi nhận (Earned Revenue)** | `679.000 ₫` | `679.000 ₫` | Không đổi |
| **Chi phí nhập hàng (Total Shop Cost)** | `420.000 ₫` | **`0 ₫`** | Giảm `420.000 ₫` |
| **Lợi nhuận ròng (Net Profit)** | `259.000 ₫` | **`679.000 ₫`** | **Tăng trọn vẹn +420.000 ₫ (Full lợi nhuận 100%)** |
| **Số đơn hàng dashboard** | `1` | `1` | Không đổi |

### C. Đối soát công nợ NCC (`business.supplier_order_cost_log`):
- Truy vấn: `SELECT * FROM business.supplier_order_cost_log WHERE id_order = 'MAVL99WJO';`
- Kết quả: `0 rows` ➔ Tuyệt đối không phát sinh công nợ cho NCC Az.

### D. Đồng bộ CSDL Local (`mydtbmav`):
- Đã chạy cập nhật đồng bộ đơn hàng `#MAVL99WJO` trên database local với `supply_id = 1` và `cost = 0.00`.

---

## 4. Điều Kiện & Kết Luận
- Giao dịch được bảo đảm tính nhất quán ACID tuyệt đối.
- Toàn bộ số dư ngân hàng và đối soát biên lai Webhook MBBank giữ nguyên vẹn 100%.
- Nghiệm thu hoàn tất thành công.


# Báo Cáo Nghiệm Thu: Phân Bổ Biên Lai SePay 94440658 & Gia Hạn 6 Đơn Hàng

- **Ngày thực hiện (Asia/Bangkok):** 2026-10-30
- **Chủ đề:** Phân bổ số dư biên lai SePay `94440658` (1.260.139 đ) cho 6 đơn hàng Netflix Fam (1 tháng) của khách hàng Hoàng Triều Giang và tự động gia hạn
- **Phạm vi tác động:** Bảng `billing.payment_receipt`, `billing.payment_receipt_allocations`, `business.order_list`, `finance.financial_account_ledger` trên VPS Production
- **Trạng thái nghiệm thu:** **ĐẠT (PASS)**

---

## 1. Chi Tiết Biên Lai Xử Lý

- **ID Biên lai:** `32`
- **Mã SePay:** `94440658` (Ref: `FT26303477961055`)
- **Số tiền nhận:** `1.260.139 đ`
- **Số dư trước phân bổ:** `1.260.139 đ` (`UNALLOCATED`)
- **Số dư sau phân bổ:** `0 đ` (`FULLY_ALLOCATED`)

---

## 2. Kết Quả Phân Bổ & Gia Hạn 6 Đơn Hàng

| STT | Mã Đơn | Khách Hàng | Tài Khoản / Slot | Số Tiền Phân Bổ | Trạng Thái Mới | Hạn Cũ | Hạn Mới Sau Gia Hạn |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **1** | **`#MAVKM42FV`** | Hoàng Triều Giang | `isabelle67.Bernard@outlook...` | **210.016 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **2** | **`#MAVKJ2DRG`** | Hoàng Triều Giang | `Ada.596Richards@outlook...` | **210.017 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **3** | **`#MAVKB6FDU`** | Hoàng Triều Giang | `irene.dean57@outlook.com` | **210.018 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **4** | **`#MAVKHD39H`** | Hoàng Triều Giang | `Jabari.900Reynolds@outlo...` | **210.019 đ** | `PAID` | 31/10/2026 | **30/11/2026** |
| **5** | **`#MAVK5J9NY`** | Hoàng Triều Giang | `shruti_w82@outlook.com` | **210.034 đ** | `PAID` | 02/11/2026 | **02/12/2026** |
| **6** | **`#MAVKYPEGN`** | Hoàng Triều Giang | `lily_d82@hotmail.com` | **210.035 đ** | `PAID` | 02/11/2026 | **02/12/2026** |
| **TỔNG** | **6 đơn** | | | **1.260.139 đ** | | | |

---

## 3. Kiểm Tra & Nghiệm Thu (Verification)

1. **Biên lai:** Trạng thái chuyển sang `FULLY_ALLOCATED`, `unallocated_amount = 0.00`.
2. **Lịch sử phân bổ:** Tạo thành công 6 bản ghi trong `billing.payment_receipt_allocations` (ID 29 đến 34).
3. **Đơn hàng:** Cả 6 đơn đều chuyển từ `RENEW_REQUIRED` sang `PAID`, `was_paid = true`, ngày hết hạn tăng thêm đúng 30 ngày theo chu kỳ 1 tháng của gói Netflix Fam.
4. **Sổ cái tài chính:** Các giao dịch ghi nhận đầy đủ theo chuẩn ACID.


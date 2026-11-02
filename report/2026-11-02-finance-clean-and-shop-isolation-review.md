# Báo Cáo Nghiệm Thu: Sửa Lỗi Hiển Thị % Chi Phí, Xóa Tag Dư Thừa & Bóc Tách Tài Sản Shop

> **Ngày thực hiện:** 02/11/2026 (Múi giờ `Asia/Bangkok`)  
> **Người phê duyệt:** 👑 Master (Sếp)  
> **Người thực hiện:** Orchestrator Agent & Frontend/Backend Specialist  
> **Trạng thái nghiệm thu:** ✅ **ĐÃ HOÀN THÀNH (ACCEPTED)**

---

## 1. PHẠM VI NGHIỆM THU

Khắc phục triệt để 3 lỗi hiển thị và chuẩn mực kế toán trên trang Trung Tâm Quản Trị Tài Chính (`/finance`):

1. **Lỗi thẻ tag `[ MỐC 0 ₫ · HÒA VỐN ]` trên Biểu đồ Đường Cong Dòng Tiền**:
   - Khung thẻ đè lên đường biểu diễn, che mất các điểm dữ liệu ngày đầu tháng (Ngày 1 và Ngày 2).
   - Đã xóa bỏ hoàn toàn khung thẻ dư thừa; giữ lại đường nét đứt màu cam và nhãn `0 ₫` trên trục Y.
2. **Lỗi hiển thị tỷ lệ % chi phí bất thường `(17600000%)` trên thanh Cashflow Bars**:
   - Khi doanh thu bằng `0 ₫`, mẫu số bị chia cho `1` (`Math.max(1, revenue)`), nhân `100` ra `17.600.000%`.
   - Đã chuẩn hóa: Khi doanh thu = 0, chỉ hiển thị số tiền thực tế `-176.000 ₫`, không hiển thị % ảo. Khi có doanh thu, hiển thị tỷ lệ `% DT` hợp lệ.
3. **Bóc tách 100% Tài sản Cá nhân ra khỏi Tài sản Ròng & Tổng tài sản Shop**:
   - Backend [financeHubService.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/finance/services/financeHubService.js) trước đó đã cộng gộp `personalBank` (14.850.000 ₫) vào Shop.
   - Đã tái cấu trúc:
     - **Tổng Tài Sản Shop:** `85.923.498 ₫` (VPBank 2.63M + MBBank 9.41M + USDT Binance 73.88M).
     - **Tổng Nghĩa Vụ Nợ Shop:** `176.000 ₫` (Chi phí Server chưa thanh toán).
     - **Tài Sản Ròng Shop:** `85.747.498 ₫` (`85.923.498 ₫ - 176.000 ₫`).
     - Cơ cấu Donut Chart phân bổ 100% thuần tài sản Shop: Ví USDT Shop (86.0%) và Ngân hàng Shop (14.0%).

---

## 2. DANH SÁCH FILE ĐÃ THAY ĐỔI

1. [backend/src/domains/finance/services/financeHubService.js](file:///e:/Project/admin_store/admin_orderlist/backend/src/domains/finance/services/financeHubService.js):
   - Thay đổi `netWorthBase` và `netWorth` thành `totalShopAssets - shopLiabilities`.
   - Trả về `totalAssets = totalShopAssets` và `totalLiabilities = shopLiabilities`.
   - Giữ nguyên dữ liệu cá nhân trong `breakdown` để phục vụ tab Quỹ Tích Lũy.
2. [frontend/src/features/finance/components/FinanceOverviewPanel.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FinanceOverviewPanel.tsx):
   - Xóa bỏ thẻ `<rect>` và `<text>` `MỐC 0 ₫ · HÒA VỐN` đè lên đường biểu đồ.
3. [frontend/src/features/finance/components/FinanceVisualChartsSection.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/FinanceVisualChartsSection.tsx):
   - Sửa công thức % chi phí Cashflow Bars để triệt tiêu lỗi chia `17600000%`.
   - Donut Chart phân bổ chính xác 100% cơ cấu tài sản Shop (USDT vs Bank).
4. [frontend/src/features/finance/components/NetWorthCards.tsx](file:///e:/Project/admin_store/admin_orderlist/frontend/src/features/finance/components/NetWorthCards.tsx):
   - Cập nhật nhãn rõ ràng: `Tài Sản Ròng (Shop)`, `Tổng Tài Sản Shop`, `Tổng Nghĩa Vụ Nợ Shop`.
   - Loại bỏ badge tĩnh `+12.4%`, thay bằng nhãn trạng thái thực tế `Thặng dư / Âm vốn`.

---

## 3. KẾT QUẢ KIỂM TRA & VERIFICATION

1. **Kiểm tra API Backend qua Node Probe**:
   ```
   netWorth: 85747498 ₫ (Tài sản ròng thuần Shop)
   totalAssets (Shop): 85923498 ₫
   totalLiabilities (Shop): 176000 ₫
   breakdown personalCashBankTotal: 14850000 ₫ (Bảo lưu nguyên vẹn trong breakdown)
   ```
2. **Kiểm tra biên dịch Frontend**:
   - `npm run build`: **Thành công 100% (0 errors, built in 2.42s)**.
3. **Trải nghiệm giao diện người dùng**:
   - Biểu đồ đường cong thoáng sạch, không bị che khuất ngày 1 & ngày 2.
   - Thanh so sánh Thu - Chi hiển thị số tiền `-176.000 ₫` chuẩn xác, không còn con số vô lý `17600000%`.
   - Số liệu tài sản ròng Shop hiển thị chuẩn mực `85.747.498 ₫`.


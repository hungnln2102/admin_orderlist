# Chuẩn luồng tài chính 1 cửa hàng (Cash-Basis)

Tài liệu này là **nguồn chuẩn duy nhất** để hiểu và vận hành số liệu Dashboard cho một cửa hàng.
Mục tiêu là thống nhất tuyệt đối cách ghi nhận:

- Doanh thu
- Tiền nhập hàng (giá vốn nhập NCC)
- Lợi nhuận
- Refund (hoàn tiền)
- Tiền ngoài luồng

---

## 1) Từ điển định nghĩa chuẩn

### 1.1. Doanh thu ghi nhận (`recognized_revenue`)

Tổng tiền ghi nhận doanh thu từ đơn hàng hợp lệ theo nguyên tắc cash-basis, với điều kiện **đơn đã thu đủ ngưỡng được công nhận**.

- Chỉ ghi nhận khi đã nhận tiền thực tế và đạt điều kiện "đủ tiền" của đơn.
- Không ghi nhận theo thời điểm tạo đơn.
- Không bao gồm tiền ngoài luồng.
- Nếu thu **thiếu tiền**: chưa cộng doanh thu, ghi trạng thái chờ thu đủ.
- Nếu thu **đủ tiền**: cộng doanh thu theo phần thuộc giá trị đơn hàng.
- Nếu thu **thừa tiền**: chỉ cộng doanh thu đúng phần của đơn; phần thừa ghi vào tiền ngoài luồng.
- Nếu nhận tiền **không trong luồng đơn hàng** (không match đơn): không cộng doanh thu, ghi toàn bộ vào tiền ngoài luồng.

### 1.2. Tiền nhập hàng (`total_import`)

Tổng chi phí nhập hàng từ nhà cung cấp (NCC), phục vụ cấu phần giá vốn và công nợ NCC.

- Bản chất là chi phí nhập kho/nhập hàng, không đồng nhất với dòng tiền khách trả.
- `total_import` được ghi nhận theo cùng nhánh nghiệp vụ với doanh thu.
- Khi doanh thu được cộng thành công, hệ thống đồng thời:
  - tạo log cost NCC,
  - chuyển đơn sang trạng thái `Đã Thanh Toán`.
- Ba bước (cộng doanh thu, tạo log cost NCC, chuyển trạng thái đơn) là một nhánh nghiệp vụ thống nhất, cần đảm bảo nhất quán và idempotent.
- Nếu đơn chưa đủ điều kiện cộng doanh thu thì chưa tạo log cost NCC và chưa ghi nhận `total_import`.

### 1.3. Refund (`total_refund`)

Trong nhánh hủy đơn, refund được ghi nhận ngay tại thời điểm thao tác hủy, bucket vào tháng hiện tại.

- Khi bấm hủy đơn, hệ thống xử lý theo một nhánh nghiệp vụ:
  - trừ trực tiếp `total_revenue`,
  - trừ trực tiếp `total_profit`,
  - cộng `total_refund`.
- Tiền cần hoàn cho khách được note vào `daily_revenue_summary.revenue_reversed`:
  - chỉ ghi số tiền cần hoàn (`refund_amount`),
  - nếu trong ngày có nhiều đơn hoàn thì cộng dồn vào cùng ngày (`summary_date`).
- Đồng thời tạo:
  - log NCC cần hoàn (đối soát công nợ NCC),
  - log credit khả dụng cho khách hàng (phục vụ đơn sau hoặc hoàn lại tiền mặt từ credit).
- Trạng thái đơn chuyển về `Chưa hoàn` để theo dõi xử lý hoàn thực tế.
- Trong mô hình này:
  - Daily chỉ phản ánh doanh thu/lợi nhuận theo ngày, không trừ refund ở tầng hiển thị daily.
  - Monthly hiển thị doanh thu ròng theo `total_revenue`; `total_refund` là chỉ số theo dõi riêng.

### 1.4. Lợi nhuận chuẩn (`standard_profit`)

Lợi nhuận chuẩn được map vào `dashboard_monthly_summary.total_profit` và ghi nhận theo delta nghiệp vụ.

- Khi bán hàng đủ điều kiện ghi nhận doanh thu:
  - `profit_delta_sale = sale_price - cost`
- Khi phát sinh hoàn tiền:
  - `profit_delta_refund = -(refund_amount - ncc_refund_amount)`
- Lợi nhuận tháng:
  - `total_profit_month = SUM(profit_delta_sale) + SUM(profit_delta_refund)`
- Không bao gồm tiền ngoài luồng.

### 1.5. Tiền ngoài luồng (`off_flow_amount`)

Khoản tiền không thuộc đơn hàng và không phải tiền của shop.

- Không phải chi phí của shop.
- Không được tính vào doanh thu.
- Không được tính vào lợi nhuận.
- Chỉ dùng để theo dõi kiểm soát/rủi ro và phục vụ đối soát.

---

## 2) Luồng ghi nhận một chiều theo thời gian

Luồng duy nhất áp dụng cho một đơn hàng tài chính:

1. **Thu tiền thực tế**
   - Khi hệ thống xác nhận đã nhận tiền thực tế của đơn hợp lệ, ghi nhận doanh thu cash-basis.
2. **Cập nhật doanh thu ngày/tháng**
   - Cộng vào summary ngày và tháng theo mốc thu tiền.
3. **Phát sinh refund (nếu có)**
   - Ghi số tiền cần hoàn vào `daily_revenue_summary.revenue_reversed` (cộng dồn theo ngày).
   - Note ngày hoàn để hạch toán dòng tiền đúng kỳ.
4. **Xác định phần NCC cần hoàn/đối trừ**
   - Tạo log NCC riêng để theo dõi trách nhiệm hoàn hoặc bù trừ với NCC.
5. **Tổng hợp lên dashboard**
   - `daily_revenue_summary` phản ánh số theo ngày.
   - `dashboard_monthly_summary` tổng hợp theo tháng từ quy tắc đã chuẩn hóa.
6. **Theo dõi tiền ngoài luồng**
   - Ghi nhận ở luồng kiểm soát riêng, không đi vào công thức doanh thu/lợi nhuận chuẩn.

---

## 3) Bộ công thức chuẩn (cố định)

## 3.1. Công thức ngày (daily)

- `daily_gross_inflow = tong_tien_thu_thuc_te_tu_don_hang_hop_le`
- `daily_revenue_view = daily_revenue_summary.earned_revenue`
- `daily_profit_view = daily_revenue_summary.allocated_profit_tax` (nếu có snapshot phân bổ lợi nhuận)
- `daily_refund_tracking = daily_revenue_summary.revenue_reversed` (chỉ theo dõi/audit, không trừ vào KPI daily)

## 3.2. Công thức tháng (monthly)

- `monthly_total_revenue = dashboard_monthly_summary.total_revenue` (đã phản ánh delta giảm do hủy/hoàn theo Model A)
- `monthly_refund_tracking = dashboard_monthly_summary.total_refund` (chỉ theo dõi)
- `monthly_net_revenue_view = monthly_total_revenue`

## 3.3. Lợi nhuận chuẩn

- `profit_delta_sale = sale_price - cost`
- `profit_delta_refund = -(refund_amount - ncc_refund_amount)`
- `standard_profit_month = SUM(profit_delta_sale) + SUM(profit_delta_refund)`

Trong đó:
- `sale_price` là giá bán ghi nhận doanh thu của đơn.
- `cost` là giá vốn/NCC cost của đơn.
- `refund_amount` là số tiền hoàn cho khách.
- `ncc_refund_amount` là phần NCC hoàn/đối trừ lại cho shop tương ứng khoản refund.

## 3.4. Quy tắc loại trừ bắt buộc

- `off_flow_amount` **không** cộng vào `daily_gross_inflow`, `monthly_total_revenue`, `standard_profit_month`.
- Không dùng tiền ngoài luồng để bù doanh thu thiếu hoặc “làm đẹp” lợi nhuận.

---

## 4) Mapping bảng dữ liệu và kiểm soát đối soát

## 4.1. `daily_revenue_summary`

Vai trò:
- Nguồn tổng hợp tài chính theo ngày.
- Bắt buộc phản ánh được refund theo ngày hoàn.

Yêu cầu kiểm soát:
- Refund theo ngày ghi tại `revenue_reversed` (chỉ số theo dõi).
- KPI daily hiển thị theo doanh thu/lợi nhuận ngày, không trừ refund ở tầng hiển thị daily.
- Mỗi thay đổi refund phải truy vết được nguồn và thời điểm.

## 4.2. `dashboard_monthly_summary`

Vai trò:
- Tổng hợp theo tháng phục vụ KPI dashboard.

Yêu cầu kiểm soát:
- Đồng nhất quy tắc loại trừ tiền ngoài luồng như daily.
- Tháng phản ánh theo ledger delta của `dashboard_monthly_summary` (bao gồm cả delta giảm trực tiếp khi hủy/hoàn theo Model A).
- Báo cáo tháng không được tự ý dùng định nghĩa khác với daily.

## 4.3. Log NCC (hoàn/đối trừ NCC)

Vai trò:
- Theo dõi phần NCC cần hoàn hoặc cần đối trừ khi có refund.

Yêu cầu kiểm soát:
- Mỗi dòng log liên kết được với refund phát sinh.
- Có trạng thái xử lý (chưa xử lý/đã xử lý) để phục vụ reconcile cuối kỳ.
- Không thay thế summary dashboard; đây là ledger đối soát độc lập.

---

## 5) Ví dụ nghiệp vụ chuẩn (tránh hiểu sai)

## Ví dụ 1: Đơn thanh toán đủ, không refund

- Thu thực tế: 500,000
- Refund: 0
- Tiền nhập hàng: 300,000
- Tiền ngoài luồng: 0

Kết quả:
- `total_revenue` tháng tăng `500,000`
- `standard_profit = 500,000 - 300,000 = 200,000`

## Ví dụ 2: Đơn có refund một phần

- Thu thực tế: 500,000
- Refund ngày D+2: 120,000
- Tiền nhập hàng: 300,000

Kết quả:
- `total_revenue` tháng giảm trực tiếp `120,000` tại thời điểm hủy/hoàn.
- `total_refund` tháng tăng `120,000` để theo dõi/audit.
- `profit_delta_refund = -(120,000 - ncc_refund_amount)`; lợi nhuận tháng giảm theo delta này.
- Tạo log NCC cho phần cần hoàn/đối trừ theo chính sách NCC.

## Ví dụ 3: Đơn refund toàn phần

- Thu thực tế: 500,000
- Refund: 500,000
- Tiền nhập hàng: 300,000

Kết quả:
- `total_revenue` tháng giảm trực tiếp `500,000`.
- `total_refund` tháng tăng `500,000`.
- `profit_delta_refund = -(500,000 - ncc_refund_amount)`; nếu `ncc_refund_amount = 300,000` thì lợi nhuận giảm `200,000`.
- Bắt buộc có log NCC để xử lý phần giá vốn tương ứng.

## Ví dụ 4: Có phát sinh tiền ngoài luồng

- Thu thực tế từ đơn: 500,000
- Tiền ngoài luồng: 150,000
- Refund: 0
- Tiền nhập hàng: 300,000

Kết quả chuẩn:
- Doanh thu tính báo cáo: chỉ `500,000`
- Lợi nhuận chuẩn: `500,000 - 300,000 = 200,000`
- `150,000` chỉ nằm ở sổ kiểm soát ngoài luồng, không đi vào doanh thu/lợi nhuận.

## Ví dụ 5: Thu trong tháng A, refund trong tháng B

- Tháng A thu: 800,000
- Tháng B refund: 200,000
- Tiền nhập hàng: 450,000

Kết quả:
- Tháng A: phản ánh thu theo cash-basis tại thời điểm thu.
- Tháng B: phản ánh refund theo ngày hoàn.
- Đối soát tháng dùng `total_revenue` đã phản ánh delta hoàn trực tiếp, và `total_refund` để theo dõi/audit.

## Ví dụ 6: Refund nhiều lần cho cùng một đơn

- Thu thực tế: 1,000,000
- Refund đợt 1: 100,000
- Refund đợt 2: 150,000
- Tiền nhập hàng: 600,000

Kết quả:
- `total_refund = 250,000`
- `total_revenue` tháng giảm trực tiếp tổng `250,000`.
- Lợi nhuận giảm theo tổng `SUM(-(refund_amount_i - ncc_refund_amount_i))` của từng đợt.
- Mỗi đợt refund có log thời điểm và liên kết log NCC tương ứng.

---

## Checklist vận hành cuối ngày/cuối tháng

- Đã tách bạch rõ doanh thu, tiền nhập hàng, refund, tiền ngoài luồng.
- Refund luôn có số tiền + ngày hoàn + liên kết log NCC (nếu có nghĩa vụ NCC).
- Không có khoản ngoài luồng nào đi vào doanh thu/lợi nhuận.
- Tổng tháng khớp logic cộng từ daily.
- Có thể truy vết từ dashboard về giao dịch gốc và log NCC khi kiểm toán nội bộ.

---

## Quy định áp dụng

Từ thời điểm tài liệu này ban hành, mọi thay đổi liên quan dashboard tài chính phải tuân theo các định nghĩa và công thức ở đây. Nếu có thay đổi nghiệp vụ, cập nhật tài liệu này trước khi đổi logic tính toán.

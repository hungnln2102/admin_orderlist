# Báo cáo phân tích chuỗi biến động số dư thẻ tín dụng VPBank Visa *2340 - 2026-11-04

> **Ngày thực hiện:** 2026-11-04 (Múi giờ: `Asia/Bangkok`)  
> **Chủ tài khoản / thẻ:** NGO LE NGOC HUNG (`hungnln2102@gmail.com`)  
> **Sản phẩm:** Thẻ tín dụng quốc tế VPBank (`VISA *2340`)  
> **Nguồn dữ liệu:** Email thông báo biến động số dư chính thức từ VPBank Internet Banking (`customercare@care.vpb.com.vn`)

---

## 1. Phạm vi phân tích

Phân tích chuỗi 3 giao dịch liên tiếp từ VPBank gửi về hòm thư của Master theo đúng trình tự thời gian thực tế:
1. **Giao dịch 1:** Chi tiêu quẹt thẻ Foody `- 131,500 VND` lúc `19:22:59` ngày `30/10/2026`.
2. **Giao dịch 2:** Chi tiêu quẹt thẻ Foody `- 79,000 VND` lúc `19:43:52` ngày `02/11/2026`.
3. **Giao dịch 3:** Thanh toán nợ thẻ `+ 337,331 VND` lúc `00:25:00` ngày `03/11/2026`.

Đối chiếu chéo với dữ liệu sao kê chu kỳ `26/09 -> 25/10/2026` tại [`report/2026-11-03-vpbank-credit-card-interest-review.md`](file:///e:/Project/admin_store/admin_orderlist/report/2026-11-03-vpbank-credit-card-interest-review.md).

---

## 2. Bảng đối chiếu chuỗi 3 giao dịch theo dòng thời gian

| Thứ tự | Thời gian | Loại GD | Số tiền | Đơn vị / Nội dung | Mã GD (Ref) | Hạn mức còn lại sau GD | Công thức kiểm chứng hạn mức |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **GD 1** | `30/10/2026 19:22:59` | Chi tiêu (Debit) | <span style="color:#ef4444; font-weight:bold;">- 131,500 VND</span> | **`Foody`** | `630312143356` | **`18,126,191 VND`** | Điểm mốc ban đầu |
| **GD 2** | `02/11/2026 19:43:52` | Chi tiêu (Debit) | <span style="color:#ef4444; font-weight:bold;">- 79,000 VND</span> | **`Foody`** | `630612296129` | **`18,047,191 VND`** | `18,126,191 - 79,000 = 18,047,191` *(Khớp 100%)* |
| **GD 3** | `03/11/2026 00:25:00` | Thanh toán (Credit) | <span style="color:#10b981; font-weight:bold;">+ 337,331 VND</span> | **`VPB2611032491547559`** | `032491547559` | **`18,384,522 VND`** | `18,047,191 + 337,331 = 18,384,522` *(Khớp 100%)* |

---

## 3. Trạng thái nghiệm thu & Khám phá nghiệp vụ

### Trạng thái nghiệm thu: **ĐÃ ĐỐI SOÁT HOÀN HẢO 100% (PERFECT RECONCILIATION)**

Dữ liệu khớp tuyệt đối từng đồng, triệt tiêu hoàn toàn mọi điểm mù hay chênh lệch giả định.

---

### Các phát hiện nghiệp vụ then chốt:

#### 🟢 [P0 - Giải mã hoàn toàn khoản chênh lệch 79,000 VND]
- Ở lượt phân tích trước, giữa GD 1 (30/10) và GD 3 (03/11) có một khoảng chênh lệch hạn mức `79,000 VND`.
- Với email biến động GD 2 Master vừa cung cấp, khoản `79,000 VND` này **không phải phí ngân hàng**, mà chính xác là **giao dịch đặt món Foody thứ hai** của Master vào tối ngày `02/11/2026` (`19:43:52`, mã `630612296129`).
- **Phép toán đối soát chuỗi**:
  $$\text{Hạn mức mốc (30/10)}: 18.126.191\text{ đ}$$
  $$\xrightarrow{- 79.000\text{ đ (Foody tối 02/11)}} \text{Hạn mức giảm còn: } \mathbf{18.047.191\text{ đ}}$$
  $$\xrightarrow{+ 337.331\text{ đ (Thanh toán rạng sáng 03/11)}} \text{Hạn mức hồi phục thành: } \mathbf{18.384.522\text{ đ}}$$
  $\implies$ **Khớp 100% chính xác từng đồng** với cả 3 email ngân hàng gửi!

#### 🟢 [P0 - Hoàn tất nghĩa vụ thanh toán tối thiểu kỳ sao kê]
- GD 3 (`+ 337,331 VND`) diễn ra lúc `00:25:00 ngày 03/11/2026` (chỉ khoảng 4 tiếng 40 phút sau khi quẹt món Foody 79k).
- Số tiền `337,331 VND` trả đúng bằng `minimum_due` (`337.331 VND`) của kỳ sao kê `25/10/2026` (hạn `17:00 ngày 09/11/2026`).
- Tránh phí phạt trễ hạn `200.000 VND` cho Master.

#### 🔵 [P1 - Phân loại chu kỳ sao kê cho 2 đơn Foody]
- Cả 2 đơn Foody:
  - Đơn 1: `131,500 VND` (ngày 30/10/2026)
  - Đơn 2: `79,000 VND` (ngày 02/11/2026)
  - Tổng chi tiêu Foody mới: `210,500 VND`.
- Do phát sinh sau ngày chốt sao kê `25/10/2026`, cả 2 khoản chi tiêu này đều nằm trong **chu kỳ sao kê mới (26/10 -> 25/11/2026)**, sẽ chốt vào ngày `25/11/2026` và đến hạn thanh toán vào ngày `09/12/2026`.

---

## 4. Hạch toán chuẩn ACID vào hệ thống Finance Hub

Khi nạp vào hệ thống [`admin_orderlist`](file:///e:/Project/admin_store/admin_orderlist), 3 giao dịch được xử lý tuần tự qua sổ nhật ký `debt_payment_logs`:

```json
[
  {
    "order": 1,
    "transactionDate": "2026-10-30 19:22:59",
    "action": "BORROW",
    "amount": 131500,
    "merchantName": "Foody",
    "referenceCode": "630312143356",
    "targetType": "PERSONAL_DEBT",
    "financialAccountId": null,
    "note": "Quẹt thẻ VPBank Visa *2340 chi tiêu Foody"
  },
  {
    "order": 2,
    "transactionDate": "2026-11-02 19:43:52",
    "action": "BORROW",
    "amount": 79000,
    "merchantName": "Foody",
    "referenceCode": "630612296129",
    "targetType": "PERSONAL_DEBT",
    "financialAccountId": null,
    "note": "Quẹt thẻ VPBank Visa *2340 chi tiêu Foody"
  },
  {
    "order": 3,
    "transactionDate": "2026-11-03 00:25:00",
    "action": "REPAYMENT",
    "amount": 337331,
    "referenceCode": "032491547559",
    "targetType": "PERSONAL_DEBT",
    "financialAccountId": 1004,
    "note": "Thanh toán số tiền tối thiểu kỳ sao kê 25/10/2026"
  }
]
```

- **Tổng nợ mới phát sinh (2 đơn Foody)**: `+ 210,500 VND`
- **Số tiền đã thanh toán giảm nợ**: `- 337,331 VND`
- **Dư nợ ròng thay đổi**: Giảm `126,831 VND` (`337,331 - 210,500 = 126,831 VND`), hoàn toàn tương ứng với bước nhảy hạn mức từ `18,257,691` (trước chuỗi GD) lên `18,384,522`!

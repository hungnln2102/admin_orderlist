# Hướng dẫn Bảng điều khiển (Dashboard)

Tài liệu này mô tả **từng khối giao diện** trên màn hình Bảng điều khiển, dành cho người dùng **không cần biết lập trình**. Bạn có thể đối chiếu từng phần trên màn hình với tên gọi bên dưới.

---

## 1. Màn hình dùng để làm gì?

**Bảng điều khiển** giúp xem nhanh:

- Số liệu kinh doanh theo tháng hoặc theo khoảng thời gian bạn chọn.
- Tình hình đơn hàng (có bao nhiêu đơn, bao nhiêu đơn hủy).
- Một số thông tin tài sản, quỹ và mục tiêu tiết kiệm (ở tab riêng).

Các số thường hiển thị bằng **VND** (đồng). Trục tọa độ trên biểu đồ lớn có thể ghi dạng rút gọn (ví dụ K = nghìn, M = triệu) để dễ đọc.

---

## 2. Cấu trúc tổng thể: hai tab lớn

Phía dưới phần tiêu đề trang có **hai tab**:

| Tab         | Tên gọi trên màn hình | Nội dung chính |
|------------|------------------------|----------------|
| **Tổng quan** | “Tổng quan”            | Số nhanh, biểu đồ tài chính và biểu đồ đơn hàng. |
| **Tài sản**   | “Tài sản”              | Mục tiêu tiết kiệm, tóm tắt liên quan quỹ, bảng số dư ví. |

Bạn bấm vào từng tab để chuyển giữa hai khu vực này.

---

## 3. Phần đầu trang: tiêu đề và (khi ở tab Tổng quan) bộ lọc thời gian

### 3.1. Khối tiêu đề (hero)

- Có dòng chữ lớn **“Bảng Điều Khiển”** và mô tả phụ bằng tiếng Anh ngắn.
- Mục đích: xác định rằng đây là trang tổng quan, không phải trang chi tiết từng đơn.

### 3.2. Lọc chu kỳ (chỉ hiện khi bạn đang ở tab **Tổng quan**)

- Ở góc phải (trên màn hình lớn) hoặc phía dưới tiêu đề (màn hình nhỏ) có khu vực **chọn khoảng ngày** (có dòng gợi ý *“Lọc chu kỳ”*).
- **Khi bạn chưa chọn gì** (hoặc chọn mức mặc định tương đương “xem theo năm hiện tại” trên biểu đồ):  
  Các số ở thẻ tổng quan thường lấy theo **tháng hiện tại** so với **tháng trước**; biểu đồ theo tháng trong **năm** bạn chọn ở hộp chọn năm.
- **Khi bạn chọn một khoảng ngày cụ thể** (từ ngày – đến ngày):  
  Các số ở thẻ tổng quan sẽ so sánh **khoảng đó** với **khoảng cùng độ dài ngay trước** (kỳ trước tương ứng). Trên biểu đồ tài chính có dòng ghi tương tự *“Theo chu kỳ đã chọn”* và bộ chọn năm được ẩn, vì dữ liệu đang theo đúng khoảng bạn lọc.

> **Cách hiểu đơn giản:** Lọc chu kỳ giúp bạn hỏi: “Trong đoạn thời gian này, kết quả thế nào so với kỳ liền kề tương ứng?” thay vì luôn xem theo từng tháng.

---

## 4. Tab **Tổng quan** — từng khối chi tiết

### 4.1. Hàng sáu thẻ số lớn (KPI / chỉ số tổng quan)

Đây là **sáu ô** xếp lưới (trên điện thoại thường 1 cột, trên màn hình lớn có thể 2–3 cột). Mỗi thẻ gồm: **tên**, **một số lớn**, và thường kèm **một dòng %** (so sánh với kỳ trước — tháng trước hoặc kỳ tương ứng khi dùng lọc chu kỳ).

Dưới đây là từng thẻ theo tên bạn sẽ thấy trên màn hình:

| Tên trên màn hình   | Bạn cần hiểu số này là gì (phiên bản dễ hiểu) |
|--------------------|-----------------------------------------------|
| **Tổng đơn hàng**  | Số lượng đơn hàng (đếm theo cách hệ thống đang cấu hình) trong tháng/kỳ lựa chọn, so với tháng/kỳ trước. Con số bên dưới tên thường là **số nguyên** (không phải tiền). |
| **Doanh thu**      | Tổng tiền bán/đã ghi nhận thanh toán tương ứng với cách cấu hình hệ thống (ví dụ: theo **biên lai** thanh toán nếu đã tích hợp). Thể hiện mức thu thực tế theo từng tháng hoặc kỳ. |
| **Hoàn tiền**      | Số tiền hoàn lại cho khách (theo cách hệ thống ghi nhận hủy/ hoàn) trong cùng tháng/kỳ. Giúp thấy gánh nặng hoàn so với doanh thu. |
| **Tổng nhập hàng** | Tổng **chi phí mua hàng từ nhà cung cấp (NCC)** theo sổ nhật ký nhập/cost, gắn với tháng ghi nhận. Đây **không phải** cột “lãi” mà là **tiền bỏ ra để hàng về** (theo số liệu đã nhập hệ thống). |
| **Lợi nhuận tháng** | **Lợi nhuận kinh doanh còn lại sau khi đã tính đến phần rút lợi nhuận theo tháng** (nếu doanh nghiệp đã cấu hình bước rút này). Ở mức bản chất, lợi nhuận phản ánh chênh lệch thu hợp lý so với vốn hàng theo từng dòng, sau các điều chỉnh mà hệ thống đang áp dụng. |
| **Thuế**           | **Mức ước tính thuế** theo cấu hình tỷ lệ phần trăm trên cơ sở số dùng cho thu nhập/doanh thu — **dùng để tham khảo nhanh**, không thay thế tư vấn kế toán. |

> **Dòng % dưới mỗi thẻ:** thường là “tăng/giảm bao nhiêu % so với kỳ trước” (dương = cao hơn trước, âm = thấp hơn trước), trừ khi hệ thống tạm không tính được thì có thể hiện dạng khác (ví dụ “N/A”).

> **Ghi chú về thẻ Tổng đơn hàng:** với năm hiện tại, tỷ lệ % thay đổi thỉnh thoảng có thể tính dựa theo dữ liệu biểu đồ vài tháng gần nhất. Nếu thấy lạ, hãy coi số tuyệt đối (con số lớn) là thông tin chính, % so sánh là phụ.

---

### 4.2. Biểu đồ lớn: “Tài chính theo tháng” — bốn đường

Khối có tiêu đề tương tự: **“Doanh thu, lợi nhuận, hoàn tiền và thuế”**, kèm chú giải màu (chú thích) cho bốn đường:

| Màu / tên trên chú giải | Nội dung bạn đang xem theo từng tháng (hoặc theo từng cột tương ứng nếu lọc khoảng ngày) |
|------------------------|-----------------------------------------------------------------------------|
| **Doanh thu** (xanh dương) | Tổng thu tương ứng cấu hình, theo từng mốc thời gian. |
| **Lợi nhuận** (xanh lá)   | Mức lợi nhuận theo từng mốc (tham chiếu cùng cách tính với thẻ “Lợi nhuận tháng”, nhưng ở dạng chuỗi theo thời gian). |
| **Hoàn tiền** (hồng)     | Số hoàn theo từng mốc. |
| **Thuế** (tím)           | Mức ước tính thuế theo từng mốc, theo tỷ lệ cài đặt. |

- Trên trục ngang: **T1, T2, …** hoặc nhãn tháng tương ứng.
- Trên trục dọc: số tiền (có thể rút gọn B/M/K tùy mức lớn).
- Khi bạn rê chuột (hoặc chạm) vào từng điểm, thường sẽ hiện **ô gợi ý (tooltip)** với số đầy đủ hơn.

**Khi bạn dùng lọc chu kỳ theo ngày:** trục ngang sẽ phản ánh **các cột/điểm** trong khoảng thời gian bạn chọn, không còn gắn cố định với cả 12 tháng của năm.

---

### 4.3. Bộ chọn năm (góc biểu đồ tài chính)

- Khi **không** bật lọc theo khoảng ngày, bạn thường thấy **ô chọn năm** (dropdown) để xem cả năm đó theo từng tháng.
- Khi **đã** bật lọc khoảng ngày, ô này được ẩn vì dữ liệu đi theo **chu kỳ đã chọn** (có dòng ghi *“Theo chu kỳ đã chọn”*).

---

### 4.4. Biểu đồ cột: “Đơn hàng theo tháng”

Khối bên cạnh (hoặc bên dưới trên màn hẹp) với mô tả tương tự: **“Tổng đơn và đơn hủy theo tháng”**.

| Thành phần   | Ý nghĩa |
|-------------|--------|
| Cột (màu lạnh) **Tổng đơn** | Số lượng đơn phát sinh theo từng mốc thời gian (trục tọa độ là **số lượng**, không phải tiền). |
| Cột (màu hồng) **Đơn hủy**  | Số lượng đơn ở trạng thái hủy (theo cách hệ thống xác định theo từng mốc). |

Phần mô tả dưới tiêu đề giúp bạn thấy xu hướng: tháng nào nhiều đơn, tháng nào hủy nhiều hơn.

---

## 5. Bảng tóm tắt theo tháng (có thể chưa bật trên giao diện)

Hệ thống **có thể cung cấp** bảng chi tiết từng tháng (đơn, doanh thu, hoàn, nhập, thuế, cập nhật lần cuối, …) qua tính năng nền. Trên bản màn hình **hiện tại**, bảng này **có thể được tắt** để giao diện gọn hơn. Nếu bạn cần xem, hãy hỏi bộ phận quản trị hệ thống có bật hiển thị hay cung cấp báo cáo xuất file hay không.

---

## 6. Tab **Tài sản** — từng khối

### 6.1. Ô tóm tắt tài chính (phía trên)

- Khu vực lưới 1–2 cột, **mỗi ô** có thể hiển thị một số tóm tắt tài chính (nếu được cấu hình từ phía hệ thống).
- Trong cấu hình mặc định, **có thể chưa có số nào** (danh sách rỗng) — lúc đó bạn sẽ không thấy thẻ ở đây. Đây không phải lỗi; chỉ là chưa thêm nội dung hiển thị.

### 6.2. Khối mục tiêu, ngân sách và biểu đồ

- Thường bao gồm: **Mục tiêu tiết kiệm** (danh sách, thêm/sửa/xóa tùy quyền), **một số thống kê dạng biểu đồ/tuần** (nếu có dữ liệu ví theo từng cột thời gian), và mục con như *“Lợi nhuận khả dụng”* — đây là **chỉ số tổng hợp** từ phía tài chính, giúp xem phần lợi nhuận còn **có thể dùng** theo cách định nghĩa trong hệ thống (có thể trừ đi các khoản đã tính từ quỹ/chi, tùy cài đặt).
- Các **thanh mục tiêu** (progress) dựa trên **dữ liệu mục tiêu** bạn tạo và số từ **cột quỹ** tương ứng (ví dụ cột tên gần nghĩa với “quỹ”) nếu có.
- Có thể có **bảng ngân sách** minh hoạ hoặc dữ liệu mẫu — tùy phiên bản: nếu thấy số ổn định không đổi, có thể đó là dữ liệu minh hoạ; số thật cần xác nhận với quản trị.

### 6.3. Số dư ví (bảng ví / Wallet)

- Một bảng với **các cột = loại tài sản (ví)** do hệ thống định nghĩa, mỗi dòng = **một thời điểm cập nhật** (ví dụ ngày lấy số mới nhất ở dòng trên cùng).
- Có nút **làm mới** để tải lại số mới từ máy chủ.
- Dùng để đối chiếu: tiền đang nằm ở đâu, bao nhiêu, trong từng loại ví quản lý trên hệ thống.

### 6.4. Các hành động bổ sung (nếu bạn thấy trên màn hình)

- Có thể có **cửa sổ rút tiền**, **gán loại ví**, v.v. — tùy quyền tài khoản. Các tính năng này ảnh hưởng số dư sau khi xác nhận; cần thận trọng và làm theo quy trình nội bộ.

---

## 7. Các điểm cần nhớ (giúp tránh hiểu nhầm)

1. **Doanh thu** trên dashboard đang phản ánh cách cấu hình thanh toán/ biên lai — nếu cửa hàng mới tích hợp, một thời gian đầu số liệu có thể tăng dần khi dữ liệu cũ được đưa vào.
2. **Nhập hàng** tính từ sổ nhật ký mua/ giá từ NCC — cần nhập **đúng, đủ, đúng tháng ghi nhận** thì tổng mới sát thực tế.
3. **Lợi nhuận** trên bảng điều khiển theo từng cách tính nội bộ (chênh lệch bán với vốn theo từng dòng, có trừ phần rút theo tháng nếu cấu hình) — dùng để vận hành, **không tự thay công bố tài chính** kế toán/ thuế thực tế mà không đối soát bên ngoài.
4. **Thuế** hiển thị ở đây thường là **mô phỏng/ước tính theo tỷ lệ** cài trên hệ thống (biến môi trường cấu hình), **không** tự bằng tờ khai thuế thực tế nếu chưa được thiết lập đầy đủ từ kế toán.
5. **So sánh %** mạnh nhất khi “kỳ trước” có số tương tự. Tháng đầu tiên dữ liệu hoặc tháng có biến động bất thường dễ làm tỷ lệ % trông lạ; khi cần, hãy so **số tuyệt đối** thay vì chỉ nhìn %.
6. Nếu thấy **báo lỗi màu đỏ** trên cùng trang, đó thường là **không tải được số từ máy chủ** — bạn nên tải lại trang hoặc thử lại sau; nếu vẫn lỗi, cần nhờ bộ phận kỹ thuật.

---

## 8. Từ điển nhanh (một từ — một câu)

| Thuật ngữ bạn dễ gặp | Nghĩa ngắn gọn |
|----------------------|----------------|
| **KPI / thẻ số**     | Một số tổng hợp nổi bật trên cùng màn. |
| **Kỳ trước**         | Tháng trước, hoặc khoảng thời gian ngay trước (khi dùng lọc từ ngày – đến ngày). |
| **Biên lai**         | Căn cứ ghi nhận tiền thu từ thanh toán/ chuyển khoản (tùy cài đặt hệ thống). |
| **Nhập hàng (NCC)**  | Tổng tiền theo sổ nhật từ nhà cung cấp, gắn tháng. |
| **Lợi nhuận khả dụng** (trong phần Tài sản) | Một tổng cộng phục vụ theo dõi, có cách tính riêng trong hệ thống — đọc cùng mục mô tả trên màn. |

---

*Tài liệu này mô tả hành vi giao diện và cách diễn giải số theo cấu hình hệ thống phổ biến. Số tính toán chính xác ở từng thời điểm phụ thuộc dữ liệu bạn đã nhập, quyền tài khoản và cài đặt máy chủ.*

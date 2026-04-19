# Luồng xóa đơn, hoàn tiền và bù đơn (bản chuẩn hóa)

Tài liệu này mô tả luồng nghiệp vụ bằng câu văn để thống nhất cách vận hành khi xóa đơn đã thanh toán/đang xử lý, xử lý hoàn tiền và tạo đơn bù từ credit.

## 1) Kết luận nhanh

Luồng nghiệp vụ đã được chốt theo hướng: khi xóa đơn đã thanh toán hoặc đang xử lý thì hệ thống phải tính số tiền cần hoàn, ghi nhận log NCC, trừ ngay doanh thu và lợi nhuận tương ứng, sau đó chuyển đơn sang nhóm hoàn tiền để theo dõi.

Ngoài phần đã chốt ở trên, còn 2 điểm cần tiếp tục chuẩn hóa xuyên suốt giữa backend và UI:

1. Trạng thái credit ở lớp kỹ thuật hiện dùng OPEN, PARTIALLY_APPLIED, FULLY_APPLIED, VOID; cần map rõ sang nhãn nghiệp vụ Chưa bù, Đã bù một phần, Đã bù toàn bộ, Đã hủy ở lớp hiển thị.
2. Luồng QR của đơn đã gắn credit cần khóa quy tắc theo trạng thái đơn để tránh sai số khi xem đơn.

## 2) Luồng chuẩn cho thao tác xóa đơn Đã Thanh Toán hoặc Đang Xử Lý

Khi người dùng bấm xóa một đơn đang ở trạng thái Đã Thanh Toán hoặc Đang Xử Lý, hệ thống không xóa cứng bản ghi. Đơn được giữ lại để phục vụ truy vết tài chính, đối soát và lịch sử nghiệp vụ.

Ngay tại thời điểm đó, hệ thống tính giá trị cần hoàn dựa trên chi phí NCC và thời gian còn lại của đơn, sau đó cập nhật đơn sang trạng thái Chưa Hoàn. Hệ thống đồng thời lưu mã tham chiếu hoàn tiền và ghi ngày chuyển trạng thái để phân bổ đúng kỳ báo cáo.

Cùng lúc, hệ thống trừ ngay doanh thu và lợi nhuận tương ứng của đơn vừa chuyển sang Chưa Hoàn trong số liệu dashboard tháng. Điều này giúp số liệu tài chính phản ánh đúng trạng thái thực tế ngay tại thao tác xóa.

Sau khi chuyển trạng thái, hệ thống tạo hoặc bảo đảm tồn tại phiếu credit hoàn tiền để phục vụ bù đơn về sau. Song song đó, hệ thống ghi log chi phí NCC theo trigger dữ liệu để theo dõi khoản NCC cần xử lý.

## 3) Luồng doanh thu và lợi nhuận khi xử lý hoàn tiền

Doanh thu và lợi nhuận được theo dõi theo hai lớp: lớp doanh thu gốc của đơn hàng và lớp hoàn tiền để tính giá trị thuần.

Tại thời điểm bấm xóa đơn Đã Thanh Toán/Đang Xử Lý, hệ thống đã thực hiện trừ ngay phần doanh thu và lợi nhuận của đơn đó trong dashboard tháng.

Sau bước này, thao tác bấm Đã Hoàn ở màn Hoàn Tiền chủ yếu có vai trò xác nhận hoàn tất nghiệp vụ hoàn tiền và đổi trạng thái đơn từ Chưa Hoàn sang Đã Hoàn.

## 4) Luồng tạo đơn bù từ credit hoàn tiền

Khi người dùng bấm nút bù đơn trong mục Hoàn Tiền, hệ thống kiểm tra đơn nguồn có số tiền hoàn hợp lệ. Sau đó hệ thống khởi tạo hoặc lấy lại phiếu credit của đơn nguồn và sinh mã đơn dự kiến cho đơn bù.

Mã đơn bù phải giữ đúng nhóm tiền tố của đơn nguồn. Ví dụ đơn nguồn có dạng MAVCxxx thì đơn bù cũng phải mang tiền tố MAVC, sau đó sinh số thứ tự mới theo quy tắc tăng mã hiện hành.

Khi người dùng xác nhận tạo đơn bù, hệ thống tạo đơn mới và áp credit vào đơn đó. Số tiền credit đã áp được ghi vào bảng application kèm ghi chú và gắn rõ đơn đích là đơn hàng mới vừa tạo.

## 5) Chuẩn hóa trạng thái credit theo nghiệp vụ

Để dễ vận hành, trạng thái credit ở lớp nghiệp vụ nên hiển thị theo các tên sau:

- Chưa bù: credit còn nguyên, chưa áp vào đơn nào.
- Đã bù một phần: credit đã áp một phần vào đơn đích.
- Đã bù toàn bộ: credit đã áp hết, không còn số dư để bù tiếp.
- Đã hủy: credit bị vô hiệu hóa và không dùng nữa.

Khi đối chiếu với lớp kỹ thuật, trạng thái tương ứng như sau:

- Chưa bù <-> OPEN
- Đã bù một phần <-> PARTIALLY_APPLIED
- Đã bù toàn bộ <-> FULLY_APPLIED
- Đã hủy <-> VOID

## 6) Quy tắc QR cho đơn được bù credit

Với đơn đích đã được ghi nhận trong bảng application credit (tức là đơn đã được target để bù), quy tắc hiển thị QR được chốt như sau:

- Nếu đơn đang ở trạng thái Chưa Thanh Toán, mã QR luôn hiển thị số tiền cần thu thực tế bằng Giá bán trừ Credit đã bù.
- Nếu đơn đang ở trạng thái Đã Thanh Toán, Đang Xử Lý hoặc Cần Gia Hạn, mã QR hiển thị theo Giá bán hiện tại của đơn, không trừ credit lần hai.

Quy tắc này phải được xử lý tập trung để bảo đảm tất cả màn xem đơn cho cùng một kết quả.

## 7) Ghi chú vận hành

Đơn Hết Hạn đã được khóa thao tác xóa cứng để bảo đảm lưu vết dữ liệu. Đơn Chưa Hoàn và Đã Hoàn cũng không dùng thao tác xóa thông thường.

Nguyên tắc vận hành là ưu tiên giữ dữ liệu và theo dõi theo trạng thái, không ưu tiên xóa bản ghi, nhằm bảo đảm truy vết đầy đủ lịch sử hoàn tiền, credit và công nợ NCC theo từng đơn.
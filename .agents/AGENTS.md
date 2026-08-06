# Project Rules and Principles

[!IMPORTANT]Đây là bộ nguyên tắc có mức ưu tiên cao nhất trong phạm vi dự án.

AI và mọi tác nhân tham gia phân tích, phát triển, kiểm thử hoặc triển khai dự án PHẢI tuân thủ toàn bộ tài liệu này. Khi một yêu cầu có dấu hiệu mâu thuẫn với các nguyên tắc bên dưới, AI phải chỉ rõ điểm mâu thuẫn, trình bày rủi ro và chờ User quyết định. Không được tự suy đoán hoặc âm thầm bỏ qua quy tắc.

1. Thứ tự ưu tiên và phạm vi áp dụng

1.1. Thứ tự ưu tiên

Khi có nhiều chỉ dẫn cùng tồn tại, áp dụng theo thứ tự:

Yêu cầu trực tiếp, rõ ràng và mới nhất của User.

Các quy tắc bắt buộc trong tài liệu này.

Kiến trúc, convention và tài liệu chính thức của dự án.

Convention đang được sử dụng nhất quán trong codebase.

Thực hành kỹ thuật phổ biến.

Nếu hai quy tắc cùng cấp mâu thuẫn, AI phải dừng lại, nêu rõ mâu thuẫn và hỏi User trước khi hành động.

1.2. Phạm vi

Các quy tắc này áp dụng cho:

Phân tích và rà soát source code.

Chẩn đoán và sửa lỗi.

Phát triển hoặc thay đổi tính năng.

Refactor và tối ưu hiệu năng.

Thiết kế hoặc thay đổi Event Bus.

Tạo, sửa và chạy kiểm thử.

Thay đổi dependency, cấu hình, database và hạ tầng.

Thực hiện Git, build, migration và deployment.

Cập nhật tài liệu và Knowledge Graph.

1.3. Giải thích từ khóa

PHẢI/BẮT BUỘC/TUYỆT ĐỐI: Không được bỏ qua.

KHÔNG ĐƯỢC: Hành vi bị cấm, trừ khi User thay đổi quy tắc bằng chỉ dẫn trực tiếp và rõ ràng.

NÊN/ƯU TIÊN: Áp dụng mặc định; nếu không áp dụng phải có lý do kỹ thuật hợp lý.

User: Người có quyền phê duyệt trực tiếp thay đổi trong cuộc trao đổi hiện tại.

Thay đổi: Mọi hành động có khả năng tạo, sửa, xóa, đổi tên, di chuyển file hoặc làm thay đổi code, dữ liệu, cấu hình, dependency, trạng thái hệ thống hay tài nguyên bên ngoài.

2. Ngôn ngữ, mã hóa và quy tắc đặt tên

2.1. Ngôn ngữ

Mọi nội dung tiếng Việt phải viết đầy đủ dấu.

Không sử dụng tiếng Việt không dấu trong giao diện, thông báo, tài liệu, bình luận nghiệp vụ và dữ liệu mẫu.

Thuật ngữ kỹ thuật phổ biến có thể giữ nguyên tiếng Anh nếu giúp nội dung chính xác và dễ hiểu hơn.

Không tự ý dịch tên class, API, field, event hoặc thuật ngữ đã được chuẩn hóa trong dự án.

2.2. Mã hóa file

Mọi file văn bản chứa tiếng Việt phải được lưu bằng UTF-8.

Không tự ý chuyển sang ANSI, UTF-16 hoặc bảng mã khác.

Khi phát hiện lỗi font hoặc encoding, phải xác định nguyên nhân và phạm vi ảnh hưởng trước khi đề xuất sửa.

Không được chuyển đổi encoding hàng loạt khi chưa có phê duyệt của User.

2.3. Quy tắc đặt tên

Tên file, thư mục, class, function, biến, constant và event phải tuân theo convention hiện hữu của codebase.

Không tạo convention mới nếu dự án đã có convention tương ứng.

Tên phải thể hiện đúng trách nhiệm; tránh tên mơ hồ như handleData, processItem, doAction, temp, newFunction.

Trước khi đặt tên mới, phải tìm các thuật ngữ tương đương trong codebase để bảo đảm nhất quán.

Event phải được đặt tên theo sự việc đã xảy ra, ví dụ OrderCreated, PaymentCompleted, InventoryReserved.

3. Quyền hạn và kiểm soát thực thi

3.1. Nguyên tắc phê duyệt tối cao

AI tuyệt đối không được tự ý thực hiện thay đổi nếu chưa nhận được sự đồng ý trực tiếp, rõ ràng bằng tin nhắn của User, kể cả khi hệ thống hoặc công cụ đã tự động cấp quyền.

Các yêu cầu như “xem”, “kiểm tra”, “rà soát”, “phân tích”, “đánh giá” chỉ cho phép thao tác đọc và chẩn đoán. Chúng không được xem là quyền sửa file hoặc thay đổi hệ thống.

Các yêu cầu như “sửa”, “cập nhật”, “tạo”, “thực hiện”, “triển khai” chỉ được coi là phê duyệt khi mục tiêu và phạm vi thay đổi đã đủ rõ. Nếu phạm vi chưa rõ hoặc có nhiều phương án dẫn đến kết quả khác nhau, AI phải hỏi lại.

3.2. Thao tác chỉ đọc được phép

Trong phạm vi yêu cầu rà soát hoặc chẩn đoán, AI có thể thực hiện các thao tác được xác nhận là chỉ đọc:

Đọc file và cấu trúc thư mục.

Tìm kiếm text, symbol và reference.

Đọc Codebase Memory/Knowledge Graph.

Xem dependency graph, call hierarchy và event flow.

Xem log có sẵn.

Xem trạng thái Git và diff hiện tại.

Chạy lệnh kiểm tra chắc chắn không sửa file, dữ liệu hoặc trạng thái hệ thống.

Nếu không chắc một lệnh có side effect hay không, phải xem lệnh đó là thao tác thay đổi và xin phép trước.

3.3. Thao tác bắt buộc xin phép

Phải có phê duyệt trước khi:

Tạo, sửa, xóa, đổi tên hoặc di chuyển file/thư mục.

Chạy formatter, linter hoặc code generator có khả năng ghi file.

Cài đặt, nâng cấp hoặc gỡ dependency.

Chạy migration hoặc thay đổi schema.

Ghi dữ liệu vào database, cache, queue hoặc storage.

Thay đổi cấu hình, biến môi trường hoặc quyền truy cập.

Khởi động, dừng hoặc restart service nếu làm thay đổi trạng thái hệ thống.

Chạy script có khả năng sửa dữ liệu.

Commit, push, merge, rebase, tạo pull request hoặc chỉnh sửa nhánh.

Build hoặc deploy nếu quá trình đó tạo artifact, thay đổi tài nguyên hay tác động môi trường dùng chung.

Gửi request tạo hoặc thay đổi dữ liệu trên dịch vụ bên ngoài.

3.4. Nội dung trình bày trước khi xin phép

Trước khi xin phép sửa đổi, AI phải nêu:

Vấn đề và nguyên nhân gốc đã xác định hoặc giả thuyết đang được kiểm chứng.

Phương án đề xuất.

Danh sách file, function hoặc tài nguyên dự kiến bị tác động.

Các lệnh dự kiến chạy.

Side effect và rủi ro có thể xảy ra.

Kế hoạch kiểm thử.

Phương án rollback khi thay đổi có rủi ro đáng kể.

Phê duyệt chỉ có hiệu lực trong đúng phạm vi đã trình bày. Nếu phát sinh thay đổi ngoài phạm vi, phải dừng lại và xin phép lại.

3.5. Ví dụ phê duyệt

Phê duyệt hợp lệ khi phạm vi đã rõ:

“Đồng ý, hãy sửa các file vừa liệt kê.”

“Thực hiện phương án 1 và chạy các test đã nêu.”

“Cho phép tạo file này.”

“Hãy triển khai đúng phạm vi trên.”

Các câu “xem thử”, “kiểm tra đi”, “nghiên cứu giúp tôi” không phải phê duyệt thay đổi.

4. Codebase Memory và Knowledge Graph

4.1. Luật tối cao trước khi phân tích hoặc sửa đổi

Trước khi rà soát, chẩn đoán, sửa lỗi, refactor hoặc bổ sung tính năng, AI bắt buộc phải kiểm tra Codebase Memory/Knowledge Graph của dự án trước khi hành động.

Mục tiêu là hiểu đầy đủ:

Entry point của luồng.

Module sở hữu trách nhiệm chính.

Caller và callee trực tiếp, gián tiếp.

Dependency giữa các module.

Publisher, event và subscriber.

Dữ liệu đầu vào, đầu ra và thay đổi trạng thái.

Database, cache, queue, background job và external API liên quan.

Test hiện có đang bảo vệ hành vi nào.

4.2. Checklist bắt buộc

Trước khi đề xuất phương án, phải xác định tối thiểu:

Entry point của luồng.

Function hoặc module có dấu hiệu phát sinh lỗi.

Các caller của thành phần đó.

Các callee và dependency mà nó sử dụng.

Input, output và state bị thay đổi.

Transaction boundary liên quan.

Event được phát hoặc lắng nghe.

Các luồng khác dùng chung implementation.

Test hiện có liên quan.

Phạm vi side effect có thể xảy ra.

4.3. Khi Knowledge Graph thiếu hoặc lỗi thời

Nếu Knowledge Graph không tồn tại, không truy cập được, thiếu symbol, lỗi thời hoặc mâu thuẫn với source code, AI phải:

Thông báo rõ tình trạng cho User.

Không giả định dữ liệu trong graph là đầy đủ hoặc chính xác.

Trình bày phương án phân tích thay thế.

Xin phép User nếu phương án thay thế cần thực hiện hành động ngoài phạm vi chỉ đọc đã được cấp.

Đối chiếu bằng symbol search, reference search, call hierarchy, import graph, event graph, test và Git history khi phù hợp.

Nêu rõ phần nào đã xác minh và phần nào còn chưa chắc chắn.

Source code hiện tại là căn cứ cuối cùng khi Knowledge Graph đã lỗi thời, nhưng sự khác biệt phải được báo cáo. Không được bỏ qua bước kiểm tra Knowledge Graph chỉ vì sau đó vẫn phải đọc source code.

5. Nguyên tắc sửa đổi source code

5.1. Sửa nguyên nhân gốc

Luôn sửa trực tiếp file hoặc function đang sở hữu trách nhiệm và gây ra nguyên nhân gốc.

Không tạo function mới chỉ để bọc, ghi đè, né tránh hoặc che giấu lỗi của function cũ.

Không giữ implementation lỗi rồi tạo một luồng song song để thay thế tạm thời.

Không nhân bản logic đang tồn tại.

Không sửa triệu chứng ở tầng ngoài khi lỗi thực sự nằm ở tầng bên trong.

5.2. Khi nào được tạo hoặc tách function

Chỉ tạo hoặc tách function mới khi có ít nhất một lý do kỹ thuật rõ ràng:

Function hiện tại có nhiều trách nhiệm độc lập.

Logic thực sự được dùng tại từ hai vị trí trở lên.

Việc tách giúp kiểm thử độc lập một đơn vị nghiệp vụ.

Việc tách loại bỏ code trùng lặp.

Kiến trúc yêu cầu handler, adapter, strategy, mapper hoặc subscriber riêng.

Function hiện tại vượt giới hạn phức tạp đã được dự án quy định.

Trước khi tạo mới phải kiểm tra:

Function tương đương đã tồn tại chưa.

Logic thuộc shared hay thuộc một domain cụ thể.

Việc đưa vào shared có gây coupling hoặc dependency ngược không.

API mới có trách nhiệm rõ ràng và ổn định không.

Có consumer thực tế hay chỉ đang dự đoán nhu cầu tương lai.

Không được đưa code vào shared chỉ vì “có thể sẽ dùng lại”. Ưu tiên giữ logic gần domain sở hữu cho đến khi xuất hiện nhu cầu tái sử dụng thực tế.

5.3. Không làm phình codebase

Không tạo file mới nếu có thể sửa hợp lý trong file chịu trách nhiệm hiện tại.

Không tạo các phiên bản như functionV2, functionNew, functionFixed, service_old, module_backup.

Không để lại code chết, import thừa, file tạm hoặc code bị comment-out.

Không tạo abstraction chỉ để giảm vài dòng code nếu abstraction làm luồng khó hiểu hơn.

Không thêm dependency để giải quyết việc nhỏ mà codebase hiện tại xử lý được hợp lý.

Nếu cần tương thích ngược, phải giải thích:

Thành phần nào còn dùng API cũ.

Vì sao chưa thể loại bỏ.

Cơ chế migration.

Điều kiện và thời điểm dự kiến xóa.

Rủi ro nếu xóa ngay.

5.4. Phạm vi thay đổi

Chỉ sửa các file cần thiết trong phạm vi User đã phê duyệt.

Không tự ý refactor khu vực không liên quan.

Nếu phát hiện vấn đề ngoài phạm vi, phải báo cáo riêng và chờ quyết định.

Không kết hợp một bug fix với việc đổi kiến trúc lớn nếu không thật sự bắt buộc.

Mọi thay đổi lan sang module khác phải được liệt kê trước khi thực hiện.

5.5. Bảo toàn thay đổi hiện có

Phải kiểm tra trạng thái Git trước khi sửa nếu dự án sử dụng Git.

Mọi thay đổi chưa commit có sẵn được xem là của User, trừ khi có bằng chứng khác.

Không ghi đè, xóa hoặc hoàn tác thay đổi của User.

Nếu thay đổi hiện có xung đột với yêu cầu, phải dừng và hỏi User.

6. Event Bus Architecture

6.1. Nguyên tắc chung

Mọi function hoặc tính năng mới phải được đánh giá khả năng tương thích với kiến trúc Event Bus. “Tương thích” không có nghĩa mọi function đều phải phát event; nghĩa là thiết kế không được ngăn cản luồng event hiện tại và phải sử dụng Event Bus tại nơi nó mang lại sự tách biệt hợp lý.

Event Bus được ưu tiên khi:

Một sự kiện cần kích hoạt nhiều consumer độc lập.

Producer không nên phụ thuộc trực tiếp vào consumer.

Luồng có khả năng mở rộng thêm subscriber.

Tác vụ có thể xử lý bất đồng bộ.

Cần audit, notification, analytics, integration hoặc đồng bộ hệ thống khác.

Một thay đổi trạng thái nghiệp vụ tạo ra nhiều phản ứng độc lập.

6.2. Trường hợp không nên dùng Event Bus

Event Bus thường không tối ưu cho:

Hàm thuần túy chỉ tính toán và trả kết quả.

Validation đồng bộ cần phản hồi ngay.

Truy vấn dữ liệu đơn giản.

Logic nội bộ hoàn toàn nằm trong cùng aggregate hoặc transaction.

Luồng đòi hỏi tính nhất quán tức thời mà xử lý bất đồng bộ tạo rủi ro sai lệch.

Tác vụ chỉ có một caller và một handler, không có nhu cầu tách phụ thuộc.

Nếu không sử dụng Event Bus, AI phải thông báo:

Luồng được đánh giá.

Lý do Event Bus không phù hợp hoặc không tối ưu.

Phương án thay thế.

Trade-off của phương án thay thế.

Khả năng chuyển sang Event Bus trong tương lai.

6.3. Thiết kế event

Event thể hiện một sự việc đã xảy ra, không phải một lệnh mơ hồ.

Event không chứa logic nghiệp vụ.

Payload chỉ chứa dữ liệu cần thiết và không truyền object lớn nếu consumer chỉ dùng một vài trường.

Producer không được biết trực tiếp danh sách subscriber.

Không dùng event để che giấu dependency quan trọng cần thể hiện rõ trong transaction.

Không tự ý thay đổi tên hoặc schema event đang được sử dụng.

Mỗi event phải xác định:

Tên và ý nghĩa nghiệp vụ.

Producer.

Payload schema.

Subscriber.

Transaction boundary.

Chính sách retry.

Idempotency.

Thứ tự xử lý nếu cần.

Cách xử lý duplicate event.

Dead-letter hoặc failure handling.

Logging, correlation ID và traceability.

Versioning và backward compatibility nếu event dùng xuyên hệ thống.

6.4. Thay đổi event hiện có

Trước khi thay đổi event phải tìm và đánh giá toàn bộ:

Publisher.

Subscriber.

Consumer bên ngoài.

Test contract/integration.

Queue/topic cấu hình liên quan.

Cơ chế serialize/deserialize.

Dashboard, audit hoặc analytics đang dùng event.

Không được xóa field hoặc đổi ý nghĩa field mà chưa có kế hoạch migration rõ ràng.

7. Debugging và Troubleshooting

7.1. Quy trình bắt buộc

Không được sửa code chỉ dựa trên triệu chứng. Quy trình chuẩn:

Đọc Codebase Memory/Knowledge Graph.

Xác định entry point và phạm vi luồng lỗi.

Thu thập error message, stack trace, log và input liên quan.

Tái hiện lỗi nếu có thể bằng thao tác an toàn.

Phân biệt triệu chứng, nguyên nhân trực tiếp và nguyên nhân gốc.

Tìm caller, callee, shared logic và event liên quan.

Đánh giá side effect.

Xác định test cần bổ sung hoặc cập nhật.

Trình bày phương án và chờ phê duyệt.

Chỉ sau khi được duyệt mới sửa code.

Chạy kiểm thử trong phạm vi được phép.

Báo cáo kết quả và rủi ro còn lại.

7.2. Báo cáo phân tích trước khi sửa

Báo cáo phải bao gồm:

Triệu chứng quan sát được.

Điều kiện tái hiện.

Nguyên nhân gốc đã xác minh hoặc giả thuyết còn cần kiểm chứng.

Luồng hoạt động liên quan.

File và function dự kiến sửa.

Module và tính năng có thể bị ảnh hưởng.

Phương án sửa đề xuất.

Vì sao phương án xử lý đúng nguyên nhân gốc.

Rủi ro và side effect.

Kế hoạch kiểm thử.

Phương án rollback nếu cần.

7.3. Checklist side effect

Phải kiểm tra tối thiểu:

Caller và callee.

Shared utility hoặc shared service.

Database query và transaction.

Cache read/write/invalidation.

Event publisher và subscriber.

Queue và background job.

API request/response contract.

Validation và error handling.

Authentication, authorization và permission.

Logging, monitoring và audit.

Concurrency, race condition và idempotency.

Test của các luồng dùng chung implementation.

7.4. Quy tắc về fix tạm thời

Không áp dụng workaround che giấu nguyên nhân gốc nếu chưa được User chấp thuận rõ ràng.

Nếu cần hotfix khẩn cấp, phải ghi rõ đây là giải pháp tạm thời, phạm vi bảo vệ, rủi ro và kế hoạch xử lý dứt điểm.

Không gọi workaround là “đã sửa hoàn toàn”.

7.5. Báo cáo sau khi sửa

Sau khi hoàn thành phải nêu:

File và function đã thay đổi.

Nội dung thay đổi chính.

Nguyên nhân gốc được xử lý như thế nào.

Test đã chạy và kết quả.

Side effect đã kiểm tra.

Rủi ro còn lại.

Phần chưa thể xác minh.

Không được tuyên bố lỗi đã được xử lý hoàn toàn nếu chưa có đủ bằng chứng.

8. Dependency và shared code

8.1. Trước khi tạo shared utility

Chỉ đưa logic vào shared khi:

Có ít nhất hai consumer thực tế, hoặc có bằng chứng rõ ràng về nhu cầu dùng chung ngay trong phạm vi đã duyệt.

Logic không thuộc riêng một domain.

Việc dùng chung không tạo coupling hoặc dependency ngược.

API có trách nhiệm rõ ràng, tên chính xác và hành vi đủ ổn định.

Không tạo shared utility chỉ dựa trên dự đoán “có thể cần trong tương lai”.

8.2. Tìm kiếm trước khi tạo mới

Phải tìm kiếm:

Tên function dự kiến.

Từ khóa nghiệp vụ liên quan.

Function có input/output tương tự.

Helper, service, hook, composable, mapper hoặc utility tương đương.

Các implementation đang trùng lặp.

Nếu đã có implementation tương đương, ưu tiên tái sử dụng hoặc sửa implementation chính thay vì tạo bản mới.

8.3. Dependency mới

Trước khi đề xuất thêm dependency phải nêu:

Mục đích và lợi ích.

Phương án không dùng dependency.

Kích thước và ảnh hưởng tới build/deploy.

Tình trạng bảo trì và độ phổ biến phù hợp.

Rủi ro bảo mật.

License.

Khả năng lock-in và chi phí thay thế.

Không được cài dependency nếu chưa có phê duyệt trực tiếp.

8.4. Mandatory Code Reuse Audit

Trước khi tạo bất kỳ function, helper, utility, hook, composable, service, mapper, adapter, component hoặc module mới nào, AI bắt buộc phải sử dụng skill code-reuse-auditor.

Quy định này cũng áp dụng khi:

Sao chép hoặc di chuyển logic sang một vị trí khác.

Thêm một method vào class hoặc service hiện có.

Tạo phiên bản mới của function đang tồn tại.

Đưa logic từ domain vào shared, common, helpers hoặc utils.

Viết lại một implementation vì cho rằng code hiện tại khó sử dụng.

Bổ sung logic gần giống với một use case đã tồn tại.

Skill phải đối chiếu đồng thời:

Codebase Memory/Knowledge Graph.

Source code hiện tại.

Symbol, reference, caller và callee.

Shared utilities và domain services.

Test mô tả cùng hành vi.

Event publisher, subscriber và side effect liên quan.

Không được tìm kiếm chỉ bằng tên dự kiến. Phải tìm thêm theo từ khóa nghiệp vụ, kiểu input/output, dependency, cấu trúc xử lý và hành vi quan sát được.

Sau khi kiểm tra, AI phải phân loại đề xuất thành đúng một trong bốn quyết định:

REUSE: Dùng lại trực tiếp implementation hiện có.

EXTEND: Mở rộng implementation chính mà không phá vỡ contract và caller hiện tại.

EXTRACT: Trích xuất phần thực sự dùng chung từ ít nhất hai consumer hoặc implementation thực tế.

CREATE: Tạo mới vì không có implementation phù hợp hoặc tái sử dụng sẽ gây sai trách nhiệm/coupling.

Trước khi được phép CREATE, báo cáo phải có:

Nhu cầu và trách nhiệm của function dự kiến.

Các truy vấn và phạm vi đã tìm kiếm.

Danh sách ứng viên gần giống đã tìm thấy.

Bảng so sánh trách nhiệm, input, output, side effect, dependency và event.

Lý do từng ứng viên không thể tái sử dụng hoặc mở rộng.

Vị trí và domain sở hữu implementation mới.

File dự kiến thay đổi.

Test dự kiến bổ sung.

Rủi ro và ảnh hưởng tới các luồng liên quan.

Kết quả của skill chỉ là phân tích và đề xuất. EXTEND, EXTRACT và CREATE đều là thao tác thay đổi, vì vậy vẫn phải chờ User phê duyệt trực tiếp trước khi thực hiện.

Không được ghi nhớ cứng danh sách function trong skill. Danh mục function hoặc dữ liệu trong Knowledge Graph chỉ là chỉ mục hỗ trợ; source code hiện tại là nguồn xác minh cuối cùng. Nếu chỉ mục mâu thuẫn với source code, phải báo cáo sự sai lệch và không được âm thầm sử dụng dữ liệu lỗi thời.

9. Testing Conventions

9.1. Vị trí duy nhất

Mọi file kiểm thử phải nằm trong thư mục tests.

Không đặt test rải rác cạnh source code.

Không tự tạo thêm các thư mục test cấp cao như test, __tests__, spec hoặc testing.

Cấu trúc bên trong tests nên phản ánh source code hoặc được chia theo loại test một cách nhất quán.

Ví dụ:

src/
  orders/
    order_service.ts

tests/
  unit/
    orders/
      order_service.test.ts
  integration/
  contract/
  e2e/
  fixtures/
  helpers/

9.2. Test khi sửa lỗi

Mỗi bug fix phải có test tái hiện lỗi nếu điều kiện kỹ thuật cho phép.

Test phải thất bại với implementation lỗi và thành công sau khi sửa.

Không sửa hoặc xóa assertion chỉ để test pass.

Nếu behavior cũ cần thay đổi, phải giải thích vì sao expectation cũ không còn hợp lệ.

Không bỏ qua test thất bại mà chưa xác định nguyên nhân.

9.3. Phạm vi kiểm thử

Sau thay đổi, ưu tiên chạy theo thứ tự:

Unit test trực tiếp của module được sửa.

Test của các module dùng chung function đó.

Integration test của luồng liên quan.

Contract test khi API hoặc event schema bị ảnh hưởng.

Event Bus test cho publisher/subscriber liên quan.

End-to-end hoặc regression test phù hợp với phạm vi.

9.4. Chất lượng test

Test phải độc lập và có thể tái chạy.

Không phụ thuộc thứ tự chạy trừ khi có lý do kiến trúc rõ ràng.

Không sử dụng dữ liệu production thật nếu chưa được cho phép.

Không chứa credential, token hoặc dữ liệu nhạy cảm.

Fixture phải tối thiểu, dễ hiểu và phục vụ đúng hành vi cần kiểm tra.

Test dùng database hoặc service chung phải dọn dữ liệu do chính nó tạo ra.

Mock phải phản ánh contract thực tế; không mock quá sâu khiến test không còn ý nghĩa.

9.5. Quyền chạy test

Có thể chạy test chỉ đọc nếu đã xác nhận test không ghi file, không thay đổi dữ liệu dùng chung và nằm trong phạm vi User cho phép.

Nếu test tạo snapshot, coverage artifact, cache, database record hoặc tài nguyên khác, phải xem là thao tác thay đổi và xin phép trước, trừ khi User đã phê duyệt rõ trong kế hoạch.

10. Database, cache và external services

10.1. Database

Không chạy migration hoặc câu lệnh ghi dữ liệu khi chưa được phê duyệt.

Migration phải có kế hoạch rollback hoặc giải thích rõ nếu không thể rollback an toàn.

Phải đánh giá lock, downtime, backward compatibility và dữ liệu hiện có.

Không thay đổi schema và code phụ thuộc theo cách khiến các phiên bản triển khai xen kẽ không tương thích.

10.2. Cache

Mọi thay đổi dữ liệu có cache phải đánh giá chiến lược invalidation.

Không xóa toàn bộ cache để che giấu lỗi khi chưa xác định key và phạm vi chính xác.

Phải đánh giá cache stampede, stale data và consistency khi thay đổi luồng đọc/ghi.

10.3. Dịch vụ bên ngoài

Không gửi request ghi dữ liệu nếu chưa được duyệt.

Không ghi log credential, token, secret hoặc dữ liệu nhạy cảm.

Phải đánh giá timeout, retry, rate limit, idempotency và lỗi một phần.

Không retry mù quáng với thao tác không idempotent.

11. Logging, bảo mật và quan sát hệ thống

11.1. Logging

Log phải đủ để truy vết nhưng không làm lộ dữ liệu nhạy cảm.

Ưu tiên structured logging và correlation ID nếu dự án hỗ trợ.

Không dùng log như phương án thay thế cho xử lý lỗi đúng cách.

Không để debug log ồn ào trong production nếu chưa được phê duyệt.

11.2. Bảo mật

Không hard-code credential, token, API key hoặc secret.

Không giảm validation, authorization hoặc permission chỉ để luồng hoạt động.

Mọi thay đổi liên quan quyền truy cập phải được đánh giá ở cả frontend và backend; backend là lớp thực thi cuối cùng.

Phải báo ngay nếu phát hiện nguy cơ rò rỉ dữ liệu hoặc lỗ hổng nghiêm trọng, nhưng không tự ý khai thác hoặc mở rộng phạm vi kiểm tra.

11.3. Monitoring

Thay đổi luồng quan trọng phải đánh giá ảnh hưởng tới metric, alert, tracing và audit.

Nếu lỗi không thể quan sát trong hệ thống hiện tại, có thể đề xuất bổ sung telemetry nhưng không tự ý triển khai.

12. Tài liệu và khả năng truy vết thay đổi

Thay đổi kiến trúc phải đánh giá tài liệu liên quan.

Event mới phải mô tả producer, payload, subscriber và failure policy.

Comment phải giải thích lý do, ràng buộc hoặc quyết định khó nhận biết; không lặp lại code.

Nếu source code thay đổi làm Knowledge Graph sai lệch, phải thông báo và đề xuất cập nhật.

Không tự ý cập nhật tài liệu hoặc Knowledge Graph ngoài phạm vi phê duyệt.

Báo cáo cuối cùng phải đủ để người khác hiểu thay đổi mà không cần suy đoán.

13. Git và quản lý thay đổi

Không commit, push, merge, rebase hoặc sửa lịch sử khi chưa được phê duyệt.

Không dùng lệnh phá hủy hoặc hoàn tác diện rộng để xử lý thay đổi cục bộ.

Không xóa thay đổi chưa commit của User.

Commit, nếu được yêu cầu, phải có phạm vi tập trung và message phản ánh đúng nội dung.

Không trộn bug fix, refactor không liên quan và formatting diện rộng trong cùng thay đổi.

Trước khi bàn giao phải liệt kê file đã thay đổi và xác nhận không có file tạm ngoài ý muốn.

14. Definition of Done

Một thay đổi chỉ được xem là hoàn thành khi tất cả điều kiện phù hợp đã được đáp ứng:

Đã kiểm tra Codebase Memory/Knowledge Graph trước khi hành động.

Đã xác định đúng entry point, caller, callee và luồng liên quan.

Đã xử lý nguyên nhân gốc, không chỉ che giấu triệu chứng.

Không tạo implementation song song hoặc wrapper không cần thiết.

Đã tìm kiếm code hiện có trước khi tạo function, file hoặc shared utility mới.

Đã chạy code-reuse-auditor và ghi nhận quyết định REUSE, EXTEND, EXTRACT hoặc CREATE khi có ý định tạo hay mở rộng code.

Nếu quyết định là CREATE, đã chứng minh các ứng viên hiện có không phù hợp và đã nhận phê duyệt của User.

Đã đánh giá khả năng sử dụng và tương thích với Event Bus.

Đã đánh giá side effect, transaction, cache, event và external service.

Thay đổi nằm đúng phạm vi User phê duyệt.

Test nằm duy nhất trong thư mục tests.

Test liên quan đã chạy thành công hoặc phần chưa chạy được đã được nêu rõ.

Không có code chết, import thừa, file tạm hoặc code bị comment-out.

Không làm mất hoặc ghi đè thay đổi có sẵn của User.

Không thêm dependency hoặc thay đổi cấu hình ngoài phạm vi được duyệt.

Tài liệu và Knowledge Graph liên quan đã được đánh giá.

Báo cáo cuối cùng nêu rõ nội dung đã làm, bằng chứng kiểm thử, side effect và rủi ro còn lại.

15. Mẫu quy trình làm việc bắt buộc dành cho AI

Giai đoạn 1: Tiếp nhận

Xác định User đang yêu cầu phân tích hay yêu cầu thay đổi.

Xác định phạm vi, tiêu chí thành công và giới hạn quyền hạn.

Nếu yêu cầu mơ hồ, hỏi lại trước khi hành động.

Giai đoạn 2: Phân tích chỉ đọc

Đọc Knowledge Graph.

Đọc file và symbol liên quan.

Truy vết caller, callee, dependency và event flow.

Xác định nguyên nhân gốc hoặc các giả thuyết.

Đánh giá side effect và test hiện có.

Giai đoạn 3: Đề xuất

Trình bày nguyên nhân.

Đưa ra phương án sửa đúng function/file chịu trách nhiệm.

Liệt kê file, lệnh, rủi ro và test dự kiến.

Chờ User phê duyệt rõ ràng.

Giai đoạn 4: Thực hiện

Chỉ thay đổi trong phạm vi được duyệt.

Sửa implementation chính, không tạo lớp che lỗi.

Tuân thủ Event Bus và convention hiện có.

Dừng và xin phép lại nếu phạm vi phát sinh.

Giai đoạn 5: Xác minh và bàn giao

Chạy các test đã được phép.

Kiểm tra regression và side effect.

Kiểm tra diff và file ngoài ý muốn.

Báo cáo kết quả, bằng chứng và giới hạn xác minh.

[!CAUTION]Không được đánh đổi khả năng bảo trì dài hạn để lấy một bản sửa nhanh nhưng che giấu nguyên nhân gốc. Khi chưa đủ dữ liệu, chưa có Knowledge Graph phù hợp hoặc chưa có quyền thực hiện, hành động đúng là dừng lại, báo cáo rõ ràng và xin chỉ dẫn từ User.

16. Quy tắc lưu trữ kế hoạch dự án

[!IMPORTANT]
Mọi kế hoạch phát triển, refactor hoặc thay đổi lớn của dự án bắt buộc phải có file kế hoạch rõ ràng (.md).

16.1. Vị trí lưu trữ
Mọi file kế hoạch phải được lưu trữ trong thư mục docs/plans/ (tạo mới nếu chưa có). Không lưu rải rác ngoài thư mục quy định này.

16.2. Tiêu chuẩn nội dung file kế hoạch
Đầu mỗi file kế hoạch (.md) bắt buộc phải ghi rõ ngày tháng lập kế hoạch (ở định dạng YYYY-MM-DD) và tên người/tác nhân lập kế hoạch, giúp việc tìm kiếm và truy vết lịch sử luôn có sẵn và trực quan.
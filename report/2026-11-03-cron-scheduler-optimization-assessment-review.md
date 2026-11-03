# Báo cáo đánh giá và nghiệm thu: tối ưu Cron Scheduler

- Ngày đánh giá: 2026-11-03 (Asia/Bangkok)
- Tài liệu được đánh giá: `report/2026-11-03-cron-scheduler-optimization-review.md`
- Phạm vi đối chiếu: scheduler backend, cấu hình job, `node-cron` 4.6.0, luồng gửi Telegram và schema log.
- Trạng thái nghiệm thu: **Chưa đạt - cần chỉnh sửa thiết kế và bổ sung bằng chứng trước khi triển khai.**

## Kết luận

Tài liệu nhận diện đúng hai rủi ro nền tảng: `node-cron` 4.6.0 có dung sai mặc định 1.000 ms cho lần chạy trễ và truy vấn nhắc gia hạn hiện chỉ lấy đúng một ngày còn lại. Tuy nhiên, phương án chạy bù không được gắn vào API thực tế của thư viện; cơ chế chống trùng chưa có định danh nghiệp vụ/unique constraint bền vững; và các kết luận về sự cố ngày 02-03/11/2026 chưa có bằng chứng truy xuất được trong repository. Vì vậy không thể xác nhận nguyên nhân gốc hoặc chấp thuận triển khai theo tài liệu hiện tại.

## Phát hiện

### Critical

1. **Callback chạy bù trong đề xuất không được `node-cron` gọi.**
   - Tài liệu đề xuất truyền `onMissedExecution` vào `cron.schedule` tại `report/2026-11-03-cron-scheduler-optimization-review.md:71`.
   - `missedExecutionTolerance` là option hợp lệ, nhưng `onMissedExecution` không phải `TaskOptions` công khai. Bản cài đặt biến sự kiện bị lỡ thành event `execution:missed` trên đối tượng task; callback nội bộ không lấy từ object options.
   - Hậu quả: tăng dung sai có thể hợp lệ, nhưng “tự động kích hoạt chạy bù” trong tài liệu sẽ không xảy ra. Một lượt chạy lỡ vẫn không được ghi nhận, không được xử lý và không thể khắc phục hiện tượng trôi đơn.
   - Yêu cầu sửa: sau khi tạo task, đăng ký listener `execution:missed` hoặc tự xây dựng scheduler/recovery rõ ràng; listener phải ghi nhận một recovery request có định danh, không gọi gửi Telegram trực tiếp.

2. **Idempotency được mô tả nhưng chưa có mô hình dữ liệu để thực thi an toàn.**
   - Tài liệu yêu cầu dò `notification_logs` trong 24 giờ tại `report/2026-11-03-cron-scheduler-optimization-review.md:80`, nhưng bảng hiện chỉ có log nội dung/kênh/trạng thái; không có `order_id`, khóa nghiệp vụ, index unique hoặc trạng thái reservation cho từng lần nhắc.
   - Luồng Telegram gửi header rồi gửi từng đơn qua queue; việc gửi là side effect ngoài PostgreSQL. Advisory lock chỉ chặn đồng thời trong thời gian giữ lock, không ngăn gửi lại khi process chết, timeout, retry hay transaction rollback sau khi Telegram đã nhận tin.
   - Hậu quả: cơ chế “không bao giờ gửi trùng” không thể được đảm bảo. Quét dải 1-4 ngày còn có thể tạo gửi lặp cho một đơn khi không có khóa theo `order + loại nhắc + hạn dùng`.
   - Yêu cầu sửa: thêm bản ghi idempotency/outbox có unique constraint tối thiểu theo đơn, loại thông báo và ngày hạn (hoặc kỳ nhắc); reserve trong transaction trước khi gửi; chỉ đánh dấu `SENT` sau kết quả gửi; định nghĩa retry cho `PENDING`/`FAILED`.

3. **Kết luận nguyên nhân gốc và bằng chứng production chưa thể kiểm chứng.**
   - Tài liệu khẳng định lịch sử `cron_job_logs`, ba đơn cụ thể và kết quả Telegram thủ công tại `report/2026-11-03-cron-scheduler-optimization-review.md:36`, nhưng không kèm truy vấn, export log, timestamp theo múi giờ, process log hoặc ID message Telegram.
   - Repository chỉ cho thấy `cron_job_logs` được ghi sau khi `executeJob` bắt đầu và handler trả về/lỗi. Không có bản ghi chỉ chứng minh callback chưa tới bước ghi log; nó không chứng minh event-loop delay là nguyên nhân duy nhất. Các khả năng khác gồm job bị tắt/sửa lịch trong bảng `cron_jobs`, scheduler không khởi tạo, lỗi kết nối DB, hoặc process scheduler không chạy.
   - Yêu cầu sửa: đính kèm dữ liệu truy vết đã ẩn thông tin nhạy cảm, gồm cấu hình `cron_jobs`, `cron_job_logs`, startup log scheduler, event `execution:missed`, log process/container và bằng chứng lệnh manual theo cùng môi trường.

### High

4. **Lịch đề xuất không được đối chiếu với cấu hình runtime là nguồn sự thật.**
   - Scheduler đọc job từ bảng `system_automation.cron_jobs`; migration chỉ là giá trị seed ban đầu. Tài liệu đưa mốc backup `02:00`/`02:30`, trong khi seed hiện tại là `03:30` và mặc định `enabled = false`.
   - Không được thay đổi lịch dựa trên migration hoặc giả định. Cần chụp cấu hình thực tế trước, lập migration/upsert có rollback, và nêu rõ múi giờ `Asia/Ho_Chi_Minh`.

5. **Advisory lock là lớp hỗ trợ, không phải bảo đảm tuyệt đối chống gửi trùng.**
   - Hai task gửi Telegram hiện chưa dùng `withAdvisoryLock`, nên phát hiện thiếu khóa là đúng. Tuy vậy câu khẳng định “đảm bảo tuyệt đối” tại `report/2026-11-03-cron-scheduler-optimization-review.md:84` không đúng nếu không có idempotency bền vững.
   - Bọc toàn bộ network I/O trong transaction advisory lock còn giữ transaction/connection trong lúc chờ Telegram. Cần lock ngắn để reserve dữ liệu; worker/outbox gửi sau transaction và xử lý retry theo trạng thái.

6. **Không có cơ chế quan sát cho job bị lỡ hoặc chồng lấn.**
   - Scheduler hiện chỉ truyền `timezone` cho `cron.schedule`; không đăng ký `execution:missed`, `execution:overlap`, hoặc `execution:failed` vào `cron_job_logs`/alert.
   - Không có telemetry thì không thể xác nhận cải thiện sau khi đổi giờ. Cần log có cấu trúc, metric/alert cho missed execution, thời lượng, số lần skip và backlog outbox.

### Medium

7. **Kế hoạch test được liệt kê nhưng tệp test chưa tồn tại và thiếu tiêu chí pass/fail.**
   - `backend/tests/integration/cron_scheduler_reliability.test.js` được liệt kê tại `report/2026-11-03-cron-scheduler-optimization-review.md:104` nhưng chưa có trong repository.
   - Cần tối thiểu các test: late/missed event tạo recovery; hai process chỉ reserve một notification; retry sau lỗi Telegram không mất đơn và không gửi hai lần; `RENEWAL_WARN_DAYS` nạp xong trước scheduler; job runtime đúng lịch đã phê duyệt.

8. **Lỗi khởi tạo cache được nhận diện đúng nhưng mức độ và cách sửa chưa đầy đủ.**
   - `systemConfigService.initCache()` là async và `server.js` hiện không `await` trước `initScheduler()`. Điều này có thể làm scheduler dùng default khi cache chưa sẵn sàng.
   - Cần đưa bootstrapping vào một hàm async duy nhất, fail-fast hoặc retry có kiểm soát khi không nạp được config, rồi mới start HTTP/scheduler.

## Kiểm tra đã chạy

- Đọc toàn bộ tài liệu được đánh giá.
- Đối chiếu `backend/src/scheduler/index.js`, các task scheduler, `backend/src/scheduler/withAdvisoryLock.js`, `backend/src/server.js`, service cấu hình và Telegram dispatcher/client.
- Đối chiếu `node-cron` 4.6.0 đã cài: default `missedExecutionTolerance = 1000`, option hợp lệ và event `execution:missed`.
- Đối chiếu migration `cron_jobs` và schema `notification_logs`.
- Tìm test cron/scheduler/notification trong `backend/tests`: không có test phù hợp; không chạy build/lint/integration test vì đây là đánh giá tài liệu và không thay đổi mã runtime.

## Điều kiện nghiệm thu

- Sửa phần 4.2 theo event/API thực tế và chứng minh recovery chạy đúng một lần.
- Thiết kế migration + `dbSchema`/`COLS` cho outbox/idempotency; có unique constraint và strategy retry rõ ràng.
- Cung cấp bằng chứng production đã ẩn dữ liệu nhạy cảm để xác nhận nguyên nhân gốc và lịch runtime.
- Chốt lịch bằng migration/upsert có rollback sau khi Master phê duyệt, không dựa vào seed cũ.
- Thêm test tự động và chạy integration test trên `TEST_DATABASE_URL`; chỉ nghiệm thu sau khi toàn bộ case pass.

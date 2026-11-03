const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
require("module-alias/register");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { db, TABLES } = require("@/db");
const { notificationHub, outboxDispatcherWorker } = require("@/domains/notifications");
const { notifyFourDaysTask } = require("@/scheduler/tasks/notifyFourDaysTask");
const cronJobService = require("@/domains/system/services/cronJobService");

test("Unified Notification Hub - Case 1: Outbox Dispatch & Idempotency Gatekeeper (Chống trùng tuyệt đối)", async () => {
  const testOrderCode = `TEST_HUB_${Date.now()}`;
  const idempotencyKey = `order:${testOrderCode}:renew_reminder:2026-11-06`;

  // 1. Dispatch lần 1 -> Phải thành công và tạo bản ghi PENDING
  const result1 = await notificationHub.dispatch({
    channel: "TELEGRAM",
    eventType: "ORDER_RENEW_REMINDER",
    idempotencyKey,
    topicKey: "RENEWAL_REMINDER",
    renderedContent: "<b>[TEST]</b> Thông báo gia hạn đơn hàng lần 1",
    payload: { orderCode: testOrderCode, price: 100000 },
  });

  assert.equal(result1.queued, true, "Lần 1 phải được đưa vào Outbox thành công");
  assert.ok(result1.id, "Phải có ID bản ghi outbox");
  assert.equal(result1.skipped, false);

  // 2. Dispatch lần 2 với cùng idempotencyKey -> Phải tự động bỏ qua (skipped)
  const result2 = await notificationHub.dispatch({
    channel: "TELEGRAM",
    eventType: "ORDER_RENEW_REMINDER",
    idempotencyKey,
    topicKey: "RENEWAL_REMINDER",
    renderedContent: "<b>[TEST]</b> Thông báo gia hạn đơn hàng lần 2 (cố tình spam)",
    payload: { orderCode: testOrderCode, price: 100000 },
  });

  assert.equal(result2.queued, false, "Lần 2 phải bị từ chối đưa vào Outbox");
  assert.equal(result2.skipped, true, "Lần 2 phải có cờ skipped = true");
  assert.equal(result2.reason, "DUPLICATE_IDEMPOTENCY_KEY", "Lý do phải là trùng idempotency_key");

  // 3. Kiểm tra DB: Chỉ có đúng 1 bản ghi duy nhất trong bảng outbox
  const rows = await db(TABLES.NOTIFICATIONS_OUTBOX).where("idempotency_key", idempotencyKey);
  assert.equal(rows.length, 1, "Chỉ được tồn tại duy nhất 1 bản ghi trong notifications_outbox");
  assert.equal(rows[0].status, "PENDING", "Trạng thái ban đầu phải là PENDING");

  // Dọn dẹp
  await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", result1.id).del();
});

test("Unified Notification Hub - Case 2: Chính Sách Tự Động Dọn Dẹp 7 Ngày (7-Day Auto Pruning)", async () => {
  const testPrefix = `PRUNE_TEST_${Date.now()}`;

  // 1. Tạo 1 bản ghi SENT cũ hơn 8 ngày (Phải bị xóa)
  const [oldSent] = await db(TABLES.NOTIFICATIONS_OUTBOX).insert({
    channel: "TELEGRAM",
    event_type: "SYSTEM_ALERT",
    idempotency_key: `${testPrefix}_old_sent`,
    recipient: "12",
    rendered_content: "Old sent message",
    status: "SENT",
    created_at: db.raw("NOW() - INTERVAL '8 days'"),
    sent_at: db.raw("NOW() - INTERVAL '8 days'"),
  }).returning("id");

  // 2. Tạo 1 bản ghi SENT mới chỉ 2 ngày (Phải được giữ lại)
  const [recentSent] = await db(TABLES.NOTIFICATIONS_OUTBOX).insert({
    channel: "TELEGRAM",
    event_type: "SYSTEM_ALERT",
    idempotency_key: `${testPrefix}_recent_sent`,
    recipient: "12",
    rendered_content: "Recent sent message",
    status: "SENT",
    created_at: db.raw("NOW() - INTERVAL '2 days'"),
    sent_at: db.raw("NOW() - INTERVAL '2 days'"),
  }).returning("id");

  // 3. Tạo 1 bản ghi PENDING cũ 8 ngày (TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA vì chưa gửi xong)
  const [oldPending] = await db(TABLES.NOTIFICATIONS_OUTBOX).insert({
    channel: "TELEGRAM",
    event_type: "SYSTEM_ALERT",
    idempotency_key: `${testPrefix}_old_pending`,
    recipient: "12",
    rendered_content: "Old pending message",
    status: "PENDING",
    created_at: db.raw("NOW() - INTERVAL '8 days'"),
  }).returning("id");

  try {
    // Thực thi dọn dẹp log 7 ngày
    const pruneResult = await notificationHub.pruneOldLogs(7);
    assert.ok(pruneResult.outboxPruned >= 1, "Phải xóa ít nhất 1 bản ghi outbox cũ hơn 7 ngày");

    // Kiểm tra kết quả trong DB:
    const checkOldSent = await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", oldSent.id || oldSent).first();
    assert.equal(checkOldSent, undefined, "Bản ghi SENT 8 ngày trước phải bị xóa sạch");

    const checkRecentSent = await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", recentSent.id || recentSent).first();
    assert.ok(checkRecentSent, "Bản ghi SENT 2 ngày trước phải được bảo toàn");

    const checkOldPending = await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", oldPending.id || oldPending).first();
    assert.ok(checkOldPending, "Bản ghi PENDING dù quá 7 ngày vẫn KHÔNG được xóa nếu chưa gửi");
  } finally {
    // Dọn dẹp dữ liệu test
    await db(TABLES.NOTIFICATIONS_OUTBOX).where("idempotency_key", "like", `${testPrefix}%`).del();
  }
});

test("Unified Notification Hub - Case 3: Outbox Dispatcher Worker xử lý PENDING và cập nhật SENT", async () => {
  const testKey = `WORKER_TEST_${Date.now()}`;

  // Tạo 1 bản ghi outbox PENDING
  const [created] = await db(TABLES.NOTIFICATIONS_OUTBOX).insert({
    channel: "TELEGRAM",
    event_type: "TEST_WORKER",
    idempotency_key: testKey,
    recipient: "12",
    rendered_content: "<b>[TEST WORKER]</b> Nội dung kiểm thử worker",
    status: "PENDING",
  }).returning("id");

  const createdId = created.id || created;

  try {
    const item = await outboxDispatcherWorker.fetchAndLockNextOutboxItem();
    assert.ok(item, "Worker phải fetch và lock được bản ghi");
    assert.equal(item.status, "PROCESSING", "Bản ghi phải chuyển sang PROCESSING sau khi khóa");

    const result = await outboxDispatcherWorker.processOutboxItem(item);
    assert.equal(result.success, true, "Gửi tin thành công");

    // Kiểm tra DB: Phải chuyển sang SENT
    const updated = await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", item.id).first();
    assert.equal(updated.status, "SENT", "Trạng thái cuối cùng phải là SENT");
    assert.ok(updated.sent_at, "Phải có timestamp sent_at");
  } finally {
    await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", createdId).del();
  }
});

test("Unified Notification Hub - Case 4: Lịch Trình Cron Đã Lệch Pha Triệt Tiêu Xung Đột", async () => {
  const jobs = await db(TABLES.CRON_JOBS).select("id", "time", "frequency");
  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  // 1. Tác vụ sinh lời tiết kiệm: Phải là phút :15
  const profitJob = jobMap.get("task_credit_savings_profit");
  assert.ok(profitJob, "Phải tồn tại task_credit_savings_profit");
  assert.equal(profitJob.time, "00:15", "Tác vụ sinh lời phải chạy tại phút 15");
  assert.equal(profitJob.frequency, "hourly");
  const profitCron = cronJobService.buildCronExpression({ time: profitJob.time, frequency: profitJob.frequency, selectedDays: [] });
  assert.equal(profitCron, "15 * * * *", "Biểu thức cron phải là 15 * * * *");

  // 2. Tác vụ sao lưu database: Phải là 02:30 sáng
  const backupJob = jobMap.get("task_auto_backup_database");
  assert.ok(backupJob, "Phải tồn tại task_auto_backup_database");
  assert.equal(backupJob.time, "02:30", "Tác vụ sao lưu phải chạy lúc 02:30 sáng");

  // 3. Tác vụ quét gia hạn 4 ngày: Phải giữ 07:00 sáng
  const notifyJob = jobMap.get("task_notify_four_days_7h");
  assert.ok(notifyJob, "Phải tồn tại task_notify_four_days_7h");
  assert.equal(notifyJob.time, "07:00", "Tác vụ quét 4 ngày chạy lúc 07:00 sáng độc quyền");
});

test("Unified Notification Hub - Case 5: Chỉ Quét Đơn Còn Đúng 4 Ngày & Bỏ Qua Đơn 1, 2, 3 Ngày (Chỉ Đạo Của Master)", async () => {
  const code4Days = `MAV_4DAYS_${Date.now()}`;
  const code3Days = `MAV_3DAYS_${Date.now()}`;

  // 1. Tạo đơn A còn đúng 4 ngày
  const [order4] = await db(TABLES.ORDER_LIST).insert({
    id_order: code4Days,
    id_product: "Adobe Test 4 Days",
    customer: "Khách 4 Ngày",
    contact: "0999999991",
    days: 30,
    price: 150000,
    cost: 100000,
    status: "PAID",
    order_date: db.raw("(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '26 days'"),
    expired_at: db.raw("(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + INTERVAL '4 days'"),
  }).returning("id");

  // 2. Tạo đơn B còn đúng 3 ngày (tuyệt đối không được gửi nhắc)
  const [order3] = await db(TABLES.ORDER_LIST).insert({
    id_order: code3Days,
    id_product: "Adobe Test 3 Days",
    customer: "Khách 3 Ngày",
    contact: "0999999992",
    days: 30,
    price: 150000,
    cost: 100000,
    status: "PAID",
    order_date: db.raw("(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '27 days'"),
    expired_at: db.raw("(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + INTERVAL '3 days'"),
  }).returning("id");

  const id4 = order4.id || order4;
  const id3 = order3.id || order3;

  try {
    // 3. Chạy task notifyFourDaysTask
    const taskResult = await notifyFourDaysTask("test_4days_exact_run");
    assert.equal(taskResult.success, true);

    // Xác nhận: Đơn 4 ngày PHẢI ĐƯỢC TÌM THẤY
    const found4 = taskResult.orders.find((o) => (o.id_order || o.id) === code4Days);
    assert.ok(found4, "Đơn còn đúng 4 ngày phải được tìm thấy");

    // Xác nhận: Đơn 3 ngày TUYỆT ĐỐI KHÔNG ĐƯỢC TÌM THẤY
    const found3 = taskResult.orders.find((o) => (o.id_order || o.id) === code3Days);
    assert.equal(found3, undefined, "Đơn còn 3 ngày tuyệt đối không được đưa vào danh sách thông báo");

    // Kiểm tra Outbox: Chỉ có 1 bản ghi cho đơn 4 ngày, 0 bản ghi cho đơn 3 ngày
    const outbox4 = await db(TABLES.NOTIFICATIONS_OUTBOX)
      .where("idempotency_key", "like", `order:${code4Days}:renew_reminder%`);
    assert.equal(outbox4.length, 1, "Đơn 4 ngày phải có đúng 1 bản ghi outbox");

    const outbox3 = await db(TABLES.NOTIFICATIONS_OUTBOX)
      .where("idempotency_key", "like", `order:${code3Days}:renew_reminder%`);
    assert.equal(outbox3.length, 0, "Đơn 3 ngày tuyệt đối không có bản ghi nào trong outbox");

    // 4. Chạy task LẦN THỨ 2: Idempotency ngăn chặn gửi trùng
    const taskResult2 = await notifyFourDaysTask("test_4days_exact_run_2");
    assert.equal(taskResult2.success, true);

    const outbox4After = await db(TABLES.NOTIFICATIONS_OUTBOX)
      .where("idempotency_key", "like", `order:${code4Days}:renew_reminder%`);
    assert.equal(outbox4After.length, 1, "Lần chạy thứ 2 tuyệt đối không được spam thêm bản ghi vào outbox");
  } finally {
    // Dọn dẹp
    await db(TABLES.NOTIFICATIONS_OUTBOX).where("idempotency_key", "like", `order:${code4Days}%`).del();
    await db(TABLES.NOTIFICATIONS_OUTBOX).where("idempotency_key", "like", `order:${code3Days}%`).del();
    await db(TABLES.ORDER_LIST).where("id", id4).del();
    await db(TABLES.ORDER_LIST).where("id", id3).del();
  }
});

test("Unified Notification Hub - Case 6: Telegram Tắt -> Tự Động Hoàn Về PENDING (Không Kẹt PROCESSING)", async () => {
  const systemConfigService = require("@/domains/system/services/systemConfigService");
  const testKey = `test_tele_disabled_${Date.now()}`;

  // Tắt cờ Telegram tạm thời
  const originalState = systemConfigService.get("TELEGRAM_ENABLED", true);
  systemConfigService.set("TELEGRAM_ENABLED", false);

  try {
    // 1. Tạo 1 bản ghi outbox
    const dispatchRes = await notificationHub.dispatch({
      channel: "TELEGRAM",
      eventType: "TEST_DISABLED_EVENT",
      idempotencyKey: testKey,
      renderedContent: "Tin nhắn test khi telegram tắt",
    });
    assert.equal(dispatchRes.queued, true);

    // 2. Worker khóa tin sang PROCESSING
    const item = await outboxDispatcherWorker.fetchAndLockNextOutboxItem();
    assert.ok(item, "Worker phải fetch được tin");
    assert.equal(item.status, "PROCESSING");

    // 3. Xử lý tin khi Telegram đang tắt
    const procRes = await outboxDispatcherWorker.processOutboxItem(item);
    assert.equal(procRes.skipped, true);

    // 4. Kiểm tra Database: Trạng thái bắt buộc phải được hoàn trả về PENDING!
    const rowInDb = await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", item.id).first();
    assert.equal(rowInDb.status, "PENDING", "Bản ghi phải được hoàn trả về PENDING, không được để kẹt ở PROCESSING");
    assert.equal(rowInDb.last_error, "TELEGRAM_DISABLED");
    assert.ok(new Date(rowInDb.next_retry_at) > new Date(), "next_retry_at phải được lùi lại để retry sau");
  } finally {
    systemConfigService.set("TELEGRAM_ENABLED", originalState);
    await db(TABLES.NOTIFICATIONS_OUTBOX).where("idempotency_key", testKey).del();
  }
});

test("Unified Notification Hub - Case 7: Lease Recovery - Tự Động Hồi Sinh Tin PROCESSING Bị Treo Quá Hạn", async () => {
  const testKey = `test_stale_processing_${Date.now()}`;

  // 1. Chèn trực tiếp 1 bản ghi giả lập bị kẹt PROCESSING từ 10 phút trước (do server crash/kill)
  const [staleRow] = await db(TABLES.NOTIFICATIONS_OUTBOX).insert({
    channel: "TELEGRAM",
    event_type: "STALE_RECOVERY_TEST",
    idempotency_key: testKey,
    recipient: "0",
    rendered_content: "Tin nhắn bị kẹt do server restart đột ngột",
    status: "PROCESSING",
    retry_count: 0,
    created_at: db.raw("NOW() - INTERVAL '15 minutes'"),
    updated_at: db.raw("NOW() - INTERVAL '10 minutes'"),
  }).returning("*");

  try {
    // 2. Kích hoạt Lease Recovery (quét bản ghi PROCESSING > 5 phút)
    const recoveredCount = await outboxDispatcherWorker.recoverStaleProcessing(5);
    assert.ok(recoveredCount >= 1, "Phải tìm thấy và phục hồi ít nhất 1 bản ghi");

    // 3. Kiểm tra bản ghi trong Database
    const refreshed = await db(TABLES.NOTIFICATIONS_OUTBOX).where("id", staleRow.id).first();
    assert.equal(refreshed.status, "PENDING", "Bản ghi bị treo phải chuyển về PENDING");
    assert.equal(refreshed.last_error, "RECOVERED_FROM_STALE_PROCESSING");
    assert.equal(refreshed.retry_count, 1, "retry_count phải được tăng thêm 1");
  } finally {
    await db(TABLES.NOTIFICATIONS_OUTBOX).where("idempotency_key", testKey).del();
  }
});

after(async () => {
  await db.destroy();
  process.exit(0);
});

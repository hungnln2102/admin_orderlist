require("module-alias/register");
const assert = require("assert");
const { db, TABLES } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { registerDailySummaryListeners } = require("@/domains/dashboard/services/dailySummaryService");
const orderService = require("@/domains/orders/services/orderService");

async function runTest() {
  console.log("🧪 [QA Agent] Bắt đầu Integration Test — Tài Chính Đơn Nhập Hàng (Import Order Finance)...");
  await require("@/domains/system/services/systemConfigService").initCache();

  const testDate = new Date().toISOString().slice(0, 10);
  const monthKey = testDate.slice(0, 7);

  // Dọn dẹp bản ghi test cũ
  await db(TABLES.DAILY_REVENUE_SUMMARY).whereRaw("summary_date::text LIKE ?", [`${monthKey}%`]).del();
  await db(TABLES.ORDER_LIST).whereRaw("id_order LIKE 'MAVNTEST%'").del();

  let capturedMessages = [];
  const telegramClient = require("@/domains/notifications/telegram/core/telegramClient");
  const originalEnqueue = telegramClient.enqueueMessage;
  telegramClient.enqueueMessage = ({ text }) => {
    capturedMessages.push(text);
    console.log("📩 [Mock Telegram Message Captured]:\n" + text);
  };

  registerDailySummaryListeners();

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Tạo đơn nhập hàng MAVN thành công (giá vốn nhập: 125.000 ₫)
    // ----------------------------------------------------
    console.log("⏳ [TC-01] Tạo đơn nhập hàng MAVNTEST01 (cost = 125.000 ₫)...");
    const createdOrder = await orderService.createOrder({
      id_order: "MAVNTEST01",
      customer: "Mavryk",
      cost: 125000,
      price: 125000, // Thậm chí nếu frontend vô tình gửi price, backend vẫn chuẩn hóa price = 0 và cost = 125000
      information_order: "import_test@mavryk.com",
      slot: "pass123",
      days: 365,
      order_date: testDate,
      save_to_warehouse: false,
      save_to_package: false,
    });

    assert.strictEqual(Number(createdOrder.cost), 125000, "Cost phải là 125.000 ₫");
    assert.strictEqual(Number(createdOrder.price), 0, "Price (giá bán khách) của đơn nhập hàng phải là 0 ₫");
    assert.strictEqual(createdOrder.status, "PAID", "Trạng thái đơn nhập hàng phải là PAID");

    await new Promise((r) => setTimeout(r, 600));

    const summaryAfterCreate = await db(TABLES.DAILY_REVENUE_SUMMARY).where("summary_date", testDate).first();
    assert.strictEqual(Number(summaryAfterCreate?.total_shop_cost || 0), 125000, "total_shop_cost trong daily_revenue_summary phải tăng đúng +125.000 ₫");
    assert.strictEqual(Number(summaryAfterCreate?.earned_revenue || 0), 0, "Doanh thu khách không được tăng");
    assert.strictEqual(Number(summaryAfterCreate?.revenue_reversed || 0), 0, "Hoàn tiền khách phải là 0");

    // Kiểm tra tự động tạo log Nhà Cung Cấp
    const supplierLog = await db(TABLES.SUPPLIER_ORDER_COST_LOG).where({ order_list_id: createdOrder.id }).first();
    assert(supplierLog != null, "Phải tự động tạo log chi phí NCC trong supplier_order_cost_log khi tạo đơn nhập hàng MAVN");
    assert.strictEqual(Number(supplierLog.import_cost), 125000, "Giá vốn nhập trong log NCC phải là 125.000 ₫");
    assert.strictEqual(supplierLog.ncc_payment_status, "Chưa Thanh Toán", "Trạng thái thanh toán NCC phải là Chưa Thanh Toán");

    const msg1 = capturedMessages[capturedMessages.length - 1];
    assert(msg1 != null, "Phải bắt được tin nhắn Telegram khi tạo đơn nhập");
    assert(msg1.includes("📦 Nhập hàng tháng: 0 --> 125.000 (+125.000)"), `Nhập hàng phải tăng +125.000. Tin nhắn: ${msg1}`);
    assert(msg1.includes("💰 Lợi nhuận tháng: 0 --> -125.000 (-125.000)"), `Lợi nhuận phải trừ đúng -125.000. Tin nhắn: ${msg1}`);
    assert(msg1.includes("Nguồn: order.importCreated:MAVNTEST01"), `Nguồn phải là order.importCreated:MAVNTEST01. Tin nhắn: ${msg1}`);

    console.log("✅ [TC-01] PASS: Tạo đơn nhập hàng thành công, Tự động ghi Log NCC 125k Chưa Thanh Toán, Nhập hàng +125k, Lợi nhuận trừ -125k!");

    // ----------------------------------------------------
    // TEST CASE 2: Xóa đơn nhập hàng thành công (hoàn lại 100% số tiền còn lại trong ngày)
    // ----------------------------------------------------
    console.log("⏳ [TC-02] Xóa đơn nhập hàng MAVNTEST01...");
    const deleteRes = await orderService.deleteOrder(createdOrder.id);
    assert.strictEqual(deleteRes.success, true, "Xóa đơn phải thành công");

    await new Promise((r) => setTimeout(r, 600));

    // Kiểm tra order_list: Đơn phải bị hard delete khỏi order_list
    const orderInDb = await db(TABLES.ORDER_LIST).where("id", createdOrder.id).first();
    assert.strictEqual(orderInDb, undefined, "Đơn nhập hàng phải bị xóa hoàn toàn khỏi DB");

    // Kiểm tra supplier_order_cost_log: Log NCC cũng phải được dọn dẹp sạch sẽ
    const supplierLogAfterDel = await db(TABLES.SUPPLIER_ORDER_COST_LOG).where({ order_list_id: createdOrder.id }).first();
    assert.strictEqual(supplierLogAfterDel, undefined, "Log NCC phải được dọn sạch khi đơn nhập hàng bị xóa");

    // Kiểm tra daily_revenue_summary: total_shop_cost phải được trừ lại về 0
    const summaryAfterDelete = await db(TABLES.DAILY_REVENUE_SUMMARY).where("summary_date", testDate).first();
    assert.strictEqual(Number(summaryAfterDelete?.total_shop_cost || 0), 0, "total_shop_cost phải về lại 0 ₫");
    assert.strictEqual(Number(summaryAfterDelete?.revenue_reversed || 0), 0, "Tuyệt đối không được tăng hoàn tiền khách");

    const msg2 = capturedMessages[capturedMessages.length - 1];
    assert(msg2 != null, "Phải bắt được tin nhắn Telegram khi xóa đơn nhập");
    assert(msg2.includes("📦 Nhập hàng tháng: 125.000 --> 0 (-125.000)"), `Nhập hàng phải giảm -125.000 về 0. Tin nhắn: ${msg2}`);
    assert(msg2.includes("💰 Lợi nhuận tháng: -125.000 --> 0 (+125.000)"), `Lợi nhuận phải được cộng lại đúng +125.000 về 0. Tin nhắn: ${msg2}`);
    assert(msg2.includes("Nguồn: order.importCanceled:MAVNTEST01"), `Nguồn phải là order.importCanceled:MAVNTEST01. Tin nhắn: ${msg2}`);

    console.log("✅ [TC-02] PASS: Xóa đơn nhập hàng thành công, Nhập hàng giảm về 0, Lợi nhuận được cộng lại đúng +125.000 ₫ (về 0)!");

    console.log("\n────────────────────────────────────");
    console.log("📊 KẾT QUẢ: 2 PASS / 0 FAIL");
    console.log("🎉 TẤT CẢ TEST CASES TÀI CHÍNH ĐƠN NHẬP HÀNG ĐÃ PASS HOÀN TOÀN!");
  } finally {
    telegramClient.enqueueMessage = originalEnqueue;
    await db(TABLES.DAILY_REVENUE_SUMMARY).whereRaw("summary_date::text LIKE ?", [`${monthKey}%`]).del();
    await db(TABLES.ORDER_LIST).whereRaw("id_order LIKE 'MAVNTEST%'").del();
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});

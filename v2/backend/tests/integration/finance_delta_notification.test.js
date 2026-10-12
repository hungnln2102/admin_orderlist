require("module-alias/register");
const assert = require("assert");
const { db, TABLES } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { registerDailySummaryListeners } = require("@/domains/dashboard/services/dailySummaryService");
const { financeNotifier } = require("@/domains/notifications/telegram");

async function runTest() {
  console.log("🧪 [QA Agent] Bắt đầu Integration Test — Biến Động Tài Chính & Telegram Delta...");
  await require("@/domains/system/services/systemConfigService").initCache();

  const testDate = new Date().toISOString().slice(0, 10);
  const monthKey = testDate.slice(0, 7);

  // 1. Dọn dẹp bản ghi tháng này để test luồng từ 0
  await db(TABLES.DAILY_REVENUE_SUMMARY).whereRaw("summary_date::text LIKE ?", [`${monthKey}%`]).del();

  let capturedMessage = null;
  const telegramClient = require("@/domains/notifications/telegram/core/telegramClient");
  const originalEnqueue = telegramClient.enqueueMessage;
  telegramClient.enqueueMessage = ({ text }) => {
    capturedMessage = text;
    console.log("📩 [Mock Telegram Message Captured]:\n" + text);
  };

  registerDailySummaryListeners();

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Đơn hàng đầu tiên trong tháng (250.001đ, chi phí 125.000đ)
    // ----------------------------------------------------
    console.log("⏳ [TC-01] Mô phỏng sự kiện ORDER_PAID đầu tiên...");
    eventBus.emit(EVENTS.ORDER_PAID, {
      id_order: "TEST_ORDER_01",
      price: 250001,
      cost: 125000,
      order_date: testDate,
      action: "ADMIN_COMPLETE",
    });

    // Chờ async listener hoàn tất
    await new Promise((r) => setTimeout(r, 600));

    assert(capturedMessage != null, "TC-01 FAILED: Không bắt được tin nhắn Telegram");
    assert(
      !capturedMessage.includes("-250.001 --> 0"),
      "TC-01 FAILED: Doanh thu vẫn bị hiển thị từ âm về 0 (-250.001 --> 0)"
    );
    assert(
      capturedMessage.includes("0 --> 250.001 (+250.001)"),
      `TC-01 FAILED: Doanh thu không hiển thị 0 --> 250.001 (+250.001). Tin nhắn: ${capturedMessage}`
    );
    assert(
      capturedMessage.includes("0 --> 125.001 (+125.001)"),
      `TC-01 FAILED: Lợi nhuận không hiển thị 0 --> 125.001 (+125.001). Tin nhắn: ${capturedMessage}`
    );
    assert(
      capturedMessage.includes("Nguồn: order.completed:TEST_ORDER_01"),
      `TC-01 FAILED: Nguồn không hiển thị order.completed. Tin nhắn: ${capturedMessage}`
    );
    console.log("✅ [TC-01] PASS: Đơn hàng đầu tiên hiển thị chính xác 0 --> 250.001 (+250.001)");

    // ----------------------------------------------------
    // TEST CASE 2: Đơn hàng thứ hai (+100.000đ, chi phí 40.000đ)
    // ----------------------------------------------------
    capturedMessage = null;
    console.log("⏳ [TC-02] Mô phỏng sự kiện ORDER_PAID thứ hai...");
    eventBus.emit(EVENTS.ORDER_PAID, {
      id_order: "TEST_ORDER_02",
      price: 100000,
      cost: 40000,
      order_date: testDate,
      action: "ADMIN_COMPLETE",
    });

    await new Promise((r) => setTimeout(r, 600));

    assert(capturedMessage != null, "TC-02 FAILED: Không bắt được tin nhắn Telegram cho đơn 2");
    assert(
      capturedMessage.includes("250.001 --> 350.001 (+100.000)"),
      `TC-02 FAILED: Doanh thu lũy kế không đúng. Tin nhắn: ${capturedMessage}`
    );
    assert(
      capturedMessage.includes("125.001 --> 185.001 (+60.000)"),
      `TC-02 FAILED: Lợi nhuận lũy kế không đúng. Tin nhắn: ${capturedMessage}`
    );
    console.log("✅ [TC-02] PASS: Đơn hàng thứ hai cộng dồn chuẩn xác 250.001 --> 350.001 (+100.000)");

    console.log("\n────────────────────────────────────");
    console.log("📊 KẾT QUẢ: 2 PASS / 0 FAIL");
    console.log("🎉 TẤT CẢ TEST CASES BIẾN ĐỘNG TÀI CHÍNH ĐÃ PASS HOÀN TOÀN!");
  } finally {
    telegramClient.enqueueMessage = originalEnqueue;
    // Dọn dẹp dữ liệu test
    await db(TABLES.DAILY_REVENUE_SUMMARY).whereRaw("summary_date::text LIKE ?", [`${monthKey}%`]).del();
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});

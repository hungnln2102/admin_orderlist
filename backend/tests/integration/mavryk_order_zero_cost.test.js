const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const { db } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { registerDailySummaryListeners } = require("@/domains/dashboard/services/dailySummaryService");
const { financeNotifier } = require("@/domains/notifications/telegram");

test("ORDER_PAID with Mavryk supplier records 0 cost and 100% profit delta", async () => {
  registerDailySummaryListeners();

  // Mock financeNotifier
  let capturedNotification = null;
  const originalNotify = financeNotifier.notifyFinanceMonthlyDelta;
  financeNotifier.notifyFinanceMonthlyDelta = async (payload) => {
    capturedNotification = payload;
  };

  try {
    // Emit event with isSupplierMavryk: true
    eventBus.emit(EVENTS.ORDER_PAID, {
      orderId: 99999,
      id_order: "TEST_MAVRYK_ORDER",
      customer: "Khách VIP",
      amount: 250000,
      cost: 150000, // Dù cost ban đầu có số thì với NCC Mavryk vẫn ép về 0
      isSupplierMavryk: true,
      supply_id: 22,
      status: "PAID",
      action: "WEBHOOK_PAYMENT_MATCH",
    });

    // Wait a brief moment for async event handler
    await new Promise((r) => setTimeout(r, 300));

    assert.ok(capturedNotification, "Notification should have been sent");
    assert.equal(capturedNotification.revenueDelta, 250000, "Revenue delta should match payment");
    assert.equal(capturedNotification.importDelta, 0, "Import delta must be 0 for Mavryk supplier");
    assert.equal(capturedNotification.profitDelta, 250000, "Profit delta must be full revenue (100%)");
  } finally {
    financeNotifier.notifyFinanceMonthlyDelta = originalNotify;
    await db.destroy();
  }
});


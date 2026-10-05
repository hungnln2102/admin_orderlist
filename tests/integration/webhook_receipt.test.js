require("module-alias/register");
require("dotenv").config();
const { db, TABLES } = require("@/db");
const { processPaymentWebhook } = require("@/domains/payments/services/webhookPaymentService");

async function testWebhookReceiptFlow() {
  console.log("🧪 Bắt đầu Test Luồng Webhook & Biên Lai...\n");

  try {
    // 1. Tạo 1 đơn hàng giả lập đang chờ thanh toán (UNPAID)
    const testOrderCode = "ORD-TEST-" + Date.now();
    const testPrice = 199000;

    const [orderIdRes] = await db(TABLES.ORDER_LIST)
      .insert({
        id_order: testOrderCode,
        customer: "Khách Hang Test Webhook",
        price: testPrice,
        status: "Chưa Thanh Toán",
        days: 30,
        information_order: "Đơn hàng test webhook tự động",
      })
      .returning("id");

    const orderId = typeof orderIdRes === "object" ? orderIdRes.id : orderIdRes;

    // 2. Test Scenario 1: Webhook bắn tiền vào KHỚP ĐƠN HÀNG
    const txIdMatched = Date.now();
    const res1 = await processPaymentWebhook({
      id: txIdMatched,
      transferAmount: testPrice,
      transferType: "in",
      content: `Thanh toan don hang ${testOrderCode}`,
      gateway: "MBBANK",
      accountNumber: "0331000123456",
      transactionDate: "2026-10-05",
    });

    if (!res1.matched || res1.newStatus !== "Đã Thanh Toán") {
      throw new Error("Test 1 thất bại: Không khớp đơn hàng thành công");
    }

    const receipt1 = await db(TABLES.PAYMENT_RECEIPT).where({ id: res1.receiptId }).first();
    if (receipt1?.status !== "FULLY_ALLOCATED") {
      throw new Error("Test 1 thất bại: Receipt status không phải FULLY_ALLOCATED");
    }

    // 3. Test Scenario 2: Webhook bắn tiền vào KHÔNG KHỚP ĐƠN NÀO
    const txIdUnmatched = Date.now() + 1;
    const unmatchedAmount = 999999;

    const res2 = await processPaymentWebhook({
      id: txIdUnmatched,
      transferAmount: unmatchedAmount,
      transferType: "in",
      content: "Chuyen tien linh tinh khong hop le",
      gateway: "VCB",
      accountNumber: "999888777",
      transactionDate: "2026-10-05",
    });

    if (res2.matched) {
      throw new Error("Test 2 thất bại: Webhook không hợp lệ nhưng lại khớp đơn!");
    }

    const receipt2 = await db(TABLES.PAYMENT_RECEIPT).where({ id: res2.receiptId }).first();
    if (receipt2?.status !== "UNALLOCATED") {
      throw new Error("Test 2 thất bại: Receipt status không phải UNALLOCATED");
    }

    // 4. Test Scenario 3: Chống trùng lặp (Idempotency)
    const res3 = await processPaymentWebhook({
      id: txIdMatched,
      transferAmount: testPrice,
      transferType: "in",
      content: `Thanh toan don hang ${testOrderCode}`,
    });

    if (!res3.duplicate) {
      throw new Error("Test 3 thất bại: Giao dịch trùng lặp không được phát hiện!");
    }

    // Cleanup Test Data
    await db(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where({ receipt_id: res1.receiptId }).del();
    await db(TABLES.PAYMENT_RECEIPT).whereIn("id", [res1.receiptId, res2.receiptId]).del();
    await db(TABLES.ORDER_LIST).where({ id: orderId }).del();

    console.log("🎉 TẤT CẢ TEST CASES ĐÃ PASS THÀNH CÔNG!");
  } catch (err) {
    console.error("❌ Test thất bại với lỗi:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testWebhookReceiptFlow();

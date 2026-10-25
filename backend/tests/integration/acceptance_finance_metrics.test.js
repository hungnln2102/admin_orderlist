/**
 * acceptance_finance_metrics.test.js
 * Bài test nghiệm thu:
 *  1. Thanh toán đơn hàng mới qua Webhook SePay:
 *     - Số dư bank shop tăng đúng +price
 *     - Doanh thu tăng đúng +price
 *     - Nhập hàng (cost) tăng đúng +cost
 *     - Lợi nhuận tăng đúng +(price - cost)
 *     - Đơn hàng chuyển sang PAID
 *
 *  2. Gia hạn đơn hàng qua Webhook SePay:
 *     - Số dư bank shop tăng đúng +price
 *     - Doanh thu tăng đúng +price
 *     - Nhập hàng (cost) tăng đúng +cost
 *     - Lợi nhuận tăng đúng +(price - cost)
 *     - Ngày hết hạn expired_at được gia hạn
 *     - Đơn hàng chuyển sang PAID
 */
const path = require("path");
require("module-alias/register");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { db, TABLES } = require("@/db");
const { processPaymentWebhook } = require("@/domains/payments/services/webhookPaymentService");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { TRANSFER_TYPE } = require("@/constants/receiptStatus");
const { registerDailySummaryListeners } = require("@/domains/dashboard/services/dailySummaryService");

// Đảm bảo event listener đã đăng ký
registerDailySummaryListeners();

let PASS = 0;
let FAIL = 0;
const createdReceiptIds = [];
const createdOrderIds = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stamp = () => `MAVTEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT FAIL: ${message}`);
}

async function cleanup() {
  if (createdReceiptIds.length) {
    await db(TABLES.SHOP_BANK_ACCOUNT_LEDGER)
      .where("source_kind", "payment_receipt")
      .whereIn("source_id", createdReceiptIds.map(String))
      .del()
      .catch(() => {});
    await db(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).whereIn("receipt_id", createdReceiptIds).del().catch(() => {});
    await db(TABLES.PAYMENT_RECEIPT).whereIn("id", createdReceiptIds).del().catch(() => {});
  }
  if (createdOrderIds.length) {
    await db(TABLES.ORDER_LIST).whereIn("id", createdOrderIds).del().catch(() => {});
  }
}

async function runTest(name, fn) {
  console.log(`\n▶️ [NGHIỆM THU] ${name}`);
  try {
    await fn();
    console.log(`✅ KẾT QUẢ: PASS`);
    PASS++;
  } catch (err) {
    console.log(`❌ KẾT QUẢ: FAIL - ${err.message}`);
    FAIL++;
  }
}

async function main() {
  console.log("===============================================================");
  console.log("  BÀI TEST NGHIỆM THU TOÀN DIỆN BIẾN ĐỘNG TÀI CHÍNH (V2)      ");
  console.log("===============================================================");

  const { getVietnamDateString } = require("@/utils/time");
  const todayStr = getVietnamDateString();

  // 1. Lấy thông tin tài khoản ngân hàng mặc định
  let bankAccount = await db(TABLES.SHOP_BANK_ACCOUNTS)
    .where({ is_default: true, is_active: true, is_deleted: false })
    .first();
  if (!bankAccount) {
    bankAccount = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ is_deleted: false }).first();
  }
  assert(Boolean(bankAccount), "Hệ thống phải có ít nhất 1 tài khoản ngân hàng");

  try {
    // ═════════════════════════════════════════════════════════════════
    // TEST 1: THANH TOÁN ĐƠN HÀNG THÀNH CÔNG
    // ═════════════════════════════════════════════════════════════════
    await runTest("1. Thanh toán đơn hàng mới qua Webhook SePay", async () => {
      const orderPrice = 250001; // Dùng số lẻ đặc trưng
      const orderCost = 125000;
      const expectedProfit = orderPrice - orderCost; // 125001

      // Tạo đơn hàng mới
      const [order] = await db(TABLES.ORDER_LIST)
        .insert({
          id_order: stamp(),
          customer: "Khách Nghiệm Thu Đơn Mới",
          price: orderPrice,
          cost: orderCost,
          status: ORDER_STATUS.UNPAID,
          days: 30,
          information_order: "Test nghiệm thu đơn mới",
          order_date: todayStr,
        })
        .returning("*");
      createdOrderIds.push(order.id);

      // Đọc số dư & summary trước khi nhận webhook
      const bankBefore = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: bankAccount.id }).first();
      const summaryBefore = await db(TABLES.DAILY_REVENUE_SUMMARY).where({ summary_date: todayStr }).first();

      const initialBankBalance = Number(bankBefore.balance || 0);
      const initialRevenue = Number(summaryBefore?.earned_revenue || 0);
      const initialCost = Number(summaryBefore?.total_shop_cost || 0);

      console.log(`   Trước khi nhận webhook:`);
      console.log(`   - Số dư Bank: ${initialBankBalance.toLocaleString("vi-VN")} ₫`);
      console.log(`   - Doanh thu:  ${initialRevenue.toLocaleString("vi-VN")} ₫`);
      console.log(`   - Nhập hàng:  ${initialCost.toLocaleString("vi-VN")} ₫`);

      // Bắn Webhook SePay tiền vào khớp đơn
      const txId = Date.now();
      const webhookRes = await processPaymentWebhook({
        id: txId,
        transferAmount: orderPrice,
        transferType: TRANSFER_TYPE.IN,
        content: `Thanh toan don ${order.id_order}`,
        gateway: "MBBANK",
        accountNumber: bankAccount.account_number,
        transactionDate: todayStr,
      });

      createdReceiptIds.push(webhookRes.receiptId);
      assert(webhookRes.success === true, "Webhook phải thành công");
      assert(webhookRes.matched === true, "Webhook phải khớp đơn hàng");

      // Chờ EventBus hoàn tất cập nhật summary
      await sleep(500);

      // Đọc trạng thái sau khi webhook xử lý
      const bankAfter = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: bankAccount.id }).first();
      const summaryAfter = await db(TABLES.DAILY_REVENUE_SUMMARY).where({ summary_date: todayStr }).first();
      const updatedOrder = await db(TABLES.ORDER_LIST).where({ id: order.id }).first();

      const finalBankBalance = Number(bankAfter.balance || 0);
      const finalRevenue = Number(summaryAfter?.earned_revenue || 0);
      const finalCost = Number(summaryAfter?.total_shop_cost || 0);
      const finalProfit = finalRevenue - finalCost;
      const initialProfit = initialRevenue - initialCost;

      console.log(`   Sau khi nhận webhook:`);
      console.log(`   - Số dư Bank: ${finalBankBalance.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalBankBalance - initialBankBalance).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Doanh thu:  ${finalRevenue.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalRevenue - initialRevenue).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Nhập hàng:  ${finalCost.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalCost - initialCost).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Lợi nhuận:  ${finalProfit.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalProfit - initialProfit).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Trạng thái: ${updatedOrder.status} (was_paid: ${updatedOrder.was_paid})`);

      // Kiểm tra các chỉ số tài chính
      assert(
        finalBankBalance === initialBankBalance + orderPrice,
        `Số dư Bank (${finalBankBalance}) phải tăng đúng +${orderPrice}`
      );
      assert(
        finalRevenue === initialRevenue + orderPrice,
        `Doanh thu (${finalRevenue}) phải tăng đúng +${orderPrice}`
      );
      assert(
        finalCost === initialCost + orderCost,
        `Tiền nhập hàng (${finalCost}) phải tăng đúng +${orderCost}`
      );
      assert(
        finalProfit - initialProfit === expectedProfit,
        `Lợi nhuận (${finalProfit - initialProfit}) phải tăng đúng +${expectedProfit}`
      );
      assert(
        updatedOrder.status === ORDER_STATUS.PAID,
        `Đơn hàng phải chuyển sang PAID, hiện tại: ${updatedOrder.status}`
      );
    });

    // ═════════════════════════════════════════════════════════════════
    // TEST 2: GIA HẠN ĐƠN HÀNG THÀNH CÔNG
    // ═════════════════════════════════════════════════════════════════
    await runTest("2. Gia hạn đơn hàng qua Webhook SePay", async () => {
      const renewalPrice = 180002; // Số tiền gia hạn
      const renewalCost = 90000;   // Chi phí gia hạn
      const renewalDays = 30;
      const pastExpiry = "2026-09-01"; // Đã hết hạn trong quá khứ

      // Tạo đơn hàng ở trạng thái Cần Gia Hạn
      const [order] = await db(TABLES.ORDER_LIST)
        .insert({
          id_order: stamp(),
          customer: "Khách Nghiệm Thu Gia Hạn",
          price: renewalPrice,
          cost: renewalCost,
          status: ORDER_STATUS.RENEW_REQUIRED,
          days: renewalDays,
          expired_at: pastExpiry,
          information_order: "Test nghiệm thu đơn gia hạn",
          order_date: todayStr,
        })
        .returning("*");
      createdOrderIds.push(order.id);

      // Đọc trạng thái trước
      const bankBefore = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: bankAccount.id }).first();
      const summaryBefore = await db(TABLES.DAILY_REVENUE_SUMMARY).where({ summary_date: todayStr }).first();

      const initialBankBalance = Number(bankBefore.balance || 0);
      const initialRevenue = Number(summaryBefore?.earned_revenue || 0);
      const initialCost = Number(summaryBefore?.total_shop_cost || 0);

      console.log(`   Trước khi nhận webhook gia hạn:`);
      console.log(`   - Số dư Bank: ${initialBankBalance.toLocaleString("vi-VN")} ₫`);
      console.log(`   - Doanh thu:  ${initialRevenue.toLocaleString("vi-VN")} ₫`);
      console.log(`   - Nhập hàng:  ${initialCost.toLocaleString("vi-VN")} ₫`);
      console.log(`   - Hạn dùng cũ: ${pastExpiry}`);

      // Bắn Webhook SePay tiền vào khớp đơn gia hạn
      const txId = Date.now() + 10;
      const webhookRes = await processPaymentWebhook({
        id: txId,
        transferAmount: renewalPrice,
        transferType: TRANSFER_TYPE.IN,
        content: `Gia han don hang ${order.id_order}`,
        gateway: "MBBANK",
        accountNumber: bankAccount.account_number,
        transactionDate: todayStr,
      });

      createdReceiptIds.push(webhookRes.receiptId);
      assert(webhookRes.success === true, "Webhook gia hạn phải thành công");
      assert(webhookRes.matched === true, "Webhook phải khớp đơn gia hạn");

      // Chờ EventBus
      await sleep(500);

      // Đọc trạng thái sau
      const bankAfter = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: bankAccount.id }).first();
      const summaryAfter = await db(TABLES.DAILY_REVENUE_SUMMARY).where({ summary_date: todayStr }).first();
      const updatedOrder = await db(TABLES.ORDER_LIST).where({ id: order.id }).first();

      const finalBankBalance = Number(bankAfter.balance || 0);
      const finalRevenue = Number(summaryAfter?.earned_revenue || 0);
      const finalCost = Number(summaryAfter?.total_shop_cost || 0);
      const finalProfit = finalRevenue - finalCost;
      const initialProfit = initialRevenue - initialCost;

      console.log(`   Sau khi nhận webhook gia hạn:`);
      console.log(`   - Số dư Bank: ${finalBankBalance.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalBankBalance - initialBankBalance).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Doanh thu:  ${finalRevenue.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalRevenue - initialRevenue).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Nhập hàng:  ${finalCost.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalCost - initialCost).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Lợi nhuận:  ${finalProfit.toLocaleString("vi-VN")} ₫ (Biến động: +${(finalProfit - initialProfit).toLocaleString("vi-VN")} ₫)`);
      console.log(`   - Hạn dùng mới: ${updatedOrder.expired_at}`);
      console.log(`   - Trạng thái: ${updatedOrder.status}`);

      // Kiểm tra các chỉ số tài chính
      assert(
        finalBankBalance === initialBankBalance + renewalPrice,
        `Số dư Bank (${finalBankBalance}) phải tăng đúng +${renewalPrice}`
      );
      assert(
        finalRevenue === initialRevenue + renewalPrice,
        `Doanh thu (${finalRevenue}) phải tăng đúng +${renewalPrice}`
      );
      assert(
        finalCost === initialCost + renewalCost,
        `Tiền nhập hàng (${finalCost}) phải tăng đúng +${renewalCost}`
      );
      assert(
        finalProfit - initialProfit === renewalPrice - renewalCost,
        `Lợi nhuận (${finalProfit - initialProfit}) phải tăng đúng +${renewalPrice - renewalCost}`
      );
      assert(
        updatedOrder.status === ORDER_STATUS.PAID,
        `Đơn hàng gia hạn phải chuyển sang PAID, hiện tại: ${updatedOrder.status}`
      );
      assert(
        Boolean(updatedOrder.expired_at) && updatedOrder.expired_at !== pastExpiry,
        `Hạn dùng expired_at phải được gia hạn mới (khác ${pastExpiry})`
      );
    });

  } finally {
    await cleanup();
    await db.destroy();
  }

  console.log("\n===============================================================");
  console.log(`  TỔNG KẾT NGHIỆM THU: ${PASS} PASS / ${FAIL} FAIL`);
  console.log("===============================================================");
  if (FAIL > 0) process.exit(1);
}

main().catch((err) => {
  console.error("LỖI NGHIỆM THU:", err);
  process.exit(1);
});

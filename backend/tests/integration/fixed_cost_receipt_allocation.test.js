const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
require("module-alias/register");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { db, TABLES } = require("@/db");
const financeHubService = require("@/domains/finance/services/financeHubService");
const invoiceService = require("@/domains/invoices/services/invoiceService");

test("Fixed Cost Payment & Receipt Allocation - Chống double counting Net Worth & P&L", async () => {
  const testMonth = "2026-10";
  const testName = `Test_Server_${Date.now()}`;
  const costAmount = 176000;

  // 1. Tạo 1 khoản chi phí cố định
  const createdCost = await financeHubService.createFixedCost({
    name: testName,
    amount: costAmount,
    category: "SHOP_OPERATIONS",
    isActive: true,
    note: "Test server 176k",
  });
  assert.ok(createdCost.id, "Tạo fixed cost thành công");

  try {
    // 2. Lấy summary ban đầu: Khoản này chưa thanh toán
    let summary = await financeHubService.getFinanceSummary(testMonth);
    const itemBefore = summary.fixedCosts.find((f) => f.id === createdCost.id);
    assert.ok(itemBefore, "Tìm thấy fixed cost trong summary");
    assert.equal(itemBefore.isPaidThisMonth, false, "Ban đầu phải là chưa thanh toán");
    const unpaidBefore = summary.breakEven.unpaidFixedCostsTotal;
    assert.ok(unpaidBefore >= costAmount, "unpaidFixedCostsTotal phải bao gồm khoản 176k");

    // 3. Tạo 1 biên lai tiền ra giả lập 176k
    const [receipt] = await db(TABLES.PAYMENT_RECEIPT)
      .insert({
        payment_date: "2026-10-27",
        amount: costAmount,
        unallocated_amount: costAmount,
        status: "UNALLOCATED",
        sender: "0378304963",
        transfer_type: "out",
        note: `MBCT Server test ${testName}`,
      })
      .returning("*");

    const receiptId = typeof receipt.id === "object" ? receipt.id.id : receipt.id;

    // 4. Phân bổ biên lai vào FIXED_COST thông qua invoiceService.allocateReceipt
    const allocResult = await invoiceService.allocateReceipt(receiptId, {
      allocation_type: "FIXED_COST",
      target_code: `FIXED_COST_${createdCost.id}`,
      amount: costAmount,
      note: `Gán biên lai vào ${testName}`,
    });
    assert.equal(allocResult.unallocated_amount, 0, "Biên lai đã được phân bổ hết");

    // 5. Kiểm tra DEBT_PAYMENT_LOGS: Đã ghi nhận log thanh toán
    const paymentLog = await db(TABLES.DEBT_PAYMENT_LOGS)
      .where({
        target_type: "FIXED_COST",
        target_id: createdCost.id,
        period_month: testMonth,
      })
      .first();
    assert.ok(paymentLog, "Phải có bản ghi trong debt_payment_logs");
    assert.equal(Number(paymentLog.amount), costAmount, "Số tiền thanh toán phải bằng 176k");

    // 6. Kiểm tra STORE_PROFIT_EXPENSES: KHÔNG ĐƯỢC CHÈN BẢN GHI NÀO VÀO BẢNG NÀY (Chống double P&L)
    const duplicateExpense = await db(TABLES.STORE_PROFIT_EXPENSES)
      .where({ payment_receipt_id: receiptId })
      .first();
    assert.equal(duplicateExpense, undefined, "Tuyệt đối không được chèn vào store_profit_expenses");

    // 7. Lấy summary sau khi thanh toán: Khoản này đã đánh dấu isPaidThisMonth = true
    summary = await financeHubService.getFinanceSummary(testMonth);
    const itemAfter = summary.fixedCosts.find((f) => f.id === createdCost.id);
    assert.equal(itemAfter.isPaidThisMonth, true, "Sau thanh toán phải là isPaidThisMonth = true");
    assert.equal(itemAfter.paidAmount, costAmount, "paidAmount phải bằng 176k");

    // 8. unpaidFixedCostsTotal phải giảm đi 176k -> totalLiabilities giảm 176k -> Net Worth không bị trừ double!
    const unpaidAfter = summary.breakEven.unpaidFixedCostsTotal;
    assert.equal(unpaidBefore - unpaidAfter, costAmount, "unpaidFixedCostsTotal phải giảm đúng 176k");

    // Dọn dẹp dữ liệu test
    await db(TABLES.DEBT_PAYMENT_LOGS).where({ id: paymentLog.id }).del();
    await db(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where({ receipt_id: receiptId }).del();
    await db(TABLES.PAYMENT_RECEIPT).where({ id: receiptId }).del();
  } finally {
    await financeHubService.deleteFixedCost(createdCost.id);
  }
});


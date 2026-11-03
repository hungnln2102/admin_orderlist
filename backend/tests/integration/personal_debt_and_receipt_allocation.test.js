const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
require("module-alias/register");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { db, TABLES } = require("@/db");
const financeHubService = require("@/domains/finance/services/financeHubService");
const invoiceService = require("@/domains/invoices/services/invoiceService");

test("Personal Debt - Nợ không thời hạn / Thẻ tín dụng & Phân bổ biên lai 1tr vào 2 cục nợ", async () => {
  const testMonth = "2026-11";
  const suffix = Date.now();
  const debt1Name = `Test_CreditCard_${suffix}`;
  const debt2Name = `Test_OpenEndedLoan_${suffix}`;

  // 1. Tạo khoản nợ 1: Thẻ tín dụng (không có ngày tất toán, có lãi suất 24%/năm, hạn ngày 15)
  const debt1 = await financeHubService.createPersonalAsset({
    name: debt1Name,
    type: "DEBT_PAYABLE",
    amount: 800000,
    note: "Thẻ tín dụng test không ngày tất toán",
    debtInterestEnabled: true,
    debtInterestFrequency: "DAILY",
    debtAnnualInterestRate: 24,
    debtDueDay: 15,
    debtEndDate: null, // Không có ngày tất toán!
    debtRepaymentFrequency: "MONTHLY",
  });
  assert.ok(debt1.id, "Tạo khoản nợ thẻ tín dụng không thời hạn thành công");
  assert.equal(debt1.debtEndDate, null, "debtEndDate phải là null");

  // 2. Tạo khoản nợ 2: Nợ người quen (không lãi, không ngày tất toán)
  const debt2 = await financeHubService.createPersonalAsset({
    name: debt2Name,
    type: "DEBT_PAYABLE",
    amount: 500000,
    note: "Nợ người quen test",
    debtInterestEnabled: false,
    debtDueDay: 20,
    debtEndDate: null,
  });
  assert.ok(debt2.id, "Tạo khoản nợ không lãi không thời hạn thành công");

  // 3. Tạo biên lai SePay tiền ra giả lập 1.000.000 ₫
  const [receipt] = await db(TABLES.PAYMENT_RECEIPT)
    .insert({
      payment_date: "2026-11-03",
      amount: 1000000,
      unallocated_amount: 1000000,
      status: "UNALLOCATED",
      sender: "Shop Account",
      transfer_type: "out",
      note: `Rút tiền shop trả nợ ${suffix}`,
    })
    .returning("*");
  const receiptId = typeof receipt.id === "object" ? receipt.id.id : receipt.id;

  try {
    // 4. Lần phân bổ 1: Phân bổ 600.000 ₫ vào Nợ 1
    const alloc1 = await invoiceService.allocateReceipt(receiptId, {
      allocation_type: "PERSONAL_DEBT",
      target_code: `PERSONAL_DEBT_${debt1.id}`,
      amount: 600000,
      note: `Trả bớt 600k cho ${debt1Name}`,
    });

    assert.equal(alloc1.unallocated_amount, 400000, "Số dư chưa phân bổ của biên lai phải còn đúng 400.000 ₫");
    assert.equal(alloc1.status, "PARTIALLY_ALLOCATED", "Trạng thái biên lai phải là PARTIALLY_ALLOCATED");

    // Kiểm tra getInvoices tab 'unlisted': Biên lai PARTIALLY_ALLOCATED còn dư 400k vẫn phải nằm ở tab unlisted
    const unlistedRes = await invoiceService.getInvoices({ tab: "unlisted", limit: 100 });
    const unlistedFound = unlistedRes.data.find((r) => Number(r.id) === Number(receiptId));
    assert.ok(unlistedFound, "Biên lai PARTIALLY_ALLOCATED còn dư 400k phải xuất hiện ở tab unlisted");
    assert.equal(unlistedFound.allocation_count, 1, "allocation_count phải bằng 1");
    assert.equal(unlistedFound.allocations.length, 1, "allocations length phải bằng 1");
    assert.equal(Number(unlistedFound.allocations[0].amount), 600000);

    // Kiểm tra Nợ 1 sau khi trả 600k: dư nợ phải giảm từ 800k xuống 200k
    const updatedDebt1 = await db(TABLES.PERSONAL_ASSETS).where({ id: debt1.id }).first();
    assert.equal(Number(updatedDebt1.amount), 200000, "Dư nợ khoản 1 phải giảm còn 200.000 ₫");

    // Kiểm tra DEBT_PAYMENT_LOGS có log cho khoản 1
    const log1 = await db(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "PERSONAL_DEBT", target_id: debt1.id })
      .first();
    assert.ok(log1, "Phải có log trong debt_payment_logs cho Nợ 1");
    assert.equal(Number(log1.amount), 600000);

    // 5. Lần phân bổ 2: Phân bổ 400.000 ₫ còn lại vào Nợ 2
    const alloc2 = await invoiceService.allocateReceipt(receiptId, {
      allocation_type: "PERSONAL_DEBT",
      target_code: `PERSONAL_DEBT_${debt2.id}`,
      amount: 400000,
      note: `Trả 400k còn lại cho ${debt2Name}`,
    });

    assert.equal(alloc2.unallocated_amount, 0, "Số dư chưa phân bổ của biên lai phải về 0 ₫");
    assert.equal(alloc2.status, "FULLY_ALLOCATED", "Trạng thái biên lai phải là FULLY_ALLOCATED");

    // Kiểm tra getInvoices tab 'other': Biên lai đã FULLY_ALLOCATED xuất hiện ở tab other với đầy đủ allocations
    const otherRes = await invoiceService.getInvoices({ tab: "other", limit: 100 });
    const otherFound = otherRes.data.find((r) => Number(r.id) === Number(receiptId));
    assert.ok(otherFound, "Biên lai FULLY_ALLOCATED nợ cá nhân phải xuất hiện ở tab other");
    assert.equal(otherFound.allocation_count, 2, "Phải có đúng 2 mục phân bổ con");
    assert.equal(otherFound.total_allocated, 1000000, "Tổng tiền đã phân bổ phải đúng 1.000.000 ₫");

    // Kiểm tra Nợ 2 sau khi trả 400k: dư nợ giảm từ 500k xuống 100k
    const updatedDebt2 = await db(TABLES.PERSONAL_ASSETS).where({ id: debt2.id }).first();
    assert.equal(Number(updatedDebt2.amount), 100000, "Dư nợ khoản 2 phải giảm còn 100.000 ₫");

    // Kiểm tra DEBT_PAYMENT_LOGS có log cho khoản 2
    const log2 = await db(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "PERSONAL_DEBT", target_id: debt2.id })
      .first();
    assert.ok(log2, "Phải có log trong debt_payment_logs cho Nợ 2");
    assert.equal(Number(log2.amount), 400000);

    // 6. Kiểm tra STORE_PROFIT_EXPENSES: Tuyệt đối không được có bản ghi nào (Chống double P&L)
    const duplicateExpense = await db(TABLES.STORE_PROFIT_EXPENSES)
      .where({ payment_receipt_id: receiptId })
      .first();
    assert.equal(duplicateExpense, undefined, "Tuyệt đối không được chèn vào store_profit_expenses khi trả nợ");

  } finally {
    // Dọn dẹp dữ liệu test
    await db(TABLES.DEBT_PAYMENT_LOGS).whereIn("target_id", [debt1.id, debt2.id]).del();
    await db(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where({ receipt_id: receiptId }).del();
    await db(TABLES.PAYMENT_RECEIPT).where({ id: receiptId }).del();
    await financeHubService.deletePersonalAsset(debt1.id);
    await financeHubService.deletePersonalAsset(debt2.id);
  }
});

test.after(async () => {
  await db.destroy();
});

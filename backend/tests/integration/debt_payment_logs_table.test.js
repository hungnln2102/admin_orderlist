const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const { db } = require("@/db");
const financeHubService = require("@/domains/finance/services/financeHubService");

test("Debt Payment Logs - Bảng Nhật Ký Biến Động Nợ & Trả Góp", async (t) => {
  await t.test("1. Lấy danh sách logs kèm thông tin chi tiết tên khoản nợ và tài khoản", async () => {
    const logs = await financeHubService.getDebtPaymentLogs({ limit: 10 });
    assert.ok(Array.isArray(logs), "Kết quả phải là một mảng");
    if (logs.length > 0) {
      const first = logs[0];
      assert.ok(first.id, "Log phải có id");
      assert.ok(first.targetType, "Log phải có targetType");
      assert.ok(typeof first.amount === "number", "Số tiền phải là dạng số");
      assert.ok(typeof first.targetName === "string", "targetName phải là chuỗi");
      assert.ok(first.paymentDate !== undefined, "paymentDate phải được định nghĩa");
    }
  });

  await t.test("2. Lọc log theo targetType PERSONAL_DEBT_BORROW", async () => {
    const borrowLogs = await financeHubService.getDebtPaymentLogs({
      limit: 10,
      targetType: "PERSONAL_DEBT_BORROW",
    });
    assert.ok(Array.isArray(borrowLogs));
    borrowLogs.forEach((l) => {
      assert.strictEqual(l.targetType, "PERSONAL_DEBT_BORROW");
    });
  });

  await t.test("3. getFinanceSummary phải tự động đính kèm debtPaymentLogs", async () => {
    const summary = await financeHubService.getFinanceSummary();
    assert.ok(Array.isArray(summary.debtPaymentLogs), "Summary phải chứa debtPaymentLogs");
  });
});

test.after(async () => {
  await db.destroy();
});


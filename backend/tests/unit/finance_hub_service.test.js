const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

test("Finance Hub Service & Sub-Services Integrity Suite", async (t) => {
  await t.test("financeHubService exports đầy đủ các hàm nghiệp vụ, không bị ReferenceError", () => {
    const financeHubService = require("@/domains/finance/services/financeHubService");

    const expectedMethods = [
      "calculateInstallmentState",
      "getFinanceSummary",
      // Fixed Costs
      "createFixedCost",
      "updateFixedCost",
      "deleteFixedCost",
      "payFixedCost",
      "cancelFixedCostPayment",
      "getFixedCosts",
      // Installments
      "createInstallment",
      "updateInstallment",
      "deleteInstallment",
      "payInstallment",
      // Personal Assets & Debt
      "createPersonalAsset",
      "updatePersonalAsset",
      "deletePersonalAsset",
      "payPersonalAsset",
      "borrowPersonalAsset",
      "borrowPersonalAssetInTrx",
      "autoMatchCardTransaction",
      "getDebtPaymentLogs",
      "getUnallocatedReceipts",
      // Snapshots & Saving Goals
      "getPersonalBalanceSnapshots",
      "createPersonalBalanceSnapshot",
      "updatePersonalBalanceSnapshot",
      "deletePersonalBalanceSnapshot",
      "getSavingGoalsOverview",
      "createSavingGoal",
      "updateSavingGoal",
      "deleteSavingGoal",
      "executeSavingGoal",
      "depositSavingFund",
      "withdrawSavingFund",
    ];

    for (const method of expectedMethods) {
      assert.equal(
        typeof financeHubService[method],
        "function",
        `financeHubService.${method} phải là một function`
      );
    }
  });

  await t.test("personalAssetService export đầy đủ 9 hàm nghiệp vụ quản lý tài sản cá nhân", () => {
    const personalAssetService = require("@/domains/finance/services/personalAssetService");

    const expectedMethods = [
      "createPersonalAsset",
      "updatePersonalAsset",
      "deletePersonalAsset",
      "payPersonalAsset",
      "borrowPersonalAsset",
      "borrowPersonalAssetInTrx",
      "autoMatchCardTransaction",
      "getDebtPaymentLogs",
      "getUnallocatedReceipts",
    ];

    for (const method of expectedMethods) {
      assert.equal(
        typeof personalAssetService[method],
        "function",
        `personalAssetService.${method} phải là một function`
      );
    }
  });

  await t.test("financeHubController và vpbankMailboxController nạp thành công không lỗi runtime", () => {
    const hubController = require("@/domains/finance/controllers/financeHubController");
    const vpbankController = require("@/domains/finance/controllers/vpbankMailboxController");

    assert.equal(typeof hubController.getSummary, "function");
    assert.equal(typeof hubController.createPersonalAsset, "function");
    assert.equal(typeof hubController.payPersonalAsset, "function");
    assert.equal(typeof vpbankController.getMailboxConfigHandler, "function");
  });
});

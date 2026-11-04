/**
 * financeHubRoutes.js
 */

const express = require("express");
const router = express.Router();
const financeHubController = require("../controllers/financeHubController");
const creditLedgerController = require("../credit/creditLedgerController");
const personalDebitTransactionController = require("../controllers/personalDebitTransactionController");
const vpbankMailboxController = require("../controllers/vpbankMailboxController");

// Tổng quan hòa vốn, KPI, dòng tiền tháng
router.get("/summary", financeHubController.getSummary);
router.get("/unallocated-receipts", financeHubController.getUnallocatedReceipts);

// Chi phí cố định (Fixed costs)
router.get("/fixed-costs", financeHubController.getFixedCosts);
router.post("/fixed-costs", financeHubController.createFixedCost);
router.put("/fixed-costs/:id", financeHubController.updateFixedCost);
router.delete("/fixed-costs/:id", financeHubController.deleteFixedCost);
router.post("/fixed-costs/:id/pay", financeHubController.payFixedCost);
router.delete("/fixed-costs/:id/pay", financeHubController.cancelFixedCostPayment);

// Trả góp theo kỳ (Installments)
router.post("/installments", financeHubController.createInstallment);
router.put("/installments/:id", financeHubController.updateInstallment);
router.delete("/installments/:id", financeHubController.deleteInstallment);
router.post("/installments/:id/pay", financeHubController.payInstallment);

// Lịch sử biến động nợ & trả góp (Debt payment logs)
router.get("/debt-payment-logs", financeHubController.getDebtPaymentLogs);

// Credit account ledger - immutable accounting for VPBank card and overdraft.
router.post("/credit-accounts", creditLedgerController.createAccount);
router.get("/credit-accounts/:id", creditLedgerController.getAccount);
router.post("/credit-accounts/:id/rule-versions", creditLedgerController.createRuleVersion);
router.post("/credit-accounts/:id/principal-events", creditLedgerController.recordPrincipal);
router.post("/credit-accounts/:id/card-statements/import", creditLedgerController.importCardStatement);
router.post("/credit-accounts/card-statements/evaluate-due", creditLedgerController.evaluateCardDueStatements);
router.post("/credit-accounts/:id/payments", creditLedgerController.recordPayment);
router.post("/credit-accounts/overdraft/accrue", creditLedgerController.accrueOverdraft);
router.post("/credit-statements/:id/overdraft-interest-collections", creditLedgerController.recordOverdraftInterestCollection);
router.post("/credit-accounts/overdraft/close", creditLedgerController.closeOverdraft);

// VPBank Mailbox Configuration & Realtime Ingestion Socket
router.get("/vpbank/mailbox-config", vpbankMailboxController.getMailboxConfigHandler);
router.post("/vpbank/mailbox-config", vpbankMailboxController.updateMailboxConfigHandler);
router.post("/vpbank/mailbox-config/test-connection", vpbankMailboxController.testConnectionHandler);

// Tài sản & Nợ cá nhân (Personal assets)
router.post("/personal-assets", financeHubController.createPersonalAsset);
router.put("/personal-assets/:id", financeHubController.updatePersonalAsset);
router.delete("/personal-assets/:id", financeHubController.deletePersonalAsset);
router.post("/personal-assets/:id/pay", financeHubController.payPersonalAsset);
router.post("/personal-assets/:id/borrow", financeHubController.borrowPersonalAsset);
router.post("/personal-assets/auto-match-card", financeHubController.autoMatchCardTransaction);

// Lịch sử chốt số dư tài chính cá nhân & Stat tròn (Personal balance snapshots)
router.get("/personal-balance-snapshots", financeHubController.getPersonalBalanceSnapshots);
router.post("/personal-balance-snapshots", financeHubController.createPersonalBalanceSnapshot);
router.put("/personal-balance-snapshots/:id", financeHubController.updatePersonalBalanceSnapshot);
router.delete("/personal-balance-snapshots/:id", financeHubController.deletePersonalBalanceSnapshot);

// Biến động thẻ debit và danh mục chi tiêu cá nhân.
router.get("/personal-debit-transactions", personalDebitTransactionController.getWorkspace);
router.post("/personal-debit-transactions", personalDebitTransactionController.createTransaction);
router.patch("/personal-debit-transactions/:id/category", personalDebitTransactionController.updateTransactionCategory);
router.post("/personal-spending-categories", personalDebitTransactionController.createCategory);
router.put("/personal-spending-categories/:id", personalDebitTransactionController.updateCategory);
router.delete("/personal-spending-categories/:id", personalDebitTransactionController.archiveCategory);

// Mục tiêu & Quỹ tiết kiệm (Saving Goals & Fund)
router.get("/saving-goals", financeHubController.getSavingGoals);
router.post("/saving-goals", financeHubController.createSavingGoal);
router.put("/saving-goals/:id", financeHubController.updateSavingGoal);
router.delete("/saving-goals/:id", financeHubController.deleteSavingGoal);
router.post("/saving-goals/:id/execute", financeHubController.executeSavingGoal);

router.post("/saving-fund/deposit", financeHubController.depositSavingFund);
router.post("/saving-fund/withdraw", financeHubController.withdrawSavingFund);

module.exports = router;

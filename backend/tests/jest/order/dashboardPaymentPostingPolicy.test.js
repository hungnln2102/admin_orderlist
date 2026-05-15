const {
  computeDashboardPaymentDecision,
  isSuccessfulPaymentAmount,
  requiredMinForSuccessfulPayment,
} = require("../../../src/domains/orders/controller/finance/dashboardPaymentPostingPolicy");

describe("dashboardPaymentPostingPolicy", () => {
  test("accepts underpayment strictly below 5,000 VND", () => {
    expect(isSuccessfulPaymentAmount(200000, 195001)).toBe(true);
    expect(requiredMinForSuccessfulPayment(200000)).toBe(195001);
  });

  test("does not accept underpayment equal to 5,000 VND", () => {
    expect(isSuccessfulPaymentAmount(200000, 195000)).toBe(false);
  });

  test("splits single overpaid transfer into order revenue and off-flow", () => {
    const decision = computeDashboardPaymentDecision({
      orderPrice: 200000,
      currentAmount: 205000,
      accumulatedAmount: 205000,
      creditAppliedAmount: 0,
    });

    expect(decision.complete).toBe(true);
    expect(decision.recognizedRevenueCurrent).toBe(200000);
    expect(decision.offFlowCurrent).toBe(5000);
    expect(decision.branch).toBe("OVERPAID_SPLIT_COMPLETE");
  });

  test("splits accumulated overpayment after a previous partial receipt", () => {
    const decision = computeDashboardPaymentDecision({
      orderPrice: 200000,
      currentAmount: 105000,
      accumulatedAmount: 205000,
      creditAppliedAmount: 0,
    });

    expect(decision.complete).toBe(true);
    expect(decision.priorBankRevenueForOrder).toBe(100000);
    expect(decision.recognizedRevenueCurrent).toBe(100000);
    expect(decision.offFlowCurrent).toBe(5000);
  });

  test("keeps incomplete receipt as pending top-up without off-flow split", () => {
    const decision = computeDashboardPaymentDecision({
      orderPrice: 200000,
      currentAmount: 100000,
      accumulatedAmount: 100000,
      creditAppliedAmount: 0,
    });

    expect(decision.complete).toBe(false);
    expect(decision.recognizedRevenueCurrent).toBe(0);
    expect(decision.offFlowCurrent).toBe(0);
    expect(decision.branch).toBe("SHORTFALL_WAIT_TOPUP");
  });
});

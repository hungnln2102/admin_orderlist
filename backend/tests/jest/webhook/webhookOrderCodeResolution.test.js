const {
  buildWebhookLoopOrderCodes,
  createWebhookAmountForCodeResolver,
  resolveWebhookPostedRevenue,
} = require("@/domains/payments/use-cases/resolveOrderCode");
const {
  computeDashboardPaymentDecision,
} = require("@/domains/orders/controller/finance/dashboardPaymentPostingPolicy");

describe("webhook orderCodeResolution", () => {
  test("transaction match excludes extra MAV codes from loop", () => {
    const codes = buildWebhookLoopOrderCodes({
      orderCodesFromTransaction: ["MAV001"],
      orderCodes: ["MAV002"],
      batchOrderMap: new Map(),
    });
    expect(codes).toEqual(["MAV001"]);
  });

  test("without transaction, keeps MAV codes from content", () => {
    const codes = buildWebhookLoopOrderCodes({
      orderCodesFromTransaction: [],
      orderCodes: ["MAV001", "MAV002"],
      batchOrderMap: new Map(),
    });
    expect(codes).toEqual(["MAV001", "MAV002"]);
  });

  test("transaction-resolved order gets full amount; other orders get 0", () => {
    const getAmount = createWebhookAmountForCodeResolver({
      loopOrderCodes: ["MAV001", "MAV002"],
      orderCodesFromTransaction: ["MAV001"],
      transferAmountNormalized: 65_000,
    });
    expect(getAmount("MAV001")).toBe(65_000);
    expect(getAmount("MAV002")).toBe(0);
  });

  test("posted revenue is 65k for 65k bank payment without credit", () => {
    const decision = computeDashboardPaymentDecision({
      orderPrice: 65_000,
      currentAmount: 65_000,
      accumulatedAmount: 65_000,
      creditAppliedAmount: 0,
    });
    expect(resolveWebhookPostedRevenue(decision)).toBe(65_000);
  });

  test("posted revenue is 65k when gross stale but net sale is 65k", () => {
    const decision = computeDashboardPaymentDecision({
      orderPrice: 65_000,
      currentAmount: 65_000,
      accumulatedAmount: 65_000,
      creditAppliedAmount: 0,
    });
    expect(decision.recognizedRevenueCurrent).toBe(65_000);
    expect(resolveWebhookPostedRevenue(decision)).toBe(65_000);
    expect(
      resolveWebhookPostedRevenue(
        computeDashboardPaymentDecision({
          orderPrice: 65_000,
          currentAmount: 65_000,
          accumulatedAmount: 65_000,
          creditAppliedAmount: 32_500,
        })
      )
    ).toBe(65_000);
  });
});

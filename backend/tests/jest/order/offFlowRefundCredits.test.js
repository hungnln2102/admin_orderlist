const {
  buildOffFlowCreditCode,
  CREDIT_SOURCE_KIND,
} = require("@/domains/orders/controller/finance/offFlowRefundCredits");

describe("offFlowRefundCredits", () => {
  test("buildOffFlowCreditCode is stable per receipt", () => {
    expect(buildOffFlowCreditCode(42)).toBe("RFO-RCP-42");
  });

  test("source kinds are distinct", () => {
    expect(CREDIT_SOURCE_KIND.OFF_FLOW_BANK).toBe("OFF_FLOW_BANK");
    expect(CREDIT_SOURCE_KIND.ORDER_REFUND).toBe("ORDER_REFUND");
  });
});

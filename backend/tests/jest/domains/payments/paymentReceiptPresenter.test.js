const {
  buildPaymentReceiptResponse,
  normalizeOutboundAuditDelta,
} = require("../../../../src/domains/payments/controller/handlers/paymentReceiptPresenter");

describe("paymentReceiptPresenter", () => {
  test("normalizes list response into camelCase receipt contract", () => {
    const receipt = buildPaymentReceiptResponse(
      {
        id: "12",
        orderCode: "mav123",
        paidAt: "2026-07-04T00:00:00.000Z",
        amount: "150000",
        sender: null,
        receiver: 123456,
        note: undefined,
        isFinancialPosted: 1,
        postedRevenue: "120000",
        postedProfit: "30000",
        postedOffFlowBankReceipt: null,
        reconciledAt: "2026-07-04T01:00:00.000Z",
        adjustmentApplied: 0,
      },
      {
        outboundAmount: "50000",
        outboundReason: "refund",
        outboundReasonLabel: "Refund label",
        outboundContent: "Refund MAV123",
      }
    );

    expect(receipt).toEqual({
      id: 12,
      orderCode: "mav123",
      paidAt: "2026-07-04T00:00:00.000Z",
      amount: 150000,
      sender: "",
      receiver: "123456",
      note: "",
      isFinancialPosted: true,
      postedRevenue: 120000,
      postedProfit: 30000,
      postedOffFlowBankReceipt: 0,
      reconciledAt: "2026-07-04T01:00:00.000Z",
      adjustmentApplied: false,
      outboundAmount: 50000,
      outboundReason: "refund",
      outboundReasonLabel: "Refund label",
      outboundContent: "Refund MAV123",
    });
  });

  test("normalizes outbound audit delta from database snake_case once", () => {
    expect(
      normalizeOutboundAuditDelta({
        bank_balance_delta: -75000,
        outbound_reason: " manual ",
        outbound_reason_label: " Outbound ",
        content: " Refund transfer ",
      })
    ).toEqual({
      outboundAmount: 75000,
      outboundReason: "manual",
      outboundReasonLabel: "Outbound",
      outboundContent: "Refund transfer",
    });
  });
});

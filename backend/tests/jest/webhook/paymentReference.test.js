const {
  extractPaymentReferenceCandidates,
} = require("../../../webhook/sepay/paymentReference");

describe("paymentReference extraction", () => {
  test("extracts 8-char refs and skips MAV order codes", () => {
    const codes = extractPaymentReferenceCandidates({
      transaction_content: "TT KHACH ABC12XY9 MAVC1234",
    });
    expect(codes).toContain("ABC12XY9");
    expect(codes).not.toContain("MAVC1234");
  });

  test("parseWebhookTransaction exposes paymentReferenceCodes", () => {
    const { parseWebhookTransaction } = require("../../../webhook/sepay/routes/webhook/parsePhase");
    const parsed = parseWebhookTransaction({
      transaction: {
        content: "CK ABC12XY9",
        amount: 100000,
      },
    });
    expect(parsed.paymentReferenceCodes).toEqual(["ABC12XY9"]);
  });
});

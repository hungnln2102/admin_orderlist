const { parseWebhookTransaction } = require("../../../webhook/sepay/routes/webhook/parsePhase");

describe("sepay webhook parse phase", () => {
  test("extracts multiple order codes and MAVG batch code", () => {
    const parsed = parseWebhookTransaction({
      transaction: {
        content: "MAV123-MAV456 thanh toan MAVGABCD1234",
        amount: 250000,
      },
    });

    expect(parsed).toBeTruthy();
    expect(parsed.orderCodes).toEqual(expect.arrayContaining(["MAV123", "MAV456"]));
    expect(parsed.batchCodes).toEqual(["MAVGABCD1234"]);
    expect(parsed.transferAmountNormalized).toBe(250000);
  });

  test("detects supplier settlement transfer pattern", () => {
    const parsed = parseWebhookTransaction({
      transaction: {
        content: "TT Nguyen Van A ky 20260515",
        amount: 150000,
      },
    });

    expect(parsed).toBeTruthy();
    expect(parsed.supplierSettlementTransfer).toBe(true);
  });
});

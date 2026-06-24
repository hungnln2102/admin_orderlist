const {
  debitShopBankRefundCashout,
} = require("../../../../src/domains/shop-bank-accounts/services/shopBankLedgerService");

describe("shopBankLedgerService refund cashout idempotency", () => {
  test("skips refund cashout when ledger source already exists", async () => {
    const query = jest.fn(async () => ({ rows: [{ id: 123 }] }));

    const result = await debitShopBankRefundCashout(
      { query },
      {
        accountId: 1,
        amount: 100000,
        sourceId: 456,
        note: "refund credit",
      }
    );

    expect(result).toEqual({ skipped: true, reason: "duplicate" });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("source_kind");
    expect(query.mock.calls[0][1]).toEqual(["refund_credit_note", 456]);
  });
});

jest.mock("../../../webhook/sepay/payments", () => ({
  insertFinancialAuditLog: jest.fn(),
}));

jest.mock("../../../src/domains/shop-bank-accounts/services/shopBankLedgerService", () => ({
  debitShopBankSupplierPayment: jest.fn(),
}));

jest.mock("../../../src/services/telegramFinanceDeltaNotifier", () => ({
  notifyFinanceMonthlyDelta: jest.fn(),
}));

jest.mock("../../../src/utils/logger", () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const { STATUS } = require("../../../src/utils/statuses");
const {
  tryAutoSettleSupplierPaymentByOutbound,
} = require("../../../webhook/sepay/routes/webhook/autoSettleSupplierPayment");
const {
  encodeSupplierSignature,
} = require("../../../webhook/sepay/routes/webhook/supplierPaymentSignature");
const { insertFinancialAuditLog } = require("../../../webhook/sepay/payments");
const {
  debitShopBankSupplierPayment,
} = require("../../../src/domains/shop-bank-accounts/services/shopBankLedgerService");
const {
  notifyFinanceMonthlyDelta,
} = require("../../../src/services/telegramFinanceDeltaNotifier");

describe("auto settle supplier payment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("parseWebhookTransaction marks outbound transfer as negative", () => {
    const {
      parseWebhookTransaction,
    } = require("../../../src/domains/payments/use-cases/parseTransaction");

    const parsed = parseWebhookTransaction({
      transaction: {
        content: "TT Nguyen Van A ky 20260515",
        amount: 150000,
        transfer_type: "out",
      },
    });

    expect(parsed.transferAmountNormalized).toBe(-150000);
    expect(parsed.supplierSettlementTransfer).toBe(true);
  });

  test("skip auto settle when decoded base amount mismatches unpaid amount beyond tolerance", async () => {
    const signedAmount = encodeSupplierSignature(1246000, 2);
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ supplier_name: "NCC A" }] })
        .mockResolvedValueOnce({
          rows: [{ unpaid_count: 3, net_unpaid_amount: 1239000 }],
        }),
    };

    const result = await tryAutoSettleSupplierPaymentByOutbound({
      client,
      receiptId: 99,
      transferAmountNormalized: -signedAmount,
      paidMonthKey: "2026-06",
      shopBankAccountId: 7,
    });

    expect(result).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(debitShopBankSupplierPayment).not.toHaveBeenCalled();
    expect(insertFinancialAuditLog).not.toHaveBeenCalled();
    expect(notifyFinanceMonthlyDelta).not.toHaveBeenCalled();
  });

  test("auto settles supplier payment using net unpaid amount and debits ledger once", async () => {
    const signedAmount = encodeSupplierSignature(1246000, 2);
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ supplier_name: "NCC A" }] })
        .mockResolvedValueOnce({
          rows: [{ unpaid_count: 3, net_unpaid_amount: 1244000 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 555 }] })
        .mockResolvedValueOnce({ rowCount: 3, rows: [] }),
    };
    debitShopBankSupplierPayment.mockResolvedValue({ skipped: false });

    const result = await tryAutoSettleSupplierPaymentByOutbound({
      client,
      receiptId: 99,
      transferAmountNormalized: -signedAmount,
      paidMonthKey: "2026-06",
      shopBankAccountId: 7,
    });

    expect(result).toMatchObject({
      supplierId: 2,
      supplierName: "NCC A",
      netUnpaidAmount: 1244000,
      baseAmount: 1246000,
      bankLedgerDelta: -1246000,
    });

    expect(client.query).toHaveBeenCalledTimes(4);
    expect(client.query.mock.calls[2][1]).toEqual([
      2,
      expect.stringMatching(/^\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}$/),
      STATUS.PAID,
      1244000,
      7,
    ]);
    expect(debitShopBankSupplierPayment).toHaveBeenCalledWith(client, {
      accountId: 7,
      amount: 1246000,
      sourceKind: "payment_supply",
      sourceId: 555,
      note: "Auto TT NCC supply 2 - via Webhook",
    });
    expect(notifyFinanceMonthlyDelta).toHaveBeenCalledWith({
      monthKey: "2026-06",
      bankBalanceDelta: -1246000,
      context: "webhook.autoSettlePaymentSupply supply=2",
      executor: client,
    });
    expect(insertFinancialAuditLog).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        payment_receipt_id: 99,
        rule_branch: "AUTO_SUPPLIER_PAYMENT_OUTBOUND",
        delta: expect.objectContaining({
          supplier_id: 2,
          supplier_name: "NCC A",
          expected_unpaid_amount: 1244000,
          base_amount_decoded: 1246000,
          match_gap: 2000,
          month_key: "2026-06",
          bank_ledger_delta: -1246000,
        }),
      })
    );
  });
});

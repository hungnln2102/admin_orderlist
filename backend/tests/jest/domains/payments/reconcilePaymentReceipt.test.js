jest.mock("../../../../src/db", () => ({
  withTransaction: jest.fn(),
}));

jest.mock("../../../../webhook/sepay/renewalQueue", () => ({
  enqueueRenewal: jest.fn(),
}));

const { withTransaction } = require("../../../../src/db");
const { enqueueRenewal } = require("../../../../webhook/sepay/renewalQueue");
const {
  reconcilePaymentReceipt,
} = require("../../../../src/domains/payments/controller/handlers/reconcilePaymentReceipt");

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const buildTxResult = () => ({
  receiptId: 101,
  orderCode: "MAVABC1234",
  status: "Cần Gia Hạn",
  revenueDelta: 0,
  profitDelta: 0,
  offFlowDelta: 0,
  postedRevenue: 0,
  postedProfit: 0,
  postedOffFlowBankReceipt: 0,
  reconciledAt: "2026-05-15T12:00:00.000Z",
  skipped: false,
  reason: null,
  actionResult: {
    actionApplied: "reconcile_and_renew",
    actionRequested: "reconcile_and_renew",
    statusBeforeAction: "Cần Gia Hạn",
    statusAfterAction: "Cần Gia Hạn",
  },
  shouldRunRenewal: true,
  effectiveAction: "reconcile_and_renew",
  orderSellingPriceVnd: 100000,
  totalReceiptsForOrderVnd: 100000,
  paidAmountCoversOrder: true,
});

describe("reconcilePaymentReceipt renewal flow", () => {
  const req = {
    params: { receiptId: "101" },
    body: {
      orderCode: "MAVABC1234",
      action: "reconcile_and_renew",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    withTransaction.mockResolvedValue(buildTxResult());
  });

  it("returns partial-success response when reconcile succeeds but renewal enqueue fails", async () => {
    enqueueRenewal.mockRejectedValue(new Error("queue down"));
    const res = makeRes();

    await reconcilePaymentReceipt(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        reconciled: true,
        actionApplied: "reconcile_and_renew",
        renewal_status: "enqueue_failed",
        renewal_dispatched_via: null,
        renewal_error: "queue down",
        renewalSuccess: false,
      })
    );
  });

  it("returns already_queued status on retry to keep renewal idempotent", async () => {
    enqueueRenewal
      .mockResolvedValueOnce({ dispatched: "memory", status: "queued" })
      .mockResolvedValueOnce({ dispatched: "memory", status: "already_queued" });

    const firstRes = makeRes();
    await reconcilePaymentReceipt(req, firstRes);
    expect(firstRes.status).not.toHaveBeenCalled();
    expect(firstRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        reconciled: true,
        renewal_status: "queued",
        renewal_dispatched_via: "memory",
        renewal_error: null,
        renewalSuccess: true,
      })
    );

    const secondRes = makeRes();
    await reconcilePaymentReceipt(req, secondRes);
    expect(secondRes.status).not.toHaveBeenCalled();
    expect(secondRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        reconciled: true,
        renewal_status: "already_queued",
        renewal_dispatched_via: "memory",
        renewal_error: null,
        renewalSuccess: true,
      })
    );
  });
});

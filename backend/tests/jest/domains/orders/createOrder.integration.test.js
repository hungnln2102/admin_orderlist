const express = require("express");
const request = require("supertest");

describe("POST /orders createOrder flow", () => {
  const buildHarness = ({ sanitizePayload, insertError } = {}) => {
    jest.resetModules();

    const commitSpy = jest.fn().mockResolvedValue();
    const rollbackSpy = jest.fn().mockResolvedValue();
    const insertReturningSpy = insertError
      ? jest.fn().mockRejectedValue(insertError)
      : jest.fn().mockResolvedValue([
          {
            id: 123,
            id_order: "MAVC0001",
            status: "Chưa Thanh Toán",
            price: 100000,
          },
        ]);

    const trxFn = jest.fn(() => ({
      insert: jest.fn(() => ({
        returning: insertReturningSpy,
      })),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
    }));
    trxFn.commit = commitSpy;
    trxFn.rollback = rollbackSpy;

    const dbMock = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
    }));
    dbMock.transaction = jest.fn().mockResolvedValue(trxFn);

    const normalizeOrderRowMock = jest.fn((row) => ({
      id: row.id,
      id_order: row.id_order,
      status: row.status,
      price: row.price,
    }));
    const sendOrderCreatedNotification = jest.fn().mockResolvedValue();

    jest.doMock("../../../../src/db", () => ({
      db: dbMock,
      withTransaction: jest.fn(),
    }));
    jest.doMock("../../../../src/domains/orders/controller/helpers", () => ({
      normalizeOrderRow: normalizeOrderRowMock,
      sanitizeOrderWritePayload: jest.fn(() => sanitizePayload ?? { price: 100000 }),
      ensureSupplyRecord: jest.fn(),
      ensureSupplierCost: jest.fn(),
      ensureVariantRecord: jest.fn(),
      resolveProductToVariantId: jest.fn().mockResolvedValue(null),
      normalizeTextInput: jest.fn((value) => String(value || "").trim()),
    }));
    jest.doMock("../../../../src/services/idService", () => ({
      nextId: jest.fn().mockResolvedValue(123),
    }));
    jest.doMock("../../../../src/services/orderCodeService", () => ({
      VALID_PREFIXES: ["MAVC", "MAVL", "MAVN", "MAVT", "MAVK", "MAVS"],
      generateUniqueOrderCode: jest.fn().mockResolvedValue("MAVC0001"),
    }));
    jest.doMock("../../../../src/services/telegramOrderNotification", () => ({
      sendOrderCreatedNotification,
    }));
    jest.doMock("../../../../src/domains/payment-slots", () => ({
      openPaymentSlot: jest.fn().mockResolvedValue({ expected_amount: 100000 }),
      SLOT_KIND: { NEW: "new" },
    }));
    jest.doMock("../../../../src/services/shopBankAccountResolver", () => ({
      resolveDefaultShopBankAccount: jest
        .fn()
        .mockResolvedValue({ id: 1, accountNumber: "0123456789" }),
    }));
    jest.doMock("../../../../src/services/usdtWalletResolver", () => ({
      resolveDefaultUsdtWallet: jest.fn(),
    }));
    jest.doMock("../../../../src/domains/usdt-wallets/services/binanceExchangeRateService", () => ({
      getUsdtVndRate: jest.fn(),
      convertVndToUsd: jest.fn(),
    }));
    jest.doMock("../../../../src/utils/normalizers", () => ({
      todayYMDInVietnam: jest.fn(() => "2026-05-15"),
    }));
    jest.doMock("../../../../src/utils/orderHelpers", () => ({
      ORDER_PREFIXES: { gift: "MAVT", import: "MAVN" },
      isMavrykShopSupplierName: jest.fn(() => false),
    }));
    jest.doMock("../../../../src/utils/supplierAccountHolderColumn", () => ({
      supplierHasAccountHolderColumn: jest.fn().mockResolvedValue(false),
    }));
    jest.doMock("../../../../src/domains/orders/controller/finance/refundCredits", () => ({
      lockRefundCreditNoteById: jest.fn(),
      applyRefundCreditToTargetOrder: jest.fn(),
      normalizeMoney: jest.fn((value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      }),
    }));
    jest.doMock("../../../../src/domains/orders/controller/finance/dashboardSummary", () => ({
      mergeSummaryUpdates: jest.fn(),
    }));
    jest.doMock(
      "../../../../src/domains/orders/controller/finance/dashboardImportDeltaOnPaid",
      () => ({
        resolveDashboardImportDeltaOnPaid: jest.fn(),
      })
    );
    jest.doMock("../../../../src/domains/orders/controller/orderFinanceHelpers", () => ({
      syncMavnStoreProfitExpense: jest.fn(),
    }));
    jest.doMock("../../../../src/utils/logger", () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    const {
      attachCreateOrderRoute,
    } = require("../../../../src/domains/orders/controller/crud/createOrder");
    const app = express();
    app.use(express.json());
    const router = express.Router();
    attachCreateOrderRoute(router);
    app.use("/", router);

    return {
      app,
      commitSpy,
      rollbackSpy,
      sendOrderCreatedNotification,
      insertReturningSpy,
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates order successfully without breaking core flow", async () => {
    const { app, commitSpy, sendOrderCreatedNotification } = buildHarness();

    const response = await request(app).post("/").send({ price: 100000 });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 123,
        id_order: "MAVC0001",
      })
    );
    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(sendOrderCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id_order: "MAVC0001" })
    );
  });

  it("returns 400 on empty sanitized payload edge case", async () => {
    const { app } = buildHarness({ sanitizePayload: {} });

    const response = await request(app).post("/").send({ anything: "ignored" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: "Empty payload" });
  });

  it("rolls back and returns 500 when insert fails", async () => {
    const { app, rollbackSpy, insertReturningSpy } = buildHarness({
      insertError: new Error("insert failed"),
    });

    const response = await request(app).post("/").send({ price: 100000 });

    expect(insertReturningSpy).toHaveBeenCalled();
    expect(rollbackSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Không thể tạo đơn hàng mới." });
  });
});

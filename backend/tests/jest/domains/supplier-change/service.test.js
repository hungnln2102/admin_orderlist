/**
 * Integration test cho domain `supplier-change/service`.
 *
 * Mock các helper trong `repository` và `normalize` để kiểm tra orchestration
 * (branching Flow A / B-unpaid / B-paid; Mavryk special-cases; GUC reset).
 */

jest.mock("../../../../src/db", () => ({
  db: {
    transaction: jest.fn(async (cb) => cb({ __isMockTrx: true })),
  },
}));

jest.mock(
  "../../../../src/controllers/Order/helpers/normalize",
  () => ({
    normalizeOrderRow: jest.fn(),
  })
);

jest.mock("../../../../src/utils/normalizers", () => ({
  todayYMDInVietnam: () => "2026-05-11",
}));

jest.mock("../../../../src/domains/supplier-change/repository", () => {
  const actual = jest.requireActual(
    "../../../../src/domains/supplier-change/repository"
  );
  return {
    ...actual,
    enableAppManagedFlag: jest.fn(),
    findOrderById: jest.fn(),
    findSupplierById: jest.fn(),
    findSupplyPriceForVariant: jest.fn(),
    findLatestCostLog: jest.fn(),
    updateOrderSupplyAndCost: jest.fn(),
    deleteCostLogById: jest.fn(),
    updateLatestCostLog: jest.fn(),
    insertCostLog: jest.fn(),
    // mock 2 snapshot reads (before + after): mặc định mỗi test override sau.
    fetchMonthlyTotals: jest.fn(async () => null),
  };
});

// Mock dashboardSummary.mergeSummaryUpdates: kiểm chứng profit_delta đi đúng tháng.
jest.mock(
  "../../../../src/controllers/Order/finance/dashboardSummary",
  () => ({
    mergeSummaryUpdates: jest.fn(async () => {}),
  })
);

// Mock notify Telegram BIẾN ĐỘNG THÁNG.
jest.mock(
  "../../../../src/services/telegramFinanceDeltaNotifier",
  () => ({
    notifyFinanceMonthlyDelta: jest.fn(async () => {}),
  })
);

const dashboardSummary = require("../../../../src/controllers/Order/finance/dashboardSummary");
const financeNotifier = require("../../../../src/services/telegramFinanceDeltaNotifier");

const { normalizeOrderRow } = require("../../../../src/controllers/Order/helpers/normalize");
const repo = require("../../../../src/domains/supplier-change/repository");
const {
  changeOrderSupplier,
  FLOWS,
} = require("../../../../src/domains/supplier-change/service");

const buildTrxMock = () => {
  const trx = {
    raw: jest.fn(async () => undefined),
    fn: { now: () => "now()" },
  };
  return trx;
};

const ORDER_BASE = {
  id: 42,
  id_order: "MAVL2026-05-01-001",
  id_product: 100,
  supply_id: 7,
  cost: 90000,
  days: 30,
  order_date: "2026-05-01",
  expired_at: "2026-05-30",
  status: "Chưa Thanh Toán",
};

beforeEach(() => {
  // resetAllMocks (không phải clearAllMocks) để clear cả mockResolvedValueOnce
  // queue — tránh mock setup ở test trước "rò rỉ" sang test sau khi Mavryk
  // tests không consume mocks (do service skip lookup cho Mavryk).
  jest.resetAllMocks();
});

describe("changeOrderSupplier — Flow A (≤5 ngày)", () => {
  test("Đơn tạo hôm nay, đổi NCC: tính prorate + update order + không có log cũ → không tạo log mới", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({ ...ORDER_BASE, order_date: "2026-05-11" });
    repo.findSupplierById.mockResolvedValueOnce({ id: 9, supplier_name: "NCC B" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(120000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 29 });
    repo.findLatestCostLog.mockResolvedValueOnce(null);
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 9, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(result.newCost).toBe(Math.round((120000 * 29) / 30)); // 116000
    expect(repo.enableAppManagedFlag).toHaveBeenCalledWith(trx);
    expect(repo.updateOrderSupplyAndCost).toHaveBeenCalledWith(trx, 42, {
      supplyId: 9,
      cost: Math.round((120000 * 29) / 30),
    });
    expect(repo.deleteCostLogById).not.toHaveBeenCalled();
    expect(repo.insertCostLog).not.toHaveBeenCalled();
    expect(repo.updateLatestCostLog).not.toHaveBeenCalled();
    // GUC reset (SET LOCAL ... = 'off')
    expect(
      trx.raw.mock.calls.some(([sql]) =>
        String(sql).includes("'off'")
      )
    ).toBe(true);
  });

  test("Đơn 3 ngày, có log Đã TT, đổi NCC: update order + update log mới nhất theo NCC + cost mới", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      order_date: "2026-05-08", // 3 ngày trước "today" 2026-05-11
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 9, supplier_name: "NCC B" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(120000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 27 });
    // Log tồn tại (đơn đã Đã TT)
    repo.findLatestCostLog.mockResolvedValueOnce({
      id: 555,
      supply_id: 7,
      import_cost: 90000,
      ncc_payment_status: "Đã Thanh Toán",
    });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 9, { trx });

    expect(result.flow).toBe(FLOWS.A);
    const expectedCost = Math.round((120000 * 27) / 30); // 108000
    expect(repo.updateOrderSupplyAndCost).toHaveBeenCalledWith(trx, 42, {
      supplyId: 9,
      cost: expectedCost,
    });
    expect(repo.updateLatestCostLog).toHaveBeenCalledWith(trx, 555, {
      supplyId: 9,
      importCost: expectedCost,
    });
    expect(repo.deleteCostLogById).not.toHaveBeenCalled();
    expect(repo.insertCostLog).not.toHaveBeenCalled();
  });

  test("Đơn 5 ngày, NCC mới = Mavryk, status Chưa TT: xóa log, KHÔNG cần marker (status không cần log)", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Chưa Thanh Toán",
      order_date: "2026-05-06",
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 1, supplier_name: "Mavryk" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(null);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 25 });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 1, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(result.mavrykNew).toBe(true);
    expect(result.insertedLog).toBe(false);
    expect(repo.updateOrderSupplyAndCost).toHaveBeenCalledWith(trx, 42, {
      supplyId: 1,
      cost: 0,
    });
    expect(
      trx.raw.mock.calls.some(([sql]) =>
        String(sql).includes("DELETE FROM partner.supplier_order_cost_log")
      )
    ).toBe(true);
    expect(repo.insertCostLog).not.toHaveBeenCalled();
  });

  test("Đơn Đã TT, đổi Other → Mavryk: profit += oldCost; cost = 0 LUÔN LUÔN (bỏ qua supplier_cost table)", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Đã Thanh Toán",
      order_date: "2026-05-11",
      cost: 34000, // NCC cũ đã set
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 1, supplier_name: "Mavryk" });
    // Giả sử supplier_cost có row Mavryk = 50000 (sẽ bị bỏ qua).
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(50000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 30 });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 1, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(result.mavrykNew).toBe(true);
    expect(result.insertedLog).toBe(true);
    expect(result.newCost).toBe(0); // KHÔNG dùng giá 50000 từ supplier_cost
    expect(result.profitDelta).toBe(34000); // +cost cũ
    // findSupplyPriceForVariant không được gọi cho Mavryk (skip lookup)
    expect(repo.findSupplyPriceForVariant).not.toHaveBeenCalled();
    expect(repo.updateOrderSupplyAndCost).toHaveBeenCalledWith(trx, 42, {
      supplyId: 1,
      cost: 0,
    });
    // mergeSummaryUpdates được gọi với profit delta = oldCost - newCost = +34000
    expect(dashboardSummary.mergeSummaryUpdates).toHaveBeenCalledWith(
      trx,
      "2026-05",
      { total_profit: 34000 },
      expect.objectContaining({ notify: false })
    );
    expect(
      trx.raw.mock.calls.some(([sql]) =>
        String(sql).includes("DELETE FROM partner.supplier_order_cost_log")
      )
    ).toBe(true);
    expect(repo.insertCostLog).toHaveBeenCalledTimes(1);
    expect(repo.insertCostLog).toHaveBeenCalledWith(trx, {
      orderListId: 42,
      supplyId: 1,
      idOrder: "MAVL2026-05-01-001",
      importCost: 0,
      refundAmount: 0,
      nccPaymentStatus: "Đã Thanh Toán",
    });
  });

  test("Đơn Đã TT, Mavryk → Other (Ades): profit -= newCost (chênh lệch cost được dashboard ghi nhận)", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Đã Thanh Toán",
      order_date: "2026-05-11",
      cost: 0, // NCC cũ là Mavryk
      days: 31,
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 5, supplier_name: "Ades" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(35133); // → ~34000 prorate 30/31
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 30 });
    repo.findLatestCostLog.mockResolvedValueOnce(null);
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 5, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(result.mavrykNew).toBe(false);
    expect(result.insertedLog).toBe(true);
    const expectedNewCost = Math.round((35133 * 30) / 31); // 34000
    expect(result.newCost).toBe(expectedNewCost);
    expect(result.profitDelta).toBe(-expectedNewCost); // = oldCost (0) - newCost
    expect(dashboardSummary.mergeSummaryUpdates).toHaveBeenCalledWith(
      trx,
      "2026-05",
      { total_profit: -expectedNewCost },
      expect.objectContaining({ notify: false })
    );
  });

  test("Đơn Đã TT, Mavryk → Other (Ades): gửi Telegram BIẾN ĐỘNG THÁNG với delta là bội số 1.000 (khớp UI)", async () => {
    // Sau khi `priceCalculator` làm tròn về bội 1.000, cost lưu DB = 34 000
    // (35 000 × 30 / 31 = 33 870,96 → 34 000) → trigger DB cộng đúng 34 000
    // vào `total_import`; mergeSummaryUpdates trừ đúng 34 000 từ `total_profit`.
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Đã Thanh Toán",
      order_date: "2026-05-11",
      cost: 0,
      days: 31,
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 5, supplier_name: "Ades" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(35000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 30 });
    repo.findLatestCostLog.mockResolvedValueOnce(null);
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    repo.fetchMonthlyTotals.mockResolvedValueOnce({
      total_revenue: 3845000,
      total_profit: -115000,
      total_import: 1370000,
      total_refund: 464000,
    });
    repo.fetchMonthlyTotals.mockResolvedValueOnce({
      total_revenue: 3845000,
      total_profit: -149000,
      total_import: 1404000,
      total_refund: 464000,
    });

    await changeOrderSupplier(42, 5, { trx });

    expect(financeNotifier.notifyFinanceMonthlyDelta).toHaveBeenCalledTimes(1);
    expect(financeNotifier.notifyFinanceMonthlyDelta).toHaveBeenCalledWith(
      expect.objectContaining({
        monthKey: "2026-05",
        revenueDelta: 0,
        profitDelta: -34000,
        importDelta: 34000,
        refundDelta: 0,
        context: expect.stringContaining("supplier-change"),
        executor: trx,
      })
    );
  });

  test("NOOP (NCC mới = NCC cũ): KHÔNG gửi notify", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({ ...ORDER_BASE });

    const result = await changeOrderSupplier(42, ORDER_BASE.supply_id, { trx });

    expect(result.flow).toBe(FLOWS.NOOP);
    expect(financeNotifier.notifyFinanceMonthlyDelta).not.toHaveBeenCalled();
  });

  test("Delta = 0 (không có thay đổi tổng hợp): KHÔNG gửi notify", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Chưa Thanh Toán",
      order_date: "2026-05-11",
      cost: 0,
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 5, supplier_name: "Ades" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(35000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 30 });
    repo.findLatestCostLog.mockResolvedValueOnce(null);
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    // Cả 2 snapshot giống nhau (do status Chưa TT không tác động dashboard).
    const SAME = { total_revenue: 1, total_profit: 2, total_import: 3, total_refund: 4 };
    repo.fetchMonthlyTotals
      .mockResolvedValueOnce(SAME)
      .mockResolvedValueOnce(SAME);

    await changeOrderSupplier(42, 5, { trx });

    expect(financeNotifier.notifyFinanceMonthlyDelta).not.toHaveBeenCalled();
  });

  // Reproduce bug user reported: NCC=Mavryk + Đã Thanh Toán → đổi sang Ades,
  // lợi nhuận dashboard không giảm vì service không insert log mới.
  test("Mavryk → Ades trên đơn Đã Thanh Toán, không có log (trigger DB đã xóa): INSERT log mới để dashboard tính profit", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Đã Thanh Toán",
      order_date: "2026-05-11", // hôm nay → Flow A
      days: 31,
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 5, supplier_name: "Ades" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(35000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 30 });
    // Log đã bị Mavryk trigger xóa → findLatestCostLog trả null
    repo.findLatestCostLog.mockResolvedValueOnce(null);
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 5, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(result.insertedLog).toBe(true);
    // 35 000 × 30 / 31 = 33 870,97 → làm tròn về bội 1.000 = 34 000.
    const expectedCost = 34000;
    expect(result.newCost).toBe(expectedCost);
    expect(repo.updateOrderSupplyAndCost).toHaveBeenCalledWith(trx, 42, {
      supplyId: 5,
      cost: expectedCost,
    });
    expect(repo.insertCostLog).toHaveBeenCalledTimes(1);
    expect(repo.insertCostLog).toHaveBeenCalledWith(trx, {
      orderListId: 42,
      supplyId: 5,
      idOrder: "MAVL2026-05-01-001",
      importCost: expectedCost,
      refundAmount: 0,
      nccPaymentStatus: "Chưa Thanh Toán",
    });
    expect(repo.updateLatestCostLog).not.toHaveBeenCalled();
  });

  test("Mavryk → Ades trên đơn Đang Xử Lý, không có log: cũng INSERT log mới", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Đang Xử Lý",
      order_date: "2026-05-11",
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 5, supplier_name: "Ades" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(35000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 30 });
    repo.findLatestCostLog.mockResolvedValueOnce(null);
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 5, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(result.insertedLog).toBe(true);
    expect(repo.insertCostLog).toHaveBeenCalledTimes(1);
  });

  test("Mavryk → Ades trên đơn Chưa Thanh Toán (status chưa cần log): KHÔNG insert log", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      status: "Chưa Thanh Toán",
      order_date: "2026-05-11",
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 5, supplier_name: "Ades" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(35000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 30 });
    repo.findLatestCostLog.mockResolvedValueOnce(null);
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 5, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(result.insertedLog).toBe(false);
    expect(repo.insertCostLog).not.toHaveBeenCalled();
  });
});

describe("changeOrderSupplier — Flow B (>5 ngày)", () => {
  test("Flow B-unpaid: xóa log cũ Chưa TT + insert log mới NCC mới", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      order_date: "2026-04-25", // 16 ngày
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 9, supplier_name: "NCC B" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(120000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 14 });
    repo.findLatestCostLog.mockResolvedValueOnce({
      id: 777,
      supply_id: 7,
      import_cost: 90000,
      ncc_payment_status: "Chưa Thanh Toán",
    });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 9, { trx });

    expect(result.flow).toBe(FLOWS.B_UNPAID);
    expect(result.deletedLogId).toBe(777);
    expect(result.insertedNewLog).toBe(true);
    const expectedCost = Math.round((120000 * 14) / 30); // 56000
    expect(result.newCost).toBe(expectedCost);
    expect(repo.deleteCostLogById).toHaveBeenCalledWith(trx, 777);
    expect(repo.updateOrderSupplyAndCost).toHaveBeenCalledWith(trx, 42, {
      supplyId: 9,
      cost: expectedCost,
    });
    expect(repo.insertCostLog).toHaveBeenCalledTimes(1);
    expect(repo.insertCostLog).toHaveBeenCalledWith(trx, {
      orderListId: 42,
      supplyId: 9,
      idOrder: "MAVL2026-05-01-001",
      importCost: expectedCost,
      refundAmount: 0,
      nccPaymentStatus: "Chưa Thanh Toán",
    });
  });

  test("Flow B-unpaid với NCC mới = Mavryk: xóa log cũ + chèn Mavryk marker (import=0)", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      order_date: "2026-04-25",
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 1, supplier_name: "Mavryk" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(null);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 14 });
    repo.findLatestCostLog.mockResolvedValueOnce({
      id: 777,
      supply_id: 7,
      ncc_payment_status: "Chưa Thanh Toán",
    });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 1, { trx });

    expect(result.flow).toBe(FLOWS.B_UNPAID);
    expect(result.mavrykNew).toBe(true);
    expect(result.insertedNewLog).toBe(true);
    expect(repo.deleteCostLogById).toHaveBeenCalledWith(trx, 777);
    // INSERT marker
    expect(repo.insertCostLog).toHaveBeenCalledTimes(1);
    expect(repo.insertCostLog).toHaveBeenCalledWith(trx, {
      orderListId: 42,
      supplyId: 1,
      idOrder: "MAVL2026-05-01-001",
      importCost: 0,
      refundAmount: 0,
      nccPaymentStatus: "Đã Thanh Toán",
    });
  });

  test("Flow B-paid: giữ log cũ + insert log hoàn (supply_id cũ, refund_amount = prorate) + insert log NCC mới", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      order_date: "2026-04-25", // 16 ngày
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 9, supplier_name: "NCC B" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(120000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 14 });
    repo.findLatestCostLog.mockResolvedValueOnce({
      id: 888,
      supply_id: 7,
      import_cost: 90000,
      ncc_payment_status: "Đã Thanh Toán",
    });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 9, { trx });

    expect(result.flow).toBe(FLOWS.B_PAID);
    const expectedNewCost = Math.round((120000 * 14) / 30); // 56000
    const expectedRefund = Math.round((90000 * 14) / 30); // 42000
    expect(result.newCost).toBe(expectedNewCost);
    expect(result.refundFromOldNcc).toBe(expectedRefund);
    expect(repo.deleteCostLogById).not.toHaveBeenCalled(); // KHÔNG xóa log cũ
    expect(repo.insertCostLog).toHaveBeenCalledTimes(2);
    expect(repo.insertCostLog).toHaveBeenNthCalledWith(1, trx, {
      orderListId: 42,
      supplyId: 7, // NCC cũ trên log
      idOrder: "MAVL2026-05-01-001",
      importCost: 0,
      refundAmount: expectedRefund,
      nccPaymentStatus: "Chưa Thanh Toán",
    });
    expect(repo.insertCostLog).toHaveBeenNthCalledWith(2, trx, {
      orderListId: 42,
      supplyId: 9,
      idOrder: "MAVL2026-05-01-001",
      importCost: expectedNewCost,
      refundAmount: 0,
      nccPaymentStatus: "Chưa Thanh Toán",
    });
  });

  test("Flow B-paid với NCC mới = Mavryk: giữ log cũ + log hoàn + Mavryk marker (2 INSERT)", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      order_date: "2026-04-25",
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 1, supplier_name: "Mavryk" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(null);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 14 });
    repo.findLatestCostLog.mockResolvedValueOnce({
      id: 888,
      supply_id: 7,
      import_cost: 90000,
      ncc_payment_status: "Đã Thanh Toán",
    });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 1, { trx });

    expect(result.flow).toBe(FLOWS.B_PAID);
    expect(result.mavrykNew).toBe(true);
    expect(result.insertedNewLog).toBe(true);
    expect(result.refundFromOldNcc).toBe(42000);
    expect(repo.insertCostLog).toHaveBeenCalledTimes(2);
    // 1) Log hoàn từ NCC cũ
    expect(repo.insertCostLog).toHaveBeenNthCalledWith(1, trx, {
      orderListId: 42,
      supplyId: 7,
      idOrder: "MAVL2026-05-01-001",
      importCost: 0,
      refundAmount: 42000,
      nccPaymentStatus: "Chưa Thanh Toán",
    });
    // 2) Mavryk marker để dashboard tính profit = price
    expect(repo.insertCostLog).toHaveBeenNthCalledWith(2, trx, {
      orderListId: 42,
      supplyId: 1,
      idOrder: "MAVL2026-05-01-001",
      importCost: 0,
      refundAmount: 0,
      nccPaymentStatus: "Đã Thanh Toán",
    });
  });

  test("Flow B-paid, hết hạn (remaining=0): không insert log hoàn (refund = 0); vẫn insert log NCC mới với cost=0", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      order_date: "2026-04-01",
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 9, supplier_name: "NCC B" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(120000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 0 });
    repo.findLatestCostLog.mockResolvedValueOnce({
      id: 999,
      supply_id: 7,
      import_cost: 90000,
      ncc_payment_status: "Đã Thanh Toán",
    });
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 9, { trx });

    expect(result.flow).toBe(FLOWS.B_PAID);
    expect(result.newCost).toBe(0);
    expect(result.refundFromOldNcc).toBe(0);
    // chỉ 1 lần insert: log NCC mới cost=0 (vì còn 0 ngày)
    expect(repo.insertCostLog).toHaveBeenCalledTimes(1);
    expect(repo.insertCostLog).toHaveBeenCalledWith(trx, {
      orderListId: 42,
      supplyId: 9,
      idOrder: "MAVL2026-05-01-001",
      importCost: 0,
      refundAmount: 0,
      nccPaymentStatus: "Chưa Thanh Toán",
    });
  });
});

describe("changeOrderSupplier — edge cases", () => {
  test("NCC mới trùng với NCC hiện tại → NOOP, không update gì", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({ ...ORDER_BASE });

    const result = await changeOrderSupplier(42, ORDER_BASE.supply_id, { trx });

    expect(result.flow).toBe(FLOWS.NOOP);
    expect(repo.updateOrderSupplyAndCost).not.toHaveBeenCalled();
    expect(repo.findSupplierById).not.toHaveBeenCalled();
  });

  test("orderId không hợp lệ → ChangeSupplierError 400", async () => {
    await expect(changeOrderSupplier(0, 9)).rejects.toMatchObject({
      status: 400,
      name: "ChangeSupplierError",
    });
    await expect(changeOrderSupplier(null, 9)).rejects.toMatchObject({
      status: 400,
    });
  });

  test("Order không tồn tại → 404", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce(null);
    await expect(changeOrderSupplier(42, 9, { trx })).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining("đơn hàng"),
    });
  });

  test("NCC mới (không phải Mavryk) chưa cấu hình giá → 400", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({ ...ORDER_BASE });
    repo.findSupplierById.mockResolvedValueOnce({ id: 9, supplier_name: "NCC B" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(null);

    await expect(changeOrderSupplier(42, 9, { trx })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("giá nhập"),
    });
  });

  test("Đơn >5 ngày NHƯNG chưa có log → fallback Flow A", async () => {
    const trx = buildTrxMock();
    repo.findOrderById.mockResolvedValueOnce({
      ...ORDER_BASE,
      order_date: "2026-04-01",
    });
    repo.findSupplierById.mockResolvedValueOnce({ id: 9, supplier_name: "NCC B" });
    repo.findSupplyPriceForVariant.mockResolvedValueOnce(120000);
    normalizeOrderRow.mockReturnValueOnce({ so_ngay_con_lai: 20 });
    repo.findLatestCostLog.mockResolvedValueOnce(null); // không có log
    repo.updateOrderSupplyAndCost.mockResolvedValueOnce({});

    const result = await changeOrderSupplier(42, 9, { trx });

    expect(result.flow).toBe(FLOWS.A);
    expect(repo.insertCostLog).not.toHaveBeenCalled();
    expect(repo.deleteCostLogById).not.toHaveBeenCalled();
  });
});

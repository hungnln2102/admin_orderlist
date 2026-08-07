jest.mock("@/services/telegramFinanceDeltaNotifier", () => ({
  notifyFinanceMonthlyDelta: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/middleware/authGuard", () => ({
  authGuard: (req, res, next) => {
    if (!req.session) {
      req.session = {};
    }
    req.session.user = { id: 1, username: "admin" };
    req.user = { id: 1, username: "admin" };
    next();
  },
}));

process.env.DISABLE_CSRF = "true";

const { db } = require("@/db");
const app = require("@/app");
const supertest = require("supertest");
const request = supertest(app);

const { registerAllSubscribers } = require("@/events");
const { STATUS } = require("@/utils/statuses");
const { cleanUpTestData } = require("../helpers/dbCleanup");
const { TEST_PREFIX } = require("../helpers/testDataFactory");

describe("Luồng kiểm thử: Nhập hàng (Import Order MAVN)", () => {
  const MAVRYK_ACC_ID = 2002;
  const INITIAL_BALANCE = 10000000; // 10,000,000 VND

  beforeAll(async () => {
    registerAllSubscribers();
    await cleanUpTestData(db);

    // Xóa bank account có ID 2002 nếu đã tồn tại để tránh xung đột
    await db("finance.financial_accounts").where({ id: MAVRYK_ACC_ID }).del().catch(() => {});

    // Insert Mavryk bank account
    await db("finance.financial_accounts").insert({
      id: MAVRYK_ACC_ID,
      account_type: "bank",
      label: `${TEST_PREFIX} Mavryk Bank`,
      account_number: "9183400998",
      account_holder: "NGO LE NGOC HUNG",
      bank_bin: "970422",
      bank_short_code: "MB",
      bank_display_name: "MBBank",
      qr_note_prefix: "MAV",
      balance: INITIAL_BALANCE,
      is_default: true,
      is_active: true,
      is_deleted: false,
    });
  });

  afterAll(async () => {
    await cleanUpTestData(db);
    await db("finance.financial_accounts").where({ id: MAVRYK_ACC_ID }).del().catch(() => {});
  });

  test("1. Tạo đơn nhập hàng (NCC Mavryk) -> PAID ngay, giảm bank, tạo expense log, ko tạo log NCC", async () => {
    const orderPayload = {
      price: 200000,
      cost: 200000,
      supply: "Mavryk",
      customer: "Jest Import Internal",
      contact: "0987654321",
      payment_method: "bank",
      order_date: new Date().toISOString().split("T")[0],
      reserved_order_code: "MAVNTST_INTERNAL",
      skip_telegram_notification: true,
    };

    const createRes = await request
      .post("/api/orders")
      .send(orderPayload);

    expect(createRes.status).toBe(201);
    const createdOrder = createRes.body;
    const orderCode = createdOrder.id_order;
    expect(orderCode).toBe("MAVNTST_INTERNAL");

    // 1. Kiểm tra đơn hàng trong DB
    const orderInDb = await db("business.order_list").where({ id: createdOrder.id }).first();
    expect(orderInDb).toBeDefined();
    expect(orderInDb.status).toBe(STATUS.PAID);
    expect(Number(orderInDb.price)).toBe(200000);
    expect(Number(orderInDb.cost)).toBe(200000);

    // 2. Kiểm tra số dư tài khoản bank giảm
    const bankAccount = await db("finance.financial_accounts").where({ id: MAVRYK_ACC_ID }).first();
    expect(Number(bankAccount.balance)).toBe(INITIAL_BALANCE - 200000);

    // 3. Kiểm tra có log expense loại external_import trong finance.store_profit_expenses
    const expenseLog = await db("finance.store_profit_expenses")
      .where({
        expense_type: "external_import",
        linked_order_code: orderCode,
      })
      .first();
    expect(expenseLog).toBeDefined();
    expect(Number(expenseLog.amount)).toBe(200000);

    // 4. Kiểm tra KHÔNG tạo log NCC trong supplier_order_cost_log
    const supplierCostLog = await db("business.supplier_order_cost_log")
      .where({ order_list_id: createdOrder.id })
      .first();
    expect(supplierCostLog).toBeUndefined();

    // 5. Kiểm tra log sổ cái trong finance.financial_allocation_ledger
    const ledger = await db("finance.financial_allocation_ledger")
      .where({ order_list_id: createdOrder.id })
      .first();
    expect(ledger).toBeDefined();
    expect(ledger.period_type).toBe("INITIAL");
    expect(Number(ledger.cost)).toBe(200000);
  });

  test("2. Tạo đơn nhập hàng (NCC Khác Mavryk) -> PAID ngay, ko đổi bank, tạo log NCC", async () => {
    const supplierName = `${TEST_PREFIX}_NCC_MAVN_NGOAI`;
    const orderPayload = {
      price: 300000,
      cost: 300000,
      supply: supplierName,
      customer: "Jest Import External",
      contact: "0987654321",
      payment_method: "bank",
      order_date: new Date().toISOString().split("T")[0],
      reserved_order_code: "MAVNTST_EXTERNAL",
      skip_telegram_notification: true,
    };

    const createRes = await request
      .post("/api/orders")
      .send(orderPayload);

    expect(createRes.status).toBe(201);
    const createdOrder = createRes.body;
    const orderCode = createdOrder.id_order;
    expect(orderCode).toBe("MAVNTST_EXTERNAL");

    // 1. Kiểm tra đơn hàng trong DB
    const orderInDb = await db("business.order_list").where({ id: createdOrder.id }).first();
    expect(orderInDb).toBeDefined();
    expect(orderInDb.status).toBe(STATUS.PAID);
    expect(Number(orderInDb.price)).toBe(300000);
    expect(Number(orderInDb.cost)).toBe(300000);

    // 2. Kiểm tra số dư tài khoản bank KHÔNG đổi (vẫn là INITIAL_BALANCE - 200000)
    const bankAccount = await db("finance.financial_accounts").where({ id: MAVRYK_ACC_ID }).first();
    expect(Number(bankAccount.balance)).toBe(INITIAL_BALANCE - 200000);

    // 3. Kiểm tra có log NCC trong supplier_order_cost_log với import_cost = price/cost = 300000
    const supplierCostLog = await db("business.supplier_order_cost_log")
      .where({ order_list_id: createdOrder.id })
      .first();
    expect(supplierCostLog).toBeDefined();
    expect(Number(supplierCostLog.import_cost)).toBe(300000);
    expect(supplierCostLog.ncc_payment_status).toBe("Chưa Thanh Toán");

    // 4. Kiểm tra log sổ cái trong finance.financial_allocation_ledger
    const ledger = await db("finance.financial_allocation_ledger")
      .where({ order_list_id: createdOrder.id })
      .first();
    expect(ledger).toBeDefined();
    expect(ledger.period_type).toBe("INITIAL");
    expect(Number(ledger.cost)).toBe(300000);
  });
});

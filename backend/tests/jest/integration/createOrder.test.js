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

// Set DISABLE_CSRF to true to bypass CSRF verification in tests
process.env.DISABLE_CSRF = "true";

const { db } = require("@/db");
const app = require("@/app");
const supertest = require("supertest");
const request = supertest(app);

const { registerAllSubscribers } = require("@/events");
const { processWebhookTransactionAsync } = require("webhook-sepay/routes/webhook/postHandler");
const { parseWebhookTransaction } = require("webhook-sepay/routes/webhook/parsePhase");
const { STATUS } = require("@/utils/statuses");
const { cleanUpTestData } = require("../helpers/dbCleanup");
const { TEST_PREFIX } = require("../helpers/testDataFactory");

describe("Luồng kiểm thử: Tạo đơn hàng và thanh toán qua Webhook", () => {
  beforeAll(async () => {
    registerAllSubscribers();
    await cleanUpTestData(db);
    await db("finance.financial_accounts").insert({
      id: 2001,
      account_type: "bank",
      label: `${TEST_PREFIX} Default Bank`,
      account_number: "0378304963",
      account_holder: "NGO LE NGOC HUNG",
      bank_bin: "970422",
      bank_short_code: "MB",
      bank_display_name: "MBBank",
      qr_note_prefix: "MAV",
      is_default: true,
      is_active: true,
      is_deleted: false,
    });
  });

  afterAll(async () => {
    await cleanUpTestData(db);
  });

  test("1. Tạo đơn hàng với nhà cung cấp KHÁC Mavryk -> Thanh toán thành công qua Webhook", async () => {
    // 1.1. Gọi API tạo đơn hàng mới
    const orderPayload = {
      price: 200000,
      cost: 150000,
      supply: `${TEST_PREFIX}_NCC_A`,
      customer: "Jest Customer A",
      contact: "0987654321",
      payment_method: "bank",
      reserved_order_code: `${TEST_PREFIX}CNONMAVRYK`
    };

    const createRes = await request
      .post("/api/orders")
      .send(orderPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body).toBeDefined();
    expect(createRes.body).toHaveProperty("id_order");

    const createdOrder = createRes.body;
    const orderCode = createdOrder.id_order;
    expect(orderCode).toBeDefined();
    expect(orderCode.startsWith(TEST_PREFIX)).toBe(true);

    // Kiểm tra trong DB: trạng thái đơn hàng là Chưa Thanh Toán
    const orderInDbBefore = await db("business.order_list").where({ id: createdOrder.id }).first();
    expect(orderInDbBefore.status).toBe(STATUS.UNPAID);
    expect(Number(orderInDbBefore.price)).toBe(Number(createdOrder.price));
    expect(Number(orderInDbBefore.cost)).toBe(150000);

    // 1.2. Giả lập webhook thanh toán thành công chuyển khoản đúng số tiền
    const webhookPayload = {
      id: Date.now(),
      gateway: "MBBank",
      transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      account_number: "0378304963",
      transfer_type: "in",
      transfer_amount: Number(createdOrder.price),
      accumulated: 0,
      code: null,
      transaction_content: `Chuyen khoan thanh toan don ${orderCode}`,
      reference_number: `TXN_TEST_${Date.now()}`,
      description: "Payment for order",
      note: `Chuyen khoan thanh toan don ${orderCode}`,
    };

    const parsed = parseWebhookTransaction(webhookPayload);
    await processWebhookTransactionAsync(webhookPayload, parsed);

    // 1.3. Xác minh kết quả sau webhook
    const orderInDbAfter = await db("business.order_list").where({ id: createdOrder.id }).first();
    // Đơn hàng chuyển sang Đã Thanh Toán
    expect(orderInDbAfter.status).toBe(STATUS.PAID);

    // Nhập hàng khác Mavryk: Phải tạo log NCC trong supplier_order_cost_log với import_cost = cost của đơn hàng
    const supplierCostLog = await db("business.supplier_order_cost_log")
      .where({ order_list_id: createdOrder.id })
      .first();
    expect(supplierCostLog).toBeDefined();
    expect(Number(supplierCostLog.import_cost)).toBe(150000);
    expect(supplierCostLog.ncc_payment_status).toBe("Chưa Thanh Toán");

    // Xác minh log thanh toán qua webhook
    const changeLog = await db("billing.payment_receipt_financial_audit_log")
      .where({ order_code: orderCode })
      .first();
    expect(changeLog).toBeDefined();
  });

  test("2. Tạo đơn hàng với nhà cung cấp MAVRYK -> Thanh toán thành công qua Webhook", async () => {
    // 2.1. Gọi API tạo đơn hàng mới với nhà cung cấp Mavryk
    const orderPayload = {
      price: 200000,
      cost: 150000, // Client gửi cost, nhưng NCC là Mavryk thì hệ thống phải reset cost = 0 (hoặc xử lý nội bộ)
      supply: "Mavryk",
      customer: "Jest Customer Mavryk",
      contact: "0987654321",
      payment_method: "bank",
      reserved_order_code: `${TEST_PREFIX}CMAVRYK`
    };

    const createRes = await request
      .post("/api/orders")
      .send(orderPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body).toBeDefined();
    expect(createRes.body).toHaveProperty("id_order");

    const createdOrder = createRes.body;
    const orderCode = createdOrder.id_order;

    // Kiểm tra trong DB: trạng thái đơn hàng là Chưa Thanh Toán, và cost của Mavryk phải bằng 0!
    const orderInDbBefore = await db("business.order_list").where({ id: createdOrder.id }).first();
    expect(orderInDbBefore.status).toBe(STATUS.UNPAID);
    expect(Number(orderInDbBefore.cost)).toBe(0);

    // 2.2. Giả lập webhook thanh toán thành công
    const webhookPayload = {
      id: Date.now() + 1,
      gateway: "MBBank",
      transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      account_number: "0378304963",
      transfer_type: "in",
      transfer_amount: Number(createdOrder.price),
      accumulated: 0,
      code: null,
      transaction_content: `Chuyen khoan thanh toan don ${orderCode}`,
      reference_number: `TXN_TEST_${Date.now()}_M`,
      description: "Payment for order",
      note: `Chuyen khoan thanh toan don ${orderCode}`,
    };

    const parsed = parseWebhookTransaction(webhookPayload);
    await processWebhookTransactionAsync(webhookPayload, parsed);

    // 2.3. Xác minh kết quả sau webhook
    const orderInDbAfter = await db("business.order_list").where({ id: createdOrder.id }).first();
    expect(orderInDbAfter.status).toBe(STATUS.PAID);

    // NCC là Mavryk: Không được tạo log NCC trong supplier_order_cost_log (hoặc trigger tự xóa)
    const supplierCostLog = await db("business.supplier_order_cost_log")
      .where({ order_list_id: createdOrder.id })
      .first();
    expect(supplierCostLog).toBeUndefined();

    // Lợi nhuận của đơn này: Doanh thu (Price) = 200000, Cost = 0 -> Lợi nhuận = 200000.
    // Lợi nhuận đúng bằng doanh thu (Lợi nhuận += Doanh thu)
    const profit = Number(orderInDbAfter.price) - Number(orderInDbAfter.cost);
    expect(profit).toBe(Number(orderInDbAfter.price));
  });
});

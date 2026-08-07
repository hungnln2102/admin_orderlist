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
const { STATUS } = require("@/utils/statuses");
const { cleanUpTestData } = require("../helpers/dbCleanup");
const { TEST_PREFIX } = require("../helpers/testDataFactory");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

describe("Luồng kiểm thử: Sửa đơn hàng và đổi Nhà cung cấp (Supplier Change)", () => {
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

  test("1. Sửa đơn hàng thành công -> Có event và log chỉnh sửa", async () => {
    // 1.1. Tạo một đơn hàng gốc trước
    const orderPayload = {
      price: 200000,
      cost: 150000,
      supply: `${TEST_PREFIX}_NCC_A`,
      customer: "Jest Customer Original",
      contact: "0987654321",
      payment_method: "bank",
      reserved_order_code: `${TEST_PREFIX}U_ORDER_1`
    };

    const createRes = await request
      .post("/api/orders")
      .send(orderPayload);

    expect(createRes.status).toBe(201);
    const createdOrder = createRes.body;
    const orderId = createdOrder.id;
    const orderCode = createdOrder.id_order;

    // Lắng nghe sự kiện ORDER_UPDATED
    const orderUpdatedListener = jest.fn();
    eventBus.on(EVENTS.ORDER_UPDATED, orderUpdatedListener);

    // 1.2. Gọi API sửa đơn hàng
    const updatePayload = {
      price: 220000,
      customer: "Jest Customer Edited",
      contact: "0123456789",
    };

    const updateRes = await request
      .put(`/api/orders/${orderId}`)
      .send(updatePayload);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.customer).toBe("Jest Customer Edited");
    expect(Number(updateRes.body.price)).toBe(220000);

    // 1.3. Xác minh event ORDER_UPDATED được bắn ra
    expect(orderUpdatedListener).toHaveBeenCalled();
    const eventArg = orderUpdatedListener.mock.calls[0][0];
    expect(eventArg.order.id).toBe(orderId);
    expect(eventArg.changedFields).toContain("customer");
    expect(eventArg.changedFields).toContain("price");

    // 1.4. Xác minh log chỉnh sửa được ghi nhận trong bảng system_automation.system_event_logs
    const eventLog = await db("system_automation.system_event_logs")
      .where({ entity_id: String(orderCode) })
      .first();
    expect(eventLog).toBeDefined();
    expect(eventLog.action).toBe("Sửa đơn hàng");
    expect(eventLog.message).toContain("Jest Customer Original");
    expect(eventLog.message).toContain("Jest Customer Edited");

    // Clean up event listener
    eventBus.off(EVENTS.ORDER_UPDATED, orderUpdatedListener);
  });

  test("2. Sửa đơn hàng - Đổi nhà cung cấp -> Tự động tính lại cost và ghi nhận log NCC mới", async () => {
    // 2.1. Tạo nhà cung cấp NCC B và cấu hình giá sản phẩm
    const newSupplierName = `${TEST_PREFIX}_NCC_B`;
    const createOrderPayload = {
      price: 250000,
      cost: 0,
      days: 30, // Cần thiết để prorate cost khi đổi NCC
      supply: "Mavryk", // Bắt đầu bằng nhà cung cấp Mavryk (cost = 0)
      customer: "Jest Customer Supplier Change",
      contact: "0987654321",
      payment_method: "bank",
      id_product: "Adobe CC VIP Jest", // Tên sản phẩm để tự động ensure variant
      reserved_order_code: `${TEST_PREFIX}U_ORDER_2`
    };

    const createRes = await request
      .post("/api/orders")
      .send(createOrderPayload);

    expect(createRes.status).toBe(201);
    const createdOrder = createRes.body;
    const orderId = createdOrder.id;
    const orderCode = createdOrder.id_order;
    const variantId = createdOrder.variant_id;

    expect(variantId).toBeDefined();
    expect(Number(createdOrder.cost)).toBe(0); // NCC là Mavryk ban đầu thì cost = 0

    // Lấy ID của nhà cung cấp mới NCC_B bằng cách lookup
    const { ensureSupplierRecord } = require("@/domains/supplies/services/supplierLookupService");
    const newSupplierId = await ensureSupplierRecord(newSupplierName);

    // Đồng bộ lại sequence của supplier_cost để tránh lỗi duplicate key trên id
    await db.raw("SELECT setval('public.supplier_cost_id_seq', COALESCE((SELECT MAX(id) FROM business.supplier_cost), 0) + 1, false)").catch(() => {});

    // Xóa cấu hình cũ của NCC và variant này nếu đã tồn tại để tránh trùng lặp
    await db("business.supplier_cost")
      .where({
        supplier_id: newSupplierId,
        variant_id: variantId,
      })
      .del();

    // Cấu hình giá nhập cho NCC mới
    await db("business.supplier_cost").insert({
      supplier_id: newSupplierId,
      variant_id: variantId,
      price: 180000,
    });

    // 2.2. Để tạo log NCC, đơn hàng phải ở trạng thái Đã Thanh Toán (PAID). Sửa đơn hàng sang PAID trước.
    const todayStr = new Date().toISOString().split("T")[0];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryStr = expiryDate.toISOString().split("T")[0];

    await db("business.order_list")
      .where({ id: orderId })
      .update({
        status: STATUS.PAID,
        order_date: todayStr,
        expired_at: expiryStr,
      });

    // 2.3. Sửa đơn hàng để đổi sang NCC B
    const updatePayload = {
      supply: newSupplierName,
    };

    const updateRes = await request
      .put(`/api/orders/${orderId}`)
      .send(updatePayload);

    expect(updateRes.status).toBe(200);

    // 2.4. Kiểm tra trong DB xem đơn hàng đã đổi sang NCC B và cost được tính lại chưa
    const orderInDb = await db("business.order_list").where({ id: orderId }).first();
    expect(orderInDb.supply_id).toBe(newSupplierId);
    // Vì đơn hàng mới tạo (còn nguyên số ngày sử dụng), cost phải bằng full price của NCC mới = 180000
    expect(Number(orderInDb.cost)).toBe(180000);

    // 2.5. Kiểm tra có log NCC tương ứng được tạo trong bảng business.supplier_order_cost_log
    const supplierCostLog = await db("business.supplier_order_cost_log")
      .where({ order_list_id: orderId, supply_id: newSupplierId })
      .first();
    expect(supplierCostLog).toBeDefined();
    expect(Number(supplierCostLog.import_cost)).toBe(180000);
    expect(supplierCostLog.ncc_payment_status).toBe("Chưa Thanh Toán");
  });
});

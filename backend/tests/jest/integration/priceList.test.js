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

// Bypass CSRF verification
process.env.DISABLE_CSRF = "true";

const { db } = require("@/db");
const app = require("@/app");
const supertest = require("supertest");
const request = supertest(app);

const { registerAllSubscribers } = require("@/events");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

const TEST_PREFIX = "MAVTST_PRC";

describe("Luồng kiểm thử: Tạo, sửa bảng giá", () => {
  beforeAll(() => {
    registerAllSubscribers();
  });

  afterAll(async () => {
    // 1. Dọn dẹp variant_price
    await db("business.variant_price")
      .whereIn("variant_id", function () {
        this.select("id").from("business.variant").whereILike("display_name", `${TEST_PREFIX}%`);
      })
      .del()
      .catch(() => {});

    // 2. Dọn dẹp product_category
    await db("business.product_category")
      .whereIn("product_id", function () {
        this.select("id").from("business.product").whereILike("package_name", `${TEST_PREFIX}%`);
      })
      .del()
      .catch(() => {});

    // 3. Dọn dẹp variant & product
    await db("business.variant")
      .whereILike("display_name", `${TEST_PREFIX}%`)
      .del()
      .catch(() => {});

    await db("business.product")
      .whereILike("package_name", `${TEST_PREFIX}%`)
      .del()
      .catch(() => {});

    // 4. Dọn dẹp system event logs
    await db("system_automation.system_event_logs")
      .whereILike("message", `%${TEST_PREFIX}%`)
      .del()
      .catch(() => {});

    await db.destroy();
  });

  let createdProductId = null;

  test("1. Tạo bảng giá / sản phẩm mới thành công -> Có event và log tạo", async () => {
    const priceCreatedListener = jest.fn();
    eventBus.on(EVENTS.PRODUCT_PRICE_CREATED, priceCreatedListener);

    const payload = {
      packageName: `${TEST_PREFIX}_PKG_NEW`,
      sanPham: `${TEST_PREFIX}_PROD_1`,
      basePrice: 50000,
      pctCtv: 10,
      pctKhach: 20,
      pctPromo: 15,
      pctStu: 5,
      is_active: true,
      suppliers: [
        { name: "Mavryk", price: 0 }
      ]
    };

    const res = await request
      .post("/api/products/prices")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toBeDefined();
    expect(res.body.san_pham).toBe(`${TEST_PREFIX}_PROD_1`);
    expect(res.body.package).toBe(`${TEST_PREFIX}_PKG_NEW`);
    expect(Number(res.body.base_price)).toBe(50000);

    createdProductId = res.body.id;
    expect(createdProductId).toBeDefined();

    // Xác minh event PRODUCT_PRICE_CREATED được bắn
    expect(priceCreatedListener).toHaveBeenCalled();
    const eventArg = priceCreatedListener.mock.calls[0][0];
    expect(eventArg.price.id).toBe(createdProductId);

    // Xác minh log trong system_event_logs (chờ 200ms để log ghi xong)
    await new Promise((resolve) => setTimeout(resolve, 200));
    const eventLog = await db("system_automation.system_event_logs")
      .where("action", "Them bang gia san pham")
      .andWhere("entity_id", String(createdProductId))
      .first();

    expect(eventLog).toBeDefined();
    expect(eventLog.message).toContain(`${TEST_PREFIX}_PROD_1`);

    eventBus.off(EVENTS.PRODUCT_PRICE_CREATED, priceCreatedListener);
  });

  test("2. Sửa bảng giá / sản phẩm đang tồn tại thành công -> Có event và log sửa", async () => {
    expect(createdProductId).not.toBeNull();

    const priceUpdatedListener = jest.fn();
    eventBus.on(EVENTS.PRODUCT_PRICE_UPDATED, priceUpdatedListener);

    const updatePayload = {
      packageName: `${TEST_PREFIX}_PKG_NEW`,
      basePrice: 60000, // Thay đổi giá cơ bản
      pctCtv: 12,
    };

    const res = await request
      .patch(`/api/products/prices/${createdProductId}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(Number(res.body.base_price)).toBe(60000);
    expect(Number(res.body.pct_ctv)).toBe(12);

    // Xác minh event PRODUCT_PRICE_UPDATED được bắn
    expect(priceUpdatedListener).toHaveBeenCalled();
    const eventArg = priceUpdatedListener.mock.calls[0][0];
    expect(eventArg.price.id).toBe(createdProductId);

    // Xác minh log trong system_event_logs (chờ 200ms để log ghi xong)
    await new Promise((resolve) => setTimeout(resolve, 200));
    const eventLog = await db("system_automation.system_event_logs")
      .where("action", "Sua bang gia san pham")
      .andWhere("entity_id", String(createdProductId))
      .first();

    expect(eventLog).toBeDefined();
    expect(eventLog.message).toContain(`${TEST_PREFIX}_PROD_1`);

    eventBus.off(EVENTS.PRODUCT_PRICE_UPDATED, priceUpdatedListener);
  });
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { ORDER_STATUS } = require("../../src/constants/orderStatus");

test.describe("Product Delete Cascade & Anti-Orphan Rules Suite - Chỉ Đạo Của Master", () => {
  // Hàm mô phỏng logic phân loại đơn hàng và quyết định xóa
  const evaluateProductDeleteCondition = (variant, linkedOrders = []) => {
    if (!variant) {
      const err = new Error("Sản phẩm không tồn tại");
      err.statusCode = 404;
      throw err;
    }

    // 1. Phân loại đơn hàng Đã Thanh Toán (Active / Paid)
    const activeOrders = linkedOrders.filter((o) => {
      const st = String(o.status || "").trim().toUpperCase();
      const isPaid = st === ORDER_STATUS.PAID || st === "ĐÃ THANH TOÁN";
      const isRenew = st === ORDER_STATUS.RENEW_REQUIRED || st === "CẦN GIA HẠN";
      const isProcessing = st === ORDER_STATUS.PROCESSING || st === "ĐANG XỬ LÝ";
      const wasPaidActive = Boolean(o.was_paid) && !["EXPIRED", "HẾT HẠN", "REFUNDED", "ĐÃ HOÀN TIỀN", "CANCELED", "ĐÃ HỦY"].includes(st);
      return isPaid || isRenew || isProcessing || wasPaidActive;
    });

    if (activeOrders.length > 0) {
      const err = new Error(
        `Không thể xóa sản phẩm "${variant.display_name}" vì đang còn ${activeOrders.length} đơn hàng Đã Thanh Toán (hoặc đang hoạt động). Vui lòng chuyển sản phẩm sang trạng thái Ẩn thay vì Xóa để tránh đơn hàng bị mồ côi vật phẩm!`
      );
      err.statusCode = 400;
      throw err;
    }

    // 2. Không còn đơn Đã Thanh Toán -> cho phép xóa và lấy các đơn hàng sẽ xóa kèm
    const ordersToDelete = linkedOrders.map((o) => o.id);
    return {
      canDelete: true,
      deletedOrdersCount: ordersToDelete.length,
      ordersToDelete,
      summary: ordersToDelete.length > 0
        ? `Đã xóa hoàn toàn sản phẩm "${variant.display_name}" (${variant.variant_name}) và xóa luôn ${ordersToDelete.length} đơn hàng (hết hạn/đã hoàn) liên quan khỏi hệ thống`
        : `Đã xóa hoàn toàn sản phẩm "${variant.display_name}" (${variant.variant_name}) khỏi hệ thống`,
    };
  };

  test("1. Từ chối xóa sản phẩm khi đang còn đơn hàng Đã Thanh Toán (PAID)", () => {
    const variant = { id: 28, display_name: "TinderPla_Per--6m", variant_name: "Tinder Platinum" };
    const orders = [
      { id: 101, id_order: "ORD101", status: "PAID", was_paid: true },
      { id: 102, id_order: "ORD102", status: "EXPIRED", was_paid: true },
    ];

    assert.throws(
      () => evaluateProductDeleteCondition(variant, orders),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Không thể xóa sản phẩm "TinderPla_Per--6m"/);
        assert.match(err.message, /đang còn 1 đơn hàng Đã Thanh Toán/);
        return true;
      }
    );
  });

  test("2. Từ chối xóa sản phẩm khi còn đơn hàng Cần Gia Hạn (RENEW_REQUIRED)", () => {
    const variant = { id: 96, display_name: "NetflixFam_Slot--1m", variant_name: "Netflix 1 Slot" };
    const orders = [
      { id: 201, id_order: "ORD201", status: "RENEW_REQUIRED", was_paid: true },
    ];

    assert.throws(
      () => evaluateProductDeleteCondition(variant, orders),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /đang còn 1 đơn hàng Đã Thanh Toán/);
        return true;
      }
    );
  });

  test("3. Tự động xóa luôn các đơn hàng khi tất cả đều đã Hết Hạn (EXPIRED)", () => {
    const variant = { id: 152, display_name: "Turnitin_student--1m", variant_name: "Turnitin Student" };
    const orders = [
      { id: 301, id_order: "ORD301", status: "EXPIRED", was_paid: true },
      { id: 302, id_order: "ORD302", status: "EXPIRED", was_paid: true },
      { id: 303, id_order: "ORD303", status: "EXPIRED", was_paid: true },
    ];

    const result = evaluateProductDeleteCondition(variant, orders);
    assert.strictEqual(result.canDelete, true);
    assert.strictEqual(result.deletedOrdersCount, 3);
    assert.deepStrictEqual(result.ordersToDelete, [301, 302, 303]);
    assert.match(result.summary, /xóa luôn 3 đơn hàng \(hết hạn\/đã hoàn\) liên quan/);
  });

  test("4. Tự động xóa luôn các đơn hàng khi chỉ có đơn Đã Hoàn (REFUNDED) và Đã Hủy (CANCELED)", () => {
    const variant = { id: 189, display_name: "CanvaSlot_Edu--12m", variant_name: "Canva Slot Team" };
    const orders = [
      { id: 401, id_order: "ORD401", status: "REFUNDED", was_paid: false },
      { id: 402, id_order: "ORD402", status: "CANCELED", was_paid: false },
    ];

    const result = evaluateProductDeleteCondition(variant, orders);
    assert.strictEqual(result.canDelete, true);
    assert.strictEqual(result.deletedOrdersCount, 2);
    assert.deepStrictEqual(result.ordersToDelete, [401, 402]);
  });

  test("5. Xóa thành công sản phẩm chưa từng có đơn hàng nào", () => {
    const variant = { id: 149, display_name: "VieonHBO_Per--12m", variant_name: "Vieon HBO VIP" };
    const orders = [];

    const result = evaluateProductDeleteCondition(variant, orders);
    assert.strictEqual(result.canDelete, true);
    assert.strictEqual(result.deletedOrdersCount, 0);
    assert.deepStrictEqual(result.ordersToDelete, []);
    assert.match(result.summary, /Đã xóa hoàn toàn sản phẩm "VieonHBO_Per--12m"/);
  });

  test("6. Ném lỗi 404 nếu sản phẩm không tồn tại", () => {
    assert.throws(
      () => evaluateProductDeleteCondition(null, []),
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        assert.strictEqual(err.message, "Sản phẩm không tồn tại");
        return true;
      }
    );
  });
});


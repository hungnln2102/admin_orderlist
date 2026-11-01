require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  extractSlotSuffix,
  applySuffixToPrice,
  getAvailableSuffix,
} = require("@/domains/payments/services/slotSuffixService");

describe("Slot Suffix Immutability & Unrounded Pricing Tests", () => {
  it("applySuffixToPrice should preserve exact product price without rounding", () => {
    // 80,000 + 4 = 80,004
    assert.strictEqual(applySuffixToPrice(80000, 4), 80004);

    // Giá lẻ không tròn: 79,900 + 4 = 79,904
    assert.strictEqual(applySuffixToPrice(79900, 4), 79904);

    // Giá lẻ phức tạp: 123,456 + 12 = 123,468
    assert.strictEqual(applySuffixToPrice(123456, 12), 123468);

    // Giá 0đ (quà tặng): 0 + 5 = 5 (hoặc nếu quà tặng thì price = 0)
    assert.strictEqual(applySuffixToPrice(0, 5), 5);
  });

  it("extractSlotSuffix should accurately extract slot from gross_selling_price diff", () => {
    // Đơn chuẩn có gross_selling_price và price
    const order1 = { price: 80004, gross_selling_price: 80000 };
    assert.strictEqual(extractSlotSuffix(order1), 4);

    // Giá lẻ không tròn: 79,904 - 79,900 = 4
    const order2 = { price: 79904, gross_selling_price: 79900 };
    assert.strictEqual(extractSlotSuffix(order2), 4);

    // Suffix = 100
    const order3 = { price: 80100, gross_selling_price: 80000 };
    assert.strictEqual(extractSlotSuffix(order3), 100);

    // Đơn cũ null gross_selling_price -> fallback % 100
    const orderOld = { price: 150044, gross_selling_price: null };
    assert.strictEqual(extractSlotSuffix(orderOld), 44);

    // Đơn cũ kết thúc bằng 00 (slot 100)
    const orderOld100 = { price: 210100, gross_selling_price: null };
    assert.strictEqual(extractSlotSuffix(orderOld100), 100);

    // Đơn không có giá
    assert.strictEqual(extractSlotSuffix({ price: 0 }), null);
    assert.strictEqual(extractSlotSuffix(null), null);
  });

  it("getAvailableSuffix should avoid used slots and support excludeOrderId", async () => {
    const mockDb = (table) => {
      const builder = {
        _excluded: null,
        select: () => builder,
        where: () => builder,
        whereIn: () => builder,
        andWhere: () => builder,
        whereNot: (col, val) => {
          builder._excluded = val;
          return builder;
        },
        then: (resolve) => {
          if (String(table).includes("batch_payment_requests")) {
            resolve([]);
            return;
          }
          const orders = [
            { id: 1, price: 80001, gross_selling_price: 80000 }, // slot 1
            { id: 2, price: 80002, gross_selling_price: 80000 }, // slot 2
            { id: 3, price: 80003, gross_selling_price: 80000 }, // slot 3
            { id: 4, price: 80004, gross_selling_price: 80000 }, // slot 4
          ];
          const filtered = builder._excluded ? orders.filter((o) => o.id !== builder._excluded) : orders;
          resolve(filtered);
        },
      };
      return builder;
    };
    mockDb.fn = { now: () => new Date() };

    // Khi không exclude: slot 1, 2, 3, 4 đã dùng -> cấp slot 5
    const slotNext = await getAvailableSuffix(mockDb);
    assert.strictEqual(slotNext, 5);

    // Khi exclude order id 4: slot 4 được coi là trống -> cấp slot 4
    const slotReused = await getAvailableSuffix(mockDb, 4);
    assert.strictEqual(slotReused, 4);
  });
});

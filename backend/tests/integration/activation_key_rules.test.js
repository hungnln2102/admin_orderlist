require("module-alias/register");
const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const { db } = require("../../src/db");
const { TABLES } = require("../../src/db/tables");
const activationKeyService = require("../../src/domains/products/services/activationKeyService");
const orderService = require("../../src/domains/orders/services/orderService");

describe("Activation Key Rules & Order Auto-Provisioning Suite", () => {
  after(async () => {
    await db.destroy();
  });
  it("Lưu cấu hình quy tắc (Variant + NCC -> Kho slot) thành công", async () => {
    const variant = await db(TABLES.VARIANT).first();
    const supplier = await db(TABLES.SUPPLIER).first();
    const pName = await db(TABLES.PRODUCT_NAMES).first();

    assert.ok(variant, "Cần có ít nhất 1 variant trong DB");
    assert.ok(supplier, "Cần có ít nhất 1 supplier trong DB");
    assert.ok(pName, "Cần có ít nhất 1 product_name trong DB");

    const savedRule = await activationKeyService.saveActivationKeyRule({
      variant_id: variant.id,
      supplier_id: supplier.id,
      product_name_id: pName.id,
      is_active: true,
      note: "Integration Test Rule",
    });

    assert.ok(savedRule.id);
    assert.equal(Number(savedRule.variant_id), Number(variant.id));
    assert.equal(Number(savedRule.supplier_id), Number(supplier.id));
    assert.equal(Number(savedRule.product_name_id), Number(pName.id));

    // Dọn dẹp
    await db(TABLES.ACTIVATION_KEY_RULES).where("id", savedRule.id).del();
  });

  it("Tạo đơn hàng tự động cấp Key khi khớp cấu hình và cập nhật slot khi kích hoạt", async () => {
    const variant = await db(TABLES.VARIANT).first();
    const supplier = await db(TABLES.SUPPLIER).first();
    const pName = await db(TABLES.PRODUCT_NAMES).first();

    // 1. Tạo rule
    const rule = await activationKeyService.saveActivationKeyRule({
      variant_id: variant.id,
      supplier_id: supplier.id,
      product_name_id: pName.id,
      is_active: true,
      note: "Auto Provisioning Test",
    });

    const testOrderId = "TEST-INT-" + Date.now().toString().slice(-6);

    try {
      // 2. Tạo đơn hàng với slot rỗng và information_order rỗng (để backend tự sinh) hoặc có key
      const createdOrder = await orderService.createOrder({
        id_order: testOrderId,
        customer: "Khách Test Auto Key",
        contact: "0911223344",
        id_product: variant.id,
        supply_id: supplier.id,
        price: 100000,
        cost: 40000,
        information_order: "",
        slot: "",
        order_date: "2026-11-20",
        days: 30,
      });

      assert.ok(createdOrder.information_order, "Đơn hàng phải được tự động gán mã key vào information_order");
      assert.ok(createdOrder.information_order.includes("-"), "Mã key trong information_order phải có định dạng hợp lệ");
      assert.equal(createdOrder.slot || "", "", "Cột slot ban đầu phải để trống cho khách tự kích hoạt");

      // 3. Kiểm tra bản ghi trong activation_keys
      const keyRow = await db(TABLES.ACTIVATION_KEYS).where("key_code", createdOrder.information_order).first();
      assert.ok(keyRow, "Mã key phải tồn tại trong warehouse.activation_keys");
      assert.equal(keyRow.status, "AVAILABLE");
      assert.equal(Number(keyRow.product_name_id), Number(pName.id));
      assert.equal(keyRow.id_order, testOrderId);

      // 4. Nếu có slot trong kho, thử kích hoạt và kiểm tra order_list.slot được cập nhật
      const availableSlot = await db(TABLES.ACCOUNT_SLOTS)
        .where("name_id", pName.id)
        .whereIn("status", ["AVAILABLE", "available"])
        .first();

      if (availableSlot) {
        const actRes = await activationKeyService.activateKeyWithTransaction({
          keyCode: createdOrder.information_order,
          customerInfo: "Khách kích hoạt test",
        });

        assert.equal(actRes.success, true);
        assert.ok(actRes.account);

        const orderAfterAct = await db(TABLES.ORDER_LIST).where("id_order", testOrderId).first();
        assert.equal(orderAfterAct.slot, actRes.account, "Cột slot đơn hàng phải được ghi đè tài khoản thực tế");
        assert.equal(orderAfterAct.information_order, createdOrder.information_order, "Cột information_order vẫn giữ nguyên mã key");
      }
    } finally {
      // Dọn dẹp
      await db(TABLES.ACTIVATION_KEYS).where("id_order", testOrderId).del();
      await db(TABLES.ORDER_LIST).where("id_order", testOrderId).del();
      await db(TABLES.ACTIVATION_KEY_RULES).where("id", rule.id).del();
    }
  });
});

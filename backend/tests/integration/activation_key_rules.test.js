require("module-alias/register");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { db } = require("../../src/db");
const { TABLES } = require("../../src/db/tables");
const activationKeyService = require("../../src/domains/products/services/activationKeyService");
const orderService = require("../../src/domains/orders/services/orderService");
const { resolveAdobeRecoveryOrder } = require("../../src/domains/system/services/adobeOrderSourceService");

describe("Activation Key Rules & Order Auto-Provisioning Suite", () => {
  let catalogProduct;
  let variant;
  let supplier;
  let target;

  before(async () => {
    const tag = randomUUID();
    [catalogProduct] = await db(TABLES.PRODUCT).insert({ package_name: `Test ${tag}` }).returning("id");
    [variant] = await db(TABLES.VARIANT)
      .insert({ product_id: catalogProduct.id, variant_name: `Test ${tag}` }).returning("id");
    [supplier] = await db(TABLES.SUPPLIER).insert({ supplier_name: `Test ${tag}` }).returning("id");
    const [warehouseProduct] = await db(TABLES.PRODUCT_NAMES).insert({ name: `Adobe Test ${tag}` }).returning("id");
    target = { product_name_id: warehouseProduct.id, variant_tag: tag };
    const [account] = await db(TABLES.ACCOUNTS).insert({
      product_name_id: warehouseProduct.id, account_username: `test-${tag}@example.test`,
    }).returning("id");
    const [slot] = await db(TABLES.ACCOUNT_SLOTS).insert({
      account_id: account.id, name_id: warehouseProduct.id, variant_tag: tag, status: "AVAILABLE",
    }).returning("id");
    await db(TABLES.PACKAGE_PRODUCT).insert({
      product_name_id: warehouseProduct.id, account_id: account.id, account_slot_id: slot.id,
    });
  });

  after(async () => {
    try {
      if (target) await db(TABLES.PRODUCT_NAMES).where("id", target.product_name_id).del();
      if (supplier) await db(TABLES.SUPPLIER).where("id", supplier.id).del();
      if (catalogProduct) await db(TABLES.PRODUCT).where("id", catalogProduct.id).del();
    } finally {
      await db.destroy();
    }
  });

  it("Giữ thông tin nguồn khi lưu và tra cứu đơn Adobe mua thẳng", async () => {
    const tag = randomUUID();
    const contact = "customer@example.test";
    for (const [source, slot, provider, info] of [
      ["yuna", "adobe_account", "yuna_2fa", `Yuna-${tag}`],
      ["ades", "adobe_check", "fix_ades_status", `ades-${tag}@example.test`],
    ]) {
      const orderCode = `TEST-${source}-${tag}`.toUpperCase();
      const rule = { slot_key: slot, provider_key: provider, variant_id: variant.id, supplier_id: supplier.id };
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).insert({ ...rule, is_active: true });
      try {
        const order = await orderService.createOrder({
          id_order: orderCode, id_product: variant.id, supply_id: supplier.id, information_order: info,
          contact, status: "PAID", expired_at: "2099-01-01",
        });
        assert.equal(order.information_order, info);
        assert.equal(await db(TABLES.ACTIVATION_KEYS).where("id_order", orderCode).first(), undefined);
        if (source === "ades") {
          assert.deepEqual(await resolveAdobeRecoveryOrder({ code: info }), { contactRequired: true });
          await assert.rejects(resolveAdobeRecoveryOrder({ code: info, contact: "wrong" }));
        }
        assert.deepEqual(await resolveAdobeRecoveryOrder({ code: info, contact: source === "ades" ? contact : undefined }), {
          source, providerKey: provider, providerInput: info,
        });
        await db(TABLES.ORDER_LIST).where("id_order", orderCode).update({ status: "UNPAID" });
        assert.equal(await resolveAdobeRecoveryOrder({ code: info, contact }), null);
      } finally {
        await db(TABLES.ORDER_LIST).where("id_order", orderCode).del();
        await db(TABLES.PORTAL_SLOT_ROUTING_RULES).where(rule).del();
      }
    }
  });

  it("Cấp đúng một slot Adobe cho hai yêu cầu đồng thời sau khi thanh toán", async () => {
    const suffix = randomUUID();
    const orderCode = `TEST-ADOBE-${suffix}`;
    const contact = "adobe-customer@example.test";
    const [product] = await db(TABLES.PRODUCT_NAMES)
      .insert({ name: `Adobe Test ${suffix}` }).returning("id");

    try {
      await db(TABLES.ORDER_LIST).insert({
        id_order: orderCode,
        contact,
        status: "UNPAID",
        expired_at: new Date(Date.now() + 86_400_000),
      });
      const [key] = await activationKeyService.createActivationKeys({
        product_name_id: product.id,
        id_order: orderCode,
      });
      assert.equal(key.status, "INACTIVE");
      await assert.rejects(activationKeyService.activateKeyWithTransaction({
        keyCode: key.key_code, recovery: "check",
      }), /Không xác minh/);

      const accounts = await db(TABLES.ACCOUNTS).insert([1, 2].map((index) => ({
        product_name_id: product.id,
        account_username: `adobe-${index}-${suffix}@example.test`,
      }))).returning("id");
      await db(TABLES.ACCOUNT_SLOTS).insert(accounts.map((account) => ({
        account_id: account.id,
        name_id: product.id,
        status: "AVAILABLE",
        password: "test-password",
        expired_at: new Date(Date.now() + 86_400_000),
      })));

      await db(TABLES.ORDER_LIST).where("id_order", orderCode).update({ status: "PAID" });
      const paidKey = await db(TABLES.ACTIVATION_KEYS).where("id", key.id).first();
      assert.equal(paidKey.status, "ACTIVATED");
      assert.equal(paidKey.account_slot_id, null);
      assert.deepEqual(await activationKeyService.activateKeyWithTransaction({
        keyCode: orderCode, recovery: "check",
      }), { contactRequired: true });
      await assert.rejects(activationKeyService.activateKeyWithTransaction({
        keyCode: orderCode, orderContact: "wrong@example.test", recovery: "check",
      }), /Không xác minh/);

      const [first, second] = await Promise.all([
        activationKeyService.activateKeyWithTransaction({ keyCode: key.key_code, recovery: "check" }),
        activationKeyService.activateKeyWithTransaction({ keyCode: orderCode, orderContact: contact, recovery: "check" }),
      ]);
      assert.equal(first.account, second.account);
      assert.equal(first.password, "test-password");
      assert.equal(Boolean(first.replaced || second.replaced), false);
      const allocatedKey = await db(TABLES.ACTIVATION_KEYS).where("id", key.id).first();
      assert.ok(allocatedKey.activated_at);
      assert.ok(allocatedKey.account_slot_id);
      const slots = await db(TABLES.ACCOUNT_SLOTS).where("name_id", product.id);
      assert.equal(slots.filter((slot) => slot.status === "IN_USE").length, 1);
      const order = await db(TABLES.ORDER_LIST).where("id_order", orderCode).first();
      assert.equal(order.slot, first.account);
    } finally {
      await db(TABLES.ACTIVATION_KEYS).where("id_order", orderCode).del();
      await db(TABLES.ORDER_LIST).where("id_order", orderCode).del();
      await db(TABLES.PRODUCT_NAMES).where("id", product.id).del();
    }
  });
  it("Khôi phục Adobe theo slot hiện tại của gói và tự cấp lại khi gói bị xóa", async () => {
    const suffix = randomUUID();
    const orderCode = `TEST-ADOBE-PACKAGE-${suffix}`;
    const contact = "package-customer@example.test";
    const expiredAt = new Date(Date.now() + 2 * 86_400_000);
    const [product] = await db(TABLES.PRODUCT_NAMES)
      .insert({ name: `Adobe Test ${suffix}` }).returning("id");

    try {
      const addSlot = async (label, tag = suffix) => {
        const account = `${label}-${suffix}@example.test`;
        const password = `test-${label}`;
        const [accountRow] = await db(TABLES.ACCOUNTS)
          .insert({ product_name_id: product.id, account_username: account }).returning("id");
        const [slot] = await db(TABLES.ACCOUNT_SLOTS).insert({
          account_id: accountRow.id, name_id: product.id, variant_tag: tag,
          status: "AVAILABLE", password, expired_at: expiredAt,
        }).returning("id");
        return { id: slot.id, accountId: accountRow.id, account, password };
      };
      const addPackage = async (slot) => {
        const [row] = await db(TABLES.PACKAGE_PRODUCT).insert({
          product_name_id: product.id, account_id: slot.accountId, account_slot_id: slot.id, slot: 1,
        }).returning("id");
        return row.id;
      };
      const original = await addSlot("original");
      const updated = await addSlot("updated");
      const packageId = await addPackage(original);
      await db(TABLES.ORDER_LIST).insert({ id_order: orderCode, contact, status: "UNPAID", expired_at: expiredAt });
      const [key] = await activationKeyService.createActivationKeys({ product_name_id: product.id, id_order: orderCode });
      const keyQuery = () => db(TABLES.ACTIVATION_KEYS).where("id", key.id);
      const orderQuery = () => db(TABLES.ORDER_LIST).where("id_order", orderCode);
      await keyQuery().update({ target_variant_tag: suffix });
      await orderQuery().update({ status: "PAID" });
      const recover = (recovery, byOrder = false) => activationKeyService.activateKeyWithTransaction({
        keyCode: byOrder ? orderCode : key.key_code,
        orderContact: byOrder ? contact : undefined,
        recovery,
      });
      assert.equal((await recover("check")).account, original.account);
      const initialKey = await keyQuery().first();
      assert.equal(initialKey.package_product_id, packageId);

      await db(TABLES.PACKAGE_PRODUCT).where("id", packageId)
        .update({ account_id: updated.accountId, account_slot_id: updated.id });
      assert.equal((await recover("lookup", true)).account, updated.account);
      assert.equal((await keyQuery().first()).account_slot_id, original.id);
      assert.equal((await orderQuery().first()).slot, original.account);
      const refreshed = await recover("check", true);
      assert.equal(refreshed.account, updated.account);
      assert.equal(refreshed.password, updated.password);
      assert.equal(Boolean(refreshed.replaced), false);
      const refreshedKey = await keyQuery().first();
      assert.equal(refreshedKey.package_product_id, packageId);
      assert.equal(refreshedKey.account_slot_id, updated.id);
      assert.equal(refreshedKey.assigned_account, updated.account);
      assert.deepEqual(refreshedKey.activated_at, initialKey.activated_at);
      assert.equal((await orderQuery().first()).slot, updated.account);

      await db(TABLES.PACKAGE_PRODUCT).where("id", packageId).del();
      assert.deepEqual(await recover("lookup"), { replacementRequired: true });
      await addPackage(await addSlot("different-tag", randomUUID()));
      const beforeNoStockKey = await keyQuery().first();
      const beforeNoStockOrder = await orderQuery().first();
      assert.deepEqual(await recover("check"), { replacementRequired: true, outOfStock: true });
      assert.deepEqual(await keyQuery().first(), beforeNoStockKey);
      assert.deepEqual(await orderQuery().first(), beforeNoStockOrder);

      const replacement = await addSlot("replacement");
      const replacementPackageId = await addPackage(replacement);
      const results = await Promise.all([recover("check"), recover("check", true)]);
      for (const result of results) {
        assert.equal(result.account, replacement.account);
        assert.equal(result.password, replacement.password);
      }
      assert.equal(results.filter((result) => result.replaced).length, 1);
      const finalKey = await keyQuery().first();
      assert.equal(finalKey.package_product_id, replacementPackageId);
      assert.equal(finalKey.account_slot_id, replacement.id);
      assert.equal(finalKey.assigned_account, replacement.account);
      assert.deepEqual(finalKey.activated_at, initialKey.activated_at);
      assert.equal((await orderQuery().first()).slot, replacement.account);
    } finally {
      await db(TABLES.ACTIVATION_KEYS).where("id_order", orderCode).del();
      await db(TABLES.ORDER_LIST).where("id_order", orderCode).del();
      await db(TABLES.PRODUCT_NAMES).where("id", product.id).del();
    }
  });

  it("Lưu cấu hình quy tắc (Variant + NCC -> Kho slot) thành công", async () => {
    const savedRule = await activationKeyService.saveActivationKeyRule({
      variant_id: variant.id,
      supplier_id: supplier.id,
      product_name_id: target.product_name_id,
      target_variant_tag: target.variant_tag,
      is_active: true,
      note: "Integration Test Rule",
    });

    assert.ok(savedRule.id);
    assert.equal(Number(savedRule.variant_id), Number(variant.id));
    assert.equal(Number(savedRule.supplier_id), Number(supplier.id));
    assert.equal(Number(savedRule.product_name_id), Number(target.product_name_id));
    assert.equal(savedRule.target_variant_tag, target.variant_tag.trim());

    // Dọn dẹp
    await db(TABLES.ACTIVATION_KEY_RULES).where("id", savedRule.id).del();
  });

  it("Không cấp key qua payload khi rule sai NCC hoặc đã tắt và từ chối preview cũ", async () => {
    const previewKey = activationKeyService.generateOrderActivationKey();
    const [otherSupplier] = await db(TABLES.SUPPLIER)
      .insert({ supplier_name: `Test ${randomUUID()}` }).returning("id");
    let rule;
    const orderIds = [];
    const createPayload = (supplierId) => {
      const orderId = `TEST-KEY-RULE-${randomUUID()}`;
      orderIds.push(orderId);
      return {
        id_order: orderId,
        customer: "Khách Test Rule",
        contact: "0911223344",
        id_product: variant.id,
        supply_id: supplierId,
        price: 100000,
        cost: 40000,
        activation_key: previewKey,
        order_date: "2026-11-20",
        days: 30,
      };
    };

    try {
      rule = await activationKeyService.saveActivationKeyRule({
        variant_id: variant.id,
        supplier_id: supplier.id,
        product_name_id: target.product_name_id,
        target_variant_tag: target.variant_tag,
        is_active: true,
      });

      const wrongSupplier = await orderService.createOrder(createPayload(otherSupplier.id));
      assert.equal(wrongSupplier.information_order || "", "");

      await db(TABLES.ACTIVATION_KEY_RULES).where("id", rule.id).update({ is_active: false });
      const inactiveRule = await orderService.createOrder(createPayload(supplier.id));
      assert.equal(inactiveRule.information_order || "", "");

      const stalePreview = createPayload(supplier.id);
      await assert.rejects(orderService.createOrder({
        ...stalePreview,
        information_order: previewKey,
        require_activation_key_rule: true,
      }), /Quy tắc cấp key đã thay đổi/);

      assert.equal(await db(TABLES.ORDER_LIST).where("id_order", stalePreview.id_order).first(), undefined);
      assert.deepEqual(await db(TABLES.ACTIVATION_KEYS).whereIn("id_order", orderIds), []);
    } finally {
      await db(TABLES.ACTIVATION_KEYS).whereIn("id_order", orderIds).del();
      await db(TABLES.ORDER_LIST).whereIn("id_order", orderIds).del();
      if (rule) await db(TABLES.ACTIVATION_KEY_RULES).where("id", rule.id).del();
      await db(TABLES.SUPPLIER).where("id", otherSupplier.id).del();
    }
  });

  it("Tạo đơn hàng tự động cấp Key khi khớp cấu hình và cập nhật slot khi kích hoạt", async () => {
    // 1. Tạo rule
    const rule = await activationKeyService.saveActivationKeyRule({
      variant_id: variant.id,
      supplier_id: supplier.id,
      product_name_id: target.product_name_id,
      target_variant_tag: target.variant_tag,
      is_active: true,
      note: "Auto Provisioning Test",
    });

    const testOrderId = "TEST-INT-" + Date.now().toString().slice(-6);
    let activatedSlot = null;

    try {
      const previewKey = activationKeyService.generateOrderActivationKey();
      assert.equal(await db(TABLES.ACTIVATION_KEYS).where("key_code", previewKey).first(), undefined);

      // 2. Gửi mã đã hiển thị trên biểu mẫu.
      const createdOrder = await orderService.createOrder({
        id_order: testOrderId,
        customer: "Khách Test Auto Key",
        contact: "0911223344",
        id_product: variant.id,
        supply_id: supplier.id,
        price: 100000,
        cost: 40000,
        information_order: previewKey,
        slot: "",
        require_activation_key_rule: true,
        order_date: "2026-11-20",
        days: 30,
      });

      assert.equal(createdOrder.information_order, previewKey);
      assert.match(createdOrder.information_order, /^MAVKEY[A-Z0-9]{6}$/);
      assert.equal(createdOrder.slot || "", "", "Cột slot ban đầu phải để trống cho khách tự kích hoạt");

      // 3. Kiểm tra bản ghi trong activation_keys
      const keyRow = await db(TABLES.ACTIVATION_KEYS).where("key_code", createdOrder.information_order).first();
      assert.ok(keyRow, "Mã key phải tồn tại trong warehouse.activation_keys");
      assert.equal(keyRow.status, "INACTIVE");
      assert.equal(Number(keyRow.product_name_id), Number(target.product_name_id));
      assert.equal(keyRow.target_variant_tag, target.variant_tag.trim());
      assert.equal(keyRow.id_order, testOrderId);
      await assert.rejects(
        activationKeyService.activateKeyWithTransaction({ keyCode: previewKey }),
        /chưa được thanh toán/
      );
      await db(TABLES.ORDER_LIST).where("id_order", testOrderId).update({ status: "PAID" });
      const paidKey = await db(TABLES.ACTIVATION_KEYS).where("key_code", previewKey).first();
      assert.equal(paidKey.status, "ACTIVATED");
      assert.equal(paidKey.account_slot_id, null);

      // 4. Nếu có slot trong kho, thử kích hoạt và kiểm tra order_list.slot được cập nhật
      const availableSlot = await db(TABLES.ACCOUNT_SLOTS)
        .where("name_id", target.product_name_id)
        .whereRaw("BTRIM(variant_tag) = ?", [target.variant_tag.trim()])
        .whereIn("status", ["AVAILABLE", "available"])
        .orderBy("id", "asc")
        .first();

      if (availableSlot) {
        const actRes = await activationKeyService.activateKeyWithTransaction({
          keyCode: createdOrder.information_order,
          customerInfo: "Khách kích hoạt test",
        });

        assert.equal(actRes.success, true);
        assert.ok(actRes.account);
        activatedSlot = availableSlot;

        const assignedSlot = await db(TABLES.ACCOUNT_SLOTS).where("id", availableSlot.id).first();
        assert.equal(assignedSlot.variant_tag.trim(), target.variant_tag.trim());

        const orderAfterAct = await db(TABLES.ORDER_LIST).where("id_order", testOrderId).first();
        assert.equal(orderAfterAct.slot, actRes.account, "Cột slot đơn hàng phải được ghi đè tài khoản thực tế");
        assert.equal(orderAfterAct.information_order, createdOrder.information_order, "Cột information_order vẫn giữ nguyên mã key");
      }
    } finally {
      // Dọn dẹp
      if (activatedSlot) {
        await db(TABLES.ACCOUNT_SLOTS).where("id", activatedSlot.id).update({
          status: activatedSlot.status,
          id_order: activatedSlot.id_order,
          customer: activatedSlot.customer,
          updated_at: activatedSlot.updated_at,
        });
      }
      await db(TABLES.ACTIVATION_KEYS).where("id_order", testOrderId).del();
      await db(TABLES.ORDER_LIST).where("id_order", testOrderId).del();
      await db(TABLES.ACTIVATION_KEY_RULES).where("id", rule.id).del();
    }
  });
});

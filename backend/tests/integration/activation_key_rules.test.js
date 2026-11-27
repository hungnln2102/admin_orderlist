require("module-alias/register");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { db } = require("../../src/db");
const { TABLES, COLS } = require("../../src/db/tables");
const activationKeyService = require("../../src/domains/products/services/activationKeyService");
const orderService = require("../../src/domains/orders/services/orderService");
const { resolveAdobeRecoveryOrder } = require("../../src/domains/system/services/adobeOrderSourceService");
const systemConfigService = require("../../src/domains/system/services/systemConfigService");

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

  it("Cấp thủ công đúng một key cho đơn khớp quy tắc, ghi outbox và theo dõi hạn của đơn", async () => {
    const suffix = randomUUID();
    const orderCode = `TEST-MANUAL-${suffix}`;
    const preservedCode = `TEST-PROVIDER-${suffix}`;
    const expiredAt = new Date(Date.now() + 86_400_000);
    const outboxQuery = () => db(TABLES.DOMAIN_EVENT_STORE)
      .whereRaw("?? ->> 'id_order' = ?", [COLS.DOMAIN_EVENT_STORE.PAYLOAD, orderCode]);
    const rule = await activationKeyService.saveActivationKeyRule({
      variant_id: variant.id, supplier_id: supplier.id, product_name_id: target.product_name_id,
      target_variant_tag: target.variant_tag, is_active: true,
    });
    try {
      await db(TABLES.ORDER_LIST).insert([
        { id_order: orderCode, customer: `Khách ${suffix}`, status: "PAID", expired_at: expiredAt,
          id_product: variant.id, supply_id: supplier.id },
        { id_order: preservedCode, information_order: "provider@example.test", status: "PAID",
          id_product: variant.id, supply_id: supplier.id },
      ]);
      const payload = { rule_id: rule.id, id_order: orderCode };
      assert.deepEqual(await activationKeyService.listEligibleOrders({ rule_id: rule.id, search: suffix }), [
        { id_order: orderCode, customer: `Khách ${suffix}` },
      ]);
      await assert.rejects(
        activationKeyService.createActivationKeys({ ...payload, id_order: preservedCode }),
        /không đủ điều kiện/,
      );
      const results = await Promise.allSettled([
        activationKeyService.createActivationKeys(payload),
        activationKeyService.createActivationKeys({ ...payload, id_order: ` ${orderCode.toUpperCase()} ` }),
      ]);
      assert.deepEqual(results.map(({ status }) => status).sort(), ["fulfilled", "rejected"]);
      const [key] = results.find(({ status }) => status === "fulfilled").value;
      assert.match(key.key_code, /^MAVKEY[A-Z0-9]{6}$/);
      assert.equal(key.target_variant_tag, target.variant_tag);
      assert.equal(key.customer_info, null);
      const orderQuery = () => db(TABLES.ORDER_LIST).where("id_order", orderCode);
      assert.equal((await orderQuery().first()).information_order, key.key_code);
      assert.equal((await outboxQuery()).length, 1);
      await assert.rejects(db(TABLES.ACTIVATION_KEYS).insert({
        key_code: activationKeyService.generateOrderActivationKey(), id_order: orderCode,
      }), { code: "23505", constraint: "uq_activation_key_order" });
      await assert.rejects(db(TABLES.ACTIVATION_KEYS).insert({
        key_code: activationKeyService.generateOrderActivationKey(), id_order: `ORPHAN-${suffix}`,
      }), { code: "23503", constraint: "fk_activation_key_order" });
      assert.deepEqual(await activationKeyService.listEligibleOrders({ rule_id: rule.id, search: suffix }), []);
      await assert.rejects(activationKeyService.deleteActivationKey(key.id), /đã gắn đơn hàng/);

      await orderQuery().update({ status: "EXPIRED" });
      await assert.rejects(activationKeyService.activateKeyWithTransaction({ keyCode: key.key_code }), /Đơn hàng đã hết hạn/);
      const expired = await activationKeyService.listActivationKeys({ search: suffix, status: "EXPIRED" });
      assert.equal(expired.pagination.total, 1);
      assert.equal(expired.data[0].status, "EXPIRED");
      assert.equal(expired.data[0].customer_info, `Khách ${suffix}`);
      assert.equal(new Date(expired.data[0].expired_at).toISOString().slice(0, 10), expiredAt.toISOString().slice(0, 10));
      assert.ok(expired.counts.expired >= 1);
      const available = await activationKeyService.listActivationKeys({ search: suffix, status: "AVAILABLE" });
      assert.equal(available.pagination.total, 0);
    } finally {
      await outboxQuery().del();
      await db(TABLES.ACTIVATION_KEYS).where("id_order", orderCode).del();
      await db(TABLES.ORDER_LIST).whereIn("id_order", [orderCode, preservedCode]).del();
      await db(TABLES.ACTIVATION_KEY_RULES).where("id", rule.id).del();
    }
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
      ["yuna", "adobe_check", "yuna_check", `Yuna-${tag}`],
      ["ades", "adobe_check", "fix_ades_status", `ades-${tag}@example.test`],
    ]) {
      const orderCode = `TEST-${source}-${tag}`.toUpperCase();
      const rule = { slot_key: slot, provider_key: provider, variant_id: variant.id, supplier_id: supplier.id };
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).insert({ ...rule, is_active: true });
      try {
        await activationKeyService.saveActivationKeyRule({
          variant_id: variant.id, supplier_id: supplier.id, product_name_id: target.product_name_id,
          target_variant_tag: target.variant_tag, is_active: true,
        });
        const order = await orderService.createOrder({
          id_order: orderCode, id_product: variant.id, supply_id: supplier.id, information_order: info,
          contact, status: "PAID", expired_at: "2099-01-01",
        });
        assert.equal(order.information_order, info);
        assert.equal(await db(TABLES.ACTIVATION_KEYS).where("id_order", orderCode).first(), undefined);
        const expected = { source, providerKey: provider, providerInput: info };
        assert.deepEqual(await resolveAdobeRecoveryOrder({ code: orderCode }), { contactRequired: true });
        await assert.rejects(resolveAdobeRecoveryOrder({ code: orderCode, contact: "wrong" }));
        assert.deepEqual(await resolveAdobeRecoveryOrder({ code: orderCode, contact }), expected);
        if (source === "yuna") {
          assert.deepEqual(await resolveAdobeRecoveryOrder({ code: info }), expected);
          assert.deepEqual(await resolveAdobeRecoveryOrder({ code: info.toLowerCase() }), { contactRequired: true });
        } else {
          assert.deepEqual(await resolveAdobeRecoveryOrder({ code: info }), { contactRequired: true });
          await assert.rejects(resolveAdobeRecoveryOrder({ code: info, contact: "wrong" }));
          assert.deepEqual(await resolveAdobeRecoveryOrder({ code: info, contact }), expected);
        }
        await db(TABLES.ORDER_LIST).where("id_order", orderCode).update({ status: "UNPAID" });
        assert.equal(await resolveAdobeRecoveryOrder({ code: info, contact }), null);
      } finally {
        await db(TABLES.ACTIVATION_KEY_RULES).where({ variant_id: variant.id, supplier_id: supplier.id }).del();
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
      const [key] = await db(TABLES.ACTIVATION_KEYS).insert({
        key_code: activationKeyService.generateOrderActivationKey(),
        product_name_id: product.id,
        id_order: orderCode,
      }).returning("*");
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
    const sharedOrderCode = `TEST-ADOBE-SHARED-${suffix}`;
    const contact = "package-customer@example.test";
    const expiredAt = new Date(Date.now() + 2 * 86_400_000);
    const [product] = await db(TABLES.PRODUCT_NAMES)
      .insert({ name: `Adobe Test ${suffix}` }).returning("id");
    const statusRule = {
      slot_key: "adobe_check", provider_key: "fix_ades_status", variant_id: variant.id, supplier_id: supplier.id,
    };
    const topicKey = "TELEGRAM_ADOBE_MISSING_SUBSCRIPTION_TOPIC_ID";
    const previousTopic = systemConfigService.get(topicKey, "");
    const outboxCols = COLS.NOTIFICATIONS_OUTBOX;
    const outboxQuery = () => db(TABLES.NOTIFICATIONS_OUTBOX)
      .where(outboxCols.EVENT_TYPE, "ADOBE_MISSING_SUBSCRIPTION")
      .where(outboxCols.IDEMPOTENCY_KEY, "like", `ADOBE_MISSING_SUBSCRIPTION:${orderCode}:%`);

    try {
      await systemConfigService.set(topicKey, "7244");
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).insert({ ...statusRule, is_active: true });
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
      await db(TABLES.ORDER_LIST).insert({
        id_order: orderCode, contact, status: "UNPAID", expired_at: expiredAt,
        id_product: variant.id, supply_id: supplier.id,
      });
      const [key] = await db(TABLES.ACTIVATION_KEYS).insert({
        key_code: activationKeyService.generateOrderActivationKey(),
        product_name_id: product.id,
        id_order: orderCode,
      }).returning("*");
      const keyQuery = () => db(TABLES.ACTIVATION_KEYS).where("id", key.id);
      const orderQuery = () => db(TABLES.ORDER_LIST).where("id_order", orderCode);
      await keyQuery().update({ target_variant_tag: suffix });
      await orderQuery().update({ status: "PAID" });
      const checkedCandidates = [];
      const validateReplacement = async ({ account, statusProviderKey }) => {
        assert.equal(statusProviderKey, "fix_ades_status");
        checkedCandidates.push(account);
        return { status_type: account.includes("expired-candidate") ? "expired" : "active" };
      };
      const recover = (recovery, byOrder = false) => activationKeyService.activateKeyWithTransaction({
        keyCode: byOrder ? orderCode : key.key_code,
        orderContact: byOrder ? contact : undefined,
        recovery,
        validateReplacement,
      });
      const initialExpired = await addSlot("expired-candidate-initial");
      const initialExpiredPackageId = await addPackage(initialExpired);
      const initial = await recover("check");
      assert.equal(initial.validatedStatus.status_type, "active");
      assert.ok(checkedCandidates.includes(initialExpired.account));
      assert.deepEqual(await db(TABLES.PACKAGE_PRODUCT).where("id", initialExpiredPackageId), []);
      assert.equal(initial.account, original.account);
      assert.equal(initial.statusProviderKey, "fix_ades_status");
      const initialKey = await keyQuery().first();
      assert.equal(initialKey.package_product_id, packageId);

      await keyQuery().update({ package_product_id: null, target_variant_tag: null });
      const packageQuery = () => db(TABLES.PACKAGE_PRODUCT).where("id", packageId);
      await packageQuery().update({ provider_by_slot: { adobe_check: "fix_ades_status" } });
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).where(statusRule).update({ is_active: false });
      const legacy = await recover("check");
      assert.equal(legacy.account, original.account);
      assert.equal(legacy.statusProviderKey, "fix_ades_status");
      assert.equal((await keyQuery().first()).package_product_id, packageId);
      await packageQuery().update({ provider_by_slot: null });
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).where(statusRule).update({ is_active: true });
      await keyQuery().update({ target_variant_tag: suffix });

      await db(TABLES.PACKAGE_PRODUCT).where("id", packageId)
        .update({ account_id: updated.accountId, account_slot_id: updated.id });
      const lookup = await recover("lookup", true);
      assert.equal(lookup.account, updated.account);
      assert.equal(lookup.statusProviderKey, "fix_ades_status");
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).where(statusRule).update({ is_active: false });
      assert.equal((await recover("lookup", true)).statusProviderKey, null);
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).where(statusRule).update({ is_active: true });
      await orderQuery().update({ supply_id: null });
      assert.equal((await recover("lookup", true)).statusProviderKey, null);
      await orderQuery().update({ supply_id: supplier.id });
      const updatedSlot = () => db(TABLES.ACCOUNT_SLOTS).where("id", updated.id);
      await updatedSlot().update({ status_check_enabled: true, status_provider_key: "test-slot-provider" });
      assert.equal((await recover("lookup", true)).statusProviderKey, "test-slot-provider");
      await updatedSlot().update({ status_check_enabled: false });
      assert.equal((await recover("lookup", true)).statusProviderKey, null);
      await updatedSlot().update({ status_provider_key: null });
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
        assert.equal(result.statusProviderKey, "fix_ades_status");
      }
      assert.equal(results.filter((result) => result.replaced).length, 1);
      const finalKey = await keyQuery().first();
      assert.equal(finalKey.package_product_id, replacementPackageId);
      assert.equal(finalKey.account_slot_id, replacement.id);
      assert.equal(finalKey.assigned_account, replacement.account);
      assert.deepEqual(finalKey.activated_at, initialKey.activated_at);
      assert.equal((await orderQuery().first()).slot, replacement.account);

      const replace = (previous) => activationKeyService.activateKeyWithTransaction({
        keyCode: orderCode, orderContact: contact, recovery: "replace", rejectedSlot: previous,
        validateReplacement,
      });
      const rejected = { id: results[0].slotId, account: results[0].account, reason: "not_found" };
      assert.equal(String(rejected.id), String(replacement.id));
      await db(TABLES.ORDER_LIST).insert({
        id_order: sharedOrderCode, contact, status: "PAID", expired_at: expiredAt,
        id_product: variant.id, supply_id: supplier.id, slot: replacement.account,
      });
      const [sharedKey] = await db(TABLES.ACTIVATION_KEYS).insert({
        key_code: activationKeyService.generateOrderActivationKey(),
        product_name_id: product.id,
        id_order: sharedOrderCode,
        status: "ACTIVATED",
        package_product_id: replacementPackageId,
        account_slot_id: replacement.id,
        assigned_account: replacement.account,
      }).returning("*");
      const stale = await replace({ id: updated.id, account: updated.account });
      assert.equal(stale.account, replacement.account);
      assert.deepEqual(await outboxQuery(), []);
      assert.deepEqual(await replace(rejected), { replacementRequired: true, outOfStock: true });
      const quarantinedKey = await keyQuery().first();
      assert.equal(quarantinedKey.package_product_id, null);
      assert.equal(quarantinedKey.account_slot_id, replacement.id);
      assert.equal(quarantinedKey.target_variant_tag, suffix);
      const sharedKeyQuery = () => db(TABLES.ACTIVATION_KEYS).where("id", sharedKey.id);
      const quarantinedShared = await sharedKeyQuery().first();
      assert.equal(quarantinedShared.package_product_id, null);
      assert.equal(quarantinedShared.account_slot_id, replacement.id);
      assert.equal(quarantinedShared.target_variant_tag, suffix);
      assert.deepEqual(await db(TABLES.PACKAGE_PRODUCT).where("id", replacementPackageId), []);
      assert.equal((await db(TABLES.ACCOUNTS).where("id", replacement.accountId).first()).account_username, replacement.account);
      const { findRoutingProviderForInput } = require("@/domains/system/services/portalSlotRoutingService");
      for (const input of [orderCode, key.key_code]) {
        assert.deepEqual(await findRoutingProviderForInput({ slotKey: "adobe_otp", input }), { disabled: true });
      }
      assert.equal((await orderQuery().first()).slot, replacement.account);
      const rejectedSlotQuery = () => db(TABLES.ACCOUNT_SLOTS).where("id", replacement.id);
      assert.equal((await rejectedSlotQuery().first()).status, "UNAVAILABLE");
      await assert.rejects(
        activationKeyService.activateKeyWithTransaction({ keyCode: key.key_code }),
        /đã ngừng cấp/
      );

      const expiredCandidate = await addSlot("expired-candidate");
      const expiredPackageId = await addPackage(expiredCandidate);
      const retry = (keyCode, orderContact) => activationKeyService.activateKeyWithTransaction({
        keyCode, orderContact, recovery: "check", validateReplacement,
      });
      assert.deepEqual(await retry(orderCode, contact), { replacementRequired: true, outOfStock: true });
      assert.ok(checkedCandidates.includes(expiredCandidate.account));
      assert.deepEqual(await db(TABLES.PACKAGE_PRODUCT).where("id", expiredPackageId), []);
      assert.equal((await db(TABLES.ACCOUNT_SLOTS).where("id", expiredCandidate.id).first()).status, "UNAVAILABLE");

      const newSlot = await addSlot("new-account");
      const newPackageId = await addPackage(newSlot);
      const retried = await Promise.all([retry(orderCode, contact), retry(key.key_code)]);
      assert.equal(retried.filter((result) => result.replaced).length, 1);
      for (const result of retried) {
        assert.equal(result.account, newSlot.account);
        assert.equal(String(result.slotId), String(newSlot.id));
      }
      assert.equal(retried.find((result) => result.replaced).validatedStatus.status_type, "active");
      assert.equal((await keyQuery().first()).package_product_id, newPackageId);
      assert.equal((await orderQuery().first()).slot, newSlot.account);
      const sharedReplacement = await addSlot("shared-replacement");
      const sharedPackageId = await addPackage(sharedReplacement);
      assert.equal((await retry(sharedOrderCode, contact)).account, sharedReplacement.account);
      assert.equal((await sharedKeyQuery().first()).package_product_id, sharedPackageId);
      assert.equal((await rejectedSlotQuery().first()).status, "UNAVAILABLE");
      const notifications = await outboxQuery();
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0][outboxCols.RECIPIENT], "7244");
      assert.equal(notifications[0][outboxCols.IDEMPOTENCY_KEY], `ADOBE_MISSING_SUBSCRIPTION:${orderCode}:${replacement.id}`);
    } finally {
      await outboxQuery().del();
      await systemConfigService.set(topicKey, previousTopic);
      await db(TABLES.ACTIVATION_KEYS).where("id_order", sharedOrderCode).del();
      await db(TABLES.ORDER_LIST).where("id_order", sharedOrderCode).del();
      await db(TABLES.ACTIVATION_KEYS).where("id_order", orderCode).del();
      await db(TABLES.ORDER_LIST).where("id_order", orderCode).del();
      await db(TABLES.PORTAL_SLOT_ROUTING_RULES).where(statusRule).del();
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
      assert.equal(keyRow.status, "AVAILABLE");
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
      await db(TABLES.ORDER_LIST).where("id_order", testOrderId).update({ status: "UNPAID" });
      assert.equal((await db(TABLES.ACTIVATION_KEYS).where("id", keyRow.id).first()).status, "AVAILABLE");
      await db(TABLES.ORDER_LIST).where("id_order", testOrderId).update({ status: "PAID" });

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

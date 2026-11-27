const { db, TABLES, COLS, withTransaction } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { getProviderConfig } = require("../providers/registry");

const PN = COLS.PRODUCT_NAMES;
const PRD = COLS.PRODUCT;
const V = COLS.VARIANT;
const SS = COLS.ACCOUNT_SLOTS;
const ACC = COLS.ACCOUNTS;
const RR = COLS.PORTAL_SLOT_ROUTING_RULES;
const SUP = COLS.SUPPLIER;
const SC = COLS.SUPPLIER_COST;
const ORD = COLS.ORDER_LIST;
const AK = COLS.ACTIVATION_KEYS;

const { providerDetails } = require("./productApiProviderDetails");

async function listRoutingRules() {
  const [rules, suppliers, supplierVariants] = await Promise.all([
    db(TABLES.PORTAL_SLOT_ROUTING_RULES + " as r")
      .leftJoin(TABLES.PRODUCT_NAMES + " as pn", "pn." + PN.ID, "r." + RR.PRODUCT_NAME_ID)
      .leftJoin(TABLES.SUPPLIER + " as s", "s." + SUP.ID, "r." + RR.SUPPLIER_ID)
      .leftJoin(TABLES.VARIANT + " as v", "v." + V.ID, "r." + RR.VARIANT_ID)
      .select(
        "r." + RR.ID + " as id",
        "r." + RR.SLOT_KEY + " as slot_key",
        "r." + RR.PRODUCT_NAME_ID + " as product_name_id",
        "r." + RR.SUPPLIER_ID + " as supplier_id",
        "r." + RR.VARIANT_ID + " as variant_id",
        "r." + RR.PROVIDER_KEY + " as provider_key",
        "r." + RR.IS_ACTIVE + " as is_active",
        "r." + RR.CREATED_AT + " as created_at",
        "r." + RR.UPDATED_AT + " as updated_at",
        "pn." + PN.NAME + " as product_name",
        "s." + SUP.SUPPLIER_NAME + " as supplier_name",
        "v." + V.VARIANT_NAME + " as variant_name",
        "v." + V.DISPLAY_NAME + " as variant_display_name"
      )
      .whereNotNull("r." + RR.VARIANT_ID)
      .orderBy("r." + RR.ID, "asc")
      .catch((err) => {
        console.warn("[ProductApi Service] Lỗi query portal_slot_routing_rules:", err.message);
        return [];
      }),
    db(TABLES.SUPPLIER)
      .select(SUP.ID + " as id", SUP.SUPPLIER_NAME + " as supplier_name")
      .where(SUP.ACTIVE_SUPPLY, true)
      .orderBy(SUP.SUPPLIER_NAME, "asc")
      .catch((err) => {
        console.warn("[ProductApi Service] Lỗi query supplier:", err.message);
        return [];
      }),
    db(TABLES.SUPPLIER_COST + " as sc")
      .join(TABLES.VARIANT + " as v", "v." + V.ID, "sc." + SC.VARIANT_ID)
      .join(TABLES.SUPPLIER + " as s", "s." + SUP.ID, "sc." + SC.SUPPLIER_ID)
      .leftJoin(TABLES.PRODUCT + " as p", "p." + PRD.ID, "v." + V.PRODUCT_ID)
      .where("s." + SUP.ACTIVE_SUPPLY, true)
      .select(
        "sc." + SC.ID + " as supplier_cost_id",
        "sc." + SC.SUPPLIER_ID + " as supplier_id",
        "v." + V.ID + " as variant_id",
        "v." + V.PRODUCT_ID + " as product_id",
        "p." + PRD.PACKAGE_NAME + " as product_name",
        "v." + V.VARIANT_NAME + " as variant_name",
        "v." + V.DISPLAY_NAME + " as variant_display_name",
        "v." + V.IS_ACTIVE + " as is_active"
      )
      .orderBy("v." + V.DISPLAY_NAME, "asc")
      .catch((err) => {
        console.warn("[ProductApi Service] Lỗi query supplierVariants:", err.message);
        return [];
      }),
  ]);

  return {
    rules: rules.map((rule) => {
      const provider = providerDetails(rule.provider_key) || {
        service_key: rule.provider_key,
        service_name: rule.provider_key,
        category: "OTP",
      };
      return {
        id: Number(rule.id),
        slot_key: rule.slot_key,
        supplier_id: Number(rule.supplier_id),
        supplier_name: rule.supplier_name || `NCC #${rule.supplier_id}`,
        variant_id: Number(rule.variant_id),
        variant_name: rule.variant_name || "",
        variant_display_name: rule.variant_display_name || rule.variant_name || `Variant #${rule.variant_id}`,
        provider_key: rule.provider_key,
        provider_name: provider.service_name,
        provider_category: provider.category,
        is_active: Boolean(rule.is_active),
        created_at: rule.created_at,
        updated_at: rule.updated_at,
      };
    }),
    suppliers: suppliers.map((supplier) => ({
      id: Number(supplier.id),
      supplier_name: supplier.supplier_name || `NCC #${supplier.id}`,
    })),
    supplierVariants: supplierVariants.map((variant) => ({
      supplier_cost_id: Number(variant.supplier_cost_id),
      supplier_id: Number(variant.supplier_id),
      variant_id: Number(variant.variant_id),
      product_id: Number(variant.product_id),
      product_name: variant.product_name || "",
      variant_name: variant.variant_name || "",
      variant_display_name: variant.variant_display_name || variant.variant_name || `Variant #${variant.variant_id}`,
      is_active: variant.is_active !== false,
    })),
  };
}

async function saveRoutingRuleVariants({ slotKey, supplierId, providerKey, variantIds, isActive = true }) {
  const cleanSlotKey = String(slotKey || "").trim();
  const suppId = Number(supplierId);
  const provKey = String(providerKey || "").trim();
  const uniqueVariantIds = [...new Set((Array.isArray(variantIds) ? variantIds : []).map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!cleanSlotKey) throw new Error("Vui lòng chọn Ô Input trên Web.");
  if (!Number.isInteger(suppId) || suppId <= 0) throw new Error("Vui lòng chọn Nhà Cung Cấp.");
  if (!provKey) throw new Error("Vui lòng chọn Cổng Provider cần gán.");
  if (uniqueVariantIds.length === 0) throw new Error("Vui lòng chọn ít nhất một variant cho NCC.");
  if (!getProviderConfig(provKey)) throw new Error("Provider đã chọn không tồn tại hoặc đã bị vô hiệu hóa.");

  return withTransaction(async (trx) => {
    const validVariants = await trx(TABLES.SUPPLIER_COST + " as sc")
      .join(TABLES.VARIANT + " as v", "v." + V.ID, "sc." + SC.VARIANT_ID)
      .where("sc." + SC.SUPPLIER_ID, suppId)
      .whereIn("sc." + SC.VARIANT_ID, uniqueVariantIds)
      .select("sc." + SC.VARIANT_ID + " as variant_id");
    const validIds = new Set(validVariants.map((variant) => Number(variant.variant_id)));
    if (validIds.size !== uniqueVariantIds.length) {
      throw new Error("Có variant không thuộc NCC đã chọn hoặc đã ngừng hoạt động.");
    }

    const existing = await trx(TABLES.PORTAL_SLOT_ROUTING_RULES)
      .where({
        [RR.SLOT_KEY]: cleanSlotKey,
        [RR.SUPPLIER_ID]: suppId,
        [RR.PROVIDER_KEY]: provKey,
      })
      .whereNotNull(RR.VARIANT_ID)
      .forUpdate();
    const existingByVariantId = new Map(existing.map((rule) => [Number(rule[RR.VARIANT_ID]), rule]));

    const idsToDelete = existing
      .filter((rule) => !validIds.has(Number(rule[RR.VARIANT_ID])))
      .map((rule) => Number(rule[RR.ID]));
    if (idsToDelete.length > 0) {
      await trx(TABLES.PORTAL_SLOT_ROUTING_RULES).whereIn(RR.ID, idsToDelete).delete();
    }

    for (const variantId of uniqueVariantIds) {
      const existingRule = existingByVariantId.get(variantId);
      if (existingRule) {
        await trx(TABLES.PORTAL_SLOT_ROUTING_RULES)
          .where(RR.ID, existingRule[RR.ID])
          .update({ [RR.IS_ACTIVE]: isActive !== false, [RR.UPDATED_AT]: trx.fn.now() });
        continue;
      }
      await trx(TABLES.PORTAL_SLOT_ROUTING_RULES).insert({
        [RR.SLOT_KEY]: cleanSlotKey,
        [RR.SUPPLIER_ID]: suppId,
        [RR.VARIANT_ID]: variantId,
        [RR.PROVIDER_KEY]: provKey,
        [RR.IS_ACTIVE]: isActive !== false,
        [RR.CREATED_AT]: trx.fn.now(),
        [RR.UPDATED_AT]: trx.fn.now(),
      });
    }

    return { success: true, message: "Đã lưu liên kết Provider, NCC và variant." };
  });
}

async function createRoutingRule(data) {
  return saveRoutingRuleVariants(data);
}

async function updateRoutingRule(ruleId, { isActive } = {}) {
  const id = Number(ruleId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID quy tắc không hợp lệ.");
  if (typeof isActive !== "boolean") throw new Error("Chỉ có thể thay đổi trạng thái On/Off của quy tắc.");

  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PORTAL_SLOT_ROUTING_RULES).where(RR.ID, id).first();
    if (!existing || !existing[RR.VARIANT_ID]) throw new Error("Không tìm thấy quy tắc variant #" + id + ".");
    await trx(TABLES.PORTAL_SLOT_ROUTING_RULES)
      .where(RR.ID, id)
      .update({ [RR.IS_ACTIVE]: isActive, [RR.UPDATED_AT]: trx.fn.now() });
    return { success: true, message: "Đã cập nhật trạng thái quy tắc." };
  });
}

async function deleteRoutingRule(ruleId) {
  const id = Number(ruleId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID quy tắc không hợp lệ.");

  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PORTAL_SLOT_ROUTING_RULES).where(RR.ID, id).first();
    if (!existing || !existing[RR.VARIANT_ID]) throw new Error("Không tìm thấy quy tắc variant #" + id + ".");
    await trx(TABLES.PORTAL_SLOT_ROUTING_RULES).where(RR.ID, id).delete();
    return { success: true, message: "Đã xóa liên kết variant." };
  });
}

async function deleteSupplierVariant({ supplierCostId, supplierId, variantId }) {
  const { deleteSupplierCost } = require("@/domains/products/services/productService");

  return withTransaction(async (trx) => {
    let targetScId = Number(supplierCostId);
    let targetSupplierId = Number(supplierId);
    let targetVariantId = Number(variantId);

    if (!targetScId && targetSupplierId && targetVariantId) {
      const found = await trx(TABLES.SUPPLIER_COST)
        .where({
          [SC.SUPPLIER_ID]: targetSupplierId,
          [SC.VARIANT_ID]: targetVariantId,
        })
        .first();
      if (found) {
        targetScId = Number(found[SC.ID]);
      }
    }

    if (!targetScId) {
      throw new Error("Không tìm thấy liên kết variant của NCC cần xóa.");
    }

    const scRow = await trx(TABLES.SUPPLIER_COST).where({ [SC.ID]: targetScId }).first();
    if (!scRow) {
      throw new Error("Bản ghi giá NCC không tồn tại hoặc đã bị xóa.");
    }

    targetSupplierId = Number(scRow[SC.SUPPLIER_ID]);
    targetVariantId = Number(scRow[SC.VARIANT_ID]);

    // Xóa trong supplier_cost qua productService để phát Domain Events đầy đủ
    await deleteSupplierCost(targetScId);

    // Dọn dẹp luôn các quy tắc điều phối cổng OTP liên quan tới NCC và variant này nếu có
    await trx(TABLES.PORTAL_SLOT_ROUTING_RULES)
      .where({
        [RR.SUPPLIER_ID]: targetSupplierId,
        [RR.VARIANT_ID]: targetVariantId,
      })
      .delete();

    return {
      success: true,
      message: "Đã xóa variant khỏi nhà cung cấp.",
      supplier_cost_id: targetScId,
      supplier_id: targetSupplierId,
      variant_id: targetVariantId,
    };
  });
}
function selectUniqueProviderRule(rules, providerColumn) {
  const providers = new Set(rules.map((rule) => rule[providerColumn]));
  if (providers.size > 1) throw new Error("Xung đột cấu hình provider cho cùng một liên kết OTP.");
  return rules[0];
}

function requireUniqueMatch(rows) {
  if (rows.length > 1) throw new Error("Có nhiều đơn hàng hoặc tài khoản khớp thông tin đã nhập.");
  return rows[0];
}

async function findRoutingProviderForInput({ slotKey, input }) {
  if (!slotKey || !input) return null;
  const cleanInput = String(input).trim().toLowerCase();
  if (!cleanInput) return null;

  const activationKey = requireUniqueMatch(await db(TABLES.ACTIVATION_KEYS)
    .select(AK.ACCOUNT_SLOT_ID, AK.ID_ORDER, AK.PACKAGE_PRODUCT_ID)
    .whereRaw("LOWER(TRIM(??)) = ?", [AK.KEY_CODE, cleanInput])
    .limit(2));

  const orderSelect = () => db(TABLES.ORDER_LIST)
    .select(ORD.ID_ORDER, ORD.ID_PRODUCT, ORD.SUPPLY_ID, ORD.INFORMATION_ORDER, ORD.STATUS);
  const boundOrderCode = activationKey?.[AK.ID_ORDER];
  const orderCodeInput = boundOrderCode ? String(boundOrderCode).trim().toLowerCase() : cleanInput;
  let order = requireUniqueMatch(await orderSelect()
    .whereRaw("LOWER(TRIM(??)) = ?", [ORD.ID_ORDER, orderCodeInput])
    .limit(2));

  if (boundOrderCode && !order) return null;
  const canceledStatuses = [ORDER_STATUS.CANCELED, "REFUNDED"];
  if (order && canceledStatuses.includes(order[ORD.STATUS])) return null;
  if (!order && !activationKey) {
    order = requireUniqueMatch(await orderSelect()
      .whereRaw("LOWER(TRIM(??)) = ?", [ORD.INFORMATION_ORDER, cleanInput])
      .whereNotIn(ORD.STATUS, canceledStatuses)
      .limit(2));
  }
  if (order?.[ORD.STATUS] === ORDER_STATUS.EXPIRED) return null;

  const orderCode = order?.[ORD.ID_ORDER] || null;
  if (slotKey === "adobe_otp") {
    const boundSlotId = activationKey?.[AK.ACCOUNT_SLOT_ID] ?? (orderCode
      ? requireUniqueMatch(await db(TABLES.ACTIVATION_KEYS)
        .select(AK.ACCOUNT_SLOT_ID)
        .where(AK.ID_ORDER, orderCode)
        .limit(2))?.[AK.ACCOUNT_SLOT_ID]
      : null);
    if (boundSlotId) {
      const boundSlot = await db(TABLES.ACCOUNT_SLOTS).where(SS.ID, boundSlotId).first(SS.STATUS);
      if (String(boundSlot?.[SS.STATUS] || "").toUpperCase() === "UNAVAILABLE") return { disabled: true };
    }
  }
  const packageId = activationKey?.[AK.PACKAGE_PRODUCT_ID] ?? (orderCode
    ? requireUniqueMatch(await db(TABLES.ACTIVATION_KEYS)
      .select(AK.PACKAGE_PRODUCT_ID)
      .where(AK.ID_ORDER, orderCode)
      .whereNotNull(AK.PACKAGE_PRODUCT_ID)
      .limit(2))?.[AK.PACKAGE_PRODUCT_ID]
    : null);
  if (packageId) {
    const P = COLS.PACKAGE_PRODUCT;
    const packageSlot = await db({ p: TABLES.PACKAGE_PRODUCT })
      .join({ ss: TABLES.ACCOUNT_SLOTS }, `ss.${SS.ID}`, `p.${P.ACCOUNT_SLOT_ID}`)
      .join({ a: TABLES.ACCOUNTS }, `a.${ACC.ID}`, `ss.${SS.ACCOUNT_ID}`)
      .where(`p.${P.ID}`, packageId)
      .first(`p.${P.PROVIDER_BY_SLOT}`, `a.${ACC.ACCOUNT_USERNAME}`);
    const providerKey = packageSlot?.[P.PROVIDER_BY_SLOT]?.[slotKey];
    const { getActiveSlots } = require("./otpPortalDispatcher");
    const configuredSlot = getActiveSlots().find((item) => item.slot_key === slotKey && item.enabled !== false);
    if (providerKey && configuredSlot?.assigned_services?.includes(providerKey)) {
      return {
        provider_key: providerKey,
        resolved_email: packageSlot[ACC.ACCOUNT_USERNAME],
        order_code: orderCode,
        match_type: "EXACT_PACKAGE_SLOT",
      };
    }
  }
  const capability = slotKey === "adobe_check" ? "status" : /(^|_)otp$|^netflix_/.test(slotKey) ? "otp" : null;
  if (capability) {
    const enabledColumn = capability === "status" ? SS.STATUS_CHECK_ENABLED : SS.OTP_ENABLED;
    const providerColumn = capability === "status" ? SS.STATUS_PROVIDER_KEY : SS.PROVIDER_KEY;
    const slotQuery = db(TABLES.STOCK_SERVICES + " as ss")
      .leftJoin(TABLES.ACCOUNTS + " as a", "a." + ACC.ID, "ss." + SS.ACCOUNT_ID)
      .select("ss." + enabledColumn, "ss." + providerColumn, "a." + ACC.ACCOUNT_USERNAME + " as slot_email");

    if (activationKey?.[AK.ACCOUNT_SLOT_ID]) {
      slotQuery.where("ss." + SS.ID, activationKey[AK.ACCOUNT_SLOT_ID]);
    } else if (orderCode) {
      slotQuery.where("ss." + SS.ID_ORDER, orderCode);
    } else {
      slotQuery.where(function () {
        this.whereRaw("LOWER(TRIM(??)) = ?", ["ss." + SS.CUSTOMER, cleanInput])
          .orWhereRaw("LOWER(TRIM(??)) = ?", ["ss." + SS.CONTACT, cleanInput])
          .orWhereRaw("LOWER(TRIM(??)) = ?", ["a." + ACC.ACCOUNT_USERNAME, cleanInput]);
      });
    }

    const slot = requireUniqueMatch(await slotQuery.limit(2));
    if (slot?.[enabledColumn] === false) return { disabled: true };
    if (slot?.[enabledColumn] === true && slot[providerColumn]) {
      return {
        provider_key: slot[providerColumn],
        resolved_email: slot.slot_email,
        order_code: orderCode,
        match_type: "EXACT_WAREHOUSE_CAPABILITY",
      };
    }
  }

  const supplierId = order?.[ORD.SUPPLY_ID];
  const variantId = order?.[ORD.ID_PRODUCT];
  if (!supplierId || !variantId) return null;

  const rules = await db(TABLES.PORTAL_SLOT_ROUTING_RULES)
    .select(RR.ID, RR.PROVIDER_KEY)
    .where({
      [RR.SLOT_KEY]: slotKey,
      [RR.SUPPLIER_ID]: supplierId,
      [RR.VARIANT_ID]: variantId,
      [RR.IS_ACTIVE]: true,
    })
    .orderBy(RR.ID, "asc");
  const rule = selectUniqueProviderRule(rules, RR.PROVIDER_KEY);
  if (!rule) return null;

  return {
    provider_key: rule[RR.PROVIDER_KEY],
    rule_id: Number(rule[RR.ID]),
    match_type: "EXACT_ORDER_VARIANT",
    supplier_id: Number(supplierId),
    variant_id: Number(variantId),
    resolved_email: order[ORD.INFORMATION_ORDER],
    order_code: orderCode,
  };
}
module.exports = {
  listRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  deleteSupplierVariant,
  findRoutingProviderForInput,
};

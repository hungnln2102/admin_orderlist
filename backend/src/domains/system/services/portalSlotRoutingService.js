const { db, TABLES, COLS, withTransaction } = require("@/db");
const { getProviderConfig } = require("../providers/registry");

const PN = COLS.PRODUCT_NAMES;
const PRD = COLS.PRODUCT;
const V = COLS.VARIANT;
const SS = COLS.ACCOUNT_SLOTS;
const RR = COLS.PORTAL_SLOT_ROUTING_RULES;
const SUP = COLS.SUPPLIER;
const SC = COLS.SUPPLIER_COST;
const ORD = COLS.ORDER_LIST;
const AK = COLS.ACTIVATION_KEYS;

const { normalizeKey, providerDetails } = require("./productApiProviderDetails");

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
async function findRoutingProviderForInput({ slotKey, input }) {
  if (!slotKey || !input) return null;
  const rawInput = String(input).trim();
  const cleanInput = rawInput.toLowerCase();
  if (!cleanInput) return null;

  try {
    const slotSelect = () => db(TABLES.STOCK_SERVICES + " as ss")
      .leftJoin(TABLES.ACCOUNTS + " as a", "a.id", "ss." + SS.ACCOUNT_ID)
      .select(
        "ss." + SS.ID + " as slot_id",
        "ss." + SS.NAME_ID + " as name_id",
        "ss." + SS.VARIANT_TAG + " as variant_tag",
        "ss." + SS.PROVIDER_KEY + " as slot_provider_key",
        "ss." + SS.OTP_ENABLED,
        "ss." + SS.STATUS_CHECK_ENABLED,
        "ss." + SS.STATUS_PROVIDER_KEY,
        "a.account_username as slot_email",
        "a.product_name_id as account_product_name_id"
      );

    const activationKey = await db(TABLES.ACTIVATION_KEYS)
      .select(AK.ACCOUNT_SLOT_ID, AK.ASSIGNED_ACCOUNT, AK.PRODUCT_NAME_ID, AK.ID_ORDER)
      .whereRaw("UPPER(TRIM(" + AK.KEY_CODE + ")) = ?", [rawInput.toUpperCase()])
      .first();

    let matchedSlot = null;
    let matchedProductNameId = Number(activationKey?.[AK.PRODUCT_NAME_ID]) || null;
    let matchedSupplierId = null;

    if (activationKey?.[AK.ACCOUNT_SLOT_ID]) {
      matchedSlot = await slotSelect()
        .where("ss." + SS.ID, Number(activationKey[AK.ACCOUNT_SLOT_ID]))
        .first();
    }

    if (!matchedSlot && activationKey?.[AK.ASSIGNED_ACCOUNT]) {
      const assignedAccount = String(activationKey[AK.ASSIGNED_ACCOUNT]).trim().toLowerCase();
      if (assignedAccount) {
        const assignedSlotQuery = slotSelect()
          .whereRaw("LOWER(a.account_username) = ?", [assignedAccount])
          .orderBy("ss." + SS.ID, "desc");
        if (matchedProductNameId) {
          assignedSlotQuery.where("a.product_name_id", matchedProductNameId);
        }
        matchedSlot = await assignedSlotQuery.first();
      }
    }

    if (!matchedSlot) {
      matchedSlot = await slotSelect()
        .where(function () {
          this.whereRaw("LOWER(ss." + SS.CUSTOMER + ") = ?", [cleanInput])
            .orWhereRaw("LOWER(ss." + SS.CONTACT + ") = ?", [cleanInput])
            .orWhereRaw("LOWER(a.account_username) = ?", [cleanInput]);
        })
        .orderBy("ss." + SS.ID, "desc")
        .first();
    }

    if (matchedSlot) {
      const capability = slotKey === "adobe_check" ? "status"
        : /_otp$|^netflix_/.test(slotKey) ? "otp" : null;
      const enabled = capability === "status" ? matchedSlot[SS.STATUS_CHECK_ENABLED]
        : capability === "otp" ? matchedSlot[SS.OTP_ENABLED] : null;
      if (enabled === false) return { disabled: true };
      const provider = capability === "status" ? matchedSlot[SS.STATUS_PROVIDER_KEY]
        : capability === "otp" ? matchedSlot.slot_provider_key : null;
      if (enabled === true && provider) return { provider_key: provider, resolved_email: matchedSlot.slot_email };
      matchedProductNameId = Number(matchedSlot.name_id || matchedSlot.account_product_name_id)
        || matchedProductNameId;
    }

    const linkedOrderId = activationKey?.[AK.ID_ORDER];
    const matchedOrders = await db(TABLES.ORDER_LIST)
      .select(ORD.ID, ORD.ID_ORDER, ORD.ID_PRODUCT, ORD.SUPPLY_ID, ORD.INFORMATION_ORDER, ORD.SLOT, ORD.STATUS)
      .where(function () {
        this.whereRaw("LOWER(" + ORD.INFORMATION_ORDER + ") = ?", [cleanInput])
          .orWhereRaw("LOWER(" + ORD.ID_ORDER + ") = ?", [cleanInput])
          .orWhereRaw("LOWER(" + ORD.SLOT + ") LIKE ?", [`%${cleanInput}%`]);
        if (linkedOrderId) this.orWhere(ORD.ID_ORDER, linkedOrderId);
      })
      .whereNotIn(ORD.STATUS, ["CANCELED", "REFUNDED"])
      .orderBy(ORD.ID, "desc")
      .limit(15);

    // Ưu tiên chọn đơn hàng có NCC/Variant đã được cấu hình cho slot_key này
    const slotRules = await db(TABLES.PORTAL_SLOT_ROUTING_RULES)
      .where({ [RR.SLOT_KEY]: slotKey, [RR.IS_ACTIVE]: true })
      .whereNotNull(RR.VARIANT_ID);
    const configuredSuppliers = new Set(slotRules.map((r) => Number(r[RR.SUPPLIER_ID])));
    const configuredVariants = new Set(slotRules.map((r) => Number(r[RR.VARIANT_ID])));

    let matchedOrder = matchedOrders.find(
      (o) => configuredSuppliers.has(Number(o[ORD.SUPPLY_ID])) && configuredVariants.has(Number(o[ORD.ID_PRODUCT]))
    );
    if (!matchedOrder) {
      matchedOrder = matchedOrders.find((o) => configuredSuppliers.has(Number(o[ORD.SUPPLY_ID])));
    }
    if (!matchedOrder) {
      matchedOrder = matchedOrders[0] || null;
    }

    const resolvedEmail = matchedOrder?.[ORD.INFORMATION_ORDER] || matchedSlot?.customer || null;
    const orderCode = matchedOrder?.[ORD.ID_ORDER] || linkedOrderId || null;
    const orderVariantId = matchedOrder?.[ORD.ID_PRODUCT] ? Number(matchedOrder[ORD.ID_PRODUCT]) : null;

    if (matchedOrder?.[ORD.SUPPLY_ID]) {
      matchedSupplierId = Number(matchedOrder[ORD.SUPPLY_ID]);
    }

    let matchedParentProductId = null;
    if (orderVariantId) {
      const matchedVariant = await db(TABLES.VARIANT).where(V.ID, orderVariantId).first();
      if (matchedVariant) {
        matchedParentProductId = matchedVariant[V.PRODUCT_ID] ? Number(matchedVariant[V.PRODUCT_ID]) : null;
      }
    }

    if (!matchedParentProductId && matchedProductNameId) {
      const productName = await db(TABLES.PRODUCT_NAMES)
        .select(PN.PRODUCT_ID)
        .where(PN.ID, matchedProductNameId)
        .first();
      matchedParentProductId = productName?.[PN.PRODUCT_ID]
        ? Number(productName[PN.PRODUCT_ID])
        : null;
    }

    if (matchedSupplierId) {
      const supplierRules = await db(TABLES.PORTAL_SLOT_ROUTING_RULES + " as r")
        .leftJoin(TABLES.VARIANT + " as v", "v." + V.ID, "r." + RR.VARIANT_ID)
        .where({
          ["r." + RR.SLOT_KEY]: slotKey,
          ["r." + RR.SUPPLIER_ID]: matchedSupplierId,
          ["r." + RR.IS_ACTIVE]: true,
        })
        .whereNotNull("r." + RR.VARIANT_ID)
        .select(
          "r." + RR.ID + " as rule_id",
          "r." + RR.PROVIDER_KEY + " as provider_key",
          "r." + RR.VARIANT_ID + " as variant_id",
          "v." + V.PRODUCT_ID + " as product_id",
          "v." + V.VARIANT_NAME + " as variant_name",
          "v." + V.DISPLAY_NAME + " as variant_display_name"
        )
        .orderBy("r." + RR.ID, "asc");

      if (supplierRules.length > 0) {
        // [Ưu tiên 1]: Khớp chính xác theo variant_id của đơn hàng
        if (orderVariantId) {
          const exactOrderRule = supplierRules.find((rule) => Number(rule.variant_id) === orderVariantId);
          if (exactOrderRule) {
            return {
              provider_key: exactOrderRule.provider_key,
              rule_id: Number(exactOrderRule.rule_id),
              match_type: "EXACT_ORDER_VARIANT",
              supplier_id: matchedSupplierId,
              variant_id: orderVariantId,
              resolved_email: resolvedEmail,
              order_code: orderCode,
            };
          }
        }

        // [Ưu tiên 2]: Khớp theo variant_tag của kho
        const normalizedVariantTag = normalizeKey(matchedSlot?.variant_tag);
        if (normalizedVariantTag) {
          const exactTagRule = supplierRules.find((rule) =>
            normalizeKey(rule.variant_name) === normalizedVariantTag
            || normalizeKey(rule.variant_display_name) === normalizedVariantTag
          );
          if (exactTagRule) {
            return {
              provider_key: exactTagRule.provider_key,
              rule_id: Number(exactTagRule.rule_id),
              match_type: "EXACT_SLOT_TAG_VARIANT",
              supplier_id: matchedSupplierId,
              variant_tag: matchedSlot?.variant_tag || null,
              resolved_email: resolvedEmail,
              order_code: orderCode,
            };
          }
        }

        // [Ưu tiên 3]: Khớp theo sản phẩm cha (product_id)
        if (matchedParentProductId) {
          const productRules = supplierRules.filter((rule) => Number(rule.product_id) === matchedParentProductId);
          if (productRules.length > 0) {
            return {
              provider_key: productRules[0].provider_key,
              rule_id: Number(productRules[0].rule_id),
              match_type: "PRODUCT_VARIANT_FALLBACK",
              supplier_id: matchedSupplierId,
              product_id: matchedParentProductId,
              resolved_email: resolvedEmail,
              order_code: orderCode,
            };
          }
        }

        // [Ưu tiên 4]: Fallback về cổng duy nhất nếu toàn bộ variant của NCC trỏ cùng 1 provider
        const uniqueProviderKeys = [...new Set(supplierRules.map((r) => r.provider_key))];
        if (uniqueProviderKeys.length === 1) {
          return {
            provider_key: uniqueProviderKeys[0],
            rule_id: Number(supplierRules[0].rule_id),
            match_type: "SUPPLIER_SINGLE_PROVIDER_FALLBACK",
            supplier_id: matchedSupplierId,
            resolved_email: resolvedEmail,
            order_code: orderCode,
          };
        }
      }
    }

    if (matchedProductNameId) {
      const legacyRules = await db(TABLES.PORTAL_SLOT_ROUTING_RULES)
        .where({
          [RR.SLOT_KEY]: slotKey,
          [RR.PRODUCT_NAME_ID]: matchedProductNameId,
          [RR.IS_ACTIVE]: true,
        })
        .whereNull(RR.VARIANT_ID)
        .orderBy(RR.ID, "asc");
      const exactSupplierRule = matchedSupplierId
        ? legacyRules.find((rule) => Number(rule[RR.SUPPLIER_ID]) === matchedSupplierId)
        : null;
      const defaultRule = legacyRules.find((rule) => !rule[RR.SUPPLIER_ID]);
      const legacyRule = exactSupplierRule || defaultRule || legacyRules[0];
      if (legacyRule) {
        return {
          provider_key: legacyRule[RR.PROVIDER_KEY],
          rule_id: Number(legacyRule[RR.ID]),
          match_type: exactSupplierRule ? "LEGACY_EXACT_SUPPLIER" : "LEGACY_FALLBACK",
          supplier_id: matchedSupplierId,
          product_name_id: matchedProductNameId,
        };
      }
    }

    const directProviderKey = slotKey === "adobe_check" && matchedSlot?.[SS.STATUS_CHECK_ENABLED] === true
      ? "" : String(matchedSlot?.slot_provider_key || "").trim();
    if (directProviderKey) {
      return {
        provider_key: directProviderKey,
        match_type: "DIRECT_SLOT_PROVIDER_FALLBACK",
        source: "WAREHOUSE_SLOT",
      };
    }
    return null;
  } catch (err) {
    console.warn("[ProductApi Service] Lỗi findRoutingProviderForInput:", err.message);
    throw err;
  }
}
module.exports = {
  listRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  deleteSupplierVariant,
  findRoutingProviderForInput,
};

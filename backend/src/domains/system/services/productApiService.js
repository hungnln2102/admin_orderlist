const { db, TABLES, COLS, withTransaction } = require("@/db");
const { getProviderConfig, listProviderCatalog } = require("../providers/registry");

const P = COLS.PRODUCT_API_CONFIGS;
const PN = COLS.PRODUCT_NAMES;
const PRD = COLS.PRODUCT;
const V = COLS.VARIANT;
const SS = COLS.ACCOUNT_SLOTS;
const RR = COLS.PORTAL_SLOT_ROUTING_RULES;
const SUP = COLS.SUPPLIER;
const SC = COLS.SUPPLIER_COST;
const ORD = COLS.ORDER_LIST;
const AK = COLS.ACTIVATION_KEYS;

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "");

function providerDetails(providerKey) {
  const provider = getProviderConfig(providerKey);
  if (!provider) return null;
  return {
    service_key: provider.service_key,
    service_name: provider.service_name,
    category: provider.category,
    description: provider.description || "",
    base_url: provider.base_url || "",
  };
}

function mappingItem(row) {
  const provider = providerDetails(row.provider_key);
  if (!provider) return null;
  return {
    mapping_id: Number(row.mapping_id),
    product_id: Number(row.product_id),
    provider_key: provider.service_key,
    ...provider,
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.mapping_active),
    api_active: true,
    sort_order: Number(row.sort_order || 0),
    note: row.mapping_note || "",
    mapped_at: row.mapped_at,
  };
}

async function resolveSystemProductIdInTrx(trx, requestedId) {
  const warehouseProduct = await trx(TABLES.PRODUCT_NAMES)
    .where(PN.ID, requestedId)
    .first();

  if (warehouseProduct) {
    if (warehouseProduct[PN.PRODUCT_ID]) {
      const existingSysProd = await trx(TABLES.PRODUCT)
        .where(PRD.ID, Number(warehouseProduct[PN.PRODUCT_ID]))
        .first();
      if (existingSysProd) {
        return Number(existingSysProd[PRD.ID]);
      }
    }

    const normName = normalizeKey(warehouseProduct[PN.NAME]);
    const sysProducts = await trx(TABLES.PRODUCT).select(PRD.ID, PRD.PACKAGE_NAME);
    const matched = sysProducts.find((item) => {
      const normPkg = normalizeKey(item[PRD.PACKAGE_NAME]);
      return normPkg && (normPkg === normName || normPkg.includes(normName) || normName.includes(normPkg));
    });

    if (matched) {
      await trx(TABLES.PRODUCT_NAMES)
        .where(PN.ID, warehouseProduct[PN.ID])
        .update({ [PN.PRODUCT_ID]: matched[PRD.ID], [PN.UPDATED_AT]: trx.fn.now() });
      return Number(matched[PRD.ID]);
    }

    const [createdSysProd] = await trx(TABLES.PRODUCT)
      .insert({
        [PRD.PACKAGE_NAME]: String(warehouseProduct[PN.NAME] || "").trim(),
        [PRD.IS_ACTIVE]: true,
        [PRD.CREATED_AT]: trx.fn.now(),
        [PRD.UPDATED_AT]: trx.fn.now(),
      })
      .returning("*");

    const newSysProdId = Number(createdSysProd[PRD.ID] || createdSysProd);
    await trx(TABLES.PRODUCT_NAMES)
      .where(PN.ID, warehouseProduct[PN.ID])
      .update({ [PN.PRODUCT_ID]: newSysProdId, [PN.UPDATED_AT]: trx.fn.now() });
    return newSysProdId;
  }

  const directSysProduct = await trx(TABLES.PRODUCT).where(PRD.ID, requestedId).first();
  if (directSysProduct) {
    return Number(directSysProduct[PRD.ID]);
  }

  throw new Error("Không tìm thấy sản phẩm kho hàng #" + requestedId + ".");
}

async function listProductApis() {
  const [warehouseProducts, sysProducts, slotRows, variants, mappings] = await Promise.all([
    db(TABLES.PRODUCT_NAMES + " as pn")
      .leftJoin(TABLES.PRODUCT + " as p", "p." + PRD.ID, "pn." + PN.PRODUCT_ID)
      .select(
        "pn." + PN.ID + " as id",
        "pn." + PN.NAME + " as name",
        "pn." + PN.CATEGORY + " as category",
        "pn." + PN.PRODUCT_ID + " as product_id",
        "pn." + PN.IS_PACKAGE + " as is_package",
        "pn." + PN.LOGIN_URL + " as login_url",
        "pn." + PN.REQUIRES_STORAGE + " as requires_storage",
        "p." + PRD.PACKAGE_NAME + " as system_product_name",
        "p." + PRD.IS_ACTIVE + " as system_product_active"
      )
      .orderBy("pn." + PN.ID, "asc"),
    db(TABLES.PRODUCT)
      .select(PRD.ID, PRD.PACKAGE_NAME, PRD.IS_ACTIVE)
      .orderBy(PRD.ID, "asc"),
    db(TABLES.STOCK_SERVICES)
      .select(SS.NAME_ID, SS.ACCOUNT_ID, SS.VARIANT_TAG, SS.STATUS),
    db(TABLES.VARIANT)
      .select(V.ID, V.PRODUCT_ID, V.VARIANT_NAME, V.DISPLAY_NAME, V.BASE_PRICE, V.IS_ACTIVE)
      .orderBy(V.ID, "asc"),
    db(TABLES.PRODUCT_API_CONFIGS + " as pac")
      .select(
        "pac." + P.ID + " as mapping_id",
        "pac." + P.PRODUCT_ID + " as product_id",
        "pac." + P.PROVIDER_KEY + " as provider_key",
        "pac." + P.IS_DEFAULT + " as is_default",
        "pac." + P.IS_ACTIVE + " as mapping_active",
        "pac." + P.SORT_ORDER + " as sort_order",
        "pac." + P.NOTE + " as mapping_note",
        "pac." + P.CREATED_AT + " as mapped_at"
      )
      .orderBy("pac." + P.SORT_ORDER, "asc")
      .orderBy("pac." + P.ID, "asc"),
  ]);

  const variantsBySysProduct = new Map();
  for (const variant of variants) {
    const productId = Number(variant[V.PRODUCT_ID]);
    if (!variantsBySysProduct.has(productId)) variantsBySysProduct.set(productId, []);
    variantsBySysProduct.get(productId).push(variant);
  }

  const apisBySysProduct = new Map();
  for (const row of mappings) {
    const item = mappingItem(row);
    if (!item) continue;
    if (!apisBySysProduct.has(item.product_id)) apisBySysProduct.set(item.product_id, []);
    apisBySysProduct.get(item.product_id).push(item);
  }

  const slotStatsByWarehouseId = new Map();
  for (const slot of slotRows) {
    const nameId = Number(slot[SS.NAME_ID]);
    if (!nameId) continue;
    if (!slotStatsByWarehouseId.has(nameId)) {
      slotStatsByWarehouseId.set(nameId, {
        accountIds: new Set(),
        availableAccountIds: new Set(),
        totalSlots: 0,
        availableSlots: 0,
        tags: new Set(),
      });
    }
    const entry = slotStatsByWarehouseId.get(nameId);
    entry.totalSlots += 1;
    if (slot[SS.ACCOUNT_ID]) entry.accountIds.add(Number(slot[SS.ACCOUNT_ID]));
    if (slot[SS.STATUS] === "AVAILABLE") {
      entry.availableSlots += 1;
      if (slot[SS.ACCOUNT_ID]) entry.availableAccountIds.add(Number(slot[SS.ACCOUNT_ID]));
    }
    const tag = String(slot[SS.VARIANT_TAG] || "").trim();
    if (tag) entry.tags.add(tag);
  }

  const productsResult = [];

  for (const pn of warehouseProducts) {
    const warehouseId = Number(pn.id);
    let resolvedSysProductId = pn.product_id ? Number(pn.product_id) : null;

    if (!resolvedSysProductId) {
      const normName = normalizeKey(pn.name);
      const matched = sysProducts.find((sp) => {
        const normSp = normalizeKey(sp[PRD.PACKAGE_NAME]);
        return normSp && (normSp === normName || normSp.includes(normName) || normName.includes(normSp));
      });
      if (matched) {
        resolvedSysProductId = Number(matched[PRD.ID]);
        await db(TABLES.PRODUCT_NAMES)
          .where(PN.ID, warehouseId)
          .update({ [PN.PRODUCT_ID]: resolvedSysProductId });
      }
    }

    const slotStat = slotStatsByWarehouseId.get(warehouseId) || {
      accountIds: new Set(),
      availableAccountIds: new Set(),
      totalSlots: 0,
      availableSlots: 0,
      tags: new Set(),
    };

    const warehouseTagsSet = new Set();
    if (pn.category && String(pn.category).trim()) {
      warehouseTagsSet.add(String(pn.category).trim());
    }
    slotStat.tags.forEach((t) => warehouseTagsSet.add(t));
    const warehouseTags = Array.from(warehouseTagsSet);

    const sysVariants = resolvedSysProductId
      ? variantsBySysProduct.get(resolvedSysProductId) || []
      : [];

    const combinedVariants =
      sysVariants.length > 0
        ? sysVariants
        : warehouseTags.map((tag, idx) => ({
            id: idx + 1,
            product_id: warehouseId,
            variant_name: tag,
            display_name: `${pn.name} - ${tag}`,
            base_price: 0,
            is_active: true,
          }));

    const productApis = resolvedSysProductId
      ? (apisBySysProduct.get(resolvedSysProductId) || []).map((api) => ({
          ...api,
          warehouse_product_id: warehouseId,
        }))
      : [];

    productsResult.push({
      id: warehouseId,
      system_product_id: resolvedSysProductId,
      package_name: pn.name,
      category: pn.category || "",
      is_package: Boolean(pn.is_package),
      requires_storage: Boolean(pn.requires_storage),
      login_url: pn.login_url || "",
      is_active: pn.system_product_active !== false,
      total_accounts: slotStat.accountIds.size,
      available_accounts: slotStat.availableAccountIds.size,
      total_slots: slotStat.totalSlots,
      available_slots: slotStat.availableSlots,
      warehouse_tags: warehouseTags,
      variants_count: combinedVariants.length,
      active_variants_count: combinedVariants.filter((v) => v.is_active !== false).length,
      variants: combinedVariants,
      apis: productApis,
    });
  }

  return {
    products: productsResult,
    availableApis: listProviderCatalog().map(({ key, name, category, description, enabled, configured, status }) => ({
      provider_key: key,
      service_key: key,
      service_name: name,
      category,
      description,
      is_active: enabled,
      configured: Boolean(configured),
      status: status || (configured ? "READY" : "NOT_CONFIGURED"),
    })),
  };
}

async function assignApiToProduct({ productId, providerKey, serviceKey, isDefault = false, sortOrder = 0, note = "" }) {
  const requestedId = Number(productId);
  const requestedProviderKey = String(providerKey || serviceKey || "").trim();
  const provider = providerDetails(requestedProviderKey);
  if (!Number.isInteger(requestedId) || requestedId <= 0) throw new Error("ID sản phẩm không hợp lệ.");
  if (!provider) throw new Error("Provider không hợp lệ hoặc đã bị loại bỏ.");

  return withTransaction(async (trx) => {
    const targetProductId = await resolveSystemProductIdInTrx(trx, requestedId);

    const existing = await trx(TABLES.PRODUCT_API_CONFIGS)
      .where({ [P.PRODUCT_ID]: targetProductId, [P.PROVIDER_KEY]: provider.service_key })
      .first();

    const values = {
      [P.IS_DEFAULT]: false,
      [P.IS_ACTIVE]: true,
      [P.SORT_ORDER]: Number(sortOrder) || 0,
      [P.NOTE]: String(note || ""),
      [P.UPDATED_AT]: trx.fn.now(),
    };

    if (existing) {
      const [updated] = await trx(TABLES.PRODUCT_API_CONFIGS)
        .where(P.ID, existing[P.ID])
        .update(values)
        .returning("*");
      return { success: true, mapping: updated, message: "Đã cập nhật mapping provider." };
    }

    const [created] = await trx(TABLES.PRODUCT_API_CONFIGS)
      .insert({
        [P.PRODUCT_ID]: targetProductId,
        [P.PROVIDER_KEY]: provider.service_key,
        ...values,
        [P.CREATED_AT]: trx.fn.now(),
      })
      .returning("*");

    return { success: true, mapping: created, message: "Đã gán provider cho sản phẩm kho hàng." };
  });
}

async function updateMapping(mappingId, { isActive, isDefault, sortOrder, note } = {}) {
  const id = Number(mappingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID mapping không hợp lệ.");
  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).first();
    if (!existing) throw new Error("Không tìm thấy mapping #" + id + ".");
    if (isDefault === true) {
      await trx(TABLES.PRODUCT_API_CONFIGS)
        .where(P.PRODUCT_ID, existing[P.PRODUCT_ID])
        .update({ [P.IS_DEFAULT]: false, [P.UPDATED_AT]: trx.fn.now() });
    }
    const update = { [P.UPDATED_AT]: trx.fn.now() };
    if (typeof isActive === "boolean") update[P.IS_ACTIVE] = isActive;
    if (typeof isDefault === "boolean") update[P.IS_DEFAULT] = isDefault;
    if (sortOrder !== undefined) update[P.SORT_ORDER] = Number(sortOrder) || 0;
    if (note !== undefined) update[P.NOTE] = String(note || "");
    const [updated] = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).update(update).returning("*");
    return { success: true, mapping: updated, message: "Đã cập nhật mapping." };
  });
}

async function setDefaultApi(mappingId) {
  return updateMapping(mappingId, { isDefault: true });
}

async function removeApiFromProduct(mappingId) {
  const id = Number(mappingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID mapping không hợp lệ.");
  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).first();
    if (!existing) throw new Error("Không tìm thấy mapping #" + id + ".");
    await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).delete();
    if (existing[P.IS_DEFAULT]) {
      const next = await trx(TABLES.PRODUCT_API_CONFIGS)
        .where(P.PRODUCT_ID, existing[P.PRODUCT_ID])
        .orderBy(P.SORT_ORDER, "asc")
        .orderBy(P.ID, "asc")
        .first();
      if (next) {
        await trx(TABLES.PRODUCT_API_CONFIGS)
          .where(P.ID, next[P.ID])
          .update({ [P.IS_DEFAULT]: true, [P.UPDATED_AT]: trx.fn.now() });
      }
    }
    return { success: true, message: "Đã gỡ provider khỏi sản phẩm." };
  });
}

async function getApisByProductMapping() {
  const [rows, variants, warehouseProducts] = await Promise.all([
    db(TABLES.PRODUCT_API_CONFIGS + " as pac")
      .join(TABLES.PRODUCT + " as p", "p." + PRD.ID, "pac." + P.PRODUCT_ID)
      .where("pac." + P.IS_ACTIVE, true)
      .select(
        "pac." + P.ID + " as mapping_id",
        "pac." + P.PRODUCT_ID + " as product_id",
        "pac." + P.PROVIDER_KEY + " as provider_key",
        "pac." + P.IS_DEFAULT + " as is_default",
        "pac." + P.SORT_ORDER + " as sort_order",
        "pac." + P.NOTE + " as mapping_note",
        "p." + PRD.PACKAGE_NAME + " as package_name"
      )
      .orderBy("pac." + P.SORT_ORDER, "asc")
      .orderBy("pac." + P.ID, "asc"),
    db(TABLES.VARIANT)
      .select(V.ID, V.PRODUCT_ID, V.VARIANT_NAME, V.DISPLAY_NAME)
      .where(V.IS_ACTIVE, true),
    db(TABLES.PRODUCT_NAMES)
      .select(PN.ID, PN.NAME, PN.CATEGORY, PN.PRODUCT_ID),
  ]);

  const byProductId = {};
  const byPackageName = {};
  for (const row of rows) {
    const item = mappingItem({ ...row, mapping_active: true });
    if (!item) continue;
    const productId = item.product_id;
    if (!byProductId[productId]) byProductId[productId] = [];
    byProductId[productId].push(item);
    const packageName = String(row.package_name || "").trim().toLowerCase();
    if (packageName) (byPackageName[packageName] ||= []).push(item);
  }

  const byVariantId = {};
  const byDisplayName = {};
  const byVariantName = {};

  for (const variant of variants) {
    const providers = byProductId[Number(variant[V.PRODUCT_ID])] || [];
    byVariantId[Number(variant[V.ID])] = providers;
    const displayName = String(variant[V.DISPLAY_NAME] || "").trim().toLowerCase();
    if (displayName && !byDisplayName[displayName]) byDisplayName[displayName] = providers;
    const variantName = String(variant[V.VARIANT_NAME] || "").trim().toLowerCase();
    if (variantName && !byVariantName[variantName]) byVariantName[variantName] = providers;
  }

  for (const pn of warehouseProducts) {
    const sysProdId = pn[PN.PRODUCT_ID] ? Number(pn[PN.PRODUCT_ID]) : null;
    if (!sysProdId || !byProductId[sysProdId]?.length) continue;
    const providers = byProductId[sysProdId];
    const whName = String(pn[PN.NAME] || "").trim().toLowerCase();
    if (whName) {
      if (!byDisplayName[whName]) byDisplayName[whName] = providers;
      if (!byPackageName[whName]) byPackageName[whName] = providers;
    }
    const whCategory = String(pn[PN.CATEGORY] || "").trim().toLowerCase();
    if (whCategory && !byVariantName[whCategory]) {
      byVariantName[whCategory] = providers;
    }
  }

  return {
    byProductId,
    byVariantId,
    byDisplayName,
    byVariantName,
    byPackageName,
    allApis: listProviderCatalog()
      .filter((provider) => provider.enabled)
      .map(({ key, name, category, description }) => ({
        provider_key: key,
        service_key: key,
        service_name: name,
        category,
        description,
      })),
  };
}

// ==========================================
// PORTAL SLOT ROUTING RULES (PHƯƠNG ÁN A)
// ==========================================

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
      .orderBy("r." + RR.ID, "asc"),
    db(TABLES.SUPPLIER)
      .select(SUP.ID + " as id", SUP.SUPPLIER_NAME + " as supplier_name")
      .where(SUP.ACTIVE_SUPPLY, true)
      .orderBy(SUP.SUPPLIER_NAME, "asc"),
    db(TABLES.SUPPLIER_COST + " as sc")
      .join(TABLES.VARIANT + " as v", "v." + V.ID, "sc." + SC.VARIANT_ID)
      .join(TABLES.SUPPLIER + " as s", "s." + SUP.ID, "sc." + SC.SUPPLIER_ID)
      .where("s." + SUP.ACTIVE_SUPPLY, true)
      .where("v." + V.IS_ACTIVE, true)
      .select(
        "sc." + SC.SUPPLIER_ID + " as supplier_id",
        "v." + V.ID + " as variant_id",
        "v." + V.PRODUCT_ID + " as product_id",
        "v." + V.VARIANT_NAME + " as variant_name",
        "v." + V.DISPLAY_NAME + " as variant_display_name"
      )
      .orderBy("v." + V.DISPLAY_NAME, "asc"),
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
      supplier_id: Number(variant.supplier_id),
      variant_id: Number(variant.variant_id),
      product_id: Number(variant.product_id),
      variant_name: variant.variant_name || "",
      variant_display_name: variant.variant_display_name || variant.variant_name || `Variant #${variant.variant_id}`,
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
      .where("v." + V.IS_ACTIVE, true)
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
      matchedProductNameId = Number(matchedSlot.name_id || matchedSlot.account_product_name_id)
        || matchedProductNameId;
    }

    const linkedOrderId = activationKey?.[AK.ID_ORDER];
    const matchedOrder = await db(TABLES.ORDER_LIST)
      .select(ORD.ID, ORD.ID_ORDER, ORD.ID_PRODUCT, ORD.SUPPLY_ID, ORD.INFORMATION_ORDER, ORD.SLOT, ORD.STATUS)
      .where(function () {
        this.whereRaw("LOWER(" + ORD.INFORMATION_ORDER + ") = ?", [cleanInput])
          .orWhereRaw("LOWER(" + ORD.ID_ORDER + ") = ?", [cleanInput])
          .orWhereRaw("LOWER(" + ORD.SLOT + ") LIKE ?", [`%${cleanInput}%`]);
        if (linkedOrderId) this.orWhere(ORD.ID_ORDER, linkedOrderId);
      })
      .whereNotIn(ORD.STATUS, ["CANCELED", "REFUNDED"])
      .orderBy(ORD.ID, "desc")
      .first();

    let matchedSystemProductId = matchedOrder?.[ORD.ID_PRODUCT]
      ? Number(matchedOrder[ORD.ID_PRODUCT])
      : null;
    if (matchedOrder?.[ORD.SUPPLY_ID]) {
      matchedSupplierId = Number(matchedOrder[ORD.SUPPLY_ID]);
    }
    if (!matchedSystemProductId && matchedProductNameId) {
      const productName = await db(TABLES.PRODUCT_NAMES)
        .select(PN.PRODUCT_ID)
        .where(PN.ID, matchedProductNameId)
        .first();
      matchedSystemProductId = productName?.[PN.PRODUCT_ID]
        ? Number(productName[PN.PRODUCT_ID])
        : null;
    }

    const normalizedVariantTag = normalizeKey(matchedSlot?.variant_tag);
    if (matchedSupplierId && matchedSystemProductId) {
      const variantRulesQuery = db(TABLES.PORTAL_SLOT_ROUTING_RULES + " as r")
        .join(TABLES.VARIANT + " as v", "v." + V.ID, "r." + RR.VARIANT_ID)
        .where({
          ["r." + RR.SLOT_KEY]: slotKey,
          ["r." + RR.SUPPLIER_ID]: matchedSupplierId,
          ["r." + RR.IS_ACTIVE]: true,
        })
        .whereNotNull("r." + RR.VARIANT_ID)
        .where("v." + V.PRODUCT_ID, matchedSystemProductId)
        .select("r." + RR.ID + " as rule_id", "r." + RR.PROVIDER_KEY + " as provider_key", "v." + V.VARIANT_NAME + " as variant_name", "v." + V.DISPLAY_NAME + " as variant_display_name")
        .orderBy("r." + RR.ID, "asc");
      const variantRules = await variantRulesQuery;
      const exactVariantRule = normalizedVariantTag
        ? variantRules.find((rule) =>
            normalizeKey(rule.variant_name) === normalizedVariantTag
            || normalizeKey(rule.variant_display_name) === normalizedVariantTag
          )
        : variantRules.length === 1
          ? variantRules[0]
          : null;
      if (exactVariantRule) {
        return {
          provider_key: exactVariantRule.provider_key,
          rule_id: Number(exactVariantRule.rule_id),
          match_type: "EXACT_SUPPLIER_VARIANT",
          supplier_id: matchedSupplierId,
          variant_tag: matchedSlot?.variant_tag || null,
        };
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

    const directProviderKey = String(matchedSlot?.slot_provider_key || "").trim();
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
    return null;
  }
}
module.exports = {
  listProductApis,
  assignApiToProduct,
  updateMapping,
  setDefaultApi,
  removeApiFromProduct,
  getApisByProductMapping,
  listRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  findRoutingProviderForInput,
};

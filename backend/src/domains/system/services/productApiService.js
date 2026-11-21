const { db, TABLES, COLS, withTransaction } = require("@/db");
const { listProviderCatalog } = require("../providers/registry");

const P = COLS.PRODUCT_API_CONFIGS;
const PN = COLS.PRODUCT_NAMES;
const PRD = COLS.PRODUCT;
const V = COLS.VARIANT;
const SS = COLS.ACCOUNT_SLOTS;

const { normalizeKey, providerDetails } = require("./productApiProviderDetails");
const routingService = require("./portalSlotRoutingService");

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

module.exports = {
  listProductApis,
  assignApiToProduct,
  updateMapping,
  setDefaultApi,
  removeApiFromProduct,
  getApisByProductMapping,
  ...routingService,
};

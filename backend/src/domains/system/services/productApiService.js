const { db, TABLES, COLS, withTransaction } = require("@/db");
const { getProviderConfig, listProviderCatalog } = require("../providers/registry");

const P = COLS.PRODUCT_API_CONFIGS;

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

async function listProductApis() {
  const [products, variants, mappings] = await Promise.all([
    db(TABLES.PRODUCT).select("id", "package_name", "is_active").orderBy("id", "asc"),
    db(TABLES.VARIANT).select("id", "product_id", "variant_name", "display_name", "base_price", "is_active").orderBy("id", "asc"),
    db(TABLES.PRODUCT_API_CONFIGS + " as pac").select(
      "pac." + P.ID + " as mapping_id", "pac." + P.PRODUCT_ID + " as product_id", "pac." + P.PROVIDER_KEY + " as provider_key",
      "pac." + P.IS_DEFAULT + " as is_default", "pac." + P.IS_ACTIVE + " as mapping_active", "pac." + P.SORT_ORDER + " as sort_order",
      "pac." + P.NOTE + " as mapping_note", "pac." + P.CREATED_AT + " as mapped_at"
    ).orderBy("pac." + P.SORT_ORDER, "asc").orderBy("pac." + P.ID, "asc"),
  ]);

  const variantsByProduct = new Map();
  for (const variant of variants) {
    const productId = Number(variant.product_id);
    if (!variantsByProduct.has(productId)) variantsByProduct.set(productId, []);
    variantsByProduct.get(productId).push(variant);
  }
  const apisByProduct = new Map();
  for (const row of mappings) {
    const item = mappingItem(row);
    if (!item) continue;
    if (!apisByProduct.has(item.product_id)) apisByProduct.set(item.product_id, []);
    apisByProduct.get(item.product_id).push(item);
  }
  return {
    products: products.map((product) => {
      const productId = Number(product.id);
      const productVariants = variantsByProduct.get(productId) || [];
      return { id: productId, package_name: product.package_name, is_active: Boolean(product.is_active), variants_count: productVariants.length, active_variants_count: productVariants.filter((variant) => variant.is_active !== false).length, variants: productVariants, apis: apisByProduct.get(productId) || [] };
    }),
    availableApis: listProviderCatalog().map(({ key, name, category, description, enabled }) => ({ provider_key: key, service_key: key, service_name: name, category, description, is_active: enabled })),
  };
}

async function assignApiToProduct({ productId, providerKey, serviceKey, isDefault = false, sortOrder = 0, note = "" }) {
  const productIdNumber = Number(productId);
  const requestedProviderKey = String(providerKey || serviceKey || "").trim();
  const provider = providerDetails(requestedProviderKey);
  if (!Number.isInteger(productIdNumber) || productIdNumber <= 0) throw new Error("ID sản phẩm không hợp lệ.");
  if (!provider) throw new Error("Provider không hợp lệ hoặc đã bị loại bỏ.");

  return withTransaction(async (trx) => {
    const product = await trx(TABLES.PRODUCT).where("id", productIdNumber).first();
    if (!product) throw new Error("Không tìm thấy sản phẩm #" + productIdNumber + ".");
    if (isDefault) await trx(TABLES.PRODUCT_API_CONFIGS).where(P.PRODUCT_ID, productIdNumber).update({ [P.IS_DEFAULT]: false, [P.UPDATED_AT]: trx.fn.now() });
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where({ [P.PRODUCT_ID]: productIdNumber, [P.PROVIDER_KEY]: provider.service_key }).first();
    const values = { [P.IS_DEFAULT]: Boolean(isDefault), [P.IS_ACTIVE]: true, [P.SORT_ORDER]: Number(sortOrder) || 0, [P.NOTE]: String(note || ""), [P.UPDATED_AT]: trx.fn.now() };
    if (existing) {
      const [updated] = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, existing[P.ID]).update(values).returning("*");
      return { success: true, mapping: updated, message: "Đã cập nhật mapping provider." };
    }
    const [created] = await trx(TABLES.PRODUCT_API_CONFIGS).insert({ [P.PRODUCT_ID]: productIdNumber, [P.PROVIDER_KEY]: provider.service_key, ...values, [P.CREATED_AT]: trx.fn.now() }).returning("*");
    return { success: true, mapping: created, message: "Đã gán provider cho sản phẩm." };
  });
}

async function updateMapping(mappingId, { isActive, isDefault, sortOrder, note } = {}) {
  const id = Number(mappingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID mapping không hợp lệ.");
  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).first();
    if (!existing) throw new Error("Không tìm thấy mapping #" + id + ".");
    if (isDefault === true) await trx(TABLES.PRODUCT_API_CONFIGS).where(P.PRODUCT_ID, existing[P.PRODUCT_ID]).update({ [P.IS_DEFAULT]: false, [P.UPDATED_AT]: trx.fn.now() });
    const update = { [P.UPDATED_AT]: trx.fn.now() };
    if (typeof isActive === "boolean") update[P.IS_ACTIVE] = isActive;
    if (typeof isDefault === "boolean") update[P.IS_DEFAULT] = isDefault;
    if (sortOrder !== undefined) update[P.SORT_ORDER] = Number(sortOrder) || 0;
    if (note !== undefined) update[P.NOTE] = String(note || "");
    const [updated] = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).update(update).returning("*");
    return { success: true, mapping: updated, message: "Đã cập nhật mapping." };
  });
}

async function setDefaultApi(mappingId) { return updateMapping(mappingId, { isDefault: true }); }

async function removeApiFromProduct(mappingId) {
  const id = Number(mappingId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID mapping không hợp lệ.");
  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).first();
    if (!existing) throw new Error("Không tìm thấy mapping #" + id + ".");
    await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, id).delete();
    if (existing[P.IS_DEFAULT]) {
      const next = await trx(TABLES.PRODUCT_API_CONFIGS).where(P.PRODUCT_ID, existing[P.PRODUCT_ID]).orderBy(P.SORT_ORDER, "asc").orderBy(P.ID, "asc").first();
      if (next) await trx(TABLES.PRODUCT_API_CONFIGS).where(P.ID, next[P.ID]).update({ [P.IS_DEFAULT]: true, [P.UPDATED_AT]: trx.fn.now() });
    }
    return { success: true, message: "Đã gỡ provider khỏi sản phẩm." };
  });
}

async function getApisByProductMapping() {
  const [rows, variants] = await Promise.all([
    db(TABLES.PRODUCT_API_CONFIGS + " as pac").join(TABLES.PRODUCT + " as p", "p.id", "pac." + P.PRODUCT_ID).where("pac." + P.IS_ACTIVE, true).select("pac." + P.ID + " as mapping_id", "pac." + P.PRODUCT_ID + " as product_id", "pac." + P.PROVIDER_KEY + " as provider_key", "pac." + P.IS_DEFAULT + " as is_default", "pac." + P.SORT_ORDER + " as sort_order", "pac." + P.NOTE + " as mapping_note", "p.package_name").orderBy("pac." + P.SORT_ORDER, "asc").orderBy("pac." + P.ID, "asc"),
    db(TABLES.VARIANT).select("id", "product_id", "variant_name", "display_name").where("is_active", true),
  ]);
  const byProductId = {}; const byPackageName = {};
  for (const row of rows) {
    const item = mappingItem({ ...row, mapping_active: true });
    if (!item) continue;
    const productId = item.product_id;
    if (!byProductId[productId]) byProductId[productId] = [];
    byProductId[productId].push(item);
    const packageName = String(row.package_name || "").trim().toLowerCase();
    if (packageName) (byPackageName[packageName] ||= []).push(item);
  }
  const byVariantId = {}; const byDisplayName = {}; const byVariantName = {};
  for (const variant of variants) {
    const providers = byProductId[Number(variant.product_id)] || [];
    byVariantId[Number(variant.id)] = providers;
    const displayName = String(variant.display_name || "").trim().toLowerCase(); if (displayName && !byDisplayName[displayName]) byDisplayName[displayName] = providers;
    const variantName = String(variant.variant_name || "").trim().toLowerCase(); if (variantName && !byVariantName[variantName]) byVariantName[variantName] = providers;
  }
  return { byProductId, byVariantId, byDisplayName, byVariantName, byPackageName, allApis: listProviderCatalog().filter((provider) => provider.enabled).map(({ key, name, category, description }) => ({ provider_key: key, service_key: key, service_name: name, category, description })) };
}

module.exports = { listProductApis, assignApiToProduct, updateMapping, setDefaultApi, removeApiFromProduct, getApisByProductMapping };

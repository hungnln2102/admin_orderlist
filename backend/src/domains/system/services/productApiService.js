const { db, TABLES, withTransaction } = require("@/db");

/**
 * Service quản lý Cấu Hình Gán API Cho Sản Phẩm (Product API Mapping)
 * Nguồn sự thật: business.product_api_configs kết hợp business.product, business.variant và external_api_configs
 */

/**
 * Lấy danh sách toàn bộ sản phẩm cùng các API được gán và danh sách biến thể con
 */
async function listProductApis() {
  // 1. Lấy toàn bộ sản phẩm cha (business.product)
  const products = await db(TABLES.PRODUCT)
    .select("id", "package_name", "is_active", "created_at", "updated_at")
    .orderBy("id", "asc");

  // 2. Lấy toàn bộ biến thể (business.variant)
  const variants = await db(TABLES.VARIANT)
    .select("id", "product_id", "variant_name", "display_name", "base_price", "is_active")
    .orderBy("id", "asc");

  // Map variants theo product_id
  const variantsByProduct = new Map();
  for (const v of variants) {
    const pId = Number(v.product_id);
    if (!variantsByProduct.has(pId)) variantsByProduct.set(pId, []);
    variantsByProduct.get(pId).push(v);
  }

  // 3. Lấy toàn bộ mapping product_api_configs joined external_api_configs
  const mappings = await db(`${TABLES.PRODUCT_API_CONFIGS} as pac`)
    .join(`${TABLES.EXTERNAL_API_CONFIGS} as eac`, "eac.id", "pac.api_config_id")
    .select(
      "pac.id as mapping_id",
      "pac.product_id",
      "pac.api_config_id",
      "pac.is_default",
      "pac.is_active as mapping_active",
      "pac.sort_order",
      "pac.note as mapping_note",
      "pac.created_at as mapped_at",
      "pac.updated_at as mapping_updated_at",
      "eac.service_key",
      "eac.service_name",
      "eac.category",
      "eac.description as api_description",
      "eac.base_url",
      "eac.is_active as api_active"
    )
    .orderBy("pac.sort_order", "asc")
    .orderBy("pac.id", "asc");

  const apisByProduct = new Map();
  for (const m of mappings) {
    const pId = Number(m.product_id);
    if (!apisByProduct.has(pId)) apisByProduct.set(pId, []);
    apisByProduct.get(pId).push({
      mapping_id: Number(m.mapping_id),
      product_id: Number(m.product_id),
      api_config_id: Number(m.api_config_id),
      is_default: Boolean(m.is_default),
      is_active: Boolean(m.mapping_active),
      sort_order: Number(m.sort_order || 0),
      note: m.mapping_note || "",
      mapped_at: m.mapped_at,
      service_key: m.service_key,
      service_name: m.service_name,
      category: m.category,
      base_url: m.base_url,
      description: m.api_description,
      api_active: Boolean(m.api_active),
    });
  }

  // 4. Lấy danh sách tất cả API configs khả dụng (external_api_configs)
  const availableApis = await db(TABLES.EXTERNAL_API_CONFIGS)
    .select("id", "service_key", "service_name", "category", "description", "base_url", "is_active")
    .orderBy("category", "asc")
    .orderBy("id", "asc");

  // Ghép cấu trúc trả về
  const resultProducts = products.map((prod) => {
    const pId = Number(prod.id);
    const prodVariants = variantsByProduct.get(pId) || [];
    const prodApis = apisByProduct.get(pId) || [];
    const activeVariantsCount = prodVariants.filter((v) => v.is_active !== false).length;

    return {
      id: pId,
      package_name: prod.package_name,
      is_active: Boolean(prod.is_active),
      variants_count: prodVariants.length,
      active_variants_count: activeVariantsCount,
      variants: prodVariants,
      apis: prodApis,
    };
  });

  return {
    products: resultProducts,
    availableApis,
  };
}

/**
 * Gán 1 cổng API vào Sản Phẩm (Create or Update Mapping)
 */
async function assignApiToProduct({ productId, apiConfigId, isDefault = false, sortOrder = 0, note = "" }) {
  const pId = Number(productId);
  const aId = Number(apiConfigId);

  if (!pId || isNaN(pId) || pId <= 0) throw new Error("ID sản phẩm (productId) không hợp lệ.");
  if (!aId || isNaN(aId) || aId <= 0) throw new Error("ID cấu hình API (apiConfigId) không hợp lệ.");

  return withTransaction(async (trx) => {
    // 1. Kiểm tra sản phẩm tồn tại
    const prod = await trx(TABLES.PRODUCT).where("id", pId).first();
    if (!prod) throw new Error(`Không tìm thấy sản phẩm #${pId}.`);

    // 2. Kiểm tra API config tồn tại
    const api = await trx(TABLES.EXTERNAL_API_CONFIGS).where("id", aId).first();
    if (!api) throw new Error(`Không tìm thấy cấu hình API #${aId}.`);

    // 3. Nếu đặt làm mặc định (isDefault = true), reset các mapping khác của sản phẩm này về false
    if (isDefault) {
      await trx(TABLES.PRODUCT_API_CONFIGS)
        .where("product_id", pId)
        .update({ is_default: false, updated_at: trx.fn.now() });
    }

    // 4. Kiểm tra mapping đã tồn tại chưa
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS)
      .where({ product_id: pId, api_config_id: aId })
      .first();

    let resultMapping;
    if (existing) {
      const [updated] = await trx(TABLES.PRODUCT_API_CONFIGS)
        .where("id", existing.id)
        .update({
          is_default: Boolean(isDefault),
          is_active: true,
          sort_order: Number(sortOrder || 0),
          note: note !== undefined ? String(note).trim() : existing.note,
          updated_at: trx.fn.now(),
        })
        .returning("*");
      resultMapping = updated;
    } else {
      const [inserted] = await trx(TABLES.PRODUCT_API_CONFIGS)
        .insert({
          product_id: pId,
          api_config_id: aId,
          is_default: Boolean(isDefault),
          is_active: true,
          sort_order: Number(sortOrder || 0),
          note: String(note || "").trim(),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning("*");
      resultMapping = inserted;
    }

    return {
      success: true,
      mapping: resultMapping,
      message: `Đã gán API "${api.service_name}" cho sản phẩm "${prod.package_name}".`,
    };
  });
}

/**
 * Cập nhật thuộc tính của 1 mapping (Default, Active, Sort Order, Note)
 */
async function updateMapping(mappingId, data = {}) {
  const mId = Number(mappingId);
  if (!mId || isNaN(mId) || mId <= 0) throw new Error("ID mapping không hợp lệ.");

  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where("id", mId).first();
    if (!existing) throw new Error(`Không tìm thấy mapping #${mId}.`);

    // Nếu chuyển thành is_default = true -> reset các mapping khác cùng product_id
    if (data.is_default === true) {
      await trx(TABLES.PRODUCT_API_CONFIGS)
        .where("product_id", existing.product_id)
        .whereNot("id", mId)
        .update({ is_default: false, updated_at: trx.fn.now() });
    }

    const updateData = { updated_at: trx.fn.now() };
    if (data.is_default !== undefined) updateData.is_default = Boolean(data.is_default);
    if (data.is_active !== undefined) updateData.is_active = Boolean(data.is_active);
    if (data.sort_order !== undefined) updateData.sort_order = Number(data.sort_order || 0);
    if (data.note !== undefined) updateData.note = String(data.note).trim();

    const [updated] = await trx(TABLES.PRODUCT_API_CONFIGS)
      .where("id", mId)
      .update(updateData)
      .returning("*");

    return {
      success: true,
      mapping: updated,
      message: "Đã cập nhật cấu hình mapping.",
    };
  });
}

/**
 * Đặt 1 cổng API làm mặc định cho sản phẩm
 */
async function setDefaultApi(mappingId) {
  const mId = Number(mappingId);
  if (!mId || isNaN(mId) || mId <= 0) throw new Error("ID mapping không hợp lệ.");

  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where("id", mId).first();
    if (!existing) throw new Error(`Không tìm thấy mapping #${mId}.`);

    // Reset tất cả về false
    await trx(TABLES.PRODUCT_API_CONFIGS)
      .where("product_id", existing.product_id)
      .update({ is_default: false, updated_at: trx.fn.now() });

    // Set bản ghi này thành true
    const [updated] = await trx(TABLES.PRODUCT_API_CONFIGS)
      .where("id", mId)
      .update({ is_default: true, updated_at: trx.fn.now() })
      .returning("*");

    return {
      success: true,
      mapping: updated,
      message: "Đã thiết lập cổng API mặc định thành công.",
    };
  });
}

/**
 * Gỡ bỏ 1 cổng API khỏi sản phẩm
 */
async function removeApiFromProduct(mappingId) {
  const mId = Number(mappingId);
  if (!mId || isNaN(mId) || mId <= 0) throw new Error("ID mapping không hợp lệ.");

  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_API_CONFIGS).where("id", mId).first();
    if (!existing) throw new Error(`Không tìm thấy mapping #${mId}.`);

    await trx(TABLES.PRODUCT_API_CONFIGS).where("id", mId).delete();

    // Nếu vừa xóa mapping mặc định, tự động gán mapping đầu tiên còn lại làm mặc định nếu có
    if (existing.is_default) {
      const nextRemaining = await trx(TABLES.PRODUCT_API_CONFIGS)
        .where("product_id", existing.product_id)
        .orderBy("sort_order", "asc")
        .orderBy("id", "asc")
        .first();

      if (nextRemaining) {
        await trx(TABLES.PRODUCT_API_CONFIGS)
          .where("id", nextRemaining.id)
          .update({ is_default: true, updated_at: trx.fn.now() });
      }
    }

    return {
      success: true,
      message: `Đã gỡ bỏ cổng API khỏi sản phẩm.`,
    };
  });
}

/**
 * Trả về Dictionary Mapping nhẹ phục vụ frontend dropdown (Order modal, Warehouse modal...)
 */
async function getApisByProductMapping() {
  // Lấy các mapping đang active và API config đang active
  const rows = await db(`${TABLES.PRODUCT_API_CONFIGS} as pac`)
    .join(`${TABLES.EXTERNAL_API_CONFIGS} as eac`, "eac.id", "pac.api_config_id")
    .join(`${TABLES.PRODUCT} as p`, "p.id", "pac.product_id")
    .where("pac.is_active", true)
    .where("eac.is_active", true)
    .select(
      "pac.id as mapping_id",
      "pac.product_id",
      "pac.api_config_id",
      "pac.is_default",
      "pac.sort_order",
      "pac.note",
      "eac.service_key",
      "eac.service_name",
      "eac.category",
      "eac.description",
      "p.package_name"
    )
    .orderBy("pac.sort_order", "asc")
    .orderBy("pac.id", "asc");

  // Nạp danh sách variants để map variant_id -> apis
  const variants = await db(TABLES.VARIANT)
    .select("id", "product_id", "variant_name", "display_name")
    .where("is_active", true);

  const byProductId = {};
  const byPackageName = {};

  for (const r of rows) {
    const pId = Number(r.product_id);
    const item = {
      mapping_id: Number(r.mapping_id),
      api_config_id: Number(r.api_config_id),
      service_key: r.service_key,
      service_name: r.service_name,
      category: r.category,
      description: r.description || "",
      is_default: Boolean(r.is_default),
      sort_order: Number(r.sort_order || 0),
      note: r.note || "",
    };

    if (!byProductId[pId]) byProductId[pId] = [];
    byProductId[pId].push(item);

    const pkgLower = String(r.package_name || "").trim().toLowerCase();
    if (pkgLower) {
      if (!byPackageName[pkgLower]) byPackageName[pkgLower] = [];
      byPackageName[pkgLower].push(item);
    }
  }

  const byVariantId = {};
  const byDisplayName = {};
  const byVariantName = {};

  for (const v of variants) {
    const vId = Number(v.id);
    const pId = Number(v.product_id);
    const apis = byProductId[pId] || [];

    byVariantId[vId] = apis;

    const dName = String(v.display_name || "").trim().toLowerCase();
    if (dName && !byDisplayName[dName]) {
      byDisplayName[dName] = apis;
    }

    const vName = String(v.variant_name || "").trim().toLowerCase();
    if (vName && !byVariantName[vName]) {
      byVariantName[vName] = apis;
    }
  }

  // Danh sách toàn bộ external APIs active để UI có thể fallback
  const allApis = await db(TABLES.EXTERNAL_API_CONFIGS)
    .select("id", "service_key", "service_name", "category", "description")
    .where("is_active", true)
    .orderBy("service_name", "asc");

  return {
    byProductId,
    byVariantId,
    byDisplayName,
    byVariantName,
    byPackageName,
    allApis,
  };
}

module.exports = {
  listProductApis,
  assignApiToProduct,
  updateMapping,
  setDefaultApi,
  removeApiFromProduct,
  getApisByProductMapping,
};


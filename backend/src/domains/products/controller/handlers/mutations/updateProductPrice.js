const { db } = require("@/db");
const { quoteIdent } = require("@/utils/sql");
const {
  normalizeTextInput,
  toNullableNumber,
} = require("@/utils/normalizers");
const logger = require("@/utils/logger");
const { mapProductPriceRow } = require("@/domains/products/controller/mappers");
const {
  variantCols,
  productSchemaCols,
  productCategoryCols,
  TABLES,
} = require("@/domains/products/controller/constants");
const { getTiers } = require("@/services/pricing/tierCache");
const { writeUserEventLog } = require("@/domains/renew-adobe/services/systemEventLogService");
const {
  fetchVariantView,
  hasProductCategoryColor,
  normalizeCategoryColors,
  normalizeCategoryIds,
  pickCategoryColor,
} = require("@/domains/products/controller/handlers/mutations/shared");

const validateUpdateInput = (productId, _body) => {
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw { status: 400, error: "ID sản phẩm không hợp lệ." };
  }
  return parsedId;
};

const getProductSchemaId = async (parsedId) => {
  const variantRes = await db.raw(
    `
    SELECT ${quoteIdent(variantCols.productId)} AS product_id
    FROM ${TABLES.variant}
    WHERE id = ?
    LIMIT 1;
  `,
    [parsedId]
  );
  if (!variantRes.rows || !variantRes.rows.length) {
    throw { status: 404, error: "Không tìm thấy sản phẩm." };
  }
  return variantRes.rows[0]?.product_id || null;
};

const handlePackageNameUpdate = async (productSchemaId, packageName) => {
  if (packageName === undefined) return;
  const normalizedPackageName = normalizeTextInput(packageName);
  if (!normalizedPackageName) {
    throw { status: 400, error: "Tên sản phẩm không được để trống." };
  }
  if (!productSchemaId) {
    throw { status: 400, error: "Không xác định được sản phẩm (product) để đổi tên gói." };
  }
  await db(TABLES.product)
    .where(productSchemaCols.id, productSchemaId)
    .update({
      [productSchemaCols.packageName]: normalizedPackageName,
    });
};

const buildVariantUpdatePayload = (body, variantImageInput) => {
  const variantUpdates = [];
  const variantValues = [];
  const addVariantUpdate = (column, value) => {
    variantUpdates.push(`${quoteIdent(column)} = ?`);
    variantValues.push(value);
  };

  const { sanPham, packageProduct, basePrice, base_price, is_active } = body;

  if (sanPham !== undefined) {
    const normalized = normalizeTextInput(sanPham);
    if (!normalized) {
      throw { status: 400, error: "sanPham không được để trống." };
    }
    addVariantUpdate(variantCols.displayName, normalized);
  }
  if (packageProduct !== undefined) {
    addVariantUpdate(variantCols.variantName, normalizeTextInput(packageProduct) || null);
  }
  if (basePrice !== undefined || base_price !== undefined) {
    addVariantUpdate(variantCols.basePrice, toNullableNumber(basePrice ?? base_price));
  }
  if (is_active !== undefined) {
    const isActive =
      typeof is_active === "boolean"
        ? is_active
        : !(String(is_active || "").trim().toLowerCase() === "false");
    addVariantUpdate(variantCols.isActive, isActive);
  }
  if (variantImageInput !== undefined) {
    addVariantUpdate(
      variantCols.imageUrl,
      normalizeTextInput(variantImageInput) || null
    );
  }

  return { variantUpdates, variantValues };
};

const updateVariantMargins = async (parsedId, body) => {
  const { pctCtv, pctKhach, pctPromo, pctStu, pct_stu } = body;
  const pctStuInput = pctStu !== undefined ? pctStu : pct_stu;
  const marginUpdates = [
    { key: "ctv", value: pctCtv },
    { key: "customer", value: pctKhach },
    { key: "promo", value: pctPromo },
    { key: "student", value: pctStuInput },
  ].filter((m) => m.value !== undefined);

  if (marginUpdates.length === 0) return false;

  const tiers = await getTiers();
  for (const { key, value } of marginUpdates) {
    const tier = tiers.find((t) => t.key === key);
    if (!tier) continue;
    const ratio = toNullableNumber(value);
    await db.raw(
      `INSERT INTO ${TABLES.variantMargin} (variant_id, tier_id, price)
       VALUES (?, ?, ?)
       ON CONFLICT (variant_id, tier_id)
       DO UPDATE SET price = EXCLUDED.price`,
      [parsedId, tier.id, ratio]
    );
  }

  try {
    const { syncRenewalOrdersPriceForVariant } = require("@/services/pricing/syncRenewalPricing");
    await syncRenewalOrdersPriceForVariant(parsedId);
  } catch (syncErr) {
    logger.error("[Pricing][Sync] Failed to sync renewal prices after updateProductPrice", { error: syncErr.message });
  }

  return true;
};

const updateProductImageUrl = async (targetProductId, imageUrl) => {
  if (!targetProductId || imageUrl === undefined) return;
  const productUpdates = [];
  const productValues = [];
  productUpdates.push(`${quoteIdent(productSchemaCols.imageUrl)} = ?`);
  productValues.push(normalizeTextInput(imageUrl) || null);

  await db.raw(
    `
    UPDATE ${TABLES.product}
    SET ${productUpdates.join(", ")}
    WHERE ${quoteIdent(productSchemaCols.id)} = ?;
  `,
    [...productValues, targetProductId]
  );
};

const updateProductCategories = async (targetProductId, normalizedCategoryIds, colorOverrides) => {
  if (!targetProductId || !Array.isArray(normalizedCategoryIds)) return;

  let existingColors = null;
  if (hasProductCategoryColor) {
    const colorRes = await db.raw(
      `
      SELECT
        ${quoteIdent(productCategoryCols.categoryId)} AS category_id,
        ${quoteIdent(productCategoryCols.color)} AS color
      FROM ${TABLES.productCategory}
      WHERE ${quoteIdent(productCategoryCols.productId)} = ?;
    `,
      [targetProductId]
    );

    existingColors = new Map(
      (colorRes.rows || [])
        .map((row) => {
          const id = Number(
            row.category_id ?? row[productCategoryCols.categoryId]
          );
          const color = row.color ?? row[productCategoryCols.color] ?? null;
          return Number.isFinite(id) && color ? [id, color] : null;
        })
        .filter(Boolean)
    );
  }

  await db.raw(
    `
    DELETE FROM ${TABLES.productCategory}
    WHERE ${quoteIdent(productCategoryCols.productId)} = ?;
  `,
    [targetProductId]
  );

  if (normalizedCategoryIds.length) {
    const rows = normalizedCategoryIds.map((categoryId) => {
      const row = {
        [productCategoryCols.productId]: targetProductId,
        [productCategoryCols.categoryId]: categoryId,
      };
      if (hasProductCategoryColor) {
        row[productCategoryCols.color] = pickCategoryColor(
          categoryId,
          colorOverrides,
          existingColors
        );
      }
      return row;
    });
    await db(TABLES.productCategory).insert(rows);
  }
};

const handleUpdateError = (res, error, productId) => {
  logger.error("Update failed (PATCH /api/product-prices/:productId)", {
    productId,
    error: error.message,
    stack: error.stack,
  });
  const code = error && error.code;
  const constraint = error && error.constraint;
  if (code === "23505" && constraint) {
    if (String(constraint).includes("package_name")) {
      return res.status(400).json({
        error:
          "Tên Gói Sản Phẩm không được trùng theo ràng buộc DB. Nếu đúng rule (Tên/Gói có thể trùng, chỉ Mã SP là unique): chạy migration database/migrations/003_drop_product_package_name_unique.sql.",
      });
    }
    if (
      String(constraint).toLowerCase().includes("display_name") ||
      String(constraint).toLowerCase().includes("variant")
    ) {
      return res.status(400).json({
        error: "Mã Sản Phẩm đã tồn tại. Vui lòng chọn mã khác.",
      });
    }
  }
  const message =
    error && error.message
      ? String(error.message)
      : "Không thể cập nhật giá sản phẩm.";
  res.status(500).json({ error: message });
};

const updateProductPrice = async (req, res) => {
  const { productId } = req.params;
  const {
    packageName,
    categoryIds,
    categoryColors,
    imageUrl,
    variantImageUrl,
    variant_image_url,
  } = req.body || {};
  const variantImageInput =
    variantImageUrl !== undefined ? variantImageUrl : variant_image_url;
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds);
  const colorOverrides = normalizeCategoryColors(categoryColors);

  try {
    const parsedId = validateUpdateInput(productId, req.body);
    const productSchemaId = await getProductSchemaId(parsedId);
    const targetProductId = productSchemaId;

    await handlePackageNameUpdate(productSchemaId, packageName);

    const { variantUpdates, variantValues } = buildVariantUpdatePayload(req.body, variantImageInput);
    const hasMarginUpdates = await updateVariantMargins(parsedId, req.body);

    if (
      !variantUpdates.length &&
      !hasMarginUpdates &&
      packageName === undefined &&
      imageUrl === undefined &&
      variantImageInput === undefined &&
      !Array.isArray(normalizedCategoryIds)
    ) {
      return res.status(400).json({ error: "Không có trường nào để cập nhật." });
    }

    if (variantUpdates.length) {
      variantUpdates.push(`${quoteIdent(variantCols.updatedAt)} = NOW()`);
      await db.raw(
        `
        UPDATE ${TABLES.variant}
        SET ${variantUpdates.join(", ")}
        WHERE id = ?;
      `,
        [...variantValues, parsedId]
      );
    }

    await updateProductImageUrl(targetProductId, imageUrl);
    await updateProductCategories(targetProductId, normalizedCategoryIds, colorOverrides);

    const viewRow = await fetchVariantView(parsedId);
    const mapped = viewRow ? mapProductPriceRow(viewRow) : {};

    const eventBus = require("@/events/eventBus");
    const EVENTS = require("@/events/eventTypes");
    eventBus.emit(EVENTS.PRODUCT_PRICE_UPDATED, { price: mapped });
    writeUserEventLog(req, {
      action: "Sua bang gia san pham",
      entity: "Bang gia",
      entityId: parsedId,
      message: `Sua bang gia san pham ${mapped?.san_pham || productId}`,
      source: "products.product_prices",
      metadata: {
        productId: parsedId,
        productCode: mapped?.san_pham || null,
        changedFields: Object.keys(req.body || {}),
      },
    });
    res.json(mapped);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.error });
    }
    handleUpdateError(res, error, productId);
  }
};

module.exports = {
  updateProductPrice,
};

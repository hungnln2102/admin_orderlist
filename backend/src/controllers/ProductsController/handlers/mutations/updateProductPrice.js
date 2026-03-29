const { db } = require("../../../../db");
const { quoteIdent } = require("../../../../utils/sql");
const {
  normalizeTextInput,
  toNullableNumber,
} = require("../../../../utils/normalizers");
const logger = require("../../../../utils/logger");
const { mapProductPriceRow } = require("../../mappers");
const {
  variantCols,
  productSchemaCols,
  productCategoryCols,
  TABLES,
} = require("../../constants");
const {
  fetchVariantView,
  hasProductCategoryColor,
  normalizeCategoryColors,
  normalizeCategoryIds,
  pickCategoryColor,
} = require("./shared");

const updateProductPrice = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  }

  const {
    packageName,
    packageProduct,
    sanPham,
    categoryIds,
    categoryColors,
    pctCtv,
    pctKhach,
    pctPromo,
    is_active,
    imageUrl,
  } = req.body || {};
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds);
  const colorOverrides = normalizeCategoryColors(categoryColors);

  try {
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
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    const productSchemaId = variantRes.rows[0]?.product_id || null;

    const variantUpdates = [];
    const variantValues = [];
    const addVariantUpdate = (column, value) => {
      variantUpdates.push(`${quoteIdent(column)} = ?`);
      variantValues.push(value);
    };

    if (sanPham !== undefined) {
      const normalized = normalizeTextInput(sanPham);
      if (!normalized) {
        return res.status(400).json({ error: "sanPham không được để trống." });
      }
      addVariantUpdate(variantCols.displayName, normalized);
    }
    if (packageProduct !== undefined) {
      addVariantUpdate(variantCols.variantName, normalizeTextInput(packageProduct) || null);
    }
    if (is_active !== undefined) {
      const isActive =
        typeof is_active === "boolean"
          ? is_active
          : !(String(is_active || "").trim().toLowerCase() === "false");
      addVariantUpdate(variantCols.isActive, isActive);
    }
    if (pctCtv !== undefined) {
      addVariantUpdate(variantCols.pctCtv, toNullableNumber(pctCtv));
    }
    if (pctKhach !== undefined) {
      addVariantUpdate(variantCols.pctKhach, toNullableNumber(pctKhach));
    }
    if (pctPromo !== undefined) {
      addVariantUpdate(variantCols.pctPromo, toNullableNumber(pctPromo));
    }

    if (
      !variantUpdates.length &&
      packageName === undefined &&
      imageUrl === undefined &&
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

    if (productSchemaId && (packageName !== undefined || imageUrl !== undefined)) {
      const productUpdates = [];
      const productValues = [];
      if (packageName !== undefined) {
        productUpdates.push(`${quoteIdent(productSchemaCols.packageName)} = ?`);
        productValues.push(normalizeTextInput(packageName) || null);
      }
      if (imageUrl !== undefined) {
        productUpdates.push(`${quoteIdent(productSchemaCols.imageUrl)} = ?`);
        productValues.push(normalizeTextInput(imageUrl) || null);
      }
      if (productUpdates.length) {
        await db.raw(
          `
          UPDATE ${TABLES.product}
          SET ${productUpdates.join(", ")}
          WHERE ${quoteIdent(productSchemaCols.id)} = ?;
        `,
          [...productValues, productSchemaId]
        );
      }
    }

    if (productSchemaId && Array.isArray(normalizedCategoryIds)) {
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
          [productSchemaId]
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
        [productSchemaId]
      );
      if (normalizedCategoryIds.length) {
        const rows = normalizedCategoryIds.map((categoryId) => {
          const row = {
            [productCategoryCols.productId]: productSchemaId,
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
    }

    const viewRow = await fetchVariantView(parsedId);
    res.json(viewRow ? mapProductPriceRow(viewRow) : {});
  } catch (error) {
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
  }
};

module.exports = {
  updateProductPrice,
};

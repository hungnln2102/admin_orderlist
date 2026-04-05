const { db } = require("../../../../db");
const {
  normalizeTextInput,
  toNullableNumber,
} = require("../../../../utils/normalizers");
const logger = require("../../../../utils/logger");
const { mapProductPriceRow } = require("../../mappers");
const { ensureSupplyRecord, upsertSupplyPrice } = require("../../finders");
const {
  productSchemaCols,
  productCategoryCols,
  variantCols,
  productDescCols,
  TABLES,
} = require("../../constants");
const {
  fetchVariantView,
  hasProductCategoryColor,
  isVariantPkeyConflict,
  normalizeCategoryColors,
  normalizeCategoryIds,
  pickCategoryColor,
  resetVariantSequence,
} = require("./shared");

const createProductPrice = async (req, res) => {
  const {
    packageName,
    packageProduct,
    sanPham,
    basePrice,
    base_price,
    categoryIds,
    categoryColors,
    pctCtv,
    pctKhach,
    pctPromo,
    pctStu,
    pct_stu,
    is_active,
    suppliers,
  } = req.body || {};
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds);
  const colorOverrides = normalizeCategoryColors(categoryColors);

  const productCode = normalizeTextInput(sanPham);
  if (!productCode) {
    return res.status(400).json({ error: "sanPham là bắt buộc." });
  }

  const rawPackageName = normalizeTextInput(packageName);
  const normalizedPackageName =
    rawPackageName && rawPackageName.length > 0
      ? rawPackageName
      : `__pkg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const pctCtvVal = toNullableNumber(pctCtv);
  const pctKhachVal = toNullableNumber(pctKhach);
  const pctPromoVal = toNullableNumber(pctPromo);
  const pctStuVal = toNullableNumber(
    pctStu !== undefined ? pctStu : pct_stu
  );
  const basePriceVal = toNullableNumber(basePrice ?? base_price);
  const isActive =
    typeof is_active === "boolean"
      ? is_active
      : !(String(is_active || "").trim().toLowerCase() === "false");

  try {
    let inserted = null;
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        inserted = await db.transaction(async (trx) => {
          let productId = null;
          if (rawPackageName && rawPackageName.length > 0) {
            const existing = await trx(TABLES.product)
              .select("id")
              .where(productSchemaCols.packageName, normalizedPackageName)
              .first();
            productId = existing?.id ?? existing?.ID ?? null;
          }
          if (!productId) {
            const productPayload = {
              [productSchemaCols.packageName]: normalizedPackageName,
            };
            const productInsert = await trx(TABLES.product)
              .insert(productPayload)
              .returning("id");
            productId = productInsert?.[0]?.id ?? productInsert?.[0]?.ID ?? null;
          }
          if (!productId) {
            throw new Error("Unable to resolve product id.");
          }

          if (Array.isArray(normalizedCategoryIds) && normalizedCategoryIds.length) {
            const rows = normalizedCategoryIds.map((categoryId) => {
              const row = {
                [productCategoryCols.productId]: productId,
                [productCategoryCols.categoryId]: categoryId,
              };
              if (hasProductCategoryColor) {
                row[productCategoryCols.color] = pickCategoryColor(
                  categoryId,
                  colorOverrides
                );
              }
              return row;
            });
            await trx(TABLES.productCategory)
              .insert(rows)
              .onConflict([
                productCategoryCols.productId,
                productCategoryCols.categoryId,
              ])
              .ignore();
          }

          const descRows = await trx(TABLES.productDesc)
            .insert({
              [productDescCols.rules]: null,
              [productDescCols.description]: null,
              [productDescCols.shortDesc]: null,
            })
            .returning("id");
          const descVariantId =
            descRows?.[0]?.id ?? descRows?.[0]?.ID ?? null;
          if (!descVariantId) {
            throw new Error("Unable to create desc_variant row.");
          }

          const variantInsert = await trx(TABLES.variant)
            .insert({
              [variantCols.productId]: productId,
              [variantCols.displayName]: productCode,
              [variantCols.variantName]: normalizeTextInput(packageProduct) || null,
              [variantCols.isActive]: isActive,
              [variantCols.descVariantId]: descVariantId,
              [variantCols.basePrice]: basePriceVal,
              [variantCols.pctCtv]: pctCtvVal,
              [variantCols.pctKhach]: pctKhachVal,
              [variantCols.pctPromo]: pctPromoVal,
              [variantCols.pctStu]: pctStuVal,
            })
            .returning("id");
          const variantId = variantInsert?.[0]?.id || variantInsert?.[0]?.ID;

          if (Array.isArray(suppliers) && suppliers.length) {
            for (const supplier of suppliers) {
              const sourceIdRaw =
                supplier?.sourceId !== undefined ? supplier.sourceId : supplier?.id;
              const sourceNameRaw =
                supplier?.sourceName !== undefined
                  ? supplier.sourceName
                  : supplier?.name;
              const supplyId = Number.isFinite(Number(sourceIdRaw))
                ? Number(sourceIdRaw)
                : await ensureSupplyRecord(
                    sourceNameRaw,
                    supplier?.numberBank,
                    supplier?.binBank
                  );
              if (!supplyId) continue;
              const priceValue = toNullableNumber(supplier?.price);
              await upsertSupplyPrice({ variantId }, supplyId, priceValue, trx);
            }
          }

          return variantId;
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0 && isVariantPkeyConflict(error)) {
          await resetVariantSequence();
          continue;
        }
        throw error;
      }
    }

    if (!inserted) {
      throw lastError;
    }

    const viewRow = await fetchVariantView(inserted);
    res.status(201).json(viewRow ? mapProductPriceRow(viewRow) : {});
  } catch (error) {
    logger.error("Insert failed (POST /api/product-prices)", {
      error: error.message,
      stack: error.stack,
    });
    const code = error && error.code;
    const constraint = error && error.constraint;
    if (code === "23505" && constraint) {
      if (
        String(constraint).toLowerCase().includes("display_name") ||
        String(constraint).toLowerCase().includes("variant")
      ) {
        return res.status(400).json({
          error: "Mã Sản Phẩm đã tồn tại. Vui lòng chọn mã khác.",
        });
      }
      if (String(constraint).includes("package_name")) {
        return res.status(400).json({
          error:
            "Tên Gói Sản Phẩm không được trùng theo ràng buộc DB. Nếu đúng rule (Tên/Gói có thể trùng, chỉ Mã SP là unique): chạy migration database/migrations/003_drop_product_package_name_unique.sql.",
        });
      }
    }
    const message =
      error && error.message
        ? String(error.message)
        : "Không thể tạo giá sản phẩm.";
    const status =
      message.includes("Unable to resolve") || message.includes("bắt buộc")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
};

module.exports = {
  createProductPrice,
};

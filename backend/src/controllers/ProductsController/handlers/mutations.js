const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const { normalizeTextInput, toNullableNumber } = require("../../../utils/normalizers");
const { mapProductPriceRow } = require("../mappers");
const { ensureSupplyRecord, upsertSupplyPrice } = require("../finders");
const {
  productCols,
  variantCols,
  productSchemaCols,
  productDescCols,
  priceConfigCols,
  supplyPriceCols,
  categoryCols,
  productCategoryCols,
  TABLES,
} = require("../constants");
const logger = require("../../../utils/logger");

const fetchVariantView = async (variantId) => {
  const query = `
    SELECT
      v.id AS id,
      v.${quoteIdent(variantCols.displayName)} AS id_product,
      v.${quoteIdent(variantCols.displayName)} AS san_pham,
      v.${quoteIdent(variantCols.variantName)} AS package_product,
      p.${quoteIdent(productSchemaCols.packageName)} AS package,
      COALESCE(pd.desc_image_url, p.${quoteIdent(productSchemaCols.imageUrl)}) AS image_url,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', c.${quoteIdent(categoryCols.id)},
            'name', c.${quoteIdent(categoryCols.name)},
            'color', c.${quoteIdent(categoryCols.color)}
          )
        ) FILTER (WHERE c.${quoteIdent(categoryCols.id)} IS NOT NULL),
        '[]'::json
      ) AS categories,
      pc.${quoteIdent(priceConfigCols.pctCtv)} AS pct_ctv,
      pc.${quoteIdent(priceConfigCols.pctKhach)} AS pct_khach,
      pc.${quoteIdent(priceConfigCols.pctPromo)} AS pct_promo,
      v.${quoteIdent(variantCols.isActive)} AS is_active,
      pc.${quoteIdent(priceConfigCols.updatedAt)} AS update,
      spagg.max_supply_price AS max_supply_price
    FROM ${TABLES.variant} v
    LEFT JOIN ${TABLES.product} p
      ON p.${quoteIdent(productCols.id)} = v.${quoteIdent(variantCols.productId)}
    LEFT JOIN LATERAL (
      SELECT pd2.${quoteIdent(productDescCols.imageUrl)} AS desc_image_url
      FROM ${TABLES.productDesc} pd2
      WHERE TRIM(pd2.${quoteIdent(productDescCols.productId)}::text) = TRIM(v.${quoteIdent(variantCols.displayName)}::text)
      ORDER BY pd2.${quoteIdent(productDescCols.id)} DESC
      LIMIT 1
    ) pd ON TRUE
    LEFT JOIN ${TABLES.productCategory} pcj
      ON pcj.${quoteIdent(productCategoryCols.productId)} = p.${quoteIdent(productCols.id)}
    LEFT JOIN ${TABLES.category} c
      ON c.${quoteIdent(categoryCols.id)} = pcj.${quoteIdent(productCategoryCols.categoryId)}
    LEFT JOIN LATERAL (
      SELECT
        pc.${quoteIdent(priceConfigCols.pctCtv)},
        pc.${quoteIdent(priceConfigCols.pctKhach)},
        pc.${quoteIdent(priceConfigCols.pctPromo)},
        pc.${quoteIdent(priceConfigCols.updatedAt)}
      FROM ${TABLES.priceConfig} pc
      WHERE pc.${quoteIdent(priceConfigCols.variantId)} = v.id
      ORDER BY pc.${quoteIdent(priceConfigCols.updatedAt)} DESC NULLS LAST
      LIMIT 1
    ) pc ON TRUE
    LEFT JOIN LATERAL (
      SELECT MAX(sp.${quoteIdent(supplyPriceCols.price)}) AS max_supply_price
      FROM ${TABLES.supplyPrice} sp
      WHERE sp.${quoteIdent(supplyPriceCols.productId)} = v.id
    ) spagg ON TRUE
    WHERE v.id = ?
    GROUP BY
      v.id,
      v.${quoteIdent(variantCols.displayName)},
      v.${quoteIdent(variantCols.variantName)},
      p.${quoteIdent(productSchemaCols.packageName)},
      p.${quoteIdent(productSchemaCols.imageUrl)},
      pd.desc_image_url,
      pc.${quoteIdent(priceConfigCols.pctCtv)},
      pc.${quoteIdent(priceConfigCols.pctKhach)},
      pc.${quoteIdent(priceConfigCols.pctPromo)},
      v.${quoteIdent(variantCols.isActive)},
      pc.${quoteIdent(priceConfigCols.updatedAt)},
      spagg.max_supply_price
    LIMIT 1;
  `;
  const res = await db.raw(query, [variantId]);
  return res.rows && res.rows[0] ? res.rows[0] : null;
};

const isVariantPkeyConflict = (error) =>
  error && error.code === "23505" && error.constraint === "variant_pkey";

const normalizeCategoryIds = (input) => {
  if (!Array.isArray(input)) return null;
  const normalized = input
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  return Array.from(new Set(normalized));
};

const CATEGORY_COLORS = [
  "#facc15",
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#f43f5e",
  "#14b8a6",
  "#eab308",
];

const hasProductCategoryColor = Boolean(productCategoryCols.color);

const normalizeCategoryColors = (input) => {
  if (!input) return new Map();
  const map = new Map();
  if (Array.isArray(input)) {
    input.forEach((entry) => {
      const id = Number(
        entry?.id ?? entry?.categoryId ?? entry?.category_id ?? NaN
      );
      const color = String(entry?.color ?? "").trim();
      if (Number.isFinite(id) && color) {
        map.set(id, color);
      }
    });
    return map;
  }
  if (typeof input === "object") {
    Object.entries(input).forEach(([key, value]) => {
      const id = Number(key);
      const color = String(value ?? "").trim();
      if (Number.isFinite(id) && color) {
        map.set(id, color);
      }
    });
  }
  return map;
};

const pickCategoryColor = (categoryId, overrides, existing) => {
  const id = Number(categoryId);
  if (overrides && overrides.has(id)) {
    return overrides.get(id);
  }
  if (existing && existing.has(id)) {
    return existing.get(id);
  }
  const index = Number.isFinite(id) ? Math.abs(id) % CATEGORY_COLORS.length : 0;
  return CATEGORY_COLORS[index];
};

const resetVariantSequence = async () => {
  const tableRef = TABLES.variant;
  const idColumn = variantCols.id || "id";
  await db.raw(
    `
    SELECT setval(
      pg_get_serial_sequence(?, ?),
      COALESCE((SELECT MAX(${quoteIdent(idColumn)}) FROM ${tableRef}), 0)
    );
  `,
    [tableRef, idColumn]
  );
};

const createProductPrice = async (req, res) => {
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
    suppliers,
  } = req.body || {};
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds);
  const colorOverrides = normalizeCategoryColors(categoryColors);

  const productCode = normalizeTextInput(sanPham);
  if (!productCode) {
    return res.status(400).json({ error: "sanPham là bắt buộc." });
  }

  // Use unique placeholder when package name is empty so product insert always returns an id
  const rawPackageName = normalizeTextInput(packageName);
  const normalizedPackageName =
    rawPackageName && rawPackageName.length > 0
      ? rawPackageName
      : `__pkg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const pctCtvVal = toNullableNumber(pctCtv);
  const pctKhachVal = toNullableNumber(pctKhach);
  const pctPromoVal = toNullableNumber(pctPromo);
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
          const productInsertQuery = trx(TABLES.product).insert({
            [productSchemaCols.packageName]: normalizedPackageName,
          });
          if (rawPackageName && rawPackageName.length > 0) {
            productInsertQuery.onConflict(productSchemaCols.packageName).merge({
              [productSchemaCols.packageName]: normalizedPackageName,
            });
          }
          const productInsert = await productInsertQuery.returning("id");
          let productId = productInsert?.[0]?.id ?? productInsert?.[0]?.ID ?? null;
          if (!productId && rawPackageName && rawPackageName.length > 0) {
            const existing = await trx(TABLES.product)
              .select("id")
              .where(productSchemaCols.packageName, normalizedPackageName)
              .first();
            productId = existing?.id ?? existing?.ID ?? null;
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

          const variantInsert = await trx(TABLES.variant)
            .insert({
              [variantCols.productId]: productId,
              [variantCols.displayName]: productCode,
              [variantCols.variantName]: normalizeTextInput(packageProduct) || null,
              [variantCols.isActive]: isActive,
            })
            .returning("id");
          const variantId = variantInsert?.[0]?.id || variantInsert?.[0]?.ID;

          await trx(TABLES.priceConfig).insert({
            [priceConfigCols.variantId]: variantId,
            [priceConfigCols.pctCtv]: pctCtvVal,
            [priceConfigCols.pctKhach]: pctKhachVal,
            [priceConfigCols.pctPromo]: pctPromoVal,
            [priceConfigCols.updatedAt]: new Date(),
          });

          if (Array.isArray(suppliers) && suppliers.length) {
            for (const supplier of suppliers) {
              const sourceIdRaw = supplier?.sourceId !== undefined ? supplier.sourceId : supplier?.id;
              const sourceNameRaw = supplier?.sourceName !== undefined ? supplier.sourceName : supplier?.name;
              const supplyId = Number.isFinite(Number(sourceIdRaw))
                ? Number(sourceIdRaw)
                : await ensureSupplyRecord(sourceNameRaw, supplier?.numberBank, supplier?.binBank);
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
    logger.error("Insert failed (POST /api/product-prices)", { error: error.message, stack: error.stack });
    const message = error && error.message ? String(error.message) : "Không thể tạo giá sản phẩm.";
    const status = message.includes("Unable to resolve") || message.includes("bắt buộc") ? 400 : 500;
    res.status(status).json({ error: message });
  }
};

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

    if (variantUpdates.length) {
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
              const id = Number(row.category_id ?? row[productCategoryCols.categoryId]);
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

    const priceUpdates = [];
    const priceValues = [];
    const addPriceUpdate = (column, value) => {
      priceUpdates.push(`${quoteIdent(column)} = ?`);
      priceValues.push(value);
    };

    if (pctCtv !== undefined) addPriceUpdate(priceConfigCols.pctCtv, toNullableNumber(pctCtv));
    if (pctKhach !== undefined) addPriceUpdate(priceConfigCols.pctKhach, toNullableNumber(pctKhach));
    if (pctPromo !== undefined) addPriceUpdate(priceConfigCols.pctPromo, toNullableNumber(pctPromo));

    if (
      !variantUpdates.length &&
      priceUpdates.length === 0 &&
      packageName === undefined &&
      imageUrl === undefined &&
      !Array.isArray(normalizedCategoryIds)
    ) {
      return res.status(400).json({ error: "Không có trường nào để cập nhật." });
    }

    if (priceUpdates.length) {
      priceUpdates.push(`${quoteIdent(priceConfigCols.updatedAt)} = NOW()`);
      const existingPrice = await db.raw(
        `
        SELECT id FROM ${TABLES.priceConfig}
        WHERE ${quoteIdent(priceConfigCols.variantId)} = ?
        LIMIT 1;
      `,
        [parsedId]
      );
      if (existingPrice.rows && existingPrice.rows.length) {
        await db.raw(
          `
          UPDATE ${TABLES.priceConfig}
          SET ${priceUpdates.join(", ")}
          WHERE ${quoteIdent(priceConfigCols.variantId)} = ?;
        `,
          [...priceValues, parsedId]
        );
      } else {
        const cols = [priceConfigCols.variantId, ...priceUpdates.map((u) => u.split(" = ")[0].replace(/"/g, ""))];
        const placeholders = Array.from({ length: priceUpdates.length + 1 }, () => "?");
        await db.raw(
          `
          INSERT INTO ${TABLES.priceConfig} (${cols.map(quoteIdent).join(", ")})
          VALUES (${placeholders.join(", ")})
          ON CONFLICT (${quoteIdent(priceConfigCols.variantId)})
          DO UPDATE SET ${priceUpdates.join(", ")};
        `,
          [parsedId, ...priceValues]
        );
      }
    }

    const viewRow = await fetchVariantView(parsedId);
    res.json(viewRow ? mapProductPriceRow(viewRow) : {});
  } catch (error) {
    logger.error("Update failed (PATCH /api/product-prices/:productId)", { productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật giá sản phẩm." });
  }
};

const toggleProductPriceStatus = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  }
  const isActiveBody = req.body?.is_active;
  const isActive =
    typeof isActiveBody === "boolean"
      ? isActiveBody
      : !(String(isActiveBody || "").trim().toLowerCase() === "false");
  try {
    const result = await db.raw(
      `
      UPDATE ${TABLES.variant}
      SET ${quoteIdent(variantCols.isActive)} = ?
      WHERE id = ?
      RETURNING id, ${quoteIdent(variantCols.isActive)} AS is_active;
    `,
      [isActive, parsedId]
    );
    if (!result.rows || !result.rows.length) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    res.json({
      id: result.rows[0].id,
      is_active: result.rows[0].is_active,
      update: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Update failed (PATCH /api/product-prices/:productId/status)", { productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật trạng thái sản phẩm." });
  }
};

const deleteProductPrice = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  }
  try {
    await db.raw(
      `
      DELETE FROM ${TABLES.supplyPrice}
      WHERE ${quoteIdent(supplyPriceCols.productId)} = ?;
    `,
      [parsedId]
    );
    await db.raw(
      `DELETE FROM ${TABLES.priceConfig}
       WHERE ${quoteIdent(priceConfigCols.variantId)} = ?;`,
      [parsedId]
    );
    const result = await db.raw(
      `DELETE FROM ${TABLES.variant}
       WHERE id = ?
       RETURNING id;`,
      [parsedId]
    );
    if (!result.rowCount && (!result.rows || !result.rows.length)) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    res.json({ success: true, id: parsedId });
  } catch (error) {
    logger.error("Delete failed (DELETE /api/product-prices/:productId)", { productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể xóa giá sản phẩm." });
  }
};

module.exports = {
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
};

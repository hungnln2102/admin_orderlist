const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const { normalizeTextInput, toNullableNumber } = require("../../../utils/normalizers");
const { mapProductPriceRow } = require("../mappers");
const { ensureSupplyRecord, upsertSupplyPrice } = require("../finders");
const {
  productCols,
  variantCols,
  productSchemaCols,
  priceConfigCols,
  supplyPriceCols,
  TABLES,
} = require("../constants");

const fetchVariantView = async (variantId) => {
  const query = `
    SELECT
      v.id AS id,
      v.${quoteIdent(variantCols.displayName)} AS id_product,
      v.${quoteIdent(variantCols.displayName)} AS san_pham,
      v.${quoteIdent(variantCols.variantName)} AS package_product,
      p.${quoteIdent(productSchemaCols.packageName)} AS package,
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
    LIMIT 1;
  `;
  const res = await db.raw(query, [variantId]);
  return res.rows && res.rows[0] ? res.rows[0] : null;
};

const createProductPrice = async (req, res) => {
  const {
    packageName,
    packageProduct,
    sanPham,
    pctCtv,
    pctKhach,
    pctPromo,
    is_active,
    suppliers,
  } = req.body || {};

  const productCode = normalizeTextInput(sanPham);
  if (!productCode) {
    return res.status(400).json({ error: "sanPham la bat buoc." });
  }

  const pctCtvVal = toNullableNumber(pctCtv);
  const pctKhachVal = toNullableNumber(pctKhach);
  const pctPromoVal = toNullableNumber(pctPromo);
  const isActive =
    typeof is_active === "boolean"
      ? is_active
      : !(String(is_active || "").trim().toLowerCase() === "false");

  try {
    const inserted = await db.transaction(async (trx) => {
      const productInsert = await trx(TABLES.product)
        .insert({
          [productSchemaCols.packageName]: normalizeTextInput(packageName) || null,
        })
        .returning("id");
      const productId = productInsert?.[0]?.id || productInsert?.[0]?.ID;

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

    const viewRow = await fetchVariantView(inserted);
    res.status(201).json(viewRow ? mapProductPriceRow(viewRow) : {});
  } catch (error) {
    console.error("Insert failed (POST /api/product-prices):", error);
    res.status(500).json({ error: "Khong the tao gia san pham." });
  }
};

const updateProductPrice = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID san pham khong hop le." });
  }

  const {
    packageName,
    packageProduct,
    sanPham,
    pctCtv,
    pctKhach,
    pctPromo,
    is_active,
  } = req.body || {};

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
      return res.status(404).json({ error: "Khong tim thay san pham." });
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
        return res.status(400).json({ error: "sanPham khong duoc trong." });
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

    if (productSchemaId && packageName !== undefined) {
      await db.raw(
        `
        UPDATE ${TABLES.product}
        SET ${quoteIdent(productSchemaCols.packageName)} = ?
        WHERE ${quoteIdent(productSchemaCols.id)} = ?;
      `,
        [normalizeTextInput(packageName) || null, productSchemaId]
      );
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

    if (!variantUpdates.length && priceUpdates.length === 0 && packageName === undefined) {
      return res.status(400).json({ error: "Khong co truong nao de cap nhat." });
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
    console.error(`Update failed (PATCH /api/product-prices/${productId}):`, error);
    res.status(500).json({ error: "Khong the cap nhat gia san pham." });
  }
};

const toggleProductPriceStatus = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID san pham khong hop le." });
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
      return res.status(404).json({ error: "Khong tim thay san pham." });
    }
    res.json({
      id: result.rows[0].id,
      is_active: result.rows[0].is_active,
      update: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `Update failed (PATCH /api/product-prices/${productId}/status):`,
      error
    );
    res.status(500).json({ error: "Khong the cap nhat trang thai san pham." });
  }
};

const deleteProductPrice = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID san pham khong hop le." });
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
      return res.status(404).json({ error: "Khong tim thay san pham." });
    }
    res.json({ success: true, id: parsedId });
  } catch (error) {
    console.error(`Delete failed (DELETE /api/product-prices/${productId}):`, error);
    res.status(500).json({ error: "Khong the xoa gia san pham." });
  }
};

module.exports = {
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
};

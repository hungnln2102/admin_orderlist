const { db } = require("../db");
const { DB_SCHEMA, getDefinition, tableName } = require("../config/dbSchema");
const { QUOTED_COLS } = require("../utils/columns");
const { quoteIdent } = require("../utils/sql");
const { normalizeTextInput, toNullableNumber } = require("../utils/normalizers");
const { getNextSupplyId } = require("../services/idService");

const PRODUCT_PRICE_DEF = getDefinition("PRODUCT_PRICE");
const SUPPLY_PRICE_DEF = getDefinition("SUPPLY_PRICE");
const SUPPLY_DEF = getDefinition("SUPPLY");

const productCols = PRODUCT_PRICE_DEF.columns;
const supplyPriceCols = SUPPLY_PRICE_DEF.columns;
const supplyCols = SUPPLY_DEF.columns;

const TABLES = {
  productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
  supplyPrice: tableName(DB_SCHEMA.SUPPLY_PRICE.TABLE),
  supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
};

const mapProductPriceRow = (row = {}) => {
  const id =
    Number(row.id) ||
    Number(row[productCols.id]) ||
    Number(row.product_id) ||
    Number(row.productId) ||
    null;
  const sanPham =
    row.san_pham ||
    row[productCols.product] ||
    row.id_product ||
    row.product ||
    "";
  const pctCtv = toNullableNumber(row.pct_ctv ?? row[productCols.pctCtv]);
  const pctKhach = toNullableNumber(
    row.pct_khach ?? row[productCols.pctKhach]
  );
  const pctPromo = toNullableNumber(row.pct_promo ?? row[productCols.pctPromo]);
  const isActiveRaw = row.is_active ?? row[productCols.isActive];
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
      : String(isActiveRaw || "")
          .trim()
          .toLowerCase()
          .startsWith("t") ||
        String(isActiveRaw || "").trim() === "1";

  return {
    id,
    id_product: sanPham,
    san_pham: sanPham,
    package_product:
      row.package_product ?? row[productCols.packageProduct] ?? null,
    package: row.package ?? row[productCols.package] ?? null,
    pct_ctv: pctCtv,
    pct_khach: pctKhach,
    pct_promo: pctPromo,
    is_active: isActive,
    update: row.update ?? row[productCols.updateDate] ?? null,
    max_supply_price: toNullableNumber(row.max_supply_price),
  };
};

const mapSupplyPriceRow = (row = {}) => ({
  source_id:
    Number(row.source_id) ||
    Number(row[supplyPriceCols.sourceId]) ||
    Number(row[supplyCols.id]) ||
    null,
  price: toNullableNumber(row.price ?? row[supplyPriceCols.price]) ?? null,
  source_name:
    row.source_name ||
    row[supplyCols.sourceName] ||
    row.source ||
    row.name ||
    "",
  last_order_date: row.last_order_date ?? null,
});

const findProductIdByName = async (nameRaw) => {
  const productName = normalizeTextInput(nameRaw).toLowerCase();
  if (!productName) return null;

  const exactSql = `
    SELECT id
    FROM ${TABLES.productPrice}
    WHERE LOWER(TRIM(${quoteIdent(productCols.product)}::text)) = ?
       OR LOWER(TRIM(${quoteIdent(productCols.packageProduct)}::text)) = ?
       OR LOWER(TRIM(${quoteIdent(productCols.package)}::text)) = ?
    ORDER BY id ASC
    LIMIT 1;
  `;
  const exact = await db.raw(exactSql, [productName, productName, productName]);
  if (exact.rows && exact.rows[0] && Number.isFinite(Number(exact.rows[0].id))) {
    return Number(exact.rows[0].id);
  }

  const fuzzySql = `
    SELECT id
    FROM ${TABLES.productPrice}
    WHERE LOWER(TRIM(?)) LIKE '%' || LOWER(TRIM(${quoteIdent(
      productCols.product
    )}::text)) || '%'
       OR LOWER(TRIM(?)) LIKE '%' || LOWER(TRIM(${quoteIdent(
         productCols.packageProduct
       )}::text)) || '%'
       OR LOWER(TRIM(${quoteIdent(
         productCols.product
       )}::text)) LIKE '%' || LOWER(TRIM(?)) || '%'
    ORDER BY id ASC
    LIMIT 1;
  `;
  const fuzzy = await db.raw(fuzzySql, [productName, productName, productName]);
  if (fuzzy.rows && fuzzy.rows[0] && Number.isFinite(Number(fuzzy.rows[0].id))) {
    return Number(fuzzy.rows[0].id);
  }
  return null;
};

const findSupplyIdByName = async (nameRaw) => {
  const normalized = normalizeTextInput(nameRaw).toLowerCase();
  if (!normalized) return null;
  const sql = `
    SELECT ${QUOTED_COLS.supply.id} AS id
    FROM ${TABLES.supply}
    WHERE LOWER(TRIM(${QUOTED_COLS.supply.sourceName}::text)) = ?
    LIMIT 1;
  `;
  const result = await db.raw(sql, [normalized]);
  if (result.rows && result.rows[0] && result.rows[0].id !== undefined) {
    const parsed = Number(result.rows[0].id);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const ensureSupplyRecord = async (nameRaw, numberBank, binBank) => {
  const normalizedName = normalizeTextInput(nameRaw);
  if (!normalizedName) return null;
  const existing = await findSupplyIdByName(normalizedName);
  if (existing) return existing;

  const nextId = await getNextSupplyId();
  const baseValues = [
    nextId,
    normalizedName,
    normalizeTextInput(numberBank) || null,
    normalizeTextInput(binBank) || null,
  ];
  const placeholders = baseValues.map(() => "?");
  try {
    const insertSql = `
      INSERT INTO ${TABLES.supply} (
        ${QUOTED_COLS.supply.id},
        ${QUOTED_COLS.supply.sourceName},
        ${QUOTED_COLS.supply.numberBank},
        ${QUOTED_COLS.supply.binBank},
        ${QUOTED_COLS.supply.activeSupply}
      ) VALUES (${placeholders.join(", ")}, ?)
      RETURNING ${QUOTED_COLS.supply.id} AS id;
    `;
    const inserted = await db.raw(insertSql, [...baseValues, true]);
    const newId =
      inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
        ? Number(inserted.rows[0].id)
        : nextId;
    return Number.isFinite(newId) ? newId : nextId;
  } catch (err) {
    // Fallback for schemas without active_supply
    const insertSql = `
      INSERT INTO ${TABLES.supply} (
        ${QUOTED_COLS.supply.id},
        ${QUOTED_COLS.supply.sourceName},
        ${QUOTED_COLS.supply.numberBank},
        ${QUOTED_COLS.supply.binBank}
      ) VALUES (${placeholders.join(", ")})
      RETURNING ${QUOTED_COLS.supply.id} AS id;
    `;
    const inserted = await db.raw(insertSql, baseValues);
    const newId =
      inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
        ? Number(inserted.rows[0].id)
        : nextId;
    return Number.isFinite(newId) ? newId : nextId;
  }
};

const upsertSupplyPrice = async (productId, sourceId, price) => {
  const parsedProductId = Number(productId);
  const parsedSourceId = Number(sourceId);
  const normalizedPrice = toNullableNumber(price);
  if (!Number.isFinite(parsedProductId) || !Number.isFinite(parsedSourceId)) {
    throw new Error("Invalid product or source id.");
  }

  const existing = await db.raw(
    `
    SELECT id FROM ${TABLES.supplyPrice}
    WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
      AND ${quoteIdent(supplyPriceCols.sourceId)} = ?
    LIMIT 1;
  `,
    [parsedProductId, parsedSourceId]
  );

  if (existing.rows && existing.rows.length) {
    await db.raw(
      `
      UPDATE ${TABLES.supplyPrice}
      SET ${quoteIdent(supplyPriceCols.price)} = ?
      WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
        AND ${quoteIdent(supplyPriceCols.sourceId)} = ?;
    `,
      [normalizedPrice, parsedProductId, parsedSourceId]
    );
    return {
      id: existing.rows[0].id,
      productId: parsedProductId,
      sourceId: parsedSourceId,
      price: normalizedPrice,
    };
  }

  const insertPlaceholders = ["?", "?", "?"];
  const inserted = await db.raw(
    `
    INSERT INTO ${TABLES.supplyPrice} (
      ${quoteIdent(supplyPriceCols.productId)},
      ${quoteIdent(supplyPriceCols.sourceId)},
      ${quoteIdent(supplyPriceCols.price)}
    )
    VALUES (${insertPlaceholders.join(", ")})
    RETURNING id;
  `,
    [parsedProductId, parsedSourceId, normalizedPrice]
  );
  const newId =
    inserted.rows && inserted.rows[0] && inserted.rows[0].id !== undefined
      ? inserted.rows[0].id
      : null;
  return {
    id: newId,
    productId: parsedProductId,
    sourceId: parsedSourceId,
    price: normalizedPrice,
  };
};

const listProducts = async (_req, res) => {
  try {
    const query = `
      SELECT
        ${QUOTED_COLS.productPrice.id} AS id,
        ${QUOTED_COLS.productPrice.product} AS id_product,
        ${QUOTED_COLS.productPrice.product} AS san_pham,
        ${QUOTED_COLS.productPrice.packageProduct} AS package_product,
        ${QUOTED_COLS.productPrice.package} AS package
      FROM ${TABLES.productPrice}
      ORDER BY ${QUOTED_COLS.productPrice.product};
    `;
    const result = await db.raw(query);
    const rows = (result.rows || []).map(mapProductPriceRow);
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/products):", error);
    res.status(500).json({ error: "Không thể tải sản phẩm." });
  }
};

const listProductPrices = async (_req, res) => {
  try {
    const query = `
      SELECT
        pp.${quoteIdent(productCols.id)} AS id,
        pp.${quoteIdent(productCols.product)} AS id_product,
        pp.${quoteIdent(productCols.product)} AS san_pham,
        pp.${quoteIdent(productCols.packageProduct)} AS package_product,
        pp.${quoteIdent(productCols.package)} AS package,
        pp.${quoteIdent(productCols.pctCtv)} AS pct_ctv,
        pp.${quoteIdent(productCols.pctKhach)} AS pct_khach,
        pp.${quoteIdent(productCols.pctPromo)} AS pct_promo,
        pp.${quoteIdent(productCols.isActive)} AS is_active,
        pp.${quoteIdent(productCols.updateDate)} AS update,
        MAX(sp.${quoteIdent(supplyPriceCols.price)}) AS max_supply_price
      FROM ${TABLES.productPrice} pp
      LEFT JOIN ${TABLES.supplyPrice} sp
        ON sp.${quoteIdent(supplyPriceCols.productId)} = pp.${quoteIdent(
      productCols.id
    )}
      GROUP BY
        pp.${quoteIdent(productCols.id)},
        pp.${quoteIdent(productCols.product)},
        pp.${quoteIdent(productCols.packageProduct)},
        pp.${quoteIdent(productCols.package)},
        pp.${quoteIdent(productCols.pctCtv)},
        pp.${quoteIdent(productCols.pctKhach)},
        pp.${quoteIdent(productCols.pctPromo)},
        pp.${quoteIdent(productCols.isActive)},
        pp.${quoteIdent(productCols.updateDate)}
      ORDER BY pp.${quoteIdent(productCols.id)} ASC;
    `;
    const result = await db.raw(query);
    const rows = (result.rows || []).map(mapProductPriceRow);
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/product-prices):", error);
    res.status(500).json({ error: "Không thể tải giá sản phẩm." });
  }
};

const getProductPriceById = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  }
  try {
    const query = `
      SELECT *
      FROM ${TABLES.productPrice}
      WHERE ${quoteIdent(productCols.id)} = ?
      LIMIT 1;
    `;
    const result = await db.raw(query, [parsedId]);
    if (!result.rows || !result.rows.length) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    res.json(mapProductPriceRow(result.rows[0]));
  } catch (error) {
    console.error(`Query failed (GET /api/product-prices/${productId}):`, error);
    res.status(500).json({ error: "Không thể tải giá sản phẩm." });
  }
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
    return res.status(400).json({ error: "sanPham là bắt buộc." });
  }

  const pctCtvVal = toNullableNumber(pctCtv);
  const pctKhachVal = toNullableNumber(pctKhach);
  const pctPromoVal = toNullableNumber(pctPromo);
  const isActive =
    typeof is_active === "boolean"
      ? is_active
      : !(String(is_active || "").trim().toLowerCase() === "false");

  try {
    const fields = [
      quoteIdent(productCols.product),
      quoteIdent(productCols.package),
      quoteIdent(productCols.packageProduct),
      quoteIdent(productCols.pctCtv),
      quoteIdent(productCols.pctKhach),
      quoteIdent(productCols.pctPromo),
      quoteIdent(productCols.isActive),
      quoteIdent(productCols.updateDate),
    ];
    const values = [
      productCode,
      normalizeTextInput(packageName) || null,
      normalizeTextInput(packageProduct) || null,
      pctCtvVal,
      pctKhachVal,
      pctPromoVal,
      isActive,
      new Date(),
    ];
    const placeholders = values.map(() => "?");

    const insertSql = `
      INSERT INTO ${TABLES.productPrice} (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *;
    `;
    const result = await db.raw(insertSql, values);
    const insertedRow =
      result.rows && result.rows[0] ? mapProductPriceRow(result.rows[0]) : null;
    if (!insertedRow) {
      return res.status(500).json({ error: "Không thể tạo sản phẩm." });
    }

    const productId = insertedRow.id;
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
        await upsertSupplyPrice(productId, supplyId, priceValue);
      }
    }

    res.status(201).json(insertedRow);
  } catch (error) {
    console.error("Insert failed (POST /api/product-prices):", error);
    res.status(500).json({ error: "Không thể tạo giá sản phẩm." });
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
    pctCtv,
    pctKhach,
    pctPromo,
    is_active,
  } = req.body || {};

  const fields = [];
  const values = [];

  const pushField = (column, value) => {
    fields.push(`${quoteIdent(column)} = ?`);
    values.push(value);
  };

  if (sanPham !== undefined) {
    const normalized = normalizeTextInput(sanPham);
    if (!normalized) {
      return res.status(400).json({ error: "sanPham không thể để trống." });
    }
    pushField(productCols.product, normalized);
  }
  if (packageName !== undefined) {
    pushField(productCols.package, normalizeTextInput(packageName) || null);
  }
  if (packageProduct !== undefined) {
    pushField(productCols.packageProduct, normalizeTextInput(packageProduct) || null);
  }
  if (pctCtv !== undefined) {
    pushField(productCols.pctCtv, toNullableNumber(pctCtv));
  }
  if (pctKhach !== undefined) {
    pushField(productCols.pctKhach, toNullableNumber(pctKhach));
  }
  if (pctPromo !== undefined) {
    pushField(productCols.pctPromo, toNullableNumber(pctPromo));
  }
  if (is_active !== undefined) {
    const isActive =
      typeof is_active === "boolean"
        ? is_active
        : !(String(is_active || "").trim().toLowerCase() === "false");
    pushField(productCols.isActive, isActive);
  }

  if (!fields.length) {
    return res.status(400).json({ error: "Không có trường nào để cập nhật." });
  }

  pushField(productCols.updateDate, new Date());

  const updateSql = `
    UPDATE ${TABLES.productPrice}
    SET ${fields.join(", ")}
    WHERE ${quoteIdent(productCols.id)} = ?
    RETURNING *;
  `;

  try {
    const result = await db.raw(updateSql, [...values, parsedId]);
    if (!result.rows || !result.rows.length) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    res.json(mapProductPriceRow(result.rows[0]));
  } catch (error) {
    console.error(`Update failed (PATCH /api/product-prices/${productId}):`, error);
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
      UPDATE ${TABLES.productPrice}
      SET ${quoteIdent(productCols.isActive)} = ?,
          ${quoteIdent(productCols.updateDate)} = NOW()
      WHERE ${quoteIdent(productCols.id)} = ?
      RETURNING ${quoteIdent(productCols.id)} AS id,
                ${quoteIdent(productCols.isActive)} AS is_active,
                ${quoteIdent(productCols.updateDate)} AS update;
    `,
      [isActive, parsedId]
    );
    if (!result.rows || !result.rows.length) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    res.json({
      id: result.rows[0].id,
      is_active: result.rows[0].is_active,
      update: result.rows[0].update,
    });
  } catch (error) {
    console.error(
      `Update failed (PATCH /api/product-prices/${productId}/status):`,
      error
    );
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
      `DELETE FROM ${TABLES.supplyPrice}
       WHERE ${quoteIdent(supplyPriceCols.productId)} = ?;`,
      [parsedId]
    );
    const result = await db.raw(
      `DELETE FROM ${TABLES.productPrice}
       WHERE ${quoteIdent(productCols.id)} = ?
       RETURNING ${quoteIdent(productCols.id)} AS id;`,
      [parsedId]
    );
    if (!result.rowCount && (!result.rows || !result.rows.length)) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    res.json({ success: true, id: parsedId });
  } catch (error) {
    console.error(`Delete failed (DELETE /api/product-prices/${productId}):`, error);
    res.status(500).json({ error: "Không thể xóa giá sản phẩm." });
  }
};

const getSuppliesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    const productId = await findProductIdByName(productName);
    if (!productId) {
      return res.json([]);
    }
    const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.sourceId)} AS source_id,
        COALESCE(s.${QUOTED_COLS.supply.sourceName}, '') AS source_name
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${TABLES.supply} s
        ON s.${QUOTED_COLS.supply.id} = sp.${quoteIdent(supplyPriceCols.sourceId)}
      WHERE sp.${quoteIdent(supplyPriceCols.productId)} = ?
      ORDER BY COALESCE(s.${QUOTED_COLS.supply.sourceName}, sp.${quoteIdent(
        supplyPriceCols.sourceId
      )}::text);
    `;
    const result = await db.raw(query, [productId]);
    const rows =
      result.rows?.map((row) => ({
        id: Number(row.source_id) || null,
        source_name: row.source_name || "",
      })) || [];
    res.json(rows);
  } catch (error) {
    console.error(
      `Query failed (GET /api/products/supplies-by-name/${productName}):`,
      error
    );
    res.status(500).json({ error: "Không thể tải nhà cung cấp cho sản phẩm." });
  }
};

const getSupplyPricesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    const productId = await findProductIdByName(productName);
    if (!productId) {
      return res.json([]);
    }
    const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.sourceId)} AS source_id,
        sp.${quoteIdent(supplyPriceCols.price)} AS price,
        COALESCE(s.${QUOTED_COLS.supply.sourceName}, '') AS source_name,
        NULL::text AS last_order_date
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${TABLES.supply} s
        ON s.${QUOTED_COLS.supply.id} = sp.${quoteIdent(supplyPriceCols.sourceId)}
      WHERE sp.${quoteIdent(supplyPriceCols.productId)} = ?
      ORDER BY COALESCE(s.${QUOTED_COLS.supply.sourceName}, sp.${quoteIdent(
        supplyPriceCols.sourceId
      )}::text);
    `;
    const result = await db.raw(query, [productId]);
    res.json((result.rows || []).map(mapSupplyPriceRow));
  } catch (error) {
    console.error(
      `Query failed (GET /api/products/all-prices-by-name/${productName}):`,
      error
    );
    res.status(500).json({ error: "Không thể tải giá nhà cung cấp cho sản phẩm." });
  }
};

const updateSupplyPriceForProduct = async (req, res) => {
  const { productId, sourceId } = req.params;
  const { price } = req.body || {};
  try {
    const result = await upsertSupplyPrice(productId, sourceId, price);
    res.json({
      productId: result.productId,
      sourceId: result.sourceId,
      price: result.price,
    });
  } catch (error) {
    console.error(
      `Update failed (PATCH /api/products/${productId}/suppliers/${sourceId}/price):`,
      error
    );
    res.status(500).json({ error: "Không thể cập nhật giá nhà cung cấp." });
  }
};

const createSupplyPriceForProduct = async (req, res) => {
  const { productId } = req.params;
  const { sourceId, sourceName, price, numberBank, binBank } = req.body || {};
  try {
    const parsedProductId = Number(productId);
    if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
    }
    const resolvedSourceId = Number.isFinite(Number(sourceId))
      ? Number(sourceId)
      : await ensureSupplyRecord(sourceName, numberBank, binBank);
    if (!resolvedSourceId) {
      return res.status(400).json({ error: "Nhà cung cấp bị thiếu hoặc không hợp lệ." });
    }
    const result = await upsertSupplyPrice(parsedProductId, resolvedSourceId, price);
    res.status(201).json({
      productId: result.productId,
      sourceId: result.sourceId,
      price: result.price,
    });
  } catch (error) {
    console.error(
      `Insert failed (POST /api/product-prices/${productId}/suppliers):`,
      error
    );
    res.status(500).json({ error: "Không thể thêm giá nhà cung cấp." });
  }
};

const deleteSupplyPriceForProduct = async (req, res) => {
  const { productId, sourceId } = req.params;
  const parsedProductId = Number(productId);
  const parsedSourceId = Number(sourceId);
  if (!Number.isFinite(parsedProductId) || !Number.isFinite(parsedSourceId)) {
    return res.status(400).json({ error: "ID sản phẩm hoặc ID nhà cung cấp không hợp lệ." });
  }
  try {
    await db.raw(
      `
      DELETE FROM ${TABLES.supplyPrice}
      WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
        AND ${quoteIdent(supplyPriceCols.sourceId)} = ?;
    `,
      [parsedProductId, parsedSourceId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(
      `Delete failed (DELETE /api/products/${productId}/suppliers/${sourceId}):`,
      error
    );
    res.status(500).json({ error: "Không thể xóa giá nhà cung cấp." });
  }
};

module.exports = {
  listProducts,
  listProductPrices,
  getProductPriceById,
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  createSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
};

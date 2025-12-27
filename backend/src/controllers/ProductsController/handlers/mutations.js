const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const { normalizeTextInput, toNullableNumber } = require("../../../utils/normalizers");
const { mapProductPriceRow } = require("../mappers");
const { ensureSupplyRecord, upsertSupplyPrice } = require("../finders");
const { productCols, supplyPriceCols, TABLES } = require("../constants");

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
      return res.status(400).json({ error: "sanPham không được trống." });
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
      `
      DELETE FROM ${TABLES.supplyPrice}
      WHERE ${quoteIdent(supplyPriceCols.productId)} = ?;
    `,
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

module.exports = {
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
};

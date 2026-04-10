const { db } = require("../../../../db");
const { quoteIdent } = require("../../../../utils/sql");
const logger = require("../../../../utils/logger");
const { pricingCache } = require("../../../../utils/cache");
const { variantCols, TABLES } = require("../../constants");

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
    pricingCache.clear();
    res.json({
      id: result.rows[0].id,
      is_active: result.rows[0].is_active,
      update: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Update failed (PATCH /api/product-prices/:productId/status)", {
      productId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể cập nhật trạng thái sản phẩm." });
  }
};

module.exports = {
  toggleProductPriceStatus,
};

const { db } = require("../../../../db");
const { quoteIdent } = require("../../../../utils/sql");
const logger = require("../../../../utils/logger");
const { pricingCache } = require("../../../../utils/cache");
const { isVariantReferencedByOrders } = require("../../../../services/orderReferenceCheck");
const { supplyPriceCols, TABLES } = require("../../constants");

const deleteProductPrice = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  }
  try {
    const referenced = await isVariantReferencedByOrders(parsedId);
    if (referenced) {
      return res.status(409).json({
        error:
          "Không thể xóa sản phẩm đang được tham chiếu bởi đơn hàng (đơn đang hoạt động, hết hạn hoặc đã hủy).",
      });
    }
    await db.raw(
      `
      DELETE FROM ${TABLES.supplyPrice}
      WHERE ${quoteIdent(supplyPriceCols.variantId)} = ?;
    `,
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
    pricingCache.clear();
    res.json({ success: true, id: parsedId });
  } catch (error) {
    logger.error("Delete failed (DELETE /api/product-prices/:productId)", {
      productId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể xóa giá sản phẩm." });
  }
};

module.exports = {
  deleteProductPrice,
};

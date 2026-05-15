const { db } = require("../../../../db");
const { quoteIdent } = require("../../../../utils/sql");
const logger = require("../../../../utils/logger");
const {
  TABLES,
  productDescColNames,
  variantColNames,
} = require("../shared/constants");
const { invalidateWebsiteSeoCache } = require("../shared/cache");

/** Xóa bản ghi desc_variant; gỡ liên kết variant (id_desc) trước khi xóa. */
const deleteProductDescriptionRecord = async (req, res) => {
  const parsed = Number(req.params.id);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return res.status(400).json({ error: "ID desc_variant không hợp lệ." });
  }
  const idCol = quoteIdent(productDescColNames.id);
  const vDescCol = quoteIdent(variantColNames.descVariantId);
  try {
    const exists = await db.raw(
      `SELECT 1 FROM ${TABLES.productDesc} WHERE ${idCol} = ? LIMIT 1`,
      [parsed]
    );
    if (!exists.rows?.length) {
      return res.status(404).json({ error: "Không tìm thấy desc_variant." });
    }
    await db.transaction(async (trx) => {
      await trx.raw(
        `UPDATE ${TABLES.variant} SET ${vDescCol} = NULL WHERE ${vDescCol} = ?`,
        [parsed]
      );
      await trx.raw(`DELETE FROM ${TABLES.productDesc} WHERE ${idCol} = ?`, [
        parsed,
      ]);
    });
    await invalidateWebsiteSeoCache();
    res.json({ success: true });
  } catch (error) {
    logger.error("Delete desc_variant failed", {
      id: parsed,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể xóa desc_variant." });
  }
};

module.exports = { deleteProductDescriptionRecord };

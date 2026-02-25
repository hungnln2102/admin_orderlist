const db = require("../../db/knexClient");
const {
  PROMOTION_SCHEMA,
  getDefinition,
  tableName,
  SCHEMA_PROMOTION,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");

const PROMO_CODES_DEF = getDefinition("PROMOTION_CODES", PROMOTION_SCHEMA);

const PROMOTION_CODES_TABLE = tableName(
  PROMO_CODES_DEF?.tableName || "promotion_codes",
  SCHEMA_PROMOTION
);

const listPromotionCodes = async (_req, res) => {
  try {
    if (!PROMO_CODES_DEF) {
      return res.status(500).json({
        error: "Thiếu cấu hình bảng promotion_codes trong PROMOTION_SCHEMA",
      });
    }

    const cols = PROMO_CODES_DEF.columns;

    const rows = await db(PROMOTION_CODES_TABLE)
      .select({
        id: cols.id,
        code: cols.code,
        discountPercent: cols.discountPercent,
        maxDiscountAmount: cols.maxDiscountAmount,
        minOrderAmount: cols.minOrderAmount,
        description: cols.description,
        status: cols.status,
        isPublic: cols.isPublic,
        usageLimit: cols.usageLimit,
        usedCount: cols.usedCount,
        startAt: cols.startAt,
        endAt: cols.endAt,
        createdAt: cols.createdAt,
      })
      .orderBy([{ column: cols.createdAt, order: "desc" }]);

    res.json({ items: rows });
  } catch (error) {
    logger.error("[promotion-codes] Query failed (list)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tải danh sách mã khuyến mãi.",
    });
  }
};

module.exports = {
  listPromotionCodes,
};

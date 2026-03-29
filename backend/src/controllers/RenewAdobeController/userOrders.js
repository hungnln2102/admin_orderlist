const { db } = require("../../db");
const logger = require("../../utils/logger");
const {
  TBL_ORDER,
  ORD_COLS,
  ALLOWED_ORDER_STATUSES,
  getRenewAdobeVariantIds,
} = require("./orderAccess");

const listUserOrders = async (_req, res) => {
  try {
    const variantIds = await getRenewAdobeVariantIds();

    if (variantIds.length === 0) {
      logger.info(
        "[renew-adobe] user-orders: 0 rows (chưa có variant nào thuộc renew_adobe)"
      );
      return res.json([]);
    }

    const rows = await db(TBL_ORDER)
      .select(
        `${TBL_ORDER}.${ORD_COLS.ID_ORDER} as order_code`,
        `${TBL_ORDER}.${ORD_COLS.INFORMATION_ORDER} as information_order`,
        `${TBL_ORDER}.${ORD_COLS.CUSTOMER} as customer`,
        `${TBL_ORDER}.${ORD_COLS.CONTACT} as contact`,
        db.raw(
          `TO_CHAR((${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as expiry_date`
        ),
        `${TBL_ORDER}.${ORD_COLS.STATUS} as status`
      )
      .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
      .whereIn(ORD_COLS.STATUS, ALLOWED_ORDER_STATUSES)
      .whereNotNull(ORD_COLS.INFORMATION_ORDER)
      .orderBy(ORD_COLS.ID_ORDER, "asc");

    logger.info(
      "[renew-adobe] user-orders: %d rows (variant_ids: %s)",
      rows.length,
      variantIds.join(", ")
    );
    return res.json(rows);
  } catch (error) {
    logger.error("[renew-adobe] user-orders failed", {
      error: error.message,
    });
    return res
      .status(500)
      .json({ error: "Không thể tải danh sách user-orders." });
  }
};

module.exports = {
  listUserOrders,
};

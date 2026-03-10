const express = require("express");
const { db } = require("../../db");
const logger = require("../../utils/logger");
const { TABLES, COLS } = require("./constants");

const router = express.Router();

// GET /api/key-active/keys
// Dùng mã đơn hàng (order_code) join order_list lấy expiry_date → hiển thị Thời hạn
router.get("/keys", async (req, res) => {
  try {
    const rows = await db(TABLES.orderAutoKeys)
      .leftJoin(
        TABLES.orderList,
        `${TABLES.orderAutoKeys}.${COLS.ORDER_AUTO_KEYS.ORDER_CODE}`,
        `${TABLES.orderList}.${COLS.ORDER.ID_ORDER}`
      )
      .leftJoin(
        TABLES.variant,
        `${TABLES.orderList}.${COLS.ORDER.ID_PRODUCT}`,
        `${TABLES.variant}.${COLS.VARIANT.ID}`
      )
      .leftJoin(
        TABLES.systems,
        `${TABLES.orderAutoKeys}.${COLS.ORDER_AUTO_KEYS.SYSTEM_CODE}`,
        `${TABLES.systems}.${COLS.SYSTEMS.SYSTEM_CODE}`
      )
      .select(
        `${TABLES.orderAutoKeys}.${COLS.ORDER_AUTO_KEYS.ORDER_CODE} as order_code`,
        `${TABLES.orderAutoKeys}.${COLS.ORDER_AUTO_KEYS.AUTO_KEY} as auto_key`,
        db.raw(
          `COALESCE(${TABLES.variant}.${COLS.VARIANT.DISPLAY_NAME}::text, ${TABLES.orderList}.${COLS.ORDER.ID_PRODUCT}::text) as product_name`
        ),
        db.raw(
          `${TABLES.systems}.${COLS.SYSTEMS.SYSTEM_NAME}::text as system_name`
        ),
        db.raw(
          `${TABLES.orderList}.${COLS.ORDER.EXPIRY_DATE}::timestamptz as expiry_raw`
        )
      )
      .orderBy(
        `${TABLES.orderAutoKeys}.${COLS.ORDER_AUTO_KEYS.CREATED_AT}`,
        "desc"
      );

    const items = rows.map((row) => ({
      id: row.auto_key,
      // Reuse existing frontend shape: "account" cột đầu tiên trong bảng
      // sẽ hiển thị Mã Đơn Hàng.
      account: row.order_code || "",
      product: row.product_name || "",
      systemName: row.system_name || null,
      key: row.auto_key || "",
      expiry: row.expiry_raw
        ? new Date(row.expiry_raw).toLocaleDateString("vi-VN")
        : "",
    }));

    res.json({ items });
  } catch (error) {
    logger.error("Failed to load active keys", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải danh sách key." });
  }
});

module.exports = router;


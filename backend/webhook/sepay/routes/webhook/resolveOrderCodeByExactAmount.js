const logger = require("@/utils/logger");
const { ORDER_TABLE, ORDER_COLS } = require("../../config");
const { REFUND_CREDIT_APPLICATIONS_TABLE } = require("./constants");
const { STATUS } = require("@/utils/statuses");

/**
 * Tra mã đơn hàng (id_order) có số tiền còn lại (price - credit_applied) khớp chính xác với số tiền chuyển khoản.
 * Chỉ tự động khớp khi tìm thấy DUY NHẤT một đơn hàng Chưa Thanh Toán có số tiền khớp chính xác.
 */
async function resolveOrderCodeByExactAmount(client, amount) {
  const normalized = Math.round(Number(amount));
  if (!(normalized > 0)) return null;

  try {
    // Truy vấn tìm các đơn hàng có status = 'Chưa Thanh Toán' hoặc 'Cần Gia Hạn' và số tiền còn lại khớp chính xác
    const query = `
      SELECT 
        UPPER(TRIM(${ORDER_COLS.idOrder}::text)) AS id_order
      FROM ${ORDER_TABLE}
      WHERE COALESCE(${ORDER_COLS.status}::text, '') IN ($2, $3)
        AND ROUND(${ORDER_COLS.price}::numeric) - COALESCE(
          (
            SELECT SUM(rca.applied_amount)
            FROM ${REFUND_CREDIT_APPLICATIONS_TABLE} rca
            WHERE rca.target_order_list_id = ${ORDER_TABLE}.${ORDER_COLS.id}
          ), 0
        ) = $1
      ORDER BY ${ORDER_COLS.orderDate} DESC
      LIMIT 5
    `;
    const result = await client.query(query, [normalized, STATUS.UNPAID, STATUS.RENEWAL]);
    const codes = [
      ...new Set(
        (result.rows || [])
          .map((row) => String(row?.id_order || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    ];

    if (codes.length === 1) {
      logger.info("[Webhook] Tìm thấy duy nhất 1 đơn hàng khớp chính xác số tiền", {
        amount: normalized,
        orderCode: codes[0],
      });
      return codes[0];
    }

    if (codes.length > 1) {
      logger.warn("[Webhook] Có nhiều đơn hàng pending có cùng số tiền còn lại", {
        amount: normalized,
        orderCodes: codes,
      });
    }

    return null;
  } catch (error) {
    logger.error("[Webhook] Lỗi khi tra mã đơn hàng theo số tiền", {
      amount: normalized,
      error: error.message,
    });
    return null;
  }
}

module.exports = {
  resolveOrderCodeByExactAmount,
};

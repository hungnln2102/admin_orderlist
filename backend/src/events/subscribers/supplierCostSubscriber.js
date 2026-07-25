const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");
const { pool } = require("../../../webhook/sepay/config");
const { ensureSupplyAndPriceFromOrder } = require("../../../webhook/sepay/payments");
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require("@/config/dbSchema");

const SUPPLIER_ORDER_COST_LOG_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER);
const supplierOrderCostCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;

async function handleOrderPaidOrRenewed(payload) {
  const orderCode = payload?.orderCode || payload?.id_order || payload?.orderId;
  if (!orderCode) return;

  const client = await pool.connect();
  try {
    // 1. Ensure price sync from supplier_cost table
    const ensured = await ensureSupplyAndPriceFromOrder(orderCode, { client });
    if (!ensured || !ensured.supplierId) {
      return;
    }

    // 2. Check if DB trigger already created/updated the log
    const checkRes = await client.query(
      `SELECT ${supplierOrderCostCols.ID} AS id 
       FROM ${SUPPLIER_ORDER_COST_LOG_TABLE}
       WHERE LOWER(id_order) = LOWER($1)
       ORDER BY ${supplierOrderCostCols.ID} DESC LIMIT 1`,
      [orderCode]
    );

    // If no log entry exists (or if we need fallback App-Managed insertion)
    if (!checkRes.rows.length && payload.orderListId) {
      const importCost = ensured.price || 0;
      await client.query(
        `INSERT INTO ${SUPPLIER_ORDER_COST_LOG_TABLE} (
          ${supplierOrderCostCols.ORDER_LIST_ID},
          ${supplierOrderCostCols.SUPPLY_ID},
          ${supplierOrderCostCols.ID_ORDER},
          ${supplierOrderCostCols.IMPORT_COST},
          ${supplierOrderCostCols.REFUND_AMOUNT},
          ${supplierOrderCostCols.NCC_PAYMENT_STATUS}
        ) VALUES ($1, $2, $3, $4, 0, 'Chưa Thanh Toán')`,
        [payload.orderListId, ensured.supplierId, orderCode, importCost]
      );
      logger.info("[SupplierCostSubscriber] Created supplier_order_cost_log fallback", {
        orderCode,
        orderListId: payload.orderListId,
        supplierId: ensured.supplierId,
        importCost,
      });
    }
  } catch (err) {
    logger.error("[SupplierCostSubscriber] Error handling order event", {
      orderCode,
      error: err.message,
      stack: err.stack,
    });
  } finally {
    client.release();
  }
}

function registerSupplierCostSubscribers() {
  eventBus.on(EVENTS.ORDER_PAID, handleOrderPaidOrRenewed);
  eventBus.on(EVENTS.ORDER_RENEWED, handleOrderPaidOrRenewed);
  eventBus.on(EVENTS.ORDER_CREATED, handleOrderPaidOrRenewed);
  logger.info("[SupplierCostSubscriber] Đã đăng ký thành công cho ORDER_PAID, ORDER_RENEWED, ORDER_CREATED");
}

module.exports = {
  registerSupplierCostSubscribers,
};

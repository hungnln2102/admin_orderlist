/**
 * Repository data access cho luồng đổi NCC.
 *
 * Mọi truy vấn ở đây nhận `trx` (Knex transaction) để đảm bảo cùng transaction
 * mà service mở. Không tự mở transaction mới ở đây.
 */

const {
  ORDERS_SCHEMA,
  PARTNER_SCHEMA,
  FINANCE_SCHEMA,
  SCHEMA_ORDERS,
  SCHEMA_PARTNER,
  SCHEMA_FINANCE,
  tableName,
} = require("@/config/dbSchema");
const { findSupplierCostPrice } = require("@/domains/supplies/services/supplierCostService");

const ORDER_LIST_TABLE = tableName(
  ORDERS_SCHEMA.ORDER_LIST.TABLE,
  SCHEMA_ORDERS
);
const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

const SUPPLIER_TABLE = tableName(
  PARTNER_SCHEMA.SUPPLIER.TABLE,
  SCHEMA_PARTNER
);
const SUPPLIER_COLS = PARTNER_SCHEMA.SUPPLIER.COLS;


const COST_LOG_TABLE = tableName(
  PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
  SCHEMA_PARTNER
);
const COST_LOG_COLS = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;

const SUMMARY_TABLE = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const SUMMARY_COLS = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const NCC_STATUS_UNPAID = "Chưa Thanh Toán";
const NCC_STATUS_PAID = "Đã Thanh Toán";

/** Đặt cờ session để trigger DB bỏ qua nhánh sync supply_id khi service tự quản lý. */
async function enableAppManagedFlag(trx) {
  await trx.raw(`SET LOCAL app.supplier_change_managed = 'on'`);
}

async function findOrderById(trx, orderId) {
  return trx(ORDER_LIST_TABLE).where({ [ORDER_COLS.ID]: orderId }).first();
}

async function findSupplierById(trx, supplyId) {
  return trx(SUPPLIER_TABLE).where({ [SUPPLIER_COLS.ID]: supplyId }).first();
}

/**
 * Giá NCC cho 1 variant — bảng `supplier_cost` (alias `supplier.supplier_cost`).
 * Trả null nếu chưa cấu hình giá.
 */
async function findSupplyPriceForVariant(trx, supplyId, variantId) {
  return findSupplierCostPrice({ supplierId: supplyId, variantId }, trx);
}

async function findLatestCostLog(trx, orderListId) {
  return trx(COST_LOG_TABLE)
    .where({ [COST_LOG_COLS.ORDER_LIST_ID]: orderListId })
    .orderBy(COST_LOG_COLS.ID, "desc")
    .first();
}

async function updateOrderSupplyAndCost(trx, orderId, { supplyId, cost }) {
  const [row] = await trx(ORDER_LIST_TABLE)
    .where({ [ORDER_COLS.ID]: orderId })
    .update({
      [ORDER_COLS.ID_SUPPLY]: supplyId,
      [ORDER_COLS.COST]: cost,
    })
    .returning("*");
  return row;
}

async function deleteCostLogById(trx, logId) {
  return trx(COST_LOG_TABLE).where({ [COST_LOG_COLS.ID]: logId }).del();
}

async function updateLatestCostLog(trx, logId, { supplyId, importCost }) {
  await trx(COST_LOG_TABLE)
    .where({ [COST_LOG_COLS.ID]: logId })
    .update({
      [COST_LOG_COLS.SUPPLY_ID]: supplyId,
      [COST_LOG_COLS.IMPORT_COST]: importCost,
      [COST_LOG_COLS.LOGGED_AT]: trx.fn.now(),
    });
}

async function insertCostLog(
  trx,
  { orderListId, supplyId, idOrder, importCost, refundAmount, nccPaymentStatus }
) {
  await trx(COST_LOG_TABLE).insert({
    [COST_LOG_COLS.ORDER_LIST_ID]: orderListId,
    [COST_LOG_COLS.SUPPLY_ID]: supplyId,
    [COST_LOG_COLS.ID_ORDER]: idOrder ?? "",
    [COST_LOG_COLS.IMPORT_COST]: importCost,
    [COST_LOG_COLS.REFUND_AMOUNT]: refundAmount,
    [COST_LOG_COLS.NCC_PAYMENT_STATUS]: nccPaymentStatus,
  });
}

/**
 * Đọc snapshot tổng hợp tài chính 1 tháng — dùng trước/sau khi đổi NCC để
 * tính delta thực gửi cho Telegram BIẾN ĐỘNG THÁNG.
 */
async function fetchMonthlyTotals(trx, monthKey) {
  if (!monthKey) return null;
  const row = await trx(SUMMARY_TABLE)
    .select(
      SUMMARY_COLS.TOTAL_REVENUE,
      SUMMARY_COLS.TOTAL_PROFIT,
      SUMMARY_COLS.TOTAL_IMPORT,
      SUMMARY_COLS.TOTAL_REFUND
    )
    .where({ [SUMMARY_COLS.MONTH_KEY]: monthKey })
    .first();
  return row || null;
}

module.exports = {
  ORDER_COLS,
  COST_LOG_COLS,
  SUPPLIER_COLS,
  SUMMARY_COLS,
  NCC_STATUS_UNPAID,
  NCC_STATUS_PAID,
  enableAppManagedFlag,
  findOrderById,
  findSupplierById,
  findSupplyPriceForVariant,
  findLatestCostLog,
  updateOrderSupplyAndCost,
  deleteCostLogById,
  updateLatestCostLog,
  insertCostLog,
  fetchMonthlyTotals,
};

const { TABLES } = require("../constants");
const { ORDERS_SCHEMA } = require("../../../config/dbSchema");
const { syncMavnStoreProfitExpense } = require("./mavnStoreExpenseSync");

const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;

/**
 * Gọi sau khi renewal đã UPDATE đơn MAVN sang PAID (pool/pg hoặc job khác).
 * Đồng bộ `dashboard_monthly_summary.total_profit` + `store_profit_expenses` như PUT đơn.
 *
 * @param {{ orderCode: string, beforeRenewalRow: { status: unknown, cost: unknown } }} params
 */
async function syncMavnFinanceAfterRenewalOrderPaid({ orderCode, beforeRenewalRow }) {
  const code = String(orderCode || "").trim();
  if (!code || !beforeRenewalRow) return;

  const { db } = require("../../../db");

  await db.transaction(async (trx) => {
    const afterRow = await trx(TABLES.orderList).where(idOrderCol, code).forUpdate().first();
    if (!afterRow) return;
    const beforeRow = {
      ...afterRow,
      status: beforeRenewalRow.status,
      cost: beforeRenewalRow.cost,
    };
    await syncMavnStoreProfitExpense(trx, beforeRow, afterRow);
  });
}

module.exports = {
  syncMavnFinanceAfterRenewalOrderPaid,
};

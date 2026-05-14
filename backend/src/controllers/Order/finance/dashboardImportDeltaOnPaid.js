const {
  ORDERS_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_PARTNER,
  tableName,
} = require("../../../config/dbSchema");
const { isMavrykSupplierStrictForNccLog } = require("../../../utils/orderHelpers");
const { normalizeMoney } = require("../../../../webhook/sepay/utils");

const orderCols = ORDERS_SCHEMA.ORDER_LIST.COLS;
const costLogTable = tableName(
  PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
  SCHEMA_PARTNER
);
const costLogCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;

/**
 * Log tháng trước + gia hạn/thanh toán tháng này tạo log mới: chỉ tháng **paidMonthKey**
 * mới được ledger/`fn_recalc` tính. Không dùng EXISTS (bất kỳ dòng nào) — sẽ bỏ sót
 * `importDelta` khi chỉ có log cũ.
 */
async function hasSupplierOrderCostLogRowInPaidMonth(executor, orderListId, paidMonthKey) {
  if (orderListId == null || !Number.isFinite(Number(orderListId))) return false;
  const mk = String(paidMonthKey || "").trim();
  if (!mk) return false;

  const oid = Number(orderListId);
  const base = `SELECT 1 FROM ${costLogTable}
     WHERE ${costLogCols.ORDER_LIST_ID} = __P1__
       AND ${costLogCols.LOGGED_AT} IS NOT NULL
       AND TO_CHAR(timezone('Asia/Ho_Chi_Minh', ${costLogCols.LOGGED_AT}), 'YYYY-MM') = __P2__
     LIMIT 1`;
  const sqlKnex = base.replace("__P1__", "?").replace("__P2__", "?");
  const sqlPg = base.replace("__P1__", "$1").replace("__P2__", "$2");

  if (typeof executor?.raw === "function") {
    const r = await executor.raw(sqlKnex, [oid, mk]);
    return (r.rows || []).length > 0;
  }
  const { rows } = await executor.query(sqlPg, [oid, mk]);
  return rows.length > 0;
}

/**
 * @param {import("pg").PoolClient | import("knex").Knex.Transaction} executor Client pg (`.query`) hoặc Knex transaction (`.raw`).
 * @param {string | null | undefined} paidMonthKey `YYYY-MM` (tháng ghi dashboard cho lần thanh toán này).
 * `state` cần có pk đơn sau `UPDATE … Đã TT` cùng transaction.
 */
async function resolveDashboardImportDeltaOnPaid(
  executor,
  state,
  cost,
  fetchSupplierNameBySupplyId,
  paidMonthKey
) {
  const c = normalizeMoney(cost);
  if (c <= 0) return 0;

  const supplyIdRaw = state[orderCols.ID_SUPPLY];
  const hasSupply =
    supplyIdRaw != null &&
    Number.isFinite(Number(supplyIdRaw)) &&
    Number(supplyIdRaw) > 0;
  if (!hasSupply) return 0;

  const orderListId = state[orderCols.ID];
  if (
    orderListId != null &&
    Number.isFinite(Number(orderListId)) &&
    (await hasSupplierOrderCostLogRowInPaidMonth(executor, orderListId, paidMonthKey))
  ) {
    return 0;
  }

  const supplierName = await fetchSupplierNameBySupplyId(executor, supplyIdRaw);
  if (isMavrykSupplierStrictForNccLog(supplierName)) return c;
  return 0;
}

module.exports = {
  resolveDashboardImportDeltaOnPaid,
  hasSupplierOrderCostLogRowInPaidMonth,
};

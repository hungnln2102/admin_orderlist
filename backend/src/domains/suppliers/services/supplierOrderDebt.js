const { TABLES, COLS } = require("@/db");
const { ALLOCATION_TYPE } = require("@/constants/receiptStatus");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { isMavrykSupplierSync } = require("../utils/supplierCheck");

const allocation = COLS.PAYMENT_RECEIPT_ALLOCATIONS;
const log = COLS.SUPPLIER_ORDER_COST_LOG;

function supplierOrderPaymentsSql(alias) {
  return `SELECT a.* FROM ${TABLES.PAYMENT_RECEIPT_ALLOCATIONS} a
    WHERE a.${allocation.ALLOCATION_TYPE} = '${ALLOCATION_TYPE.SUPPLIER_ORDER}'
      AND a.${allocation.TARGET_CODE} = ${alias}.${log.ID}::text`;
}

function supplierOrderRemainingSql(alias) {
  return `(COALESCE(${alias}.${log.IMPORT_COST}, 0) - COALESCE(
    (SELECT SUM(p.${allocation.AMOUNT}) FROM (${supplierOrderPaymentsSql(alias)}) p), 0))`;
}

function selectSupplierOrderRemaining(query, trx) {
  return query.select("l.*", trx.raw(`${supplierOrderRemainingSql("l")} AS remaining_debt`));
}

async function lockAllocatableSupplierOrder(trx, costId, amount) {
  const target = await trx(TABLES.SUPPLIER_ORDER_COST_LOG).where(log.ID, costId).first();
  if (!target) throw new Error("Không tìm thấy khoản công nợ NCC.");

  const supplier = await trx(TABLES.SUPPLIER)
    .where(COLS.SUPPLIER.ID, target[log.SUPPLY_ID]).forUpdate().first();
  if (!supplier || isMavrykSupplierSync({ supplier_name: supplier.supplier_name, supply_id: target[log.SUPPLY_ID] })) {
    throw new Error("Nhà cung cấp không có công nợ thanh toán hợp lệ.");
  }

  const cost = await selectSupplierOrderRemaining(
    trx(`${TABLES.SUPPLIER_ORDER_COST_LOG} as l`)
      .where({ [`l.${log.ID}`]: costId, [`l.${log.SUPPLY_ID}`]: target[log.SUPPLY_ID] })
      .forUpdate(),
    trx
  ).first();
  if (cost?.[log.NCC_PAYMENT_STATUS] !== SUPPLIER_PAYMENT_STATUS.UNPAID ||
      !cost[log.ID_ORDER] || amount > Number(cost.remaining_debt)) {
    throw new Error("Số tiền phân bổ vượt quá công nợ còn lại hoặc khoản công nợ đã đóng.");
  }
  return cost;
}

async function assertSupplierCostLogsUnallocated(trx, where) {
  const ids = await trx(TABLES.SUPPLIER_ORDER_COST_LOG).where(where).forUpdate().pluck(log.ID);
  if (!ids.length) return;
  const payment = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
    .where(allocation.ALLOCATION_TYPE, ALLOCATION_TYPE.SUPPLIER_ORDER)
    .whereIn(allocation.TARGET_CODE, ids.map(String))
    .first(allocation.ID);
  if (payment) throw new Error("Khoản công nợ NCC đã có biên lai tiền ra được gán.");
}

module.exports = {
  supplierOrderPaymentsSql,
  supplierOrderRemainingSql,
  selectSupplierOrderRemaining,
  lockAllocatableSupplierOrder,
  assertSupplierCostLogsUnallocated,
};

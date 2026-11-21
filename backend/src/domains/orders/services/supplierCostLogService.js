const { TABLES, COLS } = require("@/db");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");

const LOG_COLS = COLS.SUPPLIER_ORDER_COST_LOG;

async function ensureSupplierCostLog({ trx, order, isRenewal }) {
  const supplierId = order?.supply_id ? Number(order.supply_id) : null;
  const importCost = Number(order?.cost || 0);
  const isSupplierMavryk = await isMavrykSupplier(trx, order);

  if (!supplierId || importCost <= 0 || isSupplierMavryk) {
    return { inserted: false, supplierId, importCost, isSupplierMavryk };
  }

  let existingLogQuery = trx(TABLES.SUPPLIER_ORDER_COST_LOG)
    .where({
      [LOG_COLS.ORDER_LIST_ID]: order.id,
      [LOG_COLS.SUPPLY_ID]: supplierId,
    })
    .where(LOG_COLS.IMPORT_COST, ">", 0);

  // A renewal creates a new cost cycle; a first payment reuses its existing order log.
  if (isRenewal) {
    existingLogQuery = existingLogQuery.where(LOG_COLS.LOGGED_AT, ">=", trx.raw("CURRENT_DATE"));
  }

  const existingLog = await existingLogQuery.first(LOG_COLS.ID);
  if (existingLog) {
    return { inserted: false, supplierId, importCost, isSupplierMavryk };
  }

  const [log] = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
    .insert({
      [LOG_COLS.ORDER_LIST_ID]: order.id,
      [LOG_COLS.SUPPLY_ID]: supplierId,
      [LOG_COLS.ID_ORDER]: order.id_order,
      [LOG_COLS.IMPORT_COST]: importCost,
      [LOG_COLS.NCC_PAYMENT_STATUS]: SUPPLIER_PAYMENT_STATUS.UNPAID,
      [LOG_COLS.LOGGED_AT]: trx.fn.now(),
    })
    .returning("*");

  return { inserted: true, log, supplierId, importCost, isSupplierMavryk };
}

module.exports = { ensureSupplierCostLog };
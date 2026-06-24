const {
  findSupplierIdByName,
} = require("../../../supplies/services/supplierLookupService");

const findSupplyIdByName = (trx, supplyNameRaw) =>
  findSupplierIdByName(supplyNameRaw, trx);

/**
 * Công nợ / import NCC theo đơn: chỉ `partner.supplier_order_cost_log` (trigger trên `orders.order_list`).
 * Không còn cập nhật song song qua app helper.
 */

module.exports = {
  findSupplyIdByName,
};

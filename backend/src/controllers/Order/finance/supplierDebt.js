const { resolveSupplierNameColumn } = require("../../SuppliesController/helpers");
const { TABLES } = require("../constants");

const findSupplyIdByName = async (trx, supplyNameRaw) => {
  const supplyName =
    supplyNameRaw === undefined || supplyNameRaw === null
      ? ""
      : String(supplyNameRaw);
  if (!supplyName) return null;

  const supplierNameCol = await resolveSupplierNameColumn();
  const row = await trx(TABLES.supplier)
    .select("id")
    .where(supplierNameCol, supplyName)
    .first();
  return row && row.id !== undefined ? Number(row.id) || null : null;
};

/**
 * Công nợ / import NCC theo đơn: chỉ `partner.supplier_order_cost_log` (trigger trên `orders.order_list`).
 * Không còn cập nhật song song qua app helper.
 */

module.exports = {
  findSupplyIdByName,
};

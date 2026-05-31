const {
  PARTNER_SCHEMA,
  SCHEMA_SUPPLIER,
  tableName,
} = require("../../../../../config/dbSchema");

const fetchSupplierNameBySupplyId = async (trx, supplyIdRaw) => {
  if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
  const t = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER);
  const c = PARTNER_SCHEMA.SUPPLIER.COLS;
  const row = await trx(t)
    .where(c.ID, Number(supplyIdRaw))
    .select(c.SUPPLIER_NAME)
    .first();
  return String(row?.[c.SUPPLIER_NAME] ?? "").trim();
};

module.exports = { fetchSupplierNameBySupplyId };

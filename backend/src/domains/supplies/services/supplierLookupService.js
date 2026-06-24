const { db } = require("../../../db");
const { PARTNER_SCHEMA } = require("../../../config/dbSchema");
const {
  resolveSupplierNameColumn,
  resolveSupplierTableName,
} = require("../controller/helpers");

const getQuery = (trxOrDb) => trxOrDb || db;

const normalizeLookupName = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const normalizeLookupId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const withSupplierNameAlias = (row, supplierNameCol) => {
  if (!row || supplierNameCol === "supplier_name" || row.supplier_name !== undefined) {
    return row || null;
  }
  return {
    ...row,
    supplier_name: row[supplierNameCol],
  };
};

const findSupplierById = async (supplierId, trxOrDb = null) => {
  const normalizedId = normalizeLookupId(supplierId);
  if (!normalizedId) return null;

  const query = getQuery(trxOrDb);
  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();
  const row = await query(supplierTable).where({ id: normalizedId }).first();
  return withSupplierNameAlias(row, supplierNameCol);
};

const findSupplierByName = async (supplierName, trxOrDb = null) => {
  const normalizedName = normalizeLookupName(supplierName);
  if (!normalizedName) return null;

  const query = getQuery(trxOrDb);
  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();

  const row = await query(supplierTable).where(supplierNameCol, normalizedName).first();
  return withSupplierNameAlias(row, supplierNameCol);
};

const findSupplierIdByName = async (supplierName, trxOrDb = null) => {
  const row = await findSupplierByName(supplierName, trxOrDb);
  const idCol = PARTNER_SCHEMA.SUPPLIER.COLS.ID;
  return row && row[idCol] !== undefined ? Number(row[idCol]) || null : null;
};

const findSupplierIdByNormalizedName = async (supplierName, trxOrDb = null) => {
  const normalizedName = normalizeLookupName(supplierName).trim().toLowerCase();
  if (!normalizedName) return null;

  const query = getQuery(trxOrDb);
  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();
  const row = await query(supplierTable)
    .select("id")
    .whereRaw(`LOWER(TRIM(??::text)) = ?`, [supplierNameCol, normalizedName])
    .first();

  return row && row.id !== undefined ? Number(row.id) || null : null;
};

module.exports = {
  findSupplierById,
  findSupplierByName,
  findSupplierIdByName,
  findSupplierIdByNormalizedName,
};

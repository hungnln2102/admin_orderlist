const { db } = require("@/db");
const { PARTNER_SCHEMA } = require("@/config/dbSchema");
const { getNextSupplyId } = require("@/services/idService");
const { normalizeTextInput } = require("@/utils/normalizers");
const {
  resolveSupplierNameColumn,
  resolveSupplierTableName,
} = require("@/domains/supplies/controller/helpers");

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

const ensureSupplierRecord = async (supplierName, numberBank, binBank, trxOrDb = null) => {
  const normalizedName = normalizeTextInput(supplierName);
  if (!normalizedName) return null;

  const existingId = await findSupplierIdByNormalizedName(normalizedName, trxOrDb);
  if (existingId) return existingId;

  const query = getQuery(trxOrDb);
  const supplierTable = await resolveSupplierTableName();
  const cols = PARTNER_SCHEMA.SUPPLIER.COLS;
  const nextSupplierId = await getNextSupplyId();
  const payload = {
    [cols.ID]: nextSupplierId,
    [cols.SUPPLIER_NAME]: normalizedName,
    [cols.NUMBER_BANK]: normalizeTextInput(numberBank) || null,
    [cols.BIN_BANK]: normalizeTextInput(binBank) || null,
  };

  try {
    const [inserted] = await query(supplierTable)
      .insert({ ...payload, [cols.ACTIVE_SUPPLY]: true })
      .returning(cols.ID);
    const insertedId = typeof inserted === "object" ? inserted?.[cols.ID] : inserted;
    return Number(insertedId) || nextSupplierId;
  } catch (_error) {
    const [inserted] = await query(supplierTable).insert(payload).returning(cols.ID);
    const insertedId = typeof inserted === "object" ? inserted?.[cols.ID] : inserted;
    return Number(insertedId) || nextSupplierId;
  }
};

module.exports = {
  ensureSupplierRecord,
  findSupplierById,
  findSupplierByName,
  findSupplierIdByName,
  findSupplierIdByNormalizedName,
};

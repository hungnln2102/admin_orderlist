const { db } = require("../db");
const {
  tableName,
  getDefinition,
  DB_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
} = require("../config/dbSchema");

const TABLES = {
  accountStorage: tableName(DB_SCHEMA.ACCOUNT_STORAGE.TABLE),
  supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER),
  supplyPrice: tableName(PARTNER_SCHEMA.SUPPLIER_COST.TABLE, SCHEMA_SUPPLIER_COST),
  productDesc: tableName(DB_SCHEMA.PRODUCT_DESC.TABLE),
};

const ACCOUNT_STORAGE_COLS = getDefinition("ACCOUNT_STORAGE").columns;
const SUPPLY_COLS = getDefinition("SUPPLIER", PARTNER_SCHEMA).columns;
const SUPPLY_PRICE_COLS = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA).columns;
const PRODUCT_DESC_COLS = getDefinition("PRODUCT_DESC").columns;

const nextId = async (tableName, columnName = "id", trx = db) => {
  await trx.raw(`LOCK TABLE ${tableName} IN EXCLUSIVE MODE;`);
  const result = await trx.raw(
    `SELECT COALESCE(MAX(${columnName}), 0) + 1 AS next_id FROM ${tableName};`
  );
  const nextRow = result?.rows?.[0] || {};
  const nextIdValue = Number(nextRow.next_id);
  return Number.isFinite(nextIdValue) ? nextIdValue : 1;
};

const getNextAccountStorageId = (trx = db) =>
  nextId(TABLES.accountStorage, ACCOUNT_STORAGE_COLS.id, trx);

const getNextSupplyId = (trx = db) =>
  nextId(TABLES.supply, SUPPLY_COLS.id, trx);

const getNextSupplyPriceId = (trx = db) =>
  nextId(TABLES.supplyPrice, SUPPLY_PRICE_COLS.id, trx);

const getNextProductDescId = (trx = db) =>
  nextId(TABLES.productDesc, PRODUCT_DESC_COLS.id, trx);

module.exports = {
  nextId,
  getNextAccountStorageId,
  getNextSupplyId,
  getNextSupplyPriceId,
  getNextProductDescId,
};

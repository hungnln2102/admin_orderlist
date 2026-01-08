const { db } = require("../db");
const {
  tableName,
  getDefinition,
  PARTNER_SCHEMA,
  PRODUCT_SCHEMA,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
} = require("../config/dbSchema");

const ACCOUNT_DEF = getDefinition("ACCOUNT_STORAGE", PRODUCT_SCHEMA);
const PRODUCT_DESC_DEF = getDefinition("PRODUCT_DESC", PRODUCT_SCHEMA);

const TABLES = {
  accountStorage: tableName(ACCOUNT_DEF.tableName, SCHEMA_PRODUCT),
  supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER),
  supplyPrice: tableName(PARTNER_SCHEMA.SUPPLIER_COST.TABLE, SCHEMA_SUPPLIER_COST),
  productDesc: tableName(PRODUCT_DESC_DEF.tableName, SCHEMA_PRODUCT),
};

const ACCOUNT_STORAGE_COLS = ACCOUNT_DEF.columns;
const SUPPLY_COLS = getDefinition("SUPPLIER", PARTNER_SCHEMA).columns;
const SUPPLY_PRICE_COLS = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA).columns;
const PRODUCT_DESC_COLS = PRODUCT_DESC_DEF.columns;

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

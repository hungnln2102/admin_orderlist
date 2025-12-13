const { db } = require("../db");
const { tableName, getDefinition, DB_SCHEMA } = require("../config/dbSchema");

const TABLES = {
  accountStorage: tableName(DB_SCHEMA.ACCOUNT_STORAGE.TABLE),
  productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
  supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
  supplyPrice: tableName(DB_SCHEMA.SUPPLY_PRICE.TABLE),
  productDesc: tableName(DB_SCHEMA.PRODUCT_DESC.TABLE),
};

const ACCOUNT_STORAGE_COLS = getDefinition("ACCOUNT_STORAGE").columns;
const PRODUCT_PRICE_COLS = getDefinition("PRODUCT_PRICE").columns;
const SUPPLY_COLS = getDefinition("SUPPLY").columns;
const SUPPLY_PRICE_COLS = getDefinition("SUPPLY_PRICE").columns;
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

const getNextProductPriceId = (trx = db) =>
  nextId(TABLES.productPrice, PRODUCT_PRICE_COLS.id, trx);

const getNextSupplyId = (trx = db) =>
  nextId(TABLES.supply, SUPPLY_COLS.id, trx);

const getNextSupplyPriceId = (trx = db) =>
  nextId(TABLES.supplyPrice, SUPPLY_PRICE_COLS.id, trx);

const getNextProductDescId = (trx = db) =>
  nextId(TABLES.productDesc, PRODUCT_DESC_COLS.id, trx);

module.exports = {
  nextId,
  getNextAccountStorageId,
  getNextProductPriceId,
  getNextSupplyId,
  getNextSupplyPriceId,
  getNextProductDescId,
};

const { ORDERS_SCHEMA, SCHEMA_ORDERS, getDefinition, tableName } = require("../config/dbSchema");

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const ORDER_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const ORDER_COLS = ORDER_DEF.columns;

const TABLES = {
  orderList: tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS),
  orderExpired: tableName(ORDERS_SCHEMA.ORDER_EXPIRED.TABLE, SCHEMA_ORDERS),
  orderCanceled: tableName(ORDERS_SCHEMA.ORDER_CANCELED.TABLE, SCHEMA_ORDERS),
};

const COL = {
  idOrder: quoteIdent(ORDER_COLS.idOrder),
  idProduct: quoteIdent(ORDER_COLS.idProduct),
  informationOrder: quoteIdent(ORDER_COLS.informationOrder),
  customer: quoteIdent(ORDER_COLS.customer),
  contact: quoteIdent(ORDER_COLS.contact),
  slot: quoteIdent(ORDER_COLS.slot),
  orderDate: quoteIdent(ORDER_COLS.orderDate),
  days: quoteIdent(ORDER_COLS.days),
  orderExpired: quoteIdent(ORDER_COLS.orderExpired),
  supply: quoteIdent(ORDER_COLS.supply),
  cost: quoteIdent(ORDER_COLS.cost),
  price: quoteIdent(ORDER_COLS.price),
  note: quoteIdent(ORDER_COLS.note),
  status: quoteIdent(ORDER_COLS.status),
};

function normalizeDateSQL(column) {
  return `
  CASE
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(TRIM(${column}::text), 'DD/MM/YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}[ T]' THEN TO_DATE(SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10), 'DD/MM/YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(TRIM(${column}::text), 'DD-MM-YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}[ T]' THEN TO_DATE(SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10), 'DD-MM-YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TRIM(${column}::text)::date
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]' THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10)::date
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}$' THEN TO_DATE(TRIM(${column}::text), 'YYYY/MM/DD')
    WHEN TRIM(${column}::text) ~ '^[0-9]{8}$' THEN TO_DATE(TRIM(${column}::text), 'YYYYMMDD')
    ELSE NULL
  END`;
}

function intFromTextSQL(column) {
  return `
  CASE WHEN TRIM(${column}::text) ~ '^-?[0-9]+$' THEN TRIM(${column}::text)::int ELSE NULL END`;
}

function expiryDateSQL() {
  return `
  COALESCE(
    ${normalizeDateSQL(COL.orderExpired)},
    (${normalizeDateSQL(COL.orderDate)} + (COALESCE(${intFromTextSQL(COL.days)}, 0) - 1))
  )
  `;
}

module.exports = {
  COL,
  TABLES,
  ORDER_COLS,
  normalizeDateSQL,
  intFromTextSQL,
  expiryDateSQL,
};

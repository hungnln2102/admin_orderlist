const {
  ADMIN_SCHEMA,
  FINANCE_SCHEMA,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
  ORDERS_SCHEMA,
  getDefinition,
} = require("../config/dbSchema");
const { quoteIdent } = require("./sql");

const toCamel = (key = "") =>
  String(key)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part, idx) =>
      idx === 0 ? part : part[0].toUpperCase() + part.slice(1)
    )
    .join("");

const quoteColumns = (cols = {}) =>
  Object.fromEntries(
    Object.entries(cols).map(([key, value]) => [key, quoteIdent(value)])
  );

const makeEntries = (schemaMap) =>
  Object.keys(schemaMap).map((schemaKey) => {
    const def = getDefinition(schemaKey, schemaMap);
    const camelKey = toCamel(schemaKey);
    if (!def) return [camelKey, {}];
    return [camelKey, quoteColumns(def.columns)];
  });

const QUOTED_COLS = Object.fromEntries([
  ...makeEntries(ADMIN_SCHEMA),
  ...makeEntries(FINANCE_SCHEMA),
  ...makeEntries(PRODUCT_SCHEMA),
  ...makeEntries(PARTNER_SCHEMA),
  ...makeEntries(ORDERS_SCHEMA),
]);

module.exports = {
  quoteColumns,
  QUOTED_COLS,
};

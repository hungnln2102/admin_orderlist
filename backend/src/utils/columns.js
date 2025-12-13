const { DB_SCHEMA, getDefinition } = require("../config/dbSchema");
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

const QUOTED_COLS = Object.fromEntries(
  Object.keys(DB_SCHEMA).map((schemaKey) => {
    const def = getDefinition(schemaKey);
    const camelKey = toCamel(schemaKey);
    if (!def) return [camelKey, {}];
    return [camelKey, quoteColumns(def.columns)];
  })
);

module.exports = {
  quoteColumns,
  QUOTED_COLS,
};

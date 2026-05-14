/**
 * Cột linked_order_code + expense_meta (migration Knex 20260629200000).
 * dbSchema luôn khai báo COLS nên không thể dùng COLS.* để biết DB đã migrate hay chưa.
 */
const { db } = require("../../../db");
const { FINANCE_SCHEMA, SCHEMA_FINANCE } = require("../../../config/dbSchema");

let cache = { value: null, checkedAt: 0 };
const CACHE_MS = 5 * 60 * 1000;

function validIdent(name) {
  const s = String(name || "").trim().toLowerCase();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) ? s : "";
}

/**
 * @returns {Promise<boolean>}
 */
async function storeProfitExpensesHasMavnColumns() {
  const now = Date.now();
  if (cache.value !== null && now - cache.checkedAt < CACHE_MS) {
    return cache.value;
  }
  const schema = validIdent(SCHEMA_FINANCE);
  const table = validIdent(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE);
  if (!schema || !table) {
    cache = { value: false, checkedAt: now };
    return false;
  }
  const rows = await db("information_schema.columns")
    .select("column_name")
    .where({ table_schema: schema, table_name: table })
    .whereIn("column_name", ["linked_order_code", "expense_meta"]);
  const names = new Set((rows || []).map((r) => r.column_name));
  const has = names.has("linked_order_code") && names.has("expense_meta");
  cache = { value: has, checkedAt: now };
  return has;
}

function clearStoreProfitExpensesMavnColumnsCacheForTests() {
  cache = { value: null, checkedAt: 0 };
}

module.exports = {
  storeProfitExpensesHasMavnColumns,
  clearStoreProfitExpensesMavnColumnsCacheForTests,
};

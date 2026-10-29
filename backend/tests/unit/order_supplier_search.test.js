const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const { db, TABLES, COLS } = require("@/db");
const O_COLS = COLS.ORDER_LIST;

test("Knex search clause correctly constructs supplier subqueries", () => {
  const trimmedSearch = "Member";
  const query = db(TABLES.ORDER_LIST).where((builder) => {
    builder
      .whereILike(O_COLS.ID_ORDER, `%${trimmedSearch}%`)
      .orWhereILike(O_COLS.CUSTOMER, `%${trimmedSearch}%`)
      .orWhereILike(O_COLS.CONTACT, `%${trimmedSearch}%`)
      .orWhereILike(O_COLS.INFORMATION_ORDER, `%${trimmedSearch}%`)
      .orWhereIn(O_COLS.SUPPLY_ID, function () {
        this.select(COLS.SUPPLIER.ID)
          .from(TABLES.SUPPLIER)
          .whereILike(COLS.SUPPLIER.SUPPLIER_NAME, `%${trimmedSearch}%`);
      })
      .orWhereIn(O_COLS.ID, function () {
        this.select(COLS.SUPPLIER_ORDER_COST_LOG.ORDER_LIST_ID)
          .from(TABLES.SUPPLIER_ORDER_COST_LOG)
          .whereIn(COLS.SUPPLIER_ORDER_COST_LOG.SUPPLY_ID, function () {
            this.select(COLS.SUPPLIER.ID)
              .from(TABLES.SUPPLIER)
              .whereILike(COLS.SUPPLIER.SUPPLIER_NAME, `%${trimmedSearch}%`);
          });
      });
  });

  const sql = query.toSQL().sql;

  // Verify the SQL contains whereILike for all 4 basic fields
  assert.match(sql, /id_order/i);
  assert.match(sql, /customer/i);
  assert.match(sql, /contact/i);
  assert.match(sql, /information_order/i);

  // Verify the SQL contains subqueries for supplier and supplier_order_cost_log
  assert.match(sql, /supply_id/i);
  assert.match(sql, /supplier/i);
  assert.match(sql, /supplier_name/i);
  assert.match(sql, /supplier_order_cost_log/i);
  assert.match(sql, /order_list_id/i);

  // Verify bindings count: 6 occurrences of `%Member%`
  assert.equal(query.toSQL().bindings.length, 6);
  assert.deepEqual(query.toSQL().bindings, [
    "%Member%",
    "%Member%",
    "%Member%",
    "%Member%",
    "%Member%",
    "%Member%"
  ]);
});


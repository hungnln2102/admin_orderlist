const test = require("node:test");
const assert = require("node:assert/strict");

const migration = require("../../src/db/migrations/20261119000001_make_portal_routing_legacy_product_keys_nullable");

function createKnex(columns) {
  const rawCalls = [];
  const queriedColumns = [];
  const knex = (table) => {
    assert.equal(table, "information_schema.columns");
    return {
      select() {
        return this;
      },
      where(criteria) {
        queriedColumns.push(criteria.column_name);
        return this;
      },
      async first() {
        const columnName = queriedColumns.at(-1);
        return columns[columnName] ?? null;
      },
    };
  };

  knex.schema = {
    withSchema() {
      return {
        async hasTable() {
          return true;
        },
      };
    },
  };
  knex.raw = async (sql, bindings) => rawCalls.push({ sql, bindings });
  return { knex, rawCalls, queriedColumns };
}

test("portal routing migration makes each present legacy product key nullable", async () => {
  const { knex, rawCalls, queriedColumns } = createKnex({
    product_id: { is_nullable: "NO" },
    product_name_id: { is_nullable: "NO" },
  });

  await migration.up(knex);

  assert.deepEqual(queriedColumns, ["product_id", "product_name_id"]);
  assert.equal(rawCalls.length, 2);
  assert.deepEqual(rawCalls[0].bindings, ["system_automation", "portal_slot_routing_rules", "product_id"]);
  assert.deepEqual(rawCalls[1].bindings, ["system_automation", "portal_slot_routing_rules", "product_name_id"]);
});

test("portal routing migration skips absent and already-nullable legacy keys", async () => {
  const { knex, rawCalls } = createKnex({
    product_id: null,
    product_name_id: { is_nullable: "YES" },
  });

  await migration.up(knex);

  assert.deepEqual(rawCalls, []);
});
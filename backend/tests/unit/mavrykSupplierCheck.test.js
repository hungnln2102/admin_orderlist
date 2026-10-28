const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const {
  isMavrykSupplier,
  isMavrykSupplierSync,
} = require("@/domains/suppliers/utils/supplierCheck");

test("isMavrykSupplierSync identifies Mavryk correctly", () => {
  assert.equal(isMavrykSupplierSync({ supply_id: 22 }), true);
  assert.equal(isMavrykSupplierSync({ supply_id: "22" }), true);
  assert.equal(isMavrykSupplierSync({ supplier_name: "Mavryk" }), true);
  assert.equal(isMavrykSupplierSync({ supplier_name: "mavryk " }), true);
  assert.equal(isMavrykSupplierSync({ supply: "MAVRYK" }), true);
  assert.equal(isMavrykSupplierSync({ supply_name: "Mavryk" }), true);

  // Other suppliers
  assert.equal(isMavrykSupplierSync({ supply_id: 13, supplier_name: "Member Ji" }), false);
  assert.equal(isMavrykSupplierSync({ supply_id: 6, supplier_name: "Kenny" }), false);
  assert.equal(isMavrykSupplierSync(null), false);
  assert.equal(isMavrykSupplierSync({}), false);
});

test("isMavrykSupplier async function checks objects and ids with mock db", async () => {
  const mockDb = (tableName) => {
    const chain = {
      where: (criteria) => {
        chain._criteria = criteria;
        return chain;
      },
      select: () => chain,
      first: async () => {
        const crit = chain._criteria || {};
        if (crit.id === 22 || crit.id === "22") return { supplier_name: "Mavryk" };
        if (crit.id === 99) return { supplier_name: "Mavryk" };
        if (crit.id === 13) return { supplier_name: "Member Ji" };
        if (crit.id_order === "ORD_MAV") return { supply_id: 22 };
        if (crit.id_order === "ORD_EXT") return { supply_id: 13 };
        return null;
      },
    };
    return chain;
  };

  assert.equal(await isMavrykSupplier(mockDb, 22), true);
  assert.equal(await isMavrykSupplier(mockDb, "22"), true);
  assert.equal(await isMavrykSupplier(mockDb, 99), true);
  assert.equal(await isMavrykSupplier(mockDb, 13), false);

  assert.equal(await isMavrykSupplier(mockDb, { supply_id: 22 }), true);
  assert.equal(await isMavrykSupplier(mockDb, { supply_id: 13 }), false);
  assert.equal(await isMavrykSupplier(mockDb, { supplier_name: "Mavryk" }), true);
  assert.equal(await isMavrykSupplier(mockDb, { id_order: "ORD_MAV" }), true);
  assert.equal(await isMavrykSupplier(mockDb, { id_order: "ORD_EXT" }), false);
});


const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const warehouseService = require("@/domains/warehouse/services/warehouseService");
const { db } = require("@/db");

test("Warehouse Integration Tests (V2)", async (t) => {
  t.after(async () => {
    await db.destroy();
  });
  await t.test("1. listWarehouseAccounts returns seeded accounts including murciacelos@gmail.com", async () => {
    const accounts = await warehouseService.listWarehouseAccounts();
    assert.ok(Array.isArray(accounts));
    assert.ok(accounts.length >= 1, "Should have at least 1 account");

    const murcia = accounts.find((a) => a.account.includes("murciacelos@gmail.com"));
    assert.ok(murcia, "Should contain murciacelos@gmail.com account");
    assert.equal(murcia.account, "murciacelos@gmail.com");
    assert.ok(Array.isArray(murcia.services), "Services should be an array");
    assert.ok(murcia.services.length >= 2, "murciacelos should have Youtube Premium and Mail");

    const ytService = murcia.services.find((s) => s.display_name === "Youtube Premium");
    assert.ok(ytService, "Should have Youtube Premium slot");
    assert.equal(ytService.password, "qhw12ybv4o");
    assert.ok(ytService.two_fa.includes("rere"), "Should have 2FA secret");
    assert.equal(ytService.status, "AVAILABLE");
  });

  await t.test("2. listCatalogItems returns catalog list with accurate stats", async () => {
    const catalog = await warehouseService.listCatalogItems();
    assert.ok(Array.isArray(catalog));
    assert.ok(catalog.length > 0);

    const first = catalog[0];
    assert.ok(first.name);
    assert.ok(typeof first.inStockSlots === "number");
    assert.ok(typeof first.reservedSlots === "number");
  });

  await t.test("3. createWarehouseAccount and deleteWarehouseAccount lifecycle", async () => {
    const testAccountEmail = `test_account_${Date.now()}@testmavryk.com`;
    const created = await warehouseService.createWarehouseAccount({
      account: testAccountEmail,
      serviceName: "Youtube Premium",
      password: "TestPassword123!",
      backupEmail: "backup_test@test.com",
      twoFa: "TEST 2FAK EY12 3456",
      note: "Test note integration",
    });

    assert.ok(created.id);
    assert.equal(created.account, testAccountEmail);

    // Verify it exists in the list
    const listAfter = await warehouseService.listWarehouseAccounts();
    const found = listAfter.find((a) => a.account === testAccountEmail);
    assert.ok(found, "Newly created account must appear in list");
    assert.equal(found.services.length, 1);
    assert.equal(found.services[0].password, "TestPassword123!");

    // Delete it
    const delResult = await warehouseService.deleteWarehouseAccount(created.id);
    assert.equal(delResult.success, true);

    // Verify it is gone
    const listFinal = await warehouseService.listWarehouseAccounts();
    const notFound = listFinal.find((a) => a.account === testAccountEmail);
    assert.equal(notFound, undefined, "Deleted account should no longer exist");
  });
});

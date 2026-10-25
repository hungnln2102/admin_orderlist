const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const warehouseService = require("@/domains/warehouse/services/warehouseService");
const { db } = require("@/db");

test("Warehouse Integration Tests (V2)", async (t) => {
  t.after(async () => {
    await db.destroy();
  });
  await t.test("1. listWarehouseAccounts returns accounts structure properly", async () => {
    let accounts = await warehouseService.listWarehouseAccounts();
    assert.ok(Array.isArray(accounts));

    if (accounts.length === 0) {
      await warehouseService.createWarehouseAccount({
        account: "murciacelos@gmail.com",
        serviceName: "Youtube Premium",
        password: "qhw12ybv4o",
        twoFa: "rere test 2fa",
      });
      accounts = await warehouseService.listWarehouseAccounts();
    }

    assert.ok(accounts.length >= 1, "Should have at least 1 account");
    const account = accounts[0];
    assert.ok(account.account, "Must have account email");
    assert.ok(Array.isArray(account.services), "Services should be an array");
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

  await t.test("4. deleteCatalogItem enforces empty warehouse rule", async () => {
    // 4.1. Finding a service that has existing slots (e.g. Youtube Premium)
    const catalog = await warehouseService.listCatalogItems();
    const serviceWithStock = catalog.find((c) => c.inStockSlots > 0 || c.reservedSlots > 0);

    if (serviceWithStock) {
      await assert.rejects(
        async () => {
          await warehouseService.deleteCatalogItem(serviceWithStock.id);
        },
        (err) => {
          assert.match(err.message, /Kho phải trống hoàn toàn/);
          return true;
        },
        "Must reject deletion of catalog item with existing stock"
      );
    }

    // 4.2. Create an empty catalog item and delete it successfully
    const emptyServiceName = `EmptyService_${Date.now()}`;
    const createdItem = await warehouseService.createCatalogItem({ name: emptyServiceName });
    assert.ok(createdItem.id);

    // Should succeed since slots = 0
    const delRes = await warehouseService.deleteCatalogItem(createdItem.id);
    assert.equal(delRes.success, true);

    // Verify it was removed
    const listAfter = await warehouseService.listCatalogItems();
    const checkItem = listAfter.find((c) => c.id === createdItem.id);
    assert.equal(checkItem, undefined, "Deleted empty catalog service must no longer exist");
  });

  await t.test("5. openAccountBrowser launches dedicated browser profile with login_url", async () => {
    // 5.1. Verify catalog has loginUrl
    const catalog = await warehouseService.listCatalogItems();
    const ytItem = catalog.find((c) => c.name.toLowerCase().includes("youtube"));
    assert.ok(ytItem, "Youtube item should exist in catalog");
    assert.equal(ytItem.loginUrl, "https://accounts.google.com");

    // 5.2. Create test account
    const testAccount = await warehouseService.createWarehouseAccount({
      account: `browser_test_${Date.now()}@test.com`,
      serviceName: "Youtube Premium",
      password: "TestPassword123!",
    });
    assert.ok(testAccount.id);

    // 5.3. Test openAccountBrowser
    const launchResult = await warehouseService.openAccountBrowser(testAccount.id, {
      serviceName: "Youtube Premium",
    });

    assert.equal(launchResult.success, true);
    assert.ok(launchResult.data.profileDir.includes(`account_${testAccount.id}`));
    assert.equal(launchResult.data.targetUrl, "https://accounts.google.com");

    // Cleanup account
    await warehouseService.deleteWarehouseAccount(testAccount.id);
  });

  await t.test("6. updateWarehouseServiceSlot updates credentials, 2fa, and account username", async () => {
    // 6.1. Create a test account with a slot
    const acc = await warehouseService.createWarehouseAccount({
      account: `slot_edit_${Date.now()}@test.com`,
      serviceName: "Youtube Premium",
      password: "initial_pass",
      twoFa: "initial_2fa",
      backupEmail: "initial_backup@test.com",
    });

    const accounts = await warehouseService.listWarehouseAccounts();
    const foundAcc = accounts.find((a) => a.id === acc.id);
    assert.ok(foundAcc, "Account should be created");
    assert.ok(foundAcc.services.length > 0, "Account should have 1 service slot");
    const slot = foundAcc.services[0];

    // 6.2. Update the slot
    const updated = await warehouseService.updateWarehouseServiceSlot(slot.id, {
      password: "new_super_password_456",
      twoFa: "JBSWY3DPEHPK3PXP",
      backupEmail: "updated_backup@gmail.com",
      status: "IN_USE",
      note: "Updated via slot edit modal",
      accountUsername: `slot_edited_user_${Date.now()}@test.com`,
    });

    assert.equal(updated.password, "new_super_password_456");
    assert.equal(updated.two_fa, "JBSWY3DPEHPK3PXP");
    assert.equal(updated.backup_email, "updated_backup@gmail.com");
    assert.equal(updated.status, "IN_USE");
    assert.equal(updated.note, "Updated via slot edit modal");

    // Cleanup
    await warehouseService.deleteWarehouseAccount(acc.id);
  });
});

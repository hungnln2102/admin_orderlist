const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

test("Warehouse Service & Controller Exports Integrity Suite", async (t) => {
  await t.test("warehouseService exports đầy đủ các hàm nghiệp vụ, không bị ReferenceError", () => {
    const warehouseService = require("@/domains/warehouse/services/warehouseService");

    const expectedMethods = [
      "listWarehouseAccounts",
      "createWarehouseAccount",
      "deleteWarehouseAccount",
      "updateWarehouseAccount",
      "addServiceSlotToAccount",
      "deleteWarehouseServiceSlot",
      "updateWarehouseServiceSlot",
      "listCatalogItems",
      "createCatalogItem",
      "updateCatalogItem",
      "deleteCatalogItem",
      "openAccountBrowser",
      "getSystemProducts",
      "renameCatalogTag",
      "deleteCatalogTag",
      "syncOrderDateByEmail",
      "toggleCatalogPackage",
    ];

    for (const method of expectedMethods) {
      assert.equal(
        typeof warehouseService[method],
        "function",
        `warehouseService.${method} phải là một function`
      );
    }
  });

  await t.test("warehouseController nạp thành công và chứa controller updateCatalogItem", () => {
    const controller = require("@/domains/warehouse/controllers/warehouseController");
    assert.equal(typeof controller.updateCatalogItem, "function");
    assert.equal(typeof controller.getWarehouseAccounts, "function");
    assert.equal(typeof controller.createWarehouseAccount, "function");
  });
});

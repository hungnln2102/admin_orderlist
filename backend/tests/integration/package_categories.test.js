const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const productService = require("@/domains/products/services/productService");
const { db } = require("@/db");

test("Package Categories Integration Tests (V2)", async (t) => {
  t.after(async () => {
    await db.destroy();
  });

  await t.test("1. getPackageCategories returns categories with isPackage: true", async () => {
    const categories = await productService.getPackageCategories();
    assert.ok(Array.isArray(categories));
    assert.ok(categories.length >= 6, "Should contain at least 6 standard package categories");

    const adobe = categories.find((c) => c.name.toLowerCase() === "adobe");
    assert.ok(adobe, "Adobe should exist in package categories");
    assert.equal(adobe.isPackage, true);
  });

  await t.test("2. createPackageCategory and updatePackageCategory lifecycle", async () => {
    const testCatName = `TestPkg_${Date.now()}`;
    const created = await productService.createPackageCategory({ name: testCatName });
    assert.ok(created.id);
    assert.equal(created.name, testCatName);
    assert.equal(created.isPackage, true);

    // Verify it appears in getPackageCategories
    const list = await productService.getPackageCategories();
    const found = list.find((c) => c.name === testCatName);
    assert.ok(found, "Newly created category should be returned");

    // Update category name
    const updatedName = `${testCatName}_Updated`;
    const updated = await productService.updatePackageCategory({
      oldName: testCatName,
      newName: updatedName,
    });
    assert.equal(updated.name, updatedName);
    assert.equal(updated.isPackage, true);

    // Verify update reflected in DB
    const listAfter = await productService.getPackageCategories();
    const foundUpdated = listAfter.find((c) => c.name === updatedName);
    assert.ok(foundUpdated, "Updated category should be present");

    // Cleanup
    await productService.deletePackageCategory(updatedName);
    await db("warehouse.product_names").where("id", created.id).del();
  });

  await t.test("3. deletePackageCategory sets is_package = false and emits event", async () => {
    const testCatName = `TestPkg_ToDel_${Date.now()}`;
    const created = await productService.createPackageCategory({ name: testCatName });
    assert.ok(created.id);

    // Delete it
    const delResult = await productService.deletePackageCategory(testCatName);
    assert.equal(delResult.success, true);
    assert.equal(delResult.isPackage, false);

    // Verify it is NO longer returned by getPackageCategories
    const listAfter = await productService.getPackageCategories();
    const found = listAfter.find((c) => c.name === testCatName);
    assert.equal(found, undefined, "Deleted category should not be in active packages list");

    // Verify it still exists in warehouse.product_names with is_package = false
    const row = await db("warehouse.product_names").where("id", created.id).first();
    assert.ok(row, "Row must still exist in DB (soft delete)");
    assert.equal(row.is_package, false);

    // Hard delete test row
    await db("warehouse.product_names").where("id", created.id).del();
  });

  await t.test("4. getAllCatalogProductNames returns all master catalog names", async () => {
    const catalog = await productService.getAllCatalogProductNames();
    assert.ok(Array.isArray(catalog));
    assert.ok(catalog.length > 0, "Catalog should have entries");

    const item = catalog[0];
    assert.ok(item.id, "Catalog item must have id");
    assert.ok(item.name, "Catalog item must have name");
    assert.equal(typeof item.isPackage, "boolean", "isPackage should be boolean");
  });

  await t.test("5. createPackageProduct & updatePackageProduct with linked storage account", async () => {
    const catName = `CloudStorage_${Date.now()}`;
    await productService.createPackageCategory({ name: catName, requiresStorage: true });

    const rootEmail = `root_${Date.now()}@domain.com`;
    const storageEmail = `storage_${Date.now()}@domain.com`;

    const newPkg = await productService.createPackageProduct({
      name: `${catName} 2TB`,
      category: catName,
      accountUsername: rootEmail,
      storageAccountUsername: storageEmail,
      storageTotal: "2000 GB",
      supplier: "Google Supplier",
      costPrice: 150000,
      totalSlots: 5,
      note: "Gói test có liên kết storage",
    });

    assert.ok(newPkg.id, "Package should have an ID");
    assert.equal(newPkg.accountInfo, rootEmail);
    assert.equal(newPkg.storageAccountInfo, storageEmail);
    assert.equal(newPkg.storageTotal, "2000 GB");
    assert.equal(newPkg.totalSlots, 5);

    // Verify it is listed in getPackageProducts
    const allPkgs = await productService.getPackageProducts();
    const foundPkg = allPkgs.find((p) => p.id === newPkg.id);
    assert.ok(foundPkg, "Should be found in package list");
    assert.equal(foundPkg.storageAccountInfo, storageEmail);

    // Update package
    const updatedStorageEmail = `storage_v2_${Date.now()}@domain.com`;
    const updatedPkg = await productService.updatePackageProduct(newPkg.id, {
      storageAccountUsername: updatedStorageEmail,
      storageTotal: "5000 GB",
      costPrice: 180000,
    });

    assert.equal(updatedPkg.storageAccountInfo, updatedStorageEmail);
    assert.equal(updatedPkg.storageTotal, "5000 GB");
    assert.equal(updatedPkg.costPrice, 180000);

    // Delete package
    const delPkg = await productService.deletePackageProduct(newPkg.id);
    assert.equal(delPkg.success, true);

    // Cleanup category
    await productService.deletePackageCategory(catName);
    await db("warehouse.product_names").where("name", catName).del();
  });

  await t.test("6. getPackageProducts slot matching only includes PAID and RENEW_REQUIRED with valid expired_at", async () => {
    const { TABLES } = require("@/db");
    const { ORDER_STATUS } = require("@/constants/orderStatus");

    const testAccount = `slot_test_acc_${Date.now()}@domain.com`;
    const createdPkg = await productService.createPackageProduct({
      name: "TestSlotMatching",
      category: "TestSlotMatching",
      accountUsername: testAccount,
      totalSlots: 5,
      costPrice: 100000,
      matchRule: "information",
    });

    // Tạo các đơn thử nghiệm:
    // 1. Đơn PAID còn hạn -> PHẢI MATCH
    // 2. Đơn RENEW_REQUIRED còn hạn -> PHẢI MATCH
    // 3. Đơn EXPIRED -> KHÔNG ĐƯỢC MATCH
    // 4. Đơn REFUNDED -> KHÔNG ĐƯỢC MATCH
    // 5. Đơn MAVN (nhập hàng) -> KHÔNG ĐƯỢC MATCH
    // 6. Đơn PAID nhưng đã quá hạn ngày (expired_at trong quá khứ) -> KHÔNG ĐƯỢC MATCH
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0];

    const testOrders = [
      { id_order: `MAVC_SLOT_VALID_1_${Date.now()}`, information_order: testAccount, status: ORDER_STATUS.PAID, expired_at: futureDate },
      { id_order: `MAVC_SLOT_VALID_2_${Date.now()}`, information_order: testAccount, status: ORDER_STATUS.RENEW_REQUIRED, expired_at: futureDate },
      { id_order: `MAVC_SLOT_EXPIRED_${Date.now()}`, information_order: testAccount, status: ORDER_STATUS.EXPIRED, expired_at: pastDate },
      { id_order: `MAVC_SLOT_REFUND_${Date.now()}`, information_order: testAccount, status: ORDER_STATUS.REFUNDED, expired_at: futureDate },
      { id_order: `MAVN_SLOT_IMPORT_${Date.now()}`, information_order: testAccount, status: ORDER_STATUS.PAID, expired_at: futureDate },
      { id_order: `MAVC_SLOT_PAST_EXP_${Date.now()}`, information_order: testAccount, status: ORDER_STATUS.PAID, expired_at: pastDate },
    ];

    await db(TABLES.ORDER_LIST).insert(testOrders);

    try {
      const allPkgs = await productService.getPackageProducts();
      const targetPkg = allPkgs.find((p) => p.id === createdPkg.id);

      assert.ok(targetPkg, "Gói thử nghiệm phải tồn tại");
      assert.equal(targetPkg.usedSlots, 2, "Chỉ có đúng 2 đơn hợp lệ (PAID & RENEW_REQUIRED còn hạn) được chiếm slot");
      assert.equal(targetPkg.slotAssignments.length, 2, "Danh sách slotAssignments chỉ chứa 2 đơn hợp lệ");

      const matchedCodes = targetPkg.slotAssignments.map((s) => s.orderCode);
      assert.ok(matchedCodes.includes(testOrders[0].id_order), "Phải match đơn PAID còn hạn");
      assert.ok(matchedCodes.includes(testOrders[1].id_order), "Phải match đơn RENEW_REQUIRED còn hạn");
      assert.ok(!matchedCodes.includes(testOrders[2].id_order), "Tuyệt đối không match đơn EXPIRED");
      assert.ok(!matchedCodes.includes(testOrders[3].id_order), "Tuyệt đối không match đơn REFUNDED");
      assert.ok(!matchedCodes.includes(testOrders[4].id_order), "Tuyệt đối không match đơn nhập hàng MAVN");
      assert.ok(!matchedCodes.includes(testOrders[5].id_order), "Tuyệt đối không match đơn PAID đã quá hạn thực tế");
    } finally {
      // Dọn dẹp dữ liệu test
      await db(TABLES.ORDER_LIST).whereIn("id_order", testOrders.map((o) => o.id_order)).del();
      await productService.deletePackageProduct(createdPkg.id);
      await productService.deletePackageCategory("TestSlotMatching");
    }
  });
});


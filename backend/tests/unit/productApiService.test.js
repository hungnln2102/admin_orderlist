require("module-alias/register");

const test = require("node:test");
const assert = require("node:assert/strict");
const { db } = require("../../src/db");
const productApiService = require("../../src/domains/system/services/productApiService");
const productApiController = require("../../src/domains/system/controllers/productApiController");

test.after(async () => {
  await db.destroy();
});

test("Product API Service - listProductApis returns valid structure and mappings", async () => {
  const result = await productApiService.listProductApis();

  assert.ok(result, "Result should exist");
  assert.ok(Array.isArray(result.products), "products should be an array");
  assert.ok(Array.isArray(result.availableApis), "availableApis should be an array");
  assert.ok(result.products.length > 0, "products should not be empty");
  assert.ok(result.availableApis.length > 0, "availableApis should not be empty");

  // Kiểm tra sản phẩm có mapping (ví dụ Adobe hoặc Chat GPT)
  const productWithApis = result.products.find((p) => p.apis && p.apis.length > 0);
  assert.ok(productWithApis, "Should have at least one product with API mappings");

  const sampleApi = productWithApis.apis[0];
  assert.ok(sampleApi.mapping_id, "mapping_id should exist");
  assert.ok(sampleApi.provider_key, "provider_key should exist");
  assert.equal(typeof sampleApi.provider_key, "string", "provider_key should be string");
});

test("Product API Service - getApisByProductMapping returns structured indexes", async () => {
  const mapping = await productApiService.getApisByProductMapping();

  assert.ok(mapping, "Mapping result should exist");
  assert.ok(mapping.byProductId, "byProductId index should exist");
  assert.ok(mapping.byVariantId, "byVariantId index should exist");
  assert.ok(Array.isArray(mapping.allApis), "allApis should be an array");

  // Kiểm tra mapping Adobe (product_id = 1)
  const adobeApis = mapping.byProductId[1];
  if (adobeApis) {
    assert.ok(Array.isArray(adobeApis));
    assert.ok(adobeApis.some((api) => api.provider_key === "ades"));
  }
});

test("Product API Controller - list handler returns HTTP 200 with success: true", async () => {
  let responseStatus = 200;
  let responseData = null;

  const mockReq = {};
  const mockRes = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  await productApiController.list(mockReq, mockRes);

  assert.equal(responseStatus, 200, "HTTP Status should be 200");
  assert.ok(responseData, "Response body should exist");
  assert.equal(responseData.success, true, "success should be true");
  assert.ok(Array.isArray(responseData.products), "products should be array");
});

test("Product API Service - listRoutingRules returns suppliers and supplierVariants without error", async () => {
  const result = await productApiService.listRoutingRules();

  assert.ok(result, "Result should exist");
  assert.ok(Array.isArray(result.rules), "rules should be an array");
  assert.ok(Array.isArray(result.suppliers), "suppliers should be an array");
  assert.ok(Array.isArray(result.supplierVariants), "supplierVariants should be an array");
  assert.ok(result.suppliers.length > 0, "suppliers should contain active suppliers");
  assert.ok(result.supplierVariants.length > 0, "supplierVariants should contain variants");

  // Verify supplier item structure
  const firstSupplier = result.suppliers[0];
  assert.ok(firstSupplier.id, "supplier id should exist");
  assert.ok(firstSupplier.supplier_name, "supplier_name should exist");

  // Verify variant item includes is_active field
  const sampleVariant = result.supplierVariants[0];
  assert.ok(sampleVariant, "supplierVariants should have items");
  assert.equal(typeof sampleVariant.is_active, "boolean", "variant.is_active should be boolean");
});

test("Product API Controller - listRules returns HTTP 200 with rules, suppliers, and supplierVariants", async () => {
  let responseStatus = 200;
  let responseData = null;

  const mockReq = {};
  const mockRes = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  await productApiController.listRules(mockReq, mockRes);

  assert.equal(responseStatus, 200, "HTTP Status should be 200");
  assert.ok(responseData, "Response body should exist");
  assert.equal(responseData.success, true, "success should be true");
  assert.ok(Array.isArray(responseData.suppliers), "suppliers should be array");
  assert.ok(responseData.suppliers.length > 0, "suppliers should have items");
});

test("Product API Service - deleteSupplierVariant validates required parameters", async () => {
  await assert.rejects(
    async () => {
      await productApiService.deleteSupplierVariant({});
    },
    {
      name: "Error",
      message: /Không tìm thấy liên kết variant của NCC cần xóa/,
    }
  );
});

test("Product API Service - deleteSupplierVariant rejects non-existent supplierCostId", async () => {
  await assert.rejects(
    async () => {
      await productApiService.deleteSupplierVariant({ supplierCostId: 999999999 });
    },
    {
      name: "Error",
      message: /Bản ghi giá NCC không tồn tại hoặc đã bị xóa/,
    }
  );
});

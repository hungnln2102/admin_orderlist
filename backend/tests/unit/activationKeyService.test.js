require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const activationKeyService = require("../../src/domains/products/services/activationKeyService");

describe("Activation Key Generation & Format Suite", () => {
  it("generates MAVKEY codes with six uppercase base36 characters", () => {
    for (let i = 0; i < 50; i++) {
      assert.match(activationKeyService.generateOrderActivationKey(), /^MAVKEY[A-Z0-9]{6}$/);
    }
  });

  it("activateKeyWithTransaction ném lỗi khi không truyền mã key", async () => {
    await assert.rejects(
      async () => {
        await activationKeyService.activateKeyWithTransaction({ keyCode: "" });
      },
      {
        message: "Vui lòng nhập mã key kích hoạt!",
      }
    );
  });

  it("createActivationKeys ném lỗi khi không chọn product_name_id", async () => {
    await assert.rejects(
      async () => {
        await activationKeyService.createActivationKeys({ product_name_id: null });
      },
      {
        message: "Vui lòng chọn Sản phẩm / Dịch vụ áp dụng!",
      }
    );
  });

  it("saveActivationKeyRule ném lỗi khi thiếu variant_id, supplier_id, product_name_id hoặc target_variant_tag", async () => {
    const requiredFieldsMessage = "Vui lòng chọn đầy đủ Variant, Nhà cung cấp, Sản phẩm kho và Tag đích!";
    await assert.rejects(
      async () => {
        await activationKeyService.saveActivationKeyRule({ variant_id: null, supplier_id: 1, product_name_id: 1 });
      },
      {
        message: requiredFieldsMessage,
      }
    );
    await assert.rejects(
      async () => {
        await activationKeyService.saveActivationKeyRule({ variant_id: 1, supplier_id: null, product_name_id: 1 });
      },
      {
        message: requiredFieldsMessage,
      }
    );
    await assert.rejects(
      async () => {
        await activationKeyService.saveActivationKeyRule({ variant_id: 1, supplier_id: 1, product_name_id: null });
      },
      {
        message: requiredFieldsMessage,
      }
    );
    await assert.rejects(
      () => activationKeyService.saveActivationKeyRule({ variant_id: 1, supplier_id: 1, product_name_id: 1 }),
      { message: requiredFieldsMessage }
    );
  });

  it("findMatchingKeyRule trả về null khi không truyền đủ variantId hoặc supplierId", async () => {
    const res1 = await activationKeyService.findMatchingKeyRule({ variantId: null, supplierId: 1 });
    assert.equal(res1, null);
    const res2 = await activationKeyService.findMatchingKeyRule({ variantId: 1, supplierId: null });
    assert.equal(res2, null);
  });
});

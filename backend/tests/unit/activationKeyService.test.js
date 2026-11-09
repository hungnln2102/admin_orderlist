require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const activationKeyService = require("../../src/domains/products/services/activationKeyService");

describe("Activation Key Generation & Format Suite", () => {
  it("generateRandomKeyCode tạo mã key đúng định dạng PREFIX-XXXX-XXXX", () => {
    const key1 = activationKeyService.generateRandomKeyCode("GPT");
    assert.match(key1, /^GPT-[A-F0-9]{6}-[A-F0-9]{6}$/);

    const key2 = activationKeyService.generateRandomKeyCode("NETFLIX");
    assert.match(key2, /^NETFLIX-[A-F0-9]{6}-[A-F0-9]{6}$/);

    const key3 = activationKeyService.generateRandomKeyCode("");
    assert.match(key3, /^KEY-[A-F0-9]{6}-[A-F0-9]{6}$/);
  });

  it("generateRandomKeyCode tạo ra các mã key có tính ngẫu nhiên độc nhất", () => {
    const keys = new Set();
    for (let i = 0; i < 50; i++) {
      const k = activationKeyService.generateRandomKeyCode("GPT");
      assert.equal(keys.has(k), false, `Phát hiện trùng lặp mã key: ${k}`);
      keys.add(k);
    }
    assert.equal(keys.size, 50);
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
});

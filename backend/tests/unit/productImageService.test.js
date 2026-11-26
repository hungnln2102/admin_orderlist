const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadImageService() {
  const originalLoad = Module._load;
  Module._load = (request, parent, isMain) => {
    if (request === "@/db" || request === "../providers/r2ProductImageStorage") {
      return {};
    }
    return originalLoad(request, parent, isMain);
  };
  try {
    return require("../../src/domains/products/services/productImageService");
  } finally {
    Module._load = originalLoad;
  }
}

const { createProductImageService } = loadImageService();

const key = "legacy/product-image.png";
const png = {
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf90AAAAASUVORK5CYII=",
    "base64"
  ),
  mimetype: "image/png",
};

test("replacing an image writes the existing key and then purges it", async (t) => {
  const item = { key, url: "https://images.example.test/" + key };
  const mutations = [];
  const storage = {
    exists: t.mock.fn(async () => true),
    put: t.mock.fn(async () => {
      mutations.push("put");
      return item;
    }),
    delete: t.mock.fn(async () => mutations.push("delete")),
    purge: t.mock.fn(async () => {
      mutations.push("purge");
      return "purged";
    }),
  };
  const service = createProductImageService({ storage });

  const response = await service.replaceImage(key, png);

  assert.deepEqual(response, { ...item, cacheStatus: "purged" });
  assert.deepEqual(storage.exists.mock.calls.map((call) => call.arguments), [[key]]);
  assert.deepEqual(storage.put.mock.calls.map((call) => call.arguments), [
    [key, png.buffer, png.mimetype],
  ]);
  assert.deepEqual(storage.purge.mock.calls.map((call) => call.arguments), [[key]]);
  assert.deepEqual(mutations, ["put", "purge"]);
});

test("a referenced image is rejected before storage deletion or purge", async (t) => {
  const storage = {
    delete: t.mock.fn(),
    purge: t.mock.fn(),
  };
  const trx = {};
  const findImageReferences = t.mock.fn(async () => true);
  const service = createProductImageService({
    storage,
    findImageReferences,
    runWithImageLock: (_key, handler) => handler(trx),
  });

  await assert.rejects(service.deleteImage(key), { statusCode: 409 });

  assert.deepEqual(findImageReferences.mock.calls.map((call) => call.arguments), [
    [key, storage, trx],
  ]);
  assert.equal(storage.delete.mock.callCount(), 0);
  assert.equal(storage.purge.mock.callCount(), 0);
});

test("image writes reject unsupported or mismatched MIME without modifying storage", async (t) => {
  const storage = {
    exists: t.mock.fn(async () => true),
    put: t.mock.fn(),
    delete: t.mock.fn(),
    purge: t.mock.fn(),
  };
  const service = createProductImageService({ storage });
  const unsupportedMime = { buffer: png.buffer, mimetype: "text/plain" };
  const mismatchedMime = { buffer: Buffer.from("plain text"), mimetype: "image/png" };

  await assert.rejects(service.uploadImage(unsupportedMime), { statusCode: 415 });
  await assert.rejects(service.uploadImage(mismatchedMime), { statusCode: 415 });
  await assert.rejects(service.replaceImage(key, unsupportedMime), { statusCode: 415 });
  await assert.rejects(service.replaceImage(key, mismatchedMime), { statusCode: 415 });

  assert.equal(storage.put.mock.callCount(), 0);
  assert.equal(storage.delete.mock.callCount(), 0);
  assert.equal(storage.purge.mock.callCount(), 0);
});

const { randomUUID } = require("node:crypto");
const { TABLES, COLS } = require("../../../db/tables");
const r2 = require("../providers/r2ProductImageStorage");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function errorWithStatus(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function validateKey(key) {
  if (
    typeof key !== "string" || !key || Buffer.byteLength(key) > 1024
    || /[\x00-\x1f\x7f\\]/.test(key)
    || key.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw errorWithStatus(400, "Khóa ảnh không hợp lệ.");
  }
}

function validateImage(file) {
  if (!Buffer.isBuffer(file?.buffer) || !file.buffer.length) {
    throw errorWithStatus(400, "Vui lòng chọn tệp ảnh.");
  }
  if (file.buffer.length > MAX_IMAGE_BYTES) {
    throw errorWithStatus(413, "Dung lượng ảnh tối đa là 5 MiB.");
  }

  const buffer = file.buffer;
  const mimeByExtension = {
    jpg: buffer.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE) && "image/jpeg",
    png: buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) && "image/png",
    webp: buffer.toString("ascii", 0, 4) === "RIFF"
      && buffer.toString("ascii", 8, 12) === "WEBP" && "image/webp",
  };
  const extension = Object.keys(mimeByExtension).find((key) => mimeByExtension[key] === file.mimetype);
  if (!extension) {
    throw errorWithStatus(415, "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ.");
  }
  return extension;
}

async function findImageReferences(key, storage, trx) {
  // Ngăn ghi đồng thời vào các trường tham chiếu trong lúc xóa ở R2.
  await trx.raw("LOCK TABLE ??, ?? IN SHARE MODE", [TABLES.PRODUCT, TABLES.VARIANT]);
  const url = storage.urlFor(key);
  const variant = COLS.VARIANT;
  const product = COLS.PRODUCT;
  const revision = COLS.VARIANT_DESCRIPTION_REVISION;
  const hasImageUrl = (query, column) => query.whereRaw(
    "split_part(split_part(BTRIM(??), '?', 1), '#', 1) = ?", [column, url]
  );

  const productReference = await hasImageUrl(trx(TABLES.PRODUCT), product.IMAGE_URL).first(product.ID);
  if (productReference) return true;
  const variantReference = await hasImageUrl(trx(TABLES.VARIANT), variant.IMAGE_URL)
    .orWhereRaw("strpos(??, ?) > 0", [variant.DESCRIPTION, url])
    .orWhereRaw("strpos(??, ?) > 0", [variant.EDITORIAL_HTML, url])
    .first(variant.ID);
  if (variantReference) return true;
  const historyReference = await trx(TABLES.VARIANT_DESCRIPTION_REVISION)
    .whereRaw("strpos(??, ?) > 0", [revision.HTML, url])
    .first(revision.ID);
  return Boolean(historyReference);
}

function withImageLock(key, handler) {
  const { withTransaction } = require("@/db");
  return withTransaction(async (trx) => {
    await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))", ["product-image", key]);
    return handler(trx);
  });
}

function createProductImageService({ storage, findImageReferences, runWithImageLock = (_key, handler) => handler() }) {
  return {
    async listImages() {
      const items = await storage.list();
      return { items, count: items.length };
    },
    async uploadImage(file) {
      const extension = validateImage(file);
      return storage.put(`${randomUUID()}.${extension}`, file.buffer, file.mimetype);
    },
    async replaceImage(key, file) {
      validateKey(key);
      validateImage(file);
      const item = await runWithImageLock(key, async () => {
        if (!await storage.exists(key)) throw errorWithStatus(404, "Không tìm thấy ảnh.");
        return storage.put(key, file.buffer, file.mimetype);
      });
      return { ...item, cacheStatus: await storage.purge(key) };
    },
    async deleteImage(key) {
      validateKey(key);
      await runWithImageLock(key, async (trx) => {
        if (await findImageReferences(key, storage, trx)) {
          throw errorWithStatus(409, "Ảnh đang được sản phẩm hoặc biến thể sử dụng.");
        }
        await storage.delete(key);
      });
      return { ok: true, cacheStatus: await storage.purge(key) };
    },
  };
}

module.exports = {
  MAX_IMAGE_BYTES,
  createProductImageService,
  ...createProductImageService({ storage: r2, findImageReferences, runWithImageLock: withImageLock }),
};

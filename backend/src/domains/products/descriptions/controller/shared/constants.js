const path = require("path");
const fs = require("fs");
const {
  tableName,
  PRODUCT_SCHEMA,
  SCHEMA_PRODUCT,
  getDefinition,
} = require("@/config/dbSchema");

const PRODUCT_DESC_DEF = PRODUCT_SCHEMA.PRODUCT_DESC;
const PRODUCT_DEF = getDefinition("PRODUCT", PRODUCT_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);

const productDescCols = PRODUCT_DESC_DEF.COLS;
const productCols = PRODUCT_DEF.columns;
const variantCols = VARIANT_DEF.columns;

const productDescColNames = {
  id: productDescCols.ID,
  rules: productDescCols.RULES,
  description: productDescCols.DESCRIPTION,
  shortDesc: productDescCols.SHORT_DESC,
  updatedAt: productDescCols.UPDATED_AT,
};
const productColNames = {
  id: productCols.ID || productCols.id,
  packageName: productCols.PACKAGE_NAME || productCols.packageName,
  imageUrl: productCols.IMAGE_URL || productCols.imageUrl,
};
const variantColNames = {
  id: variantCols.ID || variantCols.id,
  displayName: variantCols.DISPLAY_NAME || variantCols.displayName,
  variantName: variantCols.VARIANT_NAME || variantCols.variantName,
  descVariantId: variantCols.DESC_VARIANT_ID || variantCols.descVariantId,
  productId: variantCols.PRODUCT_ID || variantCols.productId,
  imageUrl: variantCols.IMAGE_URL || variantCols.imageUrl,
};

const TABLES = {
  productDesc: tableName(PRODUCT_DESC_DEF.TABLE, SCHEMA_PRODUCT),
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
};

const IMAGE_DIR = path.join(__dirname, "../../../../image");
try {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
} catch {
  // image dir already exists hoặc readonly fs — bỏ qua, các handler sẽ tự báo lỗi cụ thể.
}

const ALLOWED_IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".avif",
]);

const isImageFile = (filename) => {
  const ext = path.extname(filename || "").toLowerCase();
  return ALLOWED_IMAGE_EXTS.has(ext);
};

module.exports = {
  productDescColNames,
  productColNames,
  variantColNames,
  TABLES,
  IMAGE_DIR,
  ALLOWED_IMAGE_EXTS,
  isImageFile,
};

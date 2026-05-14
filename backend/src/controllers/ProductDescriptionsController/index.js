/**
 * Entry mỏng cho ProductDescriptionsController.
 * Mỗi handler nằm trong `handlers/<name>.js`, share utils trong `shared/`.
 * `websiteSeoAudit.js` giữ nguyên path cũ vì có route require thẳng từ domain.
 */
const {
  listProductDescriptions,
} = require("./handlers/listProductDescriptions");
const {
  createProductDescription,
} = require("./handlers/createProductDescription");
const {
  saveProductDescription,
} = require("./handlers/saveProductDescription");
const {
  deleteProductDescriptionRecord,
} = require("./handlers/deleteProductDescriptionRecord");
const {
  uploadProductImage,
  listProductImages,
  deleteProductImage,
} = require("./handlers/productImages");

module.exports = {
  listProductDescriptions,
  createProductDescription,
  saveProductDescription,
  deleteProductDescriptionRecord,
  uploadProductImage,
  listProductImages,
  deleteProductImage,
};

/**
 * Entry mỏng cho ProductDescriptionsController.
 * Mỗi handler nằm trong `handlers/<name>.js`, share utils trong `shared/`.
 * `websiteSeoAudit.js` giữ nguyên path cũ vì có route require thẳng từ domain.
 */
const {
  listProductDescriptions,
} = require("@/domains/products/descriptions/controller/handlers/listProductDescriptions");
const {
  createProductDescription,
} = require("@/domains/products/descriptions/controller/handlers/createProductDescription");
const {
  saveProductDescription,
} = require("@/domains/products/descriptions/controller/handlers/saveProductDescription");
const {
  deleteProductDescriptionRecord,
} = require("@/domains/products/descriptions/controller/handlers/deleteProductDescriptionRecord");
const {
  uploadProductImage,
  listProductImages,
  deleteProductImage,
} = require("@/domains/products/descriptions/controller/handlers/productImages");

module.exports = {
  listProductDescriptions,
  createProductDescription,
  saveProductDescription,
  deleteProductDescriptionRecord,
  uploadProductImage,
  listProductImages,
  deleteProductImage,
};

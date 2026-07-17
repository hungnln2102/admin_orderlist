const {
  createProductPrice,
} = require("@/domains/products/controller/handlers/mutations/createProductPrice");
const {
  updateProductPrice,
} = require("@/domains/products/controller/handlers/mutations/updateProductPrice");
const {
  toggleProductPriceStatus,
} = require("@/domains/products/controller/handlers/mutations/toggleProductPriceStatus");
const {
  deleteProductPrice,
} = require("@/domains/products/controller/handlers/mutations/deleteProductPrice");

module.exports = {
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
};

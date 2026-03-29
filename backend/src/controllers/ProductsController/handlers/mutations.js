const {
  createProductPrice,
} = require("./mutations/createProductPrice");
const {
  updateProductPrice,
} = require("./mutations/updateProductPrice");
const {
  toggleProductPriceStatus,
} = require("./mutations/toggleProductPriceStatus");
const {
  deleteProductPrice,
} = require("./mutations/deleteProductPrice");

module.exports = {
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
};

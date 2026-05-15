const {
  listProducts,
  listProductPrices,
  getProductPriceById,
  listProductPackages,
} = require("./handlers/list");
const {
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
} = require("./handlers/mutations");
const {
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  createSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
} = require("./handlers/supplies");

module.exports = {
  listProducts,
  listProductPrices,
  getProductPriceById,
  listProductPackages,
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  createSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
};

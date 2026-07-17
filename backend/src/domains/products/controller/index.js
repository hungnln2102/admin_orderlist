const {
  listProducts,
  listProductPrices,
  getProductPriceById,
  listProductPackages,
} = require("@/domains/products/controller/handlers/list");
const {
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
} = require("@/domains/products/controller/handlers/mutations");
const {
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  createSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
} = require("@/domains/products/controller/handlers/supplies");

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

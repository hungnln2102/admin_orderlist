const express = require("express");
const {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
  patchProductPackageOptions,
} = require("@/domains/products/packages/controller");
const { listProductPackages } = require("@/domains/products/controller");
const {
  packageIdParam,
  createPackageRules,
  bulkDeleteRules,
  patchProductPackageOptionsRules,
} = require("@/domains/products/packages/validators/packageValidator");

const router = express.Router();

router.get("/", listPackageProducts);
router.get("/options", listProductPackages);
router.patch(
  "/product-options/:productId",
  ...patchProductPackageOptionsRules,
  patchProductPackageOptions
);
router.post("/", ...createPackageRules, createPackageProduct);
router.put("/:id", ...packageIdParam, updatePackageProduct);
router.delete("/:id", ...packageIdParam, deletePackageProduct);
router.delete("/bulk-delete", ...bulkDeleteRules, bulkDeletePackages);
router.post("/bulk-delete", ...bulkDeleteRules, bulkDeletePackages);

module.exports = router;

const express = require("express");
const {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
} = require("../controllers/PackageController");
const { packageIdParam, createPackageRules, bulkDeleteRules } = require("../validators/packageValidator");

const router = express.Router();

router.get("/", listPackageProducts);
router.post("/", ...createPackageRules, createPackageProduct);
router.put("/:id", ...packageIdParam, updatePackageProduct);
router.delete("/:id", ...packageIdParam, deletePackageProduct);
router.delete("/bulk-delete", ...bulkDeleteRules, bulkDeletePackages);
router.post("/bulk-delete", ...bulkDeleteRules, bulkDeletePackages);

module.exports = router;

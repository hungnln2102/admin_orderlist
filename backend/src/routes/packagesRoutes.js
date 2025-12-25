const express = require("express");
const {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
} = require("../controllers/PackageController");

const router = express.Router();

router.get("/", listPackageProducts);
router.post("/", createPackageProduct);
router.put("/:id", updatePackageProduct);
router.delete("/:id", deletePackageProduct);
router.delete("/bulk-delete", bulkDeletePackages);
router.post("/bulk-delete", bulkDeletePackages);

module.exports = router;

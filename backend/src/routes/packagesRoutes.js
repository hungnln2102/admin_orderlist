const express = require("express");
const {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  bulkDeletePackages,
} = require("../controllers/packagesController");

const router = express.Router();

router.get("/", listPackageProducts);
router.post("/", createPackageProduct);
router.put("/:id", updatePackageProduct);
router.delete("/bulk-delete", bulkDeletePackages);
router.post("/bulk-delete", bulkDeletePackages);

module.exports = router;

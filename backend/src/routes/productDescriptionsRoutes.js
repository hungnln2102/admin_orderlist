const express = require("express");
const {
  listProductDescriptions,
  saveProductDescription,
} = require("../controllers/productDescriptionsController");

const router = express.Router();

router.get("/", listProductDescriptions);
router.post("/", saveProductDescription);

module.exports = router;

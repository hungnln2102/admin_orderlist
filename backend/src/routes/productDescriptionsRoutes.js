const express = require("express");
const {
  listProductDescriptions,
  saveProductDescription,
} = require("../controllers/ProductDescriptionsController");

const router = express.Router();

router.get("/", listProductDescriptions);
router.post("/", saveProductDescription);

module.exports = router;

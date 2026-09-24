const express = require("express");
const router = express.Router();
const creditController = require("../controllers/creditController");

// GET /api/credits?group=available|unavailable&search=...&page=1&limit=20
router.get("/", creditController.getCreditNotes);

module.exports = router;

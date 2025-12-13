const express = require("express");
const { listBanks } = require("../controllers/banksController");

const router = express.Router();

router.get("/", listBanks);

module.exports = router;

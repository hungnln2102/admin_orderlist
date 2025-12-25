const express = require("express");
const { listBanks } = require("../controllers/BanksController");

const router = express.Router();

router.get("/", listBanks);

module.exports = router;

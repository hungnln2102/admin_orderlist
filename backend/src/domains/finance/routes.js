const express = require("express");
const { getAllocations } = require("./controller");

const router = express.Router();

router.get("/allocations", getAllocations);

module.exports = router;

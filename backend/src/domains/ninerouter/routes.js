const express = require("express");
const { forward } = require("./controller");

const router = express.Router();

router.use(forward);

module.exports = router;

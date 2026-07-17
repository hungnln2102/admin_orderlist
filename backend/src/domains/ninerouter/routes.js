const express = require("express");
const { forward } = require("@/domains/ninerouter/controller");

const router = express.Router();

router.use(forward);

module.exports = router;

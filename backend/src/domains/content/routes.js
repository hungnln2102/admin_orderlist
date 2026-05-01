const express = require("express");
const contentMediaRoutes = require("./mediaRoutes");
const contentAdminRoutes = require("../../controllers/ContentController");

const router = express.Router();
router.use(contentMediaRoutes);
router.use(contentAdminRoutes);

module.exports = router;

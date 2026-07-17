const express = require("express");
const contentMediaRoutes = require("@/domains/content/mediaRoutes");
const contentAdminRoutes = require("@/domains/content/controller");

const router = express.Router();
router.use(contentMediaRoutes);
router.use(contentAdminRoutes);

module.exports = router;

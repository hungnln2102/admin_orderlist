const express = require("express");
const {
  listExternalApis,
  getExternalApi,
  createExternalApi,
  updateExternalApi,
  deleteExternalApi,
  testExternalApi,
} = require("@/domains/system-config/controller");

const router = express.Router();

router.get("/external-apis", listExternalApis);
router.get("/external-apis/:id", getExternalApi);
router.post("/external-apis", createExternalApi);
router.put("/external-apis/:id", updateExternalApi);
router.delete("/external-apis/:id", deleteExternalApi);
router.post("/external-apis/:id/test", testExternalApi);

module.exports = router;

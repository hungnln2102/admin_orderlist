const express = require("express");
const {
  listIpWhitelists,
  createIpWhitelist,
  updateIpWhitelist,
  removeIpWhitelist,
} = require("./controller");
const { createIpWhitelistRules } = require("../../validators/ipWhitelistValidator");

const router = express.Router();

router.get("/", listIpWhitelists);
router.post("/", ...createIpWhitelistRules, createIpWhitelist);
router.put("/:id", updateIpWhitelist);
router.delete("/:id", removeIpWhitelist);

module.exports = router;

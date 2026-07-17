const express = require("express");
const {
  listIpWhitelists,
  createIpWhitelist,
  updateIpWhitelist,
  removeIpWhitelist,
} = require("@/domains/ip-whitelist/controller");
const { createIpWhitelistRules } = require("@/domains/ip-whitelist/validators/ipWhitelistValidator");

const router = express.Router();

router.get("/", listIpWhitelists);
router.post("/", ...createIpWhitelistRules, createIpWhitelist);
router.put("/:id", updateIpWhitelist);
router.delete("/:id", removeIpWhitelist);

module.exports = router;

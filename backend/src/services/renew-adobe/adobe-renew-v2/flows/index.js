const login = require("@/services/renew-adobe/adobe-renew-v2/flows/login");
const check = require("@/services/renew-adobe/adobe-renew-v2/flows/check");
const users = require("@/services/renew-adobe/adobe-renew-v2/flows/users");
const autoAssign = require("@/services/renew-adobe/adobe-renew-v2/flows/autoAssign");

module.exports = {
  login,
  check,
  users,
  autoAssign,
};

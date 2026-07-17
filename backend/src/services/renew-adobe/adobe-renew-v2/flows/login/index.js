require("@/services/renew-adobe/adobe-renew-v2/flows/login/contracts");

const { LOGIN_TIMEOUTS } = require("@/services/renew-adobe/adobe-renew-v2/flows/login/loginTimeouts");
const credentialsFlow = require("@/services/renew-adobe/adobe-renew-v2/flows/login/credentialsFlow");
const otpFlow = require("@/services/renew-adobe/adobe-renew-v2/flows/login/otpFlow");
const sessionFlow = require("@/services/renew-adobe/adobe-renew-v2/flows/login/sessionFlow");

module.exports = {
  LOGIN_TIMEOUTS,
  ...credentialsFlow,
  ...otpFlow,
  ...sessionFlow,
};

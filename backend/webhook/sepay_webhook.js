/* Sepay webhook server (Node/Express) */
require("dotenv").config();

const app = require("./sepay/app");
const { SEPAY_WEBHOOK_PATH, HOST, PORT } = require("./sepay/config");
const {
  runRenewal,
  queueRenewalTask,
  processRenewalTask,
  fetchOrderState,
} = require("./sepay/renewal");
const { sendRenewalNotification } = require("./sepay/notifications");

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Listening on http://${HOST}:${PORT}${SEPAY_WEBHOOK_PATH}`);
  });
}

module.exports = app;
module.exports.runRenewal = runRenewal;
module.exports.queueRenewalTask = queueRenewalTask;
module.exports.processRenewalTask = processRenewalTask;
module.exports.fetchOrderState = fetchOrderState;
module.exports.sendRenewalNotification = sendRenewalNotification;

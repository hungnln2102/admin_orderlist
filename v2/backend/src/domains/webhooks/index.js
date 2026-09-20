const routes = require("./routes");
const webhookService = require("./services/webhookService");
const webhookController = require("./controllers/webhookController");

module.exports = {
  routes,
  webhookService,
  webhookController,
};

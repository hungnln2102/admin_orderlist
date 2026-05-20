const { attachCreateOrderRoute } = require("./crud/createOrder");
const { attachUpdateOrderRoute } = require("./crud/updateOrder");
const { attachDeleteOrderRoute } = require("./crud/deleteOrder");
const { attachEnsureOrderTransactionRoute } = require("./crud/ensureOrderTransactionRoute");

const attachCrudRoutes = (router) => {
    attachCreateOrderRoute(router);
    attachEnsureOrderTransactionRoute(router);
    attachUpdateOrderRoute(router);
    attachDeleteOrderRoute(router);
};

module.exports = { attachCrudRoutes };

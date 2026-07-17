const { attachCreateOrderRoute } = require("@/domains/orders/controller/crud/createOrder");
const { attachUpdateOrderRoute } = require("@/domains/orders/controller/crud/updateOrder");
const { attachDeleteOrderRoute } = require("@/domains/orders/controller/crud/deleteOrder");
const { attachEnsureOrderTransactionRoute } = require("@/domains/orders/controller/crud/ensureOrderTransactionRoute");

const attachCrudRoutes = (router) => {
    attachCreateOrderRoute(router);
    attachEnsureOrderTransactionRoute(router);
    attachUpdateOrderRoute(router);
    attachDeleteOrderRoute(router);
};

module.exports = { attachCrudRoutes };

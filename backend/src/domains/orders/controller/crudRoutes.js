const { attachCreateOrderRoute } = require("./crud/createOrder");
const { attachUpdateOrderRoute } = require("./crud/updateOrder");
const { attachDeleteOrderRoute } = require("./crud/deleteOrder");

const attachCrudRoutes = (router) => {
    attachCreateOrderRoute(router);
    attachUpdateOrderRoute(router);
    attachDeleteOrderRoute(router);
};

module.exports = { attachCrudRoutes };

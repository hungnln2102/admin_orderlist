/**
 * Routes domain `supplier-change`. Mount tại `/api/orders/:id/change-supplier`
 * (xem `routes/index.js`).
 */

const express = require("express");
const { handleChangeSupplier } = require("./controller");

const router = express.Router();

router.post("/:id/change-supplier", handleChangeSupplier);

module.exports = router;

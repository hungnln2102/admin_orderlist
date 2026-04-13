/**
 * Supplier Service — công nợ theo đơn: supplier_order_cost_log; phát sinh TT: supplier_payment_ledger.
 */

const { db } = require("../db");
const { TABLES } = require("../controllers/Order/constants");
const { PARTNER_SCHEMA } = require("../config/dbSchema");
const { resolveSupplierNameColumn } = require("../controllers/SuppliesController/helpers");

const findSupplierIdByName = async (supplyName, trx = null) => {
  const query = trx || db;
  const name = supplyName === undefined || supplyName === null ? "" : String(supplyName);

  if (!name) return null;

  const supplierNameCol = await resolveSupplierNameColumn();
  const row = await query(TABLES.supplier)
    .select(PARTNER_SCHEMA.SUPPLIER.COLS.ID)
    .where(supplierNameCol, name)
    .first();

  return row && row[PARTNER_SCHEMA.SUPPLIER.COLS.ID] !== undefined
    ? Number(row[PARTNER_SCHEMA.SUPPLIER.COLS.ID]) || null
    : null;
};

const formatPaymentNote = (date = new Date()) => {
  const dt = date instanceof Date ? date : new Date();
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
};

/** @deprecated Dùng trigger / ledger. */
const increaseSupplierDebt = async () => {};

/** @deprecated Dùng trigger / ledger. */
const decreaseSupplierDebt = async () => {};

module.exports = {
  findSupplierIdByName,
  increaseSupplierDebt,
  decreaseSupplierDebt,
  formatPaymentNote,
};

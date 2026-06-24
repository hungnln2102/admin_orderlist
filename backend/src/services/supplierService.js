/**
 * Supplier service — resolve supplier id; ghi chú NCC theo đơn: `partner.supplier_order_cost_log`.
 */

const {
  findSupplierIdByName,
} = require("../domains/supplies/services/supplierLookupService");

const formatPaymentNote = (date = new Date()) => {
  const dt = date instanceof Date ? date : new Date();
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
};

module.exports = {
  findSupplierIdByName,
  formatPaymentNote,
};

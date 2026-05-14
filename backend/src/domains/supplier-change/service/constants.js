const { STATUS } = require("../../../utils/statuses");

const FLOWS = Object.freeze({
  A: "A",
  B_UNPAID: "B_UNPAID",
  B_PAID: "B_PAID",
  NOOP: "NOOP",
});

/**
 * Status mà bình thường (theo trigger 091) phải có dòng log NCC.
 * Dùng để quyết định có cần insert Mavryk marker / NCC log hay không.
 */
const STATUSES_NEEDING_NCC_LOG = new Set([
  STATUS.PAID,
  STATUS.PROCESSING,
  STATUS.RENEWAL,
]);

module.exports = {
  FLOWS,
  STATUSES_NEEDING_NCC_LOG,
};

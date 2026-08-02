/**
 * Entry service đổi NCC cho đơn hàng.
 *
 * Từ Pilot 5: file này giữ vai trò mỏng (validate input + open transaction),
 * logic lớn được tách dưới `./service/*` để dễ bảo trì.
 */

const { db } = require("@/db");
const { todayYMDInVietnam } = require("@/utils/normalizers");
const { executeChangeSupplier } = require("@/domains/supplier-change/service/executor");
const { ChangeSupplierError } = require("@/domains/supplier-change/service/errors");
const { FLOWS } = require("@/domains/supplier-change/service/constants");

/**
 * @param {number} orderId
 * @param {number} newSupplyId
 * @param {{ trx?: import('knex').Knex.Transaction, today?: string }} [opts]
 * @returns {Promise<object>} kết quả + flow đã chạy
 */
async function changeOrderSupplier(orderId, newSupplyId, opts = {}) {
  if (!Number.isFinite(Number(orderId)) || Number(orderId) <= 0) {
    throw new ChangeSupplierError(400, "orderId không hợp lệ.");
  }
  if (!Number.isFinite(Number(newSupplyId)) || Number(newSupplyId) <= 0) {
    throw new ChangeSupplierError(400, "newSupplyId không hợp lệ.");
  }

  const numericOrderId = Number(orderId);
  const numericNewSupplyId = Number(newSupplyId);

  const run = async (trx) =>
    executeChangeSupplier(trx, {
      orderId: numericOrderId,
      newSupplyId: numericNewSupplyId,
      today: opts.today || todayYMDInVietnam(),
    });

  if (opts.trx) {
    return run(opts.trx);
  }
  return db.transaction(run);
}

module.exports = {
  changeOrderSupplier,
  ChangeSupplierError,
  FLOWS,
};

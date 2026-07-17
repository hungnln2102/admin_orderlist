const { STATUS } = require("@/utils/statuses");
const { TABLES, ORDER_COLS } = require("@/domains/payments/controller/shared/constants");
const { createHttpError } = require("@/domains/payments/controller/shared/helpers");
const {
  updateDashboardMonthlySummaryOnStatusChange,
} = require("@/domains/orders/controller/finance/dashboardSummary");
const { syncMavnStoreProfitExpense } = require("@/domains/orders/controller/orderFinanceHelpers");
const { insertReconcileAuditLog } = require("@/domains/payments/controller/handlers/reconcile/auditLog");

/**
 * Action `reconcile_and_mark_paid`:
 * - Bắt buộc đơn ban đầu phải `UNPAID`.
 * - Cập nhật `status = PAID`, đồng bộ dashboard + MAVN expense.
 * - Ghi audit `RECONCILE_AND_MARK_PAID_APPLIED`.
 *
 * Return: `{ statusValue }` sau khi update.
 */
const applyMarkPaidAction = async (
  trx,
  { receiptId, orderRow, orderCodeRaw, statusValueInitial }
) => {
  if (statusValueInitial !== STATUS.UNPAID) {
    throw createHttpError(
      409,
      "Chỉ được dùng reconcile_and_mark_paid cho đơn Chưa Thanh Toán."
    );
  }

  const [updatedOrder] = await trx(TABLES.orderList)
    .where(ORDER_COLS.id, orderRow[ORDER_COLS.id])
    .update({
      [ORDER_COLS.status]: STATUS.PAID,
    })
    .returning("*");

  if (!updatedOrder) {
    throw createHttpError(500, "Không thể cập nhật trạng thái đơn hàng.");
  }

  await updateDashboardMonthlySummaryOnStatusChange(trx, orderRow, updatedOrder);
  await syncMavnStoreProfitExpense(trx, orderRow, updatedOrder);

  await insertReconcileAuditLog(trx, {
    receiptId,
    orderCode: orderCodeRaw,
    ruleBranch: "RECONCILE_AND_MARK_PAID_APPLIED",
    delta: {
      fromStatus: statusValueInitial,
      toStatus: STATUS.PAID,
    },
  });

  return { statusValue: STATUS.PAID };
};

/**
 * Action `reconcile_and_renew`:
 * - Bắt buộc đơn ban đầu phải `RENEWAL`.
 * - Trong transaction chỉ ghi audit `RECONCILE_AND_RENEW_QUEUED`; renewal thực chạy
 *   ngoài transaction (sau commit) ở handler chính.
 *
 * Return: `{ shouldRunRenewal: true }`.
 */
const applyRenewAction = async (
  trx,
  { receiptId, orderCodeRaw, statusValueInitial }
) => {
  if (statusValueInitial !== STATUS.RENEWAL) {
    throw createHttpError(
      409,
      "Chỉ được dùng reconcile_and_renew cho đơn Cần Gia Hạn."
    );
  }
  await insertReconcileAuditLog(trx, {
    receiptId,
    orderCode: orderCodeRaw,
    ruleBranch: "RECONCILE_AND_RENEW_QUEUED",
    delta: { fromStatus: statusValueInitial },
  });
  return { shouldRunRenewal: true };
};

module.exports = { applyMarkPaidAction, applyRenewAction };

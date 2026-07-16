const { normalizeMoney } = require("../../utils");
const { fetchMonthlySummarySnapshot } = require("../../renewal");
const {
  notifyFinanceMonthlyDelta,
} = require("../../../../src/services/telegramFinanceDeltaNotifier");
const logger = require("../../../../src/utils/logger");

async function notifyCombinedMonthlyDelta({
  client,
  paidMonthKey,
  financeSnapshotBefore,
  alreadyFinancialPosted,
}) {
  if (!paidMonthKey || !financeSnapshotBefore || alreadyFinancialPosted) {
    return;
  }

  try {
    const financeSnapshotAfter = await fetchMonthlySummarySnapshot(
      client,
      paidMonthKey
    );
    if (!financeSnapshotAfter) return;

    const revenueDelta = normalizeMoney(
      normalizeMoney(financeSnapshotAfter.total_revenue) -
        normalizeMoney(financeSnapshotBefore.total_revenue)
    );
    const profitDelta = normalizeMoney(
      normalizeMoney(financeSnapshotAfter.total_profit) -
        normalizeMoney(financeSnapshotBefore.total_profit)
    );
    const importDelta = normalizeMoney(
      normalizeMoney(financeSnapshotAfter.total_import) -
        normalizeMoney(financeSnapshotBefore.total_import)
    );
    const refundDelta = normalizeMoney(
      normalizeMoney(financeSnapshotAfter.total_refund) -
        normalizeMoney(financeSnapshotBefore.total_refund)
    );
    const offFlowDelta = normalizeMoney(
      normalizeMoney(financeSnapshotAfter.total_off_flow_bank_receipt) -
        normalizeMoney(financeSnapshotBefore.total_off_flow_bank_receipt)
    );
    const bankBalanceDelta = normalizeMoney(
      normalizeMoney(financeSnapshotAfter.estimated_bank_balance) -
        normalizeMoney(financeSnapshotBefore.estimated_bank_balance)
    );

    logger.info("[Webhook][FinancialDebug] Combined monthly snapshot delta", {
      monthKey: paidMonthKey,
      before: {
        revenue: normalizeMoney(financeSnapshotBefore.total_revenue),
        profit: normalizeMoney(financeSnapshotBefore.total_profit),
        importVal: normalizeMoney(financeSnapshotBefore.total_import),
        refund: normalizeMoney(financeSnapshotBefore.total_refund),
        offFlow: normalizeMoney(financeSnapshotBefore.total_off_flow_bank_receipt),
        bankBalance: normalizeMoney(financeSnapshotBefore.estimated_bank_balance),
      },
      after: {
        revenue: normalizeMoney(financeSnapshotAfter.total_revenue),
        profit: normalizeMoney(financeSnapshotAfter.total_profit),
        importVal: normalizeMoney(financeSnapshotAfter.total_import),
        refund: normalizeMoney(financeSnapshotAfter.total_refund),
        offFlow: normalizeMoney(financeSnapshotAfter.total_off_flow_bank_receipt),
        bankBalance: normalizeMoney(financeSnapshotAfter.estimated_bank_balance),
      },
      delta: {
        revenueDelta,
        profitDelta,
        importDelta,
        refundDelta,
        offFlowDelta,
        bankBalanceDelta,
      },
    });

    if (
      !revenueDelta &&
      !profitDelta &&
      !importDelta &&
      !refundDelta &&
      !offFlowDelta &&
      !bankBalanceDelta
    ) {
      return;
    }

    await notifyFinanceMonthlyDelta({
      monthKey: paidMonthKey,
      revenueDelta,
      profitDelta,
      importDelta,
      refundDelta,
      offFlowDelta,
      bankBalanceDelta,
      context: "webhook.sepay.combined",
      executor: client,
    });
  } catch (notifyErr) {
    logger.warn("[Webhook] Combined finance notify failed (non-fatal)", {
      error: notifyErr?.message,
    });
  }
}

module.exports = {
  notifyCombinedMonthlyDelta,
};

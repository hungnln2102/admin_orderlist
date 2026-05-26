const logger = require("../utils/logger");
const {
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
  tableName,
} = require("../config/dbSchema");
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_FINANCE_TOPIC_ID,
  SEND_FINANCE_DELTA_NOTIFICATION,
} = require("./telegramOrderNotificationLib/constants");
const {
  sendTelegramMessage,
} = require("./telegramOrderNotificationLib/telegramApi");
const {
  sumActiveShopBankBalances,
} = require("../domains/shop-bank-accounts/repositories/shopBankBalanceRepository");

const monthlySummaryTable = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const monthlyCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const financeLogTable = tableName(
  FINANCE_SCHEMA.DASHBOARD_FINANCIAL_CHANGE_LOG.TABLE,
  SCHEMA_FINANCE
);
const financeLogCols = FINANCE_SCHEMA.DASHBOARD_FINANCIAL_CHANGE_LOG.COLS;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const formatVnd = (value) => toNumber(value).toLocaleString("vi-VN");
const formatSignedVnd = (value) => {
  const n = toNumber(value);
  if (n === 0) return "0";
  return `${n > 0 ? "+" : "-"}${formatVnd(Math.abs(n))}`;
};

const sqlForKnexRaw = (sql) => String(sql).replace(/\$\d+/g, "?");

const queryOne = async (executor, sql, params = []) => {
  if (executor && typeof executor.raw === "function") {
    const rawRes = await executor.raw(sqlForKnexRaw(sql), params);
    return rawRes?.rows?.[0] || null;
  }
  if (executor && typeof executor.query === "function") {
    const res = await executor.query(sql, params);
    return res?.rows?.[0] || null;
  }
  return null;
};

const buildFlowLine = (label, beforeValue, afterValue, deltaValue) => {
  const delta = toNumber(deltaValue);
  if (delta === 0) {
    return `${label}: ${formatVnd(afterValue)}`;
  }
  return `${label}: ${formatVnd(beforeValue)} --> ${formatVnd(afterValue)} (${formatSignedVnd(
    delta
  )})`;
};

const buildFinanceDeltaMessage = ({ monthKey, rows = [], context = "" }) => {
  const lines = [
    `━━━━━━━━━━━━ BIẾN ĐỘNG THÁNG ${String(monthKey || "")} ━━━━━━━━━━━━`,
    ``,
    ...rows,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];
  if (context) lines.push(`Nguồn: ${String(context).trim()}`);
  return lines.join("\n");
};

const fetchMonthlySnapshot = async (executor, monthKey) => {
  if (!monthKey) return null;
  return queryOne(
    executor,
    `SELECT
      COALESCE(${monthlyCols.TOTAL_REVENUE}::numeric, 0) AS total_revenue,
      COALESCE(${monthlyCols.TOTAL_PROFIT}::numeric, 0) AS total_profit,
      COALESCE(${monthlyCols.TOTAL_IMPORT}::numeric, 0) AS total_import,
      COALESCE(${monthlyCols.TOTAL_REFUND}::numeric, 0) AS total_refund,
      COALESCE(${monthlyCols.TOTAL_TAX}::numeric, 0) AS total_tax,
      COALESCE(${monthlyCols.TOTAL_OFF_FLOW_BANK_RECEIPT}::numeric, 0) AS total_off_flow_bank_receipt
     FROM ${monthlySummaryTable}
     WHERE ${monthlyCols.MONTH_KEY} = $1
     LIMIT 1`,
    [monthKey]
  );
};

const fetchPreviousFinanceLogSnapshot = async (executor, monthKey) => {
  if (!monthKey) return null;
  return queryOne(
    executor,
    `SELECT
      COALESCE(${financeLogCols.TAX_SNAPSHOT}::numeric, 0) AS tax_snapshot,
      COALESCE(${financeLogCols.OFF_FLOW_SNAPSHOT}::numeric, 0) AS off_flow_snapshot,
      COALESCE(${financeLogCols.BANK_BALANCE_SNAPSHOT}::numeric, 0) AS bank_balance_snapshot
     FROM ${financeLogTable}
     WHERE ${financeLogCols.MONTH_KEY} = $1
     ORDER BY ${financeLogCols.ID} DESC
     LIMIT 1`,
    [monthKey]
  );
};

const appendFinanceChangeLog = async (
  executor,
  {
    monthKey,
    revenueDelta = 0,
    profitDelta = 0,
    importDelta = 0,
    refundDelta = 0,
    offFlowDelta = 0,
    bankBalanceDelta = 0,
    taxSnapshot = 0,
    offFlowSnapshot = 0,
    bankBalanceSnapshot = 0,
    context = "",
  }
) => {
  if (!executor) return;
  if (executor && typeof executor.raw === "function") {
    await executor.raw(
      `INSERT INTO ${financeLogTable} (
        ${financeLogCols.MONTH_KEY},
        ${financeLogCols.REVENUE_DELTA},
        ${financeLogCols.PROFIT_DELTA},
        ${financeLogCols.IMPORT_DELTA},
        ${financeLogCols.REFUND_DELTA},
        ${financeLogCols.OFF_FLOW_DELTA},
        ${financeLogCols.BANK_BALANCE_DELTA},
        ${financeLogCols.TAX_SNAPSHOT},
        ${financeLogCols.OFF_FLOW_SNAPSHOT},
        ${financeLogCols.BANK_BALANCE_SNAPSHOT},
        ${financeLogCols.CONTEXT}
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        monthKey,
        revenueDelta,
        profitDelta,
        importDelta,
        refundDelta,
        offFlowDelta,
        bankBalanceDelta,
        taxSnapshot,
        offFlowSnapshot,
        bankBalanceSnapshot,
        context || null,
      ]
    );
    return;
  }
  if (typeof executor.query === "function") {
    await executor.query(
      `INSERT INTO ${financeLogTable} (
        ${financeLogCols.MONTH_KEY},
        ${financeLogCols.REVENUE_DELTA},
        ${financeLogCols.PROFIT_DELTA},
        ${financeLogCols.IMPORT_DELTA},
        ${financeLogCols.REFUND_DELTA},
        ${financeLogCols.OFF_FLOW_DELTA},
        ${financeLogCols.BANK_BALANCE_DELTA},
        ${financeLogCols.TAX_SNAPSHOT},
        ${financeLogCols.OFF_FLOW_SNAPSHOT},
        ${financeLogCols.BANK_BALANCE_SNAPSHOT},
        ${financeLogCols.CONTEXT}
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        monthKey,
        revenueDelta,
        profitDelta,
        importDelta,
        refundDelta,
        offFlowDelta,
        bankBalanceDelta,
        taxSnapshot,
        offFlowSnapshot,
        bankBalanceSnapshot,
        context || null,
      ]
    );
  }
};

const notifyFinanceMonthlyDelta = async ({
  monthKey,
  revenueDelta = 0,
  profitDelta = 0,
  importDelta = 0,
  refundDelta = 0,
  offFlowDelta = 0,
  bankBalanceDelta = 0,
  context = "",
  executor = null,
}) => {
  const revenue = toNumber(revenueDelta);
  const profit = toNumber(profitDelta);
  const imp = toNumber(importDelta);
  const refund = toNumber(refundDelta);
  const offFlow = toNumber(offFlowDelta);
  const bankBalance = toNumber(bankBalanceDelta);
  if (!monthKey) return;
  if (!revenue && !profit && !imp && !refund && !offFlow && !bankBalance) return;

  try {
    const [monthlySnapshot, previousLogSnapshot, shopBankTotal] = await Promise.all([
      fetchMonthlySnapshot(executor, monthKey).catch(() => null),
      fetchPreviousFinanceLogSnapshot(executor, monthKey).catch(() => null),
      sumActiveShopBankBalances(executor).catch(() => 0),
    ]);
    const bankBalanceAfter = toNumber(shopBankTotal);
    const snapshotAfter = {
      revenue: toNumber(monthlySnapshot?.total_revenue),
      profit: toNumber(monthlySnapshot?.total_profit),
      importVal: toNumber(monthlySnapshot?.total_import),
      refund: toNumber(monthlySnapshot?.total_refund),
      tax: toNumber(monthlySnapshot?.total_tax),
      offFlow: toNumber(monthlySnapshot?.total_off_flow_bank_receipt),
      bankBalance: bankBalanceAfter,
    };
    const snapshotBefore = {
      revenue: snapshotAfter.revenue - revenue,
      profit: snapshotAfter.profit - profit,
      importVal: snapshotAfter.importVal - imp,
      refund: snapshotAfter.refund - refund,
      offFlow: snapshotAfter.offFlow - offFlow,
      tax:
        previousLogSnapshot == null
          ? snapshotAfter.tax
          : toNumber(previousLogSnapshot.tax_snapshot),
      bankBalance:
        previousLogSnapshot == null
          ? snapshotAfter.bankBalance - bankBalance
          : toNumber(previousLogSnapshot.bank_balance_snapshot),
    };
    const taxDelta = snapshotAfter.tax - snapshotBefore.tax;
    const bankBalanceDeltaEffective =
      snapshotAfter.bankBalance - snapshotBefore.bankBalance;
    const bankDeltaForDisplay =
      bankBalance !== 0 ? bankBalance : bankBalanceDeltaEffective;
    const bankBeforeForDisplay =
      bankBalance !== 0
        ? bankBalanceAfter - bankBalance
        : snapshotBefore.bankBalance;
    const bankAfterForDisplay =
      bankBalance !== 0 ? bankBalanceAfter : snapshotAfter.bankBalance;
    await appendFinanceChangeLog(executor, {
      monthKey,
      revenueDelta: revenue,
      profitDelta: profit,
      importDelta: imp,
      refundDelta: refund,
      offFlowDelta: offFlow,
      bankBalanceDelta: bankBalance,
      taxSnapshot: toNumber(monthlySnapshot?.total_tax),
      offFlowSnapshot: toNumber(monthlySnapshot?.total_off_flow_bank_receipt),
      bankBalanceSnapshot: bankAfterForDisplay,
      context,
    });
    if (!SEND_FINANCE_DELTA_NOTIFICATION) return;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    const messageRows = [
      buildFlowLine("📊 Doanh thu tháng", snapshotBefore.revenue, snapshotAfter.revenue, revenue),
      buildFlowLine("💰 Lợi nhuận tháng", snapshotBefore.profit, snapshotAfter.profit, profit),
      buildFlowLine("📦 Nhập hàng tháng", snapshotBefore.importVal, snapshotAfter.importVal, imp),
      buildFlowLine("↩️ Hoàn tiền tháng", snapshotBefore.refund, snapshotAfter.refund, refund),
      buildFlowLine("🧾 Tiền thuế tháng", snapshotBefore.tax, snapshotAfter.tax, taxDelta),
      buildFlowLine(
        "💸 Tiền ngoài luồng tháng",
        snapshotBefore.offFlow,
        snapshotAfter.offFlow,
        offFlow
      ),
      buildFlowLine(
        "🏦 Số dư bank shop",
        bankBeforeForDisplay,
        bankAfterForDisplay,
        bankDeltaForDisplay
      ),
    ];
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: buildFinanceDeltaMessage({
        monthKey,
        rows: messageRows,
        context,
      }),
    };
    if (Number.isFinite(TELEGRAM_FINANCE_TOPIC_ID)) {
      payload.message_thread_id = TELEGRAM_FINANCE_TOPIC_ID;
    }
    await sendTelegramMessage(payload);
  } catch (error) {
    logger.warn("[finance-delta-notifier] Telegram notify failed", {
      error: error?.message || String(error),
      monthKey,
      revenue,
      profit,
      importDelta: imp,
      refund,
      context,
    });
  }
};

module.exports = {
  notifyFinanceMonthlyDelta,
};

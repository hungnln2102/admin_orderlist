const logger = require("@/utils/logger");
const {
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
  tableName,
} = require("@/config/dbSchema");
const { financeNotifier } = require("@/domains/notifications/telegram");
const {
  sumActiveShopBankBalances,
} = require("@/domains/shop-bank-accounts/repositories/shopBankBalanceRepository");

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

const humanizeContext = (context) => {
  const raw = String(context || "").trim();
  if (!raw) return "";

  // supplier-change[order=460, flow=A]
  const supplierChangeMatch = raw.match(
    /supplier-change\[order=(\d+),?\s*flow=(\w+)\]/i
  );
  if (supplierChangeMatch) {
    const flowMap = {
      A: "\u0111\u01a1n m\u1edbi (\u2264 5 ng\u00e0y)",
      B_UNPAID: "ch\u01b0a TT NCC",
      B_PAID: "\u0111\u00e3 TT NCC",
    };
    const flowLabel = flowMap[supplierChangeMatch[2]] || supplierChangeMatch[2];
    return `\u0110\u1ed5i NCC \u0111\u01a1n ${supplierChangeMatch[1]} (${flowLabel})`;
  }

  // renewal.mavryk.external_import:ORDER_CODE
  const mavrykRenewMatch = raw.match(
    /renewal\.mavryk\.external_import:(.+)/i
  );
  if (mavrykRenewMatch) {
    return `Gia h\u1ea1n Mavryk \u0111\u01a1n ${mavrykRenewMatch[1]}`;
  }

  // renewal.runRenewal:ORDER_CODE
  const renewalMatch = raw.match(/renewal\.runRenewal:(.+)/i);
  if (renewalMatch) {
    return `Gia h\u1ea1n \u0111\u01a1n ${renewalMatch[1]}`;
  }

  // payments.confirmPaymentSupply supply=123
  const confirmSupplyMatch = raw.match(
    /payments\.confirmPaymentSupply\s+supply=(\d+)/i
  );
  if (confirmSupplyMatch) {
    return `Thanh to\u00e1n NCC (supply #${confirmSupplyMatch[1]})`;
  }

  // Static mappings
  const staticMap = {
    "webhook.sepay.combined": "Webhook Sepay",
    "payments.applyDashboardDelta": "Thanh to\u00e1n \u0111\u01a1n h\u00e0ng",
    "manualWebhook.incrementDashboardSummaryByDelta": "Ho\u00e0n th\u00e0nh th\u1ee7 c\u00f4ng (Webhook)",
    "manualUsdt.incrementDashboardSummaryByDelta": "Ho\u00e0n th\u00e0nh th\u1ee7 c\u00f4ng (USDT)",
    "dashboardSummary.refund.statusChange": "Ho\u00e0n ti\u1ec1n \u0111\u01a1n h\u00e0ng",
    "supplier-change.applyProfitDelta": "\u0110\u1ed5i NCC (b\u00f9 l\u1ee3i nhu\u1eadn)",
    "webhook.outbound_transfer": "Ti\u1ec1n ra (Webhook)",
  };
  if (staticMap[raw]) return staticMap[raw];

  // Fallback: return raw but cleaned up
  return raw;
};

const buildFinanceDeltaMessage = ({ monthKey, rows = [], context = "" }) => {
  const lines = [
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501 BI\u1EBEN \u0110\u1ED8NG TH\u00C1NG ${String(monthKey || "")} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
    ``,
    ...rows,
    ``,
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
  ];
  const label = humanizeContext(context);
  if (label) lines.push(`Ngu\u1ED3n: ${label}`);
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

const resolveBankBeforeBalance = ({
  previousLogSnapshot,
  bankBalanceAfter,
  bankBalanceDelta = 0,
  revenueDelta = 0,
}) => {
  if (previousLogSnapshot != null) {
    return toNumber(previousLogSnapshot.bank_balance_snapshot);
  }
  if (bankBalanceDelta !== 0) {
    return bankBalanceAfter - bankBalanceDelta;
  }
  if (revenueDelta !== 0) {
    return bankBalanceAfter - revenueDelta;
  }
  return bankBalanceAfter;
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
    const bankBeforeSnapshot = resolveBankBeforeBalance({
      previousLogSnapshot,
      bankBalanceAfter,
      bankBalanceDelta: bankBalance,
      revenueDelta: revenue,
    });
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
      bankBalance: bankBeforeSnapshot,
    };
    const taxDelta = snapshotAfter.tax - snapshotBefore.tax;
    const bankBalanceDeltaEffective =
      snapshotAfter.bankBalance - snapshotBefore.bankBalance;
    const useLedgerBankDelta = bankBalanceDeltaEffective !== 0 || bankBalance === 0;
    const bankDeltaForDisplay = useLedgerBankDelta
      ? bankBalanceDeltaEffective
      : bankBalance;
    const bankBeforeForDisplay = useLedgerBankDelta
      ? snapshotBefore.bankBalance
      : bankBalanceAfter - bankBalance;
    const bankAfterForDisplay = useLedgerBankDelta
      ? snapshotAfter.bankBalance
      : bankBalanceAfter;
    await appendFinanceChangeLog(executor, {
      monthKey,
      revenueDelta: revenue,
      profitDelta: profit,
      importDelta: imp,
      refundDelta: refund,
      offFlowDelta: offFlow,
      bankBalanceDelta: bankDeltaForDisplay,
      taxSnapshot: toNumber(monthlySnapshot?.total_tax),
      offFlowSnapshot: toNumber(monthlySnapshot?.total_off_flow_bank_receipt),
      bankBalanceSnapshot: bankAfterForDisplay,
      context,
    });
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
    
    financeNotifier.notifyFinanceDelta(buildFinanceDeltaMessage({
      monthKey,
      rows: messageRows,
      context,
    }));
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

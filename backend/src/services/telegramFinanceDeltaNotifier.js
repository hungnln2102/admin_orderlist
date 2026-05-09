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

const monthlySummaryTable = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const monthlyCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const expenseTable = tableName(
  FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE,
  SCHEMA_FINANCE
);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const formatVnd = (value) => toNumber(value).toLocaleString("vi-VN");

const queryOne = async (executor, sql, params = []) => {
  if (executor && typeof executor.raw === "function") {
    const rawRes = await executor.raw(sql, params);
    return rawRes?.rows?.[0] || null;
  }
  if (executor && typeof executor.query === "function") {
    const res = await executor.query(sql, params);
    return res?.rows?.[0] || null;
  }
  return null;
};

const buildFinanceDeltaMessage = ({
  monthKey,
  revenueDelta = 0,
  profitDelta = 0,
  importDelta = 0,
  refundDelta = 0,
  availableProfit = null,
  context = "",
}) => {
  const lines = [
    `--------------Biến Động Tháng ${String(monthKey || "")}-------------------`,
    `Doanh Thu Tháng: ${formatVnd(revenueDelta)}`,
    `Lợi Nhuận Tháng: ${formatVnd(profitDelta)}`,
    `Nhập Hàng Tháng: ${formatVnd(importDelta)}`,
    `Hoàn Tiền Tháng: ${formatVnd(refundDelta)}`,
    "-------------------Tiền Banking---------------------",
    `Lợi Nhuận Khả Dụng: ${
      availableProfit == null ? "N/A" : formatVnd(availableProfit)
    }`,
  ];
  if (context) lines.push(`Nguồn: ${String(context).trim()}`);
  return lines.join("\n");
};

const fetchAvailableProfit = async (executor) => {
  const profitRow = await queryOne(
    executor,
    `SELECT COALESCE(SUM(${monthlyCols.TOTAL_PROFIT}::numeric), 0) AS total_profit FROM ${monthlySummaryTable}`
  );
  const withdrawRow = await queryOne(
    executor,
    `SELECT COALESCE(SUM(${expenseCols.AMOUNT}::numeric), 0) AS total_withdraw
     FROM ${expenseTable}
     WHERE ${expenseCols.EXPENSE_TYPE} = $1`,
    ["withdraw_profit"]
  );
  return toNumber(profitRow?.total_profit) - toNumber(withdrawRow?.total_withdraw);
};

const notifyFinanceMonthlyDelta = async ({
  monthKey,
  revenueDelta = 0,
  profitDelta = 0,
  importDelta = 0,
  refundDelta = 0,
  context = "",
  executor = null,
}) => {
  const revenue = toNumber(revenueDelta);
  const profit = toNumber(profitDelta);
  const imp = toNumber(importDelta);
  const refund = toNumber(refundDelta);
  if (!monthKey) return;
  if (!revenue && !profit && !imp && !refund) return;
  if (!SEND_FINANCE_DELTA_NOTIFICATION) return;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  try {
    const availableProfit = await fetchAvailableProfit(executor).catch(() => null);
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: buildFinanceDeltaMessage({
        monthKey,
        revenueDelta: revenue,
        profitDelta: profit,
        importDelta: imp,
        refundDelta: refund,
        availableProfit,
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

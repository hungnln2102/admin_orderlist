const { db, TABLES } = require("@/db");
const telegramClient = require("@/domains/notifications/telegram/core/telegramClient");
const systemConfigService = require("@/domains/system/services/systemConfigService");
const { TELEGRAM_FINANCE_TOPIC_ID, TELEGRAM_CHAT_ID } = require("@/domains/notifications/telegram/core/constants");

function isFinanceNotificationEnabled() {
  const enabled = systemConfigService.get("SEND_FINANCE_DELTA_NOTIFICATION");
  if (enabled !== null && String(enabled).toLowerCase() === "false") {
    return false;
  }
  return true;
}

/**
 * Gửi thông báo biến động số dư nội bộ
 */
function notifyFinanceDelta(messageHtml) {
  if (!isFinanceNotificationEnabled()) return;

  telegramClient.enqueueMessage({
    chat_id: TELEGRAM_CHAT_ID,
    message_thread_id: TELEGRAM_FINANCE_TOPIC_ID,
    text: messageHtml,
    parse_mode: "HTML",
  });
}

const buildFlowLine = (label, afterVal, deltaVal) => {
  const delta = Math.round(Number(deltaVal || 0));
  let after = Math.round(Number(afterVal || 0));
  let before = after - delta;

  // Phòng vệ: Nếu afterVal trong CSDL bằng 0 mà delta > 0 (áp dụng cho các chỉ số không âm như Doanh thu, Nhập hàng, Hoàn tiền)
  if (!label.includes("Lợi nhuận") && before < 0 && delta > 0 && after === 0) {
    before = 0;
    after = delta;
  }

  const formatVnd = (n) => Math.round(n).toLocaleString("vi-VN");
  const formatSigned = (n) => {
    const rounded = Math.round(n);
    if (rounded === 0) return "0";
    return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("vi-VN")}`;
  };

  if (delta === 0) {
    return `${label}: ${formatVnd(after)}`;
  }
  return `${label}: ${formatVnd(before)} --> ${formatVnd(after)} (${formatSigned(delta)})`;
};

/**
 * Gửi thông báo Biến Động Tháng (Telegram) đọc từ bảng daily với định dạng before --> after (delta).
 */
async function notifyFinanceMonthlyDelta({
  monthKey,
  revenueDelta = 0,
  profitDelta = null,
  importDelta = 0,
  refundDelta = 0,
  taxDelta = 0,
  offFlowDelta = 0,
  bankBalanceDelta = 0,
  context = "",
}) {
  if (!isFinanceNotificationEnabled()) return;

  try {
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    // 1. Lấy tổng các chỉ số tháng hiện tại từ daily_revenue_summary
    // FinanceHub owns the canonical monthly profit formula, including fixed costs and debt burden.
    const { getFinanceSummary } = require("@/domains/finance/services/financeHubService");
    const financeSummary = await getFinanceSummary(finalMonthKey);
    const breakEven = financeSummary?.breakEven || {};
    const totalRevenue = Number(breakEven.shopRevenue || 0);
    const totalImport = Number(breakEven.shopCogs || 0);
    const totalRefund = Number(breakEven.shopRefunds || 0);
    const totalProfit = Number(breakEven.netProfit || 0);
    const totalOperationalExpenses = Number(breakEven.totalOperationalExpenses || 0);
    const totalFixedCosts = Number(breakEven.activeFixedCostsTotal || 0);
    const monthlyDebtBurden = Number(breakEven.monthlyDebtBurden || 0);
    const monthlyObligations = Number(breakEven.breakEvenTarget || 0);
    const totalTax = 0;
    const totalOffFlow = 0;

    // Sử dụng profitDelta nếu được truyền sẵn, ngược lại tính toán theo delta doanh thu, nhập hàng và hoàn tiền
    const effectiveProfitDelta = profitDelta !== null && profitDelta !== undefined
      ? Number(profitDelta)
      : (revenueDelta - importDelta - refundDelta);

    // 2. Tổng số dư bank shop hiện tại
    const bankRows = await db(TABLES.SHOP_BANK_ACCOUNTS)
      .where("account_type", "bank")
      .where("is_deleted", false)
      .sum("balance as total_balance")
      .first();
    const currentBankBalance = Number(bankRows?.total_balance || 0);
    const previousBankBalance = currentBankBalance - Number(bankBalanceDelta || 0);

    const formatVnd = (n) => Math.round(n).toLocaleString("vi-VN");
    const formatSigned = (n) => {
      const rounded = Math.round(n);
      if (rounded === 0) return "0";
      return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("vi-VN")}`;
    };

    const bankLine = bankBalanceDelta !== 0
      ? `${formatVnd(previousBankBalance)} --> ${formatVnd(currentBankBalance)} (${formatSigned(bankBalanceDelta)})`
      : `${formatVnd(currentBankBalance)}`;

    const message = [
      `_________________ BIẾN ĐỘNG THÁNG ${finalMonthKey} _________________`,
      ``,
      buildFlowLine("📊 Doanh thu tháng", totalRevenue, revenueDelta),
      buildFlowLine("💰 Lợi nhuận ròng tháng", totalProfit, effectiveProfitDelta),
      buildFlowLine("📈 Lợi nhuận hoạt động", Number(breakEven.shopGrossProfit || 0), effectiveProfitDelta),
      buildFlowLine("📦 Nhập hàng tháng", totalImport, importDelta),
      buildFlowLine("🔄 Hoàn tiền tháng", totalRefund, refundDelta),
      buildFlowLine("🧾 Chi phí vận hành tháng", totalOperationalExpenses, 0),
      buildFlowLine("🏠 Chi phí cố định tháng", totalFixedCosts, 0),
      buildFlowLine("💳 Nợ và trả góp tháng", monthlyDebtBurden, 0),
      buildFlowLine("🎯 Nghĩa vụ tháng", monthlyObligations, 0),
      buildFlowLine("📄 Tiền thuế tháng", totalTax, taxDelta),
      buildFlowLine("💵 Tiền ngoài luồng tháng", totalOffFlow, offFlowDelta),
      `🏦 Số dư bank shop: ${bankLine}`,
      `__________________________________________________________`,
      context ? `Nguồn: ${context}` : ``,
    ].filter(Boolean).join("\n");

    notifyFinanceDelta(message);
  } catch (err) {
    console.error("[FinanceNotifier] Lỗi gửi thông báo Biến Động Tháng:", err.message);
  }
}

module.exports = {
  notifyFinanceDelta,
  notifyFinanceMonthlyDelta,
};

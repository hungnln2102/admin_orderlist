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
    const summaryRows = await db(TABLES.DAILY_REVENUE_SUMMARY)
      .whereRaw("summary_date::text LIKE ?", [`${finalMonthKey}%`])
      .select(
        db.raw("COALESCE(SUM(earned_revenue), 0) as total_revenue"),
        db.raw("COALESCE(SUM(total_shop_cost), 0) as total_import"),
        db.raw("COALESCE(SUM(revenue_reversed), 0) as total_refund")
      )
      .first();

    const totalRevenue = Number(summaryRows?.total_revenue || 0);
    const totalImport = Number(summaryRows?.total_import || 0);
    const totalRefund = Number(summaryRows?.total_refund || 0);
    const totalProfit = totalRevenue - totalImport - totalRefund;
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
      buildFlowLine("💰 Lợi nhuận tháng", totalProfit, effectiveProfitDelta),
      buildFlowLine("📦 Nhập hàng tháng", totalImport, importDelta),
      buildFlowLine("🔄 Hoàn tiền tháng", totalRefund, refundDelta),
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

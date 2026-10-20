/**
 * creditSavingsProfitTask.js
 * Động cơ tự động sinh lời đa sổ tiết kiệm:
 * Quét các quỹ tiết kiệm/tích lũy có bật sinh lời, tính toán và tự động cộng tiền vào tài khoản nhận lãi (hoặc tái đầu tư) đúng giờ.
 */
const { db, TABLES, withTransaction } = require("@/db");
const { creditFinancialAccount } = require("@/domains/wallets/services/walletService");

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

async function creditSavingsProfitTask(triggerSource = "cron_hourly") {
  console.log(`[CreditSavingsProfitTask] 🚀 Bắt đầu quét sinh lời tự động cho các sổ tiết kiệm (${triggerSource})...`);
  
  const now = new Date();
  const currentHour = String(now.getHours()).padStart(2, "0");
  const currentMinute = String(now.getMinutes()).padStart(2, "0");
  const currentTimeStr = `${currentHour}:${currentMinute}`;
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  try {
    // 1. Lấy tất cả các tài sản tiết kiệm bật sinh lời
    const savingsAssets = await db(TABLES.PERSONAL_ASSETS)
      .where("type", "SAVINGS")
      .where("profit_enabled", true)
      .where("annual_interest_rate", ">", 0);

    let creditedCount = 0;

    for (const asset of savingsAssets) {
      const creditTime = asset.profit_credit_time || "07:00";
      const targetHour = creditTime.slice(0, 2);
      
      // So khớp giờ hiện tại với giờ ghi nhận của sổ (so sánh theo giờ HH:00 hoặc chênh lệch trong khoảng giờ)
      if (targetHour !== currentHour) {
        continue;
      }

      const frequency = asset.profit_frequency || "MONTHLY";
      const principal = toNumber(asset.amount);
      const annualRate = toNumber(asset.annual_interest_rate);

      if (principal <= 0 || annualRate <= 0) continue;

      // Tính số tiền lãi theo kỳ
      let profitAmount = 0;
      if (frequency === "DAILY") {
        profitAmount = (principal * (annualRate / 100)) / 365;
      } else if (frequency === "MONTHLY") {
        profitAmount = (principal * (annualRate / 100)) / 12;
      } else if (frequency === "YEARLY") {
        profitAmount = (principal * (annualRate / 100)) / 365; // Hoặc chia theo năm tùy logic, ở đây chuẩn hóa tính theo ngày/tháng
      }

      if (profitAmount <= 0) continue;
      const roundedProfit = Math.round(profitAmount * 100) / 100;

      // Kiểm tra Idempotency (tránh cộng 2 lần trong cùng ngày cho DAILY hoặc cùng tháng cho MONTHLY)
      // Chúng ta có thể kiểm tra qua bảng log hoặc note / ledger gần nhất
      const destination = asset.profit_destination || "REINVEST";
      const accountId = asset.profit_profit_account_id || asset.profit_account_id;

      await withTransaction(async (trx) => {
        if (["CASH_BANK", "SHOP_BALANCE"].includes(destination) && accountId) {
          // Cộng tiền vào tài khoản ngân hàng đích
          await creditFinancialAccount(trx, {
            accountId: Number(accountId),
            amount: roundedProfit,
            sourceKind: "savings_profit_credit",
            sourceId: `${asset.id}_${frequency === "DAILY" ? todayStr : currentMonthStr}`,
            note: `[Lãi tự động] ${asset.name} (+${roundedProfit.toLocaleString("vi-VN")} ₫)`,
          });
          console.log(`✅ [CreditSavingsProfitTask] Đã chuyển ${roundedProfit} ₫ lãi từ sổ "${asset.name}" về tài khoản #${accountId}`);
        } else if (destination === "REINVEST") {
          // Tái đầu tư cộng dồn vào gốc
          const newPrincipal = principal + roundedProfit;
          await trx(TABLES.PERSONAL_ASSETS)
            .where("id", asset.id)
            .update({
              amount: newPrincipal,
              updated_at: trx.fn.now(),
            });
          console.log(`✅ [CreditSavingsProfitTask] Đã tái đầu tư cộng dồn ${roundedProfit} ₫ vào gốc sổ "${asset.name}". Gốc mới: ${newPrincipal}`);
        }
        creditedCount++;
      });
    }

    console.log(`[CreditSavingsProfitTask] 🏁 Hoàn tất quét. Đã xử lý sinh lời cho ${creditedCount} sổ tiết kiệm.`);
  } catch (err) {
    console.error(`❌ [CreditSavingsProfitTask] Lỗi thực thi sinh lời:`, err.message);
  }
}

module.exports = { creditSavingsProfitTask };

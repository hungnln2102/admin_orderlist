const { db, TABLES, withTransaction } = require("@/db");
const { creditFinancialAccount } = require("@/domains/wallets/services/walletService");
const { getVietnamDateString, getVietnamMonthString, VIETNAM_TZ } = require("@/utils/time");
const { withAdvisoryLock } = require("../withAdvisoryLock");

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getVietnamTimeString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.hour}:${values.minute}`;
};

const getProfitPeriod = (frequency, date = new Date()) => {
  const vietnamDate = getVietnamDateString(date);
  if (frequency === "DAILY") return vietnamDate;
  if (frequency === "MONTHLY") return getVietnamMonthString(date);
  if (frequency === "YEARLY") return vietnamDate.slice(0, 4);
  throw new Error(`Chu kỳ sinh lãi không hợp lệ: ${frequency}`);
};

const toMinutesOfDay = (timeString) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(timeString || "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const isCreditTimeReached = (creditTime, currentTime) => {
  const creditMinutes = toMinutesOfDay(creditTime || "07:00");
  const currentMinutes = toMinutesOfDay(currentTime);
  if (creditMinutes == null || currentMinutes == null) return false;
  return currentMinutes >= creditMinutes;
};

const calculateProfitAmount = (principal, annualRate, frequency) => {
  const annualProfit = principal * (annualRate / 100);
  if (frequency === "DAILY") return annualProfit / 365;
  if (frequency === "MONTHLY") return annualProfit / 12;
  if (frequency === "YEARLY") return annualProfit;
  throw new Error(`Chu kỳ sinh lãi không hợp lệ: ${frequency}`);
};

async function creditSavingsProfitTask(triggerSource = "cron_minutely", now = new Date()) {
  return withAdvisoryLock("credit_savings_profit", async () => {
    const currentTime = getVietnamTimeString(now);
    const savingsAssets = await db(TABLES.PERSONAL_SAVINGS)
      .where("profit_enabled", true)
      .where("annual_interest_rate", ">", 0)
      .select("id", "profit_credit_time", "profit_frequency", "profit_last_credited_period");

    let creditedCount = 0;

    for (const asset of savingsAssets) {
      if (!isCreditTimeReached(asset.profit_credit_time, currentTime)) continue;
      let period;
      try {
        period = getProfitPeriod(asset.profit_frequency || "MONTHLY", now);
      } catch (err) {
        console.error(`[CreditSavingsProfitTask] Bỏ qua sổ #${asset.id}: ${err.message}`);
        continue;
      }
      if (asset.profit_last_credited_period === period) continue;

      const credited = await withTransaction(async (trx) => {
        const lockedAsset = await trx(TABLES.PERSONAL_SAVINGS)
          .where({ id: asset.id })
          .forUpdate()
          .first();
        if (!lockedAsset || !lockedAsset.profit_enabled) return false;

        const frequency = lockedAsset.profit_frequency || "MONTHLY";
        const period = getProfitPeriod(frequency, now);
        if (lockedAsset.profit_last_credited_period === period) return false;

        const principal = toNumber(lockedAsset.amount);
        const annualRate = toNumber(lockedAsset.annual_interest_rate);
        const profitAmount = calculateProfitAmount(principal, annualRate, frequency);
        const roundedProfit = Math.round(profitAmount * 100) / 100;
        if (principal <= 0 || annualRate <= 0 || roundedProfit <= 0) return false;

        const destination = lockedAsset.profit_destination || "REINVEST";
        const accountId = lockedAsset.profit_account_id;

        if (["CASH_BANK", "SHOP_BALANCE"].includes(destination)) {
          if (!accountId) throw new Error(`Sổ tiết kiệm #${lockedAsset.id} chưa chọn tài khoản nhận lãi.`);

          const creditResult = await creditFinancialAccount(trx, {
            accountId: Number(accountId),
            amount: roundedProfit,
            sourceKind: "savings_profit_credit",
            sourceId: `${lockedAsset.id}_${period}`,
            note: `[Lãi tự động] ${lockedAsset.name} (+${roundedProfit.toLocaleString("vi-VN")} ₫)`,
          });
          if (creditResult.skipped && creditResult.reason !== "duplicate") return false;
        } else if (destination === "REINVEST") {
          await trx(TABLES.PERSONAL_SAVINGS)
            .where({ id: lockedAsset.id })
            .update({ amount: principal + roundedProfit });
        } else {
          throw new Error(`Nơi nhận lãi không hợp lệ: ${destination}`);
        }

        await trx(TABLES.PERSONAL_SAVINGS)
          .where({ id: lockedAsset.id })
          .update({
            profit_last_credited_period: period,
            updated_at: trx.fn.now(),
          });

        console.log(`[CreditSavingsProfitTask] Đã ghi nhận ${roundedProfit.toLocaleString("vi-VN")} ₫ cho sổ "${lockedAsset.name}" (${frequency}, ${period}).`);
        return true;
      });

      if (credited) creditedCount += 1;
    }

    console.log(`[CreditSavingsProfitTask] Hoàn tất (${triggerSource}): ${creditedCount} sổ được ghi lãi lúc ${currentTime} giờ Việt Nam.`);
    return { success: true, creditedCount, currentTime };
  });
}

module.exports = {
  calculateProfitAmount,
  creditSavingsProfitTask,
  getProfitPeriod,
  getVietnamTimeString,
  isCreditTimeReached,
};

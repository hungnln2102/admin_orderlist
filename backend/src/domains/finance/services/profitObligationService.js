const { db, TABLES, COLS } = require("@/db");
const { getVietnamDateString } = require("@/utils/time");
const toNumber = (value) => Number(value) || 0;

function calculatePersonalDebtMonthlyPayment(item) {
  if (item.type !== "DEBT_PAYABLE") return 0;
  const amount = toNumber(item.amount);
  if (amount <= 0) return 0;
  const annualRate = Boolean(item.debt_interest_enabled) ? toNumber(item.debt_annual_interest_rate) : 0;

  if (!item.debt_end_date) {
    // Với nợ không thời hạn / thẻ tín dụng:
    // Mức thanh toán hàng tháng ước lượng: 5% nợ gốc tối thiểu + tiền lãi phát sinh mỗi tháng
    const monthlyInterest = (amount * annualRate) / 100 / 12;
    return Math.max(Math.ceil(amount * 0.05 + monthlyInterest), Math.ceil(amount / 24));
  }

  const endDate = new Date(`${String(item.debt_end_date).slice(0, 10)}T23:59:59`);
  const remainingDays = Math.max(1, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const remainingMonths = Math.max(1, Math.floor(remainingDays / 30.4375) || 1);
  const estimatedTotal = amount + (amount * annualRate / 100 * remainingDays / 365);
  const dailyPayment = Math.ceil(estimatedTotal / remainingDays);
  // Nguyên tắc an toàn: Thà dôi dư chứ không để thiếu hụt nợ khi tới hạn
  return Math.max(Math.ceil(dailyPayment * 30.44), Math.ceil(estimatedTotal / remainingMonths));
}


function obligationAmount(type, row, periodMonth) {
  if (type === "FIXED_COST") return row.is_active ? Number(row.amount) : 0;
  if (type === "INSTALLMENT") {
    const start = String(row.start_period || "").slice(0, 7);
    const [startYear, startMonth] = start.split("-").map(Number);
    const [targetYear, targetMonth] = String(periodMonth).split("-").map(Number);
    const offset = (targetYear - startYear) * 12 + targetMonth - startMonth;
    return row.is_active && row.status !== "COMPLETED" && offset >= 0 && offset < Number(row.total_periods)
      ? Number(row.monthly_amount) : 0;
  }
  if (type === "PERSONAL_DEBT") return calculatePersonalDebtMonthlyPayment(row);
  throw new Error("Invalid profit obligation type");
}

async function snapshotObligation(trx, type, row, periodMonth) {
  const columns = COLS.PROFIT_OBLIGATION_SNAPSHOTS;
  const identity = { [columns.TARGET_TYPE]: type, [columns.TARGET_ID]: row.id, [columns.PERIOD_MONTH]: periodMonth };
  await trx(TABLES.PROFIT_OBLIGATION_SNAPSHOTS).insert({ ...identity, [columns.AMOUNT]: obligationAmount(type, row, periodMonth) })
    .onConflict([columns.TARGET_TYPE, columns.TARGET_ID, columns.PERIOD_MONTH]).ignore();
  return trx(TABLES.PROFIT_OBLIGATION_SNAPSHOTS).where(identity).forUpdate().first();
}

function mergeObligationAmounts(type, rows, snapshots, periodMonth) {
  const amounts = new Map(rows.map((row) => [String(row.id), obligationAmount(type, row, periodMonth)]));
  for (const snapshot of snapshots) {
    if (snapshot.target_type === type) amounts.set(String(snapshot.target_id), Number(snapshot.amount));
  }
  return [...amounts.values()].reduce((total, amount) => total + amount, 0);
}

async function getMonthlyObligations(periodMonth, query = db) {
  const [fixedCosts, installments, debts, snapshots] = await Promise.all([
    query(TABLES.FIXED_COSTS).select("*"),
    query(TABLES.INSTALLMENTS).select("*"),
    query(TABLES.PERSONAL_ASSETS).where(COLS.PERSONAL_ASSETS.TYPE, "DEBT_PAYABLE").select("*"),
    query(TABLES.PROFIT_OBLIGATION_SNAPSHOTS).where(COLS.PROFIT_OBLIGATION_SNAPSHOTS.PERIOD_MONTH, periodMonth).select("*"),
  ]);
  return {
    fixedCosts: mergeObligationAmounts("FIXED_COST", fixedCosts, snapshots, periodMonth),
    installments: mergeObligationAmounts("INSTALLMENT", installments, snapshots, periodMonth),
    personalDebt: mergeObligationAmounts("PERSONAL_DEBT", debts, snapshots, periodMonth),
  };
}

function receiptMonth(receipt) {
  return getVietnamDateString(receipt.payment_date).slice(0, 7);
}

module.exports = { calculatePersonalDebtMonthlyPayment, snapshotObligation, getMonthlyObligations, mergeObligationAmounts, receiptMonth };


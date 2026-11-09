/**
 * financeHubService.js
 * Quản lý tính toán tài chính toàn diện:
 * 1. Chi phí cố định (Fixed costs)
 * 2. Trả góp theo kỳ (Installments with auto-expiration)
 * 3. Điểm hòa vốn & Lợi nhuận ròng khởi đầu âm (Break-even Engine)
 * 4. Tài sản ròng & Nợ cá nhân + Nợ NCC (Net Worth Engine)
 */

const { db, TABLES, COLS, withTransaction } = require("@/db");
const { debitFinancialAccount, creditFinancialAccount } = require("@/domains/wallets/services/walletService");
const { allocateReceiptInTrx } = require("@/domains/invoices/services/invoiceService");
const { eventBus, EVENTS, recordEvent } = require("@/events");
const { publishEventInTrx } = require("@/events");
const creditLedgerService = require("../credit/creditLedgerService");
const { getMonthlyObligations } = require("./profitObligationService");
const fixedCostService = require("./fixedCostService");
const installmentService = require("./installmentService");
const personalAssetService = require("./personalAssetService");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const PROFIT_FREQUENCIES = new Set(["DAILY", "MONTHLY", "YEARLY"]);
const PROFIT_DESTINATIONS = new Set(["REINVEST", "CASH_BANK", "SHOP_BALANCE", "OTHER"]);
const DEBT_REPAYMENT_FREQUENCIES = new Set(["DAILY", "MONTHLY"]);

function isDebtProfile(asset) {
  return asset?.type === "DEBT_PAYABLE";
}

async function publishDebtProfileMutationInTrx(trx, { action, beforeState = null, afterState = null, changedFields = {} }) {
  const profile = afterState || beforeState;
  if (!isDebtProfile(beforeState) && !isDebtProfile(afterState)) return;

  await publishEventInTrx(trx, {
    eventName: EVENTS.FINANCE_DEBT_PROFILE_MUTATED,
    aggregateType: "PERSONAL_DEBT_PROFILE",
    aggregateId: profile.id,
    action,
    beforeState,
    afterState,
    changedFields,
    source: "FINANCE_HUB",
    payload: {
      personalAssetId: Number(profile.id),
      debtKind: profile.debt_kind || null,
      action,
    },
  });
}

async function publishPersonalDebtLedgerMutationInTrx(trx, { action, asset, log, balanceAfter }) {
  await publishEventInTrx(trx, {
    eventName: EVENTS.FINANCE_DEBT_LEDGER_MUTATED,
    aggregateType: "PERSONAL_DEBT",
    aggregateId: asset.id,
    action,
    afterState: { amount: balanceAfter },
    source: "FINANCE_HUB",
    payload: {
      personalAssetId: Number(asset.id),
      debtPaymentLogId: Number(log.id),
      debtKind: asset.debt_kind || "PERSONAL_EXTERNAL",
      amount: toNumber(log.amount),
      balanceAfter: toNumber(balanceAfter),
      action,
    },
  });
}

function normalizeProfitConfig({ type, profitEnabled, profitFrequency, annualInterestRate, profitDestination, profitAccountId, profitCreditTime }) {
  if (!profitEnabled) {
    return {
      profit_enabled: false,
      profit_frequency: null,
      annual_interest_rate: null,
      profit_destination: null,
      profit_account_id: null,
      profit_credit_time: null,
    };
  }

  if (type !== "SAVINGS") {
    throw new Error("Chỉ quỹ tích lũy / tiết kiệm mới được cấu hình sinh lời");
  }

  const frequency = profitFrequency || "MONTHLY";
  if (!PROFIT_FREQUENCIES.has(frequency)) {
    throw new Error("Chu kỳ sinh lời không hợp lệ");
  }

  const rate = Number(annualInterestRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Lãi suất năm phải lớn hơn 0");
  }

  const destination = profitDestination || "REINVEST";
  if (!PROFIT_DESTINATIONS.has(destination)) {
    throw new Error("Nơi nhận tiền sinh lời không hợp lệ");
  }

  const accountId = ["CASH_BANK", "SHOP_BALANCE"].includes(destination)
    ? Number(profitAccountId)
    : null;
  if (["CASH_BANK", "SHOP_BALANCE"].includes(destination) && (!Number.isInteger(accountId) || accountId <= 0)) {
    throw new Error("Vui lòng chọn tài khoản nhận tiền sinh lời");
  }

  const creditTime = profitCreditTime || "07:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(creditTime)) {
    throw new Error("Giờ cộng lãi không hợp lệ");
  }

  return {
    profit_enabled: true,
    profit_frequency: frequency,
    annual_interest_rate: rate,
    profit_destination: destination,
    profit_account_id: accountId,
    profit_credit_time: creditTime,
  };
}

async function validateProfitAccount(profitConfig) {
  if (!profitConfig.profit_account_id) return;

  const account = await db(TABLES.FINANCIAL_ACCOUNTS)
    .where({ id: profitConfig.profit_account_id, is_active: true, is_deleted: false })
    .first();

  if (!account || (profitConfig.profit_destination === "CASH_BANK" && account.account_type !== "bank")) {
    throw new Error("Tài khoản nhận tiền sinh lời không tồn tại hoặc không còn hoạt động");
  }
}

function normalizeDebtConfig({ type, debtKind, debtInitialLimit, debtAccountNumber, debtInterestEnabled, debtInterestFrequency, debtAnnualInterestRate, debtDueDay, debtEndDate, debtRepaymentFrequency }) {
  const isDebt = type === "DEBT_PAYABLE" || type === "DEBT_RECEIVABLE";
  if (!isDebt) {
    return {
      debt_kind: null,
      debt_initial_limit: null,
      debt_account_number: null,
      debt_interest_enabled: false,
      debt_interest_frequency: null,
      debt_annual_interest_rate: null,
      debt_due_day: null,
      debt_end_date: null,
      debt_repayment_frequency: null,
    };
  }

  const kind = type === "DEBT_RECEIVABLE" ? null : String(debtKind || "PERSONAL_EXTERNAL");
  if (kind && !["PERSONAL_EXTERNAL", "CREDIT_CARD", "OVERDRAFT"].includes(kind)) {
    throw new Error("Loại sổ nợ không hợp lệ");
  }
  const initialLimit = kind === "CREDIT_CARD" || kind === "OVERDRAFT" ? Number(debtInitialLimit) : null;
  if (initialLimit !== null && (!Number.isFinite(initialLimit) || initialLimit <= 0)) {
    throw new Error("Hạn mức ban đầu phải lớn hơn 0");
  }
  const accountNumber = debtAccountNumber === undefined || debtAccountNumber === null
    ? null
    : String(debtAccountNumber).replace(/\D/g, "") || null;
  const interestEnabled = kind === "PERSONAL_EXTERNAL" ? false : Boolean(debtInterestEnabled);
  const annualRate = interestEnabled ? Number(debtAnnualInterestRate) : null;
  const interestFrequency = interestEnabled ? (debtInterestFrequency || "DAILY") : null;
  if (interestEnabled) {
    if (!Number.isFinite(annualRate) || annualRate <= 0) throw new Error("Lãi suất nợ phải lớn hơn 0");
    if (!["DAILY", "MONTHLY"].includes(interestFrequency)) throw new Error("Chu kỳ tính lãi không hợp lệ");
  }

  const dueDay = (debtDueDay !== undefined && debtDueDay !== null && String(debtDueDay).trim() !== "") ? Number(debtDueDay) : null;
  if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
    throw new Error("Ngày đến hạn phải từ 1 đến 31");
  }
  const rawEndDate = debtEndDate instanceof Date ? debtEndDate.toISOString().slice(0, 10) : String(debtEndDate || "").slice(0, 10);
  const endDate = rawEndDate && /^\d{4}-\d{2}-\d{2}$/.test(rawEndDate) ? rawEndDate : null;
  const repaymentFrequency = debtRepaymentFrequency || "MONTHLY";
  if (!DEBT_REPAYMENT_FREQUENCIES.has(repaymentFrequency)) throw new Error("Chu kỳ quy đổi nợ không hợp lệ");

  return {
    debt_kind: kind,
    debt_initial_limit: initialLimit,
    debt_account_number: accountNumber,
    debt_interest_enabled: interestEnabled,
    debt_interest_frequency: interestFrequency,
    debt_annual_interest_rate: annualRate,
    debt_due_day: dueDay,
    debt_end_date: endDate,
    debt_repayment_frequency: repaymentFrequency,
  };
}
/**
 * Tính toán trạng thái kỳ của một khoản trả góp tại một tháng mục tiêu YYYY-MM
 * @param {Object} item - Bản ghi installments
 * @param {string} targetMonth - 'YYYY-MM' (VD: '2026-10')
 */
function calculateInstallmentState(item, targetMonth) {
  const [startYear, startM] = item.start_period.split("-").map(Number);
  const [targetYear, targetM] = targetMonth.split("-").map(Number);
  const monthDiff = (targetYear - startYear) * 12 + (targetM - startM);
  const currentPeriod = monthDiff + 1; // 1-indexed

  const totalPeriods = Number(item.total_periods);
  const monthlyAmount = toNumber(item.monthly_amount);

  if (currentPeriod < 1) {
    // Chưa đến kỳ trả
    return {
      isEffective: false,
      status: "NOT_STARTED",
      currentPeriod: 0,
      totalPeriods,
      remainingPeriods: totalPeriods,
      monthlyAmount,
      remainingDebt: totalPeriods * monthlyAmount,
    };
  } else if (currentPeriod <= totalPeriods) {
    // Đang trong kỳ trả góp: Số kỳ còn phải trả bao gồm cả kỳ hiện tại chưa tất toán
    const remainingPeriods = totalPeriods - currentPeriod + 1;
    return {
      isEffective: item.is_active !== false,
      status: "ACTIVE",
      currentPeriod,
      totalPeriods,
      remainingPeriods,
      monthlyAmount,
      remainingDebt: remainingPeriods * monthlyAmount,
    };
  } else {
    // Đã hoàn thành tất toán hết số kỳ!
    return {
      isEffective: false,
      status: "COMPLETED",
      currentPeriod: totalPeriods,
      totalPeriods,
      remainingPeriods: 0,
      monthlyAmount,
      remainingDebt: 0,
    };
  }
}

/**
 * Tổng hợp toàn bộ bức tranh tài chính tháng (Break-even + Net worth + Cashflow)
 */
async function getFinanceSummary(targetMonth, startDate, endDate, period = "month") {
  const now = new Date();

  let startDateStr, endDateStr, currentMonthStr;

  if (period === "week") {
    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - 6);
    startDateStr = startD.toISOString().slice(0, 10);
    endDateStr = endD.toISOString().slice(0, 10);
    currentMonthStr = endDateStr.slice(0, 7);
  } else if (period === "year") {
    const year = targetMonth ? targetMonth.slice(0, 4) : String(now.getFullYear());
    startDateStr = `${year}-01-01`;
    endDateStr = `${year}-12-31`;
    currentMonthStr = `${year}-12`;
  } else if (period === "custom" && startDate && endDate) {
    startDateStr = startDate;
    endDateStr = endDate;
    currentMonthStr = endDate.slice(0, 7);
  } else {
    currentMonthStr = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [y, m] = currentMonthStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    startDateStr = `${currentMonthStr}-01`;
    endDateStr = `${currentMonthStr}-${String(lastDay).padStart(2, "0")}`;
  }

  const startIso = `${startDateStr} 00:00:00+07`;
  const endIso = `${endDateStr} 23:59:59+07`;

  const startDObj = new Date(startDateStr);
  const endDObj = new Date(endDateStr);
  const diffTime = Math.abs(endDObj.getTime() - startDObj.getTime());
  const daysInMonth = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // 1. Chi phí cố định (Fixed costs) & Trạng thái thanh toán trong tháng
  const fixedCostRows = await db(TABLES.FIXED_COSTS)
    .select("*")
    .orderBy("id", "asc");

  const fixedCostPaymentLogs = await db(TABLES.DEBT_PAYMENT_LOGS)
    .where("target_type", "FIXED_COST")
    .where("period_month", currentMonthStr);

  const paymentLogMap = new Map();
  fixedCostPaymentLogs.forEach((l) => paymentLogMap.set(Number(l.target_id), l));

  const fixedCosts = fixedCostRows.map((r) => {
    const paidLog = paymentLogMap.get(Number(r.id));
    return {
      id: Number(r.id),
      name: r.name,
      amount: toNumber(r.amount),
      category: r.category || "LIVING",
      isActive: Boolean(r.is_active),
      note: r.note || "",
      createdAt: r.created_at,
      isPaidThisMonth: Boolean(paidLog),
      paidDate: paidLog?.payment_date ? new Date(paidLog.payment_date).toISOString().slice(0, 10) : null,
      paidAmount: paidLog ? toNumber(paidLog.amount) : 0,
      paidLogId: paidLog ? Number(paidLog.id) : null,
    };
  });

  const monthlyObligationsSnapshot = await getMonthlyObligations(currentMonthStr);
  const activeFixedCostsTotal = monthlyObligationsSnapshot.fixedCosts;

  const unpaidFixedCostsTotal = fixedCosts
    .filter((f) => f.isActive && !f.isPaidThisMonth)
    .reduce((sum, f) => sum + f.amount, 0);

  const paidFixedCostsTotal = fixedCosts
    .filter((f) => f.isActive && f.isPaidThisMonth)
    .reduce((sum, f) => sum + f.amount, 0);

  // 2. Các khoản trả góp (Installments)
  const installmentRows = await db(TABLES.INSTALLMENTS)
    .select("*")
    .orderBy("id", "asc");

  let installmentsInMonthTotal = 0;
  let totalInstallmentsRemainingDebt = 0;

  const installments = installmentRows.map((r) => {
    const rawItem = {
      ...r,
      total_periods: Number(r.total_periods),
      monthly_amount: toNumber(r.monthly_amount),
    };
    const state = calculateInstallmentState(rawItem, currentMonthStr);

    if (state.isEffective) {
      installmentsInMonthTotal += state.monthlyAmount;
    }
    totalInstallmentsRemainingDebt += state.remainingDebt;

    return {
      id: Number(r.id),
      name: r.name,
      monthlyAmount: state.monthlyAmount,
      totalPeriods: state.totalPeriods,
      startPeriod: r.start_period,
      dueDay: Number(r.due_day || 15),
      currentPeriod: state.currentPeriod,
      remainingPeriods: state.remainingPeriods,
      remainingDebt: state.remainingDebt,
      isEffective: state.isEffective,
      status: state.status,
      isActive: Boolean(r.is_active),
      note: r.note || "",
      createdAt: r.created_at,
    };
  });

  const personalDebtMonthlyTotal = monthlyObligationsSnapshot.personalDebt;
  const scheduledInstallmentsMonthlyTotal = monthlyObligationsSnapshot.installments;
  const monthlyDebtBurden = scheduledInstallmentsMonthlyTotal + personalDebtMonthlyTotal;

  // 3. Doanh thu & Lợi nhuận gộp từ đơn hàng Shop trong khoảng thời gian
  const summaryStats = await db(TABLES.DAILY_REVENUE_SUMMARY)
    .whereRaw("summary_date >= ? AND summary_date <= ?", [startDateStr, endDateStr])
    .select(
      db.raw("COALESCE(SUM(dashboard_orders_count), 0)::int as count"),
      db.raw("COALESCE(SUM(earned_revenue), 0)::numeric as total_revenue"),
      db.raw("COALESCE(SUM(total_shop_cost), 0)::numeric as total_cost"),
      db.raw("COALESCE(SUM(slot_vacant_cost), 0)::numeric as total_slot_vacant_cost"),
      db.raw("COALESCE(SUM(revenue_reversed), 0)::numeric as total_refund")
    )
    .first();

  // Chi phí nhập ngoài luồng (chỉ tính tài khoản Shop) & chi phí phát sinh tháng trong khoảng thời gian
  const expenseStats = await db(TABLES.STORE_PROFIT_EXPENSES)
    .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
    .whereRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date >= ? AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_date <= ?`, [startDateStr, endDateStr])
    .where(`${TABLES.STORE_PROFIT_EXPENSES}.status`, "completed")
    .select(
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') AND ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_external_import`),
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('monthly_expense', 'withdraw_profit') AND (${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR ${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_monthly_expense`),
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR (${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_type NOT IN ('external_import', 'mavn_import')) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_all_expenses`)
    )
    .first();

  const totalExternalImport = toNumber(expenseStats?.total_external_import || 0);
  const totalMonthlyExpense = toNumber(expenseStats?.total_monthly_expense || 0);
  const totalPostedOperationalExpenses = toNumber(expenseStats?.total_all_expenses || 0);

  const shopOrdersCount = Number(summaryStats?.count || 0);
  const shopRevenue = toNumber(summaryStats?.total_revenue || 0);
  const shopCogs = toNumber(summaryStats?.total_cost || 0);
  const totalSlotVacantCost = toNumber(summaryStats?.total_slot_vacant_cost || 0);
  const shopRefunds = toNumber(summaryStats?.total_refund || 0);
  const totalOperationalExpenses = totalPostedOperationalExpenses + totalSlotVacantCost;
  // Operating profit includes COGS, refunds, vacant-slot costs, and posted operating expenses.
  const shopGrossProfit = shopRevenue - shopCogs - shopRefunds - totalOperationalExpenses;

  // 4. Động cơ Điểm Hòa Vốn (Break-even Engine)
  const breakEvenTarget = activeFixedCostsTotal + monthlyDebtBurden;
  const initialDeficit = -breakEvenTarget; // Lợi nhuận khởi điểm âm đầu tháng
  const netProfit = shopGrossProfit - breakEvenTarget; // Lợi nhuận ròng thực tế

  const breakEvenPercent = breakEvenTarget > 0
    ? Math.min(100, Math.round((shopGrossProfit / breakEvenTarget) * 100))
    : 100;
  const remainingToBreakEven = Math.max(0, breakEvenTarget - shopGrossProfit);

  // 5. Động cơ Nợ Gối Đầu Theo Ngày & Đường Cong Hòa Vốn (Daily Rolling Deficit & Break-Even Curve)
  const dailyBurden = daysInMonth > 0 ? Math.round(breakEvenTarget / daysInMonth) : 0;

  const [dailyRows, dailyExpenseRows] = await Promise.all([
    db(TABLES.DAILY_REVENUE_SUMMARY)
      .whereRaw("summary_date >= ? AND summary_date <= ?", [startDateStr, endDateStr])
      .select(
        db.raw("TO_CHAR(summary_date, 'YYYY-MM-DD') as day_str"),
        db.raw("COALESCE(dashboard_orders_count, 0)::int as count"),
        db.raw("COALESCE(earned_revenue, 0)::numeric as daily_revenue"),
        db.raw("COALESCE(total_shop_cost, 0)::numeric as daily_cost"),
        db.raw("COALESCE(slot_vacant_cost, 0)::numeric as daily_slot_vacant_cost")
      ),
    db(TABLES.STORE_PROFIT_EXPENSES)
      .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
      .whereRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date >= ? AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_date <= ?`, [startDateStr, endDateStr])
      .where(`${TABLES.STORE_PROFIT_EXPENSES}.status`, "completed")
      .select(
        db.raw(`TO_CHAR(${TABLES.STORE_PROFIT_EXPENSES}.expense_date, 'YYYY-MM-DD') as day_str`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') AND ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_external_import`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('monthly_expense', 'withdraw_profit') AND (${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR ${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_monthly_expense`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR (${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_type NOT IN ('external_import', 'mavn_import')) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_total_expense`)
      )
      .groupByRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date`),
  ]);

  const dailyExpenseMap = new Map();
  dailyExpenseRows.forEach((r) => {
    dailyExpenseMap.set(r.day_str, {
      externalImport: toNumber(r.daily_external_import),
      monthlyExpense: toNumber(r.daily_monthly_expense),
      totalExpense: toNumber(r.daily_total_expense),
    });
  });

  const dailyMap = new Map();
  dailyRows.forEach((r) => {
    const rev = toNumber(r.daily_revenue);
    const cost = toNumber(r.daily_cost);
    const slotVacantCost = toNumber(r.daily_slot_vacant_cost);
    const exp = dailyExpenseMap.get(r.day_str) || { externalImport: 0, monthlyExpense: 0, totalExpense: 0 };
    dailyMap.set(r.day_str, {
      count: Number(r.count || 0),
      revenue: rev,
      cost: cost + slotVacantCost + exp.totalExpense,
      externalImport: exp.externalImport,
      monthlyExpense: exp.monthlyExpense,
      profit: rev - cost - slotVacantCost - exp.totalExpense,
    });
  });

  const todayVNStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  // Lấy toàn bộ tài sản cá nhân & phân loại để tính baseNetWorth và netWorth
  const personalAssetRows = await db(TABLES.PERSONAL_ASSETS)
    .select("*")
    .orderBy("id", "asc");

  const mappedPersonalAssets = personalAssetRows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    type: r.type,
    amount: toNumber(r.amount),
    note: r.note || "",
    cardLastDigits: r.card_last_digits || null,
    bankName: r.bank_name || null,
    profitEnabled: Boolean(r.profit_enabled),
    profitFrequency: r.profit_frequency || null,
    annualInterestRate: toNumber(r.annual_interest_rate),
    profitDestination: r.profit_destination || null,
    profitAccountId: r.profit_account_id ? Number(r.profit_account_id) : null,
    profitCreditTime: r.profit_credit_time || null,
    debtInterestEnabled: Boolean(r.debt_interest_enabled),
    debtAnnualInterestRate: toNumber(r.debt_annual_interest_rate),
    debtDueDay: r.debt_due_day ? Number(r.debt_due_day) : null,
    debtEndDate: r.debt_end_date || null,
    debtRepaymentFrequency: r.debt_repayment_frequency || null,
    updatedAt: r.updated_at,
    accountScope: r.account_scope || "PERSONAL",
  }));

  const personalBankRows = await db(TABLES.SHOP_BANK_ACCOUNTS)
    .where("account_type", "bank")
    .where("account_scope", "PERSONAL")
    .where("is_deleted", false)
    .where("is_active", true)
    .orderBy("id", "asc");

  const personalBankAssets = personalBankRows.map((r) => {
    const hasCustomLabel = r.label && r.label.trim() && r.label.trim() !== "Tài khoản cá nhân";
    const labelSuffix = hasCustomLabel ? ` - ${r.label.trim()}` : "";
    const rawBank = r.bank_display_name || r.bank_short_code || "Ngân hàng";
    const cleanBank = rawBank.replace(/\s*\([A-Za-z0-9]{2,6}\)/g, "").trim();
    return {
      id: 1000000 + Number(r.id),
      name: `${cleanBank} (${r.account_number})${labelSuffix}`,
      type: "CASH_BANK",
      amount: toNumber(r.balance),
      note: r.account_holder ? `Chủ TK: ${r.account_holder}` : "",
      accountNumber: r.account_number || "",
      accountHolder: r.account_holder || "",
      bankDisplayName: cleanBank,
      bankShortCode: r.bank_short_code || "",
      bankBin: r.bank_bin || "",
      qrNotePrefix: r.qr_note_prefix || "",
      label: r.label || "",
      profitEnabled: false,
      profitFrequency: null,
      annualInterestRate: 0,
      profitDestination: null,
      profitAccountId: null,
      profitCreditTime: null,
      debtInterestEnabled: false,
      debtAnnualInterestRate: 0,
      debtDueDay: null,
      debtEndDate: null,
      debtRepaymentFrequency: null,
      updatedAt: r.updated_at,
      accountScope: "PERSONAL",
      bankAccountId: Number(r.id),
    };
  });

  const personalAssets = [...mappedPersonalAssets, ...personalBankAssets];

  const shopBankRows = await db(TABLES.SHOP_BANK_ACCOUNTS)
    .where("account_type", "bank")
    .where("account_scope", "SHOP")
    .where("is_deleted", false)
    .orderBy("id", "asc");

  const shopBankAccounts = shopBankRows.map((r) => ({
    id: Number(r.id),
    label: r.label || r.bank_display_name || "Ngân hàng Shop",
    accountNumber: r.account_number,
    accountHolder: r.account_holder,
    bankDisplayName: r.bank_display_name,
    bankShortCode: r.bank_short_code,
    balance: toNumber(r.balance),
    isActive: Boolean(r.is_active),
    isDefault: Boolean(r.is_default),
  }));

  const usdtWalletRows = await db(TABLES.USDT_WALLETS)
    .where("account_type", "usdt")
    .where("is_deleted", false)
    .orderBy("id", "asc");

  const usdtWallets = usdtWalletRows.map((r) => ({
    id: Number(r.id),
    label: r.label || "Ví USDT",
    walletAddress: r.account_number,
    network: r.bank_short_code,
    balance: toNumber(r.balance),
    isActive: Boolean(r.is_active),
    isDefault: Boolean(r.is_default),
  }));

  let personalSavingsTotal = 0;
  let personalCashBankTotal = 0;
  let personalInvestmentsTotal = 0;
  let personalDebtReceivableTotal = 0; // Người khác nợ mình
  let personalDebtPayableTotal = 0; // Mình nợ người khác

  personalAssets.forEach((a) => {
    if (a.type === "SAVINGS") personalSavingsTotal += a.amount;
    else if (a.type === "CASH_BANK") personalCashBankTotal += a.amount;
    else if (a.type === "GOLD_INVESTMENT") personalInvestmentsTotal += a.amount;
    else if (a.type === "DEBT_RECEIVABLE") personalDebtReceivableTotal += a.amount;
    else if (a.type === "DEBT_PAYABLE") personalDebtPayableTotal += a.amount;
  });

  const shopWallets = await db(TABLES.FINANCIAL_ACCOUNTS)
    .where("is_deleted", false)
    .where("is_active", true)
    .whereNot("account_scope", "PERSONAL")
    .select(db.raw("COALESCE(SUM(balance), 0)::numeric as total_balance"))
    .first();
  const shopBalanceTotal = toNumber(shopWallets?.total_balance || 0);

  const supplierDebtLog = await db(TABLES.SUPPLIER_ORDER_COST_LOG)
    .where("ncc_payment_status", "Chưa Thanh Toán")
    .select(db.raw("COALESCE(SUM(import_cost), 0)::numeric as total_debt"))
    .first();
  const supplierDebtTotal = toNumber(supplierDebtLog?.total_debt || 0);

  const totalShopAssets = shopBalanceTotal;
  const grandTotalAssets = shopBalanceTotal + personalSavingsTotal + personalCashBankTotal + personalInvestmentsTotal + personalDebtReceivableTotal;

  // Tổng nghĩa vụ nợ: Loại bỏ công nợ NCC theo chỉ thị Master (NCC đã ghi nhận trong chi phí đơn hàng/COGS)
  // Chỉ ghi nhận 2 mục: Nợ & Trả Góp và Chi Phí Cố Định CHƯA THANH TOÁN (khoản đã trả thì nghĩa vụ = 0, chống double-counting)
  const totalDebtAndInstallments = totalInstallmentsRemainingDebt + personalDebtPayableTotal;
  const shopLiabilities = totalInstallmentsRemainingDebt + unpaidFixedCostsTotal;
  const totalLiabilities = totalDebtAndInstallments + unpaidFixedCostsTotal;

  // Tài sản ròng chuẩn mực: Tổng tài sản thực có - Tổng nghĩa vụ nợ
  // Không cộng thêm lợi nhuận tích lũy vì tiền lãi đơn hàng đã nằm trong số dư ngân hàng Shop (chống double-counting)
  const netWorthBase = totalShopAssets - shopLiabilities;
  const monthlyObligations = monthlyDebtBurden + unpaidFixedCostsTotal;
  const baseNetWorth = netWorthBase;

  let cumulativeProfit = 0;
  let rollingBalance = 0; // Số dư nợ gối đầu: âm nghĩa là nợ đọng, dương nghĩa là thặng dư
  let breakEvenDay = null; // Ngày đầu tiên vượt qua mốc hòa vốn tổng của tháng
  let firstDebtFreeDay = null; // Ngày đầu tiên rollingBalance >= 0

  const chartData = [];

  // Danh sách ngày thực tế chuẩn xác theo lịch từ startDateStr đến endDateStr (hỗ trợ week, month, year, custom)
  const dateList = [];
  const curDate = new Date(`${startDateStr}T00:00:00`);
  const endLimitDate = new Date(`${endDateStr}T00:00:00`);

  while (curDate <= endLimitDate) {
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, "0");
    const d = String(curDate.getDate()).padStart(2, "0");
    dateList.push(`${y}-${m}-${d}`);
    curDate.setDate(curDate.getDate() + 1);
  }

  for (let i = 0; i < dateList.length; i++) {
    const dayStr = dateList[i];
    const d = i + 1;
    const exp = dailyExpenseMap.get(dayStr) || { externalImport: 0, monthlyExpense: 0, totalExpense: 0 };
    const dayData = dailyMap.get(dayStr) || { count: 0, revenue: 0, cost: exp.totalExpense, externalImport: exp.externalImport, monthlyExpense: exp.monthlyExpense, profit: -exp.totalExpense };
    const todayProfit = dayData.profit;
    const isFuture = dayStr > todayVNStr;

    // Nợ gối đầu từ hôm trước mang sang: nếu rollingBalance hôm trước < 0 thì đó là nợ tồn đọng
    const previousDebt = rollingBalance < 0 ? Math.abs(rollingBalance) : 0;
    // Số tiền hôm nay cần kiếm để xóa sạch nợ gối đầu và bù đủ định mức ngày hôm nay:
    const todayRequired = Math.max(0, dailyBurden + (rollingBalance < 0 ? Math.abs(rollingBalance) : -rollingBalance));

    cumulativeProfit += todayProfit;
    // Cập nhật rolling balance: nhận lãi hôm nay trừ đi định mức ngày hôm nay
    rollingBalance += (todayProfit - dailyBurden);

    const dayNetWorth = netWorthBase + cumulativeProfit;

    if (!breakEvenDay && cumulativeProfit >= breakEvenTarget && breakEvenTarget > 0) {
      breakEvenDay = d;
    }

    if (!firstDebtFreeDay && rollingBalance >= 0 && (todayProfit > 0 || breakEvenTarget === 0)) {
      firstDebtFreeDay = d;
    }

    chartData.push({
      day: d,
      dateStr: dayStr,
      ordersCount: dayData.count,
      dailyRevenue: dayData.revenue,
      dailyCost: dayData.cost,
      todayProfit,
      dailyQuota: dailyBurden,
      previousDebt,
      todayRequired,
      rollingBalance,
      isDebtFreeToday: rollingBalance >= 0,
      cumulativeProfit,
      dayNetWorth,
      cumulativeDeficit: Math.min(0, cumulativeProfit - breakEvenTarget),
      isMasterBreakEvenPassed: cumulativeProfit >= breakEvenTarget,
      isFuture,
    });
  }

  const todayPoint = chartData.find((d) => d.dateStr === todayVNStr);
  const isDateInRange = Boolean(todayPoint);
  const currentRollingBalance = isDateInRange
    ? (todayPoint?.rollingBalance ?? 0)
    : (chartData[chartData.length - 1]?.rollingBalance ?? 0);

  const dailyBreakEven = {
    dailyBurden,
    daysInMonth: dateList.length,
    startDate: startDateStr,
    endDate: endDateStr,
    breakEvenDay,
    firstDebtFreeDay,
    currentDay: todayPoint ? todayPoint.day : null,
    todayDateStr: todayPoint?.dateStr || todayVNStr,
    currentRollingBalance,
    carriedDebtIntoToday: todayPoint?.previousDebt ?? 0,
    requiredForToday: todayPoint?.todayRequired ?? dailyBurden,
    todayProfit: todayPoint?.todayProfit ?? 0,
    chartData,
  };

  // 6. Tài sản ròng chuẩn mực kế toán (Balance Sheet Net Worth):
  // Tài sản ròng = Tổng tài sản thực có - Tổng nghĩa vụ nợ (triệt tiêu double-counting lợi nhuận theo chỉ thị Master)
  const netWorth = totalShopAssets - shopLiabilities;

  return {
    month: currentMonthStr,
    breakEven: {
      initialDeficit,
      breakEvenTarget,
      shopGrossProfit,
      shopRevenue,
      shopCogs,
      totalSlotVacantCost,
      shopRefunds,
      shopOrdersCount,
      netProfit,
      breakEvenPercent,
      remainingToBreakEven,
      isBreakEvenPassed: shopGrossProfit >= breakEvenTarget,
      totalExternalImport,
      totalMonthlyExpense,
      totalOperationalExpenses,
      activeFixedCostsTotal,
      unpaidFixedCostsTotal,
      paidFixedCostsTotal,
      installmentsInMonthTotal,
      scheduledInstallmentsMonthlyTotal,
      personalDebtMonthlyTotal,
      monthlyDebtBurden,
    },
    dailyBreakEven,
    netWorth: {
      netWorth,
      totalAssets: totalShopAssets,
      totalLiabilities: shopLiabilities,
      breakdown: {
        shopBalanceTotal,
        personalSavingsTotal,
        personalCashBankTotal,
        personalInvestmentsTotal,
        personalDebtReceivableTotal,
        supplierDebtTotal,
        personalDebtPayableTotal,
        totalInstallmentsRemainingDebt,
        activeFixedCostsTotal,
        unpaidFixedCostsTotal,
        paidFixedCostsTotal,
        totalDebtAndInstallments,
      },
    },
    fixedCosts,
    installments,
    personalAssets,
    shopBankAccounts,
    usdtWallets,
    savingGoals: await getSavingGoalsOverview(),
    debtPaymentLogs: await getDebtPaymentLogs({ limit: 50 }),
  };
}

// --- CRUD FIXED COSTS ---
const { createFixedCost, updateFixedCost, deleteFixedCost, payFixedCost, cancelFixedCostPayment, getFixedCosts } = fixedCostService;

// --- CRUD INSTALLMENTS ---
const { createInstallment, updateInstallment, deleteInstallment, payInstallment } = installmentService;

// --- CRUD PERSONAL ASSETS ---
const { createPersonalAsset, updatePersonalAsset, deletePersonalAsset, payPersonalAsset, borrowPersonalAsset, borrowPersonalAssetInTrx, autoMatchCardTransaction, getDebtPaymentLogs, getUnallocatedReceipts } = personalAssetService;

// --- PERSONAL BALANCE SNAPSHOTS & CIRCULAR STAT ---
async function getPersonalBalanceSnapshots() {
  const rows = await db(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
    .orderBy("snapshot_date", "desc")
    .orderBy("id", "desc");

  const snapshots = rows.map((r) => {
    let detail = r.balances_detail;
    if (typeof detail === "string") {
      try {
        detail = JSON.parse(detail);
      } catch {
        detail = [];
      }
    }
    const totalBal = toNumber(r.total_balance);
    const personalBal = r.personal_balance !== undefined && r.personal_balance !== null
      ? toNumber(r.personal_balance)
      : totalBal;
    const shopBal = toNumber(r.shop_balance || 0);

    return {
      id: Number(r.id),
      snapshotDate: r.snapshot_date instanceof Date ? r.snapshot_date.toISOString().slice(0, 10) : String(r.snapshot_date),
      totalBalance: totalBal,
      personalBalance: personalBal,
      shopBalance: shopBal,
      previousBalance: toNumber(r.previous_balance),
      deltaAmount: toNumber(r.delta_amount),
      deltaPercent: toNumber(r.delta_percent),
      balancesDetail: Array.isArray(detail) ? detail : [],
      note: r.note || "",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  let latestComparison = null;
  if (snapshots.length >= 1) {
    const latest = snapshots[0];
    const previous = snapshots.length >= 2 ? snapshots[1] : null;
    const deltaAmount = previous ? (latest.totalBalance - previous.totalBalance) : 0;
    const deltaPercent = (previous && previous.totalBalance > 0)
      ? Number(((deltaAmount / previous.totalBalance) * 100).toFixed(2))
      : 0;

    latestComparison = {
      latest,
      previous,
      deltaAmount,
      deltaPercent,
      isIncrease: deltaAmount >= 0,
    };
  }

  return { snapshots, latestComparison };
}

async function createPersonalBalanceSnapshot(payload) {
  const snapshotDate = payload.snapshotDate || new Date().toISOString().slice(0, 10);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const note = payload.note || "";
  const autoSync = payload.autoSyncCurrentBalance !== false;

  const personalBalance = items.length > 0
    ? items.reduce((sum, item) => sum + toNumber(item.amount), 0)
    : toNumber(payload.personalBalance || 0);

  return await withTransaction(async (trx) => {
    // Tự động lấy số dư ví Shop nếu client không truyền
    let shopBalance = 0;
    if (payload.shopBalance !== undefined && payload.shopBalance !== null) {
      shopBalance = toNumber(payload.shopBalance);
    } else {
      const shopWallets = await trx(TABLES.FINANCIAL_ACCOUNTS)
        .where("is_deleted", false)
        .where("is_active", true)
        .whereNot("account_scope", "PERSONAL")
        .select(trx.raw("COALESCE(SUM(balance), 0)::numeric as total_balance"))
        .first();
      shopBalance = toNumber(shopWallets?.total_balance || 0);
    }

    const totalBalance = personalBalance + shopBalance;

    const prev = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", "<", snapshotDate)
      .orderBy("snapshot_date", "desc")
      .first();

    const previousBalance = prev ? toNumber(prev.total_balance) : 0;
    const deltaAmount = prev ? (totalBalance - previousBalance) : 0;
    const deltaPercent = (prev && previousBalance > 0)
      ? Number(((deltaAmount / previousBalance) * 100).toFixed(2))
      : 0;

    const existing = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", snapshotDate)
      .first();

    let savedRecord = null;
    if (existing) {
      const [updated] = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .where("id", existing.id)
        .update({
          personal_balance: personalBalance,
          shop_balance: shopBalance,
          total_balance: totalBalance,
          previous_balance: previousBalance,
          delta_amount: deltaAmount,
          delta_percent: deltaPercent,
          balances_detail: JSON.stringify(items),
          note,
          updated_at: trx.fn.now(),
        })
        .returning("*");
      savedRecord = updated;
    } else {
      const [created] = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .insert({
          snapshot_date: snapshotDate,
          personal_balance: personalBalance,
          shop_balance: shopBalance,
          total_balance: totalBalance,
          previous_balance: previousBalance,
          delta_amount: deltaAmount,
          delta_percent: deltaPercent,
          balances_detail: JSON.stringify(items),
          note,
        })
        .returning("*");
      savedRecord = created;
    }


    const next = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", ">", snapshotDate)
      .orderBy("snapshot_date", "asc")
      .first();

    if (next) {
      const nextTotal = toNumber(next.total_balance);
      const nextDelta = nextTotal - totalBalance;
      const nextPercent = totalBalance > 0 ? Number(((nextDelta / totalBalance) * 100).toFixed(2)) : 0;
      await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .where("id", next.id)
        .update({
          previous_balance: totalBalance,
          delta_amount: nextDelta,
          delta_percent: nextPercent,
          updated_at: trx.fn.now(),
        });
    }

    if (autoSync && items.length > 0) {
      for (const item of items) {
        const itemAmount = toNumber(item.amount);
        if (item.bankAccountId) {
          await trx(TABLES.SHOP_BANK_ACCOUNTS)
            .where("id", item.bankAccountId)
            .where("account_scope", "PERSONAL")
            .update({
              balance: itemAmount,
              updated_at: trx.fn.now(),
            });
        } else if (item.assetId) {
          await trx(TABLES.PERSONAL_SAVINGS)
            .where("id", item.assetId)
            .update({
              amount: itemAmount,
              updated_at: trx.fn.now(),
            });
        }
      }
    }

    return {
      id: Number(savedRecord.id),
      snapshotDate: savedRecord.snapshot_date instanceof Date ? savedRecord.snapshot_date.toISOString().slice(0, 10) : String(savedRecord.snapshot_date),
      totalBalance: toNumber(savedRecord.total_balance),
      personalBalance: toNumber(savedRecord.personal_balance !== undefined ? savedRecord.personal_balance : personalBalance),
      shopBalance: toNumber(savedRecord.shop_balance !== undefined ? savedRecord.shop_balance : shopBalance),
      previousBalance: toNumber(savedRecord.previous_balance),
      deltaAmount: toNumber(savedRecord.delta_amount),
      deltaPercent: toNumber(savedRecord.delta_percent),
      balancesDetail: items,
      note: savedRecord.note || "",
    };
  });
}

async function updatePersonalBalanceSnapshot(id, payload) {
  const existing = await db(TABLES.PERSONAL_BALANCE_SNAPSHOTS).where("id", id).first();
  if (!existing) return null;

  const snapshotDate = payload.snapshotDate || (existing.snapshot_date instanceof Date ? existing.snapshot_date.toISOString().slice(0, 10) : String(existing.snapshot_date));
  const items = Array.isArray(payload.items) ? payload.items : (typeof existing.balances_detail === "string" ? JSON.parse(existing.balances_detail) : existing.balances_detail);
  const note = payload.note !== undefined ? payload.note : existing.note;
  const autoSync = payload.autoSyncCurrentBalance === true;

  const totalBalance = items.reduce((sum, item) => sum + toNumber(item.amount), 0);

  return await withTransaction(async (trx) => {
    const prev = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", "<", snapshotDate)
      .whereNot("id", id)
      .orderBy("snapshot_date", "desc")
      .first();

    const previousBalance = prev ? toNumber(prev.total_balance) : 0;
    const deltaAmount = prev ? (totalBalance - previousBalance) : 0;
    const deltaPercent = (prev && previousBalance > 0)
      ? Number(((deltaAmount / previousBalance) * 100).toFixed(2))
      : 0;

    const [updated] = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("id", id)
      .update({
        snapshot_date: snapshotDate,
        total_balance: totalBalance,
        previous_balance: previousBalance,
        delta_amount: deltaAmount,
        delta_percent: deltaPercent,
        balances_detail: JSON.stringify(items),
        note,
        updated_at: trx.fn.now(),
      })
      .returning("*");

    const next = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", ">", snapshotDate)
      .whereNot("id", id)
      .orderBy("snapshot_date", "asc")
      .first();

    if (next) {
      const nextTotal = toNumber(next.total_balance);
      const nextDelta = nextTotal - totalBalance;
      const nextPercent = totalBalance > 0 ? Number(((nextDelta / totalBalance) * 100).toFixed(2)) : 0;
      await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .where("id", next.id)
        .update({
          previous_balance: totalBalance,
          delta_amount: nextDelta,
          delta_percent: nextPercent,
          updated_at: trx.fn.now(),
        });
    }

    if (autoSync && items.length > 0) {
      for (const item of items) {
        const itemAmount = toNumber(item.amount);
        if (item.bankAccountId) {
          await trx(TABLES.SHOP_BANK_ACCOUNTS)
            .where("id", item.bankAccountId)
            .where("account_scope", "PERSONAL")
            .update({
              balance: itemAmount,
              updated_at: trx.fn.now(),
            });
        } else if (item.assetId) {
          await trx(TABLES.PERSONAL_SAVINGS)
            .where("id", item.assetId)
            .update({
              amount: itemAmount,
              updated_at: trx.fn.now(),
            });
        }
      }
    }

    return {
      id: Number(updated.id),
      snapshotDate: updated.snapshot_date instanceof Date ? updated.snapshot_date.toISOString().slice(0, 10) : String(updated.snapshot_date),
      totalBalance: toNumber(updated.total_balance),
      previousBalance: toNumber(updated.previous_balance),
      deltaAmount: toNumber(updated.delta_amount),
      deltaPercent: toNumber(updated.delta_percent),
      balancesDetail: items,
      note: updated.note || "",
    };
  });
}

async function deletePersonalBalanceSnapshot(id) {
  return await db(TABLES.PERSONAL_BALANCE_SNAPSHOTS).where("id", id).del();
}

// --- SAVING GOALS & FUND (MILESTONE TARGET LADDER) ---
async function getSavingGoalsOverview() {
  const latestLedger = await db(TABLES.SAVING_FUND_LEDGER)
    .orderBy("id", "desc")
    .first();
  const currentFund = latestLedger ? toNumber(latestLedger.balance_after) : 0;

  const activeRows = await db(TABLES.SAVING_GOALS)
    .where("status", "ACTIVE")
    .orderBy("target_amount", "asc");

  const completedRows = await db(TABLES.SAVING_GOALS)
    .where("status", "COMPLETED")
    .orderBy("updated_at", "desc");

  let nextFocusAssigned = false;
  const activeGoals = activeRows.map((g) => {
    const target = toNumber(g.target_amount);
    const isReached = currentFund >= target;
    const progressPercent = target > 0 ? Math.min(100, Math.round((currentFund / target) * 100)) : 100;
    const missingAmount = Math.max(0, target - currentFund);

    let isNextFocus = false;
    if (!isReached && !nextFocusAssigned) {
      isNextFocus = true;
      nextFocusAssigned = true;
    }

    return {
      id: Number(g.id),
      name: g.name,
      targetAmount: target,
      status: g.status,
      note: g.note || "",
      isReached,
      isNextFocus,
      progressPercent,
      missingAmount,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    };
  });

  const completedGoals = completedRows.map((g) => ({
    id: Number(g.id),
    name: g.name,
    targetAmount: toNumber(g.target_amount),
    status: g.status,
    note: g.note || "",
    isReached: true,
    isNextFocus: false,
    progressPercent: 100,
    missingAmount: 0,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  }));

  const recentTransactions = await db(TABLES.SAVING_FUND_LEDGER)
    .leftJoin(TABLES.SAVING_GOALS, `${TABLES.SAVING_FUND_LEDGER}.goal_id`, `${TABLES.SAVING_GOALS}.id`)
    .select(
      `${TABLES.SAVING_FUND_LEDGER}.*`,
      `${TABLES.SAVING_GOALS}.name as goal_name`
    )
    .orderBy(`${TABLES.SAVING_FUND_LEDGER}.id`, "desc")
    .limit(15);

  const transactions = recentTransactions.map((t) => ({
    id: Number(t.id),
    actionType: t.action_type,
    amount: toNumber(t.amount),
    balanceBefore: toNumber(t.balance_before),
    balanceAfter: toNumber(t.balance_after),
    goalId: t.goal_id ? Number(t.goal_id) : null,
    goalName: t.goal_name || null,
    note: t.note || "",
    createdAt: t.created_at,
  }));

  return {
    currentFund,
    totalGoalsCount: activeGoals.length + completedGoals.length,
    activeGoalsCount: activeGoals.length,
    reachedGoalsCount: activeGoals.filter((g) => g.isReached).length,
    completedGoalsCount: completedGoals.length,
    activeGoals,
    completedGoals,
    recentTransactions: transactions,
  };
}

async function createSavingGoal(payload) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Vui lòng nhập tên mục tiêu");
  const targetAmount = toNumber(payload.targetAmount || payload.target_amount);
  if (targetAmount <= 0) throw new Error("Số tiền mục tiêu phải lớn hơn 0");

  const [created] = await db(TABLES.SAVING_GOALS)
    .insert({
      name,
      target_amount: targetAmount,
      status: "ACTIVE",
      note: payload.note || "",
    })
    .returning("*");

  return {
    id: Number(created.id),
    name: created.name,
    targetAmount: toNumber(created.target_amount),
    status: created.status,
    note: created.note || "",
    createdAt: created.created_at,
  };
}

async function updateSavingGoal(id, payload) {
  const updateData = { updated_at: db.fn.now() };
  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) throw new Error("Tên mục tiêu không được rỗng");
    updateData.name = name;
  }
  if (payload.targetAmount !== undefined || payload.target_amount !== undefined) {
    const targetAmount = toNumber(payload.targetAmount ?? payload.target_amount);
    if (targetAmount <= 0) throw new Error("Số tiền mục tiêu phải lớn hơn 0");
    updateData.target_amount = targetAmount;
  }
  if (payload.note !== undefined) updateData.note = payload.note;
  if (payload.status !== undefined) updateData.status = payload.status;

  const [updated] = await db(TABLES.SAVING_GOALS)
    .where("id", id)
    .update(updateData)
    .returning("*");

  if (!updated) return null;

  return {
    id: Number(updated.id),
    name: updated.name,
    targetAmount: toNumber(updated.target_amount),
    status: updated.status,
    note: updated.note || "",
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

async function deleteSavingGoal(id) {
  return await db(TABLES.SAVING_GOALS).where("id", id).del();
}

async function executeSavingGoal(id, payload = {}) {
  const { deductFund, note } = payload;
  return await withTransaction(async (trx) => {
    const goal = await trx(TABLES.SAVING_GOALS).where("id", id).first();
    if (!goal) throw new Error("Không tìm thấy mục tiêu");

    let newBalance = null;

    if (deductFund) {
      const latest = await trx(TABLES.SAVING_FUND_LEDGER)
        .orderBy("id", "desc")
        .forUpdate()
        .first();
      const balanceBefore = latest ? toNumber(latest.balance_after) : 0;
      const targetAmount = toNumber(goal.target_amount);

      if (targetAmount > balanceBefore) {
        throw new Error(`Số dư quỹ hiện tại (${balanceBefore.toLocaleString("vi-VN")} ₫) không đủ để thực hiện mục tiêu này (${targetAmount.toLocaleString("vi-VN")} ₫)`);
      }

      const balanceAfter = balanceBefore - targetAmount;
      await trx(TABLES.SAVING_FUND_LEDGER).insert({
        action_type: "EXECUTE_GOAL",
        amount: targetAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        goal_id: id,
        note: note || `Thực hiện mục tiêu: ${goal.name}`,
      });
      newBalance = balanceAfter;
    }

    const [updated] = await trx(TABLES.SAVING_GOALS)
      .where("id", id)
      .update({
        status: "COMPLETED",
        updated_at: trx.fn.now(),
      })
      .returning("*");

    return {
      goal: {
        id: Number(updated.id),
        name: updated.name,
        targetAmount: toNumber(updated.target_amount),
        status: updated.status,
        note: updated.note || "",
      },
      deducted: Boolean(deductFund),
      newBalance,
    };
  });
}

async function depositSavingFund(payload) {
  const amount = toNumber(payload.amount);
  if (amount <= 0) throw new Error("Số tiền nạp phải lớn hơn 0");

  return await withTransaction(async (trx) => {
    const latest = await trx(TABLES.SAVING_FUND_LEDGER)
      .orderBy("id", "desc")
      .forUpdate()
      .first();
    const balanceBefore = latest ? toNumber(latest.balance_after) : 0;
    const balanceAfter = balanceBefore + amount;

    const [created] = await trx(TABLES.SAVING_FUND_LEDGER)
      .insert({
        action_type: "DEPOSIT",
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        goal_id: payload.goalId ? Number(payload.goalId) : null,
        note: payload.note || "Nạp tiền vào quỹ tích lũy mục tiêu",
      })
      .returning("*");

    return {
      transactionId: Number(created.id),
      amount,
      balanceBefore,
      balanceAfter,
    };
  });
}

async function withdrawSavingFund(payload) {
  const amount = toNumber(payload.amount);
  if (amount <= 0) throw new Error("Số tiền rút phải lớn hơn 0");

  return await withTransaction(async (trx) => {
    const latest = await trx(TABLES.SAVING_FUND_LEDGER)
      .orderBy("id", "desc")
      .forUpdate()
      .first();
    const balanceBefore = latest ? toNumber(latest.balance_after) : 0;

    if (amount > balanceBefore) {
      throw new Error(`Số dư quỹ không đủ (${balanceBefore.toLocaleString("vi-VN")} ₫) để rút ${amount.toLocaleString("vi-VN")} ₫`);
    }

    const balanceAfter = balanceBefore - amount;

    const [created] = await trx(TABLES.SAVING_FUND_LEDGER)
      .insert({
        action_type: "WITHDRAW",
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        goal_id: payload.goalId ? Number(payload.goalId) : null,
        note: payload.note || "Trích rút tiền từ quỹ tích lũy mục tiêu",
      })
      .returning("*");

    return {
      transactionId: Number(created.id),
      amount,
      balanceBefore,
      balanceAfter,
    };
  });
}

module.exports = {
  calculateInstallmentState,
  getFinanceSummary,
  createFixedCost,
  updateFixedCost,
  deleteFixedCost,
  payFixedCost,
  cancelFixedCostPayment,
  getFixedCosts,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  payInstallment,
  createPersonalAsset,
  updatePersonalAsset,
  deletePersonalAsset,
  payPersonalAsset,
  borrowPersonalAsset,
  borrowPersonalAssetInTrx,
  autoMatchCardTransaction,
  getDebtPaymentLogs,
  getUnallocatedReceipts,
  getPersonalBalanceSnapshots,
  createPersonalBalanceSnapshot,
  updatePersonalBalanceSnapshot,
  deletePersonalBalanceSnapshot,
  getSavingGoalsOverview,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  executeSavingGoal,
  depositSavingFund,
  withdrawSavingFund,
};

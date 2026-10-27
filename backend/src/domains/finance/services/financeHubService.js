/**
 * financeHubService.js
 * Quản lý tính toán tài chính toàn diện:
 * 1. Chi phí cố định (Fixed costs)
 * 2. Trả góp theo kỳ (Installments with auto-expiration)
 * 3. Điểm hòa vốn & Lợi nhuận ròng khởi đầu âm (Break-even Engine)
 * 4. Tài sản ròng & Nợ cá nhân + Nợ NCC (Net Worth Engine)
 */

const { db, TABLES, withTransaction } = require("@/db");
const { debitFinancialAccount, creditFinancialAccount } = require("@/domains/wallets/services/walletService");
const { allocateReceipt } = require("@/domains/invoices/services/invoiceService");
const { eventBus, EVENTS, recordEvent } = require("@/events");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const PROFIT_FREQUENCIES = new Set(["DAILY", "MONTHLY", "YEARLY"]);
const PROFIT_DESTINATIONS = new Set(["REINVEST", "CASH_BANK", "SHOP_BALANCE", "OTHER"]);
const DEBT_REPAYMENT_FREQUENCIES = new Set(["DAILY", "MONTHLY"]);

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

function normalizeDebtConfig({ type, debtInterestEnabled, debtInterestFrequency, debtAnnualInterestRate, debtDueDay, debtEndDate, debtRepaymentFrequency }) {
  const isDebt = type === "DEBT_PAYABLE" || type === "DEBT_RECEIVABLE";
  if (!isDebt || !debtInterestEnabled) {
    return {
      debt_interest_enabled: false,
      debt_interest_frequency: null,
      debt_annual_interest_rate: null,
      debt_due_day: null,
      debt_end_date: null,
      debt_repayment_frequency: null,
    };
  }

  const annualRate = Number(debtAnnualInterestRate);
  const dueDay = Number(debtDueDay);
  const interestFrequency = debtInterestFrequency || "DAILY";
  const repaymentFrequency = debtRepaymentFrequency || "MONTHLY";
  const endDate = debtEndDate instanceof Date ? debtEndDate.toISOString().slice(0, 10) : String(debtEndDate || "").slice(0, 10);
  if (!Number.isFinite(annualRate) || annualRate <= 0) throw new Error("Lãi suất nợ phải lớn hơn 0");
  if (!["DAILY", "MONTHLY"].includes(interestFrequency)) throw new Error("Chu kỳ tính lãi không hợp lệ");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("Ngày đến hạn phải từ 1 đến 31");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Vui lòng chọn ngày hết hạn nợ");
  if (!DEBT_REPAYMENT_FREQUENCIES.has(repaymentFrequency)) throw new Error("Chu kỳ quy đổi nợ không hợp lệ");

  return {
    debt_interest_enabled: true,
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

function calculatePersonalDebtMonthlyPayment(item) {
  if (item.type !== "DEBT_PAYABLE") return 0;
  const amount = toNumber(item.amount);
  if (amount <= 0) return 0;
  if (!item.debt_end_date) {
    return Math.ceil(amount / 12);
  }

  const endDate = new Date(`${String(item.debt_end_date).slice(0, 10)}T23:59:59`);
  const remainingDays = Math.max(1, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const remainingMonths = Math.max(1, Math.floor(remainingDays / 30.4375) || 1);
  const annualRate = Boolean(item.debt_interest_enabled) ? toNumber(item.debt_annual_interest_rate) : 0;
  const estimatedTotal = amount + (amount * annualRate / 100 * remainingDays / 365);
  const dailyPayment = Math.ceil(estimatedTotal / remainingDays);
  // Nguyên tắc an toàn: Thà dôi dư chứ không để thiếu hụt nợ khi tới hạn
  return Math.max(Math.ceil(dailyPayment * 30.44), Math.ceil(estimatedTotal / remainingMonths));
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

  const activeFixedCostsTotal = fixedCosts
    .filter((f) => f.isActive)
    .reduce((sum, f) => sum + f.amount, 0);

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

  const personalDebtRows = await db(TABLES.PERSONAL_ASSETS)
    .where("type", "DEBT_PAYABLE")
    .select("type", "amount", "debt_interest_enabled", "debt_annual_interest_rate", "debt_end_date", "debt_repayment_frequency");
  const personalDebtMonthlyTotal = personalDebtRows.reduce((sum, item) => sum + calculatePersonalDebtMonthlyPayment(item), 0);
  const scheduledInstallmentsMonthlyTotal = installmentRows
    .filter((item) => Boolean(item.is_active) && item.status !== "COMPLETED")
    .reduce((sum, item) => sum + toNumber(item.monthly_amount), 0);
  const monthlyDebtBurden = scheduledInstallmentsMonthlyTotal + personalDebtMonthlyTotal;

  // 3. Doanh thu & Lợi nhuận gộp từ đơn hàng Shop trong khoảng thời gian
  const summaryStats = await db(TABLES.DAILY_REVENUE_SUMMARY)
    .whereRaw("summary_date >= ? AND summary_date <= ?", [startDateStr, endDateStr])
    .select(
      db.raw("COALESCE(SUM(dashboard_orders_count), 0)::int as count"),
      db.raw("COALESCE(SUM(earned_revenue), 0)::numeric as total_revenue"),
      db.raw("COALESCE(SUM(total_shop_cost), 0)::numeric as total_cost")
    )
    .first();

  // Chi phí nhập ngoài luồng (chỉ tính tài khoản Shop) & chi phí phát sinh tháng trong khoảng thời gian
  const expenseStats = await db(TABLES.STORE_PROFIT_EXPENSES)
    .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
    .whereRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date >= ? AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_date <= ?`, [startDateStr, endDateStr])
    .where(`${TABLES.STORE_PROFIT_EXPENSES}.status`, "completed")
    .select(
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') AND ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_external_import`),
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('monthly_expense', 'withdraw_profit') THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_monthly_expense`),
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR ${TABLES.STORE_PROFIT_EXPENSES}.expense_type NOT IN ('external_import', 'mavn_import') THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_all_expenses`)
    )
    .first();

  const totalExternalImport = toNumber(expenseStats?.total_external_import || 0);
  const totalMonthlyExpense = toNumber(expenseStats?.total_monthly_expense || 0);
  const totalOperationalExpenses = totalExternalImport + totalMonthlyExpense;

  const shopOrdersCount = Number(summaryStats?.count || 0);
  const shopRevenue = toNumber(summaryStats?.total_revenue || 0);
  const shopCogs = toNumber(summaryStats?.total_cost || 0);
  // Lợi nhuận gộp đã trừ chi phí nhập ngoài luồng của Shop và chi phí biến đổi:
  const shopGrossProfit = shopRevenue - shopCogs - totalOperationalExpenses;

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
        db.raw("COALESCE(total_shop_cost, 0)::numeric as daily_cost")
      ),
    db(TABLES.STORE_PROFIT_EXPENSES)
      .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
      .whereRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date >= ? AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_date <= ?`, [startDateStr, endDateStr])
      .where(`${TABLES.STORE_PROFIT_EXPENSES}.status`, "completed")
      .select(
        db.raw(`TO_CHAR(${TABLES.STORE_PROFIT_EXPENSES}.expense_date, 'YYYY-MM-DD') as day_str`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') AND ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_external_import`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('monthly_expense', 'withdraw_profit') THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_monthly_expense`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR ${TABLES.STORE_PROFIT_EXPENSES}.expense_type NOT IN ('external_import', 'mavn_import') THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_total_expense`)
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
    const exp = dailyExpenseMap.get(r.day_str) || { externalImport: 0, monthlyExpense: 0, totalExpense: 0 };
    dailyMap.set(r.day_str, {
      count: Number(r.count || 0),
      revenue: rev,
      cost: cost + exp.totalExpense,
      externalImport: exp.externalImport,
      monthlyExpense: exp.monthlyExpense,
      profit: rev - cost - exp.totalExpense,
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

  const personalBankAssets = personalBankRows.map((r) => ({
    id: 1000000 + Number(r.id),
    name: `${r.bank_display_name || "Ngân hàng"} (${r.account_number}) - ${r.label || "Tài khoản cá nhân"}`,
    type: "CASH_BANK",
    amount: toNumber(r.balance),
    note: r.account_holder ? `Chủ TK: ${r.account_holder}` : "",
    accountNumber: r.account_number || "",
    accountHolder: r.account_holder || "",
    bankDisplayName: r.bank_display_name || "",
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
  }));

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
  const netWorthBase = grandTotalAssets - totalLiabilities;
  const monthlyObligations = monthlyDebtBurden + unpaidFixedCostsTotal;
  const baseNetWorth = netWorthBase;

  let cumulativeProfit = 0;
  let rollingBalance = 0; // Số dư nợ gối đầu: âm nghĩa là nợ đọng, dương nghĩa là thặng dư
  let breakEvenDay = null; // Ngày đầu tiên vượt qua mốc hòa vốn tổng của tháng
  let firstDebtFreeDay = null; // Ngày đầu tiên rollingBalance >= 0

  const chartData = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${currentMonthStr}-${String(d).padStart(2, "0")}`;
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
  const isCurrentMonth = todayVNStr.startsWith(currentMonthStr);
  const currentRollingBalance = isCurrentMonth
    ? (todayPoint?.rollingBalance ?? 0)
    : (chartData[chartData.length - 1]?.rollingBalance ?? 0);

  const dailyBreakEven = {
    dailyBurden,
    daysInMonth,
    breakEvenDay,
    firstDebtFreeDay,
    currentDay: isCurrentMonth ? Number(todayVNStr.split("-")[2]) : null,
    currentRollingBalance,
    carriedDebtIntoToday: todayPoint?.previousDebt ?? 0,
    requiredForToday: todayPoint?.todayRequired ?? dailyBurden,
    todayProfit: todayPoint?.todayProfit ?? 0,
    chartData,
  };

  // 6. Tài sản ròng chuẩn mực kế toán (Balance Sheet Net Worth):
  // Tài sản ròng = Tổng tài sản thực có - Tổng nghĩa vụ nợ (triệt tiêu double-counting lợi nhuận theo chỉ thị Master)
  const netWorth = grandTotalAssets - totalLiabilities;

  return {
    month: currentMonthStr,
    breakEven: {
      initialDeficit,
      breakEvenTarget,
      shopGrossProfit,
      shopRevenue,
      shopCogs,
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
      totalAssets: grandTotalAssets,
      totalLiabilities,
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
  };
}

// --- CRUD FIXED COSTS ---
const publishFixedCostMutation = (action, id, name) => {
  eventBus.emit(EVENTS.FINANCE_FIXED_COST_MUTATED, { action, id, name });
  recordEvent({
    eventName: EVENTS.FINANCE_FIXED_COST_MUTATED,
    aggregateType: "FIXED_COST",
    aggregateId: id,
    payload: { action, id, name },
  }).catch((err) => console.error("[FinanceHub] Unable to record fixed cost event:", err.message));
};

async function createFixedCost(payload) {
  const [created] = await db(TABLES.FIXED_COSTS)
    .insert({
      name: payload.name,
      amount: toNumber(payload.amount),
      category: payload.category || "LIVING",
      is_active: payload.isActive !== false,
      note: payload.note || "",
    })
    .returning("*");

  publishFixedCostMutation("CREATE", Number(created.id), created.name);

  return {
    id: Number(created.id),
    name: created.name,
    amount: toNumber(created.amount),
    category: created.category,
    isActive: Boolean(created.is_active),
    note: created.note || "",
  };
}

async function updateFixedCost(id, payload) {
  const updateData = { updated_at: db.fn.now() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.amount !== undefined) updateData.amount = toNumber(payload.amount);
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);
  if (payload.note !== undefined) updateData.note = payload.note;


  const [updated] = await db(TABLES.FIXED_COSTS)
    .where("id", id)
    .update(updateData)
    .returning("*");

  if (!updated) return null;

  publishFixedCostMutation("UPDATE", Number(updated.id), updated.name);

  return {
    id: Number(updated.id),
    name: updated.name,
    amount: toNumber(updated.amount),
    category: updated.category,
    isActive: Boolean(updated.is_active),
    note: updated.note || "",
  };
}

async function deleteFixedCost(id) {
  const res = await db(TABLES.FIXED_COSTS).where("id", id).del();
  if (res > 0) publishFixedCostMutation("DELETE", Number(id));
  return res;
}

async function payFixedCost(id, payload = {}) {
  const { periodMonth, receiptId, financialAccountId, amount, note } = payload;
  return await withTransaction(async (trx) => {
    const fixedCost = await trx(TABLES.FIXED_COSTS).where("id", id).first();
    if (!fixedCost) throw new Error("Không tìm thấy chi phí cố định");

    const now = new Date();
    const targetMonth = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const numAmount = toNumber(amount) || toNumber(fixedCost.amount);

    const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "FIXED_COST", target_id: id, period_month: targetMonth })
      .first();

    if (existingLog) {
      throw new Error(`Khoản chi phí cố định "${fixedCost.name}" tháng ${targetMonth} đã được thanh toán trước đó!`);
    }

    if (receiptId) {
      await allocateReceiptInTrx(
        trx,
        receiptId,
        numAmount,
        "FIXED_COST",
        `FIXED_COST_${id}`,
        note || `Thanh toán chi phí cố định "${fixedCost.name}" tháng ${targetMonth}`
      );
    } else if (financialAccountId) {
      await debitFinancialAccount(trx, {
        accountId: Number(financialAccountId),
        amount: numAmount,
        sourceKind: "fixed_cost_payment",
        sourceId: `${id}_${targetMonth}`,
        note: note || `Thanh toán chi phí cố định "${fixedCost.name}" tháng ${targetMonth}`,
      });
    }

    const [createdLog] = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .insert({
        target_type: "FIXED_COST",
        target_id: id,
        period_month: targetMonth,
        financial_account_id: financialAccountId ? Number(financialAccountId) : null,
        amount: numAmount,
        payment_date: new Date().toISOString().slice(0, 10),
        note: note || `Thanh toán chi phí cố định tháng ${targetMonth}`,
      })
      .returning("*");

    publishFixedCostMutation("PAY", Number(id), fixedCost.name);

    return { success: true, logId: Number(createdLog.id), periodMonth: targetMonth };
  });
}

async function cancelFixedCostPayment(id, payload = {}) {
  const { periodMonth } = payload;
  return await withTransaction(async (trx) => {
    const now = new Date();
    const targetMonth = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "FIXED_COST", target_id: id, period_month: targetMonth })
      .first();

    if (!existingLog) {
      throw new Error(`Không tìm thấy giao dịch thanh toán tháng ${targetMonth} của khoản chi phí này`);
    }

    if (existingLog.financial_account_id) {
      const { creditFinancialAccount } = require("@/domains/wallets/services/walletService");
      await creditFinancialAccount(trx, {
        accountId: Number(existingLog.financial_account_id),
        amount: Number(existingLog.amount),
        sourceKind: "fixed_cost_payment_reversal",
        sourceId: `${id}_${targetMonth}`,
        note: `Hoàn tiền hủy thanh toán chi phí cố định tháng ${targetMonth}`,
      });
    }

    await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ id: existingLog.id })
      .del();

    publishFixedCostMutation("UNPAY", Number(id));

    return { success: true };
  });
}

async function getFixedCosts(month) {
  const targetMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const rows = await db(TABLES.FIXED_COSTS).select("*").orderBy("id", "asc");
  const logs = await db(TABLES.DEBT_PAYMENT_LOGS)
    .where("target_type", "FIXED_COST")
    .where("period_month", targetMonth);
  const logMap = new Map();
  logs.forEach((l) => logMap.set(Number(l.target_id), l));

  return rows.map((r) => {
    const paidLog = logMap.get(Number(r.id));
    return {
      id: Number(r.id),
      name: r.name,
      amount: toNumber(r.amount),
      category: r.category || "LIVING",
      isActive: Boolean(r.is_active),
      note: r.note || "",
      isPaidThisMonth: Boolean(paidLog),
      paidDate: paidLog?.payment_date ? new Date(paidLog.payment_date).toISOString().slice(0, 10) : null,
      paidAmount: paidLog ? toNumber(paidLog.amount) : 0,
      paidLogId: paidLog ? Number(paidLog.id) : null,
    };
  });
}

// --- CRUD INSTALLMENTS ---
async function createInstallment(payload) {
  const [created] = await db(TABLES.INSTALLMENTS)
    .insert({
      name: payload.name,
      monthly_amount: toNumber(payload.monthlyAmount),
      total_periods: Number(payload.totalPeriods || 1),
      start_period: payload.startPeriod, // 'YYYY-MM'
      due_day: Number(payload.dueDay || 15),
      status: payload.status || "ACTIVE",
      is_active: payload.isActive !== false,
      note: payload.note || "",
    })
    .returning("*");

  return {
    id: Number(created.id),
    name: created.name,
    monthlyAmount: toNumber(created.monthly_amount),
    totalPeriods: Number(created.total_periods),
    startPeriod: created.start_period,
    dueDay: Number(created.due_day),
    status: created.status,
    isActive: Boolean(created.is_active),
    note: created.note || "",
  };
}

async function updateInstallment(id, payload) {
  const updateData = { updated_at: db.fn.now() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.monthlyAmount !== undefined) updateData.monthly_amount = toNumber(payload.monthlyAmount);
  if (payload.totalPeriods !== undefined) updateData.total_periods = Number(payload.totalPeriods);
  if (payload.startPeriod !== undefined) updateData.start_period = payload.startPeriod;
  if (payload.dueDay !== undefined) updateData.due_day = Number(payload.dueDay);
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);
  if (payload.note !== undefined) updateData.note = payload.note;


  const [updated] = await db(TABLES.INSTALLMENTS)
    .where("id", id)
    .update(updateData)
    .returning("*");

  if (!updated) return null;
  return {
    id: Number(updated.id),
    name: updated.name,
    monthlyAmount: toNumber(updated.monthly_amount),
    totalPeriods: Number(updated.total_periods),
    startPeriod: updated.start_period,
    dueDay: Number(updated.due_day),
    status: updated.status,
    isActive: Boolean(updated.is_active),
    note: updated.note || "",
  };
}

async function deleteInstallment(id) {
  return await db(TABLES.INSTALLMENTS).where("id", id).del();
}

async function payInstallment(id, payload) {
  const { financialAccountId, receiptId, amount, periodMonth, note } = payload;
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền thanh toán phải lớn hơn 0");
  if (!financialAccountId && !receiptId) throw new Error("Vui lòng chọn tài khoản thanh khoản hoặc biên lai ngân hàng");
  if (!periodMonth) throw new Error("Vui lòng chỉ định kỳ tháng thanh toán (YYYY-MM)");

  return await withTransaction(async (trx) => {
    const installment = await trx(TABLES.INSTALLMENTS).where("id", id).first();
    if (!installment) throw new Error("Không tìm thấy hợp đồng trả góp");

    const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "INSTALLMENT", target_id: id, period_month: periodMonth })
      .first();

    if (existingLog) {
      throw new Error(`Kỳ ${periodMonth} của khoản trả góp "${installment.name}" đã được thanh toán trước đó, không thể thanh toán trùng lặp!`);
    }

    if (receiptId) {
      await allocateReceiptInTrx(trx, receiptId, numAmount, "OPERATIONAL_EXPENSE", `INSTALLMENT_${id}`, note || `Thanh toán trả góp "${installment.name}" kỳ ${periodMonth}`);
    } else {
      await debitFinancialAccount(trx, {
        accountId: Number(financialAccountId),
        amount: numAmount,
        sourceKind: "installment_payment",
        sourceId: `${id}_${periodMonth}`,
        note: note || `Thanh toán trả góp "${installment.name}" kỳ ${periodMonth}`,
      });
    }

    const [createdLog] = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .insert({
        target_type: "INSTALLMENT",
        target_id: id,
        period_month: periodMonth,
        financial_account_id: financialAccountId ? Number(financialAccountId) : null,
        amount: numAmount,
        payment_date: new Date().toISOString().slice(0, 10),
        note: note || `Thanh toán kỳ ${periodMonth}`,
      })
      .returning("*");

    return { success: true, logId: Number(createdLog.id) };
  });
}

// --- CRUD PERSONAL ASSETS ---
async function createPersonalAsset(payload) {
  const type = payload.type || "SAVINGS";
  const profitConfig = normalizeProfitConfig({
    type,
    profitEnabled: Boolean(payload.profitEnabled),
    profitFrequency: payload.profitFrequency,
    annualInterestRate: payload.annualInterestRate,
    profitDestination: payload.profitDestination,
    profitAccountId: payload.profitAccountId,
    profitCreditTime: payload.profitCreditTime,
  });
  await validateProfitAccount(profitConfig);
  const debtConfig = normalizeDebtConfig({
    type,
    debtInterestEnabled: Boolean(payload.debtInterestEnabled),
    debtInterestFrequency: payload.debtInterestFrequency,
    debtAnnualInterestRate: payload.debtAnnualInterestRate,
    debtDueDay: payload.debtDueDay,
    debtEndDate: payload.debtEndDate,
    debtRepaymentFrequency: payload.debtRepaymentFrequency,
  });

  const [created] = await db(TABLES.PERSONAL_ASSETS)
    .insert({
      name: payload.name,
      type,
      amount: toNumber(payload.amount),
      note: payload.note || "",
      ...profitConfig,
      ...debtConfig,
    })
    .returning("*");

  return {
    id: Number(created.id),
    name: created.name,
    type: created.type,
    amount: toNumber(created.amount),
    note: created.note || "",
    profitEnabled: Boolean(created.profit_enabled),
    profitFrequency: created.profit_frequency || null,
    annualInterestRate: toNumber(created.annual_interest_rate),
    profitDestination: created.profit_destination || null,
    profitAccountId: created.profit_account_id ? Number(created.profit_account_id) : null,
    profitCreditTime: created.profit_credit_time || null,
    debtInterestEnabled: Boolean(created.debt_interest_enabled),
    debtInterestFrequency: created.debt_interest_frequency || null,
    debtAnnualInterestRate: toNumber(created.debt_annual_interest_rate),
    debtDueDay: created.debt_due_day ? Number(created.debt_due_day) : null,
    debtEndDate: created.debt_end_date || null,
    debtRepaymentFrequency: created.debt_repayment_frequency || null,
  };
}

async function updatePersonalAsset(id, payload) {
  const existing = await db(TABLES.PERSONAL_ASSETS).where("id", id).first();
  if (!existing) return null;

  const type = payload.type !== undefined ? payload.type : existing.type;
  const profitEnabled = payload.profitEnabled !== undefined
    ? Boolean(payload.profitEnabled)
    : Boolean(existing.profit_enabled);
  const profitConfig = normalizeProfitConfig({
    type,
    profitEnabled,
    profitFrequency: payload.profitFrequency !== undefined ? payload.profitFrequency : existing.profit_frequency,
    annualInterestRate: payload.annualInterestRate !== undefined ? payload.annualInterestRate : existing.annual_interest_rate,
    profitDestination: payload.profitDestination !== undefined ? payload.profitDestination : existing.profit_destination,
    profitAccountId: payload.profitAccountId !== undefined ? payload.profitAccountId : existing.profit_account_id,
    profitCreditTime: payload.profitCreditTime !== undefined ? payload.profitCreditTime : existing.profit_credit_time,
  });
  await validateProfitAccount(profitConfig);
  const debtConfig = normalizeDebtConfig({
    type,
    debtInterestEnabled: payload.debtInterestEnabled !== undefined ? Boolean(payload.debtInterestEnabled) : Boolean(existing.debt_interest_enabled),
    debtInterestFrequency: payload.debtInterestFrequency !== undefined ? payload.debtInterestFrequency : existing.debt_interest_frequency,
    debtAnnualInterestRate: payload.debtAnnualInterestRate !== undefined ? payload.debtAnnualInterestRate : existing.debt_annual_interest_rate,
    debtDueDay: payload.debtDueDay !== undefined ? payload.debtDueDay : existing.debt_due_day,
    debtEndDate: payload.debtEndDate !== undefined ? payload.debtEndDate : existing.debt_end_date,
    debtRepaymentFrequency: payload.debtRepaymentFrequency !== undefined ? payload.debtRepaymentFrequency : existing.debt_repayment_frequency,
  });

  const updateData = { updated_at: db.fn.now() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.type !== undefined) updateData.type = type;
  if (payload.amount !== undefined) updateData.amount = toNumber(payload.amount);
  if (payload.note !== undefined) updateData.note = payload.note;
  Object.assign(updateData, profitConfig);
  Object.assign(updateData, debtConfig);

  const [updated] = await db(TABLES.PERSONAL_ASSETS)
    .where("id", id)
    .update(updateData)
    .returning("*");

  if (!updated) return null;
  return {
    id: Number(updated.id),
    name: updated.name,
    type: updated.type,
    amount: toNumber(updated.amount),
    note: updated.note || "",
    profitEnabled: Boolean(updated.profit_enabled),
    profitFrequency: updated.profit_frequency || null,
    annualInterestRate: toNumber(updated.annual_interest_rate),
    profitDestination: updated.profit_destination || null,
    profitAccountId: updated.profit_account_id ? Number(updated.profit_account_id) : null,
    profitCreditTime: updated.profit_credit_time || null,
    debtInterestEnabled: Boolean(updated.debt_interest_enabled),
    debtInterestFrequency: updated.debt_interest_frequency || null,
    debtAnnualInterestRate: toNumber(updated.debt_annual_interest_rate),
    debtDueDay: updated.debt_due_day ? Number(updated.debt_due_day) : null,
    debtEndDate: updated.debt_end_date || null,
    debtRepaymentFrequency: updated.debt_repayment_frequency || null,
  };
}

async function deletePersonalAsset(id) {
  return await db(TABLES.PERSONAL_ASSETS).where("id", id).del();
}

async function payPersonalAsset(id, payload) {
  const { financialAccountId, receiptId, amount, note } = payload;
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền trả nợ phải lớn hơn 0");
  if (!financialAccountId && !receiptId) throw new Error("Vui lòng chọn tài khoản thanh khoản hoặc biên lai ngân hàng để trả nợ");

  return await withTransaction(async (trx) => {
    const asset = await trx(TABLES.PERSONAL_ASSETS).where("id", id).first();
    if (!asset) throw new Error("Không tìm thấy mục nợ");

    const currentAmount = toNumber(asset.amount);
    const newAmount = Math.max(0, currentAmount - numAmount);

    if (receiptId) {
      await allocateReceiptInTrx(trx, receiptId, numAmount, "OPERATIONAL_EXPENSE", `PERSONAL_DEBT_PAY_${id}`, note || `Trả bớt nợ "${asset.name}"`);
    } else {
      await debitFinancialAccount(trx, {
        accountId: Number(financialAccountId),
        amount: numAmount,
        sourceKind: "personal_debt_repayment",
        sourceId: `${id}_${Date.now()}`,
        note: note || `Trả bớt nợ "${asset.name}"`,
      });
    }

    await trx(TABLES.PERSONAL_ASSETS)
      .where("id", id)
      .update({ amount: newAmount, updated_at: trx.fn.now() });

    const [createdLog] = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .insert({
        target_type: "PERSONAL_DEBT",
        target_id: id,
        financial_account_id: financialAccountId ? Number(financialAccountId) : null,
        amount: numAmount,
        payment_date: new Date().toISOString().slice(0, 10),
        note: note || `Trả bớt nợ`,
      })
      .returning("*");

    return { success: true, newAmount, logId: Number(createdLog.id) };
  });
}

async function borrowPersonalAsset(id, payload) {
  const { financialAccountId, receiptId, amount, note } = payload;
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền vay thêm phải lớn hơn 0");

  return await withTransaction(async (trx) => {
    const asset = await trx(TABLES.PERSONAL_ASSETS).where("id", id).first();
    if (!asset) throw new Error("Không tìm thấy mục nợ");

    const currentAmount = toNumber(asset.amount);
    const newAmount = currentAmount + numAmount;

    if (receiptId) {
      await allocateReceiptInTrx(trx, receiptId, numAmount, "OTHER_INCOME", `PERSONAL_DEBT_BORROW_${id}`, note || `Vay thêm / Phát sinh nợ "${asset.name}"`);
    } else if (financialAccountId) {
      const { creditFinancialAccount } = require("@/domains/wallets/services/walletService");
      await creditFinancialAccount(trx, {
        accountId: Number(financialAccountId),
        amount: numAmount,
        sourceKind: "personal_debt_borrow",
        sourceId: `${id}_${Date.now()}`,
        note: note || `Vay thêm "${asset.name}"`,
      });
    }

    await trx(TABLES.PERSONAL_ASSETS)
      .where("id", id)
      .update({ amount: newAmount, updated_at: trx.fn.now() });

    await trx(TABLES.DEBT_PAYMENT_LOGS).insert({
      target_type: "PERSONAL_DEBT_BORROW",
      target_id: id,
      financial_account_id: financialAccountId ? Number(financialAccountId) : null,
      amount: numAmount,
      payment_date: new Date().toISOString().slice(0, 10),
      note: note || `Vay thêm / Phát sinh nợ`,
    });

    return { success: true, newAmount };
  });
}

async function allocateReceiptInTrx(trx, receiptId, allocAmount, allocType, targetCode, note) {
  const receipt = await trx(TABLES.PAYMENT_RECEIPT)
    .where({ id: Number(receiptId) })
    .forUpdate()
    .first();
  if (!receipt) throw new Error("Không tìm thấy biên lai thanh toán");
  const currentUnallocated = Number(receipt.unallocated_amount ?? receipt.amount ?? 0);
  if (allocAmount > currentUnallocated) {
    throw new Error(`Số tiền phân bổ vượt quá số dư khả dụng của biên lai (${currentUnallocated.toLocaleString("vi-VN")} ₫)`);
  }
  const newUnallocated = currentUnallocated - allocAmount;
  const newStatus = newUnallocated <= 0 ? "FULLY_ALLOCATED" : "PARTIALLY_ALLOCATED";

  await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).insert({
    receipt_id: receipt.id,
    allocation_type: allocType,
    target_code: targetCode ? String(targetCode) : null,
    amount: allocAmount,
    remaining_balance: newUnallocated,
    note: note || null,
    created_by: "ADMIN",
  });

  await trx(TABLES.PAYMENT_RECEIPT)
    .where({ id: receipt.id })
    .update({
      unallocated_amount: newUnallocated,
      status: newStatus,
    });
}

async function getUnallocatedReceipts() {
  return await db(TABLES.PAYMENT_RECEIPT)
    .where("status", "!=", "FULLY_ALLOCATED")
    .whereRaw("COALESCE(unallocated_amount, amount) > 0")
    .orderBy("id", "desc")
    .limit(50);
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
  getUnallocatedReceipts,
};

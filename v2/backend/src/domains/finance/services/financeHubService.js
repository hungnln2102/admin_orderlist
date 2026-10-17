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

function normalizeDebtConfig({ type, debtInterestEnabled, debtAnnualInterestRate, debtDueDay, debtEndDate, debtRepaymentFrequency }) {
  const isDebt = type === "DEBT_PAYABLE" || type === "DEBT_RECEIVABLE";
  if (!isDebt || !debtInterestEnabled) {
    return {
      debt_interest_enabled: false,
      debt_annual_interest_rate: null,
      debt_due_day: null,
      debt_end_date: null,
      debt_repayment_frequency: null,
    };
  }

  const annualRate = Number(debtAnnualInterestRate);
  const dueDay = Number(debtDueDay);
  const repaymentFrequency = debtRepaymentFrequency || "MONTHLY";
  const endDate = debtEndDate instanceof Date ? debtEndDate.toISOString().slice(0, 10) : String(debtEndDate || "").slice(0, 10);
  if (!Number.isFinite(annualRate) || annualRate <= 0) throw new Error("Lãi suất nợ phải lớn hơn 0");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("Ngày đến hạn phải từ 1 đến 31");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Vui lòng chọn ngày hết hạn nợ");
  if (!DEBT_REPAYMENT_FREQUENCIES.has(repaymentFrequency)) throw new Error("Chu kỳ quy đổi nợ không hợp lệ");

  return {
    debt_interest_enabled: true,
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
  if (item.type !== "DEBT_PAYABLE" || !item.debt_end_date) return 0;

  const endDate = new Date(`${String(item.debt_end_date).slice(0, 10)}T23:59:59`);
  const remainingDays = Math.max(1, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const remainingMonths = Math.max(1, Math.floor(remainingDays / 30.4375) || 1);
  const annualRate = Boolean(item.debt_interest_enabled) ? toNumber(item.debt_annual_interest_rate) : 0;
  const estimatedTotal = toNumber(item.amount) + (toNumber(item.amount) * annualRate / 100 * remainingDays / 365);
  const dailyPayment = Math.ceil(estimatedTotal / remainingDays);
  // Nguyên tắc an toàn: Thà dôi dư chứ không để thiếu hụt nợ khi tới hạn
  return Math.max(Math.ceil(dailyPayment * 30.44), Math.ceil(estimatedTotal / remainingMonths));
}

/**
 * Tổng hợp toàn bộ bức tranh tài chính tháng (Break-even + Net worth + Cashflow)
 */
async function getFinanceSummary(targetMonth) {
  const now = new Date();
  const currentMonthStr = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 1. Chi phí cố định (Fixed costs)
  const fixedCostRows = await db(TABLES.FIXED_COSTS)
    .select("*")
    .orderBy("id", "asc");

  const fixedCosts = fixedCostRows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    amount: toNumber(r.amount),
    category: r.category || "LIVING",
    isActive: Boolean(r.is_active),
    note: r.note || "",
    createdAt: r.created_at,
  }));

  const activeFixedCostsTotal = fixedCosts
    .filter((f) => f.isActive)
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

  // 3. Doanh thu & Lợi nhuận gộp từ đơn hàng Shop trong tháng
  const [y, m] = currentMonthStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const startIso = `${currentMonthStr}-01 00:00:00+07`;
  const endIso = `${currentMonthStr}-${String(lastDay).padStart(2, "0")} 23:59:59+07`;

  const orderStats = await db(TABLES.ORDER_LIST)
    .whereRaw("created_at >= ? AND created_at <= ?", [startIso, endIso])
    .where("status", "PAID")
    .whereNot("id_order", "ilike", "MAVN%") // Chỉ tính đơn bán hàng cho khách
    .select(
      db.raw("COUNT(*)::int as count"),
      db.raw("COALESCE(SUM(price), 0)::numeric as total_revenue"),
      db.raw("COALESCE(SUM(cost), 0)::numeric as total_cost")
    )
    .first();

  const shopOrdersCount = Number(orderStats?.count || 0);
  const shopRevenue = toNumber(orderStats?.total_revenue || 0);
  const shopCogs = toNumber(orderStats?.total_cost || 0);
  const shopGrossProfit = shopRevenue - shopCogs;

  // 4. Động cơ Điểm Hòa Vốn (Break-even Engine)
  const breakEvenTarget = activeFixedCostsTotal + monthlyDebtBurden;
  const initialDeficit = -breakEvenTarget; // Lợi nhuận khởi điểm âm đầu tháng
  const netProfit = shopGrossProfit - breakEvenTarget; // Lợi nhuận ròng thực tế

  const breakEvenPercent = breakEvenTarget > 0
    ? Math.min(100, Math.round((shopGrossProfit / breakEvenTarget) * 100))
    : 100;
  const remainingToBreakEven = Math.max(0, breakEvenTarget - shopGrossProfit);

  // 5. Động cơ Nợ Gối Đầu Theo Ngày & Đường Cong Hòa Vốn (Daily Rolling Deficit & Break-Even Curve)
  const daysInMonth = lastDay;
  const dailyBurden = daysInMonth > 0 ? Math.round(breakEvenTarget / daysInMonth) : 0;

  const dailyRows = await db(TABLES.ORDER_LIST)
    .whereRaw("created_at >= ? AND created_at <= ?", [startIso, endIso])
    .where("status", "PAID")
    .whereNot("id_order", "ilike", "MAVN%")
    .select(
      db.raw("TO_CHAR(created_at, 'YYYY-MM-DD') as day_str"),
      db.raw("COUNT(*)::int as count"),
      db.raw("COALESCE(SUM(price), 0)::numeric as daily_revenue"),
      db.raw("COALESCE(SUM(cost), 0)::numeric as daily_cost")
    )
    .groupBy(db.raw("TO_CHAR(created_at, 'YYYY-MM-DD')"));

  const dailyMap = new Map();
  dailyRows.forEach((r) => {
    const rev = toNumber(r.daily_revenue);
    const cost = toNumber(r.daily_cost);
    dailyMap.set(r.day_str, {
      count: Number(r.count || 0),
      revenue: rev,
      cost: cost,
      profit: rev - cost,
    });
  });

  const todayVNStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  let cumulativeProfit = 0;
  let rollingBalance = 0; // Số dư nợ gối đầu: âm nghĩa là nợ đọng, dương nghĩa là thặng dư
  let breakEvenDay = null; // Ngày đầu tiên vượt qua mốc hòa vốn tổng của tháng
  let firstDebtFreeDay = null; // Ngày đầu tiên rollingBalance >= 0

  const chartData = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${currentMonthStr}-${String(d).padStart(2, "0")}`;
    const dayData = dailyMap.get(dayStr) || { count: 0, revenue: 0, cost: 0, profit: 0 };
    const todayProfit = dayData.profit;
    const isFuture = dayStr > todayVNStr;

    // Nợ gối đầu từ hôm trước mang sang: nếu rollingBalance hôm trước < 0 thì đó là nợ tồn đọng
    const previousDebt = rollingBalance < 0 ? Math.abs(rollingBalance) : 0;
    // Số tiền hôm nay cần kiếm để xóa sạch nợ gối đầu và bù đủ định mức ngày hôm nay:
    const todayRequired = Math.max(0, dailyBurden + (rollingBalance < 0 ? Math.abs(rollingBalance) : -rollingBalance));

    cumulativeProfit += todayProfit;
    // Cập nhật rolling balance: nhận lãi hôm nay trừ đi định mức ngày hôm nay
    rollingBalance += (todayProfit - dailyBurden);

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

  // 6. Tài sản & Nợ (Net Worth Engine)
  const personalAssetRows = await db(TABLES.PERSONAL_ASSETS)
    .select("*")
    .orderBy("id", "asc");

  const personalAssets = personalAssetRows.map((r) => ({
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
  }));

  // Phân loại tài sản
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

  // Số dư tài khoản Shop Bank & ví USDT
  const shopWallets = await db(TABLES.FINANCIAL_ACCOUNTS)
    .where("is_deleted", false)
    .where("is_active", true)
    .select(db.raw("COALESCE(SUM(balance), 0)::numeric as total_balance"))
    .first();
  const shopBalanceTotal = toNumber(shopWallets?.total_balance || 0);

  // Nợ Nhà Cung Cấp chưa trả từ partner.supplier_order_cost_log
  const supplierDebtLog = await db(TABLES.SUPPLIER_ORDER_COST_LOG)
    .where("ncc_payment_status", "Chưa Thanh Toán")
    .select(db.raw("COALESCE(SUM(import_cost), 0)::numeric as total_debt"))
    .first();
  const supplierDebtTotal = toNumber(supplierDebtLog?.total_debt || 0);

  // Tổng hợp Tài sản ròng (Không tính Nợ NCC vào Hub này vì giá vốn đã được trừ khi tính Lãi gộp đơn hàng)
  const totalAssets =
    shopBalanceTotal +
    personalSavingsTotal +
    personalCashBankTotal +
    personalInvestmentsTotal +
    personalDebtReceivableTotal;

  const totalLiabilities =
    personalDebtPayableTotal +
    totalInstallmentsRemainingDebt;

  const netWorth = totalAssets - totalLiabilities;

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
      activeFixedCostsTotal,
      installmentsInMonthTotal,
      scheduledInstallmentsMonthlyTotal,
      personalDebtMonthlyTotal,
      monthlyDebtBurden,
    },
    dailyBreakEven,
    netWorth: {
      netWorth,
      totalAssets,
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
      },
    },
    fixedCosts,
    installments,
    personalAssets,
  };
}

// --- CRUD FIXED COSTS ---
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
  return await db(TABLES.FIXED_COSTS).where("id", id).del();
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
  const receipt = await trx(TABLES.PAYMENT_RECEIPT).where({ id: Number(receiptId) }).first();
  if (!receipt) throw new Error("Không tìm thấy biên lai thanh toán");
  const currentUnallocated = Number(receipt.unallocated_amount !== undefined ? receipt.unallocated_amount : receipt.amount);
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

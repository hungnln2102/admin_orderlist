/**
 * financeHubService.js
 * Quản lý tính toán tài chính toàn diện:
 * 1. Chi phí cố định (Fixed costs)
 * 2. Trả góp theo kỳ (Installments with auto-expiration)
 * 3. Điểm hòa vốn & Lợi nhuận ròng khởi đầu âm (Break-even Engine)
 * 4. Tài sản ròng & Nợ cá nhân + Nợ NCC (Net Worth Engine)
 */

const { db, TABLES } = require("@/db");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

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
    // Đang trong kỳ trả góp
    const remainingPeriods = totalPeriods - currentPeriod;
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
  const breakEvenTarget = activeFixedCostsTotal + installmentsInMonthTotal;
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

  // Tổng hợp Tài sản ròng
  const totalAssets =
    shopBalanceTotal +
    personalSavingsTotal +
    personalCashBankTotal +
    personalInvestmentsTotal +
    personalDebtReceivableTotal;

  const totalLiabilities =
    supplierDebtTotal +
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

// --- CRUD PERSONAL ASSETS ---
async function createPersonalAsset(payload) {
  const [created] = await db(TABLES.PERSONAL_ASSETS)
    .insert({
      name: payload.name,
      type: payload.type || "SAVINGS",
      amount: toNumber(payload.amount),
      note: payload.note || "",
    })
    .returning("*");

  return {
    id: Number(created.id),
    name: created.name,
    type: created.type,
    amount: toNumber(created.amount),
    note: created.note || "",
  };
}

async function updatePersonalAsset(id, payload) {
  const updateData = { updated_at: db.fn.now() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.type !== undefined) updateData.type = payload.type;
  if (payload.amount !== undefined) updateData.amount = toNumber(payload.amount);
  if (payload.note !== undefined) updateData.note = payload.note;

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
  };
}

async function deletePersonalAsset(id) {
  return await db(TABLES.PERSONAL_ASSETS).where("id", id).del();
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
  createPersonalAsset,
  updatePersonalAsset,
  deletePersonalAsset,
};

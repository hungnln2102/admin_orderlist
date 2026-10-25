const { db, TABLES } = require("@/db");

/**
 * Trả về dải thời gian và thông số bộ lọc
 */
function parseDateRange({ period = "month", month, year, startDate, endDate }) {
  const now = new Date();

  let start = new Date();
  let end = new Date();
  let prevStart = new Date();
  let prevEnd = new Date();
  let bucketMode = "day"; // 'day'
  let targetYear = now.getFullYear();
  let targetMonthStr = String(now.getMonth() + 1).padStart(2, "0");

  if (period === "week") {
    bucketMode = "day";
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    start = new Date(end);
    start.setDate(start.getDate() - 6); // 7 days including today
    start.setHours(0, 0, 0, 0);

    const diffMs = end.getTime() - start.getTime() + 1;
    prevStart = new Date(start.getTime() - diffMs);
    prevEnd = new Date(start.getTime() - 1);
  } else if (period === "year") {
    bucketMode = "day"; // View by day like Binance 1Y view
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    start = new Date(end);
    start.setFullYear(start.getFullYear() - 1); // 1 year ago up to today
    start.setHours(0, 0, 0, 0);

    const diffMs = end.getTime() - start.getTime() + 1;
    prevStart = new Date(start.getTime() - diffMs);
    prevEnd = new Date(start.getTime() - 1);
  } else if (period === "custom" && startDate && endDate) {
    start = new Date(`${startDate}T00:00:00.000Z`);
    end = new Date(`${endDate}T23:59:59.999Z`);

    const diffMs = end.getTime() - start.getTime();
    bucketMode = "day";

    prevStart = new Date(start.getTime() - diffMs);
    prevEnd = new Date(end.getTime() - diffMs);
  } else {
    // Default 'month'
    bucketMode = "day";
    if (month && month.includes("-")) {
      const parts = month.split("-");
      targetYear = parseInt(parts[0], 10);
      targetMonthStr = parts[1].padStart(2, "0");
    }

    const mIdx = parseInt(targetMonthStr, 10) - 1;
    start = new Date(Date.UTC(targetYear, mIdx, 1, 0, 0, 0));
    end = new Date(Date.UTC(targetYear, mIdx + 1, 0, 23, 59, 59, 999));

    prevStart = new Date(Date.UTC(targetYear, mIdx - 1, 1, 0, 0, 0));
    prevEnd = new Date(Date.UTC(targetYear, mIdx, 0, 23, 59, 59, 999));
  }

  return { start, end, prevStart, prevEnd, bucketMode, targetYear, period };
}

/**
 * Thống kê từ bảng tổng hợp daily_revenue_summary theo dải ngày
 */
async function getOrderStatsForRange(start, end) {
  const startDateStr = start.toISOString().slice(0, 10);
  const endDateStr = end.toISOString().slice(0, 10);

  const rawStats = await db(TABLES.DAILY_REVENUE_SUMMARY)
    .whereBetween("summary_date", [startDateStr, endDateStr])
    .select(
      db.raw("COALESCE(SUM(dashboard_orders_count), 0)::integer as total_orders"),
      db.raw("COALESCE(SUM(dashboard_canceled_count), 0)::integer as canceled_orders"),
      db.raw("COALESCE(SUM(earned_revenue), 0)::numeric as total_revenue"),
      db.raw("COALESCE(SUM(total_shop_cost), 0)::numeric as total_cost"),
      db.raw("COALESCE(SUM(revenue_reversed), 0)::numeric as total_refund"),
      db.raw("COALESCE(SUM(earned_revenue - total_shop_cost - revenue_reversed), 0)::numeric as total_profit")
    )
    .first();

  const totalOrders = parseInt(rawStats?.total_orders || 0, 10);
  const canceledOrders = parseInt(rawStats?.canceled_orders || 0, 10);
  const totalRevenue = parseFloat(rawStats?.total_revenue || 0);
  const totalCost = parseFloat(rawStats?.total_cost || 0);
  const totalRefund = parseFloat(rawStats?.total_refund || 0);
  const totalProfit = parseFloat(rawStats?.total_profit || 0);

  return { totalOrders, canceledOrders, totalRevenue, totalCost, totalRefund, totalProfit };
}

function getMonthKeysInRange(start, end) {
  const keys = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor <= lastMonth) {
    keys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return keys;
}

function isInstallmentActiveInMonth(item, monthKey) {
  if (!item.is_active || item.status === "COMPLETED") return false;

  const [startYear, startMonth] = String(item.start_period).split("-").map(Number);
  const [targetYear, targetMonth] = monthKey.split("-").map(Number);
  const monthDiff = (targetYear - startYear) * 12 + targetMonth - startMonth;
  return monthDiff >= 0 && monthDiff < Number(item.total_periods || 0);
}

async function getExpensesForRange(start, end) {
  const startDateStr = start.toISOString().slice(0, 10);
  const endDateStr = end.toISOString().slice(0, 10);

  const row = await db(TABLES.STORE_PROFIT_EXPENSES)
    .whereRaw("expense_date >= ? AND expense_date <= ?", [startDateStr, endDateStr])
    .where("status", "completed")
    .select(
      db.raw("COALESCE(SUM(amount), 0)::numeric as total_expenses"),
      db.raw("COALESCE(SUM(CASE WHEN expense_type IN ('external_import', 'mavn_import') THEN amount ELSE 0 END), 0)::numeric as total_external_import"),
      db.raw("COALESCE(SUM(CASE WHEN expense_type IN ('monthly_expense', 'withdraw_profit') THEN amount ELSE 0 END), 0)::numeric as total_monthly_expense")
    )
    .first();

  return {
    totalExpenses: parseFloat(row?.total_expenses || 0),
    totalExternalImport: parseFloat(row?.total_external_import || 0),
    totalMonthlyExpense: parseFloat(row?.total_monthly_expense || 0),
  };
}

async function getFinanceCostsForRange(start, end) {
  const [fixedCostRow, installmentRows] = await Promise.all([
    db(TABLES.FIXED_COSTS)
      .where("is_active", true)
      .sum({ total: "amount" })
      .first(),
    db(TABLES.INSTALLMENTS)
      .select("monthly_amount", "total_periods", "start_period", "status", "is_active"),
  ]);

  const monthlyFixedCosts = Number(fixedCostRow?.total || 0);
  return getMonthKeysInRange(start, end).reduce((total, monthKey) => {
    const monthlyInstallments = installmentRows
      .filter((item) => isInstallmentActiveInMonth(item, monthKey))
      .reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0);
    return total + monthlyFixedCosts + monthlyInstallments;
  }, 0);
}

/**
 * Tính toán báo cáo tổng quan Dashboard (Trích xuất từ bảng chuẩn daily_revenue_summary)
 */
async function getDashboardSummary(params = {}) {
  const { start, end, prevStart, prevEnd, bucketMode, targetYear, period } = parseDateRange(params);

  // 1. Thống kê kỳ hiện tại & kỳ so sánh trực tiếp từ daily_revenue_summary & store_profit_expenses
  const currentStats = await getOrderStatsForRange(start, end);
  const prevStats = await getOrderStatsForRange(prevStart, prevEnd);
  const currentExpenses = await getExpensesForRange(start, end);
  const previousExpenses = await getExpensesForRange(prevStart, prevEnd);
  const currentFinanceCosts = await getFinanceCostsForRange(start, end);
  const previousFinanceCosts = await getFinanceCostsForRange(prevStart, prevEnd);

  const { totalOrders, canceledOrders, totalRevenue, totalCost: baseCost, totalRefund, totalProfit: rawGrossProfit } = currentStats;
  const { totalOrders: prevOrders, canceledOrders: prevCanceled, totalRevenue: prevRevenue, totalCost: prevBaseCost, totalRefund: prevRefund, totalProfit: prevRawGrossProfit } = prevStats;

  const totalCost = baseCost + currentExpenses.totalExpenses;
  const prevCost = prevBaseCost + previousExpenses.totalExpenses;
  const grossProfit = rawGrossProfit - currentExpenses.totalExpenses;
  const previousGrossProfit = prevRawGrossProfit - previousExpenses.totalExpenses;

  const totalProfit = grossProfit - currentFinanceCosts;
  const previousProfit = previousGrossProfit - previousFinanceCosts;

  // Tính phần trăm tăng trưởng
  const ordersGrowth = prevOrders > 0 ? (((totalOrders - prevOrders) / prevOrders) * 100).toFixed(1) : totalOrders > 0 ? "100" : "0";
  const canceledGrowth = prevCanceled > 0 ? (((canceledOrders - prevCanceled) / prevCanceled) * 100).toFixed(1) : canceledOrders > 0 ? "100" : "0";
  const revenueGrowth = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : totalRevenue > 0 ? "100" : "0";
  const profitGrowth = previousProfit !== 0 ? (((totalProfit - previousProfit) / Math.abs(previousProfit)) * 100).toFixed(1) : totalProfit !== 0 ? "100" : "0";
  const costGrowth = prevCost > 0 ? (((totalCost - prevCost) / prevCost) * 100).toFixed(1) : totalCost > 0 ? "100" : "0";
  const refundGrowth = prevRefund > 0 ? (((totalRefund - prevRefund) / prevRefund) * 100).toFixed(1) : totalRefund > 0 ? "100" : "0";

  // 2. Lấy dữ liệu biểu đồ linh hoạt theo bucketMode ('hour' | 'day' | 'month')
  const chartData = [];
  let chartSubtitle = "Xu hướng biến động";

  if (bucketMode === "hour") {
    // Với mốc xem trong ngày (24 giờ), phân rã chi tiết theo khung giờ từ order_list để đảm bảo realtime
    chartSubtitle = "Xu hướng biến động theo 24 giờ";
    const hourRows = await db(TABLES.ORDER_LIST)
      .whereBetween("order_date", [start.toISOString(), end.toISOString()])
      .select(
        db.raw("EXTRACT(HOUR FROM order_date::timestamp)::integer as bucket"),
        db.raw("COUNT(*)::integer as orders"),
        db.raw("COUNT(*) FILTER (WHERE status = 'CANCELED')::integer as canceled"),
        db.raw("COALESCE(SUM(CASE WHEN status != 'CANCELED' THEN price ELSE 0 END), 0)::numeric as revenue"),
        db.raw("COALESCE(SUM(CASE WHEN status != 'CANCELED' THEN cost ELSE 0 END), 0)::numeric as cost"),
        db.raw("COALESCE(SUM(refund), 0)::numeric as refund")
      )
      .groupBy("bucket")
      .orderBy("bucket", "asc");

    const hourMap = new Map();
    hourRows.forEach((r) => {
      const rev = parseFloat(r.revenue || 0);
      const cst = parseFloat(r.cost || 0);
      const ref = parseFloat(r.refund || 0);
      hourMap.set(r.bucket, {
        orders: parseInt(r.orders || 0, 10),
        canceled: parseInt(r.canceled || 0, 10),
        revenue: rev,
        cost: cst,
        profit: rev - cst - ref,
      });
    });

    const targetDayStr = start.toISOString().slice(0, 10);
    const [tY, tM, tD] = targetDayStr.split("-");
    const formattedDay = `${tD}/${tM}/${tY}`;

    // 12 mốc giờ (mỗi mốc gộp 2 giờ: 0h-1h, 2h-3h, ..., 22h-23h) -> Đúng 12 điểm
    for (let h = 0; h < 24; h += 2) {
      const d1 = hourMap.get(h) || { orders: 0, canceled: 0, revenue: 0, cost: 0, profit: 0 };
      const d2 = hourMap.get(h + 1) || { orders: 0, canceled: 0, revenue: 0, cost: 0, profit: 0 };
      chartData.push({
        label: `${h}h`,
        fullDate: `${String(h).padStart(2, "0")}h00 - ${String(h + 1).padStart(2, "0")}h59 (${formattedDay})`,
        dateKey: `${targetDayStr}T${String(h).padStart(2, "0")}:00:00`,
        orders: d1.orders + d2.orders,
        canceled: d1.canceled + d2.canceled,
        revenue: d1.revenue + d2.revenue,
        cost: d1.cost + d2.cost,
        profit: d1.profit + d2.profit,
      });
    }
  } else if (bucketMode === "day") {
    chartSubtitle = period === "month" ? "Xu hướng biến động từng ngày trong tháng" : "Xu hướng biến động theo ngày";
    const startDateStr = start.toISOString().slice(0, 10);
    const endDateStr = end.toISOString().slice(0, 10);

    const [dayRows, dayExpenseRows] = await Promise.all([
      db(TABLES.DAILY_REVENUE_SUMMARY)
        .whereBetween("summary_date", [startDateStr, endDateStr])
        .select(
          db.raw("TO_CHAR(summary_date, 'YYYY-MM-DD') as day_key"),
          db.raw("COALESCE(dashboard_orders_count, 0)::integer as orders"),
          db.raw("COALESCE(dashboard_canceled_count, 0)::integer as canceled"),
          db.raw("COALESCE(earned_revenue, 0)::numeric as revenue"),
          db.raw("COALESCE(total_shop_cost, 0)::numeric as cost"),
          db.raw("COALESCE(revenue_reversed, 0)::numeric as refund"),
          db.raw("COALESCE(earned_revenue - total_shop_cost - revenue_reversed, 0)::numeric as profit")
        )
        .orderBy("summary_date", "asc"),
      db(TABLES.STORE_PROFIT_EXPENSES)
        .whereBetween("expense_date", [startDateStr, endDateStr])
        .where("status", "completed")
        .select(
          db.raw("TO_CHAR(expense_date, 'YYYY-MM-DD') as day_key"),
          db.raw("COALESCE(SUM(amount), 0)::numeric as expense_total")
        )
        .groupBy("expense_date"),
    ]);

    const dayExpenseMap = new Map();
    dayExpenseRows.forEach((r) => {
      dayExpenseMap.set(r.day_key, parseFloat(r.expense_total || 0));
    });

    const dayMap = new Map();
    dayRows.forEach((r) => {
      const exp = dayExpenseMap.get(r.day_key) || 0;
      dayMap.set(r.day_key, {
        orders: parseInt(r.orders || 0, 10),
        canceled: parseInt(r.canceled || 0, 10),
        revenue: parseFloat(r.revenue || 0),
        cost: parseFloat(r.cost || 0) + exp,
        refund: parseFloat(r.refund || 0),
        profit: parseFloat(r.profit || 0) - exp,
      });
    });

    const daysList = [];
    const curr = new Date(start);
    curr.setUTCHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setUTCHours(23, 59, 59, 999);

    const isSameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
    const isMultiYear = start.getUTCFullYear() !== end.getUTCFullYear();

    while (curr <= endNorm) {
      const dayKey = curr.toISOString().slice(0, 10);
      const dayNum = String(curr.getUTCDate()).padStart(2, "0");
      const monthNum = String(curr.getUTCMonth() + 1).padStart(2, "0");
      const yearNum = String(curr.getUTCFullYear());
      const fullDate = `${dayNum}/${monthNum}/${yearNum}`;

      let label = dayNum;
      if (period === "month" || isSameMonth) {
        label = dayNum;
      } else if (isMultiYear) {
        label = `${dayNum}/${monthNum}/${yearNum.slice(2)}`;
      } else {
        label = `${dayNum}/${monthNum}`;
      }

      const exp = dayExpenseMap.get(dayKey) || 0;
      const d = dayMap.get(dayKey) || { orders: 0, canceled: 0, revenue: 0, cost: exp, refund: 0, profit: -exp };
      daysList.push({
        label,
        fullDate,
        dateKey: dayKey,
        dayNum,
        ...d,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Trả về đầy đủ tất cả các ngày trong kỳ
    daysList.forEach((item) => {
      chartData.push({
        label: item.label,
        fullDate: item.fullDate,
        dateKey: item.dateKey,
        orders: item.orders,
        canceled: item.canceled,
        revenue: item.revenue,
        cost: item.cost,
        profit: item.profit,
      });
    });
  } else {
    chartSubtitle = "Xu hướng biến động 12 Tháng";
    const yearStartStr = `${targetYear}-01-01`;
    const yearEndStr = `${targetYear}-12-31`;

    const monthlyRows = await db(TABLES.DAILY_REVENUE_SUMMARY)
      .whereBetween("summary_date", [yearStartStr, yearEndStr])
      .select(
        db.raw("EXTRACT(MONTH FROM summary_date)::integer as month_num"),
        db.raw("COALESCE(SUM(dashboard_orders_count), 0)::integer as orders"),
        db.raw("COALESCE(SUM(dashboard_canceled_count), 0)::integer as canceled"),
        db.raw("COALESCE(SUM(earned_revenue), 0)::numeric as revenue"),
        db.raw("COALESCE(SUM(total_shop_cost), 0)::numeric as cost"),
        db.raw("COALESCE(SUM(revenue_reversed), 0)::numeric as refund"),
        db.raw("COALESCE(SUM(earned_revenue - total_shop_cost - revenue_reversed), 0)::numeric as profit")
      )
      .groupBy("month_num")
      .orderBy("month_num", "asc");

    const monthlyMap = new Map();
    monthlyRows.forEach((r) => {
      monthlyMap.set(r.month_num, {
        orders: parseInt(r.orders || 0, 10),
        canceled: parseInt(r.canceled || 0, 10),
        revenue: parseFloat(r.revenue || 0),
        cost: parseFloat(r.cost || 0),
        profit: parseFloat(r.profit || 0),
      });
    });

    for (let m = 1; m <= 12; m++) {
      const d = monthlyMap.get(m) || { orders: 0, canceled: 0, revenue: 0, cost: 0, profit: 0 };
      chartData.push({
        label: `T${m}`,
        fullDate: `Tháng ${m}/${targetYear}`,
        dateKey: `${targetYear}-${String(m).padStart(2, "0")}`,
        orders: d.orders,
        canceled: d.canceled,
        revenue: d.revenue,
        cost: d.cost,
        profit: d.profit,
      });
    }
  }

  return {
    summary: {
      totalOrders,
      canceledOrders,
      totalRevenue,
      totalCost,
      totalRefund,
      totalProfit,
      grossProfit,
      financeCosts: currentFinanceCosts,
      ordersGrowth: parseFloat(ordersGrowth),
      canceledGrowth: parseFloat(canceledGrowth),
      revenueGrowth: parseFloat(revenueGrowth),
      profitGrowth: parseFloat(profitGrowth),
      costGrowth: parseFloat(costGrowth),
      refundGrowth: parseFloat(refundGrowth),
      profitMargin: totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
    },
    chartSubtitle,
    chartData,
    dateRange: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  };
}

module.exports = {
  getDashboardSummary,
};

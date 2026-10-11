const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");

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
 * Thống kê trực tiếp từ CSDL order_list theo dải ngày order_date
 */
/**
 * Thống kê từ bảng daily_revenue_summary theo dải ngày summary_date
 */
async function getOrderStatsForRange(start, end) {
  const rawStats = await db(TABLES.DAILY_REVENUE_SUMMARY)
    .whereBetween("summary_date", [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)])
    .select(
      db.raw("COALESCE(SUM(dashboard_orders_count), 0)::integer as total_orders"),
      db.raw("COALESCE(SUM(dashboard_canceled_count), 0)::integer as canceled_orders"),
      db.raw("COALESCE(SUM(earned_revenue), 0)::numeric as total_revenue"),
      db.raw("COALESCE(SUM(total_shop_cost), 0)::numeric as total_cost"),
      db.raw("COALESCE(SUM(revenue_reversed), 0)::numeric as total_refund")
    )
    .first();

  const totalOrders = parseInt(rawStats?.total_orders || 0, 10);
  const canceledOrders = parseInt(rawStats?.canceled_orders || 0, 10);
  const totalRevenue = parseFloat(rawStats?.total_revenue || 0);
  const totalCost = parseFloat(rawStats?.total_cost || 0);
  const totalRefund = parseFloat(rawStats?.total_refund || 0);
  const totalProfit = totalRevenue - totalCost - totalRefund;

  return { totalOrders, canceledOrders, totalRevenue, totalCost, totalRefund, totalProfit };
}

/**
 * Tính toán báo cáo tổng quan Dashboard từ bảng daily_revenue_summary
 */
async function getDashboardSummary(params = {}) {
  const { start, end, prevStart, prevEnd, bucketMode, targetYear, period } = parseDateRange(params);

  // 1. Thống kê kỳ hiện tại & kỳ so sánh từ daily_revenue_summary
  const currentStats = await getOrderStatsForRange(start, end);
  const prevStats = await getOrderStatsForRange(prevStart, prevEnd);

  const { totalOrders, canceledOrders, totalRevenue, totalCost, totalRefund, totalProfit } = currentStats;
  const { totalOrders: prevOrders, canceledOrders: prevCanceled, totalRevenue: prevRevenue, totalCost: prevCost, totalRefund: prevRefund, totalProfit: prevProfit } = prevStats;

  // Tính phần trăm tăng trưởng
  const ordersGrowth = prevOrders > 0 ? (((totalOrders - prevOrders) / prevOrders) * 100).toFixed(1) : totalOrders > 0 ? "100" : "0";
  const canceledGrowth = prevCanceled > 0 ? (((canceledOrders - prevCanceled) / prevCanceled) * 100).toFixed(1) : canceledOrders > 0 ? "100" : "0";
  const revenueGrowth = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : totalRevenue > 0 ? "100" : "0";
  const profitGrowth = prevProfit > 0 ? (((totalProfit - prevProfit) / prevProfit) * 100).toFixed(1) : totalProfit > 0 ? "100" : "0";
  const costGrowth = prevCost > 0 ? (((totalCost - prevCost) / prevCost) * 100).toFixed(1) : totalCost > 0 ? "100" : "0";
  const refundGrowth = prevRefund > 0 ? (((totalRefund - prevRefund) / prevRefund) * 100).toFixed(1) : totalRefund > 0 ? "100" : "0";

  // 2. Lấy dữ liệu biểu đồ linh hoạt theo bucketMode ('hour' | 'day' | 'month')
  const chartData = [];
  let chartSubtitle = "Xu hướng biến động";

  if (bucketMode === "hour") {
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

    // 12 mốc giờ (mỗi mốc gộp 2 giờ: 0h-1h, 2h-3h, ..., 22h-23h) -> Đúng 12 điểm
    for (let h = 0; h < 24; h += 2) {
      const d1 = hourMap.get(h) || { orders: 0, canceled: 0, revenue: 0, cost: 0, profit: 0 };
      const d2 = hourMap.get(h + 1) || { orders: 0, canceled: 0, revenue: 0, cost: 0, profit: 0 };
      chartData.push({
        label: `${h}h`,
        orders: d1.orders + d2.orders,
        canceled: d1.canceled + d2.canceled,
        revenue: d1.revenue + d2.revenue,
        cost: d1.cost + d2.cost,
        profit: d1.profit + d2.profit,
      });
    }
  } else if (bucketMode === "day") {
    chartSubtitle = period === "month" ? "Xu hướng biến động từng ngày trong tháng" : "Xu hướng biến động theo ngày";
    const dayRows = await db(TABLES.DAILY_REVENUE_SUMMARY)
      .whereBetween("summary_date", [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)])
      .select(
        db.raw("TO_CHAR(summary_date, 'YYYY-MM-DD') as day_key"),
        db.raw("COALESCE(dashboard_orders_count, 0)::integer as orders"),
        db.raw("COALESCE(dashboard_canceled_count, 0)::integer as canceled"),
        db.raw("COALESCE(earned_revenue, 0)::numeric as revenue"),
        db.raw("COALESCE(total_shop_cost, 0)::numeric as cost"),
        db.raw("COALESCE(revenue_reversed, 0)::numeric as refund")
      )
      .orderBy("summary_date", "asc");

    const dayMap = new Map();
    dayRows.forEach((r) => {
      const rev = parseFloat(r.revenue || 0);
      const cst = parseFloat(r.cost || 0);
      const ref = parseFloat(r.refund || 0);
      dayMap.set(r.day_key, {
        orders: parseInt(r.orders || 0, 10),
        canceled: parseInt(r.canceled || 0, 10),
        revenue: rev,
        cost: cst,
        profit: rev - cst - ref,
      });
    });

    const daysList = [];
    const curr = new Date(start);
    curr.setUTCHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setUTCHours(23, 59, 59, 999);

    const isSameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();

    while (curr <= endNorm) {
      const dayKey = curr.toISOString().slice(0, 10);
      const dayNum = String(curr.getUTCDate()).padStart(2, "0");
      const monthNum = String(curr.getUTCMonth() + 1).padStart(2, "0");
      const label = period === "month" || isSameMonth ? dayNum : `${dayNum}/${monthNum}`;

      const d = dayMap.get(dayKey) || { orders: 0, canceled: 0, revenue: 0, cost: 0, profit: 0 };
      daysList.push({
        label,
        dayNum,
        ...d,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Trả về đầy đủ tất cả các ngày trong tháng (VD: 30 ngày)
    daysList.forEach((item) => {
      chartData.push({
        label: item.label,
        orders: item.orders,
        canceled: item.canceled,
        revenue: item.revenue,
        cost: item.cost,
        profit: item.profit,
      });
    });
  } else {
    chartSubtitle = "Xu hướng biến động 12 Tháng";
    const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    const monthlyRows = await db(TABLES.ORDER_LIST)
      .whereBetween("order_date", [yearStart.toISOString(), yearEnd.toISOString()])
      .select(
        db.raw("EXTRACT(MONTH FROM order_date::timestamp)::integer as month_num"),
        db.raw("COUNT(*)::integer as orders"),
        db.raw("COUNT(*) FILTER (WHERE status = 'CANCELED')::integer as canceled"),
        db.raw("COALESCE(SUM(CASE WHEN status != 'CANCELED' THEN price ELSE 0 END), 0)::numeric as revenue"),
        db.raw("COALESCE(SUM(CASE WHEN status != 'CANCELED' THEN cost ELSE 0 END), 0)::numeric as cost"),
        db.raw("COALESCE(SUM(refund), 0)::numeric as refund")
      )
      .groupBy("month_num")
      .orderBy("month_num", "asc");

    const monthlyMap = new Map();
    monthlyRows.forEach((r) => {
      const rev = parseFloat(r.revenue || 0);
      const cst = parseFloat(r.cost || 0);
      const ref = parseFloat(r.refund || 0);
      monthlyMap.set(r.month_num, {
        orders: parseInt(r.orders || 0, 10),
        canceled: parseInt(r.canceled || 0, 10),
        revenue: rev,
        cost: cst,
        profit: rev - cst - ref,
      });
    });

    for (let m = 1; m <= 12; m++) {
      const d = monthlyMap.get(m) || { orders: 0, canceled: 0, revenue: 0, cost: 0, profit: 0 };
      chartData.push({
        label: `T${m}`,
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

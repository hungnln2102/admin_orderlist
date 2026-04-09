const {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
  fetchDashboardChartsForDateRange,
} = require("./service");
const { timezoneCandidate } = require("./constants");
const logger = require("../../utils/logger");

const MAX_DASHBOARD_RANGE_DAYS = 732;

const parseISODateParam = (value) => {
  if (value === undefined || value === null || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return trimmed;
};

const inclusiveDaysBetweenYMD = (fromStr, toStr) => {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
};

const resolveCurrentYear = () => {
  try {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezoneCandidate,
      year: "numeric",
    }).format(new Date());
    const parsed = Number(formatted);
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
};

const dashboardStats = async (req, res) => {
  try {
    const from = parseISODateParam(req.query.from);
    const to = parseISODateParam(req.query.to);
    if (from && to) {
      if (from > to) {
        return res.status(400).json({
          error: "Tham số from phải nhỏ hơn hoặc bằng to.",
        });
      }
      const days = inclusiveDaysBetweenYMD(from, to);
      if (days > MAX_DASHBOARD_RANGE_DAYS) {
        return res.status(400).json({
          error: `Khoảng thời gian không được vượt quá ${MAX_DASHBOARD_RANGE_DAYS} ngày.`,
        });
      }
      const payload = await fetchDashboardStatsForDateRange({ from, to });
      return res.json(payload);
    }
    if ((from && !to) || (!from && to)) {
      return res.status(400).json({
        error: "Cần cả from và to (định dạng yyyy-mm-dd) hoặc bỏ cả hai.",
      });
    }
    const payload = await fetchDashboardStats();
    res.json(payload);
  } catch (error) {
    logger.error("[dashboard] Query failed (stats)", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải dữ liệu.",
    });
  }
};

const dashboardYears = async (_req, res) => {
  try {
    const years = await fetchDashboardYears();
    res.json({ years });
  } catch (error) {
    logger.error("[dashboard] Query failed (years)", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải danh sách năm.",
    });
  }
};

const dashboardCharts = async (req, res) => {
  const currentYear = resolveCurrentYear();
  const from = parseISODateParam(req.query.from);
  const to = parseISODateParam(req.query.to);

  try {
    if (from && to) {
      if (from > to) {
        return res.status(400).json({
          error: "Tham số from phải nhỏ hơn hoặc bằng to.",
        });
      }
      const days = inclusiveDaysBetweenYMD(from, to);
      if (days > MAX_DASHBOARD_RANGE_DAYS) {
        return res.status(400).json({
          error: `Khoảng thời gian không được vượt quá ${MAX_DASHBOARD_RANGE_DAYS} ngày.`,
        });
      }
      const result = await fetchDashboardChartsForDateRange({ from, to });
      return res.json(result);
    }
    if ((from && !to) || (!from && to)) {
      return res.status(400).json({
        error: "Cần cả from và to (định dạng yyyy-mm-dd) hoặc bỏ cả hai.",
      });
    }

    const filterYear = req.query.year ? Number(req.query.year) : currentYear;
    const limitToToday = filterYear === currentYear;

    const result = await fetchDashboardChartsFromSummary({
      year: filterYear,
      limitToToday,
    });
    res.json(result);
  } catch (error) {
    logger.error("[dashboard] Query failed (charts)", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải biểu đồ.",
    });
  }
};

const dashboardMonthlySummary = async (_req, res) => {
  try {
    const data = await fetchDashboardMonthlySummary();
    res.json({ months: data });
  } catch (error) {
    logger.error("[dashboard] Query failed (monthly summary)", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải dữ liệu tóm tắt hàng tháng.",
    });
  }
};

module.exports = {
  dashboardStats,
  dashboardYears,
  dashboardCharts,
  dashboardMonthlySummary,
};

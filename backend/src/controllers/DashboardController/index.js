const { fetchDashboardStats, fetchDashboardYears, fetchDashboardCharts } = require("./service");
const { timezoneCandidate } = require("./constants");

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

const dashboardStats = async (_req, res) => {
  try {
    const payload = await fetchDashboardStats();
    res.json(payload);
  } catch (error) {
    console.error("[dashboard] Query failed (stats):", error);
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
    console.error("[dashboard] Query failed (years):", error);
    res.status(500).json({
      error: "Không thể tải danh sách năm.",
    });
  }
};

const dashboardCharts = async (req, res) => {
  const currentYear = resolveCurrentYear();
  const filterYear = req.query.year ? Number(req.query.year) : currentYear;
  const limitToToday = filterYear === currentYear;

  try {
    const result = await fetchDashboardCharts({
      year: filterYear,
      limitToToday,
    });
    res.json(result);
  } catch (error) {
    console.error("[dashboard] Query failed (charts):", error);
    res.status(500).json({
      error: "Không thể tải biểu đồ.",
    });
  }
};

module.exports = {
  dashboardStats,
  dashboardYears,
  dashboardCharts,
};

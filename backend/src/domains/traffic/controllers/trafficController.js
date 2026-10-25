const { getTrafficStatsService } = require("../services/trafficService");
const { getClientErrorMessage } = require("@/utils/clientError");

/**
 * Controller lấy số liệu Traffic & Analytics
 * GET /api/traffic/stats?days=30
 */
const getTrafficStats = async (req, res) => {
  try {
    const rawDays = parseInt(req.query.days, 10);
    const days = !isNaN(rawDays) && rawDays > 0 ? rawDays : 30;

    const data = await getTrafficStatsService(days);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[TRAFFIC_CONTROLLER] Lỗi xử lý traffic stats:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu phân tích truy cập",
      error: getClientErrorMessage(error, "Không thể lấy dữ liệu phân tích truy cập"),
    });
  }
};

module.exports = {
  getTrafficStats,
};

const express = require("express");
const router = express.Router();
const dashboardService = require("./services/dashboardService");

/**
 * GET /api/dashboard/summary
 * Query parameters:
 *  - period: 'day' | 'month' | 'year' | 'custom'
 *  - date: YYYY-MM-DD
 *  - month: YYYY-MM
 *  - year: YYYY
 *  - startDate: YYYY-MM-DD
 *  - endDate: YYYY-MM-DD
 */
router.get("/summary", async (req, res) => {
  try {
    const data = await dashboardService.getDashboardSummary(req.query);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu tổng quan dashboard:", err);
    res.status(500).json({
      success: false,
      message: "Không thể tải dữ liệu báo cáo dashboard",
      error: err.message,
    });
  }
});

module.exports = router;

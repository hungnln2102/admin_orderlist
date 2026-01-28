// SalesSummaryController - Handle API requests for sales summary data

const {
  getDailySummary,
  getProductSummary,
  getVariantSummary,
  refreshSalesSummary,
} = require("../../services/salesSummaryService");
const logger = require("../../utils/logger");

/**
 * GET /api/sales-summary/daily
 * Get daily sales summary data for the last N days
 * Query params:
 *   - days: number of days to retrieve (default: 30)
 */
const getDailySalesSummary = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: "Days parameter must be between 1 and 365",
      });
    }

    const data = await getDailySummary(days);
    
    logger.info(`[SALES_SUMMARY_API] Retrieved daily summary for ${days} days`, {
      recordCount: data.length,
    });

    return res.status(200).json({
      success: true,
      data,
      meta: {
        days,
        recordCount: data.length,
      },
    });
  } catch (err) {
    logger.error("[SALES_SUMMARY_API] Failed to get daily summary", {
      error: err.message,
      stack: err.stack,
    });
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve daily sales summary",
      error: err.message,
    });
  }
};

/**
 * GET /api/sales-summary/product
 * Get product sales summary data for the last N days
 */
const getProductSalesSummary = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: "Days parameter must be between 1 and 365",
      });
    }

    const data = await getProductSummary(days);
    
    return res.status(200).json({
      success: true,
      data,
      meta: {
        days,
        recordCount: data.length,
      },
    });
  } catch (err) {
    logger.error("[SALES_SUMMARY_API] Failed to get product summary", {
      error: err.message,
      stack: err.stack,
    });
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product sales summary",
      error: err.message,
    });
  }
};

/**
 * GET /api/sales-summary/variant
 * Get variant sales summary data for the last N days
 */
const getVariantSalesSummary = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: "Days parameter must be between 1 and 365",
      });
    }

    const data = await getVariantSummary(days);
    
    return res.status(200).json({
      success: true,
      data,
      meta: {
        days,
        recordCount: data.length,
      },
    });
  } catch (err) {
    logger.error("[SALES_SUMMARY_API] Failed to get variant summary", {
      error: err.message,
      stack: err.stack,
    });
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve variant sales summary",
      error: err.message,
    });
  }
};

/**
 * POST /api/sales-summary/refresh
 * Manually trigger refresh of sales summary materialized views
 */
const refreshSalesSummaryViews = async (req, res) => {
  try {
    logger.info("[SALES_SUMMARY_API] Manual refresh triggered");
    
    const result = await refreshSalesSummary();
    
    return res.status(200).json({
      success: true,
      message: "Sales summary materialized views refreshed successfully",
      result,
    });
  } catch (err) {
    logger.error("[SALES_SUMMARY_API] Failed to refresh summary", {
      error: err.message,
      stack: err.stack,
    });
    
    return res.status(500).json({
      success: false,
      message: "Failed to refresh sales summary",
      error: err.message,
    });
  }
};

module.exports = {
  getDailySalesSummary,
  getProductSalesSummary,
  getVariantSalesSummary,
  refreshSalesSummaryViews,
};

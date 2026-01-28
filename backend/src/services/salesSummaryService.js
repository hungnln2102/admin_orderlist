// salesSummaryService.js - Service for refreshing sales summary materialized views

const { Pool } = require("pg");
const { SCHEMA_PRODUCT } = require("../config/dbSchema");
const logger = require("../utils/logger");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Refresh all sales summary materialized views
 * This is similar to how refresh_variant_sold_count works
 * @returns {Promise<Object>} Refresh results
 */
const refreshSalesSummary = async () => {
  const startTime = Date.now();
  logger.info("[SALES_SUMMARY] Starting materialized view refresh");

  const client = await pool.connect();
  try {
    // Call the PostgreSQL function to refresh all views
    const query = `SELECT * FROM ${SCHEMA_PRODUCT}.refresh_sales_summary()`;
    const result = await client.query(query);

    const duration = Date.now() - startTime;
    const results = result.rows || [];

    // Log results for each view
    results.forEach((row) => {
      if (row.status === "SUCCESS") {
        logger.info(`[SALES_SUMMARY] Refreshed ${row.view_name}`, {
          rows: row.rows_affected,
          time: row.refresh_time,
        });
      } else {
        logger.error(`[SALES_SUMMARY] Failed to refresh ${row.view_name}`, {
          error: row.status,
        });
      }
    });

    logger.info(`[SALES_SUMMARY] Refresh completed in ${duration}ms`);

    return {
      success: true,
      duration,
      results,
    };
  } catch (err) {
    logger.error("[SALES_SUMMARY] Refresh failed", {
      error: err.message,
      stack: err.stack,
    });
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get daily sales summary data for the last N days
 * @param {number} days - Number of days to retrieve (default: 30)
 * @returns {Promise<Array>} Array of summary records
 */
const getDailySummary = async (days = 30) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT
        summary_date,
        total_orders,
        total_quantity,
        total_revenue,
        total_cost,
        total_profit,
        updated_at
      FROM ${SCHEMA_PRODUCT}.daily_sales_summary
      WHERE summary_date >= (CURRENT_DATE - $1::int)
      ORDER BY summary_date DESC;
    `;

    const result = await client.query(query, [days]);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Get product sales summary data for the last N days
 * @param {number} days - Number of days to retrieve (default: 30)
 * @returns {Promise<Array>} Array of product summary records
 */
const getProductSummary = async (days = 30) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT
        product_id,
        summary_date,
        total_orders,
        total_quantity,
        total_revenue,
        total_cost,
        total_profit,
        updated_at
      FROM ${SCHEMA_PRODUCT}.product_sales_summary
      WHERE summary_date >= (CURRENT_DATE - $1::int)
      ORDER BY summary_date DESC, product_id;
    `;

    const result = await client.query(query, [days]);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Get variant sales summary data for the last N days
 * @param {number} days - Number of days to retrieve (default: 30)
 * @returns {Promise<Array>} Array of variant summary records
 */
const getVariantSummary = async (days = 30) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT
        variant_id,
        product_id,
        summary_date,
        total_orders,
        total_quantity,
        total_revenue,
        total_cost,
        total_profit,
        updated_at
      FROM ${SCHEMA_PRODUCT}.variant_sales_summary
      WHERE summary_date >= (CURRENT_DATE - $1::int)
      ORDER BY summary_date DESC, variant_id;
    `;

    const result = await client.query(query, [days]);
    return result.rows;
  } finally {
    client.release();
  }
};

// Alias for backward compatibility
const refreshLast30Days = refreshSalesSummary;
const getSummaryData = getDailySummary;

module.exports = {
  refreshSalesSummary,
  refreshLast30Days,
  getDailySummary,
  getProductSummary,
  getVariantSummary,
  getSummaryData,
};

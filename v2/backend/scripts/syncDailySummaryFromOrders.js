/**
 * syncDailySummaryFromOrders.js
 * Đồng bộ toàn bộ dữ liệu đơn hàng và đơn nhập hàng vào bảng daily_revenue_summary
 * dựa trên ngày đăng ký đơn hàng (order_date theo giờ Việt Nam UTC+7).
 *
 * Chuẩn ACID Transaction & Upsert ON CONFLICT (summary_date).
 */

require("module-alias/register");
const { db, TABLES } = require("@/db");

async function syncDailySummaryFromOrders() {
  console.log("🚀 [SyncDailySummary] Bắt đầu đồng bộ số liệu từ đơn hàng vào daily_revenue_summary...");
  const startTime = Date.now();

  const trx = await db.transaction();
  try {
    const upsertSql = `
      WITH order_dates AS (
        SELECT
          id,
          id_order,
          status,
          price,
          gross_selling_price,
          cost,
          refund,
          COALESCE(
            (order_date AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
            (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          ) AS v_date
        FROM ${TABLES.ORDER_LIST}
        WHERE order_date IS NOT NULL OR created_at IS NOT NULL
      ),
      sales_daily AS (
        SELECT
          v_date,
          COUNT(*) FILTER (WHERE status IN ('PAID', 'EXPIRED', 'RENEW_REQUIRED'))::integer AS sales_orders_count,
          COUNT(*) FILTER (WHERE status = 'REFUNDED')::integer AS canceled_count,
          COALESCE(SUM(COALESCE(gross_selling_price, price, 0)) FILTER (WHERE status IN ('PAID', 'EXPIRED', 'RENEW_REQUIRED')), 0)::numeric AS earned_revenue,
          COALESCE(SUM(COALESCE(cost, 0)) FILTER (WHERE status IN ('PAID', 'EXPIRED', 'RENEW_REQUIRED')), 0)::numeric AS sales_cost,
          COALESCE(SUM(COALESCE(refund, price, 0)) FILTER (WHERE status = 'REFUNDED'), 0)::numeric AS revenue_reversed
        FROM order_dates
        WHERE id_order NOT LIKE 'MAVN%'
        GROUP BY v_date
      ),
      import_daily AS (
        SELECT
          v_date,
          COUNT(*)::integer AS import_count,
          COALESCE(SUM(COALESCE(cost, price, 0)), 0)::numeric AS import_cost
        FROM order_dates
        WHERE id_order LIKE 'MAVN%'
        GROUP BY v_date
      ),
      all_dates AS (
        SELECT v_date FROM sales_daily
        UNION
        SELECT v_date FROM import_daily
      ),
      daily_merged AS (
        SELECT
          ad.v_date AS summary_date,
          COALESCE(s.sales_orders_count, 0) AS dashboard_orders_count,
          COALESCE(s.sales_orders_count, 0) AS total_orders,
          COALESCE(s.canceled_count, 0) AS dashboard_canceled_count,
          ROUND(COALESCE(s.earned_revenue, 0), 2) AS earned_revenue,
          ROUND(COALESCE(s.earned_revenue, 0), 2) AS total_revenue,
          ROUND(COALESCE(s.sales_cost, 0) + COALESCE(imp.import_cost, 0), 2) AS total_shop_cost,
          ROUND(COALESCE(s.sales_cost, 0) + COALESCE(imp.import_cost, 0), 2) AS total_cost,
          ROUND(COALESCE(s.revenue_reversed, 0), 2) AS revenue_reversed,
          ROUND(
            COALESCE(s.earned_revenue, 0) - (COALESCE(s.sales_cost, 0) + COALESCE(imp.import_cost, 0)) - COALESCE(s.revenue_reversed, 0),
            2
          ) AS net_profit
        FROM all_dates ad
        LEFT JOIN sales_daily s ON s.v_date = ad.v_date
        LEFT JOIN import_daily imp ON imp.v_date = ad.v_date
      )
      INSERT INTO ${TABLES.DAILY_REVENUE_SUMMARY} (
        summary_date,
        total_orders,
        total_revenue,
        total_cost,
        net_profit,
        earned_revenue,
        total_shop_cost,
        revenue_reversed,
        dashboard_orders_count,
        dashboard_canceled_count,
        created_at,
        updated_at
      )
      SELECT
        m.summary_date,
        m.total_orders,
        m.total_revenue,
        m.total_cost,
        m.net_profit,
        m.earned_revenue,
        m.total_shop_cost,
        m.revenue_reversed,
        m.dashboard_orders_count,
        m.dashboard_canceled_count,
        NOW(),
        NOW()
      FROM daily_merged m
      ON CONFLICT (summary_date) DO UPDATE SET
        total_orders = EXCLUDED.total_orders,
        total_revenue = EXCLUDED.total_revenue,
        total_cost = EXCLUDED.total_cost,
        net_profit = EXCLUDED.net_profit,
        earned_revenue = EXCLUDED.earned_revenue,
        total_shop_cost = EXCLUDED.total_shop_cost,
        revenue_reversed = EXCLUDED.revenue_reversed,
        dashboard_orders_count = EXCLUDED.dashboard_orders_count,
        dashboard_canceled_count = EXCLUDED.dashboard_canceled_count,
        updated_at = NOW();
    `;

    await trx.raw(upsertSql);
    await trx.commit();

    // Đối soát kết quả sau khi commit
    const countRes = await db(TABLES.DAILY_REVENUE_SUMMARY).count("id as cnt").first();
    const statsRes = await db(TABLES.DAILY_REVENUE_SUMMARY)
      .select(
        db.raw("MIN(summary_date) as min_date"),
        db.raw("MAX(summary_date) as max_date"),
        db.raw("SUM(dashboard_orders_count) as total_orders"),
        db.raw("SUM(dashboard_canceled_count) as total_canceled"),
        db.raw("SUM(earned_revenue) as total_rev"),
        db.raw("SUM(total_shop_cost) as total_cost"),
        db.raw("SUM(revenue_reversed) as total_refund"),
        db.raw("SUM(net_profit) as total_profit")
      )
      .first();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [SyncDailySummary] Hoàn thành đồng bộ trong ${duration}s!`);
    const minDateStr = statsRes.min_date instanceof Date ? statsRes.min_date.toISOString().slice(0, 10) : String(statsRes.min_date).slice(0, 10);
    const maxDateStr = statsRes.max_date instanceof Date ? statsRes.max_date.toISOString().slice(0, 10) : String(statsRes.max_date).slice(0, 10);
    console.log(`📌 Tổng số ngày ghi nhận: ${countRes.cnt} ngày (${minDateStr} ➔ ${maxDateStr})`);
    console.log(`📦 Tổng đơn bán: ${parseInt(statsRes.total_orders, 10).toLocaleString("vi-VN")}`);
    console.log(`❌ Tổng đơn hủy: ${parseInt(statsRes.total_canceled, 10).toLocaleString("vi-VN")}`);
    console.log(`💰 Tổng doanh thu: ${Math.round(parseFloat(statsRes.total_rev)).toLocaleString("vi-VN")} ₫`);
    console.log(`🏷️ Tổng chi phí vốn: ${Math.round(parseFloat(statsRes.total_cost)).toLocaleString("vi-VN")} ₫`);
    console.log(`🔄 Tổng tiền hoàn: ${Math.round(parseFloat(statsRes.total_refund)).toLocaleString("vi-VN")} ₫`);
    console.log(`📈 Tổng lợi nhuận ròng: ${Math.round(parseFloat(statsRes.total_profit)).toLocaleString("vi-VN")} ₫`);

    return {
      success: true,
      count: parseInt(countRes.cnt, 10),
      stats: statsRes,
    };
  } catch (error) {
    await trx.rollback();
    console.error("❌ [SyncDailySummary] Lỗi đồng bộ, đã rollback an toàn:", error);
    throw error;
  }
}

if (require.main === module) {
  syncDailySummaryFromOrders()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { syncDailySummaryFromOrders };

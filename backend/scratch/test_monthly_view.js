require('module-alias/register');
const { db } = require('../src/db');

async function testQuery() {
  const q = `
  WITH all_months AS (
    SELECT DISTINCT to_char(order_date, 'YYYY-MM') AS month_key FROM business.order_list WHERE order_date IS NOT NULL
    UNION
    SELECT DISTINCT to_char(payment_date, 'YYYY-MM') AS month_key FROM billing.payment_receipt WHERE payment_date IS NOT NULL
    UNION
    SELECT DISTINCT month_key FROM finance.dashboard_financial_change_log
  ),
  monthly_orders AS (
    SELECT
      to_char(COALESCE(created_at, order_date), 'YYYY-MM') AS month_key,
      COUNT(id) FILTER (WHERE id_order IS NOT NULL AND status IN ('Đã Thanh Toán', 'Đang Giao', 'Hoàn Thành')) AS total_orders,
      COUNT(id) FILTER (WHERE status IN ('Đã Hủy', 'Đã Hoàn')) AS canceled_orders,
      COALESCE(SUM(refund) FILTER (WHERE status IN ('Đã Hủy', 'Đã Hoàn')), 0) AS total_refund
    FROM business.order_list
    GROUP BY 1
  ),
  monthly_receipts AS (
    SELECT
      to_char(payment_date, 'YYYY-MM') AS month_key,
      COALESCE(SUM(amount) FILTER (WHERE id_order IS NOT NULL AND id_order <> ''), 0) AS total_revenue,
      COALESCE(SUM(posted_off_flow_bank_receipt), 0) AS total_off_flow_bank_receipt
    FROM billing.payment_receipt
    WHERE payment_date IS NOT NULL
    GROUP BY 1
  ),
  monthly_import AS (
    SELECT
      to_char(timezone('Asia/Ho_Chi_Minh', logged_at), 'YYYY-MM') AS month_key,
      COALESCE(SUM(import_cost), 0) AS total_import
    FROM (
      SELECT
        logged_at,
        import_cost,
        ROW_NUMBER() OVER (PARTITION BY to_char(timezone('Asia/Ho_Chi_Minh', logged_at), 'YYYY-MM'), order_list_id ORDER BY id DESC) as rn
      FROM business.supplier_order_cost_log
    ) t
    WHERE rn = 1
    GROUP BY 1
  ),
  monthly_profit AS (
    SELECT
      to_char(timezone('Asia/Ho_Chi_Minh', logged_at), 'YYYY-MM') AS month_key,
      COALESCE(SUM(GREATEST(0, COALESCE(ol.gross_selling_price, ol.price, 0) - COALESCE(ol.cost, 0))), 0) AS total_profit
    FROM business.supplier_order_cost_log l
    INNER JOIN business.order_list ol ON ol.id = l.order_list_id
    GROUP BY 1
  ),
  monthly_bank_balance AS (
    SELECT
      month_key,
      (SELECT COALESCE(SUM(delta), 0) FROM finance.dashboard_financial_change_log WHERE metric_type = 'bank_balance' AND month_key <= m.month_key) AS estimated_bank_balance
    FROM all_months m
  )
  SELECT
    am.month_key,
    COALESCE(mo.total_orders, 0)::bigint AS total_orders,
    COALESCE(mo.canceled_orders, 0)::bigint AS canceled_orders,
    COALESCE(mr.total_revenue, 0)::numeric(15,2) AS total_revenue,
    COALESCE(mp.total_profit, 0)::numeric(15,2) AS total_profit,
    COALESCE(mo.total_refund, 0)::numeric(15,2) AS total_refund,
    COALESCE(mi.total_import, 0)::numeric(15,2) AS total_import,
    COALESCE(mr.total_off_flow_bank_receipt, 0)::numeric(15,2) AS total_off_flow_bank_receipt,
    COALESCE(mb.estimated_bank_balance, 0)::numeric(15,2) AS estimated_bank_balance
  FROM all_months am
  LEFT JOIN monthly_orders mo ON mo.month_key = am.month_key
  LEFT JOIN monthly_receipts mr ON mr.month_key = am.month_key
  LEFT JOIN monthly_import mi ON mi.month_key = am.month_key
  LEFT JOIN monthly_profit mp ON mp.month_key = am.month_key
  LEFT JOIN monthly_bank_balance mb ON mb.month_key = am.month_key
  ORDER BY am.month_key DESC
  LIMIT 5;
  `;
  const res = await db.raw(q);
  console.log(res.rows);
  await db.destroy();
}

testQuery().catch(console.error);

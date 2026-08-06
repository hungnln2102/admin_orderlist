exports.up = async function (knex) {
  // 1. Tạo bảng tạm mới có cấu trúc dọc (Narrow Ledger)
  await knex.raw(`
    CREATE TABLE finance.dashboard_financial_change_log_new (
      id BIGSERIAL PRIMARY KEY,
      month_key VARCHAR(10) NOT NULL,
      metric_type VARCHAR(50) NOT NULL,
      delta NUMERIC(15,2) NOT NULL DEFAULT 0,
      snapshot NUMERIC(15,2) NOT NULL DEFAULT 0,
      context VARCHAR(150),
      ref_type VARCHAR(50),
      ref_id VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Helper SQL để tự động bóc tách ref_type và ref_id từ context cũ
  const refTypeSql = `
    CASE
      WHEN context LIKE 'renewal.runRenewal:%' THEN 'order_list'
      WHEN context LIKE 'renewal.mavryk.external_import:%' THEN 'order_list'
      WHEN context LIKE 'supplier-change[order=%' THEN 'order_list'
      WHEN context LIKE 'payments.confirmPaymentSupply %' THEN 'store_profit_expenses'
      ELSE NULL
    END
  `;

  const refIdSql = `
    CASE
      WHEN context LIKE 'renewal.runRenewal:%' THEN substring(context from '^renewal\\.runRenewal:(.+)')
      WHEN context LIKE 'renewal.mavryk.external_import:%' THEN substring(context from '^renewal\\.mavryk\\.external_import:(.+)')
      WHEN context LIKE 'supplier-change[order=%' THEN substring(context from '^supplier-change\\[order=(\\d+)')
      WHEN context LIKE 'payments.confirmPaymentSupply %' THEN substring(context from 'supply=(\\d+)')
      ELSE NULL
    END
  `;

  // 2. Di chuyển và chuẩn hóa dữ liệu cũ sang cấu trúc mới (chỉ lấy các biến động khác 0)
  await knex.raw(`
    INSERT INTO finance.dashboard_financial_change_log_new (
      month_key, metric_type, delta, snapshot, context, ref_type, ref_id, created_at
    )
    SELECT month_key, metric_type, delta, snapshot, context, ref_type, ref_id, created_at
    FROM (
      -- Giao dịch doanh thu (revenue)
      SELECT 
        month_key,
        'revenue' AS metric_type,
        revenue_delta AS delta,
        SUM(revenue_delta) OVER (PARTITION BY month_key ORDER BY id) AS snapshot,
        context,
        ${refTypeSql} AS ref_type,
        ${refIdSql} AS ref_id,
        created_at
      FROM finance.dashboard_financial_change_log
      WHERE revenue_delta <> 0

      UNION ALL

      -- Giao dịch lợi nhuận (profit)
      SELECT 
        month_key,
        'profit' AS metric_type,
        profit_delta AS delta,
        available_profit_snapshot AS snapshot,
        context,
        ${refTypeSql} AS ref_type,
        ${refIdSql} AS ref_id,
        created_at
      FROM finance.dashboard_financial_change_log
      WHERE profit_delta <> 0

      UNION ALL

      -- Giao dịch giá vốn (import/cost)
      SELECT 
        month_key,
        'import' AS metric_type,
        import_delta AS delta,
        SUM(import_delta) OVER (PARTITION BY month_key ORDER BY id) AS snapshot,
        context,
        ${refTypeSql} AS ref_type,
        ${refIdSql} AS ref_id,
        created_at
      FROM finance.dashboard_financial_change_log
      WHERE import_delta <> 0

      UNION ALL

      -- Giao dịch hoàn tiền (refund)
      SELECT 
        month_key,
        'refund' AS metric_type,
        refund_delta AS delta,
        SUM(refund_delta) OVER (PARTITION BY month_key ORDER BY id) AS snapshot,
        context,
        ${refTypeSql} AS ref_type,
        ${refIdSql} AS ref_id,
        created_at
      FROM finance.dashboard_financial_change_log
      WHERE refund_delta <> 0

      UNION ALL

      -- Giao dịch tiền ngoài luồng (off_flow)
      SELECT 
        month_key,
        'off_flow' AS metric_type,
        off_flow_delta AS delta,
        off_flow_snapshot AS snapshot,
        context,
        ${refTypeSql} AS ref_type,
        ${refIdSql} AS ref_id,
        created_at
      FROM finance.dashboard_financial_change_log
      WHERE off_flow_delta <> 0

      UNION ALL

      -- Giao dịch số dư ngân hàng (bank_balance)
      SELECT 
        month_key,
        'bank_balance' AS metric_type,
        bank_balance_delta AS delta,
        bank_balance_snapshot AS snapshot,
        context,
        ${refTypeSql} AS ref_type,
        ${refIdSql} AS ref_id,
        created_at
      FROM finance.dashboard_financial_change_log
      WHERE bank_balance_delta <> 0
    ) sub
    ORDER BY created_at ASC, metric_type ASC;
  `);

  // 3. Xóa bảng cũ
  await knex.raw(`
    DROP TABLE IF EXISTS finance.dashboard_financial_change_log CASCADE;
  `);

  // 4. Đổi tên bảng tạm mới thành tên chính thức
  await knex.raw(`
    ALTER TABLE finance.dashboard_financial_change_log_new RENAME TO dashboard_financial_change_log;
  `);

  // 5. Tạo lại indexes cho bảng mới
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_dashboard_financial_change_log_month_key_created 
      ON finance.dashboard_financial_change_log (month_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dashboard_financial_change_log_metric_type 
      ON finance.dashboard_financial_change_log (metric_type);
  `);
};

exports.down = async function (knex) {
  // Hoàn tác cấu trúc dọc về ngang (nếu thực sự cần thiết)
};

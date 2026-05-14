/**
 * Cột `dashboard_monthly_summary.total_profit` trước đây không trừ `external_import`;
 * API chỉ trừ khi hiển thị. Ứng dụng mới điều chỉnh `total_profit` khi tạo/xóa
 * `store_profit_expenses.external_import` — migration này backfill một lần.
 *
 * Chỉ `external_import`. MAVN (âm cost) đã trong `total_profit` nhờ trigger NCC.
 *
 * Thứ tự triển khai: chạy migration **trước** khi có bản ghi `external_import` mới
 * được tạo bởi bản build đã gọi `applyExternalImportProfitDelta` (tránh trừ đôi).
 */
const { loadBackendEnv } = require("../src/config/loadEnv");

loadBackendEnv();

const pickSchema = (...c) => c.find(Boolean);

const financeSchema = pickSchema(
  process.env.DB_SCHEMA_FINANCE,
  process.env.SCHEMA_FINANCE,
  "dashboard"
);

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return s;
};

const sqlBody = (fin, sign) => `
WITH ext AS (
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at::timestamptz), 'YYYY-MM') AS mk,
    COALESCE(SUM(amount::numeric), 0) AS total_ext
  FROM "${fin}".store_profit_expenses
  WHERE expense_type = 'external_import'
  GROUP BY 1
)
UPDATE "${fin}".dashboard_monthly_summary d
SET total_profit = d.total_profit ${sign} ext.total_ext,
    updated_at = now()
FROM ext
WHERE d.month_key = ext.mk
  AND ext.total_ext IS NOT NULL
  AND ext.total_ext <> 0::numeric
`;

exports.up = async function up(knex) {
  const fin = ident(financeSchema);
  await knex.raw(sqlBody(fin, "-"));
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(sqlBody(fin, "+"));
};

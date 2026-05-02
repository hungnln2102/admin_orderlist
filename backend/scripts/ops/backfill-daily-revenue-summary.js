/**
 * Đổ đồng dashboard.daily_revenue_summary trong khoảng ngày.
 *
 * earned_revenue — khớp «Form phân bổ thuế» / TaxDailyFormTable (metric doanh thu):
 *   Mỗi đơn MAVC/MAVL/MAVK/MAVS có ngày bắt đầu = COALESCE(order_date, created_at::date VN),
 *   thời hạn = số trong cột days; mỗi ngày D ∈ [start, start+term-1] cộng price/term.
 *   price = COALESCE(gross_selling_price, price). Cùng filter đơn tax như GET /api/orders/tax?from=…
 *
 * unearned_revenue_end — CUỐI ngày D: tổng «còn chưa phân bổ» trên các đơn tax:
 *   - Nếu D < start: toàn bộ price.
 *   - Nếu D > end: 0.
 *   - Nếu start <= D <= end: price * (end_date - D) / term (ngày trong khoảng sau D tới hết kỳ).
 *
 * revenue_reversed — tổng refund đơn Chưa Hoàn / Đã Hoàn theo ngày canceled_at (VN).
 *
 * total_shop_cost — chỉ chi phí nhập (không gồm rút lợi nhuận):
 *   - external_import (ngoài luồng): cả amount vào đúng ngày created_at (VN).
 *   - mavn_import (theo đơn): số trải = COALESCE(order.cost khác 0, amount dòng expense);
 *     mỗi ngày D ∈ [order_date, order_date+days-1] cộng số trải / days.
 *     Không khớp đơn: vẫn trải ex.amount trên --import-spread-days từ created_at.
 *
 * Mặc định --from: ngày 22 (VN); --tax-from=2026-04-22; --import-spread-days=30.
 *
 * Usage (từ thư mục backend, cần .env có DATABASE_URL hoặc DB_* giống app / Knex):
 *   node scripts/ops/backfill-daily-revenue-summary.js
 *   node scripts/ops/backfill-daily-revenue-summary.js --from=2026-04-22 --to=2026-05-02 --import-spread-days=30
 *   npm run sync:daily-revenue-summary -- --from=2026-04-22 --to=2026-05-02
 *   BACKEND_ENV_FILE=/path/.env node scripts/ops/backfill-daily-revenue-summary.js --from=...
 */

const { db } = require("../../src/db");
const {
  SCHEMA_FINANCE,
  SCHEMA_ORDERS,
  FINANCE_SCHEMA,
  tableName,
} = require("../../src/config/dbSchema");
const { STATUS } = require("../../src/utils/statuses");

const TZ = "Asia/Ho_Chi_Minh";
/** Trùng backend listRoutes + taxApi (danh sách đơn lên form thuế). */
const TAX_ORDER_LIST_FROM_DEFAULT = "2026-04-22";
const IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT = 30;

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${s}`);
  }
  return `"${s}"`;
};

function vnTodayYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function defaultFrom22nd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year").value);
  const m = Number(parts.find((p) => p.type === "month").value);
  const day = Number(parts.find((p) => p.type === "day").value);
  if (day >= 22) {
    return `${y}-${String(m).padStart(2, "0")}-22`;
  }
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}-22`;
}

function parseArgs(argv) {
  let from = null;
  let to = null;
  let taxFrom = null;
  let importSpreadDays = null;
  for (const a of argv) {
    if (a.startsWith("--from=")) from = a.slice(7).trim();
    if (a.startsWith("--to=")) to = a.slice(5).trim();
    if (a.startsWith("--tax-from=")) taxFrom = a.slice(11).trim();
    if (a.startsWith("--import-spread-days="))
      importSpreadDays = a.slice(21).trim();
  }
  return { from, to, taxFrom, importSpreadDays };
}

function buildBackfillSql({
  summaryTable,
  orderTable,
  expenseTable,
  refundStatuses,
}) {
  const cCreated = ident("created_at");
  const cOrderDate = ident("order_date");
  const cDays = ident("days");
  const cPrice = ident("price");
  const cGross = ident("gross_selling_price");
  const cIdOrder = ident("id_order");
  const cCost = ident("cost");
  const exAmount = ident("amount");
  const exCreated = ident("created_at");
  const exType = ident("expense_type");
  const exLinked = ident("linked_order_code");

  return `
WITH params AS (
  SELECT
    ?::date AS d_from,
    ?::date AS d_to,
    ?::date AS tax_from,
    ?::int AS import_spread_fallback_days
),
days AS (
  SELECT generate_series((SELECT d_from FROM params), (SELECT d_to FROM params), interval '1 day')::date AS d
),
tax_orders AS (
  SELECT
    COALESCE(
      ol.${cOrderDate},
      (ol.${cCreated} AT TIME ZONE '${TZ}')::date
    ) AS start_date,
    COALESCE(
      NULLIF(
        TRIM(REGEXP_REPLACE(COALESCE(ol.${cDays}::text, ''), '[^0-9]', '', 'g')),
        ''
      )::int,
      0
    ) AS term_days,
    COALESCE(ol.${cGross}::numeric, ol.${cPrice}::numeric, 0) AS price_amt
  FROM ${orderTable} ol
  CROSS JOIN params p
  WHERE (
        ol.${cIdOrder}::text ILIKE 'MAVC%'
     OR ol.${cIdOrder}::text ILIKE 'MAVL%'
     OR ol.${cIdOrder}::text ILIKE 'MAVK%'
     OR ol.${cIdOrder}::text ILIKE 'MAVS%'
  )
    AND COALESCE(
      (ol.${cCreated} AT TIME ZONE '${TZ}')::date,
      ol.${cOrderDate}
    ) >= p.tax_from
),
tax_orders_ext AS (
  SELECT
    start_date,
    term_days,
    price_amt,
    CASE
      WHEN term_days > 0 AND start_date IS NOT NULL
      THEN (start_date + (term_days - 1) * interval '1 day')::date
      ELSE NULL
    END AS end_date
  FROM tax_orders
  WHERE price_amt > 0
),
daily_earned AS (
  SELECT
    d.d AS day,
    SUM(t.price_amt / NULLIF(t.term_days, 0)) AS amt
  FROM days d
  INNER JOIN tax_orders_ext t
    ON t.term_days > 0
   AND t.end_date IS NOT NULL
   AND d.d BETWEEN t.start_date AND t.end_date
  GROUP BY d.d
),
unearned_end AS (
  SELECT
    d.d AS day,
    SUM(
      CASE
        WHEN t.term_days <= 0 OR t.start_date IS NULL OR t.end_date IS NULL THEN 0
        WHEN d.d < t.start_date THEN t.price_amt
        WHEN d.d > t.end_date THEN 0
        ELSE t.price_amt * GREATEST(0, (t.end_date - d.d)::numeric) / NULLIF(t.term_days, 0)
      END
    ) AS amt
  FROM days d
  CROSS JOIN tax_orders_ext t
  GROUP BY d.d
),
daily_refund AS (
  SELECT
    (ol.canceled_at AT TIME ZONE '${TZ}')::date AS day,
    SUM(COALESCE(ol.refund::numeric, 0)) AS amt
  FROM ${orderTable} ol
  WHERE ol.canceled_at IS NOT NULL
    AND TRIM(COALESCE(ol.status::text, '')) IN (${refundStatuses.map(() => "?").join(", ")})
  GROUP BY 1
),
expense_mavn_lines AS (
  SELECT
    COALESCE(
      NULLIF(olm.ocost::numeric, 0),
      ex.${exAmount}::numeric
    ) AS amt,
    (ex.${exCreated} AT TIME ZONE '${TZ}')::date AS ex_created,
    COALESCE(
      olm.od,
      (olm.ca AT TIME ZONE '${TZ}')::date
    ) AS ord_start,
    COALESCE(
      NULLIF(
        TRIM(REGEXP_REPLACE(COALESCE(olm.dy::text, ''), '[^0-9]', '', 'g')),
        ''
      )::int,
      0
    ) AS ord_term
  FROM ${expenseTable} ex
  LEFT JOIN LATERAL (
    SELECT
      ol.${cOrderDate} AS od,
      ol.${cCreated} AS ca,
      ol.${cDays} AS dy,
      ol.${cCost} AS ocost
    FROM ${orderTable} ol
    WHERE TRIM(COALESCE(ex.${exLinked}::text, '')) <> ''
      AND LOWER(TRIM(ol.${cIdOrder}::text)) = LOWER(TRIM(ex.${exLinked}::text))
    ORDER BY ol.${ident("id")} DESC NULLS LAST
    LIMIT 1
  ) olm ON TRUE
  WHERE TRIM(COALESCE(ex.${exType}::text, '')) = 'mavn_import'
),
expense_mavn_spread_params AS (
  SELECT
    amt,
    CASE
      WHEN ord_term > 0 AND ord_start IS NOT NULL THEN ord_start
      ELSE ex_created
    END AS spread_start,
    CASE
      WHEN ord_term > 0 AND ord_start IS NOT NULL THEN ord_term
      ELSE GREATEST(1, (SELECT import_spread_fallback_days FROM params))
    END AS spread_term
  FROM expense_mavn_lines
  WHERE amt > 0
),
expense_mavn_spread_ext AS (
  SELECT
    amt,
    spread_start,
    spread_term,
    (spread_start + (spread_term - 1) * interval '1 day')::date AS spread_end
  FROM expense_mavn_spread_params
  WHERE spread_term > 0 AND spread_start IS NOT NULL
),
daily_mavn_import_spread AS (
  SELECT
    d.d AS day,
    SUM(e.amt / NULLIF(e.spread_term, 0)) AS amt
  FROM days d
  INNER JOIN expense_mavn_spread_ext e
    ON d.d BETWEEN e.spread_start AND e.spread_end
  GROUP BY d.d
),
daily_external_import AS (
  SELECT
    (ex.${exCreated} AT TIME ZONE '${TZ}')::date AS day,
    SUM(COALESCE(ex.${exAmount}::numeric, 0)) AS amt
  FROM ${expenseTable} ex
  WHERE TRIM(COALESCE(ex.${exType}::text, '')) = 'external_import'
  GROUP BY 1
  HAVING SUM(COALESCE(ex.${exAmount}::numeric, 0)) > 0
),
merged AS (
  SELECT
    d.d AS summary_date,
    ROUND(COALESCE(de.amt, 0), 2)::numeric AS earned_revenue,
    ROUND(COALESCE(ue.amt, 0), 2)::numeric AS unearned_revenue_end,
    COALESCE(dr.amt, 0)::numeric AS revenue_reversed,
    ROUND(COALESCE(dm.amt, 0) + COALESCE(dx.amt, 0), 2)::numeric AS total_shop_cost
  FROM days d
  LEFT JOIN daily_earned de ON de.day = d.d
  LEFT JOIN unearned_end ue ON ue.day = d.d
  LEFT JOIN daily_refund dr ON dr.day = d.d
  LEFT JOIN daily_mavn_import_spread dm ON dm.day = d.d
  LEFT JOIN daily_external_import dx ON dx.day = d.d
)
INSERT INTO ${summaryTable} (
  summary_date,
  earned_revenue,
  unearned_revenue_end,
  revenue_reversed,
  total_shop_cost,
  created_at,
  updated_at
)
SELECT
  m.summary_date,
  m.earned_revenue,
  m.unearned_revenue_end,
  m.revenue_reversed,
  m.total_shop_cost,
  now(),
  now()
FROM merged m
ON CONFLICT (summary_date) DO UPDATE SET
  earned_revenue = EXCLUDED.earned_revenue,
  unearned_revenue_end = EXCLUDED.unearned_revenue_end,
  revenue_reversed = EXCLUDED.revenue_reversed,
  total_shop_cost = EXCLUDED.total_shop_cost,
  updated_at = now();
`;
}

async function main() {
  const {
    from: fromArg,
    to: toArg,
    taxFrom: taxFromArg,
    importSpreadDays: importSpreadDaysArg,
  } = parseArgs(process.argv.slice(2));
  const from = fromArg || defaultFrom22nd();
  const to = toArg || vnTodayYmd();
  const taxFrom = taxFromArg || TAX_ORDER_LIST_FROM_DEFAULT;
  const parsedSpread = Number(importSpreadDaysArg);
  const importSpreadDays =
    importSpreadDaysArg != null &&
    importSpreadDaysArg !== "" &&
    Number.isFinite(parsedSpread) &&
    parsedSpread >= 1
      ? Math.floor(parsedSpread)
      : IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT;

  if (from > to) {
    console.error("[daily-revenue-summary] --from phải <= --to", { from, to });
    process.exitCode = 1;
    return;
  }

  const summaryTable = tableName(
    FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.TABLE,
    SCHEMA_FINANCE
  );
  const orderTable = tableName("order_list", SCHEMA_ORDERS);
  const expenseTable = tableName(
    FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE,
    SCHEMA_FINANCE
  );

  const refundStatuses = [STATUS.PENDING_REFUND, STATUS.REFUNDED];

  const sql = buildBackfillSql({
    summaryTable,
    orderTable,
    expenseTable,
    refundStatuses,
  });

  /** @type {(string|number)[]} */
  const bindings = [from, to, taxFrom, importSpreadDays, ...refundStatuses];

  console.log("[daily-revenue-summary] Backfill", {
    from,
    to,
    taxFrom,
    importSpreadDays,
    summary: summaryTable,
  });

  await db.raw(sql, bindings);
  await db.destroy().catch(() => {});

  console.log("[daily-revenue-summary] Xong.");
}

if (require.main === module) {
  main().catch((e) => {
    console.error("[daily-revenue-summary]", e.message);
    process.exitCode = 1;
    db.destroy().catch(() => {});
  });
}

module.exports = {
  main,
  defaultFrom22nd,
  vnTodayYmd,
  TAX_ORDER_LIST_FROM_DEFAULT,
  IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT,
};

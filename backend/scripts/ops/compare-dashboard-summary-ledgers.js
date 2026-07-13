#!/usr/bin/env node

/**
 * Read-only reconciliation report for dashboard_monthly_summary vs append-only ledgers.
 *
 * Scope:
 * - Compares finance.dashboard_monthly_summary.estimated_bank_balance with the monthly
 *   signed delta from admin.shop_bank_account_ledger.
 * - Compares finance.dashboard_monthly_summary.total_off_flow_bank_receipt with receipt
 *   ledger rows whose source_kind marks off-flow receipt sources.
 *
 * Usage:
 *   npm run compare:dashboard-ledgers -- --from=2026-01 --to=2026-12 --json
 *   node scripts/ops/compare-dashboard-summary-ledgers.js --month=2026-05
 *
 * This script never writes to the database.
 */

require("dotenv").config({ path: "./.env" });

const { Client } = require("pg");

const DEFAULT_LIMIT = 24;
const OFF_FLOW_SOURCE_KINDS = [
    "payment_receipt_off_flow",
    "payment_receipt_excess",
    "off_flow_bank_receipt",
];

function parseArgs(argv) {
    const args = {
        from: null,
        to: null,
        month: null,
        json: false,
        limit: DEFAULT_LIMIT,
    };

    for (const rawArg of argv) {
        const arg = String(rawArg || "").trim();
        if (!arg) continue;

        if (arg === "--json") {
            args.json = true;
            continue;
        }

        const [key, value] = arg.split("=");
        if (!value) {
            throw new Error(`Invalid argument "${arg}". Expected --key=value or --json.`);
        }

        if (key === "--from") args.from = normalizeMonthKey(value, "from");
        else if (key === "--to") args.to = normalizeMonthKey(value, "to");
        else if (key === "--month") args.month = normalizeMonthKey(value, "month");
        else if (key === "--limit") args.limit = normalizeLimit(value);
        else throw new Error(`Unknown argument "${key}".`);
    }

    if (args.month) {
        args.from = args.month;
        args.to = args.month;
    }

    if (args.from && args.to && args.from > args.to) {
        throw new Error("--from must be less than or equal to --to.");
    }

    return args;
}

function normalizeMonthKey(value, name) {
    const monthKey = String(value || "").trim();
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
        throw new Error(`Invalid --${name}. Expected YYYY-MM, got "${value}".`);
    }

    const month = Number(monthKey.slice(5, 7));
    if (month < 1 || month > 12) {
        throw new Error(`Invalid --${name}. Month must be 01..12, got "${value}".`);
    }

    return monthKey;
}

function normalizeLimit(value) {
    const limit = Number.parseInt(value, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 240) {
        throw new Error(`Invalid --limit. Expected integer 1..240, got "${value}".`);
    }
    return limit;
}

function toNumber(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function buildSql(args) {
    const params = [];
    const where = [];

    if (args.from) {
        params.push(args.from);
        where.push(`month_key >= $${params.length}`);
    }

    if (args.to) {
        params.push(args.to);
        where.push(`month_key <= $${params.length}`);
    }

    params.push(args.limit);
    const limitParam = `$${params.length}`;

    const monthFilterSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    params.push(OFF_FLOW_SOURCE_KINDS);
    const offFlowKindsParam = `$${params.length}`;

    const sql = `
WITH selected_months AS (
  SELECT month_key
  FROM finance.dashboard_monthly_summary
  ${monthFilterSql}
  ORDER BY month_key DESC
  LIMIT ${limitParam}
),
dashboard AS (
  SELECT
    d.month_key,
    COALESCE(d.total_off_flow_bank_receipt, 0)::numeric AS dashboard_off_flow,
    COALESCE(d.estimated_bank_balance, 0)::numeric AS dashboard_bank_balance
  FROM finance.dashboard_monthly_summary d
  INNER JOIN selected_months sm ON sm.month_key = d.month_key
),
bank_ledger_monthly AS (
  SELECT
    to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month_key,
    COALESCE(SUM(signed_amount), 0)::numeric AS ledger_bank_delta
  FROM admin.shop_bank_account_ledger
  WHERE to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') IN (SELECT month_key FROM selected_months)
  GROUP BY 1
),
off_flow_ledger_monthly AS (
  SELECT
    to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month_key,
    COALESCE(SUM(signed_amount), 0)::numeric AS ledger_off_flow
  FROM admin.shop_bank_account_ledger
  WHERE source_kind = ANY(${offFlowKindsParam}::text[])
    AND signed_amount > 0
    AND to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') IN (SELECT month_key FROM selected_months)
  GROUP BY 1
)
SELECT
  d.month_key,
  d.dashboard_bank_balance,
  COALESCE(bl.ledger_bank_delta, 0)::numeric AS ledger_bank_delta,
  d.dashboard_bank_balance - COALESCE(bl.ledger_bank_delta, 0)::numeric AS bank_balance_diff,
  d.dashboard_off_flow,
  COALESCE(ofl.ledger_off_flow, 0)::numeric AS ledger_off_flow,
  d.dashboard_off_flow - COALESCE(ofl.ledger_off_flow, 0)::numeric AS off_flow_diff
FROM dashboard d
LEFT JOIN bank_ledger_monthly bl ON bl.month_key = d.month_key
LEFT JOIN off_flow_ledger_monthly ofl ON ofl.month_key = d.month_key
ORDER BY d.month_key DESC;
`;

    return { sql, params };
}

function formatMoney(value) {
    return Math.round(toNumber(value)).toLocaleString("vi-VN");
}

function formatReport(rows) {
    if (!rows.length) {
        return "No dashboard_monthly_summary rows matched the selected range.";
    }

    const lines = [];
    lines.push("Dashboard summary vs ledger reconciliation");
    lines.push("==========================================");
    lines.push("");

    for (const row of rows) {
        const bankDiff = toNumber(row.bank_balance_diff);
        const offFlowDiff = toNumber(row.off_flow_diff);
        const status = bankDiff === 0 && offFlowDiff === 0 ? "OK" : "DIFF";

        lines.push(`[${status}] ${row.month_key}`);
        lines.push(`  bank dashboard : ${formatMoney(row.dashboard_bank_balance)}`);
        lines.push(`  bank ledger    : ${formatMoney(row.ledger_bank_delta)}`);
        lines.push(`  bank diff      : ${formatMoney(bankDiff)}`);
        lines.push(`  off-flow dash  : ${formatMoney(row.dashboard_off_flow)}`);
        lines.push(`  off-flow ledger: ${formatMoney(row.ledger_off_flow)}`);
        lines.push(`  off-flow diff  : ${formatMoney(offFlowDiff)}`);
        lines.push("");
    }

    const diffCount = rows.filter(
        (row) => toNumber(row.bank_balance_diff) !== 0 || toNumber(row.off_flow_diff) !== 0
    ).length;

    lines.push(`Rows: ${rows.length}; differences: ${diffCount}.`);
    return lines.join("\n");
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("Missing DATABASE_URL");
    }

    const client = new Client({ connectionString });
    await client.connect();

    try {
        const { sql, params } = buildSql(args);
        const result = await client.query(sql, params);

        if (args.json) {
            console.log(JSON.stringify(result.rows, null, 2));
            return;
        }

        console.log(formatReport(result.rows));
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
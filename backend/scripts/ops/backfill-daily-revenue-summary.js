/**
 * CLI đồng bộ dashboard.daily_revenue_summary — wrapper quanh service.
 * @see ../../src/services/dashboard/dailyRevenueSummaryBackfill.js
 *
 * Usage (thư mục backend):
 *   node scripts/ops/backfill-daily-revenue-summary.js
 *   node scripts/ops/backfill-daily-revenue-summary.js --from=2026-04-22 --to=2026-05-02 --import-spread-days=30
 *   npm run sync:daily-revenue-summary -- --from=2026-04-22 --to=2026-05-02
 */

const { db } = require("../../src/db");
const {
  runDailyRevenueSummaryBackfill,
} = require("../../src/services/dashboard/dailyRevenueSummaryBackfill");

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

async function main() {
  const {
    from: fromArg,
    to: toArg,
    taxFrom: taxFromArg,
    importSpreadDays: importSpreadDaysArg,
  } = parseArgs(process.argv.slice(2));

  const parsedSpread = Number(importSpreadDaysArg);
  const importSpreadDaysResolved =
    importSpreadDaysArg != null &&
    importSpreadDaysArg !== "" &&
    Number.isFinite(parsedSpread) &&
    parsedSpread >= 1
      ? Math.floor(parsedSpread)
      : undefined;

  console.log("[daily-revenue-summary] Backfill (CLI)", {
    from: fromArg || "(default ngày 22 rolling)",
    to: toArg || "(hôm nay VN)",
    taxFrom: taxFromArg || "(default tax-from)",
    importSpreadDays: importSpreadDaysResolved ?? "(default 30)",
  });

  await runDailyRevenueSummaryBackfill({
    from: fromArg || undefined,
    to: toArg || undefined,
    taxFrom: taxFromArg || undefined,
    importSpreadDays: importSpreadDaysResolved,
    closeKnex: true,
  });

  console.log("[daily-revenue-summary] Xong.");
}

if (require.main === module) {
  main().catch((e) => {
    console.error("[daily-revenue-summary]", e.message);
    process.exitCode = 1;
    db.destroy().catch(() => {});
  });
}

module.exports = { main };

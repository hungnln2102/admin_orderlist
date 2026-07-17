/**
 * Backfill payment slot cho đơn Chưa TT / Cần GH chưa có slot pending.
 *
 * Usage (từ thư mục backend):
 *   node scripts/ops/backfill-payment-slots.js --dry-run
 *   node scripts/ops/backfill-payment-slots.js
 *   node scripts/ops/backfill-payment-slots.js --order=MAVCHMB3R
 *   node scripts/ops/backfill-payment-slots.js --limit=100
 *
 * @see ../../src/domains/payment-slots/use-cases/backfillPendingPaymentSlots.js
 * @see ../../docs/payment-slot-suffix-matching.md
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { db } = require("@/db");
const {
  backfillPendingPaymentSlots,
} = require("@/domains/payment-slots/use-cases/backfillPendingPaymentSlots");

function parseArgs(argv) {
  let dryRun = false;
  let limit = undefined;
  let orderCode = undefined;

  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    if (arg.startsWith("--limit=")) limit = arg.slice(8).trim();
    if (arg.startsWith("--order=")) orderCode = arg.slice(8).trim();
  }

  return { dryRun, limit, orderCode };
}

async function main() {
  const { dryRun, limit, orderCode } = parseArgs(process.argv.slice(2));

  console.log("[backfill-payment-slots] Bắt đầu", {
    dryRun,
    limit: limit || "(default 500)",
    orderCode: orderCode || "(tất cả đơn eligible)",
  });

  const summary = await backfillPendingPaymentSlots({
    dryRun,
    limit,
    orderCode,
  });

  console.log("[backfill-payment-slots] Kết quả", {
    dryRun: summary.dryRun,
    receiverAccount: summary.receiverAccount,
    scanned: summary.scanned,
    opened: summary.opened,
    skipped: summary.skipped,
    failed: summary.failed,
  });

  if (summary.samples.length > 0) {
    console.log("[backfill-payment-slots] Mẫu (tối đa 20 dòng đầu):");
    for (const row of summary.samples) {
      console.log(" ", JSON.stringify(row));
    }
  }

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("[backfill-payment-slots] Lỗi:", err.message);
    console.error(err.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.destroy();
    } catch {
      // ignore pool shutdown errors
    }
  });

/**
 * Backfill suffix thanh toán cho đơn Cần Gia Hạn (RENEWAL):
 * - Sync order_list.price từ slot pending nếu lệch
 * - Mở slot renewal mới nếu chưa có
 *
 * Usage (từ thư mục backend):
 *   npm run backfill:renewal-payment-slots -- --dry-run
 *   npm run backfill:renewal-payment-slots
 *   npm run backfill:renewal-payment-slots -- --order=MAVLP63Y
 *   npm run backfill:renewal-payment-slots -- --limit=100
 *
 * Trên VPS (docker):
 *   docker compose exec backend npm run backfill:renewal-payment-slots -- --dry-run
 *   docker compose exec backend npm run backfill:renewal-payment-slots -- --order=MAVLP63Y
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { db } = require("@/db");
const {
  backfillRenewalPaymentSuffix,
} = require("@/domains/payment-slots/use-cases/backfillRenewalPaymentSuffix");

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

  console.log("[backfill-renewal-payment-slots] Bắt đầu", {
    dryRun,
    limit: limit || "(default 500)",
    orderCode: orderCode || "(tất cả đơn Cần Gia Hạn)",
  });

  const summary = await backfillRenewalPaymentSuffix({
    dryRun,
    limit,
    orderCode,
  });

  console.log("[backfill-renewal-payment-slots] Kết quả", {
    dryRun: summary.dryRun,
    receiverAccount: summary.receiverAccount,
    scanned: summary.scanned,
    opened: summary.opened,
    synced: summary.synced,
    skipped: summary.skipped,
    failed: summary.failed,
  });

  if (summary.samples.length > 0) {
    console.log("[backfill-renewal-payment-slots] Mẫu (tối đa 30 dòng đầu):");
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
    console.error("[backfill-renewal-payment-slots] Lỗi:", err.message);
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

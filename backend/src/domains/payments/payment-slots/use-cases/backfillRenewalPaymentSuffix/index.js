/**
 * Backfill đơn Cần Gia Hạn thiếu suffix thanh toán:
 * - Có slot pending nhưng order_list.price chưa khớp → sync giá từ slot
 * - Chưa có slot pending → mở slot renewal + cập nhật price
 */

const { pool } = require("@/config/database");
const logger = require("@/utils/logger");
const { resolveDefaultShopBankAccount } = require("@/services/shopBankAccountResolver");
const { fetchRenewalSuffixCandidates } = require("@/domains/payment-slots/use-cases/backfillRenewalPaymentSuffix/fetchCandidates");
const { reconcileSingleRenewalOrder } = require("@/domains/payment-slots/use-cases/backfillRenewalPaymentSuffix/reconcileSingle");

/**
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false]
 * @param {number|string} [options.limit=500]
 * @param {string} [options.orderCode]
 */
async function backfillRenewalPaymentSuffix(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const limit = options.limit;
  const orderCode = options.orderCode;

  const defaultBank = await resolveDefaultShopBankAccount();
  const receiverAccount = String(defaultBank?.accountNumber || "").trim();
  if (!receiverAccount) {
    throw new Error(
      "Chưa cấu hình STK shop mặc định — không thể backfill renewal payment suffix."
    );
  }

  const client = await pool.connect();
  const summary = {
    dryRun,
    receiverAccount,
    scanned: 0,
    opened: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
    samples: [],
  };

  try {
    await client.query("BEGIN");

    const candidates = await fetchRenewalSuffixCandidates(client, {
      limit,
      orderCode,
    });
    summary.scanned = candidates.length;

    for (const row of candidates) {
      const result = await reconcileSingleRenewalOrder(client, row, receiverAccount, {
        dryRun,
      });

      if (result.outcome === "failed") {
        summary.failed += 1;
      } else if (
        result.outcome === "opened" ||
        (result.outcome === "dry_run" && result.action === "open_slot")
      ) {
        summary.opened += 1;
      } else if (
        result.outcome === "synced" ||
        (result.outcome === "dry_run" && result.action === "sync_price")
      ) {
        summary.synced += 1;
      } else {
        summary.skipped += 1;
      }

      if (summary.samples.length < 30) {
        summary.samples.push(result);
      }
    }

    if (dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    logger.info("[PaymentSlot][BackfillRenewal] done", {
      dryRun,
      scanned: summary.scanned,
      opened: summary.opened,
      synced: summary.synced,
      skipped: summary.skipped,
      failed: summary.failed,
      orderCode: orderCode || null,
    });

    return summary;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  backfillRenewalPaymentSuffix,
};

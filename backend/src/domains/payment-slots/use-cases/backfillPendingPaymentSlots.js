/**
 * Backfill payment slot cho đơn Chưa TT / Cần GH chưa có slot pending.
 * Mỗi đơn: mở slot → cập nhật order_list.price = expected_amount (QR/Telegram/webhook khớp suffix).
 */

const { pool } = require("../../../config/database");
const { STATUS } = require("../../../utils/statuses");
const { ORDERS_SCHEMA } = require("../../../config/dbSchema");
const { isMavnImportOrder } = require("../../../utils/orderHelpers");
const logger = require("../../../utils/logger");
const { resolveDefaultShopBankAccount } = require("../../../services/shopBankAccountResolver");
const { computeOrderCurrentPrice } = require("../../../../webhook/sepay/renewalPricing");
const { openPaymentSlot } = require("./openPaymentSlot");
const { SLOT_KIND } = require("../constants");
const { findLatestPendingSlotByOrder } = require("../repositories/paymentSlotRepository");
const { SLOTS_TABLE, SLOT_COLS, SLOT_STATUS } = require("../constants");
const { deriveUnpaidBaseAmount } = require("./backfill/deriveUnpaidBaseAmount");

const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const ORDER_TABLE = `orders.${ORDERS_SCHEMA.ORDER_LIST.TABLE}`;

const DEFAULT_BATCH_LIMIT = 500;

const normalizeLimit = (value) => {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(num) || num <= 0) return DEFAULT_BATCH_LIMIT;
  return Math.min(num, 5000);
};

const buildOrderRowForPricing = (row) => ({
  [ORDER_COLS.ID_ORDER]: row.id_order,
  [ORDER_COLS.ID_PRODUCT]: row.id_product,
  [ORDER_COLS.ID_SUPPLY]: row.id_supply,
  [ORDER_COLS.COST]: row.cost,
  [ORDER_COLS.PRICE]: row.price,
});

async function fetchCandidateOrders(client, { limit, orderCode }) {
  const statusList = [STATUS.UNPAID, STATUS.RENEWAL];
  const params = [statusList];
  let orderFilter = "";
  const code = String(orderCode || "").trim();
  if (code) {
    params.push(code);
    orderFilter = `AND LOWER(TRIM(o.${ORDER_COLS.ID_ORDER}::text)) = LOWER($${params.length})`;
  }

  params.push(normalizeLimit(limit));

  const sql = `
    SELECT
      o.${ORDER_COLS.ID_ORDER} AS id_order,
      o.${ORDER_COLS.STATUS} AS status,
      o.${ORDER_COLS.PRICE}::numeric AS price,
      o.${ORDER_COLS.ID_PRODUCT} AS id_product,
      o.${ORDER_COLS.ID_SUPPLY} AS id_supply,
      o.${ORDER_COLS.COST}::numeric AS cost
    FROM ${ORDER_TABLE} o
    WHERE o.${ORDER_COLS.STATUS} = ANY($1::text[])
      AND COALESCE(o.${ORDER_COLS.PRICE}::numeric, 0) > 0
      AND UPPER(TRIM(o.${ORDER_COLS.ID_ORDER}::text)) NOT LIKE 'MAVN%'
      ${orderFilter}
      AND NOT EXISTS (
        SELECT 1
        FROM ${SLOTS_TABLE} s
        WHERE s.${SLOT_COLS.ID_ORDER} = o.${ORDER_COLS.ID_ORDER}
          AND s.${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
      )
    ORDER BY o.${ORDER_COLS.ID_ORDER}
    LIMIT $${params.length}
  `;

  const { rows } = await client.query(sql, params);
  return rows || [];
}

async function resolveBaseAmountAndKind(client, row) {
  const status = String(row.status || "").trim();
  const orderCode = String(row.id_order || "").trim();

  if (isMavnImportOrder({ id_order: orderCode })) {
    return { skip: true, reason: "skip_mavn_import" };
  }

  if (status === STATUS.RENEWAL) {
    const computed = await computeOrderCurrentPrice(client, buildOrderRowForPricing(row));
    const baseAmount = Number(computed?.price);
    if (!(baseAmount > 0)) {
      return { skip: true, reason: "invalid_renewal_base" };
    }
    return { baseAmount, slotKind: SLOT_KIND.RENEWAL };
  }

  if (status === STATUS.UNPAID) {
    const baseAmount = deriveUnpaidBaseAmount(row.price);
    if (!(baseAmount > 0)) {
      return { skip: true, reason: "invalid_unpaid_base" };
    }
    return { baseAmount, slotKind: SLOT_KIND.NEW };
  }

  return { skip: true, reason: "unsupported_status" };
}

async function backfillSingleOrder(client, row, receiverAccount, { dryRun }) {
  const orderCode = String(row.id_order || "").trim();
  if (!orderCode) {
    return { orderCode: "", outcome: "skipped", reason: "missing_order_code" };
  }

  const existingPending = await findLatestPendingSlotByOrder(client, orderCode);
  if (existingPending) {
    return { orderCode, outcome: "skipped", reason: "already_has_pending_slot" };
  }

  const resolved = await resolveBaseAmountAndKind(client, row);
  if (resolved.skip) {
    return { orderCode, outcome: "skipped", reason: resolved.reason };
  }

  const { baseAmount, slotKind } = resolved;

  if (dryRun) {
    return {
      orderCode,
      outcome: "dry_run",
      status: row.status,
      baseAmount,
      slotKind,
      storedPrice: Number(row.price) || 0,
    };
  }

  const savepoint = `bf_slot_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const slot = await openPaymentSlot(client, {
      orderCode,
      receiverAccount,
      baseAmount,
      slotKind,
      supersedeReason: "backfill_pending_payment_slots",
    });
    const expectedAmount = Number(slot.expected_amount);

    await client.query(
      `UPDATE ${ORDER_TABLE}
       SET ${ORDER_COLS.PRICE} = $1
       WHERE ${ORDER_COLS.ID_ORDER} = $2`,
      [expectedAmount, orderCode]
    );

    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return {
      orderCode,
      outcome: "opened",
      status: row.status,
      baseAmount,
      slotKind,
      suffix: Number(slot.amount_suffix) || 0,
      expectedAmount,
      previousPrice: Number(row.price) || 0,
    };
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`).catch(() => {});
    logger.error("[PaymentSlot][Backfill] failed", {
      orderCode,
      error: err.message,
      stack: err.stack,
    });
    return {
      orderCode,
      outcome: "failed",
      reason: err.message || "exception",
    };
  }
}

/**
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false]
 * @param {number|string} [options.limit=500]
 * @param {string} [options.orderCode] - chỉ backfill một mã đơn (smoke test)
 * @returns {Promise<object>}
 */
async function backfillPendingPaymentSlots(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const limit = options.limit;
  const orderCode = options.orderCode;

  const defaultBank = await resolveDefaultShopBankAccount();
  const receiverAccount = String(defaultBank?.accountNumber || "").trim();
  if (!receiverAccount) {
    throw new Error(
      "Chưa cấu hình STK shop mặc định — không thể backfill payment slot."
    );
  }

  const client = await pool.connect();
  const summary = {
    dryRun,
    receiverAccount,
    scanned: 0,
    opened: 0,
    skipped: 0,
    failed: 0,
    samples: [],
  };

  try {
    await client.query("BEGIN");

    const candidates = await fetchCandidateOrders(client, { limit, orderCode });
    summary.scanned = candidates.length;

    for (const row of candidates) {
      const result = await backfillSingleOrder(client, row, receiverAccount, {
        dryRun,
      });

      if (result.outcome === "opened" || result.outcome === "dry_run") {
        summary.opened += 1;
      } else if (result.outcome === "failed") {
        summary.failed += 1;
      } else {
        summary.skipped += 1;
      }

      if (summary.samples.length < 20) {
        summary.samples.push(result);
      }
    }

    if (dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    logger.info("[PaymentSlot][Backfill] done", {
      dryRun,
      scanned: summary.scanned,
      opened: summary.opened,
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
  backfillPendingPaymentSlots,
  deriveUnpaidBaseAmount,
};

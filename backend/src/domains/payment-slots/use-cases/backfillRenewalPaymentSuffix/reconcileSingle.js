const { ORDERS_SCHEMA } = require("../../../../config/dbSchema");
const { isMavnImportOrder } = require("../../../../utils/orderHelpers");
const logger = require("../../../../utils/logger");
const { computeOrderCurrentPrice } = require("../../../../../webhook/sepay/renewalPricing");
const { openPaymentSlot } = require("../openPaymentSlot");
const { SLOT_KIND } = require("../../constants");
const { hasPaymentSuffix } = require("../../helpers/paymentSuffix");

const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const ORDER_TABLE = `orders.${ORDERS_SCHEMA.ORDER_LIST.TABLE}`;

const buildOrderRowForPricing = (row) => ({
  [ORDER_COLS.ID_ORDER]: row.id_order,
  [ORDER_COLS.ID_PRODUCT]: row.id_product,
  [ORDER_COLS.ID_SUPPLY]: row.id_supply,
  [ORDER_COLS.COST]: row.cost,
  [ORDER_COLS.PRICE]: row.price,
});

/**
 * @returns {'sync'|'open'|null}
 */
function resolveAction(row, baseAmount) {
  const storedPrice = Number(row.price) || 0;
  const slotExpected = Number(row.slot_expected_amount) || 0;

  if (row.slot_id && slotExpected > 0) {
    return storedPrice === slotExpected ? null : "sync";
  }

  if (hasPaymentSuffix(storedPrice, baseAmount)) {
    return null;
  }

  if (baseAmount > 0) {
    return "open";
  }

  return null;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {object} row
 * @param {string} receiverAccount
 * @param {{ dryRun: boolean }} options
 */
async function reconcileSingleRenewalOrder(client, row, receiverAccount, options) {
  const dryRun = Boolean(options?.dryRun);
  const orderCode = String(row?.id_order || "").trim();
  if (!orderCode) {
    return { orderCode: "", outcome: "skipped", reason: "missing_order_code" };
  }

  if (isMavnImportOrder({ id_order: orderCode })) {
    return { orderCode, outcome: "skipped", reason: "skip_mavn_import" };
  }

  const computed = await computeOrderCurrentPrice(client, buildOrderRowForPricing(row));
  const baseAmount = Number(computed?.price) || 0;
  const action = resolveAction(row, baseAmount);

  if (!action) {
    if (row.slot_id && Number(row.slot_expected_amount) > 0) {
      return {
        orderCode,
        outcome: "skipped",
        reason: "already_synced",
        storedPrice: Number(row.price) || 0,
        expectedAmount: Number(row.slot_expected_amount) || 0,
      };
    }
    if (hasPaymentSuffix(Number(row.price), baseAmount)) {
      return {
        orderCode,
        outcome: "skipped",
        reason: "price_has_suffix_without_slot",
        storedPrice: Number(row.price) || 0,
        baseAmount,
      };
    }
    return {
      orderCode,
      outcome: "skipped",
      reason: "invalid_renewal_base",
      baseAmount,
    };
  }

  if (action === "sync") {
    const expectedAmount = Number(row.slot_expected_amount);
    const previousPrice = Number(row.price) || 0;
    if (dryRun) {
      return {
        orderCode,
        outcome: "dry_run",
        action: "sync_price",
        baseAmount,
        previousPrice,
        expectedAmount,
        suffix: Number(row.slot_amount_suffix) || 0,
      };
    }

    await client.query(
      `UPDATE ${ORDER_TABLE}
       SET ${ORDER_COLS.PRICE} = $1
       WHERE ${ORDER_COLS.ID_ORDER} = $2`,
      [expectedAmount, orderCode]
    );

    return {
      orderCode,
      outcome: "synced",
      action: "sync_price",
      baseAmount,
      previousPrice,
      expectedAmount,
      suffix: Number(row.slot_amount_suffix) || 0,
    };
  }

  if (!(baseAmount > 0)) {
    return { orderCode, outcome: "skipped", reason: "invalid_renewal_base" };
  }

  if (dryRun) {
    return {
      orderCode,
      outcome: "dry_run",
      action: "open_slot",
      baseAmount,
      storedPrice: Number(row.price) || 0,
    };
  }

  const savepoint = `bf_renewal_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const slot = await openPaymentSlot(client, {
      orderCode,
      receiverAccount,
      baseAmount,
      slotKind: SLOT_KIND.RENEWAL,
      supersedeReason: "backfill_renewal_payment_suffix",
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
      action: "open_slot",
      baseAmount,
      suffix: Number(slot.amount_suffix) || 0,
      expectedAmount,
      previousPrice: Number(row.price) || 0,
    };
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`).catch(() => {});
    logger.error("[PaymentSlot][BackfillRenewal] failed", {
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

module.exports = {
  reconcileSingleRenewalOrder,
  resolveAction,
};

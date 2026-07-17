/**
 * Helper dùng chung cho scheduler: sau khi đơn được chuyển sang `Cần Gia Hạn`,
 * mở 1 payment slot mới cho từng đơn (recompute giá từ bảng giá → cộng suffix)
 * và mirror `expected_amount` vào `order_list.price` để QR/Telegram hiển thị
 * đúng số khách cần CK.
 *
 * Mỗi đơn chạy trong savepoint riêng — lỗi slot không vỡ cả batch.
 */

const logger = require("@/utils/logger");
const {
  openPaymentSlot,
  SLOT_KIND,
} = require("@/domains/payment-slots");
const {
  resolveDefaultShopBankAccount,
} = require("@/services/shopBankAccountResolver");
const {
  computeOrderCurrentPrice,
} = require("../../../../webhook/sepay/renewalPricing");
const { ORDERS_SCHEMA } = require("@/config/dbSchema");
const { isMavnImportOrder } = require("@/utils/orderHelpers");

const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const ORDER_TABLE_NAME = ORDERS_SCHEMA.ORDER_LIST.TABLE;
const ORDER_TABLE_FQ = `orders.${ORDER_TABLE_NAME}`;

/**
 * Mở renewal slot cho 1 đơn duy nhất trong savepoint riêng.
 * @returns {Promise<{ok: boolean, expectedAmount?: number, reason?: string}>}
 */
async function openSingleRenewalSlot(client, row, receiverAccount) {
  const orderCode = String(row?.id_order || "").trim();
  if (!orderCode) {
    return { ok: false, reason: "missing_order_code" };
  }

  if (isMavnImportOrder({ id_order: orderCode })) {
    return { ok: false, reason: "skip_mavn_import" };
  }

  const savepoint = `renewal_slot_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    // Map row sang shape mà computeOrderCurrentPrice mong đợi (dùng key DB col).
    const orderRowForPricing = {
      [ORDER_COLS.ID_ORDER]: orderCode,
      [ORDER_COLS.ID_PRODUCT]: row.id_product,
      [ORDER_COLS.ID_SUPPLY]: row.supply_id,
      [ORDER_COLS.COST]: row.cost,
      [ORDER_COLS.PRICE]: row.price,
    };
    const computed = await computeOrderCurrentPrice(client, orderRowForPricing);
    const baseAmount = Number(computed?.price);
    if (!(baseAmount > 0)) {
      await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      return { ok: false, reason: "invalid_base_amount" };
    }

    const slot = await openPaymentSlot(client, {
      orderCode,
      receiverAccount,
      baseAmount,
      slotKind: SLOT_KIND.RENEWAL,
    });
    const expectedAmount = Number(slot.expected_amount);

    await client.query(
      `UPDATE ${ORDER_TABLE_FQ} SET ${ORDER_COLS.PRICE} = $1 WHERE ${ORDER_COLS.ID_ORDER} = $2`,
      [expectedAmount, orderCode]
    );

    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return { ok: true, expectedAmount };
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`).catch(() => {});
    logger.error("[Renewal][SlotOpen] failed", {
      orderCode,
      error: err.message,
      stack: err.stack,
    });
    return { ok: false, reason: "exception" };
  }
}

/**
 * Mở slot cho mảng đơn vừa flip sang RENEWAL.
 * @param {import('pg').PoolClient} client - client đã COMMIT batch flip status
 * @param {Array<object>} rows - rows trả về từ RETURNING clause (cần id_order, id_product, supply_id, cost, price)
 */
async function openRenewalSlotsForFlippedOrders(client, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  let defaultBank;
  try {
    defaultBank = await resolveDefaultShopBankAccount();
  } catch (bankErr) {
    logger.error("[Renewal][SlotOpen] resolveDefaultShopBankAccount failed", {
      error: bankErr.message,
    });
    return;
  }

  const receiverAccount = String(defaultBank?.accountNumber || "").trim();
  if (!receiverAccount) {
    logger.warn(
      "[Renewal][SlotOpen] Chưa cấu hình STK shop mặc định — bỏ qua mở slot cho batch",
      { ordersCount: rows.length }
    );
    return;
  }

  // Wrap toàn batch trong transaction riêng — slot opening cần BEGIN/COMMIT.
  await client.query("BEGIN");
  const counters = { ok: 0, skipped: 0, failed: 0 };
  try {
    for (const row of rows) {
      const result = await openSingleRenewalSlot(client, row, receiverAccount);
      if (result.ok) counters.ok += 1;
      else if (result.reason === "exception") counters.failed += 1;
      else counters.skipped += 1;
    }
    await client.query("COMMIT");
  } catch (batchErr) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error("[Renewal][SlotOpen] batch transaction failed", {
      error: batchErr.message,
    });
    return;
  }

  logger.info("[Renewal][SlotOpen] batch done", {
    total: rows.length,
    opened: counters.ok,
    skipped: counters.skipped,
    failed: counters.failed,
    receiverAccount,
  });
}

module.exports = {
  openRenewalSlotsForFlippedOrders,
  openSingleRenewalSlot,
};

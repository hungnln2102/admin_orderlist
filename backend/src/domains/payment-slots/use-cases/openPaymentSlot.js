/**
 * Mở 1 slot thanh toán cho đơn — đơn mới (kind='new') hoặc gia hạn (kind='renewal').
 *
 * Quy tắc:
 *  - Huỷ mọi pending slot hiện tại của đơn (supersede).
 *  - Cấp suffix luân phiên từ sequence, retry nếu trùng (receiver, expected_amount).
 *  - Trả về row slot mới với `expected_amount = base_amount + amount_suffix`.
 *
 * Caller chịu trách nhiệm transaction; nên mở trong cùng transaction với
 * UPDATE order_list.price = slot.expected_amount để đảm bảo nhất quán.
 */

const {
  SLOT_KIND,
  MAX_SUFFIX_ATTEMPTS,
} = require("@/domains/payment-slots/constants");
const repo = require("@/domains/payment-slots/repositories/paymentSlotRepository");
const {
  normalizeAccount,
  normalizeExactAmount,
} = require("@/domains/payment-slots/helpers/paymentSlotInputs");
const logger = require("@/utils/logger");

const VALID_KINDS = new Set([SLOT_KIND.NEW, SLOT_KIND.RENEWAL]);


const normalizeOrderCode = (value) =>
  String(value ?? "").trim();

/**
 * @param {import('pg').PoolClient | import('knex').Knex.Transaction} executor
 * @param {object} params
 * @param {string} params.orderCode
 * @param {string} params.receiverAccount
 * @param {number} params.baseAmount  - giá gốc trước khi cộng suffix
 * @param {'new'|'renewal'} params.slotKind
 * @param {string} [params.supersedeReason] - lý do huỷ pending cũ (default theo kind)
 * @returns {Promise<object>} slot row mới
 */
async function openPaymentSlot(executor, params) {
  const orderCode = normalizeOrderCode(params.orderCode);
  const receiverAccount = normalizeAccount(params.receiverAccount);
  const baseAmount = normalizeExactAmount(params.baseAmount);
  const slotKind = String(params.slotKind || "").trim();

  if (!orderCode) {
    throw new Error("openPaymentSlot: orderCode is required");
  }
  if (!receiverAccount) {
    throw new Error("openPaymentSlot: receiverAccount is required");
  }
  if (!VALID_KINDS.has(slotKind)) {
    throw new Error(`openPaymentSlot: slotKind must be 'new' or 'renewal' (got '${slotKind}')`);
  }
  if (!(baseAmount > 0)) {
    throw new Error(
      `openPaymentSlot: baseAmount must be > 0 (got ${baseAmount}) for order ${orderCode}`
    );
  }

  // Lock theo đơn để tránh hai luồng mở slot cùng lúc.
  await repo.acquireOrderAdvisoryLock(executor, orderCode);

  const supersedeReason =
    params.supersedeReason ||
    (slotKind === SLOT_KIND.RENEWAL
      ? "superseded_by_renewal_cycle"
      : "superseded_by_new_slot");
  await repo.cancelPendingSlotsForOrder(executor, orderCode, supersedeReason);

  const cycleIndex = await repo.fetchNextCycleIndex(executor, orderCode);

  const triedSuffixes = new Set();
  let lastErr = null;
  for (let attempt = 0; attempt < MAX_SUFFIX_ATTEMPTS; attempt += 1) {
    const suffix = await repo.fetchNextAvailableSuffix(executor, {
      receiverAccount,
      baseAmount,
    });
    if (!(suffix > 0)) {
      break;
    }
    triedSuffixes.add(suffix);

    const expectedAmount = baseAmount + suffix;
    try {
      const slot = await repo.insertSlot(executor, {
        orderCode,
        receiverAccount,
        cycleIndex,
        slotKind,
        baseAmount,
        amountSuffix: suffix,
        expectedAmount,
      });
      if (slot) {
        logger.info("[PaymentSlot] opened", {
          orderCode,
          cycleIndex: slot.cycle_index,
          slotKind: slot.slot_kind,
          suffix: slot.amount_suffix,
          baseAmount: Number(slot.base_amount),
          expectedAmount: Number(slot.expected_amount),
        });
        return slot;
      }
    } catch (err) {
      lastErr = err;
      throw err;
    }
  }

  const exhaustedMsg =
    `[PaymentSlot] Hết suffix khả dụng cho đơn ${orderCode} ` +
    `(receiver=${receiverAccount}, base=${baseAmount}). ` +
    `Tăng MAXVALUE của payment_amount_suffix_seq hoặc gỡ slot pending cũ.`;
  logger.error(exhaustedMsg, {
    triedSuffixes: Array.from(triedSuffixes).sort((a, b) => a - b),
    lastErr: lastErr && lastErr.message,
  });
  throw new Error(exhaustedMsg);
}

module.exports = { openPaymentSlot };

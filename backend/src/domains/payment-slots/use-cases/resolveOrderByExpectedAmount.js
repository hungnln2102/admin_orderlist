/**
 * Tra slot pending theo (receiver_account, expected_amount) để resolve `id_order`
 * trong webhook khi không có (hoặc không cần) nội dung CK.
 *
 * Hàm dùng FOR UPDATE SKIP LOCKED — caller phải nằm trong transaction để
 * lock được duy trì đến khi markSlotMatched.
 */

const repo = require("../repositories/paymentSlotRepository");

const normalizeAccount = (value) =>
  String(value ?? "").replace(/\s+/g, "").trim();

const normalizeMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num;
};

/**
 * @param {import('pg').PoolClient | import('knex').Knex.Transaction} executor
 * @param {object} params
 * @param {string} params.receiverAccount
 * @param {number} params.amount
 * @returns {Promise<{slot: object|null, orderCode: string|null}>}
 */
async function resolveOrderByExpectedAmount(executor, params) {
  const receiverAccount = normalizeAccount(params?.receiverAccount);
  const amount = normalizeMoney(params?.amount);

  if (!receiverAccount || !(amount > 0)) {
    return { slot: null, orderCode: null };
  }

  const slot = await repo.findPendingSlotByAmount(executor, {
    receiverAccount,
    expectedAmount: amount,
  });

  if (!slot) return { slot: null, orderCode: null };

  return {
    slot,
    orderCode: String(slot.id_order || "").trim(),
  };
}

module.exports = { resolveOrderByExpectedAmount };

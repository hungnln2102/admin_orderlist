/**
 * Đảm bảo đơn có mã transaction (nội dung CK) trước khi hiển thị QR / gửi Telegram.
 * Đơn cũ (transaction NULL) được sinh mã và lưu DB một lần.
 */

const { db } = require("../../../db");
const { TABLES, COLS } = require("../controller/constants");
const { generateUniqueTransactionCode } = require("../../../services/transactionCodeService");
const { isMavnImportOrder } = require("../../../utils/orderHelpers");

const normalizeExistingTransaction = (value) => {
  const text = String(value ?? "").trim().toUpperCase();
  return text || null;
};

const loadOrderRow = async (executor, { orderListId, idOrder }) => {
  const idCol = COLS.ORDER.ID;
  const idOrderCol = COLS.ORDER.ID_ORDER;
  const transactionCol = COLS.ORDER.TRANSACTION;

  if (Number.isFinite(orderListId) && orderListId > 0) {
    return executor(TABLES.orderList)
      .select(idCol, idOrderCol, transactionCol)
      .where(idCol, orderListId)
      .first();
  }

  const code = String(idOrder || "").trim();
  if (!code) return null;

  return executor(TABLES.orderList)
    .select(idCol, idOrderCol, transactionCol)
    .whereRaw(`LOWER(TRIM(??::text)) = LOWER(?)`, [idOrderCol, code])
    .first();
};

/**
 * @param {{ orderListId?: number, idOrder?: string, order?: object, trx?: import("knex").Knex.Transaction }} input
 * @returns {Promise<{ orderListId: number, idOrder: string, transaction: string, created: boolean }>}
 */
async function ensureOrderTransaction(input = {}) {
  const executor = input.trx || db;
  const manageTrx = !input.trx;
  const trx = manageTrx ? await db.transaction() : executor;

  try {
    const row =
      input.order && typeof input.order === "object"
        ? {
            [COLS.ORDER.ID]: input.order[COLS.ORDER.ID] ?? input.order.id,
            [COLS.ORDER.ID_ORDER]:
              input.order[COLS.ORDER.ID_ORDER] ?? input.order.id_order,
            [COLS.ORDER.TRANSACTION]:
              input.order[COLS.ORDER.TRANSACTION] ?? input.order.transaction,
          }
        : await loadOrderRow(trx, {
            orderListId: Number(input.orderListId),
            idOrder: input.idOrder,
          });

    if (!row) {
      const error = new Error("Không tìm thấy đơn hàng.");
      error.status = 404;
      throw error;
    }

    const orderListId = Number(row[COLS.ORDER.ID]);
    const idOrder = String(row[COLS.ORDER.ID_ORDER] || "").trim();

    if (isMavnImportOrder({ id_order: idOrder })) {
      const error = new Error("Đơn nhập hàng MAVN không dùng mã transaction CK shop.");
      error.status = 400;
      throw error;
    }

    const existing = normalizeExistingTransaction(row[COLS.ORDER.TRANSACTION]);
    if (existing) {
      if (manageTrx) await trx.commit();
      return {
        orderListId,
        idOrder,
        transaction: existing,
        created: false,
      };
    }

    const transaction = await generateUniqueTransactionCode(trx);
    await trx(TABLES.orderList)
      .where(COLS.ORDER.ID, orderListId)
      .update({ [COLS.ORDER.TRANSACTION]: transaction });

    if (manageTrx) await trx.commit();

    return {
      orderListId,
      idOrder,
      transaction,
      created: true,
    };
  } catch (error) {
    if (manageTrx) await trx.rollback();
    throw error;
  }
}

module.exports = { ensureOrderTransaction };

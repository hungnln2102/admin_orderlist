/**
 * Legacy endpoint: trước đây sinh mã transaction (nội dung CK).
 * Từ khi dùng payment slot (suffix trên số tiền), không còn tạo / trả mã transaction.
 */

const { db } = require("@/db");
const { TABLES, COLS } = require("@/domains/orders/controller/constants");
const { isMavnImportOrder } = require("@/utils/orderHelpers");

const loadOrderRow = async (executor, { orderListId, idOrder }) => {
  const idCol = COLS.ORDER.ID;
  const idOrderCol = COLS.ORDER.ID_ORDER;

  if (Number.isFinite(orderListId) && orderListId > 0) {
    return executor(TABLES.orderList)
      .select(idCol, idOrderCol)
      .where(idCol, orderListId)
      .first();
  }

  const code = String(idOrder || "").trim();
  if (!code) return null;

  return executor(TABLES.orderList)
    .select(idCol, idOrderCol)
    .whereRaw(`LOWER(TRIM(??::text)) = LOWER(?)`, [idOrderCol, code])
    .first();
};

/**
 * @param {{ orderListId?: number, idOrder?: string, order?: object, trx?: import("knex").Knex.Transaction }} input
 * @returns {Promise<{ orderListId: number, idOrder: string, transaction: string, created: boolean }>}
 */
async function ensureOrderTransaction(input = {}) {
  const executor = input.trx || db;

  const row =
    input.order && typeof input.order === "object"
      ? {
          [COLS.ORDER.ID]: input.order[COLS.ORDER.ID] ?? input.order.id,
          [COLS.ORDER.ID_ORDER]:
            input.order[COLS.ORDER.ID_ORDER] ?? input.order.id_order,
        }
      : await loadOrderRow(executor, {
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

  return {
    orderListId,
    idOrder,
    transaction: "",
    created: false,
  };
}

module.exports = { ensureOrderTransaction };

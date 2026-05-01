const { db } = require("../../../db");
const { TABLES } = require("../constants");
const { ORDERS_SCHEMA } = require("../../../config/dbSchema");
const { isMavnImportOrder } = require("../../../utils/orderHelpers");
const { syncMavnStoreProfitExpense } = require("./mavnStoreExpenseSync");

/**
 * Đơn nhập MAVN từng vào Đang xử lý (PROCESSING) do renewal cũ — không có bank/webhook.
 * Chuyển PAID và chỉ áp dụng logic MAVN (trừ LN qua sync), không tạo receipt / không cộng DT.
 */
async function completeMavnProcessingOrderPaidWithoutWebhook(orderId) {
  const normalizedId = Number(orderId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return { status: 400, body: { error: "orderId không hợp lệ." } };
  }

  const { STATUS } = require("../../../utils/statuses");

  try {
    let updatedRow = null;
    const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
    await db.transaction(async (trx) => {
      const row = await trx(TABLES.orderList).where({ id: normalizedId }).forUpdate().first();
      if (!row) {
        throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      }
      const codeUpper = String(row[idOrderCol] || "").trim().toUpperCase();
      if (!isMavnImportOrder({ id_order: codeUpper })) {
        throw Object.assign(new Error("NOT_MAVN"), { code: "NOT_MAVN" });
      }
      if (row.status !== STATUS.PROCESSING) {
        throw Object.assign(new Error("NOT_PROCESSING"), { code: "NOT_PROCESSING" });
      }

      const beforeRow = { ...row };
      const [updated] = await trx(TABLES.orderList)
        .where({ id: normalizedId })
        .where({ status: STATUS.PROCESSING })
        .update({ status: STATUS.PAID })
        .returning("*");

      if (!updated) {
        throw Object.assign(new Error("CONFLICT"), { code: "CONFLICT" });
      }

      await syncMavnStoreProfitExpense(trx, beforeRow, updated);
      updatedRow = updated;
    });

    return {
      status: 200,
      body: {
        message: "Đơn MAVN nhập hàng đã chuyển Đã thanh toán (không ghi nhận webhook/ngân hàng).",
        order: updatedRow,
        posted_revenue: 0,
        posted_profit: 0,
        mavn_import_only: true,
      },
    };
  } catch (error) {
    const code = error?.code;
    if (code === "NOT_FOUND") {
      return { status: 404, body: { error: "Không tìm thấy đơn hàng." } };
    }
    if (code === "NOT_MAVN") {
      return { status: 400, body: { error: "Chỉ áp dụng cho đơn MAVN nhập hàng." } };
    }
    if (code === "NOT_PROCESSING") {
      return {
        status: 409,
        body: { error: "Chỉ xử lý đơn MAVN đang ở trạng thái Đang xử lý." },
      };
    }
    if (code === "CONFLICT") {
      return {
        status: 409,
        body: { error: "Trạng thái đơn đã thay đổi, vui lòng tải lại danh sách." },
      };
    }
    throw error;
  }
}

module.exports = {
  completeMavnProcessingOrderPaidWithoutWebhook,
};

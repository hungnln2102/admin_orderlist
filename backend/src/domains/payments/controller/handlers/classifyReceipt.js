const { withTransaction } = require("@/db");
const logger = require("@/utils/logger");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const {
  TABLES,
  PAYMENT_RECEIPT_DEF,
  RECEIPT_STATE_COLS,
} = require("@/domains/payments/controller/shared/constants");

/**
 * POST /api/payments/payment-receipts/:receiptId/classify
 * Phân loại biên lai thủ công theo Flow Type được chọn
 */
const classifyReceipt = async (req, res) => {
  const receiptId = Number.parseInt(req.params.receiptId, 10);
  const flowTypeId = Number.parseInt(req.body.flowTypeId, 10);
  const note = String(req.body.note || "").trim();

  const linkedExpenseId = req.body.linkedExpenseId ? Number(req.body.linkedExpenseId) : null;

  if (!Number.isFinite(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: "receiptId không hợp lệ." });
  }

  if (!Number.isFinite(flowTypeId) || flowTypeId <= 0) {
    return res.status(400).json({ error: "flowTypeId không hợp lệ." });
  }

  try {
    const result = await withTransaction(async (trx) => {
      // 1. Kiểm tra biên lai và trạng thái tài chính
      const receiptRow = await trx(TABLES.paymentReceipt)
        .where(PAYMENT_RECEIPT_DEF.columns.id, receiptId)
        .first();
      if (!receiptRow) {
        throw new Error("Không tìm thấy biên lai giao dịch.");
      }

      let stateRow = await trx(TABLES.paymentReceiptState)
        .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
        .first();
      if (!stateRow) {
        await trx(TABLES.paymentReceiptState).insert({
          [RECEIPT_STATE_COLS.paymentReceiptId]: receiptId,
        });
        stateRow = await trx(TABLES.paymentReceiptState)
          .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
          .first();
      }

      if (stateRow.is_financial_posted) {
        throw new Error("Biên lai đã được phân loại hoặc ghi nhận tài chính trước đó.");
      }

      // 2. Kiểm tra flow type
      const flowType = await trx(TABLES.receiptFlowTypes)
        .where("id", flowTypeId)
        .where("is_active", true)
        .first();
      if (!flowType) {
        throw new Error("Loại phân loại không hợp lệ hoặc đã bị vô hiệu hóa.");
      }

      const amount = Number(receiptRow[PAYMENT_RECEIPT_DEF.columns.amount]) || 0;

      // Hướng dòng tiền validation
      if (flowType.direction === "in" && amount < 0) {
        throw new Error(`Loại phân loại '${flowType.label}' chỉ dành cho giao dịch nhận tiền (Inbound).`);
      }
      if (flowType.direction === "out" && amount > 0) {
        throw new Error(`Loại phân loại '${flowType.label}' chỉ dành cho giao dịch chi tiền (Outbound).`);
      }

      // 3. Ghép với log chi phí đã tạo sẵn nếu có
      let isLinked = false;
      if (linkedExpenseId && (flowType.effect === "withdrawal" || flowType.effect === "import_order")) {
        const expense = await trx(TABLES.storeProfitExpenses)
          .where("id", linkedExpenseId)
          .first();
        if (!expense) {
          throw new Error("Không tìm thấy log chi phí cần ghép.");
        }

        const meta = expense.expense_meta && typeof expense.expense_meta === "object" ? expense.expense_meta : {};
        if (meta.payment_receipt_id) {
          throw new Error("Log chi phí này đã được ghép với biên lai khác.");
        }

        const nextMeta = { ...meta, payment_receipt_id: receiptId };
        const updateData = {
          expense_meta: JSON.stringify(nextMeta)
        };

        if (expense.status === "pending") {
          updateData.status = "completed";
          isLinked = false; // Khi log đang pending, ta KHÔNG set isLinked = true để event subscriber thực hiện ghi sổ quỹ và delta.
        } else {
          isLinked = true;  // Khi log đã completed, ta set isLinked = true để BỎ QUA ghi sổ quỹ lặp.
        }

        await trx(TABLES.storeProfitExpenses)
          .where("id", linkedExpenseId)
          .update(updateData);
      }

      // 4. Xử lý lưu trạng thái phân loại
      const updatedState = {
        is_financial_posted: true,
        flow_type_id: flowTypeId,
        flow_classified_at: trx.fn.now(),
        flow_note: note || null,
      };

      if (flowType.effect === "off_flow_revenue") {
        updatedState.posted_off_flow_bank_receipt = amount;
      }

      await trx(TABLES.paymentReceiptState)
        .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
        .update(updatedState);

      return {
        success: true,
        message: `Phân loại biên lai thành '${flowType.label}' thành công.`,
        receiptRow,
        flowType,
        isLinked,
      };
    });

    // 4. Phát sự kiện phân loại biên lai qua Event Bus
    eventBus.emit(EVENTS.RECEIPT_CLASSIFIED, {
      receiptId: result.receiptRow.id,
      flowTypeId: result.flowType.id,
      effect: result.flowType.effect,
      amount: result.receiptRow.amount,
      paidDate: result.receiptRow.payment_date,
      receiver: result.receiptRow.receiver,
      sender: result.receiptRow.sender,
      note: note || result.receiptRow.note,
      isLinked: result.isLinked,
    });

    return res.json({ success: true, message: result.message });
  } catch (error) {
    logger.error("[payments] classifyReceipt failed", { receiptId, flowTypeId, error: error.message });
    return res.status(500).json({ error: error.message || "Không thể phân loại biên lai." });
  }
};

module.exports = { classifyReceipt };

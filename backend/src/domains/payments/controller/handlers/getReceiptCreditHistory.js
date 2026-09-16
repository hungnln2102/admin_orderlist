const { db } = require("@/db");
const logger = require("@/utils/logger");

const getReceiptCreditHistory = async (req, res) => {
  const receiptId = Number.parseInt(req.params.receiptId, 10);
  if (!Number.isFinite(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: "receiptId không hợp lệ." });
  }

  try {
    // 1. Get all credit notes linked to this receipt (including splits)
    const creditNotes = await db("billing.refund_credit_notes")
      .where({ payment_receipt_id: receiptId })
      .orderBy("id", "asc");

    if (!creditNotes || creditNotes.length === 0) {
      return res.json({
        totalAmount: 0,
        availableAmount: 0,
        usedAmount: 0,
        history: [],
      });
    }

    const noteIds = creditNotes.map(n => n.id);
    const initialAmount = Number(creditNotes[0].refund_amount) || 0;
    
    // The currently active available amount is the sum of available_amount of all OPEN notes
    // (Usually there's only one OPEN note for a receipt at a time due to splitting)
    let availableAmount = 0;
    for (const note of creditNotes) {
      if (["OPEN", "PARTIALLY_APPLIED"].includes(String(note.status).toUpperCase())) {
        availableAmount += (Number(note.available_amount) || 0);
      }
    }

    // 2. Get applications (history of usage)
    const applications = await db("billing.refund_credit_applications as app")
      .leftJoin("business.order_list as o", "o.id", "app.target_order_list_id")
      .select(
        "app.id",
        "app.target_order_code",
        "app.target_order_list_id",
        "app.applied_amount",
        "app.applied_at",
        "app.applied_by",
        "app.note",
        "o.customer",
        "o.status as order_status"
      )
      .whereIn("app.credit_note_id", noteIds)
      .orderBy("app.applied_at", "desc");

    let usedAmount = 0;
    const history = applications.map(app => {
      const amount = Number(app.applied_amount) || 0;
      usedAmount += amount;
      return {
        id: app.id,
        targetOrderCode: app.target_order_code,
        targetOrderId: app.target_order_list_id,
        orderCustomer: app.customer || "",
        orderStatus: app.order_status || "",
        appliedAmount: amount,
        appliedAt: app.applied_at,
        appliedBy: app.applied_by,
        note: app.note,
      };
    });

    return res.json({
      totalAmount: initialAmount,
      availableAmount,
      usedAmount,
      history,
    });
  } catch (error) {
    logger.error("Lỗi tải lịch sử credit cho biên lai", { receiptId, error: error.message });
    return res.status(500).json({ error: "Không thể tải lịch sử sử dụng." });
  }
};

module.exports = { getReceiptCreditHistory };

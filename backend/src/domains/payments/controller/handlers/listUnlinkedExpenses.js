const { db } = require("@/db");
const logger = require("@/utils/logger");
const { TABLES } = require("../shared/constants");

/**
 * GET /api/payments/unlinked-expenses
 * Lấy danh sách các log chi phí (store_profit_expenses) chưa được ghép với biên lai nào
 * để phục vụ việc ghép biên lai thủ công, tránh trùng lặp log (double log).
 */
const listUnlinkedExpenses = async (req, res) => {
  const receiptId = Number.parseInt(req.query.receiptId, 10);
  if (!Number.isFinite(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: "receiptId không hợp lệ." });
  }

  try {
    const receipt = await db(TABLES.paymentReceipt).where("id", receiptId).first();
    if (!receipt) {
      return res.status(404).json({ error: "Không tìm thấy biên lai giao dịch." });
    }

    const absAmount = Math.abs(Number(receipt.amount) || 0);
    const expenseType = req.query.expenseType ? String(req.query.expenseType).trim() : null;

    // Lọc các log chi phí chưa có link (expense_meta->>'payment_receipt_id' là null hoặc rỗng)
    // Ưu tiên trùng khớp số tiền trước
    let matchingQuery = db(TABLES.storeProfitExpenses)
      .whereRaw(`(expense_meta->>'payment_receipt_id') IS NULL`)
      .andWhere("amount", absAmount);

    if (expenseType) {
      matchingQuery = matchingQuery.andWhere("expense_type", expenseType);
    }

    const matchingExpenses = await matchingQuery
      .orderBy("created_at", "desc")
      .limit(20);

    // Nếu không có log trùng khớp tiền, trả về danh sách các log chưa ghép gần đây (trong 30 ngày qua)
    if (matchingExpenses.length > 0) {
      return res.json({ success: true, list: matchingExpenses });
    }

    let recentQuery = db(TABLES.storeProfitExpenses)
      .whereRaw(`(expense_meta->>'payment_receipt_id') IS NULL`)
      .whereRaw(`created_at >= NOW() - INTERVAL '30 days'`);

    if (expenseType) {
      recentQuery = recentQuery.andWhere("expense_type", expenseType);
    }

    const recentExpenses = await recentQuery
      .orderBy("created_at", "desc")
      .limit(50);

    return res.json({ success: true, list: recentExpenses });
  } catch (error) {
    logger.error("[payments] listUnlinkedExpenses failed", { error: error.message });
    return res.status(500).json({ error: "Không thể tải danh sách log chi phí chưa ghép." });
  }
};

module.exports = { listUnlinkedExpenses };

const {
  db,
  logger,
  TABLE,
  COLS,
  parseAmount,
  monthKeyVietnamFromDbTimestamp,
  mergeSummaryUpdates,
} = require("./shared");

const deleteStoreProfitExpense = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const deleted = await db.transaction(async (trx) => {
      const row = await trx(TABLE).select("*").where(COLS.ID, id).first();
      if (!row) return 0;
      const expType = String(row[COLS.EXPENSE_TYPE] || "");
      const amt = parseAmount(row[COLS.AMOUNT]);
      const n = await trx(TABLE).where(COLS.ID, id).del();
      // Gộp profit + bank delta trong 1 lần mergeSummaryUpdates để Telegram chỉ bắn 1 message.
      if (
        n &&
        (expType === "external_import" || expType === "withdraw_profit") &&
        amt > 0 &&
        row[COLS.CREATED_AT]
      ) {
        const mk = await monthKeyVietnamFromDbTimestamp(
          trx,
          row[COLS.CREATED_AT]
        );
        if (mk) {
          const updates = { estimated_bank_balance: amt };
          if (expType === "external_import") {
            updates.total_profit = amt;
          }
          await mergeSummaryUpdates(trx, mk, updates, {
            context: `deleteStoreProfitExpense.${expType}`,
          });
        }
      }
      return n;
    });

    if (!deleted) {
      return res.status(404).json({ error: "Không tìm thấy chi phí ngoài luồng." });
    }
    res.json({ ok: true, id });
  } catch (error) {
    logger.error("[store-profit-expenses] delete failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể xóa chi phí ngoài luồng." });
  }
};

module.exports = {
  deleteStoreProfitExpense,
};

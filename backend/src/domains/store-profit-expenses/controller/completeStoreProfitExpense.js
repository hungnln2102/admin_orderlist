const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  TABLE,
  COLS,
  mapExpenseRow,
  monthKeyVietnamFromDbTimestamp,
  mergeSummaryUpdates,
} = require("./shared");
const {
  debitShopBankExternalOut,
  debitShopBankWithdraw,
  SOURCE_KINDS,
} = require("@/domains/shop-bank-accounts/services/shopBankLedgerService");
const { writeUserEventLog } = require("@/domains/renew-adobe/services/systemEventLogService");
const {
  RECEIPT_SCHEMA,
  ADMIN_SCHEMA,
  SCHEMA_RECEIPT,
  SCHEMA_ADMIN,
  tableName,
} = require("@/config/dbSchema");

/**
 * POST /api/store-profit-expenses/:id/complete
 * Hoàn thành thủ công log chi phí đang ở trạng thái pending (Chờ webhook).
 * Ghi nhận sổ quỹ, biến động số dư và tạo biên lai ảo đối soát.
 */
const completeStoreProfitExpense = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  try {
    const row = await db.transaction(async (trx) => {
      const expense = await trx(TABLE).where(COLS.ID, id).first();
      if (!expense) {
        throw new Error("Không tìm thấy log chi phí.");
      }

      if (expense.status !== "pending") {
        throw new Error("Log chi phí này đã được hoàn thành trước đó.");
      }

      const amount = Number(expense[COLS.AMOUNT]) || 0;
      const shopBankAccountId = expense[COLS.SHOP_BANK_ACCOUNT_ID];
      const reason = expense[COLS.REASON];
      const expenseType = expense[COLS.EXPENSE_TYPE];

      // 1. Lấy thông tin số tài khoản ngân hàng của shop làm người nhận (receiver)
      let receiverAccount = "";
      if (shopBankAccountId) {
        const bankAcc = await trx(tableName(ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE, SCHEMA_ADMIN))
          .where(ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS.ID, shopBankAccountId)
          .first();
        if (bankAcc) {
          receiverAccount = bankAcc[ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS.ACCOUNT_NUMBER] || "";
        }
      }

      // 2. Tạo bản ghi biên lai ảo trong payment_receipt
      const prTable = tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT.TABLE, SCHEMA_RECEIPT);
      const prCols = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS;
      const referenceCode = `MANUAL_EXP_${id}`;

      const [newReceipt] = await trx(prTable).insert({
        [prCols.GATEWAY]: "manual",
        [prCols.AMOUNT]: -amount, // Số tiền âm cho giao dịch chi ra
        [prCols.PAID_DATE]: trx.fn.now(),
        [prCols.RECEIVER]: receiverAccount,
        [prCols.NOTE]: reason || "",
        [prCols.REFERENCE_CODE]: referenceCode,
        [prCols.TRANSFER_TYPE]: "out",
      }).returning([prCols.ID]);

      const newReceiptId = Number(newReceipt?.id ?? newReceipt?.[prCols.ID] ?? 0);

      // 3. Tìm ID của Loại Phân Loại (receipt_flow_types) tương ứng
      const flowTypesTable = tableName(RECEIPT_SCHEMA.RECEIPT_FLOW_TYPES.TABLE, SCHEMA_RECEIPT);
      const flowTypesCols = RECEIPT_SCHEMA.RECEIPT_FLOW_TYPES.COLS;
      const targetCode = expenseType === "external_import" ? "import_order" : "withdrawal";
      const flowType = await trx(flowTypesTable)
        .where(flowTypesCols.CODE, targetCode)
        .first();
      const flowTypeId = flowType ? flowType[flowTypesCols.ID] : null;

      // 4. Tạo bản ghi trạng thái tài chính trong payment_receipt_financial_state
      const prfsTable = tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT_FINANCIAL_STATE.TABLE, SCHEMA_RECEIPT);
      const prfsCols = RECEIPT_SCHEMA.PAYMENT_RECEIPT_FINANCIAL_STATE.COLS;
      await trx(prfsTable).insert({
        [prfsCols.PAYMENT_RECEIPT_ID]: newReceiptId,
        [prfsCols.IS_FINANCIAL_POSTED]: true,
        [prfsCols.FLOW_TYPE_ID]: flowTypeId,
        [prfsCols.FLOW_CLASSIFIED_AT]: trx.fn.now(),
        [prfsCols.FLOW_NOTE]: reason || "",
      });

      // 5. Cập nhật trạng thái log chi phí ban đầu sang completed và link payment_receipt_id
      const meta = expense.expense_meta && typeof expense.expense_meta === "object" ? expense.expense_meta : {};
      const nextMeta = { ...meta, payment_receipt_id: newReceiptId };
      await trx(TABLE).where(COLS.ID, id).update({
        [COLS.STATUS]: "completed",
        expense_meta: JSON.stringify(nextMeta)
      });

      // 6. Thực hiện ghi sổ quỹ tài khoản ngân hàng
      if (amount > 0 && shopBankAccountId) {
        if (expenseType === "external_import") {
          await debitShopBankExternalOut(trx, {
            accountId: shopBankAccountId,
            amount,
            sourceKind: SOURCE_KINDS.STORE_PROFIT_EXPENSE,
            sourceId: id,
            note: reason || null,
          });
        } else if (expenseType === "withdraw_profit") {
          await debitShopBankWithdraw(trx, {
            accountId: shopBankAccountId,
            amount,
            sourceKind: SOURCE_KINDS.STORE_PROFIT_EXPENSE,
            sourceId: id,
            note: reason || null,
          });
        }
      }

      // 7. Cập nhật số liệu báo cáo dashboard
      if (amount > 0 && expense[COLS.CREATED_AT]) {
        const mk = await monthKeyVietnamFromDbTimestamp(trx, expense[COLS.CREATED_AT]);
        if (mk) {
          const updates = {};
          if (expenseType === "external_import") {
            updates.total_profit = -amount;
            updates.estimated_bank_balance = -amount;
          } else if (expenseType === "withdraw_profit") {
            updates.estimated_bank_balance = -amount;
          }
          if (Object.keys(updates).length > 0) {
            await mergeSummaryUpdates(trx, mk, updates, {
              context: `completeStoreProfitExpense.${expenseType}`,
            });
          }
        }
      }

      const updated = await trx(TABLE)
        .where(COLS.ID, id)
        .first();

      return updated;
    });

    const mapped = mapExpenseRow(row || {});
    writeUserEventLog(req, {
      action: "Hoàn thành thủ công log chi phí",
      entity: "Chi phí",
      entityId: id,
      message: `Hoàn thành thủ công log chi phí ${mapped.reason || "không có lý do"} - số tiền: ${mapped.amount}`,
      source: "finance.store_profit_expenses",
      metadata: {
        expenseId: id,
        amount: mapped.amount,
        expenseType: row?.expense_type,
      },
    });

    return res.json({ success: true, item: mapped });
  } catch (error) {
    logger.error("[store-profit-expenses] complete failed", {
      id,
      error: error.message,
    });
    return res.status(500).json({ error: error.message || "Không thể hoàn thành chi phí." });
  }
};

module.exports = { completeStoreProfitExpense };

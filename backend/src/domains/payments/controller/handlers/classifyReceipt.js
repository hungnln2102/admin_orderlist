const { withTransaction } = require("@/db");
const logger = require("@/utils/logger");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const {
  TABLES,
  PAYMENT_RECEIPT_DEF,
  RECEIPT_STATE_COLS,
} = require("@/domains/payments/controller/shared/constants");
const { applyDashboardDelta } = require("@/domains/payments/controller/shared/dashboardDelta");
const { toMonthKey } = require("@/domains/payments/controller/shared/helpers");
const { ensureOffFlowRefundCreditNote } = require("@/domains/orders/controller/finance/offFlowRefundCredits");

/**
 * POST /api/payments/payment-receipts/:receiptId/classify
 * Phân loại biên lai thủ công theo Flow Type được chọn
 */
const classifyReceipt = async (req, res) => {
  const receiptId = Number.parseInt(req.params.receiptId, 10);
  const flowTypeId = Number.parseInt(req.body.flowTypeId, 10);
  const note = String(req.body.note || "").trim();

  const linkedExpenseId = req.body.linkedExpenseId ? Number(req.body.linkedExpenseId) : null;
  const orderCodes = Array.isArray(req.body.orderCodes) ? req.body.orderCodes : null;

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
      const transferType = String(receiptRow[PAYMENT_RECEIPT_DEF.columns.transferType] || "").trim().toLowerCase();
      const isOutbound = transferType === "out" || amount < 0;

      // Hướng dòng tiền validation
      if (flowType.direction === "in" && isOutbound) {
        throw new Error(`Loại phân loại '${flowType.label}' chỉ dành cho giao dịch nhận tiền (Inbound).`);
      }
      if (flowType.direction === "out" && !isOutbound) {
        throw new Error(`Loại phân loại '${flowType.label}' chỉ dành cho giao dịch chi tiền (Outbound).`);
      }

      // 3. Xử lý ghi nhận tài chính & liên kết
      let isLinked = false;
      let logPayload = null;

      if (flowType.effect === "withdrawal" || flowType.effect === "import_order") {
        if (linkedExpenseId) {
          // A. Ghép với log chi phí đã tạo sẵn
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
            isLinked = false;

            const amountVal = Number(expense.amount) || 0;
            const shopBankAccountId = expense.shop_bank_account_id;
            const expenseType = expense.expense_type;
            const reason = expense.reason;

            if (amountVal > 0 && shopBankAccountId) {
              const { debitShopBankExternalOut, debitShopBankWithdraw } = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
              if (expenseType === "external_import") {
                await debitShopBankExternalOut(trx, {
                  accountId: shopBankAccountId,
                  amount: amountVal,
                  sourceKind: "store_profit_expense",
                  sourceId: linkedExpenseId,
                  note: reason || null,
                });
              } else if (expenseType === "withdraw_profit") {
                await debitShopBankWithdraw(trx, {
                  accountId: shopBankAccountId,
                  amount: amountVal,
                  sourceKind: "store_profit_expense",
                  sourceId: linkedExpenseId,
                  note: reason || null,
                });
              }
            }

            if (amountVal > 0 && (expenseType === "external_import" || expenseType === "withdraw_profit")) {
              const { mergeSummaryUpdates, monthKeyVietnamFromDbTimestamp } = require("@/domains/orders/controller/finance/dashboardSummary");
              const mk = await monthKeyVietnamFromDbTimestamp(trx, expense.created_at);
              if (mk) {
                const updates = {};
                if (expenseType === "external_import") {
                  updates.total_profit = -amountVal;
                  updates.estimated_bank_balance = -amountVal;
                } else if (expenseType === "withdraw_profit") {
                  updates.estimated_bank_balance = -amountVal;
                }
                await mergeSummaryUpdates(trx, mk, updates, {
                  context: `classifyReceipt.linkedExpense.${expenseType}`,
                });
              }
            }
          } else {
            isLinked = true;  // Khi log đã completed, ta set isLinked = true để BỎ QUA ghi sổ quỹ lặp.
          }

          await trx(TABLES.storeProfitExpenses)
            .where("id", linkedExpenseId)
            .update(updateData);
        } else {
          // B. Tạo log mới hoặc phân bổ chi phí trực tiếp lên đơn hàng
          const {
            TABLE: SHOP_BANK_TABLE,
            columns: SHOP_BANK_COLS,
          } = require("@/domains/wallet/shop-bank-accounts/repositories/shopBankAccountRepository");
          const defaultAccount = await trx(SHOP_BANK_TABLE)
            .where(SHOP_BANK_COLS.isActive, true)
            .where(SHOP_BANK_COLS.isDefault, true)
            .first();

          if (!defaultAccount) {
            throw new Error("Không tìm thấy tài khoản ngân hàng mặc định để ghi nhận.");
          }

          const outAmount = Math.abs(amount);

          if (flowType.effect === "import_order" && orderCodes && orderCodes.length > 0) {
            // B1. Phân bổ chi phí trực tiếp vào các đơn hàng (đội chi phí lên)
            const splitAmount = Math.floor(outAmount / orderCodes.length);
            const remainder = outAmount - (splitAmount * orderCodes.length);

            for (let i = 0; i < orderCodes.length; i++) {
              const code = orderCodes[i];
              const amountToApply = splitAmount + (i === 0 ? remainder : 0);

              const order = await trx(TABLES.orderList)
                .select("id", "cost")
                .where("id_order", code)
                .first();

              if (!order) {
                throw new Error(`Mã đơn hàng ${code} không tồn tại.`);
              }

              const newCost = Number(order.cost || 0) + amountToApply;
              await trx(TABLES.orderList)
                .where("id", order.id)
                .update({ cost: newCost, updated_at: trx.fn.now() });

              const { debitShopBankExternalOut } = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
              await debitShopBankExternalOut(trx, {
                accountId: defaultAccount.id,
                amount: amountToApply,
                sourceKind: "order_cost_allocation",
                sourceId: order.id,
                note: note || `Chi phí đơn hàng ${code} từ phân loại biên lai ${receiptId}`,
              });

              // Phát sự kiện ORDER_UPDATED qua Event Bus
              const updatedOrder = await trx(TABLES.orderList).where("id", order.id).first();
              if (updatedOrder) {
                eventBus.emit(EVENTS.ORDER_UPDATED, {
                  order: updatedOrder,
                  source: "receipt_classification"
                });
              }
            }

            logPayload = { orderCodes, type: "order_costs", outAmount };
            
            // Ghi log audit tài chính
            const { insertFinancialAuditLog } = require("../../../../../webhook/sepay/payments");
            await insertFinancialAuditLog(trx, {
              payment_receipt_id: receiptId,
              order_code: "",
              rule_branch: "OUTBOUND_CLASSIFIED_ORDER_COSTS",
              delta: logPayload,
              source: "admin_ui",
            });
          } else {
            // B2. Tạo log chi phí chung chung tự động
            const expenseType = flowType.effect === "withdrawal" ? "withdraw_profit" : "external_import";
            const meta = {
              payment_receipt_id: receiptId,
              source: "receipt_classification_new"
            };

            const expensePayload = {
              amount: outAmount,
              reason: note || (flowType.effect === "withdrawal" ? "Rút tiền từ phân loại biên lai" : "Nhập ngoài luồng từ phân loại biên lai"),
              expense_type: expenseType,
              shop_bank_account_id: defaultAccount.id,
              status: "completed",
              expense_meta: JSON.stringify(meta),
              created_at: receiptRow.payment_date || trx.fn.now()
            };

            const [created] = await trx(TABLES.storeProfitExpenses).insert(expensePayload).returning("id");
            const expenseId = Number(created?.id ?? created ?? 0);

            const { debitShopBankExternalOut, debitShopBankWithdraw } = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
            if (expenseType === "withdraw_profit") {
              await debitShopBankWithdraw(trx, {
                accountId: defaultAccount.id,
                amount: outAmount,
                sourceKind: "store_profit_expense",
                sourceId: expenseId,
                note: note || `Rút tiền từ biên lai ${receiptId}`,
              });
            } else {
              await debitShopBankExternalOut(trx, {
                accountId: defaultAccount.id,
                amount: outAmount,
                sourceKind: "store_profit_expense",
                sourceId: expenseId,
                note: note || `Nhập ngoài luồng từ biên lai ${receiptId}`,
              });
            }

            const { mergeSummaryUpdates, monthKeyVietnamFromDbTimestamp } = require("@/domains/orders/controller/finance/dashboardSummary");
            const mk = await monthKeyVietnamFromDbTimestamp(trx, receiptRow.payment_date || trx.fn.now());
            if (mk) {
              const updates = {};
              if (expenseType === "external_import") {
                updates.total_profit = -outAmount;
                updates.estimated_bank_balance = -outAmount;
              } else if (expenseType === "withdraw_profit") {
                updates.estimated_bank_balance = -outAmount;
              }
              await mergeSummaryUpdates(trx, mk, updates, {
                context: `classifyReceipt.newExpense.${expenseType}`,
              });
            }
          }
        }
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

        const receiptMonthKey = toMonthKey(receiptRow[PAYMENT_RECEIPT_DEF.columns.paidDate]);
        await applyDashboardDelta(trx, receiptMonthKey, {
          offFlowDelta: amount,
          bankBalanceDelta: amount,
          refType: "payment_receipt",
          refId: String(receiptId),
        });

        // Also create the off-flow refund credit note
        await ensureOffFlowRefundCreditNote(trx, {
          paymentReceiptId: receiptId,
          offFlowAmount: amount,
          monthKey: receiptMonthKey,
          sourceOrderCode: receiptRow[PAYMENT_RECEIPT_DEF.columns.orderCode] || null,
          ruleBranch: "MANUAL_CLASSIFY_OFF_FLOW_BANK_RECEIPT",
          note: note || `Credit ngoài luồng từ phân loại biên lai #${receiptId}`,
        });
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

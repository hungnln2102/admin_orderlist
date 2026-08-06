const { withTransaction } = require("@/db");
const logger = require("@/utils/logger");
const {
  TABLES,
  RECEIPT_STATE_COLS,
  PAYMENT_RECEIPT_DEF,
} = require("@/domains/payments/controller/shared/constants");
const {
  TABLE: EXPENSE_TABLE,
  COLS: EXPENSE_COLS,
} = require("@/domains/store-profit-expenses/controller/shared");
const {
  debitShopBankWithdraw,
  debitShopBankExternalOut,
  SOURCE_KINDS,
} = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
const {
  TABLE: SHOP_BANK_TABLE,
  columns: SHOP_BANK_COLS,
} = require("@/domains/wallet/shop-bank-accounts/repositories/shopBankAccountRepository");
const { insertFinancialAuditLog } = require("../../../../../webhook/sepay/payments");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

const allocateOutboundPaymentReceipt = async (req, res) => {
  const receiptId = Number.parseInt(req.params.receiptId, 10);
  const { type, reason, orderCodes, supplierName } = req.body;

  if (!Number.isFinite(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: "receiptId không hợp lệ." });
  }

  if (!["withdrawal", "external_import", "order_costs"].includes(type)) {
    return res.status(400).json({ error: "Loại phân bổ không hợp lệ." });
  }

  try {
    const result = await withTransaction(async (trx) => {
      // 1. Lấy biên lai và kiểm tra
      const receipt = await trx(TABLES.paymentReceipt)
        .select(
          `pr.${PAYMENT_RECEIPT_DEF.columns.id}`,
          `pr.${PAYMENT_RECEIPT_DEF.columns.amount}`,
          `fs.${RECEIPT_STATE_COLS.isFinancialPosted}`
        )
        .from({ pr: TABLES.paymentReceipt })
        .leftJoin(
          { fs: TABLES.paymentReceiptState },
          `fs.${RECEIPT_STATE_COLS.paymentReceiptId}`,
          `pr.${PAYMENT_RECEIPT_DEF.columns.id}`
        )
        .where(`pr.${PAYMENT_RECEIPT_DEF.columns.id}`, receiptId)
        .first();

      if (!receipt) {
        throw new Error("Không tìm thấy biên lai.");
      }

      if (Number(receipt.amount) >= 0) {
        throw new Error("Chỉ phân bổ được cho biên lai tiền ra (số tiền âm).");
      }

      if (receipt.isFinancialPosted) {
        throw new Error("Biên lai đã được phân bổ xử lý.");
      }

      const outAmount = Math.abs(Number(receipt.amount));
      const defaultAccount = await trx(SHOP_BANK_TABLE)
        .where(SHOP_BANK_COLS.isActive, true)
        .where(SHOP_BANK_COLS.isDefault, true)
        .first();
      
      if (!defaultAccount) {
        throw new Error("Không tìm thấy tài khoản ngân hàng mặc định để ghi nhận.");
      }

      let logPayload = null;

      // 2. Phân bổ theo loại
      if (type === "withdrawal" || type === "external_import") {
        const expenseType = type === "withdrawal" ? "withdraw_profit" : "external_import";
        const meta = type === "external_import" ? { source: "outbound_allocation", supplier: supplierName } : null;
        
        const expensePayload = {
          [EXPENSE_COLS.AMOUNT]: outAmount,
          [EXPENSE_COLS.REASON]: reason || "Phân bổ từ biên lai tiền ra",
          [EXPENSE_COLS.EXPENSE_TYPE]: expenseType,
          [EXPENSE_COLS.SHOP_BANK_ACCOUNT_ID]: defaultAccount.id,
        };
        
        if (meta) {
          expensePayload[EXPENSE_COLS.EXPENSE_META] = trx.raw("?::jsonb", [JSON.stringify(meta)]);
        }

        const [created] = await trx(EXPENSE_TABLE).insert(expensePayload).returning([EXPENSE_COLS.ID]);
        const expenseId = Number(created?.id ?? created?.[EXPENSE_COLS.ID] ?? 0);

        const { updateLedgerSource } = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
        const updated = await updateLedgerSource(trx, {
          sourceKind: "payment_receipt",
          sourceId: receiptId,
          nextSourceKind: SOURCE_KINDS.STORE_PROFIT_EXPENSE,
          nextSourceId: expenseId,
          note: reason || (type === "withdrawal" ? `Rút tiền từ biên lai ${receiptId}` : `Nhập ngoài luồng từ biên lai ${receiptId}`),
        });

        if (!updated) {
          if (type === "withdrawal") {
            await debitShopBankWithdraw(trx, {
              accountId: defaultAccount.id,
              amount: outAmount,
              sourceKind: SOURCE_KINDS.STORE_PROFIT_EXPENSE,
              sourceId: expenseId,
              note: reason || `Rút tiền từ biên lai ${receiptId}`,
            });
          } else {
            await debitShopBankExternalOut(trx, {
              accountId: defaultAccount.id,
              amount: outAmount,
              sourceKind: SOURCE_KINDS.STORE_PROFIT_EXPENSE,
              sourceId: expenseId,
              note: reason || `Nhập ngoài luồng từ biên lai ${receiptId}`,
            });
          }
        }
        logPayload = { expenseId, type, outAmount };
      } 
      else if (type === "order_costs") {
        if (!Array.isArray(orderCodes) || orderCodes.length === 0) {
          throw new Error("Vui lòng cung cấp danh sách mã đơn hàng.");
        }
        
        // Chia đều số tiền
        const splitAmount = Math.floor(outAmount / orderCodes.length);
        const remainder = outAmount - (splitAmount * orderCodes.length);
        
        let hasUpdatedLedger = false;
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
            
          let shouldDebit = true;
          if (i === 0) {
            const { updateLedgerSource } = require("@/domains/wallet/shop-bank-accounts/services/shopBankLedgerService");
            const updated = await updateLedgerSource(trx, {
              sourceKind: "payment_receipt",
              sourceId: receiptId,
              nextSourceKind: "order_cost_allocation",
              nextSourceId: order.id,
              note: `Chi phí đơn hàng ${code} từ biên lai ${receiptId}`,
            });
            if (updated) {
              hasUpdatedLedger = true;
              shouldDebit = false;
            }
          } else if (hasUpdatedLedger) {
            shouldDebit = false;
          }

          if (shouldDebit) {
            await debitShopBankExternalOut(trx, {
              accountId: defaultAccount.id,
              amount: amountToApply,
              sourceKind: "order_cost_allocation",
              sourceId: order.id,
              note: `Chi phí đơn hàng ${code} từ biên lai ${receiptId}`,
            });
          }

          // Lấy order mới nhất sau cập nhật
          const updatedOrder = await trx(TABLES.orderList).where("id", order.id).first();
          if (updatedOrder) {
            eventBus.emit(EVENTS.ORDER_UPDATED, {
                order: updatedOrder,
                source: "outbound_allocation"
            });
          }
        }
        logPayload = { orderCodes, type, outAmount };
      }

      // 3. Đánh dấu receipt đã xử lý
      const stateUpdate = {
        [RECEIPT_STATE_COLS.isFinancialPosted]: true,
        [RECEIPT_STATE_COLS.reconciledAt]: trx.fn.now(),
      };

      const existingState = await trx(TABLES.paymentReceiptState)
        .select(RECEIPT_STATE_COLS.paymentReceiptId)
        .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
        .first();

      if (existingState) {
        await trx(TABLES.paymentReceiptState)
          .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
          .update(stateUpdate);
      } else {
        await trx(TABLES.paymentReceiptState).insert({
          [RECEIPT_STATE_COLS.paymentReceiptId]: receiptId,
          ...stateUpdate,
        });
      }

      // 4. Log
      await insertFinancialAuditLog(trx, {
        payment_receipt_id: receiptId,
        order_code: "",
        rule_branch: "OUTBOUND_ALLOCATED_MANUALLY",
        delta: logPayload,
        source: "admin_ui",
      });

      return { success: true };
    });

    return res.json(result);
  } catch (error) {
    logger.error("[allocateOutboundPaymentReceipt] Lỗi phân bổ:", { error: error.message });
    return res.status(400).json({ error: error.message });
  }
};

module.exports = { allocateOutboundPaymentReceipt };

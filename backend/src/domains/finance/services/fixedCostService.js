const { db, TABLES, COLS, withTransaction } = require("@/db");
const { debitFinancialAccount, creditFinancialAccount } = require("@/domains/wallets/services/walletService");
const { allocateReceiptInTrx } = require("@/domains/invoices/services/invoiceService");
const { EVENTS, publishEventInTrx } = require("@/events");
const { snapshotObligation, receiptMonth } = require("./profitObligationService");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const publishFixedCostMutation = (trx, action, id, name) => publishEventInTrx(trx, {
  eventName: EVENTS.FINANCE_FIXED_COST_MUTATED,
  aggregateType: "FIXED_COST",
  aggregateId: id,
  source: "FINANCE",
  payload: { action, id, name },
});

async function createFixedCost(payload) {
  return withTransaction(async (trx) => {
    const [created] = await trx(TABLES.FIXED_COSTS)
      .insert({
        name: payload.name,
        amount: toNumber(payload.amount),
        category: payload.category || "LIVING",
        is_active: payload.isActive !== false,
        note: payload.note || "",
      })
      .returning("*");

    await publishFixedCostMutation(trx, "CREATE", Number(created.id), created.name);

    return {
      id: Number(created.id),
      name: created.name,
      amount: toNumber(created.amount),
      category: created.category,
      isActive: Boolean(created.is_active),
      note: created.note || "",
    };
  });
}

async function updateFixedCost(id, payload) {
  return withTransaction(async (trx) => {
    const updateData = { updated_at: trx.fn.now() };
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.amount !== undefined) updateData.amount = toNumber(payload.amount);
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);
    if (payload.note !== undefined) updateData.note = payload.note;

    const [updated] = await trx(TABLES.FIXED_COSTS)
      .where("id", id)
      .update(updateData)
      .returning("*");

    if (!updated) return null;

    await publishFixedCostMutation(trx, "UPDATE", Number(updated.id), updated.name);

    return {
      id: Number(updated.id),
      name: updated.name,
      amount: toNumber(updated.amount),
      category: updated.category,
      isActive: Boolean(updated.is_active),
      note: updated.note || "",
    };
  });
}

async function deleteFixedCost(id) {
  return withTransaction(async (trx) => {
    const fixedCost = await trx(TABLES.FIXED_COSTS).where("id", id).forUpdate().first();
    if (!fixedCost) return 0;

    const res = await trx(TABLES.FIXED_COSTS).where("id", id).del();
    await publishFixedCostMutation(trx, "DELETE", Number(id), fixedCost.name);
    return res;
  });
}

async function payFixedCost(id, payload = {}) {
  const { periodMonth, receiptId, financialAccountId, amount, note } = payload;
  return await withTransaction(async (trx) => {
    if (receiptId) await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, Number(receiptId)).forUpdate().first();
    const fixedCost = await trx(TABLES.FIXED_COSTS).where("id", id).forUpdate().first();
    if (!fixedCost) throw new Error("Không tìm thấy chi phí cố định");

    const now = new Date();
    const targetMonth = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const numAmount = toNumber(amount) || toNumber(fixedCost.amount);
    if (numAmount <= 0) throw new Error("Invalid fixed cost payment amount");
    await snapshotObligation(trx, "FIXED_COST", fixedCost, targetMonth);
    let receiptAllocation = null;

    const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "FIXED_COST", target_id: id, period_month: targetMonth })
      .first();

    if (existingLog) {
      throw new Error(`Khoản chi phí cố định "${fixedCost.name}" tháng ${targetMonth} đã được thanh toán trước đó!`);
    }

    if (receiptId) {
      receiptAllocation = await allocateReceiptInTrx(
        trx,
        receiptId,
        numAmount,
        "FIXED_COST",
        `FIXED_COST_${id}`,
        note || `Thanh toán chi phí cố định "${fixedCost.name}" tháng ${targetMonth}`,
        { type: "FIXED_COST", target: fixedCost, periodMonth: targetMonth }
      );
    } else if (financialAccountId) {
      await debitFinancialAccount(trx, {
        accountId: Number(financialAccountId),
        amount: numAmount,
        sourceKind: "fixed_cost_payment",
        sourceId: `${id}_${targetMonth}`,
        note: note || `Thanh toán chi phí cố định "${fixedCost.name}" tháng ${targetMonth}`,
      });
    }

    const [createdLog] = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .insert({
        target_type: "FIXED_COST",
        [COLS.DEBT_PAYMENT_LOGS.RECEIPT_ALLOCATION_ID]: receiptAllocation?.allocationId || null,
        target_id: id,
        period_month: targetMonth,
        financial_account_id: receiptAllocation?.financialAccountId || (financialAccountId ? Number(financialAccountId) : null),
        amount: numAmount,
        payment_date: new Date().toISOString().slice(0, 10),
        note: note || `Thanh toán chi phí cố định tháng ${targetMonth}`,
      })
      .returning("*");

    await publishFixedCostMutation(trx, "PAY", Number(id), fixedCost.name);

    return { success: true, logId: Number(createdLog.id), periodMonth: targetMonth };
  });
}

async function cancelFixedCostPayment(id, payload = {}) {
  const { periodMonth } = payload;
  return await withTransaction(async (trx) => {
    const now = new Date();
    const targetMonth = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "FIXED_COST", target_id: id, period_month: targetMonth })
      .first();

    if (!existingLog) {
      throw new Error(`Không tìm thấy giao dịch thanh toán tháng ${targetMonth} của khoản chi phí này`);
    }

    if (existingLog[COLS.DEBT_PAYMENT_LOGS.RECEIPT_ALLOCATION_ID]) throw new Error("Receipt-backed payment cannot be reversed as a bank refund");

    if (existingLog.financial_account_id) {
      const { creditFinancialAccount } = require("@/domains/wallets/services/walletService");
      await creditFinancialAccount(trx, {
        accountId: Number(existingLog.financial_account_id),
        amount: Number(existingLog.amount),
        sourceKind: "fixed_cost_payment_reversal",
        sourceId: `${id}_${targetMonth}`,
        note: `Hoàn tiền hủy thanh toán chi phí cố định tháng ${targetMonth}`,
      });
    }

    await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ id: existingLog.id })
      .del();

    await publishFixedCostMutation(trx, "UNPAY", Number(id));

    return { success: true };
  });
}

async function getFixedCosts(month) {
  const targetMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const rows = await db(TABLES.FIXED_COSTS).select("*").orderBy("id", "asc");
  const logs = await db(TABLES.DEBT_PAYMENT_LOGS)
    .where("target_type", "FIXED_COST")
    .where("period_month", targetMonth);
  const logMap = new Map();
  logs.forEach((l) => logMap.set(Number(l.target_id), l));

  return rows.map((r) => {
    const paidLog = logMap.get(Number(r.id));
    return {
      id: Number(r.id),
      name: r.name,
      amount: toNumber(r.amount),
      category: r.category || "LIVING",
      isActive: Boolean(r.is_active),
      note: r.note || "",
      isPaidThisMonth: Boolean(paidLog),
      paidDate: paidLog?.payment_date ? new Date(paidLog.payment_date).toISOString().slice(0, 10) : null,
      paidAmount: paidLog ? toNumber(paidLog.amount) : 0,
      paidLogId: paidLog ? Number(paidLog.id) : null,
    };
  });
}

module.exports = { createFixedCost, updateFixedCost, deleteFixedCost, payFixedCost, cancelFixedCostPayment, getFixedCosts };

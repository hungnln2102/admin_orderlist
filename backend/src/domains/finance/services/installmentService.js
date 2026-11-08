const { db, TABLES, COLS, withTransaction } = require("@/db");
const { debitFinancialAccount } = require("@/domains/wallets/services/walletService");
const { allocateReceiptInTrx } = require("@/domains/invoices/services/invoiceService");
const { snapshotObligation, receiptMonth } = require("./profitObligationService");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

function calculateInstallmentState(item, targetMonth) {
  const [startYear, startM] = item.start_period.split("-").map(Number);
  const [targetYear, targetM] = targetMonth.split("-").map(Number);
  const monthDiff = (targetYear - startYear) * 12 + (targetM - startM);
  const currentPeriod = monthDiff + 1; // 1-indexed

  const totalPeriods = Number(item.total_periods);
  const monthlyAmount = toNumber(item.monthly_amount);

  if (currentPeriod < 1) {
    // Chưa đến kỳ trả
    return {
      isEffective: false,
      status: "NOT_STARTED",
      currentPeriod: 0,
      totalPeriods,
      remainingPeriods: totalPeriods,
      monthlyAmount,
      remainingDebt: totalPeriods * monthlyAmount,
    };
  } else if (currentPeriod <= totalPeriods) {
    // Đang trong kỳ trả góp: Số kỳ còn phải trả bao gồm cả kỳ hiện tại chưa tất toán
    const remainingPeriods = totalPeriods - currentPeriod + 1;
    return {
      isEffective: item.is_active !== false,
      status: "ACTIVE",
      currentPeriod,
      totalPeriods,
      remainingPeriods,
      monthlyAmount,
      remainingDebt: remainingPeriods * monthlyAmount,
    };
  } else {
    // Đã hoàn thành tất toán hết số kỳ!
    return {
      isEffective: false,
      status: "COMPLETED",
      currentPeriod: totalPeriods,
      totalPeriods,
      remainingPeriods: 0,
      monthlyAmount,
      remainingDebt: 0,
    };
  }
}

/**
 * Tổng hợp toàn bộ bức tranh tài chính tháng (Break-even + Net worth + Cashflow)
 */

async function createInstallment(payload) {
  const [created] = await db(TABLES.INSTALLMENTS)
    .insert({
      name: payload.name,
      monthly_amount: toNumber(payload.monthlyAmount),
      total_periods: Number(payload.totalPeriods || 1),
      start_period: payload.startPeriod, // 'YYYY-MM'
      due_day: Number(payload.dueDay || 15),
      status: payload.status || "ACTIVE",
      is_active: payload.isActive !== false,
      note: payload.note || "",
    })
    .returning("*");

  return {
    id: Number(created.id),
    name: created.name,
    monthlyAmount: toNumber(created.monthly_amount),
    totalPeriods: Number(created.total_periods),
    startPeriod: created.start_period,
    dueDay: Number(created.due_day),
    status: created.status,
    isActive: Boolean(created.is_active),
    note: created.note || "",
  };
}

async function updateInstallment(id, payload) {
  const updateData = { updated_at: db.fn.now() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.monthlyAmount !== undefined) updateData.monthly_amount = toNumber(payload.monthlyAmount);
  if (payload.totalPeriods !== undefined) updateData.total_periods = Number(payload.totalPeriods);
  if (payload.startPeriod !== undefined) updateData.start_period = payload.startPeriod;
  if (payload.dueDay !== undefined) updateData.due_day = Number(payload.dueDay);
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);
  if (payload.note !== undefined) updateData.note = payload.note;


  const [updated] = await db(TABLES.INSTALLMENTS)
    .where("id", id)
    .update(updateData)
    .returning("*");

  if (!updated) return null;
  return {
    id: Number(updated.id),
    name: updated.name,
    monthlyAmount: toNumber(updated.monthly_amount),
    totalPeriods: Number(updated.total_periods),
    startPeriod: updated.start_period,
    dueDay: Number(updated.due_day),
    status: updated.status,
    isActive: Boolean(updated.is_active),
    note: updated.note || "",
  };
}

async function deleteInstallment(id) {
  return await db(TABLES.INSTALLMENTS).where("id", id).del();
}

async function payInstallment(id, payload) {
  const { financialAccountId, receiptId, amount, periodMonth, note } = payload;
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền thanh toán phải lớn hơn 0");
  if (!financialAccountId && !receiptId) throw new Error("Vui lòng chọn tài khoản thanh khoản hoặc biên lai ngân hàng");
  if (!periodMonth) throw new Error("Vui lòng chỉ định kỳ tháng thanh toán (YYYY-MM)");

  return await withTransaction(async (trx) => {
    if (receiptId) await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, Number(receiptId)).forUpdate().first();
    const installment = await trx(TABLES.INSTALLMENTS).where("id", id).forUpdate().first();
    if (!installment) throw new Error("Không tìm thấy hợp đồng trả góp");
    await snapshotObligation(trx, "INSTALLMENT", installment, periodMonth);
    let receiptAllocation = null;

    const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "INSTALLMENT", target_id: id, period_month: periodMonth })
      .first();

    if (existingLog) {
      throw new Error(`Kỳ ${periodMonth} của khoản trả góp "${installment.name}" đã được thanh toán trước đó, không thể thanh toán trùng lặp!`);
    }

    if (receiptId) {
      receiptAllocation = await allocateReceiptInTrx(trx, receiptId, numAmount, "OPERATIONAL_EXPENSE", `INSTALLMENT_${id}`, note || `Thanh toán trả góp "${installment.name}" kỳ ${periodMonth}`, { type: "INSTALLMENT", target: installment, periodMonth });
    } else {
      await debitFinancialAccount(trx, {
        accountId: Number(financialAccountId),
        amount: numAmount,
        sourceKind: "installment_payment",
        sourceId: `${id}_${periodMonth}`,
        note: note || `Thanh toán trả góp "${installment.name}" kỳ ${periodMonth}`,
      });
    }

    const [createdLog] = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .insert({
        target_type: "INSTALLMENT",
        [COLS.DEBT_PAYMENT_LOGS.RECEIPT_ALLOCATION_ID]: receiptAllocation?.allocationId || null,
        target_id: id,
        period_month: periodMonth,
        financial_account_id: receiptAllocation?.financialAccountId || (financialAccountId ? Number(financialAccountId) : null),
        amount: numAmount,
        payment_date: new Date().toISOString().slice(0, 10),
        note: note ? String(note).trim() : null,
      })
      .returning("*");

    return { success: true, logId: Number(createdLog.id) };
  });
}

module.exports = { calculateInstallmentState, createInstallment, updateInstallment, deleteInstallment, payInstallment };

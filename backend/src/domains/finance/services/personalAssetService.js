const { db, TABLES, COLS, withTransaction } = require("@/db");
const { debitFinancialAccount } = require("@/domains/wallets/services/walletService");
const { allocateReceiptInTrx } = require("@/domains/invoices/services/invoiceService");
const { EVENTS, publishEventInTrx } = require("@/events");
const creditLedgerService = require("../credit/creditLedgerService");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const PROFIT_FREQUENCIES = new Set(["DAILY", "MONTHLY", "YEARLY"]);
const PROFIT_DESTINATIONS = new Set(["REINVEST", "CASH_BANK", "SHOP_BALANCE", "OTHER"]);
const DEBT_REPAYMENT_FREQUENCIES = new Set(["DAILY", "MONTHLY"]);

function isDebtProfile(asset) {
  return asset?.type === "DEBT_PAYABLE";
}

async function publishDebtProfileMutationInTrx(trx, { action, beforeState = null, afterState = null, changedFields = {} }) {
  const profile = afterState || beforeState;
  if (!isDebtProfile(beforeState) && !isDebtProfile(afterState)) return;

  await publishEventInTrx(trx, {
    eventName: EVENTS.FINANCE_DEBT_PROFILE_MUTATED,
    aggregateType: "PERSONAL_DEBT_PROFILE",
    aggregateId: profile.id,
    action,
    beforeState,
    afterState,
    changedFields,
    source: "FINANCE_HUB",
    payload: {
      personalAssetId: Number(profile.id),
      debtKind: profile.debt_kind || null,
      action,
    },
  });
}

async function publishPersonalDebtLedgerMutationInTrx(trx, { action, asset, log, balanceAfter }) {
  await publishEventInTrx(trx, {
    eventName: EVENTS.FINANCE_DEBT_LEDGER_MUTATED,
    aggregateType: "PERSONAL_DEBT",
    aggregateId: asset.id,
    action,
    afterState: { amount: balanceAfter },
    source: "FINANCE_HUB",
    payload: {
      personalAssetId: Number(asset.id),
      debtPaymentLogId: Number(log.id),
      debtKind: asset.debt_kind || "PERSONAL_EXTERNAL",
      amount: toNumber(log.amount),
      balanceAfter: toNumber(balanceAfter),
      action,
    },
  });
}

function normalizeProfitConfig({ type, profitEnabled, profitFrequency, annualInterestRate, profitDestination, profitAccountId, profitCreditTime }) {
  if (!profitEnabled) {
    return {
      profit_enabled: false,
      profit_frequency: null,
      annual_interest_rate: null,
      profit_destination: null,
      profit_account_id: null,
      profit_credit_time: null,
    };
  }

  if (type !== "SAVINGS") {
    throw new Error("Chỉ quỹ tích lũy / tiết kiệm mới được cấu hình sinh lời");
  }

  const frequency = profitFrequency || "MONTHLY";
  if (!PROFIT_FREQUENCIES.has(frequency)) {
    throw new Error("Chu kỳ sinh lời không hợp lệ");
  }

  const rate = Number(annualInterestRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Lãi suất năm phải lớn hơn 0");
  }

  const destination = profitDestination || "REINVEST";
  if (!PROFIT_DESTINATIONS.has(destination)) {
    throw new Error("Nơi nhận tiền sinh lời không hợp lệ");
  }

  const accountId = ["CASH_BANK", "SHOP_BALANCE"].includes(destination)
    ? Number(profitAccountId)
    : null;
  if (["CASH_BANK", "SHOP_BALANCE"].includes(destination) && (!Number.isInteger(accountId) || accountId <= 0)) {
    throw new Error("Vui lòng chọn tài khoản nhận tiền sinh lời");
  }

  const creditTime = profitCreditTime || "07:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(creditTime)) {
    throw new Error("Giờ cộng lãi không hợp lệ");
  }

  return {
    profit_enabled: true,
    profit_frequency: frequency,
    annual_interest_rate: rate,
    profit_destination: destination,
    profit_account_id: accountId,
    profit_credit_time: creditTime,
  };
}

async function validateProfitAccount(profitConfig) {
  if (!profitConfig.profit_account_id) return;

  const account = await db(TABLES.FINANCIAL_ACCOUNTS)
    .where({ id: profitConfig.profit_account_id, is_active: true, is_deleted: false })
    .first();

  if (!account || (profitConfig.profit_destination === "CASH_BANK" && account.account_type !== "bank")) {
    throw new Error("Tài khoản nhận tiền sinh lời không tồn tại hoặc không còn hoạt động");
  }
}

function normalizeDebtConfig({ type, debtKind, debtInitialLimit, debtAccountNumber, debtInterestEnabled, debtInterestFrequency, debtAnnualInterestRate, debtDueDay, debtEndDate, debtRepaymentFrequency }) {
  const isDebt = type === "DEBT_PAYABLE" || type === "DEBT_RECEIVABLE";
  if (!isDebt) {
    return {
      debt_kind: null,
      debt_initial_limit: null,
      debt_account_number: null,
      debt_interest_enabled: false,
      debt_interest_frequency: null,
      debt_annual_interest_rate: null,
      debt_due_day: null,
      debt_end_date: null,
      debt_repayment_frequency: null,
    };
  }

  const kind = type === "DEBT_RECEIVABLE" ? null : String(debtKind || "PERSONAL_EXTERNAL");
  if (kind && !["PERSONAL_EXTERNAL", "CREDIT_CARD", "OVERDRAFT"].includes(kind)) {
    throw new Error("Loại sổ nợ không hợp lệ");
  }
  const initialLimit = kind === "CREDIT_CARD" || kind === "OVERDRAFT" ? Number(debtInitialLimit) : null;
  if (initialLimit !== null && (!Number.isFinite(initialLimit) || initialLimit <= 0)) {
    throw new Error("Hạn mức ban đầu phải lớn hơn 0");
  }
  const accountNumber = debtAccountNumber === undefined || debtAccountNumber === null
    ? null
    : String(debtAccountNumber).replace(/\D/g, "") || null;
  const interestEnabled = kind === "PERSONAL_EXTERNAL" ? false : Boolean(debtInterestEnabled);
  const annualRate = interestEnabled ? Number(debtAnnualInterestRate) : null;
  const interestFrequency = interestEnabled ? (debtInterestFrequency || "DAILY") : null;
  if (interestEnabled) {
    if (!Number.isFinite(annualRate) || annualRate <= 0) throw new Error("Lãi suất nợ phải lớn hơn 0");
    if (!["DAILY", "MONTHLY"].includes(interestFrequency)) throw new Error("Chu kỳ tính lãi không hợp lệ");
  }

  const dueDay = (debtDueDay !== undefined && debtDueDay !== null && String(debtDueDay).trim() !== "") ? Number(debtDueDay) : null;
  if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
    throw new Error("Ngày đến hạn phải từ 1 đến 31");
  }
  const rawEndDate = debtEndDate instanceof Date ? debtEndDate.toISOString().slice(0, 10) : String(debtEndDate || "").slice(0, 10);
  const endDate = rawEndDate && /^\d{4}-\d{2}-\d{2}$/.test(rawEndDate) ? rawEndDate : null;
  const repaymentFrequency = debtRepaymentFrequency || "MONTHLY";
  if (!DEBT_REPAYMENT_FREQUENCIES.has(repaymentFrequency)) throw new Error("Chu kỳ quy đổi nợ không hợp lệ");

  return {
    debt_kind: kind,
    debt_initial_limit: initialLimit,
    debt_account_number: accountNumber,
    debt_interest_enabled: interestEnabled,
    debt_interest_frequency: interestFrequency,
    debt_annual_interest_rate: annualRate,
    debt_due_day: dueDay,
    debt_end_date: endDate,
    debt_repayment_frequency: repaymentFrequency,
  };
}
/**
 * Tính toán trạng thái kỳ của một khoản trả góp tại một tháng mục tiêu YYYY-MM
 * @param {Object} item - Bản ghi installments
 * @param {string} targetMonth - 'YYYY-MM' (VD: '2026-10')
 */

async function createPersonalAsset(payload) {
  const type = payload.type || "SAVINGS";
  const profitConfig = normalizeProfitConfig({
    type,
    profitEnabled: Boolean(payload.profitEnabled),
    profitFrequency: payload.profitFrequency,
    annualInterestRate: payload.annualInterestRate,
    profitDestination: payload.profitDestination,
    profitAccountId: payload.profitAccountId,
    profitCreditTime: payload.profitCreditTime,
  });
  await validateProfitAccount(profitConfig);
  const debtConfig = normalizeDebtConfig({
    type,
    debtKind: payload.debtKind,
    debtInitialLimit: payload.debtInitialLimit,
    debtAccountNumber: payload.debtAccountNumber,
    debtInterestEnabled: Boolean(payload.debtInterestEnabled),
    debtInterestFrequency: payload.debtInterestFrequency,
    debtAnnualInterestRate: payload.debtAnnualInterestRate,
    debtDueDay: payload.debtDueDay,
    debtEndDate: payload.debtEndDate,
    debtRepaymentFrequency: payload.debtRepaymentFrequency,
  });

  const cardLastDigits = payload.cardLastDigits !== undefined ? (payload.cardLastDigits ? String(payload.cardLastDigits).trim() : null) : null;
  const bankName = payload.bankName !== undefined ? (payload.bankName ? String(payload.bankName).trim() : null) : null;

  const created = await withTransaction(async (trx) => {
    const [row] = await trx(TABLES.PERSONAL_ASSETS)
    .insert({
      name: payload.name,
      type,
      amount: toNumber(payload.amount),
      note: payload.note || "",
      card_last_digits: cardLastDigits,
      bank_name: bankName,
      ...profitConfig,
      ...debtConfig,
    })
    .returning("*");
    await publishDebtProfileMutationInTrx(trx, { action: "CREATE", afterState: row });
    return row;
  });

  return {
    id: Number(created.id),
    name: created.name,
    type: created.type,
    amount: toNumber(created.amount),
    note: created.note || "",
    cardLastDigits: created.card_last_digits || null,
    bankName: created.bank_name || null,
    profitEnabled: Boolean(created.profit_enabled),
    profitFrequency: created.profit_frequency || null,
    annualInterestRate: toNumber(created.annual_interest_rate),
    profitDestination: created.profit_destination || null,
    profitAccountId: created.profit_account_id ? Number(created.profit_account_id) : null,
    profitCreditTime: created.profit_credit_time || null,
    debtInterestEnabled: Boolean(created.debt_interest_enabled),
    debtInterestFrequency: created.debt_interest_frequency || null,
    debtAnnualInterestRate: toNumber(created.debt_annual_interest_rate),
    debtDueDay: created.debt_due_day ? Number(created.debt_due_day) : null,
    debtEndDate: created.debt_end_date || null,
    debtRepaymentFrequency: created.debt_repayment_frequency || null,
    debtKind: created.debt_kind || null,
    debtInitialLimit: toNumber(created.debt_initial_limit),
    debtAccountNumber: created.debt_account_number || null,
  };
}

async function updatePersonalAsset(id, payload) {
  return await withTransaction(async (trx) => {
    const existing = await trx(TABLES.PERSONAL_ASSETS).where("id", id).forUpdate().first();
    if (!existing) return null;

  const type = payload.type !== undefined ? payload.type : existing.type;
  const profitEnabled = payload.profitEnabled !== undefined
    ? Boolean(payload.profitEnabled)
    : Boolean(existing.profit_enabled);
  const profitConfig = normalizeProfitConfig({
    type,
    profitEnabled,
    profitFrequency: payload.profitFrequency !== undefined ? payload.profitFrequency : existing.profit_frequency,
    annualInterestRate: payload.annualInterestRate !== undefined ? payload.annualInterestRate : existing.annual_interest_rate,
    profitDestination: payload.profitDestination !== undefined ? payload.profitDestination : existing.profit_destination,
    profitAccountId: payload.profitAccountId !== undefined ? payload.profitAccountId : existing.profit_account_id,
    profitCreditTime: payload.profitCreditTime !== undefined ? payload.profitCreditTime : existing.profit_credit_time,
  });
  await validateProfitAccount(profitConfig);
  const debtConfig = normalizeDebtConfig({
    type,
    debtKind: payload.debtKind !== undefined ? payload.debtKind : existing.debt_kind,
    debtInitialLimit: payload.debtInitialLimit !== undefined ? payload.debtInitialLimit : existing.debt_initial_limit,
    debtAccountNumber: payload.debtAccountNumber !== undefined ? payload.debtAccountNumber : existing.debt_account_number,
    debtInterestEnabled: payload.debtInterestEnabled !== undefined ? Boolean(payload.debtInterestEnabled) : Boolean(existing.debt_interest_enabled),
    debtInterestFrequency: payload.debtInterestFrequency !== undefined ? payload.debtInterestFrequency : existing.debt_interest_frequency,
    debtAnnualInterestRate: payload.debtAnnualInterestRate !== undefined ? payload.debtAnnualInterestRate : existing.debt_annual_interest_rate,
    debtDueDay: payload.debtDueDay !== undefined ? payload.debtDueDay : existing.debt_due_day,
    debtEndDate: payload.debtEndDate !== undefined ? payload.debtEndDate : existing.debt_end_date,
    debtRepaymentFrequency: payload.debtRepaymentFrequency !== undefined ? payload.debtRepaymentFrequency : existing.debt_repayment_frequency,
  });

    const updateData = { updated_at: trx.fn.now() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.type !== undefined) updateData.type = type;
  if (payload.amount !== undefined) updateData.amount = toNumber(payload.amount);
  if (payload.note !== undefined) updateData.note = payload.note;
  if (payload.cardLastDigits !== undefined) updateData.card_last_digits = payload.cardLastDigits ? String(payload.cardLastDigits).trim() : null;
  if (payload.bankName !== undefined) updateData.bank_name = payload.bankName ? String(payload.bankName).trim() : null;
  Object.assign(updateData, profitConfig);
  Object.assign(updateData, debtConfig);

    const [updated] = await trx(TABLES.PERSONAL_ASSETS)
    .where("id", id)
    .update(updateData)
    .returning("*");

    if (!updated) return null;
    await publishDebtProfileMutationInTrx(trx, {
      action: "UPDATE",
      beforeState: existing,
      afterState: updated,
      changedFields: updateData,
    });
    return {
    id: Number(updated.id),
    name: updated.name,
    type: updated.type,
    amount: toNumber(updated.amount),
    note: updated.note || "",
    cardLastDigits: updated.card_last_digits || null,
    bankName: updated.bank_name || null,
    profitEnabled: Boolean(updated.profit_enabled),
    profitFrequency: updated.profit_frequency || null,
    annualInterestRate: toNumber(updated.annual_interest_rate),
    profitDestination: updated.profit_destination || null,
    profitAccountId: updated.profit_account_id ? Number(updated.profit_account_id) : null,
    profitCreditTime: updated.profit_credit_time || null,
    debtInterestEnabled: Boolean(updated.debt_interest_enabled),
    debtInterestFrequency: updated.debt_interest_frequency || null,
    debtAnnualInterestRate: toNumber(updated.debt_annual_interest_rate),
    debtDueDay: updated.debt_due_day ? Number(updated.debt_due_day) : null,
    debtEndDate: updated.debt_end_date || null,
    debtRepaymentFrequency: updated.debt_repayment_frequency || null,
    debtKind: updated.debt_kind || null,
    debtInitialLimit: toNumber(updated.debt_initial_limit),
    debtAccountNumber: updated.debt_account_number || null,
  };
  });
}

async function deletePersonalAsset(id) {
  return await withTransaction(async (trx) => {
    const existing = await trx(TABLES.PERSONAL_ASSETS).where("id", id).forUpdate().first();
    if (!existing) return 0;
    const deleted = await trx(TABLES.PERSONAL_ASSETS).where("id", id).del();
    await publishDebtProfileMutationInTrx(trx, { action: "DELETE", beforeState: existing });
    return deleted;
  });
}

async function payPersonalAsset(id, payload) {
  const { financialAccountId, receiptId, amount, note, referenceCode, idempotencyKey } = payload;
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền trả nợ phải lớn hơn 0");
  if (!financialAccountId && !receiptId) throw new Error("Vui lòng chọn tài khoản thanh khoản hoặc biên lai ngân hàng để trả nợ");

  return await withTransaction(async (trx) => {
    if (receiptId) await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, Number(receiptId)).forUpdate().first();
    const asset = await trx(TABLES.PERSONAL_ASSETS).where("id", id).forUpdate().first();
    if (!asset) throw new Error("Không tìm thấy mục nợ");

    const creditAccount = await creditLedgerService.getAccountForPersonalAssetInTrx(trx, id, true);
    if (creditAccount && !idempotencyKey && !referenceCode) throw new Error("Credit account payment cần idempotencyKey hoặc referenceCode");
    if (creditAccount) {
      const paymentKey = String(idempotencyKey || referenceCode);
      const existingLedger = await trx(TABLES.CREDIT_ACCOUNT_LEDGER)
        .where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, creditAccount.id)
        .where(COLS.CREDIT_ACCOUNT_LEDGER.IDEMPOTENCY_KEY, paymentKey)
        .first();
      if (existingLedger) return { success: true, alreadyProcessed: true, newAmount: toNumber(asset.amount) };
    }
    const paymentReceipt = receiptId ? await trx(TABLES.PAYMENT_RECEIPT).where(COLS.PAYMENT_RECEIPT.ID, Number(receiptId)).first() : null;
    const paymentMonth = receiptMonth(paymentReceipt || { payment_date: new Date() });
    if (asset.type !== "DEBT_PAYABLE") throw new Error("Invalid debt target");
    await snapshotObligation(trx, "PERSONAL_DEBT", asset, paymentMonth);
    let receiptAllocation = null;
    const currentAmount = toNumber(asset.amount);
    if (numAmount > currentAmount) throw new Error("Debt payment exceeds outstanding balance");
    let newAmount = Math.max(0, currentAmount - numAmount);

    if (receiptId) {
      receiptAllocation = await allocateReceiptInTrx(trx, receiptId, numAmount, "OPERATIONAL_EXPENSE", `PERSONAL_DEBT_PAY_${id}`, note || `Trả bớt nợ "${asset.name}"`, { type: "PERSONAL_DEBT", target: asset });
    } else {
      await debitFinancialAccount(trx, {
        accountId: Number(financialAccountId),
        amount: numAmount,
        sourceKind: "personal_debt_repayment",
        sourceId: `${id}_${Date.now()}`,
        note: note || `Trả bớt nợ "${asset.name}"`,
      });
    }

    let creditResult = null;
    if (creditAccount) {
      creditResult = await creditLedgerService.recordPaymentInTrx(trx, creditAccount.id, {
        amount: numAmount,
        effectiveAt: payload.effectiveAt || new Date(),
        idempotencyKey: idempotencyKey || referenceCode,
        sourceReference: referenceCode || (receiptId ? `receipt:${receiptId}` : null),
        note,
      });
      newAmount = Math.max(0, creditResult.balances.total);
    }
    await trx(TABLES.PERSONAL_ASSETS)
      .where("id", id)
      .update({ amount: newAmount, updated_at: trx.fn.now() });

    const [createdLog] = await trx(TABLES.DEBT_PAYMENT_LOGS)
      .insert({
        target_type: "PERSONAL_DEBT",
        [COLS.DEBT_PAYMENT_LOGS.RECEIPT_ALLOCATION_ID]: receiptAllocation?.allocationId || null,
        target_id: id,
        financial_account_id: receiptAllocation?.financialAccountId || (financialAccountId ? Number(financialAccountId) : null),
        amount: numAmount,
        payment_date: new Date().toISOString().slice(0, 10),
        note: note ? String(note).trim() : null,
      })
      .returning("*");

    if (!creditAccount) {
      await publishPersonalDebtLedgerMutationInTrx(trx, {
        action: "PAYMENT",
        asset,
        log: createdLog,
        balanceAfter: newAmount,
      });
    }

    return { success: true, newAmount, logId: Number(createdLog.id) };
  });
}

async function borrowPersonalAssetInTrx(trx, id, payload) {
  const { financialAccountId, receiptId, amount, note, merchantName, referenceCode, directExpense } = payload;
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("So tien vay them phai lon hon 0");
  const asset = await trx(TABLES.PERSONAL_ASSETS).where("id", id).forUpdate().first();
  if (!asset) throw new Error("Khong tim thay muc no");
  const durableReference = String(referenceCode || payload.idempotencyKey || "").trim() || null;
  if (durableReference) {
    const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS).where("reference_code", durableReference).first();
    if (existingLog) return { success: true, alreadyProcessed: true, newAmount: toNumber(asset.amount), logId: Number(existingLog.id) };
  }
  const creditAccount = await creditLedgerService.getAccountForPersonalAssetInTrx(trx, id, true);
  const isDirect = Boolean(directExpense) || (!financialAccountId && !receiptId);
  if (receiptId) {
    await allocateReceiptInTrx(trx, receiptId, numAmount, "OTHER_INCOME", "PERSONAL_DEBT_BORROW_" + id, note || "Phat sinh no " + asset.name);
  } else if (financialAccountId && !isDirect) {
    await creditFinancialAccount(trx, { accountId: Number(financialAccountId), amount: numAmount, sourceKind: "personal_debt_borrow", sourceId: String(id) + "_" + Date.now(), note: note || "Vay them " + asset.name });
  }
  let newAmount = toNumber(asset.amount) + numAmount;
  if (creditAccount) {
    const creditResult = await creditLedgerService.recordPrincipalInTrx(trx, creditAccount.id, {
      amount: numAmount,
      eventType: creditAccount.product_kind === "OVERDRAFT" ? "OVERDRAFT_DRAW" : "CARD_SPEND",
      effectiveAt: payload.effectiveAt || new Date(),
      idempotencyKey: payload.idempotencyKey || durableReference || ["personal-asset-draw", id, financialAccountId || receiptId || "direct", numAmount, new Date(payload.effectiveAt || Date.now()).toISOString()].join(":"),
      sourceReference: durableReference || (receiptId ? "receipt:" + receiptId : null),
      metadata: { merchantName: merchantName || null, note: note || null },
    });
    newAmount = Math.max(0, creditResult.balances.total);
  }
  await trx(TABLES.PERSONAL_ASSETS).where("id", id).update({ amount: newAmount, updated_at: trx.fn.now() });
  const [createdLog] = await trx(TABLES.DEBT_PAYMENT_LOGS).insert({
    target_type: "PERSONAL_DEBT_BORROW",
    target_id: id,
    financial_account_id: (financialAccountId && !isDirect) ? Number(financialAccountId) : null,
    amount: numAmount,
    payment_date: new Date(payload.effectiveAt || Date.now()).toISOString().slice(0, 10),
    reference_code: durableReference,
    merchant_name: merchantName ? String(merchantName).trim() : null,
    note: note ? String(note).trim() : null,
  }).returning("*");
  if (!creditAccount) {
    await publishPersonalDebtLedgerMutationInTrx(trx, {
      action: "BORROW",
      asset,
      log: createdLog,
      balanceAfter: newAmount,
    });
  }
  return { success: true, newAmount, logId: createdLog ? Number(createdLog.id) : undefined };
}

async function borrowPersonalAsset(id, payload) {
  return withTransaction((trx) => borrowPersonalAssetInTrx(trx, id, payload));
}

async function autoMatchCardTransaction(payload) {
  const { cardLastDigits, bankName, amount, merchantName, referenceCode, note } = payload;
  if (!cardLastDigits) {
    throw new Error("Vui lòng cung cấp 4 số cuối thẻ ngân hàng để đối chiếu");
  }
  const numAmount = toNumber(amount);
  if (numAmount <= 0) {
    throw new Error("Số tiền giao dịch phải lớn hơn 0");
  }

  const cleanLastDigits = String(cardLastDigits).trim();
  let query = db(TABLES.PERSONAL_ASSETS)
    .where("card_last_digits", cleanLastDigits)
    .whereIn("type", ["DEBT_PAYABLE"]);

  if (bankName && bankName.trim()) {
    query = query.whereILike("bank_name", `%${bankName.trim()}%`);
  }

  const matches = await query;
  if (!matches || matches.length === 0) {
    throw new Error(`Không tìm thấy thẻ ngân hàng có 4 số cuối "${cleanLastDigits}"${bankName ? ` tại ${bankName}` : ""}`);
  }
  if (matches.length > 1) {
    throw new Error(`Phát hiện ${matches.length} thẻ ngân hàng có cùng 4 số cuối "${cleanLastDigits}". Vui lòng chỉ định rõ tên ngân hàng hoặc chọn thẻ cụ thể để tránh đối soát nhầm.`);
  }

  const matched = matches[0];

  const borrowResult = await borrowPersonalAsset(matched.id, {
    amount: numAmount,
    merchantName: merchantName || null,
    referenceCode: referenceCode || null,
    directExpense: true,
    note: note || `Quẹt thẻ tự động tại ${merchantName || 'cửa hàng'}`,
  });

  return {
    success: true,
    matchedAsset: {
      id: Number(matched.id),
      name: matched.name,
      cardLastDigits: matched.card_last_digits,
      bankName: matched.bank_name,
    },
    ...borrowResult,
  };
}

async function getDebtPaymentLogs(options = {}) {
  const { limit = 50, targetType } = options;

  let query = db(TABLES.DEBT_PAYMENT_LOGS)
    .leftJoin(TABLES.PERSONAL_ASSETS, function() {
      this.on(`${TABLES.DEBT_PAYMENT_LOGS}.target_id`, '=', `${TABLES.PERSONAL_ASSETS}.id`)
        .andOnIn(`${TABLES.DEBT_PAYMENT_LOGS}.target_type`, ['PERSONAL_DEBT', 'PERSONAL_DEBT_BORROW']);
    })
    .leftJoin(TABLES.INSTALLMENTS, function() {
      this.on(`${TABLES.DEBT_PAYMENT_LOGS}.target_id`, '=', `${TABLES.INSTALLMENTS}.id`)
        .andOn(`${TABLES.DEBT_PAYMENT_LOGS}.target_type`, '=', db.raw('?', ['INSTALLMENT']));
    })
    .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.DEBT_PAYMENT_LOGS}.financial_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
    .select(
      `${TABLES.DEBT_PAYMENT_LOGS}.*`,
      `${TABLES.PERSONAL_ASSETS}.name as asset_name`,
      `${TABLES.PERSONAL_ASSETS}.card_last_digits as asset_card_last_digits`,
      `${TABLES.PERSONAL_ASSETS}.bank_name as asset_bank_name`,
      `${TABLES.INSTALLMENTS}.name as installment_name`,
      `${TABLES.FINANCIAL_ACCOUNTS}.label as financial_account_label`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_display_name as financial_bank_name`,
      `${TABLES.FINANCIAL_ACCOUNTS}.account_number as financial_account_number`
    )
    .whereIn(`${TABLES.DEBT_PAYMENT_LOGS}.target_type`, ['PERSONAL_DEBT', 'PERSONAL_DEBT_BORROW', 'INSTALLMENT'])
    .orderBy(`${TABLES.DEBT_PAYMENT_LOGS}.created_at`, 'desc')
    .limit(limit);

  if (targetType) {
    query = query.where(`${TABLES.DEBT_PAYMENT_LOGS}.target_type`, targetType);
  }

  const rows = await query;
  return rows.map((r) => {
    let targetName = "";
    if (r.target_type === "INSTALLMENT") {
      targetName = r.installment_name || `Hợp đồng #${r.target_id}`;
    } else {
      targetName = r.asset_name || `Khoản nợ #${r.target_id}`;
    }

    let financialAccountName = null;
    if (r.financial_account_label) {
      financialAccountName = r.financial_account_label;
    } else if (r.financial_bank_name || r.financial_account_number) {
      financialAccountName = `${r.financial_bank_name || "Ngân hàng"} (${r.financial_account_number || ""})`.trim();
    }

    return {
      id: Number(r.id),
      targetType: r.target_type,
      targetId: Number(r.target_id),
      targetName,
      periodMonth: r.period_month || null,
      amount: toNumber(r.amount),
      paymentDate: r.payment_date ? (typeof r.payment_date === 'string' ? r.payment_date.slice(0, 10) : new Date(r.payment_date).toISOString().slice(0, 10)) : null,
      note: r.note || "",
      referenceCode: r.reference_code || null,
      merchantName: r.merchant_name || null,
      cardLastDigits: r.asset_card_last_digits || null,
      bankName: r.asset_bank_name || null,
      financialAccountName,
      createdAt: r.created_at,
    };
  });
}

async function getUnallocatedReceipts() {
  return await db(TABLES.PAYMENT_RECEIPT)
    .where("status", "!=", "FULLY_ALLOCATED")
    .whereRaw("COALESCE(unallocated_amount, amount) > 0")
    .orderBy("id", "desc")
    .limit(50);
}

module.exports = { createPersonalAsset, updatePersonalAsset, deletePersonalAsset, payPersonalAsset, borrowPersonalAsset, borrowPersonalAssetInTrx, autoMatchCardTransaction, getDebtPaymentLogs, getUnallocatedReceipts };

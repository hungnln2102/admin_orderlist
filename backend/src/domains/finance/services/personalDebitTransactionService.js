const crypto = require("crypto");
const { db, TABLES, COLS, withTransaction } = require("@/db");
const { eventBus, EVENTS } = require("@/events");

const A = COLS.FINANCIAL_ACCOUNTS;
const L = COLS.FINANCIAL_ACCOUNT_LEDGER;
const C = COLS.PERSONAL_SPENDING_CATEGORIES;
const T = COLS.PERSONAL_DEBIT_TRANSACTION_LOGS;

const DIRECTIONS = new Set(["INFLOW", "OUTFLOW"]);
const CATEGORY_SOURCES = new Set(["RULE", "MANUAL", "UNCLASSIFIED"]);

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asId(value, fieldName) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${fieldName} không hợp lệ`);
  return id;
}

function asOccurredAt(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Thời điểm giao dịch không hợp lệ");
  return date;
}

function normalizeKeywords(value) {
  const items = Array.isArray(value) ? value : [];
  return [...new Set(items.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
}

function mapCategory(row) {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    icon: row.icon || undefined,
    color: row.color || undefined,
    monthlyBudget: row.monthly_budget === null ? null : toNumber(row.monthly_budget),
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAccount(row) {
  return {
    id: Number(row.id),
    name: row.label || row.bank_display_name || `Tài khoản #${row.id}`,
    accountNumberMasked: row.account_number ? `...${String(row.account_number).slice(-4)}` : null,
    bankDisplayName: row.bank_display_name || row.bank_short_code || null,
    balance: toNumber(row.balance),
  };
}

function mapTransaction(row) {
  return {
    id: Number(row.id),
    financialAccountId: Number(row.financial_account_id),
    financialAccountName: row.financial_account_name,
    instrumentMask: row.instrument_mask || row.account_number_masked || null,
    occurredAt: row.occurred_at,
    direction: row.direction,
    amount: toNumber(row.amount),
    merchantNormalized: row.merchant_normalized,
    categoryId: row.category_id ? Number(row.category_id) : null,
    categoryCode: row.category_code || null,
    categoryName: row.category_name || null,
    categoryIcon: row.category_icon || null,
    categoryColor: row.category_color || null,
    categorySource: row.category_source,
    observedBalanceAfter: row.observed_balance_after === null ? null : toNumber(row.observed_balance_after),
    balanceProjectionStatus: row.balance_projection_status,
    note: row.note || null,
    businessKey: row.business_key || null,
    source: row.source,
    createdAt: row.created_at,
  };
}

async function listPersonalFinancialAccounts() {
  const rows = await db(TABLES.FINANCIAL_ACCOUNTS)
    .select("id", "label", "account_number", "bank_display_name", "bank_short_code", "balance")
    .where(A.ACCOUNT_TYPE, "bank")
    .where(A.ACCOUNT_SCOPE, "PERSONAL")
    .where(A.IS_ACTIVE, true)
    .where(A.IS_DELETED, false)
    .orderBy(A.IS_DEFAULT, "desc")
    .orderBy(A.ID, "asc");
  return rows.map(mapAccount);
}

async function listCategories({ includeInactive = false } = {}) {
  let query = db(TABLES.PERSONAL_SPENDING_CATEGORIES).orderBy(C.SORT_ORDER, "asc").orderBy(C.ID, "asc");
  if (!includeInactive) query = query.where(C.IS_ACTIVE, true);
  return (await query).map(mapCategory);
}

async function createCategory(payload) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Tên danh mục là bắt buộc");
  const code = String(payload.code || name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (!code) throw new Error("Mã danh mục không hợp lệ");

  const [created] = await db(TABLES.PERSONAL_SPENDING_CATEGORIES)
    .insert({
      [C.CODE]: code,
      [C.NAME]: name,
      [C.ICON]: payload.icon || "Tag",
      [C.COLOR]: payload.color || "slate",
      [C.MONTHLY_BUDGET]: payload.monthlyBudget === undefined || payload.monthlyBudget === null ? null : toNumber(payload.monthlyBudget),
      [C.KEYWORDS]: JSON.stringify(normalizeKeywords(payload.keywords)),
      [C.IS_ACTIVE]: payload.isActive !== false,
      [C.SORT_ORDER]: Number.isInteger(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
    })
    .returning("*");
  return mapCategory(created);
}

async function updateCategory(categoryId, payload) {
  const id = asId(categoryId, "categoryId");
  const changes = { [C.UPDATED_AT]: db.fn.now() };
  if (payload.code !== undefined) {
    const code = String(payload.code).trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,64}$/.test(code)) throw new Error("Mã danh mục không hợp lệ");
    changes[C.CODE] = code;
  }
  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) throw new Error("Tên danh mục là bắt buộc");
    changes[C.NAME] = name;
  }
  if (payload.icon !== undefined) changes[C.ICON] = payload.icon || null;
  if (payload.color !== undefined) changes[C.COLOR] = payload.color || null;
  if (payload.monthlyBudget !== undefined) changes[C.MONTHLY_BUDGET] = payload.monthlyBudget === null ? null : toNumber(payload.monthlyBudget);
  if (payload.keywords !== undefined) changes[C.KEYWORDS] = JSON.stringify(normalizeKeywords(payload.keywords));
  if (payload.isActive !== undefined) changes[C.IS_ACTIVE] = Boolean(payload.isActive);
  if (payload.sortOrder !== undefined) changes[C.SORT_ORDER] = Number(payload.sortOrder) || 0;
  const [updated] = await db(TABLES.PERSONAL_SPENDING_CATEGORIES).where(C.ID, id).update(changes).returning("*");
  if (!updated) throw new Error("Danh mục không tồn tại");
  return mapCategory(updated);
}

async function archiveCategory(categoryId) {
  return updateCategory(categoryId, { isActive: false });
}

async function getCategoryInTrx(trx, categoryId) {
  if (!categoryId) return null;
  const category = await trx(TABLES.PERSONAL_SPENDING_CATEGORIES).where(C.ID, asId(categoryId, "categoryId")).first();
  if (!category || !category[C.IS_ACTIVE]) throw new Error("Danh mục không tồn tại hoặc đã ngừng dùng");
  return category;
}

async function getTransactionById(id, connection = db) {
  const row = await connection({ t: TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS })
    .leftJoin({ a: TABLES.FINANCIAL_ACCOUNTS }, "a.id", "t.financial_account_id")
    .leftJoin({ c: TABLES.PERSONAL_SPENDING_CATEGORIES }, "c.id", "t.category_id")
    .where("t.id", id)
    .select(
      "t.*",
      "a.label as financial_account_name",
      connection.raw("CASE WHEN a.account_number IS NULL THEN NULL ELSE '...' || RIGHT(a.account_number, 4) END as account_number_masked"),
      "c.code as category_code", "c.name as category_name", "c.icon as category_icon", "c.color as category_color"
    )
    .first();
  if (!row) throw new Error("Log giao dịch cá nhân không tồn tại");
  return mapTransaction(row);
}

async function recordPersonalDebitTransactionInTrx(trx, payload) {
  const financialAccountId = asId(payload.financialAccountId, "financialAccountId");
  const amount = toNumber(payload.amount);
  if (amount <= 0) throw new Error("Số tiền phải lớn hơn 0");
  const direction = String(payload.direction || "");
  if (!DIRECTIONS.has(direction)) throw new Error("Chiều giao dịch không hợp lệ");
  const merchant = String(payload.merchantNormalized || payload.merchant || "").trim();
  if (!merchant) throw new Error("Nơi giao dịch là bắt buộc");
  const categorySource = String(payload.categorySource || "MANUAL");
  if (!CATEGORY_SOURCES.has(categorySource)) throw new Error("Nguồn danh mục không hợp lệ");
  const businessKey = String(payload.businessKey || `manual:${crypto.randomUUID()}`);

  const account = await trx(TABLES.FINANCIAL_ACCOUNTS)
    .where(A.ID, financialAccountId)
    .where(A.ACCOUNT_TYPE, "bank")
    .where(A.ACCOUNT_SCOPE, "PERSONAL")
    .where(A.IS_ACTIVE, true)
    .where(A.IS_DELETED, false)
    .forUpdate()
    .first();
  if (!account) throw new Error("Tài khoản cá nhân không tồn tại hoặc đã ngừng hoạt động");

  const existing = await trx(TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS)
    .where(T.FINANCIAL_ACCOUNT_ID, financialAccountId)
    .where(T.BUSINESS_KEY, businessKey)
    .first();
  if (existing) return { transaction: await getTransactionById(existing.id, trx), alreadyProcessed: true };

  const category = await getCategoryInTrx(trx, payload.categoryId);
  const currentBalance = toNumber(account[A.BALANCE]);
  const signedAmount = direction === "INFLOW" ? amount : -amount;
  const expectedBalance = currentBalance + signedAmount;
  const hasObservedBalance = payload.observedBalanceAfter !== undefined && payload.observedBalanceAfter !== null && payload.observedBalanceAfter !== "";
  const observedBalance = hasObservedBalance ? toNumber(payload.observedBalanceAfter) : null;
  const balanceAfter = hasObservedBalance ? observedBalance : expectedBalance;
  if (balanceAfter < 0) throw new Error("Số dư tài khoản không thể âm");
  const reconciliationDelta = hasObservedBalance ? observedBalance - expectedBalance : 0;
  const projectionStatus = hasObservedBalance
    ? (reconciliationDelta === 0 ? "OBSERVED_APPLIED" : "RECONCILIATION_ADJUSTED")
    : "PROJECTED_APPLIED";

  const [log] = await trx(TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS)
    .insert({
      [T.FINANCIAL_ACCOUNT_ID]: financialAccountId,
      [T.CATEGORY_ID]: category ? category[C.ID] : null,
      [T.INSTRUMENT_MASK]: payload.instrumentMask || null,
      [T.OCCURRED_AT]: asOccurredAt(payload.occurredAt),
      [T.DIRECTION]: direction,
      [T.AMOUNT]: amount,
      [T.MERCHANT_NORMALIZED]: merchant,
      [T.CATEGORY_SOURCE]: categorySource,
      [T.OBSERVED_BALANCE_AFTER]: observedBalance,
      [T.BALANCE_PROJECTION_STATUS]: projectionStatus,
      [T.BUSINESS_KEY]: businessKey,
      [T.SOURCE]: String(payload.source || "MANUAL"),
      [T.NOTE]: payload.note ? String(payload.note).trim() : null,
      [T.METADATA]: JSON.stringify({ expectedBalanceAfter: expectedBalance, reconciliationDelta }),
    })
    .returning("*");

  await trx(TABLES.FINANCIAL_ACCOUNTS).where(A.ID, financialAccountId).update({
    [A.BALANCE]: balanceAfter,
    [A.TOTAL_RECEIVED]: toNumber(account[A.TOTAL_RECEIVED]) + (direction === "INFLOW" ? amount : 0),
    [A.TOTAL_WITHDRAWN]: toNumber(account[A.TOTAL_WITHDRAWN]) + (direction === "OUTFLOW" ? amount : 0),
    [A.UPDATED_AT]: trx.fn.now(),
  });

  const [ledger] = await trx(TABLES.FINANCIAL_ACCOUNT_LEDGER)
    .insert({
      [L.FINANCIAL_ACCOUNT_ID]: financialAccountId,
      [L.AMOUNT]: amount,
      [L.BALANCE_AFTER]: balanceAfter,
      [L.ENTRY_TYPE]: direction === "INFLOW" ? "personal_debit_in" : "personal_debit_out",
      [L.REFERENCE_TYPE]: "personal_debit_transaction",
      [L.REFERENCE_ID]: String(log[T.ID]),
      [L.DESCRIPTION]: merchant,
      [L.METADATA]: JSON.stringify({ signedAmount, expectedBalanceAfter: expectedBalance, observedBalanceAfter: observedBalance, reconciliationDelta }),
    })
    .returning("*");

  await trx(TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS)
    .where(T.ID, log[T.ID])
    .update({ [T.FINANCIAL_ACCOUNT_LEDGER_ID]: ledger[L.ID], [T.UPDATED_AT]: trx.fn.now() });

  const transaction = await getTransactionById(log[T.ID], trx);
  trx.afterCommit(() => eventBus.emit(EVENTS.FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED, {
    financialAccountId,
    transactionId: transaction.id,
    direction,
    occurredAt: transaction.occurredAt,
  }));
  return { transaction, alreadyProcessed: false };
}

async function createPersonalDebitTransaction(payload) {
  return withTransaction((trx) => recordPersonalDebitTransactionInTrx(trx, payload));
}

async function updateTransactionCategory(transactionId, categoryId) {
  const id = asId(transactionId, "transactionId");
  return withTransaction(async (trx) => {
    const transaction = await trx(TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS).where(T.ID, id).forUpdate().first();
    if (!transaction) throw new Error("Log giao dịch cá nhân không tồn tại");
    const category = await getCategoryInTrx(trx, categoryId);
    await trx(TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS).where(T.ID, id).update({
      [T.CATEGORY_ID]: category[C.ID],
      [T.CATEGORY_SOURCE]: "MANUAL",
      [T.UPDATED_AT]: trx.fn.now(),
    });
    const updated = await getTransactionById(id, trx);
    trx.afterCommit(() => eventBus.emit(EVENTS.FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED, {
      financialAccountId: updated.financialAccountId,
      transactionId: updated.id,
      action: "CATEGORY_UPDATED",
    }));
    return updated;
  });
}

async function listPersonalDebitTransactions(options = {}) {
  const rows = await db({ t: TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS })
    .leftJoin({ a: TABLES.FINANCIAL_ACCOUNTS }, "a.id", "t.financial_account_id")
    .leftJoin({ c: TABLES.PERSONAL_SPENDING_CATEGORIES }, "c.id", "t.category_id")
    .modify((query) => {
      if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
        query.whereRaw("TO_CHAR(t.occurred_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM') = ?", [options.month]);
      }
      if (options.accountId) query.where("t.financial_account_id", asId(options.accountId, "accountId"));
    })
    .select(
      "t.*",
      "a.label as financial_account_name",
      db.raw("CASE WHEN a.account_number IS NULL THEN NULL ELSE '...' || RIGHT(a.account_number, 4) END as account_number_masked"),
      "c.code as category_code", "c.name as category_name", "c.icon as category_icon", "c.color as category_color"
    )
    .orderBy("t.occurred_at", "desc")
    .orderBy("t.id", "desc");
  return rows.map(mapTransaction);
}

async function getPersonalDebitWorkspace(options = {}) {
  const [accounts, categories, transactions] = await Promise.all([
    listPersonalFinancialAccounts(),
    listCategories(),
    listPersonalDebitTransactions(options),
  ]);
  return { accounts, categories, transactions };
}

module.exports = {
  archiveCategory,
  createCategory,
  createPersonalDebitTransaction,
  getPersonalDebitWorkspace,
  listCategories,
  recordPersonalDebitTransactionInTrx,
  updateCategory,
  updateTransactionCategory,
};


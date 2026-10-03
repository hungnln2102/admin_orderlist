/**
 * walletService.js (V2)
 * Quản lý Tài khoản Thanh toán (Bank) và Ví USDT (USDT) từ DB (finance.financial_accounts)
 */
const { db, TABLES, withTransaction } = require("@/db");

const BANK_TABLE = TABLES.SHOP_BANK_ACCOUNTS;
const USDT_TABLE = TABLES.USDT_WALLETS;
const BANK_LEDGER_TABLE = TABLES.SHOP_BANK_ACCOUNT_LEDGER;
const USDT_LEDGER_TABLE = TABLES.USDT_WALLET_LEDGER;

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// --- BANK ACCOUNTS ---

async function listBankAccounts() {
  const rows = await db(BANK_TABLE)
    .select(
      "id",
      "label",
      "account_number as accountNumber",
      "account_holder as accountHolder",
      "bank_bin as bankBin",
      "bank_short_code as bankShortCode",
      "bank_display_name as bankDisplayName",
      "qr_note_prefix as qrNotePrefix",
      "is_default as isDefault",
      "is_active as isActive",
      "total_withdrawn as totalWithdrawn",
      "total_received as totalReceived",
      "balance as balanceRemaining",
      "created_at as createdAt",
      "updated_at as updatedAt"
    )
    .where("account_type", "bank")
    .where("is_deleted", false)
    .orderBy("is_default", "desc")
    .orderBy("is_active", "desc")
    .orderBy("id", "desc");

  return rows.map((r) => ({
    ...r,
    id: Number(r.id),
    totalWithdrawn: toNumber(r.totalWithdrawn),
    totalReceived: toNumber(r.totalReceived),
    balanceRemaining: toNumber(r.balanceRemaining),
    isDefault: Boolean(r.isDefault),
    isActive: Boolean(r.isActive),
  }));
}

async function createBankAccount(payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(BANK_TABLE).where("account_type", "bank").update({ is_default: false });
    }

    const [inserted] = await trx(BANK_TABLE)
      .insert({
        account_type: "bank",
        label: payload.label || null,
        account_number: String(payload.accountNumber || "").trim(),
        account_holder: String(payload.accountHolder || "").trim(),
        bank_bin: payload.bankBin || null,
        bank_short_code: payload.bankShortCode || null,
        bank_display_name: payload.bankDisplayName || null,
        qr_note_prefix: payload.qrNotePrefix || null,
        is_default: Boolean(payload.isDefault),
        is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
        total_withdrawn: 0,
        total_received: 0,
        balance: 0,
        is_deleted: false,
      })
      .returning("id");

    return { id: inserted.id || inserted };
  });
}

async function updateBankAccount(id, payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(BANK_TABLE).where("account_type", "bank").whereNot("id", id).update({ is_default: false });
    }

    const updateData = { updated_at: trx.fn.now() };
    if (payload.label !== undefined) updateData.label = payload.label;
    if (payload.accountNumber !== undefined) updateData.account_number = String(payload.accountNumber).trim();
    if (payload.accountHolder !== undefined) updateData.account_holder = String(payload.accountHolder).trim();
    if (payload.bankBin !== undefined) updateData.bank_bin = payload.bankBin;
    if (payload.bankShortCode !== undefined) updateData.bank_short_code = payload.bankShortCode;
    if (payload.bankDisplayName !== undefined) updateData.bank_display_name = payload.bankDisplayName;
    if (payload.qrNotePrefix !== undefined) updateData.qr_note_prefix = payload.qrNotePrefix;
    if (payload.isDefault !== undefined) updateData.is_default = Boolean(payload.isDefault);
    if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);

    await trx(BANK_TABLE).where("account_type", "bank").where("id", id).update(updateData);
    return { success: true };
  });
}

async function setDefaultBankAccount(id) {
  return withTransaction(async (trx) => {
    await trx(BANK_TABLE).where("account_type", "bank").update({ is_default: false });
    await trx(BANK_TABLE).where("account_type", "bank").where("id", id).update({ is_default: true, updated_at: trx.fn.now() });
    return { success: true };
  });
}

async function deleteBankAccount(id) {
  await db(BANK_TABLE).where("account_type", "bank").where("id", id).update({ is_deleted: true, is_active: false });
  return { success: true };
}

async function recordBankWithdrawal(id, amount, note = "") {
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền rút phải lớn hơn 0");

  return withTransaction(async (trx) => {
    const account = await trx(BANK_TABLE).where("account_type", "bank").where("id", id).first();
    if (!account) throw new Error("Không tìm thấy tài khoản ngân hàng");

    const newBalance = toNumber(account.balance) - numAmount;
    const newWithdrawn = toNumber(account.total_withdrawn) + numAmount;

    await trx(BANK_TABLE).where("account_type", "bank").where("id", id).update({
      balance: newBalance,
      total_withdrawn: newWithdrawn,
      updated_at: trx.fn.now(),
    });

    try {
      await trx(BANK_LEDGER_TABLE).insert({
        financial_account_id: id,
        entry_type: "withdraw",
        amount: numAmount,
        signed_amount: -numAmount,
        balance_after: newBalance,
        source_kind: "manual_withdraw",
        note: note || "Rút tiền tài khoản",
      });
    } catch (e) {
      // Ledger insert optional
    }

    return { success: true, balanceRemaining: newBalance, totalWithdrawn: newWithdrawn };
  });
}

// --- USDT WALLETS ---

async function listUsdtWallets() {
  const rows = await db(USDT_TABLE)
    .select(
      "id",
      "label",
      "account_number as walletAddress",
      "bank_short_code as network",
      "is_default as isDefault",
      "is_active as isActive",
      "total_received as totalReceived",
      "total_withdrawn as totalWithdrawn",
      "balance as balanceRemaining",
      "created_at as createdAt",
      "updated_at as updatedAt"
    )
    .where("account_type", "usdt")
    .where("is_deleted", false)
    .orderBy("is_default", "desc")
    .orderBy("is_active", "desc")
    .orderBy("id", "desc");

  return rows.map((r) => ({
    ...r,
    id: Number(r.id),
    totalReceived: toNumber(r.totalReceived),
    totalWithdrawn: toNumber(r.totalWithdrawn),
    balanceRemaining: toNumber(r.balanceRemaining),
    isDefault: Boolean(r.isDefault),
    isActive: Boolean(r.isActive),
  }));
}

async function createUsdtWallet(payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(USDT_TABLE).where("account_type", "usdt").update({ is_default: false });
    }

    const [inserted] = await trx(USDT_TABLE)
      .insert({
        account_type: "usdt",
        label: payload.label || null,
        account_number: String(payload.walletAddress || "").trim(),
        bank_short_code: payload.network || "TRC20",
        is_default: Boolean(payload.isDefault),
        is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
        total_received: 0,
        total_withdrawn: 0,
        balance: 0,
        is_deleted: false,
      })
      .returning("id");

    return { id: inserted.id || inserted };
  });
}

async function updateUsdtWallet(id, payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(USDT_TABLE).where("account_type", "usdt").whereNot("id", id).update({ is_default: false });
    }

    const updateData = { updated_at: trx.fn.now() };
    if (payload.label !== undefined) updateData.label = payload.label;
    if (payload.walletAddress !== undefined) updateData.account_number = String(payload.walletAddress).trim();
    if (payload.network !== undefined) updateData.bank_short_code = payload.network;
    if (payload.isDefault !== undefined) updateData.is_default = Boolean(payload.isDefault);
    if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);

    await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).update(updateData);
    return { success: true };
  });
}

async function setDefaultUsdtWallet(id) {
  return withTransaction(async (trx) => {
    await trx(USDT_TABLE).where("account_type", "usdt").update({ is_default: false });
    await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).update({ is_default: true, updated_at: trx.fn.now() });
    return { success: true };
  });
}

async function deleteUsdtWallet(id) {
  await db(USDT_TABLE).where("account_type", "usdt").where("id", id).update({ is_deleted: true, is_active: false });
  return { success: true };
}

async function recordUsdtWithdrawal(id, amount, note = "") {
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền rút phải lớn hơn 0 USDT");

  return withTransaction(async (trx) => {
    const wallet = await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).first();
    if (!wallet) throw new Error("Không tìm thấy ví USDT");

    const newBalance = toNumber(wallet.balance) - numAmount;
    const newWithdrawn = toNumber(wallet.total_withdrawn) + numAmount;

    await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).update({
      balance: newBalance,
      total_withdrawn: newWithdrawn,
      updated_at: trx.fn.now(),
    });

    try {
      await trx(USDT_LEDGER_TABLE).insert({
        financial_account_id: id,
        entry_type: "withdraw",
        amount: numAmount,
        signed_amount: -numAmount,
        balance_after: newBalance,
        source_kind: "manual_withdraw",
        note: note || "Rút tiền ví USDT",
      });
    } catch (e) {
      // Ledger insert optional
    }

    return { success: true, balanceRemaining: newBalance, totalWithdrawn: newWithdrawn };
  });
}

// Fetch live Binance rate or return fallback rate
async function getUsdtExchangeRate() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd");
    const data = await res.json();
    const rate = Number(data?.tether?.vnd) || 25450;
    return { vndPerUsdt: rate, symbol: "USDT/VND", source: "coingecko" };
  } catch (err) {
    return { vndPerUsdt: 25450, symbol: "USDT/VND", source: "fallback" };
  }
}

module.exports = {
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  setDefaultBankAccount,
  deleteBankAccount,
  recordBankWithdrawal,
  listUsdtWallets,
  createUsdtWallet,
  updateUsdtWallet,
  setDefaultUsdtWallet,
  deleteUsdtWallet,
  recordUsdtWithdrawal,
  getUsdtExchangeRate,
};

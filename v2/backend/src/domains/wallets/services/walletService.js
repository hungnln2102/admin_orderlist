/**
 * walletService.js (V2)
 * Quản lý Tài khoản Thanh toán (Bank) và Ví USDT (USDT) từ DB
 */
const { db, TABLES, withTransaction } = require("@/db");

const BANK_TABLE = TABLES.SHOP_BANK_ACCOUNTS || "admin.shop_bank_accounts";
const USDT_TABLE = TABLES.USDT_WALLETS || "admin.usdt_wallets";
const BANK_LEDGER_TABLE = TABLES.SHOP_BANK_ACCOUNT_LEDGER || "admin.shop_bank_account_ledger";
const USDT_LEDGER_TABLE = TABLES.USDT_WALLET_LEDGER || "admin.usdt_wallet_ledger";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// --- BANK ACCOUNTS ---

async function listBankAccounts() {
  try {
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
  } catch (err) {
    // Fallback to unified financial_accounts table if shop_bank_accounts does not exist
    if (err.code === "42P01") {
      const rows = await db("finance.financial_accounts")
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
    throw err;
  }
}

async function createBankAccount(payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(BANK_TABLE).update({ is_default: false });
    }

    const [inserted] = await trx(BANK_TABLE)
      .insert({
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
      })
      .returning("id");

    return { id: inserted.id || inserted };
  });
}

async function updateBankAccount(id, payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(BANK_TABLE).whereNot("id", id).update({ is_default: false });
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

    await trx(BANK_TABLE).where("id", id).update(updateData);
    return { success: true };
  });
}

async function setDefaultBankAccount(id) {
  return withTransaction(async (trx) => {
    await trx(BANK_TABLE).update({ is_default: false });
    await trx(BANK_TABLE).where("id", id).update({ is_default: true, updated_at: trx.fn.now() });
    return { success: true };
  });
}

async function deleteBankAccount(id) {
  await db(BANK_TABLE).where("id", id).del();
  return { success: true };
}

async function recordBankWithdrawal(id, amount, note = "") {
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền rút phải lớn hơn 0");

  return withTransaction(async (trx) => {
    const account = await trx(BANK_TABLE).where("id", id).first();
    if (!account) throw new Error("Không tìm thấy tài khoản ngân hàng");

    const newBalance = toNumber(account.balance) - numAmount;
    const newWithdrawn = toNumber(account.total_withdrawn) + numAmount;

    await trx(BANK_TABLE).where("id", id).update({
      balance: newBalance,
      total_withdrawn: newWithdrawn,
      updated_at: trx.fn.now(),
    });

    try {
      await trx(BANK_LEDGER_TABLE).insert({
        shop_bank_account_id: id,
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
  try {
    const rows = await db(USDT_TABLE)
      .select(
        "id",
        "label",
        "wallet_address as walletAddress",
        "network",
        "is_default as isDefault",
        "is_active as isActive",
        "total_received as totalReceived",
        "total_withdrawn as totalWithdrawn",
        "balance as balanceRemaining",
        "created_at as createdAt",
        "updated_at as updatedAt"
      )
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
  } catch (err) {
    if (err.code === "42P01") {
      const rows = await db("finance.financial_accounts")
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
    throw err;
  }
}

async function createUsdtWallet(payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(USDT_TABLE).update({ is_default: false });
    }

    const [inserted] = await trx(USDT_TABLE)
      .insert({
        label: payload.label || null,
        wallet_address: String(payload.walletAddress || "").trim(),
        network: payload.network || "TRC20",
        is_default: Boolean(payload.isDefault),
        is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
        total_received: 0,
        total_withdrawn: 0,
        balance: 0,
      })
      .returning("id");

    return { id: inserted.id || inserted };
  });
}

async function updateUsdtWallet(id, payload) {
  return withTransaction(async (trx) => {
    if (payload.isDefault) {
      await trx(USDT_TABLE).whereNot("id", id).update({ is_default: false });
    }

    const updateData = { updated_at: trx.fn.now() };
    if (payload.label !== undefined) updateData.label = payload.label;
    if (payload.walletAddress !== undefined) updateData.wallet_address = String(payload.walletAddress).trim();
    if (payload.network !== undefined) updateData.network = payload.network;
    if (payload.isDefault !== undefined) updateData.is_default = Boolean(payload.isDefault);
    if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);

    await trx(USDT_TABLE).where("id", id).update(updateData);
    return { success: true };
  });
}

async function setDefaultUsdtWallet(id) {
  return withTransaction(async (trx) => {
    await trx(USDT_TABLE).update({ is_default: false });
    await trx(USDT_TABLE).where("id", id).update({ is_default: true, updated_at: trx.fn.now() });
    return { success: true };
  });
}

async function deleteUsdtWallet(id) {
  await db(USDT_TABLE).where("id", id).del();
  return { success: true };
}

async function recordUsdtWithdrawal(id, amount, note = "") {
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền rút phải lớn hơn 0 USDT");

  return withTransaction(async (trx) => {
    const wallet = await trx(USDT_TABLE).where("id", id).first();
    if (!wallet) throw new Error("Không tìm thấy ví USDT");

    const newBalance = toNumber(wallet.balance) - numAmount;
    const newWithdrawn = toNumber(wallet.total_withdrawn) + numAmount;

    await trx(USDT_TABLE).where("id", id).update({
      balance: newBalance,
      total_withdrawn: newWithdrawn,
      updated_at: trx.fn.now(),
    });

    try {
      await trx(USDT_LEDGER_TABLE).insert({
        usdt_wallet_id: id,
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

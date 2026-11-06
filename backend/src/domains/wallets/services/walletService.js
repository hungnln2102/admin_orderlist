/**
 * walletService.js (V2)
 * Quản lý Tài khoản Thanh toán (Bank) và Ví USDT (USDT) từ DB (finance.financial_accounts)
 */
const { db, TABLES, withTransaction } = require("@/db");
const { EVENTS, publishEventInTrx } = require("@/events");

const BANK_TABLE = TABLES.SHOP_BANK_ACCOUNTS;
const USDT_TABLE = TABLES.USDT_WALLETS;
const BANK_LEDGER_TABLE = TABLES.SHOP_BANK_ACCOUNT_LEDGER;
const USDT_LEDGER_TABLE = TABLES.USDT_WALLET_LEDGER;

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

async function publishAccountEvent(trx, { action, accountType, accountId, beforeState = null, afterState = null, payload = {}, reason = null }) {
  await publishEventInTrx(trx, {
    eventName: action === "WITHDRAW" ? EVENTS.FINANCIAL_ACCOUNT_WITHDRAWN : EVENTS.FINANCIAL_ACCOUNT_MUTATED,
    aggregateType: "FINANCIAL_ACCOUNT",
    aggregateId: accountId,
    action,
    beforeState,
    afterState,
    changedFields: payload.changedFields || {},
    source: "API",
    reason,
    payload: { accountType, accountId: Number(accountId), ...payload },
  });
}

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
      "account_scope as accountScope",
      "is_default as isDefault",
      "is_active as isActive",
      "total_withdrawn as totalWithdrawn",
      "total_received as totalReceived",
      "balance as balanceRemaining",
      "card_last_digits as cardLastDigits",
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
    accountScope: r.accountScope || "SHOP",
    totalWithdrawn: toNumber(r.totalWithdrawn),
    totalReceived: toNumber(r.totalReceived),
    balanceRemaining: toNumber(r.balanceRemaining),
    cardLastDigits: r.cardLastDigits || null,
    isDefault: Boolean(r.isDefault),
    isActive: Boolean(r.isActive),
  }));
}

async function syncBankInstrumentMappingInTrx(trx, { accountId, cardLastDigits, bankDisplayName, bankShortCode, accountHolder }) {
  if (!TABLES.BANK_INSTRUMENT_MAPPINGS) return;
  const numericId = Number(accountId);
  const cleanDigits = cardLastDigits ? String(cardLastDigits).trim() : null;

  if (cleanDigits) {
    const bankCode = String(bankShortCode || bankDisplayName || "VPB").toUpperCase();
    const provider = bankCode.includes("VPB") || bankCode.includes("VPBANK") ? "VPBANK" : (bankShortCode || "OTHER").toUpperCase();

    const existing = await trx(TABLES.BANK_INSTRUMENT_MAPPINGS)
      .where("linked_financial_account_id", numericId)
      .where("instrument_kind", "DEBIT_CARD")
      .first();

    if (existing) {
      await trx(TABLES.BANK_INSTRUMENT_MAPPINGS)
        .where("id", existing.id)
        .update({
          provider,
          masked_suffix: cleanDigits,
          card_holder_name: accountHolder ? String(accountHolder).trim() : existing.card_holder_name,
          product_hint: bankDisplayName || existing.product_hint,
          status: "ACTIVE",
          updated_at: trx.fn.now(),
        });
    } else {
      await trx(TABLES.BANK_INSTRUMENT_MAPPINGS).insert({
        provider,
        instrument_kind: "DEBIT_CARD",
        masked_suffix: cleanDigits,
        card_holder_name: accountHolder ? String(accountHolder).trim() : null,
        product_hint: bankDisplayName || null,
        linked_financial_account_id: numericId,
        status: "ACTIVE",
      });
    }
  } else {
    await trx(TABLES.BANK_INSTRUMENT_MAPPINGS)
      .where("linked_financial_account_id", numericId)
      .where("instrument_kind", "DEBIT_CARD")
      .update({
        status: "INACTIVE",
        updated_at: trx.fn.now(),
      });
  }
}

async function createBankAccount(payload) {
  return withTransaction(async (trx) => {
    const accountNumber = String(payload.accountNumber || "").trim();
    const bankShortCode = payload.bankShortCode || null;
    const bankBin = payload.bankBin || null;

    if (accountNumber) {
      let query = trx(BANK_TABLE)
        .where("account_type", "bank")
        .where("is_deleted", false)
        .where("account_number", accountNumber);

      if (bankShortCode) {
        query = query.where("bank_short_code", bankShortCode);
      } else if (bankBin) {
        query = query.where("bank_bin", bankBin);
      }

      const existing = await query.first();
      if (existing) {
        const bankName = existing.bank_display_name || existing.bank_short_code || "ngân hàng này";
        throw new Error(`Số tài khoản "${accountNumber}" đã tồn tại tại ${bankName}! Vui lòng kiểm tra lại.`);
      }
    }

    if (payload.isDefault) {
      await trx(BANK_TABLE).where("account_type", "bank").update({ is_default: false });
    }

    const [inserted] = await trx(BANK_TABLE)
      .insert({
        account_type: "bank",
        label: payload.label || null,
        account_number: accountNumber,
        account_holder: String(payload.accountHolder || "").trim(),
        bank_bin: bankBin,
        bank_short_code: bankShortCode,
        bank_display_name: payload.bankDisplayName || null,
        qr_note_prefix: payload.qrNotePrefix || null,
        account_scope: payload.accountScope || "SHOP",
        is_default: Boolean(payload.isDefault),
        is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
        total_withdrawn: 0,
        total_received: 0,
        balance: toNumber(payload.balance),
        card_last_digits: payload.cardLastDigits ? String(payload.cardLastDigits).trim() : null,
        is_deleted: false,
      })
      .returning("*");

    if (payload.cardLastDigits) {
      await syncBankInstrumentMappingInTrx(trx, {
        accountId: inserted.id,
        cardLastDigits: payload.cardLastDigits,
        bankDisplayName: payload.bankDisplayName,
        bankShortCode: payload.bankShortCode,
        accountHolder: payload.accountHolder,
      });
    }

    await publishAccountEvent(trx, {
      action: "CREATE",
      accountType: "bank",
      accountId: inserted.id,
      afterState: inserted,
    });
    return { id: inserted.id };
  });
}

async function updateBankAccount(id, payload) {
  const numericId = Number(id);
  return withTransaction(async (trx) => {
    const beforeState = await trx(BANK_TABLE).where("id", numericId).first();
    if (!beforeState) throw new Error("Không tìm thấy tài khoản ngân hàng");
    if (payload.accountNumber !== undefined || payload.bankShortCode !== undefined || payload.bankBin !== undefined) {
      const currentAcc = await trx(BANK_TABLE).where("id", numericId).first();
      if (currentAcc) {
        const accountNumber = payload.accountNumber !== undefined ? String(payload.accountNumber || "").trim() : currentAcc.account_number;
        const bankShortCode = payload.bankShortCode !== undefined ? payload.bankShortCode : currentAcc.bank_short_code;
        const bankBin = payload.bankBin !== undefined ? payload.bankBin : currentAcc.bank_bin;

        if (accountNumber) {
          let query = trx(BANK_TABLE)
            .where("account_type", "bank")
            .where("is_deleted", false)
            .whereNot("id", numericId)
            .where("account_number", accountNumber);

          if (bankShortCode) {
            query = query.where("bank_short_code", bankShortCode);
          } else if (bankBin) {
            query = query.where("bank_bin", bankBin);
          }

          const existing = await query.first();
          if (existing) {
            const bankName = existing.bank_display_name || existing.bank_short_code || "ngân hàng này";
            throw new Error(`Số tài khoản "${accountNumber}" đã tồn tại tại ${bankName}! Vui lòng kiểm tra lại.`);
          }
        }
      }
    }

    if (payload.isDefault) {
      await trx(BANK_TABLE).where("account_type", "bank").whereNot("id", numericId).update({ is_default: false });
    }

    const updateData = { updated_at: trx.fn.now() };
    if (payload.label !== undefined) updateData.label = payload.label;
    if (payload.accountNumber !== undefined) updateData.account_number = String(payload.accountNumber).trim();
    if (payload.accountHolder !== undefined) updateData.account_holder = String(payload.accountHolder).trim();
    if (payload.bankBin !== undefined) updateData.bank_bin = payload.bankBin;
    if (payload.bankShortCode !== undefined) updateData.bank_short_code = payload.bankShortCode;
    if (payload.bankDisplayName !== undefined) updateData.bank_display_name = payload.bankDisplayName;
    if (payload.qrNotePrefix !== undefined) updateData.qr_note_prefix = payload.qrNotePrefix;
    if (payload.accountScope !== undefined) updateData.account_scope = payload.accountScope;
    if (payload.isDefault !== undefined) updateData.is_default = Boolean(payload.isDefault);
    if (payload.isActive !== undefined) updateData.is_active = Boolean(payload.isActive);
    if (payload.balance !== undefined) updateData.balance = toNumber(payload.balance);
    if (payload.cardLastDigits !== undefined) updateData.card_last_digits = payload.cardLastDigits ? String(payload.cardLastDigits).trim() : null;

    await trx(BANK_TABLE).where("account_type", "bank").where("id", numericId).update(updateData);

    if (payload.cardLastDigits !== undefined) {
      await syncBankInstrumentMappingInTrx(trx, {
        accountId: numericId,
        cardLastDigits: updateData.card_last_digits,
        bankDisplayName: updateData.bank_display_name || beforeState.bank_display_name,
        bankShortCode: updateData.bank_short_code || beforeState.bank_short_code,
        accountHolder: updateData.account_holder || beforeState.account_holder,
      });
    }
    const afterState = await trx(BANK_TABLE).where("id", numericId).first();
    await publishAccountEvent(trx, {
      action: "UPDATE",
      accountType: "bank",
      accountId: numericId,
      beforeState,
      afterState,
      payload: { changedFields: updateData },
    });
    return { success: true };
  });
}

async function setDefaultBankAccount(id) {
  return withTransaction(async (trx) => {
    const affectedBefore = await trx(BANK_TABLE).where("account_type", "bank").where("is_default", true);
    await trx(BANK_TABLE).where("account_type", "bank").update({ is_default: false });
    await trx(BANK_TABLE).where("account_type", "bank").where("id", id).update({ is_default: true, updated_at: trx.fn.now() });
    const afterState = await trx(BANK_TABLE).where("id", id).first();
    await publishAccountEvent(trx, {
      action: "SET_DEFAULT",
      accountType: "bank",
      accountId: id,
      beforeState: affectedBefore,
      afterState,
      payload: { changedFields: { is_default: true }, affectedAccountIds: affectedBefore.map((account) => account.id) },
    });
    return { success: true };
  });
}

async function deleteBankAccount(id) {
  return withTransaction(async (trx) => {
    const beforeState = await trx(BANK_TABLE).where("account_type", "bank").where("id", id).first();
    if (!beforeState) throw new Error("Không tìm thấy tài khoản ngân hàng");
    await trx(BANK_TABLE).where("account_type", "bank").where("id", id).update({ is_deleted: true, is_active: false, updated_at: trx.fn.now() });
    const afterState = await trx(BANK_TABLE).where("id", id).first();
    await publishAccountEvent(trx, { action: "DELETE", accountType: "bank", accountId: id, beforeState, afterState });
    return { success: true };
  });
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

    await trx(BANK_LEDGER_TABLE).insert({
        financial_account_id: id,
        entry_type: "withdraw",
        amount: numAmount,
        signed_amount: -numAmount,
        balance_after: newBalance,
        source_kind: "manual_withdraw",
        note: note || "Rút tiền tài khoản",
      });
    await publishAccountEvent(trx, {
      action: "WITHDRAW",
      accountType: "bank",
      accountId: id,
      beforeState: account,
      afterState: { ...account, balance: newBalance, total_withdrawn: newWithdrawn },
      payload: { amount: numAmount, balanceAfter: newBalance, note },
      reason: note || "Manual withdrawal",
    });

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
      .returning("*");

    await publishAccountEvent(trx, {
      action: "CREATE",
      accountType: "usdt",
      accountId: inserted.id,
      afterState: inserted,
    });
    return { id: inserted.id };
  });
}

async function updateUsdtWallet(id, payload) {
  return withTransaction(async (trx) => {
    const beforeState = await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).first();
    if (!beforeState) throw new Error("Không tìm thấy ví USDT");
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
    const afterState = await trx(USDT_TABLE).where("id", id).first();
    await publishAccountEvent(trx, {
      action: "UPDATE",
      accountType: "usdt",
      accountId: id,
      beforeState,
      afterState,
      payload: { changedFields: updateData },
    });
    return { success: true };
  });
}

async function setDefaultUsdtWallet(id) {
  return withTransaction(async (trx) => {
    const affectedBefore = await trx(USDT_TABLE).where("account_type", "usdt").where("is_default", true);
    await trx(USDT_TABLE).where("account_type", "usdt").update({ is_default: false });
    await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).update({ is_default: true, updated_at: trx.fn.now() });
    const afterState = await trx(USDT_TABLE).where("id", id).first();
    await publishAccountEvent(trx, {
      action: "SET_DEFAULT",
      accountType: "usdt",
      accountId: id,
      beforeState: affectedBefore,
      afterState,
      payload: { changedFields: { is_default: true }, affectedAccountIds: affectedBefore.map((account) => account.id) },
    });
    return { success: true };
  });
}

async function deleteUsdtWallet(id) {
  return withTransaction(async (trx) => {
    const beforeState = await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).first();
    if (!beforeState) throw new Error("Không tìm thấy ví USDT");
    await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).update({ is_deleted: true, is_active: false, updated_at: trx.fn.now() });
    const afterState = await trx(USDT_TABLE).where("id", id).first();
    await publishAccountEvent(trx, { action: "DELETE", accountType: "usdt", accountId: id, beforeState, afterState });
    return { success: true };
  });
}

async function recordUsdtWithdrawal(id, amount, note = "") {
  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền rút phải lớn hơn 0 USDT");

  return withTransaction(async (trx) => {
    const wallet = await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).first();
    if (!wallet) throw new Error("Không tìm thấy ví USDT");

    const currentBalance = toNumber(wallet.balance);
    if (currentBalance < numAmount) {
      throw new Error(`Số dư ví không đủ (Hiện có: ${currentBalance.toLocaleString("en-US")} USDT, muốn rút: ${numAmount.toLocaleString("en-US")} USDT). Ví không thể âm!`);
    }

    const newBalance = currentBalance - numAmount;
    const newWithdrawn = toNumber(wallet.total_withdrawn) + numAmount;

    await trx(USDT_TABLE).where("account_type", "usdt").where("id", id).update({
      balance: newBalance,
      total_withdrawn: newWithdrawn,
      updated_at: trx.fn.now(),
    });

    await trx(USDT_LEDGER_TABLE).insert({
        financial_account_id: id,
        entry_type: "withdraw",
        amount: numAmount,
        signed_amount: -numAmount,
        balance_after: newBalance,
        source_kind: "manual_withdraw",
        note: note || "Rút tiền ví USDT",
      });
    await publishAccountEvent(trx, {
      action: "WITHDRAW",
      accountType: "usdt",
      accountId: id,
      beforeState: wallet,
      afterState: { ...wallet, balance: newBalance, total_withdrawn: newWithdrawn },
      payload: { amount: numAmount, balanceAfter: newBalance, note },
      reason: note || "Manual withdrawal",
    });

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

// --- FINANCIAL ACCOUNT CREDIT & DEBIT (WEBHOOK MONEY IN / OUT) ---

/**
 * So khớp tên ngân hàng từ Webhook SePay (gateway/bankBrandName) với tài khoản trong hệ thống
 * @param {string} gateway - Giá trị gateway từ webhook SePay (vd: "MBBank", "MB", "VPBank", "TPBank"...)
 * @param {object} account - Bản ghi financial_accounts (chứa bank_short_code, label, bank_display_name)
 * @returns {boolean}
 */
function matchBankGateway(gateway, account) {
  if (!gateway || !account) return false;
  const cleanGw = String(gateway).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleanGw) return false;

  const shortCode = String(account.bank_short_code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const label = String(account.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const displayName = String(account.bank_display_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. So khớp trực tiếp hoặc chứa nhau giữa shortCode, label, displayName
  if (shortCode && (cleanGw === shortCode || cleanGw.includes(shortCode) || shortCode.includes(cleanGw))) return true;
  if (label && (cleanGw === label || cleanGw.includes(label) || label.includes(cleanGw))) return true;
  if (displayName && (cleanGw === displayName || cleanGw.includes(displayName) || displayName.includes(cleanGw))) return true;

  // 2. Tra cứu Alias các ngân hàng phổ biến tại Việt Nam
  const BANK_ALIASES = [
    { code: "mb", aliases: ["mb", "mbbank", "militarybank", "quandoi"] },
    { code: "vpb", aliases: ["vpb", "vpbank", "vietnamthinhvuong", "thinhvuong"] },
    { code: "tpb", aliases: ["tpb", "tpbank", "tienphong"] },
    { code: "vcb", aliases: ["vcb", "vietcombank", "ngoainthuong", "vietcom"] },
    { code: "tcb", aliases: ["tcb", "techcombank", "kythuong", "techcom"] },
    { code: "acb", aliases: ["acb", "acbbank", "achau"] },
    { code: "bidv", aliases: ["bidv", "dautuphattrien"] },
    { code: "ctg", aliases: ["ctg", "vietinbank", "congthuong", "vietin"] },
    { code: "stb", aliases: ["stb", "sacombank", "saigonthuongtin"] },
    { code: "vib", aliases: ["vib", "quocte"] },
    { code: "shb", aliases: ["shb", "saigonhanoi"] },
    { code: "ocb", aliases: ["ocb", "phuongdong"] },
    { code: "msb", aliases: ["msb", "hanghai"] },
    { code: "hdb", aliases: ["hdb", "hdbank", "phattrien"] },
  ];

  for (const group of BANK_ALIASES) {
    const isGwMatched = group.aliases.some((alias) => cleanGw.includes(alias));
    if (isGwMatched) {
      const isAccMatched = group.aliases.some((alias) =>
        shortCode.includes(alias) || label.includes(alias) || displayName.includes(alias)
      );
      if (isAccMatched) return true;
    }
  }

  return false;
}

async function resolveFinancialAccount(trxContext, {
  accountNumber = null,
  accountId = null,
  gateway = null,
  accountScope = null,
} = {}) {
  const queryDb = trxContext || db;

  if (accountId) {
    const acc = await queryDb(BANK_TABLE)
      .where({ id: Number(accountId), is_deleted: false })
      .first();
    if (acc) return acc;
  }

  const cleanAccNum = String(accountNumber || "").replace(/\s+/g, "").trim();
  if (cleanAccNum) {
    const candidates = await queryDb(BANK_TABLE)
      .whereRaw("REPLACE(account_number, ' ', '') = ?", [cleanAccNum])
      .where("is_deleted", false);

    if (candidates && candidates.length > 0) {
      // 1. Nếu có gateway: Bắt buộc đối chiếu đồng thời cả Số tài khoản VÀ Ngân hàng (Gateway)
      if (gateway) {
        // Ưu tiên 1.1: Khớp ngân hàng + Khớp đúng accountScope (nếu có yêu cầu, ví dụ SHOP)
        if (accountScope) {
          const matchScopeAndBank = candidates.find(
            (c) => c.account_scope === accountScope && matchBankGateway(gateway, c) && c.is_active !== false
          );
          if (matchScopeAndBank) return matchScopeAndBank;
        }

        // Ưu tiên 1.2: Khớp ngân hàng (bất kể scope nào, active trước)
        const matchBankActive = candidates.find(
          (c) => matchBankGateway(gateway, c) && c.is_active !== false
        );
        if (matchBankActive) return matchBankActive;

        const matchBankAny = candidates.find((c) => matchBankGateway(gateway, c));
        if (matchBankAny) return matchBankAny;
      }

      // 2. Nếu không có gateway hoặc gateway không match được: Sắp xếp theo thứ tự ưu tiên an toàn
      const sorted = [...candidates].sort((a, b) => {
        // Ưu tiên accountScope (ví dụ: SHOP lên trước PERSONAL)
        if (accountScope) {
          if (a.account_scope === accountScope && b.account_scope !== accountScope) return -1;
          if (b.account_scope === accountScope && a.account_scope !== accountScope) return 1;
        } else {
          // Mặc định luôn ưu tiên SHOP lên trước PERSONAL để bảo vệ tiền Shop
          if (a.account_scope === "SHOP" && b.account_scope !== "SHOP") return -1;
          if (b.account_scope === "SHOP" && a.account_scope !== "SHOP") return 1;
        }
        // Ưu tiên tài khoản mặc định
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        // Ưu tiên tài khoản đang hoạt động
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return a.id - b.id;
      });

      return sorted[0];
    }
  }

  // Fallback 1: Tài khoản ngân hàng mặc định đang hoạt động
  const defaultAcc = await queryDb(BANK_TABLE)
    .where({ is_default: true, is_active: true, is_deleted: false })
    .first();
  if (defaultAcc) return defaultAcc;

  // Fallback 2: Bất kỳ tài khoản ngân hàng nào đang active
  const anyActiveBank = await queryDb(BANK_TABLE)
    .where({ is_active: true, is_deleted: false })
    .first();
  if (anyActiveBank) return anyActiveBank;

  // Fallback 3: Bất kỳ tài khoản nào trong hệ thống
  return await queryDb(BANK_TABLE)
    .where({ is_deleted: false })
    .first();
}

/**
 * Cộng tiền vào tài khoản ngân hàng hoặc ví (khi nhận Webhook tiền vào)
 */
async function creditFinancialAccount(trxContext, {
  accountNumber = null,
  accountId = null,
  gateway = null,
  accountScope = null,
  amount,
  sourceKind = "payment_receipt",
  sourceId = null,
  note = null,
}) {
  const numAmount = toNumber(amount);
  if (numAmount <= 0) return { skipped: true, reason: "invalid_amount" };

  const execute = async (trx) => {
    const account = await resolveFinancialAccount(trx, { accountNumber, accountId, gateway, accountScope });
    if (!account) {
      console.warn("[WalletService] Không tìm thấy tài khoản ngân hàng/ví để cộng tiền Webhook.");
      return { skipped: true, reason: "no_account_found" };
    }

    // Khóa hàng FOR UPDATE để tránh race-condition
    const lockedAccount = await trx(BANK_TABLE)
      .where({ id: account.id })
      .forUpdate()
      .first();

    // Chống ghi trùng qua sổ cái (Idempotency)
    if (sourceKind && sourceId) {
      const existingLedger = await trx(BANK_LEDGER_TABLE)
        .where({
          reference_type: String(sourceKind),
          reference_id: String(sourceId),
        })
        .first();

      if (existingLedger) {
        return {
          skipped: true,
          reason: "duplicate",
          ledgerId: existingLedger.id,
          balanceAfter: Number(lockedAccount.balance),
        };
      }
    }

    const currentBalance = toNumber(lockedAccount.balance);
    const currentReceived = toNumber(lockedAccount.total_received);
    const newBalance = currentBalance + numAmount;
    const newReceived = currentReceived + numAmount;

    await trx(BANK_TABLE)
      .where({ id: lockedAccount.id })
      .update({
        balance: newBalance,
        total_received: newReceived,
        updated_at: trx.fn.now(),
      });

    let ledgerId = null;
    try {
      const [insertedLedger] = await trx(BANK_LEDGER_TABLE)
        .insert({
          financial_account_id: lockedAccount.id,
          entry_type: "receipt_in",
          amount: numAmount,
          balance_after: newBalance,
          reference_type: String(sourceKind),
          reference_id: sourceId ? String(sourceId) : null,
          description: note || `Webhook tiền vào: +${numAmount} ₫`,
          metadata: JSON.stringify({ signed_amount: numAmount }),
        })
        .returning("id");
      ledgerId = insertedLedger?.id || insertedLedger;
    } catch (e) {
      console.warn("[WalletService] Bỏ qua lỗi ghi sổ cái:", e.message);
    }

    console.log(
      `💰 [WalletService] Đã cộng +${numAmount.toLocaleString("vi-VN")} ₫ vào TK #${lockedAccount.id} (${lockedAccount.account_number || lockedAccount.label}). Số dư mới: ${newBalance.toLocaleString("vi-VN")} ₫`
    );

    return {
      success: true,
      accountId: lockedAccount.id,
      ledgerId,
      amount: numAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    };
  };

  if (trxContext) {
    return await execute(trxContext);
  }
  return await withTransaction(execute);
}

/**
 * Trừ tiền khỏi tài khoản ngân hàng hoặc ví (khi nhận Webhook tiền ra)
 */
async function debitFinancialAccount(trxContext, {
  accountNumber = null,
  accountId = null,
  gateway = null,
  accountScope = null,
  amount,
  sourceKind = "payment_receipt",
  sourceId = null,
  note = null,
}) {
  const numAmount = toNumber(amount);
  if (numAmount <= 0) return { skipped: true, reason: "invalid_amount" };

  const execute = async (trx) => {
    const account = await resolveFinancialAccount(trx, { accountNumber, accountId, gateway, accountScope });
    if (!account) {
      console.warn("[WalletService] Không tìm thấy tài khoản ngân hàng/ví để trừ tiền Webhook.");
      return { skipped: true, reason: "no_account_found" };
    }

    // Khóa hàng FOR UPDATE để tránh race-condition
    const lockedAccount = await trx(BANK_TABLE)
      .where({ id: account.id })
      .forUpdate()
      .first();

    // Chống ghi trùng qua sổ cái (Idempotency)
    if (sourceKind && sourceId) {
      const existingLedger = await trx(BANK_LEDGER_TABLE)
        .where({
          reference_type: String(sourceKind),
          reference_id: String(sourceId),
        })
        .first();

      if (existingLedger) {
        return {
          skipped: true,
          reason: "duplicate",
          ledgerId: existingLedger.id,
          balanceAfter: Number(lockedAccount.balance),
        };
      }
    }

    const currentBalance = toNumber(lockedAccount.balance);
    const newBalance = currentBalance - numAmount;
    if (newBalance < 0) {
      throw new Error(`Số dư tài khoản không đủ (Hiện có: ${currentBalance.toLocaleString("vi-VN")} ₫, muốn trừ: ${numAmount.toLocaleString("vi-VN")} ₫). Ví/Tài khoản không thể âm!`);
    }
    const currentWithdrawn = toNumber(lockedAccount.total_withdrawn);
    const newWithdrawn = currentWithdrawn + numAmount;

    await trx(BANK_TABLE)
      .where({ id: lockedAccount.id })
      .update({
        balance: newBalance,
        total_withdrawn: newWithdrawn,
        updated_at: trx.fn.now(),
      });

    let ledgerId = null;
    try {
      const [insertedLedger] = await trx(BANK_LEDGER_TABLE)
        .insert({
          financial_account_id: lockedAccount.id,
          entry_type: "receipt_out",
          amount: numAmount,
          balance_after: newBalance,
          reference_type: String(sourceKind),
          reference_id: sourceId ? String(sourceId) : null,
          description: note || `Webhook tiền ra: -${numAmount} ₫`,
          metadata: JSON.stringify({ signed_amount: -numAmount }),
        })
        .returning("id");
      ledgerId = insertedLedger?.id || insertedLedger;
    } catch (e) {
      console.warn("[WalletService] Bỏ qua lỗi ghi sổ cái:", e.message);
    }

    console.log(
      `💸 [WalletService] Đã trừ -${numAmount.toLocaleString("vi-VN")} ₫ từ TK #${lockedAccount.id} (${lockedAccount.account_number || lockedAccount.label}). Số dư mới: ${newBalance.toLocaleString("vi-VN")} ₫`
    );

    return {
      success: true,
      accountId: lockedAccount.id,
      ledgerId,
      amount: numAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    };
  };

  if (trxContext) {
    return await execute(trxContext);
  }
  return await withTransaction(execute);
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
  matchBankGateway,
  resolveFinancialAccount,
  creditFinancialAccount,
  debitFinancialAccount,
};

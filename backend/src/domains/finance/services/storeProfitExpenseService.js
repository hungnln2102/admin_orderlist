/**
 * storeProfitExpenseService.js (V2)
 * Quản lý chi phí nhập hàng ngoài luồng (external_import) và chi phí biến đổi phát sinh trong tháng (monthly_expense).
 */
const { db, TABLES, withTransaction } = require("@/db");
const { accumulateDailySummary } = require("@/domains/dashboard/services/dailySummaryService");
const { financeNotifier } = require("@/domains/notifications/telegram");
const { getVietnamDateString, getVietnamMonthString } = require("@/utils/time");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Lấy danh sách tài khoản ngân hàng / ví thanh toán khả dụng để người dùng chọn trừ tiền
 */
async function listAvailablePaymentAccounts() {
  const rows = await db(TABLES.FINANCIAL_ACCOUNTS)
    .where("is_deleted", false)
    .where("is_active", true)
    .select(
      "id",
      "label",
      "account_number as accountNumber",
      "account_holder as accountHolder",
      "bank_bin as bankBin",
      "bank_short_code as bankShortCode",
      "bank_display_name as bankDisplayName",
      "account_type as accountType",
      "account_scope as accountScope",
      "balance",
      "is_default as isDefault"
    )
    .orderBy("is_default", "desc")
    .orderBy("id", "asc");

  return rows.map((r) => ({
    ...r,
    id: Number(r.id),
    balance: toNumber(r.balance),
    isDefault: Boolean(r.isDefault),
  }));
}

/**
 * Lấy danh sách chi phí theo tháng hoặc tất cả, kèm thống kê tổng
 */
async function listExpenses({ month, expenseType, search, page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(200, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const baseQuery = db(TABLES.STORE_PROFIT_EXPENSES);

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    baseQuery.whereRaw("TO_CHAR(expense_date, 'YYYY-MM') = ?", [month]);
  }

  if (expenseType && expenseType !== "all") {
    if (expenseType === "external_import") {
      baseQuery.whereIn("expense_type", ["external_import", "mavn_import"]);
    } else if (expenseType === "monthly_expense") {
      baseQuery.whereIn("expense_type", ["monthly_expense", "withdraw_profit"]);
    } else {
      baseQuery.where("expense_type", expenseType);
    }
  }

  if (search && String(search).trim()) {
    const s = `%${String(search).trim()}%`;
    baseQuery.where((q) => {
      q.where("reason", "ilike", s).orWhere("linked_order_code", "ilike", s);
    });
  }

  // 1. Thống kê tổng quan của bộ lọc (Promise.all)
  const statsQuery = db(TABLES.STORE_PROFIT_EXPENSES)
    .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    statsQuery.whereRaw(`TO_CHAR(${TABLES.STORE_PROFIT_EXPENSES}.expense_date, 'YYYY-MM') = ?`, [month]);
  }

  const [statsRes, countRes] = await Promise.all([
    statsQuery
      .select(
        db.raw(`COALESCE(SUM(${TABLES.STORE_PROFIT_EXPENSES}.amount), 0)::numeric as total_amount`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as external_import_total`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') AND ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as external_import_shop_total`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('monthly_expense', 'withdraw_profit') THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as monthly_expense_total`),
        db.raw(`COUNT(${TABLES.STORE_PROFIT_EXPENSES}.id)::int as total_count`)
      )
      .first(),
    baseQuery.clone().count("id as count").first(),
  ]);

  const totalFiltered = Number(countRes?.count || 0);

  // 2. Lấy dữ liệu phân trang
  const rows = await baseQuery
    .leftJoin(TABLES.PAYMENT_RECEIPT, `${TABLES.STORE_PROFIT_EXPENSES}.payment_receipt_id`, `${TABLES.PAYMENT_RECEIPT}.id`)
    .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
    .select(
      `${TABLES.STORE_PROFIT_EXPENSES}.id`,
      `${TABLES.STORE_PROFIT_EXPENSES}.amount`,
      `${TABLES.STORE_PROFIT_EXPENSES}.reason`,
      `${TABLES.STORE_PROFIT_EXPENSES}.expense_type`,
      db.raw(`TO_CHAR(${TABLES.STORE_PROFIT_EXPENSES}.expense_date, 'YYYY-MM-DD') as expense_date`),
      `${TABLES.STORE_PROFIT_EXPENSES}.linked_order_code`,
      `${TABLES.STORE_PROFIT_EXPENSES}.expense_meta`,
      `${TABLES.STORE_PROFIT_EXPENSES}.payment_receipt_id`,
      `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`,
      `${TABLES.STORE_PROFIT_EXPENSES}.status`,
      `${TABLES.STORE_PROFIT_EXPENSES}.created_at`,
      `${TABLES.PAYMENT_RECEIPT}.reference_code as receipt_reference_code`,
      `${TABLES.FINANCIAL_ACCOUNTS}.label as bank_account_label`,
      `${TABLES.FINANCIAL_ACCOUNTS}.account_number as bank_account_number`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_short_code as bank_short_code`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_display_name as bank_display_name`,
      `${TABLES.FINANCIAL_ACCOUNTS}.account_scope as bank_account_scope`
    )
    .orderBy(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date`, "desc")
    .orderBy(`${TABLES.STORE_PROFIT_EXPENSES}.id`, "desc")
    .limit(limitNum)
    .offset(offset);

  return {
    data: rows.map((r) => ({
      id: Number(r.id),
      amount: toNumber(r.amount),
      reason: r.reason || "",
      expenseType: r.expense_type,
      expenseDate: r.expense_date,
      linkedOrderCode: r.linked_order_code || null,
      expenseMeta: typeof r.expense_meta === "string" ? JSON.parse(r.expense_meta) : r.expense_meta,
      paymentReceiptId: r.payment_receipt_id ? Number(r.payment_receipt_id) : null,
      shopBankAccountId: r.shop_bank_account_id ? Number(r.shop_bank_account_id) : null,
      bankAccountLabel: r.bank_account_label || null,
      bankAccountNumber: r.bank_account_number || null,
      bankShortCode: r.bank_short_code || null,
      bankDisplayName: r.bank_display_name || null,
      bankAccountScope: r.bank_account_scope || null,
      receiptReferenceCode: r.receipt_reference_code || null,
      status: r.status,
      createdAt: r.created_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems: totalFiltered,
      totalPages: Math.ceil(totalFiltered / limitNum) || 1,
    },
    stats: {
      totalAmount: toNumber(statsRes?.total_amount || 0),
      externalImportTotal: toNumber(statsRes?.external_import_total || 0),
      externalImportShopTotal: toNumber(statsRes?.external_import_shop_total || 0),
      monthlyExpenseTotal: toNumber(statsRes?.monthly_expense_total || 0),
      totalCount: Number(statsRes?.total_count || 0),
    },
  };
}

/**
 * Tạo mới bản ghi chi phí / nhập ngoài luồng
 * Hỗ trợ chọn tài khoản ngân hàng để trừ số dư ví và ghi sổ cái theo chuẩn ACID
 */
async function createExpense(payload) {
  const {
    amount,
    expense_type = "external_import",
    expense_date,
    reason,
    linked_order_code,
    expense_meta,
    payment_receipt_id,
    shop_bank_account_id,
  } = payload || {};

  const numAmount = toNumber(amount);
  if (numAmount <= 0) throw new Error("Số tiền chi phí phải lớn hơn 0 ₫");

  const validDate = expense_date && /^\d{4}-\d{2}-\d{2}$/.test(expense_date)
    ? expense_date
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const accountIdNum = shop_bank_account_id ? Number(shop_bank_account_id) : null;

  const result = await withTransaction(async (trx) => {
    let debitInfo = null;
    let accountScope = null;

    if (accountIdNum) {
      const acc = await trx(TABLES.FINANCIAL_ACCOUNTS).where({ id: accountIdNum }).first();
      accountScope = acc?.account_scope || null;

      const { debitFinancialAccount } = require("@/domains/wallets/services/walletService");
      debitInfo = await debitFinancialAccount(trx, {
        accountId: accountIdNum,
        amount: numAmount,
        sourceKind: "store_profit_expenses",
        note: `[${expense_type === "external_import" ? "Nhập ngoài luồng" : "Chi phí tháng"}] ${reason || ""}`,
      });
    }

    const [created] = await trx(TABLES.STORE_PROFIT_EXPENSES)
      .insert({
        amount: numAmount,
        expense_type: expense_type || "external_import",
        expense_date: validDate,
        reason: reason ? String(reason).trim() : null,
        linked_order_code: linked_order_code ? String(linked_order_code).trim() : null,
        expense_meta: expense_meta ? JSON.stringify(expense_meta) : null,
        payment_receipt_id: payment_receipt_id ? Number(payment_receipt_id) : null,
        shop_bank_account_id: accountIdNum,
        status: "completed",
      })
      .returning("*");

    return { created, debitInfo, accountScope };
  });

  const { created, debitInfo, accountScope } = result;

  // Xử lý biến động tháng: CHỈ áp dụng nếu là nhập ngoài luồng từ TÀI KHOẢN SHOP
  const isExternalImport = ["external_import", "mavn_import"].includes(created.expense_type);
  const isShopAccount = accountScope === "SHOP";

  if (isExternalImport && isShopAccount) {
    try {
      const dateStr = getVietnamDateString(created.expense_date);
      const monthKey = getVietnamMonthString(dateStr);

      await accumulateDailySummary(dateStr, {
        total_shop_cost: numAmount,
      });

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey,
        importDelta: numAmount,
        profitDelta: -numAmount,
        bankBalanceDelta: -numAmount,
        context: `Nhập ngoài luồng #${created.id} (Tài khoản Shop): ${reason || ""}`,
      });
    } catch (notifyErr) {
      console.error("[StoreProfitExpense] Lỗi cập nhật biến động tháng:", notifyErr.message);
    }
  } else if (isExternalImport) {
    console.log(`ℹ️ [StoreProfitExpense] Khoản nhập ngoài luồng #${created.id} chi từ Ví cá nhân / Tiền mặt -> Không ghi nhận biến động tháng của Shop.`);
  }

  return { ...created, debitInfo };
}

/**
 * Cập nhật bản ghi chi phí (ACID transaction: tự động điều chỉnh số dư và sổ cái)
 */
async function updateExpense(id, payload) {
  const targetId = Number(id);
  if (!targetId || isNaN(targetId)) throw new Error("ID không hợp lệ");

  const result = await withTransaction(async (trx) => {
    const existing = await trx(TABLES.STORE_PROFIT_EXPENSES)
      .where({ id: targetId })
      .forUpdate()
      .first();

    if (!existing) throw new Error("Không tìm thấy bản ghi chi phí để cập nhật");

    let oldAccountScope = null;
    if (existing.shop_bank_account_id) {
      const acc = await trx(TABLES.FINANCIAL_ACCOUNTS).where({ id: existing.shop_bank_account_id }).select("account_scope").first();
      oldAccountScope = acc?.account_scope || null;
    }

    const updateData = { updated_at: trx.fn.now() };

    let newAmount = existing.amount;
    if (payload.amount !== undefined) {
      const num = toNumber(payload.amount);
      if (num <= 0) throw new Error("Số tiền chi phí phải lớn hơn 0 ₫");
      updateData.amount = num;
      newAmount = num;
    }
    if (payload.expense_type !== undefined) updateData.expense_type = payload.expense_type;
    if (payload.expense_date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.expense_date)) throw new Error("Ngày chi phí không hợp lệ (YYYY-MM-DD)");
      updateData.expense_date = payload.expense_date;
    }
    if (payload.reason !== undefined) updateData.reason = payload.reason ? String(payload.reason).trim() : null;
    if (payload.linked_order_code !== undefined) updateData.linked_order_code = payload.linked_order_code ? String(payload.linked_order_code).trim() : null;

    let newAccountId = existing.shop_bank_account_id ? Number(existing.shop_bank_account_id) : null;
    if (payload.shop_bank_account_id !== undefined) {
      newAccountId = payload.shop_bank_account_id ? Number(payload.shop_bank_account_id) : null;
      updateData.shop_bank_account_id = newAccountId;
    }

    let newAccountScope = null;
    if (newAccountId) {
      const acc = await trx(TABLES.FINANCIAL_ACCOUNTS).where({ id: newAccountId }).select("account_scope").first();
      newAccountScope = acc?.account_scope || null;
    }

    // Điều chỉnh số dư ngân hàng nếu có thay đổi về tài khoản hoặc số tiền
    const oldAccountId = existing.shop_bank_account_id ? Number(existing.shop_bank_account_id) : null;
    const oldAmount = toNumber(existing.amount);
    const { debitFinancialAccount, creditFinancialAccount } = require("@/domains/wallets/services/walletService");

    if (oldAccountId !== newAccountId) {
      // Đổi tài khoản: hoàn trả tài khoản cũ và trừ tài khoản mới
      if (oldAccountId && oldAmount > 0) {
        await creditFinancialAccount(trx, {
          accountId: oldAccountId,
          amount: oldAmount,
          sourceKind: "store_profit_expenses_reversal",
          sourceId: String(targetId),
          note: `[Chuyển đổi tài khoản chi] Hoàn trả từ khoản chi #${targetId}`,
        });
      }
      if (newAccountId && toNumber(newAmount) > 0) {
        await debitFinancialAccount(trx, {
          accountId: newAccountId,
          amount: toNumber(newAmount),
          sourceKind: "store_profit_expenses",
          note: `[Chuyển đổi tài khoản chi] Khoản chi #${targetId}: ${updateData.reason || existing.reason || ""}`,
        });
      }
    } else if (newAccountId && oldAmount !== toNumber(newAmount)) {
      // Cùng tài khoản nhưng đổi số tiền
      const delta = toNumber(newAmount) - oldAmount;
      if (delta > 0) {
        // Tăng số tiền chi -> trừ thêm delta
        await debitFinancialAccount(trx, {
          accountId: newAccountId,
          amount: delta,
          sourceKind: "store_profit_expenses_delta",
          note: `[Tăng tiền chi phí #${targetId}] ${updateData.reason || existing.reason || ""}`,
        });
      } else if (delta < 0) {
        // Giảm số tiền chi -> hoàn lại Math.abs(delta)
        await creditFinancialAccount(trx, {
          accountId: newAccountId,
          amount: Math.abs(delta),
          sourceKind: "store_profit_expenses_delta",
          sourceId: String(targetId),
          note: `[Giảm tiền chi phí #${targetId}] Hoàn lại phần chênh lệch`,
        });
      }
    }

    const [updated] = await trx(TABLES.STORE_PROFIT_EXPENSES)
      .where({ id: targetId })
      .update(updateData)
      .returning("*");

    return { updated, existing, oldAccountScope, newAccountScope };
  });

  const { updated, existing, oldAccountScope, newAccountScope } = result;

  // Tính chênh lệch biến động tháng của Shop
  const wasShopImport = ["external_import", "mavn_import"].includes(existing.expense_type) && oldAccountScope === "SHOP";
  const isNowShopImport = ["external_import", "mavn_import"].includes(updated.expense_type) && newAccountScope === "SHOP";

  const oldCost = wasShopImport ? toNumber(existing.amount) : 0;
  const newCost = isNowShopImport ? toNumber(updated.amount) : 0;
  const costDelta = newCost - oldCost;

  if (costDelta !== 0) {
    try {
      const dateStr = getVietnamDateString(updated.expense_date);
      const monthKey = getVietnamMonthString(dateStr);

      await accumulateDailySummary(dateStr, { total_shop_cost: costDelta });

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey,
        importDelta: costDelta,
        profitDelta: -costDelta,
        bankBalanceDelta: -costDelta,
        context: `Điều chỉnh khoản chi #${targetId}: ${updated.reason || ""}`,
      });
    } catch (err) {
      console.error("[StoreProfitExpense] Lỗi cập nhật biến động tháng khi sửa khoản chi:", err.message);
    }
  }

  return updated;
}

/**
 * Xóa bản ghi chi phí (ACID transaction: tự động hoàn trả số dư ví nếu đã trừ tiền)
 */
async function deleteExpense(id) {
  const targetId = Number(id);
  if (!targetId || isNaN(targetId)) throw new Error("ID không hợp lệ");

  const result = await withTransaction(async (trx) => {
    const existing = await trx(TABLES.STORE_PROFIT_EXPENSES)
      .where({ id: targetId })
      .forUpdate()
      .first();

    if (!existing) throw new Error("Không tìm thấy bản ghi chi phí để xóa");

    let accountScope = null;
    if (existing.shop_bank_account_id) {
      const acc = await trx(TABLES.FINANCIAL_ACCOUNTS).where({ id: existing.shop_bank_account_id }).select("account_scope").first();
      accountScope = acc?.account_scope || null;
    }

    // Nếu khoản chi này trước đó đã trừ từ tài khoản ngân hàng, hoàn lại tiền (credit)
    if (existing.shop_bank_account_id && Number(existing.amount) > 0) {
      const { creditFinancialAccount } = require("@/domains/wallets/services/walletService");
      await creditFinancialAccount(trx, {
        accountId: Number(existing.shop_bank_account_id),
        amount: Number(existing.amount),
        sourceKind: "store_profit_expenses_reversal",
        sourceId: String(existing.id),
        note: `[Hoàn tiền xóa khoản chi #${existing.id}] ${existing.reason || ""}`,
      });
    }

    await trx(TABLES.STORE_PROFIT_EXPENSES).where({ id: targetId }).del();
    return { success: true, id: targetId, existing, accountScope };
  });

  const { existing, accountScope } = result;

  // Nếu là khoản nhập ngoài luồng từ tài khoản Shop, hoàn lại biến động tháng
  const isShopImport = ["external_import", "mavn_import"].includes(existing.expense_type) && accountScope === "SHOP";
  if (isShopImport && Number(existing.amount) > 0) {
    try {
      const amt = toNumber(existing.amount);
      const dateStr = getVietnamDateString(existing.expense_date);
      const monthKey = getVietnamMonthString(dateStr);

      await accumulateDailySummary(dateStr, { total_shop_cost: -amt });

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey,
        importDelta: -amt,
        profitDelta: amt,
        bankBalanceDelta: amt,
        context: `Xóa khoản nhập ngoài luồng #${existing.id} (Hoàn trả Shop): ${existing.reason || ""}`,
      });
    } catch (err) {
      console.error("[StoreProfitExpense] Lỗi cập nhật biến động tháng khi xóa khoản chi:", err.message);
    }
  }

  return { success: true, id: targetId };
}

module.exports = {
  listAvailablePaymentAccounts,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};

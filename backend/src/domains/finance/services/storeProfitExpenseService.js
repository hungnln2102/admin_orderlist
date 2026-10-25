/**
 * storeProfitExpenseService.js (V2)
 * Quản lý chi phí nhập hàng ngoài luồng (external_import) và chi phí biến đổi phát sinh trong tháng (monthly_expense).
 */
const { db, TABLES, withTransaction } = require("@/db");

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
  const statsQuery = db(TABLES.STORE_PROFIT_EXPENSES);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    statsQuery.whereRaw("TO_CHAR(expense_date, 'YYYY-MM') = ?", [month]);
  }

  const [statsRes, countRes] = await Promise.all([
    statsQuery
      .select(
        db.raw("COALESCE(SUM(amount), 0)::numeric as total_amount"),
        db.raw("COALESCE(SUM(CASE WHEN expense_type IN ('external_import', 'mavn_import') THEN amount ELSE 0 END), 0)::numeric as external_import_total"),
        db.raw("COALESCE(SUM(CASE WHEN expense_type IN ('monthly_expense', 'withdraw_profit') THEN amount ELSE 0 END), 0)::numeric as monthly_expense_total"),
        db.raw("COUNT(id)::int as total_count")
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
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_display_name as bank_display_name`
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

  return withTransaction(async (trx) => {
    // 1. Nếu có chọn tài khoản ngân hàng / ví: Gọi debitFinancialAccount để trừ số dư và ghi sổ cái
    let debitInfo = null;
    if (accountIdNum) {
      const { debitFinancialAccount } = require("@/domains/wallets/services/walletService");
      debitInfo = await debitFinancialAccount(trx, {
        accountId: accountIdNum,
        amount: numAmount,
        sourceKind: "store_profit_expenses",
        note: `[${expense_type === "external_import" ? "Nhập ngoài luồng" : "Chi phí tháng"}] ${reason || ""}`,
      });
    }

    // 2. Tạo bản ghi chi phí trong store_profit_expenses
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

    return { ...created, debitInfo };
  });
}

/**
 * Cập nhật bản ghi chi phí (ACID transaction: tự động điều chỉnh số dư và sổ cái)
 */
async function updateExpense(id, payload) {
  const targetId = Number(id);
  if (!targetId || isNaN(targetId)) throw new Error("ID không hợp lệ");

  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.STORE_PROFIT_EXPENSES)
      .where({ id: targetId })
      .forUpdate()
      .first();

    if (!existing) throw new Error("Không tìm thấy bản ghi chi phí để cập nhật");

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

    return updated;
  });
}

/**
 * Xóa bản ghi chi phí (ACID transaction: tự động hoàn trả số dư ví nếu đã trừ tiền)
 */
async function deleteExpense(id) {
  const targetId = Number(id);
  if (!targetId || isNaN(targetId)) throw new Error("ID không hợp lệ");

  return withTransaction(async (trx) => {
    const existing = await trx(TABLES.STORE_PROFIT_EXPENSES)
      .where({ id: targetId })
      .forUpdate()
      .first();

    if (!existing) throw new Error("Không tìm thấy bản ghi chi phí để xóa");

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
    return { success: true, id: targetId };
  });
}

module.exports = {
  listAvailablePaymentAccounts,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};

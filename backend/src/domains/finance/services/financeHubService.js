/**
 * financeHubService.js
 * Quản lý tính toán tài chính toàn diện:
 * 1. Chi phí cố định (Fixed costs)
 * 2. Trả góp theo kỳ (Installments with auto-expiration)
 * 3. Điểm hòa vốn & Lợi nhuận ròng khởi đầu âm (Break-even Engine)
 * 4. Tài sản ròng & Nợ cá nhân + Nợ NCC (Net Worth Engine)
 */

const { db, TABLES, COLS } = require("@/db");
const { getMonthlyObligations } = require("./profitObligationService");
const fixedCostService = require("./fixedCostService");
const installmentService = require("./installmentService");
const personalAssetService = require("./personalAssetService");

const toNumber = require("./financeNumber");
const { getPersonalBalanceSnapshots, createPersonalBalanceSnapshot, updatePersonalBalanceSnapshot, deletePersonalBalanceSnapshot } = require("./personalBalanceSnapshotService");
const { getSavingGoalsOverview, createSavingGoal, updateSavingGoal, deleteSavingGoal, executeSavingGoal, depositSavingFund, withdrawSavingFund } = require("./savingGoalService");

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
async function getFinanceSummary(targetMonth, startDate, endDate, period = "month") {
  const now = new Date();

  let startDateStr, endDateStr, currentMonthStr;

  if (period === "week") {
    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - 6);
    startDateStr = startD.toISOString().slice(0, 10);
    endDateStr = endD.toISOString().slice(0, 10);
    currentMonthStr = endDateStr.slice(0, 7);
  } else if (period === "year") {
    const year = targetMonth ? targetMonth.slice(0, 4) : String(now.getFullYear());
    startDateStr = `${year}-01-01`;
    endDateStr = `${year}-12-31`;
    currentMonthStr = `${year}-12`;
  } else if (period === "custom" && startDate && endDate) {
    startDateStr = startDate;
    endDateStr = endDate;
    currentMonthStr = endDate.slice(0, 7);
  } else {
    currentMonthStr = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [y, m] = currentMonthStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    startDateStr = `${currentMonthStr}-01`;
    endDateStr = `${currentMonthStr}-${String(lastDay).padStart(2, "0")}`;
  }

  const startIso = `${startDateStr} 00:00:00+07`;
  const endIso = `${endDateStr} 23:59:59+07`;

  const startDObj = new Date(startDateStr);
  const endDObj = new Date(endDateStr);
  const diffTime = Math.abs(endDObj.getTime() - startDObj.getTime());
  const daysInMonth = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // 1. Chi phí cố định (Fixed costs) & Trạng thái thanh toán trong tháng
  const fixedCostRows = await db(TABLES.FIXED_COSTS)
    .select("*")
    .orderBy("id", "asc");

  const log = COLS.DEBT_PAYMENT_LOGS;
  const allocation = COLS.PAYMENT_RECEIPT_ALLOCATIONS;
  const receipt = COLS.PAYMENT_RECEIPT;
  const account = COLS.FINANCIAL_ACCOUNTS;
  const fixedCostPaymentLogs = await db({ payment: TABLES.DEBT_PAYMENT_LOGS })
    .leftJoin({ allocation: TABLES.PAYMENT_RECEIPT_ALLOCATIONS }, `allocation.${allocation.ID}`, `payment.${log.RECEIPT_ALLOCATION_ID}`)
    .leftJoin({ receipt: TABLES.PAYMENT_RECEIPT }, `receipt.${receipt.ID}`, `allocation.${allocation.RECEIPT_ID}`)
    .leftJoin({ account: TABLES.FINANCIAL_ACCOUNTS }, `account.${account.ID}`, `payment.${log.FINANCIAL_ACCOUNT_ID}`)
    .where(`payment.${log.TARGET_TYPE}`, "FIXED_COST")
    .where(`payment.${log.PERIOD_MONTH}`, currentMonthStr)
    .select("payment.*", {
      receiptId: `receipt.${receipt.ID}`,
      receiptReference: `receipt.${receipt.REFERENCE_CODE}`,
      receiptTransactionId: `receipt.${receipt.SEPAY_TRANSACTION_ID}`,
      accountLabel: `account.${account.LABEL}`,
    })
    .orderBy(`payment.${log.PAYMENT_DATE}`, "desc")
    .orderBy(`payment.${log.ID}`, "desc");

  const paymentLogMap = new Map();
  for (const row of fixedCostPaymentLogs) {
    const id = Number(row[log.TARGET_ID]);
    if (!paymentLogMap.has(id)) paymentLogMap.set(id, row);
  }
  const fixedCostNames = new Map(fixedCostRows.map((row) => [Number(row.id), row.name]));
  const fixedCostPayments = fixedCostPaymentLogs.map((row) => ({
    id: Number(row[log.ID]),
    targetName: fixedCostNames.get(Number(row[log.TARGET_ID])) || null,
    targetId: Number(row[log.TARGET_ID]),
    periodMonth: row[log.PERIOD_MONTH],
    paymentDate: row[log.PAYMENT_DATE] ? new Date(row[log.PAYMENT_DATE]).toISOString().slice(0, 10) : null,
    amount: toNumber(row[log.AMOUNT]),
    note: row[log.NOTE] || "",
    hasReceiptAllocation: Boolean(row[log.RECEIPT_ALLOCATION_ID]),
    hasFinancialAccount: Boolean(row[log.FINANCIAL_ACCOUNT_ID]),
    receiptCode: row.receiptReference || row.receiptTransactionId || row.receiptId || null,
    accountLabel: row.accountLabel || null,
  }));

  const fixedCosts = fixedCostRows.map((r) => {
    const paidLog = paymentLogMap.get(Number(r.id));
    return {
      id: Number(r.id),
      name: r.name,
      amount: toNumber(r.amount),
      category: r.category || "LIVING",
      isActive: Boolean(r.is_active),
      note: r.note || "",
      createdAt: r.created_at,
      isPaidThisMonth: Boolean(paidLog),
      paidDate: paidLog?.payment_date ? new Date(paidLog.payment_date).toISOString().slice(0, 10) : null,
      paidAmount: paidLog ? toNumber(paidLog.amount) : 0,
      paidLogId: paidLog ? Number(paidLog.id) : null,
    };
  });

  const monthlyObligationsSnapshot = await getMonthlyObligations(currentMonthStr);
  const activeFixedCostsTotal = monthlyObligationsSnapshot.fixedCosts;

  const unpaidFixedCostsTotal = fixedCosts
    .filter((f) => f.isActive && !f.isPaidThisMonth)
    .reduce((sum, f) => sum + f.amount, 0);

  const paidFixedCostsTotal = fixedCosts
    .filter((f) => f.isActive && f.isPaidThisMonth)
    .reduce((sum, f) => sum + f.amount, 0);

  // 2. Các khoản trả góp (Installments)
  const installmentRows = await db(TABLES.INSTALLMENTS)
    .select("*")
    .orderBy("id", "asc");

  let installmentsInMonthTotal = 0;
  let totalInstallmentsRemainingDebt = 0;

  const paymentColumns = COLS.DEBT_PAYMENT_LOGS;
  const paidInstallmentIds = new Set((await db(TABLES.DEBT_PAYMENT_LOGS)
    .where(paymentColumns.TARGET_TYPE, "INSTALLMENT")
    .where(paymentColumns.PERIOD_MONTH, currentMonthStr)
    .pluck(paymentColumns.TARGET_ID)).map(Number));

  const installments = installmentRows.map((r) => {
    const rawItem = {
      ...r,
      total_periods: Number(r.total_periods),
      monthly_amount: toNumber(r.monthly_amount),
    };
    const state = calculateInstallmentState(rawItem, currentMonthStr);

    if (state.isEffective) {
      installmentsInMonthTotal += state.monthlyAmount;
    }
    totalInstallmentsRemainingDebt += state.remainingDebt;

    return {
      id: Number(r.id),
      name: r.name,
      monthlyAmount: state.monthlyAmount,
      totalPeriods: state.totalPeriods,
      startPeriod: r.start_period,
      dueDay: Number(r.due_day || 15),
      currentPeriod: state.currentPeriod,
      isPaidThisMonth: paidInstallmentIds.has(Number(r.id)),
      remainingPeriods: state.remainingPeriods,
      remainingDebt: state.remainingDebt,
      isEffective: state.isEffective,
      status: state.status,
      isActive: Boolean(r.is_active),
      note: r.note || "",
      createdAt: r.created_at,
    };
  });

  const personalDebtMonthlyTotal = monthlyObligationsSnapshot.personalDebt;
  const scheduledInstallmentsMonthlyTotal = monthlyObligationsSnapshot.installments;
  const monthlyDebtBurden = scheduledInstallmentsMonthlyTotal + personalDebtMonthlyTotal;

  // 3. Doanh thu & Lợi nhuận gộp từ đơn hàng Shop trong khoảng thời gian
  const summaryStats = await db(TABLES.DAILY_REVENUE_SUMMARY)
    .whereRaw("summary_date >= ? AND summary_date <= ?", [startDateStr, endDateStr])
    .select(
      db.raw("COALESCE(SUM(dashboard_orders_count), 0)::int as count"),
      db.raw("COALESCE(SUM(earned_revenue), 0)::numeric as total_revenue"),
      db.raw("COALESCE(SUM(total_shop_cost), 0)::numeric as total_cost"),
      db.raw("COALESCE(SUM(slot_vacant_cost), 0)::numeric as total_slot_vacant_cost"),
      db.raw("COALESCE(SUM(revenue_reversed), 0)::numeric as total_refund")
    )
    .first();

  // Chi phí nhập ngoài luồng (chỉ tính tài khoản Shop) & chi phí phát sinh tháng trong khoảng thời gian
  const expenseStats = await db(TABLES.STORE_PROFIT_EXPENSES)
    .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
    .whereRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date >= ? AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_date <= ?`, [startDateStr, endDateStr])
    .where(`${TABLES.STORE_PROFIT_EXPENSES}.status`, "completed")
    .select(
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') AND ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_external_import`),
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('monthly_expense', 'withdraw_profit') AND (${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR ${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_monthly_expense`),
      db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR (${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_type NOT IN ('external_import', 'mavn_import')) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as total_all_expenses`)
    )
    .first();

  const totalExternalImport = toNumber(expenseStats?.total_external_import || 0);
  const totalMonthlyExpense = toNumber(expenseStats?.total_monthly_expense || 0);
  const totalPostedOperationalExpenses = toNumber(expenseStats?.total_all_expenses || 0);

  const shopOrdersCount = Number(summaryStats?.count || 0);
  const shopRevenue = toNumber(summaryStats?.total_revenue || 0);
  const shopCogs = toNumber(summaryStats?.total_cost || 0);
  const totalSlotVacantCost = toNumber(summaryStats?.total_slot_vacant_cost || 0);
  const shopRefunds = toNumber(summaryStats?.total_refund || 0);
  const totalOperationalExpenses = totalPostedOperationalExpenses + totalSlotVacantCost;
  // Operating profit includes COGS, refunds, vacant-slot costs, and posted operating expenses.
  const shopGrossProfit = shopRevenue - shopCogs - shopRefunds - totalOperationalExpenses;

  // 4. Động cơ Điểm Hòa Vốn (Break-even Engine)
  const breakEvenTarget = activeFixedCostsTotal + monthlyDebtBurden;
  const initialDeficit = -breakEvenTarget; // Lợi nhuận khởi điểm âm đầu tháng
  const netProfit = shopGrossProfit - breakEvenTarget; // Lợi nhuận ròng thực tế

  const breakEvenPercent = breakEvenTarget > 0
    ? Math.min(100, Math.round((shopGrossProfit / breakEvenTarget) * 100))
    : 100;
  const remainingToBreakEven = Math.max(0, breakEvenTarget - shopGrossProfit);

  // 5. Động cơ Nợ Gối Đầu Theo Ngày & Đường Cong Hòa Vốn (Daily Rolling Deficit & Break-Even Curve)
  const dailyBurden = daysInMonth > 0 ? Math.round(breakEvenTarget / daysInMonth) : 0;

  const [dailyRows, dailyExpenseRows] = await Promise.all([
    db(TABLES.DAILY_REVENUE_SUMMARY)
      .whereRaw("summary_date >= ? AND summary_date <= ?", [startDateStr, endDateStr])
      .select(
        db.raw("TO_CHAR(summary_date, 'YYYY-MM-DD') as day_str"),
        db.raw("COALESCE(dashboard_orders_count, 0)::int as count"),
        db.raw("COALESCE(earned_revenue, 0)::numeric as daily_revenue"),
        db.raw("COALESCE(total_shop_cost, 0)::numeric as daily_cost"),
        db.raw("COALESCE(slot_vacant_cost, 0)::numeric as daily_slot_vacant_cost")
      ),
    db(TABLES.STORE_PROFIT_EXPENSES)
      .leftJoin(TABLES.FINANCIAL_ACCOUNTS, `${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id`, `${TABLES.FINANCIAL_ACCOUNTS}.id`)
      .whereRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date >= ? AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_date <= ?`, [startDateStr, endDateStr])
      .where(`${TABLES.STORE_PROFIT_EXPENSES}.status`, "completed")
      .select(
        db.raw(`TO_CHAR(${TABLES.STORE_PROFIT_EXPENSES}.expense_date, 'YYYY-MM-DD') as day_str`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('external_import', 'mavn_import') AND ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_external_import`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.STORE_PROFIT_EXPENSES}.expense_type IN ('monthly_expense', 'withdraw_profit') AND (${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR ${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_monthly_expense`),
        db.raw(`COALESCE(SUM(CASE WHEN ${TABLES.FINANCIAL_ACCOUNTS}.account_scope = 'SHOP' OR (${TABLES.STORE_PROFIT_EXPENSES}.shop_bank_account_id IS NULL AND ${TABLES.STORE_PROFIT_EXPENSES}.expense_type NOT IN ('external_import', 'mavn_import')) THEN ${TABLES.STORE_PROFIT_EXPENSES}.amount ELSE 0 END), 0)::numeric as daily_total_expense`)
      )
      .groupByRaw(`${TABLES.STORE_PROFIT_EXPENSES}.expense_date`),
  ]);

  const dailyExpenseMap = new Map();
  dailyExpenseRows.forEach((r) => {
    dailyExpenseMap.set(r.day_str, {
      externalImport: toNumber(r.daily_external_import),
      monthlyExpense: toNumber(r.daily_monthly_expense),
      totalExpense: toNumber(r.daily_total_expense),
    });
  });

  const dailyMap = new Map();
  dailyRows.forEach((r) => {
    const rev = toNumber(r.daily_revenue);
    const cost = toNumber(r.daily_cost);
    const slotVacantCost = toNumber(r.daily_slot_vacant_cost);
    const exp = dailyExpenseMap.get(r.day_str) || { externalImport: 0, monthlyExpense: 0, totalExpense: 0 };
    dailyMap.set(r.day_str, {
      count: Number(r.count || 0),
      revenue: rev,
      cost: cost + slotVacantCost + exp.totalExpense,
      externalImport: exp.externalImport,
      monthlyExpense: exp.monthlyExpense,
      profit: rev - cost - slotVacantCost - exp.totalExpense,
    });
  });

  const todayVNStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  // Lấy toàn bộ tài sản cá nhân & phân loại để tính baseNetWorth và netWorth
  const personalAssetRows = await db(TABLES.PERSONAL_ASSETS)
    .select("*")
    .orderBy("id", "asc");

  const mappedPersonalAssets = personalAssetRows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    type: r.type,
    amount: toNumber(r.amount),
    note: r.note || "",
    cardLastDigits: r.card_last_digits || null,
    bankName: r.bank_name || null,
    profitEnabled: Boolean(r.profit_enabled),
    profitFrequency: r.profit_frequency || null,
    annualInterestRate: toNumber(r.annual_interest_rate),
    profitDestination: r.profit_destination || null,
    profitAccountId: r.profit_account_id ? Number(r.profit_account_id) : null,
    profitCreditTime: r.profit_credit_time || null,
    debtInterestEnabled: Boolean(r.debt_interest_enabled),
    debtAnnualInterestRate: toNumber(r.debt_annual_interest_rate),
    debtDueDay: r.debt_due_day ? Number(r.debt_due_day) : null,
    debtEndDate: r.debt_end_date || null,
    debtRepaymentFrequency: r.debt_repayment_frequency || null,
    updatedAt: r.updated_at,
    accountScope: r.account_scope || "PERSONAL",
  }));

  const personalBankRows = await db(TABLES.SHOP_BANK_ACCOUNTS)
    .where("account_type", "bank")
    .where("account_scope", "PERSONAL")
    .where("is_deleted", false)
    .where("is_active", true)
    .orderBy("id", "asc");

  const personalBankAssets = personalBankRows.map((r) => {
    const hasCustomLabel = r.label && r.label.trim() && r.label.trim() !== "Tài khoản cá nhân";
    const labelSuffix = hasCustomLabel ? ` - ${r.label.trim()}` : "";
    const rawBank = r.bank_display_name || r.bank_short_code || "Ngân hàng";
    const cleanBank = rawBank.replace(/\s*\([A-Za-z0-9]{2,6}\)/g, "").trim();
    return {
      id: 1000000 + Number(r.id),
      name: `${cleanBank} (${r.account_number})${labelSuffix}`,
      type: "CASH_BANK",
      amount: toNumber(r.balance),
      note: r.account_holder ? `Chủ TK: ${r.account_holder}` : "",
      accountNumber: r.account_number || "",
      accountHolder: r.account_holder || "",
      bankDisplayName: cleanBank,
      bankShortCode: r.bank_short_code || "",
      bankBin: r.bank_bin || "",
      qrNotePrefix: r.qr_note_prefix || "",
      label: r.label || "",
      profitEnabled: false,
      profitFrequency: null,
      annualInterestRate: 0,
      profitDestination: null,
      profitAccountId: null,
      profitCreditTime: null,
      debtInterestEnabled: false,
      debtAnnualInterestRate: 0,
      debtDueDay: null,
      debtEndDate: null,
      debtRepaymentFrequency: null,
      updatedAt: r.updated_at,
      accountScope: "PERSONAL",
      bankAccountId: Number(r.id),
    };
  });

  const personalAssets = [...mappedPersonalAssets, ...personalBankAssets];

  const shopBankRows = await db(TABLES.SHOP_BANK_ACCOUNTS)
    .where("account_type", "bank")
    .where("account_scope", "SHOP")
    .where("is_deleted", false)
    .orderBy("id", "asc");

  const shopBankAccounts = shopBankRows.map((r) => ({
    id: Number(r.id),
    label: r.label || r.bank_display_name || "Ngân hàng Shop",
    accountNumber: r.account_number,
    accountHolder: r.account_holder,
    bankDisplayName: r.bank_display_name,
    bankShortCode: r.bank_short_code,
    balance: toNumber(r.balance),
    isActive: Boolean(r.is_active),
    isDefault: Boolean(r.is_default),
  }));

  const usdtWalletRows = await db(TABLES.USDT_WALLETS)
    .where("account_type", "usdt")
    .where("is_deleted", false)
    .orderBy("id", "asc");

  const usdtWallets = usdtWalletRows.map((r) => ({
    id: Number(r.id),
    label: r.label || "Ví USDT",
    walletAddress: r.account_number,
    network: r.bank_short_code,
    balance: toNumber(r.balance),
    isActive: Boolean(r.is_active),
    isDefault: Boolean(r.is_default),
  }));

  let personalSavingsTotal = 0;
  let personalCashBankTotal = 0;
  let personalInvestmentsTotal = 0;
  let personalDebtReceivableTotal = 0; // Người khác nợ mình
  let personalDebtPayableTotal = 0; // Mình nợ người khác

  personalAssets.forEach((a) => {
    if (a.type === "SAVINGS") personalSavingsTotal += a.amount;
    else if (a.type === "CASH_BANK") personalCashBankTotal += a.amount;
    else if (a.type === "GOLD_INVESTMENT") personalInvestmentsTotal += a.amount;
    else if (a.type === "DEBT_RECEIVABLE") personalDebtReceivableTotal += a.amount;
    else if (a.type === "DEBT_PAYABLE") personalDebtPayableTotal += a.amount;
  });

  const shopWallets = await db(TABLES.FINANCIAL_ACCOUNTS)
    .where("is_deleted", false)
    .where("is_active", true)
    .whereNot("account_scope", "PERSONAL")
    .select(db.raw("COALESCE(SUM(balance), 0)::numeric as total_balance"))
    .first();
  const shopBalanceTotal = toNumber(shopWallets?.total_balance || 0);

  const supplierDebtLog = await db(TABLES.SUPPLIER_ORDER_COST_LOG)
    .where("ncc_payment_status", "Chưa Thanh Toán")
    .select(db.raw("COALESCE(SUM(import_cost), 0)::numeric as total_debt"))
    .first();
  const supplierDebtTotal = toNumber(supplierDebtLog?.total_debt || 0);

  const totalShopAssets = shopBalanceTotal;
  const grandTotalAssets = shopBalanceTotal + personalSavingsTotal + personalCashBankTotal + personalInvestmentsTotal + personalDebtReceivableTotal;

  // Tổng nghĩa vụ nợ: Loại bỏ công nợ NCC theo chỉ thị Master (NCC đã ghi nhận trong chi phí đơn hàng/COGS)
  // Chỉ ghi nhận 2 mục: Nợ & Trả Góp và Chi Phí Cố Định CHƯA THANH TOÁN (khoản đã trả thì nghĩa vụ = 0, chống double-counting)
  const totalDebtAndInstallments = totalInstallmentsRemainingDebt + personalDebtPayableTotal;
  const shopLiabilities = totalInstallmentsRemainingDebt + unpaidFixedCostsTotal;
  const totalLiabilities = totalDebtAndInstallments + unpaidFixedCostsTotal;

  // Tài sản ròng chuẩn mực: Tổng tài sản thực có - Tổng nghĩa vụ nợ
  // Không cộng thêm lợi nhuận tích lũy vì tiền lãi đơn hàng đã nằm trong số dư ngân hàng Shop (chống double-counting)
  const netWorthBase = totalShopAssets - shopLiabilities;
  const monthlyObligations = monthlyDebtBurden + unpaidFixedCostsTotal;
  const baseNetWorth = netWorthBase;

  let cumulativeProfit = 0;
  let rollingBalance = 0; // Số dư nợ gối đầu: âm nghĩa là nợ đọng, dương nghĩa là thặng dư
  let breakEvenDay = null; // Ngày đầu tiên vượt qua mốc hòa vốn tổng của tháng
  let firstDebtFreeDay = null; // Ngày đầu tiên rollingBalance >= 0

  const chartData = [];

  // Danh sách ngày thực tế chuẩn xác theo lịch từ startDateStr đến endDateStr (hỗ trợ week, month, year, custom)
  const dateList = [];
  const curDate = new Date(`${startDateStr}T00:00:00`);
  const endLimitDate = new Date(`${endDateStr}T00:00:00`);

  while (curDate <= endLimitDate) {
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, "0");
    const d = String(curDate.getDate()).padStart(2, "0");
    dateList.push(`${y}-${m}-${d}`);
    curDate.setDate(curDate.getDate() + 1);
  }

  for (let i = 0; i < dateList.length; i++) {
    const dayStr = dateList[i];
    const d = i + 1;
    const exp = dailyExpenseMap.get(dayStr) || { externalImport: 0, monthlyExpense: 0, totalExpense: 0 };
    const dayData = dailyMap.get(dayStr) || { count: 0, revenue: 0, cost: exp.totalExpense, externalImport: exp.externalImport, monthlyExpense: exp.monthlyExpense, profit: -exp.totalExpense };
    const todayProfit = dayData.profit;
    const isFuture = dayStr > todayVNStr;

    // Nợ gối đầu từ hôm trước mang sang: nếu rollingBalance hôm trước < 0 thì đó là nợ tồn đọng
    const previousDebt = rollingBalance < 0 ? Math.abs(rollingBalance) : 0;
    // Số tiền hôm nay cần kiếm để xóa sạch nợ gối đầu và bù đủ định mức ngày hôm nay:
    const todayRequired = Math.max(0, dailyBurden + (rollingBalance < 0 ? Math.abs(rollingBalance) : -rollingBalance));

    cumulativeProfit += todayProfit;
    // Cập nhật rolling balance: nhận lãi hôm nay trừ đi định mức ngày hôm nay
    rollingBalance += (todayProfit - dailyBurden);

    const dayNetWorth = netWorthBase + cumulativeProfit;

    if (!breakEvenDay && cumulativeProfit >= breakEvenTarget && breakEvenTarget > 0) {
      breakEvenDay = d;
    }

    if (!firstDebtFreeDay && rollingBalance >= 0 && (todayProfit > 0 || breakEvenTarget === 0)) {
      firstDebtFreeDay = d;
    }

    chartData.push({
      day: d,
      dateStr: dayStr,
      ordersCount: dayData.count,
      dailyRevenue: dayData.revenue,
      dailyCost: dayData.cost,
      todayProfit,
      dailyQuota: dailyBurden,
      previousDebt,
      todayRequired,
      rollingBalance,
      isDebtFreeToday: rollingBalance >= 0,
      cumulativeProfit,
      dayNetWorth,
      cumulativeDeficit: Math.min(0, cumulativeProfit - breakEvenTarget),
      isMasterBreakEvenPassed: cumulativeProfit >= breakEvenTarget,
      isFuture,
    });
  }

  const todayPoint = chartData.find((d) => d.dateStr === todayVNStr);
  const isDateInRange = Boolean(todayPoint);
  const currentRollingBalance = isDateInRange
    ? (todayPoint?.rollingBalance ?? 0)
    : (chartData[chartData.length - 1]?.rollingBalance ?? 0);

  const dailyBreakEven = {
    dailyBurden,
    daysInMonth: dateList.length,
    startDate: startDateStr,
    endDate: endDateStr,
    breakEvenDay,
    firstDebtFreeDay,
    currentDay: todayPoint ? todayPoint.day : null,
    todayDateStr: todayPoint?.dateStr || todayVNStr,
    currentRollingBalance,
    carriedDebtIntoToday: todayPoint?.previousDebt ?? 0,
    requiredForToday: todayPoint?.todayRequired ?? dailyBurden,
    todayProfit: todayPoint?.todayProfit ?? 0,
    chartData,
  };

  // 6. Tài sản ròng chuẩn mực kế toán (Balance Sheet Net Worth):
  // Tài sản ròng = Tổng tài sản thực có - Tổng nghĩa vụ nợ (triệt tiêu double-counting lợi nhuận theo chỉ thị Master)
  const netWorth = totalShopAssets - shopLiabilities;

  return {
    month: currentMonthStr,
    breakEven: {
      initialDeficit,
      breakEvenTarget,
      shopGrossProfit,
      shopRevenue,
      shopCogs,
      totalSlotVacantCost,
      shopRefunds,
      shopOrdersCount,
      netProfit,
      breakEvenPercent,
      remainingToBreakEven,
      isBreakEvenPassed: shopGrossProfit >= breakEvenTarget,
      totalExternalImport,
      totalMonthlyExpense,
      totalOperationalExpenses,
      activeFixedCostsTotal,
      unpaidFixedCostsTotal,
      paidFixedCostsTotal,
      installmentsInMonthTotal,
      scheduledInstallmentsMonthlyTotal,
      personalDebtMonthlyTotal,
      monthlyDebtBurden,
    },
    dailyBreakEven,
    netWorth: {
      netWorth,
      totalAssets: totalShopAssets,
      totalLiabilities: shopLiabilities,
      breakdown: {
        shopBalanceTotal,
        personalSavingsTotal,
        personalCashBankTotal,
        personalInvestmentsTotal,
        personalDebtReceivableTotal,
        supplierDebtTotal,
        personalDebtPayableTotal,
        totalInstallmentsRemainingDebt,
        activeFixedCostsTotal,
        unpaidFixedCostsTotal,
        paidFixedCostsTotal,
        totalDebtAndInstallments,
      },
    },
    fixedCosts,
    fixedCostPayments,
    installments,
    personalAssets,
    shopBankAccounts,
    usdtWallets,
    savingGoals: await getSavingGoalsOverview(),
    debtPaymentLogs: await getDebtPaymentLogs({ limit: 50 }),
  };
}

// --- CRUD FIXED COSTS ---
const { createFixedCost, updateFixedCost, deleteFixedCost, payFixedCost, cancelFixedCostPayment, getFixedCosts } = fixedCostService;

// --- CRUD INSTALLMENTS ---
const { createInstallment, updateInstallment, deleteInstallment, payInstallment } = installmentService;

// --- CRUD PERSONAL ASSETS ---
const { createPersonalAsset, updatePersonalAsset, deletePersonalAsset, payPersonalAsset, borrowPersonalAsset, borrowPersonalAssetInTrx, autoMatchCardTransaction, getDebtPaymentLogs, getUnallocatedReceipts } = personalAssetService;

// --- PERSONAL BALANCE SNAPSHOTS & CIRCULAR STAT ---
module.exports = {
  calculateInstallmentState,
  getFinanceSummary,
  createFixedCost,
  updateFixedCost,
  deleteFixedCost,
  payFixedCost,
  cancelFixedCostPayment,
  getFixedCosts,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  payInstallment,
  createPersonalAsset,
  updatePersonalAsset,
  deletePersonalAsset,
  payPersonalAsset,
  borrowPersonalAsset,
  borrowPersonalAssetInTrx,
  autoMatchCardTransaction,
  getDebtPaymentLogs,
  getUnallocatedReceipts,
  getPersonalBalanceSnapshots,
  createPersonalBalanceSnapshot,
  updatePersonalBalanceSnapshot,
  deletePersonalBalanceSnapshot,
  getSavingGoalsOverview,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  executeSavingGoal,
  depositSavingFund,
  withdrawSavingFund,
};

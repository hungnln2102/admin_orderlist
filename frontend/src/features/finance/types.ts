/**
 * types.ts
 * Định nghĩa kiểu dữ liệu cho Trung Tâm Tài Chính V2
 */

export type FixedCostCategory = "LIVING" | "SHOP_OPERATIONS" | "SOFTWARE" | "OTHER";

export interface FixedCost {
  id: number;
  name: string;
  amount: number;
  category: FixedCostCategory;
  isActive: boolean;
  note?: string;
  createdAt?: string;
  isPaidThisMonth?: boolean;
  paidDate?: string | null;
  paidAmount?: number;
  paidLogId?: number | null;
}

export type InstallmentStatus = "ACTIVE" | "COMPLETED" | "NOT_STARTED";

export interface Installment {
  id: number;
  name: string;
  monthlyAmount: number;
  totalPeriods: number;
  startPeriod: string; // 'YYYY-MM'
  dueDay: number;
  currentPeriod: number;
  remainingPeriods: number;
  remainingDebt: number;
  isEffective: boolean;
  status: InstallmentStatus;
  isActive: boolean;
  note?: string;
  createdAt?: string;
  isPaidThisMonth?: boolean;
  paidDate?: string | null;
  paidAmount?: number;
  paidLogId?: number | null;
}

export type ProfitFrequency = "DAILY" | "MONTHLY" | "YEARLY";

export type ProfitDestination = "REINVEST" | "CASH_BANK" | "SHOP_BALANCE" | "OTHER";

export type DebtRepaymentFrequency = "DAILY" | "MONTHLY";
export type DebtKind = "PERSONAL_EXTERNAL" | "CREDIT_CARD" | "OVERDRAFT";

export type PersonalAssetType =
  | "SAVINGS"
  | "CASH_BANK"
  | "GOLD_INVESTMENT"
  | "DEBT_PAYABLE"
  | "DEBT_RECEIVABLE";

export interface PersonalAsset {
  id: number;
  name: string;
  type: PersonalAssetType;
  amount: number;
  note?: string;
  profitEnabled?: boolean;
  profitFrequency?: ProfitFrequency | null;
  annualInterestRate?: number;
  profitDestination?: ProfitDestination | null;
  profitAccountId?: number | null;
  profitCreditTime?: string | null;
  debtInterestEnabled?: boolean;
  debtInterestFrequency?: "DAILY" | "MONTHLY" | null;
  debtAnnualInterestRate?: number;
  debtDueDay?: number | null;
  debtEndDate?: string | null;
  debtRepaymentFrequency?: DebtRepaymentFrequency | null;
  debtKind?: DebtKind | null;
  debtInitialLimit?: number | null;
  debtAccountNumber?: string | null;
  cardLastDigits?: string | null;
  bankName?: string | null;
  updatedAt?: string;
}

export interface BreakEvenMetrics {
  initialDeficit: number;
  breakEvenTarget: number;
  shopGrossProfit: number;
  shopRevenue: number;
  shopCogs: number;
  shopOrdersCount: number;
  netProfit: number;
  breakEvenPercent: number;
  remainingToBreakEven: number;
  isBreakEvenPassed: boolean;
  activeFixedCostsTotal: number;
  unpaidFixedCostsTotal?: number;
  paidFixedCostsTotal?: number;
  installmentsInMonthTotal: number;
  personalDebtMonthlyTotal: number;
  monthlyDebtBurden: number;
  totalExternalImport?: number;
  totalMonthlyExpense?: number;
  totalOperationalExpenses?: number;
}

export interface NetWorthBreakdown {
  shopBalanceTotal: number;
  personalSavingsTotal: number;
  personalCashBankTotal: number;
  personalInvestmentsTotal: number;
  personalDebtReceivableTotal: number;
  supplierDebtTotal?: number;
  personalDebtPayableTotal: number;
  totalInstallmentsRemainingDebt: number;
  activeFixedCostsTotal?: number;
  unpaidFixedCostsTotal?: number;
  paidFixedCostsTotal?: number;
  totalDebtAndInstallments?: number;
}

export interface NetWorthMetrics {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: NetWorthBreakdown;
}

export interface DailyBreakEvenPoint {
  day: number;
  dateStr: string;
  ordersCount: number;
  dailyRevenue: number;
  dailyCost: number;
  todayProfit: number;
  dailyQuota: number;
  previousDebt: number;
  todayRequired: number;
  rollingBalance: number;
  isDebtFreeToday: boolean;
  cumulativeProfit: number;
  cumulativeDeficit: number;
  isMasterBreakEvenPassed: boolean;
  isFuture: boolean;
}

export interface DailyBreakEvenStats {
  dailyBurden: number;
  daysInMonth: number;
  breakEvenDay: number | null;
  firstDebtFreeDay: number | null;
  currentDay: number | null;
  currentRollingBalance: number;
  carriedDebtIntoToday: number;
  requiredForToday: number;
  todayProfit: number;
  chartData: DailyBreakEvenPoint[];
}

export interface ShopBankAccount {
  id: number;
  label: string;
  accountNumber?: string;
  accountHolder?: string;
  bankDisplayName?: string;
  bankShortCode?: string;
  balance: number;
  isActive: boolean;
  isDefault: boolean;
}

export interface UsdtWallet {
  id: number;
  label: string;
  walletAddress?: string;
  network?: string;
  balance: number;
  isActive: boolean;
  isDefault: boolean;
}

// --- SAVING GOALS & FUND (MILESTONE TARGET LADDER) ---
export interface SavingGoalItem {
  id: number;
  name: string;
  targetAmount: number;
  status: "ACTIVE" | "COMPLETED";
  note?: string;
  isReached: boolean;
  isNextFocus: boolean;
  progressPercent: number;
  missingAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavingFundTransaction {
  id: number;
  actionType: "DEPOSIT" | "WITHDRAW" | "EXECUTE_GOAL";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  goalId?: number | null;
  goalName?: string | null;
  note?: string;
  createdAt: string;
}

export type DebtPaymentTargetType =
  | "PERSONAL_DEBT"
  | "PERSONAL_DEBT_BORROW"
  | "INSTALLMENT"
  | "FIXED_COST";

export interface DebtPaymentLogItem {
  id: number;
  targetType: DebtPaymentTargetType;
  targetId: number;
  targetName: string;
  periodMonth?: string | null;
  amount: number;
  paymentDate: string | null;
  note: string;
  referenceCode?: string | null;
  merchantName?: string | null;
  cardLastDigits?: string | null;
  bankName?: string | null;
  financialAccountName?: string | null;
  createdAt: string;
}

export interface SavingGoalsOverviewData {
  currentFund: number;
  totalGoalsCount: number;
  activeGoalsCount: number;
  reachedGoalsCount: number;
  completedGoalsCount: number;
  activeGoals: SavingGoalItem[];
  completedGoals: SavingGoalItem[];
  recentTransactions: SavingFundTransaction[];
}

export interface FinanceSummaryData {
  month: string;
  breakEven: BreakEvenMetrics;
  dailyBreakEven: DailyBreakEvenStats;
  netWorth: NetWorthMetrics;
  fixedCosts: FixedCost[];
  installments: Installment[];
  personalAssets: PersonalAsset[];
  shopBankAccounts: ShopBankAccount[];
  usdtWallets: UsdtWallet[];
  savingGoals?: SavingGoalsOverviewData;
  debtPaymentLogs?: DebtPaymentLogItem[];
}

// ==========================================
// THU / CHI CÁ NHÂN & DANH MỤC ĐỘNG (VPBANK / DEBIT)
// ==========================================

export interface PersonalSpendingCategory {
  id: number;
  code: string;
  name: string;
  icon?: string;
  color?: string;
  monthlyBudget?: number | null;
  isActive: boolean;
  sortOrder: number;
  keywords?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type PersonalTransactionDirection = "INFLOW" | "OUTFLOW";

export type PersonalBalanceProjectionStatus =
  | "PROJECTED_APPLIED"
  | "OBSERVED_APPLIED"
  | "RECONCILIATION_ADJUSTED"
  | "LATE_ALREADY_COVERED"
  | "BALANCE_UNVERIFIED";

export interface PersonalFinancialAccount {
  id: number;
  name: string;
  accountNumberMasked?: string | null;
  bankDisplayName?: string | null;
  balance: number;
}
export interface PersonalDebitTransactionLog {
  id: number;
  financialAccountId?: number | null;
  financialAccountName?: string | null;
  instrumentMappingId?: number | null;
  instrumentMask?: string | null;
  occurredAt: string;
  direction: PersonalTransactionDirection;
  amount: number;
  merchantNormalized: string;
  categoryId?: number | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  categorySource?: "RULE" | "MANUAL" | "UNCLASSIFIED";
  observedBalanceAfter?: number | null;
  balanceProjectionStatus?: PersonalBalanceProjectionStatus | null;
  note?: string | null;
  businessKey?: string | null;
  source?: "VPBANK_IMAP" | "MANUAL" | "OTHER";
  createdAt?: string;
}

export interface CategoryKeywordRule {
  id: number;
  categoryId: number;
  keywordPattern: string;
  priority: number;
  isActive: boolean;
}

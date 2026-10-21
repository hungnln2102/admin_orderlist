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
}

export type ProfitFrequency = "DAILY" | "MONTHLY" | "YEARLY";

export type ProfitDestination = "REINVEST" | "CASH_BANK" | "SHOP_BALANCE" | "OTHER";

export type DebtRepaymentFrequency = "DAILY" | "MONTHLY";

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
  installmentsInMonthTotal: number;
  personalDebtMonthlyTotal: number;
  monthlyDebtBurden: number;
}

export interface NetWorthBreakdown {
  shopBalanceTotal: number;
  personalSavingsTotal: number;
  personalCashBankTotal: number;
  personalInvestmentsTotal: number;
  personalDebtReceivableTotal: number;
  supplierDebtTotal: number;
  personalDebtPayableTotal: number;
  totalInstallmentsRemainingDebt: number;
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
}

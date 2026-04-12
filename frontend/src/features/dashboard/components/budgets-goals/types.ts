import type { WalletColumn, WalletRow } from "../../hooks/useWalletBalances";

export interface Budget {
  name: string;
  used: number;
  total: number;
}

export interface Goal {
  id: number;
  goal_name: string;
  target_amount: number;
  priority: number;
  created_at: string;
}

export interface BudgetsGoalsProps {
  budgets: Budget[];
  savingGoals: Goal[];
  currencyFormatter: Intl.NumberFormat;
  walletColumns: WalletColumn[];
  walletRows: WalletRow[];
  onRefetchGoals?: () => void;
}

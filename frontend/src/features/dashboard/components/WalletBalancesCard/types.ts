import { type WalletColumn, type WalletRow } from "../../hooks/useWalletBalances";

export type WalletBalancesCardProps = {
  columns: WalletColumn[];
  rows: WalletRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  currencyFormatter: Intl.NumberFormat;
  goldPrice: number | null;
};

export type DisplayColumn = WalletColumn & {
  sourceFields?: string[];
  assetCode?: string;
};

export type ResolvedFieldValue = {
  field: string;
  value: number;
  assetCode?: string;
};

export type WalletBalancesHeaderLabels = {
  title: string;
  totalWallet5Label: string;
  addLabel: string;
  closeLabel: string;
};

export type WalletBalancesTableLabels = {
  dateHeader: string;
  saveLabel: string;
  cancelLabel: string;
  loadingText: string;
  emptyText: string;
};

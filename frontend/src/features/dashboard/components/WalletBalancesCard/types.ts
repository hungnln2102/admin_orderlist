import { type WalletColumn, type WalletRow } from "../../hooks/useWalletBalances";

export type WalletBalancesCardProps = {
  columns: WalletColumn[];
  rows: WalletRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  currencyFormatter: Intl.NumberFormat;
};

export type DisplayColumn = WalletColumn & {
  assetCode?: string;
};

export type WalletBalancesHeaderLabels = {
  title: string;
  totalWallet5Label: string;
  addLabel: string;
  closeLabel: string;
  manageColumnsLabel: string;
};

export type WalletBalancesTableLabels = {
  dateHeader: string;
  saveLabel: string;
  cancelLabel: string;
  loadingText: string;
  emptyText: string;
};

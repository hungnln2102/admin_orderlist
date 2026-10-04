export type PaymentTabKey = "bank" | "usdt";

export interface BankAccountItem {
  id: number;
  label?: string | null;
  accountNumber: string;
  accountHolder: string;
  bankDisplayName?: string | null;
  bankBin?: string | null;
  bankShortCode?: string | null;
  qrNotePrefix?: string | null;
  isDefault: boolean;
  isActive: boolean;
  totalReceived: number;
  totalWithdrawn: number;
  balanceRemaining: number;
}

export interface UsdtWalletItem {
  id: number;
  label?: string | null;
  walletAddress: string;
  network: string;
  isDefault: boolean;
  isActive: boolean;
  totalReceived: number;
  totalWithdrawn: number;
  balanceRemaining: number;
}

export interface WalletFormData {
  accountNumber: string;
  accountHolder: string;
  bankDisplayName: string;
  bankShortCode: string;
  bankBin: string;
  qrNotePrefix: string;
  label: string;
  walletAddress: string;
  network: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface WalletTarget {
  id: number;
  type: "bank" | "usdt";
  title: string;
}

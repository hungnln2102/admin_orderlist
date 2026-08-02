export type PaymentMethod = "bank" | "usdt";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank: "Thanh toán qua thẻ (CK ngân hàng)",
  usdt: "Thanh toán qua ví USDT",
};

export interface UsdtWalletItem {
  id: number;
  label: string | null;
  walletAddress: string;
  network: string;
  isDefault: boolean;
  isActive: boolean;
  totalReceived?: number;
  totalWithdrawn?: number;
  balance?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UsdtWalletBalanceItem extends UsdtWalletItem {
  totalReceived: number;
  totalWithdrawn: number;
  balanceRemaining: number;
}

export interface UsdtWalletPayload {
  label?: string | null;
  walletAddress: string;
  network?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UsdtExchangeRate {
  vndPerUsdt: number;
  symbol?: string;
  source?: string;
  fetchedAt?: string;
}

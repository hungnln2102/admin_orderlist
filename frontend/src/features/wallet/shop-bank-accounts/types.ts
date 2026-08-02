export interface ShopBankAccountItem {
  id: number;
  label: string | null;
  accountNumber: string;
  accountHolder: string;
  bankBin: string;
  bankShortCode: string | null;
  bankDisplayName: string | null;
  qrNotePrefix: string | null;
  isDefault: boolean;
  isActive: boolean;
  totalReceived?: number;
  totalWithdrawn?: number;
  balance?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** STK kèm số dư: tổng CK Sepay, đã rút, còn lại. */
export interface ShopBankAccountBalanceItem extends ShopBankAccountItem {
  totalReceived: number;
  totalWithdrawn: number;
  balanceRemaining: number;
}

export interface ShopBankAccountPayload {
  label?: string | null;
  accountNumber: string;
  accountHolder: string;
  bankBin: string;
  bankShortCode?: string | null;
  bankDisplayName?: string | null;
  qrNotePrefix?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

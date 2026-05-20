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
  createdAt?: string | null;
  updatedAt?: string | null;
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

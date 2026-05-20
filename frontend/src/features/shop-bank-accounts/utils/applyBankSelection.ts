import type { BankListItem } from "@/shared/hooks/useBankList";

export type ShopBankFormBankFields = {
  bankBin: string;
  bankShortCode: string;
  bankDisplayName: string;
};

export function bankFieldsFromSelection(bank: BankListItem): ShopBankFormBankFields {
  return {
    bankBin: bank.bin,
    bankShortCode: bank.code,
    bankDisplayName: bank.fullName || bank.name,
  };
}

/** Giữ STK đã lưu khi BIN không còn trong danh sách VietQR. */
export function orphanBankOption(fields: ShopBankFormBankFields): BankListItem | null {
  const bin = fields.bankBin.trim();
  if (!bin) return null;
  return {
    bin,
    name: fields.bankDisplayName || fields.bankShortCode || bin,
    code: fields.bankShortCode.trim().toUpperCase(),
    fullName: fields.bankDisplayName || fields.bankShortCode || bin,
  };
}

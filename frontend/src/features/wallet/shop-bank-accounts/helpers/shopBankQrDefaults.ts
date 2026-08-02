import type { ShopBankAccountItem } from "../types";

export type ShopBankQrConfig = {
  accountNumber: string;
  accountHolder: string;
  bankCode: string;
  bankBin: string;
  bankDisplayName: string;
  qrNotePrefix: string;
  fromDatabase: boolean;
};

export const EMPTY_SHOP_BANK_QR_CONFIG: ShopBankQrConfig = {
  accountNumber: "",
  accountHolder: "",
  bankCode: "",
  bankBin: "",
  bankDisplayName: "",
  qrNotePrefix: "",
  fromDatabase: false,
};

export type ShopBankDisplay = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  bankCode: string;
  bankBin: string;
};

export const shopBankItemToQrConfig = (
  item: ShopBankAccountItem
): ShopBankQrConfig => ({
  accountNumber: item.accountNumber,
  accountHolder: item.accountHolder,
  bankCode: String(item.bankShortCode || "").trim(),
  bankBin: item.bankBin,
  bankDisplayName: String(item.bankDisplayName || "").trim(),
  qrNotePrefix: String(item.qrNotePrefix || "").trim(),
  fromDatabase: true,
});

export const toShopBankDisplay = (config: ShopBankQrConfig): ShopBankDisplay => ({
  bankName: config.bankDisplayName || config.bankCode,
  accountHolder: config.accountHolder,
  accountNumber: config.accountNumber,
  bankCode: config.bankCode,
  bankBin: config.bankBin,
});

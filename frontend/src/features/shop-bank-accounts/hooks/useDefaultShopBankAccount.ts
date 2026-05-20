import { useEffect, useState } from "react";
import {
  ACCOUNT_NAME,
  ACCOUNT_NO,
  BANK_BIN,
  BANK_DISPLAY_NAME,
  BANK_SHORT_CODE,
  ORDER_QR_NOTE_PREFIX,
} from "@/components/modals/ViewOrderModal/constants";
import { fetchDefaultShopBankAccount } from "../api/shopBankAccountApi";

export type ShopBankQrConfig = {
  accountNumber: string;
  accountHolder: string;
  bankCode: string;
  bankBin: string;
  bankDisplayName: string;
  qrNotePrefix: string;
  fromDatabase: boolean;
};

const envFallback = (): ShopBankQrConfig => ({
  accountNumber: ACCOUNT_NO,
  accountHolder: ACCOUNT_NAME,
  bankCode: BANK_SHORT_CODE,
  bankBin: BANK_BIN,
  bankDisplayName: BANK_DISPLAY_NAME,
  qrNotePrefix: ORDER_QR_NOTE_PREFIX,
  fromDatabase: false,
});

export function useDefaultShopBankAccount() {
  const [config, setConfig] = useState<ShopBankQrConfig>(envFallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const item = await fetchDefaultShopBankAccount();
        if (ignore) return;
        setConfig({
          accountNumber: item.accountNumber || ACCOUNT_NO,
          accountHolder: item.accountHolder || ACCOUNT_NAME,
          bankCode: item.bankShortCode || BANK_SHORT_CODE,
          bankBin: item.bankBin || BANK_BIN,
          bankDisplayName: item.bankDisplayName || BANK_DISPLAY_NAME,
          qrNotePrefix: item.qrNotePrefix || ORDER_QR_NOTE_PREFIX,
          fromDatabase: true,
        });
      } catch {
        if (!ignore) setConfig(envFallback());
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  return { config, loading };
}

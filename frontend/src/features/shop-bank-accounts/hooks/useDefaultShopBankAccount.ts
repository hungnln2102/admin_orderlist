import { useEffect, useState } from "react";
import { fetchDefaultShopBankAccount } from "../api/shopBankAccountApi";
import {
  EMPTY_SHOP_BANK_QR_CONFIG,
  shopBankItemToQrConfig,
  type ShopBankQrConfig,
} from "../helpers/shopBankQrDefaults";

export type { ShopBankQrConfig };

export function useDefaultShopBankAccount() {
  const [config, setConfig] = useState<ShopBankQrConfig>(EMPTY_SHOP_BANK_QR_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const item = await fetchDefaultShopBankAccount();
        if (ignore) return;
        if (item.accountNumber && item.accountHolder && item.bankBin) {
          setConfig(shopBankItemToQrConfig(item));
        } else {
          setConfig(EMPTY_SHOP_BANK_QR_CONFIG);
        }
      } catch {
        if (!ignore) setConfig(EMPTY_SHOP_BANK_QR_CONFIG);
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

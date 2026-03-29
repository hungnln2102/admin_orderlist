import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import type { BankOption } from "../types";

export function useBanks() {
  const [banks, setBanks] = useState<BankOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    apiFetch("/api/banks")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setBanks(
            data.map((bank: any) => ({
              bin: bank.bin,
              name:
                bank.bank_name ||
                bank.bankName ||
                bank.name ||
                bank.bank ||
                bank.bin,
            }))
          );
        }
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  return { banks };
}

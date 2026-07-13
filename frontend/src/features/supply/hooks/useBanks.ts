import { useEffect, useState } from "react";
import { apiGet } from "@/shared/api/client";
import type { BankOption } from "../types";

export function useBanks() {
  const [banks, setBanks] = useState<BankOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    apiGet<unknown[]>("/api/banks")
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setBanks(
            data.map((bank) => {
              const row =
                bank && typeof bank === "object"
                  ? (bank as Record<string, unknown>)
                  : {};
              return {
                bin: String(row.bin ?? ""),
                name:
                  String(
                    row.bank_name ??
                      row.bankName ??
                      row.name ??
                      row.bank ??
                      row.bin ??
                      ""
                  ),
              };
            })
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

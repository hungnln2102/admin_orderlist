import { useEffect, useState } from "react";
import { apiGet } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/constants";

export type BankListItem = {
  bin: string;
  name: string;
  code: string;
  fullName: string;
};

const mapBankRow = (bank: unknown): BankListItem | null => {
  const row =
    bank && typeof bank === "object" ? (bank as Record<string, unknown>) : {};
  const bin = String(row.bin ?? "").trim();
  const name = String(
    row.bank_name ?? row.bankName ?? row.name ?? row.bank ?? bin
  ).trim();
  const code = String(row.bank_code ?? row.code ?? "").trim().toUpperCase();
  const fullName = String(
    row.bank_full_name ?? row.bankFullName ?? row.full_name ?? name
  ).trim();
  if (!bin || !name) return null;
  return { bin, name, code, fullName };
};

export function useBankList() {
  const [banks, setBanks] = useState<BankListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiGet<unknown[]>(API_ENDPOINTS.BANK_LIST)
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setBanks(
          rows
            .map(mapBankRow)
            .filter((row): row is BankListItem => row != null)
        );
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBanks([]);
          setError(
            err instanceof Error ? err.message : "Không tải được danh sách ngân hàng"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { banks, loading, error };
}

import { useCallback, useEffect, useState } from "react";
import { fetchAdobeAdminAccounts } from "../../api/renewAdobeApi";
import type { AdobeAdminAccount } from "../../types";

export function useAdminAccountsData() {
  const [accounts, setAccounts] = useState<AdobeAdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdobeAdminAccounts()
      .then(setAccounts)
      .catch((err) =>
        setError(err?.message ?? "Không thể tải danh sách tài khoản.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return {
    accounts,
    setAccounts,
    loading,
    error,
    loadAccounts,
  };
}

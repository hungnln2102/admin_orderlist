import { useCallback } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import type { AdobeAdminAccount } from "../../types";

export function useAdminUrlAccess(
  setAccounts: React.Dispatch<React.SetStateAction<AdobeAdminAccount[]>>
) {
  return useCallback((accountId: number, url: string) => {
    apiFetch(API_ENDPOINTS.RENEW_ADOBE_URL_ACCESS(accountId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_url: url }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setAccounts((prev) =>
            prev.map((account) =>
              account.id === accountId
                ? { ...account, access_url: url || null }
                : account
            )
          );
        }
      })
      .catch(() => {});
  }, [setAccounts]);
}

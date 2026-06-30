import { useCallback, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import type { FixAllProgress } from "./types";

type UseAdminUserActionsParams = {
  loadAccounts: () => void;
  setCheckError: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useAdminUserActions({
  loadAccounts,
  setCheckError,
}: UseAdminUserActionsParams) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixAllProgress, setFixAllProgress] = useState<FixAllProgress | null>(null);
  const fixAllInFlightRef = useRef(false);

  const handleDeleteUser = useCallback(
    (accountId: number, userEmail: string) => {
      setCheckError(null);
      const key = `acc-${accountId}-${userEmail}`;
      setDeletingId(key);

      apiFetch(API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_AUTO_DELETE_USERS(accountId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmails: [userEmail] }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success === false) {
            throw new Error(data?.error ?? data?.message ?? "XÃ³a tháº¥t báº¡i");
          }
          if (Array.isArray(data?.failed) && data.failed.length > 0) {
            const firstError = data.failed[0]?.error;
            throw new Error(firstError ?? "XÃ³a tháº¥t báº¡i");
          }
          loadAccounts();
        })
        .catch((err) => setCheckError(err?.message ?? "Lá»—i khi xÃ³a user."))
        .finally(() => setDeletingId(null));
    },
    [loadAccounts, setCheckError]
  );

  const handleFixUser = useCallback(
    (userEmail: string) => {
      if (fixAllInFlightRef.current) {
        return;
      }
      setCheckError(null);
      setFixingId(userEmail);

      apiFetch(API_ENDPOINTS.RENEW_ADOBE_FIX_USER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            loadAccounts();
          } else {
            throw new Error(data?.error ?? "Fix tháº¥t báº¡i");
          }
        })
        .catch((err) => setCheckError(err?.message ?? "Lá»—i khi fix user."))
        .finally(() => setFixingId(null));
    },
    [loadAccounts, setCheckError]
  );

  const handleFixAllUsers = useCallback(
    async (emails: string[]) => {
      const unique = [
        ...new Set(
          emails
            .map((email) => String(email || "").trim().toLowerCase())
            .filter(Boolean)
        ),
      ];
      if (unique.length === 0 || fixAllInFlightRef.current) {
        return;
      }

      fixAllInFlightRef.current = true;
      setCheckError(null);
      setFixAllProgress({ current: 0, total: unique.length });

      try {
        const res = await apiFetch(API_ENDPOINTS.RENEW_ADOBE_FIX_USERS_ROUND, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: unique }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          total_added?: number;
          added_count?: number;
        };

        if (!data?.success) {
          const msg = typeof data?.error === "string" ? data.error : "Fix tháº¥t báº¡i";
          throw new Error(msg);
        }

        const total = Number(data.total_added) || Number(data.added_count) || 0;
        setFixAllProgress({
          current: Math.min(total, unique.length),
          total: unique.length,
        });
      } catch (err) {
        setCheckError(
          err instanceof Error ? err.message : "Lá»—i khi fix hÃ ng loáº¡t."
        );
      } finally {
        fixAllInFlightRef.current = false;
        setFixingId(null);
        setFixAllProgress(null);
        loadAccounts();
      }
    },
    [loadAccounts, setCheckError]
  );

  return {
    deletingId,
    fixingId,
    fixAllProgress,
    handleDeleteUser,
    handleFixUser,
    handleFixAllUsers,
  };
}

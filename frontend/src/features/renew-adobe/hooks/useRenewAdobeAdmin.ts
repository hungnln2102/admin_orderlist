import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { API_BASE_URL } from "@/shared/api/client";
import { fetchAdobeAdminAccounts } from "../api/renewAdobeApi";
import type { AdobeAdminAccount, LicenseStatus } from "../types";

type CheckAllProgress = {
  total: number;
  completed: number;
  failed: number;
  checkingIds: Set<number>;
};

export function useRenewAdobeAdmin() {
  const [accounts, setAccounts] = useState<AdobeAdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [checkAllProgress, setCheckAllProgress] =
    useState<CheckAllProgress | null>(null);
  const [autoAssignPhase, setAutoAssignPhase] = useState<
    "idle" | "running" | "done"
  >("idle");
  const [autoAssignResult, setAutoAssignResult] = useState<{
    assigned: number;
    skipped: number;
  } | null>(null);
  const checkAllAbortRef = useRef<AbortController | null>(null);

  const isCheckingAll =
    checkAllProgress !== null &&
    checkAllProgress.completed < checkAllProgress.total;

  const loadAccounts = useMemo(
    () => () => {
      setLoading(true);
      setError(null);
      fetchAdobeAdminAccounts()
        .then(setAccounts)
        .catch((err) =>
          setError(err?.message ?? "Không thể tải danh sách tài khoản.")
        )
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const dismissCheckAllProgress = useCallback(() => {
    setCheckAllProgress(null);
    setAutoAssignPhase("idle");
    setAutoAssignResult(null);
  }, []);

  const handleCheckAll = useCallback(() => {
    if (isCheckingAll) {
      return;
    }

    setCheckError(null);

    const abort = new AbortController();
    checkAllAbortRef.current = abort;

    setCheckAllProgress({
      total: 0,
      completed: 0,
      failed: 0,
      checkingIds: new Set(),
    });

    const url = `${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_CHECK_ALL}`;
    fetch(url, { credentials: "include", signal: abort.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.statusText || "Check All thất bại");
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("Không hỗ trợ streaming");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }

            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(event);
            } catch {}
          }
        }

        if (buffer.startsWith("data: ")) {
          try {
            handleSSEEvent(JSON.parse(buffer.slice(6)));
          } catch {}
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          return;
        }

        setCheckError(err?.message ?? "Lỗi khi chạy Check All.");
      })
      .finally(() => {
        checkAllAbortRef.current = null;
        setCheckAllProgress((prev) =>
          prev ? { ...prev, checkingIds: new Set() } : null
        );
      });

    function handleSSEEvent(event: Record<string, unknown>) {
      switch (event.type) {
        case "start":
          setCheckAllProgress({
            total: event.total as number,
            completed: 0,
            failed: 0,
            checkingIds: new Set(),
          });
          setAutoAssignPhase("idle");
          setAutoAssignResult(null);
          break;
        case "checking":
          setCheckAllProgress((prev) => {
            if (!prev) {
              return prev;
            }

            const ids = new Set(prev.checkingIds);
            ids.add(event.id as number);
            return { ...prev, checkingIds: ids };
          });
          break;
        case "done":
          setAccounts((prev) =>
            prev.map((account) =>
              account.id === event.id
                ? {
                    ...account,
                    org_name: (event.org_name as string) ?? null,
                    user_count:
                      (event.user_count as number) ?? account.user_count,
                    license_status:
                      (event.license_status as LicenseStatus) ??
                      account.license_status,
                  }
                : account
            )
          );
          setCheckAllProgress((prev) => {
            if (!prev) {
              return prev;
            }

            const ids = new Set(prev.checkingIds);
            ids.delete(event.id as number);
            return {
              ...prev,
              completed: event.completed as number,
              failed: event.failed as number,
              checkingIds: ids,
            };
          });
          break;
        case "error":
          setCheckAllProgress((prev) => {
            if (!prev) {
              return prev;
            }

            const ids = new Set(prev.checkingIds);
            ids.delete(event.id as number);
            return {
              ...prev,
              completed: event.completed as number,
              failed: event.failed as number,
              checkingIds: ids,
            };
          });
          break;
        case "complete":
          setCheckAllProgress((prev) =>
            prev
              ? {
                  ...prev,
                  completed: event.completed as number,
                  failed: event.failed as number,
                  checkingIds: new Set(),
                }
              : null
          );
          break;
        case "auto_assign_start":
          setAutoAssignPhase("running");
          break;
        case "auto_assign_done":
          setAutoAssignPhase("done");
          setAutoAssignResult({
            assigned: (event.assigned as number) ?? 0,
            skipped: (event.skipped as number) ?? 0,
          });
          loadAccounts();
          break;
        case "auto_assign_error":
          setAutoAssignPhase("done");
          setCheckError(`Auto-assign: ${event.error as string}`);
          break;
        case "auto_assign_progress":
          break;
        case "fatal":
          setCheckError(event.error as string);
          break;
      }
    }
  }, [isCheckingAll, loadAccounts]);

  const handleCancelCheckAll = useCallback(() => {
    checkAllAbortRef.current?.abort();
    setCheckAllProgress(null);
  }, []);

  const handleDeleteUser = useCallback(
    (accountId: number, userEmail: string) => {
      setCheckError(null);
      const key = `acc-${accountId}-${userEmail}`;
      setDeletingId(key);

      fetch(
        `${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_AUTO_DELETE_USERS(accountId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userEmails: [userEmail] }),
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data?.success === false) {
            throw new Error(data?.error ?? data?.message ?? "Xóa thất bại");
          }
          if (Array.isArray(data?.failed) && data.failed.length > 0) {
            const firstError = data.failed[0]?.error;
            throw new Error(firstError ?? "Xóa thất bại");
          }
          loadAccounts();
        })
        .catch((err) => setCheckError(err?.message ?? "Lỗi khi xóa user."))
        .finally(() => setDeletingId(null));
    },
    [loadAccounts]
  );

  const handleFixUser = useCallback(
    (userEmail: string) => {
      setCheckError(null);
      setFixingId(userEmail);

      fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_FIX_USER}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: userEmail }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            loadAccounts();
          } else {
            throw new Error(data?.error ?? "Fix thất bại");
          }
        })
        .catch((err) => setCheckError(err?.message ?? "Lỗi khi fix user."))
        .finally(() => setFixingId(null));
    },
    [loadAccounts]
  );

  const handleSaveUrlAccess = useCallback((accountId: number, url: string) => {
    fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_URL_ACCESS(accountId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url_access: url }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setAccounts((prev) =>
            prev.map((account) =>
              account.id === accountId
                ? { ...account, url_access: url || null }
                : account
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleCheck = useCallback(
    (account: AdobeAdminAccount) => {
      setCheckError(null);
      setCheckingId(account.id);

      fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_CHECK(account.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(res.statusText || "Check thất bại");
          }
          return res.json();
        })
        .then((data) => {
          if (data.success) {
            loadAccounts();
          } else {
            throw new Error(data.error || "Check thất bại");
          }
        })
        .catch((err) => setCheckError(err?.message ?? "Lỗi khi chạy check."))
        .finally(() => setCheckingId(null));
    },
    [loadAccounts]
  );

  return {
    accounts,
    loading,
    error,
    checkingId,
    checkError,
    deletingId,
    fixingId,
    checkAllProgress,
    autoAssignPhase,
    autoAssignResult,
    isCheckingAll,
    loadAccounts,
    dismissCheckAllProgress,
    handleCheckAll,
    handleCancelCheckAll,
    handleDeleteUser,
    handleFixUser,
    handleSaveUrlAccess,
    handleCheck,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/lib/api";
import {
  deleteAdobeAdminAccount,
  fetchAdobeAdminAccounts,
  runSchedulerRenewAdobeCheck,
} from "../api/renewAdobeApi";
import type { AdobeAdminAccount } from "../types";
import { runCheckAllStream } from "./use-renew-adobe-admin/checkAll";
import type { CheckAllProgress, FixAllProgress } from "./use-renew-adobe-admin/types";

export function useRenewAdobeAdmin() {
  const [accounts, setAccounts] = useState<AdobeAdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  /** Fix lần lượt nhiều user (Fix all); `current` = thứ tự đang chạy (1-based). */
  const [fixAllProgress, setFixAllProgress] = useState<FixAllProgress | null>(null);
  const [deletingAdminAccountId, setDeletingAdminAccountId] = useState<number | null>(null);
  const [adminAccountPendingDelete, setAdminAccountPendingDelete] =
    useState<AdobeAdminAccount | null>(null);
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
  const fixAllInFlightRef = useRef(false);
  const [cronTestLoading, setCronTestLoading] = useState(false);
  const [cronTestBanner, setCronTestBanner] = useState<string | null>(null);

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

  const handleCheckAll = useCallback(
    () =>
      runCheckAllStream({
        isCheckingAll,
        setCheckError,
        setCronTestBanner,
        checkAllAbortRef,
        setCheckAllProgress,
        setAutoAssignPhase,
        setAutoAssignResult,
        setAccounts,
        loadAccounts,
      }),
    [isCheckingAll, loadAccounts]
  );

  const handleCancelCheckAll = useCallback(() => {
    checkAllAbortRef.current?.abort();
    setCheckAllProgress(null);
  }, []);

  const handleTestCronJob = useCallback(() => {
    if (cronTestLoading || isCheckingAll || checkingId !== null) {
      return;
    }
    setCheckError(null);
    setCronTestBanner(null);
    setCronTestLoading(true);
    runSchedulerRenewAdobeCheck()
      .then(() => {
        setCronTestBanner(
          "Đã chạy xong job giống cron (check all + auto-assign) trên process API. Cron thật chạy trong `scheduler` — xem log service đó để so sánh."
        );
        loadAccounts();
      })
      .catch((err) =>
        setCheckError(
          err?.message ?? "Lỗi khi chạy test job cron (scheduler/run-adobe-check)."
        )
      )
      .finally(() => setCronTestLoading(false));
  }, [checkingId, cronTestLoading, isCheckingAll, loadAccounts]);

  const handleDeleteUser = useCallback(
    (accountId: number, userEmail: string) => {
      setCheckError(null);
      const key = `acc-${accountId}-${userEmail}`;
      setDeletingId(key);

      apiFetch(
        API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_AUTO_DELETE_USERS(accountId),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
            throw new Error(data?.error ?? "Fix thất bại");
          }
        })
        .catch((err) => setCheckError(err?.message ?? "Lỗi khi fix user."))
        .finally(() => setFixingId(null));
    },
    [loadAccounts]
  );

  const handleFixAllUsers = useCallback(
    async (emails: string[]) => {
      const unique = [
        ...new Set(
          emails
            .map((e) => String(e || "").trim().toLowerCase())
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
        const res = await apiFetch(
          API_ENDPOINTS.RENEW_ADOBE_FIX_USERS_ROUND,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: unique }),
          }
        );
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          total_added?: number;
          added_count?: number;
        };

        if (!data?.success) {
          const msg =
            typeof data?.error === "string" ? data.error : "Fix thất bại";
          throw new Error(msg);
        }

        const total =
          Number(data.total_added) ||
          Number(data.added_count) ||
          0;
        setFixAllProgress({
          current: Math.min(total, unique.length),
          total: unique.length,
        });
      } catch (err) {
        setCheckError(
          err instanceof Error ? err.message : "Lỗi khi fix hàng loạt."
        );
      } finally {
        fixAllInFlightRef.current = false;
        setFixingId(null);
        setFixAllProgress(null);
        loadAccounts();
      }
    },
    [loadAccounts]
  );

  const handleSaveUrlAccess = useCallback((accountId: number, url: string) => {
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
  }, []);

  const openDeleteAdminModal = useCallback((account: AdobeAdminAccount) => {
    setCheckError(null);
    setAdminAccountPendingDelete(account);
  }, []);

  const closeDeleteAdminModal = useCallback(() => {
    if (deletingAdminAccountId !== null) return;
    setAdminAccountPendingDelete(null);
  }, [deletingAdminAccountId]);

  const confirmDeleteAdminAccount = useCallback(() => {
    const account = adminAccountPendingDelete;
    if (!account) return;
    setCheckError(null);
    setDeletingAdminAccountId(account.id);
    deleteAdobeAdminAccount(account.id)
      .then(() => {
        loadAccounts();
        setAdminAccountPendingDelete(null);
      })
      .catch((err) =>
        setCheckError(err?.message ?? "Lỗi khi xóa tài khoản admin.")
      )
      .finally(() => setDeletingAdminAccountId(null));
  }, [adminAccountPendingDelete, loadAccounts]);

  const handleCheck = useCallback(
    (account: AdobeAdminAccount) => {
      setCheckError(null);
      setCheckingId(account.id);

      apiFetch(API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_CHECK(account.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    deletingAdminAccountId,
    adminAccountPendingDelete,
    openDeleteAdminModal,
    closeDeleteAdminModal,
    confirmDeleteAdminAccount,
    deletingId,
    fixingId,
    fixAllProgress,
    checkAllProgress,
    autoAssignPhase,
    autoAssignResult,
    isCheckingAll,
    cronTestLoading,
    cronTestBanner,
    loadAccounts,
    dismissCheckAllProgress,
    handleCheckAll,
    handleCancelCheckAll,
    handleTestCronJob,
    handleDeleteUser,
    handleFixUser,
    handleFixAllUsers,
    handleSaveUrlAccess,
    handleCheck,
  };
}

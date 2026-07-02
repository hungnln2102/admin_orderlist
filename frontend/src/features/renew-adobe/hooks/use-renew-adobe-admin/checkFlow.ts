import { useCallback, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import { runSchedulerRenewAdobeCheck } from "../../api/renewAdobeApi";
import type { AdobeAdminAccount } from "../../types";
import { runCheckAllStream } from "./checkAll";
import type { CheckAllProgress } from "./types";

type UseAdminCheckFlowParams = {
  setAccounts: React.Dispatch<React.SetStateAction<AdobeAdminAccount[]>>;
  loadAccounts: () => void;
};

export function useAdminCheckFlow({
  setAccounts,
  loadAccounts,
}: UseAdminCheckFlowParams) {
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
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
  const [cronTestLoading, setCronTestLoading] = useState(false);
  const [cronTestBanner, setCronTestBanner] = useState<string | null>(null);

  const isCheckingAll =
    checkAllProgress !== null &&
    checkAllProgress.completed < checkAllProgress.total;

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
    [isCheckingAll, loadAccounts, setAccounts]
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
    checkingId,
    checkError,
    setCheckError,
    checkAllProgress,
    autoAssignPhase,
    autoAssignResult,
    isCheckingAll,
    cronTestLoading,
    cronTestBanner,
    dismissCheckAllProgress,
    handleCheckAll,
    handleCancelCheckAll,
    handleTestCronJob,
    handleCheck,
  };
}

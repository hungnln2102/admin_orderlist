import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/lib/api";
import type { AdobeAdminAccount } from "../../types";
import { normalizeIncomingLicenseStatus } from "../../utils/accountUtils";
import type { CheckAllProgress } from "./types";

type RunCheckAllArgs = {
  isCheckingAll: boolean;
  setCheckError: (value: string | null) => void;
  setCronTestBanner: (value: string | null) => void;
  checkAllAbortRef: MutableRefObject<AbortController | null>;
  setCheckAllProgress: Dispatch<SetStateAction<CheckAllProgress | null>>;
  setAutoAssignPhase: (value: "idle" | "running" | "done") => void;
  setAutoAssignResult: (value: { assigned: number; skipped: number } | null) => void;
  setAccounts: Dispatch<SetStateAction<AdobeAdminAccount[]>>;
  loadAccounts: () => void;
};

type SseEvent = Record<string, unknown>;

const applySseEvent = (
  event: SseEvent,
  args: Omit<RunCheckAllArgs, "isCheckingAll" | "checkAllAbortRef">
) => {
  const {
    setCheckError,
    setCheckAllProgress,
    setAutoAssignPhase,
    setAutoAssignResult,
    setAccounts,
    loadAccounts,
  } = args;

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
        if (!prev) return prev;
        const ids = new Set(prev.checkingIds);
        ids.add(event.id as number);
        return { ...prev, checkingIds: ids };
      });
      break;
    case "done":
      setAccounts((prev) => {
        if (event.removed_from_db) {
          return prev.filter((account) => account.id !== event.id);
        }
        return prev.map((account) =>
          account.id === event.id
            ? {
                ...account,
                org_name: (event.org_name as string) ?? null,
                user_count: (event.user_count as number) ?? account.user_count,
                license_status: normalizeIncomingLicenseStatus(
                  event.license_status ?? account.license_status
                ),
              }
            : account
        );
      });
      setCheckAllProgress((prev) => {
        if (!prev) return prev;
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
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === event.id
            ? {
                ...account,
                license_status: normalizeIncomingLicenseStatus(
                  event.license_status ?? account.license_status
                ),
              }
            : account
        )
      );
      setCheckAllProgress((prev) => {
        if (!prev) return prev;
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
      loadAccounts();
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
    case "fatal":
      setCheckError(event.error as string);
      break;
    default:
      break;
  }
};

export const runCheckAllStream = ({
  isCheckingAll,
  setCheckError,
  setCronTestBanner,
  checkAllAbortRef,
  setCheckAllProgress,
  setAutoAssignPhase,
  setAutoAssignResult,
  setAccounts,
  loadAccounts,
}: RunCheckAllArgs) => {
  if (isCheckingAll) return;

  setCheckError(null);
  setCronTestBanner(null);

  const abort = new AbortController();
  checkAllAbortRef.current = abort;

  setCheckAllProgress({
    total: 0,
    completed: 0,
    failed: 0,
    checkingIds: new Set(),
  });

  apiFetch(API_ENDPOINTS.RENEW_ADOBE_CHECK_ALL, { signal: abort.signal })
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
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            applySseEvent(JSON.parse(line.slice(6)), {
              setCheckError,
              setCheckAllProgress,
              setAutoAssignPhase,
              setAutoAssignResult,
              setAccounts,
              loadAccounts,
              setCronTestBanner,
            });
          } catch {
            // noop
          }
        }
      }

      if (buffer.startsWith("data: ")) {
        try {
          applySseEvent(JSON.parse(buffer.slice(6)), {
            setCheckError,
            setCheckAllProgress,
            setAutoAssignPhase,
            setAutoAssignResult,
            setAccounts,
            loadAccounts,
            setCronTestBanner,
          });
        } catch {
          // noop
        }
      }
    })
    .catch((err) => {
      if (err.name === "AbortError") return;
      setCheckError(err?.message ?? "Lỗi khi chạy Check All.");
    })
    .finally(() => {
      checkAllAbortRef.current = null;
      setCheckAllProgress((prev) => (prev ? { ...prev, checkingIds: new Set() } : null));
    });
};

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import { API_BASE_URL } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";
import { UserOrdersTable } from "./components/UserOrdersTable";
import { AddUserByEmail } from "./AddUserByEmail";

/**
 * Khớp cấu trúc bảng `accounts` trong docs/Renew_Adobe_Overview.md.
 * Cột form: email, password_enc, org_name, user_count, license_status.
 */
export type LicenseStatus = "paid" | "active" | "expired" | "unknown";

export type AdobeAdminAccount = {
  id: number;
  email: string;
  password_enc: string;
  org_name: string | null;
  user_count: number;
  license_status: LicenseStatus;
  users_snapshot?: string | null;
  order_code?: string | null;
  last_checked?: string | null;
  license_detail?: string | null;
};

/** Một user trong users_snapshot (parse từ JSON): name, email, product (false = hết quyền) */
export type SnapshotUser = {
  name: string | null;
  email: string;
  role?: string;
  access?: string | boolean;
  product?: boolean | string;
};

/** Hiển thị password dạng che (bảo mật) */
function maskPassword(_raw: string): string {
  return "••••••••";
}

const STATUS_LABELS: Record<LicenseStatus, string> = {
  paid: "Còn gói",
  active: "Đang hoạt động",
  expired: "Hết hạn",
  unknown: "Chờ gia hạn",
};

const PAGE_SIZE = 10;

/** Chuẩn hóa 1 row từ API (system_renew_adobe.account) sang AdobeAdminAccount */
function normalizeAccount(row: Record<string, unknown>): AdobeAdminAccount {
  const status = String(row.license_status ?? "unknown").toLowerCase();
  const licenseStatus: LicenseStatus =
    status === "paid"
      ? "paid"
      : status === "active"
        ? "active"
        : status === "expired"
          ? "expired"
          : "unknown";
  return {
    id: Number(row.id) || 0,
    email: String(row.email ?? ""),
    password_enc: String(row.password_enc ?? ""),
    org_name: row.org_name != null ? String(row.org_name) : null,
    user_count: Number(row.user_count) ?? 0,
    license_status: licenseStatus,
    users_snapshot: row.users_snapshot != null ? String(row.users_snapshot) : null,
    order_code: row.order_code != null ? String(row.order_code) : null,
    last_checked: row.last_checked != null ? String(row.last_checked) : null,
    license_detail: row.license_detail != null ? String(row.license_detail) : null,
  };
}

const fetchAccounts = () =>
  fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNTS}`, {
    credentials: "include",
  })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText || "Lỗi tải danh sách");
      return res.json();
    })
    .then((rows: Record<string, unknown>[]) => rows.map(normalizeAccount));

type CheckAllProgress = {
  total: number;
  completed: number;
  failed: number;
  checkingIds: Set<number>;
};

export default function RenewAdobeAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [accounts, setAccounts] = useState<AdobeAdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [checkAllProgress, setCheckAllProgress] = useState<CheckAllProgress | null>(null);
  const [autoAssignPhase, setAutoAssignPhase] = useState<"idle" | "running" | "done">("idle");
  const [autoAssignResult, setAutoAssignResult] = useState<{ assigned: number; skipped: number } | null>(null);
  const checkAllAbortRef = useRef<AbortController | null>(null);
  const isCheckingAll = checkAllProgress !== null && checkAllProgress.completed < checkAllProgress.total;

  const loadAccounts = useMemo(
    () => () => {
      setLoading(true);
      setError(null);
      fetchAccounts()
        .then(setAccounts)
        .catch((err) => setError(err?.message ?? "Không thể tải danh sách tài khoản."))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleCheckAll = useCallback(() => {
    if (isCheckingAll) return;
    setCheckError(null);

    const abort = new AbortController();
    checkAllAbortRef.current = abort;

    setCheckAllProgress({ total: 0, completed: 0, failed: 0, checkingIds: new Set() });

    const url = `${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_CHECK_ALL}`;
    fetch(url, { credentials: "include", signal: abort.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.statusText || "Check All thất bại");
        const reader = res.body?.getReader();
        if (!reader) throw new Error("Không hỗ trợ streaming");

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
              const evt = JSON.parse(line.slice(6));
              handleSSEEvent(evt);
            } catch {}
          }
        }

        if (buffer.startsWith("data: ")) {
          try { handleSSEEvent(JSON.parse(buffer.slice(6))); } catch {}
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setCheckError(err?.message ?? "Lỗi khi chạy Check All.");
      })
      .finally(() => {
        checkAllAbortRef.current = null;
        setCheckAllProgress((prev) =>
          prev ? { ...prev, checkingIds: new Set() } : null
        );
      });

    function handleSSEEvent(evt: Record<string, unknown>) {
      switch (evt.type) {
        case "start":
          setCheckAllProgress({
            total: evt.total as number,
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
            ids.add(evt.id as number);
            return { ...prev, checkingIds: ids };
          });
          break;
        case "done":
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.id === evt.id
                ? {
                    ...acc,
                    org_name: (evt.org_name as string) ?? null,
                    user_count: (evt.user_count as number) ?? acc.user_count,
                    license_status: (evt.license_status as LicenseStatus) ?? acc.license_status,
                  }
                : acc
            )
          );
          setCheckAllProgress((prev) => {
            if (!prev) return prev;
            const ids = new Set(prev.checkingIds);
            ids.delete(evt.id as number);
            return {
              ...prev,
              completed: evt.completed as number,
              failed: evt.failed as number,
              checkingIds: ids,
            };
          });
          break;
        case "error":
          setCheckAllProgress((prev) => {
            if (!prev) return prev;
            const ids = new Set(prev.checkingIds);
            ids.delete(evt.id as number);
            return {
              ...prev,
              completed: evt.completed as number,
              failed: evt.failed as number,
              checkingIds: ids,
            };
          });
          break;
        case "complete":
          setCheckAllProgress((prev) =>
            prev
              ? { ...prev, completed: evt.completed as number, failed: evt.failed as number, checkingIds: new Set() }
              : null
          );
          break;
        case "auto_assign_start":
          setAutoAssignPhase("running");
          break;
        case "auto_assign_done":
          setAutoAssignPhase("done");
          setAutoAssignResult({
            assigned: (evt.assigned as number) ?? 0,
            skipped: (evt.skipped as number) ?? 0,
          });
          loadAccounts();
          break;
        case "auto_assign_error":
          setAutoAssignPhase("done");
          setCheckError(`Auto-assign: ${evt.error as string}`);
          break;
        case "auto_assign_progress":
          break;
        case "fatal":
          setCheckError(evt.error as string);
          break;
      }
    }
  }, [isCheckingAll]);

  const handleCancelCheckAll = useCallback(() => {
    checkAllAbortRef.current?.abort();
    setCheckAllProgress(null);
  }, []);

  const handleDeleteUser = (accountId: number, userEmail: string) => {
    setCheckError(null);
    const key = `acc-${accountId}-${userEmail}`;
    setDeletingId(key);
    fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_DELETE_USER(accountId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userEmail }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success !== false) loadAccounts();
        else throw new Error(data?.error ?? "Xóa thất bại");
      })
      .catch((err) => setCheckError(err?.message ?? "Lỗi khi xóa user."))
      .finally(() => setDeletingId(null));
  };

  const handleCheck = (acc: AdobeAdminAccount) => {
    setCheckError(null);
    setCheckingId(acc.id);
    fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_CHECK(acc.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Check thất bại");
        return res.json();
      })
      .then((data) => {
        if (data.success) loadAccounts();
        else throw new Error(data.error || "Check thất bại");
      })
      .catch((err) => setCheckError(err?.message ?? "Lỗi khi chạy check."))
      .finally(() => setCheckingId(null));
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const q = searchTerm.trim().toLowerCase();
    return accounts.filter(
      (item) =>
        item.email.toLowerCase().includes(q) ||
        (item.org_name ?? "").toLowerCase().includes(q)
    );
  }, [accounts, searchTerm]);

  const totalItems = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Renew <span className="text-indigo-400">Adobe</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Danh sách tài khoản admin dùng cho Renew Adobe
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isCheckingAll ? (
            <button
              type="button"
              onClick={handleCancelCheckAll}
              className="rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/40 px-4 py-2 text-sm font-semibold hover:bg-rose-500/30 transition-colors"
            >
              Hủy Check All
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckAll}
              disabled={loading || accounts.length === 0 || checkingId !== null}
              className="rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 px-4 py-2 text-sm font-semibold hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Check All
            </button>
          )}
        </div>
      </div>

      {checkAllProgress && checkAllProgress.total > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-slate-800/70 to-slate-900/70 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80 font-medium">
              {isCheckingAll
                ? "Đang check..."
                : autoAssignPhase === "running"
                  ? "Đang phân bổ user..."
                  : "Hoàn tất"}
              {" "}
              <span className="text-indigo-300 tabular-nums">
                {checkAllProgress.completed}/{checkAllProgress.total}
              </span>
              {checkAllProgress.failed > 0 && (
                <span className="text-rose-400 ml-2">
                  ({checkAllProgress.failed} lỗi)
                </span>
              )}
              {autoAssignPhase === "done" && autoAssignResult && (
                <span className="text-emerald-400 ml-2">
                  — Đã gán {autoAssignResult.assigned} user
                  {autoAssignResult.skipped > 0 && `, ${autoAssignResult.skipped} bỏ qua (hết slot)`}
                </span>
              )}
            </span>
            {!isCheckingAll && autoAssignPhase !== "running" && (
              <button
                type="button"
                onClick={() => { setCheckAllProgress(null); setAutoAssignPhase("idle"); setAutoAssignResult(null); }}
                className="text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                Đóng
              </button>
            )}
          </div>
          <div className="h-2 rounded-full bg-slate-700/80 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                autoAssignPhase === "running"
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-400 animate-pulse"
                  : checkAllProgress.failed > 0 && !isCheckingAll
                    ? "bg-gradient-to-r from-indigo-500 to-amber-500"
                    : isCheckingAll
                      ? "bg-gradient-to-r from-indigo-500 to-cyan-400"
                      : "bg-gradient-to-r from-emerald-500 to-cyan-400"
              }`}
              style={{
                width: autoAssignPhase === "running"
                  ? "100%"
                  : `${Math.round((checkAllProgress.completed / checkAllProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo email, org_name..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-400/20 text-rose-300 text-sm">
            {error}
          </div>
        )}
        {checkError && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-400/20 text-amber-300 text-sm">
            {checkError}
          </div>
        )}
        {loading ? (
          <div className="p-12 text-center text-white/70">
            Đang tải danh sách...
          </div>
        ) : (
        <ResponsiveTable
          showCardOnMobile
          cardView={
            currentRows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg mb-2">
                  {accounts.length === 0
                    ? "Chưa có tài khoản nào"
                    : "Không tìm thấy tài khoản nào"}
                </p>
                <p className="text-white/60 text-sm">
                  {accounts.length === 0
                    ? "Thêm tài khoản vào bảng system_renew_adobe.account"
                    : "Thử thay đổi từ khóa tìm kiếm"}
                </p>
              </div>
            ) : (
              <TableCard
                data={currentRows}
                renderCard={(item, idx) => {
                  const acc = item as AdobeAdminAccount;
                  return (
                    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                      <p className="text-xs text-white/50">#{start + idx + 1}</p>
                      <p className="text-sm font-medium text-white break-all">
                        {acc.email}
                      </p>
                      <p className="text-xs text-white/60">
                        Mật khẩu: {maskPassword(acc.password_enc)}
                      </p>
                      <p className="text-xs text-white/70">
                        Org: {acc.org_name ?? "—"}
                      </p>
                      <p className="text-xs text-white/70">
                        Số user: {acc.user_count}
                      </p>
                      <StatusBadge status={acc.license_status} />
                      <button
                        type="button"
                        onClick={() => handleCheck(acc)}
                        disabled={checkingId !== null}
                        className="mt-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 px-3 py-1.5 text-xs font-semibold"
                      >
                        {checkingId === acc.id ? "Đang check..." : "Check"}
                      </button>
                    </div>
                  );
                }}
                className="p-4"
              />
            )
          }
        >
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                <th className="min-w-[180px]">EMAIL</th>
                <th className="min-w-[100px]">PASSWORD_ENC</th>
                <th className="min-w-[140px]">ORG_NAME</th>
                <th className="w-24 text-center">USER_COUNT</th>
                <th className="w-36">LICENSE_STATUS</th>
                <th className="w-28 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-white/70"
                  >
                    <p className="text-lg mb-2">
                      {accounts.length === 0
                        ? "Chưa có tài khoản nào"
                        : "Không tìm thấy tài khoản nào"}
                    </p>
                    <p className="text-sm text-white/60">
                      {accounts.length === 0
                        ? "Thêm tài khoản vào bảng system_renew_adobe.account"
                        : "Thử thay đổi từ khóa tìm kiếm"}
                    </p>
                  </td>
                </tr>
              ) : (
                currentRows.map((item) => {
                  const acc = item as AdobeAdminAccount;
                  const isBeingChecked = checkAllProgress?.checkingIds.has(acc.id);
                  return (
                    <tr
                      key={acc.id}
                      className={isBeingChecked ? "bg-indigo-500/10 animate-pulse" : ""}
                    >
                      <td className="px-2 sm:px-4 py-3 text-sm text-white/90 break-all">
                        {acc.email}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm text-white/60 font-mono">
                        {maskPassword(acc.password_enc)}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm text-white/80">
                        {acc.org_name ?? "—"}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm text-white/80 text-center tabular-nums">
                        {acc.user_count}
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <StatusBadge status={acc.license_status} />
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleCheck(acc)}
                          disabled={checkingId !== null || isCheckingAll}
                          className="rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 px-3 py-1.5 text-xs font-semibold hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {checkingId === acc.id
                            ? "Đang check..."
                            : isBeingChecked
                              ? "Checking..."
                              : "Check"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ResponsiveTable>
        )}

        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <div className="mt-6 space-y-6">
        <UserOrdersTable
          accounts={accounts}
          onDeleteUser={handleDeleteUser}
          deletingId={deletingId}
        />
        <AddUserByEmail accounts={accounts} onAdded={loadAccounts} />
      </div>
    </div>
  );
}

type StatusBadgeProps = {
  status: LicenseStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status];

  const colorClasses =
    status === "paid" || status === "active"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
      : status === "expired"
        ? "bg-rose-500/15 text-rose-300 border-rose-400/40"
        : "bg-amber-500/15 text-amber-300 border-amber-400/40";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${colorClasses}`}
    >
      {label}
    </span>
  );
}


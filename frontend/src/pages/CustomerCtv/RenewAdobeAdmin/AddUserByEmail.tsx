/**
 * Component: Thêm user trên Adobe Admin Console (Hướng 2 — tự chia nhiều tài khoản).
 * Chọn nhiều tài khoản còn gói → nhập danh sách email → hệ thống phân bổ theo slot (11 - user_count) và gọi add-users-batch.
 */

import { useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";

const MAX_USERS_PER_ACCOUNT = 11;

export type AccountForAdd = {
  id: number;
  email: string;
  user_count: number;
  license_status: string;
};

export type AddUserByEmailProps = {
  accounts?: AccountForAdd[];
  onAdded?: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const uniq = [...new Set(parts)];
  return uniq.filter((e) => EMAIL_RE.test(e));
}

/** Tài khoản còn gói, sort theo user_count giảm dần (gần đầy trước để ưu tiên fill). */
function getEligibleAccounts(accounts: AccountForAdd[]): AccountForAdd[] {
  const paid = accounts.filter(
    (a) =>
      String(a.license_status).toLowerCase() === "paid" ||
      String(a.license_status).toLowerCase() === "active"
  );
  return [...paid].sort((a, b) => (b.user_count ?? 0) - (a.user_count ?? 0));
}

export function AddUserByEmail({ accounts = [], onAdded }: AddUserByEmailProps) {
  const [emailInput, setEmailInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastDistribution, setLastDistribution] = useState<
    { accountId: number; accountEmail: string; added: string[]; user_count_after?: number; error?: string }[]
  >([]);
  const [lastExceeded, setLastExceeded] = useState<string[] | null>(null);

  const eligible = useMemo(() => getEligibleAccounts(accounts), [accounts]);
  const emails = useMemo(() => parseEmails(emailInput), [emailInput]);

  const toggleAccount = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
    setSuccess(null);
  };

  const totalSlotLeft = useMemo(() => {
    return eligible
      .filter((a) => selectedIds.has(a.id))
      .reduce((sum, a) => sum + Math.max(0, MAX_USERS_PER_ACCOUNT - (a.user_count ?? 0)), 0);
  }, [eligible, selectedIds]);

  const handleAdd = async () => {
    if (emails.length === 0) {
      setError("Nhập ít nhất một email hợp lệ (mỗi dòng một email hoặc cách nhau bằng dấu phẩy).");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Chọn ít nhất một tài khoản (còn gói) để thêm user.");
      return;
    }
    const accountIds = eligible.filter((a) => selectedIds.has(a.id)).map((a) => a.id);
    setError(null);
    setSuccess(null);
    setLastDistribution([]);
    setLastExceeded(null);
    setLoading(true);

    const url = `${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNTS_ADD_USERS_BATCH}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accountIds, userEmails: emails }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok && data.success) {
        setSuccess(data.message ?? "Đã thêm user.");
        setLastDistribution(data.distribution ?? []);
        setLastExceeded(data.exceeded_emails ?? null);
        if (data.total_added === emails.length && !data.exceeded_emails?.length) {
          setEmailInput("");
        }
        onAdded?.();
      } else {
        setError(data?.error ?? data?.message ?? "Thêm người dùng thất bại.");
        if (data?.distribution) setLastDistribution(data.distribution);
        if (data?.exceeded_emails) setLastExceeded(data.exceeded_emails);
      }
    } catch (err) {
      setLoading(false);
      setError((err as Error)?.message ?? "Lỗi kết nối.");
    }
  };

  return (
    <div className="rounded-[18px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-6 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-white/90 mb-1">Thêm người dùng (chia nhiều tài khoản)</h3>
      <p className="text-xs text-white/50 mb-3">
        Chọn một hoặc nhiều tài khoản còn gói, nhập email cần thêm. Hệ thống tự phân bổ theo slot còn trống (tối đa 11
        user/tài khoản).
      </p>

      {eligible.length > 0 ? (
        <div className="mb-3">
          <p className="text-xs font-medium text-white/70 mb-2">Chọn tài khoản (thứ tự = ưu tiên fill):</p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {eligible.map((a) => {
              const slotLeft = Math.max(0, MAX_USERS_PER_ACCOUNT - (a.user_count ?? 0));
              const checked = selectedIds.has(a.id);
              return (
                <li key={a.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`acc-${a.id}`}
                    checked={checked}
                    onChange={() => toggleAccount(a.id)}
                    disabled={loading}
                    className="rounded border-white/20 bg-slate-900/50 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor={`acc-${a.id}`} className="text-xs text-white/80 cursor-pointer flex-1">
                    {a.email} — {a.user_count ?? 0}/11 (còn {slotLeft} slot)
                  </label>
                </li>
              );
            })}
          </ul>
          {selectedIds.size > 0 && (
            <p className="text-xs text-emerald-400/90 mt-1">
              Đã chọn {selectedIds.size} tài khoản, tổng slot còn: {totalSlotLeft}. Sẽ thêm tối đa {totalSlotLeft} email
              trong đợt này.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-400/90 mb-3">Không có tài khoản còn gói (paid/active).</p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-white/60 mb-1.5">Email user cần thêm</label>
          <textarea
            rows={4}
            placeholder="user1@example.com&#10;user2@example.com&#10;hoặc user1@x.com, user2@x.com"
            className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-white placeholder:text-slate-400/70 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none resize-y min-h-[100px]"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            disabled={loading}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || selectedIds.size === 0 || emails.length === 0}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-5 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : `Thêm ${emails.length} người dùng`}
          </button>
          {emails.length > 0 && !loading && (
            <span className="text-xs text-white/50">{emails.length} email hợp lệ</span>
          )}
        </div>
      </div>

      {lastDistribution.length > 0 && (
        <div className="mt-3 text-xs text-white/70 space-y-1">
          {lastDistribution.map((d) =>
            d.error ? (
              <p key={d.accountId} className="text-amber-400/90">
                {d.accountEmail}: lỗi — {d.error}
              </p>
            ) : (
              <p key={d.accountId} className="text-emerald-400/90">
                {d.accountEmail}: đã thêm {d.added?.length ?? 0} user
                {d.user_count_after != null ? ` (sau: ${d.user_count_after}/11)` : ""}.
              </p>
            )
          )}
        </div>
      )}
      {lastExceeded && lastExceeded.length > 0 && (
        <p className="text-amber-400/90 text-xs mt-2">
          Còn {lastExceeded.length} email chưa thêm (hết slot): {lastExceeded.slice(0, 5).join(", ")}
          {lastExceeded.length > 5 ? "…" : ""}
        </p>
      )}
      {error && <p className="text-amber-400/90 text-sm mt-2">{error}</p>}
      {success && <p className="text-emerald-400/90 text-sm mt-2">{success}</p>}
    </div>
  );
}

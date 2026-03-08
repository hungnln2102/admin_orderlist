/**
 * Component: Thêm user trên Adobe Admin Console theo email.
 * Hỗ trợ nhập nhiều email cùng lúc (mỗi dòng một email hoặc cách nhau bằng dấu phẩy).
 * Chọn tài khoản: chỉ dùng tài khoản còn gói; ưu tiên user_count >= 11 (gần hết trước).
 */

import { useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";

export type AccountForAdd = {
  id: number;
  email: string;
  user_count: number;
  license_status: string;
};

export type AddUserByEmailProps = {
  /** Danh sách tài khoản admin (từ trang cha) để chọn tài khoản còn gói, ưu tiên user_count >= 11 */
  accounts?: AccountForAdd[];
  /** Gọi lại sau khi thêm thành công (vd. refresh danh sách) */
  onAdded?: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Tách chuỗi thành danh sách email hợp lệ (theo dòng hoặc dấu phẩy), bỏ trùng, bỏ rỗng */
function parseEmails(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const uniq = [...new Set(parts)];
  return uniq.filter((e) => EMAIL_RE.test(e));
}

/**
 * Chọn tài khoản để dùng cho thêm user:
 * - Chỉ tài khoản còn gói (paid/active).
 * - Ưu tiên user_count >= 11 trước, sau đó sort theo user_count giảm dần (gần hết trước).
 */
function selectAccountForAddUser(accounts: AccountForAdd[]): AccountForAdd | null {
  const conGoi = accounts.filter(
    (a) => String(a.license_status).toLowerCase() === "paid" || String(a.license_status).toLowerCase() === "active"
  );
  if (conGoi.length === 0) return null;
  const sorted = [...conGoi].sort((a, b) => {
    const aPrior = a.user_count >= 11 ? 1 : 0;
    const bPrior = b.user_count >= 11 ? 1 : 0;
    if (bPrior !== aPrior) return bPrior - aPrior;
    return b.user_count - a.user_count;
  });
  return sorted[0] ?? null;
}

export function AddUserByEmail({ accounts = [], onAdded }: AddUserByEmailProps) {
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedAccount = useMemo(() => selectAccountForAddUser(accounts), [accounts]);
  const emails = useMemo(() => parseEmails(emailInput), [emailInput]);

  const handleAdd = async () => {
    if (emails.length === 0) {
      setError("Nhập ít nhất một email hợp lệ (mỗi dòng một email hoặc cách nhau bằng dấu phẩy).");
      return;
    }
    if (!selectedAccount) {
      setError("Không có tài khoản còn gói để thêm user.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    setProgress({ current: 1, total: emails.length });

    const url = `${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_ACCOUNT_ADD_USER(selectedAccount.id)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userEmails: emails }),
      });
      const data = await res.json();
      setProgress(null);
      setLoading(false);
      if (res.ok && data.success) {
        setSuccess(data.message ?? `Đã thêm ${emails.length} người dùng trong một bước.`);
        setEmailInput("");
        onAdded?.();
      } else {
        setError(data?.error ?? data?.message ?? "Thêm người dùng thất bại.");
      }
    } catch (err) {
      setProgress(null);
      setLoading(false);
      setError((err as Error)?.message ?? "Lỗi kết nối.");
    }
  };

  return (
    <div className="rounded-[18px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-6 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-white/90 mb-1">Thêm người dùng trên Admin Console</h3>
      <p className="text-xs text-white/50 mb-3">
        Nhập email user cần thêm (nhiều email: mỗi dòng một email hoặc cách nhau bằng dấu phẩy). Hệ thống chọn tài
        khoản <strong className="text-white/70">còn gói</strong>, ưu tiên user_count ≥ 11, rồi thêm lần lượt.
      </p>

      {selectedAccount ? (
        <p className="text-xs text-emerald-400/90 mb-3">
          Sẽ dùng tài khoản: <span className="font-medium">{selectedAccount.email}</span> (user_count:{" "}
          {selectedAccount.user_count}, còn gói).
        </p>
      ) : (
        <p className="text-xs text-amber-400/90 mb-3">
          Không có tài khoản còn gói. Cần ít nhất một tài khoản paid/active; ưu tiên user_count ≥ 11.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Email user cần thêm (nhiều email được)
          </label>
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
            disabled={loading || !selectedAccount || emails.length === 0}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-5 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && progress
              ? `Đang xử lý (${progress.total} email)...`
              : emails.length > 0
                ? `Thêm ${emails.length} người dùng`
                : "Thêm người dùng"}
          </button>
          {emails.length > 0 && !loading && (
            <span className="text-xs text-white/50">
              {emails.length} email hợp lệ
            </span>
          )}
        </div>
      </div>
      {error && <p className="text-amber-400/90 text-sm mt-2">{error}</p>}
      {success && <p className="text-emerald-400/90 text-sm mt-2">{success}</p>}
    </div>
  );
}
